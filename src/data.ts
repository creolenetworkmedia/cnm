import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Locale } from './i18n'

export type I18nText = Partial<Record<Locale, string>>

export type StationConfig = {
  singleton: boolean
  station_name: string
  short_name: string
  domain: string
  supported_locales: Locale[]
  default_locale: Locale
  station_timezone: string
  primary_stream_url: string | null
  low_data_stream_url: string | null
  stream_enabled: boolean
  donation_url: string | null
}

export type MediaAsset = {
  id: string
  bucket: string
  original_path: string
  alt_i18n: I18nText
  status: string
}

export type ArticleCategory = {
  id: string
  slug: string
  name_i18n: I18nText
  position: number
}

export type Article = {
  id: string
  slug: string
  category_id: string | null
  title_i18n: I18nText
  excerpt_i18n: I18nText
  body_i18n: I18nText
  hero_media_id: string | null
  author_user_id: string | null
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived'
  scheduled_for: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  category?: ArticleCategory | null
  hero?: MediaAsset | null
}

export type Show = {
  id: string
  slug: string
  title: string
  description_i18n: I18nText
  is_published: boolean
}

export type ScheduleSlot = {
  id: string
  show_id: string
  day_of_week: number
  start_time: string
  duration_minutes: number
  timezone: string
  is_active: boolean
  show?: Show | null
}

export type Profile = {
  user_id: string
  display_name: string | null
  preferred_language: Locale
  data_saver_mode: 'auto' | 'on' | 'off'
}

export async function getStation() {
  const { data, error } = await supabase.from('station_config').select('*').eq('singleton', true).single()
  if (error) throw error
  return data as StationConfig
}

async function hydrateArticles(rows: Article[]) {
  const categoryIds = [...new Set(rows.map((x) => x.category_id).filter(Boolean))] as string[]
  const mediaIds = [...new Set(rows.map((x) => x.hero_media_id).filter(Boolean))] as string[]

  const [categoriesResult, mediaResult] = await Promise.all([
    categoryIds.length
      ? supabase.from('article_categories').select('id,slug,name_i18n,position').in('id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
    mediaIds.length
      ? supabase.from('media_assets').select('id,bucket,original_path,alt_i18n,status').in('id', mediaIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (categoriesResult.error) throw categoriesResult.error
  if (mediaResult.error) throw mediaResult.error

  const categories = new Map((categoriesResult.data ?? []).map((x: any) => [x.id, x]))
  const media = new Map((mediaResult.data ?? []).map((x: any) => [x.id, x]))

  return rows.map((article) => ({
    ...article,
    category: article.category_id ? (categories.get(article.category_id) as ArticleCategory | undefined) ?? null : null,
    hero: article.hero_media_id ? (media.get(article.hero_media_id) as MediaAsset | undefined) ?? null : null,
  }))
}

export async function getPublishedArticles(limit = 24) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return hydrateArticles((data ?? []) as Article[])
}

export async function getArticleBySlug(slug: string) {
  const { data, error } = await supabase.from('articles').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  if (!data) return null
  const [article] = await hydrateArticles([data as Article])
  return article
}

export async function getCategories() {
  const { data, error } = await supabase.from('article_categories').select('*').eq('is_active', true).order('position')
  if (error) throw error
  return (data ?? []) as ArticleCategory[]
}

export async function getSchedule() {
  const { data, error } = await supabase.from('schedule_slots').select('*').eq('is_active', true).order('day_of_week').order('start_time')
  if (error) throw error
  const rows = (data ?? []) as ScheduleSlot[]
  const showIds = [...new Set(rows.map((x) => x.show_id))]
  let shows: Show[] = []
  if (showIds.length) {
    const { data: showData, error: showError } = await supabase.from('shows').select('*').in('id', showIds).eq('is_published', true)
    if (showError) throw showError
    shows = (showData ?? []) as Show[]
  }
  const showMap = new Map(shows.map((x) => [x.id, x]))
  return rows.map((x) => ({ ...x, show: showMap.get(x.show_id) ?? null })).filter((x) => x.show)
}

export function getPublicMediaUrl(asset: MediaAsset | null | undefined) {
  if (!asset?.bucket || !asset.original_path) return null
  return supabase.storage.from(asset.bucket).getPublicUrl(asset.original_path).data.publicUrl
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function updateProfile(userId: string, values: Partial<Profile>) {
  const { error } = await supabase.from('profiles').update(values).eq('user_id', userId)
  if (error) throw error
}

export async function isCurrentUserAdmin() {
  const { data, error } = await supabase.rpc('current_user_is_admin')
  if (error) return false
  return data === true
}

export async function submitSongRequest(user: User, locale: Locale, payload: { name: string; title: string; artist: string; message: string }) {
  const { error } = await supabase.from('song_requests').insert({
    user_id: user.id,
    requester_name: payload.name.trim(),
    requester_email: user.email ?? null,
    language: locale,
    song_title: payload.title.trim(),
    artist: payload.artist.trim() || null,
    message: payload.message.trim() || null,
    status: 'pending',
  })
  if (error) throw error
}

export async function submitDedication(user: User, locale: Locale, payload: { name: string; recipient: string; message: string; title: string; artist: string }) {
  const { error } = await supabase.from('dedications').insert({
    user_id: user.id,
    sender_name: payload.name.trim(),
    sender_email: user.email ?? null,
    recipient_name: payload.recipient.trim(),
    language: locale,
    message: payload.message.trim(),
    song_title: payload.title.trim() || null,
    artist: payload.artist.trim() || null,
    status: 'pending',
  })
  if (error) throw error
}

export async function submitStory(user: User, locale: Locale, payload: { name: string; title: string; body: string }) {
  const { error } = await supabase.from('article_submissions').insert({
    user_id: user.id,
    language: locale,
    title: payload.title.trim(),
    body: payload.body.trim(),
    submitter_name: payload.name.trim(),
    submitter_email: user.email ?? null,
    source: 'web',
    status: 'pending',
  })
  if (error) throw error
}

export async function getAdminArticles() {
  const { data, error } = await supabase.from('articles').select('*').order('updated_at', { ascending: false }).limit(100)
  if (error) throw error
  return hydrateArticles((data ?? []) as Article[])
}

export type ArticleEditorValue = {
  id?: string
  slug: string
  category_id: string | null
  title_i18n: I18nText
  excerpt_i18n: I18nText
  body_i18n: I18nText
  hero_media_id: string | null
  status: Article['status']
}

export async function saveArticle(session: Session, value: ArticleEditorValue, publish: boolean) {
  const now = new Date().toISOString()
  const payload: Record<string, unknown> = {
    slug: value.slug,
    category_id: value.category_id,
    title_i18n: value.title_i18n,
    excerpt_i18n: value.excerpt_i18n,
    body_i18n: value.body_i18n,
    hero_media_id: value.hero_media_id,
    author_user_id: session.user.id,
    status: publish ? 'published' : value.status === 'published' ? 'draft' : value.status,
    updated_at: now,
  }
  if (publish) payload.published_at = now
  else if (value.status === 'published') payload.published_at = null

  if (value.id) {
    const { data, error } = await supabase.from('articles').update(payload).eq('id', value.id).select('*').single()
    if (error) throw error
    return data as Article
  }

  const { data, error } = await supabase.from('articles').insert({ ...payload, created_at: now }).select('*').single()
  if (error) throw error
  return data as Article
}

export async function deleteArticle(id: string) {
  const { error } = await supabase.from('articles').delete().eq('id', id)
  if (error) throw error
}

export async function uploadArticleImage(user: User, file: File, alt_i18n: I18nText) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `articles/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage.from('cnm-media').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  })
  if (uploadError) throw uploadError

  const { data, error } = await supabase.from('media_assets').insert({
    kind: 'image',
    bucket: 'cnm-media',
    original_path: path,
    alt_i18n,
    status: 'ready',
    is_public: true,
    created_by: user.id,
    original_bytes: file.size,
  }).select('id,bucket,original_path,alt_i18n,status').single()

  if (error) {
    await supabase.storage.from('cnm-media').remove([path])
    throw error
  }
  return data as MediaAsset
}

export async function updateStation(values: Partial<StationConfig>) {
  const { error } = await supabase.from('station_config').update({ ...values, updated_at: new Date().toISOString() }).eq('singleton', true)
  if (error) throw error
}
