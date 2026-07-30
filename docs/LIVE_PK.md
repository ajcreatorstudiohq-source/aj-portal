# Live Matches (FREE) + short join IDs

## Short Live ID & PK Match ID (Ludo-style)
- **Live ID**: 6-char code (e.g. `A7K2M9`) — copy & send; friend pastes → joins instantly
- **PK Match ID**: `M` + 5 chars (e.g. `M3X8Q2`) — Free Match lobby like Ludo friend room
- Generator: `app/lib/join-codes.ts` (unique Firestore doc ids)

## Free live matches
- Starting or joining costs **0 coins**
- Host: Free Match → **Create Match ID** → share code
- Friend: paste Match ID → Join (TikReels Live or Free Match modal)
- `/api/pk/entry` registers only — no balance deduction

## Live streams
- TikReels → Live → Go Live (Agora) — free to watch
- Short Live ID shown on host UI with Copy

## Gifting (coins)
During **live streams** and **live matches**, viewers send catalog gifts via `/api/wallet/gift`:
- Sender pays full gift cost
- Creator receives **60%**
- Admin Hub receives **40%** (`live_gift`)
- Cinematic overlay syncs via `live_rooms/{id}/gifts` or `pk_sessions/{id}/gifts`

Gift catalog costs: 500 · 1000 · 2500 · 5000 · 8000 · 10000 AJ Coins
