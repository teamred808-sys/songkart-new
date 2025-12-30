import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMMISSION_RATE = 0.15; // 15% platform commission
const EXCLUSIVE_RESERVATION_MINUTES = 30;

interface ValidateCartItemRequest {
  song_id: string;
  license_tier_id: string;
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

    const { song_id, license_tier_id }: ValidateCartItemRequest = await req.json();

    console.log(`Validating cart item: song=${song_id}, license=${license_tier_id}, buyer=${user.id}`);

    // 1. Fetch song with validation
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, title, seller_id, status, exclusive_sold, cover_image_url")
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
      return new Response(JSON.stringify({ error: "You cannot purchase your own song" }), {
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

    // 5. Check for active disputes
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id")
      .eq("status", "open")
      .or(`raised_by.eq.${song.seller_id},against.eq.${song.seller_id}`)
      .limit(1);

    if (disputes && disputes.length > 0) {
      return new Response(JSON.stringify({ error: "Song is currently under dispute and cannot be purchased" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Fetch license tier
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

    // 7. Check license availability
    if (!licenseTier.is_available) {
      return new Response(JSON.stringify({ error: "This license is no longer available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Check max sales for non-exclusive
    if (licenseTier.max_sales && licenseTier.current_sales >= licenseTier.max_sales) {
      return new Response(JSON.stringify({ error: "Maximum sales limit reached for this license" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isExclusive = licenseTier.license_type === "exclusive";

    // 9. Check if buyer already owns this license tier
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

    // 10. For exclusive licenses, check reservations
    if (isExclusive) {
      const { data: existingReservation } = await supabase
        .from("exclusive_reservations")
        .select("*")
        .eq("song_id", song_id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (existingReservation && existingReservation.buyer_id !== user.id) {
        return new Response(JSON.stringify({ 
          error: "This exclusive license is currently reserved by another buyer",
          reserved_until: existingReservation.expires_at
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create or update reservation
      if (!existingReservation) {
        const expiresAt = new Date(Date.now() + EXCLUSIVE_RESERVATION_MINUTES * 60 * 1000);
        
        const { error: reservationError } = await supabase
          .from("exclusive_reservations")
          .insert({
            song_id,
            buyer_id: user.id,
            license_tier_id,
            expires_at: expiresAt.toISOString(),
          });

        if (reservationError) {
          console.error("Reservation error:", reservationError);
          // If conflict, someone else got it first
          if (reservationError.code === "23505") {
            return new Response(JSON.stringify({ error: "This exclusive license was just reserved by another buyer" }), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    // 10. Calculate prices
    const basePrice = Number(licenseTier.price);
    const platformCommission = basePrice * COMMISSION_RATE;
    const finalPrice = basePrice;

    // 11. Check if item already in cart
    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("song_id", song_id)
      .single();

    if (existingItem) {
      // Update existing cart item
      const { error: updateError } = await supabase
        .from("cart_items")
        .update({
          license_tier_id,
          seller_id: song.seller_id,
          base_price: basePrice,
          platform_commission: platformCommission,
          final_price: finalPrice,
          is_exclusive: isExclusive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id);

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update cart item" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Insert new cart item
      const { error: insertError } = await supabase
        .from("cart_items")
        .insert({
          user_id: user.id,
          song_id,
          license_tier_id,
          seller_id: song.seller_id,
          base_price: basePrice,
          platform_commission: platformCommission,
          final_price: finalPrice,
          is_exclusive: isExclusive,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to add to cart" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`Cart item validated and added successfully for user ${user.id}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: existingItem ? "Cart updated" : "Added to cart",
      is_exclusive: isExclusive,
      reservation_expires: isExclusive ? new Date(Date.now() + EXCLUSIVE_RESERVATION_MINUTES * 60 * 1000).toISOString() : null
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in validate-cart-item:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
