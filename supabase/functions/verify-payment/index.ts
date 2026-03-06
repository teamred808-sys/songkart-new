import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cashfreeAppId = Deno.env.get("CASHFREE_APP_ID")!;
    const cashfreeSecretKey = Deno.env.get("CASHFREE_SECRET_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id } = await req.json();

    console.log(`Verifying payment for order: ${order_id}`);

    // Verify with Cashfree
    const cashfreeResponse = await fetch(`https://api.cashfree.com/pg/orders/${order_id}`, {
      method: "GET",
      headers: {
        "x-client-id": cashfreeAppId,
        "x-client-secret": cashfreeSecretKey,
        "x-api-version": "2023-08-01",
      },
    });

    const cashfreeData = await cashfreeResponse.json();

    console.log("Cashfree order status:", cashfreeData);

    // Get checkout session
    const { data: checkoutSession } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("cashfree_order_id", order_id)
      .eq("buyer_id", user.id)
      .single();

    if (!checkoutSession) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = cashfreeData.order_status;
    const isPaid = status === "PAID";

    // FALLBACK ORDER FULFILLMENT:
    // If Cashfree confirms PAID but checkout session is not yet completed,
    // create the order here as a fallback (webhook may have failed).
    if (isPaid && checkoutSession.status !== "completed") {
      console.log("Payment confirmed PAID but session not completed — running fallback fulfillment...");

      // Check if order already exists (another process may have created it)
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("cashfree_order_id", order_id)
        .single();

      if (existingOrder) {
        console.log("Order already exists:", existingOrder.id);
        return new Response(JSON.stringify({
          success: true,
          payment_status: status,
          is_paid: true,
          order: existingOrder,
          session_status: "completed",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark session as processing to prevent race conditions
      await supabase
        .from("checkout_sessions")
        .update({ status: "processing" })
        .eq("id", checkoutSession.id)
        .eq("status", checkoutSession.status); // optimistic lock

      // Generate order number
      const { data: orderNumberData } = await supabase.rpc("generate_order_number");
      const orderNumber = orderNumberData || `ORD${Date.now()}`;

      const paymentId = cashfreeData.cf_order_id || order_id;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          buyer_id: checkoutSession.buyer_id,
          checkout_session_id: checkoutSession.id,
          subtotal: checkoutSession.subtotal,
          platform_fee: checkoutSession.platform_fee,
          tax_amount: checkoutSession.tax_amount,
          total_amount: checkoutSession.total_amount,
          currency: checkoutSession.currency,
          payment_status: "paid",
          payment_method: "cashfree",
          cashfree_order_id: order_id,
          cashfree_payment_id: String(paymentId),
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) {
        console.error("Fallback order creation error:", orderError);
        throw new Error("Failed to create order in fallback");
      }

      console.log("Fallback order created:", order.id);

      // Process cart items
      const cartSnapshot = checkoutSession.cart_snapshot as any[];

      for (const item of cartSnapshot) {
        const watermarkCode = `WM-${order.id.substring(0, 8)}-${item.song_id.substring(0, 8)}-${Date.now()}`;

        // Create order item
        const { data: orderItem, error: itemError } = await supabase
          .from("order_items")
          .insert({
            order_id: order.id,
            song_id: item.song_id,
            seller_id: item.seller_id,
            license_tier_id: item.license_tier_id,
            license_type: item.license_type,
            is_exclusive: item.is_exclusive,
            song_price: item.song_price || item.price,
            platform_fee_total: item.platform_fee_total || item.commission_amount,
            platform_fee_buyer: item.platform_fee_buyer || 0,
            platform_fee_seller: item.platform_fee_seller || item.commission_amount,
            buyer_total_paid: item.buyer_total_paid || item.price,
            price: item.song_price || item.price,
            commission_rate: item.commission_rate,
            commission_amount: item.platform_fee_total || item.commission_amount,
            seller_amount: item.seller_amount,
            watermark_code: watermarkCode,
          })
          .select()
          .single();

        if (itemError) {
          console.error("Fallback order item creation error:", itemError);
          continue;
        }

        // Trigger license PDF generation in background
        try {
          const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/generate-license-pdf`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ order_item_id: orderItem.id }),
          });
          if (!pdfResponse.ok) {
            console.error("License PDF generation failed:", await pdfResponse.text());
          }
        } catch (pdfError) {
          console.error("License PDF generation error:", pdfError);
        }

        // Create download access
        await supabase
          .from("download_access")
          .upsert({
            buyer_id: checkoutSession.buyer_id,
            order_item_id: orderItem.id,
            song_id: item.song_id,
            access_type: "full",
          }, {
            onConflict: "buyer_id,song_id"
          });

        // Credit seller wallet
        const { data: wallet } = await supabase
          .from("seller_wallets")
          .select("*")
          .eq("user_id", item.seller_id)
          .single();

        if (wallet) {
          await supabase
            .from("seller_wallets")
            .update({
              pending_balance: Number(wallet.pending_balance) + item.seller_amount,
              total_earnings: Number(wallet.total_earnings) + item.seller_amount,
            })
            .eq("id", wallet.id);
        }

        // Handle exclusive licenses
        if (item.is_exclusive) {
          await supabase
            .from("songs")
            .update({
              exclusive_sold: true,
              exclusive_buyer_id: checkoutSession.buyer_id,
              exclusive_sold_at: new Date().toISOString(),
            })
            .eq("id", item.song_id);

          await supabase
            .from("exclusive_reservations")
            .update({ status: "completed" })
            .eq("song_id", item.song_id)
            .eq("buyer_id", checkoutSession.buyer_id)
            .eq("status", "active");
        }

        // Update license tier sales count
        const { data: tierData } = await supabase
          .from("license_tiers")
          .select("current_sales")
          .eq("id", item.license_tier_id)
          .single();

        await supabase
          .from("license_tiers")
          .update({ current_sales: (tierData?.current_sales || 0) + 1 })
          .eq("id", item.license_tier_id);

        // Create transaction record
        await supabase
          .from("transactions")
          .insert({
            buyer_id: checkoutSession.buyer_id,
            seller_id: item.seller_id,
            song_id: item.song_id,
            license_tier_id: item.license_tier_id,
            song_price: item.song_price || item.price,
            platform_fee_buyer: item.platform_fee_buyer || 0,
            platform_fee_seller: item.platform_fee_seller || item.commission_amount,
            buyer_total_paid: item.buyer_total_paid || item.price,
            amount: item.song_price || item.price,
            commission_rate: item.commission_rate,
            commission_amount: item.platform_fee_total || item.commission_amount,
            seller_amount: item.seller_amount,
            payment_status: "completed",
            payment_method: "cashfree",
            payment_id: String(paymentId),
          });
      }

      // Clear cart
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", checkoutSession.buyer_id);

      // Mark session completed
      await supabase
        .from("checkout_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", checkoutSession.id);

      // Update order fulfillment
      await supabase
        .from("orders")
        .update({
          fulfillment_status: "completed",
          fulfilled_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      console.log("Fallback order fulfilled successfully:", order.id);

      return new Response(JSON.stringify({
        success: true,
        payment_status: status,
        is_paid: true,
        order: order,
        session_status: "completed",
        fulfilled_by: "verify-payment-fallback",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get order if exists (normal flow — webhook already processed)
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("cashfree_order_id", order_id)
      .single();

    return new Response(JSON.stringify({
      success: true,
      payment_status: status,
      is_paid: isPaid,
      order: order,
      session_status: checkoutSession.status,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error verifying payment:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
