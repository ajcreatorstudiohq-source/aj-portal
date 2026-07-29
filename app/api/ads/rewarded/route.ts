import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../../lib/firebase-admin';
import {
  ADSTERRA_CLICK_USD,
  ADSTERRA_REWARD_COINS,
  OFFERWALL_VIDEO_MAX_DAILY,
} from '../../../lib/ads-config';
import {
  PLATFORM_EARN_SHARE,
  USER_EARN_SHARE,
  CASH_RATE,
  coinsToUsd,
} from '../../../lib/economy';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

const SESSION_TTL_MS = 10 * 60 * 1000;

function dayKeyUtc() {
  return new Date().toISOString().slice(0, 10);
}

/** Fixed Watch Ads coins + admin keeps rest of click USD (no-loss margin). */
function rewardedClaimSplit(coins: number) {
  const userUsd = coinsToUsd(coins);
  const clickUsd = Math.max(ADSTERRA_CLICK_USD, userUsd);
  const adminUsd = Number((clickUsd - userUsd).toFixed(6));
  return {
    totalUsd: clickUsd,
    userUsd,
    adminUsd,
    userCoins: coins,
    adminCoins: Math.floor(adminUsd * CASH_RATE),
  };
}

/**
 * POST /api/ads/rewarded
 * Auth: Bearer <Firebase ID token>
 *
 * Uses Firebase Admin SDK so balance / offerwall_ledger writes succeed
 * (client SDK was blocked by firestore.rules → coins never increased).
 *
 * action: 'prepare' | 'complete' | 'claim_adsterra'
 * claim_adsterra → ADSTERRA_REWARD_COINS after 30s verify
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
        persistClient: true,
        sessionPayload,
        message: 'Session ready. Client will save tracking session.',
      });
    }

    // claim / complete need Admin SDK for ledger + balance
    if (!adminDb) {
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_sdk_missing',
          message:
            'Server cannot credit coins. Configure FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.',
        },
        { status: 503 }
      );
    }

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
    };
    if (ud.isBanned || ud.accountStatus === 'banned') {
      return NextResponse.json(
        { ok: false, error: 'account_banned', message: 'Account restricted.' },
        { status: 403 }
      );
    }
    const dailyCount =
      ud.offerwallVideoDayKey === dayKey ? Number(ud.offerwallVideoDayCount || 0) : 0;

    // ── Adsterra claim: require prepare session + min 30s elapsed
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

      // If client persisted (or Admin prepare failed), recreate a valid session from claim meta
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
        createdAtMs?: number;
        verifySeconds?: number;
      };
      if (sessionFresh.uid !== user.uid) {
        return NextResponse.json({ ok: false, error: 'session_mismatch' }, { status: 403 });
      }
      if (sessionFresh.consumed) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          creditedCoins: 0,
          message: 'Already claimed for this ad session',
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
      // Also accept client-reported away time if wall-clock is slightly short (clock skew)
      const clientAwayMs = Math.max(0, Number(meta.totalAwayMs || 0));
      const effectiveElapsed = Math.max(elapsedSincePrepare, clientAwayMs);
      if (!startedMs || effectiveElapsed < needMs) {
        const left = Math.max(0, Math.ceil((needMs - effectiveElapsed) / 1000));
        return NextResponse.json(
          {
            ok: false,
            error: 'verify_too_fast',
            message: `Please wait ${left}s more, then claim. Full 30s required. No AJ Coins were credited.`,
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
          claimAttemptAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const coins = ADSTERRA_REWARD_COINS;
      const split = rewardedClaimSplit(coins);
      const txId = `adsterra_claim_${user.uid}_${dayKey}_${dailyCount}`;
      const ledgerRef = adminDb.collection('offerwall_ledger').doc(txId);

      const result = await adminDb.runTransaction(async (tx) => {
        const [ledgerSnap, freshUser] = await Promise.all([
          tx.get(ledgerRef),
          tx.get(userRef),
        ]);
        if (ledgerSnap.exists) {
          return { duplicate: true as const, credited: 0, balance: 0 };
        }
        if (!freshUser.exists) throw new Error('user_not_found');
        const u = freshUser.data() as {
          offerwallVideoDayKey?: string;
          offerwallVideoDayCount?: number;
          balance?: number;
        };
        const count =
          u.offerwallVideoDayKey === dayKey ? Number(u.offerwallVideoDayCount || 0) : 0;
        if (count >= OFFERWALL_VIDEO_MAX_DAILY) throw new Error('daily_limit');

        const bal = Math.max(0, Math.floor(Number(u.balance) || 0));
        const nextBal = bal + coins;

        tx.set(
          sessionRef,
          {
            consumed: true,
            consumedAt: FieldValue.serverTimestamp(),
            creditedCoins: coins,
            txId,
          },
          { merge: true }
        );

        tx.set(ledgerRef, {
          uid: user.uid,
          source: 'adsterra_watch',
          txId,
          coins,
          clickUsd: split.totalUsd,
          userUsd: split.userUsd,
          adminUsd: split.adminUsd,
          status: 'completed',
          provider: 'adsterra',
          dayKey,
          createdAt: FieldValue.serverTimestamp(),
          meta: body.meta && typeof body.meta === 'object' ? body.meta : {},
        });
        tx.update(userRef, {
          balance: nextBal,
          offerwallVideoDayKey: dayKey,
          offerwallVideoDayCount: count + 1,
          lastAdsterraClaimAt: FieldValue.serverTimestamp(),
          lastRewardAt: FieldValue.serverTimestamp(),
          lastRewardSource: 'adsterra_watch',
        });
        return { duplicate: false as const, credited: coins, balance: nextBal };
      });

      if (!result.duplicate && split.adminUsd > 0) {
        try {
          await adminDb.collection('AdminRevenue').add({
            type: 'adsterra_watch',
            source: 'adsterra',
            currency: 'USD',
            platformSharePct: PLATFORM_EARN_SHARE,
            userSharePct: USER_EARN_SHARE,
            placement,
            uid: user.uid,
            totalPool: split.totalUsd,
            adminShare: split.adminUsd,
            ownerUsd: split.adminUsd,
            adminShareCoins: split.adminCoins,
            userNet: split.userUsd,
            userNetCoins: result.credited,
            clickUsd: ADSTERRA_CLICK_USD,
            txId,
            createdAt: FieldValue.serverTimestamp(),
          });
          await adminDb.doc('admin_stats/earnings').set(
            {
              totalOwnerUsd: FieldValue.increment(split.adminUsd),
              totalOwnerCoins: FieldValue.increment(split.adminCoins),
              adOwnerUsd: FieldValue.increment(split.adminUsd),
              eventCount: FieldValue.increment(1),
              updatedAt: FieldValue.serverTimestamp(),
              currency: 'USD',
            },
            { merge: true }
          );
        } catch {
          /* non-fatal — user already credited */
        }
      }

      return NextResponse.json({
        ok: true,
        duplicate: result.duplicate,
        creditedCoins: result.credited,
        balance: result.balance,
        clickUsd: split.totalUsd,
        userUsd: split.userUsd,
        adminUsd: split.adminUsd,
        remainingToday: Math.max(
          0,
          OFFERWALL_VIDEO_MAX_DAILY - (result.duplicate ? dailyCount : dailyCount + 1)
        ),
        message: result.duplicate
          ? 'Already claimed'
          : `+${result.credited} AJ Coins 🪙 added to your wallet!`,
      });
    }

    if (action !== 'complete') {
      return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
    }

    const sessionId = String(body.sessionId || '').trim();
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 400 });
    }

    const status = String(body.status || '').toLowerCase();
    const networkShown = body.networkShown === true;
    if (status !== 'completed' || !networkShown) {
      return NextResponse.json(
        {
          ok: false,
          error: status !== 'completed' ? 'status_required' : 'ad_not_verified',
          message: 'Coins credited only when status is completed.',
        },
        { status: 403 }
      );
    }

    const sessionRef = adminDb.collection('ad_reward_sessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ ok: false, error: 'invalid_session' }, { status: 400 });
    }
    const session = sessionSnap.data() as {
      uid: string;
      expiresAt: number;
      consumed?: boolean;
      slot?: number;
      placement?: string;
    };
    if (session.uid !== user.uid) {
      return NextResponse.json({ ok: false, error: 'session_mismatch' }, { status: 403 });
    }
    if (session.consumed) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        creditedCoins: 0,
        message: 'Session already rewarded',
      });
    }
    if (Date.now() > Number(session.expiresAt || 0)) {
      return NextResponse.json({ ok: false, error: 'session_expired' }, { status: 400 });
    }
    if (dailyCount >= OFFERWALL_VIDEO_MAX_DAILY) {
      return NextResponse.json(
        { ok: false, error: 'daily_limit', remainingToday: 0 },
        { status: 429 }
      );
    }

    const slot = typeof session.slot === 'number' ? session.slot : dailyCount;
    const txId = `offerwall_video_${user.uid}_${dayKey}_${slot}`;
    const ledgerRef = adminDb.collection('offerwall_ledger').doc(txId);
    const coins = ADSTERRA_REWARD_COINS;
    const split = rewardedClaimSplit(coins);

    const creditResult = await adminDb.runTransaction(async (tx) => {
      const [ledgerSnap, freshSession, freshUser] = await Promise.all([
        tx.get(ledgerRef),
        tx.get(sessionRef),
        tx.get(userRef),
      ]);
      if (ledgerSnap.exists) return { duplicate: true as const, credited: 0, balance: 0 };
      if (!freshSession.exists) throw new Error('invalid_session');
      const s = freshSession.data() as { uid: string; consumed?: boolean };
      if (s.uid !== user.uid) throw new Error('session_mismatch');
      if (s.consumed) return { duplicate: true as const, credited: 0, balance: 0 };
      if (!freshUser.exists) throw new Error('user_not_found');
      const u = freshUser.data() as {
        offerwallVideoDayKey?: string;
        offerwallVideoDayCount?: number;
        balance?: number;
      };
      const count =
        u.offerwallVideoDayKey === dayKey ? Number(u.offerwallVideoDayCount || 0) : 0;
      if (count >= OFFERWALL_VIDEO_MAX_DAILY) throw new Error('daily_limit');

      const bal = Math.max(0, Math.floor(Number(u.balance) || 0));
      const nextBal = bal + coins;

      tx.set(ledgerRef, {
        uid: user.uid,
        source: 'offerwall_video',
        txId,
        coins,
        status: 'completed',
        sessionId,
        dayKey,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(userRef, {
        balance: nextBal,
        offerwallVideoDayKey: dayKey,
        offerwallVideoDayCount: count + 1,
        lastOfferwallVideoAt: FieldValue.serverTimestamp(),
        lastRewardAt: FieldValue.serverTimestamp(),
        lastRewardSource: 'offerwall_video',
      });
      tx.update(sessionRef, {
        consumed: true,
        completedAt: FieldValue.serverTimestamp(),
        status: 'completed',
        txId,
        creditedCoins: coins,
      });
      return { duplicate: false as const, credited: coins, balance: nextBal };
    });

    if (!creditResult.duplicate && split.adminUsd > 0) {
      try {
        await adminDb.collection('AdminRevenue').add({
          type: 'adsterra_watch',
          source: 'adsterra',
          currency: 'USD',
          platformSharePct: PLATFORM_EARN_SHARE,
          userSharePct: USER_EARN_SHARE,
          placement,
          uid: user.uid,
          totalPool: split.totalUsd,
          adminShare: split.adminUsd,
          ownerUsd: split.adminUsd,
          adminShareCoins: split.adminCoins,
          userNet: split.userUsd,
          userNetCoins: creditResult.credited,
          clickUsd: ADSTERRA_CLICK_USD,
          txId,
          createdAt: FieldValue.serverTimestamp(),
        });
        await adminDb.doc('admin_stats/earnings').set(
          {
            totalOwnerUsd: FieldValue.increment(split.adminUsd),
            totalOwnerCoins: FieldValue.increment(split.adminCoins),
            adOwnerUsd: FieldValue.increment(split.adminUsd),
            eventCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
            currency: 'USD',
          },
          { merge: true }
        );
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json({
      ok: true,
      duplicate: creditResult.duplicate,
      creditedCoins: creditResult.credited,
      balance: creditResult.balance,
      clickUsd: split.totalUsd,
      userUsd: split.userUsd,
      adminUsd: split.adminUsd,
      remainingToday: Math.max(
        0,
        OFFERWALL_VIDEO_MAX_DAILY -
          (creditResult.duplicate ? dailyCount : dailyCount + 1)
      ),
      status: 'completed',
      message: creditResult.duplicate
        ? 'Video reward already claimed'
        : `Video complete! +${creditResult.credited} AJ Coins 🪙`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'rewarded_failed';
    console.error('[ads/rewarded]', msg, e);
    const status =
      msg === 'daily_limit'
        ? 429
        : msg === 'invalid_session' || msg === 'session_mismatch'
          ? 400
          : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function GET() {
  const split = rewardedClaimSplit(ADSTERRA_REWARD_COINS);
  return NextResponse.json({
    ok: true,
    maxDaily: OFFERWALL_VIDEO_MAX_DAILY,
    rewardCoins: ADSTERRA_REWARD_COINS,
    clickUsd: split.totalUsd,
    userUsd: split.userUsd,
    adminUsd: split.adminUsd,
    provider: 'adsterra',
    requiresStatus: 'completed',
    adminSdk: !!getAdminDb(),
  });
}
