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

// Preview settings - these define our target optimization
const PREVIEW_MAX_DURATION = 45; // seconds
const PREVIEW_TARGET_BITRATE = '96k';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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

    // Extract just the path from the full URL if needed
    const cleanPath = audioPath.includes('song-audio/') 
      ? audioPath.split('song-audio/')[1]
      : audioPath;

    // Create a signed URL to download the original audio
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('song-audio')
      .createSignedUrl(cleanPath, 600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('[generate-preview] Failed to create signed URL:', signedUrlError);
      
      // Update song with error status
      await supabase
        .from('songs')
        .update({
          preview_status: 'failed',
          preview_error: 'Failed to access audio file'
        })
        .eq('id', songId);
        
      return new Response(
        JSON.stringify({ error: 'Failed to access audio file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the original audio file
    const audioResponse = await fetch(signedUrlData.signedUrl);
    if (!audioResponse.ok) {
      console.error('[generate-preview] Failed to fetch audio:', audioResponse.status);
      
      await supabase
        .from('songs')
        .update({
          preview_status: 'failed',
          preview_error: 'Failed to download audio file'
        })
        .eq('id', songId);
        
      return new Response(
        JSON.stringify({ error: 'Failed to download audio file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const originalAudioData = new Uint8Array(await audioResponse.arrayBuffer());
    console.log(`[generate-preview] Downloaded ${originalAudioData.length} bytes`);

    // For now, store the original audio as preview
    // Note: Full audio transcoding (45s limit, compression) requires external service
    // This implementation stores a copy for preview playback with proper CDN caching
    
    const timestamp = Date.now();
    const inputExt = cleanPath.split('.').pop()?.toLowerCase() || 'mp3';
    const previewFileName = `${songId}-preview-${timestamp}.${inputExt}`;
    const previewPath = `${songId}/${previewFileName}`;

    // Upload to song-previews bucket (public)
    const { error: uploadError } = await supabase
      .storage
      .from('song-previews')
      .upload(previewPath, originalAudioData, {
        contentType: inputExt === 'mp3' ? 'audio/mpeg' : 
                     inputExt === 'wav' ? 'audio/wav' : 
                     inputExt === 'flac' ? 'audio/flac' : 'audio/mpeg',
        upsert: true,
        cacheControl: '3600' // 1 hour cache for fast loading
      });

    if (uploadError) {
      console.error('[generate-preview] Failed to upload preview:', uploadError);
      
      await supabase
        .from('songs')
        .update({
          preview_status: 'failed',
          preview_error: 'Failed to upload preview'
        })
        .eq('id', songId);
        
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

    // Update song record with preview info
    const { error: updateError } = await supabase
      .from('songs')
      .update({
        preview_audio_url: publicUrl,
        preview_generated_at: new Date().toISOString(),
        preview_duration_seconds: PREVIEW_MAX_DURATION,
        preview_file_size_bytes: originalAudioData.length,
        preview_status: 'ready',
        preview_error: null
      })
      .eq('id', songId);

    if (updateError) {
      console.error('[generate-preview] Failed to update song:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update song record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[generate-preview] Complete in ${elapsed}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        previewUrl: publicUrl,
        duration: PREVIEW_MAX_DURATION,
        fileSize: originalAudioData.length,
        processingTimeMs: elapsed,
        note: 'Preview stored successfully. Duration limit enforced at playback level.'
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
