import { createClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/blog/post-card'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PostWithAuthor } from '@/lib/db/types'

interface PageProps {
  params: Promise<{ authorId: string }>
}

export default async function AuthorPage({ params }: PageProps) {
  const { authorId } = await params

  const supabase = await createClient()

  // Fetch author display name
  const { data: authorSettings } = await supabase
    .from('user_settings')
    .select('display_name')
    .eq('user_id', authorId)
    .maybeSingle()

  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('author_id', authorId)
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) return notFound()

  const authorName = authorSettings?.display_name ?? null

  const postsWithAuthor = posts.map((p) => ({
    ...p,
    author: { email: null, name: authorName },
    like_count: 0,
    comment_count: 0,
    is_liked_by_current_user: false,
  })) as PostWithAuthor[]

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm">
        <Link href="/" className="flex items-center gap-1 pl-0">
          <ArrowLeft className="h-4 w-4" />
          返回文章列表
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold">
          <span className="font-bold text-primary">{authorName ?? '作者'}</span>
          <span className="font-normal text-muted-foreground"> 的文章</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{postsWithAuthor.length} 篇</p>
      </div>

      {postsWithAuthor.length > 0 ? (
        <div className="grid gap-4">
          {postsWithAuthor.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>该用户还没有发布文章</p>
        </div>
      )}
    </div>
  )
}
