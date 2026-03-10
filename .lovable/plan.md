

## Fix: Switch Chatbot to Lovable AI Gateway

### Problem
The chatbot is broken due to two issues:
1. **Model `gemini-2.0-flash` has been discontinued** by Google (404 error)
2. **Gemini API key has zero quota** on free tier (429 error)

Both issues cause every request to fail, triggering the fallback "I'm having trouble answering" message.

### Solution
Switch from direct Google Gemini API calls to the **Lovable AI Gateway**, which is already configured in the project. This eliminates the need for any external API keys and uses the pre-provisioned `LOVABLE_API_KEY`.

### Changes

**File: `supabase/functions/support-chat/index.ts`**

Replace the direct Gemini API call (lines 289-341) with a call to the Lovable AI Gateway:
- URL: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Model: `google/gemini-3-flash-preview` (current recommended default)
- Auth: `Bearer LOVABLE_API_KEY`
- Remove the `loadApiKeys()` and `getNextKey()` key rotation logic (no longer needed)
- Convert the message format from Gemini's `contents/parts` format to OpenAI-compatible `messages` format (system + user/assistant roles)
- Keep all RAG logic (cache check, FAQ matching, KB retrieval) exactly as-is
- Keep rate limiting, logging, and failsafe behavior unchanged

### What stays the same
- Chat UI (no changes)
- FAQ matching logic
- Knowledge base retrieval
- Cache system
- Rate limiting
- Logging to `chat_logs`
- Fallback error message

