import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lovable AI Gateway config
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

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

const RAG_SYSTEM_PROMPT = `You are SongKart's friendly AI support assistant. Answer ONLY using the provided knowledge base context below. If the answer is not in the context, say you don't have that information and suggest contacting support@songkart.com.

Guidelines:
- Be concise, friendly, and helpful. Use bullet points and bold text for clarity.
- NEVER provide legal advice. For legal questions, suggest consulting a qualified lawyer.
- Stay strictly on-topic. For questions unrelated to SongKart or music licensing, politely redirect.
- Do NOT make up features or policies that don't exist.
- Keep responses under 300 words unless the user asks for detailed explanations.
- Base your answer strictly on the CONTEXT provided.`;

// Simple hash function for cache keys
function simpleHash(str: string): string {
  let hash = 0;
  const normalized = str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'q_' + Math.abs(hash).toString(36);
}

// Extract keywords from user message
function extractWords(message: string): string[] {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

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

    const { messages, session_id, skip_faq } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionId = session_id || crypto.randomUUID();

    // Initialize Supabase for logging and RAG
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

    const lastUserMsg = messages[messages.length - 1];
    const userText = lastUserMsg?.content || "";
    const userWords = extractWords(userText);
    const questionHash = simpleHash(userText);

    // Log user message
    if (lastUserMsg?.role === "user") {
      await supabase.from("chat_logs").insert({
        user_id: userId,
        session_id: sessionId,
        role: "user",
        content: userText,
        source: "user",
      });
    }

    // === STEP 1: Cache check ===
    const { data: cachedResponse } = await supabase
      .from("chat_response_cache")
      .select("response, source")
      .eq("question_hash", questionHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cachedResponse) {
      // Log cached response
      await supabase.from("chat_logs").insert({
        user_id: userId,
        session_id: sessionId,
        role: "assistant",
        content: cachedResponse.response,
        source: "cache",
      });

      return new Response(
        JSON.stringify({ response: cachedResponse.response, session_id: sessionId, type: cachedResponse.source === "faq" ? "faq" : "ai", source: "cache" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === STEP 2: FAQ matching (skip if skip_faq flag is set) ===
    if (!skip_faq && userWords.length > 0) {
      const { data: faqResults } = await supabase
        .from("faq")
        .select("question, answer, keywords")
        .eq("is_active", true);

      if (faqResults && faqResults.length > 0) {
        // Score each FAQ by keyword overlap
        let bestMatch: { answer: string; score: number } | null = null;

        for (const faq of faqResults) {
          const faqKeywords = (faq.keywords as string[]) || [];
          const overlap = userWords.filter(w => faqKeywords.includes(w)).length;
          const score = overlap / Math.max(faqKeywords.length, 1);

          if (overlap >= 2 && score > (bestMatch?.score || 0)) {
            bestMatch = { answer: faq.answer, score };
          }
        }

        if (bestMatch && bestMatch.score >= 0.2) {
          // Cache the FAQ response
          await supabase.from("chat_response_cache").upsert({
            question_hash: questionHash,
            question: userText,
            response: bestMatch.answer,
            source: "faq",
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: "question_hash" });

          // Log FAQ response
          await supabase.from("chat_logs").insert({
            user_id: userId,
            session_id: sessionId,
            role: "assistant",
            content: bestMatch.answer,
            source: "faq",
          });

          return new Response(
            JSON.stringify({ response: bestMatch.answer, session_id: sessionId, type: "faq", source: "faq" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // === STEP 3: Knowledge base retrieval ===
    let kbContext = "";
    
    if (userWords.length > 0) {
      const { data: kbResults } = await supabase
        .from("knowledge_base")
        .select("title, content, tags")
        .eq("is_active", true);

      if (kbResults && kbResults.length > 0) {
        // Score KB entries by relevance
        const scored = kbResults.map(kb => {
          const tags = (kb.tags as string[]) || [];
          const titleWords = extractWords(kb.title);
          const contentWords = extractWords(kb.content);

          let score = 0;
          for (const word of userWords) {
            if (tags.includes(word)) score += 3;
            if (titleWords.includes(word)) score += 2;
            if (contentWords.includes(word)) score += 1;
          }
          return { ...kb, score };
        });

        // Take top 3 relevant entries
        const topEntries = scored
          .filter(e => e.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        if (topEntries.length > 0) {
          kbContext = topEntries
            .map(e => `### ${e.title}\n${e.content}`)
            .join("\n\n");
        }
      }
    }

    // === STEP 4: Call Lovable AI Gateway with RAG context ===
    const systemPrompt = kbContext
      ? `${RAG_SYSTEM_PROMPT}\n\n--- CONTEXT ---\n${kbContext}\n--- END CONTEXT ---`
      : SYSTEM_PROMPT;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
    ];

    let assistantResponse: string | null = null;

    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const aiResponse = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: aiMessages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI Gateway error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          assistantResponse = "I'm receiving too many requests right now. Please try again in a moment. 🎵";
        } else if (aiResponse.status === 402) {
          assistantResponse = "I'm temporarily unavailable. Please contact support@songkart.com for assistance. 🎵";
        }
      } else {
        const data = await aiResponse.json();
        assistantResponse = data?.choices?.[0]?.message?.content ||
          "I'm sorry, I couldn't generate a response. Please try again.";
      }
    } catch (err) {
      console.error("AI Gateway call failed:", err);
    }

    // === STEP 6: Failsafe ===
    if (!assistantResponse) {
      assistantResponse =
        "I'm having trouble answering right now. Please contact support@songkart.com for assistance. 🎵";
    }

    // === STEP 5: Cache the AI response ===
    await supabase.from("chat_response_cache").upsert({
      question_hash: questionHash,
      question: userText,
      response: assistantResponse,
      source: "ai",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "question_hash" });

    // Log assistant response
    await supabase.from("chat_logs").insert({
      user_id: userId,
      session_id: sessionId,
      role: "assistant",
      content: assistantResponse,
      source: kbContext ? "ai_rag" : "ai",
    });

    return new Response(
      JSON.stringify({ response: assistantResponse, session_id: sessionId, type: "ai", source: kbContext ? "ai_rag" : "ai" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("support-chat error:", err);
    return new Response(
      JSON.stringify({
        response:
          "I'm having trouble answering right now. Please contact support@songkart.com for assistance. 🎵",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
