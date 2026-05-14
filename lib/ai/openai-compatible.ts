import type { ZiweiChart } from '@/lib/ziwei/types';

export interface InterpretMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OpenAICompatibleConfig {
  provider: 'openai' | 'deepseek';
  apiKey: string;
  baseUrl: string;
  model: string;
}

type Env = Record<string, string | undefined>;

const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';

export function resolveOpenAICompatibleConfig(env: Env = process.env): OpenAICompatibleConfig {
  const provider = resolveProvider(env);

  if (provider === 'deepseek') {
    const apiKey = env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('缺少 DEEPSEEK_API_KEY，请在 .env.local 中配置 DeepSeek API Key');
    }

    return {
      provider,
      apiKey,
      baseUrl: normalizeBaseUrl(env.DEEPSEEK_BASE_URL ?? DEFAULT_DEEPSEEK_BASE_URL, DEFAULT_DEEPSEEK_BASE_URL),
      model: env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL,
    };
  }

  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('缺少 OPENAI_API_KEY，请在 .env.local 中配置 OpenAI API Key，或设置 AI_PROVIDER=deepseek 并配置 DEEPSEEK_API_KEY');
  }

  return {
    provider,
    apiKey,
    baseUrl: normalizeBaseUrl(env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL, DEFAULT_OPENAI_BASE_URL),
    model: env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
  };
}

export function getChatCompletionsUrl(config: OpenAICompatibleConfig): string {
  return `${config.baseUrl}/chat/completions`;
}

export function buildInterpretRequestBody(
  config: OpenAICompatibleConfig,
  chart: ZiweiChart,
  messages: InterpretMessage[],
) {
  return {
    model: config.model,
    stream: true,
    temperature: 0.6,
    messages: [
      {
        role: 'system',
        content: [
          '你是紫微斗数命盘解读助手，采用中文回答。',
          '请基于用户提供的命盘结构回答，不要声称自己能预测绝对结果。',
          '输出要具体、分点、可操作；涉及健康、婚姻、财务时给出温和建议，不制造恐慌。',
          '如果问题超出命盘信息，请明确说明只能做传统命理角度的参考分析。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `以下是当前用户的紫微斗数命盘 JSON，请作为后续对话的唯一命盘依据：\n${JSON.stringify(chart)}`,
      },
      ...messages.map(message => ({
        role: message.role,
        content: message.content,
      })),
    ],
  };
}

export function convertOpenAIStreamLine(line: string): string | null {
  if (!line.startsWith('data: ')) return null;

  const data = line.slice(6).trim();
  if (!data) return null;
  if (data === '[DONE]') return 'data: [DONE]\n\n';

  try {
    const parsed = JSON.parse(data);
    const text = parsed.choices?.[0]?.delta?.content ?? '';
    if (!text) return null;
    return `data: ${JSON.stringify({ delta: { text } })}\n\n`;
  } catch {
    return null;
  }
}

function resolveProvider(env: Env): OpenAICompatibleConfig['provider'] {
  const provider = env.AI_PROVIDER?.trim().toLowerCase();
  if (!provider) return env.DEEPSEEK_API_KEY?.trim() && !env.OPENAI_API_KEY?.trim() ? 'deepseek' : 'openai';
  if (provider === 'openai' || provider === 'deepseek') return provider;
  throw new Error('AI_PROVIDER 只能是 openai 或 deepseek');
}

function normalizeBaseUrl(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/\/+$/, '');
}
