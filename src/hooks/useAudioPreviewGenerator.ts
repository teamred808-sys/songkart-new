import { useState, useCallback } from 'react';
import { PREVIEW_CONSTANTS } from '@/lib/previewConstants';

// Static import for reliable CJS module resolution
import * as lamejsModule from 'lamejs';

// Cached Mp3Encoder class for reuse
let cachedMp3Encoder: any = null;

/**
 * Extract Mp3Encoder from a module with various possible structures
 */
function extractEncoder(module: any, source: string): any {
  if (!module) return null;
  
  const keys = Object.keys(module || {});
  console.log(`[lamejs:${source}] Module type: ${typeof module}, keys: [${keys.join(', ')}]`);
  
  // Pattern 1: Direct named export (module.Mp3Encoder)
  if (typeof module.Mp3Encoder === 'function') {
    console.log(`[lamejs:${source}] Found via direct named export`);
    return module.Mp3Encoder;
  }
  
  // Pattern 2: Vite ESM wrapper (module.default.Mp3Encoder)
  if (module.default && typeof module.default.Mp3Encoder === 'function') {
    console.log(`[lamejs:${source}] Found via default.Mp3Encoder`);
    return module.default.Mp3Encoder;
  }
  
  // Pattern 3: Double default wrapper (module.default.default.Mp3Encoder)
  if (module.default?.default && typeof module.default.default.Mp3Encoder === 'function') {
    console.log(`[lamejs:${source}] Found via default.default.Mp3Encoder`);
    return module.default.default.Mp3Encoder;
  }
  
  // Pattern 4: Module.default IS the encoder (unusual but possible)
  if (typeof module.default === 'function' && module.default.length === 3) {
    console.log(`[lamejs:${source}] Found via default (direct constructor)`);
    return module.default;
  }
  
  // Pattern 5: Check if module itself is the constructor
  if (typeof module === 'function' && module.length === 3) {
    console.log(`[lamejs:${source}] Module itself is the constructor`);
    return module;
  }
  
  console.log(`[lamejs:${source}] Could not find Mp3Encoder`);
  return null;
}

/**
 * Get Mp3Encoder class with robust CJS/ESM interop handling
 * Uses static import first, then falls back to dynamic import
 */
async function getMp3Encoder(): Promise<any> {
  if (cachedMp3Encoder) {
    console.log('[lamejs] Using cached encoder');
    return cachedMp3Encoder;
  }

  console.log('[lamejs] Resolving Mp3Encoder...');
  
  // First, try to extract from static import
  let encoder = extractEncoder(lamejsModule, 'static');
  
  // If static import failed, try dynamic import
  if (!encoder) {
    console.log('[lamejs] Static import failed, trying dynamic import...');
    try {
      const dynamicModule = await import('lamejs');
      encoder = extractEncoder(dynamicModule, 'dynamic');
    } catch (dynamicError) {
      console.error('[lamejs] Dynamic import also failed:', dynamicError);
    }
  }

  if (!encoder || typeof encoder !== 'function') {
    throw new Error('Mp3Encoder not found. Please refresh the page and try again.');
  }

  console.log('[lamejs] Mp3Encoder resolved successfully');
  cachedMp3Encoder = encoder;
  return encoder;
}

// Supported audio formats for client-side preview generation
const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3', 
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
];

// User-friendly format names
const FORMAT_NAMES: Record<string, string> = {
  'audio/mpeg': 'MP3',
  'audio/mp3': 'MP3',
  'audio/wav': 'WAV',
  'audio/x-wav': 'WAV',
  'audio/wave': 'WAV',
  'audio/flac': 'FLAC',
  'audio/x-flac': 'FLAC',
  'audio/aac': 'AAC',
  'audio/mp4': 'M4A/AAC',
  'audio/x-m4a': 'M4A',
  'audio/ogg': 'OGG',
};

export type PreviewErrorType = 
  | 'unsupported_format'
  | 'decode_failed'
  | 'empty_audio'
  | 'encoder_unavailable'
  | 'browser_limitation'
  | 'context_suspended'
  | 'unknown';

export interface PreviewError {
  type: PreviewErrorType;
  message: string;
  userMessage: string;
  suggestion?: string;
}

interface PreviewGeneratorState {
  isGenerating: boolean;
  progress: number;
  error: PreviewError | null;
  browserWarning: string | null;
}

interface PreviewResult {
  blob: Blob;
  duration: number;
  size: number;
}

// Use centralized constants
const PREVIEW_MAX_DURATION = PREVIEW_CONSTANTS.MAX_DURATION_SECONDS;
const PREVIEW_SAMPLE_RATE = PREVIEW_CONSTANTS.SAMPLE_RATE;
const PREVIEW_BITRATE = PREVIEW_CONSTANTS.CLIENT_TARGET_BITRATE_KBPS;

/**
 * Detect browser limitations that may affect audio processing
 */
function detectBrowserLimitations(): string | null {
  const ua = navigator.userAgent;
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid;
  
  if (isIOS) {
    return 'iOS Safari has limited audio processing capabilities. For best results, use Chrome or Firefox on a desktop computer.';
  }
  if (isSafari && !isIOS) {
    return 'Safari may have issues with some audio formats. If processing fails, try Chrome or Firefox.';
  }
  if (isMobile) {
    return 'Mobile browsers may have slower or less reliable audio processing. For best results, use a desktop browser.';
  }
  return null;
}

/**
 * Validate audio file format before processing
 */
function validateAudioFormat(file: File): { valid: boolean; error?: PreviewError } {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Check by MIME type first
  if (SUPPORTED_AUDIO_TYPES.includes(fileType)) {
    return { valid: true };
  }
  
  // Fallback: check by file extension if MIME type is missing/generic
  if (!fileType || fileType === 'application/octet-stream') {
    if (fileName.endsWith('.mp3')) {
      return { valid: true };
    }
    if (fileName.endsWith('.wav')) {
      return { valid: true };
    }
  }
  
  // Determine user-friendly format name
  const formatName = FORMAT_NAMES[fileType] || fileType || 'unknown';
  
  return {
    valid: false,
    error: {
      type: 'unsupported_format',
      message: `Unsupported audio format: ${fileType || 'unknown'}`,
      userMessage: `Unsupported format: ${formatName}`,
      suggestion: 'Please use MP3 or WAV format (16-bit or 24-bit). Other formats like FLAC, AAC, or M4A are not browser-compatible.',
    },
  };
}

/**
 * Create a structured error object
 */
function createError(
  type: PreviewErrorType,
  message: string,
  userMessage: string,
  suggestion?: string
): PreviewError {
  return { type, message, userMessage, suggestion };
}

/**
 * Client-side audio preview generator using Web Audio API + lamejs MP3 encoder
 * Generates a compressed 64kbps MP3 preview from the original audio file
 */
export function useAudioPreviewGenerator() {
  const [state, setState] = useState<PreviewGeneratorState>({
    isGenerating: false,
    progress: 0,
    error: null,
    browserWarning: detectBrowserLimitations(),
  });

  const generatePreview = useCallback(async (audioFile: File): Promise<PreviewResult | null> => {
    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      progress: 0, 
      error: null 
    }));

    let audioContext: AudioContext | null = null;

    try {
      // Step 0: Validate audio format FIRST
      const formatValidation = validateAudioFormat(audioFile);
      if (!formatValidation.valid && formatValidation.error) {
        console.error('[Preview Generator] Format validation failed:', formatValidation.error);
        setState(prev => ({ ...prev, error: formatValidation.error! }));
        return null;
      }

      // Step 1: Read the audio file
      setState(prev => ({ ...prev, progress: 10 }));
      console.log(`[Preview Generator] Reading file: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)} MB)`);
      
      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await audioFile.arrayBuffer();
      } catch (readError) {
        const error = createError(
          'unknown',
          `Failed to read file: ${readError}`,
          'Could not read the audio file',
          'The file may be corrupted. Please try a different file.'
        );
        setState(prev => ({ ...prev, error }));
        return null;
      }

      // Step 2: Create and EXPLICITLY RESUME AudioContext
      setState(prev => ({ ...prev, progress: 20 }));
      
      try {
        audioContext = new AudioContext({ sampleRate: PREVIEW_SAMPLE_RATE });
      } catch (contextError) {
        const error = createError(
          'browser_limitation',
          `Failed to create AudioContext: ${contextError}`,
          'Your browser does not support audio processing',
          'Please use a modern browser like Chrome, Firefox, or Edge.'
        );
        setState(prev => ({ ...prev, error }));
        return null;
      }

      // CRITICAL: Resume AudioContext (required for user gesture compliance)
      if (audioContext.state === 'suspended') {
        console.log('[Preview Generator] AudioContext suspended, attempting resume...');
        try {
          await audioContext.resume();
          console.log('[Preview Generator] AudioContext resumed successfully');
        } catch (resumeError) {
          const error = createError(
            'context_suspended',
            `Failed to resume AudioContext: ${resumeError}`,
            'Audio processing could not start',
            'Please click the submit button again. Your browser requires user interaction to process audio.'
          );
          setState(prev => ({ ...prev, error }));
          await audioContext.close();
          return null;
        }
      }

      // Step 3: Decode the audio with explicit error handling
      setState(prev => ({ ...prev, progress: 30 }));
      console.log('[Preview Generator] Decoding audio...');
      
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      } catch (decodeError: any) {
        console.error('[Preview Generator] Decode failed:', decodeError);
        
        // Provide specific error message based on common decode failures
        let suggestion = 'Please try converting your audio to MP3 format using a free tool like Audacity or an online converter.';
        let userMessage = 'Could not decode the audio file';
        
        if (decodeError.message?.includes('Unable to decode')) {
          userMessage = 'Browser cannot decode this audio format';
          suggestion = 'This file format is not supported for browser playback. Please convert to standard MP3 or 16-bit WAV.';
        }
        
        const error = createError(
          'decode_failed',
          `Audio decode failed: ${decodeError.message || decodeError}`,
          userMessage,
          suggestion
        );
        setState(prev => ({ ...prev, error }));
        await audioContext.close();
        return null;
      }

      // Step 4: Validate decoded audio
      const originalDuration = audioBuffer.duration;
      console.log(`[Preview Generator] Decoded: ${originalDuration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels, ${audioBuffer.sampleRate}Hz`);
      console.log(`[Preview Generator] Source audio: ${audioBuffer.numberOfChannels > 1 ? 'stereo' : 'mono'} (will be converted to mono for preview)`);
      
      if (originalDuration <= 0 || !isFinite(originalDuration)) {
        const error = createError(
          'empty_audio',
          `Invalid audio duration: ${originalDuration}`,
          'The audio file appears to be empty or corrupted',
          'Please check that your audio file plays correctly in a media player, then try again.'
        );
        setState(prev => ({ ...prev, error }));
        await audioContext.close();
        return null;
      }

      // Step 5: Calculate preview duration (max 45 seconds)
      const previewDuration = Math.min(originalDuration, PREVIEW_MAX_DURATION);
      const previewSamples = Math.floor(previewDuration * PREVIEW_SAMPLE_RATE);

      setState(prev => ({ ...prev, progress: 50 }));

      // Step 6: Create a new buffer with limited duration and mono audio
      const offlineContext = new OfflineAudioContext(
        1, // mono
        previewSamples,
        PREVIEW_SAMPLE_RATE
      );

      // Create a buffer source
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to destination
      source.connect(offlineContext.destination);
      source.start(0, 0, previewDuration);

      setState(prev => ({ ...prev, progress: 60 }));

      // Step 7: Render the audio
      console.log('[Preview Generator] Rendering offline audio...');
      let renderedBuffer: AudioBuffer;
      try {
        renderedBuffer = await offlineContext.startRendering();
      } catch (renderError) {
        const error = createError(
          'unknown',
          `Offline rendering failed: ${renderError}`,
          'Audio processing failed',
          'Please try again or use a different audio file.'
        );
        setState(prev => ({ ...prev, error }));
        await audioContext.close();
        return null;
      }

      setState(prev => ({ ...prev, progress: 80 }));

      // Step 8: Encode to MP3 (64 kbps for small file size)
      console.log('[Preview Generator] Loading MP3 encoder...');
      let mp3Blob: Blob;
      try {
        mp3Blob = await encodeMP3(renderedBuffer);
      } catch (encodeError: any) {
        console.error('[Preview Generator] Encode failed:', encodeError);
        
        const error = createError(
          'encoder_unavailable',
          `MP3 encoding failed: ${encodeError.message || encodeError}`,
          'MP3 encoding failed',
          'There was an issue with the audio encoder. Please refresh the page and try again.'
        );
        setState(prev => ({ ...prev, error }));
        await audioContext.close();
        return null;
      }

      setState(prev => ({ ...prev, progress: 100 }));

      // Clean up
      await audioContext.close();

      console.log(`[Preview Generator] Success! Created MP3 preview: ${(mp3Blob.size / 1024).toFixed(1)} KB, ${previewDuration.toFixed(1)}s`);

      return {
        blob: mp3Blob,
        duration: previewDuration,
        size: mp3Blob.size,
      };
    } catch (error: any) {
      console.error('[Preview Generator] Unexpected error:', error);
      
      const previewError = createError(
        'unknown',
        error.message || 'Unknown error during preview generation',
        'An unexpected error occurred',
        'Please refresh the page and try again. If the problem persists, try using a different audio file.'
      );
      setState(prev => ({ ...prev, error: previewError }));
      
      // Ensure AudioContext is closed
      if (audioContext) {
        try {
          await audioContext.close();
        } catch (e) {
          // Ignore close errors
        }
      }
      
      return null;
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  }, []);

  return {
    generatePreview,
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error?.userMessage || null,
    errorDetails: state.error,
    browserWarning: state.browserWarning,
  };
}

/**
 * Normalize Float32 audio data to prevent clipping
 * Especially important for 24-bit WAV files which may have peaks exceeding ±1.0 after decoding
 */
function normalizeAudioData(channelData: Float32Array): Float32Array {
  // Find peak amplitude
  let peak = 0;
  for (let i = 0; i < channelData.length; i++) {
    const abs = Math.abs(channelData[i]);
    if (abs > peak) peak = abs;
  }
  
  // If audio is already within safe range, return as-is
  if (peak <= 1.0 && peak > 0.001) {
    console.log(`[Normalizer] Peak: ${peak.toFixed(4)} - no normalization needed`);
    return channelData;
  }
  
  // If audio is very quiet or silent, return as-is
  if (peak < 0.001) {
    console.log(`[Normalizer] Peak: ${peak.toFixed(6)} - audio too quiet, skipping normalization`);
    return channelData;
  }
  
  // Normalize to 0.95 peak (leave headroom)
  const targetPeak = 0.95;
  const gain = targetPeak / peak;
  console.log(`[Normalizer] Peak: ${peak.toFixed(4)} - applying gain: ${gain.toFixed(4)} to normalize`);
  
  const normalized = new Float32Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    normalized[i] = channelData[i] * gain;
  }
  
  return normalized;
}

/**
 * Encode an AudioBuffer to MP3 format using lamejs
 * Output: 64 kbps mono MP3
 */
async function encodeMP3(audioBuffer: AudioBuffer): Promise<Blob> {
  // Validate audio buffer before processing
  if (audioBuffer.duration <= 0 || !isFinite(audioBuffer.duration)) {
    throw new Error('Audio buffer has invalid duration. The audio file may be corrupted or empty.');
  }
  
  const rawChannelData = audioBuffer.getChannelData(0); // Mono
  const sampleRate = audioBuffer.sampleRate;
  
  if (rawChannelData.length === 0) {
    throw new Error('Audio buffer contains no samples.');
  }
  
  // Normalize audio to prevent clipping (especially important for 24-bit WAV sources)
  const channelData = normalizeAudioData(rawChannelData);
  
  // Convert Float32Array to Int16Array for lamejs
  const samples = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    // Clamp to [-1, 1] range (should already be in range after normalization, but safety first)
    const s = Math.max(-1, Math.min(1, channelData[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Get Mp3Encoder with dynamic import for reliable CJS/ESM interop
  console.log('[MP3 Encoder] Getting encoder...');
  const Mp3EncoderClass = await getMp3Encoder();
  
  // Initialize MP3 encoder (mono, 44100Hz, 64kbps)
  const mp3encoder = new Mp3EncoderClass(1, sampleRate, PREVIEW_BITRATE);
  console.log('[MP3 Encoder] Encoder initialized, starting encoding...');
  
  // Encode in chunks and collect as BlobParts
  const mp3Data: BlobPart[] = [];
  const blockSize = 1152; // Standard MP3 frame size
  
  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, i + blockSize);
    const mp3buf = mp3encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      // Copy to a new ArrayBuffer to avoid SharedArrayBuffer issues
      const copy = new Uint8Array(mp3buf.length);
      copy.set(mp3buf);
      mp3Data.push(copy);
    }
  }
  
  // Flush remaining data
  const end = mp3encoder.flush();
  if (end.length > 0) {
    const copy = new Uint8Array(end.length);
    copy.set(end);
    mp3Data.push(copy);
  }
  
  if (mp3Data.length === 0) {
    throw new Error('MP3 encoding produced no output. The audio file may be too short or corrupted.');
  }
  
  return new Blob(mp3Data, { type: 'audio/mp3' });
}
