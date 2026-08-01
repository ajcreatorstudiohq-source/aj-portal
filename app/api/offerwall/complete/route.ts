import { NextResponse } from 'next/server';
import { OFFERWALL_PUBLIC, getOfferwallServerConfig } from '../../../lib/economy';

/**
 * POST /api/offerwall/complete
 *
 * Self-serve "tap to claim" completions are disabled.
 * Coins only credit via partner postback: /api/postback (CPAGrip)
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: 'verification_required',
      message:
        'Complete a real CPAGrip offer. Coins are credited only after verified postback — no free tap rewards.',
      wallUrl: OFFERWALL_PUBLIC.wallUrl,
      postback: '/api/postback',
    },
    { status: 403 }
  );
}

export async function GET() {
  const ow = getOfferwallServerConfig();
  return NextResponse.json({
    ok: true,
    wallUrl: OFFERWALL_PUBLIC.wallUrl,
    maxDailyCompletions: ow.maxDailyCompletions,
    postback: '/api/postback',
    provider: OFFERWALL_PUBLIC.provider,
    selfServeComplete: false,
  });
}
