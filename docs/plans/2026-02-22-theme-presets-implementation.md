# Theme Presets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users pick from 8 curated color themes via a dot grid in settings, with instant preview and OS-driven dark/light switching.

**Architecture:** Each preset is a data object with light+dark variants of all 25 CSS variables. A `themes.ts` module holds presets and an `applyTheme()` helper that sets CSS variables on `:root`. An inline script in `index.html` prevents flash-of-default-theme on load.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, CSS custom properties, Vitest

---

### Task 1: Add `theme` field to Settings type

**Files:**
- Modify: `src/types/index.ts:66-73`
- Modify: `src/__tests__/types.test.ts`

**Step 1: Add theme to Settings interface**

In `src/types/index.ts`, add `theme: string` to the `Settings` interface (line 66-73):

```ts
export interface Settings {
  provider: Provider;
  apiKey: string;
  model: string;
  userName: string;
  showBookmarks: boolean;
  bookmarks: Bookmark[];
  theme: string;
}
```

**Step 2: Update type tests**

In `src/__tests__/types.test.ts`, add `theme: 'gold'` to the two existing Settings test objects (lines 57-65 and 78-89) so they satisfy the updated type. Also add a dedicated theme test:

```ts
it('should create Settings with theme', () => {
  const s: Settings = {
    provider: 'openai',
    apiKey: 'sk-test',
    model: '',
    userName: 'Taylor',
    showBookmarks: false,
    bookmarks: [],
    theme: 'ocean',
  };
  expect(s.theme).toBe('ocean');
});
```

**Step 3: Run tests to verify**

Run: `npm test -- --run`
Expected: All tests pass (the two existing Settings tests need `theme` added to compile).

**Step 4: Commit**

```bash
git add src/types/index.ts src/__tests__/types.test.ts
git commit -m "feat: add theme field to Settings type"
```

---

### Task 2: Create themes module with presets and applyTheme

**Files:**
- Create: `src/lib/themes.ts`
- Create: `src/__tests__/themes.test.ts`

**Step 1: Write tests for themes module**

Create `src/__tests__/themes.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { THEME_PRESETS, applyTheme } from '../lib/themes';

describe('themes', () => {
  it('should have at least 8 presets', () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(8);
  });

  it('every preset should have id, name, dot, light, and dark', () => {
    for (const preset of THEME_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.dot).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(Object.keys(preset.light).length).toBe(25);
      expect(Object.keys(preset.dark).length).toBe(25);
    }
  });

  it('every preset light+dark should define the same variable keys', () => {
    const expectedKeys = Object.keys(THEME_PRESETS[0].light).sort();
    for (const preset of THEME_PRESETS) {
      expect(Object.keys(preset.light).sort()).toEqual(expectedKeys);
      expect(Object.keys(preset.dark).sort()).toEqual(expectedKeys);
    }
  });

  it('gold preset should match existing CSS values', () => {
    const gold = THEME_PRESETS.find((p) => p.id === 'gold');
    expect(gold).toBeDefined();
    expect(gold!.light['--color-accent']).toBe('#c8920a');
    expect(gold!.dark['--color-accent']).toBe('#d4a020');
  });

  it('applyTheme should set CSS variables on documentElement', () => {
    applyTheme('ocean', false);
    const style = document.documentElement.style;
    const ocean = THEME_PRESETS.find((p) => p.id === 'ocean')!;
    expect(style.getPropertyValue('--color-accent')).toBe(ocean.light['--color-accent']);
  });

  it('applyTheme should use dark variant when isDark is true', () => {
    applyTheme('ocean', true);
    const style = document.documentElement.style;
    const ocean = THEME_PRESETS.find((p) => p.id === 'ocean')!;
    expect(style.getPropertyValue('--color-accent')).toBe(ocean.dark['--color-accent']);
  });

  it('applyTheme should fall back to gold for unknown theme id', () => {
    applyTheme('nonexistent', false);
    const style = document.documentElement.style;
    const gold = THEME_PRESETS.find((p) => p.id === 'gold')!;
    expect(style.getPropertyValue('--color-accent')).toBe(gold.light['--color-accent']);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/__tests__/themes.test.ts`
Expected: FAIL — module not found.

**Step 3: Create themes module**

Create `src/lib/themes.ts`:

```ts
export interface ThemePreset {
  id: string;
  name: string;
  dot: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'gold',
    name: 'Gold',
    dot: '#c8920a',
    light: {
      '--color-bg-gradient-from': '#faf5eb',
      '--color-bg-gradient-to': '#f0e6d4',
      '--color-surface': '#ffffff',
      '--color-surface-hover': '#f5efe5',
      '--color-input-bg': '#fffefa',
      '--color-border': '#e5ddd0',
      '--color-border-focus': '#d4a034',
      '--color-text-primary': '#3d3529',
      '--color-text-secondary': '#7a7266',
      '--color-text-muted': '#a09888',
      '--color-accent': '#c8920a',
      '--color-accent-hover': '#b5830a',
      '--color-accent-soft': '#f5e6c8',
      '--color-accent-text': '#8a6a1a',
      '--color-success': '#c8920a',
      '--color-success-soft': '#f5e6c8',
      '--color-success-text': '#8a6a1a',
      '--color-nudge': '#c4880a',
      '--color-overlay': 'rgba(0, 0, 0, 0.2)',
      '--color-ring': 'rgba(200, 146, 10, 0.2)',
      '--color-progress-bg': '#e5ddd0',
      '--color-progress-fill': '#c8920a',
      '--color-check-border': '#c4bab0',
      '--color-check-hover-border': '#c8920a',
      '--color-check-hover-bg': '#faf0da',
    },
    dark: {
      '--color-bg-gradient-from': '#3a4028',
      '--color-bg-gradient-to': '#1a1e12',
      '--color-surface': 'rgba(42, 48, 25, 0.6)',
      '--color-surface-hover': 'rgba(50, 58, 34, 0.7)',
      '--color-input-bg': 'rgba(60, 66, 38, 0.9)',
      '--color-border': 'rgba(61, 68, 40, 0.5)',
      '--color-border-focus': '#d4a020',
      '--color-text-primary': '#f0ead6',
      '--color-text-secondary': '#c0b8a0',
      '--color-text-muted': '#8a846e',
      '--color-accent': '#d4a020',
      '--color-accent-hover': '#e0ad2a',
      '--color-accent-soft': 'rgba(80, 62, 20, 0.5)',
      '--color-accent-text': '#e8be48',
      '--color-success': '#d4a020',
      '--color-success-soft': 'rgba(80, 62, 20, 0.5)',
      '--color-success-text': '#e8be48',
      '--color-nudge': '#d4a020',
      '--color-overlay': 'rgba(0, 0, 0, 0.5)',
      '--color-ring': 'rgba(212, 160, 32, 0.3)',
      '--color-progress-bg': 'rgba(61, 68, 40, 0.4)',
      '--color-progress-fill': '#d4a020',
      '--color-check-border': '#5a6440',
      '--color-check-hover-border': '#d4a020',
      '--color-check-hover-bg': 'rgba(80, 62, 20, 0.3)',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    dot: '#0a84c8',
    light: {
      '--color-bg-gradient-from': '#eef6fb',
      '--color-bg-gradient-to': '#daeaf5',
      '--color-surface': '#ffffff',
      '--color-surface-hover': '#e8f2fa',
      '--color-input-bg': '#f8fbfe',
      '--color-border': '#c8dce8',
      '--color-border-focus': '#2a90c8',
      '--color-text-primary': '#1a2e3d',
      '--color-text-secondary': '#4a6a7a',
      '--color-text-muted': '#7a9aaa',
      '--color-accent': '#0a84c8',
      '--color-accent-hover': '#0a74b0',
      '--color-accent-soft': '#d0eaf8',
      '--color-accent-text': '#0a5a8a',
      '--color-success': '#0a84c8',
      '--color-success-soft': '#d0eaf8',
      '--color-success-text': '#0a5a8a',
      '--color-nudge': '#0878b8',
      '--color-overlay': 'rgba(0, 0, 0, 0.2)',
      '--color-ring': 'rgba(10, 132, 200, 0.2)',
      '--color-progress-bg': '#c8dce8',
      '--color-progress-fill': '#0a84c8',
      '--color-check-border': '#a0bcc8',
      '--color-check-hover-border': '#0a84c8',
      '--color-check-hover-bg': '#dff0fa',
    },
    dark: {
      '--color-bg-gradient-from': '#142838',
      '--color-bg-gradient-to': '#0a1822',
      '--color-surface': 'rgba(20, 40, 60, 0.6)',
      '--color-surface-hover': 'rgba(25, 50, 75, 0.7)',
      '--color-input-bg': 'rgba(30, 55, 80, 0.9)',
      '--color-border': 'rgba(30, 60, 90, 0.5)',
      '--color-border-focus': '#2a9ae0',
      '--color-text-primary': '#e0f0fa',
      '--color-text-secondary': '#90b8d0',
      '--color-text-muted': '#5a8aa0',
      '--color-accent': '#2a9ae0',
      '--color-accent-hover': '#40aae8',
      '--color-accent-soft': 'rgba(20, 60, 100, 0.5)',
      '--color-accent-text': '#60c0f0',
      '--color-success': '#2a9ae0',
      '--color-success-soft': 'rgba(20, 60, 100, 0.5)',
      '--color-success-text': '#60c0f0',
      '--color-nudge': '#2a9ae0',
      '--color-overlay': 'rgba(0, 0, 0, 0.5)',
      '--color-ring': 'rgba(42, 154, 224, 0.3)',
      '--color-progress-bg': 'rgba(30, 60, 90, 0.4)',
      '--color-progress-fill': '#2a9ae0',
      '--color-check-border': '#2a5070',
      '--color-check-hover-border': '#2a9ae0',
      '--color-check-hover-bg': 'rgba(20, 60, 100, 0.3)',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    dot: '#c84a6a',
    light: {
      '--color-bg-gradient-from': '#fcf0f3',
      '--color-bg-gradient-to': '#f5dce2',
      '--color-surface': '#ffffff',
      '--color-surface-hover': '#fae8ed',
      '--color-input-bg': '#fef8f9',
      '--color-border': '#e8c8d0',
      '--color-border-focus': '#d05a78',
      '--color-text-primary': '#3d1a28',
      '--color-text-secondary': '#7a4a5a',
      '--color-text-muted': '#aa7888',
      '--color-accent': '#c84a6a',
      '--color-accent-hover': '#b84060',
      '--color-accent-soft': '#f8d0da',
      '--color-accent-text': '#8a2a4a',
      '--color-success': '#c84a6a',
      '--color-success-soft': '#f8d0da',
      '--color-success-text': '#8a2a4a',
      '--color-nudge': '#c04468',
      '--color-overlay': 'rgba(0, 0, 0, 0.2)',
      '--color-ring': 'rgba(200, 74, 106, 0.2)',
      '--color-progress-bg': '#e8c8d0',
      '--color-progress-fill': '#c84a6a',
      '--color-check-border': '#c8a0b0',
      '--color-check-hover-border': '#c84a6a',
      '--color-check-hover-bg': '#fce0e8',
    },
    dark: {
      '--color-bg-gradient-from': '#381828',
      '--color-bg-gradient-to': '#220e18',
      '--color-surface': 'rgba(56, 24, 40, 0.6)',
      '--color-surface-hover': 'rgba(68, 30, 48, 0.7)',
      '--color-input-bg': 'rgba(78, 34, 54, 0.9)',
      '--color-border': 'rgba(80, 35, 55, 0.5)',
      '--color-border-focus': '#e05a80',
      '--color-text-primary': '#fae8ee',
      '--color-text-secondary': '#d0a0b0',
      '--color-text-muted': '#8a5a6a',
      '--color-accent': '#e05a80',
      '--color-accent-hover': '#e87098',
      '--color-accent-soft': 'rgba(100, 30, 50, 0.5)',
      '--color-accent-text': '#f090b0',
      '--color-success': '#e05a80',
      '--color-success-soft': 'rgba(100, 30, 50, 0.5)',
      '--color-success-text': '#f090b0',
      '--color-nudge': '#e05a80',
      '--color-overlay': 'rgba(0, 0, 0, 0.5)',
      '--color-ring': 'rgba(224, 90, 128, 0.3)',
      '--color-progress-bg': 'rgba(80, 35, 55, 0.4)',
      '--color-progress-fill': '#e05a80',
      '--color-check-border': '#6a3048',
      '--color-check-hover-border': '#e05a80',
      '--color-check-hover-bg': 'rgba(100, 30, 50, 0.3)',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    dot: '#8a6ac8',
    light: {
      '--color-bg-gradient-from': '#f5f0fc',
      '--color-bg-gradient-to': '#e8ddf5',
      '--color-surface': '#ffffff',
      '--color-surface-hover': '#f0e8fa',
      '--color-input-bg': '#fcf8fe',
      '--color-border': '#d4c4e8',
      '--color-border-focus': '#9a7ad4',
      '--color-text-primary': '#2a1e3d',
      '--color-text-secondary': '#5a4a7a',
      '--color-text-muted': '#8a7aaa',
      '--color-accent': '#8a6ac8',
      '--color-accent-hover': '#7a5ab8',
      '--color-accent-soft': '#e4d8f5',
      '--color-accent-text': '#5a3a8a',
      '--color-success': '#8a6ac8',
      '--color-success-soft': '#e4d8f5',
      '--color-success-text': '#5a3a8a',
      '--color-nudge': '#8264c0',
      '--color-overlay': 'rgba(0, 0, 0, 0.2)',
      '--color-ring': 'rgba(138, 106, 200, 0.2)',
      '--color-progress-bg': '#d4c4e8',
      '--color-progress-fill': '#8a6ac8',
      '--color-check-border': '#b8a8d0',
      '--color-check-hover-border': '#8a6ac8',
      '--color-check-hover-bg': '#ece0fa',
    },
    dark: {
      '--color-bg-gradient-from': '#261e38',
      '--color-bg-gradient-to': '#141020',
      '--color-surface': 'rgba(38, 30, 56, 0.6)',
      '--color-surface-hover': 'rgba(48, 38, 70, 0.7)',
      '--color-input-bg': 'rgba(54, 42, 78, 0.9)',
      '--color-border': 'rgba(55, 42, 80, 0.5)',
      '--color-border-focus': '#a080e0',
      '--color-text-primary': '#f0e8fa',
      '--color-text-secondary': '#b8a0d4',
      '--color-text-muted': '#6a5888',
      '--color-accent': '#a080e0',
      '--color-accent-hover': '#b090e8',
      '--color-accent-soft': 'rgba(60, 40, 100, 0.5)',
      '--color-accent-text': '#c8a8f0',
      '--color-success': '#a080e0',
      '--color-success-soft': 'rgba(60, 40, 100, 0.5)',
      '--color-success-text': '#c8a8f0',
      '--color-nudge': '#a080e0',
      '--color-overlay': 'rgba(0, 0, 0, 0.5)',
      '--color-ring': 'rgba(160, 128, 224, 0.3)',
      '--color-progress-bg': 'rgba(55, 42, 80, 0.4)',
      '--color-progress-fill': '#a080e0',
      '--color-check-border': '#483868',
      '--color-check-hover-border': '#a080e0',
      '--color-check-hover-bg': 'rgba(60, 40, 100, 0.3)',
    },
  },
  {
    id: 'sage',
    name: 'Sage',
    dot: '#5a9a6a',
    light: {
      '--color-bg-gradient-from': '#f0f8f2',
      '--color-bg-gradient-to': '#dceee0',
      '--color-surface': '#ffffff',
      '--color-surface-hover': '#e6f4ea',
      '--color-input-bg': '#f8fcf9',
      '--color-border': '#c0d8c6',
      '--color-border-focus': '#5aaa70',
      '--color-text-primary': '#1a3020',
      '--color-text-secondary': '#4a6a52',
      '--color-text-muted': '#7a9a82',
      '--color-accent': '#5a9a6a',
      '--color-accent-hover': '#4a8a5a',
      '--color-accent-soft': '#d0eed8',
      '--color-accent-text': '#2a6a3a',
      '--color-success': '#5a9a6a',
      '--color-success-soft': '#d0eed8',
      '--color-success-text': '#2a6a3a',
      '--color-nudge': '#529462',
      '--color-overlay': 'rgba(0, 0, 0, 0.2)',
      '--color-ring': 'rgba(90, 154, 106, 0.2)',
      '--color-progress-bg': '#c0d8c6',
      '--color-progress-fill': '#5a9a6a',
      '--color-check-border': '#a0c0a8',
      '--color-check-hover-border': '#5a9a6a',
      '--color-check-hover-bg': '#e0f4e4',
    },
    dark: {
      '--color-bg-gradient-from': '#182820',
      '--color-bg-gradient-to': '#0e1a12',
      '--color-surface': 'rgba(24, 42, 30, 0.6)',
      '--color-surface-hover': 'rgba(30, 52, 38, 0.7)',
      '--color-input-bg': 'rgba(34, 58, 42, 0.9)',
      '--color-border': 'rgba(35, 60, 42, 0.5)',
      '--color-border-focus': '#6ab87a',
      '--color-text-primary': '#e6f4ea',
      '--color-text-secondary': '#a0c8a8',
      '--color-text-muted': '#5a8a62',
      '--color-accent': '#6ab87a',
      '--color-accent-hover': '#80c890',
      '--color-accent-soft': 'rgba(30, 60, 40, 0.5)',
      '--color-accent-text': '#90e0a0',
      '--color-success': '#6ab87a',
      '--color-success-soft': 'rgba(30, 60, 40, 0.5)',
      '--color-success-text': '#90e0a0',
      '--color-nudge': '#6ab87a',
      '--color-overlay': 'rgba(0, 0, 0, 0.5)',
      '--color-ring': 'rgba(106, 184, 122, 0.3)',
      '--color-progress-bg': 'rgba(35, 60, 42, 0.4)',
      '--color-progress-fill': '#6ab87a',
      '--color-check-border': '#305840',
      '--color-check-hover-border': '#6ab87a',
      '--color-check-hover-bg': 'rgba(30, 60, 40, 0.3)',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    dot: '#6a7a8a',
    light: {
      '--color-bg-gradient-from': '#f2f4f6',
      '--color-bg-gradient-to': '#e0e4e8',
      '--color-surface': '#ffffff',
      '--color-surface-hover': '#eaecf0',
      '--color-input-bg': '#f8f9fa',
      '--color-border': '#c8ced4',
      '--color-border-focus': '#7a8a9a',
      '--color-text-primary': '#1a2028',
      '--color-text-secondary': '#4a5468',
      '--color-text-muted': '#8a9098',
      '--color-accent': '#6a7a8a',
      '--color-accent-hover': '#5a6a7a',
      '--color-accent-soft': '#d8dee4',
      '--color-accent-text': '#3a4a5a',
      '--color-success': '#6a7a8a',
      '--color-success-soft': '#d8dee4',
      '--color-success-text': '#3a4a5a',
      '--color-nudge': '#627282',
      '--color-overlay': 'rgba(0, 0, 0, 0.2)',
      '--color-ring': 'rgba(106, 122, 138, 0.2)',
      '--color-progress-bg': '#c8ced4',
      '--color-progress-fill': '#6a7a8a',
      '--color-check-border': '#a8b0b8',
      '--color-check-hover-border': '#6a7a8a',
      '--color-check-hover-bg': '#e4e8ec',
    },
    dark: {
      '--color-bg-gradient-from': '#1e2228',
      '--color-bg-gradient-to': '#12151a',
      '--color-surface': 'rgba(30, 35, 42, 0.6)',
      '--color-surface-hover': 'rgba(38, 44, 52, 0.7)',
      '--color-input-bg': 'rgba(42, 48, 58, 0.9)',
      '--color-border': 'rgba(45, 52, 62, 0.5)',
      '--color-border-focus': '#8a9aaa',
      '--color-text-primary': '#e8ecf0',
      '--color-text-secondary': '#a0aab8',
      '--color-text-muted': '#5a6878',
      '--color-accent': '#8a9aaa',
      '--color-accent-hover': '#9aaaba',
      '--color-accent-soft': 'rgba(40, 50, 65, 0.5)',
      '--color-accent-text': '#b0c0d0',
      '--color-success': '#8a9aaa',
      '--color-success-soft': 'rgba(40, 50, 65, 0.5)',
      '--color-success-text': '#b0c0d0',
      '--color-nudge': '#8a9aaa',
      '--color-overlay': 'rgba(0, 0, 0, 0.5)',
      '--color-ring': 'rgba(138, 154, 170, 0.3)',
      '--color-progress-bg': 'rgba(45, 52, 62, 0.4)',
      '--color-progress-fill': '#8a9aaa',
      '--color-check-border': '#3a4858',
      '--color-check-hover-border': '#8a9aaa',
      '--color-check-hover-bg': 'rgba(40, 50, 65, 0.3)',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    dot: '#c85a2a',
    light: {
      '--color-bg-gradient-from': '#fcf2ec',
      '--color-bg-gradient-to': '#f5ddd0',
      '--color-surface': '#ffffff',
      '--color-surface-hover': '#fae8de',
      '--color-input-bg': '#fef9f6',
      '--color-border': '#e8cec0',
      '--color-border-focus': '#d06a3a',
      '--color-text-primary': '#3d2018',
      '--color-text-secondary': '#7a5040',
      '--color-text-muted': '#aa8070',
      '--color-accent': '#c85a2a',
      '--color-accent-hover': '#b85020',
      '--color-accent-soft': '#f8d8c4',
      '--color-accent-text': '#8a3a1a',
      '--color-success': '#c85a2a',
      '--color-success-soft': '#f8d8c4',
      '--color-success-text': '#8a3a1a',
      '--color-nudge': '#c05428',
      '--color-overlay': 'rgba(0, 0, 0, 0.2)',
      '--color-ring': 'rgba(200, 90, 42, 0.2)',
      '--color-progress-bg': '#e8cec0',
      '--color-progress-fill': '#c85a2a',
      '--color-check-border': '#c8a898',
      '--color-check-hover-border': '#c85a2a',
      '--color-check-hover-bg': '#fce4d4',
    },
    dark: {
      '--color-bg-gradient-from': '#381e14',
      '--color-bg-gradient-to': '#22120c',
      '--color-surface': 'rgba(56, 30, 20, 0.6)',
      '--color-surface-hover': 'rgba(68, 38, 26, 0.7)',
      '--color-input-bg': 'rgba(78, 42, 28, 0.9)',
      '--color-border': 'rgba(80, 42, 28, 0.5)',
      '--color-border-focus': '#e06a3a',
      '--color-text-primary': '#fae8de',
      '--color-text-secondary': '#d0a890',
      '--color-text-muted': '#8a6050',
      '--color-accent': '#e06a3a',
      '--color-accent-hover': '#e88050',
      '--color-accent-soft': 'rgba(100, 40, 20, 0.5)',
      '--color-accent-text': '#f0a070',
      '--color-success': '#e06a3a',
      '--color-success-soft': 'rgba(100, 40, 20, 0.5)',
      '--color-success-text': '#f0a070',
      '--color-nudge': '#e06a3a',
      '--color-overlay': 'rgba(0, 0, 0, 0.5)',
      '--color-ring': 'rgba(224, 106, 58, 0.3)',
      '--color-progress-bg': 'rgba(80, 42, 28, 0.4)',
      '--color-progress-fill': '#e06a3a',
      '--color-check-border': '#6a3420',
      '--color-check-hover-border': '#e06a3a',
      '--color-check-hover-bg': 'rgba(100, 40, 20, 0.3)',
    },
  },
  {
    id: 'sky',
    name: 'Sky',
    dot: '#4a9ac8',
    light: {
      '--color-bg-gradient-from': '#eef8fc',
      '--color-bg-gradient-to': '#d8ecf5',
      '--color-surface': '#ffffff',
      '--color-surface-hover': '#e4f2fa',
      '--color-input-bg': '#f6fbfe',
      '--color-border': '#bcd8e8',
      '--color-border-focus': '#50a8d8',
      '--color-text-primary': '#1a2830',
      '--color-text-secondary': '#4a6878',
      '--color-text-muted': '#7a98a8',
      '--color-accent': '#4a9ac8',
      '--color-accent-hover': '#3a8ab8',
      '--color-accent-soft': '#c8e8f8',
      '--color-accent-text': '#2a6a8a',
      '--color-success': '#4a9ac8',
      '--color-success-soft': '#c8e8f8',
      '--color-success-text': '#2a6a8a',
      '--color-nudge': '#4494c0',
      '--color-overlay': 'rgba(0, 0, 0, 0.2)',
      '--color-ring': 'rgba(74, 154, 200, 0.2)',
      '--color-progress-bg': '#bcd8e8',
      '--color-progress-fill': '#4a9ac8',
      '--color-check-border': '#98bcd0',
      '--color-check-hover-border': '#4a9ac8',
      '--color-check-hover-bg': '#daf0fa',
    },
    dark: {
      '--color-bg-gradient-from': '#122030',
      '--color-bg-gradient-to': '#0a141e',
      '--color-surface': 'rgba(18, 32, 48, 0.6)',
      '--color-surface-hover': 'rgba(22, 40, 60, 0.7)',
      '--color-input-bg': 'rgba(26, 46, 68, 0.9)',
      '--color-border': 'rgba(28, 48, 70, 0.5)',
      '--color-border-focus': '#5ab0e0',
      '--color-text-primary': '#e4f0fa',
      '--color-text-secondary': '#88b4d0',
      '--color-text-muted': '#4a7a98',
      '--color-accent': '#5ab0e0',
      '--color-accent-hover': '#70c0e8',
      '--color-accent-soft': 'rgba(20, 50, 80, 0.5)',
      '--color-accent-text': '#88d0f0',
      '--color-success': '#5ab0e0',
      '--color-success-soft': 'rgba(20, 50, 80, 0.5)',
      '--color-success-text': '#88d0f0',
      '--color-nudge': '#5ab0e0',
      '--color-overlay': 'rgba(0, 0, 0, 0.5)',
      '--color-ring': 'rgba(90, 176, 224, 0.3)',
      '--color-progress-bg': 'rgba(28, 48, 70, 0.4)',
      '--color-progress-fill': '#5ab0e0',
      '--color-check-border': '#284868',
      '--color-check-hover-border': '#5ab0e0',
      '--color-check-hover-bg': 'rgba(20, 50, 80, 0.3)',
    },
  },
];

export function applyTheme(themeId: string, isDark: boolean): void {
  const preset = THEME_PRESETS.find((p) => p.id === themeId) ?? THEME_PRESETS[0];
  const vars = isDark ? preset.dark : preset.light;
  const style = document.documentElement.style;
  for (const [key, value] of Object.entries(vars)) {
    style.setProperty(key, value);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --run`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/lib/themes.ts src/__tests__/themes.test.ts
git commit -m "feat: add theme presets and applyTheme helper"
```

---

### Task 3: Update useSettings migration and defaults

**Files:**
- Modify: `src/hooks/useSettings.ts:6-13` (defaultSettings)
- Modify: `src/hooks/useSettings.ts:15-34` (migrateSettings)

**Step 1: Update defaultSettings**

In `src/hooks/useSettings.ts`, add `theme: 'gold'` to `defaultSettings` (line 6-13):

```ts
const defaultSettings: Settings = {
  provider: 'openai',
  apiKey: '',
  model: '',
  userName: '',
  showBookmarks: false,
  bookmarks: [],
  theme: 'gold',
};
```

**Step 2: Update migrateSettings**

In the `migrateSettings` function, add `theme` to both return paths:

In the legacy migration block (line 16-24), add `theme: 'gold'`.

In the main return block (line 26-33), add:
```ts
theme: (raw.theme as string) ?? 'gold',
```

**Step 3: Run tests**

Run: `npm test -- --run`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/hooks/useSettings.ts
git commit -m "feat: add theme default and migration to useSettings"
```

---

### Task 4: Apply theme on settings change in App.tsx

**Files:**
- Modify: `entrypoints/newtab/App.tsx`

**Step 1: Add theme application effect**

Add import for `applyTheme` and a `useEffect` that applies the theme whenever `settings.theme` changes. Place it after the existing imports and after the settings destructure.

Add to imports:
```ts
import { applyTheme } from '../../src/lib/themes';
```

Add a new `useEffect` after line 23 (after the existing state declarations):

```ts
useEffect(() => {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(settings.theme, isDark);

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => applyTheme(settings.theme, e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, [settings.theme]);
```

This effect:
- Applies the theme immediately based on current OS dark/light preference
- Listens for OS theme changes and re-applies with the correct light/dark variant
- Re-runs whenever the user picks a new theme

**Step 2: Run tests and build**

Run: `npm test -- --run && npm run build`
Expected: All pass, clean build.

**Step 3: Commit**

```bash
git add entrypoints/newtab/App.tsx
git commit -m "feat: apply theme on settings change with dark mode listener"
```

---

### Task 5: Flash prevention inline script

**Files:**
- Modify: `entrypoints/newtab/index.html`

**Step 1: Add inline script**

Add a `<script>` block before the React mount script in `entrypoints/newtab/index.html`. This runs synchronously before React renders, reading the saved theme from storage and applying CSS variables immediately:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>crush</title>
  </head>
  <body>
    <div id="root"></div>
    <script>
      // Apply saved theme before React renders to prevent flash of default theme.
      // This duplicates minimal logic from themes.ts to avoid module loading delay.
      try {
        var raw = localStorage.getItem('crush-settings');
        if (raw) {
          var settings = JSON.parse(raw);
          var themeId = settings.theme || 'gold';
          if (themeId !== 'gold') {
            // Fetch the theme data inline — we store a cache in localStorage
            var themeCache = localStorage.getItem('crush-theme-cache');
            if (themeCache) {
              var cached = JSON.parse(themeCache);
              if (cached.id === themeId) {
                var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var vars = isDark ? cached.dark : cached.light;
                var style = document.documentElement.style;
                for (var key in vars) {
                  style.setProperty(key, vars[key]);
                }
              }
            }
          }
        }
      } catch (e) {}
    </script>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

**Step 2: Update applyTheme to write cache**

In `src/lib/themes.ts`, update `applyTheme` to also write the active preset to `crush-theme-cache` in localStorage so the inline script can read it on next load:

```ts
export function applyTheme(themeId: string, isDark: boolean): void {
  const preset = THEME_PRESETS.find((p) => p.id === themeId) ?? THEME_PRESETS[0];
  const vars = isDark ? preset.dark : preset.light;
  const style = document.documentElement.style;
  for (const [key, value] of Object.entries(vars)) {
    style.setProperty(key, value);
  }
  try {
    localStorage.setItem('crush-theme-cache', JSON.stringify({
      id: preset.id,
      light: preset.light,
      dark: preset.dark,
    }));
  } catch {}
}
```

**Step 3: Build and verify**

Run: `npm run build`
Expected: Clean build. The inline script is plain JS (no modules) so it runs synchronously.

**Step 4: Commit**

```bash
git add entrypoints/newtab/index.html src/lib/themes.ts
git commit -m "feat: add flash prevention inline script with theme cache"
```

---

### Task 6: Theme dot grid in SettingsPanel

**Files:**
- Modify: `entrypoints/newtab/components/SettingsPanel.tsx`

**Step 1: Add theme imports and UI**

Add import at top of `SettingsPanel.tsx`:
```ts
import { THEME_PRESETS } from '../../../src/lib/themes';
```

Add a Theme section as the first settings group, right after the `<h2>` (line 108). Insert before the Provider `<div className="mb-4">` block:

```tsx
<div className="mb-4">
  <label className="mb-2 block text-sm text-text-secondary">Theme</label>
  <div className="flex gap-2">
    {THEME_PRESETS.map((preset) => (
      <button
        key={preset.id}
        onClick={() => updateSettings({ theme: preset.id })}
        className={`h-7 w-7 rounded-full transition-all hover:scale-110 ${
          settings.theme === preset.id
            ? 'ring-2 ring-text-primary ring-offset-2 ring-offset-[var(--color-bg-gradient-from)]'
            : 'opacity-70 hover:opacity-100'
        }`}
        style={{ backgroundColor: preset.dot }}
        title={preset.name}
        aria-label={`${preset.name} theme`}
      />
    ))}
  </div>
</div>
```

**Step 2: Run tests and build**

Run: `npm test -- --run && npm run build`
Expected: All pass, clean build.

**Step 3: Commit**

```bash
git add entrypoints/newtab/components/SettingsPanel.tsx
git commit -m "feat: add theme dot grid to settings panel"
```

---

### Verification

After all tasks:

1. `npm test -- --run` — all tests pass
2. `npm run build` — clean build
3. Manual: open new tab, click settings, see theme dots, click one, page theme changes instantly
4. Manual: close settings, open again — theme persists
5. Manual: reload page — no flash of gold theme (for non-gold themes)
6. Manual: toggle OS dark/light mode — theme adapts
