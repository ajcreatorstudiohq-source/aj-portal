"use client";
import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);

  // 1. Splash Screen Timer
  useEffect(() => {
    if (screen === 'splash') setTimeout(() => setScreen('auth'), 2000);
  }, [screen]);

  // 2. Persistent Auth Check (Login/Logout Logic)
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

  // 3. Login with Google (Forces account selection)
  const handleLogin = async () => {
    try {
      // Force user to pick an account (To allow changing Gmail)
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.error("Login Error", e.message);
    }
  };

  // 4. Logout Function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setScreen('auth');
    } catch (e: any) {
      console.error("Logout Error", e.message);
    }
  };

  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-white font-sans">
        <div className="text-center animate-pulse">
          <div className="w-24 h-24 border-4 border-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_#06b6d4]">
            <span className="text-5xl font-black italic">AJ</span>
          </div>
          <h1 className="text-2xl font-black tracking-[0.5em]">WELCOME</h1>
        </div>
      </main>
    );
  }

  if (screen === 'auth' && !user) {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3.5rem] shadow-2xl">
          <h2 className="text-6xl font-black mb-2 italic text-white uppercase">AJ <span className="text-cyan-400 font-thin">ID</span></h2>
          <p className="text-gray-500 mb-12 text-sm tracking-widest uppercase">Digital Access Portal</p>
          
          <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-xl">
            CONTINUE WITH GOOGLE
          </button>
          
          <div className="mt-8 text-yellow-500 font-bold text-xs animate-bounce uppercase">
            +500 AJ COINS BONUS ON SIGNUP
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* 5. VVIP HEADER (WITH LOGOUT OPTION) */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic tracking-tighter text-cyan-400">AJ STUDIO</div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg">
            <div className="text-right leading-none">
               <p className="text-[7px] text-gray-500 uppercase font-bold tracking-widest">Balance</p>
               <p className="text-xs font-black text-yellow-500">{balance} COINS</p>
            </div>
            <img src={user?.photoURL} className="w-8 h-8 rounded-full border-2 border-cyan-500" alt="user" />
          </div>
          
          {/* LOGOUT BUTTON */}
          <button onClick={handleLogout} className="p-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg">
             <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* 6. MAIN HUB */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative pt-24">
        <h1 className="relative z-10 text-5xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="relative z-20 grid grid-cols-2 gap-4 md:gap-24 w-full max-w-5xl px-2">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Trophy className="mb-2 text-cyan-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Gaming</h2>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Zap className="mb-2 text-pink-500 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Social</h2>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <img src="/gold.jpg" alt="Wallet" className="w-12 h-12 md:w-40 md:h-40 object-contain mb-2" />
            <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Bot className="mb-2 text-green-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">AJ AI</h2>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-40">
            <div className="w-24 h-24 md:w-80 md:h-80 bg-black border-2 md:border-8 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.6)]">
              <span className="text-[8px] md:text-7xl font-black text-white italic">HUB</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" alt="Founder" className="w-full max-w-4xl h-auto rounded-3xl shadow-2xl border border-white/10" />
      </section>

      <footer className="bg-black py-20 px-8 border-t border-cyan-500/10 text-center">
        <div className="text-7xl md:text-9xl font-black italic tracking-tighter text-white opacity-20">AJ STUDIO</div>
        <div className="flex justify-center gap-12 mt-12">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 active:scale-150 transition-all"><MessageCircle size={50}/></a>
            <a href="https://www.instagram.com/innocent.a.jutt" target="_blank" className="text-pink-500 active:scale-150 transition-all"><Globe size={50}/></a>
        </div>
        <p className="mt-16 text-gray-700 font-black tracking-[1.5em] text-[10px] uppercase">Muscat, Sultanate of Oman</p>
      </footer>
    </main>
  );
}