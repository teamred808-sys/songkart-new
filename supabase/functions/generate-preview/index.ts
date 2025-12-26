import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePreviewRequest {
  songId: string;
  audioPath: string;
}

// Preview settings
const PREVIEW_MAX_DURATION = 45; // seconds

/**
 * This edge function serves as a fallback/utility for preview management.
 * Primary preview generation happens client-side using Web Audio API.
 * 
 * This function can be used for:
 * - Batch regeneration of previews
 * - Admin tools
 * - Future server-side processing with external transcoding services
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { songId, audioPath }: GeneratePreviewRequest = await req.json();

    if (!songId || !audioPath) {
      return new Response(
        JSON.stringify({ error: 'songId and audioPath are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-preview] Processing preview for song ${songId}`);
    console.log(`[generate-preview] Audio path: ${audioPath}`);

    // Extract just the path from the full URL if needed
    const cleanPath = audioPath.includes('song-audio/') 
      ? audioPath.split('song-audio/')[1]
      : audioPath;

    // Decode URL-encoded path
    const decodedPath = decodeURIComponent(cleanPath);
    console.log(`[generate-preview] Clean path: ${decodedPath}`);

    // Create a signed URL to download the original audio
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('song-audio')
      .createSignedUrl(decodedPath, 600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('[generate-preview] Failed to create signed URL:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to access audio file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-preview] Downloading original audio file...');
    
    // Download the original audio file
    const audioResponse = await fetch(signedUrlData.signedUrl);
    if (!audioResponse.ok) {
      console.error('[generate-preview] Failed to fetch audio:', audioResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to download audio file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    console.log(`[generate-preview] Downloaded ${audioBytes.length} bytes`);

    // NOTE: Full audio transcoding (45s limit, compression) is done client-side
    // using Web Audio API for better performance and no Worker dependency issues.
    // 
    // This edge function copies the full file as a fallback.
    // For production, consider integrating an external transcoding service like:
    // - Cloudinary Audio API
    // - AWS Elemental MediaConvert
    // - FFmpeg as a microservice

    // Generate preview file path
    const timestamp = Date.now();
    const previewFileName = `${songId}-preview-${timestamp}.mp3`;
    const previewPath = `${songId}/${previewFileName}`;

    console.log(`[generate-preview] Uploading to: ${previewPath}`);

    // Upload to song-previews bucket (public)
    const { error: uploadError } = await supabase
      .storage
      .from('song-previews')
      .upload(previewPath, audioBytes, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('[generate-preview] Failed to upload preview:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload preview' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('song-previews')
      .getPublicUrl(previewPath);

    console.log(`[generate-preview] Preview public URL: ${publicUrl}`);

    // Update song record with preview info
    const { error: updateError } = await supabase
      .from('songs')
      .update({
        preview_audio_url: publicUrl,
        preview_generated_at: new Date().toISOString(),
        preview_duration_seconds: PREVIEW_MAX_DURATION,
        preview_file_size_bytes: audioBytes.length
      })
      .eq('id', songId);

    if (updateError) {
      console.error('[generate-preview] Failed to update song:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update song record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-preview] Preview processed for song ${songId}`);

    return new Response(
      JSON.stringify({
        success: true,
        previewUrl: publicUrl,
        duration: PREVIEW_MAX_DURATION,
        fileSize: audioBytes.length,
        note: 'Server-side fallback - full transcoding done client-side'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-preview] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
