"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, ShieldCheck, Crown } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(0);
  const [botTier, setBotTier] = useState('none');

  const usdtBalance = (balance / 100).toFixed(2);

  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => {
        setLoading(prev => (prev >= 100 ? 100 : prev + 5));
      }, 50);
      setTimeout(() => setScreen('auth'), 2500);
      return () => clearInterval(interval);
    }
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
          } else {
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none' });
            setBalance(500);
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

  // --- 1. WELCOME SPLASH SCREEN ---
  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="relative mb-12 animate-bounce">
          <div className="w-32 h-32 md:w-48 md:h-48 border-4 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_50px_#06b6d4]">
            <span className="text-6xl md:text-8xl font-black italic">AJ</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-[0.2em] text-center text-white drop-shadow-[0_0_20px_#fff]">
          WELCOME TO <br/> <span className="text-cyan-400">AJ PORTAL</span>
        </h1>
        <div className="mt-16 w-64 h-1 bg-gray-900 rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-cyan-500 transition-all duration-300 shadow-[0_0_15px_#22d3ee]" style={{ width: `${loading}%` }}></div>
        </div>
      </main>
    );
  }

  // --- 2. SIGNUP/LOGIN SCREEN ---
  if (screen === 'auth' && !user) {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center font-sans">
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3.5rem] shadow-2xl relative">
          <h2 className="text-7xl font-black mb-10 italic uppercase text-white tracking-tighter">AJ <span className="text-cyan-400">ID</span></h2>
          <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 shadow-xl transition-all">CONTINUE WITH GOOGLE</button>
          <div className="mt-8 text-yellow-500 font-bold text-xs animate-pulse">+500 COINS BONUS ON SIGNUP</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic tracking-tighter text-cyan-400 drop-shadow-[0_0_10px_#06b6d4]">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div className="bg-white/5 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
            <span className="text-xs font-black text-yellow-500 uppercase">{balance} 🪙</span>
            <span className="text-[10px] text-green-400 font-bold">${usdtBalance}</span>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500"><LogOut size={18} /></button>
        </div>
      </header>

      {/* 3. MAIN HUB DASHBOARD */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative pt-24">
        <h1 className="relative z-10 text-4xl md:text-8xl font-black text-center mb-12 md:mb-20 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>

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
          <div onClick={handlePurchase} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <img src="/gold.jpg" alt="C" className="w-12 h-12 md:w-40 md:h-40 object-contain mb-2" />
            <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
          </div>

          {/* Card: AJ AI (NOW OPENS AI BOT) */}
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Bot className="mb-2 text-green-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">AJ AI</h2>
          </div>

          {/* HUB Circle (Non-blocking) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-40">
            <div className="w-20 h-20 md:w-80 md:h-80 bg-black border-2 md:border-8 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_60px_#06b6d4]">
              <span className="text-[8px] md:text-6xl font-black text-white italic">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOUNDER CARD */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" alt="F" className="w-full max-w-4xl h-auto rounded-3xl shadow-2xl" />
      </section>

      {/* 5. GLOWING FOOTER */}
      <footer className="bg-black py-24 px-8 border-t border-cyan-500/10 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <div className="text-7xl md:text-9xl font-black italic tracking-tighter text-white uppercase drop-shadow-[0_0_30px_rgba(6,182,212,0.6)]">
            AJ <span className="text-cyan-400">STUDIO</span>
          </div>
          <div className="flex gap-14 mt-4">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 active:scale-150 transition-all"><MessageCircle size={55}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white text-5xl font-black">X</a>
          </div>
          <p className="mt-10 text-gray-700 font-black tracking-[1em] text-[10px] uppercase">Muscat, Sultanate of Oman</p>
        </div>
      </footer>

      {/* 6. AI BOT OVERLAY (FIXED) */}
      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-sm mb-12 uppercase tracking-widest">← Back to Hub</button>
           <h2 className="text-5xl font-black mb-16 uppercase text-white tracking-widest text-center italic">AJ AI <span className="text-green-500">BOT</span></h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center hover:border-cyan-500 transition-all shadow-xl">
                 <ShieldCheck size={40} className="mx-auto mb-4 text-cyan-400" />
                 <h3 className="text-2xl font-black uppercase">Basic Bot</h3>
                 <p className="text-3xl font-black text-cyan-400 my-6">2,500 Coins</p>
                 <button className="w-full py-4 bg-cyan-600 rounded-xl font-black uppercase">Activate</button>
              </div>
              <div className="bg-white/5 border-2 border-yellow-500/30 p-10 rounded-[3rem] text-center relative hover:border-yellow-500 transition-all shadow-2xl">
                 <Crown size={40} className="mx-auto mb-4 text-yellow-500" />
                 <h3 className="text-2xl font-black uppercase">VVIP Bot</h3>
                 <p className="text-3xl font-black text-yellow-500 my-6">7,500 Coins</p>
                 <button className="w-full py-4 bg-yellow-600 rounded-xl font-black uppercase text-black">Activate</button>
              </div>
           </div>
        </div>
      )}

      {/* 7. SOCIAL OVERLAY */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in fade-in duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold text-sm mb-12 uppercase">← Back</button>
           <h2 className="text-5xl font-black mb-16 uppercase text-white tracking-widest">AJ SOCIAL</h2>
           <div className="flex flex-col gap-6 w-full max-w-md">
             {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
               <div key={module} className="flex items-center justify-between bg-white/5 border border-white/10 p-10 rounded-3xl hover:border-pink-500 active:scale-95 cursor-pointer shadow-lg transition-all">
                  <h3 className="text-2xl font-black text-white group-hover:text-pink-400 transition-colors uppercase">{module}</h3>
                  <span className="text-4xl">{i === 0 ? '🚀' : i === 1 ? '⚡' : '🔴'}</span>
               </div>
             ))}
           </div>
        </div>
      )}
    </main>
  );
}