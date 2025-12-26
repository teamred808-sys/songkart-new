import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// VALIDATION CONSTANTS - Single source of truth
// =============================================================================

const MAX_DURATION_SECONDS = 45;
const MAX_BITRATE_KBPS = 72; // Normalized limit (tolerance for lamejs ~64kbps output)
const MIN_BITRATE_KBPS = 32; // Minimum expected for valid audio

// Size-first enforcement: Primary mechanism for VBR-safe duration validation
// 45 seconds @ 72kbps = 405KB, add 15% tolerance = ~465KB
// Use 450KB as strict limit to catch any oversized files
const MAX_FILE_SIZE_BYTES = 450 * 1024;

// Minimum size to detect corrupted/empty files (1 second @ 32kbps = 4KB)
const MIN_FILE_SIZE_BYTES = 4 * 1024;

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
    validated_at: string;
  };
}

// MP3 bitrate table for MPEG Audio Layer 3 (Version 1)
const BITRATE_TABLE_V1_L3: { [key: number]: number } = {
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

// MP3 bitrate table for MPEG Audio Layer 3 (Version 2/2.5)
const BITRATE_TABLE_V2_L3: { [key: number]: number } = {
  0b0001: 8,
  0b0010: 16,
  0b0011: 24,
  0b0100: 32,
  0b0101: 40,
  0b0110: 48,
  0b0111: 56,
  0b1000: 64,
  0b1001: 80,
  0b1010: 96,
  0b1011: 112,
  0b1100: 128,
  0b1101: 144,
  0b1110: 160,
};

// Sample rate tables
const SAMPLE_RATE_TABLE_V1: { [key: number]: number } = {
  0b00: 44100,
  0b01: 48000,
  0b10: 32000,
};

const SAMPLE_RATE_TABLE_V2: { [key: number]: number } = {
  0b00: 22050,
  0b01: 24000,
  0b10: 16000,
};

const SAMPLE_RATE_TABLE_V25: { [key: number]: number } = {
  0b00: 11025,
  0b01: 12000,
  0b10: 8000,
};

/**
 * Check if bytes represent a valid MP3 file (magic bytes check)
 */
function isValidMP3Format(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  
  // Check for ID3v2 header ("ID3")
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return true;
  }
  
  // Check for MP3 frame sync (0xFF followed by valid frame header byte)
  // Frame sync: 11 bits set (0xFF + upper 3 bits of next byte)
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
    if (bytes.length < 10) return -1;
    
    // Size is encoded as synchsafe integer (7 bits per byte)
    const size = ((bytes[6] & 0x7F) << 21) |
                 ((bytes[7] & 0x7F) << 14) |
                 ((bytes[8] & 0x7F) << 7) |
                 (bytes[9] & 0x7F);
    offset = 10 + size;
    
    // Sanity check: offset shouldn't exceed file size
    if (offset >= bytes.length) return -1;
  }
  
  // Search for frame sync starting from offset
  for (let i = offset; i < bytes.length - 3; i++) {
    if (bytes[i] === 0xFF && (bytes[i + 1] & 0xE0) === 0xE0) {
      const layer = (bytes[i + 1] >> 1) & 0x03;
      // Layer 3 = 0x01 in the spec (inverted: 00=reserved, 01=L3, 10=L2, 11=L1)
      if (layer === 0x01) {
        return i;
      }
    }
  }
  
  return -1;
}

interface MP3HeaderInfo {
  bitrate: number;
  sampleRate: number;
  version: number; // 1 = MPEG1, 2 = MPEG2, 25 = MPEG2.5
}

/**
 * Parse MP3 frame header to extract bitrate and sample rate
 */
function parseMP3Header(bytes: Uint8Array, frameStart: number): MP3HeaderInfo | null {
  if (frameStart < 0 || frameStart + 4 > bytes.length) {
    return null;
  }
  
  const b0 = bytes[frameStart];
  const b1 = bytes[frameStart + 1];
  const b2 = bytes[frameStart + 2];
  
  // Verify frame sync
  if (b0 !== 0xFF || (b1 & 0xE0) !== 0xE0) {
    return null;
  }
  
  // Extract version: bits 4-3 of byte 1
  // 00 = MPEG 2.5, 01 = reserved, 10 = MPEG 2, 11 = MPEG 1
  const versionBits = (b1 >> 3) & 0x03;
  let version: number;
  let bitrateTable: { [key: number]: number };
  let sampleRateTable: { [key: number]: number };
  
  switch (versionBits) {
    case 0b11:
      version = 1;
      bitrateTable = BITRATE_TABLE_V1_L3;
      sampleRateTable = SAMPLE_RATE_TABLE_V1;
      break;
    case 0b10:
      version = 2;
      bitrateTable = BITRATE_TABLE_V2_L3;
      sampleRateTable = SAMPLE_RATE_TABLE_V2;
      break;
    case 0b00:
      version = 25;
      bitrateTable = BITRATE_TABLE_V2_L3;
      sampleRateTable = SAMPLE_RATE_TABLE_V25;
      break;
    default:
      return null; // Reserved
  }
  
  const bitrateIndex = (b2 >> 4) & 0x0F;
  const sampleRateIndex = (b2 >> 2) & 0x03;
  
  // Invalid indices
  if (bitrateIndex === 0 || bitrateIndex === 0x0F) return null;
  if (sampleRateIndex === 0x03) return null;
  
  const bitrate = bitrateTable[bitrateIndex];
  const sampleRate = sampleRateTable[sampleRateIndex];
  
  if (!bitrate || !sampleRate) {
    return null;
  }
  
  return { bitrate, sampleRate, version };
}

/**
 * Estimate duration from file size using size-first approach
 * This is VBR-safe because it uses actual file size
 */
function estimateDurationFromSize(fileSize: number, assumedBitrate: number): number {
  // duration = (fileSize * 8) / (bitrate * 1000)
  return (fileSize * 8) / (assumedBitrate * 1000);
}

/**
 * Validate the MP3 file against platform rules
 * Uses SIZE-FIRST enforcement for VBR safety
 */
function validatePreview(bytes: Uint8Array): ValidationResult {
  const fileSize = bytes.length;
  const validatedAt = new Date().toISOString();
  
  // ==========================================================================
  // STEP 1: SIZE-FIRST ENFORCEMENT (Primary VBR-safe mechanism)
  // ==========================================================================
  
  // Reject files that are too small (likely corrupted)
  if (fileSize < MIN_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: 'FILE_TOO_SMALL',
      message: `Preview file too small (${(fileSize / 1024).toFixed(1)}KB). Minimum: ${MIN_FILE_SIZE_BYTES / 1024}KB`,
      details: { file_size: fileSize },
    };
  }
  
  // PRIMARY CHECK: Reject files exceeding size limit regardless of other factors
  // This ensures duration compliance for VBR files without parsing complexity
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: 'FILE_TOO_LARGE',
      message: `Preview file too large (${(fileSize / 1024).toFixed(1)}KB). Maximum: ${MAX_FILE_SIZE_BYTES / 1024}KB. This limit ensures previews stay within duration bounds.`,
      details: {
        file_size: fileSize,
        max_file_size: MAX_FILE_SIZE_BYTES,
        max_duration: MAX_DURATION_SECONDS,
      },
    };
  }
  
  // ==========================================================================
  // STEP 2: FORMAT VALIDATION
  // ==========================================================================
  
  if (!isValidMP3Format(bytes)) {
    return {
      success: false,
      error: 'INVALID_FORMAT',
      message: 'Preview must be in MP3 format. Please regenerate the preview.',
      details: { file_size: fileSize },
    };
  }
  
  // ==========================================================================
  // STEP 3: MP3 HEADER PARSING (Best-effort, not trusted for limits)
  // ==========================================================================
  
  const frameStart = findFirstFrame(bytes);
  let headerInfo: MP3HeaderInfo | null = null;
  let parsedBitrate: number | null = null;
  let estimatedDuration: number;
  
  if (frameStart >= 0) {
    headerInfo = parseMP3Header(bytes, frameStart);
  }
  
  if (headerInfo) {
    parsedBitrate = headerInfo.bitrate;
    estimatedDuration = estimateDurationFromSize(fileSize, parsedBitrate);
    console.log(`MP3 header parsed: version=${headerInfo.version}, bitrate=${parsedBitrate}kbps, sampleRate=${headerInfo.sampleRate}Hz, estimatedDuration=${estimatedDuration.toFixed(1)}s`);
  } else {
    // HARDENED FALLBACK: If header parsing fails, use conservative size-based estimation
    // Assume minimum bitrate to get maximum possible duration estimate
    // This ensures we DON'T silently accept potentially invalid files
    console.log('MP3 header parsing failed, using size-based validation fallback');
    
    // Use minimum expected bitrate for conservative duration estimate
    // If file is within size limits, it's acceptable regardless of actual bitrate
    parsedBitrate = MIN_BITRATE_KBPS;
    estimatedDuration = estimateDurationFromSize(fileSize, parsedBitrate);
    
    // If even with minimum bitrate the duration would be too long, reject
    // (This shouldn't happen if size check passed, but adds safety)
    if (estimatedDuration > MAX_DURATION_SECONDS * 2) {
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Could not validate preview audio. Please regenerate the preview.',
        details: { file_size: fileSize },
      };
    }
    
    // For reporting, use a middle-ground estimate
    parsedBitrate = 64; // Assume expected encoding
    estimatedDuration = estimateDurationFromSize(fileSize, parsedBitrate);
  }
  
  // ==========================================================================
  // STEP 4: BITRATE ENFORCEMENT (Secondary check)
  // ==========================================================================
  
  // If we successfully parsed the bitrate and it exceeds limit, reject
  // This catches high-bitrate files even if they're short
  if (headerInfo && headerInfo.bitrate > MAX_BITRATE_KBPS) {
    return {
      success: false,
      error: 'INVALID_BITRATE',
      message: `Preview bitrate (${headerInfo.bitrate}kbps) exceeds limit of ${MAX_BITRATE_KBPS}kbps. Please regenerate with lower quality settings.`,
      details: {
        actual_bitrate: headerInfo.bitrate,
        max_bitrate: MAX_BITRATE_KBPS,
        file_size: fileSize,
      },
    };
  }
  
  // ==========================================================================
  // STEP 5: DURATION CHECK (Informational, size is authoritative)
  // ==========================================================================
  
  // Duration check as secondary validation (size already enforces this)
  // Allow 2 second tolerance for edge cases
  if (estimatedDuration > MAX_DURATION_SECONDS + 2) {
    return {
      success: false,
      error: 'INVALID_DURATION',
      message: `Estimated preview duration (${estimatedDuration.toFixed(1)}s) exceeds limit of ${MAX_DURATION_SECONDS}s. Please regenerate a shorter preview.`,
      details: {
        actual_duration: estimatedDuration,
        max_duration: MAX_DURATION_SECONDS,
        actual_bitrate: parsedBitrate || 64,
        file_size: fileSize,
      },
    };
  }
  
  // ==========================================================================
  // ALL VALIDATIONS PASSED
  // ==========================================================================
  
  // Cap reported duration at max (size limit already enforces this)
  const reportedDuration = Math.min(
    Math.round(estimatedDuration * 10) / 10,
    MAX_DURATION_SECONDS
  );
  
  return {
    success: true,
    data: {
      preview_url: '', // Will be set after upload
      duration_seconds: reportedDuration,
      bitrate_kbps: parsedBitrate || 64,
      file_size_bytes: fileSize,
      validated_at: validatedAt,
    },
  };
}

/**
 * Delete old preview file from storage if it exists
 */
async function deleteOldPreview(
  supabase: any,
  userId: string,
  oldPreviewUrl: string | null
): Promise<void> {
  if (!oldPreviewUrl) return;
  
  try {
    // Extract path from URL
    const bucketUrl = '/song-previews/';
    const pathIndex = oldPreviewUrl.indexOf(bucketUrl);
    if (pathIndex === -1) return;
    
    const filePath = oldPreviewUrl.substring(pathIndex + bucketUrl.length);
    
    // Only delete if it belongs to this user
    if (filePath.startsWith(userId + '/')) {
      const { error } = await supabase.storage
        .from('song-previews')
        .remove([filePath]);
      
      if (error) {
        console.log(`Failed to delete old preview (non-fatal): ${error.message}`);
      } else {
        console.log(`Deleted old preview: ${filePath}`);
      }
    }
  } catch (e) {
    console.log(`Error cleaning up old preview (non-fatal): ${e}`);
  }
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

    // Initialize Supabase client with user context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

    console.log(`[validate-preview] Validating for song=${songId}, file=${file.name}, size=${file.size} bytes`);

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Validate the preview file
    const validation = validatePreview(bytes);

    if (!validation.success) {
      console.log(`[validate-preview] REJECTED: ${validation.error} - ${validation.message}`);
      return new Response(
        JSON.stringify(validation),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[validate-preview] PASSED: duration=${validation.data?.duration_seconds}s, bitrate=${validation.data?.bitrate_kbps}kbps, size=${validation.data?.file_size_bytes}B`);

    // ==========================================================================
    // PREVIEW REPLACEMENT: Check for existing preview and clean up
    // ==========================================================================
    
    let oldPreviewUrl: string | null = null;
    
    // Only check for existing song if songId is a valid UUID (not "pending")
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(songId)) {
      const { data: existingSong } = await supabase
        .from('songs')
        .select('preview_audio_url, seller_id')
        .eq('id', songId)
        .single();
      
      if (existingSong) {
        // Verify ownership
        if (existingSong.seller_id !== user.id) {
          return new Response(
            JSON.stringify({ success: false, error: 'FORBIDDEN', message: 'You do not own this song' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        oldPreviewUrl = existingSong.preview_audio_url;
      }
    }

    // ==========================================================================
    // UPLOAD TO STORAGE
    // ==========================================================================
    
    // Use timestamp to ensure unique path and prevent caching issues
    const timestamp = Date.now();
    const previewPath = `${user.id}/${timestamp}-preview.mp3`;
    
    const { error: uploadError } = await supabase.storage
      .from('song-previews')
      .upload(previewPath, bytes, {
        contentType: 'audio/mpeg',
        upsert: true,
        cacheControl: '3600', // 1 hour cache
      });

    if (uploadError) {
      console.error('[validate-preview] Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'UPLOAD_FAILED', 
          message: 'Failed to upload preview file. Please try again.',
          details: { storage_error: uploadError.message }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('song-previews')
      .getPublicUrl(previewPath);

    console.log(`[validate-preview] Uploaded to: ${publicUrl}`);

    // ==========================================================================
    // PERSIST VALIDATED METADATA TO DATABASE (if song exists)
    // ==========================================================================
    
    if (uuidRegex.test(songId)) {
      const { error: updateError } = await supabase
        .from('songs')
        .update({
          preview_audio_url: publicUrl,
          preview_duration_seconds: validation.data?.duration_seconds,
          preview_file_size_bytes: validation.data?.file_size_bytes,
          preview_generated_at: validation.data?.validated_at,
        })
        .eq('id', songId)
        .eq('seller_id', user.id); // Ensure ownership
      
      if (updateError) {
        console.error('[validate-preview] DB update error:', updateError);
        // Non-fatal: preview is uploaded, caller can still use the URL
      } else {
        console.log(`[validate-preview] Updated song ${songId} with validated preview metadata`);
        
        // Clean up old preview file after successful update
        await deleteOldPreview(supabase, user.id, oldPreviewUrl);
      }
    }

    // ==========================================================================
    // RETURN SUCCESS WITH VALIDATED DATA
    // ==========================================================================
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          preview_url: publicUrl,
          duration_seconds: validation.data?.duration_seconds,
          bitrate_kbps: validation.data?.bitrate_kbps,
          file_size_bytes: validation.data?.file_size_bytes,
          validated_at: validation.data?.validated_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[validate-preview] Unexpected error:', error);
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
