"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (screen === 'splash') setTimeout(() => setScreen('auth'), 2000);
  }, [screen]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) setBalance(docSnap.data().balance);
          else {
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500 });
            setBalance(500);
          }
        });
        setScreen('hub');
      } else { setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  const handlePurchase = () => {
    window.open("https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174", '_blank');
  };

  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="w-24 h-24 border-4 border-cyan-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_40px_#06b6d4]">
          <span className="text-5xl font-black italic">AJ</span>
        </div>
      </main>
    );
  }

  if (screen === 'auth' && !user) {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
        <h2 className="text-6xl font-black mb-8 italic uppercase text-cyan-400">AJ <span className="text-white">ID</span></h2>
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full max-w-sm py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-all shadow-xl">
            CONTINUE WITH GOOGLE
        </button>
        <p className="mt-8 text-yellow-500 font-bold uppercase tracking-widest">+500 COINS BONUS</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div className="bg-white/5 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
            <span className="text-xs font-black text-yellow-500">{balance} COINS</span>
            <span className="text-[10px] text-green-400 font-bold">${(balance/100).toFixed(2)}</span>
          </div>
          {user && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500"><LogOut size={16} /></button>
        </div>
      </header>

      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-10">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl">
            <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <h2 className="font-black text-xs md:text-2xl uppercase">Gaming</h2>
          </div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl">
            <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <h2 className="font-black text-xs md:text-2xl uppercase">Social</h2>
          </div>
          <div onClick={handlePurchase} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xl">
            <img src="/gold.jpg" className="w-12 h-12 md:w-40 md:h-40 object-contain mb-2" alt="W" />
            <h2 className="font-black text-xs md:text-2xl uppercase text-yellow-500">Wallet</h2>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl">
            <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <h2 className="font-black text-xs md:text-2xl uppercase">AJ AI</h2>
          </div>
        </div>
      </section>

      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" alt="F" className="w-full max-w-4xl h-auto rounded-3xl shadow-2xl" />
      </section>

      <footer className="bg-black py-20 px-8 border-t border-white/10 text-center">
        <div className="text-6xl md:text-9xl font-black italic text-white opacity-20 mb-10">AJ STUDIO</div>
        <div className="flex justify-center gap-10">
           <a href="https://wa.me/96878994093" target="_blank" className="text-green-500"><MessageCircle size={40}/></a>
           <a href="https://x.com/Ali20352061" target="_blank" className="text-white text-3xl font-black">X</a>
        </div>
      </footer>

      {screen === 'social' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold mb-12">← Back</button>
           <h2 className="text-5xl font-black mb-16 uppercase text-white">AJ SOCIAL</h2>
           <div className="flex flex-col gap-6 w-full max-w-md">
             {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
               <div key={module} className="flex items-center justify-between bg-white/5 border border-white/10 p-8 rounded-3xl hover:border-pink-500 cursor-pointer">
                  <h3 className="text-2xl font-black uppercase">{module}</h3>
                  <span className="text-4xl">{i === 0 ? '🚀' : i === 1 ? '⚡' : '🔴'}</span>
               </div>
             ))}
           </div>
        </div>
      )}
    </main>
  );
}