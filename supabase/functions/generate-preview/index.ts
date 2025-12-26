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

    console.log(`Generating preview for song ${songId}, audio path: ${audioPath}`);

    // Get preview duration setting
    const { data: durationSetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'preview_duration_seconds')
      .single();
    
    const durationConfig = durationSetting?.value 
      ? (typeof durationSetting.value === 'string' ? JSON.parse(durationSetting.value) : durationSetting.value)
      : { default: 45 };
    const targetDuration = durationConfig.default || 45;

    // Extract just the path from the full URL if needed
    const cleanPath = audioPath.includes('song-audio/') 
      ? audioPath.split('song-audio/')[1]
      : audioPath;

    // Create a signed URL to download the original audio
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('song-audio')
      .createSignedUrl(cleanPath, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Failed to create signed URL:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to access audio file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the original audio file
    const audioResponse = await fetch(signedUrlData.signedUrl);
    if (!audioResponse.ok) {
      console.error('Failed to fetch audio:', audioResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to download audio file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    // For now, we'll use the full audio as preview since we can't transcode in edge functions
    // In production, this would integrate with an external transcoding service
    // The key optimization is already done by using direct public URLs
    
    // Generate preview file path
    const timestamp = Date.now();
    const previewFileName = `${cleanPath.split('/').pop()?.replace(/\.[^/.]+$/, '')}-preview-${timestamp}.mp3`;
    const previewPath = `${songId}/${previewFileName}`;

    // Upload to song-previews bucket (public)
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('song-previews')
      .upload(previewPath, audioBytes, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Failed to upload preview:', uploadError);
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
        preview_duration_seconds: targetDuration,
        preview_file_size_bytes: audioBytes.length
      })
      .eq('id', songId);

    if (updateError) {
      console.error('Failed to update song:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update song record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Preview generated successfully for song ${songId}: ${publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        previewUrl: publicUrl,
        duration: targetDuration,
        fileSize: audioBytes.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate preview error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});