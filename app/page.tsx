"use client";
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp, query, orderBy, limit, where, getDocs } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X, CheckCircle2, Download, Copy, Video, Newspaper, Users, Heart, MessageSquare, Camera, Settings, Edit3, Mail, Lock, User, DollarSign, Share2, Music, Play, PlusSquare, MoreVertical, Search, Phone, Video as VideoIcon, ArrowLeft } from 'lucide-react';
import emailjs from 'emailjs-com';

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
const [manualEmail, setManualEmail] = useState('');
const [manualPass, setManualPass] = useState('');
const fileInputRef = useRef<HTMLInputElement>(null); 

// --- REAL-TIME DATA STATES ---
const [pixaVideos, setPixaVideos] = useState([]);
const [pixaData, setPixaData] = useState([]);
const [newsData, setNewsData] = useState([]);
const [userPosts, setUserPosts] = useState([]);
const [allUsers, setAllUsers] = useState([]); // WeChat Contacts
const [chatMessages, setChatMessages] = useState([]);
const [newMessage, setNewMessage] = useState('');
const [activeContact, setActiveContact] = useState(null);
const [postText, setPostText] = useState('');

// --- AI STATES ---
const [visualProfit, setVisualProfit] = useState(0);
const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility...", "Connecting to AJ liquidity pool..."]);

// Math
const displayBalance = (balance + visualProfit).toFixed(2);
const displayUsdt = ((balance + visualProfit) / 1000).toFixed(2); // 1000:1 Math

// --- NAVIGATION AD TRIGGER ---
const navigateWithAd = (target) => {
    if ((window as any).AJ_SDK) (window as any).AJ_SDK.showAd();
    if (target === 'social') { fetchSocialData(); setScreen('social'); setSocialScreen('hub'); }
    else { setScreen(target); }
};

const fetchSocialData = async () => {
    try {
        const v = await fetch(`https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=travel+fashion&per_page=15`);
        const vData = await v.json(); setPixaVideos(vData.hits || []);
        const p = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&q=lifestyle+gaming&image_type=photo&per_page=20`);
        const pData = await p.json(); setPixaData(pData.hits || []);
        const n = await fetch(`https://newsapi.org/v2/everything?q=crypto+tech&apiKey=${NEWS_API_KEY}`);
        const nData = await n.json(); setNewsData(nData.articles?.slice(0, 15) || []);
        
        // Fetch WeChat Contacts (All registered users)
        const userQuery = query(collection(db, "users"), limit(50));
        const userDocs = await getDocs(userQuery);
        setAllUsers(userDocs.docs.map(d => ({id: d.id, ...d.data()})).filter(u => u.id !== (user as any)?.uid));
    } catch (e) { console.log("API Error"); }
};

// --- REAL-TIME CHAT & POSTS LOGIC ---
useEffect(() => {
    if (socialScreen === 'chat' && activeContact && user) {
        // Unique Chat Room ID for 1v1
        const chatId = [(user as any).uid, activeContact.id].sort().join("_");
        const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "desc"), limit(40));
        return onSnapshot(q, (snap) => {
            setChatMessages(snap.docs.map(d => ({id: d.id, ...d.data()})).reverse());
        });
    }
    if (socialScreen === 'pulse') {
        const q = query(collection(db, "user_posts"), orderBy("createdAt", "desc"), limit(20));
        return onSnapshot(q, (snap) => { setUserPosts(snap.docs.map(d => ({id: d.id, ...d.data()}))); });
    }
}, [socialScreen, activeContact, user]);

const sendPrivateMessage = async () => {
    if (!newMessage.trim() || !user || !activeContact) return;
    const chatId = [(user as any).uid, activeContact.id].sort().join("_");
    await addDoc(collection(db, "chats", chatId, "messages"), {
        text: newMessage,
        senderId: (user as any).uid,
        senderName: username || "AJ_Member",
        createdAt: serverTimestamp()
    });
    setNewMessage('');
};

const handleCreatePost = async () => {
    if (!postText.trim() && !tempPhoto) return alert("Empty Post!");
    if ((window as any).AJ_SDK) (window as any).AJ_SDK.showAd();
    await addDoc(collection(db, "user_posts"), {
        text: postText, image: tempPhoto, uid: (user as any).uid,
        username: username || "AJ_Member", photo: (user as any).photoURL,
        likes: 0, createdAt: serverTimestamp()
    });
    // Add reward
    await updateDoc(doc(db, "users", (user as any).uid), { balance: increment(2.5) });
    setPostText(''); setTempPhoto('');
    alert("🚀 Post Live! +2.5 Coins Received");
};

// --- AUTH HANDLERS ---
const handleGoogleLogin = async () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, googleProvider);
};

const handleSignOut = async () => { await signOut(auth); setScreen('auth'); };

const handleCreateProfile = async () => {
    if(username.length < 3) return alert("Too short!");
    await updateDoc(doc(db, "users", (user as any)!.uid), {
        username: username.toLowerCase().trim(), bio,
        photo: tempPhoto || (user as any)!.photoURL || "/logo.png",
        hasSocialProfile: true
    });
    setHasSocialProfile(true); setSocialScreen(pendingMode || 'hub');
};

const enterSocialMode = (mode) => {
    setPendingMode(mode);
    if (!user || !hasSocialProfile) setSocialScreen('setup'); 
    else setSocialScreen(mode);
};

// --- FIREBASE AUTH SYNC ---
useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser as any);
            const userRef = doc(db, "users", currentUser.uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) {
                await setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, hasSocialProfile: false, photo: currentUser.photoURL });
            } else {
                const d = snap.data();
                setHasSocialProfile(d.hasSocialProfile || false);
                setUsername(d.username || '');
                setTempPhoto(d.photo || currentUser.photoURL);
            }
            onSnapshot(userRef, (s) => {
                if (s.exists()) { setBalance(s.data().balance); setBotTier(s.data().botTier); setInvested(s.data().invested); }
            });
            setScreen('hub');
        } else { setUser(null); setScreen('auth'); }
    });
    return () => unsubscribe();
}, []);

// --- INTERFACE RENDERING ---
if (screen === 'splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white text-center">
    <div className="w-40 h-40 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8"><img src="/logo.png" className="w-full h-full object-cover" /></div>
    <h1 className="text-3xl font-black uppercase animate-pulse tracking-widest">AJ PORTAL</h1>
    </main>
);

if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
    <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
    <h2 className="text-6xl font-black mb-10 italic text-cyan-400">AJ ID</h2>
    <button onClick={handleGoogleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl">CONTINUE WITH GOOGLE</button>
    <p className="mt-8 text-yellow-500 font-bold">+500 COINS BONUS</p>
    </div>
    </main>
);

return (
<main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
<input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

{/* PORTAL HEADER */}
<header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
    <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
    <div className="flex items-center gap-3">
        <div onClick={() => navigateWithAd('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer hover:bg-white/10">
            <span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
            <span className="text-[10px] text-green-400 font-black ml-1">${displayUsdt}</span>
            {user && <img src={tempPhoto || (user as any).photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
        </div>
        <button onClick={handleSignOut} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full uppercase">EXIT</button>
    </div>
</header>

<section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
    <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
    <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
      <div onClick={() => navigateWithAd('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all hover:border-cyan-400">
         <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase tracking-tighter">Gaming</span>
      </div>
      <div onClick={() => navigateWithAd('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl relative z-50 cursor-pointer hover:border-pink-500">
         <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase tracking-tighter">Social</span>
      </div>
      <div onClick={() => navigateWithAd('wallet')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 hover:border-yellow-500 relative z-30">
         <img src="/gold.jpg" className="w-14 h-14 mb-2 rounded-full border-2 border-yellow-500" />
         <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500 tracking-tighter">Wallet</h2>
      </div>
      <div onClick={() => navigateWithAd('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer hover:border-green-500 relative z-30">
         <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
         <span className="font-black text-xs md:text-3xl uppercase tracking-tighter">AJ AI</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-24 h-24 md:w-96 md:h-96 bg-black border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden">
           <img src="/logo.png" className="w-full h-full object-cover opacity-60 animate-pulse" />
        </div>
      </div>
    </div>
</section>

{/* FULL SCREEN ARCADE */}
{screen === 'arcade' && (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col h-screen">
        {!selectedGame ? (
            <div className="p-8 overflow-y-auto flex-1">
                <button onClick={() => setScreen('hub')} className="text-cyan-400 font-bold mb-10 uppercase transition-all hover:brightness-125 flex items-center gap-2"><ArrowLeft size={18}/> BACK TO HUB</button>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pb-20">
                {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape', 'Ludo Elite Royal', 'Puck Pulse Elite'].map((game) => {
                const isComingSoon = game === 'Ludo Elite Royal' || game === 'Puck Pulse Elite';
                const folderName = game.toLowerCase().replace(/ /g, '-');
                return (
                <div key={game} onClick={() => !isComingSoon && setSelectedGame(game)} className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center hover:border-cyan-400 cursor-pointer transition-all">
                    <img src={`/games/${folderName}/logo.png`} className="w-full aspect-square rounded-xl mb-4 object-cover shadow-lg" onError={(e:any)=>e.target.src="/logo.png"} />
                    <h3 className="font-black text-xs uppercase">{game}</h3>
                    <button className="mt-4 w-full py-2 rounded-full font-black text-[10px] bg-cyan-500 text-black uppercase">{isComingSoon ? "Soon" : "PLAY NOW"}</button>
                </div>
                )})}
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col h-full w-full">
                <div className="w-full bg-black h-12 flex items-center px-4 border-b border-white/10 shrink-0">
                    <button onClick={() => setSelectedGame(null)} className="text-cyan-400 font-black text-[10px] uppercase tracking-widest hover:brightness-125">← BACK TO GAMES</button>
                    <div className="flex-1 text-center font-black uppercase text-[10px] opacity-40">{selectedGame}</div>
                </div>
                <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-full border-none flex-1" title="Game" />
            </div>
        )}
    </div>
)}

{/* SOCIAL HUB - FULL REAL FUNCTIONS */}
{screen === 'social' && (
    <div className="fixed inset-0 z-[400] bg-slate-950 flex flex-col h-screen overflow-hidden">
        <header className="sticky top-0 w-full p-4 bg-black/80 backdrop-blur-xl border-b border-white/10 flex justify-between items-center z-[500] rounded-b-3xl">
            {socialScreen === 'hub' ? (
                <button onClick={() => setScreen('hub')} className="text-pink-500 font-black text-xs uppercase">← HUB</button>
            ) : (
                <button onClick={() => setSocialScreen('hub')} className="text-pink-500 font-black text-xs uppercase">← BACK</button>
            )}
            <h2 className="text-xl font-black italic text-pink-500 uppercase flex-1 text-center">WeChat</h2>
            <button onClick={() => setSocialScreen('setup')} className="bg-white/10 p-2 rounded-full text-pink-500"><Settings size={18}/></button>
        </header>

        <div className="flex-1 overflow-y-auto">
        {socialScreen === 'hub' ? (
          <div className="max-w-md mx-auto grid grid-cols-1 gap-6 p-8 text-center">
             <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-pink-500/20 backdrop-blur-md">
                  <img src={tempPhoto || (user as any)?.photoURL} className="w-12 h-12 rounded-full border-2 border-pink-500 shadow-lg" />
                  <div className="text-left"><p className="font-black text-white text-sm uppercase">@{username || "AJ_Member"}</p><p className="text-[9px] text-gray-500 uppercase tracking-widest">Verified VVIP Member</p></div>
             </div>
             {[{n:'AJ TikReels', i:Video, s:'tikreels'}, {n:'AJ Pulse', i:Users, s:'pulse'}, {n:'AJ WeChat', i:MessageSquare, s:'chatlist'}, {n:'AJ Discover', i:Globe, s:'discover'}].map((mod) => (
                <div key={mod.n} onClick={() => enterSocialMode(mod.s)} className="p-8 bg-white/5 border border-white/10 rounded-[3rem] text-center hover:border-pink-500 transition-all cursor-pointer group shadow-lg">
                    <mod.i size={36} className="text-pink-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="text-2xl font-black uppercase italic text-white">{mod.n}</h3>
                </div>
             ))}
          </div>
        ) : socialScreen === 'tikreels' ? (
            <div className="h-full w-full max-w-md mx-auto snap-y snap-mandatory overflow-y-auto bg-black">
                {pixaVideos.map((vid:any, i) => (
                    <div key={i} className="h-[85vh] w-full snap-start relative border-b border-white/5">
                        <video src={vid.videos.large.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center">
                            <div onClick={()=>{handleLike(vid.id); (window as any).AJ_SDK?.showAd();}} className="flex flex-col items-center cursor-pointer active:scale-125 transition-all"><Heart size={35} className="text-pink-500 drop-shadow-lg"/><span className="text-[10px] font-bold">12k</span></div>
                            <div className="flex flex-col items-center cursor-pointer"><MessageSquare size={35} className="drop-shadow-lg"/><span className="text-[10px] font-bold">842</span></div>
                            <div onClick={()=>handleShare('AJ TikReels')} className="flex flex-col items-center cursor-pointer active:scale-125 transition-all"><Share2 size={35} className="drop-shadow-lg"/><span className="text-[10px] font-bold">Share</span></div>
                        </div>
                        <div className="absolute bottom-10 left-6 text-white max-w-[70%] drop-shadow-xl">
                            <p className="font-black text-sm">@{vid.user} • LIVE</p>
                            <p className="text-xs opacity-90 line-clamp-1">Amazing trip to Muscat! #Viral #TikReels #AJ</p>
                        </div>
                        {(i + 1) % 5 === 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><p className="text-cyan-400 font-black uppercase tracking-widest text-xs animate-pulse">ADVERTISING BREAK</p></div>}
                    </div>
                ))}
            </div>
        ) : socialScreen === 'pulse' ? (
            <div className="max-w-md mx-auto space-y-6 p-4 pb-24">
                <div className="bg-white/10 backdrop-blur-xl p-5 rounded-3xl border border-pink-500/20 shadow-2xl">
                    <div className="flex gap-3">
                        <img src={(user as any)?.photoURL || "/logo.png"} className="w-10 h-10 rounded-full border-2 border-pink-500 shadow-md"/>
                        <textarea value={postText} onChange={(e)=>setPostText(e.target.value)} placeholder="Share your Muscat Story..." className="flex-1 bg-white/5 rounded-2xl p-4 text-xs outline-none border border-white/10 h-20 text-white"/>
                    </div>
                    <div className="flex justify-between mt-4 border-t border-white/5 pt-3">
                        <button onClick={handleImageClick} className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-pink-500 transition-all"><Camera size={18}/> {tempPhoto ? "Image Set" : "Add Photo"}</button>
                        <button onClick={handleCreatePost} className="bg-pink-600 px-6 py-1.5 rounded-full text-xs font-black shadow-lg">POST & EARN</button>
                    </div>
                </div>
                {userPosts.map((post) => (
                    <div key={post.id} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><img src={post.photo || "/logo.png"} className="w-9 h-9 rounded-full border-2 border-pink-500"/><p className="font-black text-xs text-white">@{post.username}</p></div><MoreVertical size={18} className="opacity-40 text-white"/></div>
                        {post.image && <img src={post.image} className="w-full aspect-square object-cover" />}
                        <div className="p-5"><div className="flex gap-5 mb-4"><Heart size={28} onClick={()=>handleLike(post.id)} className="hover:text-pink-500 cursor-pointer transition-all text-white"/><MessageSquare size={28} className="text-white"/><Share2 size={28} className="text-white"/></div><p className="text-[11px] leading-relaxed text-gray-200"><span className="font-black mr-2 text-white">@{post.username}</span>{post.text}</p></div>
                    </div>
                ))}
            </div>
        ) : socialScreen === 'chatlist' ? (
            <div className="max-w-md mx-auto bg-[#111b21]/80 backdrop-blur-2xl h-screen border-x border-white/10">
                <div className="bg-[#1f2c33]/90 p-5 flex justify-between items-center border-b border-white/5">
                    <h2 className="text-xl font-bold text-[#e9edef] tracking-tight">WeChat</h2>
                    <div className="flex gap-5 text-[#aebac1]"><Camera size={20}/><Search size={20}/><MoreVertical size={20}/></div>
                </div>
                <div className="mt-2 space-y-1">
                    {allUsers.map((u, i) => (
                        <div key={u.id} onClick={()=>{setActiveContact(u); setSocialScreen('chat'); (window as any).AJ_SDK?.showAd();}} className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-colors mx-2 rounded-2xl">
                            <img src={u.photo || '/logo.png'} className="w-14 h-14 rounded-full border border-cyan-500 shadow-md" />
                            <div className="flex-1"><div className="flex justify-between items-center mb-1"><p className="font-bold text-[#e9edef]">@{u.username || "AJ_Friend"}</p><span className="text-[10px] text-[#8696a0]">11:00 PM</span></div><p className="text-xs text-[#8696a0] line-clamp-1">Connected to WeChat Secure Messaging.</p></div>
                        </div>
                    ))}
                </div>
            </div>
        ) : socialScreen === 'chat' ? (
            <div className="max-w-md mx-auto h-[88vh] flex flex-col bg-[#0b141a] overflow-hidden m-2 rounded-[2.5rem] shadow-2xl border border-cyan-500/20">
                <div className="bg-[#1f2c33]/90 backdrop-blur-md p-4 flex items-center gap-3 border-b border-white/10">
                    <button onClick={()=>setSocialScreen('chatlist')} className="text-cyan-500 p-2"><ChevronRight className="rotate-180"/></button>
                    <img src={activeContact.photo || "/logo.png"} className="w-10 h-10 rounded-full border-2 border-green-500" />
                    <div className="flex-1"><p className="font-bold text-sm text-white">@{activeContact.username}</p><p className="text-[8px] text-green-500 font-bold uppercase tracking-widest animate-pulse">Online • WeChat Encryption</p></div>
                    <div className="flex gap-4 text-[#aebac1] px-2"><VideoIcon size={20}/><Phone size={20}/></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-contain">
                    {chatMessages.map((m:any) => (
                        <div key={m.id} className={`flex ${m.senderId === (user as any).uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 max-w-[85%] rounded-2xl shadow-xl relative border ${m.senderId === (user as any).uid ? 'bg-cyan-700/80 border-cyan-400 text-white rounded-tr-none' : 'bg-[#202c33]/90 border-white/5 text-[#e9edef] rounded-tl-none'} backdrop-blur-md`}>
                                <p className="text-[11px] leading-relaxed pr-6">{m.text}</p>
                                <p className="text-[7px] text-white/30 absolute bottom-1 right-2 uppercase">Now</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-[#1f2c33]/90 backdrop-blur-md flex gap-2 items-center">
                    <input type="text" value={newMessage} onChange={(e)=>setNewMessage(e.target.value)} placeholder="Type a message" className="flex-1 bg-[#2a3942] border-none p-3.5 rounded-full text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500" />
                    <button onClick={sendPrivateMessage} className="bg-cyan-600 p-3.5 rounded-full text-white shadow-2xl active:scale-90 transition-all"><Send size={20}/></button>
                </div>
            </div>
        ) : socialScreen === 'discover' ? (
            <div className="max-w-4xl mx-auto space-y-5 p-4 pb-24">
                <h3 className="text-2xl font-black italic uppercase text-white tracking-widest flex items-center gap-3"><Globe className="text-cyan-400" size={30}/> Crypto & Tech Daily</h3>
                {newsData.map((art: any, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm p-5 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row gap-6 shadow-xl group">
                        {art.urlToImage && <img src={art.urlToImage} className="w-full md:w-48 h-48 object-cover rounded-[2rem] group-hover:scale-105 transition-transform shadow-lg" />}
                        <div className="flex-1 py-2">
                            <div className="flex justify-between items-center mb-3"><span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-4 py-1 rounded-full font-black uppercase border border-cyan-500/30">{art.source?.name}</span></div>
                            <h4 className="font-black text-base text-white leading-snug mb-3">{art.title}</h4>
                            <p className="text-[11px] text-gray-400 line-clamp-3 mb-4 leading-relaxed">{art.description}</p>
                            <a href={art.url} target="_blank" className="text-[10px] text-cyan-400 font-black uppercase flex items-center gap-2 border-b border-cyan-400/30 w-max pb-1">Read Source <ArrowUpRight size={14}/></a>
                        </div>
                    </div>
                ))}
            </div>
        ) : socialScreen === 'setup' && (
          <div className="max-w-md mx-auto bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3.5rem] text-center mt-4 shadow-2xl">
              <div className="relative w-28 h-24 mx-auto mb-8 cursor-pointer group" onClick={handleImageClick}>
                <img src={tempPhoto || (user as any)?.photoURL || "/logo.png"} className="w-full h-full rounded-full border-4 border-pink-500 p-1 object-cover shadow-2xl group-hover:brightness-50 transition-all" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={30} className="text-white"/></div>
                <div className="absolute bottom-0 right-0 bg-pink-600 p-2.5 rounded-full border-2 border-black shadow-lg text-white"><Camera size={16}/></div>
              </div>
              <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter italic text-center">Identity Setup</h2>
              <div className="space-y-4 text-left">
                  <label className="text-[10px] font-black text-pink-500 ml-1 uppercase">Username</label>
                  <input type="text" placeholder="@unique_name" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl font-bold text-white outline-none focus:border-pink-500" />
                  <label className="text-[10px] font-black text-pink-500 ml-1 uppercase">Bio</label>
                  <textarea placeholder="Tell people about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none h-28 focus:border-pink-500" />
                  <button onClick={handleCreateProfile} className="w-full mt-10 py-5 bg-pink-600 rounded-[1.5rem] font-black uppercase shadow-[0_10px_20px_rgba(236,72,153,0.3)] active:scale-95 transition-all text-white border-b-4 border-pink-800">ACTIVATE PROFILE</button>
              </div>
          </div>
        ) : null}
        </div>
    </div>
)}

{/* WALLET */}
{screen === 'wallet' && (
    <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
       <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 mb-8 font-bold uppercase tracking-widest transition-all hover:brightness-125">← BACK</button>
       <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
          <h2 className="text-5xl font-black text-yellow-500 mb-2 tracking-tighter">{displayBalance} 🪙</h2>
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
                    <DollarSign className="text-green-400" size={24}/>
                    <input type="number" value={purchaseAmount === 0 ? '' : purchaseAmount} onChange={(e)=>setPurchaseAmount(e.target.value === '' ? 0 : Number(e.target.value))} className="bg-transparent text-white text-3xl w-32 text-center font-bold outline-none" />
                 </div>
                 <p className="text-[9px] text-red-400 mt-3 font-bold uppercase italic">Minimum Purchase: $20</p>
              </div>
              <button onClick={handlePurchase} className="bg-cyan-500 py-5 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all text-white">Confirm Purchase</button>
              <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2 hover:text-white">Cancel</button>
            </div>
          )}
       </div>
    </div>
)}

{/* FOOTER & SECURITY NOTICE */}
<footer className="bg-black py-24 px-10 border-t border-white/5 text-center flex flex-col items-center relative overflow-hidden">
    <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_50px_rgba(6,182,212,0.3)] mb-12 uppercase tracking-tighter relative z-10">AJ STUDIO</div>
    <div className="flex justify-center gap-12 mb-20 relative z-10">
        <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border-2 border-green-500 px-8 py-3 rounded-full font-black uppercase hover:bg-green-500 hover:text-black transition-all shadow-lg text-sm">Whatsapp</a>
        <a href="https://x.com/Ali20352061" target="_blank" className="text-white border-2 border-white px-8 py-3 rounded-full font-black uppercase hover:bg-white hover:text-black transition-all shadow-lg text-sm">X (Twitter)</a>
    </div>
    <button onClick={() => { const link = document.createElement('a'); link.href = '/aj-portal.apk'; link.download = 'aj-portal.apk'; link.click(); }} className="group relative px-16 py-6 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_60px_#06b6d4] animate-pulse transition-all hover:scale-110 relative z-10 mb-12">
        <span className="relative z-20 flex items-center gap-3 font-black tracking-[0.3em] text-xl"><Download size={28} /> Install AJ App</span>
        <div className="absolute inset-0 bg-white/30 group-hover:translate-x-full transition-transform duration-700 -skew-x-12 z-10"></div>
    </button>
    <div className="mt-12 pt-12 border-t border-white/10 w-full relative z-10">
        <p className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-[0.4em] leading-relaxed max-w-2xl mx-auto">
            © 2026 AJ CREATOR STUDIO. All Rights Reserved. <br/> 
            Unauthorized copying, distribution, or decompilation of this portal and its games is strictly prohibited and subject to legal action globally.
        </p>
    </div>
</footer>

</main>
);
}