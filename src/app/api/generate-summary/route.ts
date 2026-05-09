import { NextResponse } from 'next/server';
import { getAIConfig, createOpenAIClient } from '@/lib/ai-config';

const SYSTEM_PROMPT = `你是一名专业的文章摘要生成助手。

请阅读用户提供的标题和正文内容，生成一段简洁精准的摘要。

要求：
1. 严格控制在 140 个中文字符以内（含标点符号）
2. 准确概括文章核心观点或主题
3. 语言流畅、自然，适合作为文章预览展示
4. 只输出摘要正文，不要添加任何解释或额外文字`;

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

    const config = await getAIConfig();

    if (!config.apiKey) {
      return NextResponse.json(
        { error: 'AI API 密钥未配置，请在设置页面配置' },
        { status: 500 },
      );
    }

    const client = createOpenAIClient(config);
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `标题：${title || '无标题'}\n\n正文：\n${content}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    let summary = response.choices?.[0]?.message?.content?.trim() ?? '';

    if (summary.length > 140) {
      summary = summary.slice(0, 140);
    }

    return NextResponse.json({ summary, modelName: config.model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '服务器内部错误';
    return NextResponse.json(
      { error: `AI API 请求失败: ${message}` },
      { status: 502 },
    );
  }
}
