import { NextResponse } from 'next/server';
import { db } from '../../../firebaseConfig';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { COIN_RATE } from '../../lib/economy';

/**
 * NOWPayments IPN — credits purchased AJ Coins.
 * Increments both `balance` and `purchasedCoins` so AI Bot can use buy-only funds.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('💰 Notification Received:', body);

    if (body.payment_status === 'finished') {
      const userId = String(body.order_id || '');
      const payAmount = parseFloat(String(body.price_amount || '0'));
      if (!userId || !Number.isFinite(payAmount) || payAmount <= 0) {
        return NextResponse.json({ ok: false, error: 'invalid_order' }, { status: 400 });
      }

      const coinsToAdd = Math.floor(payAmount * COIN_RATE);
      if (coinsToAdd < 1) {
        return NextResponse.json({ ok: false, error: 'zero_coins' }, { status: 400 });
      }

      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
      }

      await updateDoc(userRef, {
        balance: increment(coinsToAdd),
        purchasedCoins: increment(coinsToAdd),
        lastPurchaseAt: new Date().toISOString(),
        lastPurchaseCoins: coinsToAdd,
        lastPurchaseUsd: payAmount,
      });

      console.log(`✅ Success: ${coinsToAdd} purchased coins added to ${userId}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Error processing payment:', error);
    return NextResponse.json({ error: 'Fail' }, { status: 500 });
  }
}
