/**
 * アーカイブ一覧・星・削除の共通ロジック
 */
import { kv } from '@vercel/kv'
import type { SchoolData } from '@/types/school'

export const ARCHIVE_LIST_KEY = 'school:archive:list'

export interface ArchiveItem {
  id: string
  name: string
  thumbnail?: string
  createdAt: number
}

/** サムネイル用URLの優先順位: 校章 → 概要画像 → 歴史的建造物の画像 */
export function getThumbnailUrl(data: SchoolData): string | undefined {
  const profile = data?.school_profile
  if (!profile) return undefined
  if (profile.emblem_url && !profile.emblem_url.includes('placehold.co')) return profile.emblem_url
  if (profile.overview_image_url && !profile.overview_image_url.includes('placehold.co')) return profile.overview_image_url
  const first = profile.historical_buildings?.[0]
  if (first?.image_url && !first.image_url.includes('placehold.co')) return first.image_url
  return undefined
}

/** アーカイブに学校を追加 */
export async function addToArchive(jobId: string, data: SchoolData): Promise<void> {
  const item: ArchiveItem = {
    id: jobId,
    name: data?.school_profile?.name ?? '架空の学校',
    thumbnail: getThumbnailUrl(data),
    createdAt: Date.now(),
  }
  const list = (await kv.get<ArchiveItem[]>(ARCHIVE_LIST_KEY)) ?? []
  if (list.some((x) => x.id === jobId)) return
  list.push(item)
  await kv.set(ARCHIVE_LIST_KEY, list)
}

/** 星の数を取得 */
export async function getStarCount(id: string): Promise<number> {
  const n = await kv.get<number>(`school:${id}:stars`)
  return typeof n === 'number' ? n : 0
}

/** 星を1つ追加（誰でも可能） */
export async function addStar(id: string): Promise<number> {
  const current = await getStarCount(id)
  const next = current + 1
  await kv.set(`school:${id}:stars`, next)
  return next
}

/** アーカイブ一覧を取得（星の数でソート、多い順） */
export async function getArchiveList(): Promise<(ArchiveItem & { stars: number })[]> {
  const list = (await kv.get<ArchiveItem[]>(ARCHIVE_LIST_KEY)) ?? []
  if (list.length === 0) return []

  const starKeys = list.map((x) => `school:${x.id}:stars`)
  const starCounts = (await kv.mget<number[]>(...starKeys)) as (number | null)[]

  const merged = list.map((item, i) => ({
    ...item,
    stars: typeof starCounts[i] === 'number' ? (starCounts[i] as number) : 0,
  }))

  return merged.sort((a, b) => b.stars - a.stars)
}

/** アーカイブから削除し、学校データも削除 */
export async function removeFromArchive(id: string): Promise<boolean> {
  const list = (await kv.get<ArchiveItem[]>(ARCHIVE_LIST_KEY)) ?? []
  const filtered = list.filter((x) => x.id !== id)
  if (filtered.length === list.length) return false
  await kv.set(ARCHIVE_LIST_KEY, filtered)
  await kv.del(`school:${id}`)
  await kv.del(`school:${id}:stars`)
  await kv.del(`school:${id}:status`)
  await kv.del(`school:${id}:error`)
  await kv.del(`school:${id}:partial`)
  return true
}
