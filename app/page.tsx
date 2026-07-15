"use client";
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X, CheckCircle2, Download, Copy, Video, Newspaper, Users, Heart, MessageSquare, Camera, Settings, Edit3, Mail, Lock, User, DollarSign } from 'lucide-react';
import emailjs from 'emailjs-com';

// --- CONFIGURATIONS ---
const EMAILJS_CONFIG = {
  Service_ID: "service_6w1sols",
  Template_ID: "template_o1c40nv",
  Public_Key: "6JCPm9fo38ovnA5LG"
};

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
const [manualEmail, setManualEmail] = useState('');
const [manualPass, setManualPass] = useState('');
const fileInputRef = useRef(null); 

// --- AI STATES ---
const [visualProfit, setVisualProfit] = useState(0);
const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility...", "Connecting to AJ liquidity pool..."]);

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

// --- MATH (Withdrawal 500:1 -> 1000 per $2) ---
const displayBalance = (balance + visualProfit).toFixed(2);
const displayUsdt = ((balance + visualProfit) / 500).toFixed(2);

const copyToClipboard = (id) => {
  if(!id) return;
  navigator.clipboard.writeText(id);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

// --- IMAGE PICKER ---
const handleImageClick = () => { fileInputRef.current?.click(); };
const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => { setTempPhoto(reader.result); };
        reader.readAsDataURL(file);
    }
};

// --- AUTH HANDLERS ---
const handleLogin = async () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, googleProvider);
};

const handleManualSignup = async () => {
    if(!manualEmail || !manualPass) return alert("Fill Email and Password");
    try {
        await createUserWithEmailAndPassword(auth, manualEmail, manualPass);
        alert("Account Created! Now setup profile.");
    } catch (e) { alert(e.message); }
};

const handleSignOut = async () => {
    await signOut(auth);
    setSocialScreen('hub');
    setScreen('auth');
};

// --- SOCIAL HANDLERS ---
const handleCreateProfile = async () => {
    if(username.length < 3) return alert("Username too short!");
    try {
        await updateDoc(doc(db, "users", user.uid), {
            username: username.toLowerCase().trim(),
            bio: bio,
            photo: tempPhoto || user.photoURL || "/logo.png",
            hasSocialProfile: true
        });
        setHasSocialProfile(true);
        setSocialScreen(pendingMode || 'hub');
        alert("🚀 Profile Active!");
    } catch (e) { alert("Error!"); }
};

const enterSocialMode = (mode) => {
    setPendingMode(mode);
    if (!user) {
        setSocialScreen('setup'); 
    } else {
        setSocialScreen(mode);
    }
};

// --- PROFIT LOGIC (70/30) ---
useEffect(() => {
const handleSDKMessages = (event) => {
    if (!user) return;
    const data = event.detail || event.data;
    if (!data || !data.type) return;
    const rawReward = data.amount || data.coins || 0;
    const safeTotalValue = rawReward / 100; 
    const userRef = doc(db, "users", user.uid);
    const adminRef = doc(db, "admin_ledger", "platform_stats");
    if (data.type === 'EARNED' || data.type === "ADD_AD_REVENUE") {
        updateDoc(userRef, { balance: increment(safeTotalValue * 0.30) });
        updateDoc(adminRef, { total_revenue: increment(safeTotalValue * 0.70) });
    }
};
window.addEventListener("message", handleSDKMessages);
return () => window.removeEventListener("message", handleSDKMessages);
}, [user]);

// --- AI BOT ENGINE ---
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
      setVisualProfit(curr => {
        if (curr >= 1) {
          const syncAmt = Math.floor(curr); 
          updateDoc(doc(db, "users", user.uid), { balance: increment(syncAmt), lastSync: serverTimestamp() });
          return curr - syncAmt;
        }
        return curr;
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
    } else {
        await setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, uid: currentUser.uid, lastSync: serverTimestamp(), hasSocialProfile: false });
    }
    onSnapshot(userRef, (snap) => {
        if (snap.exists()) { setBalance(snap.data().balance || 0); setBotTier(snap.data().botTier || 'none'); setInvested(snap.data().invested || 0); setHasSocialProfile(snap.data().hasSocialProfile || false); }
    });
    setScreen('hub');
} else setScreen('auth');
});
return () => unsubscribe();
}, []);

const handlePurchase = async () => {
  if (purchaseAmount < 20) return alert("Minimum purchase is $20!");
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
      alert("✅ Request Sent!"); setWalletTab('main');
  }
};

const handleWithdraw = async () => {
    if (balance < 12500) return alert("Min 12,500 Coins!");
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, email: user.email, amount_usd: (balance/500), method: payoutMethod, status: "pending", date: serverTimestamp() });
    alert("✅ Sent!"); setWalletTab('main');
};

const handleTransfer = async () => {
    if (!transferId || transferAmount <= 0 || transferAmount > (balance + visualProfit)) return alert("Check ID/Balance");
    const recRef = doc(db, "users", transferId);
    const recSnap = await getDoc(recRef);
    if (recSnap.exists()) {
        await updateDoc(doc(db, "users", user.uid), { balance: increment(-transferAmount) });
        await updateDoc(recRef, { balance: increment(transferAmount) });
        alert("✅ Sent!"); setWalletTab('main');
    } else alert("Invalid ID");
};

if (screen === 'splash') return (
<main className="h-screen bg-black flex flex-col items-center justify-center text-white"><div className="w-40 h-40 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8"><img src="/logo.png" className="w-full h-full object-cover" /></div><h1 className="text-4xl font-black text-cyan-400">AJ PORTAL</h1></main>
);

if (screen === 'auth') return (
<main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center"><div className="w-full max-w-sm bg-white/5 border border-white/10 p-12 rounded-[3rem] shadow-2xl"><h2 className="text-6xl font-black mb-10 text-cyan-400">AJ ID</h2><button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl">CONTINUE WITH GOOGLE</button></div></main>
);

return (
<main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
    <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
            <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer">
                <span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
                <span className="text-[10px] text-green-400 font-bold">${displayUsdt}</span>
                {user && <img src={tempPhoto || user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
            </div>
            <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full">EXIT</button>
        </div>
    </header>

    <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl"><Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" /><span className="font-black text-xs md:text-3xl">GAMING</span></div>
          <div onClick={() => {setSocialScreen('hub'); setScreen('social');}} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl"><Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" /><span className="font-black text-xs md:text-3xl">SOCIAL</span></div>
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl"><img src="/gold.jpg" className="w-14 h-14 mb-2" /><h2 className="font-black text-xs md:text-3xl text-yellow-500">WALLET</h2></div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl"><Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" /><span className="font-black text-xs md:text-3xl">AJ AI</span></div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><div className="w-24 h-24 md:w-96 md:h-96 bg-black border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden"><img src="/logo.png" className="w-full h-full object-cover opacity-60 animate-pulse" /></div></div>
        </div>
    </section>

    {screen === 'arcade' && (
        <div className="fixed inset-0 z-[300] bg-black p-8 overflow-y-auto">
            <button onClick={() => {setScreen('hub'); setSelectedGame(null)}} className="text-cyan-400 font-bold mb-10 uppercase">← BACK</button>
            {!selectedGame ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape', 'Ludo Elite Royal', 'Puck Pulse Elite'].map((g) => (
                        <div key={g} onClick={() => setSelectedGame(g)} className="bg-white/5 border p-4 rounded-3xl text-center cursor-pointer">
                            <img src={`/games/${g.toLowerCase().replace(/ /g, '-')}/logo.png`} className="w-full aspect-square rounded-2xl mb-4" onError={(e:any) => e.target.src="/logo.png"} />
                            <h3 className="font-black text-[10px] uppercase text-white">{g}</h3>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="w-full h-[80vh] bg-black rounded-3xl border-2 border-cyan-500 overflow-hidden"><iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-full" /></div>
            )}
        </div>
    )}

    {screen === 'wallet' && (
        <div className="fixed inset-0 z-[300] bg-black/95 p-8 flex flex-col items-center overflow-y-auto">
            <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 mb-8 font-bold uppercase">← BACK</button>
            <div className="w-full max-w-md bg-[#111] border p-10 rounded-3xl text-center shadow-2xl">
                <h2 className="text-5xl font-black text-yellow-500 mb-2">{displayBalance} 🪙</h2>
                <p className="text-green-400 font-black text-xl mb-8">${displayUsdt}</p>
                {walletTab === 'main' && (
                    <div className="flex flex-col gap-4">
                        <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-black uppercase shadow-lg">Purchase</button>
                        <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-xl font-black border border-cyan-500/30 uppercase">Transfer</button>
                        <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-xl font-black border border-pink-500/30 uppercase">Withdraw</button>
                    </div>
                )}
                {walletTab === 'purchase' && (
                    <div className="flex flex-col gap-5 text-left">
                        <div className="bg-black border-2 border-white/10 p-6 rounded-3xl text-center">
                            <p className="text-yellow-500 text-4xl font-black mb-1">{(purchaseAmount * 100).toLocaleString()} 🪙</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-green-400 text-2xl font-bold">$</span>
                                <input type="number" value={purchaseAmount === 0 ? '' : purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="bg-transparent text-white text-2xl text-center font-bold outline-none" />
                            </div>
                        </div>
                        <button onClick={handlePurchase} className="bg-cyan-500 py-5 rounded-xl font-black uppercase shadow-lg">PAY NOW</button>
                        <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2">Cancel</button>
                    </div>
                )}
                {walletTab === 'transfer' && (
                    <div className="flex flex-col gap-4 text-left">
                        <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-xl mb-2 text-center">
                            <p className="text-[10px] text-gray-500 uppercase">My ID</p>
                            <p className="text-sm font-mono text-cyan-400 font-black">{user?.uid}</p>
                        </div>
                        <input type="text" placeholder="Recipient ID" value={transferId} onChange={(e)=>setTransferId(e.target.value)} className="bg-black border p-4 rounded-xl text-white text-center outline-none border-white/10" />
                        <input type="number" placeholder="Amount" value={transferAmount === 0 ? '' : transferAmount} onChange={(e)=>setTransferAmount(Number(e.target.value))} className="bg-black border p-4 rounded-xl text-white text-center outline-none border-white/10" />
                        <button onClick={handleTransfer} className="bg-cyan-600 py-4 rounded-xl font-black uppercase shadow-lg">Send</button>
                        <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2">Back</button>
                    </div>
                )}
                {walletTab === 'withdraw' && (
                    <div className="flex flex-col gap-4 text-left">
                        <select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 border p-4 rounded-xl text-white font-bold outline-none"><option>Binance Pay (USDT)</option><option>Airtm (Gmail)</option><option>EasyPaisa (PKR)</option><option>JazzCash (PKR)</option></select>
                        <input type="text" placeholder="Account Details" onChange={(e)=>setPayoutId(e.target.value)} className="bg-black border p-4 rounded-xl text-white text-center outline-none border-white/10" />
                        <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-black uppercase shadow-lg">Request</button>
                        <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2">Back</button>
                    </div>
                )}
            </div>
        </div>
    )}

    {/* SOCIAL HUB */}
    {screen === 'social' && (
        <div className="fixed inset-0 z-[400] bg-black p-8 overflow-y-auto text-center">
            <button onClick={() => {setSocialScreen('hub'); setScreen('hub')}} className="text-pink-500 font-black mb-8 uppercase">← BACK</button>
            {socialScreen === 'hub' ? (
                <div className="max-w-md mx-auto grid grid-cols-1 gap-6">
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-pink-500/20 mb-4">
                        <img src={tempPhoto || user?.photoURL} className="w-12 h-12 rounded-full border-2 border-pink-500 shadow-lg" />
                        <div onClick={handleImageClick} className="cursor-pointer text-left">
                            <p className="font-black text-white text-sm uppercase">@{username || "AJ_Member"}</p>
                            <p className="text-[9px] text-gray-500 uppercase font-bold underline">Edit Profile</p>
                        </div>
                    </div>
                    {[{n:'AJ TikReels', i:Video, s:'tikreels'}, {n:'AJ Pulse', i:Users, s:'pulse'}, {n:'AJ Live Chat', i:MessageSquare, s:'chat'}, {n:'AJ Discover', i:Globe, s:'discover'}].map((m) => (
                        <div key={m.n} onClick={() => enterSocialMode(m.s)} className="p-8 bg-white/5 border border-white/10 rounded-[3rem] text-center hover:border-pink-500 transition-all cursor-pointer">
                            <m.i className="mx-auto mb-4 text-pink-500" size={36} />
                            <h3 className="text-2xl font-black uppercase italic text-white">{m.n}</h3>
                        </div>
                    ))}
                </div>
            ) : socialScreen === 'setup' ? (
                <div className="max-w-md mx-auto bg-white/5 border p-10 rounded-[3rem] text-center mt-4 shadow-2xl">
                    <div className="relative w-24 h-24 mx-auto mb-8 cursor-pointer" onClick={handleImageClick}>
                        <img src={tempPhoto || user?.photoURL || "/logo.png"} className="w-full h-full rounded-full border-4 border-pink-500 p-1 object-cover" />
                        <div className="absolute bottom-0 right-0 bg-pink-600 p-2 rounded-full border-2 border-black shadow-lg"><Camera size={14}/></div>
                    </div>
                    <h2 className="text-xl font-black text-white mb-6 uppercase italic">Setup Identity</h2>
                    <div className="space-y-4 text-left">
                        {!user ? <button onClick={handleGoogleLogin} className="w-full py-4 bg-white text-black font-black rounded-xl">Google Login</button> : 
                        <><input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black border p-4 rounded-2xl text-white outline-none" />
                        <textarea placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-black border p-4 rounded-2xl text-sm h-24 outline-none" /></>}
                    </div>
                    <button onClick={handleCreateProfile} className="w-full mt-8 py-5 bg-pink-600 rounded-2xl font-black uppercase shadow-lg">Save & Continue</button>
                    <div className="mt-6"><button onClick={handleSignOut} className="text-red-500 text-xs font-bold uppercase">Sign Out</button></div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <h2 className="text-4xl font-black text-pink-500 uppercase italic mb-4">{socialScreen.toUpperCase()}</h2>
                    <p className="text-gray-400">Arriving soon... 🚀</p>
                    <button onClick={() => setSocialScreen('hub')} className="mt-12 px-10 py-3 bg-white/5 border rounded-full text-xs font-black uppercase">Back</button>
                </div>
            )}
        </div>
    )}

    {/* AI BOT SCREEN */}
    {screen === 'ai' && (
        <div className="fixed inset-0 z-[400] bg-black p-8 overflow-y-auto text-center">
            <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-black mb-8 uppercase">← BACK</button>
            <h2 className="text-5xl font-black mb-12 text-white italic">AJ AI BOT</h2>
            {botTier !== 'none' && (
                <div className="w-full max-w-2xl mx-auto bg-white/5 border-2 border-green-500/40 p-8 rounded-[3rem] text-center mb-16 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <Activity size={60} className="mx-auto mb-6 text-green-500 animate-pulse" />
                    <h2 className="text-4xl font-black text-white mb-2 uppercase">{botTier} BOT RUNNING</h2>
                    <div className="w-full bg-black/50 border border-green-500/30 p-6 rounded-2xl font-mono text-left">
                        <span className="text-white font-black text-lg">PROFIT: +{visualProfit.toFixed(4)} 🪙</span>
                        <div className="h-20 overflow-hidden text-green-500/70 mt-2">{tradeLogs.map((log, i) => ( <div key={i}>{log}</div> ))}</div>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">
                <div className={`p-10 rounded-3xl text-center border-2 transition-all ${botTier === 'basic' ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-white/5'}`}>
                    <h3 className="text-xl font-black text-cyan-400 uppercase">Basic (+2% Daily)</h3>
                    <p className="text-3xl font-black text-white my-6">2,500 Coins</p>
                    <button onClick={() => activateBot('basic', 2500)} className={`w-full py-4 rounded-xl font-black uppercase shadow-lg ${botTier === 'basic' ? 'bg-green-500 text-black cursor-not-allowed' : 'bg-cyan-600'}`}>
                        {botTier === 'basic' ? "RUNNING" : "ACTIVATE"}
                    </button>
                </div>
                <div className={`p-10 rounded-3xl text-center border-2 transition-all ${botTier === 'vvip' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 bg-white/5'}`}>
                    <h3 className="text-xl font-black text-yellow-500 uppercase">VVIP (+5% Daily)</h3>
                    <p className="text-3xl font-black text-white my-6">7,500 Coins</p>
                    <button onClick={() => activateBot('vvip', 7500)} className={`w-full py-4 rounded-xl font-black uppercase shadow-lg ${botTier === 'vvip' ? 'bg-yellow-500 text-black cursor-not-allowed' : 'bg-yellow-600'}`}>
                        {botTier === 'vvip' ? "RUNNING" : "ACTIVATE"}
                    </button>
                </div>
            </div>
        </div>
    )}

    {/* FOUNDER CARD SECTION */}
    <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5 transition-all">
        <img src="/founder_card.jpg" className="w-full max-w-4xl rounded-3xl shadow-2xl" />
    </section>

    <footer className="bg-black py-24 px-10 border-t border-white/5 text-center flex flex-col items-center">
        <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 mb-12 uppercase">AJ STUDIO</div>
        <div className="flex justify-center gap-10 mb-16">
          <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold uppercase hover:bg-green-500 hover:text-black transition-all">Whatsapp</a>
          <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold uppercase hover:bg-white hover:text-black transition-all">X (Twitter)</a>
        </div>
        <button onClick={() => { const link = document.createElement('a'); link.href = '/aj-portal.apk'; link.download = 'aj-portal.apk'; link.click(); }} className="group relative px-12 py-4 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_40px_#06b6d4] animate-pulse transition-all hover:scale-105">
           <span className="relative z-10 flex items-center gap-2 font-black tracking-widest"><Download size={22} /> Install AJ App</span>
        </button>
    </footer>
</main>
);
}