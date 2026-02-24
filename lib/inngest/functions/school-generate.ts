import { inngest } from '../client'
import { kv } from '@vercel/kv'
import type { LocationData, SchoolData } from '@/types/school'

const EVENT_NAME = 'school/generate'
const KV_TTL = 3600 // 1時間
const MOCK_CACHE_TTL = 86400 * 30 // モック用画像・音声キャッシュ 30日
const MOCK_IMAGES_KEY = 'school:mock:image_results'
const MOCK_AUDIO_KEY = 'school:mock:audio_url'

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

/** principal_message / multimedia_content / school_anthem 等が school_profile 内にある場合、トップレベルに正規化 */
function normalizeSchoolData(data: SchoolData): SchoolData {
  const profile = data.school_profile as unknown as Record<string, unknown> | undefined
  if (!profile) return data
  const next: SchoolData = { ...data }
  if (!next.principal_message && profile.principal_message && typeof profile.principal_message === 'object') {
    next.principal_message = profile.principal_message as SchoolData['principal_message']
  }
  if (!next.multimedia_content && profile.multimedia_content && typeof profile.multimedia_content === 'object') {
    next.multimedia_content = profile.multimedia_content as SchoolData['multimedia_content']
  }
  const profileAnthem = profile.school_anthem as SchoolData['school_anthem'] | undefined
  if (profileAnthem && typeof profileAnthem === 'object' && profileAnthem.lyrics) {
    const topLen = (next.school_anthem?.lyrics ?? '').length
    const profileLen = profileAnthem.lyrics.length
    if (profileLen > topLen) {
      next.school_anthem = { ...(next.school_anthem ?? {}), ...profileAnthem }
    }
  }
  if ((!next.news_feed || next.news_feed.length === 0) && Array.isArray(profile.news_feed) && profile.news_feed.length > 0) {
    next.news_feed = profile.news_feed as SchoolData['news_feed']
  }
  if (Array.isArray(profile.crazy_rules) && profile.crazy_rules.length > 0) {
    const topLen = (next.crazy_rules ?? []).length
    if (profile.crazy_rules.length > topLen) {
      next.crazy_rules = profile.crazy_rules as SchoolData['crazy_rules']
    }
  }
  if ((!next.notable_alumni || next.notable_alumni.length === 0) && Array.isArray(profile.notable_alumni) && profile.notable_alumni.length > 0) {
    next.notable_alumni = profile.notable_alumni as SchoolData['notable_alumni']
  }
  if ((!next.teachers || next.teachers.length === 0) && Array.isArray(profile.teachers) && profile.teachers.length > 0) {
    next.teachers = profile.teachers as SchoolData['teachers']
  }
  if (Array.isArray(profile.history) && profile.history.length > 0) {
    const topLen = (next.history ?? []).length
    if (profile.history.length > topLen) {
      next.history = profile.history as SchoolData['history']
    }
  }
  return next
}

/** 画像タスク用 */
type ImageTask = { prompt: string; imageType: string; schoolName?: string; landmark?: string }

/** 画像タスクを収集。校章・初代校舎・現校舎・校長・銅像・制服・行事1・部活1（ロゴ画像は使わず学校名はテキストで表示） */
function collectImageTasks(schoolData: SchoolData, _location?: LocationData): ImageTask[] {
  const tasks: ImageTask[] = []
  const p = schoolData.school_profile
  // LLMが principal_message / multimedia_content を school_profile 内に出力する場合のフォールバック
  const principal = schoolData.principal_message ?? (p as unknown as Record<string, unknown>)?.principal_message as SchoolData['principal_message'] | undefined
  const mc = schoolData.multimedia_content ?? (p as unknown as Record<string, unknown>)?.multimedia_content as SchoolData['multimedia_content'] | undefined

  if (p?.emblem_prompt && isPlaceholder(p.emblem_url)) {
    tasks.push({ prompt: p.emblem_prompt, imageType: 'emblem' })
  }
  if (p?.historical_buildings?.[0]?.image_prompt && isPlaceholder(p.historical_buildings[0].image_url)) {
    tasks.push({ prompt: p.historical_buildings[0].image_prompt, imageType: 'historical_building' })
  }
  const lastBuilding = p?.historical_buildings?.length ? p.historical_buildings[p.historical_buildings.length - 1] : null
  if (lastBuilding?.image_prompt && isPlaceholder(lastBuilding.image_url) && p.historical_buildings && p.historical_buildings.length > 1) {
    tasks.push({ prompt: lastBuilding.image_prompt, imageType: 'historical_building_current' })
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
  task: ImageTask,
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
    case 'historical_building_current':
      if (!p?.historical_buildings?.length) return schoolData
      const lastIdx = p.historical_buildings.length - 1
      return {
        ...schoolData,
        school_profile: {
          ...p,
          historical_buildings: p.historical_buildings.map((b, i) =>
            i === lastIdx ? { ...b, image_url: url } : b
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
      const outputSize = JSON.stringify(data).length
      console.log('step1 done', { jobId, outputSizeChars: outputSize })
      await kv.set(`school:${jobId}:partial`, JSON.stringify(data), { ex: KV_TTL })
      return data
    })

    // Step 2: 画像を生成（モック時はキャッシュがあれば再利用してAPI節約）
    const schoolWithImages = await step.run('step2-images', async () => {
      const normalized = normalizeSchoolData(schoolData)
      const tasks = collectImageTasks(normalized, location)
      console.log('step2 collectImageTasks', { jobId, taskCount: tasks.length, types: tasks.map((t) => t.imageType) })
      const isMock = !!(normalized as SchoolData & { fallbackUsed?: boolean }).fallbackUsed
      let results: { task: ImageTask; url: string }[]

      if (isMock) {
        const cached = await kv.get<{ imageType: string; url: string }[]>(MOCK_IMAGES_KEY).catch(() => null)
        const byType = cached && Array.isArray(cached) ? new Map(cached.map((c) => [c.imageType, c.url])) : null
        const cacheHit = byType && tasks.every((t) => byType.has(t.imageType))
        if (cacheHit) {
          results = tasks.map((task) => ({ task, url: byType!.get(task.imageType)! }))
          console.log('step2 mock cache hit', { jobId, imageCount: results.length })
        } else {
          results = await Promise.all(
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
              }
              const url = data?.url || `https://placehold.co/800x450/CCCCCC/666666?text=Image`
              return { task, url }
            })
          )
          if (results.some((r) => !isPlaceholder(r.url))) {
            await kv.set(
              MOCK_IMAGES_KEY,
              results.map((r) => ({ imageType: r.task.imageType, url: r.url })),
              { ex: MOCK_CACHE_TTL }
            ).catch(() => {})
          }
        }
      } else {
        results = await Promise.all(
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
            }
            const url = data?.url || `https://placehold.co/800x450/CCCCCC/666666?text=Image`
            return { task, url }
          })
        )
      }

      let current = normalized
      for (const { task, url } of results) {
        current = applyImageUrl(current, task, url)
      }
      await kv.set(`school:${jobId}:partial`, JSON.stringify(current), { ex: KV_TTL })
      const placeholderCount = results.filter((r) => isPlaceholder(r.url)).length
      console.log('step2 done', {
        jobId,
        imageCount: results.length,
        realImages: results.length - placeholderCount,
        fromMockCache: isMock && !!results.length,
      })
      return current
    })

    // Step 3: 校歌音声を1本生成（モック時はキャッシュがあれば再利用）
    const schoolWithAudio = await step.run('step3-anthem-audio', async () => {
      const data = schoolWithImages as SchoolData
      const anthem = data.school_anthem
      if (!anthem?.lyrics) return data
      const isMock = !!(data as SchoolData & { fallbackUsed?: boolean }).fallbackUsed
      let audioUrl: string | undefined

      if (isMock) {
        const cached = await kv.get<string>(MOCK_AUDIO_KEY).catch(() => null)
        if (cached && cached.length > 0) {
          audioUrl = cached
          console.log('step3 mock audio cache hit', { jobId })
        }
      }
      if (!audioUrl) {
        const res = await fetch(`${baseUrl}/api/generate-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lyrics: anthem.lyrics,
            style: anthem.style || '荘厳な合唱曲風',
            title: anthem.title || '校歌',
            suno_prompt: anthem.suno_prompt,
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
        }
        audioUrl = audioData?.url ?? undefined
        if (audioUrl && isMock) {
          await kv.set(MOCK_AUDIO_KEY, audioUrl, { ex: MOCK_CACHE_TTL }).catch(() => {})
        }
      }

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
