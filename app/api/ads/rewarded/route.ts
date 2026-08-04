import { NextResponse } from 'next/server';
import { FieldValue, getAdminDb, getFirebaseAdminDiag } from '../../../lib/firebase-admin';
import { ADSTERRA_REWARD_COINS, OFFERWALL_VIDEO_MAX_DAILY } from '../../../lib/ads-config';
import { PLATFORM_EARN_SHARE, USER_EARN_SHARE } from '../../../lib/economy';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { normalizeServerClaimFailure, publicClaimErrorMessage } from '../../../lib/claim-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_TTL_MS = 10 * 60 * 1000;

function dayKeyUtc() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * POST /api/ads/rewarded
 * Auth: Bearer <Firebase ID token>
 *
 * prepare → create session
 * claim_adsterra / complete → verify 30s watch ONLY (no invented coins)
 *
 * Real 70/30 credit: POST /api/ads/adsterra-postback with exact Adsterra payout USD.
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
    const action = String(body.action || 'complete');
    const placement = String(body.placement || 'offerwall_rewarded_video').slice(0, 64);
    const dayKey = dayKeyUtc();

    const adminDb = getAdminDb();

    // ── prepare can run without Admin SDK (client may persist the session)
    if (action === 'prepare') {
      let dailyCount = 0;
      if (adminDb) {
        const userSnap = await adminDb.collection('users').doc(user.uid).get();
        if (!userSnap.exists) {
          return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
        }
        const ud = userSnap.data() as {
          offerwallVideoDayKey?: string;
          offerwallVideoDayCount?: number;
          isBanned?: boolean;
          accountStatus?: string;
        };
        if (ud.isBanned || ud.accountStatus === 'banned') {
          return NextResponse.json(
            { ok: false, error: 'account_banned', message: 'Account restricted.' },
            { status: 403 }
          );
        }
        dailyCount =
          ud.offerwallVideoDayKey === dayKey ? Number(ud.offerwallVideoDayCount || 0) : 0;
        if (dailyCount >= OFFERWALL_VIDEO_MAX_DAILY) {
          return NextResponse.json(
            {
              ok: false,
              error: 'daily_limit',
              remainingToday: 0,
              message: `Daily video ad limit (${OFFERWALL_VIDEO_MAX_DAILY}) reached.`,
            },
            { status: 429 }
          );
        }
      }

      const sessionId = `rv_${user.uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const expiresAt = Date.now() + SESSION_TTL_MS;
      const createdAtMs = Date.now();
      const sessionPayload = {
        uid: user.uid,
        placement,
        createdAtMs,
        expiresAt,
        dayKey,
        consumed: false,
        slot: dailyCount,
        verifySeconds: 30,
      };

      if (adminDb) {
        try {
          await adminDb.collection('ad_reward_sessions').doc(sessionId).set({
            ...sessionPayload,
            createdAt: FieldValue.serverTimestamp(),
          });
          return NextResponse.json({
            ok: true,
            sessionId,
            expiresAt,
            createdAtMs,
            remainingToday: Math.max(0, OFFERWALL_VIDEO_MAX_DAILY - dailyCount),
            rewardCoins: ADSTERRA_REWARD_COINS,
            inventsCoins: false,
            persistClient: false,
          });
        } catch (writeErr) {
          console.error('[ads/rewarded] prepare admin write failed', writeErr);
          // Fall through — client will persist
        }
      }

      return NextResponse.json({
        ok: true,
        sessionId,
        expiresAt,
        createdAtMs,
        remainingToday: Math.max(0, OFFERWALL_VIDEO_MAX_DAILY - dailyCount),
        rewardCoins: ADSTERRA_REWARD_COINS,
        inventsCoins: false,
        persistClient: true,
        sessionPayload,
        message: 'Session ready. Client will save tracking session.',
      });
    }

    // claim / complete need Admin SDK for ledger + balance
    if (!adminDb) {
      const diag = getFirebaseAdminDiag();
      console.error('[ads/rewarded] admin_sdk_missing', diag);
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_sdk_missing',
          message:
            diag.lastError ||
            'Server cannot credit coins. Configure FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.',
          diag: {
            configured: diag.configured,
            source: diag.source,
            projectId: diag.projectId,
            clientEmailSet: diag.clientEmailSet,
            privateKeySet: diag.privateKeySet,
          },
          allowClientFallback: false,
        },
        { status: 503 }
      );
    }

    // No estimated-CPC invent path — coins only via /api/ads/adsterra-postback real payout

    const userRef = adminDb.collection('users').doc(user.uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
    }
    const ud = userSnap.data() as {
      offerwallVideoDayKey?: string;
      offerwallVideoDayCount?: number;
      isBanned?: boolean;
      accountStatus?: string;
      balance?: number;
    };
    if (ud.isBanned || ud.accountStatus === 'banned') {
      return NextResponse.json(
        { ok: false, error: 'account_banned', message: 'Account restricted.' },
        { status: 403 }
      );
    }
    const dailyCount =
      ud.offerwallVideoDayKey === dayKey ? Number(ud.offerwallVideoDayCount || 0) : 0;
    const balNow = Math.max(0, Math.floor(Number(ud.balance) || 0));

    // ── Adsterra verify: mark session verified — NEVER invent fixed coins
    if (action === 'claim_adsterra') {
      if (dailyCount >= OFFERWALL_VIDEO_MAX_DAILY) {
        return NextResponse.json(
          {
            ok: false,
            error: 'daily_limit',
            remainingToday: 0,
            message: `Daily Watch Ads limit (${OFFERWALL_VIDEO_MAX_DAILY}) reached.`,
          },
          { status: 429 }
        );
      }

      const sessionId = String(body.sessionId || '').trim();
      if (!sessionId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'missing_session',
            message: 'Start Watch Ads again so the portal can track your ad time.',
          },
          { status: 400 }
        );
      }

      const sessionRef = adminDb.collection('ad_reward_sessions').doc(sessionId);
      const sessionSnap = await sessionRef.get();
      const meta =
        body.meta && typeof body.meta === 'object'
          ? (body.meta as {
              totalAwayMs?: number;
              enteredAdAt?: number;
              leftAdAt?: number;
              preparedAt?: number;
              verifySeconds?: number;
              provider?: string;
            })
          : {};

      if (!sessionSnap.exists) {
        const preparedAt = Number(meta.preparedAt || 0);
        const awayMs = Math.max(0, Number(meta.totalAwayMs || 0));
        const looksOwned =
          sessionId.startsWith(`rv_${user.uid}_`) || sessionId.includes(user.uid);
        if (!looksOwned || (!preparedAt && awayMs < 30_000)) {
          return NextResponse.json(
            { ok: false, error: 'invalid_session', message: 'Start Watch Ads again.' },
            { status: 400 }
          );
        }
        const createdAtMs = preparedAt || Date.now() - Math.max(awayMs, 30_000);
        try {
          await sessionRef.set({
            uid: user.uid,
            placement,
            createdAt: FieldValue.serverTimestamp(),
            createdAtMs,
            expiresAt: Date.now() + SESSION_TTL_MS,
            dayKey,
            consumed: false,
            verified: false,
            slot: dailyCount,
            verifySeconds: Number(meta.verifySeconds) > 0 ? Number(meta.verifySeconds) : 30,
            clientRecovered: true,
          });
        } catch (recoverErr) {
          console.error('[ads/rewarded] session recover failed', recoverErr);
          return NextResponse.json(
            { ok: false, error: 'invalid_session', message: 'Start Watch Ads again.' },
            { status: 400 }
          );
        }
      }

      const sessionFreshSnap = await sessionRef.get();
      if (!sessionFreshSnap.exists) {
        return NextResponse.json(
          { ok: false, error: 'invalid_session', message: 'Start Watch Ads again.' },
          { status: 400 }
        );
      }
      const sessionFresh = sessionFreshSnap.data() as {
        uid: string;
        expiresAt: number;
        consumed?: boolean;
        verified?: boolean;
        createdAtMs?: number;
        verifySeconds?: number;
        creditedCoins?: number;
        settledTxId?: string;
      };
      if (sessionFresh.uid !== user.uid) {
        return NextResponse.json({ ok: false, error: 'session_mismatch' }, { status: 403 });
      }
      if (sessionFresh.consumed && Number(sessionFresh.creditedCoins || 0) > 0) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          creditedCoins: 0,
          balance: balNow,
          previouslyCredited: Math.floor(Number(sessionFresh.creditedCoins) || 0),
          settled: true,
          message: 'Already settled for this ad session from real Adsterra payout.',
        });
      }
      if (Date.now() > Number(sessionFresh.expiresAt || 0)) {
        return NextResponse.json(
          {
            ok: false,
            error: 'session_expired',
            message: 'Ad session expired. Start Watch Ads again.',
          },
          { status: 400 }
        );
      }

      const needMs =
        (Number(sessionFresh.verifySeconds) > 0
          ? Number(sessionFresh.verifySeconds)
          : 30) * 1000;
      const startedMs = Number(sessionFresh.createdAtMs || meta.preparedAt || 0);
      const elapsedSincePrepare = startedMs > 0 ? Date.now() - startedMs : 0;
      const clientAwayMs = Math.max(0, Number(meta.totalAwayMs || 0));
      const effectiveElapsed = Math.max(elapsedSincePrepare, clientAwayMs);
      if (!startedMs || effectiveElapsed < needMs) {
        const left = Math.max(0, Math.ceil((needMs - effectiveElapsed) / 1000));
        return NextResponse.json(
          {
            ok: false,
            error: 'verify_too_fast',
            message: `Please wait ${left}s more. Full 30s required. No AJ Coins were credited.`,
          },
          { status: 403 }
        );
      }

      await sessionRef.set(
        {
          enteredAdAt: meta.enteredAdAt ?? null,
          leftAdAt: meta.leftAdAt ?? null,
          totalAwayMs: Number(meta.totalAwayMs || 0) || null,
          elapsedSincePrepareMs: elapsedSincePrepare,
          verified: true,
          verifiedAt: FieldValue.serverTimestamp(),
          claimAttemptAt: FieldValue.serverTimestamp(),
          awaitingSettlement: true,
        },
        { merge: true }
      );

      // Check if a real Adsterra postback already settled coins for this user recently
      let settledCoins = 0;
      try {
        const recent = await adminDb
          .collection('offerwall_ledger')
          .where('uid', '==', user.uid)
          .where('source', '==', 'offerwall_video')
          .limit(20)
          .get();
        recent.forEach((d) => {
          const row = d.data() as Record<string, unknown>;
          const metaRow =
            row.meta && typeof row.meta === 'object'
              ? (row.meta as Record<string, unknown>)
              : {};
          if (
            metaRow.via === 'adsterra_real_postback' &&
            metaRow.settled === true &&
            String(metaRow.psid || '').includes(sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8))
          ) {
            settledCoins += Math.floor(Number(row.flatCoins ?? row.coins ?? 0) || 0);
          }
        });
      } catch {
        /* ignore */
      }

      if (settledCoins > 0) {
        return NextResponse.json({
          ok: true,
          creditedCoins: settledCoins,
          balance: balNow,
          settled: true,
          bookedToHisaab: true,
          message: `+${settledCoins} AJ Coins 🪙 from real Adsterra payout.`,
        });
      }

      return NextResponse.json({
        ok: true,
        creditedCoins: 0,
        balance: balNow,
        verified: true,
        settled: false,
        awaitingSettlement: true,
        bookedToHisaab: false,
        remainingToday: Math.max(0, OFFERWALL_VIDEO_MAX_DAILY - dailyCount),
        message:
          'Ad verified. AJ Coins credit when Adsterra registers the real payout. No estimated coins.',
      });
    }

    if (action !== 'complete') {
      return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
    }

    // Legacy "complete" → verify-only (no invented coins)
    const sessionId = String(body.sessionId || '').trim();
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 400 });
    }
    const sessionRef = adminDb.collection('ad_reward_sessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ ok: false, error: 'invalid_session' }, { status: 400 });
    }
    const session = sessionSnap.data() as { uid: string; expiresAt: number };
    if (session.uid !== user.uid) {
      return NextResponse.json({ ok: false, error: 'session_mismatch' }, { status: 403 });
    }
    if (Date.now() > Number(session.expiresAt || 0)) {
      return NextResponse.json({ ok: false, error: 'session_expired' }, { status: 400 });
    }
    await sessionRef.set(
      {
        verified: true,
        verifiedAt: FieldValue.serverTimestamp(),
        awaitingSettlement: true,
      },
      { merge: true }
    );
    return NextResponse.json({
      ok: true,
      creditedCoins: 0,
      balance: balNow,
      verified: true,
      settled: false,
      awaitingSettlement: true,
      bookedToHisaab: false,
      message:
        'Session verified. Coins credit only from real Adsterra payout postback.',
    });
  } catch (e: unknown) {
    console.error('[ads/rewarded]', e);
    const norm = normalizeServerClaimFailure(e);
    const diag = getFirebaseAdminDiag();
    const message =
      norm.error === 'daily_limit'
        ? `Daily Watch Ads limit (${OFFERWALL_VIDEO_MAX_DAILY}) reached.`
        : norm.error === 'invalid_session'
          ? 'Start Watch Ads again.'
          : norm.error === 'session_mismatch'
            ? 'Ad session does not belong to this account.'
            : publicClaimErrorMessage({
                error: norm.error,
                message: norm.message,
              });
    return NextResponse.json(
      {
        ok: false,
        error: norm.error,
        message,
        diag: {
          configured: diag.configured,
          ready: diag.ready,
          source: diag.source,
          lastError: diag.lastError,
        },
        allowClientFallback: false,
      },
      { status: norm.status || 500 }
    );
  }
}

export async function GET() {
  try {
    const diag = getFirebaseAdminDiag();
    return NextResponse.json({
      ok: true,
      maxDaily: OFFERWALL_VIDEO_MAX_DAILY,
      rewardCoins: ADSTERRA_REWARD_COINS,
      inventsCoins: false,
      settledPostback: '/api/ads/adsterra-postback',
      split: { user: USER_EARN_SHARE, admin: PLATFORM_EARN_SHARE },
      provider: 'adsterra',
      adminSdk: diag.ready,
      note: 'Watch Ads never invents CPC. Real payout credits AJ Coins when Adsterra settles.',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'rewarded_status_failed';
    console.error('[ads/rewarded] GET', msg, e);
    return NextResponse.json(
      { ok: false, error: msg, message: msg },
      { status: 500 }
    );
  }
}
