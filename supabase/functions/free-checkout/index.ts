import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetch commission rate from platform settings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCommissionRate(supabaseClient: any): Promise<number> {
  const { data } = await supabaseClient
    .from("platform_settings")
    .select("value")
    .eq("key", "commission_rate")
    .single();
  
  // Default to 15% if not set, convert percentage to decimal
  const value = data?.value as { rate?: number } | null;
  return (value?.rate || 15) / 100;
}

interface FreeCheckoutRequest {
  song_id: string;
  license_tier_id: string;
  acknowledgment_accepted: boolean;
  promo_code_id?: string;
  promo_discount?: number;
}

// Generate a unique license number
function generateLicenseNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `LIC-${year}-${random}`;
}

// Compute SHA-256 hash
async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
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

    const { song_id, license_tier_id, acknowledgment_accepted, promo_code_id, promo_discount }: FreeCheckoutRequest = await req.json();

    if (!acknowledgment_accepted) {
      return new Response(JSON.stringify({ error: "You must accept the license terms" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Free checkout: song=${song_id}, license=${license_tier_id}, buyer=${user.id}`);

    // 1. Fetch song with validation
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, title, seller_id, status, exclusive_sold, has_audio, has_lyrics")
      .eq("id", song_id)
      .single();

    if (songError || !song) {
      return new Response(JSON.stringify({ error: "Song not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Validate song is approved
    if (song.status !== "approved") {
      return new Response(JSON.stringify({ error: "Song is not available for purchase" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Check if buyer is the seller
    if (song.seller_id === user.id) {
      return new Response(JSON.stringify({ error: "You cannot claim your own song" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Check if song is exclusively sold
    if (song.exclusive_sold) {
      return new Response(JSON.stringify({ error: "This song has been exclusively sold and is no longer available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Fetch license tier and validate price is 0
    const { data: licenseTier, error: tierError } = await supabase
      .from("license_tiers")
      .select("*")
      .eq("id", license_tier_id)
      .eq("song_id", song_id)
      .single();

    if (tierError || !licenseTier) {
      return new Response(JSON.stringify({ error: "License tier not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allow if price is 0 OR if a promo code brings the total to 0
    const isPromoFree = promo_code_id && promo_discount && promo_discount > 0;
    if (Number(licenseTier.price) !== 0 && !isPromoFree) {
      return new Response(JSON.stringify({ error: "This is not a free license. Use regular checkout." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Check license availability
    if (!licenseTier.is_available) {
      return new Response(JSON.stringify({ error: "This license is no longer available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Check max sales for non-exclusive
    if (licenseTier.max_sales && licenseTier.current_sales >= licenseTier.max_sales) {
      return new Response(JSON.stringify({ error: "Maximum claims reached for this license" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isExclusive = licenseTier.license_type === "exclusive";

    // 8. Check if buyer already owns this license tier
    const { data: existingPurchase } = await supabase.rpc('check_existing_purchase', {
      p_buyer_id: user.id,
      p_song_id: song_id,
      p_license_type: licenseTier.license_type
    });

    if (existingPurchase) {
      return new Response(JSON.stringify({ error: "You already own this license for this song" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 9. For exclusive, check reservations
    if (isExclusive) {
      const { data: existingReservation } = await supabase
        .from("exclusive_reservations")
        .select("*")
        .eq("song_id", song_id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .neq("buyer_id", user.id)
        .single();

      if (existingReservation) {
        return new Response(JSON.stringify({ 
          error: "This exclusive license is currently reserved by another buyer"
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 10. Rate limiting - max 10 free claims per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentClaims } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("buyer_id", user.id)
      .eq("total_amount", 0)
      .gte("created_at", oneHourAgo);

    if (recentClaims && recentClaims >= 10) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 11. Generate order number
    const { data: orderNumber } = await supabase.rpc('generate_order_number');

    // Get buyer and seller profiles
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", song.seller_id)
      .single();

    // 12. Create checkout session with split fee fields (all 0 for free songs)
    const { data: checkoutSession, error: sessionError } = await supabase
      .from("checkout_sessions")
      .insert({
        buyer_id: user.id,
        cart_snapshot: [{
          song_id,
          license_tier_id,
          song_title: song.title,
          license_type: licenseTier.license_type,
          // Split fee fields - all 0 for free songs
          song_price: 0,
          platform_fee_total: 0,
          platform_fee_buyer: 0,
          platform_fee_seller: 0,
          buyer_total_paid: 0,
          seller_amount: 0,
          // Legacy fields
          price: 0,
          is_exclusive: isExclusive,
        }],
        subtotal: 0,
        platform_fee: 0,
        platform_fee_buyer: 0,
        platform_fee_seller: 0,
        total_amount: 0,
        status: "completed",
        acknowledgment_accepted: true,
        acknowledgment_timestamp: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Checkout session error:", sessionError);
      throw new Error("Failed to create checkout session");
    }

    // 13. Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        checkout_session_id: checkoutSession.id,
        order_number: orderNumber,
        subtotal: 0,
        platform_fee: 0,
        total_amount: 0,
        payment_status: "paid",
        fulfillment_status: "completed",
        paid_at: new Date().toISOString(),
        fulfilled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      throw new Error("Failed to create order");
    }

    // 14. Fetch commission rate and create order item
    const commissionRate = await getCommissionRate(supabase);
    
    const { data: orderItem, error: orderItemError } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        song_id,
        seller_id: song.seller_id,
        license_tier_id,
        license_type: licenseTier.license_type,
        is_exclusive: isExclusive,
        // Split fee fields - all 0 for free songs
        song_price: 0,
        platform_fee_total: 0,
        platform_fee_buyer: 0,
        platform_fee_seller: 0,
        buyer_total_paid: 0,
        // Legacy fields
        price: 0,
        commission_rate: commissionRate,
        commission_amount: 0,
        seller_amount: 0,
      })
      .select()
      .single();

    if (orderItemError) {
      console.error("Order item creation error:", orderItemError);
      throw new Error("Failed to create order item");
    }

    // 15. Create download access
    const { error: downloadAccessError } = await supabase
      .from("download_access")
      .insert({
        buyer_id: user.id,
        song_id,
        order_item_id: orderItem.id,
        access_type: "full",
        is_active: true,
      });

    if (downloadAccessError) {
      console.error("Download access error:", downloadAccessError);
    }

    // 16. Update license tier current_sales
    const { error: updateTierError } = await supabase
      .from("license_tiers")
      .update({ current_sales: (licenseTier.current_sales || 0) + 1 })
      .eq("id", license_tier_id);

    if (updateTierError) {
      console.error("Update tier error:", updateTierError);
    }

    // 17. If exclusive, mark song as exclusively sold
    if (isExclusive) {
      const { error: exclusiveError } = await supabase
        .from("songs")
        .update({
          exclusive_sold: true,
          exclusive_buyer_id: user.id,
          exclusive_sold_at: new Date().toISOString(),
        })
        .eq("id", song_id);

      if (exclusiveError) {
        console.error("Exclusive update error:", exclusiveError);
      }

      // Release any existing reservation
      await supabase
        .from("exclusive_reservations")
        .update({
          status: "completed",
          released_at: new Date().toISOString(),
          released_reason: "purchase_completed",
        })
        .eq("song_id", song_id)
        .eq("buyer_id", user.id);
    }

    // 18. Remove from cart if present
    await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .eq("song_id", song_id);

    // 19. Generate license document INLINE (not async call)
    try {
      console.log("Generating license document for order item:", orderItem.id);
      
      // Fetch license template
      const { data: template, error: templateError } = await supabase
        .from("license_templates")
        .select("*")
        .eq("license_type", licenseTier.license_type)
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (templateError || !template) {
        console.error("License template not found:", templateError);
        // Don't fail the checkout, just log the error
      } else {
        const licenseNumber = generateLicenseNumber();
        const buyerName = buyerProfile?.full_name || buyerProfile?.email || "Unknown Buyer";
        const sellerName = sellerProfile?.full_name || sellerProfile?.email || "Unknown Seller";
        const purchaseDate = new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });

        // Create content hash
        const hashContent = JSON.stringify({
          licenseNumber,
          orderItemId: orderItem.id,
          buyerId: user.id,
          sellerId: song.seller_id,
          songId: song_id,
          licenseType: licenseTier.license_type,
          price: 0,
          timestamp: new Date().toISOString(),
        });
        const documentHash = await computeHash(hashContent);

        const pdfStoragePath = `licenses/${user.id}/${licenseNumber}.html`;

        // Create minimal HTML license document
        const htmlContent = `<!DOCTYPE html>
<html><head><title>License - ${licenseNumber}</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px;line-height:1.6}
.header{text-align:center;border-bottom:3px double #333;padding-bottom:20px;margin-bottom:30px}
.logo{font-size:24px;font-weight:bold}h1{font-size:18px;text-align:center}
.info{background:#f5f5f5;padding:15px;margin:20px 0;border-left:4px solid #333}
.section{margin:20px 0}h2{font-size:14px;border-bottom:1px solid #ddd;padding-bottom:5px}
.footer{margin-top:40px;padding-top:20px;border-top:2px solid #333;font-size:10px;text-align:center;color:#666}
.hash{font-family:monospace;font-size:9px;word-break:break-all;background:#f9f9f9;padding:10px}</style></head>
<body>
<div class="header"><div class="logo">SONGMARKET</div><p>${template.template_name}</p><small>License No: ${licenseNumber}</small></div>
<h1>Music License Agreement</h1>
<div class="info">
<strong>Song:</strong> "${song.title}"<br>
<strong>License Type:</strong> ${licenseTier.license_type}<br>
<strong>Licensor:</strong> ${sellerName}<br>
<strong>Licensee:</strong> ${buyerName}<br>
<strong>Order:</strong> ${orderNumber}<br>
<strong>Date:</strong> ${purchaseDate}<br>
<strong>Fee:</strong> FREE (₹0)
</div>
<div class="section"><h2>Permitted Uses</h2><ul>${template.permitted_uses.map((u: string) => `<li>${u}</li>`).join('')}</ul></div>
<div class="section"><h2>Prohibited Uses</h2><ul>${template.prohibited_uses.map((u: string) => `<li>${u}</li>`).join('')}</ul></div>
<div class="section"><h2>Terms</h2><p>${template.ownership_clause}</p><p>${template.warranty_disclaimer}</p></div>
<div class="hash"><strong>Document Hash:</strong> ${documentHash}</div>
<div class="footer"><p>Generated by SongMarket on ${purchaseDate}</p></div>
</body></html>`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("license-documents")
          .upload(pdfStoragePath, htmlContent, {
            contentType: "text/html",
            upsert: false,
          });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
        } else {
          // Create license_documents record
          const { error: licenseError } = await supabase
            .from("license_documents")
            .insert({
              license_number: licenseNumber,
              order_item_id: orderItem.id,
              template_id: template.id,
              template_version: template.version,
              buyer_id: user.id,
              seller_id: song.seller_id,
              song_id: song_id,
              buyer_name: buyerName,
              seller_name: sellerName,
              song_title: song.title,
              license_type: licenseTier.license_type,
              price: 0,
              pdf_storage_path: pdfStoragePath,
              document_hash: documentHash,
              status: "active",
            });

          if (licenseError) {
            console.error("License document insert error:", licenseError);
          } else {
            console.log("License document created:", licenseNumber);
            
            // Update order_items with the license PDF URL for consistency
            const { error: updateOrderItemError } = await supabase
              .from("order_items")
              .update({ license_pdf_url: pdfStoragePath })
              .eq("id", orderItem.id);
            
            if (updateOrderItemError) {
              console.error("Failed to update order_items.license_pdf_url:", updateOrderItemError);
            } else {
              console.log("Updated order_items.license_pdf_url for:", orderItem.id);
            }
          }
        }
      }
    } catch (pdfError) {
      console.error("License document generation error (non-blocking):", pdfError);
    }

    console.log(`Free checkout completed: order=${order.id}, orderItem=${orderItem.id}`);

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      order_number: orderNumber,
      song_title: song.title,
      license_type: licenseTier.license_type,
      is_exclusive: isExclusive,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in free-checkout:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
