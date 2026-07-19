/**
 * Voice transcription helper - Manus Forge API dependency removed
 * For local development, this is a stub implementation
 * For production, implement your own transcription backend (e.g., OpenAI Whisper, Google Speech-to-Text)
 */

export type TranscribeOptions = {
  audioUrl: string; // URL to the audio file
  language?: string; // Optional: specify language code
  prompt?: string; // Optional: custom prompt for the transcription
};

export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

export type TranscribeResponse = {
  text: string;
  language: string;
  segments?: WhisperSegment[];
  error?: string;
  code?: string;
  details?: string;
};

export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscribeResponse> {
  console.warn(
    "[Voice Transcription] transcribeAudio called but not implemented for local auth. URL:",
    options.audioUrl
  );

  // Return a stub response for local development
  return {
    text: "[Transcription not available in local mode]",
    language: options.language || "en",
    segments: [],
    error: "Transcription service not configured",
    code: "NOT_IMPLEMENTED",
    details: "Voice transcription requires external service configuration",
  };
}
