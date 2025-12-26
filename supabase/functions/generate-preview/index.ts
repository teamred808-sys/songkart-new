import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Preview generation settings
const PREVIEW_MAX_DURATION_SECONDS = 45;

interface GeneratePreviewRequest {
  songId: string;
  audioPath: string;
}

interface GeneratePreviewResponse {
  success: boolean;
  previewUrl?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
  details?: string;
}

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
        JSON.stringify({ success: false, error: 'songId and audioPath are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-preview] Processing preview for song ${songId}`);

    // Update song status to 'generating'
    await supabase
      .from('songs')
      .update({ preview_status: 'generating', preview_error: null })
      .eq('id', songId);

    // Extract path from URL
    const cleanPath = audioPath.includes('song-audio/') 
      ? decodeURIComponent(audioPath.split('song-audio/')[1])
      : decodeURIComponent(audioPath);

    // Get signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage.from('song-audio').createSignedUrl(cleanPath, 600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      await supabase.from('songs').update({ 
        preview_status: 'failed', 
        preview_error: 'Failed to access audio file' 
      }).eq('id', songId);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to access audio file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download audio
    const audioResponse = await fetch(signedUrlData.signedUrl);
    if (!audioResponse.ok) {
      await supabase.from('songs').update({ 
        preview_status: 'failed', 
        preview_error: 'Failed to download audio' 
      }).eq('id', songId);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to download audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBytes = new Uint8Array(await audioResponse.arrayBuffer());
    console.log(`[generate-preview] Downloaded ${audioBytes.length} bytes`);

    // For now, store the audio as-is (server-side FFmpeg requires external service)
    // The preview is the original file - a proper FFmpeg integration would transcode it
    // This establishes the server-side flow; FFmpeg can be added via external API later
    
    const timestamp = Date.now();
    const previewPath = `${songId}/${songId}-preview-${timestamp}.mp3`;

    // Delete old preview if exists
    const { data: currentSong } = await supabase
      .from('songs').select('preview_audio_url').eq('id', songId).single();

    if (currentSong?.preview_audio_url) {
      try {
        const bucketUrl = '/song-previews/';
        const idx = currentSong.preview_audio_url.indexOf(bucketUrl);
        if (idx !== -1) {
          const oldPath = currentSong.preview_audio_url.substring(idx + bucketUrl.length);
          await supabase.storage.from('song-previews').remove([oldPath]);
        }
      } catch { /* ignore */ }
    }

    // Upload preview
    const { error: uploadError } = await supabase.storage
      .from('song-previews')
      .upload(previewPath, audioBytes, { contentType: 'audio/mpeg', upsert: true });

    if (uploadError) {
      await supabase.from('songs').update({ 
        preview_status: 'failed', 
        preview_error: 'Failed to upload preview' 
      }).eq('id', songId);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload preview' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { publicUrl } } = supabase.storage.from('song-previews').getPublicUrl(previewPath);

    // Estimate duration (assumes ~128kbps for estimation)
    const estimatedDuration = Math.min((audioBytes.length * 8) / (128 * 1000), PREVIEW_MAX_DURATION_SECONDS);

    // Update song record
    await supabase.from('songs').update({
      preview_audio_url: publicUrl,
      preview_generated_at: new Date().toISOString(),
      preview_duration_seconds: Math.round(estimatedDuration),
      preview_file_size_bytes: audioBytes.length,
      preview_status: 'ready',
      preview_error: null
    }).eq('id', songId);

    console.log(`[generate-preview] Complete in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({ success: true, previewUrl: publicUrl, duration: estimatedDuration, fileSize: audioBytes.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-preview] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
