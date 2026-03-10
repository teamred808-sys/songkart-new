

## Fix: Chatbot Caching Error Responses

### Root Cause
The edge function caches **all** AI responses, including fallback error messages. Once an error was cached (when the old Gemini key failed), every subsequent identical question returns the cached error for 24 hours.

### Fix

**1. Database: Delete bad cache entries**
Run a migration to clear all cached error responses:
```sql
DELETE FROM chat_response_cache 
WHERE response LIKE '%having trouble answering%' 
   OR response LIKE '%temporarily unavailable%';
```

**2. Edge function: Don't cache error/fallback responses**
In `supabase/functions/support-chat/index.ts`, add a check before caching (around line 317):

```typescript
// Only cache successful AI responses, not fallback errors
const isFallback = assistantResponse.includes("having trouble answering") || 
                   assistantResponse.includes("temporarily unavailable");

if (!isFallback) {
  await supabase.from("chat_response_cache").upsert({ ... });
}
```

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/support-chat/index.ts` | Skip caching fallback/error responses |
| New migration | Delete existing bad cache entries |

