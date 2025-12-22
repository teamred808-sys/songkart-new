import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token for auth check
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for admin checks and storage access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has admin role
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Admin role check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get song ID from request
    const { songId } = await req.json();
    if (!songId) {
      return new Response(
        JSON.stringify({ error: 'Song ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${user.id} requesting review content for song ${songId}`);

    // Fetch song with full details
    const { data: song, error: songError } = await supabaseAdmin
      .from('songs')
      .select(`
        *,
        profiles:seller_id (id, full_name, email, avatar_url),
        genres:genre_id (id, name),
        moods:mood_id (id, name),
        license_tiers (*)
      `)
      .eq('id', songId)
      .single();

    if (songError || !song) {
      console.error('Song fetch error:', songError);
      return new Response(
        JSON.stringify({ error: 'Song not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL for full audio if exists
    let fullAudioUrl = null;
    if (song.audio_url) {
      // Extract the path from the URL - the audio_url contains the full storage path
      const audioPath = song.audio_url.replace(/.*\/song-audio\//, '');
      
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
        .storage
        .from('song-audio')
        .createSignedUrl(audioPath, 300); // 5 minutes expiry

      if (signedUrlError) {
        console.error('Error generating signed URL:', signedUrlError);
      } else {
        fullAudioUrl = signedUrlData.signedUrl;
      }
    }

    // Log admin access for audit trail
    await supabaseAdmin.from('activity_logs').insert({
      user_id: user.id,
      action: 'admin_review_content_access',
      entity_type: 'song',
      entity_id: songId,
      metadata: {
        song_title: song.title,
        seller_id: song.seller_id,
        accessed_at: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        song: {
          ...song,
          full_audio_url: fullAudioUrl,
          // Ensure full lyrics are included
          full_lyrics: song.full_lyrics
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin review content error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
