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

  // --- Logic: 100 Coins = $1.00 USDT ---
  const usdtBalance = (balance / 100).toFixed(2);

  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => {
        setLoading(prev => (prev >= 100 ? 100 : prev + 10));
      }, 50);
      setTimeout(() => setScreen('auth'), 2000);
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
            setBalance(docSnap.data().balance);
          } else {
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500 });
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

  const handleLogin = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) { console.error("Auth Error", e.message); }
  };

  const handleLogout = async () => { await signOut(auth); setScreen('auth'); };

  // --- 🔥 ASLI PAYMENT LINK FIXED HERE ---
  const handlePurchase = () => {
    const paymentUrl = "https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174";
    window.open(paymentUrl, '_blank');
  };

  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-center justify-center text-white flex-col items-center">
        <div className="w-24 h-24 border-4 border-cyan-500 rounded-full animate-pulse shadow-[0_0_40px_#06b6d4] mb-6 flex items-center justify-center">
            <span className="text-5xl font-black italic">AJ</span>
        </div>
        <h1 className="text-2xl font-black tracking-[0.5em] uppercase">Welcome</h1>
      </main>
    );
  }

  if (screen === 'auth' && !user) {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
          <h2 className="text-6xl font-black mb-2 italic">AJ <span className="text-cyan-400 font-thin uppercase">ID</span></h2>
          <p className="text-gray-500 mb-12 text-sm tracking-widest uppercase font-bold italic">Digital Access Portal</p>
          <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 shadow-xl transition-all">
            CONTINUE WITH GOOGLE
          </button>
          <div className="mt-8 text-yellow-500 font-bold text-xs animate-bounce uppercase">+500 AJ COINS BONUS ON SIGNUP</div>
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
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg">
            <div className="text-right leading-none pr-2 border-r border-white/10">
               <p className="text-[10px] font-black text-yellow-500 uppercase">{balance} COINS</p>
               <p className="text-[12px] font-black text-green-400 tracking-tighter">${usdtBalance} USDT</p>
            </div>
            <img src={user?.photoURL} className="w-8 h-8 rounded-full border-2 border-cyan-500" alt="u" />
          </div>
          <button onClick={handleLogout} className="p-2 bg-red-500/10 border border-red-500/50 rounded-full text-red-500"><LogOut size={18} /></button>
        </div>
      </header>

      {/* MAIN HUB */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative pt-24">
        <h1 className="relative z-10 text-4xl md:text-8xl font-black text-center mb-12 md:mb-20 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>

        <div className="relative z-20 grid grid-cols-2 gap-4 md:gap-24 w-full max-w-4xl px-2">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Trophy className="mb-2 text-cyan-400 w-10 h-10 md:w-24 md:h-24" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Gaming</h2>
          </div>

          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Zap className="mb-2 text-pink-500 w-10 h-10 md:w-24 md:h-24" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Social</h2>
          </div>

          {/* WALLET CLICK FIXED */}
          <div onClick={handlePurchase} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <img src="/gold.jpg" alt="C" className="w-12 h-12 md:w-48 md:h-48 object-contain mb-2" />
            <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Bot className="mb-2 text-green-400 w-10 h-10 md:w-24 md:h-24" />
            <h2 className="font-black text-xs md:text-3xl uppercase">AJ AI</h2>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-20 h-20 md:w-80 md:h-80 bg-black border-2 md:border-8 border-cyan-500/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <span className="text-[8px] md:text-6xl font-black text-white italic">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER CARD */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" alt="Founder" className="w-full max-w-4xl h-auto rounded-3xl shadow-2xl" />
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-20 px-8 border-t border-cyan-500/10 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <div className="text-7xl md:text-9xl font-black italic tracking-tighter text-white drop-shadow-[0_0_30px_rgba(6,182,212,0.6)]">AJ STUDIO</div>
          <div className="flex gap-12 mt-4">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={55}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white text-5xl font-black">X</a>
               <a href="https://www.instagram.com/innocent.a.jutt" target="_blank" className="text-pink-500 text-5xl font-black italic">i</a>
          </div>
          <p className="mt-10 text-gray-700 font-black tracking-[1em] text-[10px] uppercase">Muscat, Sultanate of Oman</p>
        </div>
      </footer>

      {/* SOCIAL OVERLAY */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in fade-in duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold text-sm mb-12 flex items-center gap-2">
             <ChevronRight className="rotate-180" /> BACK TO HUB
           </button>
           <h2 className="text-5xl font-black mb-16 uppercase text-white tracking-tighter shadow-cyan-500/50">AJ SOCIAL</h2>
           <div className="flex flex-col gap-6 w-full max-w-md">
             {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
               <div key={module} className="flex items-center justify-between bg-white/5 border border-white/10 p-8 rounded-3xl hover:border-pink-500 active:scale-95 cursor-pointer group shadow-lg">
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