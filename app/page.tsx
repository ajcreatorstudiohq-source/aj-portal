"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Bot, Send, Activity, CheckCircle2, Download, Copy, Video, Newspaper, Users, MessageSquare, Camera, Settings, Edit3, X, UserCircle } from 'lucide-react';
import emailjs from 'emailjs-com';

const NOWPAYMENTS_API_KEY = "3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7";

export default function AJSuperPortal() {
const [screen, setScreen] = useState('splash');
const [walletTab, setWalletTab] = useState('main');
const [socialScreen, setSocialScreen] = useState('hub'); 
const [user, setUser] = useState(null);
const [balance, setBalance] = useState(0);
const [botTier, setBotTier] = useState('none');
const [invested, setInvested] = useState(0);
const [loading, setLoading] = useState(0);
const [selectedGame, setSelectedGame] = useState(null);
const [copied, setCopied] = useState(false);

// --- SOCIAL STATES ---
const [hasSocialProfile, setHasSocialProfile] = useState(false);
const [username, setUsername] = useState('');
const [bio, setBio] = useState('');
const [tempPhoto, setTempPhoto] = useState('');
const [pendingMode, setPendingMode] = useState(''); 

// --- AI STATES ---
const [visualProfit, setVisualProfit] = useState(0);
const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility..."]);

// Input States
const [purchaseAmount, setPurchaseAmount] = useState(20);
const [purchaseMethod, setPurchaseMethod] = useState('Binance (TRC20)');
const [purchaseTxId, setPurchaseTxId] = useState('');
const [transferId, setTransferId] = useState('');
const [transferAmount, setTransferAmount] = useState(0);
const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
const [payoutId, setPayoutId] = useState('');
const [cardName, setCardName] = useState('');
const [cardNumber, setCardNumber] = useState('');

const displayBalance = (balance + visualProfit).toFixed(2);
const displayUsdt = ((balance + visualProfit) / 10000).toFixed(2);

const copyToClipboard = (id) => {
  if(!id) return;
  navigator.clipboard.writeText(id);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

// --- PROFILE HANDLERS ---
const handleCreateProfile = async () => {
    if(username.length < 3) return alert("Username too short!");
    try {
        await updateDoc(doc(db, "users", user.uid), {
            username: username.toLowerCase().trim(),
            bio: bio,
            photo: tempPhoto || user.photoURL,
            hasSocialProfile: true
        });
        setHasSocialProfile(true);
        setSocialScreen(pendingMode || 'hub');
        alert("🚀 Profile Ready!");
    } catch (e) { alert("Setup Error!"); }
};

const enterSocialMode = (mode) => {
    setPendingMode(mode);
    if (!hasSocialProfile) {
        setSocialScreen('setup');
    } else {
        setSocialScreen(mode);
    }
};

// --- AUTH & DATA SYNC ---
useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
if (currentUser) {
setUser(currentUser);
const userRef = doc(db, "users", currentUser.uid);
const userSnap = await getDoc(userRef);
if (userSnap.exists()) {
  const data = userSnap.data();
  setHasSocialProfile(data.hasSocialProfile || false);
  setUsername(data.username || '');
  setBio(data.bio || '');
  setTempPhoto(data.photo || currentUser.photoURL);

  if (data.botTier !== 'none' && data.lastSync) {
    const secPassed = (new Date().getTime() - data.lastSync.toDate().getTime()) / 1000;
    const offlineProfit = (data.invested * (data.botTier === 'vvip' ? 0.05 : 0.02) * secPassed) / 86400;
    if (offlineProfit > 0.1) await updateDoc(userRef, { balance: increment(offlineProfit), lastSync: serverTimestamp() });
  }
} else {
  await setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, uid: currentUser.uid, lastSync: serverTimestamp(), hasSocialProfile: false, photo: currentUser.photoURL });
}
onSnapshot(userRef, (snap) => {
if (snap.exists()) { 
    setBalance(snap.data().balance || 0); 
    setBotTier(snap.data().botTier || 'none'); 
    setInvested(snap.data().invested || 0);
    setHasSocialProfile(snap.data().hasSocialProfile || false);
}
});
setScreen('hub');
} else { setUser(null); setScreen('auth'); }
});
return () => unsubscribe();
}, []);

// --- BOT ENGINE (FIXED) ---
useEffect(() => {
  let logInt, visualInt, dbSyncInt;
  if (user && botTier !== 'none' && invested > 0) {
    logInt = setInterval(() => {
      const actions = ["Scalping BTC", "Neural Analysis", "Hedging SOL"];
      setTradeLogs(prev => [`[${new Date().toLocaleTimeString()}] ${actions[Math.floor(Math.random()*3)]}...`, ...prev.slice(0, 3)]);
    }, 7000);
    const dailyRate = botTier === 'vvip' ? 0.05 : 0.02;
    const profitPerSec = (invested * dailyRate) / 86400;
    visualInt = setInterval(() => setVisualProfit(p => p + profitPerSec), 1000);
    dbSyncInt = setInterval(async () => {
      setVisualProfit(v => {
        if (v >= 1) {
          const syncAmt = Math.floor(v);
          updateDoc(doc(db, "users", user.uid), { balance: increment(syncAmt), lastSync: serverTimestamp() });
          return v - syncAmt;
        }
        return v;
      });
    }, 900000);
  }
  return () => { clearInterval(logInt); clearInterval(visualInt); clearInterval(dbSyncInt); };
}, [user, botTier, invested]);

useEffect(() => {
if (screen === 'splash') {
const interval = setInterval(() => { setLoading(prev => (prev >= 100 ? 100 : prev + 10)); }, 50);
setTimeout(() => setScreen('hub'), 2000);
return () => clearInterval(interval);
}
}, [screen]);

const handleLogin = async () => {
googleProvider.setCustomParameters({ prompt: 'select_account' });
await setPersistence(auth, browserLocalPersistence);
await signInWithPopup(auth, googleProvider);
};

const handlePurchase = async () => {
  if (purchaseMethod === 'Binance (TRC20)') {
      try {
        const res = await fetch('https://api.nowpayments.io/v1/invoice', {
          method: 'POST',
          headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ price_amount: purchaseAmount, price_currency: "usd", pay_currency: "usdttrc20", order_id: `AJ_${Date.now()}` })
        });
        const data = await res.json();
        if (data.invoice_url) window.open(data.invoice_url, '_blank');
      } catch (e) { alert("Payment Error!"); }
  } else {
      if(!purchaseTxId) return alert("Enter Airtm TX ID.");
      await addDoc(collection(db, "manual_deposits"), { uid: user.uid, email: user.email, amount: purchaseAmount, method: "Airtm", txId: purchaseTxId, status: "pending", date: serverTimestamp() });
      alert("✅ Airtm Request Sent!"); setWalletTab('main');
  }
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
if (balance < 50000) return alert("Min 50,000 Coins ($5)!");
let details = payoutId;
if (payoutMethod.includes('Visa')) details = `Name: ${cardName} | Card: ${cardNumber}`;
await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, email: user.email, amount_coins: balance, amount_usd: (balance/10000), method: payoutMethod, details: details, status: "pending", date: serverTimestamp() });
alert("✅ Request Sent!"); setWalletTab('main');
};

const activateBot = async (tier, cost) => {
if (balance < cost) return alert(`⚠️ Need ${cost} Coins!`);
await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost, lastSync: serverTimestamp() });
setVisualProfit(0);
alert(`🚀 ${tier.toUpperCase()} BOT ACTIVATED!`);
};

if (screen === 'splash') return (
<main className="h-screen bg-black flex flex-col items-center justify-center text-white text-center">
<div className="w-40 h-40 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8"><img src="/logo.png" className="w-full h-full object-cover" alt="Logo" /></div>
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
<div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer transition-all hover:bg-white/10">
<span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
{user && <img src={tempPhoto || user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
</div>
<button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full uppercase">EXIT</button>
</div>
</header>

<section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
    <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
    <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
      <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all hover:border-cyan-400">
         <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase">Gaming</span>
      </div>
      <div onClick={() => {setScreen('social'); setSocialScreen('hub');}} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl relative z-50 cursor-pointer hover:border-pink-500">
         <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase">Social</span>
      </div>
      <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all hover:border-yellow-500 relative z-30">
         <img src="/gold.jpg" className="w-14 h-14 mb-2" />
         <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
      </div>
      <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30 hover:border-green-500">
         <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase">AJ AI</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-24 h-24 md:w-96 md:h-96 bg-black border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden">
           <img src="/logo.png" className="w-full h-full object-cover opacity-60 animate-pulse" alt="Logo" />
        </div>
      </div>
    </div>
</section>

{/* ARCADE */}
{screen === 'arcade' && (
    <div className="fixed inset-0 z-[300] bg-black p-8 overflow-y-auto">
        <button onClick={() => {setScreen('hub'); setSelectedGame(null)}} className="text-cyan-400 font-bold mb-10 tracking-widest uppercase transition-all hover:brightness-125">← BACK</button>
        {!selectedGame ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20">
            {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape', 'Ludo Elite Royal', 'Puck Pulse Elite'].map((game) => {
              const isComingSoon = game === 'Ludo Elite Royal' || game === 'Puck Pulse Elite';
              const folderName = game.replace(' Elite Royal', '').replace(' Elite', '').toLowerCase().replace(/ /g, '-');
              return (
              <div key={game} onClick={() => !isComingSoon && setSelectedGame(game)} className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center hover:border-cyan-400 cursor-pointer transition-all">
                <img src={`/games/${folderName}/logo.png`} className="w-full aspect-square rounded-xl mb-4 object-cover shadow-lg" alt={game} onError={(e:any) => { e.target.src = "/logo.png"; }} />
                <h3 className="font-black text-sm text-white">{game}</h3>
                <button className={`mt-4 w-full py-2 rounded-full font-black text-[10px] uppercase transition-all ${isComingSoon ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-cyan-500 text-black'}`}>{isComingSoon ? "Soon" : "PLAY NOW"}</button>
              </div>
            )})}
          </div>
        ) : (
          <div className="w-full h-[80vh] bg-black rounded-3xl border-2 border-cyan-500 overflow-hidden relative shadow-2xl"><iframe src={`/games/${selectedGame.toLowerCase().replace(/ elite royal/g, '').replace(/ elite/g, '').replace(/ /g, '-')}/index.html`} className="w-full h-full border-none" title="Game" /></div>
        )}
    </div>
)}

{/* WALLET */}
{screen === 'wallet' && (
    <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
       <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 mb-8 font-bold uppercase tracking-widest">← BACK</button>
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
              <select value={purchaseMethod} onChange={(e)=>setPurchaseMethod(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none"><option>Binance (TRC20)</option><option>Airtm (Gmail Account)</option></select>
              <div className="bg-black border-2 border-white/10 p-6 rounded-3xl text-center"><p className="text-yellow-500 text-4xl font-black">{(purchaseAmount * 1000)} 🪙</p><input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-transparent text-white text-2xl text-center font-bold" /></div>
              {purchaseMethod.includes('Airtm') && (<div className="p-4 bg-slate-900 rounded-2xl border border-cyan-500/30 text-xs"><p className="text-gray-400 mb-1">Send to: ajcreatorstudio.hq@gmail.com</p><input type="text" placeholder="TX ID" value={purchaseTxId} onChange={(e)=>setPurchaseTxId(e.target.value)} className="w-full bg-black border p-2 rounded text-white" /></div>)}
              <button onClick={handlePurchase} className="bg-cyan-500 py-4 rounded-xl font-black uppercase">Confirm Purchase</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2">Cancel</button>
            </div>
          )}
          {walletTab === 'transfer' && (
            <div className="flex flex-col gap-4 text-left">
              <div className="bg-cyan-500/10 border border-cyan-500/30 p-5 rounded-2xl relative cursor-pointer" onClick={() => copyToClipboard(user?.uid)}>
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">My ID</p>
                <p className="text-lg font-mono text-cyan-400 font-black truncate">{user?.uid}</p>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400">{copied ? <CheckCircle2 size={18}/> : <Copy size={18}/>}</div>
              </div>
              <input type="text" placeholder="Recipient ID" onChange={(e)=>setTransferId(e.target.value)} className="bg-black border p-4 rounded-xl text-white outline-none border-white/10" />
              <input type="number" placeholder="Amount" onChange={(e)=>setTransferAmount(Number(e.target.value))} className="bg-black border p-4 rounded-xl text-white outline-none border-white/10" />
              <button onClick={handleTransfer} className="bg-cyan-600 py-4 rounded-xl font-black uppercase shadow-lg">Send Now</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2">Back</button>
            </div>
          )}
          {walletTab === 'withdraw' && (
            <div className="flex flex-col gap-4 text-left">
              <label className="text-[10px] text-pink-500 font-black uppercase">Min 50k Coins</label>
              <select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold"><option>Binance Pay (USDT)</option><option>Airtm (Gmail Account)</option><option>EasyPaisa (PKR)</option><option>JazzCash (PKR)</option><option>Visa Transfer (Master/Visa)</option></select>
              <input type="text" placeholder="ID / Phone / Card Details" onChange={(e)=>setPayoutId(e.target.value)} className="bg-black border p-4 rounded-xl text-white outline-none border-white/10" />
              {payoutMethod.includes('Visa') && (<><input type="text" placeholder="Name on Card" onChange={(e)=>setCardName(e.target.value)} className="bg-black border p-4 rounded-xl text-white mb-2" /><input type="text" placeholder="Card Number" onChange={(e)=>setCardNumber(e.target.value)} className="bg-black border p-4 rounded-xl text-white" /></>)}
              <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-black uppercase shadow-lg">Request Payout</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2">Back</button>
            </div>
          )}
       </div>
    </div>
)}

{/* AI BOT */}
{screen === 'ai' && (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto pb-20">
       <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-sm mb-12 uppercase">← Back</button>
       <h2 className="text-5xl font-black mb-12 text-center uppercase text-white italic">AJ AI BOT</h2>
       {botTier !== 'none' && (
         <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-8 rounded-[3rem] text-center mb-16 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <Activity size={60} className="mx-auto mb-6 text-green-500 animate-pulse" />
            <h2 className="text-4xl font-black text-white mb-2 uppercase">{botTier} BOT RUNNING</h2>
            <div className="w-full bg-black/50 border border-green-500/30 p-6 rounded-2xl font-mono text-left"><div className="flex justify-between items-center mb-4"><span className="text-green-400 font-black text-xs uppercase">Profit:</span><span className="text-white font-black text-lg">+{visualProfit.toFixed(4)} 🪙</span></div><div className="h-20 overflow-hidden text-green-500/70 mt-2 text-[10px] leading-relaxed">{tradeLogs.map((log, i) => ( <div key={i} className="mb-1">{log}</div> ))}</div></div>
         </div>
       )}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-2">
          <div className={`p-10 rounded-3xl text-center border-2 transition-all ${botTier === 'basic' ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-white/5'}`}><h3 className="text-xl font-black text-cyan-400 uppercase">Basic (25k Coins)</h3><p className="text-sm text-gray-400 mt-2">Earn 2% Daily</p><button onClick={() => activateBot('basic', 25000)} className={`mt-6 w-full py-4 rounded-xl font-black uppercase ${botTier === 'basic' ? 'bg-green-500 text-black cursor-not-allowed' : 'bg-cyan-600'}`}>{botTier === 'basic' ? "RUNNING" : "ACTIVATE"}</button></div>
          <div className={`p-10 rounded-3xl text-center border-2 transition-all ${botTier === 'vvip' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 bg-white/5'}`}><h3 className="text-xl font-black text-yellow-500 uppercase">VVIP (75k Coins)</h3><p className="text-sm text-gray-400 mt-2">Earn 5% Daily</p><button onClick={() => activateBot('vvip', 75000)} className={`mt-6 w-full py-4 rounded-xl font-black uppercase ${botTier === 'vvip' ? 'bg-yellow-500 text-black cursor-not-allowed' : 'bg-yellow-600'}`}>{botTier === 'vvip' ? "RUNNING" : "ACTIVATE"}</button></div>
       </div>
    </div>
)}

{/* --- CORRECTED SOCIAL HUB --- */}
{screen === 'social' && (
    <div className="fixed inset-0 z-[400] bg-slate-950 p-8 overflow-y-auto">
        <div className="sticky top-0 w-full p-4 bg-black/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center z-[500] mb-8 rounded-full shadow-2xl">
            <button onClick={() => {setSocialScreen('hub'); setScreen('hub')}} className="text-pink-500 font-black text-xs uppercase">← HUB</button>
            <h2 className="text-xl font-black italic text-pink-500 uppercase">AJ Social</h2>
            <button onClick={() => setSocialScreen('setup')} className="bg-white/10 p-2 rounded-full text-pink-500 hover:bg-white/20"><Camera size={18}/></button>
        </div>

        {socialScreen === 'hub' ? (
          /* SOCIAL DASHBOARD */
          <div className="max-w-md mx-auto grid grid-cols-1 gap-6 pb-24 px-2">
             <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-pink-500/20 mb-4">
                  <img src={tempPhoto || user?.photoURL} className="w-12 h-12 rounded-full border-2 border-pink-500 shadow-lg" alt="Profile" />
                  <div>
                    <p className="font-black text-white text-sm uppercase">@{username || "AJ_Member"}</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">{hasSocialProfile ? "Profile Verified" : "Incomplete Profile"}</p>
                  </div>
             </div>
             {[{n:'AJ TikReels', i:<Video size={32}/>, d:'Watch & Gift Creators', s:'tikreels'}, {n:'AJ Pulse', i:<Users size={32}/>, d:'Community Feed', s:'pulse'}, {n:'AJ Live Chat', i:<MessageSquare size={32}/>, d:'Real-time Chat', s:'chat'}, {n:'AJ Discover', i:<Globe size={32}/>, d:'Official Portal News', s:'discover'}].map((mod) => (
                <div key={mod.n} onClick={() => enterSocialMode(mod.s)} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-center hover:border-pink-500 transition-all cursor-pointer group">
                    <div className="text-pink-500 mb-3 flex justify-center group-hover:scale-110 transition-transform">{mod.i}</div>
                    <h3 className="text-2xl font-black uppercase italic">{mod.n}</h3>
                    <p className="text-[9px] text-gray-500 uppercase mt-1">{mod.d}</p>
                </div>
             ))}
          </div>
        ) : socialScreen === 'setup' ? (
          /* PROFILE SETUP */
          <div className="max-w-md mx-auto bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center mt-4 shadow-2xl">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <img src={tempPhoto || user?.photoURL} className="w-full h-full rounded-full border-4 border-pink-500 p-1" alt="Avatar" />
                <div className="absolute bottom-0 right-0 bg-pink-600 p-2 rounded-full border-2 border-black"><Camera size={12}/></div>
              </div>
              <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic">Edit Profile</h2>
              <div className="space-y-4 text-left">
                  <label className="text-[9px] font-black text-pink-500 ml-1 uppercase">Avatar Image URL</label>
                  <input type="text" placeholder="https://image-link.jpg" value={tempPhoto} onChange={(e) => setTempPhoto(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-[11px] text-white outline-none focus:border-pink-500" />
                  <label className="text-[9px] font-black text-pink-500 ml-1 uppercase">Username</label>
                  <input type="text" placeholder="@name" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl font-bold text-white outline-none focus:border-pink-500" />
                  <label className="text-[9px] font-black text-pink-500 ml-1 uppercase">About Bio</label>
                  <textarea placeholder="Write about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs text-white outline-none h-20 focus:border-pink-500" />
              </div>
              <button onClick={handleCreateProfile} className="w-full mt-8 py-5 bg-pink-600 rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">SAVE & CONTINUE</button>
              <button onClick={() => setSocialScreen('hub')} className="mt-4 text-gray-500 uppercase text-[10px]">Cancel</button>
          </div>
        ) : (
          /* ACTUAL MODES CONTENT */
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
             <h2 className="text-4xl font-black text-pink-500 uppercase italic mb-4">{socialScreen.toUpperCase()}</h2>
             <p className="text-gray-400 text-sm">Welcome {username}! <br/> Connecting to Pixabay API... Season 2 🚀</p>
             <div className="flex gap-4 mt-12">
                <button onClick={() => setSocialScreen('setup')} className="px-6 py-2 bg-pink-600 rounded-full text-[10px] font-black uppercase flex items-center gap-2 shadow-lg"><Edit3 size={14}/> Edit Profile</button>
                <button onClick={() => setSocialScreen('hub')} className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase">Back to Dashboard</button>
             </div>
          </div>
        )}
    </div>
)}

  <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5 transition-all"><img src="/founder_card.jpg" className="w-full max-w-4xl rounded-3xl shadow-2xl hover:scale-[1.01] transition-all" alt="Founder" /></section>
  
  <footer className="bg-black py-24 px-10 border-t border-white/5 text-center flex flex-col items-center">
    <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_30px_#06b6d4] mb-12 uppercase">AJ STUDIO</div>
    <div className="flex justify-center gap-10 mb-16">
        <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold uppercase hover:bg-green-500 hover:text-black transition-all">Whatsapp</a>
        <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold uppercase hover:bg-white hover:text-black transition-all">X (Twitter)</a>
    </div>
    <button onClick={() => {
        const link = document.createElement('a');
        link.href = '/aj-portal.apk';
        link.download = 'aj-portal.apk';
        link.click();
    }} className="group relative px-12 py-4 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_40px_#06b6d4] animate-pulse transition-all hover:scale-105">
       <span className="relative z-10 flex items-center gap-2 font-black tracking-widest"><Download size={22} /> Install AJ App</span>
       <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12"></div>
    </button>
  </footer>
</main>
);
}