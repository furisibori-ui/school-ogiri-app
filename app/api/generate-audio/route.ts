import { NextRequest, NextResponse } from 'next/server'

// 限界ギリギリ：Vercel Pro 上限300秒まで待機（Sunoは遅い場合があるため）
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

    // 音楽生成には1番のみ送る（60秒程度に収める）。サイトに掲載する歌詞は呼び出し元が全文（3番まで）を保持して表示する
    const firstVerseOnly = getFirstVerseOnly(lyrics)
    const lyricsForSuno = firstVerseOnly ?? lyrics
    const structuredLyrics = formatLyricsWithTags(lyricsForSuno)

    // 60秒程度を指定（style に明示。duration は API が対応していれば使用される）
    const styleWithDuration = (style || 'solemn choir, orchestral, Japanese school anthem') + ', about 60 seconds'

    const response = await fetch('https://api.cometapi.com/suno/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.COMET_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: structuredLyrics,
        style: styleWithDuration,
        title: title || '校歌',
        make_instrumental: false,
        wait_audio: true,
        duration: 60,
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

// 1番のみ抜き出し（「二」「2」など2番表記の手前まで）。音楽生成用に短くする
function getFirstVerseOnly(lyrics: string): string | null {
  const lines = lyrics.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length <= 4) return null
  const firstBlock: string[] = []
  for (const line of lines) {
    if (/^[一二三四五六七八九十]+[、．.]?\s*$/.test(line) || /^[0-9]+\.?\s*$/.test(line)) {
      if (firstBlock.length > 0) break
      continue
    }
    firstBlock.push(line)
    if (firstBlock.length >= 6) break
  }
  return firstBlock.length >= 2 ? firstBlock.join('\n') : null
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

