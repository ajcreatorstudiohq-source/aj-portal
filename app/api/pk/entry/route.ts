import { NextResponse } from 'next/server';
import { FieldValue, getAdminDb } from '../../../lib/firebase-admin';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { coinsToUsd } from '../../../lib/economy';
import { creditAdminEarnings } from '../../../lib/admin-earnings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Must match client PK_ENTRY_COINS */
const DEFAULT_PK_ENTRY = 100;

/**
 * POST /api/pk/entry — Admin SDK only (no client balance fallback).
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
    const entry = Math.max(1, Math.floor(Number(body.entryCoins) || DEFAULT_PK_ENTRY));
    const rivalUid = String(body.rivalUid || '').trim();
    const pkRoomId = String(body.pkRoomId || '').trim();

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_sdk_missing',
          message: 'Server wallet unavailable. Configure FIREBASE_SERVICE_ACCOUNT_JSON.',
        },
        { status: 503 }
      );
    }

    const userRef = adminDb.collection('users').doc(actor.uid);
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new Error('user_not_found');
      const bal = Math.max(
        0,
        Math.floor(Number((snap.data() as { balance?: number }).balance) || 0)
      );
      if (bal < entry) {
        return { ok: false as const, balance: bal, need: entry };
      }
      const next = bal - entry;
      tx.update(userRef, {
        balance: next,
        lastPkEntryAt: FieldValue.serverTimestamp(),
        lastPkEntryCoins: entry,
        lastWalletWriteAt: FieldValue.serverTimestamp(),
      });
      return { ok: true as const, balance: next, previous: bal };
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'insufficient_balance',
          balance: result.balance,
          need: result.need,
          message: 'Not enough coins for PK match',
        },
        { status: 400 }
      );
    }

    const ownerUsd = coinsToUsd(entry);
    await adminDb.collection('AdminRevenue').add({
      type: 'pk_match',
      role,
      currency: 'USD',
      entryCoins: entry,
      totalDeducted: entry,
      adminShareCoins: entry,
      ownerUsd,
      platformSharePct: 1,
      userSharePct: 0,
      payerUid: actor.uid,
      challenger: role === 'host' ? actor.uid : rivalUid || '',
      rival: role === 'guest' ? actor.uid : rivalUid || '',
      pkRoomId: pkRoomId || null,
      date: FieldValue.serverTimestamp(),
      savedToAdmin: true,
    });

    const credit = await creditAdminEarnings({
      ownerUsd,
      ownerCoins: entry,
      source: 'pk_match',
      earnerUid: actor.uid,
      forceWalletCredit: true,
    });

    return NextResponse.json({
      ok: true,
      entryCoins: entry,
      balance: result.balance,
      adminCoinsSaved: entry,
      adminWalletCredited: credit.walletCredited,
      ownerUsd,
      message: `PK entry ${entry} 🪙 saved to admin wallet`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'entry_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
