import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { LocationData } from '@/types/school'

// 限界ギリギリ：Vercel Pro 上限300秒（校歌歌詞のみなので通常は短いが、上限まで許容）
export const maxDuration = 300

/** 校歌（歌詞・タイトル・スタイル）だけを先行取得する。曲生成を早く開始するために使う。 */
export async function POST(request: NextRequest) {
  let locationData: LocationData
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
    }
    locationData = body as LocationData
    const { lat, lng } = locationData
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: '位置情報が不正です' }, { status: 400 })
    }
    locationData.landmarks = locationData.landmarks?.length ? locationData.landmarks : ['この地域']
  } catch {
    return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
  }

  const useAnthropic = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== '')
  const useComet = !!(process.env.COMET_API_KEY && process.env.COMET_API_KEY !== '')
  if (!useAnthropic && !useComet) {
    return NextResponse.json({
      school_anthem: {
        title: '校歌',
        lyrics: '一\nこの地に 学びの 灯がともり\n二\n伝統を 受け継ぎ 明日へと\n三\n永遠に 咲かせん この母校',
        style: '荘厳な合唱曲風',
      },
    })
  }

  const RESEARCH_MAX = 500
  const researchText = locationData.comprehensive_research
    ? locationData.comprehensive_research.length > RESEARCH_MAX
      ? locationData.comprehensive_research.slice(0, RESEARCH_MAX) + '…'
      : locationData.comprehensive_research
    : ''
  const landmarks = locationData.landmarks?.join('、') || 'この地域'
  const context = researchText
    ? `【地域情報】\n${researchText}\n\n上記の地域にふさわしい校歌を作成してください。`
    : `【地域】${landmarks}\nこの地域にふさわしい校歌を作成してください。`

  const systemPrompt = `あなたは地域密着型の架空学校の校歌を作詞する専門家です。
以下のルールで校歌（タイトル・歌詞・スタイル）だけをJSONで返してください。
- 歌詞は必ず1番・2番・3番の3つすべてを出力すること（2番で終わりにしない）。七五調または八六調。改行は\\nで表す。
- 周辺の山・川・地名・ランドマークなど固有の情報をしっかり入れ込むこと。地域の固有名詞を各番に5つ以上含める。
- 返却は必ず次のJSONのみ。説明や前置きは不要。
{"school_anthem":{"title":"〇〇校歌","lyrics":"一\\n...\\n\\n二\\n...\\n\\n三\\n...","style":"荘厳な合唱曲風"}}`

  const userPrompt = `${context}\n\n上記の地域にふさわしい校歌を、上記JSON形式のみで返してください。`

  let responseText: string
  try {
    if (useComet) {
      const key = process.env.COMET_API_KEY!
      const model = process.env.COMET_CHAT_MODEL || 'anthropic/claude-3-5-sonnet'
      const res = await fetch('https://api.cometapi.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          max_tokens: 2048,
          temperature: 0.9,
        }),
      })
      if (!res.ok) throw new Error(`Comet: ${res.status}`)
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      responseText = data?.choices?.[0]?.message?.content ?? ''
    } else {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        temperature: 0.9,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })
      responseText = msg.content[0].type === 'text' ? msg.content[0].text : ''
    }
  } catch (err) {
    console.error('校歌先行API エラー:', err)
    return NextResponse.json(
      { error: '校歌の取得に失敗しました', school_anthem: null },
      { status: 500 }
    )
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json(
      { error: '校歌の解析に失敗しました', school_anthem: null },
      { status: 500 }
    )
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { school_anthem?: { title?: string; lyrics?: string; style?: string } }
    const anthem = parsed?.school_anthem
    if (!anthem?.lyrics) {
      return NextResponse.json(
        { error: '校歌の形式が不正です', school_anthem: null },
        { status: 500 }
      )
    }
    return NextResponse.json({
      school_anthem: {
        title: anthem.title || '校歌',
        lyrics: anthem.lyrics,
        style: anthem.style || '荘厳な合唱曲風',
      },
    })
  } catch {
    return NextResponse.json(
      { error: '校歌のJSON解析に失敗しました', school_anthem: null },
      { status: 500 }
    )
  }
}
