"use client";
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X, CheckCircle2, Download, Copy, Video, Newspaper, Users, Heart, MessageSquare, Camera, Settings, Edit3, Mail, Lock, User, DollarSign, Share2, Music, Play, PlusSquare, MoreVertical, Search, Phone, Video as VideoIcon, ArrowLeft, Trash2, Edit } from 'lucide-react';

// --- CONFIGURATIONS ---
const PIXABAY_KEY = "56712915-2297d0968e99520a1b3d80623";
const NEWS_API_KEY = "6e79bcc161f047039bf1acab74da28ea";
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
const fileInputRef = useRef(null); 
const searchInputRef = useRef(null);

// --- CONTENT STATES ---
const [pixaData, setPixaData] = useState([]);
const [pixaVideos, setPixaVideos] = useState([]);
const [newsData, setNewsData] = useState([]);
const [chatMessages, setChatMessages] = useState([]);
const [userPosts, setUserPosts] = useState([]); 
const [postText, setPostText] = useState('');
const [newMessage, setNewMessage] = useState('');
const [activeContact, setActiveContact] = useState(null);
const [likedPosts, setLikedPosts] = useState({}); 
const [activeMenuId, setActiveMenuId] = useState(null); 
const [wechatMenuOpen, setWechatMenuOpen] = useState(false); 
const [commentBoardPostId, setCommentBoardPostId] = useState(null); 
const [postComments, setPostComments] = useState([]);
const [newComment, setNewComment] = useState('');

// --- AI STATES ---
const [visualProfit, setVisualProfit] = useState(0);
const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility...", "Connecting to AJ liquidity pool..."]);

// --- WALLET INPUTS ---
const [purchaseAmount, setPurchaseAmount] = useState(20);
const [purchaseMethod, setPurchaseMethod] = useState('Binance (TRC20)');
const [purchaseTxId, setPurchaseTxId] = useState('');
const [transferId, setTransferId] = useState('');
const [transferAmount, setTransferAmount] = useState(0);
const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
const [payoutId, setPayoutId] = useState('');

// CEO MATH (1000 per $2)
const displayBalance = (balance + visualProfit).toFixed(2);
const displayUsdt = ((balance + visualProfit) / 500).toFixed(2);

// --- NAVIGATION ---
const navigateWithAd = (toScreen) => {
    if (typeof window !== 'undefined' && window.AJ_SDK) { window.AJ_SDK.showAd(); }
    if (toScreen === 'social') { fetchSocialAPIs(); setScreen('social'); setSocialScreen('hub'); }
    else if (toScreen === 'wallet') { setScreen('wallet'); setWalletTab('main'); }
    else { setScreen(toScreen); }
};

const fetchSocialAPIs = async () => {
    try {
        const pRes = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&q=fashion+luxury+car&image_type=photo&per_page=30`);
        const pData = await pRes.json(); setPixaData(pData.hits || []);
        const vRes = await fetch(`https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=travel+vlog&per_page=20`);
        const vData = await vRes.json(); setPixaVideos(vData.hits || []);
    } catch (e) { console.log("API Error"); }
};

// --- REALTIME LISTENERS ---
useEffect(() => {
    if (socialScreen === 'chat' && activeContact) {
        const q = query(collection(db, "global_chat"), orderBy("createdAt", "desc"), limit(40));
        return onSnapshot(q, (snap) => { setChatMessages(snap.docs.map(d => ({id: d.id, ...d.data()})).reverse()); });
    }
    if (socialScreen === 'pulse') {
        const q = query(collection(db, "user_posts"), orderBy("createdAt", "desc"), limit(20));
        return onSnapshot(q, (snap) => { setUserPosts(snap.docs.map(d => ({id: d.id, ...d.data()}))); });
    }
    if (commentBoardPostId) {
        // Safe check to prevent crash on dynamic IDs
        const q = query(collection(db, "user_posts", commentBoardPostId, "comments"), orderBy("createdAt", "asc"));
        const unsub = onSnapshot(q, (snap) => { setPostComments(snap.docs.map(d => ({id: d.id, ...d.data()}))); }, (err) => console.log("Comment stream err"));
        return unsub;
    }
}, [socialScreen, activeContact, commentBoardPostId]);

// --- SOCIAL ACTIONS ---
const sendChatMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await addDoc(collection(db, "global_chat"), { text: newMessage, uid: user.uid, username: username || "AJ_Member", photo: tempPhoto || user.photoURL, createdAt: serverTimestamp() });
    setNewMessage('');
};

const handleCreatePost = async () => {
    if (!postText.trim() && !tempPhoto) return alert("Empty Post!");
    await addDoc(collection(db, "user_posts"), { text: postText, image: tempPhoto, uid: user.uid, username: username || "AJ_Member", photo: user.photoURL, likes: 0, createdAt: serverTimestamp() });
    await updateDoc(doc(db, "users", user.uid), { balance: increment(2.5) });
    setPostText(''); setTempPhoto('');
    alert("🚀 Post Published! +2.5 Coins Received.");
};

const submitComment = async () => {
    if (!newComment.trim() || !commentBoardPostId || !user) return;
    try {
        await addDoc(collection(db, "user_posts", commentBoardPostId, "comments"), {
            text: newComment,
            username: username || "AJ_Member",
            photo: user.photoURL || "/logo.png",
            createdAt: serverTimestamp()
        });
        setNewComment('');
    } catch (e) {
        alert("Commenting only available for AJ Pulse posts currently.");
        setCommentBoardPostId(null);
    }
};

const handleLike = (id) => setLikedPosts(prev => ({ ...prev, [id]: !prev[id] }));
const handleShare = (msg) => { if(navigator.share) navigator.share({title:'AJ Portal', text: msg}); else alert("Link Copied!"); };
const handleDeletePost = async (id) => { if (confirm("Delete permanently?")) { await deleteDoc(doc(db, "user_posts", id)); setActiveMenuId(null); } };

const handleImageClick = () => fileInputRef.current?.click();
const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => { setTempPhoto(reader.result); };
        reader.readAsDataURL(file);
    }
};

// --- AUTH ---
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
                await setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, uid: currentUser.uid, lastSync: serverTimestamp(), hasSocialProfile: false, photo: currentUser.photoURL });
            }
            onSnapshot(userRef, (snap) => {
                if (snap.exists()) { setBalance(snap.data().balance || 0); setBotTier(snap.data().botTier || 'none'); setInvested(snap.data().invested || 0); }
            });
            setScreen('hub');
        } else { setUser(null); setScreen('auth'); }
    });
    return () => unsubscribe();
}, []);

// --- AI BOT LOGIC ---
useEffect(() => {
  let vInt;
  if (user && botTier !== 'none' && invested > 0) {
    const dailyRate = botTier === 'vvip' ? 0.05 : 0.02;
    const profitPerSec = (invested * dailyRate) / 86400;
    vInt = setInterval(() => setVisualProfit(p => p + profitPerSec), 1000);
  }
  return () => clearInterval(vInt);
}, [user, botTier, invested]);

const activateBot = async (tier, cost) => {
    if (balance < cost) return alert("Insufficient Balance!");
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { balance: increment(-cost), botTier: tier, invested: cost, lastSync: serverTimestamp() });
    alert(`${tier.toUpperCase()} BOT ACTIVATED!`);
};

// --- WALLET ACTIONS ---
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
        if(!purchaseTxId) return alert("Please enter Transaction ID / Proof.");
        await addDoc(collection(db, "manual_deposits"), { uid: user.uid, email: user.email, amount: purchaseAmount, method: purchaseMethod, txId: purchaseTxId, status: "pending", date: serverTimestamp() });
        alert("✅ Request Sent! Wait for approval."); setWalletTab('main');
    }
};

const handleWithdrawal = async () => {
    const coinAmt = transferAmount;
    if (coinAmt < 5000) return alert("Min withdrawal is 5,000 Coins ($10)");
    if (balance < coinAmt) return alert("Insufficient Balance");
    if (!payoutId) return alert("Enter Account/Wallet Details");

    await addDoc(collection(db, "withdrawals"), { uid: user.uid, amount: coinAmt, method: payoutMethod, targetId: payoutId, status: "pending", createdAt: serverTimestamp() });
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-coinAmt) });
    alert("💸 Withdrawal Request Placed!");
    setWalletTab('main');
};

const handleTransfer = async () => {
    if (transferAmount < 100) return alert("Min transfer 100 Coins");
    if (balance < transferAmount) return alert("Insufficient balance");
    if (!transferId) return alert("Enter Recipient ID");
    
    // Logic for transfer would check recipient here
    alert("Transfer feature is syncing with Global DB...");
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
<button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-all shadow-xl">CONTINUE WITH GOOGLE</button>
<p className="mt-8 text-yellow-500 font-bold tracking-widest">+500 COINS BONUS</p>
</div>
</main>
);

return (
<main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
<input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

{/* HEADER */}
<header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
<div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
<div className="flex items-center gap-3">
<div onClick={() => navigateWithAd('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer">
<span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
<span className="text-[10px] text-green-400 font-black ml-1">${displayUsdt}</span>
{user && <img src={tempPhoto || user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
</div>
<button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full uppercase">EXIT</button>
</div>
</header>

{/* MAIN HUB */}
<section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
    <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
    <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
      <div onClick={() => navigateWithAd('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 hover:border-cyan-400">
         <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase">Gaming</span>
      </div>
      <div onClick={() => navigateWithAd('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer hover:border-pink-500">
         <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase">Social</span>
      </div>
      <div onClick={() => navigateWithAd('wallet')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 hover:border-yellow-500">
         <img src="/gold.jpg" className="w-14 h-14 mb-2 rounded-full border-2 border-yellow-500" />
         <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
      </div>
      <div onClick={() => navigateWithAd('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer hover:border-green-500">
         <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase">AJ AI</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-24 h-24 md:w-96 md:h-96 bg-black border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4]">
           <img src="/logo.png" className="w-full h-full object-cover opacity-60 animate-pulse" />
        </div>
      </div>
    </div>
</section>

{/* ARCADE */}
{screen === 'arcade' && (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col h-screen overflow-hidden">
        {!selectedGame ? (
            <div className="p-8 overflow-y-auto flex-1">
                <button onClick={() => setScreen('hub')} className="text-cyan-400 font-bold mb-10 flex items-center gap-2 uppercase tracking-widest"><ArrowLeft size={20}/> BACK</button>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20">
                {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape'].map((game) => (
                    <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center hover:border-cyan-400 cursor-pointer">
                        <img src={`/games/${game.toLowerCase().replace(/ /g, '-')}/logo.png`} className="w-full aspect-square rounded-xl mb-4 object-cover" onError={(e) => { e.target.src = "/logo.png"; }} />
                        <h3 className="font-black text-sm uppercase">{game}</h3>
                    </div>
                ))}
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col h-full w-full">
                <div className="w-full bg-black h-12 flex items-center px-4 border-b border-white/10">
                    <button onClick={() => setSelectedGame(null)} className="text-cyan-400 font-black text-[10px] uppercase tracking-widest">← BACK</button>
                </div>
                <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-full border-none flex-1" />
            </div>
        )}
    </div>
)}

{/* WALLET - UPDATED WITH ALL METHODS */}
{screen === 'wallet' && (
    <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
       <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 mb-8 font-bold flex items-center gap-2 uppercase tracking-widest"><ArrowLeft size={18}/> BACK</button>
       <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
          <h2 className="text-5xl font-black text-yellow-500 mb-2">{displayBalance} 🪙</h2>
          <p className="text-green-400 font-black text-xl mb-10">${displayUsdt}</p>
          
          {walletTab === 'main' && (
            <div className="flex flex-col gap-4">
               <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-2xl font-black uppercase">Purchase</button>
               <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-2xl font-black border border-cyan-500/30 uppercase">Transfer</button>
               <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-2xl font-black border border-pink-500/30 uppercase">Withdraw</button>
            </div>
          )}

          {walletTab === 'purchase' && (
            <div className="flex flex-col gap-6 text-left">
              <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Select Method</label>
              <select value={purchaseMethod} onChange={(e)=>setPurchaseMethod(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none">
                <option>Binance (TRC20)</option>
                <option>EasyPaisa (Direct)</option>
                <option>JazzCash (Direct)</option>
                <option>AirTM (Email)</option>
                <option>Visa / Master Card</option>
              </select>
              <div className="bg-black border-2 border-white/10 p-6 rounded-2xl text-center">
                 <p className="text-yellow-500 text-4xl font-black mb-4">{(purchaseAmount * 100).toLocaleString()} 🪙</p>
                 <div className="flex items-center justify-center gap-3 bg-white/5 p-4 rounded-xl">
                    <span className="text-green-400 font-black">$</span>
                    <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="bg-transparent text-white text-2xl w-full text-center font-black outline-none" />
                 </div>
              </div>
              <input type="text" placeholder="Transaction ID / Receipt No" value={purchaseTxId} onChange={(e)=>setPurchaseTxId(e.target.value)} className="w-full bg-gray-900 p-4 rounded-xl text-sm border border-white/10 text-white" />
              <button onClick={handlePurchase} className="bg-cyan-500 py-5 rounded-2xl font-black uppercase text-black">Confirm Purchase</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center font-black">Cancel</button>
            </div>
          )}

          {walletTab === 'withdraw' && (
            <div className="flex flex-col gap-6 text-left">
              <label className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Withdrawal Method</label>
              <select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold">
                <option>Binance Pay ID</option>
                <option>EasyPaisa Number</option>
                <option>JazzCash Number</option>
                <option>Bank Account (IBAN)</option>
                <option>AirTM Account</option>
              </select>
              <div className="bg-black border border-white/10 p-6 rounded-2xl">
                 <input type="number" placeholder="Coins to withdraw" value={transferAmount} onChange={(e)=>setTransferAmount(Number(e.target.value))} className="bg-transparent text-white text-2xl w-full text-center font-black outline-none" />
                 <p className="text-center text-[10px] text-gray-500 mt-2">Conversion: 500 Coins = $1</p>
              </div>
              <input type="text" placeholder="Account Number / Wallet ID" value={payoutId} onChange={(e)=>setPayoutId(e.target.value)} className="w-full bg-gray-900 p-4 rounded-xl border border-white/10 text-white" />
              <button onClick={handleWithdrawal} className="bg-pink-600 py-5 rounded-2xl font-black uppercase">Confirm Withdrawal</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center font-black">Cancel</button>
            </div>
          )}

          {walletTab === 'transfer' && (
            <div className="flex flex-col gap-6 text-left">
              <input type="text" placeholder="Recipient AJ-ID" value={transferId} onChange={(e)=>setTransferId(e.target.value)} className="w-full bg-gray-900 p-4 rounded-xl border border-white/10 text-white" />
              <input type="number" placeholder="Amount of Coins" value={transferAmount} onChange={(e)=>setTransferAmount(Number(e.target.value))} className="w-full bg-gray-900 p-4 rounded-xl border border-white/10 text-white" />
              <button onClick={handleTransfer} className="bg-cyan-500 py-5 rounded-2xl font-black text-black uppercase">Send Coins</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center font-black">Cancel</button>
            </div>
          )}
       </div>
    </div>
)}

{/* AI BOT */}
{screen === 'ai' && (
    <div className="fixed inset-0 z-[600] bg-black flex flex-col items-center p-8 overflow-y-auto">
       <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold mb-12 uppercase flex items-center gap-2"><ArrowLeft size={18}/> BACK</button>
       <h2 className="text-5xl font-black mb-12 text-center uppercase">AJ AI BOT</h2>
       {botTier !== 'none' ? (
         <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-8 rounded-[3rem] text-center shadow-2xl">
            <Activity size={60} className="mx-auto mb-6 text-green-500 animate-pulse" />
            <h2 className="text-3xl font-black text-white mb-2">{botTier.toUpperCase()} BOT ACTIVE</h2>
            <div className="bg-black/50 p-6 rounded-2xl text-left font-mono">
               <span className="text-green-400 font-black text-xs">Profit:</span>
               <span className="text-white font-black text-2xl block">+{visualProfit.toFixed(4)} 🪙</span>
               <div className="h-20 overflow-hidden text-green-500/60 mt-4 text-[10px]">{tradeLogs.map((log, i) => ( <div key={i}>{log}</div> ))}</div>
            </div>
         </div>
       ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-2 pb-20">
          <div className="p-10 rounded-3xl text-center border-2 border-white/10 bg-white/5">
            <h3 className="text-2xl font-black text-cyan-400 uppercase">Basic (25k)</h3>
            <p className="text-sm text-gray-400 mt-3">2% Daily Passive</p>
            <button onClick={() => activateBot('basic', 25000)} className="mt-8 w-full py-5 bg-cyan-600 rounded-2xl font-black">ACTIVATE</button>
          </div>
          <div className="p-10 rounded-3xl text-center border-2 border-white/10 bg-white/5">
            <h3 className="text-2xl font-black text-yellow-500 uppercase">VVIP (75k)</h3>
            <p className="text-sm text-gray-400 mt-3">5% Daily Premium</p>
            <button onClick={() => activateBot('vvip', 75000)} className="mt-8 w-full py-5 bg-yellow-600 rounded-2xl font-black">ACTIVATE</button>
          </div>
        </div>
       )}
    </div>
)}

{/* SOCIAL SECTION (FIXED COMMENTING) */}
{screen === 'social' && (
    <div className="fixed inset-0 z-[400] bg-slate-950 flex flex-col h-screen overflow-hidden">
        <header className="sticky top-0 w-full p-4 bg-black/90 flex justify-between items-center z-[500] border-b border-white/10">
            <button onClick={() => socialScreen === 'hub' ? setScreen('hub') : setSocialScreen('hub')} className="text-pink-500 font-black text-xs uppercase">← BACK</button>
            <h2 className="text-2xl font-black italic text-pink-500 uppercase">DASHBOARD</h2>
            <button onClick={() => setSocialScreen('settings_menu')} className="bg-white/10 p-2 rounded-full text-pink-500"><Settings size={22}/></button>
        </header>

        <div className="flex-1 overflow-y-auto">
        {socialScreen === 'hub' ? (
          <div className="max-w-md mx-auto grid grid-cols-1 gap-6 p-8 text-center pb-24">
             <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-pink-500/20 mb-4">
                  <img src={tempPhoto || user?.photoURL} className="w-14 h-14 rounded-full border-2 border-pink-500 shadow-xl" />
                  <div className="text-left"><p className="font-black text-white text-[10px] uppercase">@{username || "AJ-Member"}</p><p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">VERIFIED MEMBER</p></div>
             </div>
             {[{n:'AJ TikReels', i:Video, s:'tikreels'}, {n:'AJ Pulse', i:Users, s:'pulse'}, {n:'AJ WeChat', i:MessageSquare, s:'chatlist'}].map((mod) => (
                <div key={mod.n} onClick={() => setSocialScreen(mod.s)} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:border-pink-500 transition-all cursor-pointer">
                    <div className="text-pink-500 mb-4 flex justify-center"><mod.i size={36}/></div>
                    <h3 className="text-2xl font-black uppercase italic text-white">{mod.n}</h3>
                </div>
             ))}
          </div>
        ) : socialScreen === 'tikreels' ? (
            <div className="h-full w-full max-w-md mx-auto snap-y snap-mandatory overflow-y-auto bg-black">
                {pixaVideos.map((vid, i) => (
                    <div key={vid.id} className="h-[85vh] w-full snap-start relative border-b border-white/5">
                        <video src={vid.videos.large.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center">
                            <Heart size={35} onClick={()=>handleLike(vid.id)} className={likedPosts[vid.id] ? "text-red-500 fill-red-500" : "text-white"}/>
                            <MessageCircle size={35} className="text-white" onClick={() => { setCommentBoardPostId(null); alert("Comments for reels coming soon!"); }}/>
                            <Share2 size={35} className="text-white" onClick={()=>handleShare('AJ TikReels')}/>
                        </div>
                        <div className="absolute bottom-10 left-6 text-white">
                            <p className="font-black text-sm">@{vid.user} • LIVE</p>
                        </div>
                    </div>
                ))}
            </div>
        ) : socialScreen === 'pulse' ? (
            <div className="max-w-md mx-auto space-y-6 p-4 pb-24">
                <div className="bg-white/10 p-5 rounded-3xl border border-pink-500/20">
                    <textarea value={postText} onChange={(e)=>setPostText(e.target.value)} placeholder="Share your story..." className="w-full bg-white/5 rounded-xl p-4 text-xs outline-none border border-white/10 h-20 text-white" />
                    <div className="flex justify-between mt-4"><button onClick={handleImageClick} className="text-[10px] font-black text-gray-400"><Camera size={18}/></button><button onClick={handleCreatePost} className="bg-pink-600 px-6 py-2 rounded-full text-xs font-black">PUBLISH</button></div>
                </div>
                {userPosts.map((post) => (
                    <div key={post.id} className="bg-white/10 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative">
                        <div className="flex items-center justify-between p-5"><div className="flex items-center gap-3"><img src={post.photo || "/logo.png"} className="w-8 h-8 rounded-full border border-pink-500"/><p className="font-black text-xs text-white">@{post.username}</p></div><MoreVertical size={18} className="opacity-40" onClick={()=>setActiveMenuId(activeMenuId === post.id ? null : post.id)}/></div>
                        {activeMenuId === post.id && (<div className="absolute right-6 top-16 bg-slate-900 p-3 rounded-xl z-[1000]"><button onClick={()=>handleDeletePost(post.id)} className="text-red-500 text-[10px] font-black flex items-center gap-2 uppercase"><Trash2 size={14}/> Delete</button></div>)}
                        {post.image && <img src={post.image} className="w-full aspect-square object-cover" />}
                        <div className="p-6">
                            <div className="flex gap-6 mb-4">
                                <Heart size={30} onClick={()=>handleLike(post.id)} className={likedPosts[post.id] ? "text-red-500 fill-red-500" : "text-white"}/>
                                <MessageSquare size={30} className="text-white cursor-pointer" onClick={() => setCommentBoardPostId(post.id)}/>
                                <Share2 size={30} className="text-white cursor-pointer" onClick={()=>handleShare(post.text)}/>
                            </div>
                            <p className="text-[12px] text-gray-200 font-bold">{post.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        ) : null}
        </div>

        {/* COMMENT BOARD (FIXED LOGIC) */}
        {commentBoardPostId && (
            <div className="fixed inset-0 z-[1000] bg-black/70 flex items-end">
                <div className="w-full h-[60vh] bg-[#111b21] rounded-t-[3rem] border-t-2 border-pink-500 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-black text-pink-500 uppercase">Comments</h3><X className="cursor-pointer" onClick={()=>setCommentBoardPostId(null)}/></div>
                    <div className="flex-1 overflow-y-auto space-y-4">
                        {postComments.map((c) => (
                            <div key={c.id} className="flex gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                                <img src={c.photo || "/logo.png"} className="w-8 h-8 rounded-full border border-pink-500" />
                                <div><p className="font-black text-[10px] text-pink-400 uppercase">@{c.username}</p><p className="text-xs text-gray-300">{c.text}</p></div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 flex gap-3"><input type="text" value={newComment} onChange={(e)=>setNewComment(e.target.value)} placeholder="Say something..." className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white" /><button onClick={submitComment} className="bg-pink-600 p-4 rounded-xl"><Send size={18}/></button></div>
                </div>
            </div>
        )}
    </div>
)}

<footer className="bg-black py-24 px-10 border-t border-white/5 text-center flex flex-col items-center">
    <div className="text-6xl md:text-[8rem] font-black italic text-cyan-400 mb-12 uppercase tracking-tighter">AJ STUDIO</div>
    <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border-2 border-green-500 px-10 py-3 rounded-full font-black uppercase mb-10">Whatsapp Support</a>
    <p className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.4em]">© 2026 AJ CREATOR STUDIO. Global Rights Reserved.</p>
</footer>

</main>
);
}