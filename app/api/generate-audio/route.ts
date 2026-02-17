import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
})

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'プロンプトが必要です' },
        { status: 400 }
      )
    }

    // AudioLDMを使用して環境音を生成
    const output = await replicate.run(
      "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
      {
        input: {
          prompt: prompt,
          duration: 8,  // 8秒の音声
          model_version: "stereo-large",
          output_format: "mp3",
          normalization_strategy: "peak",
        }
      }
    )

    // outputは文字列のURLまたはURLの配列
    let audioUrl: string | null = null
    
    if (typeof output === 'string') {
      audioUrl = output
    } else if (Array.isArray(output) && output.length > 0) {
      audioUrl = output[0]
    }

    if (!audioUrl) {
      throw new Error('音声URLが取得できませんでした')
    }

    return NextResponse.json({
      audio_url: audioUrl,
    })

  } catch (error) {
    console.error('音声生成エラー:', error)
    return NextResponse.json(
      { error: '音声の生成に失敗しました' },
      { status: 500 }
    )
  }
}
