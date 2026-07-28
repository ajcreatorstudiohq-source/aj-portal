'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Ban, Check, RefreshCw, Search, Shield, X } from 'lucide-react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { db } from '../firebase';
import { isPortalAdminUser } from '../lib/admin-auth';
import { ACCOUNT_STATUS } from '../lib/user-ban';
import { isRtdbPresenceOnline, isUserOnlineNow, type PresenceSnapshot } from '../lib/presence';

const firebaseConfig = {
  apiKey: 'AIzaSyDp2od-lrfAhEHV5oAIqBW5rWjaRbnAdFM',
  authDomain: 'aj-super-portal.firebaseapp.com',
  databaseURL: 'https://aj-super-portal-default-rtdb.firebaseio.com',
  projectId: 'aj-super-portal',
  appId: '1:288191292906:web:bc31cb072948533f88fe93',
};

function getClientAuth() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}

type UserRow = {
  uid: string;
  name: string;
  username: string;
  email: string;
  balance: number;
  isBanned: boolean;
  accountStatus: string;
  status?: string;
  lastSeenMs?: number;
};

type WithdrawRow = {
  id: string;
  uid: string;
  email: string;
  coins: number;
  method: string;
  status: string;
};

/**
 * Protected /aj-admin dashboard — users, one-click ban, withdrawal manager.
 */
export default function AjAdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<'users' | 'withdrawals'>('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [presenceByUid, setPresenceByUid] = useState<Record<string, boolean>>({});
  const [withdrawals, setWithdrawals] = useState<WithdrawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const a = getClientAuth();
    return onAuthStateChanged(a, (u) => {
      setUser(u);
      if (!u || !isPortalAdminUser({ uid: u.uid, email: u.email })) {
        setAllowed(false);
      } else {
        setAllowed(true);
      }
    });
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let snap;
      try {
        snap = await getDocs(query(collection(db, 'users'), orderBy('lastSync', 'desc'), limit(100)));
      } catch {
        snap = await getDocs(query(collection(db, 'users'), limit(100)));
      }
      setUsers(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            uid: d.id,
            name: String(data.name || ''),
            username: String(data.username || ''),
            email: String(data.email || ''),
            balance: typeof data.balance === 'number' ? data.balance : 0,
            isBanned: Boolean(data.isBanned) || data.accountStatus === ACCOUNT_STATUS.BANNED,
            accountStatus: String(data.accountStatus || ACCOUNT_STATUS.ACTIVE),
            status: String(data.status || 'offline'),
            lastSeenMs: Number(data.lastSeenMs || 0) || undefined,
          };
        })
      );
    } catch {
      setMsg('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const app = getApps()[0] || initializeApp(firebaseConfig);
    const rtdb = getDatabase(app);
    const presenceRef = ref(rtdb, 'presence');
    onValue(
      presenceRef,
      (snap) => {
        const next: Record<string, boolean> = {};
        snap.forEach((child) => {
          if (!child.key) return;
          next[child.key] = isRtdbPresenceOnline(child.val() as PresenceSnapshot);
        });
        setPresenceByUid(next);
      },
      (err) => console.warn('aj-admin presence', err)
    );
    return () => off(presenceRef);
  }, [allowed]);

  const loadWithdrawals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/withdrawals?status=pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.message || data.error || 'Failed to load withdrawals');
        setWithdrawals([]);
        return;
      }
      setWithdrawals(data.withdrawals || []);
    } catch {
      setMsg('Failed to load withdrawals.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!allowed) return;
    if (tab === 'users') void loadUsers();
    else void loadWithdrawals();
  }, [allowed, tab, loadUsers, loadWithdrawals]);

  const banUser = async (uid: string) => {
    if (!user || busyId) return;
    setBusyId(uid);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/ban-user/${uid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Banned by admin from /aj-admin' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || 'Ban failed');
        return;
      }
      setMsg(`User ${uid.slice(0, 8)}… banned.`);
      await loadUsers();
    } catch {
      setMsg('Ban failed.');
    } finally {
      setBusyId(null);
    }
  };

  const reviewWithdraw = async (id: string, action: 'approve' | 'reject') => {
    if (!user || busyId) return;
    setBusyId(id);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || 'Update failed');
        return;
      }
      setMsg(data.message || `Withdrawal ${action}d.`);
      await loadWithdrawals();
    } catch {
      setMsg('Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = users.filter(
      (u) =>
        !q ||
        u.uid.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q)
    );
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

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
        <p className="text-sm text-gray-400">Sign in with the admin Google account to continue.</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-3 px-6">
        <Shield className="text-red-400" size={28} />
        <p className="text-sm font-black">Access denied</p>
        <a href="/" className="text-xs text-cyan-400 underline">
          Back to portal
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <a href="/" className="p-1.5 rounded-xl bg-white/5 border border-white/10">
          <ArrowLeft size={14} className="text-gray-400" />
        </a>
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-red-400" />
          <h1 className="text-sm font-black uppercase tracking-widest">AJ Admin</h1>
        </div>
        <button
          type="button"
          onClick={() => (tab === 'users' ? void loadUsers() : void loadWithdrawals())}
          className="ml-auto p-2 rounded-xl bg-white/5 border border-white/10"
        >
          <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="px-4 pt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase ${tab === 'users' ? 'bg-pink-500 text-black' : 'bg-white/5 text-gray-400 border border-white/10'}`}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setTab('withdrawals')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase ${tab === 'withdrawals' ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400 border border-white/10'}`}
        >
          Withdrawals
        </button>
      </div>

      {msg ? (
        <p className="mx-4 mt-3 text-[11px] text-cyan-300 bg-cyan-950/30 border border-cyan-500/20 rounded-xl px-3 py-2">
          {msg}
        </p>
      ) : null}

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {tab === 'users' ? (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search uid / email / username"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/40"
              />
            </div>
            {filtered.map((u) => {
              const online = isUserOnlineNow({
                rtdbOnline: presenceByUid[u.uid],
                status: u.status,
                lastSeenMs: u.lastSeenMs,
              });
              return (
                <div
                  key={u.uid}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      online ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
                    }`}
                    title={online ? 'Online in portal' : 'Offline'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black truncate flex items-center gap-2">
                      {u.username || u.name || 'User'}
                      <span
                        className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${
                          online
                            ? 'text-emerald-300 border-emerald-500/40 bg-emerald-600/20'
                            : 'text-red-400 border-red-500/35 bg-red-600/15'
                        }`}
                      >
                        {online ? 'Online' : 'Offline'}
                      </span>
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">{u.email || u.uid}</p>
                    <p className="text-[11px] text-amber-300 font-bold mt-1">
                      {u.balance.toLocaleString()} AJ Coins 🪙
                    </p>
                  </div>
                  {u.isBanned ? (
                    <span className="text-[9px] font-black text-red-400 uppercase">Banned</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === u.uid}
                      onClick={() => void banUser(u.uid)}
                      className="px-3 py-2 rounded-xl bg-red-600/90 text-white text-[10px] font-black flex items-center gap-1 disabled:opacity-50"
                    >
                      <Ban size={12} /> Ban
                    </button>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <>
            {withdrawals.length === 0 && !loading ? (
              <p className="text-center text-xs text-gray-500 py-10">No pending withdrawals.</p>
            ) : null}
            {withdrawals.map((w) => (
              <div
                key={w.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{w.email || w.uid}</p>
                    <p className="text-[10px] text-gray-500">{w.method}</p>
                  </div>
                  <p className="text-sm font-black text-amber-300 shrink-0">
                    {w.coins.toLocaleString()} 🪙
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!!busyId}
                    onClick={() => void reviewWithdraw(w.id, 'approve')}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 text-black text-[10px] font-black flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={!!busyId}
                    onClick={() => void reviewWithdraw(w.id, 'reject')}
                    className="flex-1 py-2 rounded-xl bg-white/10 text-red-300 text-[10px] font-black flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
