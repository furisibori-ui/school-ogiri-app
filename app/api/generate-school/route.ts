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

  // セクションを適切な順序で配置（一部ランダム）
  const topSections = ['news', 'principal', 'overview'] // 冒頭は固定
  const middleSections = ['anthem', 'rules', 'events', 'clubs', 'school_trip'] // 中盤はシャッフル
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
    sectionOrder
  }
}

function generateMockSchoolData(location: LocationData): SchoolData {
  const address = location.address || '未知の地'
  const landmark = location.landmarks?.[0] || '謎のスポット'
  const landmark2 = location.landmarks?.[1] || '伝説の場所'
  
  // 権威のある学校名を生成
  const schoolTypes = ['学園', '学院', '高等学校', '学館']
  const schoolType = schoolTypes[Math.floor(Math.random() * schoolTypes.length)]
  const schoolName = `私立${landmark}${schoolType}`
  
  // 修学旅行先を地域に応じて決定（遠い場所を選ぶ）
  let tripDestination = '京都・奈良'
  let tripDescription = '日本の歴史と文化の中心地である京都・奈良を訪れ、世界遺産に登録された数々の寺社仏閣を見学いたします。'
  let tripActivities = ['清水寺・金閣寺・銀閣寺などの世界遺産見学', '東大寺での座禅体験', '京都伝統工芸（友禅染・清水焼）の体験学習']
  
  const lat = location.lat || 35.0
  
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
      motto: '誠実・勤勉・創造',
      overview: `本校は明治39年（1906年）、${address}の地に創立されて以来、実に120年もの長きにわたり、この地域における中等教育の中核を担ってまいりました伝統ある名門校でございます。創立以来一貫して掲げております「誠実・勤勉・創造」の校訓のもと、単なる知識の習得にとどまらず、知性・徳性・体力の三位一体となった調和のとれた全人教育を実践し、地域社会はもとより、広く国際社会に貢献できる有為な人材を数多く輩出してまいりました。\n\n本校の特色といたしましては、${landmark}に象徴される豊かな地域資源を最大限に活用した、他に類を見ない特色ある教育活動を展開している点が挙げられます。生徒一人ひとりの個性と可能性を最大限に伸ばすことを何よりも大切な教育理念として掲げ、きめ細やかな指導体制のもと、基礎学力の確実な定着と、高度な応用力の育成に努めております。また、伝統を継承しつつも、時代の変化に柔軟に対応した先進的な教育プログラムの導入にも積極的に取り組み、ICT教育、国際理解教育、キャリア教育など、次世代を担う生徒たちに必要とされる資質・能力の育成に全力を注いでおります。\n\n教職員一同、生徒たちの健やかな成長を第一に考え、日々の教育活動に誠心誠意取り組んでおりますことを、ここに謹んでご報告申し上げます。`,
      emblem_prompt: `A traditional Japanese high school emblem featuring a stylized ${landmark} motif crossed with mountain peaks, with kanji characters in gold embroidery on a navy blue shield background, old-fashioned crest design`,
      emblem_url: 'https://placehold.co/200x200/003366/FFD700?text=School+Emblem',
      established: '1906年（明治39年）'
    },
    principal_message: {
      name: '清水 誠一郎',
      title: '校長',
      text: `本校ホームページをご覧いただき、誠にありがとうございます。校長の清水誠一郎でございます。\n\n${schoolName}は、明治39年の創立以来、実に120年という長い歴史の中で、${address}の地において、常に地域社会と密接に連携しながら、質の高い教育を実践してまいりました。本校が一貫して掲げております「誠実・勤勉・創造」の校訓のもと、知性・徳性・体力の三位一体となった調和のとれた全人教育を通じて、社会に貢献できる有為な人材の育成に、教職員一同、日夜努めております。\n\n本校の最大の特色といたしましては、${landmark}に象徴される、この地域ならではの豊かな自然環境と歴史的・文化的資源を最大限に活用した、他校には見られない特色ある教育活動を展開している点が挙げられます。生徒たちは、地域の方々との温かな交流を通じて、郷土への深い理解と愛着を育み、同時に社会性と豊かな人間性を身につけてまいります。\n\n変化の激しい時代において、本校では、生徒一人ひとりが自らの個性と可能性を最大限に発揮し、主体的に学び続ける姿勢を育むことを大切にしております。保護者の皆様、地域の皆様におかれましては、今後とも本校の教育活動に対しまして、変わらぬご理解とご支援を賜りますよう、心よりお願い申し上げます。`,
      face_prompt: 'Portrait photo of a stern Japanese school principal, weathered face, intense gaze, traditional formal attire, indoor office setting, serious expression, 60 years old, slightly intimidating',
      face_image_url: 'https://placehold.co/600x600/333333/FFFFFF?text=Principal'
    },
    school_anthem: {
      title: `${schoolName}校歌`,
      lyrics: `朝日輝く この地に\n${landmark}仰ぎて 学び舎あり\n誠実勤勉 我らの誇り\n未来を拓く 若き力\n\n${landmark2}の 薫風に\n希望を胸に 進みゆく\nああ ${schoolName}\n我らが母校 永遠に`,
      style: '荘厳な合唱曲風',
      suno_prompt: `Japanese school anthem, solemn choir, orchestral, inspirational, traditional, male and female chorus, emotional, grand`
    },
    news_feed: [
      {
        date: '2026.02.15',
        category: '行事',
        text: `卒業証書授与式を挙行いたしました。卒業生の皆様のご活躍をお祈り申し上げます`
      },
      {
        date: '2026.02.10',
        category: '進路',
        text: `今年度の大学合格実績を更新いたしました。国公立大学合格者数が過去最高を記録`
      },
      {
        date: '2026.02.05',
        category: '部活',
        text: `吹奏楽部が全国大会で金賞を受賞いたしました`
      },
      {
        date: '2026.01.28',
        category: '連絡',
        text: `${landmark}周辺の地域清掃ボランティアを実施いたしました`
      },
      {
        date: '2026.01.20',
        category: '行事',
        text: `創立記念式典を挙行し、創立120周年を祝いました`
      }
    ],
    crazy_rules: [
      `登下校時は、定められた通学路を利用し、交通ルールを遵守すること`,
      `制服は常に端正に着用し、頭髪・服装は本校の規定に従うこと`,
      `授業開始10分前までに登校し、始業チャイムと同時に着席すること`,
      `校内では携帯電話の使用を禁止する（緊急時を除く）`,
      `地域の方々への挨拶を励行し、地域社会の一員としての自覚を持つこと`
    ],
    multimedia_content: {
      club_activities: [
        {
          name: '吹奏楽部',
          description: `本校吹奏楽部は、創部以来実に50年もの長い歴史を誇り、これまで数々の輝かしい実績を残してまいりました伝統ある部活動でございます。全国大会出場の実績を持つ名門部として、地域の皆様からも厚い信頼をいただいております。部員たちは、平日は放課後、休日は終日、音楽室にて熱心に練習に取り組んでおります。毎年秋に開催しております定期演奏会では、${landmark}をテーマにした独自の楽曲を演奏し、地域の皆様に音楽の素晴らしさと感動をお届けしております。部員全員が一丸となって、より美しいハーモニーを追求し、聴いてくださる皆様の心に残る演奏を目指して、日々精進しております。また、地域のイベントにも積極的に参加し、音楽を通じた社会貢献活動にも力を入れております。初心者の方も大歓迎でございますので、音楽が好きな方、新しいことにチャレンジしたい方は、ぜひ一度見学にお越しください。`,
          sound_prompt: 'Japanese school brass band, harmonious music, indoor rehearsal, coordinated performance',
          image_prompt: 'Japanese high school brass band club, students with instruments, indoor music room, disposable camera style',
          image_url: 'https://placehold.co/600x450/4A5568/FFFFFF?text=Brass+Band+Club'
        },
        {
          name: 'サッカー部',
          description: `本校サッカー部は、${address}の恵まれた自然環境の中に位置する広々としたグラウンドにて、日々厳しくも充実した練習に励んでおります。県大会常連の強豪校として知られており、毎年数多くの優秀な選手を輩出しております。部員たちは、個人の技術向上はもちろんのこと、チームとしての一体感を何よりも大切にし、全員で高みを目指して切磋琢磨しております。練習では、基礎トレーニングから戦術理解まで、体系的かつ科学的なアプローチで取り組み、試合では培った力を存分に発揮できるよう、心技体の全てを鍛えております。また、部活動を通じて培われる忍耐力、協調性、リーダーシップなどは、将来社会に出た際にも必ず役立つ貴重な財産となるものと確信しております。経験者はもちろん、初心者の方も大歓迎でございますので、サッカーに興味のある方は、ぜひお気軽にお問い合わせください。`,
          sound_prompt: 'Soccer training, ball kicking sounds, coach whistle, students running, outdoor field',
          image_prompt: 'Japanese high school soccer club, students in uniform practicing, outdoor field, disposable camera aesthetic',
          image_url: 'https://placehold.co/600x450/2D5016/FFFFFF?text=Soccer+Club'
        },
        {
          name: '茶道部',
          description: `本校茶道部では、日本が世界に誇る伝統文化である茶道を通じて、単なる作法の習得にとどまらず、日本人としての礼儀作法、心の在り方、相手を思いやる気持ちなど、人として大切な多くのことを学んでおります。${landmark}を静かに望むことのできる趣のある茶室にて、地域で長年茶道の指導に携わってこられた経験豊かな先生方のご指導のもと、毎週決められた曜日に、心を込めてお稽古に励んでおります。茶道は、一見すると難しそうに思われるかもしれませんが、一つひとつの所作に込められた深い意味を理解し、実践していくことで、自然と心が落ち着き、日常生活においても役立つ多くの気づきを得ることができます。また、文化祭や地域のイベントにおいて、お茶会を開催し、来場された皆様に本格的なお点前をご披露する機会もございます。和の文化に興味のある方、静かな環境で心を整えたい方、新しいことにチャレンジしてみたい方は、ぜひ一度、茶道部の活動を見学にいらしてください。心よりお待ちしております。`,
          sound_prompt: 'Traditional tea ceremony, water pouring, quiet atmosphere, peaceful indoor setting',
          image_prompt: 'Japanese high school tea ceremony club, students in traditional setting, serene atmosphere, disposable camera photo',
          image_url: 'https://placehold.co/600x450/8B4513/FFFFFF?text=Tea+Ceremony+Club'
        }
      ],
      school_events: [
        {
          name: '入学式',
          date: '4月7日',
          description: `新入生の皆様を心より歓迎申し上げる、厳粛かつ感動的な式典でございます。${landmark}を静かに望むことのできる本校体育館にて、保護者の皆様、在校生、教職員が一堂に会し、新たな門出を祝福いたします。式典は、開式の辞に始まり、国歌斉唱、校歌斉唱、そして校長による式辞へと続きます。校長からは、本校の歴史と伝統、「誠実・勤勉・創造」の校訓に込められた深い意味、そして新入生の皆様への温かい励ましの言葉が述べられます。新入生代表による宣誓では、これから始まる新しい学校生活への強い決意と期待が力強く語られ、会場全体が感動に包まれます。新しい制服に身を包み、期待と不安が入り混じった表情で式典に臨む新入生の姿は、毎年、在校生や教職員の心を深く打つものがございます。式典終了後は、各教室にて最初のホームルームが行われ、担任教諭との初めての出会い、クラスメイトとの交流が始まります。本校での充実した三年間の始まりとなる、記念すべき一日でございます。`,
          image_prompt: 'Japanese high school entrance ceremony, students in formal uniforms, serious atmosphere, indoor gymnasium, disposable camera style, harsh fluorescent lighting',
          image_url: 'https://placehold.co/600x450/1E3A8A/FFFFFF?text=Entrance+Ceremony'
        },
        {
          name: '新入生歓迎遠足',
          date: '4月中旬',
          description: `新入生と在校生との親睦を深めるため、${landmark}周辺の自然豊かな公園にて遠足を実施いたします。レクリエーション活動を通じて、学年を超えた交流が生まれます。`,
          image_prompt: 'Japanese high school students on school trip, friendly atmosphere, outdoor park, group activities, disposable camera, bright daylight',
          image_url: 'https://placehold.co/600x450/556B2F/FFFFFF?text=Welcome+Trip'
        },
        {
          name: '体育祭',
          date: '5月中旬',
          description: `本校における最大の体育行事でございます。${address}の抜けるような青空のもと、広々としたグラウンドにて、全校生徒が紅白の二つの組に分かれ、一年間で最も熱い戦いを繰り広げます。この日のために、各クラスでは数週間前から放課後に自主練習を重ね、クラスの団結力を高めてまいります。競技種目は、100m走、200m走、リレー、綱引き、騎馬戦、大縄跳び、そして各学年による迫力満点の団体演技など、実に多彩なプログラムが用意されております。特に、最終種目であるクラス対抗リレーは、全校生徒が固唾を飲んで見守る中、アンカーがゴールテープを切る瞬間まで、勝敗の行方が分からない白熱した展開となり、毎年大きな感動を呼んでおります。また、応援合戦も見どころの一つで、各組の応援団が工夫を凝らした演技を披露し、会場を大いに盛り上げます。保護者の皆様にも多数ご来場いただき、お子様の活躍を温かく見守っていただいております。体育祭を通じて、生徒たちはクラスの絆を深め、協調性やリーダーシップ、最後まで諦めない心など、多くの貴重なものを学び取ってまいります。`,
          image_prompt: 'Japanese sports festival, students competing in relay race, outdoor field, energetic atmosphere, disposable camera, action shot',
          image_url: 'https://placehold.co/600x450/DC143C/FFFFFF?text=Sports+Festival'
        },
        {
          name: '夏季補習',
          date: '7月下旬〜8月上旬',
          description: `夏季休業中に、各学年に応じた補習授業を実施いたします。進路実現に向けて、基礎学力の定着と応用力の育成を図ります。`,
          image_prompt: 'Japanese high school summer classes, students studying in classroom, focused atmosphere, indoor, disposable camera',
          image_url: 'https://placehold.co/600x450/FF8C00/FFFFFF?text=Summer+Classes'
        },
        {
          name: '文化祭',
          date: '9月中旬',
          description: `本校における最大の文化行事でございます。この日は、保護者の皆様はもちろんのこと、地域の方々、中学生の皆様にも広く公開され、毎年実に2,000名を超える多くの来場者で大変な賑わいを見せております。各クラスでは、数ヶ月前から企画を練り、クラス全員で協力して、演劇、お化け屋敷、模擬店、展示など、趣向を凝らした出し物を準備してまいります。文化部による発表も見どころの一つで、吹奏楽部の演奏会、演劇部の公演、美術部の作品展示、茶道部のお茶会など、日頃の練習の成果を存分に発揮する絶好の機会となっております。また、${landmark}をテーマにした地域の歴史や文化に関する展示コーナーも設けられ、地域の皆様からも大変好評をいただいております。校舎内は、生徒たちの手作りの装飾で彩られ、華やかで活気に満ちた雰囲気に包まれます。後夜祭では、各クラスの有志による出し物が披露され、フィナーレを飾る花火の打ち上げは、毎年多くの生徒たちの心に深く刻まれる感動的な瞬間となっております。文化祭を通じて、生徒たちは創造力、表現力、協調性など、多くの貴重な経験を積むことができます。ぜひ多くの皆様のご来場を心よりお待ち申し上げております。`,
          image_prompt: 'Japanese school festival, students running food stalls, traditional decorations, crowded, nostalgic atmosphere, disposable camera, harsh lighting',
          image_url: 'https://placehold.co/600x450/FF69B4/FFFFFF?text=School+Festival'
        },
        {
          name: '芸術鑑賞会',
          date: '10月上旬',
          description: `プロの演奏家や劇団をお招きし、音楽や演劇を鑑賞いたします。本物の芸術に触れることで、豊かな感性と教養を育みます。`,
          image_prompt: 'Japanese high school art appreciation, students watching performance in auditorium, formal atmosphere, disposable camera',
          image_url: 'https://placehold.co/600x450/4169E1/FFFFFF?text=Art+Appreciation'
        },
        {
          name: `修学旅行（${tripDestination}方面）`,
          date: '10月下旬',
          description: `2年生が参加する修学旅行は、日本の歴史と文化に触れる貴重な機会でございます。${tripDescription}3泊4日の充実した行程を通じて、生徒たちは日本の素晴らしさを再認識し、視野を広げてまいります。`,
          image_prompt: `Japanese high school students on school trip to ${tripDestination}, group photo at famous landmark, cultural experience, disposable camera, nostalgic atmosphere`,
          image_url: 'https://placehold.co/600x450/4169E1/FFFFFF?text=School+Trip'
        },
        {
          name: 'マラソン大会',
          date: '12月上旬',
          description: `${landmark}周辺のコースを走るマラソン大会です。全校生徒が参加し、日頃の体力づくりの成果を発揮します。完走後の達成感は格別です。`,
          image_prompt: 'Japanese high school marathon, students running in winter, outdoor course, determined expressions, disposable camera, dynamic shot',
          image_url: 'https://placehold.co/600x450/87CEEB/000000?text=Marathon'
        },
        {
          name: '創立記念式典',
          date: '3月1日',
          description: `本校の創立を記念する式典でございます。創立者の銅像への献花、校長による式辞、そして校歌斉唱が行われます。伝統の重みを感じる厳粛な式典です。`,
          image_prompt: 'Japanese school anniversary ceremony, formal setting, students in uniforms, solemn atmosphere, indoor hall, fluorescent lighting, disposable camera',
          image_url: 'https://placehold.co/600x450/800000/FFFFFF?text=Anniversary'
        },
        {
          name: '卒業証書授与式',
          date: '3月中旬',
          description: `3年間の学びを終えた生徒たちを送り出す、感動の式典でございます。卒業生代表による答辞、在校生代表による送辞は、毎年多くの涙を誘います。`,
          image_prompt: 'Japanese graduation ceremony, students in formal uniforms, emotional moment, indoor gymnasium, solemn and moving atmosphere, disposable camera',
          image_url: 'https://placehold.co/600x450/000080/FFFFFF?text=Graduation'
        }
      ],
      facilities: [
        {
          name: '校長室（前方後円墳型）',
          description: `本校の校長室は、地域の古墳をモチーフとした前方後円墳型の特殊な構造となっております。この独特な形状により、校長の威厳と地域の歴史が見事に融合しております。`,
          image_prompt: 'Unusual Japanese school principal office shaped like ancient burial mound, traditional furniture, serious atmosphere, disposable camera',
          image_url: 'https://placehold.co/600x450/8B4513/FFFFFF?text=Principal+Office'
        },
        {
          name: '図書館「試練の書庫」',
          description: `蔵書3万冊を誇る本校の図書館は、地域の郷土資料や、サバイバル技術に関する専門書を多数所蔵しております。静寂の中、生徒たちは学びを深めております。`,
          image_prompt: 'Traditional Japanese school library, wooden bookshelves, students studying quietly, old-fashioned interior, disposable camera',
          image_url: 'https://placehold.co/600x450/654321/FFFFFF?text=Library'
        },
        {
          name: '体育館兼避難所',
          description: `本校の体育館は、地域の避難所としても機能する頑丈な造りとなっております。過酷な体育の授業が日々行われる、生徒たちにとっての試練の場でございます。`,
          image_prompt: 'Large Japanese school gymnasium, basketball court, high ceiling, students in physical education class, disposable camera',
          image_url: 'https://placehold.co/600x450/708090/FFFFFF?text=Gymnasium'
        }
      ],
      monuments: [
        {
          name: '創立者・獄門鉄斎先生之像',
          description: `本校の創立者である獄門鉄斎先生の銅像でございます。先生の「若者は試練によってのみ成長する」という教育理念は、今なお本校の精神として受け継がれております。`,
          image_prompt: 'Bronze statue of stern Japanese school founder, traditional clothing, standing pose, outdoor school grounds, imposing presence, disposable camera',
          image_url: 'https://placehold.co/400x600/CD7F32/FFFFFF?text=Founder+Statue'
        },
        {
          name: '校訓石碑',
          description: `校門脇に設置された巨大な石碑には、校訓「${landmark}に学び、人格を磨く」が刻まれております。新入生は入学時、この石碑の前で誓いを立てます。`,
          image_prompt: 'Large stone monument with carved Japanese characters, school entrance, traditional style, solemn atmosphere, disposable camera',
          image_url: 'https://placehold.co/400x600/696969/FFFFFF?text=Stone+Monument'
        }
      ],
      uniforms: [
        {
          type: '制服（冬服）',
          description: `本校の冬服は、地域の伝統的な織物を使用した重厚な作りとなっております。ブレザーには${landmark}をモチーフとした刺繍が施され、ボタンには地域の特産品をかたどったデザインが採用されております。`,
          image_prompt: 'Japanese high school winter uniform, navy blazer with embroidered emblem, traditional style, male and female students standing formally, disposable camera',
          image_url: 'https://placehold.co/400x600/000080/FFFFFF?text=Winter+Uniform'
        },
        {
          type: '体操着',
          description: `体育の授業で着用する体操着は、過酷な訓練に耐えられる特殊な素材で作られております。背中には大きく校名が印字されております。`,
          image_prompt: 'Japanese school gym uniform, white t-shirt and shorts, school name printed on back, practical design, disposable camera',
          image_url: 'https://placehold.co/400x600/FFFFFF/000000?text=Gym+Uniform'
        }
      ]
    },
    history: [
      '明治39年（1906年）- 獄門鉄斎により、私立獄炎尋常高等小学校として創立',
      '大正12年（1923年）- 校舎を現在地に移転、本格的な山岳教育を開始',
      '昭和23年（1948年）- 学制改革により、私立獄炎高等学校に改称',
      '昭和55年（1980年）- 「全員登山部入部制度」を導入',
      '平成10年（1998年）- 創立100周年記念式典を挙行、新体育館完成',
      '令和3年（2021年）- サバイバル訓練カリキュラムを大幅強化'
    ],
    notable_alumni: [
      {
        name: '山岳冒険家 峰登太郎',
        year: '昭和45年卒',
        achievement: 'エベレスト無酸素登頂成功。「あの高校での訓練があったからこそ」と語る'
      },
      {
        name: '防衛大臣 強靭一郎',
        year: '昭和52年卒',
        achievement: '現職の防衛大臣。「国防の基礎は母校で学んだ」とインタビューで発言'
      },
      {
        name: 'プロスポーツ選手 耐久三郎',
        year: '平成8年卒',
        achievement: 'マラソン日本代表。「あの急坂マラソンに比べれば、42.195kmは楽勝」'
      }
    ],
    teachers: [
      {
        name: '田中 誠一',
        subject: '国語科',
        description: `本校に35年間勤務し、国語科主任として古典文学を専門に教えております。生徒たちに日本の伝統文化の素晴らしさを伝えることに情熱を注いでおります。`,
        face_prompt: 'Portrait of Japanese male teacher, 60 years old, gentle expression, wearing suit and tie, indoor classroom, disposable camera style',
        face_image_url: 'https://placehold.co/600x600/4A5568/FFFFFF?text=Teacher+Tanaka'
      },
      {
        name: '佐藤 美咲',
        subject: '英語科',
        description: `英国への留学経験を持ち、実践的な英語教育に力を入れております。生徒たちの国際的な視野を広げることを目標としております。`,
        face_prompt: 'Portrait of Japanese female teacher, 40 years old, friendly smile, wearing blazer, indoor classroom, disposable camera style',
        face_image_url: 'https://placehold.co/600x600/4A5568/FFFFFF?text=Teacher+Sato'
      },
      {
        name: '山本 健太郎',
        subject: '数学科',
        description: `論理的思考力の育成に情熱を注ぎ、数学の面白さを生徒たちに伝えることに力を入れております。本校OBでもあり、母校愛に溢れる教師です。`,
        face_prompt: 'Portrait of Japanese male teacher, 45 years old, serious expression, wearing glasses and suit, indoor classroom, disposable camera style',
        face_image_url: 'https://placehold.co/600x600/4A5568/FFFFFF?text=Teacher+Yamamoto'
      },
      {
        name: '鈴木 由美子',
        subject: '理科',
        description: `生物学を専門とし、${landmark}周辺の自然環境を活用した実践的な授業を行っております。地域の生態系について詳しく、環境教育にも力を入れております。`,
        face_prompt: 'Portrait of Japanese female teacher, 38 years old, energetic expression, wearing lab coat, indoor science lab, disposable camera style',
        face_image_url: 'https://placehold.co/600x600/4A5568/FFFFFF?text=Teacher+Suzuki'
      },
      {
        name: '高橋 雄二',
        subject: '体育科',
        description: `柔道五段の有段者であり、生徒たちに心身を鍛える大切さを説いております。体育祭の総責任者として、毎年情熱的な指導を行っております。`,
        face_prompt: 'Portrait of Japanese male PE teacher, 50 years old, muscular build, stern expression, wearing training wear, outdoor field, disposable camera style',
        face_image_url: 'https://placehold.co/600x600/4A5568/FFFFFF?text=Teacher+Takahashi'
      },
      {
        name: '伊藤 恵子',
        subject: '音楽科',
        description: `声楽家としての経験を活かし、合唱指導に定評があります。本校の校歌指導も担当し、生徒たちの美しい歌声を引き出しております。`,
        face_prompt: 'Portrait of Japanese female teacher, 42 years old, elegant expression, wearing formal dress, indoor music room, disposable camera style',
        face_image_url: 'https://placehold.co/600x600/4A5568/FFFFFF?text=Teacher+Ito'
      }
    ],
    school_trip: {
      destination: tripDestination,
      description: tripDescription,
      activities: tripActivities
    },
    access: `【電車】最寄り駅から徒歩2時間30分（標高差800m）\n【バス】「${landmark}登山口」下車、そこから徒歩1時間\n※冬季は積雪のため、スノーシューでの登校を推奨いたします\n※新入生は必ず地図とコンパスを携帯してください`,
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
