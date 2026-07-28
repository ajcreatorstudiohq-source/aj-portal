import { NextResponse } from 'next/server';
import {
  collection,
  getDocs,
  limit,
  query,
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { verifyAdminFromRequest } from '../../../lib/admin-auth';
import { ensureUserReferralId } from '../../../lib/referral';

/**
 * POST /api/admin/backfill-referrals
 * CEO-only — assign unique referralId to every user missing one.
 */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const snap = await getDocs(query(collection(db, 'users'), limit(500)));
    let assigned = 0;
    let skipped = 0;
    let failed = 0;
    const samples: { uid: string; referralId: string }[] = [];

    for (const d of snap.docs) {
      const data = d.data() as { referralId?: string };
      const existing = String(data.referralId || '').trim();
      if (existing) {
        skipped += 1;
        continue;
      }
      try {
        const code = await ensureUserReferralId(d.id);
        assigned += 1;
        if (samples.length < 20) samples.push({ uid: d.id, referralId: code });
      } catch {
        failed += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: snap.size,
      assigned,
      skipped,
      failed,
      samples,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'backfill_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
