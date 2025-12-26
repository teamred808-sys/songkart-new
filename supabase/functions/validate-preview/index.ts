import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation constants
const MAX_DURATION_SECONDS = 45;
const MAX_BITRATE_KBPS = 72; // Allow tolerance above 64kbps
const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500KB

interface ValidationResult {
  success: boolean;
  error?: string;
  message?: string;
  details?: {
    actual_duration?: number;
    max_duration?: number;
    actual_bitrate?: number;
    max_bitrate?: number;
    file_size?: number;
    max_file_size?: number;
  };
  data?: {
    preview_url: string;
    duration_seconds: number;
    bitrate_kbps: number;
    file_size_bytes: number;
  };
}

// MP3 bitrate table for MPEG Audio Layer 3
const BITRATE_TABLE: { [key: number]: number } = {
  0b0001: 32,
  0b0010: 40,
  0b0011: 48,
  0b0100: 56,
  0b0101: 64,
  0b0110: 80,
  0b0111: 96,
  0b1000: 112,
  0b1001: 128,
  0b1010: 160,
  0b1011: 192,
  0b1100: 224,
  0b1101: 256,
  0b1110: 320,
};

// Sample rate table for MPEG Audio Version 1
const SAMPLE_RATE_TABLE: { [key: number]: number } = {
  0b00: 44100,
  0b01: 48000,
  0b10: 32000,
};

/**
 * Check if bytes represent a valid MP3 file
 */
function isValidMP3(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  
  // Check for ID3v2 header
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return true;
  }
  
  // Check for MP3 frame sync (0xFF followed by 0xFB, 0xFA, 0xF3, 0xF2, etc.)
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
    return true;
  }
  
  // Search for first frame sync within first 4KB (after potential ID3 tag)
  for (let i = 0; i < Math.min(bytes.length - 1, 4096); i++) {
    if (bytes[i] === 0xFF && (bytes[i + 1] & 0xE0) === 0xE0) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find the first MP3 frame header position (after ID3 tag if present)
 */
function findFirstFrame(bytes: Uint8Array): number {
  let offset = 0;
  
  // Skip ID3v2 tag if present
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    // ID3v2 header: "ID3" + version (2 bytes) + flags (1 byte) + size (4 bytes)
    if (bytes.length < 10) return -1;
    
    // Size is encoded as synchsafe integer (7 bits per byte)
    const size = ((bytes[6] & 0x7F) << 21) |
                 ((bytes[7] & 0x7F) << 14) |
                 ((bytes[8] & 0x7F) << 7) |
                 (bytes[9] & 0x7F);
    offset = 10 + size;
  }
  
  // Search for frame sync
  for (let i = offset; i < bytes.length - 3; i++) {
    if (bytes[i] === 0xFF && (bytes[i + 1] & 0xE0) === 0xE0) {
      // Verify it's a valid MPEG Audio frame header
      const version = (bytes[i + 1] >> 3) & 0x03;
      const layer = (bytes[i + 1] >> 1) & 0x03;
      
      // We want MPEG Version 1, Layer 3 (most common MP3)
      // or MPEG Version 2/2.5 Layer 3
      if (layer === 0x01) { // Layer 3
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Parse MP3 frame header to extract bitrate and sample rate
 */
function parseMP3Header(bytes: Uint8Array, frameStart: number): { bitrate: number; sampleRate: number } | null {
  if (frameStart < 0 || frameStart + 4 > bytes.length) {
    return null;
  }
  
  const header = bytes.slice(frameStart, frameStart + 4);
  
  // Verify frame sync
  if (header[0] !== 0xFF || (header[1] & 0xE0) !== 0xE0) {
    return null;
  }
  
  const bitrateIndex = (header[2] >> 4) & 0x0F;
  const sampleRateIndex = (header[2] >> 2) & 0x03;
  
  const bitrate = BITRATE_TABLE[bitrateIndex];
  const sampleRate = SAMPLE_RATE_TABLE[sampleRateIndex];
  
  if (!bitrate || !sampleRate) {
    // Try alternative bitrate calculation for VBR or non-standard
    return null;
  }
  
  return { bitrate, sampleRate };
}

/**
 * Calculate duration from file size and bitrate (for CBR MP3)
 */
function calculateDuration(fileSize: number, bitrate: number): number {
  // duration = (fileSize * 8) / (bitrate * 1000)
  return (fileSize * 8) / (bitrate * 1000);
}

/**
 * Validate the MP3 file against platform rules
 */
function validatePreview(bytes: Uint8Array): ValidationResult {
  const fileSize = bytes.length;
  
  // 1. Check file size first (quick check)
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: 'FILE_TOO_LARGE',
      message: `Preview file too large (${(fileSize / 1024).toFixed(1)}KB). Maximum: ${MAX_FILE_SIZE_BYTES / 1024}KB`,
      details: {
        file_size: fileSize,
        max_file_size: MAX_FILE_SIZE_BYTES,
      },
    };
  }
  
  // 2. Check MP3 format
  if (!isValidMP3(bytes)) {
    return {
      success: false,
      error: 'INVALID_FORMAT',
      message: 'Preview must be in MP3 format',
      details: { file_size: fileSize },
    };
  }
  
  // 3. Find and parse MP3 frame header
  const frameStart = findFirstFrame(bytes);
  if (frameStart < 0) {
    return {
      success: false,
      error: 'INVALID_MP3_HEADER',
      message: 'Could not find valid MP3 frame header',
      details: { file_size: fileSize },
    };
  }
  
  const headerInfo = parseMP3Header(bytes, frameStart);
  
  // If we can't parse the header, estimate based on file size
  let bitrate = headerInfo?.bitrate || 64;
  let duration = calculateDuration(fileSize, bitrate);
  
  // If we couldn't get exact bitrate, try to estimate from expected parameters
  // A 45-second 64kbps MP3 should be around 360KB
  if (!headerInfo) {
    // Estimate bitrate from file size assuming max duration
    const estimatedBitrate = (fileSize * 8) / (MAX_DURATION_SECONDS * 1000);
    bitrate = Math.round(estimatedBitrate);
    duration = MAX_DURATION_SECONDS; // Assume max if we can't parse
    
    console.log(`Could not parse MP3 header, estimating: bitrate=${bitrate}kbps, duration=${duration}s`);
  }
  
  // 4. Check bitrate
  if (bitrate > MAX_BITRATE_KBPS) {
    return {
      success: false,
      error: 'INVALID_BITRATE',
      message: `Preview bitrate (${bitrate}kbps) exceeds limit of ${MAX_BITRATE_KBPS}kbps`,
      details: {
        actual_bitrate: bitrate,
        max_bitrate: MAX_BITRATE_KBPS,
        file_size: fileSize,
      },
    };
  }
  
  // 5. Check duration
  if (duration > MAX_DURATION_SECONDS + 1) { // Allow 1 second tolerance
    return {
      success: false,
      error: 'INVALID_DURATION',
      message: `Preview duration (${duration.toFixed(1)}s) exceeds limit of ${MAX_DURATION_SECONDS}s`,
      details: {
        actual_duration: duration,
        max_duration: MAX_DURATION_SECONDS,
        actual_bitrate: bitrate,
        file_size: fileSize,
      },
    };
  }
  
  // All validations passed
  return {
    success: true,
    data: {
      preview_url: '', // Will be set after upload
      duration_seconds: Math.round(duration * 10) / 10,
      bitrate_kbps: bitrate,
      file_size_bytes: fileSize,
    },
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'Invalid user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const songId = formData.get('songId') as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'MISSING_FILE', message: 'No preview file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!songId) {
      return new Response(
        JSON.stringify({ success: false, error: 'MISSING_SONG_ID', message: 'No song ID provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validating preview for song ${songId}: ${file.name}, ${file.size} bytes`);

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Validate the preview file
    const validation = validatePreview(bytes);

    if (!validation.success) {
      console.log(`Preview validation failed: ${validation.error} - ${validation.message}`);
      return new Response(
        JSON.stringify(validation),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Preview validated: duration=${validation.data?.duration_seconds}s, bitrate=${validation.data?.bitrate_kbps}kbps`);

    // Upload to storage
    const previewPath = `${user.id}/${Date.now()}-preview.mp3`;
    const { error: uploadError } = await supabase.storage
      .from('song-previews')
      .upload(previewPath, bytes, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'UPLOAD_FAILED', 
          message: 'Failed to upload preview file',
          details: { storage_error: uploadError.message }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('song-previews')
      .getPublicUrl(previewPath);

    console.log(`Preview uploaded: ${publicUrl}`);

    // Return success with preview data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          preview_url: publicUrl,
          duration_seconds: validation.data?.duration_seconds,
          bitrate_kbps: validation.data?.bitrate_kbps,
          file_size_bytes: validation.data?.file_size_bytes,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'INTERNAL_ERROR', 
        message: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
