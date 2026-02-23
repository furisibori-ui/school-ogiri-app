import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

// 限界ギリギリ：Vercel Pro 上限300秒（画像1枚ごとの呼び出しなので通常は短いが、上限まで許容）
export const maxDuration = 300

/** data URL を Vercel Blob にアップロードして公開 URL を返す。Inngest のステップ出力 4MB 制限を超えないようにする */
async function dataUrlToBlobUrl(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:') || !process.env.BLOB_READ_WRITE_TOKEN) return dataUrl
  try {
    const [header, b64] = dataUrl.split(',')
    const mime = header?.match(/data:([^;]+)/)?.[1] || 'image/png'
    const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'png'
    const buffer = Buffer.from(b64, 'base64')
    const blob = await put(`school-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`, buffer, { access: 'public' })
    return blob.url
  } catch (e) {
    console.warn('Blob upload failed, returning data URL', e)
    return dataUrl
  }
}

const FLUX_FLEX_ENDPOINT = 'https://api.cometapi.com/flux/v1/flux-2-flex'
const FLUX_POLL_INTERVAL_MS = 1500
const FLUX_POLL_MAX_WAIT_MS = 120_000 // 2分

const DEFAULT_COMET_IMAGE_MODEL = 'gemini-2.5-flash-image'

function getCometImageModel(): string {
  return process.env.COMET_IMAGE_MODEL?.trim() || DEFAULT_COMET_IMAGE_MODEL
}

/** CometAPI 経由で画像生成（Gemini Image）→ data URL を返す。失敗時はプレースホルダーURL */
async function generateImageViaGemini(
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '3:2' | '2:3' | '4:3' | '9:16' = '16:9'
): Promise<string> {
  const key = process.env.COMET_API_KEY
  if (!key) return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
  const model = getCometImageModel()
  try {
    const res = await fetch(`https://api.cometapi.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio, imageSize: '1K' },
        },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.warn('[Gemini] Comet image API error:', res.status, err.slice(0, 200))
      return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
    }
    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> }
      }>
    }
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: { inlineData?: unknown }) => p.inlineData)
    const b64 = imagePart?.inlineData?.data
    const mime = imagePart?.inlineData?.mimeType || 'image/png'
    if (b64) return `data:${mime};base64,${b64}`
  } catch (e) {
    console.warn('[Gemini] Comet image generation failed:', e)
  }
  return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
}

/** FLUX 2 FLEX で画像生成（非同期 task + ポーリング）。Authorization は Bearer なしでキーをそのまま指定。 */
async function generateImageViaFluxFlex(prompt: string, _imageType?: string): Promise<string> {
  const key = process.env.COMET_API_KEY
  if (!key) return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
  try {
    const createRes = await fetch(FLUX_FLEX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': key,
      },
      body: JSON.stringify({
        prompt,
        width: 512,
        height: 512,
        steps: 20,
        output_format: 'jpeg',
        prompt_upsampling: false,
      }),
    })
    const createText = await createRes.text()
    if (!createRes.ok) {
      console.warn('[FLUX] create non-OK:', createRes.status, createText.slice(0, 300))
      return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
    }
    let createJson: {
      id?: string
      polling_url?: string
      urls?: { get?: string }
      status?: string
      output?: string | string[]
      result?: string | { url?: string }
      cost?: number
      output_mp?: number
    }
    try {
      createJson = JSON.parse(createText)
    } catch {
      console.warn('[FLUX] create response not JSON:', createText.slice(0, 200))
      return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
    }

    // 同期的に画像が返っている場合（result / output に URL や base64 が入る形式）
    const syncOut = await extractImageFromFluxResponse(createJson)
    if (syncOut) return syncOut

    const pollUrl = createJson.polling_url ?? createJson.urls?.get
    if (!pollUrl) {
      console.warn('[FLUX] no image in result/output and no polling_url. Keys:', Object.keys(createJson))
      return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
    }

    const deadline = Date.now() + FLUX_POLL_MAX_WAIT_MS
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, FLUX_POLL_INTERVAL_MS))
      const pollRes = await fetch(pollUrl, {
        method: 'GET',
        headers: { 'Authorization': key },
      })
      const pollText = await pollRes.text()
      if (!pollRes.ok) {
        console.warn('[FLUX] poll non-OK:', pollRes.status, pollText.slice(0, 200))
        continue
      }
      let pollJson: { status?: string; output?: string | string[]; result?: { url?: string }; image?: string }
      try {
        pollJson = JSON.parse(pollText)
      } catch {
        continue
      }
      const status = (pollJson.status ?? '').toLowerCase()
      if (status === 'succeeded' || status === 'completed' || status === 'ready') {
        const out = await extractImageFromFluxResponse(pollJson)
        if (out) return out
        break
      }
      if (status === 'failed' || status === 'error' || status === 'cancelled') {
        console.warn('[FLUX] task failed:', status, pollText.slice(0, 300))
        break
      }
    }
  } catch (e) {
    console.warn('FLUX 2 FLEX image generation failed:', e)
  }
  return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
}

/** FLUX レスポンスから画像の data URL または URL を抽出。必要なら URL を fetch して data URL に変換。 */
async function extractImageFromFluxResponse(body: {
  output?: string | string[]
  result?: string | string[] | { url?: string }
  image?: string
}): Promise<string | null> {
  const resultVal = body.result as string | string[] | { url?: string; output?: string | string[] } | undefined
  const fromResult =
    Array.isArray(resultVal) ? resultVal[0] : typeof resultVal === 'string' ? resultVal : resultVal?.url ?? (Array.isArray(resultVal?.output) ? resultVal.output[0] : resultVal?.output)
  let raw: string | string[] | undefined = body.output ?? fromResult ?? body.image
  if (Array.isArray(raw) && raw.length > 0) raw = raw[0]
  if (typeof raw === 'string') {
    if (raw.startsWith('data:')) return raw
    if (raw.startsWith('http')) {
      try {
        const imgRes = await fetch(raw)
        if (!imgRes.ok) return null
        const buf = await imgRes.arrayBuffer()
        const b64 = Buffer.from(buf).toString('base64')
        return `data:image/jpeg;base64,${b64}`
      } catch {
        return null
      }
    }
    if (/^[A-Za-z0-9+/=]+$/.test(raw)) return `data:image/jpeg;base64,${raw}`
    return null
  }
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
    return await extractImageFromFluxResponse({ output: raw[0] })
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const prompt = typeof body?.prompt === 'string' ? body.prompt : ''
    const imageType = typeof body?.imageType === 'string' ? body.imageType : 'overview'

    if (!prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // 写真に日付・テキスト・ウォーターマークが入らないよう全プロンプトに付与
    const noTextSuffix = ' Do not include any text, date, watermark, timestamp, or letters/numbers in the image. Pure visual only, no text overlay.'
    const finalPrompt = prompt.trim() + noTextSuffix

    // 廉価版優先: Replicate（SDXL）が設定されていれば画像はReplicateを使用。未設定時は Comet で Gemini Image を使用（従来どおり）。COMET_IMAGE_USE_FLUX=true のときだけ FLUX 2 FLEX
    const useReplicate = !!process.env.REPLICATE_API_TOKEN
    const useComet = !!process.env.COMET_API_KEY
    const useFluxForComet = process.env.COMET_IMAGE_USE_FLUX === 'true'
    let url: string

    if (useReplicate) {
      if (imageType === 'logo' || imageType === 'emblem') {
        const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const res = await fetch(`${base}/api/generate-logo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolName: body.schoolName || '学校', landmark: body.landmark || '' }),
        })
        const data = await res.json().catch(() => ({}))
        url = data?.url || `https://placehold.co/1200x300/003366/FFD700?text=Logo`
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const res = await fetch(`${base}/api/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          prompt: finalPrompt,
          landmark: body.landmark || '日本の学校',
          imageType: imageType === 'principal_face' ? 'face' : imageType === 'historical_building' || imageType === 'historical_building_current' || imageType === 'monument' ? 'landscape' : imageType,
        }),
        })
        const data = await res.json().catch(() => ({}))
        url = data?.url || `https://placehold.co/800x450/8B7355/FFFFFF?text=Overview`
      }
    } else if (useComet) {
      if (useFluxForComet) {
        url = await generateImageViaFluxFlex(finalPrompt, imageType)
      } else {
        const aspectRatio: '1:1' | '16:9' | '3:2' | '2:3' | '4:3' | '9:16' =
          imageType === 'logo' || imageType === 'emblem' ? '3:2'
          : imageType === 'principal_face' || imageType === 'face' ? '1:1'
          : '16:9'
        url = await generateImageViaGemini(finalPrompt, aspectRatio)
      }
      // data URL のまま返すと Inngest のステップ出力が 4MB を超えて「出力が大きすぎる」で落ちるため、Blob に上げて URL だけ返す
      if (url.startsWith('data:')) url = await dataUrlToBlobUrl(url)
    } else {
      if (imageType === 'logo' || imageType === 'emblem') {
        url = `https://placehold.co/1200x300/003366/FFD700?text=Logo`
      } else {
        url = `https://placehold.co/800x450/8B7355/FFFFFF?text=Overview`
      }
    }

    return NextResponse.json({ url })
  } catch (e) {
    console.error('generate-school-image error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '画像の生成に失敗しました' },
      { status: 500 }
    )
  }
}
