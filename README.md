# AJ Super Portal

Gaming, social, wallet, and offerwall hub built with Next.js.

## Features

- **Install & Level Unlock** — Games must be installed; wallet rewards unlock only at verified milestones ($1.00–$1.50 of a $5–$7 pool).
- **Offerwall** — Authenticated completions + provider postbacks with automated validation and admin revenue logging.
- **Firebase Google Auth** — See [docs/FIREBASE_AUTH_DOMAINS.md](docs/FIREBASE_AUTH_DOMAINS.md).
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

- Provider pool: **$5.00 – $7.00**
- User wallet: **$1.00 – $1.50** (AJ Coins via `COIN_RATE = 100`)
- Remainder logged to `AdminRevenue` as platform share

## Scripts

```bash
npm run dev
npm run build
npm start
```
