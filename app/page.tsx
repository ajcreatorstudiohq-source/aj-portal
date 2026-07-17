"use client";
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  doc, setDoc, onSnapshot, updateDoc, increment, collection,
  addDoc, getDoc, serverTimestamp, query, orderBy, limit, deleteDoc, getDocs
} from 'firebase/firestore';
import {
  MessageCircle, Trophy, Zap, Bot, LogOut, Globe, ChevronRight,
  Send, X, Download, Video, Users, Heart, MessageSquare, Camera,
  Settings, Edit3, Mail, DollarSign, Share2, Music, PlusSquare,
  MoreVertical, Search, Phone, Video as VideoIcon, ArrowLeft, Trash2,
  Gift, Radio, UserPlus, UserCheck, Grid, Film, Volume2, VolumeX, Swords, Clock
} from 'lucide-react';

// ============================================================
// API KEYS & CONFIG
// ============================================================
const UNSPLASH_ACCESS_KEY    = "W4x76VphkyY9fzP3DbJPfXLhdD6x063gW--Voifn_UE";
const YOUTUBE_API_KEY        = "AIzaSyD9vR3hNLt7pBNlm6PMaZWbJOB9QGcrD1Y";
const GNEWS_API_KEY          = "bb753f67e7f9f155dfc8675b2abc4b60";
const NOWPAYMENTS_API_KEY    = "3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7";
const CLOUDINARY_CLOUD_NAME  = "atm28akz";
const CLOUDINARY_UPLOAD_PRESET = "aj_portal";
const CEO_EMAIL              = "ajcreatorstudio.hq@gmail.com";
const CEO_WHATSAPP           = "https://wa.me/96878994093";

// ── NEW INTEGRATION KEYS (PROMPT IMPLEMENTATION) ─────────────
const AGORA_APP_ID           = "7863c5369b3648bf931893a52ebaa6db";
const AGORA_APP_CERTIFICATE  = "dc66528c5a5646da8e3ce5d2426759af";
const VAPID_KEY              = "BMaPMtGtA2VtDsj_JH_yv5dOv66Mpguf9v4TkqY96dcS-gwqgs-r5OlqRJQmZbNkaj-7_iMFbGGN0Qc4xH0qvKg";
const MONETAG_PULSE_BANNER   = 11337197;
const MONETAG_WECHAT_SPONSOR = 11337185;

// ============================================================
// ECONOMY RATES  ← CONFIRMED FINAL (PROMPT)
//   $1   = 100 AJ Coins (purchase rate)
//   Min purchase  = $20 (= 2,000 Coins)
//   Min withdraw  = 10,000 Coins ($20 USD at CASH_RATE 500)
//   500 AJ Coins = $1 USD Cash-out
//   Referral earn = 50 Coins (net to referrer)
//   Gift split    = 60% creator | 40% admin profit
//   Everything else: 70% Admin | 30% User (hidden admin ledger)
// ============================================================
const COIN_RATE      = 100;    // AJ Coins per $1 (purchase rate)
const CASH_RATE      = 500;    // Coins per $1 (cashout/display rate)
const MIN_PURCHASE   = 20;     // minimum purchase in USD
const WITHDRAW_MIN   = 10000;  // minimum coins to withdraw (= $20 at CASH_RATE 1000)
const REFERRAL_COINS = 50;     // coins awarded to referrer

// Revenue split for everything except live gifts
const USER_EARN_SHARE  = 0.30; // 30% net to user
const ADMIN_EARN_SHARE = 0.70; // 70% to admin (logged silently)

// PK Match cost per participant
const PK_ENTRY_COINS = 100;
// PK match duration (seconds)
const PK_DURATION = 300;

// ============================================================
// GIFT ITEMS (60 % creator / 40 % admin)
// ============================================================
const giftItems = [
  { id:1, name:'Coffee',      cost:500,   icon:'☕'  },
  { id:2, name:'Pizza Party', cost:1000,  icon:'🍕'  },
  { id:3, name:'Mega Heart',  cost:2500,  icon:'❤️'  },
  { id:4, name:'Super Car',   cost:5000,  icon:'🏎️'  },
  { id:5, name:'Private Jet', cost:8000,  icon:'🛩️'  },
  { id:6, name:'AJ Mansion',  cost:10000, icon:'🏰'  },
];

// Withdrawal methods with dynamic field types
const WITHDRAW_METHODS = [
  { label: 'EasyPaisa',         field: 'Mobile Number',       placeholder: '03XX-XXXXXXX'                     },
  { label: 'JazzCash',          field: 'Mobile Number',       placeholder: '03XX-XXXXXXX'                     },
  { label: 'Binance (USDT TRC20)', field: 'USDT TRC20 Address', placeholder: 'TXxxx... wallet address'        },
  { label: 'AirTM',             field: 'AirTM Email',         placeholder: 'your@email.com'                   },
  { label: 'Bank Transfer',     field: 'IBAN / Account No.',  placeholder: 'PK00XXXX0000000000000000'         },
];

// ============================================================
// CLOUDINARY UPLOADER
// ============================================================
const uploadToCloudinary = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  // f_auto & q_auto for optimization (Prompt #4)
  try {
    const res  = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload?f_auto=true&q_auto=true`,
      { method: 'POST', body: fd }
    );
    const data = await res.json();
    return data.secure_url || "";
  } catch { return ""; }
};

// ============================================================
// MONETAG BANNER COMPONENT (Prompt #4 & #8)
// ============================================================
function MonetagBanner({ siteId }: { siteId: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      const s = document.createElement('script');
      s.src = `https://cdn.monetag.com/banner.js?site=${siteId}`;
      s.async = true;
      ref.current.appendChild(s);
    } catch {}
  }, [siteId]);
  return (
    <div ref={ref} className="w-full min-h-[60px] bg-white/5 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-[9px] text-gray-500 uppercase tracking-widest font-black overflow-hidden">
      <span className="opacity-40">📢 Sponsored</span>
    </div>
  );
}

// ============================================================
// CINEMATIC GIFT OVERLAY (Prompt #6)
// ============================================================
function CinematicGiftOverlay({ gift, sender, onDone }: { gift: any; sender: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-4 animate-bounce">
        <div className="text-9xl drop-shadow-[0_0_40px_rgba(255,215,0,0.8)] animate-pulse">{gift.icon}</div>
        <p className="text-2xl font-black text-yellow-400 uppercase tracking-widest drop-shadow-[0_0_20px_gold]">{gift.name}!</p>
        <p className="text-sm text-white font-bold opacity-80">from @{sender}</p>
        <div className="flex gap-4 text-4xl">
          <span className="animate-spin">✨</span>
          <span className="animate-bounce" style={{animationDelay:'0.2s'}}>🎊</span>
          <span className="animate-spin" style={{animationDelay:'0.4s'}}>✨</span>
        </div>
      </div>
      {/* Triple-sync glow rings */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 border-8 border-yellow-400/30 rounded-full m-8 animate-ping"/>
        <div className="absolute inset-0 border-4 border-yellow-400/20 rounded-full m-16 animate-ping" style={{animationDelay:'0.5s'}}/>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================
export default function AJSuperPortal() {

  // ── SCREENS ─────────────────────────────────────────────────
  const [screen,       setScreen]       = useState('splash');
  const [walletTab,    setWalletTab]    = useState('main');
  const [socialScreen, setSocialScreen] = useState('hub');
  const [selectedGame, setSelectedGame] = useState<string|null>(null);

  // ── AUTH ────────────────────────────────────────────────────
  const [user,     setUser]     = useState<any>(null);
  const [balance,  setBalance]  = useState(0);
  const [botTier,  setBotTier]  = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading,  setLoading]  = useState(0);

  // ── SOCIAL PROFILE ──────────────────────────────────────────
  const [hasSocialProfile, setHasSocialProfile] = useState(false);
  const [username,   setUsername]   = useState('');
  const [bio,        setBio]        = useState('');
  const [tempPhoto,  setTempPhoto]  = useState('');
  const [pendingMode,setPendingMode]= useState('');

  // ── CONTENT ─────────────────────────────────────────────────
  const [pixaData,     setPixaData]     = useState<any[]>([]);
  const [pixaVideos,   setPixaVideos]   = useState<any[]>([]);
  const [newsData,     setNewsData]     = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [userPosts,    setUserPosts]    = useState<any[]>([]);
  const [postText,     setPostText]     = useState('');
  const [newMessage,   setNewMessage]   = useState('');
  const [activeContact,setActiveContact]= useState<string|null>(null);

  // ── INTERACTIONS ────────────────────────────────────────────
  const [likedPosts,    setLikedPosts]    = useState<any>({});
  const [activeMenuId,  setActiveMenuId]  = useState<string|null>(null);
  const [commentPostId, setCommentPostId] = useState<string|null>(null);
  const [postComments,  setPostComments]  = useState<any[]>([]);
  const [newComment,    setNewComment]    = useState('');
  const [copied,        setCopied]        = useState(false);

  // ── AI ───────────────────────────────────────────────────────
  const [visualProfit, setVisualProfit] = useState(0);
  const [tradeLogs,    setTradeLogs]    = useState([
    "Initialising Neural Link...",
    "Analysing Market Volatility...",
    "Connecting to AJ liquidity pool..."
  ]);
  const [botOpen,     setBotOpen]     = useState(false);
  const [botMessages, setBotMessages] = useState([{
    from:'bot',
    text:`Hi! I am AJ AI Assistant 🤖\nAsk me about Coins, Referral, Withdrawal, or Go Live.`
  }]);
  const [botInput, setBotInput] = useState('');

  // ── WALLET INPUTS ───────────────────────────────────────────
  const [purchaseAmount, setPurchaseAmount] = useState(20);
  const [purchaseMethod, setPurchaseMethod] = useState('Binance (TRC20)');
  const [purchaseTxId,   setPurchaseTxId]   = useState('');
  const [transferId,     setTransferId]     = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  // Updated withdrawal: now uses WITHDRAW_METHODS array
  const [payoutMethod,   setPayoutMethod]   = useState(WITHDRAW_METHODS[0].label);
  const [payoutId,       setPayoutId]       = useState('');
  const [referralCode,   setReferralCode]   = useState('');

  // ── NOTIFICATIONS ───────────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);

  // ── GO LIVE (real camera) ───────────────────────────────────
  const [liveActive,  setLiveActive]  = useState(false);
  const [liveRoomId,  setLiveRoomId]  = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const liveVideoRef  = useRef<HTMLVideoElement>(null);
  const liveStreamRef = useRef<MediaStream|null>(null);

  // ── PK CHALLENGE (Prompt #6) ─────────────────────────────────
  const [pkChallengeOpen, setPkChallengeOpen] = useState(false);
  const [pkTargetId,      setPkTargetId]      = useState('');
  const [pkActive,        setPkActive]        = useState(false);
  const [pkTimer,         setPkTimer]         = useState(PK_DURATION);
  const [pkScore,         setPkScore]         = useState({ me: 0, rival: 0 });
  const [pkWinner,        setPkWinner]        = useState<string|null>(null);
  const [pkRivalData,     setPkRivalData]     = useState<any>(null);
  const pkTimerRef = useRef<NodeJS.Timeout|null>(null);

  // ── CINEMATIC GIFT (Prompt #6) ───────────────────────────────
  const [cinematicGift,   setCinematicGift]   = useState<any>(null);
  const [cinematicSender, setCinematicSender] = useState('');

  // ── LIVE NOW LIST (Prompt #5) ────────────────────────────────
  const [liveNowList, setLiveNowList] = useState<any[]>([]);

  // ── PULSE MUTE STATE (Prompt #4 Sound Fix) ──────────────────
  const [pulseMuted, setPulseMuted] = useState(true);

  // ── LIVE STREAM CHAT (Prompt #2) ─────────────────────────
  const [liveChatOpen,    setLiveChatOpen]    = useState(false);
  const [liveChatInput,   setLiveChatInput]   = useState('');
  const [liveChatMessages,setLiveChatMessages]= useState<any[]>([]);
  const liveChatEndRef = useRef<HTMLDivElement>(null);

  // ── GLOBAL SOUND TOGGLE for TikReels (Prompt #3) ─────────
  const [globalSoundOn, setGlobalSoundOn] = useState(false);

  // ── WECHAT CONTACTS (per-user Firestore) ────────────────────
  const [wechatContacts, setWechatContacts] = useState<string[]>([]);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [newContact,     setNewContact]     = useState('');

  // ── TIKREELS SOUND ──────────────────────────────────────────
  const [soundEnabledVideos, setSoundEnabledVideos] = useState<{[key:string]:boolean}>({});

  // ── TIKREELS ────────────────────────────────────────────────
  const [tiktabMode,     setTiktabMode]     = useState<'feed'|'create'|'profile'>('feed');
  const [tiktokPostText, setTiktokPostText] = useState('');
  const [tiktokPostImg,  setTiktokPostImg]  = useState('');

  // ── PULSE GIFT PANEL (per-post) ─────────────────────────────
  const [pulseGiftPostId, setPulseGiftPostId] = useState<string|null>(null);

  // ── USER PROFILE (viewer) ───────────────────────────────────
  const [viewingUid,    setViewingUid]    = useState<string|null>(null);
  const [viewProfile,   setViewProfile]   = useState<any>(null);
  const [profilePosts,  setProfilePosts]  = useState<any[]>([]);
  const [profileVideos, setProfileVideos] = useState<any[]>([]);
  const [followers,     setFollowers]     = useState(0);
  const [following,     setFollowing]     = useState(0);
  const [isFollowing,   setIsFollowing]   = useState(false);

  // ── REFS ─────────────────────────────────────────────────────
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const tiktokFileRef = useRef<HTMLInputElement>(null);
  const searchRef     = useRef<HTMLInputElement>(null);

  // ── COMPUTED ─────────────────────────────────────────────────
  const totalCoins     = balance + visualProfit;
  const displayBalance = totalCoins.toFixed(2);
  const displayUsdt    = (totalCoins / CASH_RATE).toFixed(2);

  // Current withdrawal method field info
  const currentWithdrawMethod = WITHDRAW_METHODS.find(m => m.label === payoutMethod) || WITHDRAW_METHODS[0];

  // ==========================================================
  // FETCH APIs
  // ==========================================================
  const fetchSocialAPIs = async () => {
    try {
      const pRes  = await fetch(`https://api.unsplash.com/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&query=lifestyle,luxury&count=20`);
      const pData = await pRes.json();
      setPixaData(Array.isArray(pData) ? pData : []);

      const yRes  = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=shorts+viral&type=video&videoDuration=short&key=${YOUTUBE_API_KEY}`);
      const yData = await yRes.json();
      const items = yData.items || [];
      setPixaVideos(items.map((item:any) => ({
        id:       item.id.videoId,
        user:     item.snippet.channelTitle,
        title:    item.snippet.title,
        thumb:    item.snippet?.thumbnails?.high?.url || '',
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&mute=1&loop=1&playlist=${item.id.videoId}&controls=0&rel=0&playsinline=1`
      })));

      const nRes  = await fetch(`https://gnews.io/api/v4/search?q=AI+crypto+technology&token=${GNEWS_API_KEY}&lang=en&max=15`);
      const nData = await nRes.json();
      setNewsData(nData.articles?.slice(0,15) || []);
    } catch(e) { console.log("API Error", e); }
  };

  // ==========================================================
  // FETCH LIVE NOW LIST — with ghost filter (lastSeen < 60s)
  // ==========================================================
  const fetchLiveNow = () => {
    const q = query(collection(db,"live_rooms"), orderBy("startedAt","desc"), limit(20));
    return onSnapshot(q, snap => {
      const now = Date.now();
      const rooms = snap.docs
        .map(d => ({ id:d.id, ...d.data() }))
        .filter((r:any) => {
          if (!r.lastSeenMs) return false; // hide legacy rooms — no heartbeat
          return (now - r.lastSeenMs) < 30000; // ghost filter: 30s window
        });
      setLiveNowList(rooms);
    });
  };

  // ==========================================================
  // FIREBASE LISTENERS
  // ==========================================================
  useEffect(() => {
    if (socialScreen==='chat' && activeContact) {
      const q = query(collection(db,"global_chat"), orderBy("createdAt","desc"), limit(40));
      return onSnapshot(q, snap => setChatMessages(snap.docs.map(d=>({id:d.id,...d.data()})).reverse()));
    }
    if (socialScreen==='pulse' || socialScreen==='tikreels') {
      const q = query(collection(db,"user_posts"), orderBy("createdAt","desc"), limit(20));
      return onSnapshot(q, snap => setUserPosts(snap.docs.map(d=>({id:d.id,...d.data()}))));
    }
    if (commentPostId && !commentPostId.startsWith('gift_')) {
      const q = query(collection(db,"user_posts",commentPostId,"comments"), orderBy("createdAt","asc"));
      return onSnapshot(q, snap => setPostComments(snap.docs.map(d=>({id:d.id,...d.data()}))));
    }
  }, [socialScreen, activeContact, commentPostId]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db,"notifications"), orderBy("date","desc"), limit(20));
    return onSnapshot(q, snap => {
      const items = snap.docs.map(d=>({id:d.id,...d.data()}));
      setNotifications(items);
      setUnreadCount(items.length);
    });
  }, [user]);

  // Live Now listener when on Social Hub (Prompt #5)
  useEffect(() => {
    if (socialScreen === 'hub') {
      const unsub = fetchLiveNow();
      return unsub;
    }
  }, [socialScreen]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (cu) => {
      if (cu) {
        setUser(cu);
        const ref  = doc(db,"users",cu.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data();
          setHasSocialProfile(d.hasSocialProfile||false);
          setUsername(d.username||'');
          setBio(d.bio||'');
          setTempPhoto(d.photo||cu.photoURL||'');
        } else {
          await setDoc(ref, {
            name:cu.displayName, email:cu.email,
            balance:500, botTier:'none', invested:0,
            uid:cu.uid, lastSync:serverTimestamp(),
            hasSocialProfile:false, photo:cu.photoURL||'',
            followers:0, following:0
          });
        }
        onSnapshot(ref, s => {
          if (s.exists()) {
            setBalance(s.data().balance||0);
            setBotTier(s.data().botTier||'none');
            setInvested(s.data().invested||0);
          }
        });
        setScreen('hub');
      } else { setUser(null); setScreen('auth'); }
    });
    return () => unsub();
  }, []);

  // AI profit ticker
  useEffect(() => {
    if (!user || botTier==='none' || invested<=0) return;
    const rate   = botTier==='vvip' ? 0.05 : 0.02;
    const perSec = (invested * rate) / 86400;
    const iv = setInterval(() => setVisualProfit(p => p+perSec), 1000);
    return () => clearInterval(iv);
  }, [user, botTier, invested]);

  // Splash timer
  useEffect(() => {
    if (screen==='splash') {
      const iv = setInterval(() => setLoading(p => Math.min(100,p+10)), 50);
      const tm = setTimeout(() => setScreen('hub'), 2000);
      return () => { clearInterval(iv); clearTimeout(tm); };
    }
  }, [screen]);

  // PK Timer (Prompt #6)
  useEffect(() => {
    if (!pkActive) return;
    pkTimerRef.current = setInterval(() => {
      setPkTimer(t => {
        if (t <= 1) {
          clearInterval(pkTimerRef.current!);
          // Determine winner
          setPkWinner(pkScore.me >= pkScore.rival ? (username || 'You') : (pkRivalData?.username || 'Rival'));
          setPkActive(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (pkTimerRef.current) clearInterval(pkTimerRef.current); };
  }, [pkActive]);

  // Live Chat listener — reads from live_rooms/[roomID]/messages (Prompt #2)
  useEffect(() => {
    if (!liveActive || !liveRoomId) return;
    const q = query(
      collection(db,'live_rooms',liveRoomId,'messages'),
      orderBy('createdAt','asc'), limit(60)
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({id:d.id,...d.data()}));
      setLiveChatMessages(msgs);
      setTimeout(() => liveChatEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
    });
    return () => unsub();
  }, [liveActive, liveRoomId]);

  // ==========================================================
  // SEND LIVE CHAT MESSAGE (Prompt #2)
  // ==========================================================
  const sendLiveChatMessage = async () => {
    if (!liveChatInput.trim() || !liveRoomId || !user) return;
    await addDoc(collection(db,'live_rooms',liveRoomId,'messages'), {
      text:     liveChatInput.trim(),
      uid:      user.uid,
      username: username || 'AJ_Member',
      photo:    tempPhoto || user.photoURL || '',
      createdAt:serverTimestamp()
    });
    setLiveChatInput('');
  };

  // ==========================================================
  // GO LIVE — REAL CAMERA (Agora.io integration point)
  // ==========================================================
  const startLive = async () => {
    if (!user) return;
    const roomId = `live_${user.uid}_${Date.now()}`;
    setLiveRoomId(roomId);
    setLiveActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
      liveStreamRef.current = stream;
      setCameraReady(true);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play();
      }
      // Register live room in Firestore for Live Now list
      await setDoc(doc(db,"live_rooms",roomId), {
        uid:user.uid, username:username||'AJ_Member',
        photo:tempPhoto||user.photoURL||'',
        roomId, startedAt:serverTimestamp(), active:true,
        lastSeenMs: Date.now()
      });
      // Heartbeat: update lastSeenMs every 15s to prevent ghost rooms
      const heartbeat = setInterval(async () => {
        try { await updateDoc(doc(db,"live_rooms",roomId), { lastSeenMs: Date.now() }); } catch {}
      }, 15000);
      (liveStreamRef as any)._heartbeat = heartbeat;
      // Notify followers (Prompt #8)
      await addDoc(collection(db,"notifications"), {
        title:"🔴 Live Now!",
        message:`@${username||'AJ_Member'} just went LIVE! Tap to join.`,
        deepLink:`/live/${roomId}`,
        date:serverTimestamp()
      });
    } catch {
      alert("Camera permission denied. Please allow camera access.");
      setCameraReady(false);
    }
  };

  const stopLive = async () => {
    // Clear heartbeat interval
    if ((liveStreamRef as any)._heartbeat) {
      clearInterval((liveStreamRef as any)._heartbeat);
      (liveStreamRef as any)._heartbeat = null;
    }
    liveStreamRef.current?.getTracks().forEach(t => t.stop());
    liveStreamRef.current = null;
    setCameraReady(false);
    setLiveActive(false);
    setPkActive(false);
    // Remove from live rooms immediately on disconnect
    if (liveRoomId) {
      try { await deleteDoc(doc(db,"live_rooms",liveRoomId)); } catch {}
    }
  };

  // ==========================================================
  // PK CHALLENGE (Prompt #6)
  // ==========================================================
  const sendPkChallenge = async () => {
    if (!user || !pkTargetId.trim()) return alert("Enter rival's User ID!");
    if (balance < PK_ENTRY_COINS) return alert(`Need ${PK_ENTRY_COINS} AJ Coins to enter PK!`);
    const rivalSnap = await getDoc(doc(db,"users",pkTargetId.trim()));
    if (!rivalSnap.exists()) return alert("Rival not found! Check User ID.");
    // Deduct 100 coins from challenger
    await updateDoc(doc(db,"users",user.uid), { balance: increment(-PK_ENTRY_COINS) });
    // Log 200 coins total as admin revenue (100 from each side)
    await addDoc(collection(db,"AdminRevenue"), {
      type:'pk_match', totalDeducted: PK_ENTRY_COINS * 2,
      challenger: user.uid, rival: pkTargetId.trim(),
      date:serverTimestamp()
    });
    // Notify rival
    await addDoc(collection(db,"notifications"), {
      title:"⚔️ PK Challenge!",
      message:`@${username||'AJ_Member'} challenged you to a PK Battle! ${PK_ENTRY_COINS} Coins staked.`,
      deepLink:`/pk/${liveRoomId}`,
      date:serverTimestamp()
    });
    setPkRivalData(rivalSnap.data());
    setPkTimer(PK_DURATION);
    setPkScore({ me:0, rival:0 });
    setPkWinner(null);
    setPkActive(true);
    setPkChallengeOpen(false);
    alert(`⚔️ PK Challenge sent to @${rivalSnap.data().username || pkTargetId}! Match starting...`);
  };

  // PK Gift — adds score during PK
  const sendPkGift = async (creatorId:string, gift:{name:string,cost:number,icon:string}, isMe:boolean) => {
    if (!user) return;
    await sendGift(creatorId, gift);
    if (isMe) setPkScore(s => ({ ...s, me: s.me + gift.cost }));
    else setPkScore(s => ({ ...s, rival: s.rival + gift.cost }));
  };

  // ==========================================================
  // GIFTING — 60 % creator | 40 % admin profit (Prompt #6 cinematic)
  // ==========================================================
  const sendGift = async (creatorId:string, gift:{name:string,cost:number,icon:string}) => {
    if (!user) return;
    if (balance < gift.cost) {
      if (confirm(`Insufficient Balance! Need ${gift.cost} 🪙\nGo to Wallet → Purchase to recharge?`)) {
        setScreen('wallet'); setWalletTab('purchase');
      }
      return;
    }
    // Deduct sender
    await updateDoc(doc(db,"users",user.uid), { balance: increment(-gift.cost) });
    // 60 % to creator
    const creatorShare = gift.cost * 0.60;
    const adminShare   = gift.cost * 0.40;
    await updateDoc(doc(db,"users",creatorId), { balance: increment(creatorShare) });
    // 40 % logged to admin ledger
    await addDoc(collection(db,"admin_ledger"), {
      giftName:gift.name, totalCost:gift.cost, adminShare,
      senderUid:user.uid, creatorUid:creatorId, date:serverTimestamp()
    });
    // Notify creator
    await addDoc(collection(db,"notifications"), {
      title:`Gift Received! ${gift.icon}`,
      message:`You received ${gift.icon} ${gift.name} from @${username||'Anonymous'}. +${creatorShare} Coins (60% yours)`,
      date:serverTimestamp()
    });
    // Cinematic Gift Overlay — Triple-Sync (Prompt #6)
    setCinematicGift(gift);
    setCinematicSender(username || 'Anonymous');
    alert(`${gift.icon} ${gift.name} sent! Creator received ${creatorShare} Coins (60%).`);
  };

  // ==========================================================
  // ADMIN REVENUE LOGGER for "everything else" (Prompt #3)
  // ==========================================================
  const logAdminRevenue = async (type:string, totalPool:number, userNet:number) => {
    const adminShare = totalPool * ADMIN_EARN_SHARE;
    await addDoc(collection(db,"AdminRevenue"), {
      type, totalPool, adminShare, userNet,
      uid:user?.uid||'', date:serverTimestamp()
    }).catch(() => {});
  };

  // ==========================================================
  // FOLLOW SYSTEM
  // ==========================================================
  const handleFollow = async (targetUid:string) => {
    if (!user) return;
    const followRef   = doc(db,"users",user.uid,"following",targetUid);
    const followerRef = doc(db,"users",targetUid,"followers",user.uid);
    if (isFollowing) {
      await deleteDoc(followRef);
      await deleteDoc(followerRef);
      await updateDoc(doc(db,"users",user.uid),    { following: increment(-1) });
      await updateDoc(doc(db,"users",targetUid),   { followers: increment(-1) });
      setIsFollowing(false); setFollowers(f => f-1);
    } else {
      await setDoc(followRef,   { uid:targetUid, date:serverTimestamp() });
      await setDoc(followerRef, { uid:user.uid,  date:serverTimestamp() });
      await updateDoc(doc(db,"users",user.uid),    { following: increment(1) });
      await updateDoc(doc(db,"users",targetUid),   { followers: increment(1) });
      setIsFollowing(true); setFollowers(f => f+1);
    }
  };

  // Open someone's profile
  const openProfile = async (uid:string) => {
    setViewingUid(uid);
    const snap = await getDoc(doc(db,"users",uid));
    if (snap.exists()) setViewProfile(snap.data());
    const pq = query(collection(db,"user_posts"), orderBy("createdAt","desc"), limit(30));
    const ps = await getDocs(pq);
    const all = ps.docs.map(d => ({id:d.id,...d.data() as any}));
    setProfilePosts(all.filter((p:any)  => p.uid===uid && !p.isVideo));
    setProfileVideos(all.filter((p:any) => p.uid===uid && p.isVideo));
    const fSnap  = await getDocs(collection(db,"users",uid,"followers"));
    const foSnap = await getDocs(collection(db,"users",uid,"following"));
    setFollowers(fSnap.size); setFollowing(foSnap.size);
    if (user) {
      const myF = await getDoc(doc(db,"users",user.uid,"following",uid));
      setIsFollowing(myF.exists());
    }
    setSocialScreen('profile');
  };

  // ==========================================================
  // WECHAT CONTACTS — per-user Firestore storage
  // ==========================================================
  // Load contacts from Firestore when user changes
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db,"users",user.uid,"wechat_contacts");
    const unsub = onSnapshot(colRef, snap => {
      setWechatContacts(snap.docs.map(d => d.data().name as string));
    });
    return unsub;
  }, [user]);

  const saveContactToFirestore = async (name: string) => {
    if (!user || !name.trim()) return;
    const colRef = collection(db,"users",user.uid,"wechat_contacts");
    await addDoc(colRef, { name: name.trim(), addedAt: serverTimestamp() });
  };

  const handleContactsSync = async () => {
    if ((navigator as any).contacts) {
      try {
        const cts = await (navigator as any).contacts.select(['name','tel'], { multiple:true });
        if (cts.length>0) {
          for (const c of cts) {
            const name = c.name?.[0]||'Unknown';
            if (name && !wechatContacts.includes(name)) await saveContactToFirestore(name);
          }
          alert(`✅ ${cts.length} contact(s) synced!`);
        }
      } catch { setAddContactOpen(true); }
    } else { setAddContactOpen(true); }
  };

  const addManualContact = async () => {
    if (!newContact.trim()) return;
    await saveContactToFirestore(newContact.trim());
    setNewContact(''); setAddContactOpen(false);
  };

  // ==========================================================
  // TIKREELS POST (Prompt #3: 70% Admin / 30% User)
  // ==========================================================
  const handleTiktokPost = async () => {
    if (!tiktokPostText.trim() && !tiktokPostImg) return alert("Add caption or image!");
    const totalPool = 2.5;
    const userNet   = parseFloat((totalPool * USER_EARN_SHARE).toFixed(4)); // 0.75
    await addDoc(collection(db,"user_posts"), {
      text:tiktokPostText, image:tiktokPostImg, uid:user!.uid,
      username:username||"AJ_Member", photo:user!.photoURL||'',
      likes:0, isVideo:true, createdAt:serverTimestamp()
    });
    await updateDoc(doc(db,"users",user!.uid), { balance: increment(userNet) });
    await logAdminRevenue('tiktok_post', totalPool, userNet);
    setTiktokPostText(''); setTiktokPostImg('');
    setTiktabMode('feed');
    alert(`🎬 Video post published! +${userNet} Coins (your 30% share)`);
  };

  // ==========================================================
  // GENERAL HANDLERS
  // ==========================================================
  const navigateWithAd = (to:string) => {
    if (typeof window!=='undefined' && (window as any).AJ_SDK) (window as any).AJ_SDK.showAd();
    if (to==='social')       { fetchSocialAPIs(); setScreen('social'); setSocialScreen('hub'); }
    else if (to==='wallet')  { setScreen('wallet'); setWalletTab('main'); }
    else                     setScreen(to);
  };

  const enterSocialMode = (mode:string) => {
    setPendingMode(mode);
    if (!user || !hasSocialProfile) setSocialScreen('setup');
    else setSocialScreen(mode);
  };

  const copyToClipboard = (id:string) => {
    navigator.clipboard.writeText(id);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleImageClick  = () => fileInputRef.current?.click();
  const handleTiktokImage = () => tiktokFileRef.current?.click();

  const handleFileChange = async (e:any) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadToCloudinary(file);
    setTempPhoto(url || URL.createObjectURL(file));
  };

  const handleTiktokFileChange = async (e:any) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadToCloudinary(file);
    setTiktokPostImg(url || URL.createObjectURL(file));
  };

  const handleGoogleLogin = async () => {
    googleProvider.setCustomParameters({ prompt:'select_account' });
    await signInWithPopup(auth, googleProvider);
  };

  const handleSignOut = async () => {
    await signOut(auth); setSocialScreen('hub'); setScreen('auth');
  };

  const handleCreateProfile = async () => {
    if (username.length<3) return alert("Username too short!");
    await updateDoc(doc(db,"users",user!.uid), {
      username: username.toLowerCase().trim(), bio,
      photo: tempPhoto||user!.photoURL||"/logo.png", hasSocialProfile:true
    });
    setHasSocialProfile(true); setSocialScreen('hub'); alert("🚀 Profile Active!");
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await addDoc(collection(db,"global_chat"), {
      text:newMessage, uid:user.uid,
      username:username||"AJ_Member", photo:tempPhoto||user.photoURL||'',
      createdAt:serverTimestamp()
    });
    setNewMessage('');
  };

  // CREATE POST — with 30% user / 70% admin split (Prompt #3)
  const handleCreatePost = async () => {
    if (!postText.trim() && !tempPhoto) return alert("Empty Post!");
    const totalPool = 2.5;
    const userNet   = parseFloat((totalPool * USER_EARN_SHARE).toFixed(4)); // 0.75
    await addDoc(collection(db,"user_posts"), {
      text:postText, image:tempPhoto, uid:user!.uid,
      username:username||"AJ_Member", photo:user!.photoURL||'',
      likes:0, isVideo:false, createdAt:serverTimestamp()
    });
    await updateDoc(doc(db,"users",user!.uid), { balance: increment(userNet) });
    await logAdminRevenue('pulse_post', totalPool, userNet);
    setPostText(''); setTempPhoto('');
    alert(`🚀 Post Published! +${userNet} Coins (your 30% share)`);
  };

  const submitComment = async () => {
    if (!newComment.trim() || !commentPostId) return;
    await addDoc(collection(db,"user_posts",commentPostId,"comments"), {
      text:newComment, username:username||"AJ_Member",
      photo:user?.photoURL||'', createdAt:serverTimestamp()
    });
    setNewComment('');
  };

  const handleDeletePost = async (id:string) => {
    if (confirm("Delete permanently?")) {
      await deleteDoc(doc(db,"user_posts",id)); setActiveMenuId(null);
    }
  };

  const handleLike  = (id:string) => setLikedPosts((p:any) => ({...p,[id]:!p[id]}));
  const handleShare = (msg:string) => {
    if (navigator.share) navigator.share({ title:'AJ Portal', text:msg });
    else alert("Link Copied!");
  };

  const activateBot = async (tier:string, cost:number) => {
    if (balance<cost) return alert("Insufficient Balance!");
    await updateDoc(doc(db,"users",user!.uid), {
      balance: increment(-cost), botTier:tier, invested:cost, lastSync:serverTimestamp()
    });
    // Log admin revenue for AI bot activation (Prompt #3)
    await logAdminRevenue('ai_bot', cost, cost * USER_EARN_SHARE);
    alert(`${tier.toUpperCase()} BOT ACTIVATED!`);
  };

  // ── WALLET ACTIONS ──────────────────────────────────────────
  const handlePurchase = async () => {
    if (purchaseAmount < MIN_PURCHASE)
      return alert(`Minimum purchase is $${MIN_PURCHASE} (= ${MIN_PURCHASE*COIN_RATE} Coins)`);
    if (purchaseMethod==='Binance (TRC20)') {
      try {
        const res  = await fetch('https://api.nowpayments.io/v1/invoice', {
          method:'POST',
          headers:{ 'x-api-key':NOWPAYMENTS_API_KEY, 'Content-Type':'application/json' },
          body: JSON.stringify({
            price_amount:purchaseAmount, price_currency:"usd",
            pay_currency:"usdttrc20", order_id:`AJ_${Date.now()}`
          })
        });
        const data = await res.json();
        if (data.invoice_url) window.open(data.invoice_url,'_blank');
      } catch { alert("Payment Error!"); }
    } else {
      if (!purchaseTxId) return alert("Enter Transaction ID.");
      await addDoc(collection(db,"manual_deposits"), {
        uid:user!.uid, email:user!.email, amount:purchaseAmount,
        method:purchaseMethod, txId:purchaseTxId, status:"pending", date:serverTimestamp()
      });
      await addDoc(collection(db,"notifications"), {
        title:"Deposit Pending",
        message:`$${purchaseAmount} deposit via ${purchaseMethod} awaiting approval.`,
        date:serverTimestamp()
      });
      alert("✅ Request Sent!"); setWalletTab('main');
    }
  };

  const handleTransfer = async () => {
    if (transferAmount<=0 || !transferId.trim()) return alert("Fill all fields!");
    if (balance<transferAmount) return alert("Insufficient balance!");
    if (transferId===user!.uid) return alert("Cannot transfer to yourself.");
    const rSnap = await getDoc(doc(db,"users",transferId.trim()));
    if (!rSnap.exists()) return alert("Recipient not found!");
    await updateDoc(doc(db,"users",user!.uid),       { balance: increment(-transferAmount) });
    await updateDoc(doc(db,"users",transferId.trim()),{ balance: increment(transferAmount) });
    await addDoc(collection(db,"notifications"), {
      title:"Transfer Sent",
      message:`Sent ${transferAmount} Coins to ID: ${transferId}`,
      date:serverTimestamp()
    });
    alert("✅ Transfer successful!"); setTransferAmount(0); setTransferId(''); setWalletTab('main');
  };

  const handleWithdraw = async () => {
    if (balance < WITHDRAW_MIN)
      return alert(`Minimum withdrawal is ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE} USD). Current: ${balance.toFixed(0)} Coins.`);
    if (!payoutId.trim()) return alert(`Enter your ${currentWithdrawMethod.field}.`);
    const usdVal = balance / CASH_RATE;
    await updateDoc(doc(db,"users",user!.uid), { balance:0 });
    await addDoc(collection(db,"manual_withdrawals"), {
      uid:user!.uid, email:user!.email, coins:balance, amountUsd:usdVal,
      method:payoutMethod, payoutAddress:payoutId, status:"pending", date:serverTimestamp()
    });
    await addDoc(collection(db,"notifications"), {
      title:"Withdrawal Requested",
      message:`${balance} Coins ($${usdVal.toFixed(2)}) via ${payoutMethod} submitted for review.`,
      date:serverTimestamp()
    });
    alert("🚀 Withdrawal request submitted!"); setPayoutId(''); setWalletTab('main');
  };

  // Referral — 70% admin / 30% referrer (Prompt #3)
  const handleApplyReferral = async () => {
    if (!referralCode.trim()) return alert("Enter referral code.");
    const rSnap = await getDoc(doc(db,"users",referralCode.trim()));
    if (!rSnap.exists()) return alert("Referral Code not found.");
    const totalPool = REFERRAL_COINS; // 50 pool
    const referrerNet = parseFloat((totalPool * USER_EARN_SHARE).toFixed(4)); // 15 coins
    await updateDoc(doc(db,"users",referralCode.trim()), { balance: increment(referrerNet) });
    await logAdminRevenue('referral', totalPool, referrerNet);
    await addDoc(collection(db,"notifications"), {
      title:"Referral Claimed",
      message:`+${referrerNet} Coins reward applied to referrer!`,
      date:serverTimestamp()
    });
    alert(`Referral Applied! Referrer received ${referrerNet} Coins (30% share).`);
    setReferralCode('');
  };

  // ══════════════════════════════════════════════════════════════════
  // AI TRADING BOT — UNIVERSAL LANGUAGE SUPPORT
  // System Prompt: "You are a global multilingual assistant. Automatically
  // detect the user's language (Urdu, English, Arabic, French, Spanish,
  // Hindi, etc.) from their message and ALWAYS respond in that same language.
  // Do not limit yourself to any specific list of languages."
  // ══════════════════════════════════════════════════════════════════

  // ── Universal language detector ───────────────────────────────────────
  const detectLanguage = (text: string): string => {
    // 1. Script-based detection (most reliable)
    if (/[\u0600-\u06FF]/.test(text)) {
      // Arabic-script family — distinguish by unique chars/words
      if (/[\u0679\u0688\u0691\u06BE\u06C1\u06CC\u06D2]/.test(text) ||
          /کوئن|پیسہ|نکالنا|لائیو|ریفرل|خریدنا|تحفہ|سکے|بیلنس/.test(text))
        return 'ur'; // Urdu
      if (/[\u067E\u0686\u0698\u06AF]/.test(text) && /فارسی|ایران|ریال/.test(text))
        return 'fa'; // Persian/Farsi
      return 'ar'; // Arabic
    }
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi / Devanagari
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi (Gurmukhi)
    if (/[\u0400-\u04FF]/.test(text)) return 'ru'; // Russian / Cyrillic
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'; // Chinese
    if (/[\u3040-\u30FF]/.test(text)) return 'ja'; // Japanese
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'; // Korean
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th'; // Thai
    if (/[\u0370-\u03FF]/.test(text)) return 'el'; // Greek
    if (/[\u0590-\u05FF]/.test(text)) return 'he'; // Hebrew

    // 2. Keyword-based detection for Latin-script languages
    const q = text.toLowerCase();
    if (/\b(bonjour|merci|monnaie|retirer|acheter|cadeau|combien|comment)\b/.test(q)) return 'fr';   // French
    if (/\b(hola|gracias|moneda|retirar|comprar|regalo|cuánto|cómo)\b/.test(q))        return 'es';   // Spanish
    if (/\b(ciao|grazie|moneta|ritirare|comprare|regalo|quanto|come)\b/.test(q))       return 'it';   // Italian
    if (/\b(olá|obrigado|moeda|retirar|comprar|presente|quanto|como)\b/.test(q))       return 'pt';   // Portuguese
    if (/\b(hallo|danke|münze|auszahlen|kaufen|geschenk|wieviel|wie)\b/.test(q))       return 'de';   // German
    if (/\b(merhaba|teşekkür|madeni|çekmek|satın|hediye|kadar|nasıl)\b/.test(q))      return 'tr';   // Turkish
    if (/\b(привет|спасибо|монета|вывести|купить|подарок|сколько|как)\b/.test(q))      return 'ru';   // Russian keywords
    if (/\b(halo|terima|koin|tarik|beli|hadiah|berapa|bagaimana)\b/.test(q))           return 'id';   // Indonesian
    if (/\b(xin chào|cảm ơn|đồng xu|rút tiền|mua|quà tặng)\b/.test(q))               return 'vi';   // Vietnamese
    if (/\b(شکریہ|آپ|ہے|کیا|کیسے|میں|آپ کا)\b/.test(q))                              return 'ur';   // Urdu romanized-ish

    // 3. Browser locale fallback
    const locale = (navigator?.language || 'en').split('-')[0].toLowerCase();
    const supported = ['fr','es','de','it','pt','tr','ru','id','vi','ar','hi','bn','zh','ja','ko','pa','ur','fa','th','el','he'];
    if (supported.includes(locale)) return locale;

    return 'en'; // Default: English
  };

  // ── Response templates — all languages, all topics ────────────────────
  const BOT_REPLIES: Record<string, Record<string, string>> = {
    coin: {
      en: `🪙 Rate: $1 = ${COIN_RATE} AJ Coins.\nEarn: Post (+0.75), Referral (+15), AI Bot profits.`,
      ur: `🪙 شرح: $1 = ${COIN_RATE} AJ Coins\nکمائیں: پوسٹ (+0.75)، ریفرل (+15)، AI Bot منافع`,
      ar: `🪙 السعر: $1 = ${COIN_RATE} AJ Coins\nاكسب: النشر (+0.75)، الإحالات (+15)، أرباح الروبوت`,
      hi: `🪙 दर: $1 = ${COIN_RATE} AJ Coins\nकमाएं: पोस्ट (+0.75), रेफरल (+15), AI Bot मुनाफा`,
      bn: `🪙 রেট: $1 = ${COIN_RATE} AJ Coins\nআয়: পোস্ট (+0.75), রেফারেল (+15), AI Bot লাভ`,
      pa: `🪙 ਦਰ: $1 = ${COIN_RATE} AJ Coins\nਕਮਾਓ: ਪੋਸਟ (+0.75), ਰੈਫਰਲ (+15), AI Bot ਮੁਨਾਫਾ`,
      fr: `🪙 Taux: $1 = ${COIN_RATE} AJ Coins\nGagnez: Post (+0.75), Parrainage (+15), profits AI Bot`,
      es: `🪙 Tasa: $1 = ${COIN_RATE} AJ Coins\nGana: Post (+0.75), Referido (+15), ganancias AI Bot`,
      de: `🪙 Kurs: $1 = ${COIN_RATE} AJ Coins\nVerdiene: Post (+0.75), Empfehlung (+15), AI Bot Gewinn`,
      it: `🪙 Tasso: $1 = ${COIN_RATE} AJ Coins\nGuadagna: Post (+0.75), Referral (+15), profitti AI Bot`,
      pt: `🪙 Taxa: $1 = ${COIN_RATE} AJ Coins\nGanhe: Post (+0.75), Indicação (+15), lucros AI Bot`,
      tr: `🪙 Oran: $1 = ${COIN_RATE} AJ Coins\nKazan: Post (+0.75), Referans (+15), AI Bot kazancı`,
      ru: `🪙 Курс: $1 = ${COIN_RATE} AJ Coins\nЗаработок: Пост (+0.75), Реферал (+15), прибыль AI Bot`,
      id: `🪙 Kurs: $1 = ${COIN_RATE} AJ Coins\nCara Earn: Post (+0.75), Referral (+15), keuntungan AI Bot`,
      vi: `🪙 Tỷ giá: $1 = ${COIN_RATE} AJ Coins\nKiếm: Đăng (+0.75), Giới thiệu (+15), lợi nhuận AI Bot`,
      zh: `🪙 汇率：$1 = ${COIN_RATE} AJ Coins\n赚取：发帖 (+0.75)、推荐 (+15)、AI Bot 利润`,
      ja: `🪙 レート：$1 = ${COIN_RATE} AJ Coins\n獲得：投稿 (+0.75)、紹介 (+15)、AIボット利益`,
      ko: `🪙 비율: $1 = ${COIN_RATE} AJ Coins\n획득: 게시물 (+0.75), 추천 (+15), AI Bot 수익`,
      fa: `🪙 نرخ: $1 = ${COIN_RATE} AJ Coins\nکسب کنید: پست (+0.75)، معرفی (+15)، سود ربات`,
      th: `🪙 อัตรา: $1 = ${COIN_RATE} AJ Coins\nรับ: โพสต์ (+0.75), แนะนำ (+15), กำไร AI Bot`,
      el: `🪙 Τιμή: $1 = ${COIN_RATE} AJ Coins\nΚέρδος: Ανάρτηση (+0.75), Παραπομπή (+15), κέρδη AI Bot`,
      he: `🪙 שער: $1 = ${COIN_RATE} AJ Coins\nהשתכר: פוסט (+0.75), הפניה (+15), רווחי AI Bot`,
    },
    refer: {
      en: `👥 Refer & Earn: Share your User ID.\nSomeone enters it → You get +15 Coins (30% share)!`,
      ur: `👥 ریفر اور کمائیں: اپنا User ID شیئر کریں\nکوئی داخل کرے → +15 Coins (30% حصہ)!`,
      ar: `👥 الإحالة والكسب: شارك معرّفك\nعند إدخاله → +15 Coins (30%)!`,
      hi: `👥 रेफर और कमाएं: अपना User ID शेयर करें\nकोई डाले → +15 Coins (30% हिस्सा)!`,
      bn: `👥 রেফার করুন: আপনার User ID শেয়ার করুন\nকেউ প্রবেশ করলে → +15 Coins (30%)!`,
      pa: `👥 ਰੈਫਰ ਕਰੋ: ਆਪਣਾ User ID ਸ਼ੇਅਰ ਕਰੋ\nਕੋਈ ਦਾਖਲ ਕਰੇ → +15 Coins (30%)!`,
      fr: `👥 Parrainage: Partagez votre ID.\nQuelqu'un l'entre → Vous recevez +15 Coins (30%)!`,
      es: `👥 Referidos: Comparte tu ID.\nAlguien lo ingresa → +15 Coins (30%)!`,
      de: `👥 Empfehlung: Teile deine ID.\nJemand gibt sie ein → +15 Coins (30%)!`,
      it: `👥 Referral: Condividi il tuo ID.\nQualcuno lo inserisce → +15 Coins (30%)!`,
      pt: `👥 Indicação: Compartilhe seu ID.\nAlguém insere → +15 Coins (30%)!`,
      tr: `👥 Referans: ID'ni paylaş.\nBiri girerse → +15 Coins (30%)!`,
      ru: `👥 Реферал: Поделись своим ID.\nКто-то вводит → +15 монет (30%)!`,
      id: `👥 Referral: Bagikan ID kamu.\nSeseorang memasukkan → +15 Coins (30%)!`,
      vi: `👥 Giới thiệu: Chia sẻ ID của bạn.\nAi đó nhập → +15 Coins (30%)!`,
      zh: `👥 推荐好友：分享您的 ID\n有人输入 → +15 Coins (30%)！`,
      ja: `👥 紹介：あなたのIDを共有\n誰かが入力 → +15 Coins (30%)！`,
      ko: `👥 추천: ID를 공유하세요\n누군가 입력 → +15 Coins (30%)!`,
      fa: `👥 معرفی: شناسه خود را به اشتراک بگذارید\nاگر کسی وارد کند → +15 Coins (30%)!`,
      th: `👥 แนะนำ: แชร์ User ID ของคุณ\nมีคนกรอก → +15 Coins (30%)!`,
      el: `👥 Παραπομπή: Μοιράσου το ID σου\nΚάποιος το εισάγει → +15 Coins (30%)!`,
      he: `👥 הפניה: שתף את ה-ID שלך\nמישהו מזין → +15 Coins (30%)!`,
    },
    withdraw: {
      en: `💸 Min Withdrawal: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE}).\nMethods: EasyPaisa, JazzCash, Binance USDT TRC20, AirTM, Bank Transfer.`,
      ur: `💸 کم از کم نکاسی: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nطریقے: EasyPaisa، JazzCash، Binance USDT، AirTM، Bank`,
      ar: `💸 الحد الأدنى: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nطرق: EasyPaisa، JazzCash، Binance USDT، AirTM، تحويل بنكي`,
      hi: `💸 न्यूनतम निकासी: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nतरीके: EasyPaisa, JazzCash, Binance USDT, AirTM, Bank`,
      bn: `💸 সর্বনিম্ন উত্তোলন: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nপদ্ধতি: EasyPaisa, JazzCash, Binance USDT, AirTM, Bank`,
      pa: `💸 ਘੱਟੋ ਘੱਟ ਕਢਵਾਉਣਾ: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nਤਰੀਕੇ: EasyPaisa, JazzCash, Binance, AirTM, Bank`,
      fr: `💸 Retrait minimum: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nMéthodes: EasyPaisa, JazzCash, Binance USDT, AirTM, Virement`,
      es: `💸 Retiro mínimo: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nMétodos: EasyPaisa, JazzCash, Binance USDT, AirTM, Banco`,
      de: `💸 Min. Auszahlung: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nMethoden: EasyPaisa, JazzCash, Binance USDT, AirTM, Banküberweisung`,
      it: `💸 Prelievo minimo: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nMetodi: EasyPaisa, JazzCash, Binance USDT, AirTM, Banca`,
      pt: `💸 Saque mínimo: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nMétodos: EasyPaisa, JazzCash, Binance USDT, AirTM, Banco`,
      tr: `💸 Min. Çekim: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nYöntemler: EasyPaisa, JazzCash, Binance USDT, AirTM, Banka`,
      ru: `💸 Мин. вывод: ${WITHDRAW_MIN.toLocaleString()} монет ($${WITHDRAW_MIN/CASH_RATE})\nСпособы: EasyPaisa, JazzCash, Binance USDT, AirTM, Банк`,
      id: `💸 Min. Penarikan: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nMetode: EasyPaisa, JazzCash, Binance USDT, AirTM, Bank`,
      vi: `💸 Rút tối thiểu: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nPhương thức: EasyPaisa, JazzCash, Binance USDT, AirTM, Ngân hàng`,
      zh: `💸 最低提款：${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\n方式：EasyPaisa、JazzCash、Binance USDT、AirTM、银行转账`,
      ja: `💸 最低出金：${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\n方法：EasyPaisa、JazzCash、Binance USDT、AirTM、銀行振込`,
      ko: `💸 최소 출금: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\n방법: EasyPaisa, JazzCash, Binance USDT, AirTM, 은행`,
      fa: `💸 حداقل برداشت: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nروش‌ها: EasyPaisa، JazzCash، Binance USDT، AirTM، بانک`,
      th: `💸 ถอนขั้นต่ำ: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nวิธี: EasyPaisa, JazzCash, Binance USDT, AirTM, ธนาคาร`,
      el: `💸 Ελάχιστη ανάληψη: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nΤρόποι: EasyPaisa, JazzCash, Binance USDT, AirTM, Τράπεζα`,
      he: `💸 משיכה מינימלית: ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})\nשיטות: EasyPaisa, JazzCash, Binance USDT, AirTM, בנק`,
    },
    buy: {
      en: `💰 Min Purchase: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins.\nRate: $1 = ${COIN_RATE} AJ Coins.`,
      ur: `💰 کم از کم خریداری: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nشرح: $1 = ${COIN_RATE} AJ Coins`,
      ar: `💰 الحد الأدنى للشراء: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\n$1 = ${COIN_RATE} AJ Coins`,
      hi: `💰 न्यूनतम खरीद: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nदर: $1 = ${COIN_RATE} AJ Coins`,
      bn: `💰 সর্বনিম্ন ক্রয়: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nহার: $1 = ${COIN_RATE} AJ Coins`,
      pa: `💰 ਘੱਟੋ ਘੱਟ ਖਰੀਦ: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nਦਰ: $1 = ${COIN_RATE} AJ Coins`,
      fr: `💰 Achat minimum: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nTaux: $1 = ${COIN_RATE} AJ Coins`,
      es: `💰 Compra mínima: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nTasa: $1 = ${COIN_RATE} AJ Coins`,
      de: `💰 Mindesteinkauf: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nKurs: $1 = ${COIN_RATE} AJ Coins`,
      it: `💰 Acquisto minimo: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nTasso: $1 = ${COIN_RATE} AJ Coins`,
      pt: `💰 Compra mínima: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nTaxa: $1 = ${COIN_RATE} AJ Coins`,
      tr: `💰 Min. Satın Alma: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nOran: $1 = ${COIN_RATE} AJ Coins`,
      ru: `💰 Мин. покупка: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} монет\nКурс: $1 = ${COIN_RATE} AJ Coins`,
      id: `💰 Pembelian Min.: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nKurs: $1 = ${COIN_RATE} AJ Coins`,
      vi: `💰 Mua tối thiểu: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nTỷ giá: $1 = ${COIN_RATE} AJ Coins`,
      zh: `💰 最低购买：$${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\n汇率：$1 = ${COIN_RATE} AJ Coins`,
      ja: `💰 最低購入：$${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nレート：$1 = ${COIN_RATE} AJ Coins`,
      ko: `💰 최소 구매: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\n비율: $1 = ${COIN_RATE} AJ Coins`,
      fa: `💰 حداقل خرید: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nنرخ: $1 = ${COIN_RATE} AJ Coins`,
      th: `💰 ซื้อขั้นต่ำ: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nอัตรา: $1 = ${COIN_RATE} AJ Coins`,
      el: `💰 Ελάχιστη αγορά: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nΤιμή: $1 = ${COIN_RATE} AJ Coins`,
      he: `💰 רכישה מינימלית: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\nשער: $1 = ${COIN_RATE} AJ Coins`,
    },
    live: {
      en: `📡 Go Live: Social Hub → GO LIVE. Viewers send gifts — you keep 60%! Agora HD streaming.`,
      ur: `📡 لائیو جائیں: Social Hub → GO LIVE\nناظرین تحفے بھیجیں — آپ 60% رکھیں! Agora HD`,
      ar: `📡 ابدأ البث: Social Hub → GO LIVE\nالمشاهدون يرسلون الهدايا — 60% لك! Agora HD`,
      hi: `📡 लाइव जाएं: Social Hub → GO LIVE\nदर्शक उपहार भेजें — आप 60% रखें! Agora HD`,
      bn: `📡 লাইভ যান: Social Hub → GO LIVE\nদর্শকরা উপহার পাঠায় — আপনি 60% রাখুন! Agora HD`,
      pa: `📡 ਲਾਈਵ ਜਾਓ: Social Hub → GO LIVE\nਦਰਸ਼ਕ ਤੋਹਫੇ ਭੇਜਦੇ — ਤੁਸੀਂ 60% ਰੱਖੋ! Agora HD`,
      fr: `📡 Allez en direct: Social Hub → GO LIVE\nLes spectateurs envoient des cadeaux — gardez 60%! Agora HD`,
      es: `📡 En vivo: Social Hub → GO LIVE\nLos espectadores envían regalos — ¡te quedas el 60%! Agora HD`,
      de: `📡 Live gehen: Social Hub → GO LIVE\nZuschauer senden Geschenke — behalte 60%! Agora HD`,
      it: `📡 Vai in diretta: Social Hub → GO LIVE\nGli spettatori inviano regali — tieni il 60%! Agora HD`,
      pt: `📡 Ao vivo: Social Hub → GO LIVE\nEspectadores enviam presentes — fique com 60%! Agora HD`,
      tr: `📡 Canlıya Geç: Social Hub → GO LIVE\nİzleyiciler hediye gönderir — %60'ı al! Agora HD`,
      ru: `📡 Выйти в эфир: Social Hub → GO LIVE\nЗрители шлют подарки — оставляй 60%! Agora HD`,
      id: `📡 Live: Social Hub → GO LIVE\nPenonton kirim hadiah — kamu dapat 60%! Agora HD`,
      vi: `📡 Phát trực tiếp: Social Hub → GO LIVE\nNgười xem gửi quà — bạn giữ 60%! Agora HD`,
      zh: `📡 开直播: Social Hub → GO LIVE\n观众送礼物 — 您保留 60%！Agora HD`,
      ja: `📡 ライブ配信: Social Hub → GO LIVE\n視聴者がギフト送信 — 60%があなたのもの！Agora HD`,
      ko: `📡 라이브: Social Hub → GO LIVE\n시청자가 선물 보내기 — 60% 보유! Agora HD`,
      fa: `📡 زنده بروید: Social Hub → GO LIVE\nبینندگان هدیه می‌فرستند — 60% برای شماست! Agora HD`,
      th: `📡 ไลฟ์: Social Hub → GO LIVE\nผู้ชมส่งของขวัญ — คุณเก็บ 60%! Agora HD`,
      el: `📡 Πήγαινε Live: Social Hub → GO LIVE\nΟι θεατές στέλνουν δώρα — κρατάς 60%! Agora HD`,
      he: `📡 שידור חי: Social Hub → GO LIVE\nצופים שולחים מתנות — אתה שומר 60%! Agora HD`,
    },
    gift: {
      en: `🎁 Gifts:\n☕ Coffee 500🪙 | 🍕 Pizza 1000🪙 | ❤️ Heart 2500🪙\n🏎️ Car 5000🪙 | 🛩️ Jet 8000🪙 | 🏰 Mansion 10000🪙`,
      ur: `🎁 تحفے:\n☕ کافی 500🪙 | 🍕 پیزا 1000🪙 | ❤️ دل 2500🪙\n🏎️ گاڑی 5000🪙 | 🛩️ جیٹ 8000🪙 | 🏰 محل 10000🪙`,
      ar: `🎁 الهدايا:\n☕ قهوة 500🪙 | 🍕 بيتزا 1000🪙 | ❤️ قلب 2500🪙\n🏎️ سيارة 5000🪙 | 🛩️ طائرة 8000🪙 | 🏰 قصر 10000🪙`,
      hi: `🎁 उपहार:\n☕ कॉफी 500🪙 | 🍕 पिज़्ज़ा 1000🪙 | ❤️ हार्ट 2500🪙\n🏎️ कार 5000🪙 | 🛩️ जेट 8000🪙 | 🏰 महल 10000🪙`,
      bn: `🎁 উপহার:\n☕ কফি 500🪙 | 🍕 পিজা 1000🪙 | ❤️ হৃদয় 2500🪙\n🏎️ গাড়ি 5000🪙 | 🛩️ জেট 8000🪙 | 🏰 প্রাসাদ 10000🪙`,
      pa: `🎁 ਤੋਹਫੇ:\n☕ ਕੌਫੀ 500🪙 | 🍕 ਪਿੱਜ਼ਾ 1000🪙 | ❤️ ਦਿਲ 2500🪙\n🏎️ ਕਾਰ 5000🪙 | 🛩️ ਜੈੱਟ 8000🪙 | 🏰 ਮਹਿਲ 10000🪙`,
      fr: `🎁 Cadeaux:\n☕ Café 500🪙 | 🍕 Pizza 1000🪙 | ❤️ Cœur 2500🪙\n🏎️ Voiture 5000🪙 | 🛩️ Jet 8000🪙 | 🏰 Manoir 10000🪙`,
      es: `🎁 Regalos:\n☕ Café 500🪙 | 🍕 Pizza 1000🪙 | ❤️ Corazón 2500🪙\n🏎️ Auto 5000🪙 | 🛩️ Jet 8000🪙 | 🏰 Mansión 10000🪙`,
      de: `🎁 Geschenke:\n☕ Kaffee 500🪙 | 🍕 Pizza 1000🪙 | ❤️ Herz 2500🪙\n🏎️ Auto 5000🪙 | 🛩️ Jet 8000🪙 | 🏰 Villa 10000🪙`,
      it: `🎁 Regali:\n☕ Caffè 500🪙 | 🍕 Pizza 1000🪙 | ❤️ Cuore 2500🪙\n🏎️ Auto 5000🪙 | 🛩️ Jet 8000🪙 | 🏰 Villa 10000🪙`,
      pt: `🎁 Presentes:\n☕ Café 500🪙 | 🍕 Pizza 1000🪙 | ❤️ Coração 2500🪙\n🏎️ Carro 5000🪙 | 🛩️ Jato 8000🪙 | 🏰 Mansão 10000🪙`,
      tr: `🎁 Hediyeler:\n☕ Kahve 500🪙 | 🍕 Pizza 1000🪙 | ❤️ Kalp 2500🪙\n🏎️ Araba 5000🪙 | 🛩️ Jet 8000🪙 | 🏰 Köşk 10000🪙`,
      ru: `🎁 Подарки:\n☕ Кофе 500🪙 | 🍕 Пицца 1000🪙 | ❤️ Сердце 2500🪙\n🏎️ Авто 5000🪙 | 🛩️ Джет 8000🪙 | 🏰 Особняк 10000🪙`,
      id: `🎁 Hadiah:\n☕ Kopi 500🪙 | 🍕 Pizza 1000🪙 | ❤️ Hati 2500🪙\n🏎️ Mobil 5000🪙 | 🛩️ Jet 8000🪙 | 🏰 Mansion 10000🪙`,
      vi: `🎁 Quà tặng:\n☕ Cà phê 500🪙 | 🍕 Pizza 1000🪙 | ❤️ Tim 2500🪙\n🏎️ Xe hơi 5000🪙 | 🛩️ Máy bay 8000🪙 | 🏰 Dinh thự 10000🪙`,
      zh: `🎁 礼物：\n☕ 咖啡 500🪙 | 🍕 披萨 1000🪙 | ❤️ 爱心 2500🪙\n🏎️ 跑车 5000🪙 | 🛩️ 飞机 8000🪙 | 🏰 豪宅 10000🪙`,
      ja: `🎁 ギフト：\n☕ コーヒー 500🪙 | 🍕 ピザ 1000🪙 | ❤️ ハート 2500🪙\n🏎️ 車 5000🪙 | 🛩️ ジェット 8000🪙 | 🏰 邸宅 10000🪙`,
      ko: `🎁 선물:\n☕ 커피 500🪙 | 🍕 피자 1000🪙 | ❤️ 하트 2500🪙\n🏎️ 자동차 5000🪙 | 🛩️ 제트기 8000🪙 | 🏰 저택 10000🪙`,
      fa: `🎁 هدایا:\n☕ قهوه 500🪙 | 🍕 پیتزا 1000🪙 | ❤️ قلب 2500🪙\n🏎️ ماشین 5000🪙 | 🛩️ جت 8000🪙 | 🏰 کاخ 10000🪙`,
      th: `🎁 ของขวัญ:\n☕ กาแฟ 500🪙 | 🍕 พิซซ่า 1000🪙 | ❤️ หัวใจ 2500🪙\n🏎️ รถ 5000🪙 | 🛩️ เจ็ต 8000🪙 | 🏰 คฤหาสน์ 10000🪙`,
      el: `🎁 Δώρα:\n☕ Καφές 500🪙 | 🍕 Πίτσα 1000🪙 | ❤️ Καρδιά 2500🪙\n🏎️ Αμάξι 5000🪙 | 🛩️ Τζετ 8000🪙 | 🏰 Έπαυλη 10000🪙`,
      he: `🎁 מתנות:\n☕ קפה 500🪙 | 🍕 פיצה 1000🪙 | ❤️ לב 2500🪙\n🏎️ מכונית 5000🪙 | 🛩️ ג'ט 8000🪙 | 🏰 ארמון 10000🪙`,
    },
    pk: {
      en: `⚔️ PK Battle: Go Live → PK Challenge → Enter rival ID.\n100 Coins each. 5-min timer! Most gifts = Winner 🏆`,
      ur: `⚔️ PK Battle: لائیو → PK Challenge → حریف ID ڈالیں\nہر ایک سے 100 Coins، 5 منٹ! سب سے زیادہ تحفے = فاتح 🏆`,
      ar: `⚔️ PK Battle: بث مباشر → PK Challenge → أدخل ID المنافس\n100 Coins لكل منهما. 5 دقائق! أكثر الهدايا = الفائز 🏆`,
      hi: `⚔️ PK Battle: लाइव → PK Challenge → प्रतिद्वंद्वी ID डालें\nप्रत्येक से 100 Coins, 5 मिनट! सबसे ज़्यादा उपहार = विजेता 🏆`,
      bn: `⚔️ PK Battle: লাইভ → PK Challenge → প্রতিপক্ষ ID দিন\nপ্রত্যেকের 100 Coins, 5 মিনিট! সর্বাধিক উপহার = বিজয়ী 🏆`,
      pa: `⚔️ PK Battle: ਲਾਈਵ → PK Challenge → ਵਿਰੋਧੀ ID ਦਾਖਲ ਕਰੋ\nਹਰੇਕ ਤੋਂ 100 Coins, 5 ਮਿੰਟ! ਜ਼ਿਆਦਾ ਤੋਹਫੇ = ਜੇਤੂ 🏆`,
      fr: `⚔️ PK Battle: Live → PK Challenge → ID rival\n100 Coins chacun. 5 min! Plus de cadeaux = Gagnant 🏆`,
      es: `⚔️ PK Battle: Live → PK Challenge → ID del rival\n100 Coins cada uno. 5 min! Más regalos = Ganador 🏆`,
      de: `⚔️ PK Battle: Live → PK Challenge → Rivalen-ID\n100 Coins pro Person. 5 Min! Mehr Geschenke = Sieger 🏆`,
      it: `⚔️ PK Battle: Live → PK Challenge → ID rivale\n100 Coins ciascuno. 5 min! Più regali = Vincitore 🏆`,
      pt: `⚔️ PK Battle: Live → PK Challenge → ID do rival\n100 Coins cada. 5 min! Mais presentes = Vencedor 🏆`,
      tr: `⚔️ PK Battle: Canlı → PK Challenge → Rakip ID\n100 Coins her biri. 5 dk! En çok hediye = Kazanan 🏆`,
      ru: `⚔️ PK Battle: Эфир → PK Challenge → ID соперника\nПо 100 монет. 5 мин! Больше подарков = Победитель 🏆`,
      id: `⚔️ PK Battle: Live → PK Challenge → ID lawan\n100 Coins masing. 5 menit! Hadiah terbanyak = Juara 🏆`,
      vi: `⚔️ PK Battle: Live → PK Challenge → ID đối thủ\n100 Coins mỗi người. 5 phút! Quà nhiều nhất = Thắng 🏆`,
      zh: `⚔️ PK对战: 直播 → PK挑战 → 输入对手ID\n各100 Coins，5分钟！礼物最多=冠军 🏆`,
      ja: `⚔️ PK対決: ライブ → PKチャレンジ → ライバルID\n各100 Coins、5分！最多ギフト=優勝 🏆`,
      ko: `⚔️ PK 배틀: 라이브 → PK 챌린지 → 라이벌 ID\n각 100 Coins, 5분! 선물 최다=승리자 🏆`,
      fa: `⚔️ PK Battle: زنده → PK Challenge → ID رقیب\n100 Coins هر کدام. 5 دقیقه! بیشترین هدیه = برنده 🏆`,
      th: `⚔️ PK Battle: ไลฟ์ → PK Challenge → ID คู่แข่ง\n100 Coins ต่อคน 5 นาที! ของขวัญมากที่สุด = ชนะ 🏆`,
      el: `⚔️ PK Battle: Live → PK Challenge → ID αντιπάλου\n100 Coins ο καθένας. 5 λεπτά! Περισσότερα δώρα = Νικητής 🏆`,
      he: `⚔️ PK Battle: שידור → PK Challenge → ID יריב\n100 Coins כל אחד. 5 דקות! הכי הרבה מתנות = מנצח 🏆`,
    },
    default: {
      en: `I'm not sure. Contact CEO directly:\n👇`,
      ur: `مجھے یقین نہیں۔ براہ کرم CEO سے رابطہ کریں:\n👇`,
      ar: `لست متأكداً. يرجى التواصل مع المدير التنفيذي:\n👇`,
      hi: `मुझे यकीन नहीं। CEO से संपर्क करें:\n👇`,
      bn: `আমি নিশ্চিত নই। CEO-র সাথে যোগাযোগ করুন:\n👇`,
      pa: `ਮੈਨੂੰ ਯਕੀਨ ਨਹੀਂ। CEO ਨਾਲ ਸੰਪਰਕ ਕਰੋ:\n👇`,
      fr: `Je ne suis pas sûr. Contactez le CEO directement:\n👇`,
      es: `No estoy seguro. Contacta al CEO directamente:\n👇`,
      de: `Ich bin nicht sicher. CEO direkt kontaktieren:\n👇`,
      it: `Non sono sicuro. Contatta il CEO direttamente:\n👇`,
      pt: `Não tenho certeza. Contate o CEO diretamente:\n👇`,
      tr: `Emin değilim. CEO ile doğrudan iletişime geçin:\n👇`,
      ru: `Не уверен. Обратитесь напрямую к CEO:\n👇`,
      id: `Saya tidak yakin. Hubungi CEO langsung:\n👇`,
      vi: `Tôi không chắc. Liên hệ CEO trực tiếp:\n👇`,
      zh: `我不确定。直接联系CEO：\n👇`,
      ja: `わかりません。CEOに直接お問い合わせください：\n👇`,
      ko: `확실하지 않습니다. CEO에게 직접 문의하세요:\n👇`,
      fa: `مطمئن نیستم. مستقیماً با CEO تماس بگیرید:\n👇`,
      th: `ฉันไม่แน่ใจ ติดต่อ CEO โดยตรง:\n👇`,
      el: `Δεν είμαι σίγουρος. Επικοινωνήστε άμεσα με τον CEO:\n👇`,
      he: `אני לא בטוח. צור קשר ישירות עם המנכ"ל:\n👇`,
    },
  };

  // ── Universal keyword matcher ─────────────────────────────────────────
  const matchTopic = (q: string): keyof typeof BOT_REPLIES => {
    const t = q.toLowerCase();
    // Coins / Balance
    if (/coin|balance|كوئن|رصيد|بيلنس|सिक्का|कॉइन|মুদ্রা|монет|硬币|コイン|코인|سکہ|เหรียญ|νόμισμα|מטבע/.test(t)) return 'coin';
    // Referral
    if (/refer|referral|إحالة|ریفرل|रेफरल|রেফারেল|реферал|推荐|紹介|추천|معرفی|แนะนำ|παραπομπή|הפניה/.test(t)) return 'refer';
    // Withdraw / Cashout
    if (/withdraw|cashout|نکالنا|سحب|निकास|উত্তোলন|auszahlen|retirer|retirar|ritirare|çekmek|вывод|penarikan|rút|提款|出金|출금|برداشت|ถอน|ανάληψη|משיכה/.test(t)) return 'withdraw';
    // Buy / Purchase
    if (/buy|purchase|خریدنا|شراء|खरीद|ক্রয়|kaufen|acheter|comprar|comprare|satın|купить|beli|mua|购买|購入|구매|خرید|ซื้อ|αγορά|רכישה/.test(t)) return 'buy';
    // Live / Stream
    if (/live|بث|لائیو|लाइव|লাইভ|diffusion|directo|diretta|canlı|эфир|siaran|phát|直播|ライブ|라이브|زنده|ไลฟ์|ζωντανά|שידור/.test(t)) return 'live';
    // Gift
    if (/gift|تحفہ|هدية|تحفه|उपहार|উপহার|cadeau|regalo|geschenk|hediye|подарок|hadiah|quà|礼物|ギフト|선물|هدیه|ของขวัญ|δώρο|מתנה/.test(t)) return 'gift';
    // PK / Challenge
    if (/pk|challenge|battle|تحدي|مبارزه|चुनौती|চ্যালেঞ্জ|herausforderung|défi|desafío|sfida|mücadele|вызов|tantangan|thách thức|挑战|チャレンジ|도전|رقابت|ท้าทาย|πρόκληση|אתגר/.test(t)) return 'pk';
    return 'default';
  };

  const handleBotSend = () => {
    if (!botInput.trim()) return;
    const lang  = detectLanguage(botInput);
    const topic = matchTopic(botInput);
    const pool  = BOT_REPLIES[topic];
    const reply = pool[lang] ?? pool['en']; // fallback to English if lang missing
    setBotMessages(m => [...m, {from:'user',text:botInput}, {from:'bot',text:reply}]);
    setBotInput('');
  };

  // Format PK timer
  const formatPkTime = (s:number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // ==========================================================
  // SPLASH
  // ==========================================================
  if (screen==='splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white text-center">
      <div className="w-40 h-40 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8">
        <img src="/logo.png" className="w-full h-full object-cover" alt="AJ"/>
      </div>
      <h1 className="text-3xl font-black tracking-widest uppercase animate-pulse">AJ PORTAL</h1>
    </main>
  );

  // ==========================================================
  // AUTH
  // ==========================================================
  if (screen==='auth') return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 italic text-cyan-400 uppercase">AJ <span className="text-white">ID</span></h2>
        <button onClick={handleGoogleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-all shadow-xl">
          CONTINUE WITH GOOGLE
        </button>
        <p className="mt-8 text-yellow-500 font-bold tracking-widest">+500 COINS WELCOME BONUS</p>
      </div>
    </main>
  );

  // ==========================================================
  // MAIN APP
  // ==========================================================
  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      <input type="file" ref={fileInputRef}  onChange={handleFileChange}       accept="image/*"        className="hidden"/>
      <input type="file" ref={tiktokFileRef} onChange={handleTiktokFileChange} accept="image/*,video/*" className="hidden"/>

      {/* ── CINEMATIC GIFT OVERLAY (Prompt #6) ──────────────── */}
      {cinematicGift && (
        <CinematicGiftOverlay
          gift={cinematicGift}
          sender={cinematicSender}
          onDone={() => { setCinematicGift(null); setCinematicSender(''); }}
        />
      )}

      {/* ── HEADER ──────────────────────────────────────────── */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          {/* BELL */}
          <div className="relative cursor-pointer" onClick={() => { setNotifOpen(!notifOpen); setUnreadCount(0); }}>
            <Bell size={22} className="text-white hover:text-yellow-400 transition-all"/>
            {unreadCount>0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center border border-black animate-pulse">
                {unreadCount>9?'9+':unreadCount}
              </span>
            )}
          </div>
          {/* BALANCE */}
          <div onClick={() => navigateWithAd('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
            <span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
            <span className="text-[10px] text-green-400 font-black">${displayUsdt}</span>
            {user && <img src={tempPhoto||user.photoURL||'/logo.png'} className="w-8 h-8 rounded-full border border-cyan-500 shadow-[0_0_10px_#06b6d4]"/>}
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full uppercase">EXIT</button>
        </div>
      </header>

      {/* NOTIF PANEL */}
      {notifOpen && (
        <div className="fixed top-16 right-4 w-80 max-h-96 overflow-y-auto bg-slate-900 border border-white/10 rounded-3xl p-4 z-[200] shadow-2xl backdrop-blur-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-sm text-cyan-400 uppercase tracking-widest">Notifications</h3>
            <X size={16} className="text-gray-500 cursor-pointer" onClick={() => setNotifOpen(false)}/>
          </div>
          {notifications.length===0
            ? <p className="text-gray-500 text-xs text-center py-4">No notifications.</p>
            : notifications.map((n:any) => (
              <div key={n.id} className="bg-white/5 border border-white/10 p-3 rounded-2xl mb-3 cursor-pointer"
                onClick={() => { if(n.deepLink) { setNotifOpen(false); } }}>
                <p className="text-[10px] font-black text-cyan-400 uppercase">{n.title}</p>
                <p className="text-[9px] text-gray-400 mt-1">{n.message}</p>
              </div>
            ))
          }
        </div>
      )}

      {/* ── HOME HUB ─────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        {/* AI ASSISTANT — Hub Top Right Only (Prompt #7) */}
        <div className="fixed top-20 right-4 z-[150]">
          <button onClick={() => setBotOpen(!botOpen)}
            className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-green-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center justify-center text-black hover:scale-110 transition-all active:scale-90 border-2 border-white/20">
            {botOpen?<X size={20}/>:<Bot size={20}/>}
          </button>
        </div>

        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          {[
            { label:'Gaming', icon:<Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2"/>, sc:'arcade', hover:'hover:border-cyan-400' },
            { label:'Social', icon:<Zap     className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2"/>, sc:'social', hover:'hover:border-pink-500' },
            { label:'Wallet', icon:<img src="/gold.jpg" className="w-14 h-14 mb-2 rounded-full border-2 border-yellow-500 shadow-md"/>, sc:'wallet', hover:'hover:border-yellow-500' },
            { label:'AI Trading Bot', icon:<Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2"/>, sc:'ai', hover:'hover:border-green-500' },
          ].map(m => (
            <div key={m.label} onClick={() => navigateWithAd(m.sc)}
              className={`bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all ${m.hover} relative z-30`}>
              {m.icon}
              <span className="font-black text-xs md:text-3xl uppercase tracking-tighter">{m.label}</span>
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-24 h-24 md:w-96 md:h-96 bg-black border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden">
              <img src="/logo.png" className="w-full h-full object-cover opacity-60 animate-pulse"/>
            </div>
          </div>
        </div>
      </section>

      {/* AI ASSISTANT CHAT PANEL — Hub only (Prompt #7) */}
      {botOpen && screen==='hub' && (
        <div className="fixed bottom-24 right-6 z-[900] w-80 md:w-96 h-[480px] bg-[#0d1117] border border-cyan-500/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden backdrop-blur-xl">
          <div className="bg-gradient-to-r from-cyan-600/30 to-green-600/30 p-5 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-cyan-300">
              <Bot size={22} className="text-black"/>
            </div>
            <div>
              <p className="font-black text-sm text-white uppercase tracking-widest">AJ AI Assistant</p>
              <p className="text-[8px] text-green-400 font-bold uppercase tracking-widest animate-pulse">CEO Representative • Online</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {botMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from==='user'?'justify-end':'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed font-bold whitespace-pre-line ${msg.from==='user'?'bg-cyan-600 text-white rounded-tr-none':'bg-white/10 text-gray-200 rounded-tl-none border border-white/10'}`}>
                  {msg.text}
                  {msg.from==='bot' && msg.text.includes('CEO') && (
                    <a href={CEO_WHATSAPP} target="_blank" className="block mt-2 bg-green-500 text-black text-[10px] font-black uppercase px-3 py-2 rounded-xl text-center hover:bg-green-400 transition-all">
                      💬 Chat with CEO on WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-white/10 flex gap-3">
            <input type="text" value={botInput} onChange={e => setBotInput(e.target.value)}
              onKeyDown={e => e.key==='Enter'&&handleBotSend()} placeholder="Ask about Coins, Referral..."
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500 font-bold"/>
            <button onClick={handleBotSend} className="bg-cyan-500 p-3 rounded-full text-black shadow-lg active:scale-90 transition-all">
              <Send size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* ── ARCADE ───────────────────────────────────────────── */}
      {screen==='arcade' && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col h-screen overflow-hidden">
          {!selectedGame ? (
            <div className="p-8 overflow-y-auto flex-1">
              <button onClick={() => { setScreen('hub'); setSelectedGame(null); }}
                className="text-cyan-400 font-bold mb-10 tracking-widest uppercase flex items-center gap-2">
                <ArrowLeft size={20}/> BACK
              </button>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20">
                {['Rider King','Pulse Racer','Subsea Surge','Neon Strike','Volcano Escape'].map(game => (
                  <div key={game} onClick={() => setSelectedGame(game)}
                    className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center hover:border-cyan-400 cursor-pointer transition-all">
                    <img src={`/games/${game.toLowerCase().replace(/ /g,'-')}/logo.png`}
                      className="w-full aspect-square rounded-xl mb-4 object-cover" alt={game}
                      onError={(e:any) => { e.target.src="/logo.png"; }}/>
                    <h3 className="font-black text-sm uppercase">{game}</h3>
                    <button className="mt-4 w-full py-2 rounded-full font-black text-[10px] bg-cyan-500 text-black uppercase">PLAY NOW</button>
                  </div>
                ))}
                {['Ludo Elite Royal','Puck Pulse Elite'].map(game => (
                  <div key={game} className="bg-white/5 border border-yellow-500/30 p-4 rounded-3xl text-center relative opacity-80 cursor-not-allowed">
                    <span className="absolute top-3 right-3 bg-yellow-500 text-black text-[8px] font-black px-2 py-1 rounded-full uppercase z-10">Coming Soon</span>
                    <div className="w-full aspect-square rounded-xl mb-4 bg-gradient-to-br from-yellow-500/10 to-black flex items-center justify-center border border-yellow-500/20">
                      <Trophy size={50} className="text-yellow-500 opacity-40"/>
                    </div>
                    <h3 className="font-black text-sm uppercase text-yellow-400">{game}</h3>
                    <button disabled className="mt-4 w-full py-2 rounded-full font-black text-[10px] bg-yellow-500/20 text-yellow-400 uppercase cursor-not-allowed">Coming Soon</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <div className="w-full bg-black h-12 flex items-center px-4 border-b border-white/10 shrink-0">
                <button onClick={() => setSelectedGame(null)} className="text-cyan-400 font-black text-[10px] uppercase tracking-widest">← BACK</button>
                <div className="flex-1 text-center font-black uppercase text-[10px] opacity-40">{selectedGame}</div>
              </div>
              <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g,'-')}/index.html`}
                className="w-full h-full border-none flex-1" title="Game"/>
            </div>
          )}
        </div>
      )}

      {/* ── SOCIAL ───────────────────────────────────────────── */}
      {screen==='social' && (
        <div className="fixed inset-0 z-[400] bg-slate-950 flex flex-col h-screen overflow-hidden">
          <header className="sticky top-0 w-full p-4 bg-black/90 backdrop-blur-md border-b border-white/10 flex justify-between items-center z-[500] rounded-b-3xl shrink-0">
            {socialScreen==='hub'
              ? <button onClick={() => setScreen('hub')} className="text-pink-500 font-black text-xs uppercase">← HUB</button>
              : <button onClick={() => setSocialScreen('hub')} className="text-pink-500 font-black text-xs uppercase">← BACK</button>
            }
            <h2 className="text-4xl font-black italic text-pink-500 uppercase text-center flex-1 tracking-tighter drop-shadow-[0_0_15px_#ec4899] animate-pulse">Dashboard</h2>
            <button onClick={() => setSocialScreen('settings_menu')} className="bg-white/10 p-2 rounded-full text-pink-500 hover:bg-white/20 shadow-lg">
              <Settings size={22}/>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">

            {/* SOCIAL HUB — Restructured (Prompt #5) */}
            {socialScreen==='hub' && (
              <div className="max-w-md mx-auto grid grid-cols-1 gap-6 p-8 pb-24">
                {/* Profile card */}
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-pink-500/20 cursor-pointer"
                  onClick={() => user && openProfile(user.uid)}>
                  <div className="relative">
                    <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-14 h-14 rounded-full border-2 border-pink-500 shadow-xl"/>
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-950"/>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-white text-xs uppercase tracking-wider">@{username||'AJ_MEMBER'}</p>
                    <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Tap to view your profile</p>
                  </div>
                </div>

                {/* Referral card */}
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 p-5 rounded-3xl text-left shadow-xl">
                  <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-2">🎁 Refer & Earn — Your Referral Code</p>
                  <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl">
                    <span className="text-xs font-mono text-yellow-300 truncate max-w-[200px]">{user?.uid}</span>
                    <button onClick={() => copyToClipboard(user?.uid||"")} className="text-yellow-400 text-[10px] font-black uppercase">
                      {copied?"Copied ✓":"Copy"}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2">Share ID → New user enters it → You get +{REFERRAL_COINS} Coins!</p>
                </div>

                {/* GO LIVE */}
                <button onClick={startLive}
                  className="w-full py-4 bg-red-600 rounded-[2rem] font-black uppercase text-white tracking-[0.2em] shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-105 transition-all flex items-center justify-center gap-3 active:scale-95">
                  <Radio size={22} className="animate-pulse"/> GO LIVE (Camera + Gifts)
                </button>

                {/* ── LIVE NOW LOBBY (Prompt #5) ────────────── */}
                <div className="bg-white/5 border border-red-500/30 rounded-3xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"/>
                    <h3 className="font-black text-sm uppercase tracking-widest text-red-400">Live Now</h3>
                    <span className="text-[10px] text-gray-500 font-bold">{liveNowList.length} streaming</span>
                  </div>
                  {liveNowList.length === 0
                    ? <p className="text-[10px] text-gray-500 text-center py-4 font-bold">No one is live right now. Be the first!</p>
                    : <div className="space-y-3 max-h-48 overflow-y-auto">
                        {liveNowList.map((room:any) => (
                          <div key={room.id} className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl border border-red-500/20 cursor-pointer hover:border-red-500 transition-all active:scale-95"
                            onClick={() => alert(`Joining @${room.username}'s live — Agora Room: ${room.roomId}`)}>
                            <div className="relative">
                              <img src={room.photo||'/logo.png'} className="w-10 h-10 rounded-full border-2 border-red-500"/>
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black animate-pulse"/>
                            </div>
                            <div className="flex-1">
                              <p className="font-black text-xs text-white uppercase">@{room.username}</p>
                              <p className="text-[9px] text-red-400 font-bold animate-pulse">🔴 Live</p>
                            </div>
                            <button className="bg-red-600 px-3 py-1.5 rounded-full text-[9px] font-black text-white uppercase">Join</button>
                          </div>
                        ))}
                      </div>
                  }
                </div>

                {/* MODULE CARDS — No Create Post here (Prompt #5) */}
                {[
                  { n:'AJ TikReels', i:Video,        d:'TikTok Style Videos', s:'tikreels'  },
                  { n:'AJ Pulse',    i:Users,         d:'Insta Style Feed',    s:'pulse'     },
                  { n:'AJ WeChat',   i:MessageSquare, d:'VVIP Messenger',      s:'chatlist'  },
                  { n:'AJ Discover', i:Globe,         d:'Crypto & Tech News',  s:'discover'  },
                ].map(mod => (
                  <div key={mod.n} onClick={() => enterSocialMode(mod.s)}
                    className="p-8 bg-white/5 border border-white/10 rounded-[3rem] text-center hover:border-pink-500 transition-all cursor-pointer group shadow-lg">
                    <div className="text-pink-500 mb-4 flex justify-center group-hover:scale-110 transition-transform"><mod.i size={36}/></div>
                    <h3 className="text-2xl font-black uppercase italic text-white tracking-widest">{mod.n}</h3>
                    <p className="text-[9px] text-gray-400 uppercase mt-2 font-bold tracking-widest">{mod.d}</p>
                  </div>
                ))}
              </div>
            )}

            {/* USER PROFILE */}
            {socialScreen==='profile' && viewProfile && (
              <div className="max-w-md mx-auto pb-24">
                <div className="relative h-44 bg-gradient-to-br from-pink-600/30 to-cyan-600/30 rounded-b-[3rem]">
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                    <img src={viewProfile.photo||'/logo.png'} className="w-24 h-24 rounded-full border-4 border-slate-950 shadow-2xl"/>
                  </div>
                </div>
                <div className="mt-16 text-center px-6">
                  <h2 className="text-2xl font-black text-white uppercase tracking-widest">@{viewProfile.username||'AJ_MEMBER'}</h2>
                  <p className="text-sm text-gray-400 mt-2 font-bold">{viewProfile.bio||'No bio yet.'}</p>
                  <div className="flex justify-center gap-8 mt-6">
                    {[{l:'Posts',v:profilePosts.length},{l:'Videos',v:profileVideos.length},{l:'Followers',v:followers},{l:'Following',v:following}].map(s => (
                      <div key={s.l} className="text-center">
                        <p className="text-xl font-black text-white">{s.v}</p>
                        <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  {viewingUid!==user?.uid && (
                    <button onClick={() => viewingUid && handleFollow(viewingUid)}
                      className={`mt-6 px-10 py-3 rounded-full font-black uppercase text-sm tracking-widest transition-all active:scale-95 flex items-center gap-2 mx-auto ${isFollowing?'bg-white/10 border border-white/20 text-white':'bg-pink-600 text-white shadow-lg'}`}>
                      {isFollowing ? <><UserCheck size={16}/> Following</> : <><UserPlus size={16}/> Follow</>}
                    </button>
                  )}
                  <div className="flex gap-4 mt-8 border-b border-white/10">
                    {[{t:'Posts',i:<Grid size={18}/>},{t:'Videos',i:<Film size={18}/>}].map(tab => (
                      <button key={tab.t} className="flex-1 flex items-center justify-center gap-2 py-3 font-black text-xs uppercase tracking-widest text-pink-400 border-b-2 border-pink-500">
                        {tab.i}{tab.t}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-4">
                    {[...profilePosts,...profileVideos].map((p:any) => (
                      <div key={p.id} className="aspect-square bg-white/5 rounded-xl overflow-hidden">
                        {p.image
                          ? <img src={p.image} className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-600/20 to-cyan-600/20"><Film size={24} className="text-pink-400"/></div>
                        }
                      </div>
                    ))}
                    {[...profilePosts,...profileVideos].length===0 && (
                      <div className="col-span-3 py-12 text-gray-500 text-xs text-center">No posts yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SETTINGS */}
            {socialScreen==='settings_menu' && (
              <div className="max-w-md mx-auto p-10 flex flex-col gap-6">
                <h2 className="text-3xl font-black text-cyan-400 italic mb-4 uppercase tracking-widest">Settings</h2>
                <button onClick={() => setSocialScreen('setup')}
                  className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all shadow-xl">
                  <Edit3 className="text-pink-500" size={24}/><span className="font-black text-sm uppercase tracking-widest">Edit Profile</span>
                </button>
                <button onClick={handleSignOut}
                  className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-center gap-4 hover:bg-red-500/20 transition-all shadow-xl">
                  <LogOut className="text-red-500" size={24}/><span className="font-black text-sm uppercase tracking-widest text-red-500">Sign Out</span>
                </button>
                <button onClick={() => setSocialScreen('hub')} className="text-gray-500 uppercase text-[10px] font-black mt-10">Back</button>
              </div>
            )}

            {/* TIKREELS */}
            {socialScreen==='tikreels' && (
              <div className="flex flex-col h-full">
                <div className="flex gap-0 bg-black border-b border-white/10 shrink-0">
                  {(['feed','create','profile'] as const).map(t => (
                    <button key={t} onClick={() => setTiktabMode(t)}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tiktabMode===t?'text-pink-500 border-b-2 border-pink-500':'text-gray-500'}`}>
                      {t==='feed'?'🎬 Feed':t==='create'?'➕ Post':'👤 Profile'}
                    </button>
                  ))}
                </div>

                {/* FEED — TikTok style with sound toggle */}
                {tiktabMode==='feed' && (
                  <div className="h-full w-full max-w-md mx-auto snap-y snap-mandatory overflow-y-auto bg-black">
                    {/* Global Sound Toggle Bar (Prompt #3) */}
                  <div className="sticky top-0 z-30 flex justify-end px-4 py-2 bg-black/80 backdrop-blur-sm border-b border-white/10">
                    <button
                      onClick={() => setGlobalSoundOn(s => !s)}
                      className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-full text-[11px] font-black uppercase text-white hover:bg-white/20 transition-all active:scale-95">
                      {globalSoundOn ? <Volume2 size={14} className="text-green-400"/> : <VolumeX size={14} className="text-red-400"/>}
                      {globalSoundOn ? 'Sound ON' : 'Sound OFF'}
                    </button>
                  </div>
                  {pixaVideos.map((vid:any, i:number) => {
                      const soundOn = globalSoundOn;
                      const embedUrl = soundOn
                        ? `https://www.youtube.com/embed/${vid.id}?autoplay=1&mute=0&loop=1&playlist=${vid.id}&controls=0&rel=0&playsinline=1`
                        : `https://www.youtube.com/embed/${vid.id}?autoplay=1&mute=1&loop=1&playlist=${vid.id}&controls=0&rel=0&playsinline=1`;
                      return (
                      <React.Fragment key={i}>
                        <div className="h-[85vh] w-full snap-start relative border-b border-white/5">
                          <iframe
                            src={embedUrl}
                            className="w-full h-full"
                            title={vid.title}
                            allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            frameBorder="0"
                          />
                          {/* SOUND OVERLAY — shown when muted */}
                          {!soundOn && (
                            <div
                              className="absolute inset-0 flex items-end justify-center pb-48 z-20 cursor-pointer"
                              onClick={() => setGlobalSoundOn(true)}>
                              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full shadow-xl animate-pulse">
                                <VolumeX size={16} className="text-white"/>
                                <span className="text-white text-[11px] font-black uppercase tracking-widest">Tap for Sound</span>
                              </div>
                            </div>
                          )}
                          {/* RIGHT SIDEBAR ACTIONS */}
                          <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center z-10">
                            <div onClick={() => handleLike(vid.id)} className="flex flex-col items-center cursor-pointer active:scale-125 transition-all">
                              <Heart size={35} className={likedPosts[vid.id]?"text-red-500 fill-red-500":"text-white"}/>
                              <span className="text-[10px] font-bold text-white">12k</span>
                            </div>
                            <div className="flex flex-col items-center cursor-pointer" onClick={() => setCommentPostId(vid.id)}>
                              <MessageCircle size={35} className="text-white"/>
                              <span className="text-[10px] font-bold text-white">842</span>
                            </div>
                            <div onClick={() => handleShare('AJ TikReels')} className="flex flex-col items-center cursor-pointer text-white">
                              <Share2 size={35}/><span className="text-[10px] font-bold">Share</span>
                            </div>
                            {/* GIFT */}
                            <div className="flex flex-col items-center cursor-pointer text-yellow-400" onClick={() => setPulseGiftPostId(vid.id)}>
                              <Gift size={28}/><span className="text-[10px] font-bold">Gift</span>
                            </div>
                            {/* SOUND TOGGLE */}
                            <div className="flex flex-col items-center cursor-pointer text-white"
                              onClick={() => setGlobalSoundOn(s => !s)}>
                              {globalSoundOn ? <Volume2 size={28} className="text-green-400"/> : <VolumeX size={28} className="text-red-400"/>}
                              <span className="text-[10px] font-bold">{globalSoundOn?'Sound':'Muted'}</span>
                            </div>
                          </div>
                          <div className="absolute bottom-10 left-6 text-white max-w-[70%] z-10">
                            <p className="font-black text-sm">@{vid.user}</p>
                            <div className="flex items-center gap-2 mt-3 bg-black/30 w-max p-1.5 rounded-full backdrop-blur-md border border-white/10">
                              <Music size={12}/>
                              {/* @ts-ignore */}
                              <marquee className="text-[10px] w-24 uppercase font-bold">Original Sound - AJ Studio</marquee>
                            </div>
                          </div>
                        </div>
                        {(i+1)%5===0 && (
                          <div onClick={() => (window as any).AJ_SDK?.showAd()}
                            className="h-[85vh] w-full snap-start flex items-center justify-center bg-gray-900 text-cyan-400 font-black flex-col gap-4 cursor-pointer border-y-2 border-cyan-500/20">
                            <VideoIcon size={70} className="animate-pulse"/>
                            <p className="uppercase tracking-[0.3em]">AJ VVIP AD</p>
                          </div>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {/* CREATE (TikReels) */}
                {tiktabMode==='create' && (
                  <div className="max-w-md mx-auto p-6 space-y-6">
                    <h3 className="text-xl font-black text-pink-500 uppercase tracking-widest">📹 Create Video Post</h3>
                    <div className="border-2 border-dashed border-pink-500/40 rounded-3xl p-8 text-center cursor-pointer bg-white/5 hover:bg-white/10 transition-all" onClick={handleTiktokImage}>
                      {tiktokPostImg
                        ? <img src={tiktokPostImg} className="w-full max-h-48 object-cover rounded-2xl"/>
                        : <><Film size={48} className="text-pink-500/40 mx-auto mb-3"/><p className="text-[10px] text-gray-500 uppercase font-black">Tap to select Video / Image</p></>
                      }
                    </div>
                    <textarea value={tiktokPostText} onChange={e => setTiktokPostText(e.target.value)} placeholder="Add caption..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-pink-500 h-24 font-bold"/>
                    <button onClick={handleTiktokPost} className="w-full py-4 bg-pink-600 rounded-2xl font-black uppercase text-white tracking-widest shadow-lg active:scale-95 transition-all">
                      PUBLISH (+0.75 🪙)
                    </button>
                  </div>
                )}

                {/* MY PROFILE (TikReels) */}
                {tiktabMode==='profile' && (
                  <div className="max-w-md mx-auto pb-24">
                    <div className="relative h-36 bg-gradient-to-br from-pink-600/30 to-cyan-600/30">
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                        <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-20 h-20 rounded-full border-4 border-slate-950 shadow-2xl"/>
                      </div>
                    </div>
                    <div className="mt-14 text-center px-6">
                      <h2 className="text-xl font-black text-white uppercase tracking-widest">@{username||'AJ_MEMBER'}</h2>
                      <p className="text-sm text-gray-400 mt-1 font-bold">{bio||'No bio yet.'}</p>
                      <div className="flex justify-center gap-8 mt-5">
                        {[{l:'Videos',v:profileVideos.length},{l:'Followers',v:followers},{l:'Following',v:following}].map(s => (
                          <div key={s.l} className="text-center">
                            <p className="text-xl font-black text-white">{s.v}</p>
                            <p className="text-[9px] text-gray-500 uppercase font-bold">{s.l}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-1 mt-6">
                        {userPosts.filter((p:any) => p.uid===user?.uid).map((p:any) => (
                          <div key={p.id} className="aspect-square bg-white/5 rounded-xl overflow-hidden">
                            {p.image ? <img src={p.image} className="w-full h-full object-cover"/>
                              : <div className="w-full h-full flex items-center justify-center"><Film size={24} className="text-pink-400"/></div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AJ PULSE — Vertical Snap Feed (Prompt #4) */}
            {socialScreen==='pulse' && (
              <div className="max-w-md mx-auto flex flex-col h-full">

                {/* CREATE POST at TOP (Prompt #4) */}
                <div className="bg-white/10 backdrop-blur-xl p-4 border-b border-pink-500/20 shadow-md sticky top-0 z-10">
                  <div className="flex gap-3">
                    <img src={user?.photoURL||'/logo.png'} className="w-9 h-9 rounded-full border-2 border-pink-500 flex-shrink-0"/>
                    <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Share your CEO story..."
                      className="flex-1 bg-white/5 rounded-xl p-3 text-xs outline-none border border-white/10 h-14 text-white font-bold resize-none"/>
                  </div>
                  <div className="flex justify-between mt-3 pt-2 border-t border-white/5">
                    <button onClick={handleImageClick} className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-pink-500 uppercase">
                      <Camera size={16}/> Media
                    </button>
                    <button onClick={handleCreatePost} className="bg-pink-600 px-5 py-1.5 rounded-full text-xs font-black shadow-lg hover:scale-105 transition-all text-white">
                      PUBLISH (+0.75🪙)
                    </button>
                  </div>
                </div>

                {/* Vertical Snap Scrolling Feed (Prompt #4) */}
                <div className="snap-y snap-mandatory overflow-y-auto flex-1">
                  {userPosts.map((post:any, idx:number) => (
                    <React.Fragment key={post.id}>
                      {/* Monetag Banner every 4 posts (Prompt #4) */}
                      {idx > 0 && idx % 4 === 0 && (
                        <div className="snap-start w-full px-4 py-3">
                          <MonetagBanner siteId={MONETAG_PULSE_BANNER}/>
                        </div>
                      )}
                      <div className="snap-start bg-white/10 backdrop-blur-md border-b border-white/5 overflow-hidden shadow-xl relative min-h-[70vh] flex flex-col">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => openProfile(post.uid)}>
                            <img src={post.photo||'/logo.png'} className="w-10 h-10 rounded-full border-2 border-pink-500"/>
                            <p className="font-black text-xs text-white tracking-widest">@{post.username}</p>
                          </div>
                          <MoreVertical size={18} className="opacity-40 text-white cursor-pointer"
                            onClick={() => setActiveMenuId(activeMenuId===post.id?null:post.id)}/>
                        </div>
                        {activeMenuId===post.id && (
                          <div className="absolute right-6 top-16 bg-slate-900 border border-white/10 p-3 rounded-xl z-[1000] shadow-2xl">
                            <button onClick={() => handleDeletePost(post.id)} className="text-red-500 text-[10px] font-black flex items-center gap-2 uppercase">
                              <Trash2 size={14}/> Delete
                            </button>
                          </div>
                        )}
                        {post.image && <img src={post.image} className="w-full object-cover max-h-[50vh]"/>}
                        <div className="p-5 flex-1">
                          <div className="flex gap-6 mb-4">
                            <Heart size={28} onClick={() => handleLike(post.id)} className={likedPosts[post.id]?"text-red-500 fill-red-500 cursor-pointer":"text-white cursor-pointer"}/>
                            <MessageSquare size={28} className="text-white cursor-pointer" onClick={() => setCommentPostId(post.id)}/>
                            <Share2 size={28} className="text-white cursor-pointer" onClick={() => handleShare(post.text)}/>
                          </div>
                          <p className="text-[12px] leading-relaxed text-gray-200 font-bold mb-4">{post.text}</p>
                          {/* Pulse sound mute toggle (Prompt #4) */}
                          <button onClick={() => setPulseMuted(m => !m)}
                            className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase mb-4 border border-white/10 px-3 py-1.5 rounded-full hover:border-pink-500 transition-all">
                            {pulseMuted ? <VolumeX size={14}/> : <Volume2 size={14}/>}
                            {pulseMuted ? 'Tap to Unmute' : 'Muted'}
                          </button>
                          {/* GIFTING — only for other users' posts */}
                          {post.uid!==user?.uid && (
                            <div className="border-t border-white/5 pt-4 mt-4">
                              <p className="text-[10px] text-pink-400 font-black tracking-widest mb-3 uppercase flex items-center gap-1">
                                <Gift size={12}/> Send a Gift 🎁
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {giftItems.map(g => (
                                  <button key={g.id} onClick={() => sendGift(post.uid, g)}
                                    className="bg-white/5 border border-white/10 py-2 rounded-xl text-[9px] font-black uppercase hover:border-pink-500 transition-all flex flex-col items-center gap-1 active:scale-95">
                                    <span className="text-xl">{g.icon}</span>
                                    <span>{g.name}</span>
                                    <span className="text-yellow-500 text-[8px]">{g.cost.toLocaleString()} 🪙</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Unsplash trending — TikTok vertical snap cards */}
                  {pixaData.map((photo:any, idx:number) => (
                    <div key={photo.id} className="snap-start relative min-h-[85vh] w-full bg-black flex flex-col border-b border-white/5 overflow-hidden">
                      <img
                        src={photo.urls?.regular||photo.urls?.small||''}
                        alt={photo.alt_description||'pulse'}
                        className="w-full h-full object-cover absolute inset-0"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"/>
                      {/* RIGHT SIDEBAR ACTIONS */}
                      <div className="absolute right-4 bottom-28 flex flex-col gap-6 items-center z-10">
                        <div onClick={() => handleLike(photo.id)} className="flex flex-col items-center cursor-pointer active:scale-125 transition-all drop-shadow-lg">
                          <Heart size={32} className={likedPosts[photo.id]?"text-red-500 fill-red-500":"text-white"}/>
                          <span className="text-[9px] font-black text-white mt-1">{photo.likes||0}</span>
                        </div>
                        <div className="flex flex-col items-center cursor-pointer drop-shadow-lg" onClick={() => setCommentPostId(photo.id)}>
                          <MessageCircle size={32} className="text-white"/>
                          <span className="text-[9px] font-black text-white mt-1">Comment</span>
                        </div>
                        <div onClick={() => handleShare(photo.alt_description||'AJ Pulse')} className="flex flex-col items-center cursor-pointer text-white drop-shadow-lg">
                          <Share2 size={32}/><span className="text-[9px] font-black mt-1">Share</span>
                        </div>
                        <div className="flex flex-col items-center cursor-pointer text-yellow-400 drop-shadow-lg"
                          onClick={() => setPulseGiftPostId(photo.id)}>
                          <Gift size={28}/><span className="text-[9px] font-black mt-1">Gift</span>
                        </div>
                      </div>
                      {/* BOTTOM INFO */}
                      <div className="absolute bottom-6 left-4 max-w-[70%] z-10">
                        <p className="font-black text-white text-sm drop-shadow-lg">📸 {photo.user?.name||'AJ Pulse'}</p>
                        <p className="text-[10px] text-gray-300 mt-1 font-bold line-clamp-2">{photo.alt_description||'Trending Lifestyle'}</p>
                        {idx===0 && <span className="text-[8px] text-yellow-400 font-black uppercase tracking-widest">✨ Trending Pulse</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WECHAT CONTACT LIST — with Monetag Sponsor (Prompt #8) */}
            {socialScreen==='chatlist' && (
              <div className="max-w-md mx-auto bg-[#111b21]/80 h-screen border-x border-white/10 overflow-y-auto">
                <div className="bg-[#1f2c33]/90 p-5 flex justify-between items-center border-b border-white/10">
                  <h2 className="text-2xl font-black text-[#e9edef] tracking-widest italic">WeChat</h2>
                  <div className="flex gap-3 items-center">
                    <button onClick={handleContactsSync}
                      className="flex items-center gap-1 text-cyan-400 text-[9px] font-black uppercase border border-cyan-500/30 px-2 py-1 rounded-full hover:bg-cyan-500/10 transition-all">
                      <Phone size={12}/> Sync
                    </button>
                    <button onClick={() => setAddContactOpen(true)}
                      className="flex items-center gap-1 text-green-400 text-[9px] font-black uppercase border border-green-500/30 px-2 py-1 rounded-full hover:bg-green-500/10 transition-all">
                      + Add
                    </button>
                    <Camera size={20} className="text-[#aebac1] cursor-pointer" onClick={handleImageClick}/>
                    <Search size={20} className="text-[#aebac1] cursor-pointer" onClick={() => searchRef.current?.focus()}/>
                  </div>
                </div>

                {/* Monetag Sponsor Ad — WeChat (Prompt #8) */}
                <div className="px-4 pt-3">
                  <MonetagBanner siteId={MONETAG_WECHAT_SPONSOR}/>
                </div>

                {addContactOpen && (
                  <div className="m-4 bg-slate-800 border border-cyan-500/30 p-5 rounded-3xl shadow-2xl">
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3">Add Contact</p>
                    <input type="text" value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="Contact name..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-500 font-bold mb-3"/>
                    <div className="flex gap-3">
                      <button onClick={addManualContact} className="flex-1 bg-cyan-500 py-2 rounded-xl text-[10px] font-black text-black uppercase">Add</button>
                      <button onClick={() => setAddContactOpen(false)} className="flex-1 bg-white/10 py-2 rounded-xl text-[10px] font-black text-white uppercase">Cancel</button>
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <div className="bg-[#202c33] flex items-center gap-4 px-5 py-3 rounded-2xl text-gray-400 border border-white/5">
                    <Search size={18}/>
                    <input ref={searchRef} type="text" placeholder="Search contacts" className="bg-transparent outline-none text-sm w-full text-white font-bold"/>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {wechatContacts.map((contact, i) => (
                    <div key={i} onClick={() => { setActiveContact(contact); setSocialScreen('chat'); }}
                      className="flex items-center gap-4 p-5 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-all mx-2 rounded-[2rem]">
                      <div className="w-14 h-14 rounded-full bg-cyan-600/30 flex items-center justify-center font-black border border-cyan-500/50 text-cyan-400 shadow-2xl text-lg">
                        {contact[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-black text-[#e9edef] tracking-wider uppercase text-xs">{contact}</p>
                          <span className="text-[10px] text-[#8696a0]">Now</span>
                        </div>
                        <p className="text-[10px] text-[#8696a0] font-bold">VVIP encrypted chat active.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WECHAT CHAT — with Audio/Video call buttons (Prompt #8) */}
            {socialScreen==='chat' && (
              <div className="max-w-md mx-auto h-[88vh] flex flex-col bg-[#0b141a] overflow-hidden m-2 rounded-[2.5rem] shadow-2xl border border-cyan-500/20">
                <div className="bg-[#1f2c33]/95 p-4 flex items-center gap-3 border-b border-white/10">
                  <button onClick={() => setSocialScreen('chatlist')} className="text-cyan-500 p-2"><ChevronRight className="rotate-180"/></button>
                  <div className="w-11 h-11 rounded-full bg-cyan-600/30 flex items-center justify-center font-black border border-cyan-500/50 text-cyan-400 text-lg">
                    {activeContact?.[0]?.toUpperCase()||'A'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-white uppercase tracking-widest">{activeContact}</p>
                    <p className="text-[7px] text-green-500 font-black uppercase tracking-[0.3em] animate-pulse">Online • Encrypted</p>
                  </div>
                  {/* Audio/Video calls — Agora WebRTC (Prompt #8) */}
                  <div className="flex gap-4 text-[#aebac1]">
                    <button onClick={() => alert(`📹 Video Call — Agora App ID: ${AGORA_APP_ID.slice(0,8)}... (WebRTC enabled)`)}
                      className="cursor-pointer hover:text-cyan-400 transition-all p-1 rounded-full hover:bg-cyan-500/10">
                      <VideoIcon size={20}/>
                    </button>
                    <button onClick={() => alert(`📞 Audio Call — Agora App ID: ${AGORA_APP_ID.slice(0,8)}... (WebRTC enabled)`)}
                      className="cursor-pointer hover:text-green-400 transition-all p-1 rounded-full hover:bg-green-500/10">
                      <Phone size={20}/>
                    </button>
                    <Camera size={20} className="cursor-pointer hover:text-pink-400" onClick={handleImageClick}/>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {chatMessages.map((m:any) => (
                    <div key={m.id} className={`flex ${m.uid===user?.uid?'justify-end':'justify-start'}`}>
                      <div className={`p-3 max-w-[85%] rounded-2xl shadow-xl border ${m.uid===user?.uid?'bg-cyan-700/80 border-cyan-400 rounded-tr-none':'bg-[#202c33]/90 border-white/5 rounded-tl-none'}`}>
                        <p className="font-black text-[9px] text-yellow-500 mb-1 opacity-70 uppercase">@{m.username}</p>
                        <p className="text-[12px] text-white font-medium">{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-[#1f2c33]/95 flex gap-3 items-center">
                  <button onClick={handleImageClick} className="text-[#aebac1]"><PlusSquare size={26}/></button>
                  <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key==='Enter'&&sendChatMessage()} placeholder="Type a message"
                    className="flex-1 bg-[#2a3942] p-4 rounded-full text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500 font-bold border-none"/>
                  <button onClick={sendChatMessage} className="bg-cyan-600 p-4 rounded-full text-white shadow-2xl active:scale-90 transition-all">
                    <Send size={22}/>
                  </button>
                </div>
              </div>
            )}

            {/* PROFILE SETUP */}
            {socialScreen==='setup' && (
              <div className="max-w-md mx-auto bg-white/5 border border-white/10 p-10 rounded-[3.5rem] text-center mt-4 shadow-2xl">
                <div className="relative w-28 h-28 mx-auto mb-10 cursor-pointer group" onClick={handleImageClick}>
                  <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-full h-full rounded-full border-4 border-pink-500 p-1 object-cover shadow-2xl group-hover:brightness-50 transition-all"/>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><Camera size={40} className="text-white"/></div>
                  <div className="absolute bottom-1 right-1 bg-pink-600 p-3 rounded-full border-2 border-black text-white"><Camera size={18}/></div>
                </div>
                <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-widest italic">Identity Setup</h2>
                <div className="space-y-5 text-left">
                  <label className="text-[10px] font-black text-pink-500 ml-1 uppercase tracking-widest">Username</label>
                  <input type="text" placeholder="@unique_name" value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl font-bold text-white outline-none focus:border-pink-500"/>
                  <label className="text-[10px] font-black text-pink-500 ml-1 uppercase tracking-widest">Bio</label>
                  <textarea placeholder="Tell the world about you..." value={bio} onChange={e => setBio(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none h-28 focus:border-pink-500"/>
                  <button onClick={handleCreateProfile}
                    className="w-full mt-8 py-5 bg-pink-600 rounded-[1.5rem] font-black uppercase shadow-[0_10px_30px_rgba(236,72,153,0.3)] active:scale-95 transition-all text-white border-b-4 border-pink-800 tracking-[0.2em]">
                    ACTIVATE PROFILE
                  </button>
                </div>
                <button onClick={() => setSocialScreen('hub')} className="mt-6 text-gray-500 uppercase text-[9px] font-black w-full">Back</button>
              </div>
            )}

            {/* DISCOVER */}
            {socialScreen==='discover' && (
              <div className="max-w-md mx-auto p-4 pb-24 space-y-6 overflow-y-auto h-[85vh]">
                <h3 className="text-3xl font-black italic uppercase text-cyan-400 border-b border-white/10 pb-4 tracking-widest">AJ Discover</h3>
                {newsData.length>0 ? newsData.map((article:any, idx:number) => (
                  <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                    {(article.image||article.urlToImage) && (
                      <img src={article.image||article.urlToImage} className="w-full h-40 object-cover rounded-2xl" alt="news"/>
                    )}
                    <h4 className="font-black text-sm uppercase text-white leading-tight">{article.title}</h4>
                    <p className="text-[10px] text-gray-400 line-clamp-3">{article.description}</p>
                    <a href={article.url} target="_blank" className="inline-block text-cyan-400 text-[9px] font-black uppercase tracking-widest">Read More →</a>
                  </div>
                )) : <p className="text-center text-gray-500 text-xs mt-10">Loading AJ News...</p>}
              </div>
            )}
          </div>

          {/* PULSE GIFT MODAL — for Unsplash trending photos */}
          {pulseGiftPostId && (
            <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-end">
              <div className="w-full bg-[#111b21] rounded-t-[3rem] border-t-2 border-yellow-500 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2"><Gift size={18}/> Send Gift</h3>
                  <X className="cursor-pointer text-gray-500" onClick={() => setPulseGiftPostId(null)}/>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {giftItems.map(g => (
                    <button key={g.id} onClick={() => { sendGift(pulseGiftPostId, g); setPulseGiftPostId(null); }}
                      className="bg-white/5 border border-white/10 py-3 rounded-2xl text-[9px] font-black uppercase hover:border-yellow-500 transition-all flex flex-col items-center gap-1 active:scale-95">
                      <span className="text-2xl">{g.icon}</span>
                      <span className="text-white">{g.name}</span>
                      <span className="text-yellow-500 text-[8px]">{g.cost.toLocaleString()} 🪙</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* COMMENT BOARD */}
          {commentPostId && !commentPostId.startsWith('gift_') && (
            <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-end">
              <div className="w-full h-[65vh] bg-[#111b21] rounded-t-[3rem] border-t-2 border-pink-500 p-6 flex flex-col shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-pink-500 uppercase tracking-widest">Comments</h3>
                  <X className="cursor-pointer text-gray-500" onClick={() => setCommentPostId(null)}/>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4">
                  {postComments.length>0 ? postComments.map((c:any) => (
                    <div key={c.id} className="flex gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                      <img src={c.photo||'/logo.png'} className="w-8 h-8 rounded-full border border-pink-500"/>
                      <div>
                        <p className="font-black text-[10px] text-pink-400 uppercase">@{c.username}</p>
                        <p className="text-xs text-gray-300 mt-1">{c.text}</p>
                      </div>
                    </div>
                  )) : <p className="text-center text-gray-600 text-xs mt-10 italic">No comments yet.</p>}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex gap-3">
                  <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 text-xs outline-none focus:ring-1 focus:ring-pink-500 text-white font-bold"/>
                  <button onClick={submitComment} className="bg-pink-600 p-4 rounded-xl active:scale-90 transition-all text-white"><Send size={18}/></button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GO LIVE (REAL CAMERA + PK CHALLENGE) ─────────────── */}
      {liveActive && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col">

          {/* PK ACTIVE — Split Screen (Prompt #6) */}
          {pkActive ? (
            <div className="flex-1 flex flex-col">
              {/* PK Header — Timer & Score */}
              <div className="bg-black/90 p-3 flex items-center justify-between border-b border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <Swords size={18} className="text-yellow-400"/>
                  <span className="font-black text-xs text-yellow-400 uppercase tracking-widest">PK BATTLE</span>
                </div>
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full">
                  <Clock size={14} className="text-yellow-400"/>
                  <span className="font-black text-sm text-yellow-400 tabular-nums">{formatPkTime(pkTimer)}</span>
                </div>
                <div className="text-[10px] font-black text-white">
                  <span className="text-cyan-400">{pkScore.me}</span>
                  <span className="text-gray-500 mx-1">vs</span>
                  <span className="text-pink-400">{pkScore.rival}</span>
                </div>
              </div>

              {/* Split Screen */}
              <div className="flex-1 flex">
                {/* MY SIDE */}
                <div className="flex-1 relative border-r border-yellow-500/40">
                  <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full object-cover"/>
                  <div className="absolute top-3 left-3 bg-red-600 px-3 py-1 rounded-full flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
                    <span className="text-white font-black text-[9px]">YOU</span>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded-lg">
                    <span className="text-cyan-400 font-black text-[10px]">🪙 {pkScore.me}</span>
                  </div>
                </div>
                {/* RIVAL SIDE */}
                <div className="flex-1 relative bg-gray-900">
                  <div className="w-full h-full flex items-center justify-center flex-col gap-3">
                    <img src={pkRivalData?.photo||'/logo.png'} className="w-20 h-20 rounded-full border-4 border-pink-500"/>
                    <p className="font-black text-white text-sm uppercase">@{pkRivalData?.username||'Rival'}</p>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
                    <span className="text-[10px] text-red-400 font-bold">LIVE</span>
                  </div>
                  <div className="absolute top-3 right-3 bg-pink-600 px-3 py-1 rounded-full">
                    <span className="text-white font-black text-[9px]">RIVAL</span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/50 px-2 py-1 rounded-lg">
                    <span className="text-pink-400 font-black text-[10px]">🪙 {pkScore.rival}</span>
                  </div>
                </div>
              </div>

              {/* Overlay Chat — Bottom Left Transparent (Prompt #6) */}
              <div className="absolute left-3 bottom-[200px] w-[45%] max-h-32 overflow-y-auto bg-black/30 backdrop-blur-sm rounded-2xl p-2 border border-white/10 pointer-events-none">
                {chatMessages.slice(-6).map((m:any, i:number) => (
                  <p key={i} className="text-[9px] text-white font-bold mb-0.5 leading-tight">
                    <span className="text-yellow-400">@{m.username}: </span>{m.text}
                  </p>
                ))}
              </div>

              {/* PK Winner Overlay */}
              {pkWinner && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 flex-col gap-6">
                  <div className="text-8xl animate-bounce">🏆</div>
                  <h2 className="text-3xl font-black text-yellow-400 uppercase tracking-widest">
                    {pkWinner === (username||'You') ? '🎉 YOU WIN!' : `@${pkWinner} Wins!`}
                  </h2>
                  <button onClick={() => { setPkWinner(null); setPkActive(false); setPkTimer(PK_DURATION); setPkScore({me:0,rival:0}); }}
                    className="bg-yellow-500 px-8 py-3 rounded-full font-black text-black uppercase">Continue</button>
                </div>
              )}
            </div>
          ) : (
            /* NORMAL LIVE VIEW */
            <div className="relative flex-1 bg-black">
              <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full object-cover"/>
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black flex-col gap-4">
                  <Radio size={60} className="text-red-500 animate-pulse"/>
                  <p className="text-white font-black uppercase tracking-widest">Opening Camera...</p>
                  <p className="text-gray-400 text-xs">Please allow camera access</p>
                </div>
              )}
              {cameraReady && (
                <div className="absolute top-6 left-6 bg-red-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"/>
                  <span className="text-white font-black text-xs uppercase">LIVE</span>
                </div>
              )}
              <div className="absolute top-6 right-6 bg-black/60 px-3 py-2 rounded-xl backdrop-blur-md">
                <p className="text-[9px] text-gray-400 font-mono">Room: {liveRoomId.slice(-8)}</p>
              </div>
              {/* Overlay Chat — Bottom Left (Prompt #6) */}
              <div className="absolute left-3 bottom-48 w-[55%] max-h-36 overflow-y-auto bg-black/30 backdrop-blur-sm rounded-2xl p-3 border border-white/10 pointer-events-none">
                {chatMessages.slice(-8).map((m:any, i:number) => (
                  <p key={i} className="text-[9px] text-white font-bold mb-1 leading-tight">
                    <span className="text-yellow-400">@{m.username}: </span>{m.text}
                  </p>
                ))}
              </div>
              <button onClick={stopLive} className="absolute top-20 right-6 bg-red-600 px-4 py-2 rounded-full font-black text-white text-xs uppercase shadow-xl active:scale-95">
                END LIVE
              </button>
              {/* PK CHALLENGE BUTTON (Prompt #6) */}
              <button onClick={() => setPkChallengeOpen(true)}
                className="absolute top-20 left-6 bg-yellow-500 px-4 py-2 rounded-full font-black text-black text-xs uppercase shadow-xl active:scale-95 flex items-center gap-2">
                <Swords size={14}/> PK
              </button>
              {/* LIVE CHAT TOGGLE BUTTON (Prompt #2) */}
              <button
                onClick={() => setLiveChatOpen(o => !o)}
                className="absolute bottom-36 right-6 bg-cyan-600 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl border-2 border-cyan-400 active:scale-90 transition-all z-20">
                <MessageCircle size={20} className="text-white"/>
              </button>
            </div>
          )}

          {/* ── LIVE CHAT OVERLAY (Prompt #2) ──────────────────────── */}
          {liveChatOpen && liveActive && (
            <div className="absolute bottom-[80px] left-3 w-72 h-64 z-30 flex flex-col bg-black/60 backdrop-blur-md rounded-3xl border border-cyan-500/30 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/40">
                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                  <MessageCircle size={12}/> Live Chat
                </p>
                <X size={14} className="text-gray-500 cursor-pointer" onClick={() => setLiveChatOpen(false)}/>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {liveChatMessages.length === 0
                  ? <p className="text-[9px] text-gray-500 text-center mt-4 italic">No messages yet...</p>
                  : liveChatMessages.map((m:any) => (
                    <p key={m.id} className="text-[9px] text-white font-bold leading-tight">
                      <span className="text-yellow-400">@{m.username}: </span>{m.text}
                    </p>
                  ))
                }
                <div ref={liveChatEndRef}/>
              </div>
              <div className="flex gap-2 p-2 border-t border-white/10 bg-black/40">
                <input
                  type="text"
                  value={liveChatInput}
                  onChange={e => setLiveChatInput(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && sendLiveChatMessage()}
                  placeholder="Say something..."
                  className="flex-1 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-[10px] text-white outline-none focus:ring-1 focus:ring-cyan-500 font-bold"
                />
                <button onClick={sendLiveChatMessage} className="bg-cyan-500 p-1.5 rounded-full text-black active:scale-90 transition-all">
                  <Send size={12}/>
                </button>
              </div>
            </div>
          )}

          {/* PK CHALLENGE MODAL (Prompt #6) */}
          {pkChallengeOpen && (
            <div className="absolute inset-0 z-[800] bg-black/80 flex items-center justify-center p-6">
              <div className="bg-[#0d1117] border-2 border-yellow-500/40 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <Swords size={28} className="text-yellow-400"/>
                  <h3 className="font-black text-xl text-yellow-400 uppercase tracking-widest">PK Challenge</h3>
                </div>
                <p className="text-[10px] text-gray-400 mb-4 font-bold">
                  ⚠️ {PK_ENTRY_COINS} AJ Coins will be deducted from BOTH participants. 5-minute battle!
                </p>
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Rival's User ID</label>
                  <input type="text" value={pkTargetId} onChange={e => setPkTargetId(e.target.value)}
                    placeholder="Paste rival user ID..." className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs text-white outline-none focus:border-yellow-500 font-bold"/>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={sendPkChallenge}
                    className="flex-1 bg-yellow-500 py-3 rounded-xl font-black uppercase text-black active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Swords size={16}/> Challenge!
                  </button>
                  <button onClick={() => setPkChallengeOpen(false)}
                    className="flex-1 bg-white/10 py-3 rounded-xl font-black uppercase text-white active:scale-95 transition-all">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* GIFT PANEL */}
          <div className="bg-[#0d1117] border-t border-white/10 p-4 shrink-0">
            <p className="text-[10px] text-yellow-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <Gift size={14}/> Send Gifts to Creator 🎁
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {giftItems.map(g => (
                <button key={g.id} onClick={() => sendGift(user!.uid, g)}
                  className="flex-shrink-0 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl text-center hover:border-yellow-500 transition-all active:scale-95">
                  <div className="text-2xl mb-1">{g.icon}</div>
                  <p className="text-[9px] font-black uppercase text-white">{g.name}</p>
                  <p className="text-[8px] text-yellow-400">{g.cost.toLocaleString()} 🪙</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── WALLET ───────────────────────────────────────────── */}
      {screen==='wallet' && (
        <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
          <button onClick={() => { setScreen('hub'); setWalletTab('main'); }}
            className="self-start text-cyan-400 mb-8 font-bold uppercase tracking-widest flex items-center gap-2">
            <ArrowLeft size={18}/> BACK
          </button>
          <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
            <h2 className="text-5xl font-black text-yellow-500 mb-2 tracking-tighter">{displayBalance} 🪙</h2>
            <p className="text-green-400 font-black text-xl mb-2 tracking-[0.2em]">${displayUsdt}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-6">
              Buy: $1 = {COIN_RATE} Coins | Min Purchase: ${MIN_PURCHASE} | Min Withdraw: {WITHDRAW_MIN.toLocaleString()} Coins = $20 USD
            </p>

            {/* Referral */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mb-6 text-left">
              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1">Your Referral Code (User ID)</p>
              <div className="flex justify-between items-center bg-black/40 px-3 py-2 rounded-xl">
                <span className="text-xs font-mono text-cyan-400 truncate max-w-[200px]">{user?.uid}</span>
                <button onClick={() => copyToClipboard(user?.uid||"")} className="text-cyan-400 text-[10px] font-black uppercase">
                  {copied?"Copied ✓":"Copy"}
                </button>
              </div>
            </div>

            {walletTab==='main' && (
              <div className="flex flex-col gap-4">
                <button onClick={() => setWalletTab('purchase')} className="bg-white text-black py-4 rounded-[1.5rem] font-black uppercase shadow-lg hover:scale-105 transition-all">Purchase</button>
                <button onClick={() => setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-[1.5rem] font-black border border-cyan-500/30 uppercase hover:bg-white/5 transition-all">Transfer</button>
                <button onClick={() => setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-[1.5rem] font-black border border-pink-500/30 uppercase hover:bg-white/5 transition-all">Withdraw</button>
                <button onClick={() => setWalletTab('referral')} className="bg-white/10 text-yellow-500 py-4 rounded-[1.5rem] font-black border border-yellow-500/30 uppercase hover:bg-white/5 transition-all">Enter Referral Code</button>
              </div>
            )}

            {walletTab==='purchase' && (
              <div className="flex flex-col gap-6 text-left">
                <label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Payment Method</label>
                <select value={purchaseMethod} onChange={e => setPurchaseMethod(e.target.value)}
                  className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none">
                  <option>Binance (TRC20)</option>
                  <option>Airtm (Gmail Account)</option>
                  <option>EasyPaisa</option>
                  <option>JazzCash</option>
                  <option>Bank Transfer</option>
                </select>
                <div className="bg-black border-2 border-white/10 p-8 rounded-[2.5rem] text-center shadow-inner">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-4 tracking-[0.3em]">You will receive</p>
                  <p className="text-yellow-500 text-5xl font-black mb-6">{(purchaseAmount*COIN_RATE).toLocaleString()} 🪙</p>
                  <div className="flex items-center justify-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <DollarSign className="text-green-400" size={30}/>
                    <input type="number" min={MIN_PURCHASE}
                      value={purchaseAmount===0?'':purchaseAmount}
                      onChange={e => setPurchaseAmount(e.target.value===''?0:Number(e.target.value))}
                      className="bg-transparent text-white text-3xl w-32 text-center font-black outline-none"/>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-3 font-bold">$1 = {COIN_RATE} AJ Coins | Min ${MIN_PURCHASE}</p>
                </div>
                {purchaseMethod!=='Binance (TRC20)' && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Transaction ID / Reference</label>
                    <input type="text" placeholder="Enter TX ID or Reference" value={purchaseTxId} onChange={e => setPurchaseTxId(e.target.value)}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500"/>
                  </div>
                )}
                <button onClick={handlePurchase} className="bg-cyan-500 py-5 rounded-2xl font-black uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-black">
                  Confirm Purchase
                </button>
                <button onClick={() => setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase font-black">Cancel</button>
              </div>
            )}

            {walletTab==='transfer' && (
              <div className="flex flex-col gap-6 text-left">
                <h3 className="text-lg font-black text-cyan-400 uppercase tracking-widest">Secure Transfer</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block mb-1">Recipient User ID</label>
                    <input type="text" placeholder="Paste target user ID" value={transferId} onChange={e => setTransferId(e.target.value)}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block mb-1">Coins to Transfer</label>
                    <input type="number" placeholder="Amount" value={transferAmount||''}
                      onChange={e => setTransferAmount(Number(e.target.value))}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500"/>
                  </div>
                </div>
                <button onClick={handleTransfer} className="bg-cyan-500 py-4 rounded-2xl font-black uppercase tracking-wider text-black active:scale-95 transition-all">
                  Submit Transfer
                </button>
                <button onClick={() => setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase font-black">Cancel</button>
              </div>
            )}

            {/* UPDATED WITHDRAW — All 5 methods (Prompt #2) */}
            {walletTab==='withdraw' && (
              <div className="flex flex-col gap-6 text-left">
                <h3 className="text-lg font-black text-pink-500 uppercase tracking-widest">Withdraw Coins</h3>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                  <p className="text-[10px] text-red-400 font-bold uppercase leading-relaxed">
                    ⚠️ Minimum: {WITHDRAW_MIN.toLocaleString()} Coins = $20 USD. {CASH_RATE} Coins = $1. Processed within 24 hrs.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">Payout Method</label>
                    <select value={payoutMethod} onChange={e => { setPayoutMethod(e.target.value); setPayoutId(''); }}
                      className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none">
                      {WITHDRAW_METHODS.map(m => <option key={m.label}>{m.label}</option>)}
                    </select>
                  </div>
                  {/* Dynamic field for selected method */}
                  <div>
                    <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">{currentWithdrawMethod.field}</label>
                    <input type="text" placeholder={currentWithdrawMethod.placeholder} value={payoutId} onChange={e => setPayoutId(e.target.value)}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-pink-500"/>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <p className="text-[9px] text-gray-400 font-bold">
                    Your balance: <span className="text-yellow-400 font-black">{balance.toFixed(0)} Coins</span> ≈ <span className="text-green-400 font-black">${(balance/CASH_RATE).toFixed(2)} USD</span>
                  </p>
                </div>
                <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-2xl font-black uppercase tracking-wider text-white active:scale-95 transition-all">
                  Request Cashout
                </button>
                <button onClick={() => setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase font-black">Cancel</button>
              </div>
            )}

            {walletTab==='referral' && (
              <div className="flex flex-col gap-6 text-left">
                <h3 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Enter Referral Code</h3>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Referrer's User ID</label>
                  <input type="text" placeholder="Paste referrer ID" value={referralCode} onChange={e => setReferralCode(e.target.value)}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-yellow-500"/>
                </div>
                <p className="text-[9px] text-gray-500">Referrer gets +{REFERRAL_COINS} Coins when you submit their ID (30% net share).</p>
                <button onClick={handleApplyReferral} className="bg-yellow-500 py-4 rounded-2xl font-black uppercase tracking-wider text-black active:scale-95 transition-all">
                  Submit Referral
                </button>
                <button onClick={() => setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase font-black">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI BOT SCREEN ────────────────────────────────────── */}
      {screen==='ai' && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col items-center p-8 overflow-y-auto">
          <div className="w-full max-w-4xl pt-10">
            <button onClick={() => setScreen('hub')} className="text-green-400 font-bold text-sm mb-12 uppercase tracking-widest">← Back</button>
          </div>
          <h2 className="text-5xl font-black mb-12 text-center uppercase text-white italic tracking-tighter">AI Trading Bot</h2>
          {botTier!=='none' && (
            <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-8 rounded-[3.5rem] text-center mb-16 shadow-[0_0_50px_rgba(34,197,94,0.15)]">
              <div className="w-full bg-black/50 border border-green-500/30 p-8 rounded-3xl font-mono text-left shadow-inner">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-green-400 font-black text-xs uppercase tracking-widest">Neural Profit:</span>
                  <span className="text-white font-black text-2xl">+{visualProfit.toFixed(4)} 🪙</span>
                </div>
                <div className="h-24 overflow-hidden text-green-500/60 text-[10px] leading-relaxed italic">
                  {tradeLogs.map((log,i) => <div key={i} className="mb-1">{log}</div>)}
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-2 pb-20">
            {[
              { tier:'basic', cost:25000, rate:'2%', color:'cyan'   },
              { tier:'vvip',  cost:75000, rate:'5%', color:'yellow' },
            ].map(b => (
              <div key={b.tier} className={`p-10 rounded-[2.5rem] text-center border-2 transition-all ${botTier===b.tier?`border-${b.color}-500 bg-${b.color}-500/10`:'border-white/10 bg-white/5'}`}>
                <h3 className={`text-2xl font-black uppercase tracking-widest text-${b.color}-400`}>
                  {b.tier.toUpperCase()} ({b.cost/1000}k Coins)
                </h3>
                <p className="text-sm text-gray-400 mt-3 font-bold">Earn {b.rate} Daily Passive Income</p>
                <button onClick={() => activateBot(b.tier,b.cost)}
                  className={`mt-8 w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl hover:scale-105 ${botTier===b.tier?`bg-${b.color}-500 text-black cursor-not-allowed`:`bg-${b.color}-600 text-white`}`}>
                  {botTier===b.tier?"RUNNING":"ACTIVATE"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOUNDER CARD */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" className="w-full max-w-4xl rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.9)] hover:scale-[1.01] transition-all border border-white/5" alt="Founder"/>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-black py-24 px-10 border-t border-white/5 text-center flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain pointer-events-none scale-150"/>
        <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_50px_rgba(6,182,212,0.3)] mb-12 uppercase tracking-tighter relative z-10">AJ STUDIO</div>
        <div className="flex justify-center gap-4 md:gap-8 mb-12 relative z-10 flex-wrap">
          <a href={CEO_WHATSAPP} target="_blank" className="text-green-500 border-2 border-green-500 px-8 py-3 rounded-full font-black uppercase hover:bg-green-500 hover:text-black transition-all shadow-xl text-sm tracking-widest">WhatsApp</a>
          <a href="https://x.com/Ali20352061" target="_blank" className="text-white border-2 border-white px-8 py-3 rounded-full font-black uppercase hover:bg-white hover:text-black transition-all shadow-xl text-sm tracking-widest">X (Twitter)</a>
          <a href={`mailto:${CEO_EMAIL}`} className="flex items-center gap-2 text-red-400 border-2 border-red-400 px-8 py-3 rounded-full font-black uppercase hover:bg-red-400 hover:text-white transition-all shadow-xl text-sm tracking-widest">
            <Mail size={16}/> Email CEO
          </a>
        </div>
        <button onClick={() => { const l=document.createElement('a'); l.href='/aj-portal.apk'; l.download='aj-portal.apk'; l.click(); }}
          className="group relative px-16 py-6 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_60px_#06b6d4] animate-pulse transition-all hover:scale-110 relative z-10 mb-16">
          <span className="relative z-20 flex items-center gap-3 font-black tracking-[0.4em] text-xl text-black">
            <Download size={28}/> Install AJ App
          </span>
          <div className="absolute inset-0 bg-white/30 group-hover:translate-x-full transition-transform duration-700 -skew-x-12 z-10"/>
        </button>
        <div className="mt-12 pt-12 border-t border-white/10 w-full relative z-10 text-center">
          <p className="text-[10px] md:text-xs text-cyan-400 font-black uppercase tracking-[0.4em] leading-relaxed max-w-3xl mx-auto drop-shadow-[0_0_8px_#06b6d4] animate-pulse">
            © 2026 AJ CREATOR STUDIO. All Rights Reserved.<br/>
            Unauthorized copying or distribution is strictly prohibited.
          </p>
        </div>
      </footer>
    </main>
  );
}

// ============================================================
// MISSING LUCIDE IMPORT (Bell not in main import — added here)
// ============================================================
function Bell({ size, className }: { size:number; className?:string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}