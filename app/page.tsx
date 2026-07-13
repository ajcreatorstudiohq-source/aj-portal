"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X } from 'lucide-react';

export default function AJSuperPortal() {
const [screen, setScreen] = useState('splash');
const [walletTab, setWalletTab] = useState('main');
const [user, setUser] = useState(null);
const [balance, setBalance] = useState(0);
const [botTier, setBotTier] = useState('none');
const [invested, setInvested] = useState(0);
const [loading, setLoading] = useState(0);
const [selectedGame, setSelectedGame] = useState(null);

// Input States
const [purchaseAmount, setPurchaseAmount] = useState(20);
const [transferId, setTransferId] = useState('');
const [transferAmount, setTransferAmount] = useState(0);
const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
const [payoutId, setPayoutId] = useState('');
const [cardName, setCardName] = useState('');
const [cardNumber, setCardNumber] = useState('');
const usdtValue = (balance / 100).toFixed(2);

// --- SDK MESSAGE LISTENER (The Profit Engine) ---
useEffect(() => {
const handleSDKMessages = async (event) => {
if (!user) return;
const data = event.detail || event.data;
if (!data) return;
const { type, amount, coins, profit } = data;

if (type === 'EARNED' || type === "ADD_AD_REVENUE" || type === "SYNC_GAME_COINS") {
    const reward = amount || coins;
    if(!reward) return;
    const userRef = doc(db, "users", user.uid);
    const adminRef = doc(db, "admin_ledger", "platform_stats");

    await updateDoc(userRef, { balance: increment(reward) });
    if (profit) {
      await updateDoc(adminRef, { total_locked_profit: increment(profit) });
    }
  }
};
window.addEventListener("message", handleSDKMessages);
window.addEventListener('updateFirebaseBalance', handleSDKMessages);
return () => {
    window.removeEventListener("message", handleSDKMessages);
    window.removeEventListener('updateFirebaseBalance', handleSDKMessages);
};
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
setBotTier(docSnap.data().botTier || 'none');
setInvested(docSnap.data().invested || 0);
} else {
setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, uid: currentUser.uid });
}
});
setScreen('hub');
} else { setUser(null); setScreen('auth'); }
});
return () => unsubscribe();
}, []);

const handleLogin = async () => {
googleProvider.setCustomParameters({ prompt: 'select_account' });
await setPersistence(auth, browserLocalPersistence);
await signInWithPopup(auth, googleProvider);
};

// --- PAYMENT FIX ---
const handlePurchase = async () => {
  try {
    const res = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: { 'x-api-key': '3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7', 'Content-Type': 'application/json' },
      body: JSON.stringify({ price_amount: purchaseAmount, price_currency: "usd", pay_currency: "usdttrc20", order_id: `AJ_${Date.now()}` })
    });
    const data = await res.json();
    if (data.invoice_url) window.open(data.invoice_url, '_blank');
  } catch (e) { alert("Payment API Error"); }
};

const handleTransfer = async () => {
if (transferAmount <= 0 || transferAmount > balance) return alert("Invalid Amount!");
const recipientRef = doc(db, "users", transferId);
const recipientSnap = await getDoc(recipientRef);
if (recipientSnap.exists()) {
await updateDoc(doc(db, "users", user.uid), { balance: increment(-transferAmount) });
await updateDoc(recipientRef, { balance: increment(transferAmount) });
alert("✅ Success!"); setWalletTab('main');
} else { alert("ID Not Found!"); }
};

const handleWithdraw = async () => {
if (balance < 2500) return alert("Min 2,500 Coins!");
let details = payoutMethod.includes('Visa') ? `Name: ${cardName} | Card: ${cardNumber}` : payoutId;
await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, amount: balance, method: payoutMethod, details: details, status: "pending", date: new Date() });
alert("✅ Request Sent!"); setWalletTab('main');
};

const activateBot = async (tier, cost) => {
if (balance < cost) return alert(`⚠️ Need ${cost} Coins!`);
await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost });
alert("🚀 BOT ACTIVE!");
};

if (screen === 'splash') return (
<main className="h-screen bg-black flex flex-col items-center justify-center text-white">
<div className="w-32 h-32 md:w-56 md:h-56 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8">
<img src="/logo.jpg" className="w-full h-full object-cover" alt="Logo" />
</div>
<h1 className="text-3xl font-black tracking-widest uppercase animate-pulse">AJ PORTAL</h1>
</main>
);

if (screen === 'auth' && !user) return (
<main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
<div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
<h2 className="text-6xl font-black mb-10 italic text-cyan-400 uppercase">AJ <span className="text-white">ID</span></h2>
<button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95">CONTINUE WITH GOOGLE</button>
<p className="mt-8 text-yellow-500 font-bold tracking-widest">+500 COINS BONUS</p>
</div>
</main>
);

return (
<main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
<header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
<div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
<div className="flex items-center gap-3">
<div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg cursor-pointer">
<span className="text-xs font-black text-yellow-500">{balance} 🪙</span>
<span className="text-[10px] text-green-400 font-bold">${usdtValue}</span>
{user && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
</div>
<button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500 font-bold text-[8px] px-2">EXIT</button>
</div>
</header>

<section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
    <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
    <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
      <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer">
         <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase">Gaming</span>
      </div>
      <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl relative z-50 cursor-pointer">
         <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase">Social</span>
      </div>
      <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl relative z-30">
         <img src="/gold.jpg" className="w-14 h-14 mb-2" /><h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
      </div>
      <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
         <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase">AJ AI</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-24 h-24 md:w-96 md:h-96 bg-black border-4 md:border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden">
           <img src="/logo.jpg" className="w-full h-full object-cover opacity-60 animate-pulse" alt="Logo" />
        </div>
      </div>
    </div>
  </section>

  {screen === 'arcade' && (
    <div className="fixed inset-0 z-[300] bg-black p-8 overflow-y-auto">
        <button onClick={() => {setScreen('hub'); setSelectedGame(null)}} className="text-cyan-400 font-bold mb-10 tracking-widest uppercase">← BACK TO HUB</button>
        {!selectedGame ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20">
            {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape', 'Ludo', 'Air Hockey'].map((game) => (
              <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center hover:border-cyan-400 cursor-pointer transition-all">
                {/* POSTER FIX: USING LOGO.PNG */}
                <img src="/logo.png" className="w-full aspect-video rounded-xl mb-4 object-cover" alt="Poster" />
                <h3 className="font-black text-sm uppercase">{game}</h3>
                <button className="mt-4 bg-cyan-500 text-black text-[10px] font-black px-4 py-2 rounded-full">PLAY NOW</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-[80vh] bg-black rounded-3xl border-2 border-cyan-500 overflow-hidden relative shadow-[0_0_50px_rgba(6,182,212,0.3)]">
             <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-full border-none" title="Game" />
          </div>
        )}
    </div>
  )}

  {screen === 'wallet' && (
    <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
       <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 mb-8 font-bold">← BACK</button>
       <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
          <h2 className="text-5xl font-black text-yellow-500 mb-8">{balance} 🪙</h2>
          {walletTab === 'main' && (
            <div className="flex flex-col gap-4">
               <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-black uppercase">Purchase</button>
               <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-xl font-black border border-cyan-500/30 uppercase">Transfer</button>
               <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-xl font-black border border-pink-500/30 uppercase">Withdraw</button>
            </div>
          )}
          {walletTab === 'purchase' && (
            <div className="flex flex-col gap-5 text-left">
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center">
                <p className="text-cyan-400 text-xs font-black uppercase tracking-widest">Method: Binance Pay (USDT)</p>
              </div>
              <div className="bg-black border-2 border-white/10 p-6 rounded-3xl text-center">
                <p className="text-yellow-500 text-4xl font-black mb-1">{purchaseAmount * 100} 🪙</p>
                <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-transparent text-white text-2xl text-center outline-none font-bold" />
                <p className="text-gray-500 text-[10px] mt-2 font-black uppercase">Enter USD (Min $20)</p>
              </div>
              <button onClick={handlePurchase} className="bg-cyan-500 py-4 rounded-xl font-black uppercase shadow-[0_0_20px_rgba(6,182,212,0.4)]">Pay Now</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase">Cancel</button>
            </div>
          )}
          {walletTab === 'transfer' && (
            <div className="flex flex-col gap-4 text-left"><div className="mb-4 p-4 bg-black border border-dashed border-white/20 rounded-xl text-center"><p className="text-[10px] text-gray-500 uppercase font-black mb-1">Your ID:</p><p className="text-cyan-400 font-mono text-xs break-all font-bold">{user?.uid}</p></div><input type="text" placeholder="Recipient ID" onChange={(e)=>setTransferId(e.target.value)} className="bg-black border p-4 rounded-xl text-center text-white outline-none" /><input type="number" placeholder="Amount" onChange={(e)=>setTransferAmount(Number(e.target.value))} className="bg-black border p-4 rounded-xl text-center text-white outline-none" /><button onClick={handleTransfer} className="bg-cyan-600 py-4 rounded-xl font-black uppercase">Send Now</button><button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase">Back</button></div>
          )}
          {walletTab === 'withdraw' && (
            <div className="flex flex-col gap-4 text-left"><select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 border border-white/20 p-4 rounded-xl text-white font-bold"><option>Binance Pay (USDT)</option><option>EasyPaisa (PKR)</option><option>JazzCash (PKR)</option><option>Visa Transfer (Global)</option></select>{payoutMethod.includes('Visa') ? (<><input type="text" placeholder="Card Name" onChange={(e)=>setCardName(e.target.value)} className="bg-black border p-4 rounded-xl text-white text-center" /><input type="text" placeholder="Card Number" onChange={(e)=>setCardNumber(e.target.value)} className="bg-black border p-4 rounded-xl text-white text-center" /></>) : <input type="text" placeholder="ID / Number" onChange={(e)=>setPayoutId(e.target.value)} className="bg-black border p-4 rounded-xl text-white text-center" />}<button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-black uppercase">Request Payout</button><button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase tracking-widest">Back</button></div>
          )}
       </div>
    </div>
  )}

  {screen === 'ai' && (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-right">
       <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-sm mb-12 uppercase">← Back</button>
       <h2 className="text-5xl font-black mb-12 text-center uppercase text-white italic">AJ AI BOT</h2>
       {botTier === 'none' ? (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-2">
            <div onClick={() => activateBot('basic', 2500)} className="bg-white/5 border border-white/10 p-10 rounded-3xl text-center hover:border-cyan-500 cursor-pointer"><h3 className="text-xl font-black text-cyan-400 uppercase">Basic (+2% Daily)</h3><p className="text-3xl font-black text-white my-6">2,500 Coins</p><button className="w-full py-4 bg-cyan-600 rounded-xl font-black uppercase">Activate</button></div>
            <div onClick={() => activateBot('vvip', 7500)} className="bg-white/5 border-2 border-yellow-500/30 p-10 rounded-3xl text-center shadow-2xl hover:border-yellow-500 cursor-pointer"><h3 className="text-xl font-black text-yellow-500 uppercase">VVIP (+5% Daily)</h3><p className="text-3xl font-black text-white my-6">7,500 Coins</p><button className="w-full py-4 bg-yellow-600 rounded-xl font-black text-black uppercase">Activate</button></div>
         </div>
       ) : (
         <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-16 rounded-[4rem] text-center"><Activity size={80} className="mx-auto mb-10 text-green-500 animate-pulse" /><h2 className="text-5xl font-black uppercase text-white mb-8">{botTier.toUpperCase()} BOT ACTIVE</h2><div className="mt-12 bg-green-500/20 py-5 rounded-2xl border border-green-500/50"><TrendingUp size={24} className="text-green-400 mx-auto" /><span className="font-black text-xl text-green-400 uppercase tracking-tighter">AI TRADING LIVE...</span></div></div>
       )}
    </div>
  )}

  {screen === 'social' && (
    <div className="fixed inset-0 z-[200] bg-black p-10 flex flex-col items-center overflow-y-auto">
        <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold mb-10 text-xl uppercase">← Back</button>
        <h2 className="text-5xl font-black mb-12 uppercase text-white tracking-widest text-center">AJ SOCIAL</h2>
        <div className="flex flex-col gap-6 w-full max-w-md">
            {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module) => (
               <div key={module} onClick={() => alert(`${module} starting in Month 2!`)} className="bg-white/5 border border-white/10 p-10 rounded-[2rem] hover:border-pink-500 cursor-pointer text-center transition-all">
                  <h3 className="text-2xl font-black text-white uppercase italic">{module}</h3>
               </div>
            ))}
        </div>
    </div>
  )}

  <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5"><img src="/founder_card.jpg" className="w-full max-w-4xl rounded-3xl shadow-2xl" /></section>
  
  <footer className="bg-black py-24 px-10 border-t border-cyan-500/10 text-center">
    <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_30px_#06b6d4] mb-12 uppercase">AJ STUDIO</div>
    <div className="flex justify-center gap-10">
        <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold uppercase tracking-widest">Whatsapp</a>
        <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold uppercase tracking-widest">X (Twitter)</a>
    </div>
  </footer>
</main>
);
}