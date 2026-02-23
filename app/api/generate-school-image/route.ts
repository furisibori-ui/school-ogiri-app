import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

// 限界ギリギリ：Vercel Pro 上限300秒（画像1枚ごとの呼び出しなので通常は短いが、上限まで許容）
export const maxDuration = 300

type AspectRatio = '1:1' | '16:9' | '3:2' | '2:3' | '4:3' | '9:16'

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

// Comet利用時: 画像生成用。Comet で利用可能なモデル（404 回避）。上書きは COMET_IMAGE_MODEL
const DEFAULT_COMET_IMAGE_MODEL = 'gemini-2.5-flash-image'

async function generateImageViaComet(
  prompt: string,
  aspectRatio: AspectRatio = '16:9',
  imageType?: string
): Promise<string> {
  const key = process.env.COMET_API_KEY
  if (!key) return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
  const model = process.env.COMET_IMAGE_MODEL || DEFAULT_COMET_IMAGE_MODEL
  try {
    const res = await fetch(`https://api.cometapi.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio, imageSize: '1K' } },
      }),
    })
    const text = await res.text()
    if (!res.ok) {
      console.warn('Comet image API non-OK:', res.status, text.slice(0, 200))
      return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
    }
    if (text.trimStart().startsWith('<')) {
      console.warn('Comet image API returned HTML instead of JSON:', text.slice(0, 300))
      return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
    }
    let data: { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }> }
    try {
      data = JSON.parse(text)
    } catch {
      console.warn('Comet image API response not JSON:', text.slice(0, 200))
      return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
    }
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: { inlineData?: unknown }) => p.inlineData)
    const b64 = imagePart?.inlineData?.data
    const mime = imagePart?.inlineData?.mimeType || 'image/png'
    if (b64) return `data:${mime};base64,${b64}`
    // 200 + JSON だが画像が含まれていない（セーフティフィルターのサイレントブロック等）
    const candidate = data?.candidates?.[0] as {
      finishReason?: string
      safetyRatings?: Array<{ category?: string; probability?: string }>
      [k: string]: unknown
    } | undefined
    const promptFeedback = (data as { promptFeedback?: { blockReason?: string; [k: string]: unknown } })?.promptFeedback
    console.warn('[Comet image] 200 OK but no image in response. Check finishReason (imageType helps compare emblem vs face):', {
      imageType: imageType ?? 'unknown',
      finishReason: candidate?.finishReason,
      finishReasonMeaning:
        candidate?.finishReason === 'SAFETY'
          ? 'SAFETY = 安全上の理由でブロック（リアルな人物・暴力等）'
          : candidate?.finishReason === 'RECITATION'
            ? 'RECITATION = 著作権等でブロック'
            : candidate?.finishReason === 'OTHER'
              ? 'OTHER = その他システムエラー'
              : candidate?.finishReason === 'STOP'
                ? 'STOP = 正常終了（通常は画像あり）'
                : 'unknown',
      safetyRatings: candidate?.safetyRatings,
      promptFeedbackBlockReason: promptFeedback?.blockReason,
      hasCandidates: !!data?.candidates?.length,
      partsLength: parts.length,
    })
  } catch (e) {
    console.warn('Comet image generation failed:', e)
  }
  return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
}

function getAspectRatioForType(imageType: string): AspectRatio {
  if (imageType === 'face' || imageType === 'principal_face') return '1:1'
  if (imageType === 'logo' || imageType === 'emblem') return '16:9'
  return '16:9'
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

    // 廉価版優先: Replicate（SDXL）が設定されていれば画像はReplicateを使用（約0.3〜1円/枚）。未設定時のみComet（Gemini 2.5 Flash Image、約6円/枚）を使用
    const useReplicate = !!process.env.REPLICATE_API_TOKEN
    const useComet = !!process.env.COMET_API_KEY
    const aspectRatio = getAspectRatioForType(imageType)
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
          imageType: imageType === 'principal_face' ? 'face' : imageType === 'historical_building' || imageType === 'monument' ? 'landscape' : imageType,
        }),
        })
        const data = await res.json().catch(() => ({}))
        url = data?.url || `https://placehold.co/800x450/8B7355/FFFFFF?text=Overview`
      }
    } else if (useComet) {
      url = await generateImageViaComet(finalPrompt, aspectRatio, imageType)
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
