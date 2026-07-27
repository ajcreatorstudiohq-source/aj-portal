import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { applyFlatCoins } from '../../lib/reward-engine';

const POSTBACK_SECRET =
  process.env.OFFERWALL_POSTBACK_SECRET ||
  process.env.AJ_POSTBACK_SECRET ||
  'AJ_SUPER_SECURE_786_PORTAL';

/**
 * GET|POST /api/postback
 * CPAGrip (and compatible networks) S2S postback.
 *
 * Recommended CPAGrip Global Postback:
 *   https://YOUR_DOMAIN/api/postback?userId={tracking_id}&points={points}&txid={offer_id}&status={status}&secret=AJ_SUPER_SECURE_786_PORTAL
 *
 * Credits only when:
 *   - secret matches
 *   - status is lead | success | completed | 1 | approved
 *   - points > 0 (or payout > 0 fallback)
 */
function readParams(url: URL, body: Record<string, unknown>) {
  const g = (k: string) => String(url.searchParams.get(k) || body[k] || '');
  return {
    uid:
      g('userId') ||
      g('user_id') ||
      g('uid') ||
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
    points: Math.floor(Number(g('points') || g('coins') || g('reward') || 0)) || 0,
    amount: parseFloat(g('amount') || g('payout') || g('revenue') || '0') || 0,
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

function isSuccessStatus(status: string): boolean {
  return /^(lead|success|completed|complete|approved|ok|1|true)$/i.test(status.trim());
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

    // Prefer explicit points from CPAGrip; else require positive payout
    const coins =
      params.points > 0
        ? params.points
        : params.amount > 0
          ? Math.max(1, Math.floor(params.amount * 100))
          : 0;

    if (coins <= 0) {
      return NextResponse.json(
        { ok: false, error: 'invalid_points', message: 'points must be > 0' },
        { status: 400 }
      );
    }

    const txRaw =
      params.txId ||
      `${params.uid}_${params.status}_${coins}_${url.searchParams.get('offer_id') || Date.now()}`;
    const txId = `cpagrip_${txRaw}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 180);

    const result = await applyFlatCoins({
      uid: params.uid,
      txId,
      source: 'offerwall',
      coins,
      meta: {
        providerAmount: params.amount,
        points: coins,
        status: params.status,
        via: 'cpagrip_postback',
        fromPostback: true,
      },
      ledgerCollection: 'offerwall_ledger',
      enforceDailyCap: false, // network postbacks are authoritative; ledger idempotency still applies
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'credit_failed' },
        { status: result.error === 'user_not_found' ? 404 : 500 }
      );
    }

    // CPAGrip often expects plain OK
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
