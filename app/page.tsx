"use client";
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp, query, orderBy, limit, where } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X, CheckCircle2, Download, Copy, Video, Newspaper, Users, Heart, MessageSquare, Camera, Settings, Edit3, Mail, Lock, User, DollarSign, Share2, Music, Play, PlusSquare, MoreVertical, Search, Phone, Video as VideoIcon, ArrowLeft, Trash2, Edit, Bell, UserPlus } from 'lucide-react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

// --- CONFIGURATIONS (ALL REAL KEYS INTEGRATED) ---
const YT_API_KEY = "AIzaSyD9vR3hNLt7pBNlm6PMaZWbJOB9QGcrD1Y"; 
const UNSPLASH_KEY = "W4x76VphkyY9fzP3DbJPfXLhdD6x063gW--Voifn_UE";
const NEWS_API_KEY = "6e79bcc161f047039bf1acab74da28ea";
const CLOUDINARY_NAME = "atm28akz";
const CLOUDINARY_PRESET = "aj_portal";
const ZEGO_APP_ID = 242898579;
const ZEGO_SERVER_SECRET = "1301f078a6687c7cba1da329dbacdfbc30ccbe5eff5c7ec069d4c02e1b2ad0e5";
const NOWPAYMENTS_API_KEY = "3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7";

export default function AJSuperPortal() {
// --- ORIGINAL STATES PRESERVED ---
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

// --- SOCIAL & IDENTITY STATES ---
const [username, setUsername] = useState('');
const [bio, setBio] = useState('');
const [tempPhoto, setTempPhoto] = useState('');
const [referralInput, setReferralInput] = useState('');

// --- CONTENT STATES (APIs) ---
const [reels, setReels] = useState([]); 
const [pulse, setPulse] = useState([]); 
const [news, setNews] = useState([]);
const [notifications, setNotifications] = useState([]);
const [hasNewNotif, setHasNewNotif] = useState(false);
const [showNotifModal, setShowNotifModal] = useState(false);

// --- AI BOT ASSISTANT ---
const [aiInput, setAiInput] = useState('');
const [aiChat, setAiChat] = useState([{role:'bot', text:'Hello! Main AJ ka AI Representative hoon. CEO ke behalf par aapki madad kar sakta hoon.'}]);

// --- INTERACTIVE STATES ---
const [likedPosts, setLikedPosts] = useState({}); 
const [commentBoardPostId, setCommentBoardPostId] = useState(null); 
const [postComments, setPostComments] = useState([]);
const [newComment, setNewComment] = useState('');
const [showGiftModal, setShowGiftModal] = useState(null);

// --- WALLET & AI PROFIT STATES ---
const [visualProfit, setVisualProfit] = useState(0);
const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility...", "Connecting to AJ liquidity pool..."]);
const [purchaseAmount, setPurchaseAmount] = useState(20);
const [transferId, setTransferId] = useState('');
const [transferAmount, setTransferAmount] = useState(0);
const [payoutId, setPayoutId] = useState('');
const [withdrawHistory, setWithdrawHistory] = useState([]);

const fileInputRef = useRef(null);

// --- CEO MATH (500:1 -> 1000 per $2) ---
const displayBalance = (balance + visualProfit).toFixed(2);
const displayUsdt = ((balance + visualProfit) / 500).toFixed(2);

// --- CONTENT FETCHERS ---
const fetchSocialAPIs = async () => {
    try {
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=shorts+trending+viral&type=video&videoDuration=short&key=${YT_API_KEY}`);
        const ytData = await ytRes.json(); setReels(ytData.items || []);

        const unRes = await fetch(`https://api.unsplash.com/photos/random?count=15&client_id=${UNSPLASH_KEY}&query=luxury,fashion,lifestyle`);
        const unData = await unRes.json(); setPulse(unData || []);

        const nRes = await fetch(`https://newsapi.org/v2/everything?q=AI+Technology+Future&apiKey=${NEWS_API_KEY}`);
        const nData = await nRes.json(); setNews(nData.articles?.slice(0, 12) || []);
    } catch (e) { console.log("API Error"); }
};

// --- ZEGO CALLING LOGIC ---
const startCall = async (isVideo = true) => {
    const roomId = "aj_room_" + user.uid.substring(0, 6);
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(ZEGO_APP_ID, ZEGO_SERVER_SECRET, roomId, user.uid, username || "AJ_User");
    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zp.joinRoom({
        container: document.getElementById('call-container'),
        mode: isVideo ? ZegoUIKitPrebuilt.OneONoneCall : ZegoUIKitPrebuilt.GroupCall,
        showPreJoinView: false,
    });
    setSocialScreen('in_call');
};

// --- AI BOT LOGIC (Representative) ---
const handleAiAssistant = () => {
    if(!aiInput.trim()) return;
    const msg = aiInput.toLowerCase();
    let res = "Main is masle ko hal nahi kar sakta. Please 'Talk with CEO' par click karein ya Gmail par contact karein.";
    if(msg.includes('coin') || msg.includes('balance')) res = "Aap Wallet mein ja kar coins khareed sakte hain. 1000 coins = $2.";
    if(msg.includes('refer') || msg.includes('dost')) res = "Hub par apna ID copy karein, dost ke join karne par aapko 50 coins milenge.";
    if(msg.includes('withdraw')) res = "Minimum withdrawal 5000 coins hai. Binance Pay ya Airtm best hai.";
    if(msg.includes('gift')) res = "Gifting se aap creators ko support kar sakte hain. Coffee se lekar Mansion tak 6 options hain.";

    setAiChat([...aiChat, {role:'user', text:aiInput}, {role:'bot', text:res}]);
    setAiInput('');
};

// --- AUTH & SYNC ---
useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                await setDoc(userRef, { 
                    username: currentUser.displayName.replace(/\s+/g,'').toLowerCase(), 
                    balance: 500, uid: currentUser.uid, photo: currentUser.photoURL, date: serverTimestamp() 
                });
            }
            
            onSnapshot(userRef, (snap) => {
                if (snap.exists()) { 
                    setBalance(snap.data().balance || 0); 
                    setBotTier(snap.data().botTier || 'none');
                    setInvested(snap.data().invested || 0);
                    setUsername(snap.data().username || '');
                    setTempPhoto(snap.data().photo || currentUser.photoURL);
                }
            });

            const nQ = query(collection(db, "notifications"), orderBy("date", "desc"), limit(5));
            onSnapshot(nQ, (snap) => { setNotifications(snap.docs.map(d => d.data())); if(!snap.empty) setHasNewNotif(true); });

            const wQ = query(collection(db, "withdrawals"), where("uid", "==", currentUser.uid), orderBy("date", "desc"));
            onSnapshot(wQ, (snap) => setWithdrawHistory(snap.docs.map(d => ({id: d.id, ...d.data()}))));

            setScreen('hub');
        } else { setScreen('auth'); }
    });
    return () => unsubscribe();
}, []);

// --- AI PROFIT GENERATOR ---
useEffect(() => {
    let vInt;
    if (user && botTier !== 'none' && invested > 0) {
      const dailyRate = botTier === 'vvip' ? 0.05 : 0.02;
      const profitPerSec = (invested * dailyRate) / 86400;
      vInt = setInterval(() => setVisualProfit(p => p + profitPerSec), 1000);
    }
    return () => clearInterval(vInt);
}, [user, botTier, invested]);

// --- GIFTING (60/40) ---
const sendGift = async (creatorId, giftName, cost) => {
    if (balance < cost) return alert("Not enough coins! Go to Wallet.");
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost) });
    await updateDoc(doc(db, "users", creatorId), { balance: increment(cost * 0.6) });
    await addDoc(collection(db, "transactions"), { sender: user.uid, receiver: creatorId, gift: giftName, amount: cost, date: serverTimestamp() });
    alert(`🎁 ${giftName} Sent!`);
    setShowGiftModal(null);
};

// --- SPLASH ---
useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => { setLoading(prev => (prev >= 100 ? 100 : prev + 10)); }, 50);
      setTimeout(() => setScreen('hub'), 2000);
      return () => clearInterval(interval);
    }
}, [screen]);

// --- RENDER START ---
if (screen === 'splash') return (
<main className="h-screen bg-black flex flex-col items-center justify-center text-white text-center">
<div className="w-40 h-40 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8 animate-pulse"><img src="/logo.png" className="w-full h-full object-cover" /></div>
<h1 className="text-3xl font-black tracking-widest uppercase animate-bounce">AJ PORTAL</h1>
</main>
);

if (screen === 'auth' && !user) return (
<main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
<div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
<h2 className="text-6xl font-black mb-10 italic text-cyan-400 uppercase">AJ <span className="text-white">ID</span></h2>
<button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-all shadow-xl">CONTINUE WITH GOOGLE</button>
<p className="mt-8 text-yellow-500 font-bold tracking-widest uppercase">+500 COINS BONUS</p>
</div>
</main>
);

return (
<main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
    {/* HEADER */}
    <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="text-2xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-4">
            <div className="relative cursor-pointer" onClick={() => {setShowNotifModal(true); setHasNewNotif(false);}}>
                <Bell size={24} className="text-white hover:text-cyan-400 transition-all" />
                {hasNewNotif && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></div>}
            </div>
            <div onClick={() => setScreen('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                <span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
                {user && <img src={tempPhoto || user.photoURL} className="w-8 h-8 rounded-full border-2 border-cyan-500" />}
            </div>
        </div>
    </header>

    {/* HUB SECTION */}
    {screen === 'hub' && (
        <section className="min-h-screen flex flex-col items-center p-6 pt-32 pb-40">
            <h1 className="text-5xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_30px_#22d3ee] italic">AJ SUPER PORTAL</h1>
            
            {/* REFERRAL CARD */}
            <div className="w-full max-w-2xl bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 p-8 rounded-[2.5rem] mb-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-4 text-left">
                    <div className="p-4 bg-cyan-500/20 rounded-2xl"><UserPlus className="text-cyan-400" size={36}/></div>
                    <div><h3 className="font-black text-xl uppercase tracking-tighter text-white">Refer & Earn 50 🪙</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Your AJ ID is your code</p></div>
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-6 py-4 rounded-full border border-white/10">
                    <span className="text-[10px] font-mono text-cyan-400 truncate max-w-[120px]">{user?.uid}</span>
                    <button onClick={() => {navigator.clipboard.writeText(user.uid); alert("ID Copied!");}} className="text-white hover:text-cyan-400 transition-all"><Copy size={18}/></button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 md:gap-16 w-full max-w-5xl z-30">
                <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-[3rem] h-56 md:h-96 flex flex-col items-center justify-center cursor-pointer shadow-2xl hover:border-cyan-400 active:scale-95 transition-all">
                    <Trophy className="text-cyan-400 w-12 h-12 md:w-24 md:h-24 mb-4" /><span className="font-black text-sm md:text-4xl uppercase italic">Gaming</span>
                </div>
                <div onClick={() => { fetchSocialAPIs(); setScreen('social'); setSocialScreen('hub'); }} className="bg-white/5 border border-white/10 rounded-[3rem] h-56 md:h-96 flex flex-col items-center justify-center cursor-pointer shadow-2xl hover:border-pink-500 active:scale-95 transition-all">
                    <Zap className="text-pink-500 w-12 h-12 md:w-24 md:h-24 mb-4" /><span className="font-black text-sm md:text-4xl uppercase italic">Social</span>
                </div>
                <div onClick={() => setScreen('wallet')} className="bg-white/5 border border-white/10 rounded-[3rem] h-56 md:h-96 flex flex-col items-center justify-center cursor-pointer shadow-2xl hover:border-yellow-500 active:scale-95 transition-all">
                    <Wallet className="text-yellow-500 w-12 h-12 md:w-24 md:h-24 mb-4" /><span className="font-black text-sm md:text-4xl uppercase italic">Wallet</span>
                </div>
                <div onClick={() => {setScreen('social'); setSocialScreen('ai_bot');}} className="bg-white/5 border border-white/10 rounded-[3rem] h-56 md:h-96 flex flex-col items-center justify-center cursor-pointer shadow-2xl hover:border-green-500 active:scale-95 transition-all">
                    <Bot className="text-green-400 w-12 h-12 md:w-24 md:h-24 mb-4" /><span className="font-black text-sm md:text-4xl uppercase italic">AJ AI</span>
                </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20"><img src="/logo.png" className="w-96 h-96 animate-pulse" /></div>
        </section>
    )}

    {/* SOCIAL MODULES */}
    {screen === 'social' && (
        <div className="fixed inset-0 z-[400] bg-slate-950 flex flex-col h-screen overflow-hidden">
            <header className="p-4 bg-black/95 backdrop-blur-md border-b border-white/10 flex justify-between items-center shadow-xl">
                <button onClick={() => setScreen('hub')} className="text-pink-500 font-black text-xs uppercase tracking-widest">← HUB</button>
                <h2 className="text-2xl font-black italic text-pink-500 uppercase tracking-tighter">AJ SOCIAL</h2>
                <div className="w-10"></div>
            </header>

            <div className="flex-1 overflow-y-auto">
                {socialScreen === 'hub' ? (
                    <div className="max-w-md mx-auto grid grid-cols-1 gap-6 p-8 pb-32">
                        {[{n:'AJ TikReels', i:Video, s:'tikreels', d:'Viral YouTube Shorts'}, {n:'AJ Pulse', i:Users, s:'pulse', d:'Premium Lifestyle Feed'}, {n:'AJ WeChat', i:MessageSquare, s:'chatlist', d:'WhatsApp Style Chat'}, {n:'AJ Discover', i:Globe, s:'discover', d:'Latest AI & Future Tech khabrein'}].map((mod) => (
                            <div key={mod.n} onClick={() => setSocialScreen(mod.s)} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] text-center hover:border-pink-500 transition-all cursor-pointer shadow-2xl group">
                                <mod.i size={44} className="text-pink-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-2xl font-black uppercase italic tracking-widest text-white">{mod.n}</h3>
                                <p className="text-[10px] text-gray-400 uppercase mt-2 font-bold tracking-[0.2em]">{mod.d}</p>
                            </div>
                        ))}
                    </div>
                ) : socialScreen === 'tikreels' ? (
                    <div className="h-full w-full max-w-md mx-auto snap-y snap-mandatory overflow-y-auto bg-black">
                        {reels.map((vid, i) => (
                            <div key={i} className="h-[88vh] w-full snap-start relative border-b border-white/5 bg-black">
                                <iframe src={`https://www.youtube.com/embed/${vid.id.videoId}?autoplay=1&mute=0&controls=0&modestbranding=1&loop=1&playlist=${vid.id.videoId}`} className="w-full h-full border-none pointer-events-none" allow="autoplay" />
                                <div className="absolute right-4 bottom-32 flex flex-col gap-8 items-center z-50">
                                    <Heart size={38} className="text-white hover:text-red-500 transition-all active:scale-125" onClick={()=>handleLike(vid.id.videoId)}/>
                                    <MessageCircle size={38} className="text-white cursor-pointer" onClick={() => setCommentBoardPostId(vid.id.videoId)}/>
                                    <Zap size={38} className="text-yellow-500 cursor-pointer" onClick={() => setShowGiftModal(vid.snippet.channelId)}/>
                                    <Share2 size={38} className="text-white cursor-pointer" onClick={() => {if(navigator.share) navigator.share({title:'AJ TikReels', url:window.location.href});}}/>
                                </div>
                                <div className="absolute bottom-10 left-6 text-white z-50 max-w-[75%]">
                                    <p className="font-black text-sm uppercase tracking-widest">@{vid.snippet.channelTitle}</p>
                                    <p className="text-[10px] opacity-70 mt-1 line-clamp-1 italic">{vid.snippet.title}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : socialScreen === 'chatlist' ? (
                    <div className="max-w-md mx-auto bg-[#111b21] h-screen border-x border-white/10 overflow-y-auto">
                        <div className="bg-[#1f2c33] p-5 flex justify-between items-center shadow-lg"><h2 className="text-2xl font-black text-white italic tracking-widest">WeChat</h2><div className="flex gap-6 text-gray-400"><Camera size={24}/><Search size={24}/><MoreVertical size={24}/></div></div>
                        {['AJ Support Center', 'CEO VIP Room', 'Global Community'].map((name, i) => (
                            <div key={i} onClick={() => setSocialScreen('chat')} className="flex items-center gap-4 p-5 hover:bg-white/5 cursor-pointer border-b border-white/5 rounded-[2rem] mx-2 transition-all">
                                <div className="w-14 h-14 rounded-full bg-cyan-600/30 flex items-center justify-center font-black border border-cyan-500/50 text-cyan-400 text-lg shadow-xl">AJ</div>
                                <div className="flex-1 text-left">
                                    <div className="flex justify-between mb-1"><p className="font-black text-white text-xs uppercase tracking-wider">{name}</p><span className="text-[10px] text-gray-500">Online</span></div>
                                    <p className="text-[10px] text-gray-500 line-clamp-1 italic font-medium">Encrypted WeChat session active...</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : socialScreen === 'chat' ? (
                    <div className="max-w-md mx-auto h-[88vh] flex flex-col bg-[#0b141a] m-2 rounded-[3.5rem] overflow-hidden shadow-2xl border border-cyan-500/20">
                        <div className="bg-[#1f2c33] p-5 flex items-center gap-3 border-b border-white/10 shadow-lg">
                            <button onClick={()=>setSocialScreen('chatlist')} className="text-cyan-500"><ChevronRight className="rotate-180"/></button>
                            <img src="/logo.png" className="w-11 h-11 rounded-full border-2 border-green-500 shadow-md" />
                            <div className="flex-1 text-left"><p className="font-black text-white text-sm uppercase tracking-widest">AJ SUPPORT</p><p className="text-[8px] text-green-500 font-black animate-pulse tracking-[0.3em] uppercase">VVIP SECURE</p></div>
                            <div className="flex gap-6 text-[#aebac1] px-2"><VideoIcon size={24} className="cursor-pointer hover:text-white" onClick={() => startCall(true)} /><Phone size={24} className="cursor-pointer hover:text-white" onClick={() => startCall(false)} /></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-contain">
                             <div className="flex justify-start"><div className="p-4 max-w-[80%] bg-[#202c33] text-white rounded-2xl rounded-tl-none border border-white/5 shadow-xl text-xs leading-relaxed">Assalamu Alaikum! AJ Portal Support mein swagat hai. Main AJ AI Assistant hoon. Main aapki kya madad kar sakta hoon?</div></div>
                        </div>
                        <div className="p-4 bg-[#1f2c33] flex gap-3 items-center shadow-inner"><PlusSquare size={28} className="text-[#aebac1] cursor-pointer hover:text-white" /><input type="text" placeholder="Type a message" className="flex-1 bg-[#2a3942] border-none p-4 rounded-full text-xs text-white outline-none font-bold" /><button className="bg-cyan-600 p-4 rounded-full text-white shadow-xl active:scale-90 transition-all"><Send size={22}/></button></div>
                    </div>
                ) : socialScreen === 'discover' ? (
                    <div className="max-w-md mx-auto p-5 pb-32 space-y-8">
                        <h2 className="text-3xl font-black text-cyan-400 italic mb-8 uppercase tracking-widest border-b-2 border-cyan-500 pb-2">AI Discovery Feed</h2>
                        {news.map((item, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                {item.urlToImage && <img src={item.urlToImage} className="w-full h-48 object-cover" />}
                                <div className="p-6"><h3 className="font-black text-sm text-white mb-3 uppercase tracking-tight italic">{item.title}</h3><p className="text-[10px] text-gray-400 line-clamp-3 mb-4 font-medium italic">{item.description}</p><a href={item.url} target="_blank" className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-cyan-500/20 px-6 py-3 rounded-full inline-block hover:bg-cyan-500 hover:text-black transition-all">Read Story</a></div>
                            </div>
                        ))}
                    </div>
                ) : socialScreen === 'ai_bot' ? (
                    <div className="max-w-md mx-auto h-[85vh] bg-black flex flex-col p-6 rounded-[3.5rem] border-2 border-green-500/20 shadow-2xl">
                         <div className="flex items-center gap-4 mb-8 border-b-2 border-green-500/10 pb-4"><Bot size={44} className="text-green-500 animate-pulse"/><div className="text-left"><p className="font-black text-white uppercase tracking-widest text-lg">AJ AI Agent</p><p className="text-[8px] text-green-500 font-black animate-pulse">Representative Active</p></div></div>
                         <div className="flex-1 overflow-y-auto space-y-5 mb-6 pr-2">
                             {aiChat.map((m, i) => (<div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><div className={`p-4 max-w-[85%] rounded-2xl text-xs font-bold shadow-xl ${m.role==='user'?'bg-cyan-700 text-white rounded-tr-none':'bg-green-900/30 text-green-400 border border-green-500/20 rounded-tl-none'}`}>{m.text}</div></div>))}
                         </div>
                         <div className="bg-white/5 p-5 rounded-[2rem] flex gap-3 shadow-inner border border-white/10"><input type="text" value={aiInput} onChange={(e)=>setAiInput(e.target.value)} placeholder="Ask AJ AI anything..." className="flex-1 bg-transparent border-none outline-none text-xs text-white font-bold" /><button onClick={handleAiAssistant} className="bg-green-600 p-4 rounded-2xl shadow-xl text-white active:scale-90 transition-all"><Send size={22}/></button></div>
                         <a href="https://wa.me/96878994093" target="_blank" className="mt-8 text-center text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] animate-pulse">Problem not solved? Talk with CEO</a>
                    </div>
                ) : null}
            </div>

            {/* GIFTING MODAL */}
            {showGiftModal && (
                <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="w-full max-w-sm bg-[#111] border-2 border-yellow-500/30 rounded-[3.5rem] p-10 text-center shadow-[0_0_80px_rgba(234,179,8,0.2)]">
                        <h2 className="text-3xl font-black text-yellow-500 mb-8 italic uppercase tracking-tighter">AJ Rewards Store</h2>
                        <div className="grid grid-cols-2 gap-6">
                            {[{n:'Coffee', c:2500, i:'☕'}, {n:'Pizza', c:5000, i:'🍕'}, {n:'Heart', c:10000, i:'❤️'}, {n:'SuperCar', c:25000, i:'🏎️'}, {n:'Jet', c:40000, i:'🛩️'}, {n:'Mansion', c:50000, i:'🏰'}].map((g) => (
                                <div key={g.n} onClick={()=>sendGift(showGiftModal, g.n, g.c)} className="bg-white/5 border border-white/10 p-5 rounded-3xl hover:border-yellow-500 transition-all cursor-pointer group active:scale-95 shadow-xl">
                                    <div className="text-4xl mb-3 group-hover:scale-125 transition-transform">{g.i}</div>
                                    <p className="text-[10px] font-black uppercase text-white tracking-widest">{g.n}</p>
                                    <p className="text-[10px] text-yellow-500 font-black mt-1 tracking-widest">{g.c.toLocaleString()} 🪙</p>
                                </div>
                            ))}
                        </div>
                        <div onClick={() => {setShowGiftModal(null); setScreen('wallet'); setWalletTab('purchase');}} className="mt-10 bg-yellow-600/10 border border-yellow-600/30 py-3 rounded-full text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] cursor-pointer animate-pulse">Recharge Coins 🪙 &gt;</div>
                        <button onClick={()=>setShowGiftModal(null)} className="mt-6 text-gray-500 text-[10px] font-black uppercase">Cancel</button>
                    </div>
                </div>
            )}

            {/* COMMENT BOARD */}
            {commentBoardPostId && (
                <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-end">
                    <div className="w-full h-[65vh] bg-[#111b21] rounded-t-[3rem] border-t-2 border-pink-500 p-8 flex flex-col shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center mb-8 shrink-0"><h3 className="text-xl font-black text-pink-500 uppercase tracking-widest italic">Comments</h3><X className="cursor-pointer text-gray-500" onClick={()=>setCommentBoardPostId(null)} size={30}/></div>
                        <div className="flex-1 overflow-y-auto space-y-5 pr-2">
                             {postComments.map((c, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 shadow-md"><img src={c.photo || "/logo.png"} className="w-9 h-9 rounded-full border border-pink-500" /><div><p className="font-black text-[10px] text-pink-400 uppercase">@{c.username}</p><p className="text-xs text-gray-300 mt-1 font-medium italic">"{c.text}"</p></div></div>
                             ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex gap-3 shrink-0"><input type="text" value={newComment} onChange={(e)=>setNewComment(e.target.value)} placeholder="Type a comment..." className="flex-1 bg-black/50 border border-white/10 rounded-2xl p-4 text-xs outline-none text-white font-bold shadow-inner" /><button onClick={async () => { if(!newComment.trim()) return; await addDoc(collection(db,"social_comments"),{postId:commentBoardPostId, text:newComment, username:username||"AJ_Member", photo:tempPhoto||user.photoURL, date:serverTimestamp()}); setNewComment(''); }} className="bg-pink-600 p-4 rounded-2xl shadow-xl active:scale-90 transition-all text-white"><Send size={22}/></button></div>
                    </div>
                </div>
            )}
        </div>
    )}

    {/* WALLET MODAL (100% COMPLETE UI) */}
    {screen === 'wallet' && (
        <div className="fixed inset-0 z-[500] bg-black flex flex-col items-center p-8 overflow-y-auto">
            <button onClick={() => { setScreen('hub'); setWalletTab('main'); }} className="self-start text-cyan-400 mb-12 font-black uppercase tracking-widest flex items-center gap-2">← BACK TO HUB</button>
            <div className="w-full max-w-md bg-[#111] border-2 border-white/10 p-12 rounded-[3.5rem] text-center shadow-2xl relative overflow-hidden">
                <h2 className="text-6xl font-black text-yellow-500 mb-2 tracking-tighter drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]">{displayBalance} 🪙</h2>
                <p className="text-green-400 font-black text-2xl mb-12 tracking-widest uppercase italic shadow-sm">${displayUsdt}</p>

                {walletTab === 'main' ? (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between bg-white/5 p-5 rounded-[2rem] border border-white/5 mb-6 shadow-inner">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">My Unique AJ ID:</span>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-white truncate max-w-[130px]">{user?.uid}</span>
                                <button onClick={() => {navigator.clipboard.writeText(user.uid); alert("ID Copied!");}} className="p-2.5 bg-white/10 rounded-xl text-cyan-400 active:scale-90 transition-all border border-cyan-500/20"><Copy size={16}/></button>
                            </div>
                        </div>
                        <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">Purchase Coins</button>
                        <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-6 rounded-[2.5rem] font-black border-2 border-cyan-500/30 uppercase tracking-[0.2em] shadow-xl hover:bg-cyan-600 hover:text-black transition-all">Transfer AJ</button>
                        <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-6 rounded-[2.5rem] font-black border-2 border-pink-500/30 uppercase tracking-[0.2em] shadow-xl hover:bg-pink-600 hover:text-white transition-all">Withdraw AJ</button>
                    </div>
                ) : walletTab === 'transfer' ? (
                    <div className="flex flex-col gap-8 text-left">
                        <div className="space-y-4"><label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] ml-2">Recipient AJ ID</label><input type="text" value={transferId} onChange={(e)=>setTransferId(e.target.value)} placeholder="Paste Receiver AJ ID" className="w-full bg-black/60 border-2 border-white/10 p-6 rounded-[2rem] text-white outline-none focus:border-cyan-500 font-bold shadow-inner" /></div>
                        <div className="space-y-4"><label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] ml-2">Amount (Coins)</label><input type="number" value={transferAmount} onChange={(e)=>setTransferAmount(Number(e.target.value))} className="w-full bg-black/60 border-2 border-white/10 p-6 rounded-[2rem] text-white outline-none font-black text-3xl text-center shadow-inner" /></div>
                        <button onClick={async () => { if(balance < transferAmount || transferAmount < 1) return alert("Invalid Amount!"); await updateDoc(doc(db,"users",user.uid),{balance:increment(-transferAmount)}); await updateDoc(doc(db,"users",transferId),{balance:increment(transferAmount)}); alert("Transfer Success! 🪙"); setWalletTab('main'); }} className="bg-cyan-500 py-7 rounded-[2.5rem] font-black uppercase text-black shadow-2xl active:scale-95 transition-all text-xl">CONFIRM TRANSFER</button>
                        <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-center uppercase font-black text-[10px] mt-2">Cancel Transaction</button>
                    </div>
                ) : walletTab === 'withdraw' ? (
                    <div className="flex flex-col gap-8 text-left">
                        <div className="space-y-4"><label className="text-[10px] font-black text-pink-500 uppercase tracking-[0.4em] ml-2">Payout Method</label><select value={payoutId} onChange={(e)=>setPayoutId(e.target.value)} className="w-full bg-black/60 border-2 border-white/10 p-6 rounded-[2rem] text-white font-black outline-none shadow-inner"><option>Binance Pay (USDT)</option><option>Airtm (USDT)</option></select></div>
                        <button onClick={async () => { if(balance < 5000) return alert("Min Withdraw: 5000 Coins"); await addDoc(collection(db,"withdrawals"),{uid:user.uid, amount:balance, status:"pending", date:serverTimestamp()}); await updateDoc(doc(db,"users",user.uid),{balance:0}); alert("Payout Requested! 🏦"); setWalletTab('main'); }} className="bg-pink-600 py-7 rounded-[2.5rem] font-black uppercase text-white shadow-2xl active:scale-95 transition-all text-xl">SUBMIT WITHDRAWAL</button>
                        <div className="mt-8 border-t-2 border-white/5 pt-8">
                             <p className="text-[10px] font-black text-gray-500 uppercase text-center mb-6 tracking-[0.4em] italic decoration-pink-500 underline">Recent History</p>
                             <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                                {withdrawHistory.length > 0 ? withdrawHistory.map((w, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/5 shadow-md"><div className="text-left"><p className="text-xs font-black text-white">{w.amount} 🪙</p><p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{new Date(w.date?.seconds*1000).toLocaleDateString()}</p></div><span className={`text-[8px] font-black uppercase px-4 py-2 rounded-full shadow-sm ${w.status==='pending'?'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30':'bg-green-500/10 text-green-500 border border-green-500/30'}`}>{w.status}</span></div>
                                )) : <p className="text-[10px] text-gray-600 text-center italic font-black uppercase tracking-widest">No activity found</p>}
                             </div>
                        </div>
                    </div>
                ) : walletTab === 'purchase' && (
                    <div className="flex flex-col gap-6 text-left">
                      <label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Payment Method</label>
                      <select className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none"><option>Binance (TRC20)</option><option>Airtm (Gmail Account)</option></select>
                      <div className="bg-black border-2 border-white/10 p-8 rounded-[2.5rem] text-center shadow-[inset_0_0_30px_rgba(0,255,255,0.05)]">
                         <p className="text-[10px] text-gray-500 uppercase font-black mb-4 tracking-[0.3em]">You will receive</p>
                         <p className="text-yellow-500 text-6xl font-black mb-6 drop-shadow-[0_0_10px_#eab308]">{(purchaseAmount * 100).toLocaleString()} 🪙</p>
                         <div className="flex items-center justify-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                            <DollarSign className="text-green-400" size={30}/>
                            <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="bg-transparent text-white text-3xl w-32 text-center font-black outline-none" />
                         </div>
                      </div>
                      <button onClick={() => window.open('https://wa.me/96878994093')} className="bg-cyan-500 py-5 rounded-2xl font-black uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-black">Confirm Purchase</button>
                      <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase font-black hover:text-white mt-4">Back</button>
                    </div>
                  )}
            </div>
        </div>
    )}

    {/* ARCADE MODAL (FULL SCREEN GAMES) */}
    {screen === 'arcade' && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col h-screen overflow-hidden">
            {!selectedGame ? (
                <div className="p-10 overflow-y-auto flex-1 pb-32">
                    <button onClick={() => setScreen('hub')} className="text-cyan-400 font-black mb-12 tracking-[0.3em] uppercase flex items-center gap-4 transition-all hover:brightness-125 italic">← TERMINATE SESSION</button>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
                        {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape'].map((game) => (
                            <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border-2 border-white/5 p-6 rounded-[3.5rem] text-center hover:border-cyan-400 cursor-pointer shadow-2xl transition-all group active:scale-95">
                                <div className="relative overflow-hidden rounded-[2.5rem] mb-6 shadow-2xl border-4 border-white/5"><img src={`/games/${game.toLowerCase().replace(/ /g, '-')}/logo.png`} className="w-full aspect-square object-cover transition-transform group-hover:scale-110 duration-700" onError={(e)=>{e.target.src="/logo.png"}} /><div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500"><Play size={55} className="text-cyan-400 drop-shadow-xl" /></div></div>
                                <h3 className="font-black text-sm md:text-xl uppercase italic tracking-widest text-white">{game}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col h-full w-full bg-black">
                    <div className="w-full bg-black h-16 flex items-center px-8 border-b-2 border-white/10 shrink-0 shadow-2xl relative z-10">
                        <button onClick={() => setSelectedGame(null)} className="text-cyan-400 font-black text-xs uppercase tracking-[0.3em] hover:brightness-150 transition-all italic">← END GAME</button>
                        <div className="flex-1 text-center font-black uppercase text-[10px] text-white/20 italic tracking-[0.5em]">{selectedGame} • SECURE PROTOCOL ACTIVE</div>
                    </div>
                    <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-full border-none flex-1 bg-black" title="Game" />
                </div>
            )}
        </div>
    )}

    {/* AI BOT (ORIGINAL TIERS) */}
    {screen === 'ai' && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-black uppercase tracking-widest mb-12">← Back</button>
           <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-10 rounded-[4rem] text-center shadow-2xl relative">
                <Activity size={60} className="mx-auto mb-6 text-green-500 animate-pulse" />
                <h2 className="text-4xl font-black text-white mb-8 uppercase italic tracking-tighter">AJ NEURAL AI</h2>
                {botTier !== 'none' ? (
                    <div className="bg-black/50 p-8 rounded-3xl border border-green-500/20 text-left font-mono">
                        <div className="flex justify-between mb-4"><span className="text-green-500 uppercase text-xs font-black">Daily Profit Status:</span><span className="text-white font-black">SYNCED</span></div>
                        <div className="h-24 overflow-hidden text-green-500/60 mt-2 text-[10px] leading-relaxed italic">{tradeLogs.map((log, i) => ( <div key={i} className="mb-1">{log}</div> ))}</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        <div className="p-8 bg-white/5 rounded-3xl border border-white/10"><h3 className="text-xl font-black text-cyan-400 uppercase tracking-widest">Basic Bot</h3><p className="text-[10px] text-gray-500 mt-2 uppercase font-bold tracking-widest">2% Daily Passive Income</p><button onClick={async () => { if(balance < 25000) return alert("Min 25k Coins!"); await updateDoc(doc(db, "users", user.uid), { balance: increment(-25000), botTier: 'basic', invested: 25000 }); alert("Bot Started!"); }} className="mt-6 w-full py-4 bg-cyan-600 rounded-xl font-black uppercase shadow-xl hover:bg-cyan-500 transition-all">25,000 🪙</button></div>
                        <div className="p-8 bg-white/5 rounded-3xl border border-white/10"><h3 className="text-xl font-black text-yellow-500 uppercase tracking-widest">VVIP Bot</h3><p className="text-[10px] text-gray-500 mt-2 uppercase font-bold tracking-widest">5% Daily Passive Income</p><button onClick={async () => { if(balance < 75000) return alert("Min 75k Coins!"); await updateDoc(doc(db, "users", user.uid), { balance: increment(-75000), botTier: 'vvip', invested: 75000 }); alert("Bot Started!"); }} className="mt-6 w-full py-4 bg-yellow-600 rounded-xl font-black uppercase shadow-xl hover:bg-yellow-500 transition-all">75,000 🪙</button></div>
                    </div>
                )}
           </div>
        </div>
    )}

    {/* NOTIFICATION MODAL */}
    {showNotifModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-[#111] border-2 border-cyan-500/30 rounded-[3rem] p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black text-cyan-400 uppercase italic">Notifications</h3><X className="text-gray-500 cursor-pointer" onClick={() => setShowNotifModal(false)}/></div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {notifications.length > 0 ? notifications.map((n, i) => (
                        <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 shadow-md"><p className="text-xs font-black text-white uppercase mb-1">{n.title || "Portal Update"}</p><p className="text-[10px] text-gray-400 italic">"{n.message || "Something new is live!"}"</p></div>
                    )) : <p className="text-center text-gray-600 text-[10px] italic py-10 uppercase tracking-widest">No new updates!</p>}
                </div>
            </div>
        </div>
    )}

    {/* FOOTER */}
    <footer className="bg-black py-40 px-10 border-t-2 border-white/5 text-center flex flex-col items-center relative overflow-hidden mt-10">
        <div className="absolute inset-0 opacity-10 bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain pointer-events-none scale-150 grayscale"></div>
        <div className="text-7xl md:text-[11rem] font-black italic text-cyan-400 drop-shadow-[0_0_60px_rgba(6,182,212,0.5)] mb-16 uppercase tracking-tighter relative z-10 select-none uppercase">AJ STUDIO</div>
        
        <div className="flex flex-col items-center gap-10 mb-24 relative z-10">
            <a href="mailto:ajcreatorstudio.hq@gmail.com" className="flex items-center gap-6 bg-white/5 px-14 py-6 rounded-[2.5rem] border-2 border-cyan-500/20 hover:border-cyan-500 transition-all group shadow-2xl backdrop-blur-md">
                <Mail className="text-cyan-400 group-hover:scale-125 transition-transform" size={34} />
                <span className="font-black text-sm md:text-xl text-white uppercase italic">ajcreatorstudio.hq@gmail.com</span>
            </a>
            <div className="flex justify-center gap-12 mt-4">
                <a href="https://wa.me/96878994093" target="_blank" className="flex items-center gap-3 text-green-500 border-2 border-green-500/20 px-10 py-4 rounded-full font-black uppercase hover:bg-green-500 hover:text-black transition-all shadow-xl text-sm tracking-widest">WhatsApp</a>
                <a href="https://x.com/Ali20352061" target="_blank" className="flex items-center gap-3 text-white border-2 border-white/20 px-10 py-4 rounded-full font-black uppercase hover:bg-white hover:text-black transition-all shadow-xl text-sm tracking-widest">Twitter (X)</a>
            </div>
        </div>

        <button onClick={() => { const link = document.createElement('a'); link.href = '/aj-portal.apk'; link.download = 'aj-portal.apk'; link.click(); }} className="group relative px-20 py-8 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_80px_#06b6d4] animate-pulse transition-all hover:scale-110 relative z-10 mb-20 border-b-8 border-cyan-800">
            <span className="relative z-20 flex items-center gap-4 font-black tracking-[0.4em] text-2xl text-black"><Download size={32} /> Install AJ App</span>
        </button>

        <div className="mt-12 pt-12 border-t-2 border-white/5 w-full relative z-10 text-center">
            <p className="text-[10px] md:text-xs text-cyan-400 font-black uppercase tracking-[0.5em] leading-relaxed max-w-4xl mx-auto drop-shadow-[0_0_10px_#06b6d4] animate-pulse italic">
                © 2026 AJ CREATOR STUDIO. ALL RIGHTS RESERVED. 
                <br/> 
                UNAUTHORIZED DECOMPILATION OR DISTRIBUTION OF THIS SUPER PORTAL IS STRICTLY FORBIDDEN BY AJ PROTOCOL.
            </p>
        </div>
    </footer>

    {/* CALL CONTAINER */}
    {socialScreen === 'in_call' && <div id="call-container" className="fixed inset-0 z-[3000] bg-black"></div>}
</main>
);
}