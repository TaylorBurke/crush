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
