import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    const { prompt, type } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'プロンプトが必要です' },
        { status: 400 }
      )
    }

    // 写ルンです風フィルターを追加
    let enhancedPrompt = prompt

    if (type === 'event') {
      enhancedPrompt += ', disposable camera aesthetic, slightly grainy, nostalgic 1990s photo quality, faded colors, natural lighting, candid moment'
    } else if (type === 'principal') {
      enhancedPrompt += ', professional portrait photo, indoor office setting, formal attire, slightly dated photography style, serious expression'
    }

    // DALL-E 3で画像を生成
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    })

    const imageUrl = response.data?.[0]?.url

    if (!imageUrl) {
      throw new Error('画像URLが取得できませんでした')
    }

    return NextResponse.json({
      image_url: imageUrl,
      revised_prompt: response.data?.[0]?.revised_prompt,
    })

  } catch (error) {
    console.error('画像生成エラー:', error)
    return NextResponse.json(
      { error: '画像の生成に失敗しました' },
      { status: 500 }
    )
  }
}
