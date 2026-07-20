import React, { useState, useEffect } from 'react';
import { Trophy, Zap, Bot, Mail, Download, Radio, Users, Settings, Bell, MessageSquare, BookOpen, ExternalLink, HelpCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface HubProps {
  user: any;
  username: string;
  tempPhoto: string;
  balance: number;
  setVvipAlert: (alert: { msg: string; icon?: string } | null) => void;
  setScreen: (screen: string) => void;
  setSocialScreen: (sc: string) => void;
  startLive: () => void;
  joinLiveByRoomId: (rid?: string) => void;
  joinRoomInput: string;
  setJoinRoomInput: (v: string) => void;
  botOpen: boolean;
  setBotOpen: (v: boolean) => void;
  botMessages: any[];
  botInput: string;
  setBotInput: (v: string) => void;
  handleBotSend: () => void;
}

export default function Hub({
  user,
  username,
  tempPhoto,
  balance,
  setVvipAlert,
  setScreen,
  setSocialScreen,
  startLive,
  joinLiveByRoomId,
  joinRoomInput,
  setJoinRoomInput,
  botOpen,
  setBotOpen,
  botMessages,
  botInput,
  setBotInput,
  handleBotSend
}: HubProps) {
  const [liveNowList, setLiveNowList] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync / Fetch list of live broadcasts
  useEffect(() => {
    const q = query(collection(db, 'live_rooms'), orderBy('startedAt', 'desc'), limit(15));
    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();
      const rooms = snap.docs
        .map(d => ({ id: d.id, ...d.data() as any }))
        .filter(r => {
          if (!r.lastSeenMs) return false;
          return (now - r.lastSeenMs) < 18000; // room must respond within 18s to be active
        });
      setLiveNowList(rooms);
    });
    return unsub;
  }, []);

  const copyReferralCode = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const displayBalance = balance.toFixed(1);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-4 pt-20 relative">
      {/* AI Bot representative activator */}
      <div className="fixed top-20 right-4 z-[150]">
        <button onClick={() => setBotOpen(!botOpen)}
          className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-green-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all border-2 border-white/20">
          {botOpen ? <span className="font-bold text-xs">✕</span> : <Bot size={20} />}
        </button>
      </div>

      <div className="text-center max-w-xl mx-auto space-y-4 mb-8">
        <h1 className="text-4xl md:text-6xl font-black uppercase bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(236,72,153,0.9)] tracking-tight leading-none">
          Oman's #1 Social Earnings Platform
        </h1>
        <p className="text-[11px] text-gray-400 uppercase tracking-widest font-black leading-relaxed">
          Watch short videos, share moments, play games, and trade to cash out. Complete passive earnings.
        </p>
      </div>

      {/* Main Grid navigation */}
      <div className="grid grid-cols-2 gap-4 md:gap-8 w-full max-w-2xl relative z-30 mb-8">
        {[
          { label: 'Gaming', icon: <Trophy className="text-cyan-400 w-10 h-10 md:w-14 md:h-14 mb-2" />, sc: 'arcade', color: 'hover:border-cyan-400' },
          { label: 'Social', icon: <Zap className="text-pink-500 w-10 h-10 md:w-14 md:h-14 mb-2" />, sc: 'social', color: 'hover:border-pink-500' },
          { label: 'Wallet', icon: <img src="/gold.jpg" className="w-11 h-11 mb-2 rounded-full border border-yellow-500 shadow-md object-cover" onError={(e: any) => { e.target.src = '/logo.png'; }} />, sc: 'wallet', color: 'hover:border-yellow-500' },
          { label: 'AI Trading Bot', icon: <Bot className="text-green-400 w-10 h-10 md:w-14 md:h-14 mb-2" />, sc: 'ai', color: 'hover:border-green-500' },
        ].map(m => (
          <div key={m.label} onClick={() => setScreen(m.sc)}
            className={`backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-3xl h-40 flex flex-col items-center justify-center cursor-pointer shadow-xl transition-all ${m.color} relative z-30`}>
            {m.icon}
            <span className="font-black text-xs uppercase tracking-wider">{m.label}</span>
          </div>
        ))}

        {/* Floating Rotating Logo on top of cards — z-index: 50 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="relative w-20 h-20 bg-[#050505] border-[6px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.8)] overflow-hidden">
            <img src="/logo.png" className="w-full h-full object-cover opacity-80 animate-pulse" alt="AJ Logo" onError={(e: any) => { e.target.src = '/logo.png'; }} />
          </div>
        </div>
      </div>

      {/* LOBBY / LIVE STREAM STREAMING NOW */}
      <div className="w-full max-w-2xl bg-white/[0.02] border border-white/10 p-5 rounded-3xl space-y-4 mb-6 text-left">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Radio size={14} className="text-red-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase text-red-400 tracking-widest">Lobby Broadcasters</span>
          </div>
          <span className="text-[8px] font-black uppercase bg-red-500/10 px-2 py-0.5 rounded-full text-red-500">{liveNowList.length} Active Streams</span>
        </div>

        {/* Live list slider */}
        {liveNowList.length === 0 ? (
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider text-center py-4">No broadcasting rooms active. Start your own!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {liveNowList.map((room) => (
              <div key={room.id} onClick={() => joinLiveByRoomId(room.roomId)}
                className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-2 cursor-pointer hover:border-red-500 transition-all">
                <img src={room.photo || '/logo.png'} className="w-8 h-8 rounded-full border border-red-500 object-cover" />
                <div className="truncate">
                  <p className="text-[10px] font-black text-white uppercase truncate">@{room.username}</p>
                  <p className="text-[8px] text-red-400 font-bold uppercase tracking-widest animate-pulse">🔴 Watch Live</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Join by Room ID box */}
        <div className="pt-3 border-t border-white/5 flex gap-2">
          <input
            type="text"
            value={joinRoomInput}
            onChange={(e) => setJoinRoomInput(e.target.value)}
            placeholder="Enter Room ID to watch live stream..."
            className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-red-500 font-mono"
          />
          <button onClick={() => joinLiveByRoomId()} className="bg-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider">
            Join Room
          </button>
        </div>
      </div>

      {/* Refer & Earn Banner Card */}
      <div className="w-full max-w-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 p-5 rounded-3xl text-left shadow-lg mb-6">
        <span className="text-[8px] font-black uppercase bg-yellow-500/15 border border-yellow-500/30 px-2.5 py-1 rounded-full text-yellow-500">🎁 Invitation System</span>
        <h4 className="font-black text-sm text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text uppercase tracking-widest mt-2">Earn Free Bonus Coins</h4>
        <p className="text-[10px] text-gray-400 mt-1">Copy and share your User ID with friends to earn +50 AJ Coins per refer!</p>
        <div className="flex gap-2 mt-3 items-center">
          <span className="text-[10px] font-mono text-yellow-300 truncate max-w-[200px] bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">{user?.uid}</span>
          <button onClick={copyReferralCode} className="bg-yellow-500 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
            {copiedCode ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Non-overlapping Static Sponsor Banner */}
      <div className="w-full max-w-2xl pointer-events-none select-none">
        <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-950/40 to-amber-950/20 border border-yellow-500/20 rounded-2xl px-5 py-3 shadow-inner">
          <span className="text-yellow-500/70 text-[8px] font-black uppercase tracking-widest border border-yellow-500/30 px-2 py-0.5 rounded-full shrink-0">Sponsored Banner</span>
          <p className="text-gray-400 text-[10px] font-bold leading-snug">🌐 Oman's #1 Social Earnings Platform. Tap Social or AI Bot to multiply your daily yields. Zero risk.</p>
        </div>
      </div>

      {/* AI BOT SIDE PANEL DIRECT OVERLAY */}
      {botOpen && (
        <div className="fixed bottom-24 right-6 z-[900] w-80 md:w-96 h-[460px] bg-slate-900 border-2 border-cyan-500/30 rounded-[2rem] shadow-[0_0_40px_rgba(6,182,212,0.3)] flex flex-col overflow-hidden backdrop-blur-2xl">
          <div className="bg-[#1f2c33]/90 p-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-500 rounded-full flex items-center justify-center font-bold text-black border border-cyan-300">🤖</div>
            <div>
              <p className="font-black text-xs text-white uppercase tracking-widest">Representative Bot</p>
              <p className="text-[8px] text-green-400 font-black uppercase animate-pulse">CEO representative • Online</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {botMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 max-w-[85%] rounded-2xl text-[10px] font-black whitespace-pre-line leading-relaxed ${msg.from === 'user' ? 'bg-cyan-700 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3.5 border-t border-white/5 bg-slate-950/60 flex gap-2">
            <input type="text" value={botInput} onChange={e => setBotInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBotSend()}
              placeholder="Ask about Coins, Withdraw, WeChat..." className="flex-1 bg-white/5 rounded-full px-4 py-2 text-[10px] font-black outline-none border border-white/10 focus:border-cyan-500 text-white" />
            <button onClick={handleBotSend} className="bg-cyan-500 p-2.5 rounded-full text-black">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="rotate-45"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
