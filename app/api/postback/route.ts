import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { applySplitReward, applyFlatCoins } from '../../lib/reward-engine';

const POSTBACK_SECRET =
  process.env.OFFERWALL_POSTBACK_SECRET ||
  process.env.AJ_POSTBACK_SECRET ||
  'AJ_SUPER_SECURE_786_PORTAL';

/**
 * GET|POST /api/postback
 * CPA / offerwall postback. Credits only when secret + payout are valid.
 */
function readParams(url: URL, body: Record<string, unknown>) {
  const g = (k: string) => String(url.searchParams.get(k) || body[k] || '');
  return {
    uid: g('uid') || g('user_id') || g('userId') || g('external_id') || g('ymid'),
    txId: g('txid') || g('transaction_id') || g('tx') || g('offer_id') || g('click_id'),
    amount: parseFloat(g('amount') || g('payout') || g('revenue') || '0') || 0,
    coins: Math.floor(Number(g('coins') || g('reward') || 0)) || 0,
    secret: g('secret') || g('key') || g('token'),
    sig: g('sig') || g('signature'),
    status: g('status') || g('event') || 'completed',
  };
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function verifySecret(params: ReturnType<typeof readParams>): boolean {
  if (params.secret && safeEqual(params.secret, POSTBACK_SECRET)) return true;
  if (params.sig) {
    const payload = `${params.uid}:${params.txId}:${POSTBACK_SECRET}`;
    const digest = createHash('sha256').update(payload).digest('hex');
    try {
      return safeEqual(params.sig.toLowerCase(), digest.toLowerCase());
    } catch {
      return false;
    }
  }
  return false;
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
    if (!params.uid || !params.txId) {
      return NextResponse.json({ ok: false, error: 'missing_uid_or_txid' }, { status: 400 });
    }
    if (!verifySecret(params)) {
      return NextResponse.json({ ok: false, error: 'invalid_secret' }, { status: 403 });
    }
    if (/reject|fail|chargeback|reversed/i.test(params.status)) {
      return NextResponse.json({ ok: false, error: 'rejected_status' }, { status: 400 });
    }
    // Require a positive payout signal (USD amount or explicit coins)
    if (params.amount <= 0 && params.coins <= 0) {
      return NextResponse.json(
        { ok: false, error: 'invalid_payout', message: 'Payout must be > 0.' },
        { status: 400 }
      );
    }

    const txId = `postback_${params.txId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 180);

    let result;
    if (params.coins > 0) {
      result = await applyFlatCoins({
        uid: params.uid,
        txId,
        source: 'offerwall',
        coins: params.coins,
        meta: {
          providerAmount: params.amount,
          status: params.status,
          via: 'api_postback',
          fromPostback: true,
        },
        ledgerCollection: 'offerwall_ledger',
      });
    } else {
      result = await applySplitReward({
        uid: params.uid,
        txId,
        source: 'offerwall',
        seed: txId,
        meta: {
          providerAmount: params.amount,
          status: params.status,
          via: 'api_postback',
          fromPostback: true,
        },
        ledgerCollection: 'offerwall_ledger',
      });
    }

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'credit_failed' },
        { status: result.error === 'user_not_found' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      duplicate: !!result.duplicate,
      creditedCoins: result.balanceCredited ?? 0,
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
