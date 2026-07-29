import { NextResponse } from 'next/server';
import { FieldValue, getAdminDb }

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; from '../../../lib/firebase-admin';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

/**
 * Resolve recipient: unique Transfer ID (AJ…) via referral_ids, or legacy Firebase uid.
 */
async function resolveTransferTargetUid(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  raw: string
): Promise<string | null> {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();

  const mapSnap = await db.collection('referral_ids').doc(upper).get();
  if (mapSnap.exists) {
    const uid = String((mapSnap.data() as { uid?: string }).uid || '').trim();
    if (uid) return uid;
  }

  const byCode = await db
    .collection('users')
    .where('referralId', '==', upper)
    .limit(1)
    .get();
  if (!byCode.empty) return byCode.docs[0]!.id;

  const byUid = await db.collection('users').doc(trimmed).get();
  if (byUid.exists) return trimmed;

  return null;
}

/**
 * POST /api/wallet/transfer
 * Atomic coin transfer via Admin Firestore transaction.
 * Accepts unique Transfer ID (same as referralId, e.g. AJ7K2M9X4P) or Firebase uid.
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
    const rawTarget = String(
      body.transferId || body.toUid || body.receiverId || body.toTransferId || ''
    ).trim();
    const amount = Math.floor(Number(body.amount || 0));

    if (!rawTarget || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'invalid_params' }, { status: 400 });
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

    const toUid = await resolveTransferTargetUid(db, rawTarget);
    if (!toUid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'recipient_not_found',
          message: 'Transfer ID not found. Ask them for their unique Transfer ID from Wallet → Transfer.',
        },
        { status: 404 }
      );
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
        transferIdEntered: rawTarget.toUpperCase(),
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
