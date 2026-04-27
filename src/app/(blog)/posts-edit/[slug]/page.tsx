import { getPostBySlug, getTopTags } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PostEditor } from '@/components/blog/post-editor'
import { DeletePostButton } from '@/components/blog/delete-post-button'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EditPostPage({ params }: PageProps) {
  const { slug } = await params
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/posts-edit/${slug}`)

  const { data: post, error } = await getPostBySlug(slug)

  if (!post || error) {
    notFound()
  }

  if (user.id !== post.author_id) {
    return <p className="text-destructive">无权编辑此文章</p>
  }

  const suggestedTags = await getTopTags(10)

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="sm">
          <Link href={`/posts/${post.slug}`} className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            返回文章详情
          </Link>
        </Button>
        <div className="ml-auto">
          <DeletePostButton postId={post.id} />
        </div>
      </div>
      <h1 className="text-3xl font-bold">编辑文章</h1>
      <PostEditor initialData={post as any} suggestedTags={suggestedTags} />
    </div>
  )
}
