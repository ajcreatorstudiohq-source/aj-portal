import { NextResponse } from 'next/server';
import {
  doc,
  runTransaction,
  increment,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { FieldValue, getAdminDb } from '../../../lib/firebase-admin';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { coinsToUsd } from '../../../lib/economy';
import { creditAdminEarnings } from '../../../lib/admin-earnings';

/** Must match client PK_ENTRY_COINS */
const DEFAULT_PK_ENTRY = 100;

/**
 * POST /api/pk/entry
 * Body: { role: 'host' | 'guest', entryCoins?: number, rivalUid?: string, pkRoomId?: string }
 *
 * Deducts PK entry from the authenticated user and saves those coins to
 * AdminRevenue + admin_stats/earnings (admin panel). Never starts a match here.
 * If balance is short → insufficient_balance (no debit, no admin write).
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
    const entry = Math.max(
      1,
      Math.floor(Number(body.entryCoins) || DEFAULT_PK_ENTRY)
    );
    const rivalUid = String(body.rivalUid || '').trim();
    const pkRoomId = String(body.pkRoomId || '').trim();

    const adminDb = getAdminDb();

    if (adminDb) {
      const userRef = adminDb.collection('users').doc(actor.uid);
      const result = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) throw new Error('user_not_found');
        const bal = Math.max(0, Math.floor(Number((snap.data() as { balance?: number }).balance) || 0));
        if (bal < entry) {
          return { ok: false as const, balance: bal, need: entry };
        }
        const next = bal - entry;
        tx.update(userRef, {
          balance: next,
          lastPkEntryAt: FieldValue.serverTimestamp(),
          lastPkEntryCoins: entry,
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
      const ledgerRef = adminDb.collection('AdminRevenue').doc();
      await ledgerRef.set({
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

      await adminDb.doc('admin_stats/earnings').set(
        {
          totalOwnerUsd: FieldValue.increment(ownerUsd),
          totalOwnerCoins: FieldValue.increment(entry),
          eventCount: FieldValue.increment(1),
          pkOwnerUsd: FieldValue.increment(ownerUsd),
          pkOwnerCoins: FieldValue.increment(entry),
          updatedAt: FieldValue.serverTimestamp(),
          currency: 'USD',
        },
        { merge: true }
      );

      return NextResponse.json({
        ok: true,
        entryCoins: entry,
        balance: result.balance,
        adminCoinsSaved: entry,
        ownerUsd,
        message: `PK entry ${entry} 🪙 saved to admin ledger`,
      });
    }

    // Client SDK fallback when Admin SDK is not configured
    const userRef = doc(db, 'users', actor.uid);
    let balanceAfter = 0;
    let previous = 0;
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists()) throw new Error('user_not_found');
        const bal = Math.max(
          0,
          Math.floor(Number((snap.data() as { balance?: number }).balance) || 0)
        );
        previous = bal;
        if (bal < entry) throw new Error('insufficient_balance');
        balanceAfter = bal - entry;
        tx.update(userRef, { balance: increment(-entry) });
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'entry_failed';
      if (msg === 'insufficient_balance') {
        return NextResponse.json(
          {
            ok: false,
            error: 'insufficient_balance',
            balance: previous,
            need: entry,
            message: 'Not enough coins for PK match',
          },
          { status: 400 }
        );
      }
      throw e;
    }

    const ownerUsd = coinsToUsd(entry);
    try {
      await addDoc(collection(db, 'AdminRevenue'), {
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
        date: serverTimestamp(),
        savedToAdmin: true,
      });
      await creditAdminEarnings({
        ownerUsd,
        ownerCoins: entry,
        source: 'pk_match',
      });
    } catch (ledgerErr) {
      console.error('pk entry admin ledger', ledgerErr);
    }

    return NextResponse.json({
      ok: true,
      entryCoins: entry,
      balance: balanceAfter,
      adminCoinsSaved: entry,
      ownerUsd,
      message: `PK entry ${entry} 🪙 saved to admin ledger`,
      usedClientSdk: true,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'pk_entry_failed';
    const status = msg === 'user_not_found' ? 404 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
