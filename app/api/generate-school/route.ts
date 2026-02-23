import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { kv } from '@vercel/kv'
import { jsonrepair } from 'jsonrepair'
import { LocationData, SchoolData, StyleConfig } from '@/types/school'

const COMET_CHAT_SUCCESS_CACHE_KEY = 'school:comet_chat_last_success'
const COMET_CHAT_SUCCESS_CACHE_TTL = 86400 * 7 // 7日

// Vercel: Hobby は最大60秒・Pro は最大300秒。Pro なら 300 で有効。Hobby では 60 が上限。
export const maxDuration = 300

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

/** 校長名から性別を推定（名前と顔画像の性別一致用） */
function inferPrincipalGender(name: string | undefined): 'male' | 'female' | null {
  if (!name || typeof name !== 'string') return null
  const n = name.trim()
  // 女性名の典型（末尾・含む）
  const femaleMarkers = /(子|美咲|由美|恵子|裕子|明美|和子|久美子|真理子|智子|礼子|美|咲|花|香|奈|愛|優)$|^(Mary|Patricia|Jennifer|Linda|Elizabeth|Susan|Jessica|Sarah|Karen|Nancy|Marie|Sophie|Amélie|Anna|Emma|Sophia|서연|민서|지우|하은|윤서|지민|채원|다은|예은|수아)/i
  // 男性名の典型
  const maleMarkers = /(郎|太郎|一郎|健太郎|雄|夫|男|也|太|介|助|樹|武|進|修|剛|勇|明|茂|正|和|秀|昭|幸|光|義|清)$|^(James|John|Robert|Michael|William|David|Richard|Joseph|Thomas|Charles|Pierre|Jean|François|Hans|Karl|Wolfgang|민준|서준|예준|도윤|시우|주원|하준|지호|준서|건우)/i
  if (femaleMarkers.test(n)) return 'female'
  if (maleMarkers.test(n)) return 'male'
  return null
}

/** face_prompt の principal の性別表記を指定に合わせる（名前と画像の一致用） */
function ensureFacePromptGender(facePrompt: string | undefined, gender: 'male' | 'female'): string {
  if (!facePrompt || typeof facePrompt !== 'string') {
    return gender === 'female'
      ? "Bust-up portrait (head and shoulders only), principal's office, modern Japanese female principal, 55 years old, business suit, serious expression, disposable camera aesthetic, slightly faded colors"
      : "Bust-up portrait (head and shoulders only), principal's office, modern Japanese male principal, 60 years old, business suit, serious expression, disposable camera aesthetic, slightly faded colors"
  }
  const lower = facePrompt.toLowerCase()
  const wantFemale = gender === 'female'
  if (wantFemale) {
    if (lower.includes('female')) return facePrompt
    return facePrompt.replace(/male principal/g, 'female principal').replace(/male\s+principal/gi, 'female principal')
  } else {
    if (lower.includes('male') && !lower.includes('female')) return facePrompt
    return facePrompt.replace(/female principal/g, 'male principal').replace(/female\s+principal/gi, 'male principal')
  }
}

/** LLMが出力しがちな不正JSONを修復してパース（末尾カンマ・抜けカンマ・コメント等に対応） */
function repairAndParseSchoolJson(jsonText: string): SchoolData {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    const simpleRepaired = jsonText
      .replace(/,(\s*)\]/g, '$1]')
      .replace(/,(\s*)\}/g, '$1}')
    try {
      parsed = JSON.parse(simpleRepaired)
    } catch {
      // jsonrepair で抜けカンマ・末尾カンマ・truncated 等を修復（position 3707 "after array element" 対策）
      try {
        const repaired = jsonrepair(jsonText)
        parsed = JSON.parse(repaired)
      } catch (e3) {
        throw e3
      }
    }
  }
  return parsed as SchoolData
}

// 画像生成ヘルパー関数
async function generateImage(prompt: string, landmark: string, imageType: string = 'landscape'): Promise<string> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, landmark, imageType }),
    })
    const data = await response.json()
    return data.url
  } catch (error) {
    console.error('Image generation failed:', error)
    const placeholderSize = imageType === 'face' || imageType === 'portrait' ? '600x600' : '600x450'
    return `https://placehold.co/${placeholderSize}/CCCCCC/666666?text=Image+Failed`
  }
}

const DEFAULT_COMET_IMAGE_MODEL = 'gemini-2.5-flash-image'
const DEPRECATED_IMAGE_MODEL = 'gemini-2.0-flash-exp-image-generation' // v1beta で見つからないため使用しない

function getCometImageModel(): string {
  const env = process.env.COMET_IMAGE_MODEL?.trim()
  if (env && env.includes(DEPRECATED_IMAGE_MODEL)) return DEFAULT_COMET_IMAGE_MODEL
  return env || DEFAULT_COMET_IMAGE_MODEL
}

/** CometAPI 経由で画像生成（Gemini Image）→ data URL を返す。失敗時はプレースホルダーURL */
async function generateImageViaComet(
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '3:2' | '2:3' | '4:3' | '9:16' = '16:9'
): Promise<string> {
  const key = process.env.COMET_API_KEY
  if (!key) return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
  const model = getCometImageModel()
  try {
    const res = await fetch(`https://api.cometapi.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio, imageSize: '1K' },
        },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.warn('Comet image API error:', res.status, err.slice(0, 200))
      return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
    }
    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> }
      }>
    }
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: { inlineData?: unknown }) => p.inlineData)
    const b64 = imagePart?.inlineData?.data
    const mime = imagePart?.inlineData?.mimeType || 'image/png'
    if (b64) return `data:${mime};base64,${b64}`
  } catch (e) {
    console.warn('Comet image generation failed:', e)
  }
  return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
}

/** Comet のフォールバック用モデルID（カタログのサンプルコードで確認した形式） */
const COMET_CHAT_FALLBACKS = [
  'google/gemini-2.5-flash',
  'google/gemini-2.0-flash',
  'openai/gpt-4o-mini',
]

/**
 * Comet は独自のモデルID形式を使用。anthropic/claude-3-5-haiku だと 503 になるため、
 * ドキュメント・サンプルコードに書いてある文字列を優先する。
 */
const COMET_DEFAULT_IDS = [
  'claude-haiku-4-5-20251001',      // Comet サンプルコードの形式（Haiku）
  'anthropic/claude-3-5-haiku',     // 旧形式（環境によっては有効）
  'anthropic/claude-3-5-sonnet',
]

/** CometAPI（500+モデル・1API）経由でテキスト生成。成功したモデルIDを返して次回優先する */
async function callCometChat(systemPrompt: string, userPrompt: string): Promise<{ content: string; modelId: string }> {
  const key = process.env.COMET_API_KEY
  if (!key) throw new Error('COMET_API_KEY not set')
  const userModel = process.env.COMET_CHAT_MODEL?.trim()
  const defaultIds = COMET_DEFAULT_IDS
  let ordered = userModel
    ? [userModel, ...defaultIds.filter((m) => m !== userModel), ...COMET_CHAT_FALLBACKS.filter((m) => m !== userModel)]
    : [...defaultIds, ...COMET_CHAT_FALLBACKS]
  ordered = ordered.slice(0, 6)
  const cachedModel = await kv.get<string>(COMET_CHAT_SUCCESS_CACHE_KEY).catch(() => null)
  const modelIds =
    cachedModel && ordered.includes(cachedModel)
      ? [cachedModel, ...ordered.filter((m) => m !== cachedModel)]
      : ordered
  // 全文JSON（校訓・校長・校歌・行事・部活・施設・銅像・制服・教員・沿革・アクセスなど）が欠けないよう余裕を持たせる
  const maxTokens = 12288
  let lastErr: string = ''
  for (const model of modelIds) {
    try {
      const res = await fetch('https://api.cometapi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.9,
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        lastErr = `${model}: ${res.status} ${errText.slice(0, 200)}`
        continue
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      const content = data?.choices?.[0]?.message?.content
      if (typeof content === 'string') {
        await kv.set(COMET_CHAT_SUCCESS_CACHE_KEY, model, { ex: COMET_CHAT_SUCCESS_CACHE_TTL }).catch(() => {})
        return { content, modelId: model }
      }
    } catch (e) {
      lastErr = `${model}: ${e instanceof Error ? e.message : String(e)}`
    }
  }
  throw new Error(`CometAPI: no model succeeded. Last: ${lastErr}`)
}

// 5パターンのサイト構成（隙間だらけにならないよう sectionGap / cardPadding は小さめ）
const LAYOUT_PRESETS: Array<{
  layout: StyleConfig['layout']
  sectionGap: string
  cardPadding: string
  schoolNameSize: string
}> = [
  { layout: 'single-column', sectionGap: '0.5rem', cardPadding: '0.75rem', schoolNameSize: '4.5rem' },
  { layout: 'two-column', sectionGap: '0.55rem', cardPadding: '0.8rem', schoolNameSize: '4rem' },
  { layout: 'grid', sectionGap: '0.6rem', cardPadding: '0.75rem', schoolNameSize: '4.25rem' },
  { layout: 'single-column', sectionGap: '0.45rem', cardPadding: '0.7rem', schoolNameSize: '4rem' },
  { layout: 'two-column', sectionGap: '0.6rem', cardPadding: '0.85rem', schoolNameSize: '4.5rem' }
]

function generateRandomStyleConfig(): StyleConfig {
  const preset = LAYOUT_PRESETS[Math.floor(Math.random() * LAYOUT_PRESETS.length)]
  const layout = preset.layout

  // 小学校っぽい淡い色使い
  const colorThemes = [
    {
      headerBg: 'linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%)', // 淡い青
      headerText: '#0c4a6e',
      bgColor: '#f0f9ff',
      cardBg: '#ffffff',
      accentColor: '#0284c7',
      textColor: '#0c4a6e',
      borderColor: '#bae6fd'
    },
    {
      headerBg: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)', // 淡いピンク
      headerText: '#7f1d1d',
      bgColor: '#fef2f2',
      cardBg: '#ffffff',
      accentColor: '#dc2626',
      textColor: '#7f1d1d',
      borderColor: '#fecaca'
    },
    {
      headerBg: 'linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)', // 淡い緑
      headerText: '#14532d',
      bgColor: '#f0fdf4',
      cardBg: '#ffffff',
      accentColor: '#16a34a',
      textColor: '#14532d',
      borderColor: '#bbf7d0'
    },
    {
      headerBg: 'linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)', // 淡い紫
      headerText: '#581c87',
      bgColor: '#faf5ff',
      cardBg: '#ffffff',
      accentColor: '#9333ea',
      textColor: '#581c87',
      borderColor: '#e9d5ff'
    },
    {
      headerBg: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)', // 淡いオレンジ
      headerText: '#7c2d12',
      bgColor: '#fffbeb',
      cardBg: '#ffffff',
      accentColor: '#ea580c',
      textColor: '#7c2d12',
      borderColor: '#fed7aa'
    },
    {
      headerBg: 'linear-gradient(135deg, #fef9c3 0%, #fde047 100%)', // 淡い黄色
      headerText: '#713f12',
      bgColor: '#fefce8',
      cardBg: '#ffffff',
      accentColor: '#ca8a04',
      textColor: '#713f12',
      borderColor: '#fef9c3'
    },
    {
      headerBg: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', // ネイビー〜青
      headerText: '#ffffff',
      bgColor: '#eff6ff',
      cardBg: '#ffffff',
      accentColor: '#1d4ed8',
      textColor: '#1e3a8a',
      borderColor: '#bfdbfe'
    },
    {
      headerBg: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', // 深緑
      headerText: '#ffffff',
      bgColor: '#f0fdf4',
      cardBg: '#ffffff',
      accentColor: '#15803d',
      textColor: '#14532d',
      borderColor: '#bbf7d0'
    },
    {
      headerBg: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)', // 茶系
      headerText: '#fef3c7',
      bgColor: '#fffbeb',
      cardBg: '#ffffff',
      accentColor: '#b45309',
      textColor: '#78350f',
      borderColor: '#fde68a'
    },
    {
      headerBg: 'linear-gradient(135deg, #374151 0%, #6b7280 100%)', // グレー
      headerText: '#f9fafb',
      bgColor: '#f9fafb',
      cardBg: '#ffffff',
      accentColor: '#4b5563',
      textColor: '#374151',
      borderColor: '#e5e7eb'
    },
    {
      headerBg: 'linear-gradient(135deg, #7c2d12 0%, #b91c1c 100%)', // 紺赤
      headerText: '#fef2f2',
      bgColor: '#fff7ed',
      cardBg: '#ffffff',
      accentColor: '#c2410c',
      textColor: '#7c2d12',
      borderColor: '#fed7aa'
    },
    {
      headerBg: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)', // ティール
      headerText: '#f0fdfa',
      bgColor: '#f0fdfa',
      cardBg: '#ffffff',
      accentColor: '#0d9488',
      textColor: '#134e4a',
      borderColor: '#99f6e4'
    }
  ]
  // 色味はレイアウトと独立にランダム（いろいろな見た目に）
  const colorTheme = colorThemes[Math.floor(Math.random() * colorThemes.length)]

  // フォントもレイアウトと独立にランダム（バリエーション豊かに）
  const fontFamilies = [
    '"Noto Serif JP", serif',
    '"Shippori Mincho", serif',
    '"Zen Old Mincho", serif',
    '"Noto Sans JP", sans-serif',
    '"M PLUS 1p", sans-serif',
    '"Kosugi Maru", sans-serif',
    '"DotGothic16", sans-serif',
    '"Yusei Magic", sans-serif',
    'system-ui, sans-serif',
    'Georgia, "Times New Roman", serif'
  ]
  const fontFamily = fontFamilies[Math.floor(Math.random() * fontFamilies.length)]

  const titleSizes = ['2rem', '2.25rem', '2.5rem', '3rem']
  const headingSizes = ['1.25rem', '1.5rem', '1.75rem']
  const bodySizes = ['0.875rem', '0.9rem', '1rem']
  
  const titleSize = titleSizes[Math.floor(Math.random() * titleSizes.length)]
  const headingSize = headingSizes[Math.floor(Math.random() * headingSizes.length)]
  const bodySize = bodySizes[Math.floor(Math.random() * bodySizes.length)]

  const sectionGap = preset.sectionGap
  const cardPadding = preset.cardPadding

  // ヘッダースタイル（5パターンに合わせて学校名サイズはプリセットから）
  const emblemSizes = ['10rem', '12rem', '14rem']
  const decorationStyles: ('shadow' | 'outline' | 'glow' | 'gradient' | '3d')[] = ['shadow', 'outline', 'glow', 'gradient', '3d']
  
  const emblemSize = emblemSizes[Math.floor(Math.random() * emblemSizes.length)]
  const schoolNameSize = preset.schoolNameSize
  const schoolNameDecoration = decorationStyles[Math.floor(Math.random() * decorationStyles.length)]
  const showMottoInHeader = Math.random() > 0.5 // 50%の確率でヘッダーに校訓を表示

  // セクションを適切な順序で配置（一部ランダム）
  const topSections = ['news', 'principal', 'overview'] // 冒頭は固定
  const middleSections = ['anthem', 'rules', 'events', 'clubs', 'motto', 'historical_buildings']
  const bottomSections = ['facilities', 'monument', 'uniform', 'history', 'teachers'] // 銅像・制服は独立セクション
  
  const shuffledMiddle = [...middleSections].sort(() => Math.random() - 0.5)
  const shuffledBottom = [...bottomSections].sort(() => Math.random() - 0.5)
  
  const sectionOrder = [...topSections, ...shuffledMiddle, ...shuffledBottom]

  // 地域に応じた背景パターンのシンボルを選択
  // Claudeからの出力に含まれる地域シンボルを優先的に使用する予定
  // ここではフォールバック用のランダム選択
  const traditionalSymbols = ['桜', '松', '梅', '竹', '鶴', '亀', '鳳', '龍', '雲', '波', '山', '星', '月', '日', '光', '風']
  const symbol = traditionalSymbols[Math.floor(Math.random() * traditionalSymbols.length)]
  
  return {
    layout,
    colorTheme,
    typography: {
      titleSize,
      headingSize,
      bodySize,
      fontFamily
    },
    spacing: {
      sectionGap,
      cardPadding
    },
    headerStyle: {
      emblemSize,
      schoolNameSize,
      schoolNameDecoration,
      showMottoInHeader
    },
    backgroundPattern: {
      symbol: symbol,
      opacity: 0.05 + Math.random() * 0.1, // 0.05〜0.15
      size: Math.random() > 0.5 ? 'text-6xl' : 'text-8xl',
      rotation: Math.floor(Math.random() * 360)
    },
    sectionOrder
  }
}

// 地域に応じた行事を生成
function generateSchoolEvents(landmark: string, established: any): any[] {
  const events = [
    {
      name: '入学式',
      date: '4月7日',
      descriptions: [
        `新入生の皆様を心より歓迎申し上げる、厳粛かつ感動的な式典でございます。${landmark}を静かに望むことのできる本校体育館にて、保護者の皆様、在校生、教職員が一堂に会し、新たな門出を祝福いたします。式典は、開式の辞に始まり、国歌斉唱、校歌斉唱、そして校長による式辞へと続きます。校長からは、本校の歴史と伝統、校訓に込められた深い意味、そして新入生の皆様への温かい励ましの言葉が述べられます。新入生代表による宣誓では、これから始まる新しい学校生活への強い決意と期待が力強く語られ、会場全体が感動に包まれます。新しい制服に身を包み、期待と不安が入り混じった表情で式典に臨む新入生の姿は、毎年、在校生や教職員の心を深く打つものがございます。式典終了後は、各教室にて最初のホームルームが行われ、担任教諭との初めての出会い、クラスメイトとの交流が始まります。本校での充実した三年間の始まりとなる、記念すべき一日でございます。`,
        `${landmark}の麓に佇む本校体育館にて、厳粛な雰囲気の中、新入生を迎える入学式を挙行いたします。${established.era}時代から続く伝統の式典は、保護者の皆様、来賓の方々、在校生が見守る中、荘厳な雰囲気で執り行われます。新入生一人ひとりの名前が読み上げられる点呼では、緊張した面持ちで返事をする新入生の姿が印象的でございます。校長式辞では、本校の誇り高き歴史と、これからの学園生活への期待が語られ、新入生の胸に深く刻まれます。式典後は桜咲く校庭にて記念撮影が行われ、新しい制服に身を包んだ新入生たちの晴れやかな笑顔が、春の陽光に照らされます。`
      ],
      imagePrompt: 'Japanese high school entrance ceremony, students in formal uniforms, serious atmosphere, indoor gymnasium, disposable camera style, harsh fluorescent lighting'
    },
    {
      name: `${landmark}遠足`,
      date: '4月中旬',
      descriptions: [
        `新入生と在校生との親睦を深めるため、${landmark}周辺の自然豊かな公園にて遠足を実施いたします。レクリエーション活動を通じて、学年を超えた交流が生まれます。午前中は${landmark}の歴史について学芸員の方から詳しい解説を受け、地域の歴史と文化への理解を深めます。午後はクラス対抗のレクリエーション大会を開催し、クラスの団結力を高めてまいります。新入生にとっては、新しいクラスメイトとの絆を深める貴重な機会となり、在校生にとっては、後輩たちを温かく迎え入れる心を育む大切な行事でございます。`,
        `本校の伝統行事である春の遠足は、${landmark}を訪れ、地域の自然と文化に触れる貴重な機会でございます。朝8時に学校を出発し、バスで${landmark}へと向かいます。現地では、専門のガイドの方による詳しい解説を聞きながら、歴史的な建造物や自然環境を見学いたします。昼食は青空の下でのお弁当タイムとなり、友人たちとの楽しい会話が弾みます。午後は班別行動で${landmark}周辺を自由に散策し、地域の魅力を発見する探究活動を行います。この遠足を通じて、生徒たちは地域への理解を深め、郷土愛を育んでまいります。`
      ],
      imagePrompt: 'Japanese high school students on school trip, friendly atmosphere, outdoor park, group activities, disposable camera, bright daylight'
    },
    {
      name: '体育祭',
      date: '5月中旬',
      descriptions: [
        `本校における最大の体育行事でございます。${landmark}を背景に、広々としたグラウンドにて、全校生徒が紅白の二つの組に分かれ、一年間で最も熱い戦いを繰り広げます。この日のために、各クラスでは数週間前から放課後に自主練習を重ね、クラスの団結力を高めてまいります。競技種目は、100m走、200m走、リレー、綱引き、騎馬戦、大縄跳び、そして各学年による迫力満点の団体演技など、実に多彩なプログラムが用意されております。特に、最終種目であるクラス対抗リレーは、全校生徒が固唾を飲んで見守る中、アンカーがゴールテープを切る瞬間まで、勝敗の行方が分からない白熱した展開となり、毎年大きな感動を呼んでおります。`,
        `青空の下、${landmark}を一望できる本校グラウンドにて、年に一度の体育祭を盛大に開催いたします。紅組・白組に分かれた熱戦は、まさに青春の一ページを飾る思い出深い一日となります。応援合戦では、各組の応援団が何週間もかけて練習した演技を披露し、会場を大いに盛り上げます。午前中は短距離走や跳躍競技など個人種目が中心となり、午後は団体競技が行われます。特に伝統の騎馬戦は、まさに戦国時代を彷彿とさせる迫力満点の戦いで、毎年最大の見どころとなっております。保護者の皆様も多数ご来場くださり、お子様の活躍に熱い声援を送ってくださいます。`
      ],
      imagePrompt: 'Japanese sports festival, students competing in relay race, outdoor field, energetic atmosphere, disposable camera, action shot'
    },
    {
      name: `${landmark}文化祭`,
      date: '9月中旬',
      descriptions: [
        `本校最大の文化的行事である文化祭は、生徒たちの日頃の学習や部活動の成果を発表する晴れの舞台でございます。各クラスは趣向を凝らした出し物を企画し、数ヶ月前から準備を重ねてまいります。演劇、合唱、ダンス、研究発表、模擬店など、実に多様なプログラムが用意され、二日間にわたって開催されます。特に${landmark}をテーマとした展示コーナーは毎年好評で、地域の歴史や文化を深く掘り下げた力作が並びます。吹奏楽部や軽音楽部によるステージパフォーマンス、茶道部によるお茶会、美術部による作品展示など、各部活動の発表も見どころの一つでございます。`,
        `「${landmark}と共に歩む」をテーマに掲げた本校文化祭は、地域の皆様にも広く公開し、毎年多くの方々にご来場いただいております。校舎全体が会場となり、各教室では工夫を凝らした展示や出し物が行われます。1年生は${landmark}の歴史研究、2年生は演劇や合唱、3年生は模擬店や大規模なアトラクションを担当し、学年ごとに異なる魅力を発揮いたします。体育館では有志によるステージ発表が行われ、歌やダンス、演奏など多彩なパフォーマンスで会場を盛り上げます。二日間の祭典を通じて、生徒たちは創造力、協調性、そして企画力を大いに発揮し、かけがえのない青春の思い出を作り上げてまいります。`
      ],
      imagePrompt: 'Japanese high school cultural festival, students performing on stage, colorful decorations, indoor gymnasium, disposable camera, festive atmosphere'
    },
    {
      name: '修学旅行',
      date: '10月下旬',
      descriptions: [
        `2年生が参加する本校最大の宿泊行事でございます。日頃の${landmark}とは全く異なる地域を訪れ、歴史や文化を学びながら、クラスの絆を深める貴重な機会となっております。3泊4日の行程では、歴史的な寺社仏閣の見学、伝統工芸の体験、現地の方々との交流など、教室では学べない多くの経験を積むことができます。事前学習では、訪問先について各班でテーマを設定し、詳しく調べ学習を行います。旅行中は班別自主研修の時間も設けられており、生徒たちは事前に立てた計画に沿って、自主的に行動する力を養います。`,
        `修学旅行は本校教育の集大成とも言える重要な行事でございます。${landmark}を離れ、異なる文化圏を訪れることで、視野を広げ、日本の多様性を実感する貴重な体験となります。宿舎では夜遅くまで友人たちと語り合い、普段の学校生活では築けない深い友情が芽生えます。また、時間厳守や集団行動のルール遵守など、社会性を身につける機会でもございます。帰校後は、修学旅行で学んだことをまとめた報告書を作成し、後輩たちへと受け継いでまいります。生徒たちにとって、一生忘れられない思い出となる4日間でございます。`
      ],
      imagePrompt: 'Japanese high school students on school trip, group photo at famous landmark, excited expressions, outdoor, disposable camera'
    },
    {
      name: '卒業証書授与式',
      date: '3月中旬',
      descriptions: [
        `3年間の学びを終えた生徒たちを送り出す、感動の式典でございます。卒業生代表による答辞では、${landmark}と共に過ごした日々への感謝と、これからの決意が力強く語られ、会場には感動の涙が溢れます。在校生代表による送辞では、先輩たちへの尊敬と感謝の気持ち、そして伝統を受け継ぐ決意が述べられます。式典後は各教室でのホームルームが行われ、担任教諭から一人ひとりに卒業証書が手渡されます。最後に全員で校歌を斉唱し、母校との別れを惜しみます。`,
        `本校での3年間の集大成となる卒業証書授与式は、${landmark}を望む体育館にて厳粛に執り行われます。卒業生たちは、最後の制服姿で式典に臨み、校長先生から一人ひとり卒業証書を受け取ります。式辞では、本校で培った「誠実・勤勉・創造」の精神を胸に、新たな人生の道を力強く歩んでいくよう、温かい激励の言葉が贈られます。式典終了後は、保護者の皆様への感謝を込めて、卒業生から花束贈呈が行われます。校庭では在校生たちが作る花道を通り、卒業生たちは母校を後にします。涙と笑顔が交錯する、人生の大切な節目となる一日でございます。`
      ],
      imagePrompt: 'Japanese graduation ceremony, students in formal uniforms, emotional moment, indoor gymnasium, solemn and moving atmosphere, disposable camera'
    }
  ]
  
  // 行事は4つのみ（修学旅行を含む）
  const selectedEvents = [events[0], events[1], events[3], events[4]] // 入学式, 遠足, 文化祭, 修学旅行
  return selectedEvents.map(event => ({
    name: event.name,
    date: event.date,
    description: event.descriptions[Math.floor(Math.random() * event.descriptions.length)],
    image_prompt: event.imagePrompt,
    image_url: 'https://placehold.co/600x450/1E3A8A/FFFFFF?text=School+Event'
  }))
}

// 地域に応じた部活動を生成（1つのみ・場所の内容に則したもの）
function generateClubActivities(landmark: string): any[] {
  const clubs = [
    {
      names: ['吹奏楽部', `${landmark}管弦楽部`, '音楽部', 'ブラスバンド部'],
      descriptions: [
        `本校吹奏楽部は、${landmark}をテーマにした定期演奏会で地域の皆様に親しまれております。音楽室で日々練習に励んでおります。`,
        `音楽部は${landmark}周辺の音楽祭で毎年好評をいただいております。初心者も歓迎でございます。`
      ],
      soundPrompt: 'Japanese school brass band, harmonious music, indoor rehearsal, coordinated performance',
      imagePrompt: 'Japanese high school brass band club, students with instruments, indoor music room, disposable camera style'
    },
    {
      names: ['サッカー部', `${landmark}FC`, 'フットボール部'],
      descriptions: [
        `${landmark}を望むグラウンドで練習するサッカー部は、県大会常連です。地域の少年チームとも交流しております。`,
        `天然芝のグラウンドで日々鍛錬しております。OBの指導も受け、チームワークを大切に活動しております。`
      ],
      soundPrompt: 'Soccer training, ball kicking sounds, coach whistle, students running, outdoor field',
      imagePrompt: 'Japanese high school soccer club, students in uniform practicing, outdoor field, disposable camera aesthetic'
    },
    {
      names: ['茶道部', `${landmark}茶道会`, '伝統文化部'],
      descriptions: [
        `${landmark}を望む茶室で、礼儀作法と心の在り方を学んでおります。文化祭でお茶会を開催しております。`,
        `裏千家の作法を学び、地域のイベントでもお点前を披露しております。和の文化に触れたい方、歓迎です。`
      ],
      soundPrompt: 'Quiet tea ceremony, gentle water sounds, calm atmosphere, traditional Japanese music',
      imagePrompt: 'Japanese high school tea ceremony club, students in kimono, traditional tatami room, disposable camera'
    }
  ]
  
  return clubs.map(club => ({
    name: club.names[Math.floor(Math.random() * club.names.length)],
    description: club.descriptions[Math.floor(Math.random() * club.descriptions.length)],
    sound_prompt: club.soundPrompt,
    image_prompt: club.imagePrompt,
    image_url: 'https://placehold.co/600x450/4A5568/FFFFFF?text=Club+Activity'
  }))
}

// 地域に応じた施設を生成
function generateFacilities(landmark: string): any[] {
  const facilities = [
    {
      names: [`${landmark}記念館`, '校史資料室', '伝統文化資料館'],
      descriptions: [
        `本校の記念館には、創立以来の貴重な資料が数多く保存されております。${landmark}との深い関わりを示す歴史的文書や、卒業生の功績を紹介する展示が充実しており、在校生たちは本校の輝かしい伝統を肌で感じることができます。`,
        `地域の歴史と本校の歩みを詳細に記録した資料館でございます。${landmark}の変遷と共に発展してきた本校の姿が、豊富な写真や文献を通じて学べる、大変貴重な施設となっております。`,
        `${landmark}をテーマとした特別展示室を備え、地域の文化財も多数収蔵しております。地域の方々にも開放しており、地域文化の発信拠点としての役割も果たしております。`
      ]
    },
    {
      names: ['図書館「知の殿堂」', `${landmark}ライブラリー`, '中央図書館'],
      descriptions: [
        `蔵書5万冊を誇る本校の図書館は、地域の郷土資料や、${landmark}に関する専門書を多数所蔵しております。静寂の中、生徒たちは学びを深め、知的好奇心を育んでおります。`,
        `最新の電子書籍システムを導入した近代的な図書館でございます。${landmark}の歴史や文化に関する貴重な古文書のデジタルアーカイブも公開しており、研究活動を強力にサポートしております。`,
        `天井まで届く書架と、${landmark}を一望できる閲覧席が特徴の図書館です。放課後は多くの生徒が自習に訪れ、静謐な雰囲気の中で集中して学習に取り組んでおります。`
      ]
    },
    {
      names: ['体育館兼武道場', '総合体育館', `${landmark}アリーナ`],
      descriptions: [
        `本校の体育館は、地域の避難所としても機能する頑丈な造りとなっております。バスケットボールコート2面分の広さを持ち、各種体育行事や部活動の拠点として活用されております。`,
        `最新の空調設備と音響設備を完備した近代的な体育館でございます。${landmark}の景観に配慮した外観デザインが特徴で、地域のスポーツイベントにも利用されております。`,
        `武道場を併設した総合体育施設でございます。柔道、剣道、空手などの伝統武道の稽古場として、また体育の授業や部活動の練習場として、日々多くの生徒が汗を流しております。`
      ]
    }
  ]
  
  return facilities.map(facility => ({
    name: facility.names[Math.floor(Math.random() * facility.names.length)],
    description: facility.descriptions[Math.floor(Math.random() * facility.descriptions.length)],
    image_prompt: 'Japanese school facility, traditional architecture, nostalgic atmosphere, disposable camera',
    image_url: 'https://placehold.co/600x450/654321/FFFFFF?text=Facility'
  }))
}

// 地域に応じたニュースを生成
function generateNews(landmark: string, established: any): any[] {
  const categories = ['行事', '進路', '部活', '連絡', '表彰']
  const newsTemplates = [
    { cat: '行事', texts: [
      `卒業証書授与式を挙行いたしました。卒業生の皆様のご活躍をお祈り申し上げます`,
      `入学式を挙行し、新入生を迎えました。${landmark}での新たな学びが始まります`,
      `文化祭が盛況のうちに終了いたしました。${landmark}をテーマにした展示が好評でした`
    ]},
    { cat: '進路', texts: [
      `今年度の大学合格実績を更新いたしました。国公立大学合格者数が過去最高を記録`,
      `進路説明会を実施いたしました。多くの保護者の皆様にご参加いただきました`,
      `卒業生による進路講演会を開催し、生徒たちに貴重な体験談を語っていただきました`
    ]},
    { cat: '部活', texts: [
      `吹奏楽部が全国大会で金賞を受賞いたしました`,
      `サッカー部が県大会で優勝し、全国大会出場を決めました`,
      `書道部の作品が${landmark}での展覧会に選出されました`
    ]},
    { cat: '連絡', texts: [
      `${landmark}周辺の地域清掃ボランティアを実施いたしました`,
      `地域の皆様と連携した防災訓練を実施いたしました`,
      `${landmark}での校外学習を実施し、地域の歴史を学びました`
    ]},
    { cat: '表彰', texts: [
      `創立記念式典を挙行し、創立${2026 - established.year}周年を祝いました`,
      `本校の特色ある教育活動が文部科学大臣賞を受賞いたしました`,
      `${landmark}を活用した探究学習が全国表彰を受けました`
    ]}
  ]
  
  const news = []
  const dates = ['2026.02.15', '2026.02.10', '2026.02.05', '2026.01.28', '2026.01.20']
  
  for (let i = 0; i < 5; i++) {
    const template = newsTemplates[i % newsTemplates.length]
    const text = template.texts[Math.floor(Math.random() * template.texts.length)]
    news.push({
      date: dates[i],
      category: template.cat,
      text
    })
  }
  
  return news
}

// 地域に応じた生徒心得を生成
function generateRules(landmark: string): string[] {
  const rules = [
    `登下校時は、定められた通学路を利用し、交通ルールを遵守すること`,
    `制服は常に端正に着用し、頭髪・服装は本校の規定に従うこと`,
    `授業開始10分前までに登校し、始業チャイムと同時に着席すること`,
    `校内では携帯電話の使用を禁止する（緊急時を除く）`,
    `${landmark}周辺では本校の生徒として相応しい品位ある行動を心がけること`,
    `地域の方々への挨拶を励行し、地域社会の一員としての自覚を持つこと`,
    `${landmark}の清掃活動には全校生徒が参加すること`,
    `本校の伝統と校訓を胸に、日々精進すること`,
    `図書館では静粛を保ち、他の生徒の学習を妨げないこと`,
    `遅刻・欠席の際は、必ず保護者を通じて学校に連絡すること`
  ]
  
  return [...rules].sort(() => Math.random() - 0.5).slice(0, 5)
}

// 地域に応じた卒業生を生成
function generateAlumni(lat: number, lng: number, landmark: string): any[] {
  const professions = [
    ['国会議員', '政治家として地域の発展に尽力'],
    ['実業家', 'ベンチャー企業を創業し、地域経済を活性化'],
    ['研究者', '大学教授として後進の育成に貢献'],
    ['芸術家', '国際的に活躍する画家・彫刻家'],
    ['スポーツ選手', 'オリンピック代表選手として活躍'],
    ['医師', '地域医療の第一人者として活躍'],
    ['作家', 'ベストセラー作家として多くの作品を発表'],
    ['建築家', '地域のランドマークを設計'],
    ['音楽家', '世界的な指揮者・演奏家'],
    ['起業家', 'IT企業を創業し上場']
  ]
  
  const alumni = []
  for (let i = 0; i < 3; i++) {
    const isFemale = Math.random() > 0.5
    const name = generateLocalizedName(lat, lng, isFemale)
    const profession = professions[Math.floor(Math.random() * professions.length)]
    const graduationYears = ['昭和45年卒', '昭和52年卒', '昭和58年卒', '平成2年卒', '平成8年卒', '平成15年卒']
    const year = graduationYears[Math.floor(Math.random() * graduationYears.length)]
    
    const achievements = [
      `${profession[0]}として${profession[1]}。「母校で学んだ${landmark}の精神が今も生きている」と語る`,
      `${profession[0]}。${landmark}をテーマにした作品で高い評価を受ける。母校への感謝を常に口にする`,
      `${profession[0]}として国内外で活躍。「あの${landmark}での日々が今の自分を作った」と回顧`,
      `現職の${profession[0]}。地域と母校への恩返しとして、奨学金制度を設立`,
      `${profession[0]}。${landmark}の魅力を世界に発信し続けている卒業生`
    ]
    
    alumni.push({
      name: `${profession[0]} ${name}`,
      year,
      achievement: achievements[Math.floor(Math.random() * achievements.length)]
    })
  }
  
  return alumni
}

// 教員は校長以外に教頭・保健室・生徒指導部主任の3名に絞る
function generateTeachers(lat: number, lng: number, landmark: string): any[] {
  const roles = [
    { name: '教頭', desc: `校長を補佐し、本校の教育方針の推進と教職員のまとめ役として、日々${landmark}の精神を大切にした学校運営に尽力しております。` },
    { name: '養護教諭（保健室）', desc: `保健室を拠点に、生徒の心身の健康管理と健康相談を担当しております。${landmark}周辺の自然を活かした心のケアにも取り組んでおります。` },
    { name: '生徒指導部主任', desc: `生徒の生活指導と健全育成を統括しております。地域との連携を重視し、${landmark}を訪れる校外学習や挨拶運動を推進しております。` }
  ]
  // 校長以外の教員は写真なし（校長のみ principal_message で写真を持つ）
  return roles.map((role) => ({
    name: generateLocalizedName(lat, lng, role.name.includes('養護')),
    subject: role.name,
    description: role.desc
  }))
}

// 地域に応じた人名を生成
function generateLocalizedName(lat: number, lng: number, isFemale: boolean = false): string {
  // 日本（北緯30-46度、東経128-146度）
  if (lat >= 30 && lat <= 46 && lng >= 128 && lng <= 146) {
    const surnames = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', 
                      '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '清水', '山崎',
                      '池田', '橋本', '阿部', '石川', '藤田', '前田', '後藤', '長谷川', '村上', '近藤']
    const maleFirstNames = ['誠一郎', '健太郎', '雄一', '孝之', '明', '勇', '剛', '修', '豊', '茂',
                            '正義', '和夫', '秀雄', '昭夫', '幸雄', '光男', '義雄', '清', '武', '進']
    const femaleFirstNames = ['美咲', '由美子', '恵子', '礼子', '裕子', '明美', '和子', '久美子', '真理子', '智子']
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)]
    const firstName = isFemale 
      ? femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)]
      : maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)]
    return `${surname} ${firstName}`
  }
  
  // 韓国（北緯33-43度、東経124-132度）
  if (lat >= 33 && lat <= 43 && lng >= 124 && lng <= 132) {
    const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임']
    const maleFirstNames = ['민준', '서준', '예준', '도윤', '시우', '주원', '하준', '지호', '준서', '건우']
    const femaleFirstNames = ['서연', '민서', '지우', '하은', '윤서', '지민', '채원', '다은', '예은', '수아']
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)]
    const firstName = isFemale
      ? femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)]
      : maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)]
    return `${surname}${firstName}`
  }
  
  // 中国（広範囲）
  if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) {
    const surnames = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴']
    const maleFirstNames = ['伟', '强', '军', '磊', '勇', '杰', '涛', '明', '超', '鹏']
    const femaleFirstNames = ['芳', '娜', '秀英', '敏', '静', '丽', '强', '洁', '艳', '娟']
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)]
    const firstName = isFemale
      ? femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)]
      : maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)]
    return `${surname}${firstName}`
  }
  
  // ヨーロッパ・アメリカ（西半球または北欧）
  if (lng < 50 || lat > 50) {
    const maleSurnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 
                          'Dubois', 'Martin', 'Bernard', 'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber']
    const femaleSurnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 
                            'Dubois', 'Martin', 'Bernard', 'Müller', 'Schmidt']
    const maleFirstNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
                            'Pierre', 'Jean', 'François', 'Hans', 'Karl', 'Wolfgang']
    const femaleFirstNames = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy',
                              'Marie', 'Sophie', 'Amélie', 'Anna', 'Emma', 'Sophia']
    
    const surnames = isFemale ? femaleSurnames : maleSurnames
    const firstNames = isFemale ? femaleFirstNames : maleFirstNames
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)]
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    return `${firstName} ${surname}`
  }
  
  // その他の地域（デフォルト）
  const surnames = ['Kumar', 'Singh', 'Patel', 'Ali', 'Mohammed', 'Santos', 'Silva', 'Ahmed']
  const firstNames = ['Raj', 'Amir', 'Hassan', 'Carlos', 'Juan', 'Ahmad', 'Yuki', 'Kenji']
  
  const surname = surnames[Math.floor(Math.random() * surnames.length)]
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  return `${firstName} ${surname}`
}

// ランドマークに基づいた校訓を生成（フォールバック用）
// 「その場所に沿った悩み・あるある」を一文で。単語の羅列は避ける。
function generateMotto(landmark: string): string {
  const placeMottos = [
    'トイレを笑顔で貸す',
    '登りは我慢、下りは慎重に',
    '手を合わせたら必ずお賽銭',
    '席を取ったら一品は注文する',
    '並んだら文句を言わない',
    '借りたものは次の人が使えるように戻す',
    '道に迷ったら地元の人に笑顔で聞く',
    'ゴミはその場で捨てず、持ち帰る',
    '混んでたら急かさない、待つ心',
    '見知らぬ人にも「こんにちは」を'
  ]
  return placeMottos[Math.floor(Math.random() * placeMottos.length)]
}

// ランダムな創立年を生成
function generateEstablishedYear(): { year: number, era: string, fullText: string } {
  const startYear = 1868 // 明治元年
  const endYear = 1940   // 昭和15年頃まで
  const year = startYear + Math.floor(Math.random() * (endYear - startYear))
  
  let era = ''
  let eraYear = 0
  
  if (year >= 1868 && year <= 1912) {
    era = '明治'
    eraYear = year - 1867
  } else if (year >= 1912 && year <= 1926) {
    era = '大正'
    eraYear = year - 1911
  } else {
    era = '昭和'
    eraYear = year - 1925
  }
  
  return {
    year,
    era,
    fullText: `${year}年（${era}${eraYear}年）`
  }
}

// よりニッチな学校名を生成
// 超ニッチな学校名を生成（最も近い場所の名前をそのまま使う）
function generateSchoolName(landmarks: string[], closestPlace?: any): string {
  // 最も近い場所の名前を優先的に使用
  const placeName = closestPlace?.name || landmarks[0] || '謎のスポット'
  
  const schoolTypes = ['学園', '学院', '高等学校', '学館', '学舎', '義塾', '附属学校']
  const prefixes = ['私立', '学校法人']
  
  const schoolType = schoolTypes[Math.floor(Math.random() * schoolTypes.length)]
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  
  // 90%の確率で完全な名前を使う（超ニッチに）
  const useFullName = Math.random() > 0.1
  
  if (useFullName) {
    // 完全な名前をそのまま使う（例：「私立セブンイレブン港区芝5丁目店学院」）
    return `${prefix}${placeName}${schoolType}`
  } else {
    // 短縮版（10%の確率）
    const shortName = placeName.length > 3 ? placeName.substring(0, 3) : placeName
    return `${prefix}${shortName}${schoolType}`
  }
}

// アクセス情報を動的に生成
function generateAccessInfo(landmark: string, address: string): string {
  const patterns = [
    // 一般的なパターン
    `【電車】最寄り駅から徒歩15分\n【バス】「${landmark}前」下車、徒歩5分\n【お車】専用駐車場完備（${address}）`,
    `【電車】最寄り駅から徒歩10分、またはスクールバスで5分\n【バス】「${landmark}入口」下車すぐ\n【自転車】駐輪場完備`,
    `【電車】最寄り駅からスクールバスで15分\n【バス】「${landmark}」停留所下車、徒歩3分\n【お車】来校の際は事前にご連絡ください`,
    `【電車】最寄り駅から徒歩20分、またはタクシーで5分\n【バス】「${landmark}方面」行き、「学校前」下車\n【お車】駐車スペース有り（要予約）`,
    // ちょっと特殊なパターン
    `【電車】最寄り駅から徒歩25分（${landmark}を経由）\n【バス】「${landmark}」下車、徒歩8分\n※坂道がありますので、お時間に余裕を持ってお越しください`,
    `【電車】最寄り駅より無料スクールバスを運行（所要時間10分）\n【バス】「${landmark}入口」下車、徒歩5分\n【お車】${address}周辺に駐車場あり`,
  ]
  
  const pattern = patterns[Math.floor(Math.random() * patterns.length)]
  return pattern
}

// 学校の歴史を動的に生成
function generateHistory(established: { year: number, era: string, fullText: string }, schoolName: string, landmark: string, lat: number, lng: number): string[] {
  const history: string[] = []
  const founderName = generateLocalizedName(lat, lng, false).replace(' ', '')
  
  // 創立
  history.push(`${established.fullText} - ${founderName}により、${schoolName.replace('私立', '私立').replace('学校法人', '')}として創立`)
  
  // 大正時代の出来事（創立が明治の場合）
  if (established.year < 1912) {
    const taishoEvent = Math.floor(Math.random() * 4)
    const taishoYear = 1912 + Math.floor(Math.random() * 13)
    const events = [
      `大正${taishoYear - 1911}年（${taishoYear}年）- 校舎を現在地に移転、${landmark}を望む新校舎が完成`,
      `大正${taishoYear - 1911}年（${taishoYear}年）- 地域の要請により女子部を併設`,
      `大正${taishoYear - 1911}年（${taishoYear}年）- 図書館棟を新設、蔵書5千冊でスタート`,
      `大正${taishoYear - 1911}年（${taishoYear}年）- ${landmark}周辺での野外教育プログラムを開始`
    ]
    history.push(events[taishoEvent])
  }
  
  // 昭和戦前の出来事
  const showaPreEvent = Math.floor(Math.random() * 4)
  const showaPreYear = 1926 + Math.floor(Math.random() * 15)
  const preEvents = [
    `昭和${showaPreYear - 1925}年（${showaPreYear}年）- 創立${showaPreYear - established.year}周年記念式典を挙行`,
    `昭和${showaPreYear - 1925}年（${showaPreYear}年）- 武道館を建設、心身の鍛錬を重視`,
    `昭和${showaPreYear - 1925}年（${showaPreYear}年）- 地域との連携教育プログラムを本格始動`,
    `昭和${showaPreYear - 1925}年（${showaPreYear}年）- 校訓の石碑を${landmark}近くに建立`
  ]
  history.push(preEvents[showaPreEvent])
  
  // 戦後の学制改革
  history.push(`昭和23年（1948年）- 学制改革により、現在の校名に改称`)
  
  // 昭和後期の出来事
  const showaLateEvent = Math.floor(Math.random() * 4)
  const showaLateYear = 1960 + Math.floor(Math.random() * 28)
  const lateEvents = [
    `昭和${showaLateYear - 1925}年（${showaLateYear}年）- 新体育館完成、全国大会開催`,
    `昭和${showaLateYear - 1925}年（${showaLateYear}年）- 海外姉妹校提携プログラムを開始`,
    `昭和${showaLateYear - 1925}年（${showaLateYear}年）- 創立${showaLateYear - established.year}周年記念事業として新校舎を建設`,
    `昭和${showaLateYear - 1925}年（${showaLateYear}年）- コンピュータ教育を先駆的に導入`
  ]
  history.push(lateEvents[showaLateEvent])
  
  // 平成の出来事
  const heiseiEvent = Math.floor(Math.random() * 4)
  const heiseiYear = 1989 + Math.floor(Math.random() * 30)
  const heiseiEvents = [
    `平成${heiseiYear - 1988}年（${heiseiYear}年）- 創立100周年記念式典を挙行、記念館を建設`,
    `平成${heiseiYear - 1988}年（${heiseiYear}年）- 全教室にICT設備を整備`,
    `平成${heiseiYear - 1988}年（${heiseiYear}年）- ${landmark}との連携による特色教育が文部科学大臣賞を受賞`,
    `平成${heiseiYear - 1988}年（${heiseiYear}年）- 国際バカロレア認定校として認可`
  ]
  history.push(heiseiEvents[heiseiEvent])
  
  // 令和の出来事
  const reiwaEvent = Math.floor(Math.random() * 4)
  const reiwaYear = 2019 + Math.floor(Math.random() * 7)
  const reiwaEvents = [
    `令和${reiwaYear - 2018}年（${reiwaYear}年）- 最新のSTEAM教育施設を完備`,
    `令和${reiwaYear - 2018}年（${reiwaYear}年）- SDGs教育の推進拠点校に指定`,
    `令和${reiwaYear - 2018}年（${reiwaYear}年）- ${landmark}を活用した探究学習プログラムを本格始動`,
    `令和${reiwaYear - 2018}年（${reiwaYear}年）- 新しい時代に対応した教育カリキュラムを全面刷新`
  ]
  history.push(reiwaEvents[reiwaEvent])
  
  return history
}

function generateMockSchoolData(location: LocationData): SchoolData {
  const address = location.address || '未知の地'
  const landmarks = location.landmarks || ['謎のスポット', '伝説の場所', '神秘の地']
  const landmark = landmarks[0] || '謎のスポット'
  const landmark2 = landmarks[1] || '伝説の場所'
  
  // 詳細情報を取得
  const closestPlace = location.closest_place
  const placeDetails = location.place_details || []
  
  // 超ニッチな学校名を生成（最も近い場所の名前を使う）
  const schoolName = generateSchoolName(landmarks, closestPlace)
  const lat = location.lat || 35
  const lng = location.lng || 139
  
  // 校長は性別を1回決めて名前と顔プロンプトを一致させる
  const principalIsFemale = Math.random() < 0.5
  const principalName = generateLocalizedName(lat, lng, principalIsFemale)
  const motto = generateMotto(landmark)
  const established = generateEstablishedYear()
  const currentYear = 2026
  const yearsExisted = currentYear - established.year
  
  // 創立者名も地域連動
  const founderName = generateLocalizedName(lat, lng, false).replace(' ', '')

  return {
    school_profile: {
      name: schoolName,
      motto: motto,
      motto_single_char: motto.charAt(0), // 校訓の頭文字（一文の場合は先頭1文字）
      sub_catchphrase: `${landmark}と共に歩む学校`,
      overview: `本校は${established.fullText}、${address}の地に創立され、${landmark}に象徴される地域と共に歩んできました。「${motto}」の校訓のもと、知・徳・体の調和のとれた全人教育を実践し、地域に貢献できる人材を輩出しています。生徒の個性を伸ばし、基礎学力と応用力の育成、ICT・国際理解・キャリア教育に努めています。`,
      emblem_prompt: `A traditional Japanese high school emblem featuring a stylized ${landmark} motif crossed with mountain peaks, with kanji characters in gold embroidery on a navy blue shield background, old-fashioned crest design`,
      emblem_url: 'https://placehold.co/200x200/003366/FFD700?text=School+Emblem',
      established: established.fullText,
      historical_buildings: [
        {
          name: '初代校舎',
          year: `${established.era}${established.year - (established.era === '明治' ? 1867 : established.era === '大正' ? 1911 : 1925)}年〜大正12年`,
          description: `${landmark}の麓に建てられた木造平屋建ての校舎。創立者${founderName}先生の理念のもと、地域の子どもたちの教育に尽力いたしました。`,
          image_prompt: 'Old Japanese school building, wooden structure, Meiji era architecture, sepia tone, historical photo, nostalgic, grainy',
          image_url: 'https://placehold.co/400x300/8B7355/FFFFFF?text=First+Building'
        },
        {
          name: '二代目校舎',
          year: '大正13年〜昭和20年',
          description: `鉄筋コンクリートの校舎として建て替え。${landmark}を望む高台に立地し、採光と風通しを重視した設計です。`,
          image_prompt: 'Japanese school building, Taisho to early Showa era, concrete structure, retro architecture',
          image_url: 'https://placehold.co/400x300/6B7280/FFFFFF?text=Second+Building'
        },
        {
          name: '現校舎',
          year: '昭和〜現在',
          description: `耐震改修を経て、現在も地域の教育の拠点として利用されています。${landmark}と調和した外観が特徴です。`,
          image_prompt: 'Modern Japanese high school building, clean design, contemporary',
          image_url: 'https://placehold.co/400x300/4B5563/FFFFFF?text=Current+Building'
        }
      ]
    },
    principal_message: {
      name: principalName,
      title: '校長',
      text: `本校ホームページをご覧いただき、誠にありがとうございます。校長の${principalName}でございます。\n\n${schoolName}は、${established.era}${established.year - (established.era === '明治' ? 1867 : established.era === '大正' ? 1911 : 1925)}年の創立以来、実に${yearsExisted}年という長い歴史の中で、${address}の地において、常に地域社会と密接に連携しながら、質の高い教育を実践してまいりました。本校が一貫して掲げております「${motto}」の校訓のもと、知性・徳性・体力の三位一体となった調和のとれた全人教育を通じて、社会に貢献できる有為な人材の育成に、教職員一同、日夜努めております。\n\n本校の最大の特色といたしましては、${landmark}に象徴される、この地域ならではの豊かな自然環境と歴史的・文化的資源を最大限に活用した、他校には見られない特色ある教育活動を展開している点が挙げられます。生徒たちは、地域の方々との温かな交流を通じて、郷土への深い理解と愛着を育み、同時に社会性と豊かな人間性を身につけてまいります。\n\n変化の激しい時代において、本校では、生徒一人ひとりが自らの個性と可能性を最大限に発揮し、主体的に学び続ける姿勢を育むことを大切にしております。保護者の皆様、地域の皆様におかれましては、今後とも本校の教育活動に対しまして、変わらぬご理解とご支援を賜りますよう、心よりお願い申し上げます。`,
      face_prompt: principalIsFemale
        ? "Bust-up portrait (head and shoulders only), principal's office, modern Japanese female principal, 55 years old, business suit, serious expression, disposable camera aesthetic, slightly faded colors"
        : "Bust-up portrait (head and shoulders only), principal's office, modern Japanese male principal, 60 years old, business suit, serious expression, disposable camera aesthetic, slightly faded colors",
      face_image_url: 'https://placehold.co/600x600/333333/FFFFFF?text=Principal'
    },
    // 校歌は歌詞のみ（音声は後回し）。歌詞は必ず入れる
    school_anthem: {
      title: `${schoolName}校歌`,
      lyrics: `一\n${landmark}の麓に 朝日が昇り\n我等が学び舎 希望の門\n${motto}の心を 胸に抱き\n今日も励まん 仲間と共に\n\n二\n${landmarks[1] || landmark}の風に 歴史を聞き\n伝統を受け 明日を築く\n誠実勤勉 誇りを持ち\n永遠に咲かせん この母校の花\n\n三\n緑の丘に 鐘が鳴り\n夢を結ぶ この学び舎\n未来へ羽ばたく 若人の\n誇りと希望 ここにあり`,
      style: '荘厳な合唱曲風',
      suno_prompt: ''
    },
    news_feed: generateNews(landmark, established),
    crazy_rules: generateRules(landmark),
    multimedia_content: {
      club_activities: (() => { const all = generateClubActivities(landmark); return [all[Math.floor(Math.random() * all.length)]] })(),
      school_events: generateSchoolEvents(landmark, established).slice(0, 1),
      facilities: generateFacilities(landmark),
      monuments: [
        {
          name: `創立者・${founderName}先生之像`,
          description: `本校の創立者である${founderName}先生の銅像でございます。先生の「${landmark}の精神を受け継ぎ、未来を切り拓く人材を育てる」という教育理念は、今なお本校の精神として受け継がれております。${established.era}時代から続く本校の伝統の象徴でございます。`,
          image_prompt: 'Bronze statue of Japanese school founder, traditional Japanese clothing, standing pose, Japanese school campus with cherry trees, Japanese style gate or building in background, imposing presence, disposable camera',
          image_url: 'https://placehold.co/400x600/CD7F32/FFFFFF?text=Founder+Statue'
        }
        // 校訓石碑は生成しない
      ],
      uniforms: [
        {
          type: '制服（冬服）',
          description: [
            `本校の冬服は、地域の伝統的な織物を使用した重厚な作りとなっております。ブレザーには${landmark}をモチーフとした刺繍が施され、ボタンには地域の特産品をかたどったデザインが採用されております。`,
            `紺色を基調とした本校の制服は、${landmark}の荘厳な雰囲気を表現したデザインとなっております。胸元には校章が金糸で刺繍され、格調高い印象を与えます。`,
            `${landmark}の色彩をモチーフにした本校の制服は、地域の伝統と現代的なデザインが融合した独特のスタイルです。創立以来変わらぬこの制服は、卒業生の誇りとなっております。`
          ][Math.floor(Math.random() * 3)],
          image_prompt: 'Full body shot, Japanese high school winter uniform, male and female students standing side by side on plain WHITE background, formal pose from head to shoes, location-themed design, disposable camera',
          image_url: 'https://placehold.co/450x700/000080/FFFFFF?text=Winter+Uniform'
        },
        // 体操着は生成しない（冬服のみ）
      ]
    },
    history: generateHistory(established, schoolName, landmark, lat, lng),
    notable_alumni: generateAlumni(lat, lng, landmark),
    teachers: generateTeachers(lat, lng, landmark),
    access: generateAccessInfo(landmark, address),
    style_config: generateRandomStyleConfig()
  }
}

export async function POST(request: NextRequest) {
  let locationData: LocationData
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: '学校の生成に失敗しました', detail: 'リクエストデータがありません。' },
        { status: 400 }
      )
    }
    locationData = body as LocationData
    const lat = locationData.lat
    const lng = locationData.lng
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json(
        { error: '学校の生成に失敗しました', detail: '位置情報（緯度・経度）が不正です。もう一度ピンを置いてください。' },
        { status: 400 }
      )
    }
    locationData.lat = lat
    locationData.lng = lng
    locationData.address = locationData.address ?? `緯度${lat.toFixed(4)}, 経度${lng.toFixed(4)}`
    locationData.landmarks = locationData.landmarks?.length ? locationData.landmarks : ['この地域']
  } catch (parseErr) {
    console.error('リクエスト解析エラー:', parseErr)
    return NextResponse.json(
      { error: '学校の生成に失敗しました', detail: 'リクエストの形式が不正です。もう一度ピンを置いてください。' },
      { status: 400 }
    )
  }

  try {
    const useAnthropic = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== '')
    const useComet = !!(process.env.COMET_API_KEY && process.env.COMET_API_KEY !== '')
    if (!useAnthropic && !useComet) {
      return NextResponse.json(generateMockSchoolData(locationData))
    }

    const locationContext = buildLocationContext(locationData)

    const systemPrompt = `
JSONで出力。先頭は{。校訓=あるある一文。校長=でございます調。部活・行事各1。京奈良禁止。

{"school_profile":{"name":"ランドマーク含む学校名","motto":"あるある一文","motto_single_char":"1文字","sub_catchphrase":"一文","background_symbol":"1文字","overview":"固有名詞・130-160字・大喜利1つ","overview_image_prompt":"英語Wide校舎","emblem_prompt":"英語校章","historical_buildings":[{"name":"初代校舎","year":"明治〜大正","description":"65-80字","image_prompt":"英語Old sepia"},{"name":"2代目","year":"大正〜昭和","description":"65字","image_prompt":"英語Taisho"},{"name":"現校舎","year":"昭和〜現在","description":"52-65字","image_prompt":"英語Modern"}]},"principal_message":{"name":"校長名","title":"校長","text":"325-420字・固有名詞・大喜利1つ","face_prompt":"英語principal"},"school_anthem":{"title":"校歌名","lyrics":"必ず3番まで七五調・改行\\n。合唱・校歌らしく、演歌にしない","style":"荘厳な合唱曲風","suno_prompt":"English anthem"},"news_feed":[{"date":"2026.02.15","category":"行事","text":"32-45字"},{"date":"2026.02.10","category":"進路","text":"32-45字"},{"date":"2026.02.05","category":"部活","text":"32-45字"},{"date":"2026.01.28","category":"連絡","text":"32-45字"},{"date":"2026.01.20","category":"行事","text":"32-45字"}],"crazy_rules":["心得1","心得2","心得3","心得4","心得5"],"multimedia_content":{"club_activities":[{"name":"部活名","description":"52-78字","sound_prompt":"英語","image_prompt":"英語Wide"}],"school_events":[{"name":"行事名","date":"4月7日等","description":"40-65字","image_prompt":"英語"}],"facilities":[{"name":"施設名","description":"78-120字","image_prompt":"英語"},{"name":"施設名","description":"195-235字","image_prompt":"英語"},{"name":"施設名","description":"195-235字","image_prompt":"英語"}],"monuments":[{"name":"創立者像","description":"78-105字","image_prompt":"英語"}],"uniforms":[{"type":"制服（冬服）","description":"78-120字","image_prompt":"英語"}]},"teachers":[{"name":"名","subject":"教頭等","description":"90-130字"},{"name":"名","subject":"養護教諭等","description":"90-130字"},{"name":"名","subject":"生徒指導部主任等","description":"90-130字"}],"notable_alumni":[{"name":"卒業生名","year":"卒業年","achievement":"45-65字"},{"name":"卒業生名","year":"卒業年","achievement":"45-65字"},{"name":"卒業生名","year":"卒業年","achievement":"45-65字"}]}
`

    const userPrompt = `
先頭{。${locationContext}
固有名詞多数。大喜利1つ。校長325-420・overview130-160・教員90-130・卒業生45-65字。
`

    // 時間切れ：245秒で打ち切り（Inngest 300s 内に Step2+Step3 を収めるため）。※通常の打ち切りは「出力トークン上限（max_tokens）」で起きる
    const AI_TIMEOUT_MS = 245_000
    const timeoutSec = Math.round(AI_TIMEOUT_MS / 1000)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`生成が時間内に完了しませんでした（${timeoutSec}秒）。テンプレートデータで表示します。`)), AI_TIMEOUT_MS)
    )

    let responseText: string
    if (useComet) {
      const cometResult = await Promise.race([
        callCometChat(systemPrompt, userPrompt),
        timeoutPromise,
      ])
      responseText = cometResult.content
    } else if (useAnthropic) {
      const message = await Promise.race([
        anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 12288,
          temperature: 0.9,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        timeoutPromise,
      ])
      responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    } else {
      throw new Error('No text API key')
    }

    let schoolData: SchoolData
    try {
      // 前置きや説明文があっても、先頭の { から末尾の } までだけ取り出してJSONとして解析
      let jsonText = responseText.trim()
      const jsonBlock = responseText.match(/\{[\s\S]*\}/)
      if (jsonBlock) {
        const raw = jsonBlock[0]
        let depth = 0
        let start = -1
        let end = -1
        for (let i = 0; i < raw.length; i++) {
          if (raw[i] === '{') { if (depth === 0) start = i; depth++ }
          else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break } }
        }
        if (start >= 0 && end > start) jsonText = raw.slice(start, end + 1)
        else jsonText = raw
      }
      schoolData = repairAndParseSchoolJson(jsonText)
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr)
      console.error('Claude応答のJSON解析に失敗（モックで返却）:', msg)
      const mock = generateMockSchoolData(locationData)
      return NextResponse.json({
        ...mock,
        fallbackUsed: true,
        errorMessage: `AIの応答の解析に失敗しました。${msg}`
      })
    }

    // background_symbolをstyle_configに反映
    if (schoolData.school_profile && (schoolData.school_profile as any).background_symbol) {
      const backgroundSymbol = (schoolData.school_profile as any).background_symbol
      if (schoolData.style_config && schoolData.style_config.backgroundPattern) {
        schoolData.style_config.backgroundPattern.symbol = backgroundSymbol
      }
    }

    // 校歌の歌詞は必ず入れる（空の場合はフォールバック）
    if (!schoolData.school_anthem) schoolData.school_anthem = { title: '', lyrics: '', style: '荘厳な合唱曲風' }
    if (!schoolData.school_anthem.lyrics?.trim()) {
      const name = schoolData.school_profile?.name || '本校'
      const motto = schoolData.school_profile?.motto || 'トイレを笑顔で貸す'
      const landmark = locationData.landmarks?.[0] || 'この地'
      schoolData.school_anthem.title = schoolData.school_anthem.title || `${name}校歌`
      schoolData.school_anthem.lyrics = `一\n${landmark}の麓に 朝日が昇り\n我等が学び舎 希望の門\n${motto}の心を 胸に抱き\n今日も励まん 仲間と共に\n\n二\n風に歴史を聞き 伝統を受け\n明日を築く 誠実勤勉\n誇りを持ち 永遠に咲かせん\nこの母校の花\n\n三\n緑の丘に 鐘が鳴り\n夢を結ぶ この学び舎\n未来へ羽ばたく 若人の\n誇りと希望 ここにあり`
    }

    // 画像・ロゴは「後回し」：60秒以内にテキストだけ返し、画像はクライアントから別APIで取得
    const profile = schoolData.school_profile as unknown as Record<string, unknown>
    const schoolName = schoolData.school_profile.name
    schoolData.school_profile.logo_url = `https://placehold.co/1200x300/003366/FFD700?text=${encodeURIComponent(schoolName)}`
    if (profile.overview_image_prompt) {
      profile.overview_image_url = 'https://placehold.co/800x450/8B7355/FFFFFF?text=学校概要'
    }

    // 校歌の音声は後回し（歌詞のみ。楽曲は別APIで対応する場合は /api/generate-anthem-audio を呼ぶ想定）
    // schoolData.school_anthem.audio_url は未設定のまま → サイトでは歌詞のみ表示

    // 校長の名前と顔画像の性別を一致させる（LLMが食い違えた場合の補正）
    if (schoolData.principal_message?.name && schoolData.principal_message?.face_prompt) {
      const gender = inferPrincipalGender(schoolData.principal_message.name)
      if (gender) {
        schoolData.principal_message.face_prompt = ensureFacePromptGender(schoolData.principal_message.face_prompt, gender)
      }
    }

    // 校長以外の教員の写真は使わない（APIが返しても除去）
    if (Array.isArray(schoolData.teachers)) {
      schoolData.teachers = schoolData.teachers.map((t: { name?: string; subject?: string; description?: string }) => ({
        name: t.name ?? '',
        subject: t.subject ?? '',
        description: t.description ?? ''
      }))
    }

    // 画像は7枚のみ：部活動・年間行事は各1つに統一。年間行事のキャプションは半分程度に
    if (schoolData.multimedia_content?.school_events && schoolData.multimedia_content.school_events.length > 0) {
      const first = schoolData.multimedia_content.school_events[0]
      const desc = typeof first?.description === 'string' ? first.description : ''
      const halfDesc = desc.length > 80 ? desc.slice(0, Math.ceil(desc.length / 2)) + '…' : desc
      schoolData.multimedia_content.school_events = [{ ...first, description: halfDesc }]
    }
    if (schoolData.multimedia_content?.club_activities && schoolData.multimedia_content.club_activities.length > 1) {
      schoolData.multimedia_content.club_activities = schoolData.multimedia_content.club_activities.slice(0, 1)
    }

    // 施設紹介は写真なし（テキストのみ）。image_url を外してプレースホルダーも表示しない
    if (Array.isArray(schoolData.multimedia_content?.facilities)) {
      schoolData.multimedia_content.facilities = schoolData.multimedia_content.facilities.map((f: { name?: string; description?: string }) => ({
        name: f.name ?? '',
        description: f.description ?? ''
      }))
    }

    return NextResponse.json(schoolData)

  } catch (error) {
    const errMessage = formatApiErrorMessage(error)
    const isTimeout = /時間内に完了しませんでした|テンプレートデータで表示します/i.test(errMessage)
    if (isTimeout) {
      console.error('学校生成タイムアウト（エラー返却）:', errMessage)
      return NextResponse.json(
        { error: 'テキスト生成が時間内に完了しませんでした。しばらく経ってから再度お試しください。', detail: errMessage },
        { status: 503 }
      )
    }
    console.error('学校生成エラー（モックで返却）:', errMessage, error)
    const mock = generateMockSchoolData(locationData)
    return NextResponse.json({
      ...mock,
      fallbackUsed: true,
      errorMessage: errMessage
    })
  }
}

/** APIエラー内容をユーザーに分かりやすい文言に変換（生JSONは出さない） */
function formatApiErrorMessage(error: unknown): string {
  let msg = error instanceof Error ? error.message : String(error)

  // "400 {\"type\":\"error\", ...}" 形式ならJSONをパースしてメッセージだけ抽出
  const jsonMatch = msg.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]) as { error?: { message?: string }; message?: string }
      const inner = obj?.error?.message ?? obj?.message
      if (typeof inner === 'string') msg = inner
    } catch {
      // パース失敗時はそのまま
    }
  }

  const lower = msg.toLowerCase()
  if (lower.includes('no available channel') || lower.includes('distributor')) {
    return 'CometAPI: 指定したモデル（Claude）のチャネルが利用できません。対処: (1) .env.local の COMET_CHAT_MODEL を削除またはコメントアウトすると、Haiku→Sonnet の順で自動試行します。(2) 利用する場合は Comet の料金ページで利用可能なモデルIDを確認し、COMET_CHAT_MODEL=利用可能なモデルID を設定してください。'
  }
  if (lower.includes('credit') && (lower.includes('too low') || lower.includes('balance'))) {
    return 'Anthropic API: クレジット残高が不足しています。Plans & Billing でクレジットを購入してください。'
  }
  if (msg.includes('429') || lower.includes('overloaded')) {
    return 'Anthropic API: リクエスト制限またはクレジット不足の可能性があります。'
  }
  if (msg.includes('401') || lower.includes('invalid_api_key')) {
    return 'Anthropic API: APIキーが無効または未設定です。'
  }
  if (msg.includes('500') || lower.includes('internal')) {
    return `Anthropic API サーバーエラー: ${msg.slice(0, 100)}`
  }
  return msg.length > 200 ? `${msg.slice(0, 200)}…` : msg
}

function buildLocationContext(location: LocationData): string {
  // 🔥🔥🔥 徹底的なリサーチ結果があればそれを最優先で使用 🔥🔥🔥
  if (location.comprehensive_research) {
    // テキスト生成の完了・JSON途切れ防止のため控えめに（30%増は廃止）
    const RESEARCH_MAX = 220
    const PROPER_NOUNS_MAX = 10
    const researchText = location.comprehensive_research.length > RESEARCH_MAX
      ? location.comprehensive_research.slice(0, RESEARCH_MAX) + '…'
      : location.comprehensive_research
    console.log(`📚 地域リサーチ: ${researchText.length}字（${RESEARCH_MAX}字制限）`)
    
    const properNounsMatch = researchText.match(/\d+\.\s*(.+)/g)
    const properNouns = (properNounsMatch ? properNounsMatch.map(m => m.replace(/^\d+\.\s*/, '').trim()) : []).slice(0, PROPER_NOUNS_MAX)
    
    let context = `
固有名詞（${properNouns.length}個）を校長・行事・部活・教員に使う。大喜利1つ。

${properNouns.map((name, i) => `${i + 1}. ${name}`).join('\n')}

---

${researchText}
`
    
    return context
  }
  
  // フォールバック（リサーチ結果がない場合）
  console.log('⚠️ 徹底リサーチ結果がありません。基本情報のみ使用します。')
  
  let context = `
## 📍 位置情報
- 緯度: ${location.lat}
- 経度: ${location.lng}
- 住所: ${location.address || '不明'}
`

  if (location.closest_place) {
    const cp = location.closest_place
    context += `
## 最も近い場所（学校名に使用）
名前: ${cp.name}
カテゴリ: ${cp.types?.join(', ') || '不明'}
「${cp.name}」を学校名に。特徴をコンセプトに反映。
`
  }

  if (location.place_details && location.place_details.length > 0) {
    context += `\n## 周辺（固有名詞に使う）\n\n`
    location.place_details.slice(0, 3).forEach((place, i) => {
      context += `${i + 1}. ${place.name}（${place.types?.join(', ') || '不明'}）\n`
    })
  }

  if (location.landmarks && location.landmarks.length > 0) {
    context += `\n## ランドマーク\n\n`
    location.landmarks.slice(0, 7).forEach((landmark, i) => {
      context += `${i + 1}. ${landmark}\n`
    })
  }

  if (location.region_info) {
    if (location.region_info.specialties?.length) context += `特産: ${location.region_info.specialties.join(', ')}\n`
    if (location.region_info.history?.length) context += `歴史: ${location.region_info.history.join(', ')}\n`
  }

  context += `\n指示: 上記固有名詞を校長・部活・行事・教員に使う。汎用表現は避ける。\n`
  return context
}
