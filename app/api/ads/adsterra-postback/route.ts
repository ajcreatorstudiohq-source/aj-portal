import { NextResponse } from 'next/server';
import { PLATFORM_EARN_SHARE, USER_EARN_SHARE } from '../../../lib/economy';
import { uidFromAdsterraPsid } from '../../../lib/adsterra-link';
import {
  ADSTERRA_FORMATS,
  adsterraFormatFromPlacement,
  normalizeAdsterraFormat,
} from '../../../lib/adsterra-formats';
import { applyAdsterraSettledPayout } from '../../../lib/adsterra-payout';

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
 * UNIFIED payout handler for EVERY Adsterra format:
 * Direct Link · Banner · Video · Native Banner · Social Bar.
 *
 * Real payout USD only — NO estimated CPC.
 * Exact split: 30% → user AJ Coins (standard wallet reward),
 * 70% → Admin Hub wallet + settled Hisaab.
 *
 * Configure (same URL for all formats — pass format=…):
 *   https://YOUR_DOMAIN/api/ads/adsterra-postback?user_id={uid}&payout={payout}&txid={clickid}&format={direct_link|banner|video|native_banner|social_bar}&secret=YOUR_SECRET
 */
function readParams(url: URL, body: Record<string, unknown>) {
  const g = (k: string) => String(url.searchParams.get(k) || body[k] || '');
  const psid =
    g('psid') ||
    g('placement_sub_id') ||
    g('placement_subid') ||
    g('subid_short') ||
    '';
  const subid =
    g('subid') ||
    g('subid1') ||
    g('subid2') ||
    g('subid3') ||
    g('sub_id') ||
    g('user_id') ||
    '';
  const uidRaw =
    g('userId') ||
    g('user_id') ||
    g('uid') ||
    g('external_id') ||
    g('player_id') ||
    g('playerid') ||
    subid ||
    uidFromAdsterraPsid(psid) ||
    '';
  const placement =
    g('placement') || g('aj_place') || g('zone') || g('ad_unit') || '';
  const formatRaw =
    g('format') ||
    g('aj_fmt') ||
    g('ad_format') ||
    g('adtype') ||
    g('type') ||
    (placement ? adsterraFormatFromPlacement(placement) : '');
  return {
    uid: String(uidRaw || '').trim(),
    psid,
    placement,
    format: normalizeAdsterraFormat(formatRaw || 'direct_link'),
    txId:
      g('txid') ||
      g('transaction_id') ||
      g('click_id') ||
      g('clickid') ||
      g('subid_short') ||
      g('lead_id') ||
      g('impression_id') ||
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

    // Plain-text "format=text" response for some trackers — do not confuse with ad format
    const responseAsText =
      (request.headers.get('accept') || '').includes('text/plain') ||
      url.searchParams.get('response') === 'text' ||
      (url.searchParams.get('format') === 'text' &&
        !url.searchParams.get('aj_fmt') &&
        !body.format &&
        !body.aj_fmt);

    if (!params.secret || params.secret !== POSTBACK_SECRET) {
      return NextResponse.json({ ok: false, error: 'invalid_secret' }, { status: 403 });
    }
    if (!params.uid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'missing_userId',
          message: 'Pass user_id or psid/subid with Firebase uid',
        },
        { status: 400 }
      );
    }
    if (!(params.payout > 0)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'missing_payout',
          message:
            'Real Adsterra payout USD required (payout / atpay / revenue). Estimates rejected.',
        },
        { status: 400 }
      );
    }
    if (!/^(lead|success|completed|complete|approved|ok|1|true)$/i.test(params.status)) {
      return NextResponse.json({ ok: false, error: 'rejected_status' }, { status: 400 });
    }

    const result = await applyAdsterraSettledPayout({
      uid: params.uid,
      payoutUsd: params.payout,
      txId: params.txId,
      format: params.format,
      placement: params.placement,
      psid: params.psid,
    });

    if (!result.ok) {
      const status =
        result.error === 'user_not_found'
          ? 404
          : result.error === 'payout_too_small'
            ? 400
            : 500;
      return NextResponse.json(
        {
          ok: false,
          error: result.error || 'credit_failed',
          format: result.format,
          message:
            result.error === 'payout_too_small'
              ? `payout $${params.payout} yields 0 user coins at 30% share`
              : undefined,
        },
        { status }
      );
    }

    if (responseAsText) {
      return new NextResponse(result.duplicate ? 'DUPLICATE' : 'OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return NextResponse.json({
      ok: true,
      duplicate: !!result.duplicate,
      provider: 'adsterra',
      format: result.format,
      formatsCovered: ADSTERRA_FORMATS,
      placement: params.placement || null,
      providerPayout: params.payout,
      userSharePct: USER_EARN_SHARE,
      platformSharePct: PLATFORM_EARN_SHARE,
      creditedCoins: result.balanceCredited ?? 0,
      userVisibleReward: result.userVisibleReward,
      displayLabel: result.displayLabel,
      adminUsd: result.adminUsd,
      bookedToHisaab: true,
      settled: true,
      unifiedHandler: true,
      message: result.duplicate
        ? 'Already credited'
        : `+${result.balanceCredited} AJ Coins 🪙 · ${result.displayLabel}`,
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
