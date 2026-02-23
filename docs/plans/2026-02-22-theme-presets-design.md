# Theme Presets Design

## Goal

Let users pick from a grid of curated color themes in settings, while keeping the existing OS-driven dark/light switching.

## Architecture

Each theme preset is a data object mapping all 25 CSS variable names to light and dark values. A `themes.ts` module holds the presets and an `applyTheme()` helper that sets CSS variables on `:root`. An inline script in `newtab.html` applies the saved theme before React mounts to prevent flash-of-default-theme.

## Data Model

Add `theme: string` to `Settings` (default: `'gold'`). Each preset:

```ts
interface ThemePreset {
  id: string;
  name: string;
  dot: string;       // accent hex shown in the dot grid
  light: Record<string, string>;
  dark: Record<string, string>;
}
```

## Presets

| Preset | Accent | Light BG | Dark BG | Vibe |
|--------|--------|----------|---------|------|
| Gold (default) | #c8920a | warm cream | forest green | current theme |
| Ocean | #0a84c8 | cool white-blue | deep navy | calm |
| Rose | #c84a6a | soft blush | deep burgundy | warm |
| Lavender | #8a6ac8 | light lilac | deep purple | creative |
| Sage | #5a9a6a | mint cream | dark teal | earthy |
| Slate | #6a7a8a | cool gray | charcoal | minimal |
| Ember | #c85a2a | warm sand | dark brown | energetic |
| Sky | #4a9ac8 | pale sky | midnight blue | airy |

All 25 CSS variables hand-crafted per preset per mode.

## Theme Application

1. **Page load:** inline `<script>` in `newtab.html` reads theme from storage, applies CSS vars to `:root` before React renders.
2. **Runtime:** `useEffect` in `App.tsx` watches `settings.theme`, calls `applyTheme(presetId)` which sets all 25 vars via `document.documentElement.style.setProperty()`. Checks `prefers-color-scheme` to pick light or dark variant.
3. **Fallback:** `style.css` `@theme` block stays as-is (gold), serves as CSS default.

## Settings UI

A row of ~24px colored dots in the Theme section of SettingsPanel (above Provider). Each dot is the preset's accent color. Active dot gets a ring indicator. Clicking applies immediately (no confirm button).

## Files

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `theme: string` to Settings |
| `src/lib/themes.ts` | New: preset definitions + applyTheme() |
| `src/hooks/useSettings.ts` | Default theme: 'gold', migration |
| `entrypoints/newtab/App.tsx` | useEffect to apply theme on change |
| `entrypoints/newtab/index.html` | Inline script for flash prevention |
| `entrypoints/newtab/components/SettingsPanel.tsx` | Theme dot grid |
| `entrypoints/newtab/style.css` | No changes |
