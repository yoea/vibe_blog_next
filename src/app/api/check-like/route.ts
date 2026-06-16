import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/utils/get-client-ip';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  if (!postId) {
    return Response.json({ error: 'missing postId' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isLiked = false;

  if (user) {
    const { data } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();
    isLiked = !!data;
  } else {
    const ip = await getClientIp();
    if (ip && ip !== 'unknown') {
      const { data } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('ip', ip)
        .maybeSingle();
      isLiked = !!data;
    }
  }

  return Response.json({ isLiked });
}
