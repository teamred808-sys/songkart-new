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

    // Get order if exists
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("cashfree_order_id", order_id)
      .single();

    const status = cashfreeData.order_status;
    const isPaid = status === "PAID";

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
