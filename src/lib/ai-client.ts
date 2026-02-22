const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CallOptions {
  apiKey: string;
  messages: Message[];
  model?: string;
  temperature?: number;
  responseFormat?: { type: 'json_object' };
}

export async function callOpenAI(options: CallOptions): Promise<string> {
  const { apiKey, messages, model = DEFAULT_MODEL, temperature = 0.3, responseFormat } = options;
  const body: Record<string, unknown> = { model, messages, temperature };
  if (responseFormat) body.response_format = responseFormat;

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error ${response.status}: ${error?.error?.message ?? response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
