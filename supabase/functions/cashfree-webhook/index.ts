import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp",
};

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert ArrayBuffer to hex string
function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify Cashfree webhook signature using HMAC-SHA256
async function verifyWebhookSignature(
  body: string,
  signature: string | null,
  timestamp: string | null,
  secretKey: string
): Promise<{ valid: boolean; reason?: string }> {
  // Cashfree sends signature in header
  if (!signature) {
    return { valid: false, reason: "Missing webhook signature header" };
  }

  if (!timestamp) {
    return { valid: false, reason: "Missing webhook timestamp header" };
  }

  // Validate timestamp to prevent replay attacks (5 minute window)
  const timestampMs = parseInt(timestamp, 10);
  const currentMs = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;
  
  if (isNaN(timestampMs)) {
    return { valid: false, reason: "Invalid timestamp format" };
  }
  
  if (Math.abs(currentMs - timestampMs) > fiveMinutesMs) {
    return { valid: false, reason: "Webhook timestamp too old (possible replay attack)" };
  }

  try {
    // Cashfree signature format: timestamp + raw body
    const signaturePayload = timestamp + body;
    
    // Import the secret key for HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Generate expected signature
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(signaturePayload)
    );
    
    const expectedSignature = bytesToHex(signatureBuffer);
    
    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return { valid: false, reason: "Signature length mismatch" };
    }
    
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    
    if (result !== 0) {
      return { valid: false, reason: "Signature verification failed" };
    }
    
    return { valid: true };
  } catch (error) {
    console.error("Signature verification error:", error);
    return { valid: false, reason: "Signature verification error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cashfreeSecretKey = Deno.env.get("CASHFREE_SECRET_KEY");
    
    if (!cashfreeSecretKey) {
      console.error("CASHFREE_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    console.log("Webhook received, verifying signature...");

    // Verify webhook signature to prevent fake payment notifications
    const verification = await verifyWebhookSignature(body, signature, timestamp, cashfreeSecretKey);
    
    if (!verification.valid) {
      console.error("Webhook signature verification failed:", verification.reason);
      
      // Log the failed attempt for security monitoring
      await supabase
        .from("activity_logs")
        .insert({
          entity_type: "webhook",
          action: "signature_verification_failed",
          metadata: {
            reason: verification.reason,
            ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
            user_agent: req.headers.get("user-agent"),
            timestamp: new Date().toISOString(),
          }
        });
      
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Webhook signature verified successfully");
    
    const payload = JSON.parse(body);
    const { data, type } = payload;

    console.log(`Webhook type: ${type}, Order ID: ${data?.order?.order_id}`);

    if (type === "PAYMENT_SUCCESS_WEBHOOK" || type === "ORDER_PAID") {
      const orderId = data.order.order_id;
      const paymentId = data.payment?.cf_payment_id || data.payment_id;

      // Find checkout session
      const { data: checkoutSession, error: sessionError } = await supabase
        .from("checkout_sessions")
        .select("*")
        .eq("cashfree_order_id", orderId)
        .single();

      if (sessionError || !checkoutSession) {
        console.error("Checkout session not found:", orderId);
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already processed (idempotency)
      if (checkoutSession.status === "completed") {
        console.log("Order already processed:", orderId);
        return new Response(JSON.stringify({ success: true, message: "Already processed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update checkout session status
      await supabase
        .from("checkout_sessions")
        .update({ 
          status: "processing",
        })
        .eq("id", checkoutSession.id);

      // Generate order number
      const { data: orderNumberData } = await supabase.rpc("generate_order_number");
      const orderNumber = orderNumberData || `ORD${Date.now()}`;

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
          payment_method: data.payment?.payment_method || "cashfree",
          cashfree_order_id: orderId,
          cashfree_payment_id: paymentId,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        throw new Error("Failed to create order");
      }

      console.log("Order created:", order.id);

      // Create order items and process each song
      const cartSnapshot = checkoutSession.cart_snapshot as any[];
      
      for (const item of cartSnapshot) {
        // Generate watermark code
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
            price: item.price,
            commission_rate: item.commission_rate,
            commission_amount: item.commission_amount,
            seller_amount: item.seller_amount,
            watermark_code: watermarkCode,
          })
          .select()
          .single();

        if (itemError) {
          console.error("Order item creation error:", itemError);
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
          } else {
            console.log("License PDF generation triggered for order item:", orderItem.id);
          }
        } catch (pdfError) {
          console.error("License PDF generation error:", pdfError);
          // Don't fail the webhook if PDF generation fails - it can be regenerated later
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

        // For exclusive licenses, lock the song
        if (item.is_exclusive) {
          await supabase
            .from("songs")
            .update({
              exclusive_sold: true,
              exclusive_buyer_id: checkoutSession.buyer_id,
              exclusive_sold_at: new Date().toISOString(),
            })
            .eq("id", item.song_id);

          // Mark reservation as completed
          await supabase
            .from("exclusive_reservations")
            .update({
              status: "completed",
            })
            .eq("song_id", item.song_id)
            .eq("buyer_id", checkoutSession.buyer_id)
            .eq("status", "active");
        }

        // Update license tier sales count
        await supabase
          .from("license_tiers")
          .update({
            current_sales: (await supabase
              .from("license_tiers")
              .select("current_sales")
              .eq("id", item.license_tier_id)
              .single()).data?.current_sales + 1 || 1
          })
          .eq("id", item.license_tier_id);

        // Create transaction record
        await supabase
          .from("transactions")
          .insert({
            buyer_id: checkoutSession.buyer_id,
            seller_id: item.seller_id,
            song_id: item.song_id,
            license_tier_id: item.license_tier_id,
            amount: item.price,
            commission_rate: item.commission_rate,
            commission_amount: item.commission_amount,
            seller_amount: item.seller_amount,
            payment_status: "completed",
            payment_method: "cashfree",
            payment_id: paymentId,
          });
      }

      // Clear cart
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", checkoutSession.buyer_id);

      // Update checkout session to completed
      await supabase
        .from("checkout_sessions")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", checkoutSession.id);

      // Update order fulfillment status
      await supabase
        .from("orders")
        .update({
          fulfillment_status: "completed",
          fulfilled_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      console.log("Order fulfilled successfully:", order.id);

      return new Response(JSON.stringify({ success: true, order_id: order.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (type === "PAYMENT_FAILED_WEBHOOK") {
      const orderId = data.order.order_id;

      // Find and update checkout session
      await supabase
        .from("checkout_sessions")
        .update({ status: "failed" })
        .eq("cashfree_order_id", orderId);

      // Release any exclusive reservations
      const { data: session } = await supabase
        .from("checkout_sessions")
        .select("buyer_id, cart_snapshot")
        .eq("cashfree_order_id", orderId)
        .single();

      if (session) {
        const cartSnapshot = session.cart_snapshot as any[];
        for (const item of cartSnapshot) {
          if (item.is_exclusive) {
            await supabase
              .from("exclusive_reservations")
              .update({
                status: "released",
                released_at: new Date().toISOString(),
                released_reason: "payment_failed",
              })
              .eq("song_id", item.song_id)
              .eq("buyer_id", session.buyer_id)
              .eq("status", "active");
          }
        }
      }

      console.log("Payment failed for order:", orderId);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Webhook received" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
