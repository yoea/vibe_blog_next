import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

let cachedConfig: AIConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 分钟

export async function getAIConfig(): Promise<AIConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('site_config')
    .select('key, value')
    .in('key', ['ai_base_url', 'ai_api_key', 'ai_model']);

  const config = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  cachedConfig = {
    baseUrl: config.ai_base_url || 'https://api.openai.com',
    apiKey: config.ai_api_key || '',
    model: config.ai_model || 'gpt-4o-mini',
  };
  cacheTime = now;
  return cachedConfig;
}

export function clearAIConfigCache() {
  cachedConfig = null;
  cacheTime = 0;
}

export function createOpenAIClient(config: AIConfig) {
  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });
}

/** 测试 API 连接并尝试列出模型 */
export async function testAIConnection(config: AIConfig): Promise<{
  success: boolean;
  models?: string[];
  error?: string;
}> {
  const client = createOpenAIClient(config);

  try {
    const models = await client.models.list();
    const modelIds: string[] = [];
    for await (const model of models) {
      if (model.id) modelIds.push(model.id);
    }
    return { success: true, models: modelIds };
  } catch (err: unknown) {
    // models.list 失败时尝试用 chat completions 做轻量探测
    try {
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      });
      if (response.choices?.length > 0) {
        return { success: true };
      }
      return { success: false, error: 'API 返回了空响应' };
    } catch (chatErr: unknown) {
      const message = chatErr instanceof Error ? chatErr.message : '未知错误';
      return { success: false, error: message };
    }
  }
}
