import { NextResponse } from 'next/server';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { applyFlatCoins } from '../../lib/reward-engine';
import { CASH_RATE, USER_EARN_SHARE, PLATFORM_EARN_SHARE } from '../../lib/economy';

const POSTBACK_SECRET =
  process.env.OFFERWALL_POSTBACK_SECRET ||
  process.env.AJ_POSTBACK_SECRET ||
  process.env.THEOREMREACH_SECRET ||
  process.env.THEOREMREACH_APP_TOKEN ||
  'f3f1599acbdf40f16cf2eb54a0907306a1f';

/**
 * Offerwall / TheoremReach postback — partner pays YOU 100% of payout USD.
 * User gets 30% as AJ Coins at CASH_RATE (withdraw); you keep 70%.
 * Example: payout $1 → user 300 🪙 ($0.30) · admin $0.70
 */
function userCoinsFromPayoutUsd(payoutUsd: number): number {
  return Math.floor(Math.max(0, payoutUsd) * USER_EARN_SHARE * CASH_RATE);
}

/**
 * GET|POST /api/postback
 * Partner S2S postback. User reward = floor(payoutUSD * 0.3 * 1000).
 * Requires OFFERWALL_POSTBACK_SECRET / THEOREMREACH_SECRET + matching secret/HMAC.
 *
 * TheoremReach dashboard callback (recommended):
 *   https://YOUR_DOMAIN/api/postback?user_id={user_id}&payout={currency}&txid={transaction_id}&secret=YOUR_SECRET&status=completed
 *
 * TheoremReach native macros also accepted:
 *   transaction_id, currency (USD), reward (virtual coins), hash, debug
 * Reject when debug=true (TR test callbacks).
 *
 * Legacy CPAGrip still accepted for old campaigns.
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
      '',
    // TheoremReach: reward = virtual currency amount already converted by exchange rate
    points:
      Math.floor(
        Number(
          g('reward') ||
            g('points') ||
            g('coins') ||
            g('quantity') ||
            g('currency_amount') ||
            0
        )
      ) || 0,
    // TheoremReach: currency = net USD revenue; AdGem/CPA used amount/payout
    payout:
      parseFloat(
        g('payout') ||
          g('atpay') ||
          g('currency') ||
          g('amount') ||
          g('revenue') ||
          g('value') ||
          '0'
      ) || 0,
    secret: g('secret') || g('key') || g('token') || g('password'),
    sig: g('sig') || g('signature') || g('hash') || g('enc'),
    status: (g('status') || g('event') || g('state') || 'completed').toLowerCase(),
    provider: (g('provider') || g('network') || '').toLowerCase(),
    debug: (g('debug') || '').toLowerCase(),
    rewardRaw: g('reward') || g('currency_amount') || '',
    currencyRaw: g('currency') || g('payout') || g('amount') || '',
  };
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function md5Hex(s: string) {
  return createHash('md5').update(s).digest('hex');
}

function sha1Hex(s: string) {
  return createHash('sha1').update(s).digest('hex');
}

/**
 * TheoremReach publisher callbacks often send hash =
 *   MD5(user_id + reward + secret)  or  MD5(user_id + currency + secret)
 * Offerwall-style HMAC-SHA1 of common payloads is also tried.
 */
function verifyTheoremReachHash(params: ReturnType<typeof readParams>): boolean {
  if (!params.sig || !params.uid || !POSTBACK_SECRET) return false;
  const candidates = [
    md5Hex(`${params.uid}${params.rewardRaw}${POSTBACK_SECRET}`),
    md5Hex(`${params.uid}${params.points}${POSTBACK_SECRET}`),
    md5Hex(`${params.uid}${params.currencyRaw}${POSTBACK_SECRET}`),
    md5Hex(`${params.uid}${params.payout}${POSTBACK_SECRET}`),
    md5Hex(`${POSTBACK_SECRET}${params.uid}${params.rewardRaw}`),
    md5Hex(`${POSTBACK_SECRET}${params.uid}${params.points}`),
    sha1Hex(`${params.uid}${params.rewardRaw}${POSTBACK_SECRET}`),
    createHmac('sha1', POSTBACK_SECRET)
      .update(`${params.uid}${params.rewardRaw}`)
      .digest('hex'),
    createHmac('sha1', POSTBACK_SECRET)
      .update(`${params.uid}${params.currencyRaw}`)
      .digest('hex'),
  ];
  const got = params.sig.trim().toLowerCase();
  return candidates.some((c) => {
    try {
      return safeEqual(got, c.toLowerCase());
    } catch {
      return false;
    }
  });
}

function verifySecret(params: ReturnType<typeof readParams>): boolean {
  // SECURITY: secret or HMAC sig REQUIRED — unsigned postbacks disabled
  if (!POSTBACK_SECRET || POSTBACK_SECRET.length < 8) {
    console.error('[postback] POSTBACK_SECRET not configured');
    return false;
  }
  if (params.secret) {
    return safeEqual(params.secret, POSTBACK_SECRET);
  }
  if (params.sig && params.uid && params.txId) {
    const payload = `${params.uid}:${params.txId}:${POSTBACK_SECRET}`;
    const digest = createHash('sha256').update(payload).digest('hex');
    try {
      if (safeEqual(params.sig.toLowerCase(), digest.toLowerCase())) return true;
    } catch {
      /* fall through */
    }
  }
  // TheoremReach native hash (no secret query macro)
  if (verifyTheoremReachHash(params)) return true;
  return false;
}

function isSuccessStatus(status: string): boolean {
  return /^(lead|success|completed|complete|approved|ok|1|true)$/i.test(status.trim());
}

/**
 * User wallet credit = 30% of partner revenue (displayed as their full standard reward).
 * Prefer USD `currency`/`payout`. For TheoremReach reward-only callbacks, apply 30% to the
 * incoming virtual-currency amount so admin keeps 70%.
 */
function computeUserReward(
  payout: number,
  legacyPoints: number,
  opts?: { applyShareToPoints?: boolean }
): number {
  if (Number.isFinite(payout) && payout > 0) {
    return userCoinsFromPayoutUsd(payout);
  }
  if (legacyPoints > 0) {
    if (opts?.applyShareToPoints) {
      return Math.floor(legacyPoints * USER_EARN_SHARE);
    }
    return Math.floor(legacyPoints);
  }
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

    // TheoremReach test callbacks — never credit
    if (params.debug === 'true' || params.debug === '1') {
      return NextResponse.json(
        { ok: false, error: 'debug_ignored', message: 'debug=true callbacks are not credited' },
        { status: 200 }
      );
    }

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

    const looksLikeTheorem =
      params.provider.includes('theorem') ||
      !!params.rewardRaw ||
      url.searchParams.has('currency') ||
      url.searchParams.has('reward');

    const userReward = computeUserReward(params.payout, params.points, {
      applyShareToPoints: looksLikeTheorem,
    });
    if (userReward <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_payout',
          message: 'payout must be > 0 (userReward = floor(payout * 0.3 * 1000))',
        },
        { status: 400 }
      );
    }

    const txRaw =
      params.txId ||
      `${params.uid}_${params.status}_${userReward}_${url.searchParams.get('offer_id') || Date.now()}`;
    const txId = `offer_${txRaw}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 180);

    // User sees `userReward` as their full standard reward; admin ledger gets 70%.
    const userUsd = Number(((userReward / CASH_RATE)).toFixed(6));
    const providerPayoutUsd =
      params.payout > 0
        ? params.payout
        : USER_EARN_SHARE > 0
          ? Number((userUsd / USER_EARN_SHARE).toFixed(6))
          : userUsd;
    const adminUsd = Number((providerPayoutUsd - userUsd).toFixed(6));

    const result = await applyFlatCoins({
      uid: params.uid,
      txId,
      source: 'offerwall',
      coins: userReward,
      settledPayoutUsd: params.payout > 0 ? providerPayoutUsd : undefined,
      bookAdminEarnings: params.payout > 0,
      meta: {
        provider: looksLikeTheorem ? 'theoremreach' : params.provider || 'offerwall',
        providerPayout: providerPayoutUsd,
        providerPayoutUsd,
        providerRewardRaw: params.points || undefined,
        userSharePct: USER_EARN_SHARE,
        platformSharePct: PLATFORM_EARN_SHARE,
        cashRate: CASH_RATE,
        userReward,
        userUsd,
        adminUsd,
        displayLabel: looksLikeTheorem ? 'Survey Reward' : 'Offer Task Reward',
        userVisibleReward: userReward,
        status: params.status,
        via: looksLikeTheorem ? 'theoremreach_postback' : 'offerwall_postback',
        fromPostback: true,
        settled: params.payout > 0,
        estimated: !(params.payout > 0),
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
      provider: looksLikeTheorem ? 'theoremreach' : 'offerwall',
      providerPayout: providerPayoutUsd,
      userSharePct: USER_EARN_SHARE,
      platformSharePct: PLATFORM_EARN_SHARE,
      /** Coins credited — shown to user as their full standard reward */
      creditedCoins: result.balanceCredited ?? 0,
      userVisibleReward: result.balanceCredited ?? 0,
      adminUsd: result.split?.adminUsd ?? adminUsd,
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
