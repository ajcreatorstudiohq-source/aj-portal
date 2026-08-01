# Fresh economy reset (balances + ledgers → 0)

Test coins / inflated admin earnings ko wipe karke naya system **0** se start.

## Option A — Portal (recommended)

1. Publish updated `firestore.rules` (CEO delete/zero permissions).
2. Ensure Vercel has `FIREBASE_SERVICE_ACCOUNT_JSON` (best path).
3. Login as admin → Hub → **Admin (shield)**.
4. Red button: **Reset ALL coins + admin earnings → 0**
5. Confirm → type `RESET_ALL_TO_ZERO`

## Option B — CLI

```bash
# .env.local mein FIREBASE_SERVICE_ACCOUNT_JSON set karo
npm run reset-economy
```

## What gets reset

| Target | Action |
|---|---|
| `users/*/balance` | → **0** |
| `users/*/invested` | → **0** |
| `admin_stats/earnings` | all totals → **0** |
| `AdminRevenue` | docs deleted |
| `reward_ledger` | docs deleted |
| `offerwall_ledger` | docs deleted |
| `ad_events` | docs deleted |

**Not deleted:** profiles, posts, referral IDs, chats, live rooms.
