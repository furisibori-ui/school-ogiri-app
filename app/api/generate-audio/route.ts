import { NextRequest, NextResponse } from 'next/server'

// Inngest 経由なら時間制限なし。Vercel 単体時は maxDuration まで待機
export const maxDuration = 300

const COMET_SUNO_SUBMIT_URL = 'https://api.cometapi.com/suno/submit/music'
// ポーリングはパスパラメータ形式が正仕様。404/HTML 時は候補2・3を順に試す
const SUNO_FETCH_URLS = [
  (taskId: string) => `https://api.cometapi.com/suno/fetch/${encodeURIComponent(taskId)}`,
  (taskId: string) => `https://api.cometapi.com/suno/task/${encodeURIComponent(taskId)}`,
  (taskId: string) => `https://api.cometapi.com/suno/status/${encodeURIComponent(taskId)}`,
]
const POLL_INTERVAL_MS = 8_000
// Inngest 全体が 300s のため、Step3 は 60 秒で打ち切り（Step1〜2 の残りで収まるよう調整済み）
const POLL_TIMEOUT_MS = 60_000 // 最大60秒（Suno は IN_PROGRESS から完了まで数十秒かかることがある。300s 制限のためこれ以上は伸ばせない）

/** 歌詞をひらがなに変換（Suno の読み間違いを防ぐ）。失敗時はそのまま返す */
async function lyricsToHiragana(lyrics: string): Promise<{ text: string; converted: boolean }> {
  if (!lyrics || !lyrics.trim()) return { text: lyrics, converted: false }
  try {
    const Kuroshiro = (await import('kuroshiro')).default
    const KuromojiAnalyzer = (await import('kuroshiro-analyzer-kuromoji')).default
    const kuroshiro = new Kuroshiro()
    await kuroshiro.init(new KuromojiAnalyzer())
    const result = await kuroshiro.convert(lyrics, { to: 'hiragana' })
    const text = typeof result === 'string' ? result : lyrics
    return { text, converted: text !== lyrics }
  } catch (e) {
    console.warn('[generate-audio] lyricsToHiragana failed, using original:', (e as Error)?.message)
    return { text: lyrics, converted: false }
  }
}

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

    const { text: lyricsForSuno, converted } = await lyricsToHiragana(lyrics || '')
    const structuredLyrics = formatLyricsWithTags(lyricsForSuno)
    const preview = lyricsForSuno.replace(/\s+/g, ' ').slice(0, 60)
    console.log('[generate-audio] Suno用歌詞:', converted ? 'ひらがな変換済み' : '変換なし(元のまま)', '| 先頭60字:', preview + (lyricsForSuno.length > 60 ? '…' : ''))
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
        tags: 'chorus, school anthem, Japanese school song, solemn, classical choir, not enka',
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

    // Comet の Suno submit は { code, message, data } で data がタスクIDの文字列のことがある
    const data = submitData.data as Record<string, unknown> | string | undefined
    const result = submitData.result as Record<string, unknown> | undefined
    const taskIdRaw =
      (typeof data === 'string' ? data : undefined) ??
      submitData.task_id ??
      submitData.id ??
      submitData.taskId ??
      submitData.request_id ??
      submitData.job_id ??
      (typeof data === 'object' && data ? (data.task_id ?? data.id ?? data.taskId) as string | undefined : undefined) ??
      result?.task_id ??
      result?.id ??
      result?.taskId
    const taskId = typeof taskIdRaw === 'string' ? taskIdRaw : undefined
    if (!taskId) {
      console.error('Suno submit response (full):', submitData)
      const keys = Object.keys(submitData).join(', ')
      const sample = JSON.stringify(submitData).slice(0, 400)
      throw new Error(
        `Suno submit のレスポンスに task_id が含まれていません。実際のキー: [${keys}] 先頭: ${sample}`
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

/** 照会レスポンスの型（Comet は data.data をクリップ配列で返すことがある。日本語キー データ/ステータス にも対応） */
type SunoClip = { audio_url?: string; stream_url?: string; url?: string; state?: string; [k: string]: unknown }
type FetchPayload = {
  status?: string
  data?:
    | {
        status?: string
        audio_url?: string
        stream_url?: string
        url?: string
        audio_urls?: string[]
        /** 日本語キーで返る場合 */
        データ?: SunoClip[] | Record<string, unknown>
      }
    | SunoClip[]
  audio_url?: string
  stream_url?: string
  url?: string
  audio_urls?: string[]
  /** 日本語キー（Comet がローカライズで返す場合） */
  データ?: Record<string, unknown> | SunoClip[]
  ステータス?: string
}

/**
 * Comet の Suno fetch は英語キー (data, status) のほか、日本語キー (データ, ステータス) で返す場合がある。
 * 正規化して status / clips / inner（URL 取り用）を返す。
 */
function normalizeSunoFetchPayload(raw: Record<string, unknown>): {
  status: string
  clips: SunoClip[]
  inner?: Record<string, unknown>
} {
  const dataOrData = raw.data ?? raw.データ
  const statusFromTop = (raw.status ?? raw.ステータス) as string | undefined
  let status = statusFromTop ?? ''
  let clips: SunoClip[] = []
  let inner: Record<string, unknown> | undefined

  if (Array.isArray(dataOrData)) {
    clips = dataOrData as SunoClip[]
  } else if (dataOrData && typeof dataOrData === 'object' && !Array.isArray(dataOrData)) {
    inner = dataOrData as Record<string, unknown>
    status = (inner.status ?? inner.ステータス ?? status) as string
    const arr = inner.data ?? inner.データ
    if (Array.isArray(arr)) clips = arr as SunoClip[]
  }

  return { status, clips, inner }
}

/**
 * タスク照会にポーリングし、完了したら音声 URL を返す。
 * 大本命: /suno/fetch/{taskId}。404 または HTML が返ったら /suno/task/{taskId} → /suno/status/{taskId} を順に試す。
 */
async function pollForAudioUrl(apiKey: string, taskId: string): Promise<string | null> {
  const start = Date.now()
  let lastStatus: string | undefined
  const headers = { Authorization: `Bearer ${apiKey}` }

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    let res: Response
    let text: string
    let urlIndex = 0

    while (urlIndex < SUNO_FETCH_URLS.length) {
      const fetchUrl = SUNO_FETCH_URLS[urlIndex](taskId)
      res = await fetch(fetchUrl, { method: 'GET', headers })
      text = await res.text()

      if (res.status === 404 || text.trimStart().startsWith('<')) {
        console.warn('[Suno Fetch] 404 or HTML, try next URL:', fetchUrl)
        urlIndex++
        continue
      }
      break
    }

    if (urlIndex >= SUNO_FETCH_URLS.length) {
      console.warn('[Suno Fetch] all URLs returned 404 or HTML for task_id=', taskId)
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    const resFinal = res!
    const textFinal = text!

    if (!resFinal.ok) {
      console.warn(`Suno fetch ${resFinal.status} for task_id=${taskId}:`, textFinal.slice(0, 200))
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    let raw: Record<string, unknown>
    try {
      raw = JSON.parse(textFinal) as Record<string, unknown>
    } catch {
      console.warn('Suno fetch response not JSON for task_id=', taskId, textFinal.slice(0, 100))
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    const { status, clips, inner } = normalizeSunoFetchPayload(raw)
    const data = raw as FetchPayload

    if (status !== lastStatus) {
      lastStatus = status
      console.log('[Suno Fetch] status changed, raw response:', JSON.stringify(raw))
    }

    const hasClipWithUrl = clips.some((c: SunoClip) => typeof c?.audio_url === 'string' && c.audio_url.length > 0)
    const completed =
      /complete|success|done|finished/i.test(status) || hasClipWithUrl

    if (completed) {
      // Comet は data.data が clip 配列で、各要素に audio_url が入る。正規化で取りこぼした場合のフォールバック
      const nestedData = (raw as any).data?.data ?? (raw as any).データ?.データ
      const clipsFallback: SunoClip[] = Array.isArray(nestedData) ? nestedData : clips
      const fromClips =
        clips.find((c: SunoClip) => typeof c?.audio_url === 'string' && c.audio_url.length > 0)?.audio_url ??
        clipsFallback.find((c: SunoClip) => typeof c?.audio_url === 'string' && c.audio_url.length > 0)?.audio_url ??
        clips.find((c: SunoClip) => typeof c?.stream_url === 'string' && c.stream_url.length > 0)?.stream_url ??
        clipsFallback.find((c: SunoClip) => typeof c?.stream_url === 'string' && c.stream_url.length > 0)?.stream_url ??
        clips.find((c: SunoClip) => typeof c?.url === 'string' && c.url.length > 0)?.url ??
        clipsFallback.find((c: SunoClip) => typeof c?.url === 'string' && c.url.length > 0)?.url
      const fromInner = inner
        ? (inner.audio_url ?? inner.stream_url ?? inner.url) as string | undefined
        : undefined
      const url =
        fromClips ??
        data.audio_url ??
        fromInner ??
        data.stream_url ??
        data.url ??
        (typeof data.data === 'object' && !Array.isArray(data.data) ? data.data?.audio_url : undefined) ??
        (typeof data.data === 'object' && !Array.isArray(data.data) ? data.data?.stream_url : undefined) ??
        (typeof data.data === 'object' && !Array.isArray(data.data) ? data.data?.url : undefined) ??
        (Array.isArray(data.audio_urls) && data.audio_urls[0]) ??
        (typeof data.data === 'object' && !Array.isArray(data.data) && Array.isArray(data.data?.audio_urls) ? data.data?.audio_urls?.[0] : undefined)
      if (url && typeof url === 'string') {
        console.log('[Suno Fetch] completed, raw response (final):', JSON.stringify(raw))
        return url
      }
    }

    const failed = /fail|error/i.test(status)
    if (failed) {
      console.warn('Suno task failed for task_id=', taskId, raw)
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
