"use client";
import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebaseConfig'; // Firebase Connection
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, ChevronRight, Globe, Mail } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(0);

  // 1. Splash Screen Timer
  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => {
        setLoading(prev => (prev >= 100 ? 100 : prev + 10));
      }, 50);
      setTimeout(() => setScreen('auth'), 1500);
      return () => clearInterval(interval);
    }
  }, [screen]);

  // 2. Real-time User & Balance Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (user) return; // Already handled
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        
        // Listen for real-time balance updates
        onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setBalance(docSnap.data().balance);
          } else {
            // NAYA USER: Create Profile + Give 500 Coins Bonus!
            await setDoc(userRef, {
              name: currentUser.displayName,
              email: currentUser.email,
              balance: 500,
              joinedAt: new Date()
            });
            setBalance(500);
          }
        });
        setScreen('hub');
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Login Function
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error", error);
    }
  };

  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="w-24 h-24 border-4 border-cyan-500 rounded-full animate-pulse mb-4"></div>
        <h1 className="text-3xl font-black tracking-widest uppercase">Welcome</h1>
      </main>
    );
  }

  if (screen === 'auth' && !user) {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-10 rounded-3xl backdrop-blur-xl shadow-2xl">
          <h2 className="text-5xl font-black mb-2 italic">AJ <span className="text-cyan-400 font-light">ID</span></h2>
          <p className="text-gray-500 mb-10 text-xs tracking-widest uppercase font-bold">Digital Empire Access</p>
          
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl mb-8">
             <p className="text-yellow-500 font-black text-sm uppercase">🎁 Signup Bonus: 500 AJ Coins</p>
          </div>

          <button onClick={handleLogin} className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-400 transition-all active:scale-95">
            CONTINUE WITH GOOGLE
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      {/* VVIP HEADER (Displays Balance & Profile) */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-50 bg-black/40 backdrop-blur-lg border-b border-white/5">
        <div className="text-2xl font-black italic tracking-tighter text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg">
          <div className="text-right leading-none">
             <p className="text-[7px] text-gray-500 uppercase font-bold">Net Balance</p>
             <p className="text-sm font-black text-yellow-500">{balance} <span className="text-[10px]">COINS</span></p>
          </div>
          <img src={user?.photoURL} className="w-9 h-9 rounded-full border-2 border-cyan-500 shadow-[0_0_10px_#06b6d4]" alt="profile" />
        </div>
      </header>

      {/* HUB SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative pt-20">
        <h1 className="relative z-20 text-4xl md:text-8xl font-black text-center mb-16 md:mb-24 uppercase drop-shadow-[0_0_20px_#22d3ee]">
          AJ SUPER PORTAL
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl px-2">
          <div className="group bg-white/5 border border-white/10 rounded-2xl p-6 h-48 md:h-72 flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer shadow-xl relative">
            <Trophy className="mb-2 text-cyan-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase tracking-tighter">Gaming</h2>
          </div>
          <div className="group bg-white/5 border border-white/10 rounded-2xl p-6 h-48 md:h-72 flex flex-col items-center justify-center hover:border-pink-500 transition-all cursor-pointer shadow-xl relative">
            <Zap className="mb-2 text-pink-500 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase tracking-tighter">Social</h2>
          </div>
          <div className="group bg-white/5 border border-white/10 rounded-2xl p-6 h-48 md:h-72 flex flex-col items-center justify-center hover:border-yellow-500 transition-all cursor-pointer shadow-xl relative">
            <img src="/gold.jpg" alt="Coin" className="w-12 h-12 md:w-40 md:h-40 object-contain mb-2" />
            <h2 className="font-black text-xs md:text-3xl uppercase tracking-tighter text-yellow-500">Wallet</h2>
          </div>
          <div className="group bg-white/5 border border-white/10 rounded-2xl p-6 h-48 md:h-72 flex flex-col items-center justify-center hover:border-green-500 transition-all cursor-pointer shadow-xl relative">
            <Bot className="mb-2 text-green-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase tracking-tighter">AJ AI</h2>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 md:w-64 md:h-64 bg-black border-2 md:border-8 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.6)] z-30">
              <span className="text-[8px] md:text-5xl font-black text-white">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER CARD */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" alt="Founder" className="w-full max-w-4xl h-auto rounded-3xl shadow-2xl border border-white/10" />
      </section>

      {/* FOOTER */}
      <footer className="bg-black pt-20 pb-10 px-8 border-t border-cyan-500/10 text-center">
        <div className="text-6xl md:text-9xl font-black italic tracking-tighter text-white uppercase opacity-20">AJ STUDIO</div>
        <div className="flex justify-center gap-12 mt-12">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={60}/></a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white hover:scale-125 transition-all"><Zap size={60}/></a>
        </div>
        <p className="mt-16 text-gray-800 font-black tracking-[1.5em] text-[10px] uppercase">Establishing Sovereignty</p>
      </footer>
    </main>
  );
}