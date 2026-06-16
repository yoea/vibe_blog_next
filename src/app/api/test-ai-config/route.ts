import { NextResponse } from 'next/server';
import { getAIConfig, testAIConnection } from '@/lib/utils/ai-config';

export async function POST() {
  try {
    const config = await getAIConfig();

    if (!config.apiKey) {
      return NextResponse.json(
        { success: false, error: 'API 密钥未配置' },
        { status: 400 },
      );
    }

    const result = await testAIConnection(config);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 },
    );
  }
}
