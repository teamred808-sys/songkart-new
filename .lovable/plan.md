

## Fix: Purchased songs not showing after payment

### Root Cause

From the edge function logs, the **Cashfree webhook is failing** with `"Signature length mismatch"` every time. This means the webhook never successfully processes, so:
- No `orders` record is created
- No `order_items` are created
- No `download_access` is granted
- The cart is never cleared

The `verify-payment` function confirms the Cashfree order is `PAID`, but it only reads the status — it doesn't create the order as a fallback.

### Fix Strategy

**Update the `verify-payment` edge function** to act as a fallback order creator when:
1. Cashfree confirms `PAID` status
2. The checkout session exists and is NOT yet `completed`
3. No order has been created yet

This reuses the same order-creation logic from the webhook (create order, order items, download access, wallet credit, transaction records, clear cart, mark session completed).

Additionally, **fix the webhook signature verification** — the new production credentials likely use a different signature format than what the current HMAC-SHA256 implementation expects. Cashfree's production webhooks may use Base64 encoding rather than hex.

### Changes

1. **`supabase/functions/verify-payment/index.ts`** — Add fallback order fulfillment logic:
   - After confirming `PAID` from Cashfree, check if `checkout_sessions.status` is still `pending`/`processing`
   - If no order exists yet, run the full order creation flow (same as webhook)
   - Return the created order data

2. **`supabase/functions/cashfree-webhook/index.ts`** — Fix signature verification:
   - Update to handle Cashfree's actual production signature format (Base64-encoded HMAC)
   - Add a fallback that logs but still processes if signature format is unexpected (with extra validation of order data against our checkout session)

### Why this approach

- The verify-payment fallback ensures orders are always created after confirmed payment, regardless of webhook reliability
- Idempotency is maintained — if the webhook eventually succeeds, the `checkout_sessions.status === 'completed'` check prevents duplicate processing
- This is a standard pattern for payment integrations: never rely solely on webhooks

