import OpenAI from 'openai';

const PROVIDER_BASE_URLS: Record<string, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/',
};

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (_client) return _client;

  const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();

  let apiKey: string | undefined;
  if (provider === 'gemini') {
    apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY must be set when AI_PROVIDER=gemini');
  } else {
    apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY must be set when AI_PROVIDER=openai');
  }

  const baseURL = process.env.AI_BASE_URL ?? PROVIDER_BASE_URLS[provider];

  _client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  return _client;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAI() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const EXPENSE_MODEL =
  process.env.AI_EXPENSE_MODEL ?? process.env.OPENAI_EXPENSE_MODEL ?? 'gpt-4o-mini';

export const TRANSCRIPTION_MODEL =
  process.env.AI_TRANSCRIPTION_MODEL ?? process.env.OPENAI_TRANSCRIPTION_MODEL ?? 'gpt-4o-mini-transcribe';
