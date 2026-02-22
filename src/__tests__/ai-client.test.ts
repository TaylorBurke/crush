import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callOpenAI } from '../lib/ai-client';

describe('callOpenAI', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('calls the OpenAI API with correct parameters', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '{"title":"Test"}' } }] }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);
    const result = await callOpenAI({ apiKey: 'sk-test', messages: [{ role: 'user', content: 'hello' }] });
    expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Authorization': 'Bearer sk-test' }),
    }));
    expect(result).toBe('{"title":"Test"}');
  });

  it('includes response_format when specified', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '{}' } }] }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);
    await callOpenAI({
      apiKey: 'sk-test',
      messages: [{ role: 'user', content: 'hello' }],
      responseFormat: { type: 'json_object' },
    });
    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.response_format).toEqual({ type: 'json_object' });
  });

  it('uses default model and temperature', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);
    await callOpenAI({ apiKey: 'sk-test', messages: [{ role: 'user', content: 'hi' }] });
    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.model).toBe('gpt-4o-mini');
    expect(callBody.temperature).toBe(0.3);
  });

  it('throws on API error with message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false, status: 401, statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
    } as Response);
    await expect(callOpenAI({ apiKey: 'bad', messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(/401/);
  });

  it('throws on API error when JSON parsing fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false, status: 500, statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('bad json')),
    } as Response);
    await expect(callOpenAI({ apiKey: 'sk-test', messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(/500/);
  });
});
