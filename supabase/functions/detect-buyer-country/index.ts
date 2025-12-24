import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    // Priority 1: Check Cloudflare header (most reliable if behind Cloudflare)
    const cfCountry = req.headers.get('cf-ipcountry');
    if (cfCountry && cfCountry !== 'XX' && cfCountry.length === 2) {
      console.log(`Country detected from Cloudflare: ${cfCountry}`);
      return new Response(
        JSON.stringify({
          country_code: cfCountry.toUpperCase(),
          detection_method: 'cloudflare'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Priority 2: Check X-Country header (some CDNs/proxies add this)
    const xCountry = req.headers.get('x-country');
    if (xCountry && xCountry.length === 2) {
      console.log(`Country detected from X-Country header: ${xCountry}`);
      return new Response(
        JSON.stringify({
          country_code: xCountry.toUpperCase(),
          detection_method: 'x-country-header'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Priority 3: Get client IP and perform geolocation
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp;

    if (clientIp) {
      console.log(`Attempting IP geolocation for: ${clientIp}`);
      
      // Use ip-api.com (free, no API key needed, 45 requests/minute limit)
      // Note: For production, consider a paid service with higher limits
      try {
        const geoResponse = await fetch(
          `http://ip-api.com/json/${clientIp}?fields=status,countryCode`,
          { signal: AbortSignal.timeout(3000) } // 3 second timeout
        );
        
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.status === 'success' && geoData.countryCode) {
            console.log(`Country detected from IP geolocation: ${geoData.countryCode}`);
            return new Response(
              JSON.stringify({
                country_code: geoData.countryCode.toUpperCase(),
                detection_method: 'ip_geolocation'
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            );
          }
        }
      } catch (geoError) {
        console.error('IP geolocation failed:', geoError);
      }
    }

    // Fallback: Default to India
    console.log('Could not detect country, defaulting to IN');
    return new Response(
      JSON.stringify({
        country_code: 'IN',
        detection_method: 'fallback'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Error in detect-buyer-country:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Always return a valid response, even on error
    return new Response(
      JSON.stringify({
        country_code: 'IN',
        detection_method: 'error_fallback',
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 even on error to not break the client
      }
    );
  }
});
