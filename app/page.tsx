"use client";
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp, query, orderBy, limit, where } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, X, Download, Copy, Video, Users, Heart, MessageSquare, Camera, Settings, Edit3, DollarSign, Share2, Music, Play, PlusSquare, MoreVertical, Search, Phone, Video as VideoIcon, ArrowLeft, Trash2, Mail, Bell, Gift, UserPlus } from 'lucide-react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

// --- ALL REAL KEYS INTEGRATED (Verified by AJ) ---
const YT_API_KEY = "AIzaSyD9vR3hNLt7pBNlm6PMaZWbJOB9QGcrD1Y"; 
const UNSPLASH_KEY = "W4x76VphkyY9fzP3DbJPfXLhdD6x063gW--Voifn_UE";
const NEWS_API_KEY = "6e79bcc161f047039bf1acab74da28ea";
const CLOUDINARY_NAME = "atm28akz";
const CLOUDINARY_PRESET = "aj_portal";
const ZEGO_APP_ID = 242898579;
const ZEGO_SERVER_SECRET = "1301f078a6687c7cba1da329dbacdfbc30ccbe5eff5c7ec069d4c02e1b2ad0e5";

export default function AJSuperPortal() {
// --- MAIN STATES ---
const [screen, setScreen] = useState('splash');
const [walletTab, setWalletTab] = useState('main');
const [socialScreen, setSocialScreen] = useState('hub'); 
const [user, setUser] = useState(null);
const [balance, setBalance] = useState(0);
const [botTier, setBotTier] = useState('none');
const [selectedGame, setSelectedGame] = useState(null);

// --- NOTIFICATION & REFERRAL ---
const [notifications, setNotifications] = useState([]);
const [showNotifModal, setShowNotifModal] = useState(false);
const [hasNewNotif, setHasNewNotif] = useState(false);
const [referralInput, setReferralInput] = useState('');

// --- CONTENT & SOCIAL ---
const [reels, setReels] = useState([]); 
const [pulse, setPulse] = useState([]); 
const [news, setNews] = useState([]);
const [username, setUsername] = useState('');
const [tempPhoto, setTempPhoto] = useState('');

// --- AI BOT ---
const [aiInput, setAiInput] = useState('');
const [aiChat, setAiChat] = useState([{role:'bot', text:'Hello! Main AJ ka AI Assistant hoon. Main CEO ke behalf par aapki madad karunga.'}]);

// --- INTERACTION ---
const [commentPostId, setCommentPostId] = useState(null);
const [comments, setComments] = useState([]);
const [newComment, setNewComment] = useState('');
const [showGiftModal, setShowGiftModal] = useState(null);

// --- WALLET ---
const [transferId, setTransferId] = useState('');
const [transferAmt, setTransferAmt] = useState(0);
const [withdrawHistory, setWithdrawHistory] = useState([]);
const [payoutId, setPayoutId] = useState('');

// --- CEO MATH (1000 : $2) ---
const displayBalance = balance.toFixed(2);
const displayUsdt = (balance / 500).toFixed(2);

// --- NOTIFICATION LISTENER ---
useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("date", "desc"), limit(5));
    return onSnapshot(q, (snap) => {
        setNotifications(snap.docs.map(d => d.data()));
        if (!snap.empty) setHasNewNotif(true);
    });
}, []);

// --- ZEGO CALLING ---
const startCall = async (isVideo = true) => {
    const roomId = "aj_room_" + user.uid.substring(0,5);
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(ZEGO_APP_ID, ZEGO_SERVER_SECRET, roomId, user.uid, username || "AJ_User");
    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zp.joinRoom({
        container: document.getElementById('call-container'),
        mode: isVideo ? ZegoUIKitPrebuilt.OneONoneCall : ZegoUIKitPrebuilt.GroupCall,
        showPreJoinView: false,
    });
    setSocialScreen('in_call');
};

// --- AI BOT REPRESENTATIVE LOGIC ---
const handleAiAssistant = () => {
    if(!aiInput.trim()) return;
    const msg = aiInput.toLowerCase();
    let res = "Main is sawal ka jawab nahi dhoond saka. Please niche diye gaye 'Talk with CEO' link par click karein.";
    
    if(msg.includes('coin') || msg.includes('buy')) res = "Aap Wallet mein ja kar coins khareed sakte hain. 1000 coins $2 ke hain.";
    if(msg.includes('refer') || msg.includes('dost')) res = "Hub par apna Referral ID copy karein aur dost ko dein. Dost ke join karne par aapko 50 coins milenge!";
    if(msg.includes('withdraw')) res = "Withdrawal ke liye Binance Pay ya Airtm ka use karein. Minimum 5000 coins hone chahiye.";
    if(msg.includes('gift')) res = "Gifting se aap creators ko support kar sakte hain. Coffee se lekar Mansion tak 6 options hain.";

    setAiChat([...aiChat, {role:'user', text:aiInput}, {role:'bot', text:res}]);
    setAiInput('');
};

// --- CONTENT FETCHERS ---
const fetchContent = async () => {
    try {
        const yt = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=shorts+trending&type=video&videoDuration=short&key=${YT_API_KEY}`);
        const ytData = await yt.json(); setReels(ytData.items || []);

        const un = await fetch(`https://api.unsplash.com/photos/random?count=10&client_id=${UNSPLASH_KEY}&query=luxury,lifestyle`);
        const unData = await un.json(); setPulse(unData || []);

        const nw = await fetch(`https://newsapi.org/v2/everything?q=AI+Technology+Future&apiKey=${NEWS_API_KEY}`);
        const nwData = await nw.json(); setNews(nwData.articles?.slice(0, 8) || []);
    } catch (e) { console.log("API Error"); }
};

// --- AUTH & DATA SYNC & REFERRAL CHECK ---
useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u) {
            setUser(u);
            const userRef = doc(db, "users", u.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                // New User Signup - Check Referral
                await setDoc(userRef, { 
                    username: u.displayName.replace(/\s+/g, '').toLowerCase(), 
                    balance: 500, uid: u.uid, photo: u.photoURL, date: serverTimestamp() 
                });
                alert("🎁 Welcome! +500 Welcome Bonus Received.");
            }
            
            onSnapshot(userRef, (s) => { 
                if(s.exists()){ 
                    setBalance(s.data().balance || 0); 
                    setUsername(s.data().username || ''); 
                    setTempPhoto(s.data().photo || u.photoURL); 
                }
            });
            setScreen('hub');
        } else { setScreen('auth'); }
    });
    return () => unsubscribe();
}, []);

// --- APPLY REFERRAL CODE ---
const handleApplyReferral = async () => {
    if(!referralInput.trim()) return;
    const refUserRef = doc(db, "users", referralInput);
    const refSnap = await getDoc(refUserRef);
    if(refSnap.exists()){
        await updateDoc(refUserRef, { balance: increment(50) });
        alert("✅ Referral Applied! Your friend received 50 coins.");
        setReferralInput('');
    } else {
        alert("❌ Invalid Referral ID");
    }
};

// --- GIFTING LOGIC (60/40) ---
const sendGift = async (creatorId, giftName, cost) => {
    if (balance < cost) return alert("Not enough coins! Go to Wallet to Recharge.");
    const creatorRef = doc(db, "users", creatorId);
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost) });
    await updateDoc(creatorRef, { balance: increment(cost * 0.6) });
    await addDoc(collection(db, "transactions"), { sender: user.uid, receiver: creatorId, gift: giftName, amount: cost, date: serverTimestamp() });
    alert(`🎁 ${giftName} Sent!`);
    setShowGiftModal(null);
};

// --- UI HELPERS ---
if (screen === 'splash') return <div className="h-screen bg-black flex flex-col items-center justify-center"><img src="/logo.png" className="w-32 animate-bounce" /><h1 className="text-cyan-400 font-black mt-4 tracking-widest uppercase">AJ PORTAL</h1></div>;
if (screen === 'auth') return <div className="h-screen bg-black flex flex-col items-center justify-center p-10"><h1 className="text-6xl font-black italic text-cyan-400 mb-10">AJ ID</h1><button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-white text-black px-12 py-5 rounded-3xl font-black text-xl shadow-2xl transition-transform active:scale-90">CONTINUE WITH GOOGLE</button></div>;

return (
<main className="min-h-screen bg-[#020617] text-white overflow-x-hidden relative font-sans">
    {/* HEADER */}
    <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="text-2xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-4">
            <div className="relative cursor-pointer" onClick={() => {setShowNotifModal(true); setHasNewNotif(false);}}>
                <Bell size={24} className="text-white hover:text-cyan-400" />
                {hasNewNotif && <div className="absolute -top-1 -right-1 w-2.5 h-3 bg-red-600 rounded-full animate-pulse"></div>}
            </div>
            <div onClick={() => setScreen('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer hover:bg-white/10">
                <span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
                {user && <img src={tempPhoto || user.photoURL} className="w-8 h-8 rounded-full border-2 border-cyan-500 shadow-[0_0_10px_#06b6d4]" />}
            </div>
        </div>
    </header>

    {/* HUB GRID */}
    {screen === 'hub' && (
        <section className="min-h-screen flex flex-col items-center p-6 pt-32 pb-40">
            <h1 className="text-5xl md:text-8xl font-black text-center mb-10 uppercase drop-shadow-[0_0_30px_#22d3ee] italic">AJ SUPER PORTAL</h1>
            
            {/* REFERRAL CARD ON HUB */}
            <div className="w-full max-w-2xl bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 p-6 rounded-[2.5rem] mb-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-4 text-left">
                    <div className="p-4 bg-cyan-500/20 rounded-2xl"><UserPlus className="text-cyan-400" size={32}/></div>
                    <div>
                        <h3 className="font-black text-lg uppercase tracking-tight">Refer & Earn 50 🪙</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Share your AJ ID with friends</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-full border border-white/10">
                    <span className="text-[10px] font-mono text-cyan-400 truncate max-w-[100px]">{user?.uid}</span>
                    <button onClick={() => {navigator.clipboard.writeText(user.uid); alert("ID Copied!");}} className="text-white hover:text-cyan-400"><Copy size={16}/></button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 md:gap-16 w-full max-w-5xl z-30">
                <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-[3rem] h-56 md:h-96 flex flex-col items-center justify-center cursor-pointer shadow-2xl hover:border-cyan-400 transition-all active:scale-95">
                    <Trophy className="text-cyan-400 w-12 h-12 md:w-24 md:h-24 mb-4" />
                    <span className="font-black text-sm md:text-4xl uppercase italic">Gaming</span>
                </div>
                <div onClick={() => { fetchContent(); setScreen('social'); }} className="bg-white/5 border border-white/10 rounded-[3rem] h-56 md:h-96 flex flex-col items-center justify-center cursor-pointer shadow-2xl hover:border-pink-500 transition-all active:scale-95">
                    <Zap className="text-pink-500 w-12 h-12 md:w-24 md:h-24 mb-4" />
                    <span className="font-black text-sm md:text-4xl uppercase italic">Social</span>
                </div>
                <div onClick={() => setScreen('wallet')} className="bg-white/5 border border-white/10 rounded-[3rem] h-56 md:h-96 flex flex-col items-center justify-center cursor-pointer shadow-2xl hover:border-yellow-500 transition-all active:scale-95">
                    <Wallet className="text-yellow-500 w-12 h-12 md:w-24 md:h-24 mb-4" />
                    <span className="font-black text-sm md:text-4xl uppercase italic">Wallet</span>
                </div>
                <div onClick={() => setSocialScreen('ai_bot')} className="bg-white/5 border border-white/10 rounded-[3rem] h-56 md:h-96 flex flex-col items-center justify-center cursor-pointer shadow-2xl hover:border-green-500 transition-all active:scale-95">
                    <Bot className="text-green-400 w-12 h-12 md:w-24 md:h-24 mb-4" />
                    <span className="font-black text-sm md:text-4xl uppercase italic">AJ AI</span>
                </div>
            </div>
        </section>
    )}

    {/* SOCIAL MODAL (TikReels, Pulse, WeChat, Discover) */}
    {screen === 'social' && (
        <div className="fixed inset-0 z-[400] bg-slate-950 flex flex-col h-screen overflow-hidden">
            <header className="p-4 bg-black/95 backdrop-blur-md border-b border-white/10 flex justify-between items-center shadow-2xl">
                <button onClick={() => setScreen('hub')} className="text-pink-500 font-black text-xs uppercase tracking-[0.2em]">← EXIT</button>
                <h2 className="text-2xl font-black italic text-pink-500 uppercase tracking-tighter animate-pulse">AJ SOCIAL</h2>
                <div className="w-10"></div>
            </header>

            <div className="flex-1 overflow-y-auto">
                {socialScreen === 'hub' ? (
                    <div className="max-w-md mx-auto grid grid-cols-1 gap-6 p-8 pb-32">
                        {[{n:'AJ TikReels', i:Video, s:'tikreels', d:'Viral YouTube Shorts'}, {n:'AJ Pulse', i:Users, s:'pulse', d:'Premium Lifestyle Feed'}, {n:'AJ WeChat', i:MessageSquare, s:'chatlist', d:'WhatsApp Style Messaging'}, {n:'AJ Discover', i:Globe, s:'discover', d:'Latest AI & Future Tech'}].map((mod) => (
                            <div key={mod.n} onClick={() => setSocialScreen(mod.s)} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] text-center hover:border-pink-500 transition-all cursor-pointer shadow-2xl">
                                <mod.i size={44} className="text-pink-500 mx-auto mb-4" />
                                <h3 className="text-2xl font-black uppercase italic tracking-widest">{mod.n}</h3>
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
                                    <Heart size={38} className="text-white shadow-xl hover:text-red-500 cursor-pointer transition-all active:scale-125" />
                                    <MessageCircle size={38} className="text-white cursor-pointer" onClick={() => setCommentPostId(vid.id.videoId)}/>
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
                    <div className="max-w-md mx-auto bg-[#111b21] h-screen border-x border-white/10">
                        <div className="bg-[#1f2c33] p-5 flex justify-between items-center shadow-lg"><h2 className="text-2xl font-black text-white italic tracking-widest">WeChat</h2><div className="flex gap-6 text-gray-400"><Camera size={24}/><Search size={24}/><MoreVertical size={24}/></div></div>
                        {['AJ Support Center', 'CEO VIP Room', 'Global AJ Community'].map((name, i) => (
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
                             <div className="flex justify-start"><div className="p-4 max-w-[80%] bg-[#202c33] text-white rounded-2xl rounded-tl-none border border-white/5 shadow-xl text-xs leading-relaxed">Assalamu Alaikum! AJ Portal mein aapka swagat hai. Main AJ AI Assistant hoon. Main aapki kya madad kar sakta hoon?</div></div>
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
                         <div className="flex items-center gap-4 mb-8 border-b-2 border-green-500/10 pb-4"><Bot size={44} className="text-green-500 animate-pulse"/><div className="text-left"><p className="font-black text-white uppercase tracking-widest">AJ AI Representative</p><p className="text-[8px] text-green-500 font-black animate-pulse">Online Support</p></div></div>
                         <div className="flex-1 overflow-y-auto space-y-5 mb-6 pr-2">
                             {aiChat.map((m, i) => (<div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><div className={`p-4 max-w-[85%] rounded-2xl text-xs font-bold shadow-xl ${m.role==='user'?'bg-cyan-700 text-white rounded-tr-none':'bg-green-900/30 text-green-400 border border-green-500/20 rounded-tl-none'}`}>{m.text}</div></div>))}
                         </div>
                         <div className="bg-white/5 p-5 rounded-[2rem] flex gap-3 shadow-inner border border-white/10"><input type="text" value={aiInput} onChange={(e)=>setAiInput(e.target.value)} placeholder="Ask AJ AI anything..." className="flex-1 bg-transparent border-none outline-none text-xs text-white font-bold" /><button onClick={handleAiAssistant} className="bg-green-600 p-4 rounded-2xl shadow-xl text-white active:scale-90 transition-all"><Send size={22}/></button></div>
                         <a href="https://wa.me/96878994093" target="_blank" className="mt-8 text-center text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] animate-pulse">Problem not solved? Talk with CEO</a>
                    </div>
                ) : socialScreen === 'in_call' ? (
                    <div className="h-full w-full bg-black relative"><div id="call-container" className="w-full h-full"></div><button onClick={()=>setSocialScreen('hub')} className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-600 px-12 py-5 rounded-full font-black uppercase text-sm z-[2000] border-4 border-white/10 shadow-2xl">Hang Up</button></div>
                ) : null}
            </div>

            {/* GIFTING MODAL (TikTok Style) */}
            {showGiftModal && (
                <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="w-full max-w-sm bg-[#111] border-2 border-yellow-500/30 rounded-[3.5rem] p-10 text-center shadow-[0_0_80px_rgba(234,179,8,0.2)]">
                        <h2 className="text-3xl font-black text-yellow-500 mb-8 italic uppercase tracking-tighter">AJ Rewards</h2>
                        <div className="grid grid-cols-2 gap-6">
                            {[{n:'Coffee', c:2500, i:'☕'}, {n:'Pizza', c:5000, i:'🍕'}, {n:'Heart', c:10000, i:'❤️'}, {n:'SuperCar', c:25000, i:'🏎️'}, {n:'Jet', c:40000, i:'🛩️'}, {n:'Mansion', c:50000, i:'🏰'}].map((g) => (
                                <div key={g.n} onClick={()=>sendGift(showGiftModal, g.n, g.c)} className="bg-white/5 border border-white/10 p-5 rounded-3xl hover:border-yellow-500 transition-all cursor-pointer group active:scale-95 shadow-xl">
                                    <div className="text-4xl mb-3 group-hover:scale-125 transition-transform">{g.i}</div>
                                    <p className="text-[10px] font-black uppercase text-white tracking-widest">{g.n}</p>
                                    <p className="text-[10px] text-yellow-500 font-black mt-1 tracking-widest">{g.c.toLocaleString()} 🪙</p>
                                </div>
                            ))}
                        </div>
                        <div onClick={() => {setShowGiftModal(null); setScreen('wallet'); setWalletTab('purchase');}} className="mt-10 bg-yellow-600/10 border border-yellow-600/30 py-3 rounded-full text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] cursor-pointer animate-pulse">Recharge 🪙 &gt;</div>
                        <button onClick={()=>setShowGiftModal(null)} className="mt-6 text-gray-500 text-[10px] font-black uppercase">Cancel</button>
                    </div>
                </div>
            )}

            {/* COMMENT BOARD */}
            {commentPostId && (
                <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-end">
                    <div className="w-full h-[65vh] bg-[#111b21] rounded-t-[3rem] border-t-2 border-pink-500 p-8 flex flex-col shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center mb-8 shrink-0"><h3 className="text-xl font-black text-pink-500 uppercase tracking-widest italic">Comments</h3><X className="cursor-pointer text-gray-500" onClick={()=>setCommentPostId(null)} size={30}/></div>
                        <div className="flex-1 overflow-y-auto space-y-5 pr-2">
                             {comments.length > 0 ? comments.map((c, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 shadow-md"><img src={c.photo || "/logo.png"} className="w-9 h-9 rounded-full border border-pink-500" /><div><p className="font-black text-[10px] text-pink-400 uppercase">@{c.username}</p><p className="text-xs text-gray-300 mt-1 font-medium italic">"{c.text}"</p></div></div>
                             )) : <p className="text-center text-gray-600 text-xs mt-10 italic uppercase font-bold tracking-widest">No comments yet</p>}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex gap-3 shrink-0"><input type="text" value={newComment} onChange={(e)=>setNewComment(e.target.value)} placeholder="Type a comment..." className="flex-1 bg-black/50 border border-white/10 rounded-2xl p-4 text-xs outline-none text-white font-bold" /><button onClick={async () => { if(!newComment.trim()) return; await addDoc(collection(db,"social_comments"),{postId:commentPostId, text:newComment, username:username||"AJ_Member", photo:tempPhoto||user.photoURL, date:serverTimestamp()}); setNewComment(''); }} className="bg-pink-600 p-4 rounded-2xl shadow-xl text-white active:scale-90 transition-all"><Send size={22}/></button></div>
                    </div>
                </div>
            )}
        </div>
    )}

    {/* WALLET MODAL */}
    {screen === 'wallet' && (
        <div className="fixed inset-0 z-[500] bg-black flex flex-col items-center p-8 overflow-y-auto">
            <button onClick={() => { setScreen('hub'); setWalletTab('main'); }} className="self-start text-cyan-400 mb-12 font-black uppercase tracking-widest flex items-center gap-2">← BACK</button>
            <div className="w-full max-w-md bg-[#111] border-2 border-white/10 p-12 rounded-[3.5rem] text-center shadow-2xl relative overflow-hidden">
                <h2 className="text-6xl font-black text-yellow-500 mb-2 tracking-tighter drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]">{displayBalance} 🪙</h2>
                <p className="text-green-400 font-black text-2xl mb-12 tracking-widest uppercase italic shadow-sm">${displayUsdt}</p>

                {walletTab === 'main' ? (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between bg-white/5 p-5 rounded-[2rem] border border-white/5 mb-6">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">My AJ ID:</span>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-white truncate max-w-[120px]">{user?.uid}</span>
                                <button onClick={() => {navigator.clipboard.writeText(user.uid); alert("ID Copied!");}} className="p-2.5 bg-white/10 rounded-xl text-cyan-400 active:scale-90 transition-all border border-cyan-500/20"><Copy size={16}/></button>
                            </div>
                        </div>
                        <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-6 rounded-[2.5rem] font-black border-2 border-cyan-500/30 uppercase tracking-[0.2em] shadow-xl hover:bg-cyan-600 hover:text-black transition-all">Send Coins</button>
                        <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-6 rounded-[2.5rem] font-black border-2 border-pink-500/30 uppercase tracking-[0.2em] shadow-xl hover:bg-pink-600 hover:text-white transition-all">Request Payout</button>
                    </div>
                ) : walletTab === 'transfer' ? (
                    <div className="flex flex-col gap-8 text-left">
                        <div className="space-y-4"><label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] ml-2">Recipient ID</label><input type="text" value={transferId} onChange={(e)=>setTransferId(e.target.value)} placeholder="Paste Receiver AJ ID" className="w-full bg-black/60 border-2 border-white/10 p-6 rounded-[2rem] text-white outline-none focus:border-cyan-500 font-bold shadow-inner" /></div>
                        <div className="space-y-4"><label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] ml-2">Amount (Coins)</label><input type="number" value={transferAmt} onChange={(e)=>setTransferAmt(Number(e.target.value))} className="w-full bg-black/60 border-2 border-white/10 p-6 rounded-[2rem] text-white outline-none font-black text-3xl text-center shadow-inner" /></div>
                        <button onClick={async () => { if(balance < transferAmt || transferAmt < 1) return alert("Invalid Amount!"); await updateDoc(doc(db,"users",user.uid),{balance:increment(-transferAmt)}); await updateDoc(doc(db,"users",transferId),{balance:increment(transferAmt)}); alert("Transfer Success! 🪙"); setWalletTab('main'); }} className="bg-cyan-500 py-7 rounded-[2.5rem] font-black uppercase text-black shadow-[0_15px_40px_rgba(6,182,212,0.3)] active:scale-95 transition-all text-xl">SEND COINS</button>
                        <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-center uppercase font-black text-[10px]">Cancel Transaction</button>
                    </div>
                ) : walletTab === 'withdraw' ? (
                    <div className="flex flex-col gap-8 text-left">
                        <div className="space-y-4"><label className="text-[10px] font-black text-pink-500 uppercase tracking-[0.4em] ml-2">Payout Method</label><select value={payoutId} onChange={(e)=>setPayoutId(e.target.value)} className="w-full bg-black/60 border-2 border-white/5 p-6 rounded-[2rem] text-white font-black outline-none shadow-inner"><option>Binance Pay (USDT)</option><option>Airtm (USDT)</option></select></div>
                        <button onClick={async () => { if(balance < 5000) return alert("Min Withdraw: 5000 Coins"); await addDoc(collection(db,"withdrawals"),{uid:user.uid, amount:balance, status:"pending", date:serverTimestamp()}); await updateDoc(doc(db,"users",user.uid),{balance:0}); alert("Payout Requested! 🏦"); setWalletTab('main'); }} className="bg-pink-600 py-7 rounded-[2.5rem] font-black uppercase text-white shadow-[0_15px_40px_rgba(236,72,153,0.3)] active:scale-95 transition-all text-xl">SUBMIT WITHDRAWAL</button>
                        <div className="mt-8 border-t-2 border-white/5 pt-8">
                             <p className="text-[10px] font-black text-gray-500 uppercase text-center mb-6 tracking-[0.4em] italic decoration-pink-500 underline">Recent Activity</p>
                             <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                                {withdrawHistory.length > 0 ? withdrawHistory.map((w, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/5 shadow-md"><div className="text-left"><p className="text-xs font-black text-white">{w.amount} 🪙</p><p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{new Date(w.date?.seconds*1000).toLocaleDateString()}</p></div><span className={`text-[8px] font-black uppercase px-4 py-2 rounded-full shadow-sm ${w.status==='pending'?'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30':'bg-green-500/10 text-green-500 border border-green-500/30'}`}>{w.status}</span></div>
                                )) : <p className="text-[10px] text-gray-600 text-center italic font-black uppercase tracking-widest">No history found</p>}
                             </div>
                        </div>
                        <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-center uppercase font-black text-[10px] mt-4">Close Wallet</button>
                    </div>
                ) : null}
            </div>
        </div>
    )}

    {/* ARCADE MODAL */}
    {screen === 'arcade' && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col h-screen overflow-hidden">
            {!selectedGame ? (
                <div className="p-10 overflow-y-auto flex-1 pb-32">
                    <button onClick={() => setScreen('hub')} className="text-cyan-400 font-black mb-12 tracking-[0.3em] uppercase flex items-center gap-4 transition-all hover:brightness-125 italic">← RETURN TO HUB</button>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
                        {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape'].map((game) => (
                            <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border-2 border-white/5 p-6 rounded-[3rem] text-center hover:border-cyan-400 cursor-pointer shadow-2xl transition-all group active:scale-95">
                                <div className="relative overflow-hidden rounded-[2rem] mb-6 shadow-2xl border-2 border-white/5"><img src={`/games/${game.toLowerCase().replace(/ /g, '-')}/logo.png`} className="w-full aspect-square object-cover transition-transform group-hover:scale-110 duration-700" onError={(e)=>{e.target.src="/logo.png"}} /><div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500"><Play size={50} className="text-cyan-400 drop-shadow-xl" /></div></div>
                                <h3 className="font-black text-sm md:text-xl uppercase italic tracking-widest text-white">{game}</h3>
                                <button className="mt-5 w-full py-3 bg-cyan-600/10 border border-cyan-500/20 rounded-full font-black text-[10px] text-cyan-400 uppercase tracking-[0.3em] group-hover:bg-cyan-500 group-hover:text-black transition-all">Play Now</button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col h-full w-full">
                    <div className="w-full bg-black h-16 flex items-center px-8 border-b border-white/10 shrink-0 shadow-2xl relative z-10">
                        <button onClick={() => setSelectedGame(null)} className="text-cyan-400 font-black text-xs uppercase tracking-[0.3em] hover:brightness-150 transition-all italic">← TERMINATE SESSION</button>
                        <div className="flex-1 text-center font-black uppercase text-[10px] text-white/30 italic tracking-[0.5em]">{selectedGame} • SECURE PROTOCOL ACTIVE</div>
                    </div>
                    <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-full border-none flex-1 bg-black" title="Game" />
                </div>
            )}
        </div>
    )}

    {/* FOOTER */}
    <footer className="bg-black py-40 px-10 border-t-2 border-white/5 text-center flex flex-col items-center relative overflow-hidden mt-10">
        <div className="absolute inset-0 opacity-10 bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain pointer-events-none scale-150 grayscale"></div>
        <div className="text-7xl md:text-[11rem] font-black italic text-cyan-400 drop-shadow-[0_0_60px_rgba(6,182,212,0.4)] mb-16 uppercase tracking-tighter relative z-10 select-none">AJ STUDIO</div>
        
        <div className="flex flex-col items-center gap-8 mb-24 relative z-10">
            {/* CEO GMAIL LINK */}
            <a href="mailto:ajcreatorstudio.hq@gmail.com" className="flex items-center gap-5 bg-white/5 px-12 py-5 rounded-[2rem] border-2 border-cyan-500/20 hover:border-cyan-500 transition-all group shadow-2xl backdrop-blur-md">
                <Mail className="text-cyan-400 group-hover:scale-125 transition-transform" size={30} />
                <span className="font-black text-sm md:text-lg tracking-widest text-white uppercase italic">ajcreatorstudio.hq@gmail.com</span>
            </a>
            <div className="flex justify-center gap-10">
                <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border-2 border-green-500/30 px-10 py-4 rounded-full font-black uppercase hover:bg-green-500 hover:text-black transition-all shadow-xl text-xs tracking-[0.2em]">WhatsApp</a>
                <a href="https://x.com/Ali20352061" target="_blank" className="text-white border-2 border-white/30 px-10 py-4 rounded-full font-black uppercase hover:bg-white hover:text-black transition-all shadow-xl text-xs tracking-[0.2em]">Twitter (X)</a>
            </div>
        </div>

        <button onClick={() => { const link = document.createElement('a'); link.href = '/aj-portal.apk'; link.download = 'aj-portal.apk'; link.click(); }} className="group relative px-20 py-8 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_80px_#06b6d4] animate-pulse transition-all hover:scale-110 relative z-10 mb-20 border-b-8 border-cyan-800">
            <span className="relative z-20 flex items-center gap-4 font-black tracking-[0.4em] text-2xl"><Download size={32} /> Install AJ App</span>
        </button>

        <div className="mt-12 pt-12 border-t-2 border-white/5 w-full relative z-10 text-center">
            <p className="text-[10px] md:text-xs text-cyan-400 font-black uppercase tracking-[0.5em] leading-relaxed max-w-4xl mx-auto drop-shadow-[0_0_10px_#06b6d4] animate-pulse italic">
                © 2026 AJ CREATOR STUDIO. ALL RIGHTS RESERVED. 
                <br/> 
                UNAUTHORIZED COPYING OR DECOMPILATION IS STRICTLY PROHIBITED.
            </p>
        </div>
    </footer>

    {/* CALL CONTAINER */}
    {socialScreen === 'in_call' && <div id="call-container" className="fixed inset-0 z-[3000] bg-black"></div>}
    
    {/* NOTIFICATION MODAL */}
    {showNotifModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-[#111] border-2 border-cyan-500/30 rounded-[3rem] p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black text-cyan-400 uppercase italic">Notifications</h3><X className="text-gray-500 cursor-pointer" onClick={() => setShowNotifModal(false)}/></div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {notifications.map((n, i) => (
                        <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <p className="text-xs font-black text-white uppercase mb-1 tracking-tight">{n.title || "Portal Update"}</p>
                            <p className="text-[10px] text-gray-400 font-medium italic">{n.message || "New content added to AJ Super Portal!"}</p>
                        </div>
                    ))}
                    {notifications.length === 0 && <p className="text-center text-gray-600 text-[10px] italic py-10 uppercase tracking-widest">No new notifications</p>}
                </div>
            </div>
        </div>
    )}
</main>
);
}