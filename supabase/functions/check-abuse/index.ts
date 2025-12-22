import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AbuseCheckRequest {
  userId?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  action?: 'check' | 'report';
  flagType?: string;
  details?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AbuseCheckRequest = await req.json();
    const { userId, ipAddress, deviceFingerprint, action = 'check', flagType, details } = body;

    if (action === 'report' && flagType) {
      // Log abuse report
      const { error } = await supabase.from('abuse_flags').insert({
        user_id: userId,
        ip_address: ipAddress,
        device_fingerprint: deviceFingerprint,
        flag_type: flagType,
        severity: details?.severity || 'low',
        details: details || {}
      });

      if (error) {
        console.error('Failed to log abuse:', error);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing abuse flags
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', [
        'abuse_threshold_plays_per_hour',
        'abuse_threshold_ips_per_day',
        'max_concurrent_sessions',
        'auto_ban_on_critical_abuse'
      ]);

    const settingsMap = settings?.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>) || {};

    const maxPlaysPerHour = parseInt(settingsMap.abuse_threshold_plays_per_hour || '50');
    const maxIpsPerDay = parseInt(settingsMap.abuse_threshold_ips_per_day || '10');
    const maxConcurrentSessions = parseInt(settingsMap.max_concurrent_sessions || '3');
    const autoBan = settingsMap.auto_ban_on_critical_abuse === 'true';

    const checks = {
      blocked: false,
      requiresCaptcha: false,
      warnings: [] as string[],
      severity: 'none' as 'none' | 'low' | 'medium' | 'high' | 'critical'
    };

    // Check for critical abuse flags on this user/IP
    const { data: criticalFlags } = await supabase
      .from('abuse_flags')
      .select('id, severity, action_taken')
      .or(`user_id.eq.${userId},ip_address.eq.${ipAddress}`)
      .eq('severity', 'critical')
      .is('resolved_at', null)
      .limit(1);

    if (criticalFlags && criticalFlags.length > 0) {
      checks.blocked = autoBan;
      checks.severity = 'critical';
      checks.warnings.push('Critical abuse detected');

      return new Response(
        JSON.stringify(checks),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check session frequency
    if (userId) {
      const { count: hourlyPlays } = await supabase
        .from('audio_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo);

      if (hourlyPlays && hourlyPlays > maxPlaysPerHour) {
        checks.severity = 'high';
        checks.requiresCaptcha = true;
        checks.warnings.push('High frequency access detected');
      }
    }

    // Check for multiple IPs from same user
    if (userId) {
      const { data: sessions } = await supabase
        .from('audio_sessions')
        .select('ip_address')
        .eq('user_id', userId)
        .gte('created_at', oneDayAgo);

      const uniqueIps = new Set(sessions?.map(s => s.ip_address) || []);
      if (uniqueIps.size > maxIpsPerDay) {
        if (checks.severity === 'none') checks.severity = 'medium';
        checks.warnings.push('Multiple IP addresses detected');
      }
    }

    // Check for concurrent sessions
    if (userId) {
      const { count: activeSessions } = await supabase
        .from('audio_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_valid', true)
        .gte('expires_at', new Date().toISOString());

      if (activeSessions && activeSessions > maxConcurrentSessions) {
        if (checks.severity === 'none') checks.severity = 'low';
        checks.warnings.push('Too many concurrent sessions');
      }
    }

    // Check for existing high severity flags
    const { data: recentFlags } = await supabase
      .from('abuse_flags')
      .select('severity')
      .or(`user_id.eq.${userId},ip_address.eq.${ipAddress}`)
      .gte('created_at', oneDayAgo)
      .is('resolved_at', null);

    const hasHighSeverity = recentFlags?.some(f => f.severity === 'high');
    if (hasHighSeverity) {
      checks.requiresCaptcha = true;
      if (checks.severity === 'none' || checks.severity === 'low') {
        checks.severity = 'medium';
      }
    }

    console.log(`Abuse check: user=${userId}, ip=${ipAddress}, severity=${checks.severity}`);

    return new Response(
      JSON.stringify(checks),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Check abuse error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
