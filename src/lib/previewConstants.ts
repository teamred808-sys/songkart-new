/**
 * MVP Audio Preview System Constants
 * 
 * These values define the authoritative constraints for preview generation
 * and validation. The server (validate-preview edge function) is the 
 * enforcement authority.
 * 
 * Architecture: Client-side generation
 * Preview files are generated on the seller's device during upload using 
 * Web Audio API and lamejs MP3 encoder. The server validates but does not 
 * transcode. Sellers must remain on the upload page during processing.
 */

export const PREVIEW_CONSTANTS = {
  // Duration
  MAX_DURATION_SECONDS: 45,
  
  // File size (primary VBR-safe enforcement mechanism)
  MAX_FILE_SIZE_BYTES: 450 * 1024, // 450 KB
  MIN_FILE_SIZE_BYTES: 4 * 1024,   // 4 KB (corruption detection)
  
  // Bitrate (client target vs server tolerance)
  CLIENT_TARGET_BITRATE_KBPS: 64,
  SERVER_MAX_BITRATE_KBPS: 72,
  
  // Audio parameters
  SAMPLE_RATE: 44100,
  CHANNELS: 1, // Mono
  
  // Format
  FORMAT: 'audio/mp3',
  FILE_EXTENSION: '.mp3',
  
  // Storage
  BUCKET_NAME: 'song-previews',
} as const;

// Derived values for convenience
export const PREVIEW_MAX_SIZE_KB = Math.round(PREVIEW_CONSTANTS.MAX_FILE_SIZE_BYTES / 1024);
export const PREVIEW_MAX_SIZE_MB = (PREVIEW_CONSTANTS.MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(2);
