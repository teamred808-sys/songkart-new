import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenRequest {
  songId: string;
  type: 'preview' | 'purchased';
  deviceFingerprint?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
      }
    }

    const { songId, type, deviceFingerprint }: TokenRequest = await req.json();

    if (!songId) {
      return new Response(
        JSON.stringify({ error: 'Song ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IP and user agent for tracking
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('cf-connecting-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check for abuse - too many sessions from same IP
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentSessions } = await supabase
      .from('audio_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', oneHourAgo);

    // Get abuse threshold from settings
    const { data: thresholdSetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'abuse_threshold_plays_per_hour')
      .single();
    
    const threshold = thresholdSetting?.value ? (typeof thresholdSetting.value === 'number' ? thresholdSetting.value : parseInt(String(thresholdSetting.value))) : 50;

    if (recentSessions && recentSessions > threshold) {
      // Flag as abuse
      await supabase.from('abuse_flags').insert({
        user_id: userId,
        ip_address: ipAddress,
        device_fingerprint: deviceFingerprint,
        flag_type: 'high_frequency',
        severity: recentSessions > threshold * 2 ? 'critical' : 'high',
        details: { sessions_count: recentSessions, threshold, period: '1_hour' }
      });

      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for purchased audio access
    if (type === 'purchased' && userId) {
      const { data: purchase } = await supabase
        .from('transactions')
        .select('id')
        .eq('buyer_id', userId)
        .eq('song_id', songId)
        .eq('payment_status', 'completed')
        .single();

      if (!purchase) {
        return new Response(
          JSON.stringify({ error: 'Purchase not found' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if song exists and get preview info
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id, exclusive_sold, exclusive_buyer_id, preview_audio_url, audio_url')
      .eq('id', songId)
      .single();

    if (songError || !song) {
      return new Response(
        JSON.stringify({ error: 'Song not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check exclusive license restrictions for preview
    if (type === 'preview' && song.exclusive_sold && song.exclusive_buyer_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'This song has been sold exclusively and is no longer available for preview' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get token expiry from settings
    const { data: expirySetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'session_token_expiry_minutes')
      .single();
    
    const expiryMinutes = expirySetting?.value ? (typeof expirySetting.value === 'number' ? expirySetting.value : parseInt(String(expirySetting.value))) : 15;

    // Generate unique session token
    const sessionToken = crypto.randomUUID() + '-' + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Clean up expired sessions for this user/song
    await supabase
      .from('audio_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('audio_sessions')
      .insert({
        user_id: userId,
        song_id: songId,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_fingerprint: deviceFingerprint,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get preview duration settings
    const { data: durationSetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'preview_duration_seconds')
      .single();
    
    // Value is already an object from Supabase JSON column, no need to parse
    const durationConfig = durationSetting?.value ? (typeof durationSetting.value === 'string' ? JSON.parse(durationSetting.value) : durationSetting.value) : { default: 45 };

    console.log(`Audio token generated for song ${songId}, type: ${type}, user: ${userId || 'anonymous'}`);

    return new Response(
      JSON.stringify({
        token: sessionToken,
        expiresAt: expiresAt.toISOString(),
        type,
        maxDuration: type === 'preview' ? durationConfig.default : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Audio token error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
