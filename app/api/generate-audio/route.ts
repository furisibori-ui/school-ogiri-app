import { NextRequest, NextResponse } from 'next/server'

// Inngest 経由なら時間制限なし。Vercel 単体時は maxDuration まで待機
export const maxDuration = 300

const COMET_SUNO_SUBMIT_URL = 'https://api.cometapi.com/suno/submit/music'
const COMET_SUNO_FETCH_BASE = 'https://api.cometapi.com/suno/fetch'
const POLL_INTERVAL_MS = 8_000 // 5〜10秒おき（仕様書どおり）
const POLL_TIMEOUT_MS = 300_000 // 最大5分（無限ループ防止）

export async function POST(request: NextRequest) {
  try {
    const { lyrics, style, title } = await request.json()

    if (!process.env.COMET_API_KEY) {
      console.warn('COMET_API_KEY not set, audio generation disabled')
      return NextResponse.json({
        url: null,
        message: '音声生成機能は現在無効です',
      })
    }

    const structuredLyrics = formatLyricsWithTags(lyrics || '')
    const apiKey = process.env.COMET_API_KEY

    // ----- ステップ1: タスク受付（submit） -----
    const submitRes = await fetch(COMET_SUNO_SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: structuredLyrics,
        title: title || '校歌',
        tags: style || 'solemn choir, orchestral, Japanese school anthem',
        make_instrumental: false,
        mv: 'chirp-bluejay', // v4.5+
      }),
    })

    const submitText = await submitRes.text()
    if (!submitRes.ok) {
      throw new Error(`Suno submit error: ${submitRes.status} ${submitText.slice(0, 200)}`)
    }
    if (submitText.trimStart().startsWith('<')) {
      console.error('Suno submit returned HTML:', submitText.slice(0, 300))
      throw new Error(
        `Suno API が HTML を返しました（${submitRes.status}）。認証や利用制限を確認してください。`
      )
    }

    let submitData: Record<string, unknown>
    try {
      submitData = JSON.parse(submitText) as Record<string, unknown>
    } catch {
      throw new Error(`Suno submit のレスポンスが JSON ではありません: ${submitText.slice(0, 100)}`)
    }

    // デバッグ: Submit 直後の生レスポンス（仕様書 3. 必須要件）
    console.log('[Suno Submit] raw response:', JSON.stringify(submitData))
    console.log('[Suno Submit] top-level keys:', Object.keys(submitData))

    const data = submitData.data as Record<string, unknown> | undefined
    const result = submitData.result as Record<string, unknown> | undefined
    const taskIdRaw =
      submitData.task_id ??
      submitData.id ??
      submitData.taskId ??
      submitData.request_id ??
      submitData.job_id ??
      data?.task_id ??
      data?.id ??
      data?.taskId ??
      result?.task_id ??
      result?.id ??
      result?.taskId
    const taskId = typeof taskIdRaw === 'string' ? taskIdRaw : undefined
    if (!taskId) {
      console.error('Suno submit response (full):', submitData)
      throw new Error(
        'Suno submit のレスポンスに task_id が含まれていません。Comet の Suno API ドキュメントでレスポンス形式を確認してください。'
      )
    }

    // ----- ステップ2: タスク照会（ポーリング） -----
    const audioUrl = await pollForAudioUrl(apiKey, taskId)
    if (!audioUrl) {
      return NextResponse.json({
        url: null,
        message: '校歌の生成がタイムアウトするか、取得に失敗しました',
      })
    }

    // デバッグ: 最終的な音声URL取得時（仕様書 3. 必須要件）
    console.log('[Suno] final audio URL:', audioUrl)
    return NextResponse.json({
      url: audioUrl,
      message: '校歌を生成しました',
    })
  } catch (error) {
    console.error('Audio generation error:', error)
    return NextResponse.json({
      url: null,
      message: '音声生成に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/** 照会レスポンスの型（audio_url / stream_url / url 等を防御的に取得） */
type FetchPayload = {
  status?: string
  data?: {
    status?: string
    audio_url?: string
    stream_url?: string
    url?: string
    audio_urls?: string[]
  }
  audio_url?: string
  stream_url?: string
  url?: string
  audio_urls?: string[]
}

/**
 * タスク照会にポーリングし、完了したら音声 URL を返す。
 * 404 の場合は ?task_id= の次に /fetch/{task_id} でフォールバックする。
 */
async function pollForAudioUrl(apiKey: string, taskId: string): Promise<string | null> {
  const start = Date.now()
  let lastStatus: string | undefined
  let usePathParam = false

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const fetchUrl = usePathParam
      ? `${COMET_SUNO_FETCH_BASE}/${encodeURIComponent(taskId)}`
      : `${COMET_SUNO_FETCH_BASE}?task_id=${encodeURIComponent(taskId)}`
    const res = await fetch(fetchUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    const text = await res.text()

    if (res.status === 404 && !usePathParam) {
      usePathParam = true
      console.log('[Suno Fetch] 404 with query param, fallback to path param:', `${COMET_SUNO_FETCH_BASE}/${taskId}`)
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    if (!res.ok) {
      console.warn(`Suno fetch ${res.status} for task_id=${taskId}:`, text.slice(0, 200))
      await sleep(POLL_INTERVAL_MS)
      continue
    }
    if (text.trimStart().startsWith('<')) {
      console.warn('Suno fetch returned HTML for task_id=', taskId)
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    let data: FetchPayload
    try {
      data = JSON.parse(text) as FetchPayload
    } catch {
      console.warn('Suno fetch response not JSON for task_id=', taskId, text.slice(0, 100))
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    const status = data.status ?? data.data?.status ?? ''

    // デバッグ: ステータスが変わったタイミングで生レスポンスを出力（仕様書 3. 必須要件）
    if (status !== lastStatus) {
      lastStatus = status
      console.log('[Suno Fetch] status changed, raw response:', JSON.stringify(data))
    }

    const completed = /complete|success|done|finished/i.test(status)

    if (completed) {
      const url =
        data.audio_url ??
        data.stream_url ??
        data.url ??
        data.data?.audio_url ??
        data.data?.stream_url ??
        data.data?.url ??
        (Array.isArray(data.audio_urls) && data.audio_urls[0]) ??
        (Array.isArray(data.data?.audio_urls) && data.data?.audio_urls?.[0])
      if (url && typeof url === 'string') {
        console.log('[Suno Fetch] completed, raw response (final):', JSON.stringify(data))
        return url
      }
    }

    const failed = /fail|error/i.test(status)
    if (failed) {
      console.warn('Suno task failed for task_id=', taskId, data)
      return null
    }

    await sleep(POLL_INTERVAL_MS)
  }

  console.warn('Suno poll timeout for task_id=', taskId)
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 歌詞を Suno 用に [Verse 1][Verse 2][Verse 3] などで構造化（3番まで対応）
function formatLyricsWithTags(lyrics: string): string {
  const lines = lyrics.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return lyrics

  const blocks: string[] = []
  let current: string[] = []
  let verseNum = 1

  for (const line of lines) {
    if (/^[一二三四五六七八九十]+[、．.]?\s*$/.test(line) || /^[0-9]+\.?\s*$/.test(line)) {
      if (current.length > 0) {
        blocks.push(`[Verse ${verseNum}]\n${current.join('\n')}`)
        verseNum++
        current = []
      }
      continue
    }
    current.push(line)
  }
  if (current.length > 0) {
    blocks.push(`[Verse ${verseNum}]\n${current.join('\n')}`)
  }

  return blocks.length > 0 ? blocks.join('\n\n') : lyrics
}
