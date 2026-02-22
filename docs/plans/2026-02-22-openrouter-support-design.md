# Multi-provider support via OpenRouter

## Goal

Let users choose between OpenAI (direct) and OpenRouter as their AI provider, giving access to 500+ models (Claude, Gemini, Llama, etc.) through a single OpenAI-compatible API.

## Data model

```ts
type Provider = 'openai' | 'openrouter';

interface Settings {
  provider: Provider;    // default: 'openai'
  apiKey: string;        // replaces openaiApiKey
  model: string;         // empty = provider default
  userName: string;
}
```

Migration: on first load, if stored settings contain `openaiApiKey`, copy it to `apiKey`, set `provider: 'openai'`, drop the old key.

## AI client

Provider config map with base URL and default model per provider:

| Provider | Base URL | Default model |
|----------|----------|---------------|
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | `openai/gpt-4o-mini` |

Both use identical request/response format (OpenAI chat completions). Rename `callOpenAI` to `callLLM`, accept `provider` and optional `model` override in options.

## Model validation

Both providers expose `GET {baseUrl}/models` with the user's API key. On provider or key change, fetch the model list and cache in memory. When the user types a model name, validate against the cached list. Show green checkmark for valid, red "model not found" for invalid. Validation only active when an API key is saved.

## Hook changes

`useAI(apiKey, provider, model)` — passes provider and model through to `callLLM`. All three call sites (parseTask, generateBrief, chat) use the same provider/model.

## Settings panel UI

```
Provider         [OpenAI ▾]
API Key          [sk-...        ] [save]
Model (optional) [gpt-4o-mini   ] ✓
Your Name        [              ]
```

- Provider: dropdown, OpenAI or OpenRouter
- API Key: password input (same as current)
- Model: text input, placeholder shows provider default, validated against fetched model list
- OpenRouter hint below model field: "browse models at openrouter.ai/models"

## App.tsx

- `useAI(settings.apiKey, settings.provider, settings.model)`
- Onboarding text becomes provider-agnostic: "add your API key in settings..."
- `hasApiKey` checks `settings.apiKey` instead of `settings.openaiApiKey`

## Files touched

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `Provider`, update `Settings` |
| `src/lib/ai-client.ts` | Provider config, rename to `callLLM`, add `fetchModels` |
| `src/hooks/useAI.ts` | Updated signature, use `callLLM` |
| `src/hooks/useSettings.ts` | Migration, updated defaults, `hasApiKey` |
| `entrypoints/newtab/App.tsx` | Pass provider/model, update onboarding text |
| `entrypoints/newtab/components/SettingsPanel.tsx` | Provider dropdown, model field with validation |

## Out of scope

- Direct Anthropic/Gemini API adapters
- Per-feature model selection
- Searchable model dropdown
- Provider-specific error messages
