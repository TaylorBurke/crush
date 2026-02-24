import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from '../hooks/useSettings';

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with default settings', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.showBookmarks).toBe(false);
    expect(result.current.settings.bookmarks).toEqual([]);
    expect(result.current.settings.theme).toBe('gold');
  });

  it('updates showBookmarks without affecting other settings', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ showBookmarks: true });
    });
    expect(result.current.settings.showBookmarks).toBe(true);
    expect(result.current.settings.theme).toBe('gold');
  });

  it('persists showBookmarks to storage', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ showBookmarks: true });
    });
    const raw = localStorage.getItem('crush-settings');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).showBookmarks).toBe(true);
  });

  it('loads persisted settings on mount', async () => {
    localStorage.setItem('crush-settings', JSON.stringify({
      provider: 'openai',
      apiKey: 'sk-test',
      model: '',
      userName: '',
      showBookmarks: true,
      bookmarks: [{ id: 'bm-1', url: 'https://example.com', label: 'Example', icon: '' }],
      theme: 'gold',
    }));

    const { result } = renderHook(() => useSettings());

    // Wait for async settings load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.settings.showBookmarks).toBe(true);
    expect(result.current.settings.bookmarks).toHaveLength(1);
    expect(result.current.loaded).toBe(true);
  });

  it('preserves showBookmarks when updating unrelated settings', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ showBookmarks: true });
    });
    act(() => {
      result.current.updateSettings({ theme: 'ocean' });
    });
    expect(result.current.settings.showBookmarks).toBe(true);
    expect(result.current.settings.theme).toBe('ocean');
  });

  it('preserves showBookmarks across multiple rapid updates', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ showBookmarks: true });
      result.current.updateSettings({ userName: 'Test' });
      result.current.updateSettings({ theme: 'ocean' });
    });
    expect(result.current.settings.showBookmarks).toBe(true);
    expect(result.current.settings.userName).toBe('Test');
    expect(result.current.settings.theme).toBe('ocean');
  });

  it('toggling showBookmarks persists correctly', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ showBookmarks: true });
    });
    expect(result.current.settings.showBookmarks).toBe(true);

    act(() => {
      result.current.updateSettings({ showBookmarks: false });
    });
    expect(result.current.settings.showBookmarks).toBe(false);

    const raw = JSON.parse(localStorage.getItem('crush-settings')!);
    expect(raw.showBookmarks).toBe(false);
  });

  it('updateSettings is stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useSettings());
    const firstRef = result.current.updateSettings;
    rerender();
    expect(result.current.updateSettings).toBe(firstRef);
  });
});
