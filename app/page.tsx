"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, ShieldCheck, Crown, Activity, TrendingUp, X } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);

  // 100 Coins = $1.00 USDT
  const usdtValue = (balance / 100).toFixed(2);

  useEffect(() => {
    if (screen === 'splash') setTimeout(() => setScreen('auth'), 2000);
  }, [screen]);

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

  const handleLogin = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) { console.log(e.message); }
  };

  const handlePurchase = () => window.open("https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174", '_blank');

  const activateBot = async (tier: string, cost: number) => {
    if (balance < cost) {
      alert(`⚠️ AJ! Need ${cost} Coins. Your Balance: ${balance}`);
      return;
    }
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost });
    alert("🚀 BOT STARTED!");
  };

  if (screen === 'splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-24 h-24 border-4 border-cyan-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_50px_#06b6d4] mb-6">
        <span className="text-5xl font-black italic">AJ</span>
      </div>
      <h1 className="text-2xl font-black tracking-widest uppercase">Welcome</h1>
    </main>
  );

  if (screen === 'auth' && !user) return (
    <main className="h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.02] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 italic text-cyan-400">AJ <span className="text-white">ID</span></h2>
        <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-all">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold text-xs">+500 COINS BONUS</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      
      {/* 1. HEADER (Real-time Balance) */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400 drop-shadow-[0_0_10px_#06b6d4]">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div className="bg-white/5 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
            <span className="text-xs font-black text-yellow-500">{balance} 🪙</span>
            <span className="text-[10px] text-green-400 font-bold">${usdtValue}</span>
          </div>
          {user && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500"><LogOut size={16} /></button>
        </div>
      </header>

      {/* 2. MAIN HUB (Exact 2x2 Grid) */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative pt-24">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        
        <div className="relative z-20 grid grid-cols-2 gap-4 md:gap-24 w-full max-w-4xl px-2">
          {/* Card: Gaming */}
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Trophy className="mb-2 text-cyan-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Gaming</h2>
          </div>

          {/* Card: Social */}
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Zap className="mb-2 text-pink-500 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Social</h2>
          </div>

          {/* Card: Wallet */}
          <div onClick={handlePurchase} className="bg-white/5 border-2 border-yellow-500/30 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30 text-center">
            <img src="/gold.jpg" className="w-12 h-12 md:w-40 md:h-40 object-contain mb-2" alt="C" />
            <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
          </div>

          {/* Card: AI */}
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Bot className="mb-2 text-green-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">AJ AI</h2>
          </div>

          {/* HUB Center Circle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-40">
            <div className="w-24 h-24 md:w-96 md:h-96 border-2 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4]">
              <span className="text-8xl font-black italic text-white/50">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOUNDER CARD */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" alt="F" className="w-full max-w-4xl h-auto rounded-3xl shadow-2xl" />
      </section>

      {/* 4. GLOWING FOOTER */}
      <footer className="bg-black py-24 px-10 border-t border-cyan-500/10 text-center">
        <div className="text-7xl md:text-[10rem] font-black italic text-white uppercase drop-shadow-[0_0_30px_rgba(6,182,212,0.8)] mb-10">AJ STUDIO</div>
        <div className="flex justify-center gap-14">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={60}/></a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white text-5xl font-black italic hover:scale-125 transition-all">X</a>
        </div>
        <p className="mt-12 text-gray-700 font-black tracking-[1em] text-[10px] uppercase">Muscat, Sultanate of Oman</p>
      </footer>

      {/* 5. MODAL: SOCIAL */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in fade-in duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold text-sm mb-12 uppercase">← Back</button>
           <h2 className="text-5xl font-black mb-16 uppercase text-white tracking-widest text-center">AJ SOCIAL Network</h2>
           <div className="flex flex-col gap-6 w-full max-w-md">
             {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
               <div key={module} className="flex items-center justify-between bg-white/5 border border-white/10 p-10 rounded-3xl hover:border-pink-500 active:scale-95 cursor-pointer group transition-all">
                  <h3 className="text-2xl font-black text-white group-hover:text-pink-400 transition-colors uppercase tracking-tighter italic">{module}</h3>
                  <span className="text-4xl">{i === 0 ? '🚀' : i === 1 ? '⚡' : '🔴'}</span>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* 6. MODAL: AI BOT */}
      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-right duration-500">
           <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-sm mb-12 uppercase">← Back</button>
           <h2 className="text-5xl font-black mb-12 text-center uppercase text-white italic tracking-tighter">AJ AI <span className="text-green-500 font-thin text-4xl">BOT</span></h2>
           {botTier === 'none' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-2">
                <div className="bg-white/5 border border-white/10 p-10 rounded-3xl text-center hover:border-cyan-500 transition-all"><ShieldCheck size={40} className="mx-auto mb-4 text-cyan-400" /><h3 className="text-xl font-black uppercase">Basic Bot (+2% Daily)</h3><p className="text-3xl font-black text-white my-6">2,500 Coins</p><button onClick={() => activateBot('basic', 2500)} className="w-full py-4 bg-cyan-600 rounded-xl font-black uppercase">Activate</button></div>
                <div className="bg-white/5 border-2 border-yellow-500/30 p-10 rounded-3xl text-center relative hover:border-yellow-500 transition-all shadow-2xl"><Crown size={40} className="mx-auto mb-4 text-yellow-500" /><h3 className="text-xl font-black uppercase">VVIP Bot (+5% Daily)</h3><p className="text-3xl font-black text-white my-6">7,500 Coins</p><button onClick={() => activateBot('vvip', 7500)} className="w-full py-4 bg-yellow-600 rounded-xl font-black text-black uppercase">Activate</button></div>
             </div>
           ) : (
             <div className="w-full max-w-2xl bg-gradient-to-b from-green-500/10 to-transparent border-2 border-green-500/40 p-16 rounded-[4rem] text-center shadow-[0_0_100px_rgba(34,197,94,0.1)]">
                <Activity size={80} className="mx-auto mb-10 text-green-500 animate-pulse" />
                <h2 className="text-5xl font-black uppercase text-white mb-8">{botTier} BOT ACTIVE</h2>
                <div className="mt-12 bg-green-500/20 py-4 rounded-2xl flex items-center justify-center gap-3 border border-green-500/50"><TrendingUp size={24} className="text-green-400 mx-auto" /><span className="font-black text-xl text-green-400 uppercase tracking-tighter">AI TRADING IN REAL-TIME...</span></div>
             </div>
           )}
        </div>
      )}
    </main>
  );
}