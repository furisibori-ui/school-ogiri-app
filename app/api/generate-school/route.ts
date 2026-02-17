import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { LocationData, SchoolData } from '@/types/school'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    const locationData: LocationData = await request.json()

    // 地域情報を収集するプロンプトを構築
    const locationContext = buildLocationContext(locationData)

    // 大喜利エンジンのシステムプロンプト
    const systemPrompt = `
あなたは「大喜利理論」に基づいて架空の学校を生成する専門家です。

## 大喜利の3つの法則

1. **因果の暴走 (Hyperbole):** 地域の特徴を極端に誇張し、日常を非日常にする
   - 例: 「坂が多い」→「登校がアルピニストの訓練レベル」
   - 例: 「工場地帯」→「チャイムの音が工場のサイレン」

2. **名物の義務化 (Obligation):** 地域の名物を学校生活に強制的に組み込む
   - 例: 「うどんが有名」→「蛇口から出汁が出る」「校章が麺の結び目」
   - 例: 「鹿が出る」→「鹿が生徒会長」

3. **歴史の誤用 (Misinterpretation):** 歴史や伝説を都合よく曲解して学校文化にする
   - 例: 「忍者ゆかりの地」→「遅刻は変わり身の術で免除」
   - 例: 「古墳がある」→「校長室が前方後円墳の形」

## トーン＆マナー

内容は荒唐無稽ですが、文体は**「伝統ある名門校の公式サイト」のように厳粛で真面目**に書いてください。
このギャップで笑いを生みます。格式高く、誇らしげに、時に感動的に語ってください。

## 出力形式

必ず以下のJSON形式で回答してください（他の文章は含めないでください）：

{
  "school_profile": {
    "name": "地名を含んだもっともらしい校名",
    "motto": "地域の特徴を反映した校訓",
    "overview": "場所の特徴を壮大に語った学校紹介文（200-300字）"
  },
  "principal_message": {
    "name": "土地柄を反映した校長名",
    "title": "校長",
    "text": "地域の特徴を教育理念として語る挨拶文（300-400字）",
    "face_prompt": "Portrait photo of a Japanese school principal, [特徴を英語で], professional, formal, indoor lighting, 50-60 years old"
  },
  "school_anthem": {
    "title": "校歌タイトル",
    "lyrics": "1番の歌詞（七五調、4-6行、必ず具体的な地名・店名・道路名を含める）",
    "style": "曲調（例：軍歌風、お経風、演歌風）"
  },
  "crazy_rules": [
    "校則1（地域の特徴を反映した理不尽なルール）",
    "校則2",
    "校則3"
  ],
  "multimedia_content": {
    "club_activity": {
      "name": "奇妙な部活動名",
      "description": "活動内容（100-150字）",
      "sound_prompt": "環境音プロンプト（英語、例: Strong wind noise with students shouting, heavy breathing, outdoor environment, lo-fi recording）"
    },
    "school_event": {
      "name": "名物行事名",
      "description": "行事内容（100-150字）",
      "image_prompt": "画像生成プロンプト（英語、例: A candid photo of Japanese high school students [活動内容], disposable camera style, nostalgic, slightly grainy）"
    }
  }
}
`

    const userPrompt = `
以下の位置情報に基づいて、その土地ならではの架空の学校を生成してください。

${locationContext}

大喜利の3つの法則を駆使して、地域の特徴を極端にデフォルメした学校を作成してください。
ただし、文体は格式高く真面目に保ってください。
`

    // Claude APIを呼び出し
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 1.0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // レスポンスからJSONを抽出
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : ''

    // JSONの抽出（```json ... ``` の形式の場合も対応）
    let schoolData: SchoolData
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || 
                     responseText.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0]
      schoolData = JSON.parse(jsonText)
    } else {
      schoolData = JSON.parse(responseText)
    }

    return NextResponse.json(schoolData)

  } catch (error) {
    console.error('学校生成エラー:', error)
    return NextResponse.json(
      { error: '学校の生成に失敗しました' },
      { status: 500 }
    )
  }
}

function buildLocationContext(location: LocationData): string {
  let context = `
## 位置情報
- 緯度: ${location.lat}
- 経度: ${location.lng}
`

  if (location.address) {
    context += `- 住所: ${location.address}\n`
  }

  if (location.landmarks && location.landmarks.length > 0) {
    context += `\n## 近隣のランドマーク\n`
    location.landmarks.forEach((landmark, i) => {
      context += `${i + 1}. ${landmark}\n`
    })
  }

  if (location.region_info) {
    context += `\n## 地域情報\n`
    
    if (location.region_info.specialties) {
      context += `特産品: ${location.region_info.specialties.join(', ')}\n`
    }
    
    if (location.region_info.history) {
      context += `歴史: ${location.region_info.history.join(', ')}\n`
    }
    
    if (location.region_info.climate) {
      context += `気候: ${location.region_info.climate}\n`
    }
  }

  return context
}
