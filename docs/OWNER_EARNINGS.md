# Owner earnings — 70% dollars (not coins)

## Short answer (Roman Urdu)

**Activity / ads earn pe aapka 70% dollars / platform share hai — coins nahi.**

1. **Asal dollars** Adsterra, CPAGrip / offerwall, aur dusre ad networks ke **apne dashboard** se aate hain (PayPal / bank / network payout).
2. App users ko activity earn pe sirf **30% AJ Coins** deti hai. **70% user wallet mein kabhi nahi jata.**
3. Har earn event pe Firestore `AdminRevenue` mein aapka hissa **`ownerUsd` / `adminShare` (USD)** ke naam se record hota hai — yeh hisaab / ledger hai.

## Exact split (code)

### Activity earn (ads, offerwall, games, live view/host, etc.)

| Party | Share | Where it goes |
|---|---|---|
| **Owner (aap)** | **70%** | Real: ad/offerwall dashboards. Ledger: `AdminRevenue.ownerUsd` |
| **User** | **30%** | `users/{uid}.balance` as **AJ Coins only** |

Constants: `PLATFORM_EARN_SHARE = 0.7`, `USER_EARN_SHARE = 0.3`

### Gifting (alagsplit)

| Party | Share | Example: **500** gift |
|---|---|---|
| **Admin (aap)** | **40%** | **200** coins (ledger `ownerUsd`) |
| **Creator** | **60%** | **300** AJ Coins to creator wallet |

Constants: `GIFT_ADMIN_SHARE = 0.4`, `GIFT_CREATOR_SHARE = 0.6`  
Engine: `splitGiftCoins(giftCost)` → `POST /api/rewards/earn` (`live_gift`)

## How you “get” money

| Money source | What happens | Your share |
|---|---|---|
| Ads (Adsterra etc.) | Network pays **you** | Withdraw from **network dashboard** |
| Offerwall / CPA | Partner pays **you**; user gets **30% coins** | Remainder stays with you |
| Games / live / feed earn | User **30% coins**; **70% USD** → `AdminRevenue` | Do not pay that 70% to anyone |
| **Gifts** | Sender pays full; creator **60%**; you **40%** | Logged as `ownerUsd` / `adminShareCoins` |
| Coin purchases | User pays real $ → gets coins | Your margin after future payouts |

## What is *not* automatic

Firebase / this app **does not** wire-transfer USD into your bank.  
**Real cash-out = Adsterra / CPAGrip / payment provider dashboards.**  
`AdminRevenue` is the in-app **dollar / coin ledger**.

## Firestore fields to check

`AdminRevenue/{id}`:

- `currency: "USD"`
- `platformSharePct` — `0.7` (activity) or `0.4` (gifts)
- `ownerUsd` / `adminShare` — your dollars
- `userNet` / `userNetCoins` — what the user/creator got
