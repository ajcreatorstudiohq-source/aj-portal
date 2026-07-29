import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { getOfferwallServerConfig, splitPayoutUsd } from '../../../lib/economy';
import { applySplitReward } from '../../../lib/reward-engine';

/**
 * GET|POST /api/offerwall/callback
 *
 * Provider postback. Credits user 30% of partner payout USD as AJ Coins (CASH_RATE);
 * admin keeps 70%. No payout amount → 0 coins (no-loss).
 */
function readParams(url: URL, body: Record<string, unknown>) {
  const g = (k: string) =>
    (url.searchParams.get(k) ||
      body[k] ||
      '') as string;
  return {
    uid: String(g('uid') || g('user_id') || g('userId') || ''),
    txId: String(g('txid') || g('transaction_id') || g('tx') || g('offer_id') || ''),
    amount: parseFloat(String(g('amount') || g('payout') || '0')) || 0,
    secret: String(g('secret') || g('key') || ''),
    sig: String(g('sig') || g('signature') || ''),
    status: String(g('status') || g('event') || 'completed'),
  };
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function verifySecret(params: ReturnType<typeof readParams>): boolean {
  const expected = getOfferwallServerConfig().postbackSecret;
  if (params.secret && safeEqual(params.secret, expected)) return true;
  if (params.sig) {
    const payload = `${params.uid}:${params.txId}:${expected}`;
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

    const payoutSplit = splitPayoutUsd(params.amount);
    if (payoutSplit.userCoins <= 0) {
      return NextResponse.json({
        ok: true,
        creditedCoins: 0,
        message: 'Postback accepted. No user coins without positive payout (no-loss).',
        providerAmount: params.amount,
      });
    }

    const result = await applySplitReward({
      uid: params.uid,
      txId: `offerwall_${params.txId}`,
      source: 'offerwall',
      seed: `offerwall_${params.txId}`,
      splitOverride: payoutSplit,
      meta: {
        providerAmount: params.amount,
        status: params.status,
        via: 'postback',
        noLoss: true,
      },
      ledgerCollection: 'offerwall_ledger',
    });

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
      userUsd: result.split?.userUsd,
      adminUsd: result.split?.adminUsd,
      totalPoolUsd: result.split?.totalUsd,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'callback_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
