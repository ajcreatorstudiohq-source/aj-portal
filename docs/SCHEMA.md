# AJ Super Portal — Firestore Schema (Multi-Source Monetization)

## Reward model (all channels)

| Party | Share | Form |
|---|---|---|
| **Owner / platform** | **70%** | USD ledger (`AdminRevenue.ownerUsd`) + real ad/offerwall network payouts |
| **User / creator** | **30%** | AJ Coins only (`users.balance`) — never shown as `$` in UI |

| Band | USD | Coins (`COIN_RATE=100`) |
|---|---|---|
| Provider / activity pool | **$5.00 – $7.00** | ~500–700 |
| User wallet credit | **exactly 30% of pool** | ~150–210 |
| Platform / admin | **exactly 70% of pool** | logged in `AdminRevenue` |

Engine: `computeRewardSplit(seed)` / `splitGiftCoins(giftCost)` → `applySplitReward` / `POST /api/rewards/earn`

**Gifts:** admin **40%** / creator **60%** of gift cost (e.g. 500 → admin 200, creator 300).

See [OWNER_EARNINGS.md](./OWNER_EARNINGS.md) for how the owner receives dollars.

### Sources (`reward_sources.ts`)

`game_install` · `game_milestone` · `offerwall` · `offerwall_video` · `app_download` · `tiktok_post` · `pulse_post` · `live_view` · `live_host` · `live_gift` · `ai_bot_sync` · `pk_match` · `referral`

## `users/{uid}`

| Field | Type | Description |
|---|---|---|
| `balance` | number | AJ Coins wallet (signup bonus = **0**) |
| `referralId` | string | Unique share code (`AJ########`) |
| `referredBy` | string | Referrer uid (once) |
| `unlockedGames` | string[] | Downloaded/installed game ids |
| `gameProgress.{gameId}` | map | `{ installed, level, claimedMilestones, … }` |
| `dailyRewards.{source}` | map | `{ dayKey, count }` per-source daily caps |
| `offerwallDayKey` / `offerwallDayCount` | string/number | Offerwall daily cap |
| `botTier` / `invested` / `lastSync` | bot fields | AI Trading Bot |
| `lastRewardAt` / `lastRewardSource` | audit | Last split credit |
| `chat_partners/{otherUid}` | subcollection | DM inbox row (`chatId`, `lastMessage`, friend id) |

## Direct messages (TikTok-style)

| Path | Purpose |
|---|---|
| `chats/{uidA_uidB}` | Shared thread (`participants`, `lastMessage`) |
| `chats/{chatId}/messages/{id}` | Real-time messages both users see |

See `docs/TIKTOK_DM.md`.

## Ledgers

- `reward_ledger/{txId}` — all unified earn events (idempotent)
- `offerwall_ledger/{txId}` — offerwall postbacks / completes / rewarded video
- `ad_events/{autoId}` — Monetag impression / click / complete / fail
- `ad_reward_sessions/{sessionId}` — short-lived rewarded-video anti-replay sessions
- `AdminRevenue/{autoId}` — owner share USD (`ownerUsd`, `adminShareCoins`) + `platformSharePct`
- `admin_stats/earnings` — running owner total (`totalOwnerUsd`, `totalOwnerCoins`) for Admin panel
- `referral_ids/{code}` — unique referral code → `{ uid }`

**Referral:** `REFERRAL_BONUS_COINS = 25` per successful invite. Signup bonus = **0**.

## Wallet display

- Users see **AJ Coins** + **withdraw USD** (`coins ÷ CASH_RATE`, **1000 🪙 = $1**)
- Buy/top-up still uses `COIN_RATE` (100 🪙 per $1 purchase unit)
- Min withdraw: 20,000 🪙 = **$20.00**

## APIs

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/rewards/earn` | Unified multi-channel earn |
| POST | `/api/games/install` | Download/install + first install reward |
| PATCH/POST | `/api/games/milestone` | Level progress / claim |
| GET/POST | `/api/offerwall/callback` | Provider postback |
| POST | `/api/offerwall/complete` | In-app offer complete |
| POST | `/api/ads/track` | Ad impression / click / complete tracking |
| POST | `/api/ads/rewarded` | Offerwall rewarded video prepare + complete |
| POST | `/api/admin/backfill-referrals` | CEO: assign referralId to all users missing one |
| POST | `/api/callback` · `/api/nowpayments-callback` | Purchase IPN |

## Ad placements

| Placement ID | Surface |
|---|---|
| `hub_nav_interstitial` | Hub card navigation overlay |
| `offerwall_rewarded_video` | Offerwall Watch & Earn |
| `games_banner` / `games_interstitial` | Gaming Zone |
| `tikreel_infeed` / `pulse_infeed` | Social feeds (every 4th item) |
| `live_go_banner` / `live_join_banner` / `live_matches_banner` | Live streaming |

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
