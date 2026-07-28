# AJ Super Portal

Gaming, social, wallet, and offerwall hub built with Next.js.

## Features

- **Download & Level Unlock** — Download/install games, then clear milestones to earn.
- **Unified earn engine** — TikReels, Pulse, Live view/host, gifts, AI bot sync, Offerwall, referrals: pool **$5–$7** split **exactly 70% owner (USD ledger) / 30% user (AJ Coins)**. See [docs/OWNER_EARNINGS.md](docs/OWNER_EARNINGS.md).
- **Live & Pakistan matches** — Multi-viewer WebRTC audio, smoother RTDB frames, YouTube live match panel.
- **Offerwall** — Postbacks + in-app completes with validation.
- **Firebase Google Auth** — See [docs/FIREBASE_AUTH_DOMAINS.md](docs/FIREBASE_AUTH_DOMAINS.md).
- **TikReels Storage / Firestore rules** — See [docs/FIREBASE_STORAGE_FIRESTORE_RULES.md](docs/FIREBASE_STORAGE_FIRESTORE_RULES.md) (`storage.rules`, `firestore.rules`).
- **Schema** — See [docs/SCHEMA.md](docs/SCHEMA.md).

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Google sign-in locally

1. Firebase Console → Authentication → Settings → Authorized domains
2. Ensure `localhost` is listed
3. Use **Continue with Google**

## Key APIs

| Endpoint | Purpose |
|---|---|
| `POST /api/games/install` | Unlock/install a game |
| `PATCH /api/games/milestone` | Report level progress |
| `POST /api/games/milestone` | Claim milestone reward |
| `GET\|POST /api/offerwall/callback` | Provider postback (secret/HMAC) |
| `POST /api/offerwall/complete` | In-app offer completion |

## Revenue split

- **Owner 70%** — real dollars from Adsterra / offerwall dashboards; in-app ledger `AdminRevenue.ownerUsd`
- **User 30%** — AJ Coins only (`COIN_RATE = 100`)
- Activity pool: **$5.00 – $7.00**, always split 70/30
- Gifts: creator gets **30%** of gift cost; owner keeps **70%**

## Scripts

```bash
npm run dev
npm run build
npm start
```
