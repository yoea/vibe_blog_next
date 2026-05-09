import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: rows } = await supabase
      .from('site_config')
      .select('key, value')
      .in('key', ['ai_base_url', 'ai_api_key']);

    const configMap = new Map(
      (rows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]),
    );
    const baseUrl = configMap.get('ai_base_url') ?? '';
    const apiKey = configMap.get('ai_api_key') ?? '';

    if (!apiKey) {
      return NextResponse.json({ error: 'API 密钥未配置' }, { status: 400 });
    }

    // 只代理 deepseek 余额查询
    if (!baseUrl.includes('deepseek.com')) {
      return NextResponse.json({ error: '非 DeepSeek API' }, { status: 400 });
    }

    const res = await fetch('https://api.deepseek.com/user/balance', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.error?.message || `请求失败 (${res.status})` },
        { status: res.status },
      );
    }

    const data = await res.json();
    const info = data?.balance_infos?.[0];
    if (!info) {
      return NextResponse.json({ error: '余额数据为空' });
    }

    return NextResponse.json({
      balance: info.total_balance,
      currency: info.currency,
    });
  } catch {
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
