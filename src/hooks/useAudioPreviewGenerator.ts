import { useState, useCallback } from 'react';

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

const PREVIEW_MAX_DURATION = 45; // seconds
const PREVIEW_SAMPLE_RATE = 44100;
const PREVIEW_BITRATE = 96000; // 96 kbps approximation

/**
 * Client-side audio preview generator using Web Audio API
 * Generates a compressed, duration-limited preview from the original audio file
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

      // Step 3: Calculate preview duration (max 45 seconds)
      const originalDuration = audioBuffer.duration;
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

      // Step 6: Encode to WAV (most compatible format for web)
      const wavBlob = encodeWAV(renderedBuffer);

      setState(prev => ({ ...prev, progress: 100 }));

      // Clean up
      await audioContext.close();

      console.log(`[Preview Generator] Created preview: ${(wavBlob.size / 1024).toFixed(1)} KB, ${previewDuration.toFixed(1)}s`);

      return {
        blob: wavBlob,
        duration: previewDuration,
        size: wavBlob.size,
      };
    } catch (error) {
      console.error('[Preview Generator] Error:', error);
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
 * Encode an AudioBuffer to WAV format
 */
function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  // Get audio data
  const channelData = audioBuffer.getChannelData(0); // Mono
  const samples = channelData.length;
  
  // Calculate sizes
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const dataSize = samples * numChannels * (bitDepth / 8);
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write audio data
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    // Convert float to 16-bit PCM
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
