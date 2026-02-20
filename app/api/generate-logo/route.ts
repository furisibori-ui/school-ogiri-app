import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { schoolName, landmark } = await request.json()

    if (!process.env.REPLICATE_API_TOKEN) {
      console.warn('⚠️ REPLICATE_API_TOKEN が設定されていません')
      return NextResponse.json({ 
        url: `https://placehold.co/1200x300/003366/FFD700?text=${encodeURIComponent(schoolName)}`,
        fallback: true
      })
    }

    // Replicate API で画像生成
    const prompt = `
Japanese school logo banner design, traditional style, 
text: "${schoolName}", 
elegant calligraphy font, navy blue background with gold accents,
incorporating ${landmark} motif, 
horizontal banner format 1200x300px, 
formal and authoritative atmosphere, 
vintage Japanese school aesthetic, 
subtle texture, high quality
`

    console.log('🎨 ロゴ生成開始:', prompt)

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        input: {
          prompt: prompt,
          width: 1200,
          height: 300,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 25,
        },
      }),
    })

    const prediction = await response.json()

    if (prediction.error) {
      console.error('❌ Replicate API エラー:', prediction.error)
      return NextResponse.json({ 
        url: `https://placehold.co/1200x300/003366/FFD700?text=${encodeURIComponent(schoolName)}`,
        fallback: true
      })
    }

    // ポーリング（最大30秒待機）
    let result = prediction
    for (let i = 0; i < 30; i++) {
      if (result.status === 'succeeded') {
        const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output
        console.log('✅ ロゴ生成成功:', imageUrl)
        return NextResponse.json({ url: imageUrl })
      } else if (result.status === 'failed') {
        console.error('❌ ロゴ生成失敗:', result.error)
        return NextResponse.json({ 
          url: `https://placehold.co/1200x300/003366/FFD700?text=${encodeURIComponent(schoolName)}`,
          fallback: true
        })
      }

      // 1秒待機して再確認
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          },
        }
      )
      result = await statusResponse.json()
    }

    // タイムアウト
    console.warn('⚠️ ロゴ生成タイムアウト')
    return NextResponse.json({ 
      url: `https://placehold.co/1200x300/003366/FFD700?text=${encodeURIComponent(schoolName)}`,
      fallback: true
    })

  } catch (error) {
    console.error('❌ ロゴ生成エラー:', error)
    return NextResponse.json({ 
      url: 'https://placehold.co/1200x300/003366/FFD700?text=Logo',
      fallback: true
    }, { status: 500 })
  }
}
