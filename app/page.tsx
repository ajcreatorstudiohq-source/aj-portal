"use client";
import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, ChevronRight, Globe, Twitter, Instagram } from 'lucide-react';

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
      setTimeout(() => setScreen('auth'), 2000);
      return () => clearInterval(interval);
    }
  }, [screen]);

  // 2. Real-time Firebase Sync (Login & Balance)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setBalance(docSnap.data().balance);
          } else {
            // NAYA USER: Create Profile + Give 500 Coins Bonus
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500 });
            setBalance(500);
          }
        });
        setScreen('hub');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  // --- SPLASH SCREEN ---
  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white relative">
        <div className="absolute w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-32 h-32 md:w-48 md:h-48 bg-black rounded-full border-4 border-cyan-500 flex items-center justify-center overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.8)] mb-8">
             <img src="/logo.jpg" alt="AJ" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-[0.5em] text-white uppercase drop-shadow-[0_0_20px_#fff]">Welcome</h1>
        </div>
      </main>
    );
  }

  // --- LOGIN SCREEN ---
  if (screen === 'auth' && !user) {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] backdrop-blur-xl shadow-2xl relative">
          <h2 className="text-7xl font-black mb-4 italic uppercase">AJ <span className="text-cyan-400 font-thin">ID</span></h2>
          <p className="text-gray-500 mb-12 text-sm font-bold tracking-widest">DIGITAL EMPIRE ACCESS</p>
          <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-xl">
            CONTINUE WITH GOOGLE
          </button>
          <div className="mt-8 text-yellow-500 font-black text-sm animate-bounce">+500 AJ COINS BONUS ON SIGNUP</div>
        </div>
      </main>
    );
  }

  // --- MAIN PORTAL VIEW ---
  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-50 bg-black/40 backdrop-blur-lg border-b border-white/5">
        <div className="text-2xl font-black italic tracking-tighter text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg">
          <div className="text-right leading-none">
             <p className="text-[7px] text-gray-500 uppercase font-bold tracking-widest">Balance</p>
             <p className="text-sm font-black text-yellow-500">{balance} COINS</p>
          </div>
          <img src={user?.photoURL} className="w-10 h-10 rounded-full border-2 border-cyan-500 shadow-[0_0_10px_#06b6d4]" alt="p" />
        </div>
      </header>

      {/* MAIN HUB */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative pt-20">
        <h1 className="relative z-20 text-5xl md:text-[10rem] font-black tracking-tighter text-center mb-16 md:mb-32 uppercase drop-shadow-[0_0_30px_#22d3ee] leading-none">
          AJ SUPER PORTAL
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-24 w-full max-w-5xl px-2">
          {/* Card: Gaming */}
          <div className="group bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer shadow-xl">
            <Trophy className="mb-2 text-cyan-400 w-12 h-12 md:w-24 md:h-24" />
            <h2 className="font-black text-sm md:text-4xl uppercase">Gaming</h2>
          </div>

          {/* Card: Social */}
          <div onClick={() => setScreen('social')} className="group bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center hover:border-pink-500 transition-all cursor-pointer shadow-xl">
            <Zap className="mb-2 text-pink-500 w-12 h-12 md:w-24 md:h-24" />
            <h2 className="font-black text-sm md:text-4xl uppercase">Social</h2>
          </div>

          {/* Card: Wallet */}
          <div className="group bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center hover:border-yellow-500 transition-all cursor-pointer shadow-xl">
            <img src="/gold.jpg" alt="C" className="w-16 h-16 md:w-48 md:h-48 object-contain mb-2 drop-shadow-[0_0_15px_#eab308]" />
            <h2 className="font-black text-sm md:text-4xl uppercase text-yellow-500">Wallet</h2>
          </div>

          {/* Card: AI */}
          <div className="group bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center hover:border-green-500 transition-all cursor-pointer shadow-xl">
            <Bot className="mb-2 text-green-400 w-12 h-12 md:w-24 md:h-24" />
            <h2 className="font-black text-sm md:text-4xl uppercase">AJ AI</h2>
          </div>

          {/* Central Hub Circle (Responsive) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 md:w-80 md:h-80 bg-black border-4 md:border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.8)] z-30">
              <span className="text-xs md:text-8xl font-black text-white italic">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER CARD SECTION */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <div className="max-w-6xl w-full text-center">
           <p className="text-cyan-500 font-mono text-xs tracking-[1em] mb-10 font-black">Founder Identity</p>
           <img src="/founder_card.jpg" alt="Founder Card" className="w-full h-auto rounded-[3rem] shadow-2xl border border-white/10" />
        </div>
      </section>

      {/* FOOTER (WHATSAPP, INSTA, X CONNECTED) */}
      <footer className="bg-black pt-32 pb-16 px-10 border-t border-cyan-500/10 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-16">
          <div className="text-7xl md:text-[10rem] font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_#06b6d4]">
            AJ STUDIO
          </div>
          
          <div className="flex flex-col items-center gap-8">
            <span className="text-gray-500 text-xl font-bold border-b border-white/10 pb-2">ajcreatorstudio.hq@gmail.com</span>
            <div className="flex gap-16 items-center justify-center">
               {/* WHATSAPP */}
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all">
                 <MessageCircle size={70} />
               </a>
               {/* INSTAGRAM */}
               <a href="https://www.instagram.com/innocent.a.jutt?igsh=MXV5dWwwZzUxNjlmNA==" target="_blank" className="text-pink-500 hover:scale-125 transition-all">
                 <Instagram size={70} />
               </a>
               {/* X (TWITTER) */}
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white hover:scale-125 transition-all">
                 <Twitter size={70} />
               </a>
            </div>
          </div>
        </div>
        <p className="mt-32 text-gray-800 font-black tracking-[2em] text-[10px] uppercase opacity-30">Establishing Sovereignty</p>
      </footer>

      {/* SOCIAL SUB-MODULES OVERLAY */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-black text-lg mb-16 flex items-center gap-2 hover:text-white transition-colors">
             <ChevronRight className="rotate-180" /> BACK TO HUB
           </button>
           <h2 className="text-6xl font-black mb-16 tracking-tighter uppercase text-white">AJ Social</h2>
           <div className="flex flex-col gap-8 w-full max-w-2xl">
             {[
               { name: 'AJ TikReels', icon: '🚀', desc: 'Watch & Go Live' },
               { name: 'AJ Pulse', icon: '⚡', desc: 'Stories & Global Friends' },
               { name: 'AJ Live Chat', icon: '🔴', desc: 'Real-time Gifting' }
             ].map((module, i) => (
               <div key={module.name} className="flex items-center justify-between bg-white/[0.03] border-2 border-white/5 p-10 rounded-[2.5rem] hover:border-pink-500 transition-all cursor-pointer group shadow-2xl">
                  <h3 className="text-3xl font-black group-hover:text-pink-400 transition-colors uppercase">{module.name}</h3>
                  <span className="text-5xl">{module.icon}</span>
               </div>
             ))}
           </div>
        </div>
      )}
    </main>
  );
}