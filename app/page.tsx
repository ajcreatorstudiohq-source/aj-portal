"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X, CheckCircle2, Download, Share2, Heart } from 'lucide-react';
import emailjs from '@emailjs/browser';

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

// --- AI TRADING & VISUAL SYNC STATES ---
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

// Header Visual Balance: Real DB Balance + Live AI Counter (2 Decimal Places)
const displayBalance = (balance + visualProfit).toFixed(2);
const displayUsdt = (Number(displayBalance) / 100).toFixed(2);

// --- EMAILJS NOTIFICATION FUNCTION ---
const notifyAdmin = (type, amount, details) => {
  const templateParams = {
    user_name: user?.displayName,
    user_email: user?.email,
    action_type: type,
    amount: amount,
    details: details,
  };

  emailjs.send(
    'service_6w1sols', 
    'template_o1c40nv', 
    templateParams, 
    '6JCPm9fo38ovnA5LG'
  ).then(() => console.log("CEO Notified!"));
};

// --- PWA INSTALLATION LOGIC ---
useEffect(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setDeferredPrompt(e);
  });
}, []);

const handleInstallClick = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  }
};

// --- OFFLINE EARNING SYNC ---
const syncOfflineProfit = async (u) => {
  const userRef = doc(db, "users", u.uid);
  const snap = await getDoc(userRef);
  if (snap.exists() && snap.data().botTier !== 'none') {
    const d = snap.data();
    const lastSync = d.lastSyncTime?.toMillis() || Date.now();
    const secondsPassed = Math.floor((Date.now() - lastSync) / 1000);
    
    const rate = d.botTier === 'vvip' ? 0.05 : 0.02;
    const totalEarned = ((d.invested * rate) / 86400) * secondsPassed;
    
    const userHissa = totalEarned * 0.30; 
    const adminHissa = totalEarned * 0.70;

    if (userHissa > 0.01) {
      await updateDoc(userRef, { balance: increment(userHissa), lastSyncTime: serverTimestamp() });
      await updateDoc(doc(db, "admin_ledger", "platform_stats"), { total_locked_profit: increment(adminHissa) });
    }
  }
};

// --- SDK MESSAGE LISTENER (100:1 & 70/30 Split) ---
useEffect(() => {
const handleSDKMessages = async (event) => {
if (!user) return;
const data = event.detail || event.data;
if (!data) return;
const { type, amount, coins, profit } = data;

if (type === 'EARNED' || type === "ADD_AD_REVENUE" || type === "SYNC_GAME_COINS" || type === "SHOW_AD") {
    if (type === "SHOW_AD") {
        if (typeof window !== 'undefined' && (window as any).show_8924758) {
            (window as any).show_8924758();
        }
        return;
    }
    
    const rawValue = amount || coins;
    if(!rawValue) return;

    const totalAJ = rawValue / 100;
    const userHissa = totalAJ * 0.30;
    const adminHissa = totalAJ * 0.70;

    const userRef = doc(db, "users", user.uid);
    const adminRef = doc(db, "admin_ledger", "platform_stats");

    await updateDoc(userRef, { balance: increment(userHissa) });
    await updateDoc(adminRef, { total_locked_profit: increment(adminHissa + (profit || 0)) });
  }
};
window.addEventListener("message", handleSDKMessages);
return () => window.removeEventListener("message", handleSDKMessages);
}, [user]);

// --- AI REAL-TIME ENGINE ---
useEffect(() => {
  let logInt, visualInt, dbSyncInt;
  if (user && botTier !== 'none' && invested > 0) {
    logInt = setInterval(() => {
      const pairs = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];
      const actions = ["Scalping", "Analyzing", "Buying", "Selling"];
      const newLog = `[${new Date().toLocaleTimeString()}] ${actions[Math.floor(Math.random()*4)]} ${pairs[Math.floor(Math.random()*3)]}...`;
      setTradeLogs(prev => [newLog, ...prev.slice(0, 4)]);
    }, 5000);

    visualInt = setInterval(() => {
      const dailyRate = botTier === 'vvip' ? 0.05 : 0.02;
      const userProfitPerSec = ((invested * dailyRate) / 86400) * 0.30;
      setVisualProfit(prev => prev + userProfitPerSec);
    }, 1000);

    dbSyncInt = setInterval(async () => {
      if (visualProfit >= 0.1) {
        await updateDoc(doc(db, "users", user.uid), { balance: increment(visualProfit), lastSyncTime: serverTimestamp() });
        setVisualProfit(0);
      }
    }, 900000); 
  }
  return () => { clearInterval(logInt); clearInterval(visualInt); clearInterval(dbSyncInt); };
}, [user, botTier, invested, visualProfit]);

useEffect(() => {
const unsub = onAuthStateChanged(auth, async (u) => {
if (u) {
setUser(u); await syncOfflineProfit(u);
const userRef = doc(db, "users", u.uid);
onSnapshot(userRef, (docSnap) => {
if (docSnap.exists()) {
setBalance(docSnap.data().balance || 0);
setBotTier(docSnap.data().botTier || 'none');
setInvested(docSnap.data().invested || 0);
} else {
setDoc(userRef, { name: u.displayName, email: u.email, balance: 500, botTier: 'none', invested: 0, lastSyncTime: serverTimestamp() });
}
});
setScreen('hub');
} else { setUser(null); setScreen('auth'); }});
return () => unsub();
}, []);

const handlePurchase = () => {
  window.open(`https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174&amount=${purchaseAmount}`, '_blank');
};

const activateBot = async (t, c) => {
if (balance < c) return alert("Need coins!");
await updateDoc(doc(db, "users", user.uid), { balance: increment(-c), botTier: t, invested: c, lastSyncTime: serverTimestamp() });
notifyAdmin("BOT PURCHASE", c, t); 
setVisualProfit(0);
};

const handleWithdraw = async () => {
if (balance < 2500) return alert("Min 2,500 Coins!");
await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, amount: balance, method: payoutMethod, details: payoutId, status: "pending", date: new Date() });
notifyAdmin("WITHDRAWAL", balance, payoutMethod); 
alert("Request Sent!");
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

    {screen === 'hub' && (
        <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
          <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
          <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
            {/* GAMING - Top Left */}
            <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer">
               <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
               <span className="font-black text-xl md:text-4xl uppercase">Gaming</span>
            </div>
            {/* SOCIAL - Top Right (Moved here from Bottom Right) */}
            <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl relative z-50 cursor-pointer">
               <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
               <span className="font-black text-xl md:text-4xl uppercase">Social</span>
            </div>
            {/* AJ AI - Bottom Left */}
            <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
               <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
               <span className="font-black text-xl md:text-4xl uppercase">AJ AI</span>
            </div>
            {/* WALLET - Bottom Right (Moved here from Top Right) */}
            <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl h-48 md:h-80 flex flex-center justify-center cursor-pointer shadow-xl relative z-30">
               <Wallet className="text-yellow-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
               <h2 className="font-black text-xl md:text-4xl uppercase text-yellow-500">Wallet</h2>
            </div>
            {/* Central Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="w-24 h-24 md:w-80 md:h-80 bg-black border-4 md:border-[10px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden">
                 <img src="/logo.jpg" className="w-full h-full object-cover opacity-60 animate-pulse" alt="Logo" />
              </div>
            </div>
          </div>
        </section>
    )}

    {screen === 'arcade' && (
        <div className="fixed inset-0 z-[300] bg-black p-8 overflow-y-auto pt-24">
            <button onClick={() => setScreen('hub')} className="text-cyan-400 font-bold mb-10 tracking-widest uppercase">← BACK</button>
            {!selectedGame ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape', 'Ludo', 'Air Hockey'].map((game) => (
                  <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center hover:border-cyan-400 cursor-pointer transition-all">
                    {/* 512x512 LOGO FIX: ASPECT SQUARE */}
                    <img src={`/games/${game.toLowerCase().replace(/ /g, '-')}/logo.png`} className="w-full aspect-square rounded-xl mb-4 object-cover" alt={game} onError={(e) => { (e.target as any).src = "/logo.jpg"; }} />
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

    {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto pt-24">
          <button onClick={() => setScreen('hub')} className="self-start text-green-400 mb-12 font-bold">← BACK</button>
          {botTier !== 'none' && (
            <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-8 rounded-[3rem] text-center mb-16 shadow-2xl">
              <Activity size={60} className="mx-auto mb-6 text-green-500 animate-pulse" />
              <h2 className="text-4xl font-black uppercase text-white mb-2">{botTier.toUpperCase()} BOT RUNNING</h2>
              <p className="text-white text-3xl font-bold">+{visualProfit.toFixed(4)} 🪙</p>
              <div className="mt-6 h-20 overflow-hidden text-[10px] font-mono text-green-500/70 text-left">
                {tradeLogs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div onClick={() => activateBot('basic', 2500)} className={`bg-white/5 border-2 p-10 rounded-3xl text-center hover:border-cyan-500 cursor-pointer ${botTier === 'basic' ? 'border-green-500' : 'border-cyan-500/30'}`}>
              <h3 className="text-xl font-black text-cyan-400 uppercase">BASIC (+2% Daily)</h3>
              <p className="text-3xl font-black text-white my-6">2,500 Coins</p>
              <button className="w-full py-4 bg-cyan-600 rounded-xl font-black uppercase">ACTIVATE</button>
            </div>
            <div onClick={() => activateBot('vvip', 7500)} className={`bg-white/5 border-2 p-10 rounded-3xl text-center hover:border-yellow-500 cursor-pointer ${botTier === 'vvip' ? 'border-green-500' : 'border-yellow-500/30'}`}>
              <h3 className="text-xl font-black text-yellow-500 uppercase">VVIP (+5% Daily)</h3>
              <p className="text-3xl font-black text-white my-6">7,500 Coins</p>
              <button className="w-full py-4 bg-yellow-600 rounded-xl font-black text-black uppercase">ACTIVATE</button>
            </div>
          </div>
        </div>
    )}

    {/* Footer Section */}
    <footer className="bg-black py-24 px-10 border-t border-cyan-500/10 text-center relative">
        <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_30px_#06b6d4] mb-12 uppercase">AJ STUDIO</div>
        <div className="flex justify-center gap-10">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold uppercase tracking-widest">Whatsapp</a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold uppercase tracking-widest">X (Twitter)</a>
        </div>
        {deferredPrompt && (
            <button onClick={handleInstallClick} className="mt-12 bg-cyan-500 text-black py-4 px-10 rounded-2xl font-black flex items-center justify-center gap-2 mx-auto uppercase shadow-2xl active:scale-95"><Download /> INSTALL AJ APP</button>
        )}
    </footer>
</main>
);
}