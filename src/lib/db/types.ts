export interface Tag {
  id: string
  name: string
  slug: string
  color: string
  created_at: string
  created_by: string | null
}

export interface Post {
  id: string
  author_id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  published: boolean
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface PostWithAuthor extends Post {
  author: { email: string | null; name: string | null; avatar_url: string | null }
  like_count: number
  comment_count: number
  is_liked_by_current_user: boolean
  tags: Tag[]
}

export interface Comment {
  id: string
  post_id: string
  author_id: string | null
  parent_id: string | null
  content: string
  created_at: string
  updated_at: string
}

export interface CommentWithAuthor extends Comment {
  author_email: string | null
  author: { email: string | null; display_name: string | null; avatar_url: string | null }
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
  author_id: string | null
  parent_id: string | null
  content: string
  created_at: string
  author_email: string | null
  author: { display_name: string | null; avatar_url: string | null }
}

export interface GuestbookMessage {
  id: string
  to_author_id: string
  author_id: string | null
  parent_id: string | null
  content: string
  created_at: string
}

export interface GuestbookMessageWithAuthor extends GuestbookMessage {
  author_email: string | null
  author: { display_name: string | null; avatar_url: string | null }
  replies?: GuestbookMessageWithAuthor[]
}

/** Base result type for server actions — { error?: string } on failure, {} on success */
export type ActionResult = { error?: string }

/** Extended post data for the editor, includes cloud draft if one exists */
export interface PostEditorData extends Post {
  draft_title?: string
  draft_content?: string
  draft_excerpt?: string | null
  draft_updated_at?: string | null
}

export type NotificationType = 'post_like' | 'post_comment' | 'guestbook_message'

export interface Notification {
  id: string
  recipient_id: string
  type: NotificationType
  actor_id: string | null
  actor_name: string | null
  actor_avatar_url: string | null
  post_id: string | null
  post_slug: string | null
  post_title: string | null
  guestbook_author_id: string | null
  guestbook_message_id: string | null
  guestbook_message_content: string | null
  is_read: boolean
  is_dismissed: boolean
  created_at: string
}
