

## AI Chat Support Feature for SongKart

### Overview
Floating chat widget with Google Gemini AI backend, 4-key round-robin load balancing, rate limiting, and chat logging.

### Architecture

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  ChatWidget.tsx  │────▶│  Edge Function:      │────▶│ Google      │
│  (floating btn)  │     │  support-chat        │     │ Gemini API  │
│  + chat panel    │     │  - key rotation      │     │ (4 keys)    │
└─────────────────┘     │  - rate limiting      │     └─────────────┘
                        │  - chat logging       │
                        └──────────────────────┘
```

### Implementation Plan

**1. Store 4 Gemini API keys as secrets**
- Use the `add_secret` tool to request `GEMINI_API_KEY_1` through `GEMINI_API_KEY_4` from the user.

**2. Create database table: `chat_logs`**
- Columns: `id`, `user_id` (nullable for anonymous), `session_id`, `role` (user/assistant), `content`, `created_at`
- No RLS needed (only written by edge function via service role)

**3. Create edge function: `support-chat`**
- Accepts `{ messages, session_id }` from client
- **Round-robin key rotation**: Uses an atomic counter stored in-memory (Deno global) cycling through keys 1-4. Falls back to next key on failure.
- **Rate limiting**: Tracks requests per IP/user in a simple in-memory map (10 req/min). Returns 429 if exceeded.
- **System prompt**: SongKart support assistant personality — answers only about licensing, pricing, uploading songs, buying, account issues, payouts, etc. Refuses off-topic questions politely.
- **Chat logging**: Inserts user message and AI response into `chat_logs` table.
- **Fallback**: Returns a friendly "We're experiencing issues, please try again or email support@songkart.com" message if all 4 keys fail.
- Calls `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`

**4. Create `ChatWidget` component**
- Floating button (bottom-right, `MessageCircle` icon) with unread indicator
- Expandable chat panel with message history, input field, send button
- Streams or displays responses with markdown rendering
- Stores `session_id` in localStorage for conversation continuity
- Shows typing indicator while waiting for response
- Handles 429 (rate limit) and error states with user-friendly messages

**5. Add ChatWidget to App.tsx**
- Render `<ChatWidget />` globally inside the providers, visible on all pages

### Files to Create/Modify

| File | Action |
|---|---|
| `supabase/functions/support-chat/index.ts` | Create — edge function with Gemini integration |
| `supabase/config.toml` | Modify — add `[functions.support-chat]` with `verify_jwt = false` |
| `src/components/chat/ChatWidget.tsx` | Create — floating chat UI component |
| `src/App.tsx` | Modify — add `<ChatWidget />` |
| DB migration | Create `chat_logs` table |

### Secrets Needed
- `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, `GEMINI_API_KEY_4`

