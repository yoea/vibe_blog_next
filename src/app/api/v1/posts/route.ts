import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublishedPosts } from '@/lib/db/queries';
import { ErrorCode } from '@/lib/db/types';

// GET /api/v1/posts — 列出文章（分页）
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', error_code: ErrorCode.UNAUTHORIZED },
      { status: 401 },
    );
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(
    parseInt(searchParams.get('pageSize') || '10', 10),
    50,
  );

  const { data, count } = await getPublishedPosts(page, pageSize);
  return NextResponse.json({ data, count });
}

// POST /api/v1/posts — 创建文章
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', error_code: ErrorCode.UNAUTHORIZED },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { title, content, excerpt, tags, published, cover_image_url } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: '标题和内容不能为空', error_code: ErrorCode.VALIDATION },
        { status: 400 },
      );
    }

    const supabase = await createAdminClient();

    const id = crypto.randomUUID();
    const slug = id.slice(0, 8);

    const { data: created, error: insertError } = await supabase
      .from('posts')
      .insert({
        id,
        author_id: auth.userId,
        title: title.trim(),
        slug,
        content: content.trim(),
        excerpt: excerpt?.trim() ?? null,
        published: published ?? true,
        cover_image_url: cover_image_url ?? null,
      })
      .select('slug')
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: `创建失败: ${insertError.message}`,
          error_code: ErrorCode.SERVER_ERROR,
        },
        { status: 500 },
      );
    }

    // 处理标签
    if (tags && Array.isArray(tags) && tags.length > 0 && created) {
      const { data: postData } = await supabase
        .from('posts')
        .select('id')
        .eq('slug', created.slug)
        .single();

      if (postData) {
        for (const tagName of tags) {
          if (typeof tagName !== 'string' || !tagName.trim()) continue;
          const trimmed = tagName.trim().slice(0, 20);
          const tagSlug = trimmed
            .replace(/[^\w一-鿿]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();

          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('slug', tagSlug)
            .maybeSingle();

          let tagId: string;
          if (existingTag) {
            tagId = existingTag.id;
          } else {
            const { data: newTag, error: createTagError } = await supabase
              .from('tags')
              .insert({ name: trimmed, slug: tagSlug })
              .select('id')
              .single();

            if (createTagError) continue;
            tagId = newTag.id;
          }

          await supabase.from('post_tags').insert({
            post_id: postData.id,
            tag_id: tagId,
          });
        }
      }
    }

    return NextResponse.json({ data: { slug } }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: '请求格式错误', error_code: ErrorCode.VALIDATION },
      { status: 400 },
    );
  }
}
