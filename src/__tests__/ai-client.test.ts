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
