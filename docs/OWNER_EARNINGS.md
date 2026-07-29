# Owner earnings — 70% dollars (not coins)

## Short answer (Roman Urdu)

**Activity / ads earn pe aapka 70% dollars / platform share hai — coins nahi.**

1. **Asal dollars** Adsterra, CPAGrip / offerwall, aur dusre ad networks ke **apne dashboard** se aate hain (PayPal / bank / network payout).
2. App users ko activity earn pe sirf **30% AJ Coins** deti hai. **70% user wallet mein kabhi nahi jata.**
3. Har earn event pe Firestore `AdminRevenue` mein aapka hissa **`ownerUsd` / `adminShare` (USD)** ke naam se record hota hai — yeh hisaab / ledger hai.

## AI Trading Bot — purchase-only (no ads-coin invest)

Bot **sirf Buy Coins (`purchasedCoins`)** se open hota hai — ads/earn wale coins se **nahi**.

| Field | Meaning |
|---|---|
| `purchasedCoins` | Wallet mein abhi bachi hui buy coins |
| `botFundedByPurchase` | Bot activate purchase se hua |
| Sync profits | Earned `balance` mein jate hain (`purchasedCoins` nahi) |

- Activate: `POST /api/bot/activate` (server checks purchased pool)
- Purchase IPN: `balance` + `purchasedCoins`
- Spend (PK / gifts / transfer): earned pehle, phir purchased — pool sync rehti hai
- Transfer receive / bot profits: sirf `balance` (bot open nahi kar sakte)

**Purane bots** jinke paas `botFundedByPurchase !== true`: pehle Buy Coins → dubara activate.

### Kya ab nuksan nahi hoga?

| Source | Owner safe? | Kyun |
|---|---|---|
| Watch Ads / Math / Captcha | Haan (agar CPC env ≤ real) | Adsterra $ aata hai; user ko chhota coin share |
| PK entry + ads | Haan | 100+100 coins + Adsterra start/end |
| Coin purchase → AI Bot | Haan | User ne real $ diya; bot % usi purchase pool se |
| Posts / referral / games | Covered by ads + purchase margin | Chhote fixed coins; surfaces pe ads |

**Zaroori:** Firebase Console se `firestore.rules` Publish karo. `NEXT_PUBLIC_ADSTERRA_CLICK_USD` real Adsterra CPC se zyada mat rakho.

## Ad-backed social economy

Modest coins on posts / games / referral are OK because those surfaces also run Adsterra.
PK takes **100 coins from each player** (200 total) and opens ads on **start + end**.
AI Trading Bot keeps daily % on invested coins so the feature stays useful.

Watch Ads = **10** · Math/Captcha = **5** each · Posts = **2** · Referral = **5** · Games = **5**.

## Adsterra Direct Link / Watch Ads (no-loss)

Adsterra aapko click ka **100%** deta hai (dashboard). App usi `$` se split karti hai:

| Party | Share | Example (`ADSTERRA_CLICK_USD = $0.05`) |
|---|---|---|
| **User** | **30%** | `$0.015` → **15 AJ Coins** (withdraw rate 1000:1) |
| **Aap** | **70%** | `$0.035` → `AdminRevenue` + real Adsterra balance |

### Exact coins shown in UI (same as credited)

| Action | Coins | Notes |
|---|---|---|
| Watch Ads (rewarded) | **10** | Adsterra Direct Link |
| Math Challenge | **5** | Opens Adsterra |
| Alpha Captcha | **5** | Opens Adsterra |
| TikReel / Pulse post | **2** | In-feed ads |
| Referral | **5** | Invite growth |
| Games install / milestone | **5** | Ads in games |
| AI Trading Bot | invested × 2.5% / 5% | Daily claim |
| Offerwall postback | `floor(payout × 0.3 × 1000)` | Partner `$` |
| PK entry | **100 each** (200 total) | 5 min · ads start+end |

- Constant: `ADSTERRA_CLICK_USD` (env: `NEXT_PUBLIC_ADSTERRA_CLICK_USD`)
- Helpers: `splitAdClickUsd()` / `computeRewardSplit()` / `REWARD_COIN_AMOUNTS`
- **Zaroori:** env mein apna **real average CPC** daalo. Agar click `$0.01` hai aur aap `$0.05` set rakho, user 30% withdraw liability Adsterra income se zyada ho sakti hai.

In-feed impressions (TikReel/Pulse): user ko coins nahi — estimate ledger aapke naam.

Fake `$5–$7` activity pools **hata diye** — ab har activity earn bhi ek Adsterra click USD pe 70/30 hai.

## Exact split (code)

### Activity earn (ads, offerwall, games, live view/host, etc.)

| Party | Share | Where it goes |
|---|---|---|
| **Owner (aap)** | **70%** | Real: ad/offerwall dashboards. Ledger: `AdminRevenue.ownerUsd` |
| **User** | **30%** | `users/{uid}.balance` as **AJ Coins only** |

Constants: `PLATFORM_EARN_SHARE = 0.7`, `USER_EARN_SHARE = 0.3`

### Gifting (alag split)

| Party | Share | Example: **500** gift |
|---|---|---|
| **Admin (aap)** | **40%** | **200** coins (ledger `ownerUsd`) |
| **Creator** | **60%** | **300** AJ Coins to creator wallet |

Constants: `GIFT_ADMIN_SHARE = 0.4`, `GIFT_CREATOR_SHARE = 0.6`  
Engine: `splitGiftCoins(giftCost)` → `POST /api/rewards/earn` (`live_gift`)

## How you “get” money

| Money source | What happens | Your share |
|---|---|---|
| Ads (Adsterra etc.) | Network pays **you** 100% of click | Withdraw from **network dashboard**; app keeps 70% in ledger after user 30% coins |
| Offerwall / CPA | Partner pays **you**; user gets **30% coins** | Remainder stays with you |
| Games / live / feed earn | User **30% coins**; **70% USD** → `AdminRevenue` | Do not pay that 70% to anyone |
| **Gifts** | Sender pays full; creator **60%**; you **40%** | Logged as `ownerUsd` / `adminShareCoins` |
| Coin purchases | User pays real $ → gets coins | Your margin after future payouts |

## What is *not* automatic

Firebase / this app **does not** wire-transfer USD into your bank.  
**Real cash-out = Adsterra / CPAGrip / payment provider dashboards.**  
`AdminRevenue` is the in-app **dollar / coin ledger**.

## Portal admin panel

Hub → Admin (shield) shows **Full Hisaab**:
- **Total · 100%** (users + admin ledger)
- User wallets (no % shown to normal users)
- Admin ledger + ads estimate

Ledger: `admin_stats/earnings` + `AdminRevenue` rows.

## User wallet

Users see only their own balance (no “30% share” label).  
Withdraw USD rate: **1000 🪙 = $1.000** (3 decimals).  
Buy rate stays separate (`COIN_RATE = 100` per purchase unit).

## Firestore fields to check

`AdminRevenue/{id}`:

- `currency: "USD"`
- `platformSharePct` — `0.7` (activity) or `0.4` (gifts)
- `ownerUsd` / `adminShare` — your dollars
- `adminShareCoins` — your coins ledger
- `userNet` / `userNetCoins` — what the user/creator got
- `clickUsd` — Adsterra click base (watch-ads claims)
