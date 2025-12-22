import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's JWT to get their identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user with anon client
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error("User verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Bootstrapping user: ${user.id}, email: ${user.email}`);

    // Use service role for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if profile exists
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    let profile = existingProfile;

    // Create profile if missing
    if (!existingProfile) {
      console.log(`Creating profile for user: ${user.id}`);
      const { data: newProfile, error: profileError } = await adminClient
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "",
        })
        .select()
        .single();

      if (profileError) {
        console.error("Failed to create profile:", profileError);
        // Don't fail - profile might already exist due to race condition
      } else {
        profile = newProfile;
      }
    }

    // Check if role exists
    const { data: existingRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    let roles = existingRoles?.map(r => r.role) || [];

    // Create role if missing
    if (!existingRoles || existingRoles.length === 0) {
      // Get role from user metadata, default to 'buyer'
      // Never allow self-assignment of 'admin' role
      let desiredRole = user.user_metadata?.role || "buyer";
      if (desiredRole === "admin") {
        desiredRole = "buyer"; // Prevent admin self-assignment
      }

      console.log(`Creating role '${desiredRole}' for user: ${user.id}`);
      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: desiredRole,
        });

      if (roleError) {
        console.error("Failed to create role:", roleError);
        // Don't fail - role might already exist due to race condition
      } else {
        roles = [desiredRole];
      }

      // If seller, ensure wallet exists
      if (desiredRole === "seller") {
        const { data: existingWallet } = await adminClient
          .from("seller_wallets")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!existingWallet) {
          console.log(`Creating seller wallet for user: ${user.id}`);
          await adminClient.from("seller_wallets").insert({ user_id: user.id });
        }
      }
    }

    // Determine primary role
    let primaryRole = "buyer";
    if (roles.includes("admin")) {
      primaryRole = "admin";
    } else if (roles.includes("seller")) {
      primaryRole = "seller";
    } else if (roles.includes("buyer")) {
      primaryRole = "buyer";
    }

    console.log(`Bootstrap complete for user: ${user.id}, role: ${primaryRole}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId: user.id,
        roles,
        primaryRole,
        profileExists: !!profile,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Bootstrap error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
