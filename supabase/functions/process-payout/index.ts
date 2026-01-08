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

    // Check for Cashfree Payout credentials
    const payoutClientId = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
    const payoutClientSecret = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');

    if (!payoutClientId || !payoutClientSecret) {
      return new Response(
        JSON.stringify({ 
          error: 'Cashfree Payout credentials not configured',
          message: 'Please add CASHFREE_PAYOUT_CLIENT_ID and CASHFREE_PAYOUT_CLIENT_SECRET secrets to enable automatic payouts.'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Get withdrawal_id from request body
    const { withdrawal_id } = await req.json();
    
    if (!withdrawal_id) {
      return new Response(
        JSON.stringify({ error: 'withdrawal_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch withdrawal request with seller payout profile
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .eq('id', withdrawal_id)
      .single();

    if (withdrawalError || !withdrawal) {
      return new Response(
        JSON.stringify({ error: 'Withdrawal request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (withdrawal.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Only approved withdrawals can be processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch seller's payout profile
    const { data: payoutProfile, error: profileError } = await supabase
      .from('seller_payout_profiles')
      .select('*')
      .eq('seller_id', withdrawal.user_id)
      .eq('is_active', true)
      .eq('verification_status', 'verified')
      .single();

    if (profileError || !payoutProfile) {
      return new Response(
        JSON.stringify({ error: 'Verified payout profile not found for seller' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique transfer ID
    const transferId = `WD-${withdrawal_id.substring(0, 8)}-${Date.now()}`;

    // Prepare Cashfree Payout API request
    const isProduction = Deno.env.get('CASHFREE_ENV') === 'production';
    const baseUrl = isProduction 
      ? 'https://payout-api.cashfree.com' 
      : 'https://payout-gamma.cashfree.com';

    // Determine transfer mode
    const transferMode = payoutProfile.upi_id ? 'upi' : 'banktransfer';

    const beneficiaryDetails: any = {
      beneficiary_name: payoutProfile.account_holder_name,
    };

    if (transferMode === 'upi') {
      beneficiaryDetails.beneficiary_instrument_details = {
        vpa: payoutProfile.upi_id
      };
    } else {
      beneficiaryDetails.beneficiary_instrument_details = {
        bank_account_number: payoutProfile.account_number_encrypted, // Note: In production, decrypt this
        bank_ifsc: payoutProfile.ifsc_code
      };
    }

    const transferPayload = {
      transfer_id: transferId,
      transfer_amount: Number(withdrawal.amount),
      transfer_currency: 'INR',
      transfer_mode: transferMode,
      beneficiary_details: beneficiaryDetails,
      transfer_remarks: `SongKart withdrawal ${withdrawal_id.substring(0, 8)}`
    };

    console.log('Initiating Cashfree payout:', { transferId, amount: withdrawal.amount, mode: transferMode });

    // Call Cashfree Payout API
    const payoutResponse = await fetch(`${baseUrl}/payout/v1/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2024-01-01',
        'x-client-id': payoutClientId,
        'x-client-secret': payoutClientSecret,
      },
      body: JSON.stringify(transferPayload)
    });

    const payoutResult = await payoutResponse.json();
    console.log('Cashfree payout response:', payoutResult);

    if (!payoutResponse.ok || payoutResult.status === 'ERROR') {
      // Update withdrawal with failure
      await supabase
        .from('withdrawal_requests')
        .update({
          cashfree_transfer_id: transferId,
          cashfree_status: 'FAILED',
          failure_reason: payoutResult.message || 'Payout initiation failed',
          retries: (withdrawal.retries || 0) + 1
        })
        .eq('id', withdrawal_id);

      return new Response(
        JSON.stringify({ 
          error: 'Payout initiation failed',
          details: payoutResult.message || payoutResult
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update withdrawal with Cashfree details
    await supabase
      .from('withdrawal_requests')
      .update({
        cashfree_transfer_id: transferId,
        cashfree_status: payoutResult.data?.status || 'PENDING',
        cashfree_status_code: payoutResult.data?.status_code || null,
        payment_reference: payoutResult.data?.utr || null
      })
      .eq('id', withdrawal_id);

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      entity_type: 'withdrawal',
      entity_id: withdrawal_id,
      action: 'payout_initiated',
      metadata: {
        transfer_id: transferId,
        amount: withdrawal.amount,
        seller_id: withdrawal.user_id,
        transfer_mode: transferMode
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: transferId,
        status: payoutResult.data?.status || 'PENDING',
        message: 'Payout initiated successfully. Status will be updated via webhook.'
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
