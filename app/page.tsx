"use client";
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Bot, LogOut, Globe, ChevronRight, Send, CheckCircle2, Download, Copy, Video, Newspaper, Users, Heart, MessageSquare, Camera, Settings, Edit3, Mail, Lock, User, DollarSign, Share2, Music, Play, PlusSquare, MoreVertical, Search, Phone, ArrowUpRight, TrendingUp, Activity, X } from 'lucide-react';

// --- CONFIGURATIONS ---
const PIXABAY_KEY = "56712915-2297d0968e99520a1b3d80623";
const NEWS_API_KEY = "6e79bcc161f047039bf1acab74da28ea";
const NOWPAYMENTS_API_KEY = "3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7";

export default function AJSuperPortal() {
const [screen, setScreen] = useState('splash');
const [walletTab, setWalletTab] = useState('main');
const [socialScreen, setSocialScreen] = useState('hub'); 
const [user, setUser] = useState<any>(null);
const [balance, setBalance] = useState(0);
const [botTier, setBotTier] = useState('none');
const [invested, setInvested] = useState(0);
const [loading, setLoading] = useState(0);
const [selectedGame, setSelectedGame] = useState<string | null>(null);
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

// --- CONTENT STATES ---
const [pixaData, setPixaData] = useState([]);
const [pixaVideos, setPixaVideos] = useState([]);
const [newsData, setNewsData] = useState([]);
const [chatMessages, setChatMessages] = useState<any[]>([]);
const [userPosts, setUserPosts] = useState<any[]>([]); 
const [postText, setPostText] = useState('');
const [newMessage, setNewMessage] = useState('');
const [activeContact, setActiveContact] = useState<string | null>(null);

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

// Math Logic
const displayBalance = (balance + visualProfit).toFixed(2);
const displayUsdt = ((balance + visualProfit) / 500).toFixed(2);

// --- AD NAVIGATION ---
const navigateWithAd = (toScreen: string) => {
    if ((window as any).AJ_SDK) (window as any).AJ_SDK.showAd();
    if (toScreen === 'social') { fetchSocialAPIs(); setScreen('social'); setSocialScreen('hub'); }
    else { setScreen(toScreen); }
};

const fetchSocialAPIs = async () => {
    try {
        const pRes = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&q=fashion+lifestyle&image_type=photo&per_page=30`);
        const pData = await pRes.json(); setPixaData(pData.hits || []);
        const vRes = await fetch(`https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=travel+vlog&per_page=20`);
        const vData = await vRes.json(); setPixaVideos(vData.hits || []);
        const nRes = await fetch(`https://newsapi.org/v2/everything?q=crypto+technology&apiKey=${NEWS_API_KEY}`);
        const nData = await nRes.json(); setNewsData(nData.articles?.slice(0, 15) || []);
    } catch (e) { console.log("API Error"); }
};

// --- FIREBASE LISTENERS ---
useEffect(() => {
    if (socialScreen === 'chat' && activeContact) {
        const q = query(collection(db, "global_chat"), orderBy("createdAt", "desc"), limit(40));
        return onSnapshot(q, (snap) => { setChatMessages(snap.docs.map(d => ({id: d.id, ...d.data()})).reverse()); });
    }
    if (socialScreen === 'pulse') {
        const q = query(collection(db, "user_posts"), orderBy("createdAt", "desc"), limit(20));
        return onSnapshot(q, (snap) => { setUserPosts(snap.docs.map(d => ({id: d.id, ...d.data()}))); });
    }
}, [socialScreen, activeContact]);

const sendChatMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await addDoc(collection(db, "global_chat"), {
        text: newMessage, uid: user.uid,
        username: username || "AJ_Member",
        photo: tempPhoto || user.photoURL,
        createdAt: serverTimestamp()
    });
    setNewMessage('');
};

const handleCreatePost = async () => {
    if (!postText.trim() && !tempPhoto) return alert("Add text or image!");
    await addDoc(collection(db, "user_posts"), {
        text: postText, image: tempPhoto, uid: user.uid,
        username: username || "AJ_Member", photo: user.photoURL,
        likes: 0, createdAt: serverTimestamp()
    });
    setPostText(''); setTempPhoto('');
    alert("🚀 Post Published!");
};

const handleLike = (id: any) => { alert("Post Liked! ❤️"); };
const handleShare = (msg: string) => { if(navigator.share) navigator.share({title:'AJ Portal', text: msg}); else alert("Link Copied!"); };

const copyToClipboard = (id: string) => {
  navigator.clipboard.writeText(id); setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

const handleImageClick = () => { fileInputRef.current?.click(); };
const handleFileChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => { setTempPhoto(reader.result as string); };
        reader.readAsDataURL(file);
    }
};

const handleGoogleLogin = async () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, googleProvider);
};

const handleManualSignup = async () => {
    if(!manualEmail || !manualPass) return alert("Fill Email/Pass");
    try { await createUserWithEmailAndPassword(auth, manualEmail, manualPass); alert("Account Created!"); } catch (e: any) { alert(e.message); }
};

const handleSignOut = async () => { await signOut(auth); setSocialScreen('hub'); setScreen('auth'); };

const handleCreateProfile = async () => {
    if(username.length < 3) return alert("Username too short!");
    await updateDoc(doc(db, "users", user!.uid), { username: username.toLowerCase().trim(), bio, photo: tempPhoto || user!.photoURL, hasSocialProfile: true });
    setHasSocialProfile(true); setSocialScreen(pendingMode || 'hub');
};

const enterSocialMode = (mode: string) => {
    setPendingMode(mode);
    if (!user || !hasSocialProfile) { setSocialScreen('setup'); } 
    else { setSocialScreen(mode); }
};

// --- AUTH & PROFIT ---
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
                setTempPhoto(data.photo || currentUser.photoURL);
            } else {
                await setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, hasSocialProfile: false, photo: currentUser.photoURL });
            }
            onSnapshot(userRef, (snap) => {
                if (snap.exists()) { setBalance(snap.data().balance || 0); setBotTier(snap.data().botTier || 'none'); setInvested(snap.data().invested || 0); }
            });
            setScreen('hub');
        } else { setUser(null); setScreen('auth'); }
    });
    return () => unsubscribe();
}, []);

useEffect(() => {
  let vInt: any;
  if (user && botTier !== 'none' && invested > 0) {
    const dailyRate = botTier === 'vvip' ? 0.05 : 0.02;
    const profitPerSec = (invested * dailyRate) / 86400;
    vInt = setInterval(() => setVisualProfit(p => p + profitPerSec), 1000);
  }
  return () => clearInterval(vInt);
}, [user, botTier, invested]);

useEffect(() => {
    if (screen === 'splash') {
        const interval = setInterval(() => { setLoading(prev => (prev >= 100 ? 100 : prev + 10)); }, 50);
        setTimeout(() => setScreen('hub'), 2000);
        return () => clearInterval(interval);
    }
}, [screen]);

const activateBot = async (tier: string, cost: number) => {
    if (balance < cost) return alert("Low Balance!");
    await updateDoc(doc(db, "users", user!.uid), { balance: increment(-cost), botTier: tier, invested: cost, lastSync: serverTimestamp() });
    alert(`${tier.toUpperCase()} BOT ACTIVE!`);
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
<div onClick={() => navigateWithAd('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer">
<span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
<span className="text-[10px] text-green-400 font-black ml-1">${displayUsdt}</span>
{user && <img src={tempPhoto || user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
</div>
<button onClick={handleSignOut} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full uppercase">EXIT</button>
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
         <img src="/gold.jpg" className="w-14 h-14 mb-2 rounded-full" />
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

{/* ARCADE */}
{screen === 'arcade' && (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
        {!selectedGame ? (
            <div className="p-8 overflow-y-auto flex-1">
                <button onClick={() => setScreen('hub')} className="text-cyan-400 font-bold mb-10 tracking-widest uppercase transition-all">← BACK HUB</button>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20">
                    {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape'].map((game) => (
                        <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center hover:border-cyan-400 cursor-pointer transition-all">
                            <img src={`/games/${game.toLowerCase().replace(/ /g, '-')}/logo.png`} className="w-full aspect-square rounded-xl mb-4 object-cover" alt={game} onError={(e:any) => { e.target.src = "/logo.png"; }} />
                            <h3 className="font-black text-sm uppercase">{game}</h3>
                            <button className="mt-4 w-full py-2 bg-cyan-500 text-black rounded-full font-black text-[10px] uppercase">PLAY NOW</button>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col">
                <div className="h-12 bg-black border-b border-white/10 flex items-center px-6">
                    <button onClick={() => setSelectedGame(null)} className="text-cyan-400 text-[10px] font-black uppercase">← BACK TO HUB</button>
                    <div className="flex-1 text-center font-black uppercase text-[10px] opacity-40">{selectedGame}</div>
                </div>
                <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full flex-1 border-none" title="Game" />
            </div>
        )}
    </div>
)}

{/* SOCIAL */}
{screen === 'social' && (
    <div className="fixed inset-0 z-[400] bg-slate-950 flex flex-col">
        <header className="p-4 bg-black flex justify-between items-center border-b border-white/5">
            <button onClick={() => setScreen('hub')} className="text-pink-500 font-black text-xs uppercase">← HUB</button>
            <h2 className="text-xl font-black italic text-pink-500">AJ SOCIAL</h2>
            <button onClick={() => setSocialScreen('setup')} className="bg-white/10 p-2 rounded-full text-pink-500"><Settings size={18}/></button>
        </header>

        <div className="flex-1 overflow-y-auto">
        {socialScreen === 'hub' ? (
          <div className="max-w-md mx-auto grid grid-cols-1 gap-6 p-8 text-center">
             <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-pink-500/20 mb-4">
                  <img src={tempPhoto || user?.photoURL} className="w-12 h-12 rounded-full border-2 border-pink-500" alt="Profile" />
                  <div><p className="font-black text-white text-sm uppercase">@{username || "AJ_Member"}</p><p className="text-[9px] text-gray-500 uppercase tracking-widest">Verified Member</p></div>
             </div>
             {[{n:'AJ TikReels', i:Video, s:'tikreels'}, {n:'AJ Pulse', i:Users, s:'pulse'}, {n:'AJ Live Chat', i:MessageSquare, s:'chatlist'}, {n:'AJ Discover', i:Globe, s:'discover'}].map((mod) => (
                <div key={mod.n} onClick={() => enterSocialMode(mod.s)} className="p-8 bg-white/5 border border-white/10 rounded-3xl text-center hover:border-pink-500 transition-all cursor-pointer shadow-lg">
                    <mod.i size={36} className="text-pink-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-black uppercase italic text-white">{mod.n}</h3>
                </div>
             ))}
          </div>
        ) : socialScreen === 'tikreels' ? (
            <div className="h-full w-full max-w-md mx-auto snap-y snap-mandatory overflow-y-auto bg-black">
                <button onClick={()=>setSocialScreen('hub')} className="fixed left-4 top-20 z-[600] bg-white/20 p-2 rounded-full">←</button>
                {pixaVideos.map((vid:any, i) => (
                    <React.Fragment key={i}>
                        <div className="h-[85vh] w-full snap-start relative border-b border-white/5">
                            <video src={vid.videos.large.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center">
                                <div onClick={()=>handleLike(vid.id)} className="flex flex-col items-center"><Heart size={35} className="text-pink-500"/><span className="text-[10px] font-bold">12k</span></div>
                                <div className="flex flex-col items-center"><MessageCircle size={35}/><span className="text-[10px] font-bold">842</span></div>
                                <div onClick={()=>handleShare('Check this out!')} className="flex flex-col items-center"><Share2 size={35}/><span className="text-[10px] font-bold">Share</span></div>
                            </div>
                            <div className="absolute bottom-10 left-6 text-white max-w-[70%]">
                                <p className="font-black text-sm">@{vid.user} • LIVE</p>
                                <p className="text-xs opacity-90 line-clamp-2">New travel visuals on AJ Super Portal! #Viral #AJ</p>
                                <div className="flex items-center gap-2 mt-3 bg-black/30 w-max p-1.5 rounded-full"><Music size={12}/> <marquee className="text-[10px] w-24">Original Sound - AJ Creator</marquee></div>
                            </div>
                        </div>
                        {(i + 1) % 5 === 0 && <div className="h-[85vh] w-full snap-start flex items-center justify-center bg-gray-900 text-cyan-400 font-black flex-col gap-4"><Video size={60}/><p className="uppercase tracking-[0.3em]">AJ ADVERTISING SPONSOR</p></div>}
                    </React.Fragment>
                ))}
            </div>
        ) : socialScreen === 'pulse' ? (
            <div className="max-w-md mx-auto space-y-6 p-4 pb-24">
                <button onClick={()=>setSocialScreen('hub')} className="text-pink-500 font-bold mb-4 flex items-center gap-2"><ChevronRight className="rotate-180"/> DISCOVER PULSE</button>
                <div className="bg-white/5 p-4 rounded-3xl border border-pink-500/20 shadow-xl">
                    <div className="flex gap-3"><img src={user?.photoURL || "/logo.png"} className="w-10 h-10 rounded-full border border-pink-500"/><textarea value={postText} onChange={(e)=>setPostText(e.target.value)} placeholder="Share your story..." className="flex-1 bg-white/5 rounded-2xl p-4 text-xs outline-none border border-white/10 h-20"/></div>
                    {tempPhoto && <img src={tempPhoto} className="mt-4 rounded-xl w-full h-40 object-cover border border-white/10" />}
                    <div className="flex justify-between mt-4 pt-3 border-t border-white/5"><button onClick={handleImageClick} className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-pink-500"><Camera size={18}/> Photo</button><button onClick={handleCreatePost} className="bg-pink-600 px-6 py-1.5 rounded-full text-xs font-black">PUBLISH POST</button></div>
                </div>
                {userPosts.map((post) => (
                    <div key={post.id} className="bg-white/10 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><img src={post.photo || "/logo.png"} className="w-9 h-9 rounded-full border-2 border-pink-500"/><p className="font-black text-xs">@{post.username}</p></div><MoreVertical size={18} className="opacity-40"/></div>
                        {post.image && <img src={post.image} className="w-full aspect-square object-cover" />}
                        <div className="p-5"><div className="flex gap-5 mb-4"><Heart size={28} onClick={()=>handleLike(post.id)} className="hover:text-pink-500 cursor-pointer"/><MessageSquare size={28}/><Share2 size={28}/></div><p className="text-[11px] leading-relaxed"><span className="font-black mr-2">@{post.username}</span>{post.text}</p></div>
                    </div>
                ))}
                {pixaData.map((post:any, i) => (
                    <React.Fragment key={i}>
                    <div className="bg-white/10 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><img src={post.userImageURL || "/logo.png"} className="w-9 h-9 rounded-full border-2 border-pink-500 shadow-md"/><p className="font-black text-xs">@{post.user}</p></div><MoreVertical size={18} className="opacity-40"/></div>
                        <img src={post.largeImageURL} className="w-full aspect-square object-cover" onDoubleClick={()=>handleLike(post.id)}/>
                        <div className="p-5"><div className="flex gap-5 mb-4"><Heart size={28} onClick={()=>handleLike(post.id)} className="hover:text-pink-500 transition-all"/><MessageSquare size={28}/><Share2 size={28}/></div><p className="text-xs"><b>{post.likes} likes</b></p></div>
                    </div>
                    {(i+1) % 4 === 0 && <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-2xl text-center"><p className="text-[10px] text-cyan-400 font-black tracking-widest uppercase">BANNER AD SPONSOR</p></div>}
                    </React.Fragment>
                ))}
            </div>
        ) : socialScreen === 'chatlist' ? (
            <div className="max-w-md mx-auto bg-[#111b21] h-screen border-x border-white/5">
                <div className="bg-[#1f2c33] p-4 flex justify-between items-center"><h2 className="text-xl font-bold text-[#e9edef]">Chats</h2><div className="flex gap-4"><MessageSquare size={20}/><MoreVertical size={20}/></div></div>
                <div className="p-3"><div className="bg-[#202c33] flex items-center gap-4 px-4 py-2 rounded-xl text-gray-400"><Search size={18}/><input type="text" placeholder="Search" className="bg-transparent border-none outline-none text-sm w-full"/></div></div>
                <div className="mt-2">{['AJ Support', 'Crypto VIP', 'Ali Bhai Hub'].map((contact, i) => (<div key={i} onClick={()=>{setActiveContact(contact); setSocialScreen('chat')}} className="flex items-center gap-4 p-4 hover:bg-[#202c33] cursor-pointer border-b border-white/5"><div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center font-black">AJ</div><div className="flex-1"><div className="flex justify-between items-center"><p className="font-bold text-[#e9edef]">{contact}</p><span className="text-[10px] text-green-500 font-bold">Just now</span></div><p className="text-xs text-gray-400 line-clamp-1">Connected to AJ Live!</p></div></div>))}</div>
            </div>
        ) : socialScreen === 'chat' ? (
            <div className="max-w-md mx-auto h-[88vh] flex flex-col bg-[#0b141a] overflow-hidden m-2 rounded-3xl shadow-2xl">
                <div className="bg-[#1f2c33] p-4 flex items-center gap-3 border-b border-white/5">
                    <button onClick={()=>setSocialScreen('chatlist')} className="text-green-500"><ChevronRight className="rotate-180"/></button>
                    <img src="/logo.png" className="w-10 h-10 rounded-full border-2 border-green-500" />
                    <div className="flex-1"><p className="font-bold text-sm text-white">{activeContact}</p><p className="text-[8px] text-green-500 font-bold uppercase animate-pulse">Online • WhatsApp Setup</p></div>
                    <div className="flex gap-4"><Video size={20}/><Phone size={20}/></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-contain">
                    {chatMessages.map((m:any) => (
                        <div key={m.id} className={`flex ${m.uid === user.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-2.5 max-w-[85%] rounded-xl shadow-lg relative ${m.uid === user.uid ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'}`}>
                                <p className="font-black text-[9px] text-yellow-500 mb-1 opacity-70">@{m.username}</p>
                                <p className="text-[11px] leading-relaxed mb-1 pr-6">{m.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-[#1f2c33] flex gap-2 items-center"><input type="text" value={newMessage} onChange={(e)=>setNewMessage(e.target.value)} placeholder="Message" className="flex-1 bg-[#2a3942] border-none p-3 rounded-full text-xs text-white outline-none" /><button onClick={sendChatMessage} className="bg-[#00a884] p-3 rounded-full text-white"><Send size={20}/></button></div>
            </div>
        ) : socialScreen === 'discover' ? (
            <div className="max-w-4xl mx-auto space-y-5 p-4 pb-24">
                <button onClick={()=>setSocialScreen('hub')} className="text-pink-500 font-black mb-4 flex items-center gap-2"><ChevronRight className="rotate-180"/> HUB</button>
                <div className="flex items-center gap-3 mb-6"><Globe className="text-cyan-400" size={30}/><h3 className="text-2xl font-black italic uppercase text-white">Crypto & Tech Daily</h3></div>
                {newsData.map((art: any, i) => (
                    <div key={i} className="bg-white/5 p-5 rounded-[2rem] border border-white/10 flex flex-col md:flex-row gap-5 shadow-xl">
                        {art.urlToImage && <img src={art.urlToImage} className="w-full md:w-44 h-44 object-cover rounded-3xl" />}
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-3"><span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full font-black uppercase">{art.source?.name}</span><span className="text-[8px] text-gray-500 font-bold">{new Date(art.publishedAt).toLocaleDateString()}</span></div>
                            <h4 className="font-black text-base text-white leading-snug mb-3">{art.title}</h4>
                            <p className="text-[11px] text-gray-400 line-clamp-3 mb-4 leading-relaxed">{art.description}</p>
                            <a href={art.url} target="_blank" className="text-[10px] text-cyan-400 font-black uppercase flex items-center gap-2 border-b border-cyan-400/30 w-max pb-1">Read Full Story <ArrowUpRight size={14}/></a>
                        </div>
                    </div>
                ))}
            </div>
        ) : socialScreen === 'setup' ? (
          <div className="max-w-md mx-auto bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center mt-4 shadow-2xl">
              <div className="relative w-24 h-24 mx-auto mb-8 cursor-pointer group" onClick={handleImageClick}>
                <img src={tempPhoto || user?.photoURL || "/logo.png"} className="w-full h-full rounded-full border-4 border-pink-500 p-1 object-cover shadow-2xl" alt="Avatar" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-full text-white transition-opacity"><Camera size={30}/></div>
                <div className="absolute bottom-0 right-0 bg-pink-600 p-2 rounded-full border-2 border-black text-white"><Camera size={14}/></div>
              </div>
              <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic text-center">Setup Identity</h2>
              <div className="space-y-4 text-left">
                  <label className="text-[9px] font-black text-pink-500 uppercase ml-1">Username</label>
                  <input type="text" placeholder="@unique_name" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl font-bold text-white outline-none focus:border-pink-500" />
                  <label className="text-[9px] font-black text-pink-500 uppercase ml-1">Bio</label>
                  <textarea placeholder="Tell people about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs text-white outline-none h-24 focus:border-pink-500" />
                  <button onClick={handleCreateProfile} className="w-full mt-8 py-5 bg-pink-600 rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">START {pendingMode.toUpperCase()}</button>
              </div>
          </div>
        ) : null}
        </div>
    </div>
)}

{/* WALLET MODAL */}
{screen === 'wallet' && (
    <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
       <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 mb-8 font-bold uppercase tracking-widest hover:brightness-125">← BACK</button>
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
              <div className="bg-black border-2 border-white/10 p-6 rounded-3xl text-center shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]">
                 <p className="text-[10px] text-gray-500 uppercase font-black mb-2">You will receive</p>
                 <p className="text-yellow-500 text-5xl font-black mb-4 drop-shadow-[0_0_10px_#eab308]">{(purchaseAmount * 100).toLocaleString()} 🪙</p>
                 <div className="flex items-center justify-center gap-2 bg-white/5 p-3 rounded-2xl border border-white/10">
                    <DollarSign className="text-green-400" size={24}/>
                    <input type="number" value={purchaseAmount === 0 ? '' : purchaseAmount} onChange={(e)=>setPurchaseAmount(e.target.value === '' ? 0 : Number(e.target.value))} className="bg-transparent text-white text-3xl w-32 text-center font-bold outline-none" />
                 </div>
              </div>
              <button onClick={handlePurchase} className="bg-cyan-500 py-5 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all">Confirm Purchase</button>
            </div>
          )}
          {walletTab === 'transfer' && (
            <div className="flex flex-col gap-4 text-left">
              <div className="bg-cyan-500/10 border border-cyan-500/30 p-5 rounded-2xl relative cursor-pointer" onClick={() => copyToClipboard(user?.uid)}>
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1 tracking-[0.2em]">My Referral ID</p>
                <p className="text-lg font-mono text-cyan-400 font-black truncate">{user?.uid}</p>
                <div className="absolute right-4 top-1/2 -translate-y-1/2">{copied ? <CheckCircle2 size={18}/> : <Copy size={18}/>}</div>
              </div>
              <input type="text" value={transferId} placeholder="Recipient ID" onChange={(e)=>setTransferId(e.target.value)} className="bg-black border p-4 rounded-xl text-center text-white outline-none border-white/10 focus:border-cyan-500" />
              <input type="number" value={transferAmount === 0 ? '' : transferAmount} placeholder="Amount" onChange={(e)=>setTransferAmount(e.target.value === '' ? 0 : Number(e.target.value))} className="bg-black border p-4 rounded-xl text-center text-white outline-none border-white/10 focus:border-cyan-500" />
              <button onClick={()=>alert("Transfer Initiated!")} className="bg-cyan-600 py-4 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all">Send Now</button>
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
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold uppercase transition-all">Whatsapp</a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold uppercase transition-all">X (Twitter)</a>
        </div>
        <button onClick={() => { const link = document.createElement('a'); link.href = '/aj-portal.apk'; link.download = 'aj-portal.apk'; link.click(); }} className="group relative px-12 py-4 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_40px_#06b6d4] animate-pulse transition-all hover:scale-105">
           <span className="relative z-10 flex items-center gap-2 font-black tracking-widest"><Download size={22} /> Install AJ App</span>
           <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12"></div>
        </button>
    </footer>
</main>
);
}