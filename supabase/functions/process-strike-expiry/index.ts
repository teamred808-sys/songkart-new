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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceKey);
    
    console.log('Processing strike expiry...');
    
    // Call the database function that handles:
    // 1. Expiring copyright strikes older than 2 months
    // 2. Lifting community freezes after 1 month
    // 3. Resetting community strikes after freeze
    // 4. Recalculating health scores
    const { data, error } = await supabase.rpc('process_strike_expiry');
    
    if (error) {
      console.error('Error processing strike expiry:', error);
      throw error;
    }
    
    console.log('Strike expiry processed successfully:', data);
    
    return new Response(
      JSON.stringify({
        success: true,
        ...data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in process-strike-expiry function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
