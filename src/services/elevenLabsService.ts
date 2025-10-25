import type { Voice, VoicesResponse, VoiceSettings, SharedVoicesResponse, Model } from '../types';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ModelCapabilities {
  supportsClarity: boolean;
  supportsStyle: boolean;
  supportsSpeakerBoost: boolean;
  stabilityType: 'continuous' | 'discrete';
}

export const getModelCapabilities = (modelId: string): ModelCapabilities => {
  const defaults: ModelCapabilities = {
    supportsClarity: true,
    supportsStyle: true,
    supportsSpeakerBoost: true,
    stabilityType: 'continuous',
  };

  if (modelId.includes('_v1')) {
    return {
      ...defaults,
      supportsStyle: false,
      supportsSpeakerBoost: false,
    };
  }

  if (modelId.includes('turbo')) {
    return {
      ...defaults,
      stabilityType: 'discrete',
    };
  }
  
  if (modelId.includes('_v3')) {
      return {
          ...defaults,
          supportsClarity: false,
          supportsStyle: false,
          supportsSpeakerBoost: false,
      }
  }

  return defaults;
};

const fetchWithRetry = async (url: string, options: RequestInit, retries = 5, backoff = 500): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const retryAfterSeconds = parseInt(response.headers.get('Retry-After') || '0', 10);
        const jitter = Math.random() * 250;
        const waitTime = retryAfterSeconds > 0 ? retryAfterSeconds * 1000 + jitter : backoff + jitter;
        
        console.warn(`Rate limit hit. Retrying after ${Math.round(waitTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        backoff *= 1.5;
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, backoff));
      backoff *= 1.5;
    }
  }
  throw new Error('Failed to fetch after multiple retries.');
};

const handleError = async (response: Response) => {
    let message = `Request failed with status code ${response.status}`;
    try {
        const errorJson = await response.json();
        if (errorJson.detail && typeof errorJson.detail.message === 'string') {
            message = errorJson.detail.message;
        } 
        else if (Array.isArray(errorJson.detail) && errorJson.detail[0]?.msg) {
            message = errorJson.detail.map((d: any) => d.msg).join(', ');
        }
        else if (errorJson.error && typeof errorJson.error.message === 'string') {
            message = errorJson.error.message;
        }
    } catch (e) {
        message = response.statusText || 'An unknown API error occurred.';
    }
    throw new ApiError(`API Error: ${response.status}. ${message}`, response.status);
};

export const generateVoiceover = async (
  text: string, 
  voiceId: string, 
  voiceSettings: VoiceSettings, 
  modelId: string,
  previousRequestId?: string
): Promise<{ blob: Blob, requestId: string }> => {
  if (!voiceId) {
    throw new Error("ElevenLabs Voice ID is required.");
  }

  const PROXY_URL = `/api/v1/text-to-speech/${voiceId}`;
  
  const capabilities = getModelCapabilities(modelId);
  const settingsToSend: { [key: string]: any } = {
    stability: voiceSettings.stability,
    speed: 1.0,
  };

  if (capabilities.supportsClarity) settingsToSend.similarity_boost = voiceSettings.similarity_boost;
  if (capabilities.supportsStyle && voiceSettings.style !== undefined) settingsToSend.style = voiceSettings.style;
  if (capabilities.supportsSpeakerBoost && voiceSettings.use_speaker_boost !== undefined) settingsToSend.use_speaker_boost = voiceSettings.use_speaker_boost;
  
  const body = {
    text: text,
    model_id: modelId,
    voice_settings: settingsToSend,
    ...(previousRequestId && { previous_request_ids: [previousRequestId] }),
  };

  const response = await fetchWithRetry(PROXY_URL, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) await handleError(response);

  const audioBlob = await response.blob();
  const requestId = response.headers.get('xi-request-id') || '';
  
  return { blob: audioBlob, requestId };
};

export const getVoices = async (): Promise<VoicesResponse> => {
  const response = await fetch('/api/v1/voices', {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) await handleError(response);
  return response.json();
};

export const getVoice = async (voiceId: string): Promise<Voice> => {
  if (!voiceId) throw new Error("Voice ID is required.");
  const response = await fetch(`/api/v1/voices/${voiceId}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) await handleError(response);
  return response.json();
};

export const searchSharedVoices = async (searchTerm: string): Promise<SharedVoicesResponse> => {
  if (!searchTerm.trim()) throw new Error("Search term is required.");
  const response = await fetch(`/api/v1/shared-voices?search=${encodeURIComponent(searchTerm)}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) await handleError(response);
  return response.json();
};

export const addSharedVoice = async (publicUserId: string, voiceId: string, newName: string): Promise<{ voice_id: string }> => {
  const response = await fetch(`/api/v1/voices/add/${publicUserId}/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ new_name: newName }),
  });
  if (!response.ok) await handleError(response);
  return response.json();
};

export const getModels = async (): Promise<Model[]> => {
  const response = await fetch('/api/v1/models', {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) await handleError(response);
  return response.json();
};
