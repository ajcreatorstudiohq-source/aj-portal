"use client";
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X, CheckCircle2, Download, Copy, Video, Newspaper, Users, Heart, MessageSquare, Camera, Settings, Edit3, Mail, Lock, User, DollarSign, Share2, Music, Play, PlusSquare, MoreVertical } from 'lucide-react';
import emailjs from 'emailjs-com';

// --- CONFIGURATIONS ---
const PIXABAY_KEY = "56712915-2297d0968e99520a1b3d80623";
const NEWS_API_KEY = "6e79bcc161f047039bf1acab74da28ea";

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
const fileInputRef = useRef<HTMLInputElement>(null); 

// --- NEW SOCIAL CONTENT STATES ---
const [pixaData, setPixaData] = useState([]);
const [pixaVideos, setPixaVideos] = useState([]);
const [newsData, setNewsData] = useState([]);
const [chatMessages, setChatMessages] = useState([]);
const [newMessage, setNewMessage] = useState('');

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

// --- ALI BHAI MATH (Withdrawal 500:1 -> 1000 per $2) ---
const displayBalance = (balance + visualProfit).toFixed(2);
const displayUsdt = ((balance + visualProfit) / 500).toFixed(2);

// --- AD NAVIGATION HELPER ---
const navigateWithAd = (toScreen: string) => {
    if ((window as any).AJ_SDK) (window as any).AJ_SDK.showAd();
    if (toScreen === 'social') { fetchSocialAPIs(); setScreen('social'); setSocialScreen('hub'); }
    else { setScreen(toScreen); }
};

// --- API FETCHERS ---
const fetchSocialAPIs = async () => {
    try {
        const pRes = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&q=models+car+fitness&image_type=photo&per_page=30`);
        const pData = await pRes.json(); setPixaData(pData.hits || []);
        
        const vRes = await fetch(`https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=travel+fashion&per_page=20`);
        const vData = await vRes.json(); setPixaVideos(vData.hits || []);

        const nRes = await fetch(`https://newsapi.org/v2/everything?q=crypto+tech&apiKey=${NEWS_API_KEY}`);
        const nData = await nRes.json(); setNewsData(nData.articles || []);
    } catch (e) { console.log("API Error"); }
};

// --- FIREBASE LIVE CHAT LISTENER ---
useEffect(() => {
    if (socialScreen === 'chat') {
        const q = query(collection(db, "global_chat"), orderBy("createdAt", "desc"), limit(30));
        return onSnapshot(q, (snap) => {
            setChatMessages(snap.docs.map(d => ({id: d.id, ...d.data()})).reverse());
        });
    }
}, [socialScreen]);

const sendChatMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await addDoc(collection(db, "global_chat"), {
        text: newMessage,
        uid: (user as any).uid,
        username: username || "AJ_Member",
        photo: tempPhoto || (user as any).photoURL,
        createdAt: serverTimestamp()
    });
    setNewMessage('');
};

const copyToClipboard = (id: string) => {
  if(!id) return;
  navigator.clipboard.writeText(id);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

// --- IMAGE PICKER HANDLERS ---
const handleImageClick = () => { fileInputRef.current?.click(); };
const handleFileChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => { setTempPhoto(reader.result as string); };
        reader.readAsDataURL(file);
    }
};

// --- AUTH HANDLERS ---
const handleGoogleLogin = async () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, googleProvider);
};

const handleManualSignup = async () => {
    if(!manualEmail || !manualPass) return alert("Fill Email and Password");
    try {
        await createUserWithEmailAndPassword(auth, manualEmail, manualPass);
        alert("Account Created! Setup profile.");
    } catch (e: any) { alert(e.message); }
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
        await updateDoc(doc(db, "users", (user as any)!.uid), {
            username: username.toLowerCase().trim(),
            bio: bio,
            photo: tempPhoto || (user as any)!.photoURL || "/logo.png",
            hasSocialProfile: true
        });
        setHasSocialProfile(true);
        setSocialScreen(pendingMode || 'hub');
        alert("🚀 Profile Active!");
    } catch (e) { alert("Setup Error!"); }
};

const enterSocialMode = (mode: string) => {
    setPendingMode(mode);
    if (!user || !hasSocialProfile) {
        setSocialScreen('setup'); 
    } else {
        setSocialScreen(mode);
    }
};

// --- PROFIT LOGIC (70/30) ---
useEffect(() => {
const handleSDKMessages = (event: any) => {
if (!user) return;
const data = event.detail || event.data;
if (!data || !data.type) return;
const rawReward = data.amount || data.coins || 0;
const safeTotalValue = rawReward / 100; 

const userRef = doc(db, "users", (user as any).uid);
const adminRef = doc(db, "admin_ledger", "platform_stats");
if (data.type === 'EARNED' || data.type === "ADD_AD_REVENUE") {
    updateDoc(userRef, { balance: increment(safeTotalValue * 0.30) });
    updateDoc(adminRef, { total_revenue: increment(safeTotalValue * 0.70) });
  }
};
window.addEventListener("message", handleSDKMessages);
return () => window.removeEventListener("message", handleSDKMessages);
}, [user]);

// --- AI BOT ENGINE (FIXED CRASH) ---
useEffect(() => {
  let logInt: any, visualInt: any, dbSyncInt: any;
  if (user && botTier !== 'none' && invested > 0) {
    logInt = setInterval(() => {
      const actions = ["Scalping BTC", "Neural Analysis", "Hedging SOL"];
      setTradeLogs(prev => [`[${new Date().toLocaleTimeString()}] ${actions[Math.floor(Math.random()*3)]}...`, ...prev.slice(0, 3)]);
    }, 7000);
    const dailyRate = botTier === 'vvip' ? 0.05 : 0.02;
    const profitPerSec = (invested * dailyRate) / 86400;
    visualInt = setInterval(() => setVisualProfit(p => p + profitPerSec), 1000);
    dbSyncInt = setInterval(async () => {
      setVisualProfit(currValue => {
        if (currValue >= 1) {
          const syncAmt = Math.floor(currValue); 
          updateDoc(doc(db, "users", (user as any)!.uid), { balance: increment(syncAmt), lastSync: serverTimestamp() });
          return currValue - syncAmt;
        }
        return currValue;
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
setUser(currentUser as any);
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
if (snap.exists()) { setBalance(snap.data().balance || 0); setBotTier(snap.data().botTier || 'none'); setInvested(snap.data().invested || 0); setHasSocialProfile(snap.data().hasSocialProfile || false); }
});
setScreen('hub');
} else { setUser(null); setScreen('auth'); }
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
      await addDoc(collection(db, "manual_deposits"), { uid: (user as any)!.uid, email: (user as any)!.email, amount: purchaseAmount, method: "Airtm", txId: purchaseTxId, status: "pending", date: serverTimestamp() });
      alert("✅ Request Sent!"); setWalletTab('main');
  }
};

const handleTransfer = async () => {
if (!transferId || transferAmount <= 0 || transferAmount > balance) return alert("Invalid Data or Balance!");
const recipientRef = doc(db, "users", transferId);
const recipientSnap = await getDoc(recipientRef);
if (recipientSnap.exists()) {
await updateDoc(doc(db, "users", (user as any)!.uid), { balance: increment(-transferAmount) });
await updateDoc(recipientRef, { balance: increment(transferAmount) });
alert("✅ Success!"); setWalletTab('main');
} else { alert("ID Not Found!"); }
};

const handleWithdraw = async () => {
if (balance < 12500) return alert("Min 12,500 Coins ($25)!");
let details = payoutId;
if (payoutMethod.includes('Visa')) details = `Name: ${cardName} | Card: ${cardNumber}`;
await addDoc(collection(db, "withdraw_requests"), { uid: (user as any)!.uid, email: (user as any)!.email, amount_coins: balance, amount_usd: (balance/500), method: payoutMethod, details: details, status: "pending", date: serverTimestamp() });
alert("✅ Request Sent!"); setWalletTab('main');
};

const activateBot = async (tier: string, cost: number) => {
    if (balance < cost) return alert("Insufficient Balance!");
    const userRef = doc(db, "users", (user as any)!.uid);
    await updateDoc(userRef, { balance: increment(-cost), botTier: tier, invested: cost, lastSync: serverTimestamp() });
    alert(`${tier.toUpperCase()} BOT ACTIVATED!`);
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
<button onClick={handleGoogleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95">CONTINUE WITH GOOGLE</button>
<p className="mt-8 text-yellow-500 font-bold tracking-widest">+500 COINS BONUS</p>
</div>
</main>
);

return (
<main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
<input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

<header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
<div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
<div className="flex items-center gap-3">
<div onClick={() => navigateWithAd('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer transition-all hover:bg-white/10">
<span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
<span className="text-[10px] text-green-400 font-black ml-1">${displayUsdt}</span>
{user && <img src={tempPhoto || (user as any).photoURL} className="w-8 h-8 rounded-full border border-cyan-500 shadow-[0_0_10px_#06b6d4]" />}
</div>
<button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full uppercase">EXIT</button>
</div>
</header>

<section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
    <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
    <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
      <div onClick={() => navigateWithAd('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all hover:border-cyan-400">
         <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase">Gaming</span>
      </div>
      <div onClick={() => navigateWithAd('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl relative z-50 cursor-pointer hover:border-pink-500">
         <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase">Social</span>
      </div>
      <div onClick={() => navigateWithAd('wallet')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 hover:border-yellow-500 relative z-30">
         <img src="/gold.jpg" className="w-14 h-14 mb-2" />
         <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
      </div>
      <div onClick={() => navigateWithAd('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer hover:border-green-500 relative z-30">
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

{/* ARCADE MODAL - FULL SCREEN */}
{screen === 'arcade' && (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
        {!selectedGame ? (
            <div className="p-8 overflow-y-auto flex-1">
                <button onClick={() => {setScreen('hub'); setSelectedGame(null)}} className="text-cyan-400 font-bold mb-10 tracking-widest uppercase transition-all hover:brightness-125">← BACK TO HUB</button>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20">
                {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape', 'Ludo Elite Royal', 'Puck Pulse Elite'].map((game) => {
                const isComingSoon = game === 'Ludo Elite Royal' || game === 'Puck Pulse Elite';
                const folderName = game.replace(' Elite Royal', '').replace(' Elite', '').toLowerCase().replace(/ /g, '-');
                return (
                <div key={game} onClick={() => !isComingSoon && setSelectedGame(game)} className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center hover:border-cyan-400 cursor-pointer transition-all">
                    <img src={`/games/${folderName}/logo.png`} className="w-full aspect-square rounded-xl mb-4 object-cover shadow-lg" alt={game} onError={(e:any) => { (e.target as HTMLImageElement).src = "/logo.png"; }} />
                    <h3 className="font-black text-sm uppercase">{game}</h3>
                    <button className={`mt-4 w-full py-2 rounded-full font-black text-[10px] uppercase transition-all ${isComingSoon ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-cyan-500 text-black shadow-[0_0_10px_#06b6d4]'}`}>{isComingSoon ? "Soon" : "PLAY NOW"}</button>
                </div>
                )})}
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col">
                <div className="w-full bg-black h-12 flex items-center px-6 border-b border-white/10">
                    <button onClick={() => setSelectedGame(null)} className="text-cyan-400 font-black text-[10px] uppercase">← BACK TO HUB</button>
                    <div className="flex-1 text-center font-black uppercase text-[10px] opacity-40">{selectedGame}</div>
                </div>
                <iframe src={`/games/${selectedGame.toLowerCase().replace(/ elite royal/g, '').replace(/ elite/g, '').replace(/ /g, '-')}/index.html`} className="w-full flex-1 border-none" title="Game" />
            </div>
        )}
    </div>
)}

{/* SOCIAL HUB - TIKTOK, INSTA, WHATSAPP DESIGNED */}
{screen === 'social' && (
    <div className="fixed inset-0 z-[400] bg-slate-950 flex flex-col">
        <header className="sticky top-0 w-full p-4 bg-black/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center z-[500] rounded-b-3xl">
            <button onClick={() => {setSocialScreen('hub'); setScreen('hub')}} className="text-pink-500 font-black text-xs uppercase">← HUB</button>
            <h2 className="text-xl font-black italic text-pink-500 uppercase text-center flex-1">AJ Social</h2>
            <button onClick={() => setSocialScreen('setup')} className="bg-white/10 p-2 rounded-full text-pink-500"><Settings size={18}/></button>
        </header>

        <div className="flex-1 overflow-y-auto">
        {socialScreen === 'hub' ? (
          <div className="max-w-md mx-auto grid grid-cols-1 gap-6 p-8 text-center">
             <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-pink-500/20 mb-4">
                  <img src={tempPhoto || (user as any)?.photoURL} className="w-12 h-12 rounded-full border-2 border-pink-500 shadow-lg" alt="Profile" />
                  <div>
                    <p className="font-black text-white text-sm uppercase">@{username || "AJ_Member"}</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">Verified Member</p>
                  </div>
             </div>
             {[{n:'AJ TikReels', i:Video, d:'TikTok Style Short Videos', s:'tikreels'}, {n:'AJ Pulse', i:Users, d:'FB/Insta Post Feed', s:'pulse'}, {n:'AJ Live Chat', i:MessageSquare, d:'WhatsApp Setup Style', s:'chat'}, {n:'AJ Discover', i:Globe, d:'Crypto & Tech News', s:'discover'}].map((mod) => (
                <div key={mod.n} onClick={() => enterSocialMode(mod.s)} className="p-8 bg-white/5 border border-white/10 rounded-[3rem] text-center hover:border-pink-500 transition-all cursor-pointer group shadow-lg">
                    <div className="text-pink-500 mb-4 flex justify-center group-hover:scale-110 transition-transform"><mod.i size={36}/></div>
                    <h3 className="text-2xl font-black uppercase italic text-white">{mod.n}</h3>
                    <p className="text-[9px] text-gray-500 uppercase mt-1">{mod.d}</p>
                </div>
             ))}
          </div>
        ) : socialScreen === 'tikreels' ? (
            <div className="h-full w-full max-w-md mx-auto snap-y snap-mandatory overflow-y-auto bg-black">
                <button onClick={()=>setSocialScreen('hub')} className="fixed left-4 top-20 z-[600] bg-white/20 p-2 rounded-full">←</button>
                {pixaVideos.map((vid:any, i) => (
                    <div key={i} className="h-[85vh] w-full snap-start relative border-b border-white/5">
                        <video src={vid.videos.large.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center">
                            <div className="flex flex-col items-center"><Heart size={30} fill="#ff0055" className="text-pink-500"/><span className="text-[10px] font-bold">12.4k</span></div>
                            <div className="flex flex-col items-center"><MessageCircle size={30}/><span className="text-[10px] font-bold">842</span></div>
                            <div className="flex flex-col items-center"><Share2 size={30}/><span className="text-[10px] font-bold">Share</span></div>
                        </div>
                        <div className="absolute bottom-10 left-6 text-white">
                            <p className="font-black text-sm">@{vid.user}</p>
                            <p className="text-xs opacity-80 mt-1 line-clamp-1">Amazing trip to the hills! #AJTikReels #Viral</p>
                            <div className="flex items-center gap-2 mt-2"><Music size={12}/> <p className="text-[10px] italic">Original Sound - AJ Creator</p></div>
                        </div>
                    </div>
                ))}
            </div>
        ) : socialScreen === 'pulse' ? (
            <div className="max-w-md mx-auto space-y-6 p-4 pb-24">
                <button onClick={()=>setSocialScreen('hub')} className="text-pink-500 font-bold mb-4">← BACK</button>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10"><div className="flex gap-3"><img src={tempPhoto || (user as any).photoURL} className="w-10 h-10 rounded-full"/><input type="text" placeholder="What's on your mind?" className="flex-1 bg-white/5 rounded-full px-4 text-xs outline-none border border-white/10"/></div><div className="flex justify-between mt-4 border-t border-white/5 pt-3"><div className="flex gap-4 text-xs font-bold text-gray-400"><Camera size={18}/> Image</div><button className="bg-pink-600 px-4 py-1 rounded-lg text-xs font-black">POST</button></div></div>
                {pixaData.map((post:any, i) => (
                    <div key={i} className="bg-white/10 border border-white/10 rounded-3xl overflow-hidden">
                        <div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><img src={post.userImageURL || "/logo.png"} className="w-8 h-8 rounded-full border border-pink-500"/><p className="font-bold text-xs">@{post.user}</p></div><MoreVertical size={16}/></div>
                        <img src={post.largeImageURL} className="w-full aspect-square object-cover" />
                        <div className="p-4"><div className="flex gap-4 mb-3"><Heart size={24} className="hover:text-pink-500 cursor-pointer"/><MessageSquare size={24}/><Share2 size={24}/></div><p className="text-xs"><b>{post.likes} likes</b></p><p className="text-[11px] mt-2 line-clamp-2"><span className="font-bold">@{post.user}</span> Exploring new horizons with #AJPortal technology!</p><p className="text-[9px] text-gray-500 mt-2 uppercase">View all 12 comments</p></div>
                    </div>
                ))}
            </div>
        ) : socialScreen === 'discover' ? (
            <div className="max-w-4xl mx-auto space-y-4 p-4 pb-24">
                <button onClick={()=>setSocialScreen('hub')} className="text-pink-500 font-black mb-4">← BACK</button>
                <h3 className="text-cyan-400 font-black flex items-center gap-2"><TrendingUp size={18}/> TECH & CRYPTO DAILY</h3>
                {newsData.map((art: any, i) => (
                    <div key={i} className="bg-white/5 p-5 rounded-3xl border border-white/10 flex flex-col md:flex-row gap-5">
                        {art.urlToImage && <img src={art.urlToImage} className="w-full md:w-40 h-40 object-cover rounded-2xl" />}
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-2"><span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-black uppercase">{art.source?.name}</span><span className="text-[8px] text-gray-500">{new Date(art.publishedAt).toLocaleDateString()}</span></div>
                            <h4 className="font-black text-sm text-white leading-tight mb-2">{art.title}</h4>
                            <p className="text-[10px] text-gray-400 line-clamp-2 mb-3">{art.description}</p>
                            <a href={art.url} target="_blank" className="text-[10px] text-cyan-400 font-black uppercase flex items-center gap-1">Read Full Article <ArrowUpRight size={12}/></a>
                        </div>
                    </div>
                ))}
            </div>
        ) : socialScreen === 'chat' ? (
            <div className="max-w-md mx-auto h-[82vh] flex flex-col bg-[#0b141a] rounded-3xl border border-green-500/20 overflow-hidden m-2 shadow-2xl">
                <div className="bg-[#1f2c33] p-4 flex items-center gap-3 border-b border-white/5">
                    <button onClick={()=>setSocialScreen('hub')} className="text-green-500"><ChevronRight className="rotate-180"/></button>
                    <div className="relative"><img src="/logo.png" className="w-10 h-10 rounded-full border border-green-500" /><div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1f2c33]"></div></div>
                    <div><p className="font-bold text-sm text-white">AJ GLOBAL LIVE</p><p className="text-[8px] text-green-500 font-bold uppercase tracking-widest">Active Now • WhatsApp Style</p></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[length:400px]">
                    {chatMessages.map((m:any) => (
                        <div key={m.id} className={`flex ${m.uid === (user as any).uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-2.5 max-w-[85%] rounded-xl shadow-lg relative ${m.uid === (user as any).uid ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#1f2c33] text-gray-200 rounded-tl-none'}`}>
                                <p className="font-black text-[9px] text-yellow-500 mb-1 opacity-70">@{m.username}</p>
                                <p className="text-[11px] leading-relaxed mb-1 pr-8">{m.text}</p>
                                <p className="text-[7px] text-gray-400 absolute bottom-1 right-2 uppercase">11:42 PM</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-[#1f2c33] flex gap-2 items-center">
                    <button className="text-gray-400"><PlusSquare size={24}/></button>
                    <input type="text" value={newMessage} onChange={(e)=>setNewMessage(e.target.value)} placeholder="Type a message" className="flex-1 bg-[#2a3942] border-none p-3 rounded-full text-xs text-white outline-none focus:ring-1 focus:ring-green-500" />
                    <button onClick={sendChatMessage} className="bg-[#00a884] p-3 rounded-full text-white active:scale-90 transition-all shadow-lg"><Send size={20}/></button>
                </div>
            </div>
        ) : socialScreen === 'setup' && (
          <div className="max-w-md mx-auto bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center mt-4 shadow-2xl">
              <div className="relative w-24 h-24 mx-auto mb-8 cursor-pointer group" onClick={handleImageClick}>
                <img src={tempPhoto || (user as any)?.photoURL || "/logo.png"} className="w-full h-full rounded-full border-4 border-pink-500 p-1 object-cover" alt="Avatar" />
                <div className="absolute bottom-0 right-0 bg-pink-600 p-2 rounded-full border-2 border-black text-white"><Camera size={14}/></div>
              </div>
              <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic text-center">Setup Identity</h2>
              {!user ? (
                  <div className="space-y-4">
                      <div className="flex items-center gap-2 bg-black border border-white/10 p-4 rounded-2xl"><Mail className="text-pink-500" size={18}/><input type="email" placeholder="Email" value={manualEmail} onChange={(e)=>setManualEmail(e.target.value)} className="bg-transparent outline-none text-white w-full text-sm"/></div>
                      <div className="flex items-center gap-2 bg-black border border-white/10 p-4 rounded-2xl"><Lock className="text-pink-500" size={18}/><input type="password" placeholder="Password" value={manualPass} onChange={(e)=>setManualPass(e.target.value)} className="bg-transparent outline-none text-white w-full text-sm"/></div>
                      <button onClick={handleManualSignup} className="w-full py-4 bg-white text-black font-black rounded-xl uppercase">Signup</button>
                      <button onClick={handleGoogleLogin} className="w-full py-4 bg-pink-600 font-black rounded-xl uppercase active:scale-95 shadow-md">Google Login</button>
                  </div>
              ) : (
                  <div className="space-y-4 text-left">
                      <label className="text-[9px] font-black text-pink-500 uppercase">Username</label>
                      <input type="text" placeholder="@unique_name" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl font-bold text-white outline-none focus:border-pink-500" />
                      <label className="text-[9px] font-black text-pink-500 uppercase">Bio</label>
                      <textarea placeholder="Tell people about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs text-white outline-none h-24 focus:border-pink-500" />
                      <button onClick={handleCreateProfile} className="w-full mt-8 py-5 bg-pink-600 rounded-2xl font-black uppercase shadow-lg active:scale-95">START {pendingMode.toUpperCase()}</button>
                  </div>
              )}
              <div className="mt-8 pt-6 border-t border-white/5"><button onClick={handleSignOut} className="text-red-500 text-[10px] font-black uppercase flex items-center justify-center gap-2 mx-auto"><LogOut size={14}/> Sign Out</button></div>
          </div>
        )}
        </div>
    </div>
)}

{/* WALLET MODAL */}
{screen === 'wallet' && (
    <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
       <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 mb-8 font-bold uppercase tracking-widest transition-all hover:brightness-125">← BACK</button>
       <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
          <h2 className="text-5xl font-black text-yellow-500 mb-2">{displayBalance} 🪙</h2>
          <p className="text-green-400 font-black text-xl mb-8">${displayUsdt}</p>
          {walletTab === 'main' && (
            <div className="flex flex-col gap-4">
               <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-black uppercase shadow-lg">Purchase</button>
               <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-xl font-black border border-cyan-500/30 uppercase transition-all">Transfer</button>
               <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-xl font-black border border-pink-500/30 uppercase transition-all">Withdraw</button>
            </div>
          )}
          {walletTab === 'purchase' && (
            <div className="flex flex-col gap-5 text-left">
              <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Method</label>
              <select value={purchaseMethod} onChange={(e)=>setPurchaseMethod(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none"><option>Binance (TRC20)</option><option>Airtm (Gmail Account)</option></select>
              <div className="bg-black border-2 border-white/10 p-6 rounded-3xl text-center">
                 <p className="text-[10px] text-gray-500 uppercase font-black mb-2">You will receive</p>
                 <p className="text-yellow-500 text-5xl font-black mb-4 drop-shadow-[0_0_10px_#eab308]">{(purchaseAmount * 100).toLocaleString()} 🪙</p>
                 <div className="flex items-center justify-center gap-2 bg-white/5 p-3 rounded-2xl border border-white/10">
                    <DollarSign className="text-green-400" size={24}/><input type="number" value={purchaseAmount === 0 ? '' : purchaseAmount} onChange={(e)=>setPurchaseAmount(e.target.value === '' ? 0 : Number(e.target.value))} className="bg-transparent text-white text-3xl w-32 text-center font-bold outline-none" />
                 </div>
              </div>
              <button onClick={handlePurchase} className="bg-cyan-500 py-5 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all">Confirm Purchase</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2 hover:text-white">Cancel</button>
            </div>
          )}
          {walletTab === 'transfer' && (
            <div className="flex flex-col gap-4 text-left">
              <div className="bg-cyan-500/10 border border-cyan-500/30 p-5 rounded-2xl relative cursor-pointer" onClick={() => copyToClipboard((user as any)?.uid)}>
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">My Referral ID</p>
                <p className="text-lg font-mono text-cyan-400 font-black truncate">{(user as any)?.uid}</p>
                <div className="absolute right-4 top-1/2 -translate-y-1/2">{copied ? <CheckCircle2 size={18}/> : <Copy size={18}/>}</div>
              </div>
              <input type="text" value={transferId} placeholder="Recipient ID" onChange={(e)=>setTransferId(e.target.value)} className="bg-black border p-4 rounded-xl text-center text-white outline-none border-white/10" />
              <input type="number" value={transferAmount === 0 ? '' : transferAmount} placeholder="Amount" onChange={(e)=>setTransferAmount(e.target.value === '' ? 0 : Number(e.target.value))} className="bg-black border p-4 rounded-xl text-center text-white outline-none border-white/10" />
              <button onClick={handleTransfer} className="bg-cyan-600 py-4 rounded-xl font-black uppercase shadow-lg">Send Now</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2 hover:text-white">Back</button>
            </div>
          )}
          {walletTab === 'withdraw' && (
            <div className="flex flex-col gap-4 text-left">
              <label className="text-[10px] text-pink-500 font-black uppercase">Min 12,500 Coins ($25)</label>
              <select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none"><option>Binance Pay (USDT)</option><option>Airtm (Gmail Account)</option><option>EasyPaisa (PKR)</option><option>JazzCash (PKR)</option><option>Visa Transfer (Master/Visa)</option></select>
              <input type="text" placeholder="ID / Details" onChange={(e)=>setPayoutId(e.target.value)} className="bg-black border p-4 rounded-xl text-white outline-none" />
              <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-black uppercase shadow-lg">Request Payout</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2 hover:text-white">Back</button>
            </div>
          )}
       </div>
    </div>
)}

{/* AI BOT */}
{screen === 'ai' && (
    <div className="fixed inset-0 z-[600] bg-black flex flex-col items-center p-8 overflow-y-auto">
       <div className="w-full max-w-4xl pt-10"><button onClick={() => setScreen('hub')} className="text-green-400 font-bold text-sm mb-12 uppercase tracking-widest hover:brightness-125">← Back</button></div>
       <h2 className="text-5xl font-black mb-12 text-center uppercase text-white italic">AJ AI BOT</h2>
       {botTier !== 'none' && (
         <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-8 rounded-[3rem] text-center mb-16 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <Activity size={60} className="mx-auto mb-6 text-green-500 animate-pulse" />
            <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">{botTier} BOT RUNNING</h2>
            <div className="w-full bg-black/50 border border-green-500/30 p-6 rounded-2xl font-mono text-left shadow-inner"><div className="flex justify-between items-center mb-4"><span className="text-green-400 font-black text-xs uppercase">Neural Profit:</span><span className="text-white font-black text-lg">+{visualProfit.toFixed(4)} 🪙</span></div><div className="h-20 overflow-hidden text-green-500/70 mt-2 text-[10px] leading-relaxed">{tradeLogs.map((log, i) => ( <div key={i} className="mb-1">{log}</div> ))}</div></div>
         </div>
       )}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-2 pb-20">
          <div className={`p-10 rounded-3xl text-center border-2 transition-all ${botTier === 'basic' ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-white/5'}`}><h3 className="text-xl font-black text-cyan-400 uppercase">Basic (25k Coins)</h3><p className="text-sm text-gray-400 mt-2">Earn 2% Daily</p><button onClick={() => activateBot('basic', 25000)} className={`mt-6 w-full py-4 rounded-xl font-black uppercase ${botTier === 'basic' ? 'bg-green-500 text-black cursor-not-allowed' : 'bg-cyan-600'}`}>{botTier === 'basic' ? "RUNNING" : "ACTIVATE"}</button></div>
          <div className={`p-10 rounded-3xl text-center border-2 transition-all ${botTier === 'vvip' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 bg-white/5'}`}><h3 className="text-xl font-black text-yellow-500 uppercase">VVIP (75k Coins)</h3><p className="text-sm text-gray-400 mt-2">Earn 5% Daily</p><button onClick={() => activateBot('vvip', 75000)} className={`mt-6 w-full py-4 rounded-xl font-black uppercase ${botTier === 'vvip' ? 'bg-yellow-500 text-black cursor-not-allowed' : 'bg-yellow-600'}`}>{botTier === 'vvip' ? "RUNNING" : "ACTIVATE"}</button></div>
       </div>
    </div>
)}

<section className="py-20 bg-black flex justify-center px-4 border-y border-white/5 transition-all"><img src="/founder_card.jpg" className="w-full max-w-4xl rounded-3xl shadow-2xl hover:scale-[1.01] transition-all" alt="Founder" /></section>

    <footer className="bg-black py-24 px-10 border-t border-white/5 text-center flex flex-col items-center">
        <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_30px_#06b6d4] mb-12 uppercase">AJ STUDIO</div>
        <div className="flex justify-center gap-10 mb-16">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold uppercase hover:bg-green-500 hover:text-black transition-all">Whatsapp</a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold uppercase hover:bg-white hover:text-black transition-all">X (Twitter)</a>
        </div>
        <button onClick={() => { const link = document.createElement('a'); link.href = '/aj-portal.apk'; link.download = 'aj-portal.apk'; link.click(); }} className="group relative px-12 py-4 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_40px_#06b6d4] animate-pulse transition-all hover:scale-105">
           <span className="relative z-10 flex items-center gap-2 font-black tracking-widest"><Download size={22} /> Install AJ App</span>
           <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12"></div>
        </button>
    </footer>
</main>
);
}