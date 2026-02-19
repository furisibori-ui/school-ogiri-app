import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
})

export async function POST(request: NextRequest) {
  try {
    const { prompt, landmark, imageType = 'landscape' } = await request.json()

    // 画像タイプによってアスペクト比を変更
    let width = 768
    let height = 512
    let placeholderSize = '600x400'

    if (imageType === 'face' || imageType === 'portrait') {
      // 顔写真：正方形（大きく表示）
      width = 768
      height = 768
      placeholderSize = '600x600'
    } else if (imageType === 'emblem') {
      // 校章：正方形
      width = 512
      height = 512
      placeholderSize = '400x400'
    } else if (imageType === 'uniform' || imageType === 'fullbody') {
      // 制服・全身：縦長（3:4比率）
      width = 576
      height = 896
      placeholderSize = '450x700'
    } else {
      // その他：4:3（見やすい比率）
      width = 768
      height = 576
      placeholderSize = '600x450'
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.warn('REPLICATE_API_TOKEN not set, using placeholder')
      return NextResponse.json({ 
        url: `https://placehold.co/${placeholderSize}/CCCCCC/666666?text=Image+Generation+Disabled` 
      })
    }

    // 地名・ランドマークを含めた詳細プロンプト
    const enhancedPrompt = `${prompt}, ${landmark} in background, Japanese high school, disposable camera aesthetic, grainy film texture, 1990s quality, slightly blurry, nostalgic atmosphere, amateur photography, candid shot, realistic lighting, natural colors with slight fading`

    console.log('Generating image with prompt:', enhancedPrompt, `(${width}x${height})`)

    // Stable Diffusion XLで画像生成
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: enhancedPrompt,
          negative_prompt: "professional photography, high quality, sharp focus, modern, digital, clean, perfect, polished, studio lighting, color grading, photoshop",
          num_outputs: 1,
          width,
          height,
          num_inference_steps: 30,
          guidance_scale: 7.5,
        }
      }
    ) as string[]

    const imageUrl = output[0]
    console.log('Image generated:', imageUrl)

    return NextResponse.json({ url: imageUrl })

  } catch (error) {
    console.error('Image generation error:', error)
    // エラー時はプレースホルダーを返す
    return NextResponse.json({ 
      url: `https://placehold.co/600x400/CCCCCC/666666?text=Image+Generation+Failed` 
    })
  }
}
