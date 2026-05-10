import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, authErrorResponse } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorCode } from '@/lib/db/types';

function randomTagColor(): string {
  const palette = [
    '#3B82F6',
    '#22C55E',
    '#A855F7',
    '#EC4899',
    '#F97316',
    '#14B8A6',
    '#EF4444',
    '#6366F1',
    '#EAB308',
    '#06B6D4',
    '#84CC16',
    '#F43F5E',
    '#8B5CF6',
    '#0EA5E9',
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}

// GET /api/v1/tags — 列出所有标签
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const { data: tags, error } = await supabase
    .from('tags')
    .select('id, name, slug, color, created_at, created_by')
    .order('name');

  if (error)
    return NextResponse.json(
      { error: error.message, error_code: ErrorCode.SERVER_ERROR },
      { status: 500 },
    );

  return NextResponse.json({ data: tags });
}

// POST /api/v1/tags — 创建标签
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, slug: customSlug, color } = body;

    if (!name?.trim())
      return NextResponse.json(
        { error: '标签名不能为空', error_code: ErrorCode.VALIDATION },
        { status: 400 },
      );

    const trimmed = name.trim().slice(0, 50);
    const slug = (customSlug?.trim() || trimmed)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[<>#"{}|\\^`]/g, '')
      .slice(0, 100);

    const supabase = await createAdminClient();

    // 检查 slug 是否已存在
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing)
      return NextResponse.json(
        { error: `标签 "${slug}" 已存在`, error_code: ErrorCode.CONFLICT },
        { status: 409 },
      );

    const insertData: Record<string, unknown> = {
      name: trimmed,
      slug,
      color: color || randomTagColor(),
      created_by: (auth as { userId: string; keyId: string }).userId,
    };

    const { data: newTag, error } = await supabase
      .from('tags')
      .insert(insertData)
      .select('id, name, slug, color, created_at')
      .single();

    if (error)
      return NextResponse.json(
        {
          error: `创建失败: ${error.message}`,
          error_code: ErrorCode.SERVER_ERROR,
        },
        { status: 500 },
      );

    return NextResponse.json({ data: newTag }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: '请求格式错误', error_code: ErrorCode.VALIDATION },
      { status: 400 },
    );
  }
}
