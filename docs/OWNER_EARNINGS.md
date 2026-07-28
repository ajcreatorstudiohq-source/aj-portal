# Owner earnings — 70% dollars (not coins)

## Short answer (Roman Urdu)

**Aapke 70% coins nahi — dollars / real money hain.**

1. **Asal dollars** Adsterra, CPAGrip / offerwall, aur dusre ad networks ke **apne dashboard** se aate hain (PayPal / bank / network payout).
2. App users ko sirf **30% AJ Coins** deti hai. **70% user wallet mein kabhi nahi jata.**
3. Har earn event pe Firestore `AdminRevenue` mein aapka hissa **`ownerUsd` / `adminShare` (USD)** ke naam se record hota hai — yeh hisaab / ledger hai.
4. Coins ka faida aapko is tarah milta hai: users jab coins **kharidte** hain (real money), gift/spend se **70% economy se nikal jata hai** (creator ko sirf 30%).

## Exact split (code)

| Party | Share | Where it goes |
|---|---|---|
| **Owner (aap)** | **70%** | Real: ad/offerwall dashboards. Ledger: `AdminRevenue.ownerUsd` |
| **User / creator** | **30%** | `users/{uid}.balance` as **AJ Coins only** (UI never shows `$`) |

Constants: `PLATFORM_EARN_SHARE = 0.7`, `USER_EARN_SHARE = 0.3` in `app/lib/economy.ts`.

- Activity pool (`computeRewardSplit`): pool ~$5–$7 → **always** `adminUsd = total × 0.70`, `userUsd = total × 0.30`.
- Gifts (`splitCoinPool`): gift cost coins → creator **30%**, owner keep **70%** (logged as USD via `COIN_RATE`).

## How you “get” the 70% in every case

| Money source | What happens | Your 70% |
|---|---|---|
| Ads (Adsterra etc.) | Network pays **you** full eCPM/click | You withdraw from **network dashboard**. App may log estimate in `AdminRevenue`. Users get **0** from raw ad track events. |
| Offerwall / CPA | Partner pays **you**; postback credits user **30% coin share** only | Remainder stays with you (partner payout − user coin liability). |
| Games / live / feed earn | Server credits user **30% coins**; writes **70% USD** to `AdminRevenue` | Ledger = your platform share; do not pay that 70% to anyone. |
| Gifts | Sender pays full gift; creator gets **30%**; **70% burned/kept** | Same — logged as `ownerUsd`. |
| Coin purchases | User pays real $ → gets coins | Your margin is purchase payout minus future 30% redemptions. |

## What is *not* automatic

Firebase / this app **does not** wire-transfer USD into your bank.  
**Real cash-out = Adsterra / CPAGrip / payment provider dashboards.**  
`AdminRevenue` is the in-app **dollar ledger** so you always see that 70% was reserved for you.

## Firestore fields to check

`AdminRevenue/{id}`:

- `currency: "USD"`
- `platformSharePct: 0.7`
- `ownerUsd` / `adminShare` — your dollars
- `userNet` / `userNetCoins` — what the user got (30%)
