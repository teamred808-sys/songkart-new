

## Update Cashfree Production Credentials

### What needs to happen
The project already has `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY` stored as backend secrets. These need to be updated with the new production credentials you provided.

### Steps
1. Update `CASHFREE_APP_ID` with the new App ID
2. Update `CASHFREE_SECRET_KEY` with the new Secret Key

Since you've already shared the values in chat, I'll update both secrets directly. No code changes are needed — all edge functions (`create-checkout-session`, `verify-payment`, `cashfree-webhook`, `process-payout`, `cashfree-payout-webhook`) already reference these secret names.

### Important Note
These are **production** credentials (the key contains `_prod_`). The Cashfree API endpoint in the edge functions should point to the production URL (`https://api.cashfree.com`) rather than sandbox (`https://sandbox.cashfree.com`). I'll verify this is correct in the existing code.

