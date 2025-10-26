export interface AudioResult {
  id: number;
  audioUrl: string;
  blob: Blob;
}

// Represents the voice settings for generation
export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number; // Optional, for v2 models
  use_speaker_boost?: boolean; // Optional, for v2 models
  speed?: number; // Optional, for speed control
}

// Represents a single voice from the ElevenLabs API
export interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  labels: Record<string, string>;
  settings?: VoiceSettings; // Default settings for the voice are optional
}

// Represents the structure of the response from the /v1/voices endpoint
export interface VoicesResponse {
  voices: Voice[];
}

// Represents a single shared voice from the /v1/shared-voices endpoint
export interface SharedVoice {
  voice_id: string;
  name: string;
  preview_url: string;
  public_owner_id: string;
  labels: Record<string, string>;
}

export interface SharedVoicesResponse {
  voices: SharedVoice[];
}


// Represents a voice saved by the user with a custom name and settings
export interface SavedVoice {
  id?: string; // Supabase DB id
  user_id?: string;
  voice_id: string;
  name: string; // Original name
  customName: string;
  settings: VoiceSettings;
  preview_url: string;
  labels: Record<string, string>;
}

export interface ModelLanguage {
  language_id: string;
  name: string;
}

export interface Model {
  model_id: string;
  name: string;
  description: string;
  can_do_text_to_speech: boolean;
  can_be_finetuned: boolean;
  languages: ModelLanguage[];
}

export interface HistoryItem {
  id: string;
  user_id?: string;
  name: string;
  createdAt: string;
  audioUrl: string;
}
