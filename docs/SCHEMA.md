# AJ Super Portal — Firestore Schema (Multi-Source Monetization)

## Reward model (all channels)

| Band | USD | Coins (`COIN_RATE=100`) |
|---|---|---|
| Provider / activity pool | **$5.00 – $7.00** | ~500–700 |
| User wallet credit | **$1.00 – $1.50** | ~100–150 |
| Platform / admin | remainder | logged in `AdminRevenue` |

Engine: `computeRewardSplit(seed)` → `applySplitReward` / `POST /api/rewards/earn`

### Sources (`reward_sources.ts`)

`game_install` · `game_milestone` · `offerwall` · `tiktok_post` · `pulse_post` · `live_view` · `live_host` · `live_gift` · `ai_bot_sync` · `pk_match` · `referral`

## `users/{uid}`

| Field | Type | Description |
|---|---|---|
| `balance` | number | AJ Coins wallet |
| `unlockedGames` | string[] | Downloaded/installed game ids |
| `gameProgress.{gameId}` | map | `{ installed, level, claimedMilestones, … }` |
| `dailyRewards.{source}` | map | `{ dayKey, count }` per-source daily caps |
| `offerwallDayKey` / `offerwallDayCount` | string/number | Offerwall daily cap |
| `botTier` / `invested` / `lastSync` | bot fields | AI Trading Bot |
| `lastRewardAt` / `lastRewardSource` | audit | Last split credit |

## Ledgers

- `reward_ledger/{txId}` — all unified earn events (idempotent)
- `offerwall_ledger/{txId}` — offerwall postbacks / completes
- `AdminRevenue/{autoId}` — platform share of every $5–$7 pool

## APIs

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/rewards/earn` | Unified multi-channel earn |
| POST | `/api/games/install` | Download/install + first install reward |
| PATCH/POST | `/api/games/milestone` | Level progress / claim |
| GET/POST | `/api/offerwall/callback` | Provider postback |
| POST | `/api/offerwall/complete` | In-app offer complete |
| POST | `/api/callback` · `/api/nowpayments-callback` | Purchase IPN |

## Live streaming RTDB

- `live_frames/{roomId}/current` — JPEG frames (~6fps)
- `live_audio/{roomId}/offer|answer|ice_*` — legacy 1:1 audio
- `live_audio/{roomId}/join_requests/{uid}` — multi-viewer join
- `live_audio/{roomId}/peers/{uid}/*` — per-viewer WebRTC

## Ludo Star multiplayer RTDB

Deploy rules from repo root: `database.rules.json`

| Path | Purpose |
|---|---|
| `ludo/rooms/{CODE}` | Private lobby + match (`meta`, `seats`, `started`, `gameState`, `chat`) |
| `ludo/codes/{CODE}` | Code → room path index for join lookup |
| `ludo/rooms/{CODE}/seats/{slot}` | Seat 0–3 presence (`name`, `avatar`, `ready`, `uid`) |
| `ludo/rooms/{CODE}/gameState` | Sequenced turn sync (`seq`, `turn`, `diceValue`, `tokens`, `lastActor`) |
| `ludo/rooms/{CODE}/chat` | In-match chat / emoji bubbles |
| `ludo/rooms/{CODE}/meta/boardSkin` | Host board theme index |

Client: `public/games/ludo-elite-royal/index.html` (portal Firebase project `aj-super-portal`).  
Iframe query: `?ajGameId=ludo&uid={firebaseUid}&room={CODE}`.

See also: `docs/FIREBASE_AUTH_DOMAINS.md`
