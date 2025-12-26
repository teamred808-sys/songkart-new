import { useState, useCallback } from 'react';
import * as lamejsModule from 'lamejs';
import { PREVIEW_CONSTANTS } from '@/lib/previewConstants';

// Handle CJS/ESM interop - lamejs uses module.exports which Vite wraps differently
const getLamejs = () => {
  const mod = lamejsModule as any;
  return mod.default || mod;
};

interface PreviewGeneratorState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
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
 * Client-side audio preview generator using Web Audio API + lamejs MP3 encoder
 * Generates a compressed 64kbps MP3 preview from the original audio file
 */
export function useAudioPreviewGenerator() {
  const [state, setState] = useState<PreviewGeneratorState>({
    isGenerating: false,
    progress: 0,
    error: null,
  });

  const generatePreview = useCallback(async (audioFile: File): Promise<PreviewResult | null> => {
    setState({ isGenerating: true, progress: 0, error: null });

    try {
      // Step 1: Read the audio file
      setState(prev => ({ ...prev, progress: 10 }));
      const arrayBuffer = await audioFile.arrayBuffer();

      // Step 2: Decode the audio
      setState(prev => ({ ...prev, progress: 20 }));
      const audioContext = new AudioContext({ sampleRate: PREVIEW_SAMPLE_RATE });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Step 3: Validate and calculate preview duration (max 45 seconds)
      const originalDuration = audioBuffer.duration;
      
      if (originalDuration <= 0) {
        throw new Error('Audio file appears to be empty or invalid (duration: 0)');
      }
      
      const previewDuration = Math.min(originalDuration, PREVIEW_MAX_DURATION);
      const previewSamples = Math.floor(previewDuration * PREVIEW_SAMPLE_RATE);

      setState(prev => ({ ...prev, progress: 40 }));

      // Step 4: Create a new buffer with limited duration and mono audio
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

      // Step 5: Render the audio
      const renderedBuffer = await offlineContext.startRendering();

      setState(prev => ({ ...prev, progress: 80 }));

      // Step 6: Encode to MP3 (64 kbps for small file size)
      const mp3Blob = encodeMP3(renderedBuffer);

      setState(prev => ({ ...prev, progress: 100 }));

      // Clean up
      await audioContext.close();

      console.log(`[Preview Generator] Created MP3 preview: ${(mp3Blob.size / 1024).toFixed(1)} KB, ${previewDuration.toFixed(1)}s`);

      return {
        blob: mp3Blob,
        duration: previewDuration,
        size: mp3Blob.size,
      };
    } catch (error) {
      console.error('[Preview Generator] Error:', error);
      const lamejs = getLamejs();
      console.error('[Preview Generator] lamejs available:', typeof lamejs);
      console.error('[Preview Generator] Mp3Encoder available:', typeof lamejs?.Mp3Encoder);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to generate preview' 
      }));
      return null;
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  }, []);

  return {
    generatePreview,
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,
  };
}

/**
 * Encode an AudioBuffer to MP3 format using lamejs
 * Output: 64 kbps mono MP3
 */
function encodeMP3(audioBuffer: AudioBuffer): Blob {
  const channelData = audioBuffer.getChannelData(0); // Mono
  const sampleRate = audioBuffer.sampleRate;
  
  // Convert Float32Array to Int16Array for lamejs
  const samples = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Get Mp3Encoder with CJS/ESM interop fallback
  const lamejs = getLamejs();
  const Mp3EncoderClass = lamejs.Mp3Encoder;
  
  if (!Mp3EncoderClass) {
    throw new Error('Mp3Encoder not available. The lamejs library may not have loaded correctly.');
  }
  
  // Initialize MP3 encoder (mono, 44100Hz, 64kbps)
  const mp3encoder = new Mp3EncoderClass(1, sampleRate, PREVIEW_BITRATE);
  
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
  
  return new Blob(mp3Data, { type: 'audio/mp3' });
}
