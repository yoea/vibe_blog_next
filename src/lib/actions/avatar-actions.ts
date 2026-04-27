'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/db/types'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadAvatar(formData: FormData): Promise<ActionResult & { avatarUrl?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const file = formData.get('avatar') as File
  if (!file) return { error: '未选择文件' }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: '仅支持 JPG, PNG, WebP 格式' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: '文件大小不能超过 20MB' }
  }

  const bytes = await file.arrayBuffer()
  const ext = file.type === 'image/png' ? 'png'
    : file.type === 'image/webp' ? 'webp'
    : 'jpg'
  const timestamp = Date.now()
  const fileName = `${user.id}/avatar_${timestamp}.${ext}`

  // 清理旧头像文件
  const { data: oldFiles } = await supabase.storage
    .from('avatars')
    .list(user.id, { search: 'avatar' })
  if (oldFiles && oldFiles.length > 0) {
    const oldPaths = oldFiles.map((f) => `${user.id}/${f.name}`)
    await supabase.storage.from('avatars').remove(oldPaths)
  }

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, bytes, { contentType: file.type })

  if (uploadError) return { error: `上传失败: ${uploadError.message}` }

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  const publicUrl = urlData.publicUrl

  const { error: dbError } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: user.id, avatar_url: publicUrl },
      { onConflict: 'user_id' }
    )

  if (dbError) return { error: `保存失败: ${dbError.message}` }

  revalidatePath('/settings')
  revalidatePath('/profile')

  return { avatarUrl: publicUrl }
}

export async function deleteAvatar(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  if (settings?.avatar_url) {
    try {
      const urlPath = new URL(settings.avatar_url).pathname
      const filePath = decodeURIComponent(urlPath.split('/storage/v1/object/public/avatars/')[1] ?? '')
      if (filePath) {
        await supabase.storage.from('avatars').remove([filePath])
      }
    } catch {
      // Ignore URL parse errors
    }
  }

  const { error } = await supabase
    .from('user_settings')
    .update({ avatar_url: null })
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/profile')

  return {}
}
