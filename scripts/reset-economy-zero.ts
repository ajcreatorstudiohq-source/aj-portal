#!/usr/bin/env npx tsx
/**
 * CLI: reset all user balances + admin ledgers to zero.
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON (or PROJECT_ID + CLIENT_EMAIL + PRIVATE_KEY).
 *
 *   npx tsx scripts/reset-economy-zero.ts
 */
async function main() {
  // Load .env.local manually if present (no dotenv dependency)
  try {
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const text = fs.readFileSync(envPath, 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!m) continue;
        const key = m[1]!;
        let val = m[2]!.trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {
    /* ignore */
  }

  const { getAdminDb, isFirebaseAdminReady } = await import('../app/lib/firebase-admin');
  if (!isFirebaseAdminReady()) {
    console.error(
      'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local'
    );
    process.exit(1);
  }
  const db = getAdminDb();
  if (!db) {
    console.error('getAdminDb() returned null');
    process.exit(1);
  }

  const { FieldValue } = await import('firebase-admin/firestore');

  let usersZeroed = 0;
  const users = await db.collection('users').get();
  let batch = db.batch();
  let ops = 0;
  for (const d of users.docs) {
    batch.update(d.ref, {
      balance: 0,
      invested: 0,
      offerwallVideoDayCount: 0,
      offerwallDayCount: 0,
      dailyRewards: {},
      economyResetAt: FieldValue.serverTimestamp(),
    });
    ops += 1;
    usersZeroed += 1;
    if (ops % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (ops % 400 !== 0) await batch.commit();
  console.log(`Users zeroed: ${usersZeroed}/${users.size}`);

  await db.doc('admin_stats/earnings').set(
    {
      totalOwnerUsd: 0,
      totalOwnerCoins: 0,
      giftOwnerUsd: 0,
      giftOwnerCoins: 0,
      adOwnerUsd: 0,
      eventCount: 0,
      currency: 'USD',
      resetAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log('admin_stats/earnings reset to 0');

  async function wipe(name: string) {
    let deleted = 0;
    for (;;) {
      const snap = await db!.collection(name).limit(400).get();
      if (snap.empty) break;
      const b = db!.batch();
      snap.docs.forEach((docSnap) => b.delete(docSnap.ref));
      await b.commit();
      deleted += snap.size;
      if (snap.size < 400) break;
      if (deleted >= 8000) break;
    }
    console.log(`${name} deleted: ${deleted}`);
    return deleted;
  }

  await wipe('AdminRevenue');
  await wipe('reward_ledger');
  await wipe('offerwall_ledger');
  await wipe('ad_events');

  console.log('Done — economy is fresh at 0.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
