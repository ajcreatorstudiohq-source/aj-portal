"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X, CheckCircle2, Download } from 'lucide-react';
import emailjs from '@emailjs/browser'; // Pehle install karein: npm install @emailjs/browser

export default function AJSuperPortal() {
const [screen, setScreen] = useState('splash');
const [walletTab, setWalletTab] = useState('main');
const [user, setUser] = useState(null);
const [balance, setBalance] = useState(0); // This is USER NET AJ COINS (30%)
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

// --- MASTER ECONOMY V6 DISPLAY (0.003 Logic) ---
// Note: Balance DB mein User ka Net 30% hi save ho raha hai.
const displayBalance = (balance + visualProfit).toFixed(3);
const displayUsdt = ((balance + visualProfit) / 3).toFixed(2); // Since display is 30%, USDT conversion adjust ki hai.

// --- EMAILJS CONFIG ---
const sendEmailNotification = (type, details) => {
  const templateParams = {
    ceo_name: "Ali Asim",
    event_type: type,
    user_email: user?.email,
    details: details,
  };

  emailjs.send('service_6w1sols', 'template_o1c40nv', templateParams, '6JCPm9fo38ovnA5LG')
    .then((res) => console.log('Email Sent!', res.status))
    .catch((err) => console.error('Email Failed!', err));
};

// --- PWA INSTALL LOGIC ---
useEffect(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setDeferredPrompt(e);
  });
}, []);

const handlePWAInstall = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  }
};

// --- SDK MESSAGE LISTENER (70/30 SPLIT) ---
useEffect(() => {
const handleSDKMessages = async (event) => {
if (!user) return;
const data = event.detail || event.data;
if (!data) return;
const { type, amount, coins } = data;

if (type === 'EARNED' || type === "SYNC_GAME_COINS") {
    const rawCoins = amount || coins; // Game Coins
    if(!rawCoins) return;

    // Logic: 100 Game Coins = 1 AJ Gross. 
    // User gets 30% (0.3 AJ). Admin gets 70% (0.7 AJ).
    const userNetGain = rawCoins * 0.003; 
    const adminGrossGain = rawCoins * 0.007;

    const userRef = doc(db, "users", user.uid);
    const adminRef = doc(db, "admin_ledger", "platform_stats");

    await updateDoc(userRef, { balance: increment(userNetGain) });
    await updateDoc(adminRef, { total_profit_backup: increment(adminGrossGain) });
  }
};
window.addEventListener("message", handleSDKMessages);
return () => window.removeEventListener("message", handleSDKMessages);
}, [user]);

// --- AI BOT LOGIC (OFFLINE + REALTIME) ---
useEffect(() => {
  let logInt, visualInt, dbSyncInt;
  
  const calculateOfflineProfit = async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().botTier !== 'none') {
      const lastUpdate = userDoc.data().lastSync?.seconds || Date.now()/1000;
      const now = Date.now()/1000;
      const elapsed = now - lastUpdate;
      
      const dailyRate = userDoc.data().botTier === 'vvip' ? 0.05 : 0.02;
      // Bot generates Daily Rate, User gets 30% of it.
      const netDailyRate = dailyRate * 0.3; 
      const offlineProfit = (userDoc.data().invested * netDailyRate * elapsed) / 86400;

      if (offlineProfit > 0.001) {
        await updateDoc(doc(db, "users", user.uid), { 
          balance: increment(offlineProfit),
          lastSync: serverTimestamp() 
        });
      }
    }
  };

  if (user && botTier !== 'none' && invested > 0) {
    calculateOfflineProfit();

    logInt = setInterval(() => {
      const actions = ["Scalping BTC", "Hedging ETH", "Analyzing Signal", "Executing Trade"];
      const newLog = `[${new Date().toLocaleTimeString()}] ${actions[Math.floor(Math.random()*actions.length)]}...`;
      setTradeLogs(prev => [newLog, ...prev.slice(0, 4)]);
    }, 5000);

    const netDailyRate = (botTier === 'vvip' ? 0.05 : 0.02) * 0.3;
    const profitPerSec = (invested * netDailyRate) / 86400;

    visualInt = setInterval(() => {
      setVisualProfit(prev => prev + profitPerSec);
    }, 1000);

    dbSyncInt = setInterval(async () => {
      setVisualProfit(currentProfit => {
        if (currentProfit >= 0.1) {
          updateDoc(doc(db, "users", user.uid), { 
            balance: increment(currentProfit),
            lastSync: serverTimestamp()
          });
          return 0;
        }
        return currentProfit;
      });
    }, 900000); // 15 Minutes Sync
  }

  return () => { clearInterval(logInt); clearInterval(visualInt); clearInterval(dbSyncInt); };
}, [user, botTier, invested]);

// --- HANDLERS ---
const handleLogin = async () => {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  await setPersistence(auth, browserLocalPersistence);
  await signInWithPopup(auth, googleProvider);
};

const handleWithdraw = async () => {
  if (balance < 2500) return alert("Minimum 2,500 Coins required!");
  let details = payoutMethod.includes('Visa') ? `Name: ${cardName} | Card: ${cardNumber}` : payoutId;
  
  await addDoc(collection(db, "withdraw_requests"), { 
    uid: user.uid, email: user.email, amount: balance, method: payoutMethod, details: details, status: "pending", date: new Date() 
  });
  
  sendEmailNotification("Withdrawal Request", `User ${user.email} requested ${balance} AJ Coins via ${payoutMethod}`);
  alert("✅ Request Sent to Ali Asim!"); 
  setWalletTab('main');
};

const activateBot = async (tier, cost) => {
  if (balance < cost) return alert(`⚠️ Need ${cost} Coins!`);
  await updateDoc(doc(db, "users", user.uid), { 
    balance: increment(-cost), botTier: tier, invested: cost, lastSync: serverTimestamp() 
  });
  sendEmailNotification("Bot Activation", `User ${user.email} activated ${tier.toUpperCase()} BOT`);
  alert(`🚀 ${tier.toUpperCase()} BOT ACTIVATED!`);
};

// --- UI COMPONENTS ---
if (screen === 'splash') return (
<main className="h-screen bg-black flex flex-col items-center justify-center text-white">
  <div className="w-40 h-40 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_80px_#06b6d4] overflow-hidden mb-8 animate-bounce">
    <img src="/logo.jpg" className="w-full h-full object-cover" alt="Logo" />
  </div>
  <h1 className="text-4xl font-black tracking-[0.5em] text-cyan-400">AJ PORTAL</h1>
  <div className="w-48 h-1 bg-white/10 mt-4 rounded-full overflow-hidden">
    <div className="h-full bg-cyan-500 transition-all" style={{width: `${loading}%`}}></div>
  </div>
</main>
);

if (screen === 'auth' && !user) return (
<main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white text-center">
  <div className="w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/10 p-12 rounded-[3.5rem] shadow-2xl">
    <h2 className="text-7xl font-black mb-10 italic text-cyan-400">AJ <span className="text-white">ID</span></h2>
    <button onClick={handleLogin} className="w-full py-5 bg-cyan-500 text-black font-black text-xl rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-95 transition-all">SIGN IN WITH GOOGLE</button>
    <p className="mt-8 text-yellow-500 font-black tracking-widest">+500 COINS BONUS</p>
  </div>
</main>
);

return (
<main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative selection:bg-cyan-500 selection:text-black">
  {/* Glass Header */}
  <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/40 backdrop-blur-2xl border-b border-white/5">
    <div className="text-2xl font-black italic text-cyan-400 tracking-tighter">AJ STUDIO</div>
    <div className="flex items-center gap-3">
      <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-xl cursor-pointer hover:border-cyan-500 transition-all">
        <span className="text-sm font-black text-yellow-500">{displayBalance} 🪙</span>
        {user && <img src={user.photoURL} className="w-8 h-8 rounded-full border-2 border-cyan-500" />}
      </div>
      {deferredPrompt && <button onClick={handlePWAInstall} className="p-2 bg-cyan-500 text-black rounded-full"><Download size={16}/></button>}
      <button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500 font-bold text-[8px] uppercase">Exit</button>
    </div>
  </header>

  {/* Main Dashboard */}
  <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
    <h1 className="text-5xl md:text-[10rem] font-black text-center mb-12 uppercase drop-shadow-[0_0_30px_#22d3ee] tracking-tighter italic">SUPER PORTAL</h1>
    
    <div className="grid grid-cols-2 gap-4 md:gap-10 w-full max-w-5xl relative z-30">
      {/* Gaming Module */}
      <div onClick={() => setScreen('arcade')} className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] h-52 md:h-96 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer hover:border-cyan-400 hover:bg-cyan-400/5 shadow-2xl">
         <Trophy className="text-cyan-400 group-hover:scale-110 transition-transform w-12 h-12 md:w-24 md:h-24 mb-4" />
         <span className="font-black text-sm md:text-4xl uppercase italic">Gaming</span>
      </div>

      {/* Social Module */}
      <div onClick={() => setScreen('social')} className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] h-52 md:h-96 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer hover:border-pink-500 hover:bg-pink-500/5 shadow-2xl">
         <Zap className="text-pink-500 group-hover:scale-110 transition-transform w-12 h-12 md:w-24 md:h-24 mb-4" />
         <span className="font-black text-sm md:text-4xl uppercase italic">Social</span>
      </div>

      {/* Wallet Module */}
      <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] h-52 md:h-96 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer hover:border-yellow-500 hover:bg-yellow-500/5 shadow-2xl">
         <Wallet className="text-yellow-500 group-hover:scale-110 transition-transform w-12 h-12 md:w-24 md:h-24 mb-4" />
         <span className="font-black text-sm md:text-4xl uppercase italic">Wallet</span>
      </div>

      {/* AI Bot Module */}
      <div onClick={() => setScreen('ai')} className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] h-52 md:h-96 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer hover:border-green-400 hover:bg-green-400/5 shadow-2xl">
         <Bot className="text-green-400 group-hover:scale-110 transition-transform w-12 h-12 md:w-24 md:h-24 mb-4" />
         <span className="font-black text-sm md:text-4xl uppercase italic">AJ AI</span>
      </div>

      {/* Center Core Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-32 h-32 md:w-[30rem] md:h-[30rem] bg-black border-[10px] border-cyan-500/20 rounded-full flex items-center justify-center shadow-[0_0_150px_rgba(6,182,212,0.3)]">
           <img src="/logo.jpg" className="w-full h-full object-cover rounded-full opacity-40 animate-pulse" alt="Logo" />
        </div>
      </div>
    </div>
  </section>

  {/* Arcade Screen */}
  {screen === 'arcade' && (
    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl p-8 overflow-y-auto">
        <button onClick={() => {setScreen('hub'); setSelectedGame(null)}} className="text-cyan-400 font-black mb-10 flex items-center gap-2 uppercase tracking-tighter hover:gap-4 transition-all">← Back to Hub</button>
        {!selectedGame ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-6xl mx-auto pb-32">
            {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape'].map((game) => (
              <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center hover:border-cyan-400 hover:bg-cyan-400/5 cursor-pointer transition-all shadow-xl group">
                <div className="relative overflow-hidden rounded-2xl mb-4 shadow-lg">
                  <img src={`/games/${game.toLowerCase().replace(/ /g, '-')}/logo.png`} className="w-full aspect-video object-cover group-hover:scale-110 transition-transform duration-500" alt={game} onError={(e) => { e.target.src = "/logo.jpg"; }} />
                </div>
                <h3 className="font-black text-lg md:text-2xl uppercase italic tracking-tighter text-white">{game}</h3>
                <p className="text-[10px] text-cyan-500 font-bold mb-4 uppercase">Earn Real AJ Coins</p>
                <button className="w-full bg-cyan-500 text-black py-3 rounded-xl font-black text-xs uppercase shadow-lg group-hover:shadow-cyan-500/40">Launch Mission</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-[85vh] bg-black rounded-[3rem] border-2 border-cyan-500 overflow-hidden relative shadow-[0_0_100px_rgba(6,182,212,0.3)]">
             <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-full border-none" title="Game" />
          </div>
        )}
    </div>
  )}

  {/* Wallet Screen */}
  {screen === 'wallet' && (
    <div className="fixed inset-0 z-[300] bg-[#020617]/98 backdrop-blur-3xl flex flex-col items-center p-8 overflow-y-auto animate-in fade-in zoom-in">
       <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 mb-8 font-black flex items-center gap-2 uppercase">← Back</button>
       <div className="w-full max-w-lg bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl backdrop-blur-md">
          <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Current Net Balance</p>
          <h2 className="text-6xl md:text-8xl font-black text-yellow-500 mb-2 drop-shadow-[0_0_20px_rgba(234,179,8,0.3)] tracking-tighter">{displayBalance} 🪙</h2>
          <p className="text-green-400 font-black text-xl mb-10 uppercase tracking-widest">≈ ${displayUsdt} USDT</p>
          
          {walletTab === 'main' && (
            <div className="flex flex-col gap-4">
               <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-5 rounded-2xl font-black text-xl uppercase shadow-xl active:scale-95 transition-all">Buy Data Points</button>
               <div className="grid grid-cols-2 gap-4">
                 <button onClick={()=>setWalletTab('transfer')} className="bg-white/5 text-cyan-400 py-4 rounded-2xl font-black border border-white/10 uppercase hover:bg-cyan-500/10 transition-all">Transfer</button>
                 <button onClick={()=>setWalletTab('withdraw')} className="bg-white/5 text-pink-500 py-4 rounded-2xl font-black border border-white/10 uppercase hover:bg-pink-500/10 transition-all">Withdraw</button>
               </div>
            </div>
          )}

          {walletTab === 'withdraw' && (
            <div className="flex flex-col gap-5 text-left animate-in slide-in-from-bottom">
               <h3 className="text-cyan-400 font-black uppercase text-center text-sm tracking-[0.3em]">Request Payout</h3>
               <div className="space-y-4">
                  <select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl text-white font-black outline-none focus:border-cyan-500">
                    <option>Binance Pay (USDT)</option>
                    <option>EasyPaisa (PKR)</option>
                    <option>JazzCash (PKR)</option>
                    <option>Visa Transfer (Global)</option>
                  </select>
                  {payoutMethod.includes('Visa') ? (
                    <><input type="text" placeholder="Cardholder Name" onChange={(e)=>setCardName(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white text-center font-bold" />
                      <input type="text" placeholder="Card Number" onChange={(e)=>setCardNumber(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white text-center font-bold" /></>
                  ) : <input type="text" placeholder="Wallet ID / Account Number" onChange={(e)=>setPayoutId(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white text-center font-black" />}
                  <button onClick={handleWithdraw} className="w-full bg-pink-600 py-5 rounded-2xl font-black text-xl uppercase shadow-2xl active:scale-95 transition-all">Submit Request</button>
                  <button onClick={()=>setWalletTab('main')} className="w-full text-gray-500 font-black uppercase text-xs text-center py-2">Back to Wallet</button>
               </div>
            </div>
          )}
          {/* Purchase aur Transfer screens yahan aayengi (Rider King wala logic use hoga) */}
       </div>
    </div>
  )}

  {/* AI Bot Screen */}
  {screen === 'ai' && (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-right pb-32">
       <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-black text-sm mb-12 uppercase">← Dashboard</button>
       <h2 className="text-6xl md:text-8xl font-black mb-12 text-center uppercase text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(34,197,94,0.3)]">NEURAL CORE</h2>
       
       {botTier !== 'none' && (
         <div className="w-full max-w-2xl bg-green-500/5 border-2 border-green-500/30 p-10 rounded-[3.5rem] text-center mb-16 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
            <Activity size={80} className="mx-auto mb-6 text-green-500 animate-pulse" />
            <h2 className="text-4xl md:text-5xl font-black uppercase text-white mb-4 italic">{botTier} Bot Active</h2>
            <div className="w-full bg-black/80 border border-green-500/20 p-8 rounded-3xl font-mono text-left">
               <div className="flex justify-between mb-6 border-b border-white/5 pb-4">
                  <span className="text-gray-400 text-xs uppercase">Net Earnings:</span>
                  <span className="text-green-400 font-black text-3xl">+{visualProfit.toFixed(4)} 🪙</span>
               </div>
               <div className="h-28 overflow-hidden text-[10px] space-y-2 opacity-60">
                  {tradeLogs.map((log, i) => ( <div key={i} className="text-green-500">{log}</div> ))}
               </div>
            </div>
         </div>
       )}

       <div className="w-full max-w-5xl">
          <p className="text-center text-gray-500 font-black uppercase tracking-[0.5em] mb-12">Deployment Marketplace</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-4">
            <div className={`p-10 rounded-[3rem] text-center border-2 transition-all duration-500 ${botTier === 'basic' ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-white/5 hover:border-cyan-500 shadow-2xl hover:bg-cyan-500/5'}`}>
                <Activity className="mx-auto mb-6 text-cyan-400" size={50} />
                <h3 className="text-3xl font-black text-white uppercase italic">Basic Core</h3>
                <p className="text-cyan-400 font-black text-sm my-2 uppercase tracking-widest">+2% Daily Profit</p>
                <div className="text-4xl font-black text-yellow-500 my-8">2,500 🪙</div>
                <button onClick={() => activateBot('basic', 2500)} className={`w-full py-5 rounded-2xl font-black text-xl uppercase transition-all ${botTier === 'basic' ? 'bg-green-500 text-black shadow-[0_0_20px_#2ecc71]' : 'bg-white text-black active:scale-95'}`}>
                  {botTier === 'basic' ? "Deployed" : "Activate Core"}
                </button>
            </div>
            <div className={`p-10 rounded-[3rem] text-center border-2 transition-all duration-500 ${botTier === 'vvip' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 bg-white/5 hover:border-yellow-500 shadow-2xl hover:bg-yellow-500/5'}`}>
                <Crown className="mx-auto mb-6 text-yellow-500" size={50} />
                <h3 className="text-3xl font-black text-white uppercase italic text-yellow-500">VVIP Core</h3>
                <p className="text-yellow-500 font-black text-sm my-2 uppercase tracking-widest">+5% Daily Profit</p>
                <div className="text-4xl font-black text-yellow-500 my-8">7,500 🪙</div>
                <button onClick={() => activateBot('vvip', 7500)} className={`w-full py-5 rounded-2xl font-black text-xl uppercase transition-all ${botTier === 'vvip' ? 'bg-yellow-500 text-black shadow-[0_0_20px_#ffd700]' : 'bg-yellow-500 text-black active:scale-95'}`}>
                  {botTier === 'vvip' ? "Deployed" : "Activate VVIP"}
                </button>
            </div>
          </div>
       </div>
    </div>
  )}

  {/* Social Screen */}
  {screen === 'social' && (
    <div className="fixed inset-0 z-[200] bg-[#020617] p-8 flex flex-col items-center overflow-y-auto animate-in zoom-in duration-500">
        <header className="w-full max-w-5xl flex justify-between items-center mb-12">
           <button onClick={() => setScreen('hub')} className="text-cyan-400 font-black text-lg uppercase">← Back</button>
           <h2 className="text-4xl font-black uppercase italic text-pink-500 tracking-tighter">AJ SOCIAL HUB</h2>
           <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center text-pink-500 font-bold">1</div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl pb-20">
          <div onClick={() => alert("TikReels Phase 2 Live next week!")} className="h-96 bg-white/5 border-2 border-white/10 rounded-[3rem] flex flex-col items-center justify-center group cursor-pointer hover:border-pink-500 hover:bg-pink-500/5 transition-all">
             <Zap size={100} className="text-pink-500 group-hover:scale-125 transition-transform" />
             <h3 className="text-4xl font-black mt-6 italic">TIKREELS</h3>
             <p className="text-gray-500 uppercase font-black text-[10px] mt-2">Watch & Earn Gifting</p>
          </div>
          <div onClick={() => alert("AJ Pulse coming soon!")} className="h-96 bg-white/5 border-2 border-white/10 rounded-[3rem] flex flex-col items-center justify-center group cursor-pointer hover:border-cyan-400 hover:bg-cyan-400/5 transition-all">
             <Globe size={100} className="text-cyan-400 group-hover:scale-125 transition-transform" />
             <h3 className="text-4xl font-black mt-6 italic">AJ PULSE</h3>
             <p className="text-gray-400 uppercase font-black text-[10px] mt-2">Global News & Feed</p>
          </div>
        </div>
    </div>
  )}

  {/* Founder Card Section */}
  <section className="py-32 bg-black flex justify-center px-4">
    <div className="relative group max-w-4xl w-full">
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-3xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
      <img src="/founder_card.jpg" className="relative w-full rounded-3xl shadow-2xl border border-white/10" alt="Ali Asim Card" />
    </div>
  </section>
  
  {/* Footer Branding */}
  <footer className="bg-black py-32 px-10 border-t border-cyan-500/10 text-center relative overflow-hidden">
    <div className="text-[15rem] font-black italic text-white/5 absolute -bottom-20 left-0 right-0 pointer-events-none uppercase">SOVEREIGN</div>
    <div className="text-6xl md:text-[12rem] font-black italic text-cyan-400 drop-shadow-[0_0_50px_rgba(34,211,238,0.5)] mb-12 uppercase tracking-tighter">AJ STUDIO</div>
    <div className="flex flex-col md:flex-row justify-center items-center gap-6 relative z-10">
        <a href="https://wa.me/96878994093" target="_blank" className="w-64 py-4 bg-green-500/10 text-green-500 border-2 border-green-500/50 rounded-2xl font-black uppercase tracking-widest hover:bg-green-500 hover:text-black transition-all">WhatsApp CEO</a>
        <a href="https://x.com/Ali20352061" target="_blank" className="w-64 py-4 bg-white/5 text-white border-2 border-white/20 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">X (Twitter)</a>
    </div>
    <p className="mt-20 text-gray-600 text-xs font-black uppercase tracking-[0.5em]">AJ Digital Empire © 2026 - Ali Asim Production</p>
  </footer>
</main>
);
}