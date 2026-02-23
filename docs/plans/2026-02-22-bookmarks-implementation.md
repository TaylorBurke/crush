# Bookmarks Toolbar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a toggleable vertical bookmarks toolbar on the left edge of the new-tab page with up to 6 icon-only bookmarks, managed via the settings modal.

**Architecture:** Bookmark data lives in the existing `Settings` type (stored in localStorage/chrome.storage). A new `BookmarkBar` component renders fixed-position icons on the left edge. The settings panel gets a bookmarks editing section with URL input, auto-favicon via Google API, and icon override. A ResizeObserver hides the bar when it would overlap content.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, WXT

---

### Task 1: Add Bookmark type and update Settings

**Files:**
- Modify: `src/types/index.ts:57-64`
- Modify: `src/__tests__/types.test.ts`

**Step 1: Write the failing test**

Add to `src/__tests__/types.test.ts`, import `Bookmark` in the import line, then add after the last test:

```ts
it('should create a valid Bookmark', () => {
  const b: Bookmark = {
    id: 'bm-1',
    url: 'https://github.com',
    label: 'github',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=github.com',
  };
  expect(b.id).toBe('bm-1');
  expect(b.url).toBe('https://github.com');
});

it('should create Settings with bookmarks', () => {
  const s: Settings = {
    provider: 'openai',
    apiKey: 'sk-test',
    model: '',
    userName: 'Taylor',
    showBookmarks: true,
    bookmarks: [{ id: 'bm-1', url: 'https://github.com', label: 'github', icon: '🐙' }],
  };
  expect(s.showBookmarks).toBe(true);
  expect(s.bookmarks).toHaveLength(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/__tests__/types.test.ts`
Expected: FAIL — `Bookmark` not exported, `showBookmarks`/`bookmarks` not on `Settings`

**Step 3: Write minimal implementation**

In `src/types/index.ts`, add before the `Settings` interface (before line 59):

```ts
export interface Bookmark {
  id: string;
  url: string;
  label: string;
  icon: string;
}
```

Update the `Settings` interface to:

```ts
export interface Settings {
  provider: Provider;
  apiKey: string;
  model: string;
  userName: string;
  showBookmarks: boolean;
  bookmarks: Bookmark[];
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/__tests__/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/index.ts src/__tests__/types.test.ts
git commit -m "feat: add Bookmark type and extend Settings"
```

---

### Task 2: Update useSettings migration for new fields

**Files:**
- Modify: `src/hooks/useSettings.ts:6-11,13-28`

**Step 1: Update defaults and migration**

Update `defaultSettings` (line 6-11) to:

```ts
const defaultSettings: Settings = {
  provider: 'openai',
  apiKey: '',
  model: '',
  userName: '',
  showBookmarks: false,
  bookmarks: [],
};
```

Update `migrateSettings` (line 13-28) — add the new fields to both branches:

```ts
function migrateSettings(raw: Record<string, unknown>): Settings {
  if ('openaiApiKey' in raw && !('apiKey' in raw)) {
    return {
      provider: 'openai',
      apiKey: (raw.openaiApiKey as string) || '',
      model: '',
      userName: (raw.userName as string) || '',
      showBookmarks: false,
      bookmarks: [],
    };
  }
  return {
    provider: (raw.provider as Settings['provider']) || 'openai',
    apiKey: (raw.apiKey as string) || '',
    model: (raw.model as string) || '',
    userName: (raw.userName as string) || '',
    showBookmarks: (raw.showBookmarks as boolean) ?? false,
    bookmarks: (raw.bookmarks as Settings['bookmarks']) ?? [],
  };
}
```

**Step 2: Run tests**

Run: `npm test -- --run`
Expected: All pass

**Step 3: Commit**

```bash
git add src/hooks/useSettings.ts
git commit -m "feat: add bookmarks defaults and migration to useSettings"
```

---

### Task 3: Create BookmarkBar component

**Files:**
- Create: `entrypoints/newtab/components/BookmarkBar.tsx`

**Step 1: Write the component**

```tsx
import type { Bookmark } from '../../../src/types';

interface BookmarkBarProps {
  bookmarks: Bookmark[];
}

function BookmarkIcon({ icon }: { icon: string }) {
  if (icon.startsWith('http')) {
    return <img src={icon} alt="" className="h-7 w-7 rounded" />;
  }
  return <span className="text-xl leading-none">{icon}</span>;
}

export function BookmarkBar({ bookmarks }: BookmarkBarProps) {
  return (
    <div className="fixed left-0 top-0 z-30 flex h-screen w-12 flex-col items-center justify-center gap-3">
      {bookmarks.map((bm) => (
        <a
          key={bm.id}
          href={bm.url}
          title={bm.label}
          className="flex h-9 w-9 items-center justify-center rounded-lg opacity-70 transition-all hover:scale-110 hover:opacity-100"
        >
          <BookmarkIcon icon={bm.icon} />
        </a>
      ))}
    </div>
  );
}
```

**Step 2: Run build to verify no errors**

Run: `npm run build`
Expected: Clean build

**Step 3: Commit**

```bash
git add entrypoints/newtab/components/BookmarkBar.tsx
git commit -m "feat: add BookmarkBar component"
```

---

### Task 4: Wire BookmarkBar into App.tsx with overlap detection

**Files:**
- Modify: `entrypoints/newtab/App.tsx`

**Step 1: Update imports**

Add at top of file (after line 12):

```ts
import { BookmarkBar } from './components/BookmarkBar';
```

Update line 1 to include `useRef`:

```ts
import { useState, useEffect, useMemo, useRef } from 'react';
```

**Step 2: Add overlap detection state and ref**

After line 22 (`const [feedback, ...`), add:

```ts
const contentRef = useRef<HTMLDivElement>(null);
const [hasRoom, setHasRoom] = useState(true);

useEffect(() => {
  const el = contentRef.current;
  if (!el) return;
  const observer = new ResizeObserver(() => {
    setHasRoom(el.getBoundingClientRect().left >= 56);
  });
  observer.observe(el);
  return () => observer.disconnect();
}, []);
```

**Step 3: Add ref to content div**

Change line 101 from:
```tsx
<div className="mx-auto max-w-2xl px-6 py-12">
```
to:
```tsx
<div ref={contentRef} className="mx-auto max-w-2xl px-6 py-12">
```

**Step 4: Render BookmarkBar**

Add before the `<AIChatPanel` line (before line 131):

```tsx
{settings.showBookmarks && !chatOpen && hasRoom && settings.bookmarks.length > 0 && (
  <BookmarkBar bookmarks={settings.bookmarks} />
)}
```

**Step 5: Run build**

Run: `npm run build`
Expected: Clean build

**Step 6: Commit**

```bash
git add entrypoints/newtab/App.tsx
git commit -m "feat: render BookmarkBar with overlap detection"
```

---

### Task 5: Add bookmarks editing to SettingsPanel

**Files:**
- Modify: `entrypoints/newtab/components/SettingsPanel.tsx`

**Step 1: Update imports**

Change line 4 to:

```ts
import type { Provider, Bookmark } from '../../../src/types';
```

**Step 2: Add bookmark helper functions**

After the `handleModelBlur` function (after line 43), add:

```ts
const handleAddBookmark = () => {
  if (settings.bookmarks.length >= 6) return;
  const newBookmark: Bookmark = {
    id: `bm-${Date.now()}`,
    url: '',
    label: '',
    icon: '',
  };
  updateSettings({ bookmarks: [...settings.bookmarks, newBookmark] });
};

const handleUpdateBookmark = (id: string, updates: Partial<Bookmark>) => {
  const updated = settings.bookmarks.map((bm) =>
    bm.id === id ? { ...bm, ...updates } : bm,
  );
  updateSettings({ bookmarks: updated });
};

const handleBookmarkUrlBlur = (id: string, url: string) => {
  if (!url) return;
  try {
    const domain = new URL(url).hostname;
    const bm = settings.bookmarks.find((b) => b.id === id);
    const updates: Partial<Bookmark> = {
      url,
      label: bm?.label || domain.replace('www.', ''),
    };
    if (!bm?.icon) {
      updates.icon = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
    }
    handleUpdateBookmark(id, updates);
  } catch {
    handleUpdateBookmark(id, { url });
  }
};

const handleRemoveBookmark = (id: string) => {
  updateSettings({ bookmarks: settings.bookmarks.filter((bm) => bm.id !== id) });
};
```

**Step 3: Add bookmarks section to the settings modal**

Replace the "Your Name" section and close button (lines 122-127) with:

```tsx
        <div className="mb-4">
          <label className="mb-1 block text-sm text-text-secondary">Your Name</label>
          <input type="text" value={settings.userName} onChange={(e) => updateSettings({ userName: e.target.value })} placeholder="what should crush call you?" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus" />
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-text-secondary">Bookmarks</label>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={settings.showBookmarks}
                onChange={(e) => updateSettings({ showBookmarks: e.target.checked })}
                className="accent-accent"
              />
              show bar
            </label>
          </div>
          <div className="space-y-2">
            {settings.bookmarks.map((bm) => (
              <div key={bm.id} className="flex gap-2">
                <input
                  type="text"
                  defaultValue={bm.url}
                  onBlur={(e) => handleBookmarkUrlBlur(bm.id, e.target.value.trim())}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus"
                />
                <input
                  type="text"
                  defaultValue={bm.icon.startsWith('http') ? '' : bm.icon}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val) handleUpdateBookmark(bm.id, { icon: val });
                  }}
                  placeholder="emoji or url"
                  className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus"
                />
                <button
                  onClick={() => handleRemoveBookmark(bm.id)}
                  className="text-text-muted hover:text-text-secondary"
                  aria-label="remove bookmark"
                >
                  &#10005;
                </button>
              </div>
            ))}
          </div>
          {settings.bookmarks.length < 6 && (
            <button
              onClick={handleAddBookmark}
              className="mt-2 text-xs text-text-muted hover:text-text-secondary"
            >
              + add bookmark
            </button>
          )}
        </div>

        <button onClick={() => setOpen(false)} className="w-full rounded-lg bg-surface-hover py-2 text-sm text-text-secondary hover:bg-surface">close</button>
```

**Step 4: Shift gear icon when bookmark bar visible**

Change the gear button className (line 51) from:

```
"fixed bottom-4 left-4 rounded-full bg-surface-hover p-2.5 text-text-muted transition-colors hover:bg-surface hover:text-text-secondary"
```

to:

```
{`fixed bottom-4 ${settings.showBookmarks && settings.bookmarks.length > 0 ? 'left-14' : 'left-4'} rounded-full bg-surface-hover p-2.5 text-text-muted transition-all hover:bg-surface hover:text-text-secondary`}
```

**Step 5: Run all tests and build**

Run: `npm test -- --run && npm run build`
Expected: All tests pass, clean build

**Step 6: Commit**

```bash
git add entrypoints/newtab/components/SettingsPanel.tsx
git commit -m "feat: add bookmarks editing section to settings panel"
```

---

### Task 6: Final verification

**Step 1: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass

**Step 2: Run build**

Run: `npm run build`
Expected: Clean build

**Step 3: Done**

All tasks complete. Ready for push.
