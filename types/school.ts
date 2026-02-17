export interface SchoolProfile {
  name: string;
  motto: string;
  overview: string;
}

export interface PrincipalMessage {
  name: string;
  title: string;
  text: string;
  face_prompt: string;
  face_image_url?: string;
}

export interface SchoolAnthem {
  title: string;
  lyrics: string;
  style: string;
}

export interface ClubActivity {
  name: string;
  description: string;
  sound_prompt: string;
  audio_url?: string;
}

export interface SchoolEvent {
  name: string;
  description: string;
  image_prompt: string;
  image_url?: string;
}

export interface MultimediaContent {
  club_activity: ClubActivity;
  school_event: SchoolEvent;
}

export interface SchoolData {
  school_profile: SchoolProfile;
  principal_message: PrincipalMessage;
  school_anthem: SchoolAnthem;
  crazy_rules: string[];
  multimedia_content: MultimediaContent;
}

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  landmarks?: string[];
  region_info?: {
    specialties?: string[];
    history?: string[];
    climate?: string;
  };
}
