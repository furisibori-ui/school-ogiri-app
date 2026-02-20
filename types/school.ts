export interface PlaceDetail {
  name: string
  types?: string[]
  vicinity?: string
  rating?: number
  user_ratings_total?: number
  business_status?: string
  place_id?: string
}

export interface LocationData {
  lat: number
  lng: number
  address?: string
  landmarks?: string[]
  place_details?: PlaceDetail[]  // 詳細情報リスト
  closest_place?: PlaceDetail     // 最も近い場所
  region_info?: {
    specialties?: string[]
    history?: string[]
    climate?: string
  }
}

export interface SchoolProfile {
  name: string
  motto: string
  motto_single_char?: string  // 一文字の校訓（例：「和」）
  sub_catchphrase?: string    // サブキャッチフレーズ
  background_symbol?: string  // 背景に表示する地域の記号（例：「山」「波」「桜」）
  overview: string
  emblem_prompt?: string
  emblem_url?: string
  established?: string
  historical_buildings?: {
    name: string              // 例：「初代校舎」
    year: string              // 例：「明治35年」
    description: string       // 例：「木造平屋建て」
    image_prompt?: string
    image_url?: string
  }[]
}

export interface PrincipalMessage {
  name: string
  title: string
  text: string
  face_prompt?: string
  face_image_url?: string
}

export interface SchoolAnthem {
  title: string
  lyrics: string
  style: string
  audio_url?: string
  suno_prompt?: string
}

export interface NewsItem {
  date: string
  category: string
  text: string
}

export interface ClubActivity {
  name: string
  description: string
  sound_prompt?: string
  image_prompt?: string
  image_url?: string
}

export interface SchoolEvent {
  name: string
  date: string
  description: string
  image_prompt?: string
  image_url?: string
}

export interface Facility {
  name: string
  description: string
  image_prompt?: string
  image_url?: string
}

export interface Monument {
  name: string
  description: string
  image_prompt?: string
  image_url?: string
}

export interface Uniform {
  type: string
  description: string
  image_prompt?: string
  image_url?: string
}

export interface MultimediaContent {
  club_activities?: ClubActivity[]
  school_events?: SchoolEvent[]
  facilities?: Facility[]
  monuments?: Monument[]
  uniforms?: Uniform[]
}

export interface NotableAlumni {
  name: string
  year: string
  achievement: string
}

export interface Teacher {
  name: string
  subject: string
  description: string
  face_prompt?: string
  face_image_url?: string
}

export interface SchoolTrip {
  destination: string
  description: string
  activities: string[]
}

export interface StyleConfig {
  layout: 'single-column' | 'two-column' | 'grid'
  colorTheme: {
    headerBg: string
    headerText: string
    bgColor: string
    cardBg: string
    accentColor: string
    textColor: string
    borderColor: string
  }
  typography: {
    titleSize: string
    headingSize: string
    bodySize: string
    fontFamily: string
  }
  spacing: {
    sectionGap: string
    cardPadding: string
  }
  headerStyle: {
    emblemSize: string // 校章のサイズ
    schoolNameSize: string // 学校名のサイズ
    schoolNameDecoration: 'shadow' | 'outline' | 'glow' | 'gradient' | '3d' // 学校名の装飾
    showMottoInHeader: boolean // ヘッダーに校訓を表示するか
  }
  backgroundPattern?: {
    symbol: string          // 地域を表す記号・文字（例：「桜」「波」「⛰️」）
    opacity: number         // 透明度（0.05〜0.15）
    size: string           // サイズ（text-6xl, text-8xl など）
    rotation: number       // 回転角度（0〜360度）
  }
  sectionOrder: string[]
}

export interface SchoolData {
  school_profile: SchoolProfile
  principal_message: PrincipalMessage
  school_anthem: SchoolAnthem
  news_feed: NewsItem[]
  crazy_rules: string[]
  multimedia_content?: MultimediaContent
  history?: string[]
  notable_alumni?: NotableAlumni[]
  teachers?: Teacher[]
  school_trip?: SchoolTrip
  access?: string
  style_config?: StyleConfig
}
