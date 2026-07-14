"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X, CheckCircle2, Download } from 'lucide-react';
import emailjs from 'emailjs-com';

// --- EMAILJS CONFIG ---
const EMAILJS_CONFIG = {
  Service_ID: "service_6w1sols",
  Template_ID: "template_o1c40nv",
  Public_Key: "6JCPm9fo38ovnA5LG"
};

export default function AJSuperPortal() {
const [screen, setScreen] = useState('splash');
const [walletTab, setWalletTab] = useState('main');
const [user, setUser] = useState(null);
const [balance, setBalance] = useState(0);
const [botTier, setBotTier] = useState('none');
const [invested, setInvested] = useState(0);
const [loading, setLoading] = useState(0);
const [selectedGame, setSelectedGame] = useState(null);
const [deferredPrompt, setDeferredPrompt] = useState(null);

// --- AI TRADING STATES ---
const [visualProfit, setVisualProfit] = useState(0);
const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility...", "Connecting to AJ liquidity pool..."]);

// Input States
const [purchaseAmount, setPurchaseAmount] = useState(20);
const [transferId, setTransferId] = useState('');
const [transferAmount, setTransferAmount] = useState(0);
const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
const [payoutId, setPayoutId] = useState('');
const [cardName, setCardName] = useState('');
const [cardNumber, setCardNumber] = useState('');

const displayBalance = (balance + visualProfit).toFixed(2);
const displayUsdt = ((balance + visualProfit) / 100).toFixed(2);

// --- EMAILJS HELPER ---
const sendEmailAlert = (type, details) => {
  const params = {
    to_name: "AJ Admin",
    from_name: user?.displayName || "User",
    message: `${type}: ${details}`,
    user_email: user?.email || "N/A"
  };
  emailjs.send(EMAILJS_CONFIG.Service_ID, EMAILJS_CONFIG.Template_ID, params, EMAILJS_CONFIG.Public_Key);
};

// --- PWA INSTALL LOGIC ---
useEffect(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setDeferredPrompt(e);
  });
}, []);

const handleInstallPWA = () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') setDeferredPrompt(null);
    });
  }
};

// --- SDK MESSAGE LISTENER (70/30 & 60/40 SPLITS) ---
useEffect(() => {
const handleSDKMessages = async (event) => {
if (!user) return;
const data = event.detail || event.data;
if (!data) return;
const { type, amount, coins } = data;

if (type === 'EARNED' || type === "ADD_AD_REVENUE" || type === "SYNC_GAME_COINS") {
    const rawReward = amount || coins;
    if(!rawReward) return;
    const userShare = rawReward * 0.30;
    const adminShare = rawReward * 0.70;
    const userRef = doc(db, "users", user.uid);
    const adminRef = doc(db, "admin_ledger", "platform_stats");
    await updateDoc(userRef, { balance: increment(userShare) });
    await updateDoc(adminRef, { total_revenue: increment(adminShare) });
}

if (type === 'GIFT_RECEIVED') {
    const rawGift = amount || coins;
    const userShare = rawGift * 0.60;
    const adminShare = rawGift * 0.40;
    await updateDoc(doc(db, "users", user.uid), { balance: increment(userShare) });
    await updateDoc(doc(db, "admin_ledger", "platform_stats"), { total_gift_tax: increment(adminShare) });
}
};
window.addEventListener("message", handleSDKMessages);
return () => window.removeEventListener("message", handleSDKMessages);
}, [user]);

// --- AI REAL-TIME & OFFLINE SYNC ---
useEffect(() => {
  let logInt, visualInt, dbSyncInt;
  if (user && botTier !== 'none' && invested > 0) {
    logInt = setInterval(() => {
      const actions = ["Analysing Market", "Scalping Assets", "Hedging Risks", "Neural Execution"];
      const newLog = `[${new Date().toLocaleTimeString()}] ${actions[Math.floor(Math.random()*4)]}...`;
      setTradeLogs(prev => [newLog, ...prev.slice(0, 4)]);
    }, 5000);

    const dailyRate = botTier === 'vvip' ? 0.05 : 0.02;
    const profitPerSec = (invested * dailyRate) / 86400;

    visualInt = setInterval(() => setVisualProfit(prev => prev + profitPerSec), 1000);

    dbSyncInt = setInterval(async () => {
      setVisualProfit(currentProfit => {
        if (currentProfit >= 1) {
          const syncAmount = Math.floor(currentProfit);
          updateDoc(doc(db, "users", user.uid), { balance: increment(syncAmount), lastSync: serverTimestamp() });
          return currentProfit - syncAmount;
        }
        return currentProfit;
      });
    }, 900000); // 15 Min Sync
  }
  return () => { clearInterval(logInt); clearInterval(visualInt); clearInterval(dbSyncInt); };
}, [user, botTier, invested]);

useEffect(() => {
if (screen === 'splash') {
setTimeout(() => setScreen('auth'), 2000);
}
}, [screen]);

useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
if (currentUser) {
setUser(currentUser);
const userRef = doc(db, "users", currentUser.uid);
const userSnap = await getDoc(userRef);

if (userSnap.exists()) {
  const data = userSnap.data();
  if (data.botTier !== 'none' && data.lastSync) {
    const lastSyncTime = data.lastSync.toDate().getTime();
    const secPassed = (new Date().getTime() - lastSyncTime) / 1000;
    const rate = data.botTier === 'vvip' ? 0.05 : 0.02;
    const offlineProfit = (data.invested * rate * secPassed) / 86400;
    if(offlineProfit > 1) {
      await updateDoc(userRef, { balance: increment(offlineProfit), lastSync: serverTimestamp() });
    }
  }
} else {
  await setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, uid: currentUser.uid, lastSync: serverTimestamp() });
}

onSnapshot(userRef, (docSnap) => {
  if (docSnap.exists()) {
    setBalance(docSnap.data().balance || 0);
    setBotTier(docSnap.data().botTier || 'none');
    setInvested(docSnap.data().invested || 0);
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

const handleWithdraw = async () => {
if (balance < 2500) return alert("Min 2,500 Coins!");
let details = payoutMethod.includes('Visa') ? `Card: ${cardNumber}` : payoutId;
await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, amount: balance, method: payoutMethod, details: details, status: "pending", date: new Date() });
sendEmailAlert("WITHDRAWAL", `${user.email} requested ${balance} Coins via ${payoutMethod}`);
alert("✅ Request Sent!"); setWalletTab('main');
};

const activateBot = async (tier, cost) => {
if (balance < cost) return alert(`⚠️ Need ${cost} Coins!`);
await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost, lastSync: serverTimestamp() });
setVisualProfit(0);
sendEmailAlert("BOT_PURCHASE", `${user.email} activated ${tier.toUpperCase()}`);
alert(`🚀 ${tier.toUpperCase()} BOT ACTIVATED!`);
};

if (screen === 'splash') return (
<main className="h-screen bg-black flex flex-col items-center justify-center text-white text-center p-6">
<div className="w-40 h-40 md:w-56 md:h-56 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8">
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
<span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
<span className="text-[10px] text-green-400 font-bold">${displayUsdt}</span>
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
              <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center hover:border-cyan-400 cursor-pointer transition-all">
                {/* 512x512 Poster size fix */}
                <img src={`/games/${game.toLowerCase().replace(/ /g, '-')}/logo.png`} className="w-full aspect-square rounded-2xl mb-4 object-cover" alt={game} onError={(e) => { e.target.src = "/logo.jpg"; }} />
                <h3 className="font-black text-xs uppercase">{game}</h3>
                <button className="mt-3 bg-cyan-500 text-black text-[10px] font-black px-4 py-2 rounded-full">PLAY</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-[80vh] bg-black rounded-3xl border-2 border-cyan-500 overflow-hidden relative">
             <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-full border-none" title="Game" />
          </div>
        )}
    </div>
)}

{screen === 'wallet' && (
    <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
       <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 mb-8 font-bold">← BACK</button>
       <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
          <h2 className="text-5xl font-black text-yellow-500 mb-8">{displayBalance} 🪙</h2>
          {walletTab === 'main' && (
            <div className="flex flex-col gap-4">
               <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-black uppercase">Purchase</button>
               <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-xl font-black border border-cyan-500/30 uppercase">Transfer</button>
               <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-xl font-black border border-pink-500/30 uppercase">Withdraw</button>
            </div>
          )}
          {walletTab === 'purchase' && (
            <div className="flex flex-col gap-5 text-left">
              <div className="bg-black border-2 border-white/10 p-6 rounded-3xl text-center">
                <p className="text-yellow-500 text-4xl font-black mb-1">{(purchaseAmount * 100)} 🪙</p>
                <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-transparent text-white text-2xl text-center outline-none font-bold" />
              </div>
              <button onClick={() => window.open('https://nowpayments.io', '_blank')} className="bg-cyan-500 py-4 rounded-xl font-black uppercase">Pay Now</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center">Cancel</button>
            </div>
          )}
          {walletTab === 'withdraw' && (
            <div className="flex flex-col gap-4 text-left">
              <select onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 p-4 rounded-xl text-white font-bold"><option>Binance Pay (USDT)</option><option>EasyPaisa (PKR)</option></select>
              <input type="text" placeholder="ID / Number" onChange={(e)=>setPayoutId(e.target.value)} className="bg-black border p-4 rounded-xl text-white text-center" />
              <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-black uppercase">Request Payout</button>
            </div>
          )}
       </div>
    </div>
)}

{screen === 'ai' && (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto pb-20">
       <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-sm mb-12 uppercase">← Back</button>
       <h2 className="text-5xl font-black mb-12 text-center uppercase text-white italic">AJ AI BOT</h2>
       {botTier !== 'none' && (
         <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-8 rounded-[3rem] text-center mb-16">
            <Activity size={60} className="mx-auto mb-6 text-green-500 animate-pulse" />
            <h2 className="text-4xl font-black uppercase text-white mb-2">{botTier.toUpperCase()} BOT RUNNING</h2>
            <div className="w-full bg-black/50 border border-green-500/30 p-6 rounded-2xl font-mono text-[10px] text-left">
               <span className="text-white font-black text-lg">PROFIT: +{visualProfit.toFixed(4)} 🪙</span>
               <div className="h-20 overflow-hidden text-green-500/70 mt-2">{tradeLogs.map((log, i) => ( <div key={i}>{log}</div> ))}</div>
            </div>
         </div>
       )}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div className="p-10 rounded-3xl text-center border-2 border-white/10 bg-white/5">
                <h3 className="text-xl font-black text-cyan-400 uppercase">Basic (+2% Daily)</h3>
                <p className="text-3xl font-black text-white my-6">2,500 Coins</p>
                <button onClick={() => activateBot('basic', 2500)} className="w-full py-4 bg-cyan-600 rounded-xl font-black uppercase">Activate</button>
            </div>
            <div className="p-10 rounded-3xl text-center border-2 border-yellow-500/20 bg-white/5">
                <h3 className="text-xl font-black text-yellow-500 uppercase">VVIP (+5% Daily)</h3>
                <p className="text-3xl font-black text-white my-6">7,500 Coins</p>
                <button onClick={() => activateBot('vvip', 7500)} className="w-full py-4 bg-yellow-600 rounded-xl font-black uppercase">Activate</button>
            </div>
       </div>
    </div>
)}

{screen === 'social' && (
    <div className="fixed inset-0 z-[200] bg-black p-10 flex flex-col items-center overflow-y-auto">
        <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold mb-10 text-xl uppercase">← Back</button>
        <h2 className="text-5xl font-black mb-12 uppercase text-white tracking-widest text-center">AJ SOCIAL</h2>
        <div className="flex flex-col gap-6 w-full max-w-md">
            {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module) => (
               <div key={module} onClick={() => alert(`${module} building...`)} className="bg-white/5 border border-white/10 p-10 rounded-[2rem] hover:border-pink-500 cursor-pointer text-center transition-all">
                  <h3 className="text-2xl font-black text-white uppercase italic">{module}</h3>
               </div>
            ))}
        </div>
    </div>
)}

  <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
    <img src="/founder_card.jpg" className="w-full max-w-4xl rounded-3xl shadow-2xl" />
  </section>
  
  <footer className="bg-black py-24 px-10 border-t border-cyan-500/10 text-center flex flex-col items-center">
    <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_30px_#06b6d4] mb-12 uppercase">AJ STUDIO</div>
    
    <div className="flex justify-center gap-10 mb-16">
        <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold uppercase tracking-widest">Whatsapp</a>
        <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold uppercase tracking-widest">X (Twitter)</a>
    </div>

    {/* GLOWING PWA INSTALL BUTTON */}
    <button onClick={handleInstallPWA} className="group relative px-12 py-4 bg-cyan-500 text-black font-black uppercase rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse">
       <span className="relative z-10 flex items-center gap-2"><Download size={22} /> Install AJ App</span>
       <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12"></div>
    </button>
    <p className="mt-4 text-[10px] text-cyan-400/50 font-bold uppercase tracking-[0.3em]">Official AJ Super Portal v2.0</p>
  </footer>
</main>
);
}