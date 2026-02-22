import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { LocationData, SchoolData, StyleConfig } from '@/types/school'

// Vercel: Hobby は最大60秒・Pro は最大300秒。Pro なら 300 で有効。Hobby では 60 が上限。
export const maxDuration = 300

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

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

const DEFAULT_COMET_IMAGE_MODEL = 'gemini-2.0-flash-exp-image-generation'

/** CometAPI 経由で画像生成（Gemini Image）→ data URL を返す。失敗時はプレースホルダーURL */
async function generateImageViaComet(
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '3:2' | '2:3' | '4:3' | '9:16' = '16:9'
): Promise<string> {
  const key = process.env.COMET_API_KEY
  if (!key) return `https://placehold.co/800x450/CCCCCC/666666?text=Image`
  const model = process.env.COMET_IMAGE_MODEL || DEFAULT_COMET_IMAGE_MODEL
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

/** CometAPI（500+モデル・1API・最大20%オフ）経由でClaudeテキスト生成 */
async function callCometChat(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.COMET_API_KEY
  if (!key) throw new Error('COMET_API_KEY not set')
  // Comet のモデルIDは環境・チャネルで異なることがある。複数試す
  const modelIds = (
    process.env.COMET_CHAT_MODEL
      ? [process.env.COMET_CHAT_MODEL]
      : [
          'anthropic/claude-3-5-sonnet',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet',
        ]
  )
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
          max_tokens: 8192,
          temperature: 1.0,
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        lastErr = `${model}: ${res.status} ${errText.slice(0, 200)}`
        continue
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      const content = data?.choices?.[0]?.message?.content
      if (typeof content === 'string') return content
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
  
  const principalName = generateLocalizedName(lat, lng, false)
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
      overview: `本校は${established.fullText}、${address}の地に創立され、${landmark}に象徴される地域と共に${yearsExisted}年の歴史を歩んでまいりました。「${motto}」の校訓のもと、知・徳・体の調和のとれた全人教育を実践し、地域社会に貢献できる人材を輩出しております。生徒一人ひとりの個性を伸ばし、基礎学力の定着と応用力の育成に努め、ICT・国際理解・キャリア教育にも取り組んでおります。教職員一同、生徒の健やかな成長を第一に日々の教育に誠心誠意取り組んでおります。`,
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
        }
      ]
    },
    principal_message: {
      name: principalName,
      title: '校長',
      text: `本校ホームページをご覧いただき、誠にありがとうございます。校長の${principalName}でございます。\n\n${schoolName}は、${established.era}${established.year - (established.era === '明治' ? 1867 : established.era === '大正' ? 1911 : 1925)}年の創立以来、実に${yearsExisted}年という長い歴史の中で、${address}の地において、常に地域社会と密接に連携しながら、質の高い教育を実践してまいりました。本校が一貫して掲げております「${motto}」の校訓のもと、知性・徳性・体力の三位一体となった調和のとれた全人教育を通じて、社会に貢献できる有為な人材の育成に、教職員一同、日夜努めております。\n\n本校の最大の特色といたしましては、${landmark}に象徴される、この地域ならではの豊かな自然環境と歴史的・文化的資源を最大限に活用した、他校には見られない特色ある教育活動を展開している点が挙げられます。生徒たちは、地域の方々との温かな交流を通じて、郷土への深い理解と愛着を育み、同時に社会性と豊かな人間性を身につけてまいります。\n\n変化の激しい時代において、本校では、生徒一人ひとりが自らの個性と可能性を最大限に発揮し、主体的に学び続ける姿勢を育むことを大切にしております。保護者の皆様、地域の皆様におかれましては、今後とも本校の教育活動に対しまして、変わらぬご理解とご支援を賜りますよう、心よりお願い申し上げます。`,
      face_prompt: 'Bust-up portrait (head and shoulders only), principal\'s office, modern Japanese male principal, 60 years old, business suit, serious expression, disposable camera aesthetic, slightly faded colors',
      face_image_url: 'https://placehold.co/600x600/333333/FFFFFF?text=Principal'
    },
    // 校歌は歌詞のみ（音声は後回し）。歌詞は必ず入れる
    school_anthem: {
      title: `${schoolName}校歌`,
      lyrics: `一\n${landmark}の麓に 朝日が昇り\n我等が学び舎 希望の門\n${motto}の心を 胸に抱き\n今日も励まん 仲間と共に\n\n二\n${landmarks[1] || landmark}の風に 歴史を聞き\n伝統を受け 明日を築く\n誠実勤勉 誇りを持ち\n永遠に咲かせん この母校の花`,
      style: '荘厳な合唱曲風',
      suno_prompt: ''
    },
    news_feed: generateNews(landmark, established),
    crazy_rules: generateRules(landmark),
    multimedia_content: {
      club_activities: generateClubActivities(landmark).slice(0, 1),
      school_events: generateSchoolEvents(landmark, established).slice(0, 1),
      facilities: generateFacilities(landmark),
      monuments: [
        {
          name: `創立者・${founderName}先生之像`,
          description: `本校の創立者である${founderName}先生の銅像でございます。先生の「${landmark}の精神を受け継ぎ、未来を切り拓く人材を育てる」という教育理念は、今なお本校の精神として受け継がれております。${established.era}時代から続く本校の伝統の象徴でございます。`,
          image_prompt: 'Bronze statue of stern school founder, traditional clothing, standing pose, outdoor school grounds, imposing presence, disposable camera',
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
あなたは地域情報を徹底的にリサーチし、**地元民が「わかるわかる！」と共感する超ニッチな地域密着型の架空学校**を生成する専門家です。

## 📚 日本の学校サイト制作マニュアル（社会言語学的分析に基づく）

### 🎯 文体の本質：権威と温かみの両立
日本の学校サイトは「伝統的な格式」と「現代的な共感性」を統合した特殊な言語空間です。

#### 校長メッセージの文体構造：
1. **冒頭の挨拶**（必須）：**特定の季節に言及しない、一年中通用する挨拶**
   - ⚠️ 「2月」「立春」「桜」など季節特定の言葉は使わない（サイトは一年中同じテキスト）
   - 良い例：「日頃より本校の教育活動にご理解とご協力を賜り、厚く御礼申し上げます」
   - 良い例：「本校ホームページをご覧いただき、誠にありがとうございます」
   - 良い例：「皆様にはますますご清祥のこととお慶び申し上げます」
2. **具体的な学年別活動への言及**：1年生〜6年生の発達段階に応じた承認と賞賛
3. **地域との連帯感**：ローカルな歴史とグローバルな課題（SDGs等）の結びつけ
4. **温かい語りかけ調**：「〜でございます」「〜してまいりました」「〜させていただいております」の多用

#### 校訓の本質：その場所に沿った「悩み・あるある」を一文で
**❌ 単語の羅列は禁止**（四字熟語「切磋琢磨・温故知新」や「〇・〇・〇」型は使わない）。

**✅ 校訓は「その場所ならではの行動・心がけ」を一文で表現する**：
- **コンビニが多い地域** → 「トイレを笑顔で貸す」「買わなくても挨拶は忘れずに」
- **坂が多い地域** → 「登りは我慢、下りは慎重に」「転んだら起きるまでが登坂」
- **神社・寺が多い地域** → 「手を合わせたら必ずお賽銭」「参道の中央は神様の通り道」
- **カフェ・飲食店が多い地域** → 「席を取ったら一品は注文する」「長居したら追加で注文」
- **商店街・並ぶ場所** → 「並んだら文句を言わない」「借りた傘は必ず返す」
- **公園・自然** → 「ゴミはその場に残さない」「花は見るだけ、折らない」

**校訓の原則**：
- 地域の「あるある」や「地元の悩み」から逆算して、具体的な一文にする
- 生徒が日常で実践できる行動・心がけであること
- 格言っぽくても、その場所でしか通じない味があること

#### 忌み言葉の厳格な回避：
慶事の手紙では以下の言葉を**絶対に使用しないこと**：
「切れる」「終わる」「死」「苦」「失う」「枯れる」「倒れる」「衰える」「滅びる」

## 🎯 最重要ミッション：地域の徹底リサーチ

### ステップ1：地域分析（最優先）
提供されたランドマーク情報から、以下を徹底的に分析してください：

1. **地形・地理的特徴**
   - 坂が多い、平地、海沿い、山間部、川沿い、など
   - その地形が学校生活にどう影響するか（登下校、部活動、行事）

2. **歴史・文化的背景**
   - その地域の歴史的出来事（戦争、災害、発展の歴史）
   - 地域の伝統行事、祭り、風習
   - 歴史的建造物や史跡

3. **産業・特産品**
   - 地域の主要産業（農業、漁業、工業、観光業）
   - 特産品、名物料理
   - 地場産業との連携

4. **交通・アクセス**
   - 主要駅、バス路線、特徴的な路線名
   - 通学路の特徴（長い坂道、橋、トンネル）
   - 地元民なら知っている交通の不便さや特徴

5. **気候・自然環境**
   - 気温、降水量、風の強さ
   - 四季の変化の特徴
   - 自然災害のリスク

### ステップ2：校訓の設計（格調高い文体で、その地点に応じたしょうもないニッチな話）

**法則（実在の校訓スタイルを参考）**：
- **文体は格調高く**、実在の学校の校訓のように品格のある表現にする。
- **形式**は次のいずれか（または組み合わせ）でよい：
  - **メッセージ・スローガン型**：短い imperative／宣言。「恥を知れ」「やればできる」「めざすなら高い嶺」「世界人たる前に 良き日本人たれ」「恐れず 侮らず 気負わず」
  - **三要素・リズム型**：3つを・で並べる。「清く 正しく 美しく」「誠実・勤勉・友愛」「魂を育てる・知性を磨く・実行力を養う」「勤勉・温雅・聡明であれ」
  - **四字熟語・漢字構成型**：漢語・四字熟語を活かす。「質実剛健・進取の気性」「堅忍不抜・自主自律」「自律・克己・友愛」
  - **やや長めの理念型**：「学問の独立、学問の活用、模範国民の造就」「自由と進歩」「真実を求め、真実に生き、真実を顕かにする」
- **中身は必ず「その場所に沿った悩み・あるある」**を、上記の格調で表現する。単なる単語の羅列ではなく、地域の実情に根ざした一文（または三要素など）にすること。

**考案の手順**：

1. **周辺の「あるある・悩み」を想像し、格調高い形にのせる**
   - コンビニが多い → 「トイレを笑顔で貸す」「買わなくても挨拶は忘れずに」
   - 坂が多い → 「登りは我慢、下りは慎重に」「最も困難な道に挑戦せよ」（坂を「困難な道」に）
   - 神社・寺が多い → 「手を合わせたら必ずお賽銭」「敬虔と感謝」
   - カフェ・飲食店が多い → 「席を取ったら一品は注文する」「寛容・交流・品位」
   - 商店街・行列 → 「並んだら文句を言わない」「秩序・忍耐・友愛」

2. **その一文から「一文字」を選ぶ**（motto_single_char）
   - 校訓のキーワードを表す漢字1文字。例：「笑」「慎」「貸」「並」「席」「手」など

### ステップ3：校歌の作詞（最も丁寧に、伝統的な七五調で）
**校歌は最重要コンテンツ**です。以下の伝統的な形式を厳格に守ってください：

**リズム：七五調（7文字・5文字）または八六調（8文字・6文字）**
例：「朝日輝く（7） この地に（5）」「〇〇駅（7） 仰ぎて（4）」

**構成：3番構成、各番4-6行**

**1番（地域の景観・自然描写）**
- 具体的なランドマーク名を2つ以上（駅名、道路名、店名、川名、山名など）
- 地域の自然環境（山、川、海、空、緑、風、光）
- 時間帯の描写（朝日、夕日、星空など）
- 季節感（桜、新緑、紅葉、雪など）

例：
    朝日輝く 〇〇に
    [ランドマーク名] 仰ぎて 学び舎あり
    〇〇の風 薫る中
    若き我らの 歌声響く

**2番（歴史と伝統、校訓の織り込み）**
- 地域の歴史的背景（創立年代、地域の発展）
- 創立の理念（創立者の志）
- 校訓の言葉を自然に織り込む（地域に沿った一文の校訓）
- 学校の誇り

例：
    [年号]の 昔より
    この地に根ざし 学びの灯
    [校訓の心] 胸に秘め
    真理の道を 進みゆく

**3番（未来への誓い、母校への愛）**
- 生徒たちの決意（「拓く」「進む」「輝く」などの動詞）
- 地域への貢献（「この地を」「世界へ」など）
- 母校への永遠の愛（「ああ 〇〇学校」など）
- 結びの力強い言葉

例：
    [地域の言葉] の 空の下
    友と励まし 学ぶ日々
    未来を拓く 若き力
    ああ [学校名] 栄えあれ

**重要**：
- 具体的な固有名詞を最低5つ以上含めること
- 「〜あり」「〜ゆく」「〜あれ」などの古典的な語尾を使用
- 各行の文字数を7文字または5文字に揃える
- 「我ら」「若き」「ああ」などの伝統的な表現を使う

### ステップ4：校章デザイン（日本の伝統と地域の融合）

**校章は学校の精神を視覚的に凝縮したシンボルです。以下の原則に従って設計してください：**

#### 1. 伝統的象徴の選択（三種の神器から1つ）
- **鏡（八咫鏡）**：知恵・自己省察・清らかさ（例：名古屋女学校）
- **剣**：勇気・決断力・正義
- **勾玉**：思いやり・慈しみ・調和

#### 2. 地域特有のモチーフ（必須）
- **自然物**：山、川、海、桜、松、梅、竹、鶴、葦など
- **ランドマーク**：神社、寺、橋、駅、商店街など
- **産業**：商業（商船、ヘルメスの杖）、工業（歯車）、農業（稲穂）など

#### 3. 幾何学的構成の意味
- **円形**：調和・永遠・心のバランス
- **三角形**：安定した基盤・天への上昇・創造の意欲（例：千葉県立小金高等学校）
- **盾型**：たくましい精神力・根気強さ・協力と和

#### 4. 色彩の象徴性
- **紺（navy blue）+ 金（gold）**：最も伝統的な配色
- **地域の色**：海沿いなら青、山間部なら緑、商業地なら赤、歴史地区なら茶色

#### 5. 文字要素
- 校名の頭文字（漢字またはローマ字イニシャル）
- 創立年（「明治○○年」「1905」など）

**例**：神奈川県立上鶴間高等学校は「鶴が大空に舞い上がる姿」、関西大学は「淀川の葦」

### ステップ5：制服デザイン（地域文化から設計）
制服は地域の以下を反映してください：

1. **色彩**: 校章と同じキーカラーを主色に。**青・紺に限定しない。** 黄、赤、朱、緑、オレンジ、茶、ベージュなど、地域の特産・自然・建造物に合わせて多様に（例：神社→朱・白、コンビニ→緑・オレンジ、坂道→茶・ベージュ）。
2. **デザイン**: 地域の伝統工芸、織物、文化
3. **素材**: 地域の気候に適した素材
4. **装飾**: ランドマークをモチーフにした校章・刺繍
5. **年間行事・部活の画像**: 生徒の制服は必ずこのキーカラー（黄・赤・朱なども可）で描き、行事・部活の画像プロンプトにも「制服は校章キーカラー（具体的な色名）」を明記すること。

### ステップ6：学校生活（制服から派生）
制服のコンセプトを元に、以下を設計：

1. **部活動**: 地形や産業を活かした部活（例：坂道→陸上部が強豪）
2. **行事**: 地域の祭りや歴史と連動
3. **施設**: 地域の特性を反映した特殊施設

### ステップ6：超ニッチ情報の詰め込み（最重要！）
**⚠️ 地元民しか知らない固有名詞を最大限盛り込むこと**：

- 通学路の名物の坂や橋の名前
- 地元の商店街や老舗店の名前
- バスの路線番号や駅の番線
- 地域特有の方言や言い回し
- 地元の有名人や伝説
- 季節ごとの地域イベント
- 地形による学校行事への影響（例：坂道マラソン、海辺での遠足）

### ステップ7：行事・イベントは地域の固有名詞で完全に作り込む
**⚠️ テンプレート厳禁！実在する場所の固有名詞を使うこと**

- 入学式 → 「〇〇駅から徒歩で登校」「〇〇公園の桜を見ながら」
- 遠足 → 「〇〇神社」「〇〇スーパーで昼食購入」
- 体育祭 → 「〇〇商店街の方々が応援」
- 文化祭 → 「〇〇カフェと連携した模擬店」
- 修学旅行 → **学校の業種に応じた目的地**
  - コンビニ系 → 「物流センター見学」
  - 神社系 → 「伝統工芸体験」
  - 飲食店系 → 「料理学校見学」

### ステップ8：修学旅行先を学校の特性に完全連動
**⚠️ 一般的な「京都・奈良」は禁止！学校の業種から推察すること**

例：
- **セブンイレブン〇〇店学院** → 埼玉県の物流センター見学、工場見学
- **〇〇神社学園** → 京都の伝統工芸工房、神社建築の見学
- **〇〇公園小学校** → 国立公園、環境教育施設
- **〇〇ラーメン店学院** → 横浜ラーメン博物館、食品工場

## 📝 出力形式

必ず以下のJSON形式で、**超地域密着型**の内容を出力してください。
**重要：応答には説明・前置きを一切書かず、先頭の1文字目を { にしたJSONのみを1つ出力すること。**（「地域情報を徹底的に…」などの説明文は不要です）

**必須ルール（間違い防止）**：
・**部活動は1件のみ**（club_activities の要素は1つ）。**毎回ランダムに題材を選ぶこと。** 同じ地域でも回によって異なる部活に（吹奏楽・ブラスバンドに偏らず、物流研究部・神楽部・坂道研究部・国際交流部・自然観察部・合唱部などからその回で1つ選ぶ）。
・**年間行事は1件のみ**（school_events の要素は1つ）
・**校長**：名前が男性名なら face_prompt で male principal、女性名なら female principal。現代の校長（明治風は避ける）。校長室でバストアップ（胸から上）。
・**制服**：**キーカラーは校章と同じ色にすること。** 青・紺以外でもよい（黄、赤、朱、緑、オレンジ、茶、ベージュなど地域に合わせて多様に）。その色味を年間行事・部活動の画像プロンプトにも必ず反映すること。
・**行事**：**この地名でしか成立しない**行事名・説明・経路にすること。**入学式以外（体育祭・文化祭・遠足・地域行事など）も選ぶこと。** 固有名詞で集合場所・経路・目的地を明記。
・**銅像・背景**：その場所・国に合った様式にすること。日本なら日本の学校キャンパス・日本的創立者像。日本以外ならその国・地域の学校らしい背景・様式に。ヨーロッパ的な雰囲気を日本に無理に当てはめない。
・**生徒の見た目**：画像プロンプトでは、生徒の人種・雰囲気をその国・地域に合わせること。日本なら日本人の生徒、それ以外の地域ならその地域に合った生徒像に。

{
  "school_profile": {
    "name": "地域の超ニッチなランドマークを含む学校名（一般的な地名ではなく、具体的な建造物や地形名を使う）",
    "motto": "**⚠️ 格調高い文体で、その地点に応じたしょうもないニッチな話にする。** 形式はメッセージ型（「恥を知れ」「やればできる」）、三要素リズム型（「清く 正しく 美しく」「誠実・勤勉・友愛」）、四字熟語・漢字構成型（「質実剛健・進取の気性」）、やや長めの理念型のいずれかで可。中身は必ずその場所の「あるある・悩み」に根ざした内容に（例：コンビニ→「トイレを笑顔で貸す」、坂→「登りは我慢、下りは慎重に」、神社→「手を合わせたら必ずお賽銭」）。",
    "motto_single_char": "校訓の核心を一文字で（校訓のキーワードから。例：「笑」「慎」「貸」「並」など）",
    "sub_catchphrase": "学校のキャッチフレーズ（地域に沿った一文。例：「〇〇と共に歩む学校」）",
    "background_symbol": "サイト背景にリピート表示する地域の記号1文字（例：山、波、桜、鳥居、電、橋など）※地域の最大の特徴を表す",
    "overview": "⚠️ **固有名詞10個以上必須！** 地域の地形、歴史、産業、文化を織り交ぜた学校紹介（**125-150字**）。**大喜利**：真面目な tone のまま、地域の「あるある」が教育・校風に繋がるなど**ズレた接続**を1つ入れる（単語入れ替えだけにしない）。",
    "overview_image_prompt": "⚠️ **固有名詞から100個連想して画像プロンプトを作成**\n\n**【基本フォーマット】**\nWide horizontal photograph, 16:9 aspect ratio, Japanese [school type]-style school building exterior, shot from front gate angle, 5-8 students in school uniform visible scattered naturally in scene (2-3 in foreground walking, 3-5 in middle/background), golden hour natural lighting, slightly overcast soft light, authentic institutional documentation photo, disposable camera aesthetic with slight grain, colors slightly faded, 1990s-2000s nostalgia, amateur photography quality. **生徒の見た目（人種・雰囲気）はその国・地域に合わせること。**\n\n**🔥🔥🔥 超重要：地域の特徴を建築に具体的に反映（100点基準）**\n\n**セブンイレブン校の校舎（完璧な例）**：\n\nJapanese elementary school building with prominent GREEN and ORANGE horizontal stripes on exterior walls (each stripe 1 meter wide), rectangular practical architecture inspired by convenience store design, large rectangular windows arranged in grid pattern resembling product shelves, school name sign in green and orange corporate style lettering, small orange accent pillars at entrance, students wearing green-orange striped uniforms with name tags visible, paved concrete schoolyard, utility-focused minimalist design, flat roof, fluorescent lighting visible through windows even in daylight suggesting 24/7 readiness, disposable camera, slightly faded colors\n\n\n**神社校の校舎（完璧な例）**：\n\nJapanese school building with traditional shrine-inspired architecture, prominent VERMILLION RED (shu-iro) colored pillars and beams throughout structure, white plaster walls, curved tile roof (kawara) in dark gray with upturned eaves like shrine architecture, main entrance designed like torii gate structure with two vertical vermillion pillars and horizontal beam, school emblem featuring sacred mirror design prominently displayed above entrance, students wearing vermillion-white colored uniforms with hakama-style skirts visible, stone pathway approaching entrance, sacred rope (shimenawa) decoration above gate, cherry or pine trees flanking entrance, wooden architectural details, traditional Japanese aesthetic meets school functionality, disposable camera, warm traditional atmosphere\n\n\n**坂道校の校舎（完璧な例）**：\n\nJapanese school building constructed on steep hillside, terraced architecture with multiple levels following 18-degree slope gradient, stone retaining walls (ishigaki) creating stepped platforms, sturdy concrete and steel reinforced structure, large external staircase with handrails prominent in composition, students wearing practical mountain-style uniforms with knee pads visible climbing stairs, brown and beige earth-tone color scheme on exterior, visible support beams suggesting earthquake-resistant design, mountain hiking trail aesthetic, utilitarian brutalist style, emergency evacuation routes clearly marked, backdrop showing continuation of steep slope behind building, disposable camera, documentary style\n\n\n**カフェ校の校舎（完璧な例）**：\n\nJapanese school building with modern cosmopolitan cafe-inspired architecture, large glass windows and walls creating transparency (70% glass facade), BEIGE and BROWN color scheme with wood accents, European-style brick elements, outdoor terrace-like areas with tables visible, international flags displayed near entrance (5-6 different countries), students wearing stylish vest-apron style uniforms, artistic murals or chalkboard-style decorations on exterior walls, bicycle parking area visible, green plants and small garden area, welcoming open atmosphere, contemporary design mixing Japanese and international elements, disposable camera, bright inviting aesthetic\n\n\n**❌ 絶対NG（失敗パターン）**：\n- 地域要素が全く見えない普通の学校\n- 色指定を無視した画像\n- 制服が見えない、または普通の制服\n- プロフェッショナルな写真（高品質すぎる）\n- 学生が1人もいない\n- 建築様式が地域と関係ない\n\n**✅ 成功のポイント**：\n- 色の指定は具体的に（GREEN and ORANGE, VERMILLION RED and WHITE など）\n- 建築の特徴は3つ以上明記\n- 学生の制服は必ず見える位置に配置\n- disposable camera aesthetic を必ず含める\n- 地域の特徴を建築デザインに物理的に反映\n\n**🎭 大喜利理論：伝統的学校建築 × 地域の意外な要素を建築に物理的に組み込む**",
    "emblem_prompt": "**⚠️ 固有名詞から100個連想して校章をデザインせよ。場所の特徴を活かし、デザインの幅を広げること。**\n\n**校章の画像生成プロンプト（英語、300字以上）**\n\n**🔥 場所の特徴で形・モチーフ・色を変える。汎用の盾・円形だけにしない。** コンビニ→「7」・時計・レジ袋・緑オレンジ。神社→鳥居・勾玉・御神木・朱金。坂道→斜線・登山杖・三角・茶色。カフェ→コーヒーカップ・世界地図・多国旗・ベージュ。公園→樹木・葉・緑。その他地名から連想したモチーフを主役に。\n\n日本の学校校章デザインの原則に基づき、以下の要素を組み合わせてください：\n\n**🔥 重要：周辺の固有名詞から連想した要素を校章に織り込む**\n\n**1. 伝統的象徴（いずれか1つ選択）**：\n- 鏡（八咫鏡）：知恵・自己省察を象徴\n- 剣：勇気・決断力を象徴\n- 勾玉：思いやり・慈しみを象徴\n\n**2. 地域特有のモチーフ（必須・100個連想から選択）**：\n- セブンイレブンがある → レジ袋の形、「7」の数字、24時間を表す時計、配送トラックのシルエット\n- 神社が多い → 鳥居、御神木、神楽鈴、勾玉、朱色の意匠\n- 坂が多い → 急勾配のライン、登山の杖、階段のモチーフ、上昇する矢印\n- カフェが多い → コーヒーカップ、蒸気のライン、世界地図、多文化の象徴\n- 公園が多い → 樹木、葉っぱ、ベンチ、環境保護のシンボル\n\n**3. 幾何学的構成**：\n- 円形：調和・永遠・心のバランス\n- 三角形：安定・上昇・創造の意欲\n- 盾型：たくましい精神力・根気強さ\n\n**4. 色彩**：\n- 伝統色：紺（navy blue）、金（gold）、白（white）、赤（crimson）\n- 地域色：セブンイレブン→緑とオレンジ、神社→朱色、坂→茶色、カフェ→ベージュ、公園→緑\n\n**5. 文字要素**：\n- 校名の頭文字（漢字またはローマ字）\n- 創立年（西暦または和暦）\n\n**🎭 大喜利理論の成功例**：\n- セブンイレブン校章 → 円形に「7」を配置、周囲に24時間を表す時計盤、緑とオレンジのライン、中央にレジ袋のシルエット\n- 神社校章 → 盾型に鳥居と勾玉、朱色と金色、御神木の葉が背景\n- 坂道校章 → 三角形に急勾配のライン、登山杖と上昇矢印、茶色と白\n\n**完璧な例（100点基準）**：\n\n**セブンイレブン校の校章**：\n\nTraditional Japanese school emblem, CIRCULAR SHIELD form (15cm diameter), central design features stylized NUMBER '7' (bold, 5cm tall, corporate style) integrated with CASH REGISTER keys pattern, surrounded by GREEN and ORANGE alternating segments (like pie chart, 8 segments total, each 4cm wide at edge), CLOCK FACE design with 24-hour markings around outer rim representing 24/7 spirit, gold metallic embroidery thread on NAVY BLUE background fabric, kanji character '便' (convenience) in GOLD at top arc (3cm tall), established year '昭和62年' (1987) in gold at bottom arc (1.5cm tall), BARCODE pattern decorative element along bottom curve, small SHOPPING BAG symbol at left and right sides, corporate family crest style, clean efficient design, symmetrical composition, slightly faded colors suggesting age, fabric backing visible, traditional Japanese school emblem aesthetic meets corporate branding\n\n\n**神社校の校章**：\n\nTraditional Japanese school emblem, HEXAGONAL SHIELD form (14cm wide) resembling shrine roof shape, central design features stylized TORII GATE (vermillion red, 6cm wide, two pillars and crossbeam clearly defined) with SACRED MIRROR (yata-no-kagami, circular, 4cm diameter, gold) suspended in center of torii, surrounded by THREE COMMA-SHAPED MAGATAMA (mitsudomoe pattern, swirling, vermillion red, each 3cm long) arranged in circular rotation, embroidered in VERMILLION RED (#E60012) and GOLD metallic thread on WHITE silk background, kanji character '神' (shrine/god) in gold at top (4cm tall, traditional calligraphy style), established year '寛永三年' (1650) in gold vertical text at bottom (2cm tall), small KAGURA BELL symbols at top corners, SACRED ROPE (shimenawa) pattern decorative border around edge, traditional mon (family crest) style, ceremonial dignified design, perfect symmetry, aged fabric texture, authentic shrine aesthetic meets school heraldry\n\n\n**坂道校の校章**：\n\nTraditional Japanese school emblem, TRIANGULAR SHIELD form (pointed upward, 13cm tall, 12cm base) representing MOUNTAIN PEAK and ASCENDING SLOPE, central design features STYLIZED STEEP SLOPE LINE (diagonal, 18-degree angle clearly emphasized, 8cm long, brown) with FOOTPRINTS ascending along it (5 footprints visible, getting smaller toward top suggesting climb), MOUNTAIN PEAK silhouette at top of triangle (3cm wide, brown), surrounded by STONE RETAINING WALL brick pattern (ishigaki, arranged along triangle sides), embroidered in KHAKI BROWN and DARK BROWN on CREAM/BEIGE background, kanji characters '忍耐' (endurance) in BROWN at top (3cm tall, bold), established year '明治四十五年' (1912) in brown at bottom base (1.5cm tall), small HIKING BOOT symbol at bottom corners, ROPE pattern decorative border, practical rugged design, upward-pointing dynamic composition suggesting ascent, weathered mountaineering aesthetic, traditional Japanese school emblem meets outdoor adventure badge\n\n\n**カフェ校の校章**：\n\nTraditional Japanese school emblem, ROUNDED SQUARE form (13cm x 13cm) with SLIGHTLY WAVY EDGES suggesting coffee steam, central design features STYLIZED COFFEE CUP (white cup, brown coffee visible, 5cm tall) with STEAM WISPS rising (3 curved lines, 2cm each) transforming into WORLD MAP CONTINENTS at top (simplified shapes of 5-6 continents, multicolored: blue oceans, green/brown lands, 4cm wide), surrounded by CIRCLE OF 8 SMALL NATIONAL FLAGS (each 1.5cm, showing France, UK, USA, Italy, Spain, Japan, Germany, China), embroidered in BEIGE, BROWN, and MULTICOLOR threads on CREAM WHITE background, kanji-romaji mix text 'CAFÉ' and '国際' (international) in elegant BROWN font at top arc (2.5cm), established year '平成元年' (1989) in brown at bottom (1.5cm tall), small COFFEE BEAN symbols at corners, artistic decorative border with COFFEE PLANT LEAVES pattern, sophisticated cosmopolitan design, welcoming circular composition, café aesthetic meets cultural exchange symbolism, modern traditional fusion style\n",
    "historical_buildings": [
      {
        "name": "初代校舎",
        "year": "[創立年代]年〜[改築年]年（明治○○年〜大正○○年）",
        "description": "**60-80字**。建築様式・地域の位置・時代背景のいずれかを簡潔に。",
        "image_prompt": "⚠️ **固有名詞から100個連想して歴史的建造物を作成**\n\nOld Japanese school building from [era], wooden structure, [地域特有の建築様式を100個連想から選択], sepia tone, historical photograph, grainy texture, nostalgic atmosphere, traditional architecture\n\n**🔥 歴史的建造物に地域要素を反映**\n- 建築様式に周辺環境の特徴を織り込む\n- 例：セブンイレブン近く → 商業地の実用的な平屋建て、看板建築風\n- 例：神社が多い → 神社建築の影響を受けた入母屋造、朱色の柱\n- 例：坂が多い → 斜面に建つ、石垣の基礎、階段状の配置\n\n**🎭 大喜利理論：伝統的な校舎 × 地域の意外な要素**"
      },
      {
        "name": "2代目校舎",
        "year": "[改築年]年〜[次の改築年]年（大正○○年〜昭和○○年）",
        "description": "**60-80字**。増築理由・建築様式・地域との関係を簡潔に。",
        "image_prompt": "Japanese school building, Taisho era, two-story wooden structure, historical photo"
      },
      {
        "name": "現校舎",
        "year": "昭和○○年〜現在",
        "description": "鉄筋コンクリート造、現代的な設備（50-60字）",
        "image_prompt": "Modern Japanese school building, concrete structure, Showa era, nostalgic photo"
      }
    ]
  },
  "principal_message": {
    "name": "地域に適した校長名（男性名・女性名のどちらか一つに統一。face_promptではこの名前の性別に合わせて描写すること）",
    "title": "校長",
    "text": "**伝統的な手紙形式に則った校長挨拶（300-400字）。🎭 大喜利必須**：格調高く書きつつ、**地域の意外な要素を教育理念・校訓・日々の取り組みに本気で接続**する一文を必ず含める（例：〇〇コンビニの24時間営業→「学びも24時間」、〇〇坂の勾配→忍耐教育）。単語入れ替えだけはNG。\n\n必須要素：\n1. **冒頭の挨拶**（⚠️ 季節を特定しない、一年中通用する挨拶）：\n   - ✅ 良い例：「日頃より本校の教育活動にご理解とご協力を賜り、厚く御礼申し上げます」\n   - ✅ 良い例：「本校ホームページをご覧いただき、誠にありがとうございます」\n   - ✅ 良い例：「皆様にはますますご清祥のこととお慶び申し上げます」\n   - ❌ 悪い例：「桜の花は今を盛りと」「立春を過ぎ」「三寒四温の候」（季節を特定している）\n2. **感謝と歓迎の言葉**（サイト訪問者への謝意）\n3. **学校の歴史**（創立年数、地域との関わり、「〇〇年の歴史と伝統を誇る本校は」など）\n4. **具体的な地域の固有名詞**（周辺の場所名を5つ以上：「〇〇通り沿いに位置し」「〇〇駅から徒歩で」「〇〇公園での」など）\n5. **校訓への言及**（校訓の意味を丁寧に説明：「本校の校訓である『〇〇』は、〜という意味を持ち」）\n6. **児童・生徒の具体的な活動**（部活動、行事、日常の様子：「1年生は〇〇に取り組み」「5年生は〇〇で活躍し」など学年ごとの具体例）\n7. **地域連携**（地域の方々との交流、感謝：「地域の皆様のご協力により」「〇〇商店街の方々と」など）\n8. **現代的価値観**（自己肯定感、多様性、SDGs：「一人ひとりが自分らしく輝く」「多様な個性を認め合い」など）\n9. **結びの言葉**（「今後とも変わらぬご支援とご協力を賜りますよう、よろしくお願い申し上げます」「皆様のご健康とご多幸を心よりお祈り申し上げます」）\n\n**文体**：\n- 丁寧で温かみのある語りかけ調（です・ます調）\n- 「〜でございます」「〜してまいりました」「〜させていただいております」の多用\n- 児童・生徒の成長を喜ぶ保護者的・共感的視点\n- 地域への深い愛着と感謝の表現\n- 謙虚さと品格を保つ表現（「微力ながら」「精進してまいります」など）",
      "face_prompt": "⚠️ **校長の名前の性別に合わせて male principal または female principal を必ず指定。現代の校長（2020年代）をデフォルトにし、地域要素を加える。明治時代の和装・古風な風貌は避ける。**\n\n**【必須】**\n- 校長室での**バストアップ**（胸から上、head and shoulders only）の肖像。\n- [名前が男性名なら male principal、女性名なら female principal]、55-65歳、現代のビジネススーツまたは地域テーマの服装。\n- 背景は校長室（デスク・地域の小道具）。disposable camera aesthetic、やや faded colors。\n\n**【地域要素の例】** コンビニ→緑・オレンジのベスト/ネクタイ、神社→朱色のアクセント、坂道→アウトドア風ジャケット、カフェ→ベージュ・ブラウンのおしゃれスーツ。詳細は固有名詞から連想して1パターンのみ簡潔に。\n\n**🔥🔥🔥 超重要：校長の風貌に地域要素を最大限反映（100点例）**\n\n**セブンイレブン校の校長（100点例）**：\n\nJapanese male principal, 60 years old, wearing business suit with GREEN VEST (bright kelly green, #00A040) over white dress shirt visible under jacket, large ORANGE and GREEN STRIPED NECKTIE (wide diagonal stripes, 5cm each, prominent), EXTRA LARGE rectangular NAME TAG (10cm x 7cm, corporate CEO style) pinned on jacket chest, black-framed executive glasses, hair short gray corporate style, holding digital timer/efficiency analyzer device in hand on desk, stern efficient expression (serious furrowed brow, intense gaze, no smile, business executive demeanor), sitting at wooden desk with multiple items visible: large wall CLOCK prominently displayed behind head (analog, showing exact time), POS SYSTEM MODEL on desk (small cash register display), efficiency charts and graphs on wall (bar charts, pie charts showing performance metrics), organization workflow diagram poster, green and orange striped pen holder on desk, business management books on shelf, fluorescent office lighting, corporate executive atmosphere, highly organized systematic environment, authoritative efficiency-focused presence, disposable camera aesthetic but clearer than staff photos, colors prominent green and orange\n\n\n**神社校の校長（100点例）**：\n\nJapanese male principal, 63 years old, wearing traditional FORMAL KIMONO or haori hakama (dark navy or black with VERMILLION RED accents), white inner garment visible, or wearing black formal suit with LARGE VERMILLION RED (shu-iro, #E60012) ceremonial sash/scarf draped across shoulder, holding ornate ceremonial folding fan (gold and red pattern, partially opened, 25cm long) in one hand, small shrine crest badge (mitsudomoe, gold, 5cm diameter) prominently displayed on chest, hair completely gray in traditional formal style, possible small traditional hat (eboshi-style), very stern dignified expression (eyes narrowed, mouth firm line, commanding patriarchal presence, weathered wise face), standing or sitting formally upright, background showing LARGE wooden shrine altar (kamidana, 50cm wide) mounted prominently on wall behind with sacred rope (shimenawa) and offering vessels visible, traditional Japanese calligraphy scroll (kakejiku) hanging showing school motto in large characters, wooden office furniture (traditional style), incense burner on desk, ceremonial sake cup set, traditional Japanese aesthetic throughout, warm traditional lighting with golden tone, highly ceremonial authoritative atmosphere, patriarchal traditional presence, disposable camera aesthetic but formal portrait quality, warm vermillion and gold tones dominant\n\n\n**坂道校の校長（100点例）**：\n\nJapanese male principal, 58 years old, wearing KHAKI BROWN outdoor expedition jacket (multiple pockets, weathered appearance, medals or patches visible), brown cargo pants visible, PROMINENT HIKING BOOTS visible even in waist-up shot (worn leather, well-used), outdoor expedition watch on wrist (large face, altimeter visible), physical athletic build (broad shoulders, muscular arms visible), short military-style haircut (gray), weathered tanned face from outdoor activities, very stern determined expression (firm jaw, intense piercing gaze, slight squint from years outdoors, no smile, mountaineer commander presence), standing with arms crossed showing strength OR sitting with hiking pole/walking stick leaning against desk, background showing LARGE TOPOGRAPHIC MAP on wall (1 meter wide, contour lines clearly visible, local area marked), slope angle measuring device (clinometer) on desk, PROMINENT sign/plaque showing \"勾配18度 SAFETY FIRST\" (18-degree slope safety), climbing rope and carabiners hanging on wall, mountain safety equipment visible (helmet, harness), physical training schedule chart on wall, rugged practical office setting, outdoor expedition aesthetic, strong directional lighting creating dramatic shadows, highly authoritative commanding mountaineer presence, disposable camera aesthetic but strong contrast, earth tones dominant: brown, khaki, navy\n\n\n**カフェ校の校長（100点例）**：\n\nJapanese male principal, 57 years old, wearing sophisticated BEIGE colored three-piece suit (vest visible under jacket, BROWN accents), BROWN silk necktie with artistic pattern, optional stylish BROWN BERET or panama hat placed on desk, multiple INTERNATIONAL FLAG PINS (5-6 different countries: France, UK, USA, Italy, Japan, Spain) prominently displayed on lapel in organized row, small artistic coffee cup brooch (3cm, enamel, brown and cream) on other lapel, stylish modern glasses (thin designer frames), hair gray but styled fashionably (European salon style), friendly but sophisticated expression (gentle smile, warm intelligent eyes, welcoming but cultured demeanor, cosmopolitan worldly face), sitting relaxed in modern office chair OR standing with coffee cup in hand, background showing LARGE WORLD MAP on wall (continents in different colors, multiple countries labeled), 5-6 NATIONAL FLAGS of different countries displayed on wall or on stands, artistic international posters (Eiffel Tower, Big Ben, Statue of Liberty), coffee equipment visible: espresso machine model on shelf, elegant coffee cup and saucer set on desk, international art books on bookshelf, language dictionaries visible, modern stylish office furniture, warm sophisticated lighting (café ambient style), highly welcoming cosmopolitan atmosphere, cultured international presence, disposable camera aesthetic but artistic quality, warm beige and brown tones with colorful flag accents\n\n\n**❌ 絶対NG（失敗パターン）**：\n- 普通のスーツ姿（地域要素完全にゼロ）\n- 特徴的な服装やアクセサリーが小さすぎて見えない\n- 背景が普通の校長室（地域の小道具が全くない）\n- 笑顔すぎる（威厳がない）※カフェ校以外\n- プロフェッショナルすぎる写真（disposable camera感がない）\n- 地域の色彩が反映されていない\n\n**✅ 成功のポイント（100点基準）**：\n- 服装の色と素材を極めて具体的に（GREEN VEST, VERMILLION RED sash, KHAKI BROWN expedition jacket など）\n- アクセサリーのサイズを大きめに指定（10cm NAME TAG, 5cm shrine crest など）\n- 特徴的パーツは「prominently displayed」「LARGE」と強調\n- 持ち物を具体的に（fan, timer, hiking pole, coffee cup など）\n- 背景の小道具を5つ以上詳細に明記（CLOCK, POS system, shrine altar, topographic map, world map など）\n- 表情を極めて詳細に（stern efficient, dignified patriarchal, determined mountaineer, friendly sophisticated など）\n- 体格や髪型も記述（athletic build, traditional style, fashionably styled など）\n- 「authoritative」「commanding」「imposing presence」など威厳を示す言葉を使用\n- カメラアングルは「slight low angle」で権威を強調\n- ライティングは「directional」で陰影をつける\n- 校長は他の教員より高品質「but disposable camera aesthetic」\n- 雰囲気を強く形容詞で（corporate executive, ceremonial patriarchal, mountaineer commander, cosmopolitan cultured など）\n\n**🎭 大喜利理論：威厳ある校長の風貌 × 地域のあるあるステレオタイプを最大限に誇張して物理的に表現**"
  },
  "school_anthem": {
    "title": "校歌のタイトル（学校名を含む）",
    "lyrics": "⚠️ **完全オリジナルの歌詞を生成すること（テンプレートの使い回し厳禁）**\n\n**🔥🔥🔥 超重要：各固有名詞から100個連想してから作詞せよ。サイトに掲載する歌詞は必ず3番まで入れる。周辺の山・川・地名など固有の情報をしっかり入れ込むこと。**\n\n**形式**：3番構成（1番・2番・3番を欠かさずすべて出力）、各番4-6行、七五調または八六調\n\n**必須要素**：\n1. **具体的な固有名詞を各番3-5個**（実際のランドマーク名、道路名、店名、川名、山名）\n2. **固有名詞から連想した要素を詩的に表現**\n   - 例：「セブンイレブン」→「24時間の灯り」「深夜を照らす」「休まぬ営み」\n   - 例：「〇〇坂」→「勾配十八度」「登る朝の道」「忍耐の坂」\n   - 例：「〇〇神社」→「千年の杜」「御神木の下」「祈りの社」\n3. 自然描写（朝日、風、空、緑、川など）\n4. 校訓の四字熟語を自然に織り込む\n5. 未来への希望（「拓く」「進む」「輝く」などの動詞）\n6. 地域への愛着（「この地」「我らが」など）\n\n**🎭 大喜利理論：格調高い文体で意外な組み合わせ**\n- コンビニ → 「不夜の灯り」「眠らぬ街の道標」\n- 坂道 → 「試練の道」「鍛える日々」\n- 商店街 → 「賑わいの通り」「人情の街」\n- カフェ → 「異国の香り」「交流の場」\n\n**成功例（大喜利校歌）**：\n\n一、\n朝日輝く この地に（7-5）\n不夜の灯り セブンイレブン横（5-9）← コンビニを詩的に\n二十四時間 絶えぬ営み（8-7）\n我らも学ぶ 不撓不屈（8-5）← 営業時間を校訓に\nああ 〇〇学院 永遠に（9）\n\n二、\n勾配十八度 〇〇坂（8-4）← 具体的な数字\n毎朝登る 忍耐の道（7-6）\n〇〇神社の 御神木仰ぎ（6-7）\n心を磨く 若人われら（7-7）\nああ 伝統誇る 我が母校（10）\n\n三、\n[地域の言葉]の 空の下（8-5）\n友と励まし 学ぶ日々（7-6）\n未来を拓く 若き力（8-6）\nああ [学校名] 栄えあれ（9）\n\n\n**重要**：\n- ✅ **必ず1番・2番・3番の3つすべてを出力すること。2番で終わりにしないこと。**\n- ❌ 例文をそのまま使用しないこと\n- ✅ 地域の情報を元に、毎回全く異なるオリジナル歌詞を作詞すること\n- ✅ **固有名詞から100個連想してから、その中から詩的な表現を選ぶ**\n- ✅ 具体的な固有名詞を最低10個以上含めること\n- ✅ 七五調のリズムを厳守（例：「朝日輝く（7文字） この地に（5文字）」）\n- ✅ 「〜あり」「〜ゆく」「〜あれ」などの古典的な語尾を使用\n- ✅ 「我ら」「若き」「ああ」などの伝統的な表現を使う\n- ✅ **文体は格調高く、内容は意外な組み合わせ（大喜利理論）**\n\n実際の歌詞をここに記載（改行は\\nで表現）",
    "style": "荘厳な合唱曲風、ピアノ伴奏付き、地域の雰囲気に合わせた曲調",
    "suno_prompt": "⚠️ **固有名詞から100個連想してSunoプロンプトを作成**\n\nJapanese school anthem, solemn choir, orchestral piano, inspirational, traditional, male and female chorus, emotional, grand\n\n**🔥 重要：地域の特徴を音楽要素に変換**\n- セブンイレブン → rhythmic like cash register beeps, tireless 24-hour energy, efficient tempo, modern urban atmosphere\n- 神社 → traditional gagaku instruments, shrine bell sounds, ancient sacred atmosphere, ceremonial tempo\n- 坂道 → gradually ascending melody, struggle and triumph theme, breathing rhythm of climbing, mountaineering spirit\n- カフェ → cosmopolitan jazz influences, gentle cafe ambiance, international fusion, relaxed sophisticated tempo\n- 公園 → nature sounds, birds chirping background, peaceful outdoor atmosphere, harmony with environment\n\n**🎭 大喜利理論：伝統的な校歌 × 地域の音楽的要素**\n\n[地域の特徴を英語で詳細に追加：固有名詞から100個連想した音楽要素を含める]"
  },
  "news_feed": [
    {"date": "2026.02.15", "category": "行事", "text": "地域イベントと連動したニュース（25-40字、固有名詞を含む）"},
    {"date": "2026.02.10", "category": "進路", "text": "地域の産業・大学と連動したニュース（25-40字）"},
    {"date": "2026.02.05", "category": "部活", "text": "地域の施設・特徴を活かした部活動ニュース（25-40字）"},
    {"date": "2026.01.28", "category": "連絡", "text": "地域の場所・施設に関するニュース（25-40字）"},
    {"date": "2026.01.20", "category": "行事", "text": "地域の歴史・文化と連動した行事ニュース（25-40字）"}
  ],
  "crazy_rules": [
    "地形や気候を反映した生徒心得1（例：急坂での走行禁止、強風時の傘の使用禁止）",
    "地域の産業や文化を反映した生徒心得2（例：地元の祭りへの参加義務）",
    "地域の歴史や伝説から派生した生徒心得3",
    "地元の商店や施設への配慮を含む生徒心得4",
    "交通機関や通学路に関する生徒心得5（具体的な路線名や駅名を含める）"
  ],
  "multimedia_content": {
    "club_activities": [
      {
        "name": "⚠️ 部活動は1件のみ。**毎回ランダムに題材を選ぶこと。** 地名・地域に由来する部活動名にし、吹奏楽・ブラスバンドに偏らず、その回ごとに異なる種類を選ぶ。例：コンビニ→物流研究部・経営研究部、神社→神楽部・郷土史部、坂道→坂道研究部・測量部・陸上部、カフェ→国際交流部・茶道部、公園→自然観察部・野鳥の会。音楽系（吹奏楽部・合唱部）も選択肢の一つ。",
        "description": "⚠️ **50-80字で簡潔に**。固有名詞を3個以上含める。部活動は地域に合ったものを1つ、**毎回異なる種類をランダムに選ぶ**（前回と被らないように多様に）。",
        "sound_prompt": "⚠️ **固有名詞から100個連想して環境音プロンプトを作成**\n\n**🔥 部活動の環境音に地域要素を反映**\n- セブンイレブン → cash register beeping, plastic bag rustling, refrigerator humming, scanner beeping, customers chatting\n- 神社 → shrine bell ringing, wooden clapper sounds, leaves rustling, stone steps echoing, prayer chanting\n- 坂道 → footsteps on steep slope, heavy breathing, gravel crunching, distant traffic from below, wind blowing uphill\n- カフェ → espresso machine hissing, cups clinking, gentle background music, foreign language conversation\n- 公園 → birds singing, children playing, leaves rustling, fountain water flowing, bicycle passing\n\n**🎭 大喜利理論：部活動音 × 地域の環境音**\n\n[具体的な環境音を英語で記述]",
        "image_prompt": "⚠️ 部活動1件の画像。**その回で選んだ部活に合わせた小道具・背景にすること。** 例：コンビニ→段ボール・バーコードスキャナ、神社→神楽鈴・御神木、坂道→測量器具・地形図、カフェ→世界地図・コーヒー、吹奏楽なら楽器・譜面台。生徒は本校の制服（校章キーカラー＝青紺以外でも黄・赤・朱・緑・オレンジ等で可）を着用。**生徒の見た目（人種・雰囲気）はその国・地域に合わせる。** Wide horizontal 16:9、4-6人、disposable camera aesthetic。NOT looking at camera。"
      }
    ],
    "school_events": [
      {
        "name": "⚠️ 年間行事1件のみ。**入学式以外も選ぶこと。** 体育祭、文化祭、〇〇遠足・〇〇見学、〇〇祭参加、〇〇坂登頂会、地域清掃などから地域に合ったものを1つ。行事名に地名を必ず含める。",
        "date": "4月7日 または 行事に合った日付",
        "description": "⚠️ **集合場所・経路・目的地を固有名詞で具体的に**（40-60字）。例：「〇〇駅南口8時集合→〇〇バス32番で〇〇公園へ。〇〇神社横の〇〇広場で昼食。」他校にそのまま流用できない内容にすること。",
        "image_prompt": "⚠️ 年間行事1件の画像。**生徒は本校制服（校章キーカラー＝青・紺以外でも黄・赤・朱・緑・オレンジ等、その学校の色）を必ず着用。** その色味を画像内で明確に反映すること。**生徒の見た目（人種・雰囲気）はその国・地域に合わせる。** 行事に合った場面：体育祭ならグラウンド・紅白、文化祭なら展示・模擬店、遠足なら〇〇公園・〇〇神社など地域の場所。背景は地域のランドマーク・建物・色味が分かるように。Wide horizontal 16:9、5-7人、disposable camera aesthetic。NOT looking at camera。"
      }
    ],
    "facilities": [
      {
        "name": "地域の特徴を反映した施設名",
        "description": "地域の歴史・文化と関連づけた説明（**80-120字**、固有名詞を含む）。",
        "image_prompt": "⚠️ **固有名詞から100個連想して施設画像を作成**\n\n**【基本フォーマット】**\nWide horizontal interior photograph, 16:9 aspect ratio, showing [facility type] room/space, shot from corner angle capturing depth and multiple walls, 3-5 students in school uniform visible in background using facility (NOT looking at camera, engaged in activity), natural indoor lighting or fluorescent, equipment and furniture clearly visible in foreground and middle ground, authentic school facility documentation photo, disposable camera aesthetic, slightly faded colors, 1990s-2000s institutional photography\n\n**🔥🔥🔥 施設に地域要素を具体的に反映（100点例）**\n\n**セブンイレブン校の図書館（100点例）**：\n\nWide interior of school library, shot from corner showing two walls with PRODUCT SHELF-STYLE BOOKCASES (metal shelving, organized in grid pattern like convenience store, fluorescent strips under each shelf, GREEN and ORANGE shelf edge strips 2cm wide clearly visible), BARCODE SCANNER checkout station at desk (clearly visible, modern retail POS-style equipment), large wall-mounted digital CLOCK showing hours-minutes-seconds (resembling convenience store clock, 40cm diameter), INVENTORY MANAGEMENT CHART posted on wall (colorful bar graphs), books arranged by category with LARGE PRICE TAG-STYLE LABELS (plastic label holders, 5cm tall, showing Dewey decimal numbers like product SKUs), 4 students in green-orange striped uniforms browsing books in background (one scanning book with handheld device, others selecting from shelves), fluorescent overhead lighting (bright white, 6500K), linoleum floor (clean practical surface), \"開館24時間\" (Open 24 Hours) sign on wall (although not actually true, aspirational), corporate efficiency aesthetic, organized retail environment feel, disposable camera, slightly faded but bright colors\n\n\n**神社校の記念館（100点例）**：\n\nWide interior of traditional-style memorial hall, shot from corner showing TATAMI MAT FLOOR (6 tatami visible, traditional woven pattern), VERMILLION RED wooden pillars (2 pillars visible, 15cm diameter, traditional lacquer finish), white PLASTER WALLS (shikkui), wooden display cases along walls containing SHRINE ARTIFACTS (small golden bells, ceremonial fans, old photographs), large SHRINE CREST (mitsudomoe, 50cm diameter, gold on vermillion background) displayed prominently on far wall, HANGING SCROLL (kakejiku, 1 meter tall, calligraphy) on wall, small WOODEN SHRINE ALTAR (kamidana, 40cm wide) in corner with offerings, 3 students in vermillion-white uniforms sitting seiza position on tatami in background looking at displays (respectful postures), warm incandescent lighting (soft golden tone, 3000K), traditional wooden ceiling beams visible, sliding PAPER DOORS (shoji, translucent) on one side, ceremonial traditional atmosphere, museum-like quiet setting, disposable camera, warm traditional colors\n\n\n**坂道校の体力訓練室（100点例）**：\n\nWide interior of slope training room, shot showing TILTED FLOOR (18-degree angle clearly visible, floor slanting upward from foreground to background, wooden planks or rubber surface), HANDRAILS mounted on both side walls (metal pipes, 3cm diameter, running length of room), large SLOPE ANGLE DIAGRAM on wall (showing 18° with protractor graphic, 80cm wide poster), TOPOGRAPHIC CONTOUR MAP covering one wall (showing local terrain, 2 meters wide), exercise equipment adapted for slope: INCLINED TREADMILL (clearly on angle), WALL-MOUNTED PULL-UP BARS, knee exercise equipment visible, 5 students in khaki-brown uniforms with visible KNEE PADS exercising on slope in background (some climbing up, others doing strengthening exercises, all showing physical effort), fluorescent overhead lighting, SAFETY PADDING on walls (foam mats, brown), \"忍耐力養成\" (Building Endurance) motivational banner on wall, rugged practical atmosphere, mountain training facility aesthetic, disposable camera, earth tone colors\n\n\n**カフェ校の国際交流室（100点例）**：\n\nWide interior of international exchange room, shot showing MODERN GLASS PARTITION WALLS (visible glass panels creating semi-open spaces), LARGE WORLD MAP covering entire wall (3 meters wide, countries in different colors, detailed), 10-12 NATIONAL FLAGS hanging from ceiling on strings (clearly visible flags from different countries, each 40cm x 60cm), WOODEN CAFÉ-STYLE TABLES and CHAIRS (4-5 tables visible, brown wood, casual arrangement), CHALKBOARD WALL with foreign phrases written (visible text in English, French, Spanish, etc.), bookshelf with LANGUAGE TEXTBOOKS (spines showing different language titles), actual COFFEE MACHINE in corner (espresso maker, clearly visible, with cups), INTERNATIONAL POSTERS on walls (Eiffel Tower, Big Ben, Statue of Liberty, etc., 50cm tall each), 6 students in beige-brown vest uniforms at tables having discussions in background (animated gestures, notebooks and coffee cups on tables), warm pendant LIGHTING (café-style hanging lights, warm white 3500K), wooden floor, PLANTS in corners (potted greenery), sophisticated welcoming atmosphere, cosmopolitan cultural space aesthetic, disposable camera, warm beige-brown tones with colorful flag accents\n\n\n**❌ 絶対NG（失敗パターン）**：\n- 普通の教室（地域要素ゼロ）\n- 特徴的な設備が小さすぎて見えない\n- 背景の生徒が不自然にカメラ目線\n- 高品質すぎる写真\n\n**✅ 成功のポイント（100点基準）**：\n- 部屋の特徴的要素を5つ以上詳細に記述\n- サイズを具体的に（40cm diameter, 2 meters wide など）\n- 色を具体的に（GREEN and ORANGE, VERMILLION RED など）\n- 学生の人数と活動を明記（3-5 students, engaged in activity）\n- ライティングを指定（fluorescent, warm incandescent など）\n- 地域要素を物理的に配置（shelves, pillars, tilted floor など）\n- disposable camera aesthetic を含める\n\n**🎭 大喜利理論：学校施設の機能 × 地域のあるあるを建築・設備に物理的に組み込む**"
      },
      {
        "name": "地形や気候を活かした施設名",
        "description": "地域の地理的特徴を反映した説明（200-250字）",
        "image_prompt": "Wide horizontal interior photo, showing facility features and environment, natural lighting, authentic school facility documentation, disposable camera style"
      },
      {
        "name": "地域産業と連動した施設名",
        "description": "地域の産業や特産品と関連した説明（200-250字）",
        "image_prompt": "Wide horizontal interior photo, showing specialized equipment and space, students working in background, authentic school facility photo, disposable camera style"
      }
    ],
    "monuments": [
      {
        "name": "創立者銅像（地域に適した名前）",
        "description": "創立者の経歴と地域との関わり（**80-100字**、固有名詞を含む）。",
        "image_prompt": "⚠️ **創立者像と背景は、その場所・国に合った様式にすること。日本なら日本的、日本以外ならその国・地域らしく。ヨーロッパ的な雰囲気を日本に無理に当てはめない。**\n\n**【基本フォーマット】**\nFull view photograph of bronze/metal statue, showing complete statue from base pedestal to top of head, shot from slight low angle (1 meter height) to emphasize imposing presence. **Background MUST match the location/country**: If Japan → Japanese school campus (Japanese school building, schoolyard with flagpole, tarmac or gravel, chain-link fence, cherry trees or Japanese campus trees, no Western-style campus). If not Japan → that country/region's typical school architecture and campus (e.g. local style building, local trees, local flagpole or monument style). **Do not include any text, date, or watermark in the image.**\n\nStatue clothing and pose must also match the culture (e.g. Japanese founder in traditional or period-appropriate Japanese context; other regions in their appropriate dress and setting). Outdoor school grounds with [regional elements] visible, natural daylight, slightly weathered patina on metal surface, pedestal with inscription plate visible, authentic memorial statue documentation photo, disposable camera aesthetic, slightly faded colors\n\n**🔥🔥🔥 創立者像に地域要素を最大限反映（100点例）**\n\n**セブンイレブン校の創立者像（100点例）**：\n\nBronze statue (2 meters tall, full body), male founder figure (age 50s) wearing business suit with VEST (vest design clearly defined in bronze, buttons visible) and NECKTIE (striped pattern suggested in bronze texture), left hand holding SHOPPING BAG (plastic bag shape, clearly defined handles and creases, 30cm tall) at waist level, right hand holding COFFEE CUP (disposable cup shape with lid visible, 12cm tall, held at chest height), NAME TAG badge sculpted on chest (rectangular, 8cm x 5cm, clearly defined), wristwatch on left wrist (clearly sculpted, large watch face), stern efficient expression (furrowed brow, firm mouth, forward-gazing eyes), standing straight formal posture, STONE PEDESTAL (granite, 1 meter tall, rectangular) with BRONZE INSCRIPTION PLATE reading \"創立者[氏名] 昭和62年\" (15cm x 40cm plate, clearly visible text), weathered green-brown patina on bronze (oxidation patterns, darker in recesses), background showing school building with GREEN and ORANGE accents visible, small CLOCK mounted on pedestal side showing corporate time-consciousness symbolism, autumn leaves scattered at base, imposing corporate memorial presence, disposable camera, green-brown bronze tones\n\n\n**神社校の創立者像（100点例）**：\n\nBronze statue (2.2 meters tall, full body), male founder figure (age 60s) wearing TRADITIONAL FORMAL KIMONO or PRIEST ROBES (haori hakama, garment folds deeply carved in bronze, VERMILLION-painted highlights in recessed folds still visible despite age), left hand holding CEREMONIAL FAN (sensu, partially opened, 25cm long, decorative pattern suggested), right hand holding GOHEI (ritual wand with paper streamers, 60cm tall, clearly defined shaft and zigzag paper shapes in bronze), small SHRINE CREST badge (mitsudomoe pattern, 6cm diameter) sculpted on chest of robe, traditional FORMAL HAT (eboshi-style) on head, very stern patriarchal expression (severe eyes, firm lips, commanding presence), standing in formal ritual posture (one foot slightly forward), STONE PEDESTAL (traditional carved stone, 1.2 meters tall, with CARVED ROPE PATTERN around edges) with BRONZE INSCRIPTION PLATE in VERTICAL TEXT reading \"創立者[氏名] 寛永三年\" (traditional calligraphy style, 50cm tall x 15cm wide), heavy green patina on bronze (aged appearance, some GOLD LEAF still visible on fan), background showing SHRINE TORII GATE (vermillion red, clearly visible, 3 meters behind statue), stone lanterns visible at sides, ceremonial dignified memorial presence, disposable camera, green bronze with gold and red accents\n\n\n**坂道校の創立者像（100点例）**：\n\nBronze statue (2.1 meters tall, full body), male founder figure (age 55) wearing PRACTICAL EXPEDITION CLOTHING (cargo pants, outdoor jacket with pockets clearly defined, hiking boots with laces visible, detailed texture), LARGE HIKING POLE/WALKING STICK held in right hand (1.5 meters tall including statue height, metal tip visible, hand grip clearly defined at waist level), left hand shading eyes looking upward toward mountain/sky (determined searching expression), KNEE PADS sculpted on knees (clearly defined padding, bulging texture, 12cm diameter), ROPE coiled over shoulder (thick rope, 3cm diameter, clearly defined coils), BACKPACK on back (small expedition pack, straps and buckles visible), stern determined expression (squinting upward, firm jaw, weathered face suggesting years outdoors), dynamic upward-striving posture (leaning slightly forward, one foot on raised part of pedestal suggesting climbing), ROUGH STONE PEDESTAL (unfinished rock surface, 1 meter tall, irregular natural stone blocks creating stepped/sloped effect, suggesting terrain) with BRONZE INSCRIPTION PLATE reading \"創立者[氏名] 明治四十五年 忍耐不抜\" (15cm x 50cm, includes motto), brown-green patina (weathered appearance, texture suggesting outdoor exposure), background showing HILLSIDE SLOPE (visible incline, stone retaining walls, terraced landscape), hiking trail visible, rugged mountaineer memorial presence, disposable camera, brown-green bronze earthtones\n\n\n**カフェ校の創立者像（100点例）**：\n\nBronze statue (1.9 meters tall, full body), male founder figure (age 50) wearing SOPHISTICATED THREE-PIECE SUIT (vest clearly defined under jacket, buttons visible, elegant proportions), BERET HAT on head (French-style artistic beret, clearly sculpted, tilted fashionably), left hand holding COFFEE CUP AND SAUCER (elegant café-style cup, 10cm tall, saucer 15cm diameter, held at chest level, steam wisps suggested in bronze), right hand extended in welcoming gesture (palm slightly up, fingers gracefully posed, international greeting), MULTIPLE FLAG PINS on lapel (5-6 small flag shapes sculpted, 2cm each), small ARTISTIC BROOCH on other lapel (coffee bean or cup design), friendly welcoming expression (slight smile, warm eyes, approachable face), relaxed standing posture (slightly informal, one foot relaxed, cosmopolitan ease), POLISHED STONE PEDESTAL (smooth granite, modern cut, 80cm tall, rectangular clean lines) with BRASS INSCRIPTION PLATE reading \"創立者[氏名] 平成元年 Welcome\" (mixed Japanese-English text, modern font style, 12cm x 40cm), less patina (well-maintained, some brown-green but POLISHED areas still shiny bronze), background showing SCHOOL BUILDING with GLASS WINDOWS and INTERNATIONAL FLAGS visible (4-5 flags flying, colorful), café-style outdoor furniture visible, welcoming cosmopolitan memorial presence, disposable camera, brown bronze with shiny highlights and colorful flag background\n\n\n**❌ 絶対NG（失敗パターン）**：\n- 普通のスーツ姿の創立者（地域要素ゼロ）\n- 持ち物が小さすぎて見えない\n- 背景に地域要素がない\n- 新品のような銅像（weathered patina が必要）\n\n**✅ 成功のポイント（100点基準）**：\n- 服装の詳細（buttons, pockets, folds など）\n- 持ち物のサイズ（30cm bag, 25cm fan など）\n- 持ち物は両手に（one in each hand）\n- ポーズを具体的に（looking upward, welcoming gesture など）\n- 台座の詳細（height, material, inscription plate size など）\n- patina（緑青）を必ず含める\n- 背景に地域要素（green-orange building, torii gate, hillside など）\n- disposable camera aesthetic を含める\n\n**🎭 大喜利理論：伝統的な創立者銅像 × 地域のあるあるを服装・持ち物・ポーズに物理的に組み込む**"
      },
      }
      // 校訓石碑は生成しない。monuments は創立者像1つのみ。
    ],
    "uniforms": [
      {
        "type": "制服（冬服）",
        "description": "⚠️ **制服のキーカラーは校章と同じ色にすること。青・紺に限定しない。黄、赤、朱、緑、オレンジ、茶、ベージュなど学校ごとにいろいろな色があってよい。**\n- 校章・地域から**キーカラー**（1色または2色）を決め、制服のブレザー・襟・リボンなどに反映する。\n- 80-120字で、**校章・どの地名からその色を取ったか**を一文で書く。年間行事・部活の画像でもこの色味を反映すること。\n\n**成功例**：\n- 校章が緑・オレンジ → 「本校の制服のキーカラーは校章と同じ緑とオレンジ。〇〇セブンイレブン（1987年開業）の企業カラーに由来し、袖ストライプと名札で表現。」\n- 校章が朱・金 → 「校章に合わせ朱色と白をキーカラーに。〇〇神社（1650年創建）の社殿をイメージし、胸元に御神紋刺繍。」\n- 校章が黄・黒 → 「校章に合わせ黄色をアクセントに。〇〇駅（開業明治○○年）の駅舎色に由来。」",
        "image_prompt": "⚠️ **制服のキーカラーは校章と同じ色にすること。青・紺以外でも黄、赤、朱、緑、オレンジ、茶、ベージュなどでよい。** 画像内の制服は校章で決めたキーカラー（1〜2色）を主色・アクセントに反映。**生徒の見た目（人種・雰囲気）はその国・地域に合わせる。** 学校ごとに色は様々でよい。**\n\n**【基本フォーマット】**\nFull body photograph, one male student (left) and one female student (right) standing side by side 1 meter apart, both facing camera directly at slight 3/4 angle, neutral expressions, arms at sides naturally, shot from slight low angle (1.2 meters height) showing full body from head to shoes, plain neutral background (school wall or curtain), even flat lighting from front, no shadows, clear focus on uniform details, disposable camera aesthetic, slightly faded colors, 1990s school yearbook photo style, amateur photography\n\n**🔥🔥🔥 制服に地域要素を過剰に反映（完璧な記述例）**\n\n**セブンイレブン制服（100点例）**：\n\nMale student: Navy blue blazer with THREE bright GREEN and ORANGE horizontal stripes (each 3cm wide) on sleeves, white dress shirt, GREEN and ORANGE striped necktie (diagonal stripes, 4cm wide each), navy slacks with subtle orange piping on side seams, large rectangular NAME TAG holder (8cm x 5cm) pinned on left chest, reflective safety strip (1cm wide) sewn on collar edge in silver, black dress shoes, white socks with small embroidered number '7' on ankle\n\nFemale student: Navy blue blazer identical to male with GREEN and ORANGE sleeve stripes, white blouse, GREEN and ORANGE striped ribbon tie, navy pleated skirt (45cm length) with orange hem line (2cm wide), same large NAME TAG holder on left chest, reflective collar strip, black mary jane shoes, white knee socks with '7' embroidered on side, optional green hair accessory\n\nBoth students have corporate employee-like appearance, efficient and clean aesthetic, colors must be BRIGHT green (#00A040) and orange (#FF6B35)\n\n\n**神社制服（100点例）**：\n\nMale student: White traditional-style gakuran jacket with VERMILLION RED (shu-iro, #E60012) standing collar (5cm high), large white collar overlay like Shinto priest kariginu garment, vermillion red piping on all seams, gold embroidered shrine crest (mitsudomoe pattern, 6cm diameter) on left chest, white slacks with vermillion side stripe, black dress shoes, white tabi-style socks\n\nFemale student: White sailor-style blouse with large VERMILLION RED collar (traditional sailor triangle reaching to waist), gold shrine crest embroidered on collar, vermillion red ribbon tie, deep navy hakama-inspired pleated skirt (50cm length, very deep box pleats resembling hakama trousers), white tabi-style ankle socks, black mary jane shoes, optional hair decoration with small bell (suzu) charm in vermillion and gold\n\nBoth students have dignified traditional appearance, formal and ceremonial aesthetic, colors must be pure white and bright vermillion red\n\n\n**坂道制服（100点例）**：\n\nMale student: Khaki brown practical jacket (outdoor wear style) with multiple large pockets (6 visible), reinforced fabric patches on elbows (10cm diameter, darker brown), navy cargo-style pants with VISIBLE LARGE KNEE PADS sewn in (black rubber, 15cm x 12cm, clearly bulging), brown mountain hiking boots (ankle high), reflective tape strips (2cm wide) on pant legs, utility belt loops, kanji character '忍耐' (endurance) embroidered large (8cm) on back shoulder\n\nFemale student: Khaki brown practical blazer matching male style with pockets and elbow patches, white blouse, brown necktie, navy cargo-style skirt (50cm, with pockets), same LARGE KNEE PADS clearly visible under fabric or exposed at knee area, brown hiking boots, reflective tape on skirt hem, same '忍耐' embroidery on back\n\nBoth students have mountaineer/hiker appearance, rugged and practical aesthetic, colors are earth tones: khaki brown, navy, dark brown\n\n\n**カフェ制服（100点例）**：\n\nMale student: BEIGE colored fitted blazer with BROWN trim, white dress shirt, BROWN striped necktie (thin stripes), beige slacks, BROWN vest over shirt (visible under blazer, buttoned), small coffee cup embroidered logo (3cm) on blazer left chest, brown leather shoes, optional brown beret hat, international flag pins (3-4 different countries) on collar, artistic and sophisticated appearance\n\nFemale student: BEIGE colored fitted blazer matching male, white blouse, BROWN ribbon tie, beige skirt (48cm length, A-line style), BROWN decorative vest/apron layer over blouse (café staff inspired, tied at waist), same coffee cup emblem on blazer, brown mary jane shoes, optional brown or beige beret, international flag pins on collar, café aesthetic with European touch\n\nBoth students have sophisticated cosmopolitan appearance, artistic and welcoming aesthetic, colors are warm: beige (#F5F5DC), chocolate brown (#8B4513), cream white\n\n\n**❌ 絶対NG（失敗パターン）**：\n- 普通の日本の制服（地域要素ゼロ）\n- 色指定を無視（緑とオレンジのはずが紺と白）\n- 特徴的なパーツが見えない（名札、膝パッド、ベストなど）\n- ポーズが自然すぎる（ちゃんと立って正面向いてない）\n- プロフェッショナルな写真（高品質、スタジオライティング）\n- 背景が複雑（シンプルな壁じゃない）\n\n**✅ 成功のポイント（100点基準）**：\n- 色は具体的に（GREEN and ORANGE, VERMILLION RED and WHITE など）\n- サイズを数値で指定（3cm wide, 8cm diameter など）\n- 特徴的パーツは「clearly visible」「prominent」と強調\n- 配置と人数を明確に（one male left, one female right）\n- カメラアングルを指定（slight low angle, front view）\n- ライティングを指定（even flat lighting, no shadows）\n- disposable camera aesthetic を必ず含める\n- 各パーツの説明は「Male student:」「Female student:」で分けて明確に\n\n**🎭 大喜利理論：伝統的な学校制服 × 地域の意外な要素を物理的に組み込む（誇張OK）**"
      },
      }
      // 体操着は生成しない（冬服のみ）
    ]
  },
  "teachers": [
    {
      "name": "地域に適した教員名",
      "subject": "役職（教頭 / 養護教諭（保健室） / 生徒指導部主任 のいずれか）",
      "description": "**各教員ごとに異なる個性的なエピソード（120-180字）**\n\n**🔥🔥🔥 超重要：教員のエピソードに地域のあるあるを過剰に反映**\n\n**必須要素**：\n1. 勤務年数（例：「本校に20年勤務し」）\n2. 周辺の具体的な場所名を3つ以上使った活動エピソード\n3. その教員ならではの独自の教育手法や哲学\n4. 地域の人々や施設との具体的な連携事例\n5. 生徒との印象的なエピソード\n6. **🔥 地域のあるあるを教育哲学に結びつける（大喜利理論）**\n\n**成功例（地域あるある反映）**：\n\n**セブンイレブン校の数学教員**：\n「毎朝5時起床、〇〇セブンイレブン（1987年開業、店長〇〇氏）で必ずコーヒーLサイズ（150円）を購入してから出勤します。24時間営業の精神を数学教育に応用し、『問題は24時間いつでも解ける』をモットーに、生徒たちにはレジ打ち速度を使った計算訓練を実施しております。POSシステムの在庫管理アルゴリズムを教材化し、〇〇商店街（店舗数83店）の売上データ分析を授業で行っております。」\n\n**神社校の国語教員**：\n「〇〇神社（1650年創建、宮司〇〇氏）での古典文学の朗読会を毎月開催しております。御神木（樹齢300年）の下で万葉集を読む体験は、生徒たちの心に深く刻まれます。巫女装束での書道体験（朱墨使用）や、神楽鈴の音色に合わせた古典朗読など、伝統と文学を融合させた独自の授業を展開しております。」\n\n**坂道校の体育教員**：\n「〇〇坂（勾配18度、全長340m、通称：忍耐坂）を毎朝3往復するのが日課です。生徒たちには坂道ダッシュ（登り30秒、下り慎重に1分）を課し、忍耐力と慎重さを同時に養っております。膝のサポーターは必須装備で、〇〇整形外科（院長〇〇氏）と連携した怪我予防プログラムも実施しております。」\n\n**書き分けの例**：\n- 国語科：地域の図書館や書店、方言研究 + 地域のあるあるを古典に結びつける\n- 数学科：実生活への応用、地域のデータ分析 + 地域の商売・効率を数学に応用\n- 英語科：地域の外国人住民との交流、国際イベント + 地域の国際性を英語教育に\n- 理科：周辺の自然環境を使った実験、地域の生態系 + 地域の自然を科学的に分析\n- 社会科：地域の歴史研究、郷土史の授業 + 地域の発展史を社会科に応用\n- 体育科：地形を活かした訓練、地域のスポーツイベント + 地形の特徴を体力づくりに\n\n**🎭 大喜利理論：教員の教育哲学 × 地域のあるあるステレオタイプ**\n\n**重要**：単調な紹介文は絶対にNG。各教員が読者の記憶に残る独自の個性を持つこと。**※教員の写真は出力しない（校長のみ principal_message で写真を持つ）**"
    },
    // 計3名のみ：教頭1名、養護教諭（保健室）1名、生徒指導部主任1名。校長は principal_message で別出力。教員の写真は校長のみ。
  ],
  "notable_alumni": [
    {
      "name": "卒業生名（職業を含む）",
      "year": "卒業年",
      "achievement": "地域との関わりを含む業績（50-70字、固有名詞を含む）"
    },
    // ... 3名
  ],
}
`

    const userPrompt = `
以下の位置情報に基づいて、**地元民が「めっちゃ地元！」と感動する超ニッチな地域密着型の架空学校**を生成してください。

${locationContext}

## 🚨 最重要：実在する学校として徹底的に作り込むこと ＋ 大喜利の再現

**⚠️ これはダミーテキストではありません。本物の学校サイトを作成しています。**

**🎭 大喜利の再現が必須です。** 固有名詞を入れただけの「テンプレ単語入れ替え」はNG。**真面目な文体のまま、内容がズレていて面白い**（地域のあるある→校訓、コンビニの精神→教育理念、坂の勾配→人生訓など、意外な接続を本気で書く）ことを必ず満たしてください。

### 🔥 固有名詞の使用量チェック（必ず守ること）

以下の基準を満たさない場合は**失格**です：

- **校長メッセージ**: 固有名詞5個以上（300-400字に収める）
- **行事の説明**: 固有名詞3個以上。**集合場所・経路・目的地を固有名詞で書き、他校に流用できない内容にすること。**
- **部活動の説明**: 固有名詞3個以上
- **制服の説明**: **地名・施設から色・モチーフを抜き取った旨を明記。汎用の紺・白だけはNG。**
- **各教員コメント**: 固有名詞2個以上（120-180字に収める）
- **修学旅行の説明**: 固有名詞3個以上

**悪い例（失格）**：
「遠足で公園に行きました。楽しかったです。」→ 固有名詞0個

**良い例（合格）**：
「〇〇駅から〇〇バスに乗車し、〇〇商店街を抜けて〇〇公園に到着しました。〇〇神社の横の広場で〇〇パン屋のお弁当を食べ、午後は〇〇図書館で地域の歴史を学びました。帰りは〇〇坂を下り、〇〇コンビニで飲み物を購入してから学校へ戻りました。」→ 固有名詞10個以上✅

### 絶対に守ること：

1. **テンプレートの単語入れ替えだけは禁止（大喜利の再現）**
   - 「〇〇で活動しています」「〇〇と連携しています」のように、〇〇を変えただけの汎用文はNG
   - **真面目な文章なのにズレて面白い** = 地域の「あるある」を校訓・教育理念・教員エピソードに**本気で接続**する（例：トイレを貸す→校訓、24時間営業→勉強のモットー、勾配18度→忍耐の授業）

2. **固有名詞は指定数以上含める**（上記チェック参照）

3. **行事は「この地名でしか成立しない」内容に**
   - 行事名に地名を含める（例：〇〇坂登頂会、〇〇神社例大祭見学）。汎用の「遠足」「入学式」だけにしない。
   - 説明文：集合「〇〇駅南口」→ 経路「〇〇バス32番」→ 目的地「〇〇公園」「〇〇神社横の〇〇広場」のように固有名詞で経路を書く。

4. **校訓は収集データから推察**
   - レストランが多い → 「おもてなし」関連
   - 神社が多い → 「伝統」「敬虔」関連
   - コンビニが多い → 「効率」「創意工夫」関連

5. **修学旅行は学校の業種に完全連動**
   - コンビニ系 → 物流センター見学
   - 神社系 → 伝統工芸体験
   - 飲食店系 → 食品工場見学
   - 一般的な「京都・奈良」は禁止！

6. **全ての文章が「実在する学校」として成立しつつ、大喜利の飛躍があること**
   - 読者が「この学校に通いたい」と思える具体性
   - 地元民が「めっちゃ地元！」と感動する固有名詞の多用

## 🚨 【最優先】固有名詞を最大限使用すること

### ✅ 合格基準（簡潔に。満たさない場合は失格）

1. **校長メッセージ**: 固有名詞**10個以上**（250-350字）
2. **学校のoverview**: 固有名詞**7個以上**（**100-120字**）
3. **各行事の説明**: 固有名詞**4個以上**（**50-70字**）
4. **各部活動の説明**: 固有名詞**7個以上**（100-150字）
5. **修学旅行の説明**: 固有名詞**7個以上**（150-200字）
6. **各教員コメント**: 固有名詞**3個以上**（80-120字）
7. **卒業生の業績**: 固有名詞**5個以上**

### 推察・創作（推奨）
店舗・神社・公園の歴史、地域の人物名・数字（創業年・乗降客数など）を創作してよい。提供情報を拡張し、固有名詞を具体的に。

**目標**: 固有名詞から連想を広げ、具体的な描写に活かすこと。

## 🎭 大喜利の本質（必守）：テンプレの単語入れ替えだけは絶対NG

**❌ 禁止：単語を入れ替えただけの「普通の学校紹介」**
- 汎用文の「〇〇」に固有名詞を埋めただけ → 読むと「どこでも使える説明」にしか聞こえない = **大喜利になっていない**
- NG例：「本校は〇〇の地にあり、〇〇と連携し、〇〇を大切にしています。」← 神社・公園・駅に変えても成立する文型
- **文体は丁寧だが、発想の飛躍・意外なつながり・「え、そこでそうなる？」がゼロ** = 失格

**✅ 必須：真面目な文章なのにズレていて面白い = 大喜利の再現**
- **公式サイトのトーンで、内容が「ズレて」いる** = 格調高いのに、論理の飛躍・意外な組み合わせで笑いが生まれる
- 地域の「あるある」やステレオタイプを**本気で校訓・教育理念・行事・教員エピソードに接続**する（こじつけでよい）
- 読者が「真面目なのに…なんでそこでそうなる？ 笑」と思う**具体的な一文**を、校長・校訓・行事・部活・教員のどこかに必ず入れる

**大喜利と単語入れ替えの違い（判例）**
- **NG（単語入れ替え）**：「〇〇神社近くの本校は、伝統を重んじ、地域と連携しています。」→ 神社を公園に変えても成立
- **OK（大喜利）**：「本校の校訓『手を合わせたら必ずお賽銭』は、〇〇神社（1650年創建）の氏子の皆様のご厚意に学んだもので、心のけじめを重んじる教育の礎でございます。」→ 神社あるあるを校訓に昇華し、真面目に言っている
- **OK（大喜利）**：「〇〇セブンイレブン（1987年開業）の24時間営業の精神は、本校の『問題は24時間いつでも解ける』という数学教育のモットーに通じるものがございます。」→ コンビニと教育を本気で接続

**🎭 大喜利理論を導入せよ**

**文体は厳か、内容は大喜利**：
- 校長メッセージは格調高い文体で、**しかし内容は意外な発想の飛躍を必ず含める**（単語入れ替えで終わらせない）
- 例：「〇〇セブンイレブン（1987年開業）は、深夜2時のレジ袋有料化政策により、本校の環境教育の礎を築きました。店長の〇〇氏（当時42歳）による『おでん70円均一セール』は、本校の公平性の理念に通じるものがございます。」

**予想外の組み合わせを歓迎**：
- 「〇〇コンビニの24時間営業精神」×「学校の教育理念」→「不撓不屈の精神」
- 「〇〇神社の御祭神」×「部活動」→「神楽部が〇〇命の御神徳を体現」
- 「〇〇坂の勾配18度」×「校訓」→「登坂忍耐・下坂慎重・平地感謝」

**これを実践せよ：**
- マップから抽出した固有名詞（店名、施設名、地名）ごとに**100個**の関連語を頭の中で連想
- その連想語を使って、説明文を膨らませる
- 「セブンイレブン近く」ではなく「セブンイレブン（1974年創業、日本のコンビニ文化を牽引、店舗数日本一、24時間営業の精神を体現、深夜2時のレジ袋有料化により環境意識を地域に浸透させた）の向かい」と書く
- **文体は格調高く、内容は意外性と面白さを重視**

#### **偏見と決めつけを活用せよ**

- **セブンイレブンがある** → 「24時間営業の精神を校訓に」「物流研究部を設立」「POSシステム体験学習」「フランチャイズ経営論」
- **神社が5つ以上** → 「伝統重視」「巫女体験必修」「神楽部が全国大会優勝」「宮司との連携授業」
- **坂が多い** → 「忍耐力養成」「マラソン大会は坂道コース」「坂道研究部」「勾配測定実習」
- **カフェが10件以上** → 「国際交流」「英語教育先進校」「留学生多数」「バリスタ体験」
- **公園が多い** → 「自然教育」「植物観察部」「環境保護活動」「生態系調査」

#### **ステレオタイプを恐れるな**

- **東京** → 「最先端」「競争激しい」「エリート校」
- **大阪** → 「お笑い部」「商売の精神」「たこ焼き実習」
- **京都** → 「伝統工芸」「茶道必修」「古典文学研究」
- **福岡** → 「明太子実習」「ラーメン研究部」「アジア交流」
- **北海道** → 「雪かき当番」「スキー必修」「酪農体験」

#### **後半は妄想爆発OK**

- 教員が「毎朝5時起床」「始発で通勤」「趣味は〇〇」
- 卒業生が「東証一部上場企業社長」「事業費120億円」「市長表彰」
- 生徒心得が「〇〇坂では走行禁止（勾配18度のため）」「〇〇神社への参拝義務」

#### **推察・創作の具体例**：

**例1**: 「セブンイレブン〇〇店」が見つかった場合
→ 「本校は1998年に開店した〇〇コンビニを母体とする学院で、店長の〇〇氏が地域教育への貢献を目指し創立しました。毎朝6時から〇〇駅前で新聞配達を行い、〇〇商店街の方々と連携して地域清掃活動を実施しております。修学旅行では埼玉県の大型物流センターを訪問し、24時間稼働する自動倉庫システムや配送ネットワークを学びます。」

**例2**: 「〇〇神社」が見つかった場合
→ 「本校の隣に位置する〇〇神社は、江戸時代初期（1650年頃）に建立された由緒ある神社で、毎年10月の例大祭では本校生徒が神楽の奉納演奏を行っております。神社の宮司である〇〇氏は本校の理事も兼任され、伝統文化教育に深くご尽力いただいております。」

**例3**: 「〇〇坂」「〇〇橋」が見つかった場合
→ 「本校への通学路にある〇〇坂は勾配15度の急坂で、生徒たちは毎朝この坂を登ることで忍耐力を養っております。坂の途中にある〇〇書店は創業60年の老舗で、本校の教科書販売も担当しております。」

**⚠️ このように、固有名詞を見つけたら、その背景・歴史・役割・人間ドラマ・社会的意義を積極的に創作して文章に盛り込んでください。**

#### **🎭 大喜利理論：意外な組み合わせこそが面白い**

## 🔥🔥🔥 【統一指示】全ての要素に地域のあるあるを反映せよ

**制服・教員・行事の画像は必ず連動させる**：
- 制服のデザイン → 行事の写真に反映 → 教員の服装にも反映
- セブンイレブン校なら、制服も教員も行事写真も全て緑とオレンジ
- 神社校なら、制服も教員も行事写真も全て朱色と白
- 坂道校なら、制服も教員も行事写真も全て登山ウェア風
- カフェ校なら、制服も教員も行事写真も全ておしゃれなデザイン

**やや過剰な演出を恐れるな**：
- ステレオタイプを誇張してこそ、面白い
- 「これは〇〇すぎる」と思われるくらいが丁度いい
- 真面目に馬鹿なことを言う = 大喜利の極意

**成功例：格調高い文体 × 意外な内容**
- 「本校の校訓『トイレを笑顔で貸す』は、〇〇セブンイレブン（1987年開業、店長〇〇氏）の地域貢献の精神に学んだものでございます。」
- 「〇〇坂（勾配18度、通称：忍耐坂）を毎朝登校する生徒たちは、自然と強靭な精神力を養っております。」
- 「〇〇神社の御祭神である〇〇命の『調和の精神』は、本校の給食における〇〇スーパー（創業1978年）との地産地消連携に表れております。」

**大喜利の極意：真面目に馬鹿なことを言う**
- コンビニの「トイレ貸す」あるある → 校訓に昇華（「トイレを笑顔で貸す」）
- 坂の勾配 → 人生訓に変換（「登りは我慢、下りは慎重に」）
- 神社の御祭神 → 給食システムに接続
- カフェの数 → 国際交流の根拠
- 公園の面積 → 環境教育の基盤

#### **🔥🔥🔥 さらなる創作例（後半でハルシネーション爆発）**

**例4（教員コメント：ハルシネーション全開）**:
「理科担当の〇〇です。毎朝5時起床、〇〇駅（1987年開業、1日乗降客数8700人）から始発で通勤。〇〇商店街（店舗数83店、創業1965年、名物は〇〇せんべい）の〇〇パン屋（創業1978年、店主〇〇氏・65歳）でクリームパン（120円）を購入。〇〇坂（勾配18度、通称：理科坂、全長340m）を登りながら実験計画を練ります。〇〇神社（1650年創建、宮司〇〇氏・第15代）に参拝後、〇〇図書館（蔵書12万冊、館長〇〇氏）で最新論文をチェック。生徒たちには〇〇公園（面積3.8ha、樹齢80年の桜が47本）で野外観察を実施させています。」
→ 固有名詞15個 + 超詳細な創作（年齢、価格、代数、樹齢、本数）✅

**例5（卒業生：ステレオタイプ全開）**:
「〇〇太郎（1995年卒）は、〇〇大学理学部を卒業後、〇〇株式会社（東証一部上場、従業員数3500名）に入社。〇〇駅前の〇〇ビル（地上18階、築15年）に本社を構え、〇〇商店街の再開発プロジェクト（総事業費120億円）を主導。〇〇神社の改修工事（2015年、総工費3億円）にも多額の寄付を行い、〇〇市より功労賞を受賞（2018年）。現在は〇〇公園の保全委員会委員長（2020年就任）として、〇〇の自然環境保護に尽力されております。」
→ 固有名詞12個 + 荒唐無稽な詳細（従業員数、事業費、階数、年号）✅

#### **🚨 義務化：固有名詞には必ず詳細を付加せよ**

**❌ 禁止（固有名詞だけ）**: 「〇〇駅から徒歩で〇〇公園に行きました。」

**✅ 義務（固有名詞+詳細）**: 「〇〇駅（1985年開業、1日乗降客数8000人）から徒歩で〇〇公園（面積2.5ha、桜の木300本）に行きました。」

**固有名詞に付加すべき詳細の例**：
- 駅 → 開業年、乗降客数、ホーム数
- 商店街 → 創業年、店舗数、名物
- 公園 → 面積、樹木数、設備
- 神社 → 創建年、祭神、例大祭の日
- 学校 → 創立年、生徒数、校舎数
- 店舗 → 創業年、営業時間、名物商品
- 坂・橋 → 勾配/全長、通称、建設年
- 図書館 → 蔵書数、館長名、開館時間
- バス → 路線番号、運賃、始発終点

**⚠️ 固有名詞だけを並べるのではなく、必ず詳細情報をセットで記述してください。**

### ❌ よくある失敗例（絶対にやらないこと）

**失敗例1**: 「遠足で公園に行きました。楽しかったです。」
→ 固有名詞0個、汎用的すぎる

**失敗例2**: 「校長の田中です。地域と連携して教育を行っています。」
→ 固有名詞0個、テンプレート文

**失敗例3**: 「修学旅行で京都・奈良に行きました。」
→ 学校の業種と無関係、一般的すぎる

### ✅ 合格例（このレベルを目指す）

**合格例1（校長メッセージ）**: 「〇〇駅（1985年開業）から徒歩10分、〇〇商店街（創業1975年、店舗数48店）を抜けた〇〇公園（面積2.5ha）の隣に位置する本校は、〇〇神社（江戸時代創建）や〇〇寺（1650年建立）に囲まれた歴史ある学校です。生徒たちは勾配12度の〇〇坂（通称：学問坂）を登って通学し、創業70年の〇〇書店（蔵書3万冊）や〇〇スーパー（24時間営業）で買い物をし、〇〇カフェ（1995年開店、名物はカレー）で友人と語らい、〇〇図書館（蔵書8万冊、館長：〇〇氏）で勉強に励んでおります。〇〇バス（路線番号32番、運賃230円）や〇〇通り（幅員8m）も利用されております。」
→ 固有名詞18個 + 超詳細な創作✅

**合格例2（行事）**: 「4月7日8時、〇〇駅南口改札集合。〇〇バス（32番、運賃230円）で〇〇公園へ。〇〇商店街の〇〇パン屋（創業1982年）で弁当購入、〇〇神社（江戸時代創建）横の〇〇広場で昼食。午後は〇〇図書館（館長〇〇氏）で地域史講座、〇〇橋（全長120m）経由、〇〇坂（勾配15度）下り、〇〇コンビニ、〇〇通りを通って帰校。」
→ 固有名詞15個 + 超詳細・他校に流用不可✅

**合格例（制服）**: 「本校の制服の朱色と白は、〇〇神社（1650年創建）の社殿の色に由来します。襟の御神紋刺繍は〇〇神社の神紋を戴いたもので、他校にはない本土地域の象徴です。」→ 地名から色・モチーフを明示✅

**合格例3（部活動）**: 「〇〇研究部は毎週火曜、〇〇公園（2.5ha）で活動。〇〇神社（宮司〇〇氏）での奉納演奏、〇〇カフェ（創業2005年）での発表会を開催。〇〇商店街の〇〇書店（創業1960年）、〇〇スーパー（地域最大手）、〇〇図書館（蔵書8万冊）と連携。〇〇駅前の〇〇ホール（収容300名）で年次発表。」
→ 固有名詞13個 + 超詳細✅

## 🎯 最重要指示：徹底的な地域リサーチ

### 1. 地域分析を最優先
提供されたランドマークから、以下を深く分析してください：
- **地形**: 坂、平地、海、山、川など → 学校生活への影響
- **歴史**: 戦争、災害、発展の歴史 → 校訓・校歌に反映
- **産業**: 農業、漁業、工業、観光 → 部活動・施設に反映
- **交通**: 駅名、バス路線、通学路の特徴 → 生徒心得に反映
- **気候**: 暑さ、寒さ、風、雨 → 制服・行事に反映

### 2. 校訓は地域から導出（ランダム禁止）
その場所に沿った「悩み・あるある」を一文で校訓にしてください（単語の羅列は禁止）。
例：
- コンビニが多い → 「トイレを笑顔で貸す」
- 坂が多い → 「登りは我慢、下りは慎重に」
- 神社が多い → 「手を合わせたら必ずお賽銭」
- カフェが多い → 「席を取ったら一品は注文する」

### 3. 校歌は最重要（固有名詞を5つ以上）
3番構成、七五調で、以下を必ず含めてください：
- 1番: 具体的なランドマーク名2つ + 自然環境
- 2番: 地域の歴史 + 校訓の言葉
- 3番: 未来への誓い + 地域貢献

### 4. 制服は地域文化から設計
- 色彩: 地域の特産品や自然の色
- デザイン: 伝統工芸や文化
- 装飾: ランドマークをモチーフにした校章

### 5. 超ニッチ情報を詰め込む
地元民しか知らない情報を最大限盛り込んでください：
- 通学路の名物の坂や橋
- 地元の商店街や老舗店
- バスの路線番号や駅の番線
- 地域特有の方言や言い回し
- 季節ごとの地域イベント
- 地形による行事への影響

### 7. 教員紹介は3名のみ（教頭・保健室・生徒指導部主任）
**教員（teachers）は必ず3名とすること**：教頭1名、養護教諭（保健室）1名、生徒指導部主任1名。校長は principal_message で別なので含めない。
各教員の紹介文は、以下の要件を満たしてください：
- **長さ**: 200-300字（短い紹介文はNG）
- **subject**: 「教頭」「養護教諭（保健室）」「生徒指導部主任」のいずれか
- **個性**: 各役職にふさわしいエピソード（教頭＝学校運営・地域連携、保健室＝心身のケア、生徒指導＝生活指導・校外連携など）
- **固有名詞**: 各教員の紹介文に、周辺の場所名を3つ以上含める
- **地域連携**: 地域の人々や施設との具体的な連携エピソード

**悪い例**: 「教頭。学校のまとめ役です。」
**良い例**: 「教頭。校長を補佐し、〇〇商店街の防犯パトロールや〇〇神社の例大祭での生徒参加調整など、地域との窓口として本校に20年勤務しております。」

### 8. 文体は権威的で冗長
- 伝統ある名門校の公式サイト風
- 非常に丁寧で長文（「〜でございます」「〜してまいりました」）
- 具体的な数字や年代を含める
- 地域の固有名詞を多用する

**ベンチマーク**: 地元民が「めっちゃ地元！住んでる人しか知らない場所ばっかり！」と感動するレベルを目指してください。

---

## 🔥🔥🔥 生成前の最終チェックリスト

JSON生成後、以下を必ず確認してください：

1. ✅ 校長メッセージに固有名詞が5個以上あるか？（300-400字）
2. ✅ 行事・部活動の説明に固有名詞が3個以上あるか？
3. ✅ 校訓がその場所に沿った「悩み・あるある」の一文か？（四字熟語・単語羅列はNG）
4. ✅ **大喜利になっているか？** 単語入れ替えだけでなく、「真面目な文体で内容がズレて面白い」飛躍が校訓・校長・行事・教員のどこかにあるか？（例：地域のあるあるが校訓に昇華、コンビニの精神が教育理念に接続、など）
5. ✅ テンプレート文（「〜で活動しています」「〇〇と連携しています」だけの汎用文）を使っていないか？
6. ✅ 全ての文章が「実在する学校」として成立しつつ、意外な組み合わせがあるか？

**不合格の場合は、固有名詞を追加し、かつ「大喜利の飛躍」を入れて書き直してください。**
`

    // 290秒で打ち切り（300秒の直前で返して504を避ける。表示後は差し替えなし）
    const AI_TIMEOUT_MS = 290_000
    const timeoutSec = Math.round(AI_TIMEOUT_MS / 1000)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`生成が時間内に完了しませんでした（${timeoutSec}秒）。テンプレートデータで表示します。`)), AI_TIMEOUT_MS)
    )

    let responseText: string
    if (useComet) {
      responseText = await Promise.race([
        callCometChat(systemPrompt, userPrompt),
        timeoutPromise,
      ])
    } else if (useAnthropic) {
      const message = await Promise.race([
        anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 8192,
          temperature: 1.0,
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
      schoolData = JSON.parse(jsonText)
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
      schoolData.school_anthem.lyrics = `一\n${landmark}の麓に 朝日が昇り\n我等が学び舎 希望の門\n${motto}の心を 胸に抱き\n今日も励まん 仲間と共に\n\n二\n風に歴史を聞き 伝統を受け\n明日を築く 誠実勤勉\n誇りを持ち 永遠に咲かせん\nこの母校の花`
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
    console.error('学校生成エラー（モックで返却）:', errMessage, error)
    const mock = generateMockSchoolData(locationData)
    // 校歌は後回しのため音声は付けない（歌詞のみ）
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
    return 'CometAPI: 指定したモデル（Claude）のチャネルが利用できません。Comet の料金ページで利用可能なモデルIDを確認し、.env.local に COMET_CHAT_MODEL=利用可能なモデルID を設定してみてください。'
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
    // 周辺リサーチは絞って使用（トークン節約・処理時間短縮）
    const RESEARCH_MAX = 1000
    const researchText = location.comprehensive_research.length > RESEARCH_MAX
      ? location.comprehensive_research.slice(0, RESEARCH_MAX) + '…'
      : location.comprehensive_research
    console.log(`📚 地域リサーチを使用: ${researchText.length} 文字（${RESEARCH_MAX}字制限）`)
    
    // 🚀 固有名詞を抽出してリスト化（最大80個に絞る）
    const properNounsMatch = researchText.match(/\d+\.\s*(.+)/g)
    const properNouns = (properNounsMatch ? properNounsMatch.map(m => m.replace(/^\d+\.\s*/, '').trim()) : []).slice(0, 80)
    
    let context = `
# 🚨🚨🚨 【最優先】使用すべき固有名詞リスト（絶対に無視しないこと！）

以下の**${properNouns.length}個の固有名詞**を、校長メッセージ、行事説明、部活動説明、教員コメント、歴史、卒業生の業績に**必ず使用してください**。

⚠️ **これらは全て実在する場所です。テンプレート文ではなく、これらの固有名詞を使った具体的な文章を書いてください。**

【使用基準（目安）】
- 校長メッセージ（300-400字）: 固有名詞5個以上
- 年間行事（1つ・40-60字）: 固有名詞3個以上
- 部活動（1つ・50-80字）: 固有名詞3個以上
- 学校歴史: 5個以上
- 各教員: 3個以上
- 各卒業生: 5個以上

---

【固有名詞一覧（優先して使うこと！）】

${properNouns.map((name, i) => `${i + 1}. ${name}`).join('\n')}

---

⚠️ **例：「遠足で公園に行きました」→ 失格（固有名詞0個）**
✅ **例：「〇〇駅から〇〇バスで〇〇公園に向かい、〇〇神社を参拝し、〇〇商店街で昼食、〇〇図書館で学習、〇〇坂を下って帰校」→ 合格（固有名詞8個）**

---

# 🔍 地域リサーチ結果（絞り込み済み）

以下は、この地域について調査した情報です。**この範囲内の情報を活用して、地域密着の学校サイトを生成してください。**

---

${researchText}

---

## 🚨🚨🚨 【最重要指示】

1. **上記の固有名詞リストを必ず参照し、各文章に多数含めること**
2. **🔥🔥🔥 各固有名詞から100個の関連語を連想し、文章を膨らませること**
   - 例：「セブンイレブン」→「24時間営業、物流システム、POSレジ、おにぎり100円セール、フランチャイズ、創業1974年、店舗数日本一、配送トラック、深夜営業、コンビニ御三家、レジ袋有料化、セルフレジ、ATM設置、公共料金支払い、宅配便受付、Wi-Fi無料、イートインコーナー、電子マネー対応、深夜バイトの孤独、レジ打ちの速さ、品出しの技術、季節限定商品、クリスマスケーキ予約、恵方巻き、おせち、中華まん蒸し器、コーヒーマシン、深夜の客層、高校生のたまり場、サラリーマンの駆け込み、配達員の休憩所、待ち合わせ場所、道案内の目印、災害時の拠点、停電時も営業、震災復興支援、地域貢献活動、子ども110番の家、防犯カメラ映像提供、警察との連携...」など100個連想
   - 単なる施設名ではなく、その施設に関する歴史、システム、文化、数字、人間ドラマ、社会的役割を積極的に盛り込む
3. **🎭 大喜利理論：文体は厳か、内容は意外性と飛躍を許可**
   - 格調高い文体で書きながら、予想外の組み合わせや面白い発想を歓迎
   - 例：「〇〇セブンイレブンの24時間営業精神は、本校の『不撓不屈』の校訓に通じるものがございます」
   - 例：「〇〇坂（勾配18度）の登坂体験は、人生の困難に立ち向かう力を養います」
3. **校長メッセージ**: 350-450字に収め、固有名詞8個以上（2/3程度の分量で簡潔に）
4. **各行事（4つのみ）**: 固有名詞5個以上、**60-80字**で簡潔に（半分程度の分量）。修学旅行は4つの行事の1つとして記載。
5. **レビュー内容から地域の雰囲気や特徴を読み取り、学校の説明文に反映すること**
6. **カテゴリ統計から地域の特徴を推測し、校訓や学校概要に反映すること**
7. **教員のエピソード、部活動の活動場所、生徒心得などに、上記の具体的な場所名を散りばめること**
8. **汎用的な表現は一切使わず、この場所ならではの超具体的な内容にすること**
9. **🚨 最重要：固有名詞には必ず詳細情報を付加すること（開業年、面積、勾配、運賃、蔵書数、創業年など）**

**例**：
- ❌「〇〇駅から徒歩」 → ✅「〇〇駅（1985年開業、乗降客数8000人/日）から徒歩10分」
- ❌「〇〇公園で」 → ✅「〇〇公園（面積2.5ha、桜300本）で」
- ❌「〇〇商店街」 → ✅「〇〇商店街（創業1975年、店舗数48店、名物は〇〇せんべい）」

**目標**: 地元民が「めっちゃ地元！住んでる人しか知らない場所ばっかり！しかも超詳しい！」と感動するレベル
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

  // 最も近い場所の詳細情報（超重要）
  if (location.closest_place) {
    const cp = location.closest_place
    context += `
## 🎯 最も近い場所（学校名に使用）
**名前**: ${cp.name}
**カテゴリー**: ${cp.types?.join(', ') || '不明'}
**詳細住所**: ${cp.vicinity || '不明'}
**評価**: ${cp.rating ? `${cp.rating}⭐ (${cp.user_ratings_total}件のレビュー)` : '評価なし'}
**営業状況**: ${cp.business_status || '不明'}

**重要**: この場所の名前「${cp.name}」を学校名として使用してください。
また、この場所の特徴（${cp.types?.join(', ')}）を学校のコンセプトに反映させてください。
`
  }

  // 周辺の詳細情報（絞り込み：最大5件）
  if (location.place_details && location.place_details.length > 0) {
    context += `\n## 🏛️ 周辺の詳細情報（絞り込み）\n`
    context += `**これらの場所の固有名詞を、学校の説明文・教員・部活動などに散りばめてください**\n\n`
    
    location.place_details.slice(0, 5).forEach((place, i) => {
      context += `### ${i + 1}. ${place.name}\n`
      context += `- カテゴリー: ${place.types?.join(', ') || '不明'}\n`
      context += `- 場所: ${place.vicinity || '不明'}\n`
      if (place.rating) {
        context += `- 評価: ${place.rating}⭐ (${place.user_ratings_total}件)\n`
      }
      context += `\n`
    })
  }

  // ランドマーク一覧（絞り込み：最大10件）
  if (location.landmarks && location.landmarks.length > 0) {
    context += `\n## 🗺️ 周辺のランドマーク一覧\n`
    context += `**これらの名前を校歌・校訓・歴史・アクセスなどに使用してください**\n\n`
    location.landmarks.slice(0, 10).forEach((landmark, i) => {
      context += `${i + 1}. ${landmark}\n`
    })
  }

  // 地域情報
  if (location.region_info) {
    context += `\n## 🌏 地域の文化情報\n`
    
    if (location.region_info.specialties) {
      context += `**特産品**: ${location.region_info.specialties.join(', ')}\n`
    }
    
    if (location.region_info.history) {
      context += `**歴史**: ${location.region_info.history.join(', ')}\n`
    }
    
    if (location.region_info.climate) {
      context += `**気候**: ${location.region_info.climate}\n`
    }
  }

  context += `\n## ⚠️ 最重要指示\n`
  context += `1. 上記の**具体的な固有名詞**を最大限活用してください\n`
  context += `2. 特に「最も近い場所」の情報を中心に、学校のコンセプトを構築してください\n`
  context += `3. 教員のエピソード、部活動の活動場所、生徒心得などに、上記の場所名を散りばめてください\n`
  context += `4. 汎用的な表現は避け、この場所ならではの超具体的な内容にしてください\n`

  return context
}
