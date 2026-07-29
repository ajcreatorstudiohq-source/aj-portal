import { NextResponse } from 'next/server';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { availablePurchasedCoins } from '../../../lib/coin-pools';

const BOT_PLANS: Record<string, { cost: number; rate: number }> = {
  basic: { cost: 2500, rate: 0.025 },
  vvip: { cost: 5000, rate: 0.05 },
};

/**
 * POST /api/bot/activate
 * Body: { tier: 'basic' | 'vvip' }
 *
 * AI Trading Bot opens ONLY with purchasedCoins (Buy Coins), never earned ads coins.
 */
export async function POST(request: Request) {
  try {
    const token = bearerFromRequest(request);
    if (!token) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const user = await verifyFirebaseIdToken(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const tier = String(body.tier || '').toLowerCase();
    const plan = BOT_PLANS[tier];
    if (!plan) {
      return NextResponse.json(
        { ok: false, error: 'invalid_tier', message: 'Choose Basic or VVIP bot.' },
        { status: 400 }
      );
    }

    const userRef = doc(db, 'users', user.uid);
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('user_not_found');
      const data = snap.data() as {
        balance?: number;
        purchasedCoins?: number;
        botTier?: string;
      };
      const balance = Math.max(0, Math.floor(Number(data.balance) || 0));
      const purchasedCoins = Math.max(0, Math.floor(Number(data.purchasedCoins) || 0));
      const purchasable = availablePurchasedCoins({ balance, purchasedCoins });

      if (purchasable < plan.cost) {
        return {
          ok: false as const,
          error: 'need_purchased_coins',
          balance,
          purchasedCoins: purchasable,
          need: plan.cost,
        };
      }
      if (balance < plan.cost) {
        return {
          ok: false as const,
          error: 'insufficient_balance',
          balance,
          purchasedCoins: purchasable,
          need: plan.cost,
        };
      }

      tx.update(userRef, {
        balance: balance - plan.cost,
        purchasedCoins: purchasable - plan.cost,
        botTier: tier,
        invested: plan.cost,
        botFundedByPurchase: true,
        botActivatedAt: serverTimestamp(),
        lastSync: serverTimestamp(),
      });

      return {
        ok: true as const,
        tier,
        cost: plan.cost,
        rate: plan.rate,
        balanceAfter: balance - plan.cost,
        purchasedAfter: purchasable - plan.cost,
      };
    });

    if (!result.ok) {
      const msg =
        result.error === 'need_purchased_coins'
          ? `AI Bot needs ${result.need?.toLocaleString()} purchased coins. You have ${result.purchasedCoins?.toLocaleString()} from Buy Coins. Earned ads coins cannot open the bot.`
          : 'Insufficient balance.';
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          purchasedCoins: result.purchasedCoins,
          need: result.need,
          message: msg,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      tier: result.tier,
      invested: result.cost,
      rate: result.rate,
      balance: result.balanceAfter,
      purchasedCoins: result.purchasedAfter,
      message: `${String(result.tier).toUpperCase()} BOT ACTIVATED with purchased coins only.`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'activate_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    plans: BOT_PLANS,
    rule: 'Bot opens only with purchasedCoins from Buy Coins — not earned ads coins.',
  });
}
