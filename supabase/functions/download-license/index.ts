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

    const { license_document_id, order_item_id } = await req.json();

    if (!license_document_id && !order_item_id) {
      return new Response(
        JSON.stringify({ error: "license_document_id or order_item_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find license document
    let licenseDoc;
    if (license_document_id) {
      const { data, error } = await supabase
        .from("license_documents")
        .select("*")
        .eq("id", license_document_id)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "License document not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      licenseDoc = data;
    } else {
      const { data, error } = await supabase
        .from("license_documents")
        .select("*")
        .eq("order_item_id", order_item_id)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "License document not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      licenseDoc = data;
    }

    // Check authorization: buyer, seller, or admin
    const isAdmin = await checkIsAdmin(supabase, user.id);
    const isBuyer = licenseDoc.buyer_id === user.id;
    const isSeller = licenseDoc.seller_id === user.id;

    if (!isBuyer && !isSeller && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if license is revoked
    if (licenseDoc.status === "revoked" && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "This license has been revoked" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL for download (expires in 1 hour)
    const { data: signedUrl, error: signError } = await supabase.storage
      .from("license-documents")
      .createSignedUrl(licenseDoc.pdf_storage_path, 3600);

    if (signError || !signedUrl) {
      console.error("Error creating signed URL:", signError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log access for audit
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "license_download",
      entity_type: "license_document",
      entity_id: licenseDoc.id,
      metadata: {
        license_number: licenseDoc.license_number,
        accessor_role: isAdmin ? "admin" : isBuyer ? "buyer" : "seller",
      },
    });

    console.log(`License download requested: ${licenseDoc.license_number} by user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        download_url: signedUrl.signedUrl,
        license_number: licenseDoc.license_number,
        license_type: licenseDoc.license_type,
        song_title: licenseDoc.song_title,
        status: licenseDoc.status,
        expires_in: 3600,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Download license error:", error);
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

async function checkIsAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  
  return !!data;
}
