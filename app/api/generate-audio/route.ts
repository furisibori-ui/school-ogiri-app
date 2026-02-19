import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { lyrics, style, title } = await request.json()

    if (!process.env.COMET_API_KEY) {
      console.warn('COMET_API_KEY not set, audio generation disabled')
      return NextResponse.json({ 
        url: null,
        message: '音声生成機能は現在無効です'
      })
    }

    // 歌詞を構造化（Verse/Chorus）
    const structuredLyrics = formatLyricsWithTags(lyrics)

    // CometAPI経由でSuno AIに音楽生成リクエスト
    const response = await fetch('https://api.cometapi.com/suno/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.COMET_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: structuredLyrics,
        style: style || 'solemn choir, orchestral, Japanese school anthem',
        title: title || '校歌',
        make_instrumental: false,
        wait_audio: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Suno API error: ${response.status}`)
    }

    const data = await response.json()
    const audioUrl = data.audio_url || data.url

    console.log('Audio generated:', audioUrl)

    return NextResponse.json({ 
      url: audioUrl,
      message: '校歌を生成しました'
    })

  } catch (error) {
    console.error('Audio generation error:', error)
    return NextResponse.json({ 
      url: null,
      message: '音声生成に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// 歌詞を構造化する関数
function formatLyricsWithTags(lyrics: string): string {
  const lines = lyrics.split('\n').filter(line => line.trim())
  
  // 空行で区切られた部分を検出
  let formatted = '[Verse 1]\n'
  let inChorus = false
  
  lines.forEach((line, index) => {
    // 2連目からはChorusとして扱う
    if (index >= lines.length / 2 && !inChorus) {
      formatted += '\n[Chorus]\n'
      inChorus = true
    }
    formatted += line + '\n'
  })
  
  return formatted
}
