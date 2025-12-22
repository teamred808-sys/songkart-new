import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CASHFREE_API_URL = "https://api.cashfree.com/pg/orders";
const COMMISSION_RATE = 0.15;

interface CheckoutRequest {
  acknowledgment_accepted: boolean;
  return_url: string;
}

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

    // Authenticate user
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

    const { acknowledgment_accepted, return_url }: CheckoutRequest = await req.json();

    if (!acknowledgment_accepted) {
      return new Response(JSON.stringify({ error: "Purchase acknowledgment is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Creating checkout session for user ${user.id}`);

    // Fetch cart items with full details
    const { data: cartItems, error: cartError } = await supabase
      .from("cart_items")
      .select(`
        *,
        song:songs(id, title, seller_id, status, exclusive_sold, cover_image_url),
        license_tier:license_tiers(*)
      `)
      .eq("user_id", user.id);

    if (cartError || !cartItems || cartItems.length === 0) {
      return new Response(JSON.stringify({ error: "Cart is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-validate all items
    for (const item of cartItems) {
      if (!item.song || item.song.status !== "approved") {
        return new Response(JSON.stringify({ 
          error: `Song "${item.song?.title || 'Unknown'}" is no longer available` 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (item.song.exclusive_sold) {
        return new Response(JSON.stringify({ 
          error: `Song "${item.song.title}" has been exclusively sold` 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check exclusive reservations
      if (item.is_exclusive) {
        const { data: reservation } = await supabase
          .from("exclusive_reservations")
          .select("*")
          .eq("song_id", item.song_id)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .single();

        if (!reservation || reservation.buyer_id !== user.id) {
          return new Response(JSON.stringify({ 
            error: `Exclusive reservation for "${item.song.title}" has expired` 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Calculate totals with fresh prices
    let subtotal = 0;
    const cartSnapshot = cartItems.map(item => {
      const price = Number(item.license_tier.price);
      const commission = price * COMMISSION_RATE;
      subtotal += price;
      
      return {
        song_id: item.song_id,
        song_title: item.song.title,
        seller_id: item.song.seller_id,
        license_tier_id: item.license_tier_id,
        license_type: item.license_tier.license_type,
        is_exclusive: item.is_exclusive,
        price,
        commission_rate: COMMISSION_RATE,
        commission_amount: commission,
        seller_amount: price - commission,
        cover_image_url: item.song.cover_image_url,
      };
    });

    const platformFee = subtotal * COMMISSION_RATE;
    const totalAmount = subtotal;

    // Generate order ID
    const orderId = `order_${Date.now()}_${user.id.substring(0, 8)}`;

    // Get user profile for Cashfree
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    // Create Cashfree order
    const cashfreeResponse = await fetch(CASHFREE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": cashfreeAppId,
        "x-client-secret": cashfreeSecretKey,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: totalAmount,
        order_currency: "INR",
        customer_details: {
          customer_id: user.id,
          customer_email: profile?.email || user.email,
          customer_phone: "9999999999", // Placeholder
          customer_name: profile?.full_name || "Customer",
        },
        order_meta: {
          return_url: `${return_url}?order_id=${orderId}&session_id={checkout_session_id}`,
          notify_url: `${supabaseUrl}/functions/v1/cashfree-webhook`,
        },
        order_note: `Purchase of ${cartItems.length} song license(s)`,
      }),
    });

    const cashfreeData = await cashfreeResponse.json();

    if (!cashfreeResponse.ok) {
      console.error("Cashfree error:", cashfreeData);
      return new Response(JSON.stringify({ error: "Failed to create payment session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate payment_session_id exists
    if (!cashfreeData.payment_session_id) {
      console.error("Missing payment_session_id in Cashfree response:", cashfreeData);
      return new Response(JSON.stringify({ error: "Payment session ID not received from gateway" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construct the correct Cashfree checkout URL
    const isProduction = CASHFREE_API_URL.includes("api.cashfree.com") && !CASHFREE_API_URL.includes("sandbox");
    const baseCheckoutUrl = isProduction 
      ? "https://payments.cashfree.com/pgbillpay" 
      : "https://sandbox.cashfree.com/pgbillpay";
    
    const paymentUrl = `${baseCheckoutUrl}?payment_session_id=${cashfreeData.payment_session_id}`;

    console.log("Cashfree order created:", cashfreeData);
    console.log("Generated payment URL:", paymentUrl);
    console.log("Environment:", isProduction ? "PRODUCTION" : "SANDBOX");

    // Create checkout session
    const { data: checkoutSession, error: sessionError } = await supabase
      .from("checkout_sessions")
      .insert({
        buyer_id: user.id,
        cart_snapshot: cartSnapshot,
        subtotal,
        platform_fee: platformFee,
        total_amount: totalAmount,
        cashfree_order_id: orderId,
        cashfree_payment_session_id: cashfreeData.payment_session_id,
        acknowledgment_accepted: true,
        acknowledgment_timestamp: new Date().toISOString(),
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Session creation error:", sessionError);
      return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      session_id: checkoutSession.id,
      cashfree_order_id: orderId,
      payment_session_id: cashfreeData.payment_session_id,
      payment_url: paymentUrl,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in create-checkout-session:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
