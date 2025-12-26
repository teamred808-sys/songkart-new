import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const songId = url.searchParams.get('songId');

    if (!token || !songId) {
      return new Response(
        JSON.stringify({ error: 'Token and songId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate session token
    const { data: session, error: sessionError } = await supabase
      .from('audio_sessions')
      .select('*')
      .eq('session_token', token)
      .eq('song_id', songId)
      .eq('is_valid', true)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session token' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('audio_sessions')
        .update({ is_valid: false })
        .eq('id', session.id);

      return new Response(
        JSON.stringify({ error: 'Session has expired' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last access and play count asynchronously (don't wait)
    supabase
      .from('audio_sessions')
      .update({ 
        last_access: new Date().toISOString(),
        play_count: session.play_count + 1
      })
      .eq('id', session.id)
      .then(() => {});

    // Increment song play count asynchronously
    supabase.rpc('increment_play_count', { song_uuid: songId }).then(() => {});

    // Get song preview URL
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('preview_audio_url, title')
      .eq('id', songId)
      .single();

    if (songError || !song || !song.preview_audio_url) {
      return new Response(
        JSON.stringify({ error: 'Preview not available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the file from storage using signed URL
    const previewPath = song.preview_audio_url.includes('song-previews/') 
      ? song.preview_audio_url.split('song-previews/')[1]
      : song.preview_audio_url;

    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('song-previews')
      .createSignedUrl(previewPath, 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to access audio file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Forward range header if present for progressive streaming
    const rangeHeader = req.headers.get('range');
    const fetchHeaders: HeadersInit = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    // Fetch the audio file with streaming support
    const audioResponse = await fetch(signedUrlData.signedUrl, {
      headers: fetchHeaders
    });
    
    if (!audioResponse.ok && audioResponse.status !== 206) {
      console.error('Audio fetch error:', audioResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Streaming preview for song ${songId}, session ${session.id}, range: ${rangeHeader || 'full'}`);

    // Build response headers for streaming
    const responseHeaders: HeadersInit = {
      ...corsHeaders,
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline; filename="preview.mp3"',
    };

    // Forward content headers from storage response
    const contentLength = audioResponse.headers.get('Content-Length');
    const contentRange = audioResponse.headers.get('Content-Range');
    
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    // Stream the response body directly without buffering
    return new Response(audioResponse.body, {
      status: audioResponse.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Stream preview error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});