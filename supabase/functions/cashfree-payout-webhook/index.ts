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

    const rawBody = await req.text();
    console.log('Cashfree Payout Webhook received:', rawBody);

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cashfree sends transfer updates with event type
    const eventType = payload.event || payload.type;
    const transferData = payload.data || payload;

    console.log('Webhook event:', eventType, 'Transfer ID:', transferData.transfer_id);

    if (!transferData.transfer_id) {
      console.log('No transfer_id in payload, ignoring');
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract withdrawal_id from transfer_id (format: WD-{withdrawal_id_prefix}-{timestamp})
    const transferIdParts = transferData.transfer_id.split('-');
    if (transferIdParts.length < 2 || transferIdParts[0] !== 'WD') {
      console.log('Transfer ID not from our system:', transferData.transfer_id);
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the withdrawal by cashfree_transfer_id
    const { data: withdrawal, error: findError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('cashfree_transfer_id', transferData.transfer_id)
      .single();

    if (findError || !withdrawal) {
      console.log('Withdrawal not found for transfer_id:', transferData.transfer_id);
      return new Response(
        JSON.stringify({ received: true, message: 'Withdrawal not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const status = transferData.status?.toUpperCase() || eventType?.toUpperCase();
    console.log('Processing status:', status, 'for withdrawal:', withdrawal.id);

    // Handle different transfer statuses
    if (status === 'SUCCESS' || status === 'TRANSFER_SUCCESS') {
      // Transfer successful - mark as processed
      await supabase
        .from('withdrawal_requests')
        .update({
          status: 'processed',
          cashfree_status: 'SUCCESS',
          cashfree_status_code: transferData.status_code || null,
          payment_reference: transferData.utr || transferData.reference_id || null,
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id);

      // Log activity
      await supabase.from('activity_logs').insert({
        entity_type: 'withdrawal',
        entity_id: withdrawal.id,
        action: 'payout_completed',
        metadata: {
          transfer_id: transferData.transfer_id,
          utr: transferData.utr,
          amount: withdrawal.amount,
          seller_id: withdrawal.user_id
        }
      });

      console.log('Withdrawal marked as processed:', withdrawal.id);

    } else if (status === 'FAILED' || status === 'TRANSFER_FAILED' || status === 'REVERSED' || status === 'TRANSFER_REVERSED') {
      // Transfer failed - restore wallet balance and mark as failed
      const failureReason = transferData.reason || transferData.message || 'Transfer failed';

      await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          cashfree_status: status,
          cashfree_status_code: transferData.status_code || null,
          failure_reason: failureReason,
          notes: `Cashfree transfer failed: ${failureReason}`
        })
        .eq('id', withdrawal.id);

      // Restore the available balance since transfer failed
      const { error: walletError } = await supabase.rpc('restore_failed_withdrawal', {
        p_user_id: withdrawal.user_id,
        p_amount: withdrawal.amount
      });

      // If the RPC doesn't exist, do it manually
      if (walletError) {
        await supabase
          .from('seller_wallets')
          .update({
            available_balance: supabase.rpc('add_to_balance', { 
              user_id: withdrawal.user_id, 
              amount: withdrawal.amount 
            })
          })
          .eq('user_id', withdrawal.user_id);

        // Fallback: direct update
        const { data: wallet } = await supabase
          .from('seller_wallets')
          .select('available_balance')
          .eq('user_id', withdrawal.user_id)
          .single();

        if (wallet) {
          await supabase
            .from('seller_wallets')
            .update({
              available_balance: Number(wallet.available_balance || 0) + Number(withdrawal.amount),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', withdrawal.user_id);
        }
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        entity_type: 'withdrawal',
        entity_id: withdrawal.id,
        action: 'payout_failed',
        metadata: {
          transfer_id: transferData.transfer_id,
          reason: failureReason,
          amount: withdrawal.amount,
          seller_id: withdrawal.user_id,
          balance_restored: true
        }
      });

      console.log('Withdrawal marked as failed, balance restored:', withdrawal.id);

    } else if (status === 'PENDING' || status === 'TRANSFER_PENDING') {
      // Update status to reflect pending
      await supabase
        .from('withdrawal_requests')
        .update({
          cashfree_status: 'PENDING',
          cashfree_status_code: transferData.status_code || null
        })
        .eq('id', withdrawal.id);

      console.log('Withdrawal status updated to pending:', withdrawal.id);
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent Cashfree from retrying
    return new Response(
      JSON.stringify({ received: true, error: 'Processing error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
