"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Bot, Send, Activity, CheckCircle2, Download, Copy, Video, Newspaper, Users, MessageSquare, Camera, Settings, Edit3, Globe } from 'lucide-react';

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
const displayUsdt = ((balance + visualProfit) / 100).toFixed(2);

const copyToClipboard = (id) => {
  if(!id) return;
  navigator.clipboard.writeText(id);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

// --- PROFILE SETUP LOGIC ---
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
        setSocialScreen(pendingMode); // Go to clicked mode after setup
        alert("🚀 Identity Created!");
    } catch (e) { alert("Error saving profile"); }
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
    const lastSyncDate = data.lastSync.toDate ? data.lastSync.toDate() : new Date();
    const secPassed = (new Date().getTime() - lastSyncDate.getTime()) / 1000;
    const offlineProfit = (data.invested * (data.botTier === 'vvip' ? 0.05 : 0.02) * secPassed) / 86400;
    if (offlineProfit > 0.1) await updateDoc(userRef, { balance: increment(offlineProfit), lastSync: serverTimestamp() });
  }
} else {
  await setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, uid: currentUser.uid, lastSync: serverTimestamp(), hasSocialProfile: false, photo: currentUser.photoURL });
}

onSnapshot(userRef, (snap) => {
if (snap.exists()) { 
    const d = snap.data();
    setBalance(d.balance || 0); 
    setBotTier(d.botTier || 'none'); 
    setInvested(d.invested || 0);
    setHasSocialProfile(d.hasSocialProfile || false);
}
});
setScreen('hub');
} else { setScreen('auth'); }
});
return () => unsubscribe();
}, []);

// --- REVENUE LOGIC ---
useEffect(() => {
const handleSDK = (event) => {
if (!user) return;
const data = event.detail || event.data;
if (!data || !data.type) return;
const rawReward = data.amount || data.coins || 0;
const safeVal = rawReward / 1000; 
if (data.type === 'EARNED' || data.type === "ADD_AD_REVENUE") {
    updateDoc(doc(db, "users", user.uid), { balance: increment(safeVal * 0.30) });
    updateDoc(doc(db, "admin_ledger", "platform_stats"), { total_revenue: increment(safeVal * 0.70) });
  }
};
window.addEventListener("message", handleSDK);
return () => window.removeEventListener("message", handleSDK);
}, [user]);

// --- BOT ENGINE ---
useEffect(() => {
  let logInt, visualInt, dbSyncInt;
  if (user && botTier !== 'none' && invested > 0) {
    logInt = setInterval(() => {
      const actions = ["Neural Analysis", "Scanning Market", "Executing Trades"];
      setTradeLogs(prev => [`[${new Date().toLocaleTimeString()}] ${actions[Math.floor(Math.random()*3)]}...`, ...prev.slice(0, 2)]);
    }, 8000);
    const profitPerSec = (invested * (botTier === 'vvip' ? 0.05 : 0.02)) / 86400;
    visualInt = setInterval(() => setVisualProfit(p => p + profitPerSec), 1000);
    dbSyncInt = setInterval(async () => {
        setVisualProfit(v => {
            if(v >= 1) {
                updateDoc(doc(db, "users", user.uid), { balance: increment(Math.floor(v)), lastSync: serverTimestamp() });
                return v - Math.floor(v);
            }
            return v;
        });
    }, 600000);
  }
  return () => { clearInterval(logInt); clearInterval(visualInt); clearInterval(dbSyncInt); };
}, [user, botTier, invested]);

useEffect(() => {
if (screen === 'splash') {
  const timeout = setTimeout(() => setScreen('hub'), 2000);
  return () => clearTimeout(timeout);
}
}, [screen]);

const handleLogin = async () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, googleProvider);
};

const handlePurchase = async () => {
  if (purchaseMethod.includes('Binance')) {
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
      if(!purchaseTxId) return alert("Enter TX ID.");
      await addDoc(collection(db, "manual_deposits"), { uid: user.uid, amount: purchaseAmount, txId: purchaseTxId, status: "pending", date: serverTimestamp() });
      alert("✅ Request Sent!"); setWalletTab('main');
  }
};

const handleTransfer = async () => {
    if (transferAmount <= 0 || transferAmount > balance) return alert("Invalid Balance!");
    const recRef = doc(db, "users", transferId);
    const recSnap = await getDoc(recRef);
    if (recSnap.exists()) {
        await updateDoc(doc(db, "users", user.uid), { balance: increment(-transferAmount) });
        await updateDoc(recRef, { balance: increment(transferAmount) });
        alert("✅ Success!"); setWalletTab('main');
    } else alert("User not found!");
};

const handleWithdraw = async () => {
    if (balance < 50000) return alert("Min 50k Coins ($5)!");
    let details = payoutMethod.includes('Visa') ? `Name: ${cardName} | Card: ${cardNumber}` : payoutId;
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, email: user.email, amount_usd: (balance/10000), method: payoutMethod, details, status: "pending", date: serverTimestamp() });
    alert("✅ Request Sent!"); setWalletTab('main');
};

const activateBot = async (tier, cost) => {
    if (balance < cost) return alert("Low Balance!");
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost, lastSync: serverTimestamp() });
    setVisualProfit(0);
    alert("🚀 BOT ACTIVATED!");
};

if (screen === 'splash') return (
<main className="h-screen bg-black flex flex-col items-center justify-center text-white"><div className="w-40 h-40 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8"><img src="/logo.png" className="w-full h-full object-cover" /></div><h1 className="text-3xl font-black uppercase animate-pulse">AJ PORTAL</h1></main>
);

if (screen === 'auth') return (
<main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center"><div className="w-full max-w-sm bg-white/5 border border-white/10 p-12 rounded-[3rem] shadow-2xl"><h2 className="text-6xl font-black mb-10 italic text-cyan-400">AJ ID</h2><button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95">CONTINUE WITH GOOGLE</button></div></main>
);

return (
<main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
    <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
            <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer">
                <span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
                {user && <img src={tempPhoto || user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
            </div>
            <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full">EXIT</button>
        </div>
    </header>

    {/* HUB SECTION */}
    <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow-xl hover:border-cyan-400 transition-all"><Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" /><span className="font-black text-xs md:text-3xl uppercase">Gaming</span></div>
          <div onClick={() => {setScreen('social'); setSocialScreen('hub');}} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer hover:border-pink-500 transition-all"><Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" /><span className="font-black text-xs md:text-3xl uppercase">Social</span></div>
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 hover:border-yellow-500 transition-all"><img src="/gold.jpg" className="w-14 h-14 mb-2" /><h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2></div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer hover:border-green-500 transition-all"><Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" /><span className="font-black text-xs md:text-3xl uppercase">AJ AI</span></div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><div className="w-24 h-24 md:w-96 md:h-96 bg-black border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden"><img src="/logo.png" className="w-full h-full object-cover opacity-60 animate-pulse" /></div></div>
        </div>
    </section>

    {/* SOCIAL MODAL */}
    {screen === 'social' && (
        <div className="fixed inset-0 z-[400] bg-slate-950 p-8 overflow-y-auto">
            <div className="sticky top-0 w-full p-4 bg-black/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center z-[500] mb-8 rounded-full shadow-2xl">
                <button onClick={() => {setSocialScreen('hub'); setScreen('hub')}} className="text-pink-500 font-black text-xs uppercase">← HUB</button>
                <h2 className="text-xl font-black italic text-pink-500 uppercase">AJ Social</h2>
                <button onClick={() => setSocialScreen('setup')} className="bg-white/10 p-2 rounded-full text-pink-500"><Settings size={18}/></button>
            </div>

            {socialScreen === 'hub' ? (
                /* MENU DASHBOARD */
                <div className="max-w-md mx-auto grid grid-cols-1 gap-6 pb-24 px-2">
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-pink-500/20 mb-4">
                        <img src={tempPhoto || user?.photoURL} className="w-12 h-12 rounded-full border-2 border-pink-500 shadow-lg" />
                        <div>
                            <p className="font-black text-white text-sm uppercase">@{username || "New_Member"}</p>
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest">{hasSocialProfile ? "Verified Member" : "Profile Not Set"}</p>
                        </div>
                    </div>
                    {[{n:'AJ TikReels', i:<Video/>, s:'tikreels'}, {n:'AJ Pulse', i:<Users/>, s:'pulse'}, {n:'AJ Live Chat', i:<MessageSquare/>, s:'chat'}, {n:'AJ Discover', i:<Globe/>, s:'discover'}].map((m) => (
                        <div key={m.n} onClick={() => enterSocialMode(m.s)} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-center hover:border-pink-500 transition-all cursor-pointer group shadow-lg">
                            <div className="text-pink-500 mb-3 flex justify-center scale-150">{m.i}</div>
                            <h3 className="text-2xl font-black uppercase italic">{m.n}</h3>
                            <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-widest">Season 2 Module</p>
                        </div>
                    ))}
                </div>
            ) : socialScreen === 'setup' ? (
                /* SETUP SCREEN */
                <div className="max-w-md mx-auto bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center mt-4 shadow-2xl">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <img src={tempPhoto || user?.photoURL} className="w-full h-full rounded-full border-4 border-pink-500 p-1" />
                        <div className="absolute bottom-0 right-0 bg-pink-600 p-2 rounded-full border-2 border-black"><Camera size={14}/></div>
                    </div>
                    <h2 className="text-xl font-black text-white mb-6 uppercase italic">Identity Setup</h2>
                    <div className="space-y-4 text-left">
                        <label className="text-[9px] font-black text-pink-500 ml-1 uppercase">Avatar Image Link</label>
                        <input type="text" placeholder="https://link.jpg" value={tempPhoto} onChange={(e)=>setTempPhoto(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none focus:border-pink-500" />
                        <label className="text-[9px] font-black text-pink-500 ml-1 uppercase">Username</label>
                        <input type="text" placeholder="@name" value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl font-bold outline-none focus:border-pink-500" />
                        <label className="text-[9px] font-black text-pink-500 ml-1 uppercase">Bio</label>
                        <textarea placeholder="Write about yourself..." value={bio} onChange={(e)=>setBio(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-sm h-24 outline-none focus:border-pink-500" />
                    </div>
                    <button onClick={handleCreateProfile} className="w-full mt-8 py-5 bg-pink-600 rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">SAVE & CONTINUE</button>
                    <button onClick={() => setSocialScreen('hub')} className="mt-4 text-gray-500 uppercase text-xs w-full">Cancel</button>
                </div>
            ) : (
                /* MODES (TIKREELS, ETC) */
                <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                    <h2 className="text-4xl font-black text-pink-500 uppercase italic mb-4">{socialScreen.toUpperCase()}</h2>
                    <p className="text-gray-400 text-sm italic">Connecting to AJ Servers... <br/> Launching in next update! 🚀</p>
                    <div className="flex gap-4 mt-12">
                        <button onClick={() => setSocialScreen('setup')} className="px-6 py-2 bg-pink-600 rounded-full text-[10px] font-black uppercase flex items-center gap-2 shadow-lg"><Edit3 size={14}/> Edit Profile</button>
                        <button onClick={() => setSocialScreen('hub')} className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase">Dashboard</button>
                    </div>
                </div>
            )}
        </div>
    )}

    {/* BAAKI MODALS: ARCADE & WALLET (AS IS) */}
    {screen === 'arcade' && selectedGame && (
        <div className="fixed inset-0 z-[300] bg-black p-8 overflow-y-auto">
            <button onClick={() => setSelectedGame(null)} className="text-cyan-400 font-bold mb-10 tracking-widest uppercase">← BACK</button>
            <div className="w-full h-[80vh] bg-black rounded-3xl border-2 border-cyan-500 overflow-hidden relative shadow-2xl"><iframe src={`/games/${selectedGame.toLowerCase().replace(/ elite royal/g, '').replace(/ elite/g, '').replace(/ /g, '-')}/index.html`} className="w-full h-full border-none" /></div>
        </div>
    )}

    <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5"><img src="/founder_card.jpg" className="w-full max-w-4xl rounded-3xl shadow-2xl hover:scale-[1.01] transition-all" /></section>
    <footer className="bg-black py-24 px-10 border-t border-white/5 text-center flex flex-col items-center">
        <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 mb-12 uppercase">AJ STUDIO</div>
        <div className="flex justify-center gap-10 mb-16">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold uppercase hover:bg-green-500 hover:text-black">Whatsapp</a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold uppercase hover:bg-white hover:text-black">X (Twitter)</a>
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