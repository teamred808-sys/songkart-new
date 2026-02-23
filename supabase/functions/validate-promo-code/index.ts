import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateRequest {
  code: string;
  cart_items: Array<{
    song_id: string;
    license_type: string;
    license_price: number;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const { code, cart_items }: ValidateRequest = await req.json();

    if (!code || !cart_items || cart_items.length === 0) {
      return new Response(JSON.stringify({ valid: false, message: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Fetch all matching promo codes (active, not expired, usage not exceeded)
    const { data: promos, error: promoError } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", normalizedCode)
      .eq("is_active", true);

    if (promoError || !promos || promos.length === 0) {
      return new Response(JSON.stringify({ valid: false, message: "Invalid promo code" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter valid promos (not expired, usage not exceeded)
    const now = new Date().toISOString();
    const validPromos = promos.filter(p => {
      if (p.expires_at && p.expires_at < now) return false;
      if (p.usage_limit !== null && p.usage_count >= p.usage_limit) return false;
      return true;
    });

    if (validPromos.length === 0) {
      return new Response(JSON.stringify({ valid: false, message: "Promo code has expired or reached its usage limit" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already used this code
    for (const promo of validPromos) {
      const { data: existingUsage } = await supabase
        .from("promo_code_usages")
        .select("id")
        .eq("promo_code_id", promo.id)
        .eq("user_id", user.id)
        .limit(1);

      if (existingUsage && existingUsage.length > 0) {
        return new Response(JSON.stringify({ valid: false, message: "You have already used this promo code" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Priority: admin codes first, then seller codes
    const sortedPromos = validPromos.sort((a, b) => {
      if (a.creator_role === "admin" && b.creator_role !== "admin") return -1;
      if (a.creator_role !== "admin" && b.creator_role === "admin") return 1;
      return 0;
    });

    // Try to find a matching promo for cart items
    let bestMatch: {
      promo_code_id: string;
      discount_amount: number;
      discount_type: string;
      discount_value: number;
      applied_to_song_id: string | null;
      applied_to_license_type: string | null;
    } | null = null;

    for (const promo of sortedPromos) {
      // Calculate total applicable amount
      let totalDiscount = 0;
      let matched = false;

      for (const item of cart_items) {
        // Check song_id match (if promo is song-specific)
        if (promo.song_id && promo.song_id !== item.song_id) continue;

        // Check license_type match (if promo is tier-specific)
        if (promo.license_type && promo.license_type !== item.license_type) continue;

        // Check min_purchase_amount
        if (promo.min_purchase_amount && item.license_price < promo.min_purchase_amount) continue;

        // Calculate discount for this item
        let itemDiscount = 0;
        if (promo.discount_type === "percentage") {
          itemDiscount = Math.min(item.license_price, Math.round(item.license_price * promo.discount_value / 100));
        } else {
          itemDiscount = Math.min(item.license_price, promo.discount_value);
        }

        totalDiscount += itemDiscount;
        matched = true;
      }

      if (matched && totalDiscount > 0) {
        bestMatch = {
          promo_code_id: promo.id,
          discount_amount: totalDiscount,
          discount_type: promo.discount_type,
          discount_value: promo.discount_value,
          applied_to_song_id: promo.song_id,
          applied_to_license_type: promo.license_type,
        };
        break; // Use first (highest priority) match
      }
    }

    if (!bestMatch) {
      return new Response(JSON.stringify({ 
        valid: false, 
        message: "Promo code is not applicable to items in your cart" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      valid: true,
      ...bestMatch,
      message: `Discount of ${bestMatch.discount_type === 'percentage' ? bestMatch.discount_value + '%' : '₹' + bestMatch.discount_value} applied!`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in validate-promo-code:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ valid: false, message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
