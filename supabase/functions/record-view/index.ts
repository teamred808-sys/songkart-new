import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, reason: 'not_authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth token to respect RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { songId, playbackSeconds, deviceFingerprint } = await req.json();

    // Validate required fields
    if (!songId || typeof playbackSeconds !== 'number') {
      return new Response(
        JSON.stringify({ success: false, reason: 'invalid_request', message: 'songId and playbackSeconds are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IP and user agent for tracking
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('cf-connecting-ip') || 
                      null;
    const userAgent = req.headers.get('user-agent') || null;

    // Call the secure database function that enforces all rules
    const { data, error } = await supabase.rpc('record_song_view', {
      p_song_id: songId,
      p_playback_seconds: Math.floor(playbackSeconds),
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_device_fingerprint: deviceFingerprint || null
    });

    if (error) {
      console.error('View recording error:', error);
      return new Response(
        JSON.stringify({ success: false, reason: 'database_error', message: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the result from the database function
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Record view error:', error);
    return new Response(
      JSON.stringify({ success: false, reason: 'internal_error', message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
