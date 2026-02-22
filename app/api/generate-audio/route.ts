import { NextRequest, NextResponse } from 'next/server'

// Inngest 経由なら時間制限なし。Vercel 単体時は maxDuration まで待機
export const maxDuration = 300

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

    // 校歌は3番まで全文を送る（時間制限は指定しない。Suno が適宜長さを決める）
    const structuredLyrics = formatLyricsWithTags(lyrics || '')

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

// 歌詞を Suno 用に [Verse 1][Verse 2][Verse 3] などで構造化（3番まで対応）
function formatLyricsWithTags(lyrics: string): string {
  const lines = lyrics.split('\n').map(l => l.trim()).filter(Boolean)
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

