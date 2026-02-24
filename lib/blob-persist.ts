/**
 * 生成完了後の学校データを Vercel Blob に永続化するヘルパー。
 * 画像URL・音声URLを Blob にアップロードし、Blob URL に置き換えたデータを返す。
 * 既存の生成ロジックには一切変更を加えない。
 */

import { put } from '@vercel/blob'
import type { SchoolData } from '@/types/school'

function isPlaceholder(url: string | undefined): boolean {
  if (!url) return true
  return url.includes('placehold.co') || url.startsWith('data:')
}

/** URL または data URL を fetch して Buffer を取得 */
async function urlToBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const [header, b64] = url.split(',')
      const mime = header?.match(/data:([^;]+)/)?.[1] || 'image/png'
      const buffer = Buffer.from(b64, 'base64')
      return { buffer, contentType: mime }
    }
    if (url.startsWith('http')) {
      const res = await fetch(url, { headers: { 'User-Agent': 'SchoolOgiriApp/1.0' } })
      if (!res.ok) return null
      const arr = await res.arrayBuffer()
      const contentType = res.headers.get('content-type') || 'image/png'
      return { buffer: Buffer.from(arr), contentType }
    }
  } catch (e) {
    console.warn('[blob-persist] urlToBuffer failed:', url.slice(0, 80), e)
  }
  return null
}

/** 1つの URL を Blob にアップロードし、新しい URL を返す。失敗時は元の URL を返す */
async function uploadToBlob(
  url: string,
  path: string,
  contentType: string
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url
  const result = await urlToBuffer(url)
  if (!result) return url
  try {
    const blob = await put(path, result.buffer, {
      access: 'public',
      contentType: result.contentType,
    })
    return blob.url
  } catch (e) {
    console.warn('[blob-persist] put failed:', path, e)
    return url
  }
}

/** 学校データ内の全画像・音声 URL を Blob にアップロードし、置き換えたデータを返す */
export async function persistSchoolAssetsToBlob(
  data: SchoolData,
  jobId: string
): Promise<SchoolData> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn('[blob-persist] BLOB_READ_WRITE_TOKEN not set, skipping')
    return data
  }

  const prefix = `school-persisted/${jobId}`
  let next = data

  // 画像: emblem, overview, historical_buildings, principal face, monuments, uniforms, events, clubs
  if (data.school_profile?.emblem_url && !isPlaceholder(data.school_profile.emblem_url)) {
    const url = await uploadToBlob(data.school_profile.emblem_url, `${prefix}/emblem.png`, 'image/png')
    next = { ...next, school_profile: { ...next.school_profile!, emblem_url: url } }
  }
  if (next.school_profile?.overview_image_url && !isPlaceholder(next.school_profile.overview_image_url)) {
    const url = await uploadToBlob(next.school_profile.overview_image_url, `${prefix}/overview.png`, 'image/png')
    next = { ...next, school_profile: { ...next.school_profile!, overview_image_url: url } }
  }

  if (next.school_profile?.historical_buildings?.length) {
    const buildings = [...next.school_profile.historical_buildings]
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i]
      if (b?.image_url && !isPlaceholder(b.image_url)) {
        const url = await uploadToBlob(b.image_url, `${prefix}/building-${i}.png`, 'image/png')
        buildings[i] = { ...b, image_url: url }
      }
    }
    next = { ...next, school_profile: { ...next.school_profile!, historical_buildings: buildings } }
  }

  if (next.principal_message?.face_image_url && !isPlaceholder(next.principal_message.face_image_url)) {
    const url = await uploadToBlob(next.principal_message.face_image_url, `${prefix}/principal.png`, 'image/png')
    next = { ...next, principal_message: { ...next.principal_message!, face_image_url: url } }
  }

  if (next.multimedia_content?.monuments?.length) {
    const monuments = next.multimedia_content.monuments.map((m, i) => {
      if (m?.image_url && !isPlaceholder(m.image_url)) {
        return uploadToBlob(m.image_url, `${prefix}/monument-${i}.png`, 'image/png').then((url) => ({ ...m, image_url: url }))
      }
      return Promise.resolve(m)
    })
    const resolved = await Promise.all(monuments)
    next = { ...next, multimedia_content: { ...next.multimedia_content!, monuments: resolved } }
  }

  if (next.multimedia_content?.uniforms?.length) {
    const uniforms = next.multimedia_content.uniforms.map((u, i) => {
      if (u?.image_url && !isPlaceholder(u.image_url)) {
        return uploadToBlob(u.image_url, `${prefix}/uniform-${i}.png`, 'image/png').then((url) => ({ ...u, image_url: url }))
      }
      return Promise.resolve(u)
    })
    const resolved = await Promise.all(uniforms)
    next = { ...next, multimedia_content: { ...next.multimedia_content!, uniforms: resolved } }
  }

  if (next.multimedia_content?.school_events?.length) {
    const events = next.multimedia_content.school_events.map((e, i) => {
      if (e?.image_url && !isPlaceholder(e.image_url)) {
        return uploadToBlob(e.image_url, `${prefix}/event-${i}.png`, 'image/png').then((url) => ({ ...e, image_url: url }))
      }
      return Promise.resolve(e)
    })
    const resolved = await Promise.all(events)
    next = { ...next, multimedia_content: { ...next.multimedia_content!, school_events: resolved } }
  }

  if (next.multimedia_content?.club_activities?.length) {
    const clubs = next.multimedia_content.club_activities.map((c, i) => {
      if (c?.image_url && !isPlaceholder(c.image_url)) {
        return uploadToBlob(c.image_url, `${prefix}/club-${i}.png`, 'image/png').then((url) => ({ ...c, image_url: url }))
      }
      return Promise.resolve(c)
    })
    const resolved = await Promise.all(clubs)
    next = { ...next, multimedia_content: { ...next.multimedia_content!, club_activities: resolved } }
  }

  // 音声: Suno の URL は期限切れになるため必ず Blob に保存
  const anthem = next.school_anthem
  if (anthem?.audio_url && !isPlaceholder(anthem.audio_url)) {
    try {
      const res = await fetch(anthem.audio_url, { headers: { 'User-Agent': 'SchoolOgiriApp/1.0' } })
      if (res.ok) {
        const buf = await res.arrayBuffer()
        const blob = await put(`${prefix}/anthem.mp3`, Buffer.from(buf), {
          access: 'public',
          contentType: 'audio/mpeg',
        })
        next = { ...next, school_anthem: { ...anthem, audio_url: blob.url } }
      }
    } catch (e) {
      console.warn('[blob-persist] audio fetch/upload failed:', e)
    }
  }

  return next
}
