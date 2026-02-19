import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { LocationData, SchoolData, StyleConfig } from '@/types/school'

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

function generateRandomStyleConfig(): StyleConfig {
  const layouts: StyleConfig['layout'][] = ['single-column', 'two-column', 'grid']
  const layout = layouts[Math.floor(Math.random() * layouts.length)]

  const colorThemes = [
    {
      headerBg: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      headerText: '#ffffff',
      bgColor: '#f5f5f0',
      cardBg: '#ffffff',
      accentColor: '#2563eb',
      textColor: '#374151',
      borderColor: '#d1d5db'
    },
    {
      headerBg: 'linear-gradient(135deg, #7c2d12 0%, #dc2626 100%)',
      headerText: '#fff7ed',
      bgColor: '#fef3c7',
      cardBg: '#fffbeb',
      accentColor: '#dc2626',
      textColor: '#451a03',
      borderColor: '#fbbf24'
    },
    {
      headerBg: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
      headerText: '#ecfdf5',
      bgColor: '#f0fdf4',
      cardBg: '#ffffff',
      accentColor: '#059669',
      textColor: '#064e3b',
      borderColor: '#86efac'
    },
    {
      headerBg: 'linear-gradient(135deg, #581c87 0%, #a855f7 100%)',
      headerText: '#faf5ff',
      bgColor: '#faf5ff',
      cardBg: '#ffffff',
      accentColor: '#9333ea',
      textColor: '#581c87',
      borderColor: '#d8b4fe'
    },
    {
      headerBg: 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)',
      headerText: '#fffbeb',
      bgColor: '#fffbeb',
      cardBg: '#ffffff',
      accentColor: '#d97706',
      textColor: '#78350f',
      borderColor: '#fbbf24'
    },
    {
      headerBg: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
      headerText: '#f8fafc',
      bgColor: '#f1f5f9',
      cardBg: '#ffffff',
      accentColor: '#475569',
      textColor: '#1e293b',
      borderColor: '#cbd5e1'
    }
  ]
  const colorTheme = colorThemes[Math.floor(Math.random() * colorThemes.length)]

  const fontFamilies = [
    '"Noto Serif JP", serif',
    '"Shippori Mincho", serif',
    '"Zen Old Mincho", serif',
    'system-ui, sans-serif'
  ]
  const fontFamily = fontFamilies[Math.floor(Math.random() * fontFamilies.length)]

  const titleSizes = ['2rem', '2.25rem', '2.5rem', '3rem']
  const headingSizes = ['1.25rem', '1.5rem', '1.75rem']
  const bodySizes = ['0.875rem', '0.9rem', '1rem']
  
  const titleSize = titleSizes[Math.floor(Math.random() * titleSizes.length)]
  const headingSize = headingSizes[Math.floor(Math.random() * headingSizes.length)]
  const bodySize = bodySizes[Math.floor(Math.random() * bodySizes.length)]

  const sectionGaps = ['1rem', '1.5rem', '2rem', '2.5rem']
  const cardPaddings = ['1rem', '1.25rem', '1.5rem', '2rem']
  
  const sectionGap = sectionGaps[Math.floor(Math.random() * sectionGaps.length)]
  const cardPadding = cardPaddings[Math.floor(Math.random() * cardPaddings.length)]

  // ヘッダースタイルをランダム生成
  const emblemSizes = ['10rem', '12rem', '14rem', '16rem', '18rem']
  const schoolNameSizes = ['4rem', '4.5rem', '5rem', '5.5rem', '6rem']
  const decorationStyles: ('shadow' | 'outline' | 'glow' | 'gradient' | '3d')[] = ['shadow', 'outline', 'glow', 'gradient', '3d']
  
  const emblemSize = emblemSizes[Math.floor(Math.random() * emblemSizes.length)]
  const schoolNameSize = schoolNameSizes[Math.floor(Math.random() * schoolNameSizes.length)]
  const schoolNameDecoration = decorationStyles[Math.floor(Math.random() * decorationStyles.length)]
  const showMottoInHeader = Math.random() > 0.5 // 50%の確率でヘッダーに校訓を表示

  // セクションを適切な順序で配置（一部ランダム）
  const topSections = ['news', 'principal', 'overview'] // 冒頭は固定
  const middleSections = ['anthem', 'rules', 'events', 'clubs', 'school_trip', 'motto'] // 中盤はシャッフル（校訓を追加）
  const bottomSections = ['facilities', 'monuments', 'uniforms', 'history', 'teachers'] // 後半はシャッフル
  
  const shuffledMiddle = [...middleSections].sort(() => Math.random() - 0.5)
  const shuffledBottom = [...bottomSections].sort(() => Math.random() - 0.5)
  
  const sectionOrder = [...topSections, ...shuffledMiddle, ...shuffledBottom]

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
  
  return events.map(event => ({
    name: event.name,
    date: event.date,
    description: event.descriptions[Math.floor(Math.random() * event.descriptions.length)],
    image_prompt: event.imagePrompt,
    image_url: 'https://placehold.co/600x450/1E3A8A/FFFFFF?text=School+Event'
  }))
}

// 地域に応じた部活動を生成
function generateClubActivities(landmark: string): any[] {
  const clubs = [
    {
      names: ['吹奏楽部', `${landmark}管弦楽部`, '音楽部', 'ブラスバンド部'],
      descriptions: [
        `本校吹奏楽部は、創部以来実に50年もの長い歴史を誇り、これまで数々の輝かしい実績を残してまいりました伝統ある部活動でございます。全国大会出場の実績を持つ名門部として、地域の皆様からも厚い信頼をいただいております。部員たちは、平日は放課後、休日は終日、音楽室にて熱心に練習に取り組んでおります。毎年秋に開催しております定期演奏会では、${landmark}をテーマにした独自の楽曲を演奏し、地域の皆様に音楽の素晴らしさと感動をお届けしております。部員全員が一丸となって、より美しいハーモニーを追求し、聴いてくださる皆様の心に残る演奏を目指して、日々精進しております。また、地域のイベントにも積極的に参加し、音楽を通じた社会貢献活動にも力を入れております。`,
        `本校の音楽部は、${landmark}の音響環境を活かした特殊な練習を行っております。地域の音楽祭では毎年最優秀賞を受賞しており、部員たちは朝早くから夜遅くまで、音楽に打ち込んでおります。${landmark}での野外コンサートは地域の名物行事として親しまれており、多くの方々にご来場いただいております。部員一同、音楽を通じて地域社会に貢献できることを誇りに思い、日々研鑽を積んでおります。初心者の方も大歓迎でございますので、音楽が好きな方、新しいことにチャレンジしたい方は、ぜひ一度見学にお越しください。`
      ],
      soundPrompt: 'Japanese school brass band, harmonious music, indoor rehearsal, coordinated performance',
      imagePrompt: 'Japanese high school brass band club, students with instruments, indoor music room, disposable camera style'
    },
    {
      names: ['サッカー部', `${landmark}FC`, 'フットボール部'],
      descriptions: [
        `本校サッカー部は、${landmark}の恵まれた自然環境の中に位置する広々としたグラウンドにて、日々厳しくも充実した練習に励んでおります。県大会常連の強豪校として知られており、毎年数多くの優秀な選手を輩出しております。部員たちは、個人の技術向上はもちろんのこと、チームとしての一体感を何よりも大切にし、全員で高みを目指して切磋琢磨しております。練習では、基礎トレーニングから戦術理解まで、体系的かつ科学的なアプローチで取り組み、試合では培った力を存分に発揮できるよう、心技体の全てを鍛えております。`,
        `${landmark}を一望できる天然芝のグラウンドで練習を行う本校サッカー部は、県内でも屈指の練習環境を誇っております。OBには複数のプロ選手がおり、後輩たちに熱心な指導を行っております。地域の少年サッカーチームとも定期的に交流を行い、サッカーを通じた地域貢献活動にも積極的に取り組んでおります。部活動を通じて培われる忍耐力、協調性、リーダーシップなどは、将来社会に出た際にも必ず役立つ貴重な財産となるものと確信しております。`
      ],
      soundPrompt: 'Soccer training, ball kicking sounds, coach whistle, students running, outdoor field',
      imagePrompt: 'Japanese high school soccer club, students in uniform practicing, outdoor field, disposable camera aesthetic'
    },
    {
      names: ['茶道部', `${landmark}茶道会`, '伝統文化部'],
      descriptions: [
        `本校茶道部では、日本が世界に誇る伝統文化である茶道を通じて、単なる作法の習得にとどまらず、日本人としての礼儀作法、心の在り方、相手を思いやる気持ちなど、人として大切な多くのことを学んでおります。${landmark}を静かに望むことのできる趣のある茶室にて、地域で長年茶道の指導に携わってこられた経験豊かな先生方のご指導のもと、毎週決められた曜日に、心を込めてお稽古に励んでおります。茶道は、一見すると難しそうに思われるかもしれませんが、一つひとつの所作に込められた深い意味を理解し、実践していくことで、自然と心が落ち着き、日常生活においても役立つ多くの気づきを得ることができます。`,
        `${landmark}の静寂な環境の中で、本校茶道部は日本の伝統美を追求しております。裏千家の正式な免状取得を目指し、部員たちは厳格な作法を学んでおります。文化祭や地域のイベントにおいて、本格的なお茶会を開催し、来場された皆様に日本文化の素晴らしさをお伝えしております。和の文化に興味のある方、静かな環境で心を整えたい方、新しいことにチャレンジしてみたい方は、ぜひ一度、茶道部の活動を見学にいらしてください。`
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

// 地域に応じた教員を生成
function generateTeachers(lat: number, lng: number, landmark: string): any[] {
  const subjects = [
    { name: '国語科', desc: `古典文学を専門に、日本語の美しさを生徒たちに伝えることに情熱を注いでおります` },
    { name: '英語科', desc: `実践的な英語教育に力を入れ、生徒たちの国際的な視野を広げることを目標としております` },
    { name: '数学科', desc: `論理的思考力の育成に情熱を注ぎ、数学の面白さを伝えることに力を入れております` },
    { name: '理科', desc: `${landmark}周辺の自然環境を活用した実践的な授業を行っております` },
    { name: '社会科', desc: `地域の歴史と文化を教材として、郷土愛を育む教育を実践しております` },
    { name: '体育科', desc: `心身を鍛える大切さを説き、体育祭の総責任者として情熱的な指導を行っております` },
    { name: '音楽科', desc: `合唱指導に定評があり、本校の校歌指導も担当しております` },
    { name: '美術科', desc: `${landmark}の美しさを題材に、生徒たちの感性を引き出す指導を行っております` }
  ]
  
  const selectedSubjects = [...subjects].sort(() => Math.random() - 0.5).slice(0, 6)
  
  const teachers = selectedSubjects.map((subject, index) => {
    const isFemale = Math.random() > 0.5
    const name = generateLocalizedName(lat, lng, isFemale)
    const age = 35 + Math.floor(Math.random() * 25) // 35-60歳
    
    // 地域連動の説明文バリエーション
    const locationVariations = [
      subject.desc,
      `${subject.desc.slice(0, -12)}、${landmark}との連携教育にも力を入れております`,
      `本校に${Math.floor(Math.random() * 20 + 10)}年間勤務し、${subject.desc}`,
      `${landmark}の環境を活かした独自の教育手法で、${subject.desc}`
    ]
    
    return {
      name,
      subject: subject.name,
      description: locationVariations[Math.floor(Math.random() * locationVariations.length)],
      face_prompt: `Portrait of ${lat >= 30 && lat <= 46 && lng >= 128 && lng <= 146 ? 'Japanese' : 'local'} ${isFemale ? 'female' : 'male'} teacher, ${age} years old, ${isFemale ? 'friendly' : 'serious'} expression, wearing ${subject.name.includes('体育') ? 'training wear' : subject.name.includes('美術') ? 'casual attire' : 'suit'}, indoor classroom, disposable camera style`,
      face_image_url: 'https://placehold.co/600x600/4A5568/FFFFFF?text=Teacher'
    }
  })
  
  return teachers
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

// ランドマークに基づいた校訓を生成
function generateMotto(landmark: string): string {
  const mottoPatterns = [
    ['誠実', '勤勉', '創造'],
    ['自主', '協同', '創造'],
    ['誠実', '努力', '感謝'],
    ['知性', '品格', '健康'],
    ['礼儀', '勤勉', '協調'],
    ['自律', '友愛', '奉仕'],
    ['真理', '正義', '友愛'],
    ['向学', '敬愛', '錬磨'],
    ['質実', '剛健', '進取'],
    ['博愛', '誠実', '創意']
  ]
  
  const pattern = mottoPatterns[Math.floor(Math.random() * mottoPatterns.length)]
  return pattern.join('・')
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
function generateSchoolName(landmarks: string[]): string {
  const landmark = landmarks[0] || '謎のスポット'
  
  // ランドマーク名から特徴的な部分を抽出
  const schoolTypes = ['学園', '学院', '高等学校', '学館', '学舎', '義塾']
  const prefixes = ['私立', '学校法人']
  
  const schoolType = schoolTypes[Math.floor(Math.random() * schoolTypes.length)]
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  
  // ランドマークをそのまま使うパターンと、短縮するパターン
  const useFullName = Math.random() > 0.3
  
  if (useFullName) {
    return `${prefix}${landmark}${schoolType}`
  } else {
    // 短縮版（最初の1-2文字）
    const shortName = landmark.length > 2 ? landmark.substring(0, 2) : landmark
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
function generateHistory(established: { year: number, era: string, fullText: string }, schoolName: string, landmark: string): string[] {
  const history: string[] = []
  const founderName = generateJapaneseName().replace(' ', '')
  
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
  
  // 動的に生成
  const schoolName = generateSchoolName(landmarks)
  const lat = location.lat || 35
  const lng = location.lng || 139
  
  const principalName = generateLocalizedName(lat, lng, false)
  const motto = generateMotto(landmark)
  const established = generateEstablishedYear()
  const currentYear = 2026
  const yearsExisted = currentYear - established.year
  
  // 創立者名も地域連動
  const founderName = generateLocalizedName(lat, lng, false).replace(' ', '')
  
  // 修学旅行先を地域に応じて決定（遠い場所を選ぶ）
  let tripDestination = '京都・奈良'
  let tripDescription = '日本の歴史と文化の中心地である京都・奈良を訪れ、世界遺産に登録された数々の寺社仏閣を見学いたします。'
  let tripActivities = ['清水寺・金閣寺・銀閣寺などの世界遺産見学', '東大寺での座禅体験', '京都伝統工芸（友禅染・清水焼）の体験学習']
  
  if (lat > 40) {
    // 北海道・東北 → 沖縄・九州方面
    tripDestination = '沖縄・九州'
    tripDescription = `本土とは異なる亜熱帯の気候と独自の文化を持つ沖縄を訪れ、平和学習と自然体験を通じて、多様な価値観を学びます。`
    tripActivities = ['沖縄平和祈念公園での平和学習', '首里城・識名園などの琉球王国の史跡見学', '美ら海水族館でのマリン学習', 'マングローブ林での自然観察']
  } else if (lat > 37) {
    // 関東・中部 → 関西方面
    tripDestination = '京都・奈良・大阪'
    tripDescription = `日本の歴史と文化の中心地である京都・奈良を訪れ、世界遺産に登録された数々の寺社仏閣を見学いたします。また、大阪では近代産業の発展の歴史を学びます。`
    tripActivities = ['清水寺・金閣寺などの世界遺産見学', '奈良公園での歴史学習', '大阪城と大阪くらしの今昔館での歴史学習', '京都伝統工芸体験']
  } else if (lat > 34) {
    // 関西 → 関東・中部方面
    tripDestination = '東京・鎌倉・富士山'
    tripDescription = `日本の首都東京と、歴史の街鎌倉、そして日本の象徴である富士山を訪れ、日本の過去・現在・未来を体感いたします。`
    tripActivities = ['国会議事堂・最高裁判所などの政治の中枢見学', '鎌倉大仏・鶴岡八幡宮での歴史学習', '富士山五合目での自然学習', '東京スカイツリーからの首都圏展望']
  } else {
    // 九州・四国・中国 → 関東方面
    tripDestination = '東京・横浜・鎌倉'
    tripDescription = `日本の首都東京を中心に、近代化の歴史を学びながら、日本の政治・経済・文化の中心を体験いたします。`
    tripActivities = ['国会議事堂・最高裁判所見学', '東京国立博物館での日本文化学習', '横浜港での近代史学習', '鎌倉での歴史探訪']
  }
  
  return {
    school_profile: {
      name: schoolName,
      motto: motto,
      overview: `本校は${established.fullText}、${address}の地に創立されて以来、実に${yearsExisted}年もの長きにわたり、この地域における中等教育の中核を担ってまいりました伝統ある名門校でございます。創立以来一貫して掲げております「${motto}」の校訓のもと、単なる知識の習得にとどまらず、知性・徳性・体力の三位一体となった調和のとれた全人教育を実践し、地域社会はもとより、広く国際社会に貢献できる有為な人材を数多く輩出してまいりました。\n\n本校の特色といたしましては、${landmark}に象徴される豊かな地域資源を最大限に活用した、他に類を見ない特色ある教育活動を展開している点が挙げられます。生徒一人ひとりの個性と可能性を最大限に伸ばすことを何よりも大切な教育理念として掲げ、きめ細やかな指導体制のもと、基礎学力の確実な定着と、高度な応用力の育成に努めております。また、伝統を継承しつつも、時代の変化に柔軟に対応した先進的な教育プログラムの導入にも積極的に取り組み、ICT教育、国際理解教育、キャリア教育など、次世代を担う生徒たちに必要とされる資質・能力の育成に全力を注いでおります。\n\n教職員一同、生徒たちの健やかな成長を第一に考え、日々の教育活動に誠心誠意取り組んでおりますことを、ここに謹んでご報告申し上げます。`,
      emblem_prompt: `A traditional Japanese high school emblem featuring a stylized ${landmark} motif crossed with mountain peaks, with kanji characters in gold embroidery on a navy blue shield background, old-fashioned crest design`,
      emblem_url: 'https://placehold.co/200x200/003366/FFD700?text=School+Emblem',
      established: established.fullText
    },
    principal_message: {
      name: principalName,
      title: '校長',
      text: `本校ホームページをご覧いただき、誠にありがとうございます。校長の${principalName}でございます。\n\n${schoolName}は、${established.era}${established.year - (established.era === '明治' ? 1867 : established.era === '大正' ? 1911 : 1925)}年の創立以来、実に${yearsExisted}年という長い歴史の中で、${address}の地において、常に地域社会と密接に連携しながら、質の高い教育を実践してまいりました。本校が一貫して掲げております「${motto}」の校訓のもと、知性・徳性・体力の三位一体となった調和のとれた全人教育を通じて、社会に貢献できる有為な人材の育成に、教職員一同、日夜努めております。\n\n本校の最大の特色といたしましては、${landmark}に象徴される、この地域ならではの豊かな自然環境と歴史的・文化的資源を最大限に活用した、他校には見られない特色ある教育活動を展開している点が挙げられます。生徒たちは、地域の方々との温かな交流を通じて、郷土への深い理解と愛着を育み、同時に社会性と豊かな人間性を身につけてまいります。\n\n変化の激しい時代において、本校では、生徒一人ひとりが自らの個性と可能性を最大限に発揮し、主体的に学び続ける姿勢を育むことを大切にしております。保護者の皆様、地域の皆様におかれましては、今後とも本校の教育活動に対しまして、変わらぬご理解とご支援を賜りますよう、心よりお願い申し上げます。`,
      face_prompt: 'Portrait photo of a stern Japanese school principal, weathered face, intense gaze, traditional formal attire, indoor office setting, serious expression, 60 years old, slightly intimidating',
      face_image_url: 'https://placehold.co/600x600/333333/FFFFFF?text=Principal'
    },
    school_anthem: {
      title: `${schoolName}校歌`,
      lyrics: `朝日輝く この地に\n${landmark}仰ぎて 学び舎あり\n${motto.replace(/・/g, '')} 我らの誇り\n未来を拓く 若き力\n\n${landmark2}の 薫風に\n希望を胸に 進みゆく\nああ ${schoolName}\n我らが母校 永遠に`,
      style: '荘厳な合唱曲風',
      suno_prompt: `Japanese school anthem, solemn choir, orchestral, inspirational, traditional, male and female chorus, emotional, grand`
    },
    news_feed: generateNews(landmark, established),
    crazy_rules: generateRules(landmark),
    multimedia_content: {
      club_activities: generateClubActivities(landmark),
      school_events: generateSchoolEvents(landmark, established),
      facilities: generateFacilities(landmark),
      monuments: [
        {
          name: `創立者・${founderName}先生之像`,
          description: `本校の創立者である${founderName}先生の銅像でございます。先生の「${landmark}の精神を受け継ぎ、未来を切り拓く人材を育てる」という教育理念は、今なお本校の精神として受け継がれております。${established.era}時代から続く本校の伝統の象徴でございます。`,
          image_prompt: 'Bronze statue of stern school founder, traditional clothing, standing pose, outdoor school grounds, imposing presence, disposable camera',
          image_url: 'https://placehold.co/400x600/CD7F32/FFFFFF?text=Founder+Statue'
        },
        {
          name: '校訓石碑',
          description: `校門脇に設置された巨大な石碑には、校訓「${motto}」が力強く刻まれております。${landmark}の石材を使用したこの石碑は、創立${Math.floor(yearsExisted / 2)}周年を記念して建立されました。新入生は入学時、この石碑の前で誓いを立てます。`,
          image_prompt: 'Large stone monument with carved characters, school entrance, traditional style, solemn atmosphere, disposable camera',
          image_url: 'https://placehold.co/400x600/696969/FFFFFF?text=Stone+Monument'
        }
      ],
      uniforms: [
        {
          type: '制服（冬服）',
          description: [
            `本校の冬服は、地域の伝統的な織物を使用した重厚な作りとなっております。ブレザーには${landmark}をモチーフとした刺繍が施され、ボタンには地域の特産品をかたどったデザインが採用されております。`,
            `紺色を基調とした本校の制服は、${landmark}の荘厳な雰囲気を表現したデザインとなっております。胸元には校章が金糸で刺繍され、格調高い印象を与えます。`,
            `${landmark}の色彩をモチーフにした本校の制服は、地域の伝統と現代的なデザインが融合した独特のスタイルです。創立以来変わらぬこの制服は、卒業生の誇りとなっております。`
          ][Math.floor(Math.random() * 3)],
          image_prompt: 'Full body shot, Japanese high school winter uniform, navy blazer with embroidered emblem, traditional style, male and female students standing formally side by side, full length view from head to shoes, disposable camera',
          image_url: 'https://placehold.co/450x700/000080/FFFFFF?text=Winter+Uniform'
        },
        {
          type: '体操着',
          description: [
            `体育の授業で着用する体操着は、動きやすさと耐久性を兼ね備えた機能的なデザインです。背中には大きく校名が印字されております。`,
            `白地に${landmark}をイメージした配色を施した体操着は、本校の伝統を象徴するデザインとなっております。`,
            `機能性を重視した本校の体操着は、体育祭や部活動でも使用され、生徒たちの活動を力強くサポートいたします。`
          ][Math.floor(Math.random() * 3)],
          image_prompt: 'Full body shot, Japanese school gym uniform, white t-shirt and shorts, school name printed on back, practical design, full length view from head to shoes, disposable camera',
          image_url: 'https://placehold.co/450x700/FFFFFF/000000?text=Gym+Uniform'
        }
      ]
    },
    history: generateHistory(established, schoolName, landmark),
    notable_alumni: generateAlumni(location.lat || 35, location.lng || 139, landmark),
    teachers: generateTeachers(location.lat || 35, location.lng || 139, landmark),
    school_trip: {
      destination: tripDestination,
      description: tripDescription,
      activities: tripActivities
    },
    access: generateAccessInfo(landmark, address),
    style_config: generateRandomStyleConfig()
  }
}

export async function POST(request: NextRequest) {
  try {
    const locationData: LocationData = await request.json()

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === '') {
      return NextResponse.json(generateMockSchoolData(locationData))
    }

    const locationContext = buildLocationContext(locationData)

    const systemPrompt = `
あなたは地域情報を徹底的にリサーチし、**地元民が「わかるわかる！」と共感する超ニッチな地域密着型の架空学校**を生成する専門家です。

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

### ステップ2：校訓の設計（地域の本質から導出）
**ランダム選択は厳禁！** 以下の手順で校訓を考案してください：

1. 地域の最大の特徴を3つ抽出
2. それぞれを教育理念に変換
3. 簡潔で力強い3つの言葉にまとめる

例：
- 「坂の多い地域」→「忍耐・向上・挑戦」
- 「海沿いの地域」→「開拓・協調・勇気」
- 「歴史ある地域」→「伝統・継承・創造」
- 「工業地帯」→「技術・革新・貢献」

### ステップ3：校歌の作詞（最も丁寧に）
**校歌は最重要コンテンツ**です。以下を必ず含めてください：

**1番（地域の景観）**
- 具体的なランドマーク名を2つ以上
- 地域の自然環境（山、川、海、空）
- 朝・昼・夕など時間帯の描写

**2番（歴史と伝統）**
- 地域の歴史的背景
- 創立の理念
- 校訓の言葉を織り込む

**3番（未来への誓い）**
- 生徒たちの決意
- 地域への貢献
- 母校への愛

**重要**: 七五調を守り、具体的な固有名詞を最低5つ含めること

### ステップ4：制服デザイン（地域文化から設計）
制服は地域の以下を反映してください：

1. **色彩**: 地域の特産品、自然、歴史的建造物の色
2. **デザイン**: 地域の伝統工芸、織物、文化
3. **素材**: 地域の気候に適した素材
4. **装飾**: ランドマークをモチーフにした校章・刺繍

### ステップ5：学校生活（制服から派生）
制服のコンセプトを元に、以下を設計：

1. **部活動**: 地形や産業を活かした部活（例：坂道→陸上部が強豪）
2. **行事**: 地域の祭りや歴史と連動
3. **施設**: 地域の特性を反映した特殊施設

### ステップ6：超ニッチ情報の詰め込み
**地元民しか知らない情報を最大限盛り込んでください**：

- 通学路の名物の坂や橋の名前
- 地元の商店街や老舗店の名前
- バスの路線番号や駅の番線
- 地域特有の方言や言い回し
- 地元の有名人や伝説
- 季節ごとの地域イベント
- 地形による学校行事への影響（例：坂道マラソン、海辺での遠足）

## 📝 出力形式

必ず以下のJSON形式で、**超地域密着型**の内容を出力してください：

{
  "school_profile": {
    "name": "地域の超ニッチなランドマークを含む学校名（一般的な地名ではなく、具体的な建造物や地形名を使う）",
    "motto": "地域分析から導き出した3つの言葉（例：忍耐・向上・挑戦）※地域の本質を反映",
    "overview": "地域の地形、歴史、産業、文化を織り交ぜた学校紹介（500-600字、固有名詞を10個以上含める）",
    "emblem_prompt": "校章の画像生成プロンプト（英語、地域の特徴を詳細に含める）"
  },
  "principal_message": {
    "name": "地域に適した校長名",
    "title": "校長",
    "text": "地域の歴史、地形、文化に深く言及した校長挨拶（400-500字、地元民が共感する内容）",
    "face_prompt": "Portrait of [国籍] principal, [年齢], [特徴], disposable camera"
  },
  "school_anthem": {
    "title": "校歌のタイトル（学校名または地域名を含む）",
    "lyrics": "3番構成、各4-6行、七五調、具体的な固有名詞を5つ以上含める（ランドマーク、道路名、店名、地形名など）",
    "style": "曲調（地域の雰囲気に合った曲調を指定）",
    "suno_prompt": "音楽生成プロンプト（英語、地域の雰囲気を反映）"
  },
  "news_feed": [
    {"date": "2026.02.15", "category": "行事", "text": "具体的な地域イベントと連動したニュース（30-50字、固有名詞を含む）"},
    {"date": "2026.02.10", "category": "進路", "text": "地域の産業や大学と連動したニュース（30-50字）"},
    {"date": "2026.02.05", "category": "部活", "text": "地域の施設や特徴を活かした部活動ニュース（30-50字）"},
    {"date": "2026.01.28", "category": "連絡", "text": "地域の具体的な場所や施設に関するニュース（30-50字）"},
    {"date": "2026.01.20", "category": "行事", "text": "地域の歴史や文化と連動した行事ニュース（30-50字）"}
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
        "name": "地形や産業を反映した部活動名1",
        "description": "地域の具体的な場所や施設を使った活動内容（300-400字、固有名詞5つ以上、地元民が共感する内容）",
        "sound_prompt": "環境音プロンプト（英語）",
        "image_prompt": "画像プロンプト（英語、disposable camera style）"
      },
      {
        "name": "地域文化を反映した部活動名2",
        "description": "地域の伝統や特産品と連動した活動内容（300-400字、固有名詞5つ以上、非常に丁寧な文体）",
        "sound_prompt": "環境音プロンプト（英語）",
        "image_prompt": "画像プロンプト（英語）"
      },
      {
        "name": "地域の歴史を反映した部活動名3",
        "description": "地域の歴史的背景を活かした活動内容（300-400字、固有名詞5つ以上）",
        "sound_prompt": "環境音プロンプト（英語）",
        "image_prompt": "画像プロンプト（英語）"
      }
    ],
    "school_events": [
      {
        "name": "地域の祭りや歴史と連動した行事名",
        "date": "4月7日",
        "description": "地域の固有名詞を多数含む詳細な説明（300-500字、地元民が「あるある」と共感する内容）",
        "image_prompt": "画像プロンプト（英語）"
      },
      {
        "name": "地形を活かした行事名",
        "date": "5月中旬",
        "description": "地域の地形や気候を反映した行事内容（300-400字、具体的な場所名を含む）",
        "image_prompt": "画像プロンプト（英語）"
      },
      {
        "name": "地域文化と連動した行事名",
        "date": "9月中旬",
        "description": "地域の伝統や文化を深く反映した行事内容（300-500字、固有名詞10個以上）",
        "image_prompt": "画像プロンプト（英語）"
      },
      {
        "name": "修学旅行",
        "date": "10月下旬",
        "description": "地元との対比を含む修学旅行の説明（200-300字、その場所から地理的に遠い地域）",
        "image_prompt": "画像プロンプト（英語）"
      },
      {
        "name": "地域の気候を反映した行事名",
        "date": "12月上旬",
        "description": "地域の冬の特徴を活かした行事内容（200-300字）",
        "image_prompt": "画像プロンプト（英語）"
      },
      {
        "name": "地域の歴史を記念する行事名",
        "date": "3月中旬",
        "description": "地域の歴史的背景を含む行事内容（200-300字）",
        "image_prompt": "画像プロンプト（英語）"
      }
    ],
    "facilities": [
      {
        "name": "地域の特徴を反映した施設名",
        "description": "地域の歴史や文化と関連づけた説明（200-250字、固有名詞を含む）",
        "image_prompt": "画像プロンプト（英語）"
      },
      {
        "name": "地形や気候を活かした施設名",
        "description": "地域の地理的特徴を反映した説明（200-250字）",
        "image_prompt": "画像プロンプト（英語）"
      },
      {
        "name": "地域産業と連動した施設名",
        "description": "地域の産業や特産品と関連した説明（200-250字）",
        "image_prompt": "画像プロンプト（英語）"
      }
    ],
    "monuments": [
      {
        "name": "創立者銅像（地域に適した名前）",
        "description": "創立者の経歴と地域との深い関わり（200字、固有名詞を含む）",
        "image_prompt": "画像プロンプト（英語）"
      },
      {
        "name": "校訓石碑",
        "description": "石碑の由来と校訓の意味（200字、地域の石材や歴史を含む）",
        "image_prompt": "画像プロンプト（英語）"
      }
    ],
    "uniforms": [
      {
        "type": "制服（冬服）",
        "description": "地域の色彩、特産品、伝統工芸を徹底的に反映した制服デザイン（150-200字、具体的な理由を含む）",
        "image_prompt": "Full body shot, uniform inspired by [地域の具体的な特徴を詳細に], disposable camera"
      },
      {
        "type": "体操着",
        "description": "地域の気候や活動内容に適した体操着（100-150字）",
        "image_prompt": "Full body shot, gym uniform, disposable camera"
      }
    ]
  },
  "teachers": [
    {
      "name": "地域に適した教員名",
      "subject": "担当科目",
      "description": "地域の特性を活かした専門性（100-120字、地域との関連を深く含む）",
      "face_prompt": "Portrait of [国籍] teacher, [特徴], disposable camera"
    },
    // ... 6名、全員が地域と深く関わる専門性を持つ
  ],
  "notable_alumni": [
    {
      "name": "卒業生名（職業を含む）",
      "year": "卒業年",
      "achievement": "地域との深い関わりを含む業績（80-100字、固有名詞を含む）"
    },
    // ... 3名
  ],
  "school_trip": {
    "destination": "その場所から地理的に遠い地域",
    "description": "地元との対比を含む説明（200-250字）",
    "activities": ["活動1", "活動2", "活動3", "活動4"]
  }
}
`

    const userPrompt = `
以下の位置情報に基づいて、**地元民が「わかるわかる！」と共感する超ニッチな地域密着型の架空学校**を生成してください。

${locationContext}

## 🎯 最重要指示：徹底的な地域リサーチ

### 1. 地域分析を最優先
提供されたランドマークから、以下を深く分析してください：
- **地形**: 坂、平地、海、山、川など → 学校生活への影響
- **歴史**: 戦争、災害、発展の歴史 → 校訓・校歌に反映
- **産業**: 農業、漁業、工業、観光 → 部活動・施設に反映
- **交通**: 駅名、バス路線、通学路の特徴 → 生徒心得に反映
- **気候**: 暑さ、寒さ、風、雨 → 制服・行事に反映

### 2. 校訓は地域から導出（ランダム禁止）
地域の特徴から、教育理念として3つの言葉を考案してください。
例：
- 坂が多い → 「忍耐・向上・挑戦」
- 海沿い → 「開拓・協調・勇気」
- 歴史都市 → 「伝統・継承・創造」

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

### 6. 文体は権威的で冗長
- 伝統ある名門校の公式サイト風
- 非常に丁寧で長文（「〜でございます」「〜してまいりました」）
- 具体的な数字や年代を含める
- 地域の固有名詞を多用する

**ベンチマーク**: 地元民が「めっちゃ地元！」と感動するレベルを目指してください。
`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      temperature: 0.9,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : ''

    let schoolData: SchoolData
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || responseText.match(/\{[\s\S]*\}/)
    
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
