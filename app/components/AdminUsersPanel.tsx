'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Ban, RefreshCw, Search, Shield } from 'lucide-react';
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { auth, db } from '../firebase';
import { isPortalAdminUser } from '../lib/admin-auth';
import { ACCOUNT_STATUS, buildBanUpdate, isUserBanned } from '../lib/user-ban';
import { isRtdbPresenceOnline, isUserOnlineNow, type PresenceSnapshot } from '../lib/presence';
import { formatUsd, coinsToUsd } from '../lib/economy';
import { ensureUserReferralId } from '../lib/referral';
import { resetEconomyFreshStart } from '../lib/reset-economy';
import AdminEconomyHisaab from './AdminEconomyHisaab';

export type AdminUserRow = {
  uid: string;
  name?: string;
  username?: string;
  email?: string;
  photo?: string;
  balance?: number;
  accountStatus?: string;
  isBanned?: boolean;
  banReason?: string;
  status?: string;
  lastSeenMs?: number;
};

type Props = {
  /** Current signed-in user — must pass admin gate */
  adminUser?: { uid?: string | null; email?: string | null } | null;
  onBack: () => void;
  onAlert?: (msg: string, icon?: string) => void;
};

export default function AdminUsersPanel({ adminUser, onBack, onAlert }: Props) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [presenceByUid, setPresenceByUid] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [banningUid, setBanningUid] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [hisaabKey, setHisaabKey] = useState(0);
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);

  // Hard client gate — never render admin tools for normal users
  useEffect(() => {
    const current = auth.currentUser;
    const identity = adminUser || {
      uid: current?.uid,
      email: current?.email,
    };
    if (!isPortalAdminUser(identity)) {
      setAllowed(false);
      onBack();
      return;
    }
    setAllowed(true);

    // Bind CEO Hub wallet so other users' earns credit owner-share here
    void (async () => {
      try {
        const u = auth.currentUser;
        if (!u) return;
        const token = await u.getIdToken();
        await fetch('/api/admin/bind-owner', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        /* non-fatal */
      }
    })();
  }, [adminUser, onBack]);

  const loadUsers = useCallback(async () => {
    const current = auth.currentUser;
    if (!isPortalAdminUser(adminUser || { uid: current?.uid, email: current?.email })) {
      setError('Forbidden');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const q = query(collection(db, 'users'), orderBy('lastSync', 'desc'), limit(100));
      let snap;
      try {
        snap = await getDocs(q);
      } catch {
        snap = await getDocs(query(collection(db, 'users'), limit(100)));
      }
      const rows: AdminUserRow[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          uid: d.id,
          name: (data.name as string) || '',
          username: (data.username as string) || '',
          email: (data.email as string) || '',
          photo: (data.photo as string) || (data.photoURL as string) || '/logo.png',
          balance: typeof data.balance === 'number' ? data.balance : 0,
          accountStatus: (data.accountStatus as string) || ACCOUNT_STATUS.ACTIVE,
          isBanned: Boolean(data.isBanned),
          banReason: (data.banReason as string) || '',
          status: (data.status as string) || 'offline',
          lastSeenMs: Number(data.lastSeenMs || 0) || undefined,
        };
      });
      setUsers(rows);
    } catch (e) {
      console.error('AdminUsersPanel loadUsers', e);
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [adminUser]);

  useEffect(() => {
    if (!allowed) return;
    loadUsers();
    const t = window.setInterval(() => {
      void loadUsers();
    }, 45000);
    return () => window.clearInterval(t);
  }, [allowed, loadUsers]);

  // Real-time RTDB presence — who is actually in the portal right now
  useEffect(() => {
    if (!allowed) return;
    const app = getApps()[0];
    if (!app) return;
    const rtdb = getDatabase(app);
    const presenceRef = ref(rtdb, 'presence');
    const handler = (snap: { forEach: (cb: (c: { key: string | null; val: () => PresenceSnapshot }) => void) => void }) => {
      const next: Record<string, boolean> = {};
      snap.forEach((child) => {
        if (!child.key) return;
        next[child.key] = isRtdbPresenceOnline(child.val());
      });
      setPresenceByUid(next);
    };
    onValue(presenceRef, handler, (err) => {
      console.warn('Admin presence listen failed — publish database.rules.json presence', err);
    });
    return () => {
      off(presenceRef);
    };
  }, [allowed]);

  const markBannedInUi = (uid: string, banReason: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === uid
          ? {
              ...u,
              accountStatus: ACCOUNT_STATUS.BANNED,
              isBanned: true,
              banReason,
            }
          : u
      )
    );
  };

  const banViaClientFallback = async (targetUid: string, reason: string) => {
    const current = auth.currentUser;
    if (!current || !isPortalAdminUser(current)) {
      throw new Error('Forbidden');
    }
    const fields = buildBanUpdate(current.uid, reason);
    await updateDoc(doc(db, 'users', targetUid), {
      ...fields,
      bannedAt: serverTimestamp(),
    });
  };

  const handleBanUser = async (target: AdminUserRow) => {
    if (!allowed) return;
    if (isUserBanned(target)) return;
    if (
      !window.confirm(
        `Are you sure you want to ban this user?\n\n@${target.username || target.name || target.uid}`
      )
    ) {
      return;
    }

    setBanningUid(target.uid);
    const reason = 'Banned by admin (one-click)';
    try {
      const current = auth.currentUser;
      if (!current || !isPortalAdminUser(current)) {
        onAlert?.('Admin session expired. Please sign in again.', '⚠️');
        onBack();
        return;
      }
      const token = await current.getIdToken();
      const res = await fetch(`/api/admin/ban-user/${encodeURIComponent(target.uid)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        markBannedInUi(target.uid, data?.user?.banReason || reason);
        onAlert?.(
          '🚫 User banned. Their active session will be terminated immediately.',
          '🚫'
        );
        return;
      }

      console.warn('ban API failed, using client fallback:', data?.error || res.status);
      await banViaClientFallback(target.uid, reason);
      markBannedInUi(target.uid, reason);
      onAlert?.(
        '🚫 User banned. Their active session will be terminated immediately.',
        '🚫'
      );
    } catch (e) {
      console.error('handleBanUser', e);
      onAlert?.('Ban request failed. Check your connection / Firestore rules.', '⚠️');
    } finally {
      setBanningUid(null);
    }
  };

  const handleBackfillReferrals = useCallback(async () => {
    const current = auth.currentUser;
    if (!current || !isPortalAdminUser(adminUser || { uid: current.uid, email: current.email })) {
      return;
    }
    setBackfillBusy(true);
    try {
      // Prefer API when available; always also run client ensure (CEO rules)
      try {
        const token = await current.getIdToken();
        await fetch('/api/admin/backfill-referrals', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        /* optional */
      }

      let snap;
      try {
        snap = await getDocs(query(collection(db, 'users'), orderBy('lastSync', 'desc'), limit(500)));
      } catch {
        snap = await getDocs(query(collection(db, 'users'), limit(500)));
      }
      let assigned = 0;
      let skipped = 0;
      let failed = 0;
      for (const d of snap.docs) {
        const existing = String((d.data() as { referralId?: string }).referralId || '').trim();
        if (existing) {
          skipped += 1;
          continue;
        }
        try {
          await ensureUserReferralId(d.id);
          assigned += 1;
        } catch {
          failed += 1;
        }
      }
      onAlert?.(
        `Referral IDs: +${assigned} assigned · ${skipped} already had · ${failed} failed`,
        '👥'
      );
      void loadUsers();
    } catch (e) {
      console.error('backfill referrals', e);
      onAlert?.('Backfill failed — publish firestore.rules first', '⚠️');
    } finally {
      setBackfillBusy(false);
    }
  }, [adminUser, onAlert, loadUsers]);

  const handleUnlockClaims = useCallback(async () => {
    const current = auth.currentUser;
    if (!current || !isPortalAdminUser(adminUser || { uid: current.uid, email: current.email })) {
      return;
    }
    setUnlockBusy(true);
    try {
      const token = await current.getIdToken();
      const res = await fetch('/api/admin/unlock-claims', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: current.email || 'ajcreatorstudio.hq@gmail.com',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        balance?: number;
      };
      if (res.ok && data.ok) {
        onAlert?.(data.message || 'Claims unlocked — try Watch Ads / Faucet again', '✅');
      } else {
        onAlert?.(data.message || data.error || 'Unlock failed', '⚠️');
      }
    } catch (e) {
      console.error('unlock claims', e);
      onAlert?.('Unlock failed — check Admin SDK on Vercel', '⚠️');
    } finally {
      setUnlockBusy(false);
    }
  }, [adminUser, onAlert]);

  const handleResetEconomy = useCallback(async () => {
    const current = auth.currentUser;
    if (!current || !isPortalAdminUser(adminUser || { uid: current.uid, email: current.email })) {
      return;
    }
    const ok = window.confirm(
      'RESET ALL TO ZERO?\n\n• Every user balance → 0\n• Admin earnings → 0\n• AdminRevenue / ledgers / ad estimates deleted\n\nThis cannot be undone.'
    );
    if (!ok) return;
    const typed = window.prompt('Type RESET_ALL_TO_ZERO to confirm:');
    if (typed !== 'RESET_ALL_TO_ZERO') {
      onAlert?.('Reset cancelled', 'ℹ️');
      return;
    }

    setResetBusy(true);
    try {
      // Try server Admin SDK first (best)
      try {
        const token = await current.getIdToken();
        const res = await fetch('/api/admin/reset-economy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ confirm: 'RESET_ALL_TO_ZERO' }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          error?: string;
          usersZeroed?: number;
          adminRevenueDeleted?: number;
        };
        if (res.ok && data.ok) {
          onAlert?.(
            data.message ||
              `Reset done · users ${data.usersZeroed ?? 0} · AdminRevenue -${data.adminRevenueDeleted ?? 0}`,
            '✅'
          );
          setHisaabKey((k) => k + 1);
          void loadUsers();
          return;
        }
        // Fall through to client if SA missing
        if (data.error !== 'admin_sdk_missing') {
          console.warn('reset-economy API', data.error || res.status);
        }
      } catch (e) {
        console.warn('reset-economy API failed, trying client', e);
      }

      // Client fallback (needs published firestore.rules for CEO)
      const result = await resetEconomyFreshStart(db);
      onAlert?.(
        `Reset done · users ${result.usersZeroed}/${result.usersScanned} · AdminRevenue -${result.adminRevenueDeleted} · ads -${result.adEventsDeleted}`,
        '✅'
      );
      setHisaabKey((k) => k + 1);
      void loadUsers();
    } catch (e) {
      console.error('reset economy', e);
      onAlert?.(
        'Reset failed. Publish firestore.rules and/or set FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.',
        '⚠️'
      );
    } finally {
      setResetBusy(false);
    }
  }, [adminUser, onAlert, loadUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = users.filter((u) => {
      if (!q) return true;
      return (
        u.uid.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q)
      );
    });
    // Online users first
    return [...rows].sort((a, b) => {
      const aOn = isUserOnlineNow({
        rtdbOnline: presenceByUid[a.uid],
        status: a.status,
        lastSeenMs: a.lastSeenMs,
      })
        ? 1
        : 0;
      const bOn = isUserOnlineNow({
        rtdbOnline: presenceByUid[b.uid],
        status: b.status,
        lastSeenMs: b.lastSeenMs,
      })
        ? 1
        : 0;
      return bOn - aOn;
    });
  }, [users, search, presenceByUid]);

  const onlineCount = filtered.filter((u) =>
    isUserOnlineNow({
      rtdbOnline: presenceByUid[u.uid],
      status: u.status,
      lastSeenMs: u.lastSeenMs,
    })
  ).length;

  if (!allowed) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#050505]">
      <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all"
          type="button"
        >
          <ArrowLeft size={14} className="text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-red-400" />
          <h1 className="text-sm font-black text-white uppercase tracking-widest">Admin · Users</h1>
        </div>
        <a
          href="/aj-admin"
          className="ml-auto text-[9px] font-black text-cyan-400 uppercase tracking-widest px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
        >
          Full Dashboard →
        </a>
        <button
          onClick={() => {
            void loadUsers();
            setHisaabKey((k) => k + 1);
          }}
          disabled={loading}
          className="p-2 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all"
          type="button"
          title="Refresh"
        >
          <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-4 pt-4 pb-2 space-y-3">
        <AdminEconomyHisaab adminUser={adminUser} refreshKey={hisaabKey} />

        <button
          type="button"
          onClick={() => void handleBackfillReferrals()}
          disabled={backfillBusy || resetBusy || unlockBusy}
          className="w-full py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}
        >
          {backfillBusy ? 'Assigning referral IDs…' : 'Assign Unique Referral IDs (all users)'}
        </button>

        <button
          type="button"
          onClick={() => void handleUnlockClaims()}
          disabled={unlockBusy || resetBusy || backfillBusy}
          className="w-full py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50 border border-amber-500/40"
          style={{ background: 'linear-gradient(135deg,#b45309,#92400e)' }}
        >
          {unlockBusy
            ? 'Unlocking claim counters…'
            : 'Unlock my faucet / Watch Ads claims'}
        </button>

        <button
          type="button"
          onClick={() => void handleResetEconomy()}
          disabled={resetBusy || backfillBusy || unlockBusy}
          className="w-full py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50 border border-red-500/40"
          style={{ background: 'linear-gradient(135deg,#991b1b,#7f1d1d)' }}
        >
          {resetBusy
            ? 'Resetting all balances to 0…'
            : '⚠ Reset ALL coins + admin earnings → 0'}
        </button>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5">
          <Search size={14} className="text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, username, or UID…"
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-gray-600"
          />
        </div>
        <p className="text-[10px] text-gray-500 mt-2 font-black uppercase tracking-widest flex items-center gap-3">
          <span>
            {filtered.length} user{filtered.length === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {onlineCount} online
          </span>
          <span className="inline-flex items-center gap-1.5 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {Math.max(0, filtered.length - onlineCount)} offline
          </span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {error && <p className="text-red-400 text-xs text-center py-6">{error}</p>}
        {loading && users.length === 0 && (
          <p className="text-gray-500 text-xs text-center py-10">Loading users…</p>
        )}
        {!loading && filtered.length === 0 && !error && (
          <p className="text-gray-500 text-xs text-center py-10">No users found.</p>
        )}

        <div className="space-y-2">
          {filtered.map((u) => {
            const banned = isUserBanned(u);
            const online = isUserOnlineNow({
              rtdbOnline: presenceByUid[u.uid],
              status: u.status,
              lastSeenMs: u.lastSeenMs,
            });
            return (
              <div
                key={u.uid}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={u.photo || '/logo.png'}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-white/20"
                  />
                  <span
                    title={online ? 'Online in portal' : 'Offline'}
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0a] ${
                      online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-500'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        online ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
                      }`}
                      title={online ? 'Online' : 'Offline'}
                    />
                    <p className="text-white text-xs font-black truncate">
                      @{u.username || u.name || 'user'}
                    </p>
                    <span
                      className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        online
                          ? 'bg-emerald-600/25 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-600/20 border-red-500/35 text-red-400'
                      }`}
                    >
                      {online ? 'Online' : 'Offline'}
                    </span>
                    {banned ? (
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-600/30 border border-red-500/40 text-red-400">
                        Banned
                      </span>
                    ) : (
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/15 text-gray-400">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-500 truncate mt-0.5">{u.email || u.uid}</p>
                  <p className="text-[9px] text-yellow-500/80 font-black mt-0.5">
                    {(u.balance ?? 0).toLocaleString()} 🪙
                    <span className="text-emerald-400/80 text-[9px] font-bold ml-1">
                      ({formatUsd(coinsToUsd(u.balance ?? 0))} withdraw)
                    </span>
                  </p>
                </div>
                {banned ? (
                  <span className="flex-shrink-0 text-[9px] font-black text-red-400 uppercase tracking-widest px-3 py-2">
                    Banned
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={banningUid === u.uid}
                    onClick={() => handleBanUser(u)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}
                  >
                    <Ban size={12} />
                    {banningUid === u.uid ? '…' : 'Ban User'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
