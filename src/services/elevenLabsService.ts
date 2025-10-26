import type { Voice, VoicesResponse, VoiceSettings, SharedVoicesResponse, Model } from '../types';

// Custom error class to include HTTP status codes for better error handling.
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

/**
 * Determines the supported voice setting capabilities for a given model ID.
 * @param modelId The ID of the model.
 * @returns An object describing the model's capabilities.
 */
export const getModelCapabilities = (modelId: string): ModelCapabilities => {
  // Default to the most feature-rich (v2)
  const defaults: ModelCapabilities = {
    supportsClarity: true,
    supportsStyle: true,
    supportsSpeakerBoost: true,
    stabilityType: 'continuous',
  };

  // V1 models are basic
  if (modelId.includes('_v1')) {
    return {
      ...defaults,
      supportsStyle: false,
      supportsSpeakerBoost: false,
    };
  }

  // Turbo models have discrete stability
  if (modelId.includes('turbo')) {
    return {
      ...defaults,
      stabilityType: 'discrete',
    };
  }
  
  // V3 models (based on user feedback) are stability-only
  if (modelId.includes('_v3')) {
      return {
          ...defaults,
          supportsClarity: false,
          supportsStyle: false,
          supportsSpeakerBoost: false,
      }
  }

  // Otherwise, return the v2 defaults
  return defaults;
};


/**
 * A helper function for retrying fetch requests with exponential backoff,
 * specifically for handling 429 rate limit errors.
 */
const fetchWithRetry = async (url: string, options: RequestInit, retries = 5, backoff = 500): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        // Respect Retry-After header if present, otherwise use exponential backoff
        const retryAfterSeconds = parseInt(response.headers.get('Retry-After') || '0', 10);
        const jitter = Math.random() * 250; // Add jitter to avoid thundering herd
        const waitTime = retryAfterSeconds > 0 ? retryAfterSeconds * 1000 + jitter : backoff + jitter;
        
        console.warn(`Rate limit hit. Retrying after ${Math.round(waitTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        backoff *= 1.5; // Exponential backoff
        continue; // Retry the request
      }
      return response; // Success or a non-429 error
    } catch (error) {
      if (i === retries - 1) throw error; // Rethrow on the last attempt
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
        message = errorJson?.detail?.message || errorJson?.error?.message || JSON.stringify(errorJson.detail);
    } catch (e) {
        message = response.statusText || 'An unknown API error occurred.';
    }
    throw new ApiError(`API Error: ${response.status}. ${message}`, response.status);
};

/**
 * Generates a voiceover from text using the real ElevenLabs API via a proxy.
 * @param text The text to convert to speech.
 * @param voiceId The ID of the voice to use.
 * @param voiceSettings The settings for the voice generation.
 * @param modelId The ID of the model to use for generation.
 * @param previousRequestId Optional ID of the previous request for continuity.
 * @returns A Promise that resolves with a Blob containing the audio data and the request ID.
 */
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
    speed: 1.0, // Lock speed to 1.0 as per spec for consistency
  };

  if (capabilities.supportsClarity) {
    settingsToSend.similarity_boost = voiceSettings.similarity_boost;
  }
  if (capabilities.supportsStyle && voiceSettings.style !== undefined) {
    settingsToSend.style = voiceSettings.style;
  }
  if (capabilities.supportsSpeakerBoost && voiceSettings.use_speaker_boost !== undefined) {
    settingsToSend.use_speaker_boost = voiceSettings.use_speaker_boost;
  }
  
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
  const response = await fetch('/api/v1/voices');
  if (!response.ok) await handleError(response);
  return response.json();
};

export const getVoice = async (voiceId: string): Promise<Voice> => {
  if (!voiceId) throw new Error("Voice ID is required.");
  const response = await fetch(`/api/v1/voices/${voiceId}`);
  if (!response.ok) await handleError(response);
  return response.json();
};

export const searchSharedVoices = async (searchTerm: string): Promise<SharedVoicesResponse> => {
  if (!searchTerm.trim()) throw new Error("Search term is required.");
  const response = await fetch(`/api/v1/shared-voices?search=${encodeURIComponent(searchTerm)}`);
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
  const response = await fetch('/api/v1/models');
  if (!response.ok) await handleError(response);
  return response.json();
};
