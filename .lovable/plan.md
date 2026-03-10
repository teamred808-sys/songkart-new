

## RAG Layer for AI Support Chatbot

### Overview
Add FAQ matching, knowledge base retrieval, and response caching to the existing `support-chat` edge function. Minimal UI changes — only add "Was this helpful?" buttons for FAQ responses.

### Database Changes (Migration)

Create two new tables and add a `source` column to `chat_logs`:

```sql
-- FAQ table
CREATE TABLE public.faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge base table
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Response cache table
CREATE TABLE public.chat_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash TEXT UNIQUE NOT NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Add source column to chat_logs
ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai';

-- RLS: all tables readable by service role (edge function uses service key)
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_response_cache ENABLE ROW LEVEL SECURITY;

-- Admin-only write, public read for FAQ and KB
CREATE POLICY "Anyone can read active FAQ" ON public.faq FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read active KB" ON public.knowledge_base FOR SELECT USING (is_active = true);
CREATE POLICY "Service can manage cache" ON public.chat_response_cache FOR ALL USING (true);
```

Seed initial FAQ and knowledge base entries covering common SongKart topics (licensing, pricing, account management, etc.).

### Edge Function Changes (`supabase/functions/support-chat/index.ts`)

Insert RAG logic **before** the existing Gemini API call. No changes to key rotation, rate limiting, or CORS.

**New flow inside the handler:**

1. **Cache check** — Hash the user message, query `chat_response_cache` for unexpired match. If found, return cached response with `source` field.

2. **FAQ matching** — Query `faq` table, check if any entry's `keywords` array overlaps with words from the lowercase user message. If match found, return FAQ answer with `"type": "faq"` flag. Log with `source: 'faq'`.

3. **Knowledge base retrieval** — If no FAQ match, search `knowledge_base` using keyword matching against `tags` and `title`/`content` text search. Take top 3 results and concatenate into a context block.

4. **Modified Gemini prompt** — Replace the system prompt with the RAG-enhanced version that includes the retrieved context and instructs the AI to only answer from provided knowledge. Fall back to the original system prompt if no KB content found.

5. **Cache storage** — After successful AI response, store in `chat_response_cache` with 24-hour expiry.

6. **Logging** — Add `source` field (`'faq'`, `'ai'`, `'cache'`) to `chat_logs` inserts.

### UI Changes (`src/components/chat/ChatWidget.tsx`)

Minimal additions only:

1. **Handle `type: "faq"` responses** — When the response includes `type: "faq"`, show "Was this helpful?" with 👍/👎 buttons below the message.

2. **👍 Yes** — Dismisses the buttons (conversation stays as-is).

3. **👎 No** — Sends a follow-up request to the edge function with a flag like `skip_faq: true` to force AI processing, appending "The FAQ answer wasn't helpful, please provide more detail" context.

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/support-chat/index.ts` | Add FAQ matching, KB retrieval, caching, RAG prompt |
| `src/components/chat/ChatWidget.tsx` | Add FAQ feedback buttons, handle `type` field in response |
| New migration | Create `faq`, `knowledge_base`, `chat_response_cache` tables; alter `chat_logs` |

### Seed Data

Pre-populate ~10-15 FAQ entries and ~10 knowledge base articles covering:
- License types (Personal, Commercial, Exclusive)
- Pricing and payment methods
- Seller tiers and account health
- Upload process and song management
- Payout and withdrawal process
- Account verification

