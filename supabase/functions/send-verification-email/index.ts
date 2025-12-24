import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[send-verification-email] Request received");

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[send-verification-email] No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create client with user's token to get their info
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("[send-verification-email] User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-verification-email] User authenticated:", user.id);

    // Check if user is already verified
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_verified, email, full_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[send-verification-email] Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Could not fetch profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.is_verified) {
      console.log("[send-verification-email] User already verified");
      return new Response(
        JSON.stringify({ error: "Account is already verified", already_verified: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for recent verification emails (rate limiting - 1 per 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recentTokens, error: recentError } = await supabaseAdmin
      .from("seller_verification_tokens")
      .select("id, created_at")
      .eq("user_id", user.id)
      .gte("created_at", twoMinutesAgo)
      .is("used_at", null);

    if (recentError) {
      console.error("[send-verification-email] Recent tokens check error:", recentError);
    }

    if (recentTokens && recentTokens.length > 0) {
      console.log("[send-verification-email] Rate limited - recent email exists");
      return new Response(
        JSON.stringify({ 
          error: "Verification email was recently sent. Please check your inbox or wait 2 minutes before requesting again.",
          rate_limited: true 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a secure token (UUID format)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    console.log("[send-verification-email] Creating verification token");

    // Store the token
    const { error: insertError } = await supabaseAdmin
      .from("seller_verification_tokens")
      .insert({
        user_id: user.id,
        token: token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("[send-verification-email] Token insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Could not create verification token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-verification-email] Token created, sending email");

    // Get the app URL from environment or construct it
    const appUrl = Deno.env.get("APP_URL") || "https://vxegvnndkeoubqnruiqj.lovableproject.com";
    const verificationLink = `${appUrl}/verify-email?token=${token}`;

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "SongKart <noreply@songkart.com>",
      to: [profile.email],
      subject: "Verify your SongKart seller account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Verify your email address</h1>
          <p style="color: #666; font-size: 16px;">
            Hi ${profile.full_name || "there"},
          </p>
          <p style="color: #666; font-size: 16px;">
            Thank you for signing up as a seller on SongKart! Please click the button below to verify your email address and unlock unlimited song uploads.
          </p>
          <div style="margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Verify My Email
            </a>
          </div>
          <p style="color: #999; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this verification, you can safely ignore this email.
          </p>
          <p style="color: #999; font-size: 14px;">
            Or copy and paste this link in your browser:<br/>
            <a href="${verificationLink}" style="color: #f97316;">${verificationLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            © ${new Date().getFullYear()} SongKart. All rights reserved.
          </p>
        </div>
      `,
    });

    console.log("[send-verification-email] Email send response:", emailResponse);

    if (emailResponse.error) {
      console.error("[send-verification-email] Email send failed:", emailResponse.error);
      
      // Clean up the token since email failed
      await supabaseAdmin
        .from("seller_verification_tokens")
        .delete()
        .eq("token", token);

      // Check if it's a domain verification issue
      const errorMessage = emailResponse.error.message || "";
      if (errorMessage.includes("verify a domain") || errorMessage.includes("testing emails")) {
        return new Response(
          JSON.stringify({ 
            error: "Email service requires domain verification. Please contact support or try again later.",
            needs_domain_verification: true
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to send verification email. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-verification-email] Email sent successfully to:", profile.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent successfully",
        email_id: emailResponse.data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[send-verification-email] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
