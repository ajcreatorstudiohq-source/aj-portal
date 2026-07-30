import { NextResponse } from 'next/server';
import { FieldValue, getAdminDb } from '../../../lib/firebase-admin';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/pk/entry
 * Live matches / PK battles are FREE — no coin deduction, no ticket fee.
 * Registers participation only (optional audit row).
 */
export async function POST(request: Request) {
  try {
    const token = bearerFromRequest(request);
    if (!token) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const actor = await verifyFirebaseIdToken(token);
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const role = String(body.role || 'host').toLowerCase() === 'guest' ? 'guest' : 'host';
    const rivalUid = String(body.rivalUid || '').trim();
    const pkRoomId = String(body.pkRoomId || '').trim();
    // Force free — ignore any client-sent entryCoins
    const entryCoins = 0;

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_sdk_missing',
          message: 'Server unavailable. Configure FIREBASE_SERVICE_ACCOUNT_JSON.',
        },
        { status: 503 }
      );
    }

    const userRef = adminDb.collection('users').doc(actor.uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
    }
    const balance = Math.max(
      0,
      Math.floor(Number((snap.data() as { balance?: number }).balance) || 0)
    );

    await userRef.set(
      {
        lastPkEntryAt: FieldValue.serverTimestamp(),
        lastPkEntryCoins: 0,
        lastPkEntryFree: true,
      },
      { merge: true }
    );

    try {
      await adminDb.collection('pk_entry_log').add({
        type: 'pk_match_free',
        role,
        entryCoins: 0,
        free: true,
        payerUid: actor.uid,
        rivalUid: rivalUid || null,
        pkRoomId: pkRoomId || null,
        date: FieldValue.serverTimestamp(),
      });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      ok: true,
      free: true,
      entryCoins,
      balance,
      adminCoinsSaved: 0,
      adminWalletCredited: 0,
      ownerUsd: 0,
      message: 'Free live match — no coins deducted',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'entry_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
