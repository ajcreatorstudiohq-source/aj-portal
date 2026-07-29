import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { applyFlatCoins } from '../../lib/reward-engine';
import { CASH_RATE, USER_EARN_SHARE, PLATFORM_EARN_SHARE } from '../../lib/economy';

const POSTBACK_SECRET =
  process.env.OFFERWALL_POSTBACK_SECRET ||
  process.env.AJ_POSTBACK_SECRET ||
  'AJ_SUPER_SECURE_786_PORTAL';

/**
 * Offerwall / AdGem postback — partner pays YOU 100% of payout USD.
 * User gets 30% as AJ Coins at CASH_RATE (withdraw); you keep 70%.
 * Example: payout $1 → user 300 🪙 ($0.30) · admin $0.70
 */
function userCoinsFromPayoutUsd(payoutUsd: number): number {
  return Math.floor(Math.max(0, payoutUsd) * USER_EARN_SHARE * CASH_RATE);
}

/**
 * GET|POST /api/postback
 * Partner S2S postback. User reward = floor(payoutUSD * 0.3 * 1000).
 *
 * AdGem dashboard postback (app 33088):
 *   https://aj-portal-one.vercel.app/api/postback?payout={amount}&status={state}&userId={player_id}
 * Recommended (with secret):
 *   https://aj-portal-one.vercel.app/api/postback?payout={amount}&status={state}&userId={player_id}&secret=AJ_SUPER_SECURE_786_PORTAL
 *
 * Legacy CPAGrip:
 *   https://YOUR_DOMAIN/api/postback?userId={tracking_id}&payout={payout}&txid={offer_id}&status={status}&secret=AJ_SUPER_SECURE_786_PORTAL
 */
function readParams(url: URL, body: Record<string, unknown>) {
  const g = (k: string) => String(url.searchParams.get(k) || body[k] || '');
  return {
    uid:
      g('userId') ||
      g('user_id') ||
      g('uid') ||
      g('player_id') ||
      g('playerid') ||
      g('tracking_id') ||
      g('external_id') ||
      g('ymid') ||
      g('subid') ||
      g('subid1'),
    txId:
      g('txid') ||
      g('transaction_id') ||
      g('tx') ||
      g('offer_id') ||
      g('click_id') ||
      g('lead_id') ||
      g('adgem_transaction_id') ||
      '',
    points: Math.floor(Number(g('points') || g('coins') || g('reward') || 0)) || 0,
    payout: parseFloat(g('payout') || g('amount') || g('revenue') || '0') || 0,
    secret: g('secret') || g('key') || g('token') || g('password'),
    sig: g('sig') || g('signature'),
    status: (g('status') || g('event') || g('state') || 'completed').toLowerCase(),
  };
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function verifySecret(params: ReturnType<typeof readParams>): boolean {
  if (params.secret) {
    return safeEqual(params.secret, POSTBACK_SECRET);
  }
  if (params.sig) {
    const payload = `${params.uid}:${params.txId}:${POSTBACK_SECRET}`;
    const digest = createHash('sha256').update(payload).digest('hex');
    try {
      return safeEqual(params.sig.toLowerCase(), digest.toLowerCase());
    } catch {
      return false;
    }
  }
  // AdGem dashboard URL may omit secret — allow when explicitly enabled (default on)
  const allowUnsigned =
    process.env.OFFERWALL_ALLOW_UNSIGNED_POSTBACK !== '0' &&
    process.env.OFFERWALL_REQUIRE_SECRET !== '1';
  return allowUnsigned && !!params.uid;
}

function isSuccessStatus(status: string): boolean {
  return /^(lead|success|completed|complete|approved|ok|1|true)$/i.test(status.trim());
}

function computeUserReward(payout: number, legacyPoints: number): number {
  // Primary: 30% of partner payout USD at withdraw rate
  if (Number.isFinite(payout) && payout > 0) {
    return userCoinsFromPayoutUsd(payout);
  }
  // Legacy fallback if network only sends pre-scaled user points
  if (legacyPoints > 0) return Math.floor(legacyPoints);
  return 0;
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

    if (!params.uid) {
      return NextResponse.json({ ok: false, error: 'missing_userId' }, { status: 400 });
    }
    if (!verifySecret(params)) {
      return NextResponse.json({ ok: false, error: 'invalid_secret' }, { status: 403 });
    }
    if (!isSuccessStatus(params.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'rejected_status',
          message: `Status must be lead or success (got: ${params.status})`,
        },
        { status: 400 }
      );
    }

    const userReward = computeUserReward(params.payout, params.points);
    if (userReward <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_payout',
          message: 'payout must be > 0 (userReward = floor(payout * 200))',
        },
        { status: 400 }
      );
    }

    const txRaw =
      params.txId ||
      `${params.uid}_${params.status}_${userReward}_${url.searchParams.get('offer_id') || Date.now()}`;
    const txId = `offer_${txRaw}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 180);

    const result = await applyFlatCoins({
      uid: params.uid,
      txId,
      source: 'offerwall',
      coins: userReward,
      meta: {
        providerPayout: params.payout,
        userSharePct: USER_EARN_SHARE,
        platformSharePct: PLATFORM_EARN_SHARE,
        cashRate: CASH_RATE,
        userReward,
        status: params.status,
        via: 'adgem_postback',
        fromPostback: true,
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
      userId: params.uid,
      providerPayout: params.payout,
      userSharePct: USER_EARN_SHARE,
      creditedCoins: result.balanceCredited ?? 0,
      adminUsd: result.split?.adminUsd,
      message: result.duplicate
        ? 'Already credited'
        : `+${result.balanceCredited} AJ Coins 🪙`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'postback_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
