import { describe, it, expect } from 'vitest';
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
