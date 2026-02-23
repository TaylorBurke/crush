# Bookmarks toolbar

## Goal

Add a vertical bookmarks toolbar on the left edge of the new-tab page. Up to 6 bookmarks, icon-only display with hover tooltips. Toggleable in settings, hidden when chat is open or when the screen is too narrow.

## Data model

Add to `Settings`:

```ts
interface Bookmark {
  id: string;
  url: string;
  label: string;
  icon: string; // favicon URL, custom image URL, or emoji
}

interface Settings {
  // ...existing fields...
  showBookmarks: boolean;
  bookmarks: Bookmark[];
}
```

Max 6 bookmarks. `icon` defaults to Google favicon API: `https://www.google.com/s2/favicons?sz=32&domain={domain}`. User can override with an emoji (single character) or image URL (starts with `http`).

## BookmarkBar component

`entrypoints/newtab/components/BookmarkBar.tsx`

- Fixed position: `fixed left-0 top-0 h-screen w-12`
- Vertically centered icons: `flex flex-col items-center justify-center gap-3`
- Transparent background (icons float over the gradient)
- Each bookmark: `<a href={url} title={label}>` wrapping an `<img>` (for URLs) or `<span>` (for emoji)
- Hover: `opacity-70 hover:opacity-100 hover:scale-110 transition`

Visibility condition in App.tsx:

```tsx
{settings.showBookmarks && !chatOpen && hasRoom && settings.bookmarks.length > 0 && (
  <BookmarkBar bookmarks={settings.bookmarks} />
)}
```

## Overlap detection

ResizeObserver on the main content container. When `contentRef.getBoundingClientRect().left < 56` (48px bar + 8px breathing room), set `hasRoom = false` and hide the bar. Prevents overlap on narrow screens.

## Settings panel

New section below "Your Name":

- Toggle for `showBookmarks`
- Up to 6 bookmark rows, each with:
  - URL text input (required). On blur, auto-sets icon to Google favicon API URL and derives label from domain.
  - Icon override input (optional). Accepts emoji or image URL.
  - Delete button.
- "add bookmark" button (hidden when 6 already exist).

Settings gear icon shifts from `left-4` to `left-14` when bookmark bar is visible.

## Files touched

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `Bookmark`, update `Settings` |
| `src/hooks/useSettings.ts` | Migration defaults |
| `entrypoints/newtab/components/BookmarkBar.tsx` | New component |
| `entrypoints/newtab/components/SettingsPanel.tsx` | Bookmarks editing, toggle, gear shift |
| `entrypoints/newtab/App.tsx` | Render BookmarkBar, ResizeObserver |

## Out of scope

- Drag-to-reorder
- Bookmark folders
- Import from Chrome bookmarks
- Bookmark search
