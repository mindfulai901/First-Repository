// WARNING: Making API calls from the frontend with a secret API key is NOT secure.
// This key can be easily intercepted by anyone inspecting your web application's traffic.
// In a real-world, production application, you should proxy these requests through your own backend server,
// where the API key can be stored securely as an environment variable.
// This implementation is for demonstration purposes only.

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

/**
 * Generates a voiceover from text using the real ElevenLabs API.
 * @param text The text to convert to speech.
 * @param voiceId The ID of the voice to use.
 * @param apiKey Your ElevenLabs API key.
 * @param voiceSettings The settings for the voice generation.
 * @param modelId The ID of the model to use for generation.
 * @param previousRequestId Optional ID of the previous request for continuity.
 * @returns A Promise that resolves with a Blob containing the audio data and the request ID.
 */
export const generateVoiceover = async (
  text: string, 
  voiceId: string, 
  apiKey: string, 
  voiceSettings: VoiceSettings, 
  modelId: string,
  previousRequestId?: string
): Promise<{ blob: Blob, requestId: string }> => {
  if (!apiKey) {
    throw new Error("ElevenLabs API key is required.");
  }
  if (!voiceId) {
    throw new Error("ElevenLabs Voice ID is required.");
  }

  const API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
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

  const response = await fetchWithRetry(API_URL, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });


  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: { message: 'An unknown API error occurred.' } }));
    throw new ApiError(`API Error: ${response.status} ${response.statusText}. ${errorData.detail?.message || ''}`, response.status);
  }

  const audioBlob = await response.blob();
  const requestId = response.headers.get('xi-request-id') || '';
  
  return { blob: audioBlob, requestId };
};


/**
 * Fetches the list of available voices from the ElevenLabs API.
 * @param apiKey Your ElevenLabs API key.
 * @returns A Promise that resolves with an array of Voice objects.
 */
export const getVoices = async (apiKey: string): Promise<VoicesResponse> => {
  if (!apiKey) {
    throw new Error("ElevenLabs API key is required to fetch voices.");
  }

  const API_URL = 'https://api.elevenlabs.io/v1/voices';

  const response = await fetch(API_URL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: { message: 'Failed to parse error response.' } }));
    throw new ApiError(`API Error: ${response.status} ${response.statusText}. ${errorData.detail?.message || ''}`, response.status);
  }
  return response.json();
};

/**
 * Fetches the details for a single voice from the ElevenLabs API.
 * @param voiceId The ID of the voice to fetch.
 * @param apiKey Your ElevenLabs API key.
 * @returns A Promise that resolves with a Voice object.
 */
export const getVoice = async (voiceId: string, apiKey: string): Promise<Voice> => {
  if (!apiKey) {
    throw new Error("ElevenLabs API key is required.");
  }
  if (!voiceId) {
    throw new Error("Voice ID is required.");
  }

  const API_URL = `https://api.elevenlabs.io/v1/voices/${voiceId}`;

  const response = await fetch(API_URL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: { message: 'Failed to parse error response.' } }));
    // Use the specific message from the API for better user feedback.
    const message = errorData.detail?.message || `Could not find a voice with that ID.`;
    throw new ApiError(`API Error: ${message}`, response.status);
  }

  return response.json();
};

/**
 * Searches the public shared voices library.
 * @param searchTerm The voice ID or name to search for.
 * @param apiKey Your ElevenLabs API key.
 * @returns A Promise that resolves with a list of shared voices.
 */
export const searchSharedVoices = async (searchTerm: string, apiKey: string): Promise<SharedVoicesResponse> => {
  if (!apiKey) throw new Error("ElevenLabs API key is required.");
  if (!searchTerm.trim()) throw new Error("Search term is required.");

  const API_URL = `https://api.elevenlabs.io/v1/shared-voices?search=${encodeURIComponent(searchTerm)}`;

  const response = await fetch(API_URL, {
    method: 'GET',
    headers: { 'Accept': 'application/json', 'xi-api-key': apiKey },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: { message: 'Failed to parse error response.' } }));
    throw new ApiError(`API Error: ${response.status} ${response.statusText}. ${errorData.detail?.message || ''}`, response.status);
  }
  return response.json();
};

/**
 * Adds a shared voice to the user's voice library.
 * @param publicUserId The public user ID of the voice owner.
 * @param voiceId The ID of the voice to add.
 * @param newName The name to give the new voice in the user's library.
 * @param apiKey Your ElevenLabs API key.
 * @returns A promise that resolves with the new voice ID.
 */
export const addSharedVoice = async (publicUserId: string, voiceId: string, newName: string, apiKey: string): Promise<{ voice_id: string }> => {
  if (!apiKey) throw new Error("ElevenLabs API key is required.");

  const API_URL = `https://api.elevenlabs.io/v1/voices/add/${publicUserId}/${voiceId}`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({ new_name: newName }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: { message: 'Failed to parse error response.' } }));
    throw new ApiError(`API Error: ${response.status} ${response.statusText}. ${errorData.detail?.message || 'Failed to add voice.'}`, response.status);
  }
  return response.json();
};

/**
 * Fetches the list of available models from the ElevenLabs API.
 * @param apiKey Your ElevenLabs API key.
 * @returns A Promise that resolves with an array of Model objects.
 */
export const getModels = async (apiKey: string): Promise<Model[]> => {
  if (!apiKey) {
    throw new Error("ElevenLabs API key is required to fetch models.");
  }

  const API_URL = 'https://api.elevenlabs.io/v1/models';

  const response = await fetch(API_URL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: { message: 'Failed to parse error response.' } }));
    throw new ApiError(`API Error: ${response.status} ${response.statusText}. ${errorData.detail?.message || ''}`, response.status);
  }
  return response.json();
};