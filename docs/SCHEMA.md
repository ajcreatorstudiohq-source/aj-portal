# AJ Super Portal — Firestore Schema (Games / Offerwall / Revenue)

## `users/{uid}`

| Field | Type | Description |
|---|---|---|
| `balance` | number | AJ Coins wallet (cash-out eligible) |
| `unlockedGames` | string[] | Installed game ids (`rider`, `ludo`, …) |
| `gameProgress` | map | Per-game progress (see below) |
| `offerwallDayKey` | string | UTC date `YYYY-MM-DD` for daily cap |
| `offerwallDayCount` | number | Completions today |
| `lastRewardAt` | timestamp | Last wallet credit from milestone/offerwall |
| `lastRewardSource` | string | `game_milestone` \| `offerwall` \| … |
| `lastOfferwallAt` | timestamp | Last offerwall credit |

### `gameProgress.{gameId}`

```json
{
  "installed": true,
  "installedAt": "<timestamp>",
  "level": 5,
  "claimedMilestones": [3, 5],
  "lastLevelAt": "<timestamp>"
}
```

## `reward_ledger/{txId}`

Idempotent ledger for game milestone rewards.

- `txId` format: `milestone_{uid}_{gameId}_{level}`
- Fields: `uid`, `source`, `userCoins`, `adminCoins`, `userUsd`, `adminUsd`, `totalUsd`, `meta`, `createdAt`

## `offerwall_ledger/{txId}`

Idempotent ledger for offerwall credits.

- Postback: `offerwall_{providerTxId}`
- Authenticated UI: `offerwall_auth_{uid}_{offerId}`
- Fields: same split fields + `dayKey`, `meta.via`

## `AdminRevenue/{autoId}`

Platform revenue log for every split reward:

| Field | Description |
|---|---|
| `type` | `game_milestone` \| `offerwall` \| legacy types |
| `totalPool` | USD pool ($5–$7 band) |
| `userNet` | USD credited to user ($1–$1.50) |
| `adminShare` | USD remaining for platform |
| `userNetCoins` / `adminShareCoins` | Coin equivalents (`COIN_RATE = 100`) |
| `uid`, `txId`, `date` | Audit |

## Reward math

1. Deterministic split from `seed` via `computeRewardSplit(seed)`
2. Provider pool ∈ **[$5.00, $7.00]**
3. User credit ∈ **[$1.00, $1.50]** (AJ Coins = `floor(usd * 100)`)
4. Admin revenue = pool − user credit (logged, not paid to user)

## API surface

| Method | Path | Auth |
|---|---|---|
| POST | `/api/games/install` | Bearer Firebase ID token |
| PATCH | `/api/games/milestone` | Report level |
| POST | `/api/games/milestone` | Claim milestone reward |
| GET/POST | `/api/offerwall/callback` | Shared secret / HMAC |
| POST | `/api/offerwall/complete` | Bearer Firebase ID token |
| GET | `/api/offerwall/complete` | Public config |
