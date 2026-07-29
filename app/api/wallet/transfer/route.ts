import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../../lib/firebase-admin';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

/**
 * POST /api/wallet/transfer
 * Atomic coin transfer via Admin Firestore transaction.
 * Blocks self-transfer; requires sufficient sender balance.
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
    const toUid = String(body.toUid || body.receiverId || '').trim();
    const amount = Math.floor(Number(body.amount || 0));

    if (!toUid || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'invalid_params' }, { status: 400 });
    }
    if (toUid === actor.uid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'self_transfer',
          message:
            'Transfer blocked. You cannot send coins to your own ID. Transfers only succeed when sent to another user.',
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_not_configured',
          message: 'Server transfer unavailable. Configure FIREBASE_SERVICE_ACCOUNT_JSON.',
        },
        { status: 503 }
      );
    }

    const senderRef = db.collection('users').doc(actor.uid);
    const receiverRef = db.collection('users').doc(toUid);

    const result = await db.runTransaction(async (tx) => {
      const [senderSnap, receiverSnap] = await Promise.all([
        tx.get(senderRef),
        tx.get(receiverRef),
      ]);
      if (!senderSnap.exists) throw new Error('sender_not_found');
      if (!receiverSnap.exists) throw new Error('recipient_not_found');

      const sender = senderSnap.data() as { balance?: number; isBanned?: boolean; accountStatus?: string };
      const receiver = receiverSnap.data() as { isBanned?: boolean; accountStatus?: string };

      if (sender.isBanned || sender.accountStatus === 'banned') {
        throw new Error('sender_banned');
      }
      if (receiver.isBanned || receiver.accountStatus === 'banned') {
        throw new Error('recipient_banned');
      }

      const bal = Number(sender.balance || 0);
      if (bal < amount) throw new Error('insufficient_balance');

      tx.update(senderRef, {
        balance: FieldValue.increment(-amount),
        lastTransferAt: FieldValue.serverTimestamp(),
      });
      tx.update(receiverRef, {
        balance: FieldValue.increment(amount),
        lastTransferAt: FieldValue.serverTimestamp(),
      });

      const ledgerRef = db.collection('transfers').doc();
      tx.set(ledgerRef, {
        fromUid: actor.uid,
        toUid,
        amount,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { newBalance: bal - amount };
    });

    return NextResponse.json({
      ok: true,
      amount,
      toUid,
      newBalance: result.newBalance,
      message: `Transferred ${amount} AJ Coins 🪙`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'transfer_failed';
    const status =
      msg === 'insufficient_balance' ||
      msg === 'recipient_not_found' ||
      msg === 'self_transfer'
        ? 400
        : msg === 'sender_banned' || msg === 'recipient_banned'
          ? 403
          : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
