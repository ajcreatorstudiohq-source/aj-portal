'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Ban, RefreshCw, Search, Shield, X } from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
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
  createdAtMs?: number;
  referralId?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  /** True when row came from RTDB presence before Firestore doc loaded */
  presenceOnly?: boolean;
};

function mapUserDoc(id: string, data: Record<string, unknown>): AdminUserRow {
  return {
    uid: id,
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
    createdAtMs: Number(data.createdAtMs || 0) || undefined,
    referralId: (data.referralId as string) || '',
    followersCount: Number(data.followersCount || data.followers || 0) || 0,
    followingCount: Number(data.followingCount || data.following || 0) || 0,
    postsCount: Number(data.postsCount || 0) || 0,
    presenceOnly: false,
  };
}

function isNewSignup(u: AdminUserRow): boolean {
  const created = Number(u.createdAtMs || 0);
  if (!created) return false;
  return Date.now() - created < 24 * 60 * 60 * 1000;
}

type UserEconomyStat = {
  uid: string;
  lifetimeEarnedCoins: number;
  lifetimeEarnedUsd: number;
  lifetimeEarnedUsdLabel?: string;
  withdrawRequestedCoins: number;
  withdrawPaidCoins: number;
  withdrawPendingCoins: number;
  withdrawRequestedUsdLabel?: string;
  adminProfitUsd: number;
  adminProfitCoins: number;
  adminProfitUsdLabel?: string;
  adminEvents: number;
};

type Props = {
  /** Current signed-in user — must pass admin gate */
  adminUser?: { uid?: string | null; email?: string | null } | null;
  onBack: () => void;
  onAlert?: (msg: string, icon?: string) => void;
};

export default function AdminUsersPanel({ adminUser, onBack, onAlert }: Props) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [presenceExtras, setPresenceExtras] = useState<AdminUserRow[]>([]);
  const [economyByUid, setEconomyByUid] = useState<Record<string, UserEconomyStat>>({});
  const [presenceByUid, setPresenceByUid] = useState<Record<string, boolean>>({});
  const [presenceMetaByUid, setPresenceMetaByUid] = useState<
    Record<string, { username?: string; email?: string; photo?: string; lastChanged?: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [economyLoading, setEconomyLoading] = useState(false);
  const [banningUid, setBanningUid] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [hisaabKey, setHisaabKey] = useState(0);
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);
  /** Forces online-count recompute so LIVE badge stays fresh */
  const [liveTick, setLiveTick] = useState(0);

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

  const loadUserEconomy = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    setEconomyLoading(true);
    try {
      const token = await current.getIdToken();
      const res = await fetch('/api/admin/user-economy', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        users?: Record<string, UserEconomyStat>;
        error?: string;
      };
      if (res.ok && data.ok && data.users) {
        setEconomyByUid(data.users);
      } else if (data.error && data.error !== 'admin_sdk_missing') {
        console.warn('user-economy', data.error);
      }
    } catch (e) {
      console.warn('user-economy fetch', e);
    } finally {
      setEconomyLoading(false);
    }
  }, []);

  const refreshUsers = useCallback(() => {
    void loadUserEconomy();
    setHisaabKey((k) => k + 1);
  }, [loadUserEconomy]);

  const mergeAdminApiUsers = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    try {
      const token = await current.getIdToken();
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        users?: AdminUserRow[];
        error?: string;
      };
      if (!res.ok || !data.ok || !Array.isArray(data.users)) return;
      setUsers((prev) => {
        const byUid = new Map<string, AdminUserRow>();
        for (const u of prev) byUid.set(u.uid, u);
        for (const u of data.users!) {
          const existing = byUid.get(u.uid);
          byUid.set(u.uid, {
            ...existing,
            ...u,
            photo: u.photo || existing?.photo || '/logo.png',
            presenceOnly: false,
          });
        }
        return Array.from(byUid.values());
      });
      void loadUserEconomy();
    } catch (e) {
      console.warn('admin users api', e);
    }
  }, [loadUserEconomy]);

  // Refresh hisaab totals when user count changes (new signup)
  useEffect(() => {
    if (!allowed || loading) return;
    setHisaabKey((k) => k + 1);
  }, [allowed, loading, users.length]);

  useEffect(() => {
    if (!allowed) return;
    const current = auth.currentUser;
    if (!isPortalAdminUser(adminUser || { uid: current?.uid, email: current?.email })) {
      setError('Forbidden');
      setLoading(false);
      return;
    }
    setError('');
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const rows = snap.docs.map((d) =>
          mapUserDoc(d.id, d.data() as Record<string, unknown>)
        );
        setUsers(rows);
        setLoading(false);
        void loadUserEconomy();
        // Re-merge Auth directory so brand-new Google signups aren't dropped
        void mergeAdminApiUsers();
      },
      (e) => {
        console.error('AdminUsersPanel users snapshot', e);
        setError('Failed to load users.');
        setLoading(false);
      }
    );
    // Authoritative Auth+Firestore merge (picks up orphans / new Google signups)
    void mergeAdminApiUsers();
    const poll = window.setInterval(() => {
      void mergeAdminApiUsers();
    }, 5000);
    const tick = window.setInterval(() => {
      setLiveTick((n) => n + 1);
    }, 4000);
    return () => {
      unsub();
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [allowed, adminUser, loadUserEconomy, mergeAdminApiUsers]);

  // Real-time RTDB presence (+ pull in online users missing from Firestore list)
  useEffect(() => {
    if (!allowed) return;
    const app = getApps()[0];
    if (!app) return;
    const rtdb = getDatabase(app);
    const presenceRef = ref(rtdb, 'presence');
    const handler = (snap: {
      forEach: (cb: (c: { key: string | null; val: () => PresenceSnapshot }) => void) => void;
    }) => {
      const nextOnline: Record<string, boolean> = {};
      const nextMeta: Record<
        string,
        { username?: string; email?: string; photo?: string; lastChanged?: number }
      > = {};
      snap.forEach((child) => {
        const uid = child.key;
        if (!uid) return;
        const val = child.val();
        const on = isRtdbPresenceOnline(val);
        nextOnline[uid] = on;
        nextMeta[uid] = {
          username: val?.username || undefined,
          email: val?.email || undefined,
          photo: val?.photo || undefined,
          lastChanged: Number(val?.lastChanged || 0) || undefined,
        };
      });
      setPresenceByUid(nextOnline);
      setPresenceMetaByUid(nextMeta);
      setLiveTick((n) => n + 1);
    };
    onValue(presenceRef, handler);
    return () => off(presenceRef);
  }, [allowed]);

  // New RTDB-online UIDs missing from Admin list → refresh directory immediately
  useEffect(() => {
    if (!allowed) return;
    const known = new Set(users.map((u) => u.uid));
    const missing = Object.entries(presenceByUid).some(([uid, on]) => on && !known.has(uid));
    if (!missing) return;
    const t = window.setTimeout(() => {
      void mergeAdminApiUsers();
    }, 300);
    return () => window.clearTimeout(t);
  }, [allowed, users, presenceByUid, mergeAdminApiUsers]);

  // If someone is online in RTDB but not yet in users list, fetch / stub them so count + list update live
  useEffect(() => {
    if (!allowed) return;
    const known = new Set(users.map((u) => u.uid));
    const missingOnline = Object.entries(presenceByUid)
      .filter(([uid, on]) => on && !known.has(uid))
      .map(([uid]) => uid);
    if (missingOnline.length === 0) {
      setPresenceExtras((prev) => (prev.length ? [] : prev));
      return;
    }
    let cancelled = false;
    void (async () => {
      const extras: AdminUserRow[] = [];
      for (const uid of missingOnline) {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            extras.push(mapUserDoc(uid, snap.data() as Record<string, unknown>));
            continue;
          }
        } catch {
          /* fall through to presence stub */
        }
        const meta = presenceMetaByUid[uid];
        extras.push({
          uid,
          name: meta?.username || 'New user',
          username: meta?.username || '',
          email: meta?.email || '',
          photo: meta?.photo || '/logo.png',
          balance: 0,
          accountStatus: ACCOUNT_STATUS.ACTIVE,
          isBanned: false,
          status: 'online',
          lastSeenMs: meta?.lastChanged || Date.now(),
          createdAtMs: meta?.lastChanged || Date.now(),
          presenceOnly: true,
        });
      }
      if (!cancelled) setPresenceExtras(extras);
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, users, presenceByUid, presenceMetaByUid]);

  const handleBanUser = useCallback(
    async (target: AdminUserRow) => {
      const current = auth.currentUser;
      if (!current || !isPortalAdminUser(adminUser || { uid: current.uid, email: current.email })) {
        return;
      }
      const ok = window.confirm(
        `Ban @${target.username || target.name || target.uid}?\nThey will be signed out immediately.`
      );
      if (!ok) return;
      setBanningUid(target.uid);
      try {
        const token = await current.getIdToken();
        const res = await fetch(`/api/admin/ban-user/${encodeURIComponent(target.uid)}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: 'Banned by admin' }),
        });
        if (res.ok) {
          onAlert?.(`Banned @${target.username || target.name || 'user'}`, '🚫');
          setUsers((prev) =>
            prev.map((u) =>
              u.uid === target.uid
                ? { ...u, isBanned: true, accountStatus: ACCOUNT_STATUS.BANNED }
                : u
            )
          );
          return;
        }
        // Client fallback
        await updateDoc(doc(db, 'users', target.uid), {
          ...buildBanUpdate('Banned by admin'),
          bannedAt: serverTimestamp(),
        });
        onAlert?.(`Banned @${target.username || target.name || 'user'}`, '🚫');
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === target.uid
              ? { ...u, isBanned: true, accountStatus: ACCOUNT_STATUS.BANNED }
              : u
          )
        );
      } catch (e) {
        console.error('ban user', e);
        onAlert?.('Ban failed', '⚠️');
      } finally {
        setBanningUid(null);
      }
    },
    [adminUser, onAlert]
  );

  const handleBackfillReferrals = useCallback(async () => {
    const current = auth.currentUser;
    if (!current || !isPortalAdminUser(adminUser || { uid: current.uid, email: current.email })) {
      return;
    }
    setBackfillBusy(true);
    try {
      const token = await current.getIdToken();
      try {
        const res = await fetch('/api/admin/backfill-referrals', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
        };
        if (res.ok && data.ok) {
          onAlert?.(data.message || 'Referral IDs assigned', '👥');
          refreshUsers();
          return;
        }
      } catch {
        /* client fallback */
      }
      let assigned = 0;
      let skipped = 0;
      let failed = 0;
      const snap = await getDocs(query(collection(db, 'users'), limit(500)));
      for (const d of snap.docs) {
        const data = d.data() as { referralId?: string };
        if (data.referralId) {
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
      refreshUsers();
    } catch (e) {
      console.error('backfill referrals', e);
      onAlert?.('Backfill failed — publish firestore.rules first', '⚠️');
    } finally {
      setBackfillBusy(false);
    }
  }, [adminUser, onAlert, refreshUsers]);

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
          refreshUsers();
          return;
        }
        if (data.error !== 'admin_sdk_missing') {
          console.warn('reset-economy API', data.error || res.status);
        }
      } catch (e) {
        console.warn('reset-economy API failed, trying client', e);
      }

      const result = await resetEconomyFreshStart(db);
      onAlert?.(
        `Reset done · users ${result.usersZeroed}/${result.usersScanned} · AdminRevenue -${result.adminRevenueDeleted} · ads -${result.adEventsDeleted}`,
        '✅'
      );
      refreshUsers();
    } catch (e) {
      console.error('reset economy', e);
      onAlert?.(
        'Reset failed. Publish firestore.rules and/or set FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.',
        '⚠️'
      );
    } finally {
      setResetBusy(false);
    }
  }, [adminUser, onAlert, refreshUsers]);

  const allUsers = useMemo(() => {
    const byUid = new Map<string, AdminUserRow>();
    for (const u of users) byUid.set(u.uid, u);
    for (const u of presenceExtras) {
      if (!byUid.has(u.uid)) byUid.set(u.uid, u);
    }
    return Array.from(byUid.values());
  }, [users, presenceExtras]);

  const searchQuery = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    const q = searchQuery;
    const rows = allUsers.filter((u) => {
      if (!q) return true;
      const name = (u.name || '').toLowerCase();
      const username = (u.username || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const uid = u.uid.toLowerCase();
      return (
        name.includes(q) ||
        username.includes(q) ||
        email.includes(q) ||
        uid.includes(q) ||
        `@${username}`.includes(q)
      );
    });
    return [...rows].sort((a, b) => {
      const aNew = isNewSignup(a) ? 1 : 0;
      const bNew = isNewSignup(b) ? 1 : 0;
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
      if (bOn !== aOn) return bOn - aOn;
      if (bNew !== aNew) return bNew - aNew;
      const ac = Number(a.createdAtMs || a.lastSeenMs || 0);
      const bc = Number(b.createdAtMs || b.lastSeenMs || 0);
      return bc - ac;
    });
  }, [allUsers, searchQuery, presenceByUid]);

  // Real-time online = RTDB presence (source of truth) ∪ fresh Firestore lastSeen
  const onlineCount = useMemo(() => {
    void liveTick;
    const onlineUids = new Set<string>();
    for (const [uid, on] of Object.entries(presenceByUid)) {
      if (on) onlineUids.add(uid);
    }
    for (const u of allUsers) {
      if (
        isUserOnlineNow({
          rtdbOnline: presenceByUid[u.uid],
          status: u.status,
          lastSeenMs: u.lastSeenMs,
        })
      ) {
        onlineUids.add(u.uid);
      }
    }
    return onlineUids.size;
  }, [presenceByUid, allUsers, liveTick]);

  const totalUsers = allUsers.length;
  const offlineCount = Math.max(0, totalUsers - onlineCount);

  if (!allowed) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#050505]">
      <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-pink-500/20 px-4 py-3 space-y-3 shadow-[0_0_24px_rgba(236,72,153,0.12)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all"
            type="button"
          >
            <ArrowLeft size={14} className="text-gray-400" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Shield size={16} className="text-red-400 shrink-0" />
            <h1 className="text-sm font-black text-white uppercase tracking-widest truncate">
              Admin · Users
            </h1>
          </div>
          <a
            href="/aj-admin"
            className="ml-auto text-[9px] font-black text-cyan-400 uppercase tracking-widest px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0"
          >
            Full Dashboard →
          </a>
          <button
            onClick={() => {
              refreshUsers();
              void mergeAdminApiUsers();
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all shrink-0"
            type="button"
            title="Refresh users + economy"
          >
            <RefreshCw size={14} className={`text-gray-400 ${loading || economyLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Real-time search — sticky top */}
        <div
          className="flex items-center gap-2 rounded-2xl px-3 py-2.5 border border-cyan-400/35 bg-[#0a0a12]/90"
          style={{ boxShadow: '0 0 18px rgba(34,211,238,0.18), inset 0 0 12px rgba(34,211,238,0.05)' }}
        >
          <Search size={16} className="text-cyan-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search instantly by name, username, or email…"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-white text-sm font-medium focus:outline-none placeholder:text-gray-500 tracking-wide"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="p-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 active:scale-90"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-3 flex-wrap">
          <span className="text-white/80">{totalUsers} users</span>
          <span className="text-cyan-400/90">
            {searchQuery
              ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'} · “${search.trim()}”`
              : 'live list'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {offlineCount} offline
          </span>
        </p>

        {/* LIVE online counter — updates from RTDB presence in real time */}
        <div
          className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border border-emerald-400/40 bg-gradient-to-r from-emerald-950/50 to-[#0a0a12]/90"
          style={{ boxShadow: '0 0 22px rgba(52,211,153,0.2)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Live · Online now
              </p>
              <p className="text-[10px] text-emerald-200/70 font-bold truncate">
                Real-time presence · auto-refresh
              </p>
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-300 tabular-nums shrink-0">
            {onlineCount}
          </p>
        </div>
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
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {error && <p className="text-red-400 text-xs text-center py-6">{error}</p>}
        {loading && users.length === 0 && (
          <p className="text-gray-500 text-xs text-center py-10">Loading users…</p>
        )}
        {!loading && filtered.length === 0 && !error && (
          <p className="text-gray-500 text-xs text-center py-10">
            {searchQuery ? 'No users match this search.' : 'No users found.'}
          </p>
        )}

        <div className="space-y-3">
          {filtered.map((u) => {
            const banned = isUserBanned(u);
            const online = isUserOnlineNow({
              rtdbOnline: presenceByUid[u.uid],
              status: u.status,
              lastSeenMs: u.lastSeenMs,
            });
            const eco = economyByUid[u.uid];
            const earned = eco?.lifetimeEarnedCoins ?? 0;
            const withdrawReq = eco?.withdrawRequestedCoins ?? 0;
            const adminUsd = eco?.adminProfitUsd ?? 0;
            const adminCoins = eco?.adminProfitCoins ?? 0;
            const isNew = isNewSignup(u);

            return (
              <div
                key={u.uid}
                className={`rounded-2xl p-3 border bg-gradient-to-br from-[#12081a]/90 to-[#0a0a14]/95 ${
                  isNew ? 'border-cyan-400/50' : 'border-pink-500/25'
                }`}
                style={{
                  boxShadow: isNew
                    ? '0 0 22px rgba(34,211,238,0.22)'
                    : '0 0 20px rgba(236,72,153,0.08)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <img
                      src={u.photo || '/logo.png'}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                    />
                    <span
                      title={online ? 'Online in portal' : 'Offline'}
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0a] ${
                        online
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-black truncate">
                        @{u.username || u.name || 'user'}
                      </p>
                      {u.name && u.username ? (
                        <span className="text-[10px] text-gray-300 truncate">{u.name}</span>
                      ) : null}
                      {isNew ? (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/25 border border-cyan-400/45 text-cyan-200">
                          New
                        </span>
                      ) : null}
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
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{u.email || u.uid}</p>
                    <p className="text-[10px] text-yellow-300 font-black mt-1">
                      Balance {(u.balance ?? 0).toLocaleString()} 🪙
                      <span className="text-emerald-400/90 text-[10px] font-bold ml-1">
                        ({formatUsd(coinsToUsd(u.balance ?? 0))})
                      </span>
                    </p>
                    <p className="text-[9px] text-gray-500 font-bold mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                      {u.referralId ? <span className="text-fuchsia-300/90">ID {u.referralId}</span> : null}
                      <span>
                        {(u.followersCount ?? 0).toLocaleString()} followers ·{' '}
                        {(u.followingCount ?? 0).toLocaleString()} following ·{' '}
                        {(u.postsCount ?? 0).toLocaleString()} posts
                      </span>
                      {u.createdAtMs ? (
                        <span>
                          Joined {new Date(u.createdAtMs).toLocaleString()}
                        </span>
                      ) : null}
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
                      {banningUid === u.uid ? '…' : 'Ban'}
                    </button>
                  )}
                </div>

                {/* Lifetime / withdraw / admin hub profit */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 px-2 py-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-amber-300/90">
                      Lifetime earn
                    </p>
                    <p className="text-[11px] font-black text-amber-200 mt-0.5 tabular-nums">
                      {earned.toLocaleString()} 🪙
                    </p>
                    <p className="text-[8px] text-amber-400/70 font-bold">
                      {eco?.lifetimeEarnedUsdLabel || formatUsd(coinsToUsd(earned))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/5 px-2 py-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-fuchsia-300/90">
                      Withdraws
                    </p>
                    <p className="text-[11px] font-black text-fuchsia-200 mt-0.5 tabular-nums">
                      {withdrawReq.toLocaleString()} 🪙
                    </p>
                    <p className="text-[8px] text-fuchsia-400/70 font-bold">
                      {eco
                        ? `paid ${(eco.withdrawPaidCoins || 0).toLocaleString()} · pend ${(eco.withdrawPendingCoins || 0).toLocaleString()}`
                        : economyLoading
                          ? '…'
                          : 'none'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-cyan-400/35 bg-cyan-500/5 px-2 py-2 shadow-[0_0_12px_rgba(34,211,238,0.12)]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-cyan-300/90">
                      Hub profit
                    </p>
                    <p className="text-[11px] font-black text-cyan-200 mt-0.5 tabular-nums">
                      {eco?.adminProfitUsdLabel || formatUsd(adminUsd)}
                    </p>
                    <p className="text-[8px] text-cyan-400/70 font-bold">
                      {adminCoins.toLocaleString()} 🪙 share
                      {eco?.adminEvents ? ` · ${eco.adminEvents} evt` : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
