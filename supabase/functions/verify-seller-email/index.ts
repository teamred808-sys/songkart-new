import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[verify-seller-email] Request received");

  try {
    // Get token from query params or body
    const url = new URL(req.url);
    let token = url.searchParams.get("token");

    // Also try to get from body for POST requests
    if (!token && req.method === "POST") {
      try {
        const body = await req.json();
        token = body.token;
      } catch {
        // Body parsing failed, continue with null token
      }
    }

    if (!token) {
      console.error("[verify-seller-email] No token provided");
      return new Response(
        JSON.stringify({ error: "Verification token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[verify-seller-email] Token received, validating...");

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find the token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("seller_verification_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("[verify-seller-email] Token not found:", tokenError);
      return new Response(
        JSON.stringify({ error: "Invalid verification token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[verify-seller-email] Token found for user:", tokenData.user_id);

    // Check if already used
    if (tokenData.used_at) {
      console.log("[verify-seller-email] Token already used");
      return new Response(
        JSON.stringify({ error: "This verification link has already been used", already_used: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      console.log("[verify-seller-email] Token expired at:", tokenData.expires_at);
      return new Response(
        JSON.stringify({ error: "This verification link has expired. Please request a new one.", expired: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark token as used
    const { error: updateTokenError } = await supabaseAdmin
      .from("seller_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    if (updateTokenError) {
      console.error("[verify-seller-email] Token update error:", updateTokenError);
      return new Response(
        JSON.stringify({ error: "Could not process verification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[verify-seller-email] Token marked as used, updating profile");

    // Update the profile to set is_verified = true
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ is_verified: true })
      .eq("id", tokenData.user_id);

    if (profileError) {
      console.error("[verify-seller-email] Profile update error:", profileError);
      return new Response(
        JSON.stringify({ error: "Could not update verification status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[verify-seller-email] Profile verified successfully for user:", tokenData.user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email verified successfully! Your account is now verified.",
        user_id: tokenData.user_id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[verify-seller-email] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
