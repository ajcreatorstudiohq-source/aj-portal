import { NextResponse } from 'next/server';
import { applyFlatCoins } from '../../../lib/reward-engine';
import {
  CASH_RATE,
  PLATFORM_EARN_SHARE,
  USER_EARN_SHARE,
  coinsToUsd,
} from '../../../lib/economy';
import { uidFromAdsterraPsid } from '../../../lib/adsterra-link';
import { FieldValue, getAdminDb } from '../../../lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POSTBACK_SECRET =
  process.env.ADSTERRA_POSTBACK_SECRET ||
  process.env.OFFERWALL_POSTBACK_SECRET ||
  process.env.AJ_POSTBACK_SECRET ||
  process.env.THEOREMREACH_SECRET ||
  'f3f1599acbdf40f16cf2eb54a0907306a1f';

/**
 * GET|POST /api/ads/adsterra-postback
 *
 * Real Adsterra payout only — NO estimated CPC.
 * Splits exact payout USD: 30% → user AJ Coins (shown as full standard reward),
 * 70% → Admin Hub wallet + settled Hisaab.
 *
 * Configure in your tracker / Adsterra-compatible postback:
 *   https://YOUR_DOMAIN/api/ads/adsterra-postback?user_id={uid}&payout={payout}&txid={clickid}&secret=YOUR_SECRET
 *
 * Also accepts: atpay, revenue, amount, psid, subid, subid_short
 */
function readParams(url: URL, body: Record<string, unknown>) {
  const g = (k: string) => String(url.searchParams.get(k) || body[k] || '');
  const psid = g('psid') || g('placement_sub_id') || g('subid_short') || '';
  const subid = g('subid') || g('sub_id') || '';
  const uidRaw =
    g('userId') ||
    g('user_id') ||
    g('uid') ||
    subid ||
    uidFromAdsterraPsid(psid) ||
    '';
  return {
    uid: String(uidRaw || '').trim(),
    psid,
    txId:
      g('txid') ||
      g('transaction_id') ||
      g('click_id') ||
      g('clickid') ||
      g('subid_short') ||
      g('lead_id') ||
      psid ||
      '',
    payout:
      parseFloat(
        g('payout') ||
          g('atpay') ||
          g('revenue') ||
          g('amount') ||
          g('currency') ||
          g('value') ||
          '0'
      ) || 0,
    secret: g('secret') || g('key') || g('token') || g('password'),
    status: (g('status') || g('event') || g('state') || 'completed').toLowerCase(),
  };
}

function userCoinsFromPayoutUsd(payoutUsd: number): number {
  return Math.floor(Math.max(0, payoutUsd) * USER_EARN_SHARE * CASH_RATE);
}

async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    let body: Record<string, unknown> = {};
    if (request.method === 'POST') {
      const ct = request.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      } else {
        const text = await request.text();
        try {
          body = Object.fromEntries(new URLSearchParams(text));
        } catch {
          body = {};
        }
      }
    }

    const params = readParams(url, body);

    if (!params.secret || params.secret !== POSTBACK_SECRET) {
      return NextResponse.json({ ok: false, error: 'invalid_secret' }, { status: 403 });
    }
    if (!params.uid) {
      return NextResponse.json(
        { ok: false, error: 'missing_userId', message: 'Pass user_id or psid/subid with Firebase uid' },
        { status: 400 }
      );
    }
    if (!(params.payout > 0)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'missing_payout',
          message: 'Real Adsterra payout USD required (payout / atpay / revenue). Estimates rejected.',
        },
        { status: 400 }
      );
    }
    if (!/^(lead|success|completed|complete|approved|ok|1|true)$/i.test(params.status)) {
      return NextResponse.json({ ok: false, error: 'rejected_status' }, { status: 400 });
    }

    const userReward = userCoinsFromPayoutUsd(params.payout);
    if (userReward <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'payout_too_small',
          message: `payout $${params.payout} yields 0 user coins at 30% × ${CASH_RATE}`,
        },
        { status: 400 }
      );
    }

    const txRaw = params.txId || `adsterra_${params.uid}_${params.payout}_${Date.now()}`;
    const txId = `adsterra_${txRaw}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 180);
    const userUsd = coinsToUsd(userReward);
    const adminUsd = Number((params.payout - userUsd).toFixed(6));

    const result = await applyFlatCoins({
      uid: params.uid,
      txId,
      source: 'offerwall_video',
      coins: userReward,
      settledPayoutUsd: params.payout,
      bookAdminEarnings: true,
      meta: {
        provider: 'adsterra',
        providerPayoutUsd: params.payout,
        providerPayout: params.payout,
        userSharePct: USER_EARN_SHARE,
        platformSharePct: PLATFORM_EARN_SHARE,
        cashRate: CASH_RATE,
        userReward,
        userUsd,
        adminUsd,
        displayLabel: 'Watch Ads Reward',
        userVisibleReward: userReward,
        via: 'adsterra_real_postback',
        fromPostback: true,
        settled: true,
        estimated: false,
        psid: params.psid || undefined,
      },
      ledgerCollection: 'offerwall_ledger',
      enforceDailyCap: false,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'credit_failed' },
        { status: result.error === 'user_not_found' ? 404 : 500 }
      );
    }

    // Mark matching verified sessions consumed (optional UX)
    try {
      const db = getAdminDb();
      if (db && !result.duplicate) {
        const snap = await db
          .collection('ad_reward_sessions')
          .where('uid', '==', params.uid)
          .where('verified', '==', true)
          .where('consumed', '==', false)
          .limit(5)
          .get();
        const batch = db.batch();
        snap.docs.forEach((d) => {
          batch.set(
            d.ref,
            {
              consumed: true,
              settledTxId: txId,
              settledPayoutUsd: params.payout,
              creditedCoins: result.balanceCredited,
              settledAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        });
        if (!snap.empty) await batch.commit();
      }
    } catch {
      /* non-fatal */
    }

    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/plain') || url.searchParams.get('format') === 'text') {
      return new NextResponse(result.duplicate ? 'DUPLICATE' : 'OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return NextResponse.json({
      ok: true,
      duplicate: !!result.duplicate,
      provider: 'adsterra',
      providerPayout: params.payout,
      userSharePct: USER_EARN_SHARE,
      platformSharePct: PLATFORM_EARN_SHARE,
      creditedCoins: result.balanceCredited ?? 0,
      userVisibleReward: result.balanceCredited ?? 0,
      adminUsd: result.split?.adminUsd ?? adminUsd,
      bookedToHisaab: true,
      settled: true,
      message: result.duplicate
        ? 'Already credited'
        : `+${result.balanceCredited} AJ Coins 🪙`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'adsterra_postback_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
