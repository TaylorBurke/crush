# Multi-Provider Support (OpenRouter) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users choose between OpenAI and OpenRouter as their AI provider, with optional model override and validation.

**Architecture:** Add a `Provider` type and update `Settings` to store provider + generic API key + optional model. The AI client gets a provider config map and renamed `callLLM` function. A `fetchModels` utility validates model names against the provider's model list. Settings panel gets a provider dropdown and model input with validation indicator.

**Tech Stack:** React, TypeScript, Vitest, Tailwind CSS, WXT (Chrome extension framework)

---

### Task 1: Update types

**Files:**
- Modify: `src/types/index.ts:57-60`
- Modify: `src/__tests__/types.test.ts`

**Step 1: Write the failing test**

In `src/__tests__/types.test.ts`, add after the existing tests (after line 48):

```ts
it('should accept valid Provider values', () => {
  const p1: Provider = 'openai';
  const p2: Provider = 'openrouter';
  expect(p1).toBe('openai');
  expect(p2).toBe('openrouter');
});

it('should create Settings with provider and model', () => {
  const s: Settings = {
    provider: 'openrouter',
    apiKey: 'sk-or-test',
    model: 'anthropic/claude-haiku-4-5',
    userName: 'Taylor',
  };
  expect(s.provider).toBe('openrouter');
  expect(s.model).toBe('anthropic/claude-haiku-4-5');
});
```

Update the import on line 2 to include `Provider, Settings`:
```ts
import type { Task, ComputedView, TaskStatus, Importance, Provider, Settings } from '../types';
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/__tests__/types.test.ts`
Expected: FAIL — `Provider` not exported, `Settings` shape doesn't match

**Step 3: Write minimal implementation**

Replace `src/types/index.ts:57-60` with:

```ts
export type Provider = 'openai' | 'openrouter';

export interface Settings {
  provider: Provider;
  apiKey: string;
  model: string;
  userName: string;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/__tests__/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/index.ts src/__tests__/types.test.ts
git commit -m "feat: add Provider type and update Settings interface"
```

---

### Task 2: Update AI client

**Files:**
- Modify: `src/lib/ai-client.ts`
- Modify: `src/__tests__/ai-client.test.ts`

**Step 1: Write the failing tests**

Replace all of `src/__tests__/ai-client.test.ts` with:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callLLM, fetchModels, PROVIDER_CONFIG } from '../lib/ai-client';

describe('callLLM', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('calls OpenAI endpoint by default', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '{"title":"Test"}' } }] }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);
    const result = await callLLM({ apiKey: 'sk-test', provider: 'openai', messages: [{ role: 'user', content: 'hello' }] });
    expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Authorization': 'Bearer sk-test' }),
    }));
    expect(result).toBe('{"title":"Test"}');
  });

  it('calls OpenRouter endpoint when provider is openrouter', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);
    await callLLM({ apiKey: 'sk-or-test', provider: 'openrouter', messages: [{ role: 'user', content: 'hi' }] });
    expect(fetch).toHaveBeenCalledWith('https://openrouter.ai/api/v1/chat/completions', expect.anything());
  });

  it('uses provider default model when no model specified', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);
    await callLLM({ apiKey: 'sk-test', provider: 'openai', messages: [{ role: 'user', content: 'hi' }] });
    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.model).toBe('gpt-4o-mini');
  });

  it('uses custom model when specified', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);
    await callLLM({ apiKey: 'sk-or-test', provider: 'openrouter', model: 'anthropic/claude-haiku-4-5', messages: [{ role: 'user', content: 'hi' }] });
    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.model).toBe('anthropic/claude-haiku-4-5');
  });

  it('includes response_format when specified', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '{}' } }] }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);
    await callLLM({
      apiKey: 'sk-test',
      provider: 'openai',
      messages: [{ role: 'user', content: 'hello' }],
      responseFormat: { type: 'json_object' },
    });
    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.response_format).toEqual({ type: 'json_object' });
  });

  it('throws on API error with message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false, status: 401, statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
    } as Response);
    await expect(callLLM({ apiKey: 'bad', provider: 'openai', messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(/401/);
  });

  it('throws on API error when JSON parsing fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false, status: 500, statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('bad json')),
    } as Response);
    await expect(callLLM({ apiKey: 'sk-test', provider: 'openai', messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(/500/);
  });
});

describe('fetchModels', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('returns model IDs from provider', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4o' }] }),
    } as Response);
    const models = await fetchModels('openai', 'sk-test');
    expect(models).toEqual(['gpt-4o-mini', 'gpt-4o']);
  });

  it('calls the correct models endpoint for openrouter', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'openai/gpt-4o-mini' }] }),
    } as Response);
    await fetchModels('openrouter', 'sk-or-test');
    expect(fetch).toHaveBeenCalledWith('https://openrouter.ai/api/v1/models', expect.objectContaining({
      headers: expect.objectContaining({ 'Authorization': 'Bearer sk-or-test' }),
    }));
  });

  it('returns empty array on error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false, status: 401, statusText: 'Unauthorized',
      json: () => Promise.resolve({}),
    } as Response);
    const models = await fetchModels('openai', 'bad-key');
    expect(models).toEqual([]);
  });
});

describe('PROVIDER_CONFIG', () => {
  it('has config for openai', () => {
    expect(PROVIDER_CONFIG.openai.url).toContain('openai.com');
    expect(PROVIDER_CONFIG.openai.defaultModel).toBe('gpt-4o-mini');
  });

  it('has config for openrouter', () => {
    expect(PROVIDER_CONFIG.openrouter.url).toContain('openrouter.ai');
    expect(PROVIDER_CONFIG.openrouter.defaultModel).toBe('openai/gpt-4o-mini');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/__tests__/ai-client.test.ts`
Expected: FAIL — `callLLM`, `fetchModels`, `PROVIDER_CONFIG` not exported

**Step 3: Write minimal implementation**

Replace all of `src/lib/ai-client.ts` with:

```ts
import type { Provider } from '../types';

export const PROVIDER_CONFIG: Record<Provider, { url: string; modelsUrl: string; defaultModel: string }> = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    modelsUrl: 'https://api.openai.com/v1/models',
    defaultModel: 'gpt-4o-mini',
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    defaultModel: 'openai/gpt-4o-mini',
  },
};

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CallOptions {
  apiKey: string;
  provider: Provider;
  messages: Message[];
  model?: string;
  temperature?: number;
  responseFormat?: { type: 'json_object' };
}

export async function callLLM(options: CallOptions): Promise<string> {
  const { apiKey, provider, messages, model, temperature = 0.3, responseFormat } = options;
  const config = PROVIDER_CONFIG[provider];
  const body: Record<string, unknown> = { model: model || config.defaultModel, messages, temperature };
  if (responseFormat) body.response_format = responseFormat;

  const response = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`API error ${response.status}: ${error?.error?.message ?? response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function fetchModels(provider: Provider, apiKey: string): Promise<string[]> {
  const config = PROVIDER_CONFIG[provider];
  try {
    const response = await fetch(config.modelsUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.data ?? []).map((m: { id: string }) => m.id);
  } catch {
    return [];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/__tests__/ai-client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/ai-client.ts src/__tests__/ai-client.test.ts
git commit -m "feat: add multi-provider support to AI client with model validation"
```

---

### Task 3: Update useSettings hook with migration

**Files:**
- Modify: `src/hooks/useSettings.ts`

**Step 1: Update implementation**

Replace all of `src/hooks/useSettings.ts` with:

```ts
import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';

const SETTINGS_KEY = 'crush-settings';

const defaultSettings: Settings = {
  provider: 'openai',
  apiKey: '',
  model: '',
  userName: '',
};

function migrateSettings(raw: Record<string, unknown>): Settings {
  // Migrate from old format: openaiApiKey -> apiKey
  if ('openaiApiKey' in raw && !('apiKey' in raw)) {
    return {
      provider: 'openai',
      apiKey: (raw.openaiApiKey as string) || '',
      model: '',
      userName: (raw.userName as string) || '',
    };
  }
  return {
    provider: (raw.provider as Settings['provider']) || 'openai',
    apiKey: (raw.apiKey as string) || '',
    model: (raw.model as string) || '',
    userName: (raw.userName as string) || '',
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

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    await storage.set(next);
  }, [settings, storage]);

  const hasApiKey = Boolean(settings.apiKey);

  return { settings, updateSettings, loaded, hasApiKey };
}
```

**Step 2: Run all tests**

Run: `npm test -- --run`
Expected: Some tests may fail due to `callOpenAI` import in `useAI.ts` — that's expected, we fix it in Task 4.

**Step 3: Commit**

```bash
git add src/hooks/useSettings.ts
git commit -m "feat: update useSettings with provider/model fields and migration"
```

---

### Task 4: Update useAI hook

**Files:**
- Modify: `src/hooks/useAI.ts`

**Step 1: Update implementation**

Change line 2 of `src/hooks/useAI.ts` from:
```ts
import { callOpenAI } from '../lib/ai-client';
```
to:
```ts
import { callLLM } from '../lib/ai-client';
import type { Provider } from '../types';
```

Change line 9 from:
```ts
export function useAI(apiKey: string) {
```
to:
```ts
export function useAI(apiKey: string, provider: Provider, model: string) {
```

Replace every `callOpenAI({` with `callLLM({` and add `provider, model,` to each call's options object. There are three call sites:

1. Line 22 (parseTask): `callOpenAI({ apiKey, messages, responseFormat })` → `callLLM({ apiKey, provider, model, messages, responseFormat })`
2. Line 43 (generateBrief): `callOpenAI({ apiKey, messages, responseFormat })` → `callLLM({ apiKey, provider, model, messages, responseFormat })`
3. Line 62 (chat): `callOpenAI({ apiKey, messages: [...] })` → `callLLM({ apiKey, provider, model, messages: [...] })`

**Step 2: Run all tests**

Run: `npm test -- --run`
Expected: PASS (or close — may still have SettingsPanel referencing `openaiApiKey`)

**Step 3: Commit**

```bash
git add src/hooks/useAI.ts
git commit -m "feat: update useAI to use callLLM with provider and model"
```

---

### Task 5: Update App.tsx

**Files:**
- Modify: `entrypoints/newtab/App.tsx`

**Step 1: Update implementation**

Change line 19 from:
```ts
const ai = useAI(settings.openaiApiKey);
```
to:
```ts
const ai = useAI(settings.apiKey, settings.provider, settings.model);
```

Change line 113 from:
```ts
<p className="text-sm text-accent-text">add your OpenAI API key in settings to unlock AI-powered task parsing, daily briefs, and smart prioritization.</p>
```
to:
```ts
<p className="text-sm text-accent-text">add your API key in settings to unlock AI-powered task parsing, daily briefs, and smart prioritization.</p>
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Clean build (or close — SettingsPanel may still reference old field)

**Step 3: Commit**

```bash
git add entrypoints/newtab/App.tsx
git commit -m "feat: wire provider and model settings into App"
```

---

### Task 6: Update SettingsPanel with provider dropdown and model validation

**Files:**
- Modify: `entrypoints/newtab/components/SettingsPanel.tsx`

**Step 1: Update implementation**

Replace all of `entrypoints/newtab/components/SettingsPanel.tsx` with:

```tsx
import { useState, useEffect } from 'react';
import { useSettings } from '../../../src/hooks/useSettings';
import { fetchModels, PROVIDER_CONFIG } from '../../../src/lib/ai-client';
import type { Provider } from '../../../src/types';

export function SettingsPanel() {
  const { settings, updateSettings, hasApiKey } = useSettings();
  const [open, setOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [availableModels, setAvailableModels] = useState<string[] | null>(null);
  const [modelStatus, setModelStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  useEffect(() => {
    if (hasApiKey) {
      fetchModels(settings.provider, settings.apiKey).then(setAvailableModels);
    } else {
      setAvailableModels(null);
    }
  }, [settings.provider, settings.apiKey, hasApiKey]);

  useEffect(() => {
    setModelInput(settings.model);
  }, [settings.model]);

  useEffect(() => {
    if (!modelInput || !availableModels) {
      setModelStatus('idle');
      return;
    }
    setModelStatus(availableModels.includes(modelInput) ? 'valid' : 'invalid');
  }, [modelInput, availableModels]);

  const handleSaveKey = () => {
    if (keyInput.trim()) {
      updateSettings({ apiKey: keyInput.trim() });
      setKeyInput('');
    }
  };

  const handleModelBlur = () => {
    updateSettings({ model: modelInput.trim() });
  };

  const config = PROVIDER_CONFIG[settings.provider];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 rounded-full bg-surface-hover p-2.5 text-text-muted transition-colors hover:bg-surface hover:text-text-secondary"
        aria-label="settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-[var(--color-bg-gradient-from)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-medium text-text-primary">settings</h2>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-text-secondary">Provider</label>
          <select
            value={settings.provider}
            onChange={(e) => updateSettings({ provider: e.target.value as Provider, apiKey: '', model: '' })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-focus"
          >
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-text-secondary">API Key</label>
          {hasApiKey ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-accent">key saved</span>
              <button onClick={() => updateSettings({ apiKey: '' })} className="text-xs text-text-muted hover:text-text-secondary">remove</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="sk-..." className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus" />
              <button onClick={handleSaveKey} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">save</button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-text-secondary">Model (optional)</label>
          <div className="relative">
            <input
              type="text"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              onBlur={handleModelBlur}
              placeholder={config.defaultModel}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-8 text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus"
            />
            {modelStatus === 'valid' && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-accent" aria-label="model valid">✓</span>
            )}
            {modelStatus === 'invalid' && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 text-xs" aria-label="model invalid">✗</span>
            )}
          </div>
          {modelStatus === 'invalid' && (
            <p className="mt-1 text-xs text-red-500">model not found</p>
          )}
          {settings.provider === 'openrouter' && (
            <p className="mt-1 text-xs text-text-muted">
              browse models at{' '}
              <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-secondary">openrouter.ai/models</a>
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm text-text-secondary">Your Name</label>
          <input type="text" value={settings.userName} onChange={(e) => updateSettings({ userName: e.target.value })} placeholder="what should crush call you?" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus" />
        </div>
        <button onClick={() => setOpen(false)} className="w-full rounded-lg bg-surface-hover py-2 text-sm text-text-secondary hover:bg-surface">close</button>
      </div>
    </div>
  );
}
```

**Step 2: Run full test suite and build**

Run: `npm test -- --run && npm run build`
Expected: All tests pass, clean build

**Step 3: Commit**

```bash
git add entrypoints/newtab/components/SettingsPanel.tsx
git commit -m "feat: add provider dropdown and model validation to settings"
```

---

### Task 7: Final verification

**Step 1: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass

**Step 2: Run build**

Run: `npm run build`
Expected: Clean build with no TypeScript errors

**Step 3: Squash or tag**

All tasks complete. Ready for push.
