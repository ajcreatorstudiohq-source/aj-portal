"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

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

  if (screen === 'splash') return <main className="min-h-screen bg-black flex items-center justify-center text-white text-5xl font-black italic">AJ WELCOME</main>;

  if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <h2 className="text-6xl font-black mb-8 italic uppercase text-cyan-400">AJ ID</h2>
      <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full max-w-sm py-5 bg-white text-black font-black text-xl rounded-2xl">CONTINUE WITH GOOGLE</button>
      <p className="mt-8 text-yellow-500 font-bold">+500 COINS BONUS</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans text-center">
      <header className="p-4 flex justify-between items-center border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="font-black italic text-cyan-400 text-2xl">AJ STUDIO</div>
        <div className="flex items-center gap-3">
           <span className="text-yellow-500 font-bold text-sm">{balance} COINS</span>
           {user && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
           <button onClick={() => signOut(auth)} className="text-red-500 font-bold text-xs ml-2">LOGOUT</button>
        </div>
      </header>

      <h1 className="text-4xl md:text-8xl font-black my-16 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>

      <div className="grid grid-cols-2 gap-4 p-4 max-w-4xl mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-2xl h-40 flex items-center justify-center font-black text-cyan-400">GAMING</div>
        <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-2xl h-40 flex items-center justify-center font-black text-pink-400 cursor-pointer">SOCIAL</div>
        <div onClick={() => window.open("https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174", '_blank')} className="bg-white/5 border border-yellow-500/30 rounded-2xl h-40 flex flex-col items-center justify-center cursor-pointer">
           <img src="/gold.jpg" className="w-12 h-12 mb-2" />
           <span className="font-black text-yellow-500">WALLET</span>
        </div>
        <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-2xl h-40 flex items-center justify-center font-black text-green-400 cursor-pointer">AJ AI</div>
      </div>

      <div className="py-20 px-4">
        <img src="/founder_card.jpg" className="w-full max-w-4xl mx-auto rounded-3xl" />
      </div>

      {screen === 'social' && (
        <div className="fixed inset-0 z-[200] bg-black p-10 flex flex-col items-center">
            <button onClick={() => setScreen('hub')} className="text-cyan-400 mb-10">← BACK</button>
            <h2 className="text-4xl font-black mb-10">AJ SOCIAL</h2>
            <div className="flex flex-col gap-4 w-full max-w-md">
                <div className="bg-white/5 p-8 rounded-2xl font-bold">TIKREELS 🚀</div>
                <div className="bg-white/5 p-8 rounded-2xl font-bold">PULSE ⚡</div>
                <div className="bg-white/5 p-8 rounded-2xl font-bold">LIVE CHAT 🔴</div>
            </div>
        </div>
      )}

      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black p-10 flex flex-col items-center">
            <button onClick={() => setScreen('hub')} className="text-cyan-400 mb-10">← BACK</button>
            <h2 className="text-4xl font-black mb-10">AI BOT</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                <div className="bg-white/5 p-10 rounded-3xl border border-cyan-500">BASIC (+2% Daily)</div>
                <div className="bg-white/5 p-10 rounded-3xl border border-yellow-500">VVIP (+5% Daily)</div>
            </div>
        </div>
      )}

      <footer className="py-20 bg-black border-t border-white/10">
        <h2 className="text-5xl font-black italic opacity-20 mb-8 uppercase">AJ STUDIO</h2>
        <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 font-black border-2 border-green-500 px-8 py-3 rounded-full">WHATSAPP</a>
      </footer>
    </main>
  );
}