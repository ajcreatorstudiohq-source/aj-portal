#!/usr/bin/env node
/**
 * Generate Vercel secrets for AJ Super Portal.
 * Usage: node scripts/gen-secrets.mjs
 * Copy the printed values into Vercel → Project → Settings → Environment Variables.
 */
const { randomBytes } = require('crypto');

function secret(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

const offerwall = secret(32);
const nowpay = secret(32);

console.log(`
# ── Paste into Vercel Environment Variables (Production + Preview) ──

OFFERWALL_POSTBACK_SECRET=${offerwall}
AJ_POSTBACK_SECRET=${offerwall}
NOWPAYMENTS_IPN_SECRET=${nowpay}

# AdGem postback URL (replace YOUR_DOMAIN):
# https://YOUR_DOMAIN/api/postback?payout={amount}&status={state}&userId={player_id}&secret=${offerwall}

# NOWPayments dashboard → IPN Secret key must EQUAL NOWPAYMENTS_IPN_SECRET
# IPN callback URL: https://YOUR_DOMAIN/api/nowpayments-callback
`);
