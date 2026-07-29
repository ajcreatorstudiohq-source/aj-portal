/**
 * Fresh-start economy reset (CEO client or Admin SDK).
 * Zeros every user balance + admin earnings; deletes test ledger docs.
 */
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  writeBatch,
  setDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';

export type ResetEconomyResult = {
  usersScanned: number;
  usersZeroed: number;
  adminRevenueDeleted: number;
  rewardLedgerDeleted: number;
  offerwallLedgerDeleted: number;
  adEventsDeleted: number;
  adminStatsReset: boolean;
};

const BATCH_MAX = 400;
const DELETE_CAP = 8000;

async function deleteCollectionDocs(
  db: Firestore,
  collectionName: string,
  maxDocs = DELETE_CAP
): Promise<number> {
  let deleted = 0;
  while (deleted < maxDocs) {
    const snap = await getDocs(
      query(collection(db, collectionName), limit(BATCH_MAX))
    );
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    if (snap.size < BATCH_MAX) break;
  }
  return deleted;
}

/**
 * Reset portal economy to a clean zero state.
 * Requires CEO Firestore rules or Firebase Admin privileges.
 */
export async function resetEconomyFreshStart(
  db: Firestore
): Promise<ResetEconomyResult> {
  let usersScanned = 0;
  let usersZeroed = 0;

  const usersSnap = await getDocs(collection(db, 'users'));
  usersScanned = usersSnap.size;

  let batch = writeBatch(db);
  let ops = 0;
  for (const d of usersSnap.docs) {
    batch.update(d.ref, {
      balance: 0,
      invested: 0,
      offerwallVideoDayCount: 0,
      offerwallDayCount: 0,
      dailyRewards: {},
      economyResetAt: serverTimestamp(),
    });
    ops += 1;
    usersZeroed += 1;
    if (ops % BATCH_MAX === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  if (ops % BATCH_MAX !== 0) {
    await batch.commit();
  }

  await setDoc(
    doc(db, 'admin_stats', 'earnings'),
    {
      totalOwnerUsd: 0,
      totalOwnerCoins: 0,
      giftOwnerUsd: 0,
      giftOwnerCoins: 0,
      adOwnerUsd: 0,
      eventCount: 0,
      currency: 'USD',
      resetAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const adminRevenueDeleted = await deleteCollectionDocs(db, 'AdminRevenue');
  const rewardLedgerDeleted = await deleteCollectionDocs(db, 'reward_ledger');
  const offerwallLedgerDeleted = await deleteCollectionDocs(db, 'offerwall_ledger');
  const adEventsDeleted = await deleteCollectionDocs(db, 'ad_events');

  return {
    usersScanned,
    usersZeroed,
    adminRevenueDeleted,
    rewardLedgerDeleted,
    offerwallLedgerDeleted,
    adEventsDeleted,
    adminStatsReset: true,
  };
}
