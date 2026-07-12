"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, Instagram, Twitter } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main'); 
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading, setLoading] = useState(0);

  // --- 💰 MONEY MATH (1 OMR = 200 Coins = $2.60) ---
  const usdtValue = (balance / 200 * 2.60).toFixed(2);

  // 1. Splash Screen Logic
  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => {
        setLoading(prev => (prev >= 100 ? 100 : prev + 5));
      }, 50);
      setTimeout(() => setScreen('auth'), 2500);
      return () => clearInterval(interval);
    }
  }, [screen]);

  // 2. Real-time Firebase Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setBalance(docSnap.data().balance || 0);
            setBotTier(docSnap.data().botTier || 'none');
            setInvested(docSnap.data().invested || 0);
          } else {
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0 });
          }
        });
        setScreen('hub');
      } else { setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  // Actions
  const handleLogin = async () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  };

  const handlePurchase = () => window.open("https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174", '_blank');

  const activateBot = async (tier: string, cost: number) => {
    if (balance < cost) {
        alert(`⚠️ ATTENTION CEO ALI!\n\nInsufficient Balance to start ${tier.toUpperCase()} BOT.\nRequired: ${cost} Coins\nYour Balance: ${balance} Coins\n\nPlease purchase coins from the Wallet.`);
        return;
    }
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { balance: increment(-cost), botTier: tier, invested: cost });
    alert(`🚀 ${tier.toUpperCase()} BOT STARTED!`);
  };

  // --- UI: SPLASH ---
  if (screen === 'splash') return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
      <div className="relative mb-12 animate-pulse">
        <div className="w-40 h-40 border-4 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_60px_#06b6d4] overflow-hidden">
          <img src="/logo.jpg" className="w-full h-full object-cover scale-110" alt="AJ" />
        </div>
      </div>
      <h1 className="text-4xl md:text-6xl font-black tracking-[0.3em] text-center drop-shadow-[0_0_20px_#fff]">WELCOME TO <br/><span className="text-cyan-400">AJ PORTAL</span></h1>
      <div className="mt-16 w-64 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/5">
        <div className="h-full bg-cyan-500 shadow-[0_0_15px_#22d3ee]" style={{ width: `${loading}%` }}></div>
      </div>
    </main>
  );

  // --- UI: AUTH ---
  if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.02] border border-white/10 p-12 rounded-[3.5rem] shadow-2xl">
        <h2 className="text-7xl font-black mb-10 italic uppercase text-white tracking-tighter">AJ <span className="text-cyan-400">ID</span></h2>
        <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 shadow-xl transition-all">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold text-xs animate-bounce uppercase">+500 AJ COINS BONUS ON SIGNUP</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      
      {/* VVIP HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="text-2xl font-black italic tracking-tighter text-cyan-400 drop-shadow-[0_0_10px_#06b6d4]">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div onClick={() => setScreen('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg cursor-pointer">
            <div className="text-right leading-none pr-2 border-r border-white/10">
               <p className="text-xs font-black text-yellow-500">{balance} 🪙</p>
               <p className="text-[10px] text-green-400 font-bold">${usdtValue} USDT</p>
            </div>
            <img src={user?.photoURL} className="w-8 h-8 rounded-full border-2 border-cyan-500 shadow-[0_0_10px_#06b6d4]" />
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 border border-red-500/50 rounded-full text-red-500"><LogOut size={18} /></button>
        </div>
      </header>

      {/* MAIN HUB */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="relative z-10 text-5xl md:text-9xl font-black text-center mb-16 md:mb-32 uppercase drop-shadow-[0_0_30px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="relative z-20 grid grid-cols-2 gap-4 md:gap-24 w-full max-w-5xl px-2">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-52 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Trophy className="mb-2 text-cyan-400 w-12 h-12 md:w-24 md:h-24" />
            <h2 className="font-black text-xs md:text-4xl uppercase">Gaming</h2>
          </div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-52 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Zap className="mb-2 text-pink-500 w-12 h-12 md:w-24 md:h-24" />
            <h2 className="font-black text-xs md:text-4xl uppercase">Social</h2>
          </div>
          <div onClick={() => setScreen('wallet')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-52 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <img src="/coin.jpg" className="w-16 h-16 md:w-48 md:h-48 object-contain mb-2 drop-shadow-[0_0_15px_#eab308]" alt="C" />
            <h2 className="font-black text-xs md:text-4xl uppercase text-yellow-500">Wallet</h2>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-52 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Bot className="mb-2 text-green-400 w-12 h-12 md:w-24 md:h-24" />
            <h2 className="font-black text-xs md:text-4xl uppercase">AJ AI</h2>
          </div>
          {/* HUB CENTER */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-40">
            <div className="w-20 h-20 md:w-80 md:h-80 bg-black border-2 md:border-8 border-cyan-500/50 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.8)]">
              <span className="text-[6px] md:text-8xl font-black text-white italic">HUB</span>
            </div>
          </div>
        </div>
        <div className="mt-16 md:mt-24 bg-white/5 px-8 py-3 rounded-full flex gap-4 md:gap-16 text-[8px] md:text-2xl font-black text-gray-500 uppercase tracking-widest backdrop-blur-md border border-white/5">
           <span>Play</span> <span className="text-cyan-500">➔</span> <span>Engage</span> <span className="text-cyan-400">➔</span> <span>Earn</span> <span className="text-cyan-500">➔</span> <span>Spend</span>
        </div>
      </section>

      {/* FOUNDER CARD */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" alt="F" className="w-full max-w-5xl h-auto rounded-3xl shadow-2xl border border-white/5" />
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-24 px-10 border-t border-cyan-500/10 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <div className="text-7xl md:text-[10rem] font-black italic tracking-tighter text-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.6)]">AJ STUDIO</div>
          <div className="flex gap-14 mt-4 items-center">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={60}/></a>
               <a href="https://www.instagram.com/innocent.a.jutt?igsh=MXV5dWwwZzUxNjlmNA==" target="_blank" className="text-pink-500 hover:scale-125 transition-all"><Instagram size={60}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white text-7xl font-black italic hover:scale-125 transition-all">X</a>
          </div>
          <p className="mt-12 text-gray-700 font-black tracking-[1em] text-[10px] uppercase flex items-center gap-2"><Globe size={12}/> Muscat, Sultanate of Oman</p>
        </div>
      </footer>

      {/* MODAL: WALLET (Purchase/Withdraw/Transfer) */}
      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-bottom duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold text-sm mb-12 uppercase">← BACK TO HUB</button>
           <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-12 rounded-[4rem] text-center shadow-2xl relative">
              <h2 className="text-6xl font-black text-yellow-500 mb-2">{balance} 🪙</h2>
              <h3 className="text-3xl font-black text-green-400 italic mb-12">${usdtValue} <span className="text-xs opacity-50 uppercase">USDT</span></h3>
              <div className="grid grid-cols-1 gap-4">
                 <button onClick={handlePurchase} className="flex items-center justify-between bg-white text-black p-5 rounded-2xl font-black active:scale-95 transition-all">PURCHASE <CreditCard size={20}/></button>
                 <button onClick={() => alert("Transfer Service: Link your AJ ID to proceed.")} className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-cyan-400">TRANSFER <Send size={20}/></button>
                 <button onClick={() => alert("Withdrawal: Min 2,500 Earned Coins required.")} className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-pink-500">WITHDRAW <ArrowUpRight size={20}/></button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: AI BOT DASHBOARD */}
      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-right duration-500">
           <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-sm mb-12 uppercase tracking-widest">← Back</button>
           
           {botTier === 'none' ? (
             <>
               <h2 className="text-5xl font-black mb-16 text-center uppercase text-white italic">AJ AI <span className="text-green-500 font-thin">Bot Engine</span></h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                  <div className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem] text-center shadow-xl">
                     <ShieldCheck size={50} className="mx-auto mb-6 text-cyan-400" />
                     <h3 className="text-3xl font-black">BASIC BOT</h3>
                     <p className="text-xs text-gray-500 my-6 tracking-widest uppercase">PROFIT: 2-5% DAILY</p>
                     <div className="text-4xl font-black text-white mb-8">2,500 <span className="text-sm opacity-40">Coins</span></div>
                     <button onClick={() => activateBot('basic', 2500)} className="w-full py-5 bg-cyan-600 rounded-2xl font-black uppercase">Start Basic</button>
                  </div>
                  <div className="bg-white/5 border-2 border-yellow-500/30 p-12 rounded-[3.5rem] text-center shadow-2xl relative">
                     <Crown size={50} className="mx-auto mb-6 text-yellow-500" />
                     <h3 className="text-3xl font-black uppercase tracking-tighter">VVIP BOT</h3>
                     <p className="text-xs text-gray-500 my-6 tracking-widest">PROFIT: 8-12% DAILY</p>
                     <div className="text-4xl font-black text-white mb-8">7,500 <span className="text-sm opacity-40">Coins</span></div>
                     <button onClick={() => activateBot('vvip', 7500)} className="w-full py-5 bg-yellow-600 text-black rounded-2xl font-black uppercase">Start VVIP</button>
                  </div>
               </div>
             </>
           ) : (
             <div className="w-full max-w-2xl bg-gradient-to-b from-green-500/10 to-transparent border-2 border-green-500/40 p-12 rounded-[4rem] text-center shadow-[0_0_100px_rgba(34,197,94,0.1)]">
                <Activity size={60} className="mx-auto mb-8 text-green-500 animate-pulse" />
                <h2 className="text-6xl font-black uppercase mb-4">{botTier} BOT ACTIVE</h2>
                <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden mb-12">
                   <div className="h-full bg-green-500 animate-[loading_5s_linear_infinite]" style={{width: '60%'}}></div>
                </div>
                <div className="grid grid-cols-2 gap-8 text-left border-t border-white/5 pt-10">
                   <div><p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Invested</p><p className="text-3xl font-black text-white">{invested} 🪙</p></div>
                   <div><p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Daily Profit</p><p className="text-3xl font-black text-green-400">+{botTier === 'vvip' ? '12%' : '5%'}</p></div>
                </div>
                <div className="mt-12 flex items-center justify-center gap-3 bg-green-500/20 py-4 rounded-2xl border border-green-500/50">
                   <TrendingUp size={20} className="text-green-400" />
                   <span className="font-black text-lg">AI TRADING IN REAL-TIME...</span>
                </div>
             </div>
           )}
        </div>
      )}

      {/* MODAL: SOCIAL */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in fade-in duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold text-sm mb-12 uppercase">← BACK TO HUB</button>
           <h2 className="text-5xl font-black mb-16 uppercase text-white tracking-widest">AJ SOCIAL</h2>
           <div className="flex flex-col gap-6 w-full max-w-md">
             {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
               <div key={module} className="flex items-center justify-between bg-white/5 border border-white/10 p-8 rounded-3xl hover:border-pink-500 active:scale-95 cursor-pointer group shadow-lg transition-all">
                  <h3 className="text-2xl font-black text-white group-hover:text-pink-400 transition-colors uppercase tracking-tighter">{module}</h3>
                  <span className="text-4xl">{i === 0 ? '🚀' : i === 1 ? '⚡' : '🔴'}</span>
               </div>
             ))}
           </div>
        </div>
      )}
    </main>
  );
}