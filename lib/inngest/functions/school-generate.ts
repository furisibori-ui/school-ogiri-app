import { inngest } from '../client'
import { kv } from '@vercel/kv'
import type { LocationData, SchoolData } from '@/types/school'

const EVENT_NAME = 'school/generate'
const KV_TTL = 3600 // 1時間

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/** プレースホルダーURLかどうか */
function isPlaceholder(url: string | undefined): boolean {
  if (!url) return true
  return url.includes('placehold.co') || url.startsWith('data:')
}

/** 画像7枚分のタスクを収集（フロントの page.tsx と同じ構成） */
function collectImageTasks(schoolData: SchoolData): { prompt: string; imageType: string }[] {
  const tasks: { prompt: string; imageType: string }[] = []
  const p = schoolData.school_profile
  const mc = schoolData.multimedia_content
  const principal = schoolData.principal_message

  if (p?.emblem_prompt && isPlaceholder(p.emblem_url)) {
    tasks.push({ prompt: p.emblem_prompt, imageType: 'emblem' })
  }
  if (p?.historical_buildings?.[0]?.image_prompt && isPlaceholder(p.historical_buildings[0].image_url)) {
    tasks.push({ prompt: p.historical_buildings[0].image_prompt, imageType: 'historical_building' })
  }
  if (principal?.face_prompt && isPlaceholder(principal.face_image_url)) {
    tasks.push({ prompt: principal.face_prompt, imageType: 'principal_face' })
  }
  if (mc?.monuments?.[0]?.image_prompt && isPlaceholder(mc.monuments[0].image_url)) {
    tasks.push({ prompt: mc.monuments[0].image_prompt, imageType: 'monument' })
  }
  if (mc?.uniforms?.[0]?.image_prompt && isPlaceholder(mc.uniforms[0].image_url)) {
    tasks.push({ prompt: mc.uniforms[0].image_prompt, imageType: 'uniform' })
  }
  const eventIndex = mc?.school_events?.findIndex((e) => e.image_prompt && isPlaceholder(e.image_url)) ?? -1
  if (eventIndex >= 0 && mc?.school_events?.[eventIndex]?.image_prompt) {
    tasks.push({ prompt: mc.school_events[eventIndex].image_prompt!, imageType: 'event' })
  }
  const clubIndex = mc?.club_activities?.findIndex((c) => c.image_prompt && isPlaceholder(c.image_url)) ?? -1
  if (clubIndex >= 0 && mc?.club_activities?.[clubIndex]?.image_prompt) {
    tasks.push({ prompt: mc.club_activities[clubIndex].image_prompt!, imageType: 'club' })
  }
  return tasks
}

/** 1枚の画像URLを schoolData に反映 */
function applyImageUrl(
  schoolData: SchoolData,
  task: { prompt: string; imageType: string },
  url: string
): SchoolData {
  const p = schoolData.school_profile
  const mc = schoolData.multimedia_content

  switch (task.imageType) {
    case 'emblem':
      return { ...schoolData, school_profile: { ...p, emblem_url: url } }
    case 'historical_building':
      if (!p?.historical_buildings?.length) return schoolData
      return {
        ...schoolData,
        school_profile: {
          ...p,
          historical_buildings: p.historical_buildings.map((b, i) =>
            i === 0 ? { ...b, image_url: url } : b
          ),
        },
      }
    case 'principal_face':
      return schoolData.principal_message
        ? { ...schoolData, principal_message: { ...schoolData.principal_message, face_image_url: url } }
        : schoolData
    case 'monument':
      if (!mc?.monuments?.length) return schoolData
      return {
        ...schoolData,
        multimedia_content: {
          ...mc,
          monuments: mc.monuments.map((m, i) => (i === 0 ? { ...m, image_url: url } : m)),
        },
      }
    case 'uniform':
      if (!mc?.uniforms?.length) return schoolData
      return {
        ...schoolData,
        multimedia_content: {
          ...mc,
          uniforms: mc.uniforms.map((u, i) => (i === 0 ? { ...u, image_url: url } : u)),
        },
      }
    case 'event': {
      const eventIndex = mc?.school_events?.findIndex((e) => e.image_prompt && isPlaceholder(e.image_url)) ?? -1
      if (eventIndex < 0 || !mc?.school_events?.length) return schoolData
      const next = mc.school_events.map((e, i) => (i === eventIndex ? { ...e, image_url: url } : e))
      return { ...schoolData, multimedia_content: { ...mc, school_events: next } }
    }
    case 'club': {
      const clubIndex = mc?.club_activities?.findIndex((c) => c.image_prompt && isPlaceholder(c.image_url)) ?? -1
      if (clubIndex < 0 || !mc?.club_activities?.length) return schoolData
      const next = mc.club_activities.map((c, i) => (i === clubIndex ? { ...c, image_url: url } : c))
      return { ...schoolData, multimedia_content: { ...mc, club_activities: next } }
    }
    default:
      return schoolData
  }
}

const KV_TTL_FAILED = 3600

export const schoolGenerateFunction = inngest.createFunction(
  {
    id: 'school-generate',
    name: '学校生成（テキスト→画像7枚→校歌音声→KV保存）',
    retries: 2,
    onFailure: async ({ error, event }) => {
      const originalData = (event as { data?: { event?: { data?: { jobId?: string } } } })?.data?.event?.data
      const jobId = originalData?.jobId
      if (jobId) {
        await kv.set(`school:${jobId}:status`, 'failed', { ex: KV_TTL_FAILED })
        const msg = error?.message?.slice(0, 200) || '処理に失敗しました'
        await kv.set(`school:${jobId}:error`, msg, { ex: KV_TTL_FAILED })
      }
    },
  },
  { event: EVENT_NAME },
  async ({ event, step }) => {
    const { jobId, location } = event.data as { jobId: string; location: LocationData }
    const baseUrl = getBaseUrl()

    console.log('Inngest event sent', { jobId, name: EVENT_NAME })

    // 開始時に status を running に（ポーリングで「処理中」と分かるように）
    await step.run('step0-set-running', async () => {
      await kv.set(`school:${jobId}:status`, 'running', { ex: KV_TTL })
      return { ok: true }
    })

    // Step 1: テキスト生成（学校＋校歌歌詞）。既存 API を呼んでロジックを再利用
    const schoolData = await step.run('step1-text-and-anthem', async () => {
      const res = await fetch(`${baseUrl}/api/generate-school`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`generate-school failed: ${res.status} ${err.slice(0, 200)}`)
      }
      const data = (await res.json()) as SchoolData
      await kv.set(`school:${jobId}:partial`, JSON.stringify(data), { ex: KV_TTL })
      console.log('step1 done', { jobId })
      return data
    })

    // Step 2: 画像7枚を並列生成し、URL を school に反映
    const schoolWithImages = await step.run('step2-images', async () => {
      const tasks = collectImageTasks(schoolData)
      const results = await Promise.all(
        tasks.map(async (task) => {
          const res = await fetch(`${baseUrl}/api/generate-school-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: task.prompt, imageType: task.imageType }),
          })
          const raw = await res.text()
          let data: { url?: string } = {}
          if (raw.trimStart().startsWith('{')) {
            try {
              data = JSON.parse(raw) as { url?: string }
            } catch {
              console.warn('step2 generate-school-image response not valid JSON:', raw.slice(0, 200))
            }
          } else {
            console.warn('step2 generate-school-image returned non-JSON (e.g. HTML):', raw.slice(0, 200))
          }
          const url = data?.url || `https://placehold.co/800x450/CCCCCC/666666?text=Image`
          return { task, url }
        })
      )
      let current = schoolData
      for (const { task, url } of results) {
        current = applyImageUrl(current, task, url)
      }
      await kv.set(`school:${jobId}:partial`, JSON.stringify(current), { ex: KV_TTL })
      const placeholderCount = results.filter((r) => isPlaceholder(r.url)).length
      const realCount = results.length - placeholderCount
      console.log('step2 done', {
        jobId,
        imageCount: results.length,
        realImages: realCount,
        placeholderImages: placeholderCount,
        detail: results.map((r) => ({ type: r.task.imageType, isPlaceholder: isPlaceholder(r.url) })),
      })
      if (placeholderCount > 0) {
        console.warn('step2: some or all images are placeholder. Check Vercel logs for "Comet image" or "generate-school-image".')
      }
      return current
    })

    // Step 3: 校歌音声を1本生成（step.run の戻り値は型が失われるため SchoolData にキャスト）
    const schoolWithAudio = await step.run('step3-anthem-audio', async () => {
      const data = schoolWithImages as SchoolData
      const anthem = data.school_anthem
      if (!anthem?.lyrics) return data
      const res = await fetch(`${baseUrl}/api/generate-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: anthem.lyrics,
          style: anthem.style || '荘厳な合唱曲風',
          title: anthem.title || '校歌',
        }),
      })
      const raw = await res.text()
      let audioData: { url?: string } = {}
      if (raw.trimStart().startsWith('{')) {
        try {
          audioData = JSON.parse(raw) as { url?: string }
        } catch {
          console.warn('step3 generate-audio response not valid JSON:', raw.slice(0, 200))
        }
      } else {
        console.warn('step3 generate-audio returned non-JSON (e.g. HTML):', raw.slice(0, 200))
      }
      const audioUrl = audioData?.url ?? undefined
      const next = audioUrl
        ? { ...data, school_anthem: { ...anthem, audio_url: audioUrl } }
        : data
      await kv.set(`school:${jobId}:partial`, JSON.stringify(next), { ex: KV_TTL })
      if (audioUrl) {
        console.log('step3 done', { jobId, hasAudio: true })
      } else {
        console.warn('step3: no audio URL. generate-audio may have failed or timed out. Check Vercel logs for "Suno" or "generate-audio".')
      }
      return next
    })

    // Step 4: Vercel KV に保存
    await step.run('step4-save-kv', async () => {
      console.log('saving to KV', jobId)
      const payload = JSON.stringify(schoolWithAudio)
      await kv.set(`school:${jobId}`, payload, { ex: KV_TTL })
      await kv.set(`school:${jobId}:status`, 'completed', { ex: KV_TTL })
      console.log('saved to KV', jobId)
      return { ok: true }
    })

    return { jobId, status: 'completed' }
  }
)
