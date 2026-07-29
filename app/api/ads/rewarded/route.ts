import { NextResponse } from 'next/server';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  runTransaction,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
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
import { creditAdminEarnings } from '../../../lib/admin-earnings';
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
 * action: 'prepare' | 'complete' | 'claim_adsterra'
 * claim_adsterra → ADSTERRA_REWARD_COINS (10) after 30s verify
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
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
    }
    const ud = userSnap.data() as {
      offerwallVideoDayKey?: string;
      offerwallVideoDayCount?: number;
    };
    const dailyCount =
      ud.offerwallVideoDayKey === dayKey ? Number(ud.offerwallVideoDayCount || 0) : 0;

    // ── Adsterra claim: require prepare session + min 30s elapsed
    if (action === 'claim_adsterra') {
      if (dailyCount >= OFFERWALL_VIDEO_MAX_DAILY) {
        return NextResponse.json(
          { ok: false, error: 'daily_limit', remainingToday: 0 },
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

      const sessionRef = doc(db, 'ad_reward_sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) {
        return NextResponse.json(
          { ok: false, error: 'invalid_session', message: 'Start Watch Ads again.' },
          { status: 400 }
        );
      }
      const session = sessionSnap.data() as {
        uid: string;
        expiresAt: number;
        consumed?: boolean;
        createdAtMs?: number;
        verifySeconds?: number;
      };
      if (session.uid !== user.uid) {
        return NextResponse.json({ ok: false, error: 'session_mismatch' }, { status: 403 });
      }
      if (session.consumed) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          creditedCoins: 0,
          message: 'Already claimed for this ad session',
        });
      }
      if (Date.now() > Number(session.expiresAt || 0)) {
        return NextResponse.json(
          {
            ok: false,
            error: 'session_expired',
            message: 'Ad session expired. Start Watch Ads again.',
          },
          { status: 400 }
        );
      }

      // Source of truth: wall-clock since prepare (client away time is metadata only)
      const needMs =
        (Number(session.verifySeconds) > 0 ? Number(session.verifySeconds) : 30) * 1000;
      const startedMs = Number(session.createdAtMs || 0);
      const elapsedSincePrepare = startedMs > 0 ? Date.now() - startedMs : 0;
      if (!startedMs || elapsedSincePrepare < needMs) {
        const left = Math.max(0, Math.ceil((needMs - elapsedSincePrepare) / 1000));
        return NextResponse.json(
          {
            ok: false,
            error: 'verify_too_fast',
            message: `Please wait ${left}s more, then claim. Full 30s required. No AJ Coins were credited.`,
          },
          { status: 403 }
        );
      }

      const meta =
        body.meta && typeof body.meta === 'object'
          ? (body.meta as { totalAwayMs?: number; enteredAdAt?: number; leftAdAt?: number })
          : {};

      await setDoc(
        sessionRef,
        {
          enteredAdAt: meta.enteredAdAt ?? null,
          leftAdAt: meta.leftAdAt ?? null,
          totalAwayMs: Number(meta.totalAwayMs || 0) || null,
          elapsedSincePrepareMs: elapsedSincePrepare,
          claimAttemptAt: serverTimestamp(),
        },
        { merge: true }
      );

      const coins = ADSTERRA_REWARD_COINS;
      const split = rewardedClaimSplit(coins);
      const txId = `adsterra_claim_${user.uid}_${dayKey}_${dailyCount}`;
      const ledgerRef = doc(db, 'offerwall_ledger', txId);

      const result = await runTransaction(db, async (tx) => {
        const [ledgerSnap, freshUser] = await Promise.all([
          tx.get(ledgerRef),
          tx.get(userRef),
        ]);
        if (ledgerSnap.exists()) {
          return { duplicate: true as const, credited: 0 };
        }
        if (!freshUser.exists()) throw new Error('user_not_found');
        const u = freshUser.data() as {
          offerwallVideoDayKey?: string;
          offerwallVideoDayCount?: number;
        };
        const count =
          u.offerwallVideoDayKey === dayKey ? Number(u.offerwallVideoDayCount || 0) : 0;
        if (count >= OFFERWALL_VIDEO_MAX_DAILY) throw new Error('daily_limit');

        if (sessionId) {
          const sref = doc(db, 'ad_reward_sessions', sessionId);
          tx.set(
            sref,
            { consumed: true, consumedAt: serverTimestamp() },
            { merge: true }
          );
        }

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
          createdAt: serverTimestamp(),
          meta: body.meta && typeof body.meta === 'object' ? body.meta : {},
        });
        tx.update(userRef, {
          balance: increment(coins),
          offerwallVideoDayKey: dayKey,
          offerwallVideoDayCount: count + 1,
          lastAdsterraClaimAt: serverTimestamp(),
          lastRewardAt: serverTimestamp(),
          lastRewardSource: 'adsterra_watch',
        });
        return { duplicate: false as const, credited: coins };
      });

      if (!result.duplicate && split.adminUsd > 0) {
        try {
          await addDoc(collection(db, 'AdminRevenue'), {
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
            createdAt: serverTimestamp(),
          });
          await creditAdminEarnings({
            ownerUsd: split.adminUsd,
            ownerCoins: split.adminCoins,
            source: 'adsterra_watch',
          });
        } catch {
          /* non-fatal — user already credited */
        }
      }

      return NextResponse.json({
        ok: true,
        duplicate: result.duplicate,
        creditedCoins: result.credited,
        clickUsd: split.totalUsd,
        userUsd: split.userUsd,
        adminUsd: split.adminUsd,
        remainingToday: Math.max(
          0,
          OFFERWALL_VIDEO_MAX_DAILY - (result.duplicate ? dailyCount : dailyCount + 1)
        ),
        message: result.duplicate
          ? 'Already claimed'
          : `+${result.credited} AJ Coins 🪙 claimed!`,
      });
    }

    if (action === 'prepare') {
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
      const sessionId = `rv_${user.uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const expiresAt = Date.now() + SESSION_TTL_MS;
      const createdAtMs = Date.now();
      await setDoc(doc(db, 'ad_reward_sessions', sessionId), {
        uid: user.uid,
        placement,
        createdAt: serverTimestamp(),
        createdAtMs,
        expiresAt,
        dayKey,
        consumed: false,
        slot: dailyCount,
        verifySeconds: 30,
      });
      return NextResponse.json({
        ok: true,
        sessionId,
        expiresAt,
        createdAtMs,
        remainingToday: Math.max(0, OFFERWALL_VIDEO_MAX_DAILY - dailyCount),
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

    const sessionRef = doc(db, 'ad_reward_sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
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
    const ledgerRef = doc(db, 'offerwall_ledger', txId);
    const coins = ADSTERRA_REWARD_COINS;
    const split = rewardedClaimSplit(coins);

    const creditResult = await runTransaction(db, async (tx) => {
      const [ledgerSnap, freshSession, freshUser] = await Promise.all([
        tx.get(ledgerRef),
        tx.get(sessionRef),
        tx.get(userRef),
      ]);
      if (ledgerSnap.exists()) return { duplicate: true as const, credited: 0 };
      if (!freshSession.exists()) throw new Error('invalid_session');
      const s = freshSession.data() as { uid: string; consumed?: boolean };
      if (s.uid !== user.uid) throw new Error('session_mismatch');
      if (s.consumed) return { duplicate: true as const, credited: 0 };
      if (!freshUser.exists()) throw new Error('user_not_found');
      const u = freshUser.data() as {
        offerwallVideoDayKey?: string;
        offerwallVideoDayCount?: number;
      };
      const count =
        u.offerwallVideoDayKey === dayKey ? Number(u.offerwallVideoDayCount || 0) : 0;
      if (count >= OFFERWALL_VIDEO_MAX_DAILY) throw new Error('daily_limit');

      tx.set(ledgerRef, {
        uid: user.uid,
        source: 'offerwall_video',
        txId,
        coins,
        status: 'completed',
        sessionId,
        dayKey,
        createdAt: serverTimestamp(),
      });
      tx.update(userRef, {
        balance: increment(coins),
        offerwallVideoDayKey: dayKey,
        offerwallVideoDayCount: count + 1,
        lastOfferwallVideoAt: serverTimestamp(),
        lastRewardAt: serverTimestamp(),
        lastRewardSource: 'offerwall_video',
      });
      tx.update(sessionRef, {
        consumed: true,
        completedAt: serverTimestamp(),
        status: 'completed',
        txId,
        creditedCoins: coins,
      });
      return { duplicate: false as const, credited: coins };
    });

    if (!creditResult.duplicate && split.adminUsd > 0) {
      try {
        await addDoc(collection(db, 'AdminRevenue'), {
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
          createdAt: serverTimestamp(),
        });
        await creditAdminEarnings({
          ownerUsd: split.adminUsd,
          ownerCoins: split.adminCoins,
          source: 'adsterra_watch',
        });
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json({
      ok: true,
      duplicate: creditResult.duplicate,
      creditedCoins: creditResult.credited,
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
  });
}
