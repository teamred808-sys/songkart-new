import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the release_cleared_funds function
    const { data: releasedFunds, error: releaseError } = await supabase
      .rpc('release_cleared_funds');

    if (releaseError) {
      console.error('Error releasing funds:', releaseError);
      return new Response(
        JSON.stringify({ error: 'Failed to release funds', details: releaseError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log activity for each seller who received funds
    const results = releasedFunds || [];
    for (const result of results) {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        entity_type: 'seller_wallet',
        entity_id: result.seller_id,
        action: 'funds_released',
        metadata: {
          released_amount: result.released_amount,
          transaction_count: result.transaction_count,
          triggered_by: user.id
        }
      });
    }

    const totalReleased = results.reduce((sum: number, r: any) => sum + Number(r.released_amount || 0), 0);
    const totalSellers = results.length;
    const totalTransactions = results.reduce((sum: number, r: any) => sum + (r.transaction_count || 0), 0);

    console.log(`Released funds: ₹${totalReleased} for ${totalSellers} sellers (${totalTransactions} transactions)`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_released: totalReleased,
          sellers_affected: totalSellers,
          transactions_cleared: totalTransactions
        },
        details: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
