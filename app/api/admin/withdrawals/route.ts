import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../../lib/firebase-admin';
import { verifyAdminFromRequest } from '../../../lib/admin-auth';

/**
 * GET  /api/admin/withdrawals — list pending/recent withdrawal requests (admin only)
 * POST /api/admin/withdrawals — approve | reject a request (admin only)
 */
export async function GET(request: Request) {
  const admin = await verifyAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      {
        ok: false,
        error: 'admin_sdk_unavailable',
        message: 'Configure FIREBASE_SERVICE_ACCOUNT_JSON for admin wallet ops.',
      },
      { status: 503 }
    );
  }

  try {
    const status = new URL(request.url).searchParams.get('status') || 'pending';
    let snap;
    try {
      snap = await db
        .collection('manual_withdrawals')
        .where('status', '==', status)
        .orderBy('date', 'desc')
        .limit(50)
        .get();
    } catch {
      snap = await db.collection('manual_withdrawals').limit(50).get();
    }

    const rows = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: String(data.uid || ''),
          email: String(data.email || ''),
          coins: Number(data.coins || 0),
          method: String(data.method || ''),
          status: String(data.status || 'pending'),
          payoutDetails: data.payoutDetails || {},
          date: data.date?.toMillis?.() || data.date || null,
        };
      })
      .filter((r) => (status === 'all' ? true : r.status === status));

    return NextResponse.json({ ok: true, withdrawals: rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'list_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await verifyAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: 'admin_sdk_unavailable' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    const action = String(body.action || '').trim(); // approve | reject
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ ok: false, error: 'invalid_params' }, { status: 400 });
    }

    const ref = db.collection('manual_withdrawals').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }
    const data = snap.data() as {
      status?: string;
      uid?: string;
      coins?: number;
    };
    if (data.status && data.status !== 'pending') {
      return NextResponse.json(
        { ok: false, error: 'already_processed', status: data.status },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      await ref.update({
        status: 'approved',
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: admin.uid,
      });
      return NextResponse.json({
        ok: true,
        status: 'approved',
        message: 'Withdrawal approved.',
      });
    }

    // reject → refund coins to user (balance was zeroed on request)
    const coins = Math.floor(Number(data.coins || 0));
    const uid = String(data.uid || '');
    await db.runTransaction(async (tx) => {
      const wSnap = await tx.get(ref);
      if (!wSnap.exists) throw new Error('not_found');
      const w = wSnap.data() as { status?: string };
      if (w.status && w.status !== 'pending') throw new Error('already_processed');
      tx.update(ref, {
        status: 'rejected',
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: admin.uid,
      });
      if (uid && coins > 0) {
        const userRef = db.collection('users').doc(uid);
        const uSnap = await tx.get(userRef);
        if (uSnap.exists) {
          const bal = Number((uSnap.data() as { balance?: number }).balance || 0);
          tx.update(userRef, {
            balance: bal + coins,
            lastRefundAt: FieldValue.serverTimestamp(),
          });
        }
      }
    });

    return NextResponse.json({
      ok: true,
      status: 'rejected',
      refundedCoins: coins,
      message: `Rejected — refunded ${coins} AJ Coins 🪙 to user.`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'update_failed';
    const status =
      msg === 'not_found' ? 404 : msg === 'already_processed' ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
