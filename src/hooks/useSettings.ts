import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';

const SETTINGS_KEY = 'crush-settings';

const defaultSettings: Settings = {
  provider: 'openai',
  apiKey: '',
  model: '',
  userName: '',
  showBookmarks: false,
  bookmarks: [],
};

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

function getStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return {
      async get(): Promise<Settings> {
        return new Promise((resolve) => {
          chrome.storage.local.get(SETTINGS_KEY, (result) => {
            resolve(result[SETTINGS_KEY] ? migrateSettings(result[SETTINGS_KEY]) : defaultSettings);
          });
        });
      },
      async set(settings: Settings): Promise<void> {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [SETTINGS_KEY]: settings }, resolve);
        });
      },
    };
  }
  return {
    async get(): Promise<Settings> {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? migrateSettings(JSON.parse(raw)) : defaultSettings;
    },
    async set(settings: Settings): Promise<void> {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    },
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const storage = getStorage();

  useEffect(() => {
    storage.get().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      storage.set(next);
      return next;
    });
  }, [storage]);

  const hasApiKey = Boolean(settings.apiKey);

  return { settings, updateSettings, loaded, hasApiKey };
}
