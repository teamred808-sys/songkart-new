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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { license_document_id, reason } = await req.json();

    if (!license_document_id) {
      return new Response(
        JSON.stringify({ error: "license_document_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Revocation reason required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find license document
    const { data: licenseDoc, error: licenseError } = await supabase
      .from("license_documents")
      .select("*")
      .eq("id", license_document_id)
      .single();

    if (licenseError || !licenseDoc) {
      return new Response(
        JSON.stringify({ error: "License document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (licenseDoc.status === "revoked") {
      return new Response(
        JSON.stringify({ error: "License is already revoked" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Revoke the license
    const { error: updateError } = await supabase
      .from("license_documents")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        revocation_reason: reason,
      })
      .eq("id", license_document_id);

    if (updateError) {
      console.error("Error revoking license:", updateError);
      throw new Error("Failed to revoke license");
    }

    // Disable download access
    await supabase
      .from("download_access")
      .update({ is_active: false })
      .eq("song_id", licenseDoc.song_id)
      .eq("buyer_id", licenseDoc.buyer_id);

    // Log the revocation
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "license_revoked",
      entity_type: "license_document",
      entity_id: license_document_id,
      metadata: {
        license_number: licenseDoc.license_number,
        buyer_id: licenseDoc.buyer_id,
        seller_id: licenseDoc.seller_id,
        song_id: licenseDoc.song_id,
        reason: reason,
      },
    });

    console.log(`License revoked: ${licenseDoc.license_number} by admin ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "License revoked successfully",
        license_number: licenseDoc.license_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Revoke license error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
