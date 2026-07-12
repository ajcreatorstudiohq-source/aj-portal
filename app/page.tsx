"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc } from 'firebase/firestore';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main'); 
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [loading, setLoading] = useState(0);

  // Input States
  const [purchaseAmount, setPurchaseAmount] = useState(5);
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutId, setPayoutId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');

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
          } else {
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', uid: currentUser.uid });
          }
        });
        setScreen('hub');
      } else { setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  };

  const handlePurchase = () => {
    const usdAmount = (purchaseAmount * 2.60).toFixed(2);
    window.open(`https://nowpayments.io/payment/?api_key=3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7&amount=${usdAmount}&currency=usd&order_id=${user?.uid}_${Date.now()}`, '_blank');
  };

  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Min 2,500 Coins required!");
    let details = payoutMethod.includes('Visa') ? `Card: ${cardNumber} | Name: ${cardName}` : payoutId;
    if (!details) return alert("Please fill details!");
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, email: user.email, amount: balance, method: payoutMethod, details: details, status: "pending", date: new Date() });
    alert("✅ Request Sent to CEO Ali!");
    setWalletTab('main');
  };

  const activateBot = async (tier: string, cost: number) => {
    if (balance < cost) return alert(`⚠️ Need ${cost} Coins!`);
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier });
    alert("🚀 BOT ACTIVE!");
  };

  if (screen === 'splash') return <main className="h-screen bg-black flex items-center justify-center text-white text-5xl font-black italic animate-pulse">AJ PORTAL</main>;

  if (screen === 'auth' && !user) return (
    <main className="h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <h2 className="text-7xl font-black mb-8 italic text-cyan-400">AJ ID</h2>
      <button onClick={handleLogin} className="w-full max-w-sm py-5 bg-white text-black font-black text-xl rounded-2xl">CONTINUE WITH GOOGLE</button>
      <p className="mt-8 text-yellow-500 font-bold tracking-widest">+500 COINS BONUS</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer shadow-lg">
           <div className="text-right leading-none">
              <p className="text-xs font-black text-yellow-500">{balance} 🪙</p>
              <p className="text-[10px] text-green-400 font-bold">${usdtValue} USDT</p>
           </div>
           {user && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
        </div>
      </header>

      {/* DASHBOARD */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          <div className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex items-center justify-center font-black text-cyan-400 text-xl shadow-xl">GAMING</div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex items-center justify-center font-black text-pink-400 text-xl shadow-xl cursor-pointer">SOCIAL</div>
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl">
             <img src="/gold.jpg" className="w-14 h-14 mb-2" />
             <span className="font-black text-yellow-500">WALLET</span>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex items-center justify-center font-black text-green-400 text-xl shadow-xl cursor-pointer">AJ AI</div>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-40">
            <div className="w-20 h-20 md:w-80 md:h-80 bg-black border-2 md:border-8 border-cyan-500 rounded-full flex items-center justify-center">
              <span className="text-6xl font-black italic">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER */}
      <section className="py-20 bg-black flex justify-center px-4"><img src="/founder_card.jpg" className="w-full max-w-4xl rounded-3xl" /></section>

      {/* FOOTER */}
      <footer className="bg-black py-24 text-center border-t border-white/5">
        <div className="text-7xl md:text-9xl font-black italic text-white opacity-20 drop-shadow-[0_0_20px_#06b6d4] mb-10">AJ STUDIO</div>
        <div className="flex justify-center gap-10">
            <a href="https://wa.me/96878994093" className="text-green-500 font-bold border border-green-500 px-6 py-2 rounded-full">WHATSAPP</a>
            <a href="https://x.com/Ali20352061" className="text-white font-bold border border-white px-6 py-2 rounded-full font-mono">X / TWITTER</a>
        </div>
      </footer>

      {/* WALLET MODAL */}
      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[200] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 mb-8">← BACK</button>
           <div className="w-full max-w-md bg-white/5 border border-white/10 p-10 rounded-3xl text-center">
              <h2 className="text-5xl font-black text-yellow-500 mb-8">{balance} 🪙</h2>
              {walletTab === 'main' && (
                <div className="flex flex-col gap-4">
                   <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-black">PURCHASE</button>
                   <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-xl font-black border border-pink-500/30">WITHDRAW</button>
                </div>
              )}
              {walletTab === 'purchase' && (
                <div className="flex flex-col gap-4">
                   <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="bg-black border border-white/20 p-4 rounded-xl text-center text-3xl font-black" />
                   <button onClick={handlePurchase} className="bg-cyan-500 py-4 rounded-xl font-black uppercase">Pay {purchaseAmount} OMR</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs">BACK</button>
                </div>
              )}
              {walletTab === 'withdraw' && (
                <div className="flex flex-col gap-4">
                   <select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 border border-white/20 p-4 rounded-xl text-white font-bold">
                      <option>Binance Pay (USDT)</option>
                      <option>EasyPaisa (PKR)</option>
                      <option>JazzCash (PKR)</option>
                      <option>Visa Transfer (Global)</option>
                   </select>
                   {payoutMethod.includes('Visa') ? (
                     <>
                       <input type="text" placeholder="Card Name" onChange={(e)=>setCardName(e.target.value)} className="bg-black border p-4 rounded-xl text-center" />
                       <input type="text" placeholder="Card Number" onChange={(e)=>setCardNumber(e.target.value)} className="bg-black border p-4 rounded-xl text-center" />
                     </>
                   ) : <input type="text" placeholder="Wallet ID / Number" onChange={(e)=>setPayoutId(e.target.value)} className="bg-black border p-4 rounded-xl text-center" />}
                   <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-black">REQUEST PAYOUT</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs">BACK</button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* AI BOT MODAL */}
      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-green-400 mb-8">← BACK</button>
           <h2 className="text-4xl font-black mb-12 italic uppercase">AJ AI <span className="text-green-500">BOT</span></h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
              <div className="bg-white/5 border border-white/10 p-10 rounded-3xl text-center">
                 <h3 className="text-xl font-black uppercase">Basic Bot</h3>
                 <p className="text-green-400 font-bold">+2% Daily Profit</p>
                 <p className="text-2xl font-black my-4">2,500 Coins</p>
                 <button onClick={() => activateBot('basic', 2500)} className="w-full py-3 bg-cyan-600 rounded-xl font-black">ACTIVATE</button>
              </div>
              <div className="bg-white/5 border-2 border-yellow-500/30 p-10 rounded-3xl text-center shadow-2xl">
                 <h3 className="text-xl font-black uppercase">VVIP Bot</h3>
                 <p className="text-yellow-400 font-bold">+5% Daily Profit</p>
                 <p className="text-2xl font-black my-4">7,500 Coins</p>
                 <button onClick={() => activateBot('vvip', 7500)} className="w-full py-3 bg-yellow-600 text-black rounded-xl font-black">ACTIVATE</button>
              </div>
           </div>
        </div>
      )}
    </main>
  );
}