export interface Post {
  id: string
  author_id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  published: boolean
  created_at: string
  updated_at: string
}

export interface PostWithAuthor extends Post {
  author: { email: string | null; name: string | null }
  like_count: number
  comment_count: number
  is_liked_by_current_user: boolean
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  parent_id: string | null
  content: string
  created_at: string
  updated_at: string
}

export interface CommentWithAuthor extends Comment {
  author_email: string | null
  author: { email: string | null; display_name: string | null }
  replies?: CommentWithAuthor[]
  like_count: number
  is_liked: boolean
}

export interface AuthUser {
  id: string
  email: string | null
}

export interface ThreadedItemBase {
  id: string
  author_id: string
  parent_id: string | null
  content: string
  created_at: string
  author_email: string | null
  author: { display_name: string | null }
}

export interface GuestbookMessage {
  id: string
  to_author_id: string
  author_id: string
  parent_id: string | null
  content: string
  created_at: string
}

export interface GuestbookMessageWithAuthor extends GuestbookMessage {
  author_email: string | null
  author: { display_name: string | null }
  replies?: GuestbookMessageWithAuthor[]
}
