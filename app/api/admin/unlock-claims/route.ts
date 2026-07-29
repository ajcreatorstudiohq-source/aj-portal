import { NextResponse } from 'next/server';
import { verifyAdminFromRequest } from '../../../lib/admin-auth';
import { FieldValue, getAdminDb } from '../../../lib/firebase-admin';

/**
 * POST /api/admin/unlock-claims
 * CEO-only — clears faucet / Watch Ads day counters for a user so claims work
 * again after an economy reset soft-lock (ledger left behind, counters desynced).
 *
 * Body: { email?: string, uid?: string } — defaults to the calling admin.
 */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_sdk_missing',
          message: 'Configure FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.',
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let targetUid = String(body.uid || '').trim();
    const email = String(body.email || '').trim().toLowerCase();

    if (!targetUid && email) {
      const snap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (snap.empty) {
        // Also try Auth lookup via users docs that store email lowercase variants
        const all = await db.collection('users').limit(500).get();
        const hit = all.docs.find((d) => {
          const e = String((d.data() as { email?: string }).email || '')
            .trim()
            .toLowerCase();
          return e === email;
        });
        if (!hit) {
          return NextResponse.json(
            { ok: false, error: 'user_not_found', message: `No user for ${email}` },
            { status: 404 }
          );
        }
        targetUid = hit.id;
      } else {
        targetUid = snap.docs[0].id;
      }
    }

    if (!targetUid) targetUid = admin.uid;

    const userRef = db.collection('users').doc(targetUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
    }

    await userRef.update({
      offerwallVideoDayCount: 0,
      offerwallVideoDayKey: '',
      offerwallDayCount: 0,
      mathChallengeDayCount: 0,
      mathChallengeDayKey: '',
      alphaCaptchaDayCount: 0,
      alphaCaptchaDayKey: '',
      dailyRewards: {},
      claimsUnlockedAt: FieldValue.serverTimestamp(),
      lastWalletWriteAt: FieldValue.serverTimestamp(),
    });

    // Clear open/consumed sessions for this uid so no stale "already claimed" session sticks.
    async function wipeUidSessions(collectionName: string) {
      let deleted = 0;
      const snap = await db!
        .collection(collectionName)
        .where('uid', '==', targetUid)
        .limit(400)
        .get();
      if (snap.empty) return 0;
      const batch = db!.batch();
      snap.docs.forEach((d) => {
        batch.delete(d.ref);
        deleted += 1;
      });
      await batch.commit();
      return deleted;
    }

    const adSessionsDeleted = await wipeUidSessions('ad_reward_sessions');
    const mathSessionsDeleted = await wipeUidSessions('math_challenge_sessions');
    const captchaSessionsDeleted = await wipeUidSessions('alpha_captcha_sessions');

    const bal = Math.max(
      0,
      Math.floor(Number((userSnap.data() as { balance?: number }).balance) || 0)
    );

    return NextResponse.json({
      ok: true,
      uid: targetUid,
      email: email || (userSnap.data() as { email?: string }).email || null,
      balance: bal,
      adSessionsDeleted,
      mathSessionsDeleted,
      captchaSessionsDeleted,
      message:
        'Claim counters unlocked. Start a fresh Watch Ads / Math / Captcha session to earn coins.',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unlock_failed';
    console.error('[admin/unlock-claims]', msg, e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
