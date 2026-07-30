# Live Matches (FREE) + Gifting

## Free live matches
- Starting or joining a live match / PK battle costs **0 coins**
- `/api/pk/entry` only registers participation — no balance deduction
- UI: TikReels → Live → **Free Match**, or challenge modal (no entry fee)

## Live streams
- TikReels → Live → Go Live (Agora) — free to watch
- Vertical swipe reels of active rooms

## Gifting (coins)
During **live streams** and **live matches**, viewers send catalog gifts via `/api/wallet/gift`:
- Sender pays full gift cost
- Creator receives **60%**
- Admin Hub receives **40%** (`live_gift`)
- Cinematic overlay syncs via `live_rooms/{id}/gifts` or `pk_sessions/{id}/gifts`

Gift catalog costs: 500 · 1000 · 2500 · 5000 · 8000 · 10000 AJ Coins
