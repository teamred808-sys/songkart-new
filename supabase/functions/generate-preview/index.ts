import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.10";
import { toBlobURL, fetchFile } from "https://esm.sh/@ffmpeg/util@0.12.1";

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
const PREVIEW_BITRATE = '96k';
const PREVIEW_SAMPLE_RATE = 44100;
const PREVIEW_CHANNELS = 1; // mono

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

    console.log(`[generate-preview] Starting preview generation for song ${songId}`);
    console.log(`[generate-preview] Audio path: ${audioPath}`);

    // Extract just the path from the full URL if needed
    const cleanPath = audioPath.includes('song-audio/') 
      ? audioPath.split('song-audio/')[1]
      : audioPath;

    console.log(`[generate-preview] Clean path: ${cleanPath}`);

    // Create a signed URL to download the original audio
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('song-audio')
      .createSignedUrl(cleanPath, 600); // 10 minutes to process

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

    const originalAudioData = new Uint8Array(await audioResponse.arrayBuffer());
    console.log(`[generate-preview] Downloaded ${originalAudioData.length} bytes`);

    // Initialize FFmpeg
    console.log('[generate-preview] Initializing FFmpeg...');
    const ffmpeg = new FFmpeg();
    
    // Load FFmpeg with WASM binaries from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    console.log('[generate-preview] FFmpeg loaded successfully');

    // Determine input file extension
    const inputExt = cleanPath.split('.').pop()?.toLowerCase() || 'mp3';
    const inputFileName = `input.${inputExt}`;
    const outputFileName = 'preview.mp3';

    // Write input file to FFmpeg virtual filesystem
    await ffmpeg.writeFile(inputFileName, originalAudioData);
    console.log('[generate-preview] Input file written to virtual filesystem');

    // Execute FFmpeg transcoding with strict preview settings
    // -t 45: limit to 45 seconds
    // -b:a 96k: 96 kbps bitrate
    // -ar 44100: 44.1kHz sample rate
    // -ac 1: mono audio
    // -f mp3: force MP3 output format
    console.log('[generate-preview] Starting audio transcoding...');
    await ffmpeg.exec([
      '-i', inputFileName,
      '-t', String(PREVIEW_MAX_DURATION),
      '-b:a', PREVIEW_BITRATE,
      '-ar', String(PREVIEW_SAMPLE_RATE),
      '-ac', String(PREVIEW_CHANNELS),
      '-f', 'mp3',
      '-y', // overwrite output
      outputFileName
    ]);

    console.log('[generate-preview] Transcoding complete');

    // Read the output file
    const outputData = await ffmpeg.readFile(outputFileName);
    const previewBytes = outputData instanceof Uint8Array ? outputData : new Uint8Array(outputData as unknown as ArrayBuffer);
    
    console.log(`[generate-preview] Generated preview: ${previewBytes.length} bytes`);

    // Generate preview file path
    const timestamp = Date.now();
    const previewFileName = `${songId}-preview-${timestamp}.mp3`;
    const previewPath = `${songId}/${previewFileName}`;

    console.log(`[generate-preview] Uploading preview to: ${previewPath}`);

    // Upload to song-previews bucket (public)
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('song-previews')
      .upload(previewPath, previewBytes, {
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
        preview_file_size_bytes: previewBytes.length
      })
      .eq('id', songId);

    if (updateError) {
      console.error('[generate-preview] Failed to update song:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update song record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-preview] Preview generated successfully for song ${songId}`);
    console.log(`[generate-preview] Stats: ${previewBytes.length} bytes, ${PREVIEW_MAX_DURATION}s max, ${PREVIEW_BITRATE} bitrate, mono`);

    return new Response(
      JSON.stringify({
        success: true,
        previewUrl: publicUrl,
        duration: PREVIEW_MAX_DURATION,
        fileSize: previewBytes.length,
        bitrate: PREVIEW_BITRATE,
        sampleRate: PREVIEW_SAMPLE_RATE,
        channels: PREVIEW_CHANNELS
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
