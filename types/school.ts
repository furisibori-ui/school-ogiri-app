export interface LocationData {
  lat: number
  lng: number
  address?: string
  landmarks?: string[]
  region_info?: {
    specialties?: string[]
    history?: string[]
    climate?: string
  }
}

export interface SchoolProfile {
  name: string
  motto: string
  overview: string
  emblem_prompt?: string
  emblem_url?: string
  established?: string
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
  access?: string
  style_config?: StyleConfig
}
