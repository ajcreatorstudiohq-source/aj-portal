"use client";
import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, X, Mail } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(0);

  // --- 100 Coins = $1.00 USDT Logic ---
  const usdtBalance = (balance / 100).toFixed(2);

  // --- 1. SPLASH TIMER ---
  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => {
        setLoading(prev => (prev >= 100 ? 100 : prev + 10));
      }, 50);
      setTimeout(() => setScreen('auth'), 2000);
      return () => clearInterval(interval);
    }
  }, [screen]);

  // --- 2. FIREBASE REAL-TIME SYNC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setBalance(docSnap.data().balance);
          } else {
            // New User Setup: 500 Bonus
            setDoc(userRef, { 
                name: currentUser.displayName, 
                email: currentUser.email, 
                balance: 500,
                joinedAt: new Date()
            });
            setBalance(500);
          }
        });
        setScreen('hub');
      } else {
        setUser(null);
        setScreen('auth');
      }
    });
    return () => unsubscribe();
  }, []);

  // --- 3. LOGIN / LOGOUT LOGIC ---
  const handleLogin = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) { console.error("Auth Error", e.message); }
  };

  const handleLogout = async () => { await signOut(auth); setScreen('auth'); };

  // --- 4. ASLI PAYMENT LINK ---
  const handlePurchase = () => {
    const paymentUrl = "https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174";
    window.open(paymentUrl, '_blank');
  };

  // --- SCREEN 1: SPLASH ---
  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="relative mb-12">
          <div className="w-32 h-32 border-4 border-cyan-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_50px_#06b6d4]">
            <span className="text-6xl font-black italic">AJ</span>
          </div>
        </div>
        <h1 className="text-3xl font-black tracking-[0.5em] uppercase">Welcome</h1>
      </main>
    );
  }

  // --- SCREEN 2: AUTH ---
  if (screen === 'auth' && !user) {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
          <h2 className="text-6xl font-black mb-2 italic">AJ <span className="text-cyan-400 font-thin uppercase">ID</span></h2>
          <p className="text-gray-500 mb-12 text-sm tracking-widest uppercase font-bold italic">Digital Access Portal</p>
          <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 shadow-xl transition-all">
            CONTINUE WITH GOOGLE
          </button>
          <div className="mt-8 text-yellow-500 font-bold text-xs animate-bounce uppercase tracking-tighter">
            +500 AJ COINS BONUS ON SIGNUP
          </div>
        </div>
      </main>
    );
  }

  // --- SCREEN 3: MAIN PORTAL ---
  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* VVIP HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic tracking-tighter text-cyan-400 drop-shadow-[0_0_10px_#06b6d4]">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg">
            <div className="text-right leading-none pr-2 border-r border-white/10">
               <p className="text-[10px] font-black text-yellow-500 uppercase">{balance} COINS</p>
               <p className="text-[12px] font-black text-green-400 tracking-tighter">${usdtBalance} USDT</p>
            </div>
            <img src={user?.photoURL} className="w-9 h-9 rounded-full border-2 border-cyan-500" alt="u" />
          </div>
          <button onClick={handleLogout} className="p-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-500"><LogOut size={18} /></button>
        </div>
      </header>

      {/* HUB SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative pt-24">
        <h1 className="relative z-10 text-4xl md:text-8xl font-black text-center mb-16 md:mb-28 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>

        <div className="relative z-20 grid grid-cols-2 gap-4 md:gap-24 w-full max-w-4xl px-2">
          {/* Gaming */}
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Trophy className="mb-2 text-cyan-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase tracking-tighter">Gaming</h2>
          </div>

          {/* Social */}
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Zap className="mb-2 text-pink-500 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase tracking-tighter">Social</h2>
          </div>

          {/* Wallet - ASLI PAYMENT LINK HERE */}
          <div onClick={handlePurchase} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30 text-center">
            <img src="/gold.jpg" alt="C" className="w-12 h-12 md:w-40 md:h-40 object-contain mb-2" />
            <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500 font-black">Wallet</h2>
          </div>

          {/* AI */}
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Bot className="mb-2 text-green-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase font-black tracking-tighter">AJ AI</h2>
          </div>

          {/* HUB Circle decoration */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-16 h-16 md:w-80 md:h-80 bg-black border-2 md:border-8 border-cyan-500/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <span className="text-[6px] md:text-6xl font-black text-white/50 italic">HUB</span>
            </div>
          </div>
        </div>

        <div className="mt-12 md:mt-24 bg-white/5 px-8 py-3 rounded-full flex gap-4 md:gap-16 text-[8px] md:text-2xl font-black text-gray-500 uppercase tracking-widest border border-white/5">
           <span>Play</span> <span className="text-cyan-500">➔</span> <span>Engage</span> <span className="text-cyan-500">➔</span> <span>Earn</span> <span className="text-cyan-500">➔</span> <span>Spend</span>
        </div>
      </section>

      {/* FOUNDER CARD (USING YOUR HOLOGRAPHIC IMAGE) */}
      <section className="py-20 bg-black flex flex-col items-center justify-center px-4 border-y border-white/5">
        <p className="text-cyan-500 font-mono text-[10px] tracking-widest mb-8 font-bold uppercase tracking-[1em]">Founder Identity</p>
        <div className="max-w-6xl w-full">
           <img src="/founder_card.jpg" alt="Founder Card" className="w-full h-auto rounded-3xl shadow-2xl border border-white/10" />
        </div>
      </section>

      {/* VVIP FOOTER (CONNECTED LINKS) */}
      <footer className="bg-black pt-24 pb-12 px-8 border-t border-cyan-500/10 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-10">
          <div className="text-6xl md:text-[10rem] font-black italic tracking-tighter text-white drop-shadow-[0_0_30px_rgba(6,182,212,0.6)]">
            AJ <span className="text-cyan-400">STUDIO</span>
          </div>
          
          <div className="flex flex-col items-center gap-6">
             <div className="flex items-center gap-3 text-gray-400 text-sm font-mono border-b border-white/5 pb-2">
                <Mail size={16} className="text-cyan-400" /> ajcreatorstudio.hq@gmail.com
             </div>
             
             <div className="flex gap-12 mt-4">
                {/* WhatsApp */}
                <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"><MessageCircle size={55}/></a>
                {/* Instagram */}
                <a href="https://www.instagram.com/innocent.a.jutt?igsh=MXV5dWwwZzUxNjlmNA==" target="_blank" className="text-pink-500 hover:scale-125 transition-all"><Instagram size={55}/></a>
                {/* X (Twitter) */}
                <a href="https://x.com/Ali20352061" target="_blank" className="text-white text-5xl font-black hover:scale-125 transition-all">X</a>
             </div>
          </div>
          
          <p className="mt-12 text-gray-700 font-black tracking-[1em] text-[10px] uppercase flex items-center gap-2"><Globe size={12}/> Muscat, Sultanate of Oman</p>
        </div>
        <p className="text-center text-[10px] text-gray-900 mt-20 uppercase tracking-[2em] font-black opacity-30 italic">Establishing Sovereignty</p>
      </footer>

      {/* SOCIAL SUB-MODULES */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center p-8 overflow-y-auto animate-in fade-in duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold text-sm mb-12 flex items-center gap-2 hover:text-white transition-colors">
             <ChevronRight className="rotate-180" /> BACK TO HUB
           </button>
           <h2 className="text-5xl font-black mb-16 uppercase text-white tracking-tighter">AJ Social</h2>
           <div className="flex flex-col gap-6 w-full max-w-md">
             {[
               { name: 'AJ TikReels', icon: '🚀', desc: 'Watch & Go Live' },
               { name: 'AJ Pulse', icon: '⚡', desc: 'Stories & Global Friends' },
               { name: 'AJ Live Chat', icon: '🔴', desc: 'Real-time Gifting' }
             ].map((module, i) => (
               <div key={module.name} className="flex items-center justify-between bg-white/[0.03] border border-white/10 p-10 rounded-[2.5rem] hover:border-pink-500 active:scale-95 cursor-pointer group shadow-lg transition-all">
                  <div>
                    <h3 className="text-2xl font-black text-white group-hover:text-pink-400 transition-colors uppercase tracking-tighter">{module.name}</h3>
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest">{module.desc}</p>
                  </div>
                  <span className="text-5xl">{module.icon}</span>
               </div>
             ))}
           </div>
        </div>
      )}
    </main>
  );
}