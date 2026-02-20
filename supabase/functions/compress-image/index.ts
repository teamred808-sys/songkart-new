import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storagePath } = await req.json();
    if (!storagePath || typeof storagePath !== "string") {
      return new Response(
        JSON.stringify({ error: "storagePath is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Skip non-convertible formats
    const lowerPath = storagePath.toLowerCase();
    if (lowerPath.endsWith(".svg") || lowerPath.endsWith(".gif")) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Format not suitable for AVIF" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to download the original file
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("cms-media")
      .download(storagePath);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Failed to download original image", details: downloadError?.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Convert to AVIF using Sharp via npm
    const sharp = (await import("npm:sharp@0.33.2")).default;
    const inputBuffer = new Uint8Array(await fileData.arrayBuffer());

    const avifBuffer = await sharp(inputBuffer)
      .avif({ quality: 55, effort: 5 })
      .toBuffer();

    // Build AVIF storage path
    const originalName = storagePath.split("/").pop()!;
    const nameWithoutExt = originalName.replace(/\.[^.]+$/, "");
    const avifPath = `uploads/avif/${nameWithoutExt}.avif`;

    // Upload AVIF
    const { error: uploadError } = await adminClient.storage
      .from("cms-media")
      .upload(avifPath, avifBuffer, {
        contentType: "image/avif",
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: "Failed to upload AVIF", details: uploadError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from("cms-media")
      .getPublicUrl(avifPath);

    return new Response(
      JSON.stringify({ avifUrl: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("compress-image error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
