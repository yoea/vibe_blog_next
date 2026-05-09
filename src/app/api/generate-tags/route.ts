import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIConfig, createOpenAIClient } from '@/lib/ai-config';
import { logger } from '@/lib/utils/logger';

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

    // 从数据库获取全部已有标签
    const supabase = await createClient();
    const { data: allTags } = await supabase
      .from('tags')
      .select('name')
      .order('name');
    const tagList = (allTags ?? []).map((t) => t.name).join('、') || '无';

    const systemPrompt = `你是一名文章标签生成助手。根据文章标题和正文，生成 10 个标签。

要求：
- 推荐标签 4 个，备选标签 6 个
- 标签语言以中文为主，技术术语可保留英文
- 中文标签尽量 2-3 个字，不超过 5 个字
- 标签应准确反映文章主题和关键内容
- 优先复用已有标签（如果与文章内容相关）

已有标签列表（供参考）：
${tagList}

只输出 JSON，不要添加任何其他文字或代码块标记：
{“recommended”: [“标签1”, “标签2”, “标签3”, “标签4”], “alternative”: [“标签5”, “标签6”, “标签7”, “标签8”, “标签9”, “标签10”]}`;

    const client = createOpenAIClient(config);
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `标题：${title || '无标题'}\n\n正文：\n${content}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const raw = response.choices?.[0]?.message?.content?.trim() ?? '';
    logger.debug('AI 返回原始内容:', raw);

    // ──────────────────────────────────────
    // 稳健 JSON 提取
    // ──────────────────────────────────────
    let jsonStr = '';

    // Strategy 1: 优先提取 ```json ... ``` 内的内容
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      // Strategy 2: 找到第一个 { 和最后一个 } 之间的内容
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = raw.slice(firstBrace, lastBrace + 1).trim();
      } else {
        jsonStr = raw;
      }
    }

    // 清理中文引号（” “ → “ “）
    jsonStr = jsonStr.replace(/[“”]/g, '”');

    // 移除尾逗号（AI 常犯错误）：], → ]   }, → }
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    logger.debug('解析 JSON:', jsonStr);

    let recommended: string[] = [];
    let alternative: string[] = [];
    try {
      const parsed = JSON.parse(jsonStr);
      recommended = (parsed.recommended ?? [])
        .map((t: string) => t.trim())
        .filter(Boolean)
        .slice(0, 4);
      alternative = (parsed.alternative ?? [])
        .map((t: string) => t.trim())
        .filter(Boolean)
        .slice(0, 6);
      logger.debug('解析结果:', { recommended, alternative });
    } catch (e) {
      logger.error('JSON 解析失败:', e, '原始内容:', raw, '处理后:', jsonStr);
      return NextResponse.json(
        { error: 'AI 返回格式异常，请重试' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      recommended,
      alternative,
      modelName: config.model,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '服务器内部错误';
    return NextResponse.json(
      { error: `AI API 请求失败: ${message}` },
      { status: 502 },
    );
  }
}
