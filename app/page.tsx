"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, getDoc } from 'firebase/firestore';
import { Trophy, Wallet } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main'); 
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(0);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  // Input States
  const [purchaseAmount, setPurchaseAmount] = useState(20); 
  const usdtValue = (balance / 100).toFixed(2);

  // SDK Coin Sync
  useEffect(() => {
    const handleBalanceUpdate = async (e: any) => {
      if(!user) return;
      const { amount } = e.detail;
      await updateDoc(doc(db, "users", user.uid), { balance: increment(amount) });
      alert(`Coins added: ${amount}`);
    };
    window.addEventListener('updateFirebaseBalance', handleBalanceUpdate as any);
    return () => window.removeEventListener('updateFirebaseBalance', handleBalanceUpdate as any);
  }, [user]);

  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => { setLoading(prev => (prev >= 100 ? 100 : prev + 10)); }, 50);
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
            setBalance(docSnap.data().balance || 0);
          } else {
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, uid: currentUser.uid });
          }
        });
        setScreen('hub');
      } else { setUser(null); setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  };

  const handlePurchase = () => {
    window.open("https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174", '_blank');
  };

  if (screen === 'splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-32 h-32 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8">
        <img src="/logo.jpg" className="w-full h-full object-cover" alt="Logo" />
      </div>
      <h1 className="text-3xl font-black uppercase animate-pulse">AJ PORTAL</h1>
    </main>
  );

  if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 italic text-cyan-400 uppercase">AJ ID</h2>
        <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold">+500 COINS BONUS</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div onClick={() => setScreen('wallet')} className="bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer">
            <span className="text-xs font-black text-yellow-500">{balance} 🪙</span>
        </div>
        <button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500 font-bold text-[8px] px-2">EXIT</button>
      </header>

      {screen === 'hub' && (
        <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
          <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase">AJ SUPER PORTAL</h1>
          <div className="grid grid-cols-2 gap-4 w-full max-w-4xl z-30">
            <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 flex flex-col items-center justify-center active:scale-95 cursor-pointer">
               <Trophy className="text-cyan-400 w-10 h-10 mb-2" />
               <span className="font-black text-xs uppercase">Gaming</span>
            </div>
            <div onClick={() => setScreen('wallet')} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl h-48 flex flex-col items-center justify-center cursor-pointer">
               <Wallet className="text-yellow-500 w-10 h-10 mb-2" />
               <span className="font-black text-xs uppercase text-yellow-500">Wallet</span>
            </div>
          </div>
        </section>
      )}

      {screen === 'arcade' && (
        <div className="fixed inset-0 z-[300] bg-black p-8 overflow-y-auto">
            <button onClick={() => {setScreen('hub'); setSelectedGame(null)}} className="text-cyan-400 font-bold mb-10 uppercase">← BACK</button>
            {!selectedGame ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20">
                {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike'].map((game) => (
                  <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center cursor-pointer">
                    <h3 className="font-black text-sm uppercase">{game}</h3>
                    <button className="mt-4 bg-cyan-500 text-black text-[10px] font-black px-4 py-2 rounded-full">PLAY NOW</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-[80vh] bg-black rounded-3xl border-2 border-cyan-500 overflow-hidden">
                 <iframe src={`/games/${selectedGame.toLowerCase().replace(' ', '-')}/index.html`} className="w-full h-full border-none" />
              </div>
            )}
        </div>
      )}

      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 mb-8 font-bold">← BACK</button>
           <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center">
              <h2 className="text-5xl font-black text-yellow-500 mb-8">{balance} 🪙</h2>
              {walletTab === 'main' && (
                <div className="flex flex-col gap-4">
                   <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-black uppercase">Buy Coins</button>
                </div>
              )}
              {walletTab === 'purchase' && (
                <div className="flex flex-col gap-5 text-left">
                  <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center">
                    <p className="text-cyan-400 text-xs font-black uppercase">Method: Binance Pay (USDT)</p>
                  </div>
                  <div className="bg-black border-2 border-white/10 p-6 rounded-3xl text-center">
                    <p className="text-yellow-500 text-4xl font-black mb-1">{purchaseAmount * 100} 🪙</p>
                    <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-transparent text-white text-2xl text-center outline-none font-bold" />
                    <p className="text-gray-500 text-[10px] mt-2 font-black uppercase">USD Amount (Min $20)</p>
                  </div>
                  <button onClick={handlePurchase} className="bg-cyan-500 py-4 rounded-xl font-black uppercase">Pay with Binance</button>
                  <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase">Cancel</button>
                </div>
              )}
           </div>
        </div>
      )}
    </main>
  );
}