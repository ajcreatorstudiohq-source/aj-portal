import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { FieldValue, getAdminDb } from '../../lib/firebase-admin';
import { COIN_RATE } from '../../lib/economy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IPN_SECRET =
  process.env.NOWPAYMENTS_IPN_SECRET ||
  process.env.NOWPAYMENTS_IPN_KEY ||
  '';

function verifyNowPaymentsSignature(rawBody: string, signature: string | null): boolean {
  if (!IPN_SECRET || !signature) return false;
  try {
    const digest = createHmac('sha512', IPN_SECRET).update(rawBody).digest('hex');
    const a = Buffer.from(digest);
    const b = Buffer.from(String(signature));
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * POST /api/callback + /api/nowpayments-callback
 * Credits purchased coins via Admin SDK after IPN signature verification.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get('x-nowpayments-sig') ||
      request.headers.get('x-nowpayments-signature');

    if (!verifyNowPaymentsSignature(rawBody, signature)) {
      console.error('[nowpayments] invalid or missing IPN signature');
      return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 403 });
    }

    const body = JSON.parse(rawBody || '{}') as {
      payment_status?: string;
      order_id?: string;
      price_amount?: number | string;
      payment_id?: string | number;
      purchase_id?: string;
    };

    if (String(body.payment_status || '').toLowerCase() !== 'finished') {
      return NextResponse.json({ ok: true, ignored: true, status: body.payment_status });
    }

    const userId = String(body.order_id || '').trim();
    const payAmount = parseFloat(String(body.price_amount || '0')) || 0;
    if (!userId || payAmount <= 0) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }

    const coinsToAdd = Math.floor(payAmount * COIN_RATE);
    if (coinsToAdd <= 0) {
      return NextResponse.json({ ok: false, error: 'zero_coins' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ ok: false, error: 'admin_sdk_missing' }, { status: 503 });
    }

    const paymentId = String(body.payment_id || body.purchase_id || `${userId}_${payAmount}`);
    const ledgerRef = adminDb.collection('offerwall_ledger').doc(`nowpay_${paymentId}`);
    const userRef = adminDb.collection('users').doc(userId);

    const outcome = await adminDb.runTransaction(async (tx) => {
      const existing = await tx.get(ledgerRef);
      if (existing.exists) {
        return { duplicate: true as const, balance: 0, credited: 0 };
      }
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error('user_not_found');
      const data = userSnap.data() as { balance?: number; purchasedCoins?: number };
      const bal = Math.max(0, Math.floor(Number(data.balance) || 0));
      const purchased = Math.max(0, Math.floor(Number(data.purchasedCoins) || 0));
      const nextBal = bal + coinsToAdd;
      tx.set(ledgerRef, {
        uid: userId,
        source: 'nowpayments',
        paymentId,
        payAmount,
        coins: coinsToAdd,
        status: 'completed',
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(userRef, {
        balance: nextBal,
        purchasedCoins: purchased + coinsToAdd,
        lastPurchaseAt: FieldValue.serverTimestamp(),
        lastWalletWriteAt: FieldValue.serverTimestamp(),
      });
      return { duplicate: false as const, balance: nextBal, credited: coinsToAdd };
    });

    return NextResponse.json({
      ok: true,
      duplicate: outcome.duplicate,
      creditedCoins: outcome.credited,
      balance: outcome.balance,
    });
  } catch (error) {
    console.error('[nowpayments] Error processing payment:', error);
    const msg = error instanceof Error ? error.message : 'Fail';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
