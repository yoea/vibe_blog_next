import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

async function getAIConfig() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('site_config')
    .select('key, value')
    .in('key', ['ai_base_url', 'ai_api_key', 'ai_model'])

  const config = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))
  return {
    baseUrl: config.ai_base_url || 'https://api.openai.com',
    apiKey: config.ai_api_key || '',
    model: config.ai_model || 'gpt-4o-mini',
  }
}

export async function POST(request: Request) {
  try {
    const { title, content, existingTags } = await request.json()

    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { error: '正文内容不足 100 字' },
        { status: 400 }
      )
    }

    const { baseUrl, apiKey, model } = await getAIConfig()

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API 密钥未配置，请在设置页面配置' },
        { status: 500 }
      )
    }

    const tagList = (existingTags as string[] ?? []).join('、') || '无'

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
{"recommended": ["标签1", "标签2", "标签3", "标签4"], "alternative": ["标签5", "标签6", "标签7", "标签8", "标签9", "标签10"]}`

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `标题：${title || '无标题'}\n\n正文：\n${content}` },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return NextResponse.json(
        { error: `AI API 请求失败: ${errText}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
    logger.debug('AI 返回原始内容:', raw)

    // Parse JSON response (strip markdown code block if present)
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    logger.debug('解析 JSON:', jsonStr)

    let recommended: string[] = []
    let alternative: string[] = []
    try {
      const parsed = JSON.parse(jsonStr)
      recommended = (parsed.recommended ?? []).map((t: string) => t.trim()).filter(Boolean).slice(0, 4)
      alternative = (parsed.alternative ?? []).map((t: string) => t.trim()).filter(Boolean).slice(0, 6)
      logger.debug('解析结果:', { recommended, alternative })
    } catch (e) {
      logger.error('JSON 解析失败:', e, '原始内容:', jsonStr)
      return NextResponse.json(
        { error: 'AI 返回格式异常，请重试' },
        { status: 502 }
      )
    }

    return NextResponse.json({ recommended, alternative, modelName: model })
  } catch {
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
