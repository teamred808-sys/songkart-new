import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Round-robin key rotation
let keyIndex = 0;

function loadApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const k = Deno.env.get(`GEMINI_API_KEY_${i}`);
    if (k) keys.push(k);
  }
  return keys;
}

function getNextKey(keys: string[]): string {
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return key;
}

// Rate limiting: 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 60000);

const SYSTEM_PROMPT = `You are SongKart's friendly AI support assistant. You help users with questions about:

- **Buying songs**: How to browse, purchase, download, and use licensed music
- **Selling songs**: How to upload, price, and manage songs as a seller
- **Licensing**: Explaining Personal, Commercial, and Exclusive license types and their terms
- **Pricing & Payments**: How pricing works, payment methods, currencies, and refund policies
- **Account management**: Profile settings, verification, account health, and seller tiers
- **Payouts & Wallets**: How seller earnings work, withdrawal process, and payout verification
- **Technical issues**: Login problems, download issues, audio playback, and general troubleshooting

Guidelines:
- Be concise, friendly, and helpful. Use bullet points and bold text for clarity.
- If you don't know a specific answer, suggest the user contact support@songkart.com
- NEVER provide legal advice. For legal questions, suggest consulting a qualified lawyer.
- Stay strictly on-topic. For questions unrelated to SongKart or music licensing, politely redirect: "I'm here to help with SongKart-related questions! For anything else, I'd recommend searching online or reaching out to a specialist."
- Do NOT make up features or policies that don't exist.
- Keep responses under 300 words unless the user asks for detailed explanations.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, session_id } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionId = session_id || crypto.randomUUID();

    // Initialize Supabase for logging
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID if authenticated
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await userClient.auth.getUser(token);
        userId = data?.user?.id || null;
      } catch { /* anonymous user */ }
    }

    // Log user message
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === "user") {
      await supabase.from("chat_logs").insert({
        user_id: userId,
        session_id: sessionId,
        role: "user",
        content: lastUserMsg.content,
      });
    }

    // Build Gemini request with conversation history
    const geminiContents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Understood! I'm SongKart's support assistant. How can I help you today?" }] },
    ];

    for (const msg of messages) {
      geminiContents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    // Try keys with round-robin and fallback
    let assistantResponse: string | null = null;
    let lastError: string | null = null;
    const triedKeys = new Set<number>();

    while (triedKeys.size < API_KEYS.length || API_KEYS.length === 0) {
      // Initialize keys on first call
      if (API_KEYS.length === 0) getNextKey();
      if (API_KEYS.length === 0) break;

      const currentIndex = keyIndex % API_KEYS.length;
      if (triedKeys.has(currentIndex) && triedKeys.size >= API_KEYS.length) break;
      triedKeys.add(currentIndex);

      const apiKey = getNextKey();

      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 1024,
              },
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
              ],
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errText = await geminiResponse.text();
          console.error(`Gemini API error (key ${currentIndex + 1}):`, geminiResponse.status, errText);
          lastError = errText;
          continue;
        }

        const data = await geminiResponse.json();
        assistantResponse =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I'm sorry, I couldn't generate a response. Please try again.";
        break;
      } catch (err) {
        console.error(`Gemini call failed (key ${currentIndex + 1}):`, err);
        lastError = err instanceof Error ? err.message : String(err);
        continue;
      }
    }

    // Fallback if all keys failed
    if (!assistantResponse) {
      console.error("All Gemini API keys failed. Last error:", lastError);
      assistantResponse =
        "I'm sorry, I'm experiencing technical difficulties right now. Please try again in a few moments, or reach out to us directly at **support@songkart.com** — we're happy to help! 🎵";
    }

    // Log assistant response
    await supabase.from("chat_logs").insert({
      user_id: userId,
      session_id: sessionId,
      role: "assistant",
      content: assistantResponse,
    });

    return new Response(
      JSON.stringify({ response: assistantResponse, session_id: sessionId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("support-chat error:", err);
    return new Response(
      JSON.stringify({
        response:
          "I'm sorry, something went wrong. Please try again or contact us at **support@songkart.com**. 🎵",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
