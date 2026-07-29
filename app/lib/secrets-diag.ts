/**
 * Server helpers for deploy secrets — never expose secret values.
 */
import 'server-only';

export function offerwallPostbackSecretConfigured(): boolean {
  const s =
    process.env.OFFERWALL_POSTBACK_SECRET || process.env.AJ_POSTBACK_SECRET || '';
  return s.trim().length >= 8;
}

export function nowPaymentsIpnSecretConfigured(): boolean {
  const s =
    process.env.NOWPAYMENTS_IPN_SECRET || process.env.NOWPAYMENTS_IPN_KEY || '';
  return s.trim().length >= 8;
}

export function secretsDiag() {
  return {
    offerwallPostbackSecret: offerwallPostbackSecretConfigured(),
    nowpaymentsIpnSecret: nowPaymentsIpnSecretConfigured(),
    firebaseAdminJson: !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim(),
    tip: 'Generate with: npm run gen-secrets — then set on Vercel + AdGem/NOWPayments dashboards',
  };
}
