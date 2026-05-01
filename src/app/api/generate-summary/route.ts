import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SYSTEM_PROMPT = `你是一名专业的文章摘要生成助手。

请阅读用户提供的标题和正文内容，生成一段简洁精准的摘要。

要求：
1. 严格控制在 140 个中文字符以内（含标点符号）
2. 准确概括文章核心观点或主题
3. 语言流畅、自然，适合作为文章预览展示
4. 只输出摘要正文，不要添加任何解释或额外文字`;

async function getAIConfig() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('site_config')
    .select('key, value')
    .in('key', ['ai_base_url', 'ai_api_key', 'ai_model']);

  const config = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    baseUrl: config.ai_base_url || 'https://api.openai.com',
    apiKey: config.ai_api_key || '',
    model: config.ai_model || 'gpt-4o-mini',
  };
}

export async function GET() {
  const { model } = await getAIConfig();
  return NextResponse.json({ modelName: model });
}

export async function POST(request: Request) {
  try {
    const { title, content } = await request.json();

    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { error: '正文内容不足 100 字' },
        { status: 400 },
      );
    }

    const { baseUrl, apiKey, model } = await getAIConfig();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API 密钥未配置，请在设置页面配置' },
        { status: 500 },
      );
    }

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `标题：${title || '无标题'}\n\n正文：\n${content}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return NextResponse.json(
        { error: `AI API 请求失败: ${errText}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    let summary = data.choices?.[0]?.message?.content?.trim() ?? '';

    // 确保摘要不超过 140 字
    if (summary.length > 140) {
      summary = summary.slice(0, 140);
    }

    return NextResponse.json({ summary, modelName: model });
  } catch {
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
