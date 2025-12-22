import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a unique license number
function generateLicenseNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `LIC-${year}-${random}`;
}

// Compute SHA-256 hash of content
async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Generate PDF content as HTML (will be converted to PDF)
function generateLicensePDFContent(data: {
  licenseNumber: string;
  buyerName: string;
  sellerName: string;
  songTitle: string;
  licenseType: string;
  templateName: string;
  price: number;
  orderNumber: string;
  purchaseDate: string;
  permittedUses: string[];
  prohibitedUses: string[];
  ownershipClause: string;
  warrantyDisclaimer: string;
  indemnificationClause: string;
  terminationConditions: string;
  governingLaw: string;
  platformDisclaimer: string;
  legalClauses: Record<string, unknown>;
  documentHash: string;
}): string {
  const {
    licenseNumber,
    buyerName,
    sellerName,
    songTitle,
    licenseType,
    templateName,
    price,
    orderNumber,
    purchaseDate,
    permittedUses,
    prohibitedUses,
    ownershipClause,
    warrantyDisclaimer,
    indemnificationClause,
    terminationConditions,
    governingLaw,
    platformDisclaimer,
    legalClauses,
    documentHash,
  } = data;

  const exclusivity = (legalClauses as any).exclusivity || "Non-Exclusive";
  const territory = (legalClauses as any).territory || "Worldwide";
  const duration = (legalClauses as any).duration || "Perpetual";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>License Agreement - ${licenseNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: 'Georgia', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24pt;
      font-weight: bold;
      color: #1a1a1a;
      letter-spacing: 2px;
    }
    .license-type {
      font-size: 14pt;
      color: #444;
      margin-top: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .license-number {
      font-size: 10pt;
      color: #666;
      margin-top: 5px;
    }
    h1 {
      font-size: 16pt;
      text-align: center;
      margin: 30px 0 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    h2 {
      font-size: 12pt;
      color: #333;
      margin-top: 25px;
      margin-bottom: 10px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
      padding: 15px;
      background: #f9f9f9;
      border: 1px solid #ddd;
    }
    .party {
      width: 45%;
    }
    .party-label {
      font-weight: bold;
      color: #666;
      font-size: 9pt;
      text-transform: uppercase;
    }
    .party-name {
      font-size: 12pt;
      margin-top: 5px;
    }
    .song-details {
      background: #f0f0f0;
      padding: 15px;
      margin: 20px 0;
      border-left: 4px solid #333;
    }
    .song-title {
      font-size: 14pt;
      font-weight: bold;
    }
    .detail-row {
      display: flex;
      margin: 5px 0;
    }
    .detail-label {
      width: 120px;
      color: #666;
      font-size: 10pt;
    }
    .detail-value {
      font-weight: 500;
    }
    ul {
      margin: 10px 0;
      padding-left: 25px;
    }
    li {
      margin: 5px 0;
    }
    .legal-text {
      text-align: justify;
      font-size: 10pt;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #333;
      font-size: 8pt;
      color: #666;
      text-align: center;
    }
    .verification {
      background: #f9f9f9;
      padding: 10px;
      margin-top: 20px;
      font-family: monospace;
      font-size: 8pt;
      word-break: break-all;
    }
    .watermark {
      position: fixed;
      bottom: 10mm;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8pt;
      color: #999;
    }
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
      border-top: 1px solid #333;
      padding-top: 10px;
      text-align: center;
    }
    .prohibited {
      color: #8b0000;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">SONGMARKET</div>
    <div class="license-type">${templateName}</div>
    <div class="license-number">License No: ${licenseNumber}</div>
  </div>

  <h1>Music License Agreement</h1>

  <div class="parties">
    <div class="party">
      <div class="party-label">Licensor (Seller)</div>
      <div class="party-name">${sellerName}</div>
    </div>
    <div class="party">
      <div class="party-label">Licensee (Buyer)</div>
      <div class="party-name">${buyerName}</div>
    </div>
  </div>

  <div class="song-details">
    <div class="song-title">"${songTitle}"</div>
    <div class="detail-row">
      <span class="detail-label">License Type:</span>
      <span class="detail-value">${licenseType.charAt(0).toUpperCase() + licenseType.slice(1)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Exclusivity:</span>
      <span class="detail-value">${exclusivity}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Territory:</span>
      <span class="detail-value">${territory}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Duration:</span>
      <span class="detail-value">${duration}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">License Fee:</span>
      <span class="detail-value">₹${price.toLocaleString("en-IN")}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Order Number:</span>
      <span class="detail-value">${orderNumber}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Purchase Date:</span>
      <span class="detail-value">${purchaseDate}</span>
    </div>
  </div>

  <h2>1. Grant of License</h2>
  <p class="legal-text">
    The Licensor hereby grants to the Licensee a ${exclusivity.toLowerCase()} license to use the musical composition 
    titled "${songTitle}" (the "Song") subject to the terms and conditions set forth in this Agreement.
  </p>

  <h2>2. Permitted Uses</h2>
  <p class="legal-text">The Licensee is authorized to use the Song for the following purposes:</p>
  <ul>
    ${permittedUses.map(use => `<li>${use}</li>`).join("\n    ")}
  </ul>

  <h2>3. Prohibited Uses</h2>
  <p class="legal-text prohibited">The Licensee is expressly prohibited from:</p>
  <ul class="prohibited">
    ${prohibitedUses.map(use => `<li>${use}</li>`).join("\n    ")}
  </ul>

  <h2>4. Ownership & Copyright</h2>
  <p class="legal-text">${ownershipClause}</p>

  <h2>5. Warranty Disclaimer</h2>
  <p class="legal-text">${warrantyDisclaimer}</p>

  <h2>6. Indemnification</h2>
  <p class="legal-text">${indemnificationClause}</p>

  <h2>7. Termination</h2>
  <p class="legal-text">${terminationConditions}</p>

  <h2>8. Governing Law</h2>
  <p class="legal-text">
    This Agreement shall be governed by and construed in accordance with the ${governingLaw}. 
    Any disputes arising out of this Agreement shall be subject to the exclusive jurisdiction of the courts in India.
  </p>

  <h2>9. Platform Disclaimer</h2>
  <p class="legal-text">${platformDisclaimer}</p>

  <h2>10. Entire Agreement</h2>
  <p class="legal-text">
    This Agreement constitutes the entire agreement between the parties concerning the subject matter hereof and 
    supersedes all prior agreements, understandings, negotiations, and discussions, whether oral or written.
  </p>

  <div class="signature-section">
    <div class="signature-box">
      <p>Licensor (Seller)</p>
      <p><em>Digitally Executed</em></p>
    </div>
    <div class="signature-box">
      <p>Licensee (Buyer)</p>
      <p><em>Digitally Executed</em></p>
    </div>
  </div>

  <div class="verification">
    <strong>Document Verification Hash (SHA-256):</strong><br>
    ${documentHash}
  </div>

  <div class="footer">
    <p>This license was generated automatically by SongMarket on ${purchaseDate}.</p>
    <p>This document is legally binding upon purchase completion.</p>
    <p>For verification, contact support@songmarket.com with License No: ${licenseNumber}</p>
  </div>

  <div class="watermark">
    SongMarket License Agreement | ${licenseNumber} | Generated: ${purchaseDate}
  </div>
</body>
</html>
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_item_id } = await req.json();

    if (!order_item_id) {
      throw new Error("order_item_id is required");
    }

    console.log("Generating license PDF for order item:", order_item_id);

    // Fetch order item with related data
    const { data: orderItem, error: orderItemError } = await supabase
      .from("order_items")
      .select(`
        *,
        orders!inner(order_number, buyer_id, created_at),
        songs!inner(title, seller_id),
        license_tiers!inner(license_type)
      `)
      .eq("id", order_item_id)
      .single();

    if (orderItemError || !orderItem) {
      console.error("Order item not found:", orderItemError);
      throw new Error("Order item not found");
    }

    // Fetch buyer profile
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", orderItem.orders.buyer_id)
      .single();

    // Fetch seller profile
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", orderItem.seller_id)
      .single();

    // Fetch active license template for this license type
    const { data: template, error: templateError } = await supabase
      .from("license_templates")
      .select("*")
      .eq("license_type", orderItem.license_tiers.license_type)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (templateError || !template) {
      console.error("License template not found:", templateError);
      throw new Error(`No active template found for license type: ${orderItem.license_tiers.license_type}`);
    }

    const licenseNumber = generateLicenseNumber();
    const buyerName = buyerProfile?.full_name || buyerProfile?.email || "Unknown Buyer";
    const sellerName = sellerProfile?.full_name || sellerProfile?.email || "Unknown Seller";
    const purchaseDate = formatDate(new Date(orderItem.orders.created_at));

    // Create content hash for integrity verification
    const hashContent = JSON.stringify({
      licenseNumber,
      orderItemId: order_item_id,
      buyerId: orderItem.orders.buyer_id,
      sellerId: orderItem.seller_id,
      songId: orderItem.song_id,
      licenseType: orderItem.license_type,
      price: orderItem.price,
      timestamp: new Date().toISOString(),
    });
    const documentHash = await computeHash(hashContent);

    // Generate HTML content
    const htmlContent = generateLicensePDFContent({
      licenseNumber,
      buyerName,
      sellerName,
      songTitle: orderItem.songs.title,
      licenseType: orderItem.license_type,
      templateName: template.template_name,
      price: orderItem.price,
      orderNumber: orderItem.orders.order_number,
      purchaseDate,
      permittedUses: template.permitted_uses,
      prohibitedUses: template.prohibited_uses,
      ownershipClause: template.ownership_clause,
      warrantyDisclaimer: template.warranty_disclaimer,
      indemnificationClause: template.indemnification_clause,
      terminationConditions: template.termination_conditions,
      governingLaw: template.governing_law,
      platformDisclaimer: template.platform_disclaimer,
      legalClauses: template.legal_clauses,
      documentHash,
    });

    // Convert HTML to PDF using external service or store as HTML
    // For now, we'll store the HTML which can be rendered as PDF client-side
    // In production, integrate with a PDF service like html-pdf-node, puppeteer, or external API
    
    const pdfStoragePath = `licenses/${orderItem.orders.buyer_id}/${licenseNumber}.html`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("license-documents")
      .upload(pdfStoragePath, htmlContent, {
        contentType: "text/html",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Failed to upload license document");
    }

    // Create license_documents record
    const { data: licenseDoc, error: licenseError } = await supabase
      .from("license_documents")
      .insert({
        license_number: licenseNumber,
        order_item_id: order_item_id,
        template_id: template.id,
        template_version: template.version,
        buyer_id: orderItem.orders.buyer_id,
        seller_id: orderItem.seller_id,
        song_id: orderItem.song_id,
        buyer_name: buyerName,
        seller_name: sellerName,
        song_title: orderItem.songs.title,
        license_type: orderItem.license_type,
        price: orderItem.price,
        document_hash: documentHash,
        pdf_storage_path: pdfStoragePath,
        metadata: {
          order_number: orderItem.orders.order_number,
          template_name: template.template_name,
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (licenseError) {
      console.error("License document creation error:", licenseError);
      throw new Error("Failed to create license document record");
    }

    // Update order_items with license PDF URL reference
    await supabase
      .from("order_items")
      .update({
        license_pdf_url: pdfStoragePath,
      })
      .eq("id", order_item_id);

    console.log("License PDF generated successfully:", licenseNumber);

    return new Response(
      JSON.stringify({
        success: true,
        license_number: licenseNumber,
        license_document_id: licenseDoc.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("License PDF generation error:", error);
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
