import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';

const SETTINGS_KEY = 'crush-settings';

const defaultSettings: Settings = {
  openaiApiKey: '',
  userName: '',
};

function getStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return {
      async get(): Promise<Settings> {
        return new Promise((resolve) => {
          chrome.storage.local.get(SETTINGS_KEY, (result) => {
            resolve(result[SETTINGS_KEY] ?? defaultSettings);
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
      return raw ? JSON.parse(raw) : defaultSettings;
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

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    await storage.set(next);
  }, [settings, storage]);

  const hasApiKey = Boolean(settings.openaiApiKey);

  return { settings, updateSettings, loaded, hasApiKey };
}
