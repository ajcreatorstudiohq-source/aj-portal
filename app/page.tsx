"use client";
import Script from 'next/script';
import React, { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================================
// ZEGOCLOUD CONFIGURATION (Updated per requirements)
// ============================================================
const ZEGO_APP_ID = 242898579;
const ZEGO_APP_SIGN = "130ff078a6687c7cba1da329dbacdfbc30ccbe5db976b9118a8108848f2195f17d";

// ── Firebase inline config ──────────────────────────────────
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, onAuthStateChanged, signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc, setDoc, onSnapshot, updateDoc, increment, collection,
  addDoc, getDoc, serverTimestamp, query, orderBy, limit, deleteDoc, getDocs
} from 'firebase/firestore';
import {
  getDatabase, ref, onDisconnect, set
} from 'firebase/database';
import {
  getMessaging, getToken, onMessage
} from 'firebase/messaging';
import {
  MessageCircle, Trophy, Zap, Bot, LogOut, ChevronRight,
  Send, X, Download, Video, Users, Heart, MessageSquare, Camera,
  Settings, Edit3, Mail, DollarSign, Share2, Music, PlusSquare,
  MoreVertical, Search, Phone, Video as VideoIcon, ArrowLeft, Trash2,
  Gift, Radio, UserPlus, UserCheck, Grid, Film, Volume2, VolumeX, Swords, Clock
} from 'lucide-react';

// ── Firebase config ──────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDp2od-lrfAhEHV5oAIqBW5rWjaRbnAdFM",
  authDomain:        "aj-super-portal.firebaseapp.com",
  databaseURL:       "https://aj-super-portal-default-rtdb.firebaseio.com",
  projectId:         "aj-super-portal",
  storageBucket:     "aj-super-portal.appspot.com",
  messagingSenderId: "288191292906",
  appId:             "1:288191292906:web:bc31cb072948533f88fe93",
  measurementId:     "G-8WYD1ZB96D"
};

const app            = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth           = getAuth(app);
const db             = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ============================================================
// API KEYS & CONFIG
// ============================================================
const UNSPLASH_ACCESS_KEY      = "W4x76VphkyY9fzP3DbJPfXLhdD6x063gW--Voifn_UE";
const YOUTUBE_API_KEY          = "AIzaSyD9vR3hNLt7pBNlm6PMaZWbJOB9QGcrD1Y";
const NOWPAYMENTS_API_KEY      = "3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7";
const CLOUDINARY_CLOUD_NAME    = "atm28akz";
const CLOUDINARY_UPLOAD_PRESET = "aj_portal";
const CEO_EMAIL                = "ajcreatorstudio.hq@gmail.com";
const CEO_WHATSAPP             = "https://wa.me/96878994093";
const AGORA_APP_ID             = "7863c5369b3648bf931893a52ebaa6db";
const AGORA_APP_CERTIFICATE    = "dc66528c5a5646da8e3ce5d2426759af";
const VAPID_KEY                = "BMaPMtGtA2VtDsj_JH_yv5dOv66Mpguf9v4TkqY96dcS-gwqgs-r5OlqRJQmZbNkaj-7_iMFbGGN0Qc4xH0qvKg";
const MONETAG_PULSE_BANNER     = 11337197;
const PULSE_AD_VIDEO_ID        = 'aqz-KE-bpKQ';
const NOWPAYMENTS_IPN_SECRET   = '9eeeBo6K1ljJSQtUCb1Up88Gv6n1AreU';
const MONETAG_WECHAT_SPONSOR   = 11337185;

// ============================================================
// ECONOMY RATES
// ============================================================
const COIN_RATE      = 100;
const CASH_RATE      = 500;
const MIN_PURCHASE   = 20;
const WITHDRAW_MIN   = 10000;   // Minimum 10,000 AJ Coins = $20
const REFERRAL_COINS = 50;

const USER_EARN_SHARE  = 0.30;
const ADMIN_EARN_SHARE = 0.70;

const PK_ENTRY_COINS = 100;
const PK_DURATION    = 300;

// ============================================================
// ZEGOCLOUD CALL HANDLER
// ============================================================
const handleStartZegoCall = (
  roomID: string,
  currentUserId: string,
  currentUserName: string,
  mode: 'video' | 'audio' = 'video'
) => {
  if (typeof window === 'undefined' || !(window as any).ZegoUIKitPrebuilt) return;
  try {
    const kitToken = (window as any).ZegoUIKitPrebuilt.generateKitTokenForTest(
      ZEGO_APP_ID,
      ZEGO_APP_SIGN,
      roomID,
      currentUserId,
      currentUserName
    );
    const zp = (window as any).ZegoUIKitPrebuilt.create(kitToken);
    const container = document.querySelector('#zego-call-container');
    if (!container) return;
    zp.joinRoom({
      container,
      scenario: {
        mode: mode === 'video'
          ? (window as any).ZegoUIKitPrebuilt.OneONoneCall
          : (window as any).ZegoUIKitPrebuilt.OneONoneCall,
      },
      showPreJoinView: false,
      turnOnCameraWhenJoining: mode === 'video',
      turnOnMicrophoneWhenJoining: true,
    });
  } catch (e) {
    console.error('handleStartZegoCall', e);
  }
};

const handleStartLiveOrCall = (roomID: string, currentUserId: string, currentUserName: string) => {
  if (typeof window === 'undefined' || !(window as any).ZegoUIKitPrebuilt) return;
  try {
    const kitToken = (window as any).ZegoUIKitPrebuilt.generateKitTokenForTest(
      ZEGO_APP_ID,
      ZEGO_APP_SIGN,
      roomID,
      currentUserId,
      currentUserName
    );
    const zp = (window as any).ZegoUIKitPrebuilt.create(kitToken);
    const container = document.querySelector('#video-container');
    if (!container) return;
    zp.joinRoom({
      container,
      scenario: { mode: (window as any).ZegoUIKitPrebuilt.LiveStreaming },
    });
  } catch (e) {
    console.error('handleStartLiveOrCall', e);
  }
};

// ============================================================
// GIFT ITEMS
// ============================================================
const giftItems = [
  { id:1, name:'Coffee',      cost:500,   icon:'☕'  },
  { id:2, name:'Pizza Party', cost:1000,  icon:'🍕'  },
  { id:3, name:'Mega Heart',  cost:2500,  icon:'❤️'  },
  { id:4, name:'Super Car',   cost:5000,  icon:'🏎️'  },
  { id:5, name:'Private Jet', cost:8000,  icon:'🛩️'  },
  { id:6, name:'AJ Mansion',  cost:10000, icon:'🏰'  },
];

const WITHDRAW_METHODS = [
  { label: 'EasyPaisa',          field: 'Mobile Number',    placeholder: '03XX-XXXXXXX',             type:'simple' },
  { label: 'JazzCash',           field: 'Mobile Number',    placeholder: '03XX-XXXXXXX',             type:'simple' },
  { label: 'Binance (USDT BSC)', field: 'USDT BSC Address', placeholder: '0x... BSC wallet address', type:'simple' },
  { label: 'AirTM',              field: 'AirTM Email',      placeholder: 'your@email.com',           type:'simple' },
];

// ============================================================
// CLOUDINARY UPLOADER
// ============================================================
const uploadToCloudinary = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const isVideo = file.type.startsWith('video/');
  const endpoint = isVideo
    ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`
    : `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload?f_auto=true&q_auto=true`;
  try {
    const res  = await fetch(endpoint, { method: 'POST', body: fd });
    const data = await res.json();
    return data.secure_url || "";
  } catch { return ""; }
};

// ============================================================
// PRESENCE + FCM HELPERS
// ============================================================
const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
};

const registerFcmToken = async (uid: string) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (token) {
      await updateDoc(doc(db, 'users', uid), { fcmToken: token });
    }
  } catch (e) {
    console.error('registerFcmToken', e);
  }
};

const setUserOnlinePresence = async (currentUser: any) => {
  if (typeof window === 'undefined' || !currentUser?.uid) return;
  try {
    const rtdb = getDatabase(app);
    const presenceRef = ref(rtdb, `presence/${currentUser.uid}`);
    const presenceData = {
      state: 'online',
      uid: currentUser.uid,
      username: currentUser.displayName || 'AJ Member',
      lastChanged: Date.now(),
    };
    await set(presenceRef, presenceData);
    onDisconnect(presenceRef).set({ ...presenceData, state: 'offline', lastChanged: Date.now() });
    await updateDoc(doc(db, 'users', currentUser.uid), { status: 'online' });
    registerFcmToken(currentUser.uid);
  } catch (e) {
    console.error('setUserOnlinePresence', e);
  }
};

const setUserOfflineStatus = async (uid: string | null) => {
  if (!uid) return;
  try {
    await updateDoc(doc(db, 'users', uid), { status: 'offline' });
  } catch (e) {
    console.error('setUserOfflineStatus', e);
  }
};

const setupForegroundNotificationListener = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || 'AJ Super Portal';
      const body  = payload.notification?.body  || '';
      if (Notification.permission === 'granted') new Notification(title, { body });
    });
  } catch (e) {
    console.error('setupForegroundNotificationListener', e);
  }
};

// ============================================================
// formatViews — 1k/2k/1.5M view counter
// ============================================================
const formatViews = (v: number): string => {
  if (!v || v <= 0) return '0';
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000)    return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(v);
};

// ============================================================
// MONETAG BANNER COMPONENT — Real injection
// ============================================================
function MonetagBanner({ siteId }: { siteId: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    try {
      const s = document.createElement('script');
      s.async = true;
      s.dataset.zone = String(siteId);
      s.src = siteId === 11337197 ? 'https://nap5k.com' : 'https://n6wxm.com';
      containerRef.current.appendChild(s);
    } catch {}
  }, [siteId]);
  return (
    <div ref={containerRef} className="w-full min-h-[60px] bg-white/5 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-[9px] text-gray-500 uppercase tracking-widest font-black overflow-hidden">
      <span className="opacity-40">📢 Sponsored</span>
    </div>
  );
}

// ============================================================
// VVIP NEON GLASSMORPHISM ALERT MODAL
// ============================================================
function VVIPAlert({ msg, icon, onClose }: { msg: string; icon?: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center pb-12 px-4 pointer-events-none"
      style={{ backdropFilter:'blur(3px)' }}
    >
      <div
        className="pointer-events-auto w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(236,72,153,0.5),0_0_40px_rgba(34,211,238,0.25)]"
        style={{
          background: 'linear-gradient(135deg,rgba(5,5,5,0.97) 0%,rgba(20,5,35,0.97) 100%)',
          border: '1px solid rgba(236,72,153,0.4)',
        }}
      >
        <div className="h-[2px] w-full bg-gradient-to-r from-pink-500 via-cyan-400 to-purple-500"/>
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          {icon && (
            <div className="text-5xl leading-none" style={{ filter:'drop-shadow(0 0 18px rgba(236,72,153,0.9))' }}>
              {icon}
            </div>
          )}
          <div className="w-20 h-[1.5px] bg-gradient-to-r from-pink-500 via-cyan-400 to-purple-500 rounded-full opacity-80"/>
          <p className="text-white font-black text-sm leading-relaxed whitespace-pre-wrap tracking-wide">{msg}</p>
          <button
            onClick={onClose}
            className="mt-1 px-8 py-2.5 rounded-full text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-[0_0_22px_rgba(236,72,153,0.55)]"
            style={{ background: 'linear-gradient(135deg,#ec4899 0%,#8b5cf6 100%)' }}
          >
            OK ✓
          </button>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-purple-500/40 via-pink-500/40 to-cyan-400/40"/>
      </div>
    </div>
  );
}

// ============================================================
// MONETAG VIDEO AD COMPONENT — YouTube embed
// ============================================================
const AJ_AD_VIDEO_ID = 'aqz-KE-bpKQ';

function MonetagVideoAd({ publisherId }: { publisherId: number }) {
  const [adMuted, setAdMuted] = React.useState(true);
  const adSrc = `https://www.youtube-nocookie.com/embed/${AJ_AD_VIDEO_ID}?autoplay=1&mute=${adMuted?1:0}&loop=1&playlist=${AJ_AD_VIDEO_ID}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3`;
  return (
    <div className="absolute inset-0 w-full h-full bg-[#050505] overflow-hidden">
      <iframe
        src={adSrc}
        className="absolute inset-0 w-full h-full"
        style={{ transform:'scale(1.15)', transformOrigin:'center center', pointerEvents:'auto' }}
        allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        frameBorder="0"
        title="Sponsored Ad"
      />
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <span className="bg-pink-600/90 backdrop-blur-sm text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-[0_0_14px_rgba(236,72,153,0.7)]">
          📢 Sponsored
        </span>
      </div>
      <button
        onClick={() => setAdMuted(m => !m)}
        className="absolute bottom-6 right-4 z-20 bg-[#050505]/70 backdrop-blur-sm border border-white/20 rounded-full p-2 text-white active:scale-90 transition-all"
      >
        {adMuted ? <VolumeX size={16} className="text-red-400"/> : <Volume2 size={16} className="text-green-400"/>}
      </button>
      <div className="absolute bottom-6 left-4 z-20 pointer-events-none">
        <span className="bg-[#050505]/60 backdrop-blur-sm text-gray-400 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
          Ad · Scroll to skip
        </span>
      </div>
    </div>
  );
}

// ============================================================
// CINEMATIC GIFT OVERLAY
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
        <p className="text-2xl font-black text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text uppercase tracking-widest drop-shadow-[0_0_20px_gold]">{gift.name}!</p>
        <p className="text-sm text-white font-bold opacity-80">from @{sender}</p>
        <div className="flex gap-4 text-4xl">
          <span className="animate-spin">✨</span>
          <span className="animate-bounce" style={{animationDelay:'0.2s'}}>🎊</span>
          <span className="animate-spin" style={{animationDelay:'0.4s'}}>✨</span>
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 border-8 border-yellow-400/30 rounded-full m-8 animate-ping"/>
        <div className="absolute inset-0 border-4 border-yellow-400/20 rounded-full m-16 animate-ping" style={{animationDelay:'0.5s'}}/>
      </div>
    </div>
  );
}

// ============================================================
// INCOMING CALL OVERLAY (ZegoCloud)
// ============================================================
function IncomingCallOverlay({
  callerName, callerPhoto, callType,
  onAccept, onDecline
}: {
  callerName: string; callerPhoto: string; callType: 'video'|'audio';
  onAccept: () => void; onDecline: () => void;
}) {
  // Ringtone via Web Audio API
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let osc: OscillatorNode | null = null;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ring = () => {
        if (!ctx) return;
        osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      };
      ring();
      const iv = setInterval(ring, 1200);
      return () => { clearInterval(iv); ctx?.close(); };
    } catch { return () => {}; }
  }, []);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-[#0a0a1a] border border-cyan-500/40 rounded-[2.5rem] p-8 w-80 flex flex-col items-center gap-5 shadow-[0_0_60px_rgba(6,182,212,0.3)]">
        <div className="w-20 h-20 rounded-full border-4 border-cyan-500 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.5)]">
          <img src={callerPhoto || '/logo.png'} className="w-full h-full object-cover"/>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest animate-pulse">
            Incoming {callType === 'video' ? '📹 Video' : '📞 Audio'} Call
          </p>
          <p className="text-white font-black text-lg mt-1">@{callerName}</p>
        </div>
        <div className="flex gap-6">
          <button
            onClick={onDecline}
            className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-90 transition-all"
          >
            <Phone size={24} className="text-white rotate-[135deg]"/>
          </button>
          <button
            onClick={onAccept}
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.5)] active:scale-90 transition-all"
          >
            {callType === 'video' ? <VideoIcon size={24} className="text-white"/> : <Phone size={24} className="text-white"/>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================
export function AJSuperPortal() {

  // ── SCREENS
  const [screen,       setScreen]       = useState('splash');
  const [walletTab,    setWalletTab]    = useState('main');
  const [socialScreen, setSocialScreen] = useState('hub');
  const [selectedGame, setSelectedGame] = useState<string|null>(null);

  // ── AUTH
  const [user,     setUser]     = useState<any>(null);
  const [balance,  setBalance]  = useState(0);
  const [botTier,  setBotTier]  = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading,  setLoading]  = useState(0);

  // ── SOCIAL PROFILE
  const [hasSocialProfile, setHasSocialProfile] = useState(false);
  const [username,    setUsername]    = useState('');
  const [bio,         setBio]         = useState('');
  const [tempPhoto,   setTempPhoto]   = useState('');
  const [pendingMode, setPendingMode] = useState('');

  // ── CONTENT
  const [pixaVideos, setPixaVideos] = useState<any[]>([]);
  const [pixaData,   setPixaData]   = useState<any[]>([]);
  const [chatMessages,  setChatMessages]  = useState<any[]>([]);
  const [userPosts,     setUserPosts]     = useState<any[]>([]);
  const [pulsePosts,    setPulsePosts]    = useState<any[]>([]);
  const [postText,      setPostText]      = useState('');
  const [newMessage,    setNewMessage]    = useState('');
  const [activeContact, setActiveContact] = useState<string|null>(null);

  // ── INTERACTIONS
  const [likedPosts,    setLikedPosts]    = useState<any>({});
  const [activeMenuId,  setActiveMenuId]  = useState<string|null>(null);
  const [vvipAlert,     setVvipAlert]     = useState<{msg:string,icon?:string}|null>(null);
  const [editPostId,    setEditPostId]    = useState<string|null>(null);
  const [editPostText,  setEditPostText]  = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs,    setShowNotifs]    = useState(false);
  const [isMutualFriend,setIsMutualFriend]= useState(false);
  const [commentPostId, setCommentPostId] = useState<string|null>(null);
  const [postComments,  setPostComments]  = useState<any[]>([]);
  const [newComment,    setNewComment]    = useState('');
  const [selectedSound,     setSelectedSound]     = useState<string|null>(null);
  const [tiktokAudioFile,   setTiktokAudioFile]   = useState<File|null>(null);
  const [tiktokPostIsVideo, setTiktokPostIsVideo] = useState(false);
  const [pulsePostIsVideo,  setPulsePostIsVideo]  = useState(false);
  const [copied,        setCopied]        = useState(false);

  // ── TIKREELS ADVANCED EDITOR STATE
  const [tikEditorFilter,      setTikEditorFilter]      = useState('none');
  const [tikEditorTextOverlay, setTikEditorTextOverlay] = useState('');
  const [tikEditorShowMusic,   setTikEditorShowMusic]   = useState(false);
  const AJ_SOUNDS = [
    { id:'s1', label:'AJ Studio Sound', url:'' },
    { id:'s2', label:'Trending Beat',   url:'' },
    { id:'s3', label:'Chill Vibes',     url:'' },
    { id:'s4', label:'Epic Drop',       url:'' },
  ];
  const CSS_FILTERS: {label:string; value:string}[] = [
    { label:'None',      value:'none' },
    { label:'Vivid',     value:'saturate(1.8) contrast(1.1)' },
    { label:'Vintage',   value:'sepia(0.6) contrast(1.1) brightness(0.9)' },
    { label:'B&W',       value:'grayscale(1)' },
    { label:'Cool',      value:'hue-rotate(180deg) saturate(1.3)' },
    { label:'Warm',      value:'sepia(0.3) saturate(1.5) brightness(1.05)' },
    { label:'Drama',     value:'contrast(1.4) brightness(0.85) saturate(1.2)' },
  ];

  // ── AI
  const [visualProfit, setVisualProfit] = useState(0);
  const [tradeLogs,    setTradeLogs]    = useState([
    "Initialising Neural Link...",
    "Analysing Market Volatility...",
    "Connecting to AJ liquidity pool..."
  ]);
  const [botOpen,     setBotOpen]     = useState(false);
  const [botMessages, setBotMessages] = useState([{
    from:'bot',
    text:`Hi! I am AJ AI Assistant 🤖. I'm here to provide A to Z details about AJ Super Portal — Coins, TikReels, Pulse, Live, Games, Wallet, Withdrawals & more. How can I assist you today?`
  }]);
  const [botInput,       setBotInput]       = useState('');
  const lastBotTopicRef  = useRef<string>('greeting');
  const isFirstBotMsg    = useRef<boolean>(true);

  // ── WALLET INPUTS
  const [purchaseAmount, setPurchaseAmount] = useState(20);
  const [purchaseMethod, setPurchaseMethod] = useState('Binance USDT (BSC)');
  const [purchaseTxId,   setPurchaseTxId]   = useState('');
  const [transferId,     setTransferId]     = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod,   setPayoutMethod]   = useState(WITHDRAW_METHODS[0].label);
  const [cardHolder,  setCardHolder]  = useState('');
  const [cardNumber,  setCardNumber]  = useState('');
  const [cardExpiry,  setCardExpiry]  = useState('');
  const [cardCVV,     setCardCVV]     = useState('');
  const [cardBank,    setCardBank]    = useState('');
  const [cardCountry, setCardCountry] = useState('');
  const [payoutId,     setPayoutId]     = useState('');
  const [referralCode, setReferralCode] = useState('');

  // ── NOTIFICATIONS
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── GO LIVE
  const [liveActive,  setLiveActive]  = useState(false);
  const [liveRoomId,  setLiveRoomId]  = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const liveVideoRef  = useRef<HTMLVideoElement>(null);
  const liveStreamRef = useRef<MediaStream|null>(null);

  // ── PK CHALLENGE
  const [pkChallengeOpen, setPkChallengeOpen] = useState(false);
  const [pkTargetId,      setPkTargetId]      = useState('');
  const [pkActive,        setPkActive]        = useState(false);
  const [pkTimer,         setPkTimer]         = useState(PK_DURATION);
  const [pkScore,         setPkScore]         = useState({ me: 0, rival: 0 });
  const [pkWinner,        setPkWinner]        = useState<string|null>(null);
  const [pkRivalData,     setPkRivalData]     = useState<any>(null);
  const pkTimerRef   = useRef<NodeJS.Timeout|null>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  // ── CINEMATIC GIFT
  const [cinematicGift,   setCinematicGift]   = useState<any>(null);
  const [cinematicSender, setCinematicSender] = useState('');

  // ── LIVE NOW LIST
  const [liveNowList, setLiveNowList] = useState<any[]>([]);

  // ── PULSE TABS
  const [pulseTab, setPulseTab] = useState<'feed'|'create'|'profile'>('feed');

  // ── PULSE MUTE STATE
  const [pulseMuted, setPulseMuted] = useState(true);

  // ── LIVE STREAM CHAT
  const [liveChatOpen,     setLiveChatOpen]     = useState(false);
  const [liveChatInput,    setLiveChatInput]    = useState('');
  const [liveChatMessages, setLiveChatMessages] = useState<any[]>([]);
  const liveChatEndRef = useRef<HTMLDivElement>(null);

  // ── VIEWER MODE
  const [joinRoomInput,      setJoinRoomInput]      = useState('');
  const [viewerRoom,         setViewerRoom]         = useState<any>(null);
  const [viewerRoomId,       setViewerRoomId]       = useState('');
  const [viewerChatMessages, setViewerChatMessages] = useState<any[]>([]);
  const [viewerChatInput,    setViewerChatInput]    = useState('');
  const viewerChatEndRef = useRef<HTMLDivElement>(null);
  const viewerUnsubRef   = useRef<any>(null);

  // ── GLOBAL SOUND TOGGLE for TikReels
  const [globalSoundOn, setGlobalSoundOn] = useState(false);

  // ── WECHAT CONTACTS
  const [wechatContacts, setWechatContacts] = useState<string[]>([]);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [newContact,     setNewContact]     = useState('');

  // ── WECHAT CALL STATE (ZegoCloud)
  const [zegoCallActive,    setZegoCallActive]    = useState(false);
  const [zegoCallType,      setZegoCallType]      = useState<'video'|'audio'>('video');
  const [zegoCallRoomId,    setZegoCallRoomId]    = useState('');
  const [incomingCall,      setIncomingCall]      = useState<{callerName:string;callerPhoto:string;callType:'video'|'audio';roomId:string}|null>(null);

  // ── TIKREELS SOUND
  const [soundEnabledVideos, setSoundEnabledVideos] = useState<{[key:string]:boolean}>({});

  // ── TIKREELS
  const [tiktabMode,       setTiktabMode]       = useState<'feed'|'create'|'profile'>('feed');
  const [tikProfileSubTab, setTikProfileSubTab] = useState<'posts'|'following'>('posts');

  // ── TIKREELS WINDOWING
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [reelPaused,     setReelPaused]     = useState(false);
  const videoFeedRef  = useRef<HTMLDivElement>(null);
  const iframeRefs    = useRef<{ [key: number]: HTMLIFrameElement | null }>({});
  const userVideoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});

  const isLowEnd = typeof navigator !== 'undefined' &&
    ((navigator as any).deviceMemory <= 2 || (navigator as any).hardwareConcurrency <= 2);
  const [tiktokPostText, setTiktokPostText] = useState('');
  const [tiktokPostImg,  setTiktokPostImg]  = useState('');

  // ── PULSE GIFT PANEL
  const [pulseGiftPostId, setPulseGiftPostId] = useState<string|null>(null);

  // ── USER PROFILE (viewer)
  const [viewingUid,    setViewingUid]    = useState<string|null>(null);
  const [viewProfile,   setViewProfile]   = useState<any>(null);
  const [profilePosts,  setProfilePosts]  = useState<any[]>([]);
  const [profileVideos, setProfileVideos] = useState<any[]>([]);
  const [followers,     setFollowers]     = useState(0);
  const [following,     setFollowing]     = useState(0);
  const [isFollowing,   setIsFollowing]   = useState(false);
  const [followedYouTubers, setFollowedYouTubers] = useState<Set<string>>(new Set());
  const [followingList, setFollowingList] = useState<any[]>([]);

  // ── REFS
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const tiktokFileRef = useRef<HTMLInputElement>(null);
  const searchRef     = useRef<HTMLInputElement>(null);

  // Profile loading + DM state
  const [profileTotalLikes, setProfileTotalLikes] = useState(0);
  const [profileLoading,    setProfileLoading]    = useState(false);
  const [activeChatId,      setActiveChatId]      = useState<string|null>(null);
  const [activeChatUser,    setActiveChatUser]    = useState<any>(null);
  const [dmMessages,        setDmMessages]        = useState<any[]>([]);
  const [dmInput,           setDmInput]           = useState('');
  const dmUnsubRef = useRef<any>(null);
  const dmEndRef   = useRef<HTMLDivElement>(null);

  // ── COMPUTED
  const totalCoins     = balance + visualProfit;
  const displayBalance = totalCoins.toFixed(2);
  const displayUsdt    = (totalCoins / CASH_RATE).toFixed(2);

  const currentWithdrawMethod = WITHDRAW_METHODS.find(m => m.label === payoutMethod) || WITHDRAW_METHODS[0];

  // ==========================================================
  // FETCH APIs
  // ==========================================================
  const fetchSocialAPIs = async () => {
    try {
      const pRes  = await fetch(`https://api.unsplash.com/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&query=lifestyle,luxury&count=20`);
      const pData = await pRes.json();
      setPixaData(Array.isArray(pData) ? pData : []);

      const YT_KEYWORDS = [
        'Hindi Shorts viral',
        'Bollywood Movie Clips funny',
        'Funny Cartoons Hindi',
        'Comedy Shorts India',
        'Desi Funny Videos',
        'Hindi Stand Up Comedy',
      ];
      const randomKeyword = YT_KEYWORDS[Math.floor(Math.random() * YT_KEYWORDS.length)];
      const yRes  = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(randomKeyword)}&type=video&videoDuration=short&key=${YOUTUBE_API_KEY}`);
      const yData = await yRes.json();
      const items = yData.items || [];
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      setPixaVideos(items.map((item:any) => ({
        id:       item.id.videoId,
        user:     item.snippet.channelTitle,
        title:    item.snippet.title,
        thumb:    item.snippet?.thumbnails?.high?.url || '',
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&mute=1&loop=1&playlist=${item.id.videoId}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3`
      })));
    } catch(e) { console.log("API Error", e); }
  };

  // ==========================================================
  // FETCH LIVE NOW LIST
  // ==========================================================
  const fetchLiveNow = () => {
    try {
      const q = query(collection(db,"live_rooms"), orderBy("startedAt","desc"), limit(20));
      return onSnapshot(q, snap => {
        const now = Date.now();
        const rooms = snap.docs
          .map(d => ({ id:d.id, ...d.data() }))
          .filter((r:any) => r.lastSeenMs && (now - r.lastSeenMs) < 15000);
        setLiveNowList(rooms);
      });
    } catch { return () => {}; }
  };

  // ==========================================================
  // FIREBASE LISTENERS
  // ==========================================================
  useEffect(() => {
    if (socialScreen==='chat' && activeContact) {
      try {
        const q = query(collection(db,"global_chat"), orderBy("createdAt","desc"), limit(40));
        return onSnapshot(q, snap => setChatMessages(snap.docs.map(d=>({id:d.id,...d.data()})).reverse()));
      } catch {}
    }
    if (socialScreen==='tikreels') {
      try {
        const q = query(collection(db,"user_posts"), orderBy("createdAt","desc"), limit(20));
        return onSnapshot(q, snap => setUserPosts(snap.docs.map(d=>({id:d.id,...d.data()}))));
      } catch {}
    }
    if (socialScreen==='pulse') {
      try {
        const q = query(collection(db,"pulse_posts"), orderBy("createdAt","desc"), limit(20));
        return onSnapshot(q, snap => setPulsePosts(snap.docs.map(d=>({id:d.id,...d.data()}))));
      } catch {}
    }
    if (commentPostId && !commentPostId.startsWith('gift_')) {
      try {
        const col = (socialScreen === 'pulse') ? 'pulse_posts' : 'user_posts';
        const q = query(collection(db, col, commentPostId,"comments"), orderBy("createdAt","asc"));
        return onSnapshot(q, snap => setPostComments(snap.docs.map(d=>({id:d.id,...d.data()}))));
      } catch {}
    }
    return () => {};
  }, [socialScreen, activeContact, commentPostId]);

  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db,"notifications"), orderBy("date","desc"), limit(20));
      return onSnapshot(q, snap => {
        const items = snap.docs.map(d=>({id:d.id,...d.data()}));
        setNotifications(items);
        setUnreadCount(items.length);
      });
    } catch {}
    return () => {};
  }, [user]);

  useEffect(() => {
    if (socialScreen === 'hub') {
      const unsub = fetchLiveNow();
      return unsub;
    }
    return () => {};
  }, [socialScreen]);

  // Re-fetch fresh random YouTube videos every time TikReel tab is opened
  useEffect(() => {
    if (socialScreen !== 'tikreels') return;
    const fetchFreshVideos = async () => {
      try {
        const YT_KEYWORDS = [
          'Hindi Shorts viral','Bollywood Movie Clips funny','Funny Cartoons Hindi',
          'Comedy Shorts India','Desi Funny Videos','Hindi Stand Up Comedy',
        ];
        const randomKeyword = YT_KEYWORDS[Math.floor(Math.random() * YT_KEYWORDS.length)];
        const yRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(randomKeyword)}&type=video&videoDuration=short&key=${YOUTUBE_API_KEY}`);
        const yData = await yRes.json();
        const items = yData.items || [];
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        setPixaVideos(items.map((item: any) => ({
          id:       item.id.videoId,
          user:     item.snippet.channelTitle,
          title:    item.snippet.title,
          thumb:    item.snippet?.thumbnails?.high?.url || '',
          embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&mute=1&loop=1&playlist=${item.id.videoId}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3`
        })));
        setActiveVideoIdx(0);
      } catch(e) { console.log('TikReel refresh error', e); }
    };
    fetchFreshVideos();
    return () => {};
  }, [socialScreen]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (cu) => {
      if (cu) {
        setUser(cu);
        try {
          const userRef  = doc(db,"users",cu.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const d = snap.data();
            setHasSocialProfile(d.hasSocialProfile ?? true);
            setUsername(d.username||'');
            setBio(d.bio||'');
            setTempPhoto(d.photo||cu.photoURL||'');
          } else {
            await setDoc(userRef, {
              name:cu.displayName, email:cu.email,
              balance:500, botTier:'none', invested:0,
              uid:cu.uid, lastSync:serverTimestamp(),
              hasSocialProfile:true,
              photo:cu.photoURL||'',
              followers:0, following:0,
              postsCount:0, followersCount:0, followingCount:0, totalLikes:0,
              status:'online', fcmToken:'',
            });
            setHasSocialProfile(true);
          }
          onSnapshot(userRef, s => {
            if (s.exists()) {
              setBalance(s.data().balance||0);
              setBotTier(s.data().botTier||'none');
              setInvested(s.data().invested||0);
            }
          });
        } catch(e) { console.error('Auth init error', e); }
        await setUserOnlinePresence(cu);
        setScreen('hub');
      } else { setUser(null); setScreen('auth'); }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    setupForegroundNotificationListener();
    setUserOnlinePresence(user);
    const handleUnload = () => { setUserOfflineStatus(user.uid); };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      setUserOfflineStatus(user.uid);
    };
  }, [user]);

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
    return () => {};
  }, [screen]);

  // FIREBASE REALTIME REELS & PULSE SYNC
  useEffect(() => {
    const unsubReels = onSnapshot(collection(db, "reels"), (snapshot) => {
      setUserPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPulse = onSnapshot(collection(db, "posts"), (snapshot) => {
      setPulsePosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubReels(); unsubPulse(); };
  }, []);

  // ── GAME COINS: postMessage listener (Game Bridge)
  useEffect(() => {
    if (!user) return;
    const handleGameMessage = async (e: MessageEvent) => {
      if (!e.data || e.data.type !== "GAME_SCORE") return;
      const coinsEarned = e.data.score * 0.010;
      if (!coinsEarned || coinsEarned <= 0 || isNaN(coinsEarned)) return;
      try {
        await updateDoc(doc(db, "users", user.uid), { balance: increment(coinsEarned) });
        try {
          await addDoc(collection(db, "notifications"), {
            title: "🎮 Game Reward!",
            message: `+${coinsEarned.toFixed(2)} Coins earned from Gaming Zone!`,
            date: serverTimestamp(),
          });
        } catch {}
      } catch(err) { console.error("Game coin credit error", err); }
    };
    window.addEventListener("message", handleGameMessage);
    return () => window.removeEventListener("message", handleGameMessage);
  }, [user]);

  // PK Timer
  useEffect(() => {
    if (!pkActive) return;
    pkTimerRef.current = setInterval(() => {
      setPkTimer(t => {
        if (t <= 1) {
          clearInterval(pkTimerRef.current!);
          setPkWinner(pkScore.me >= pkScore.rival ? (username||'You') : (pkRivalData?.username||'Rival'));
          setPkActive(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (pkTimerRef.current) clearInterval(pkTimerRef.current); };
  }, [pkActive]);

  // Live Chat listener
  useEffect(() => {
    if (!liveActive || !liveRoomId) return;
    try {
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
    } catch {}
    return () => {};
  }, [liveActive, liveRoomId]);

  // ==========================================================
  // TIKREELS + PULSE WINDOWING — snap-scroll + Audio Bleeding fix
  // ==========================================================
  useEffect(() => {
    const isTikFeed   = socialScreen === 'tikreels' && tiktabMode === 'feed';
    const isPulseFeed = socialScreen === 'pulse'    && pulseTab   === 'feed';
    if (!isTikFeed && !isPulseFeed) return;
    const root = videoFeedRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const el  = entry.target as HTMLElement;
          const idx = parseInt(el.dataset.vidx || '0', 10);
          if (entry.isIntersecting) {
            setActiveVideoIdx(idx);
          } else {
            const uv = userVideoRefs.current[idx];
            if (uv && !uv.paused) uv.pause();
          }
        });
      },
      { threshold: 0.8, root }
    );
    const slides = root.querySelectorAll('[data-vidx]');
    slides.forEach(el => obs.observe(el));
    return () => {
      obs.disconnect();
      iframeRefs.current = {};
    };
  }, [pixaVideos, socialScreen, tiktabMode, userPosts, pulseTab, pulsePosts]);

  // Audio Kill — when activeVideoIdx changes, blank ALL off-screen YouTube iframes immediately
  useEffect(() => {
    const isTikFeed   = socialScreen === 'tikreels' && tiktabMode === 'feed';
    const isPulseFeed = socialScreen === 'pulse'    && pulseTab   === 'feed';
    if (!isTikFeed && !isPulseFeed) return;
    setReelPaused(false);
    Object.entries(iframeRefs.current).forEach(([idxStr, el]) => {
      if (!el) return;
      const idx = parseInt(idxStr, 10);
      if (idx !== activeVideoIdx) {
        // Immediately kill audio by blanking src
        if (el.src && (el.src.includes('youtube.com') || el.src.includes('youtube-nocookie.com'))) {
          el.src = '';
        }
      }
    });
    Object.entries(userVideoRefs.current).forEach(([idxStr, el]) => {
      if (!el) return;
      const idx = parseInt(idxStr, 10);
      if (idx !== activeVideoIdx && !el.paused) el.pause();
    });
  }, [activeVideoIdx, socialScreen, tiktabMode, pulseTab]);

  // WECHAT CONTACTS listener
  useEffect(() => {
    if (!user) return;
    try {
      const colRef = collection(db,"users",user.uid,"wechat_contacts");
      const unsub = onSnapshot(colRef, snap => {
        setWechatContacts(snap.docs.map(d => d.data().name as string));
      });
      return unsub;
    } catch {}
    return () => {};
  }, [user]);

  // ==========================================================
  // SEND LIVE CHAT MESSAGE
  // ==========================================================
  const sendLiveChatMessage = async () => {
    if (!liveChatInput.trim() || !liveRoomId || !user) return;
    try {
      await addDoc(collection(db,'live_rooms',liveRoomId,'messages'), {
        text:     liveChatInput.trim(),
        uid:      user.uid,
        username: username || 'AJ_Member',
        photo:    tempPhoto || user.photoURL || '',
        createdAt:serverTimestamp()
      });
      setLiveChatInput('');
    } catch(e) { console.error('sendLiveChatMessage', e); }
  };

  // ==========================================================
  // GO LIVE
  // ==========================================================
  const startLive = async () => {
    if (!user) return;
    const roomId = `live_${user.uid}_${Date.now()}`;
    setLiveRoomId(roomId);
    setLiveActive(true);
    handleStartLiveOrCall(roomId, user.uid, username || 'AJ Member');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      liveStreamRef.current = stream;
      setCameraReady(true);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play();
      }
      await setDoc(doc(db, "live_rooms", roomId), {
        uid: user.uid, username: username || 'AJ_Member',
        photo: tempPhoto || user.photoURL || '',
        roomId, startedAt: serverTimestamp(), active: true, lastSeenMs: Date.now()
      });
      const heartbeat = setInterval(async () => {
        try { await updateDoc(doc(db, "live_rooms", roomId), { lastSeenMs: Date.now() }); } catch {}
      }, 10000);
      (liveStreamRef as any)._heartbeat = heartbeat;
      try {
        await addDoc(collection(db, "notifications"), {
          title: "🔴 Live Now!",
          message: `@${username || 'AJ_Member'} just went LIVE! Tap to join.`,
          deepLink: `/live/${roomId}`, date: serverTimestamp()
        });
      } catch {}
    } catch {
      setVvipAlert({msg:"Camera permission denied. Please allow camera access."});
      setCameraReady(false);
    }
  };

  const stopLive = async () => {
    if ((liveStreamRef as any)._heartbeat) {
      clearInterval((liveStreamRef as any)._heartbeat);
      (liveStreamRef as any)._heartbeat = null;
    }
    liveStreamRef.current?.getTracks().forEach(t => t.stop());
    liveStreamRef.current = null;
    setCameraReady(false);
    setLiveActive(false);
    setPkActive(false);
    if (liveRoomId) {
      try { await deleteDoc(doc(db,"live_rooms",liveRoomId)); } catch {}
    }
  };

  // ==========================================================
  // JOIN LIVE AS VIEWER
  // ==========================================================
  const joinLiveByRoomId = async (roomId?: string) => {
    const rid = (roomId || joinRoomInput).trim();
    if (!rid) return setVvipAlert({msg:"Please enter the streamer's Room ID."});
    try {
      let roomSnap:any = await getDoc(doc(db, 'live_rooms', rid));
      if (!roomSnap.exists()) {
        const all2 = await getDocs(query(collection(db,'live_rooms'),limit(50)));
        const m = all2.docs.find(d => d.id.endsWith(rid) || d.id===rid);
        if (m) roomSnap = m;
      }
      if (!roomSnap.exists()) return setVvipAlert({msg:'Room not found. Use the Copy button for the full ID.'});
      if (!roomSnap.data()?.active) return setVvipAlert({msg:'This stream has ended.'});
      setScreen('social');
      setViewerRoom({ id: roomSnap.id, ...roomSnap.data() });
      setViewerRoomId(roomSnap.id);
      setJoinRoomInput('');
      const unsub = onSnapshot(
        query(collection(db, 'live_rooms', roomSnap.id, 'messages'), orderBy('createdAt', 'asc')),
        snap2 => {
          setViewerChatMessages(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
          setTimeout(() => viewerChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        }
      );
      viewerUnsubRef.current = unsub;
    } catch(e) { console.error('joinLiveByRoomId', e); setVvipAlert({msg:'Could not join room. Please try again.'}); }
  };

  const leaveViewerRoom = () => {
    if (viewerUnsubRef.current) { viewerUnsubRef.current(); viewerUnsubRef.current = null; }
    setViewerRoom(null); setViewerRoomId('');
    setViewerChatMessages([]); setViewerChatInput('');
  };

  const sendViewerChatMessage = async () => {
    if (!viewerChatInput.trim() || !viewerRoomId || !user) return;
    try {
      await addDoc(collection(db, 'live_rooms', viewerRoomId, 'messages'), {
        uid: user.uid, username: username || 'AJ_Member',
        photo: tempPhoto || user.photoURL || '',
        text: viewerChatInput.trim(), createdAt: serverTimestamp()
      });
      setViewerChatInput('');
    } catch(e) { console.error('sendViewerChatMessage', e); }
  };

  // ==========================================================
  // PK CHALLENGE
  // ==========================================================
  const sendPkChallenge = async () => {
    if (!user || !pkTargetId.trim()) return setVvipAlert({msg:"Enter rival's User ID!"});
    if (balance < PK_ENTRY_COINS) return setVvipAlert({msg:`Need ${PK_ENTRY_COINS} AJ Coins to enter PK!`});
    try {
      const rivalSnap = await getDoc(doc(db,"users",pkTargetId.trim()));
      if (!rivalSnap.exists()) return setVvipAlert({msg:"Rival not found! Check User ID."});
      await updateDoc(doc(db,"users",user.uid), { balance: increment(-PK_ENTRY_COINS) });
      try {
        await addDoc(collection(db,"AdminRevenue"), {
          type:'pk_match', totalDeducted: PK_ENTRY_COINS * 2,
          challenger: user.uid, rival: pkTargetId.trim(), date:serverTimestamp()
        });
      } catch {}
      try {
        await addDoc(collection(db,"notifications"), {
          title:"⚔️ PK Challenge!",
          message:`@${username||'AJ_Member'} challenged you to a PK Battle! ${PK_ENTRY_COINS} Coins staked.`,
          deepLink:`/pk/${liveRoomId}`, date:serverTimestamp()
        });
      } catch {}
      setPkRivalData(rivalSnap.data());
      setPkTimer(PK_DURATION); setPkScore({ me:0, rival:0 });
      setPkWinner(null); setPkActive(true); setPkChallengeOpen(false);
      setVvipAlert({msg:`⚔️ PK Challenge sent to @${rivalSnap.data().username || pkTargetId}! Match starting...`,icon:"⚔️"});
    } catch(e) { console.error('sendPkChallenge', e); setVvipAlert({msg:'Error sending challenge. Please try again.'}); }
  };

  const sendPkGift = async (creatorId:string, gift:{name:string,cost:number,icon:string}, isMe:boolean) => {
    if (!user) return;
    await sendGift(creatorId, gift);
    if (isMe) setPkScore(s => ({ ...s, me: s.me + gift.cost }));
    else setPkScore(s => ({ ...s, rival: s.rival + gift.cost }));
  };

  // ==========================================================
  // GIFTING — 60% creator | 40% admin
  // ==========================================================
  const sendGift = async (creatorId:string, gift:{name:string,cost:number,icon:string}) => {
    if (!user) return;
    if (balance < gift.cost) {
      setVvipAlert({msg:`Insufficient Balance! Need ${gift.cost} 🪙 — Go to Wallet to recharge.`,icon:'💰'});
      setScreen('wallet'); setWalletTab('purchase');
      return;
    }
    try {
      await updateDoc(doc(db,"users",user.uid), { balance: increment(-gift.cost) });
      const creatorShare = gift.cost * 0.60;
      const adminShare   = gift.cost * 0.40;
      try { await updateDoc(doc(db,"users",creatorId), { balance: increment(creatorShare) }); } catch {}
      try {
        await addDoc(collection(db,"admin_ledger"), {
          giftName:gift.name, totalCost:gift.cost, adminShare,
          senderUid:user.uid, creatorUid:creatorId, date:serverTimestamp()
        });
      } catch {}
      try {
        await addDoc(collection(db,"notifications"), {
          title:`Gift Received! ${gift.icon}`,
          message:`You received ${gift.icon} ${gift.name} from @${username||'Anonymous'}. +${creatorShare} Coins (60% yours)`,
          date:serverTimestamp()
        });
      } catch {}
      setCinematicGift(gift);
      setCinematicSender(username || 'Anonymous');
      setVvipAlert({msg:`${gift.icon} ${gift.name} sent! Creator received ${creatorShare} Coins (60%).`});
    } catch(e) { console.error('sendGift', e); setVvipAlert({msg:'Gift failed. Please try again.'}); }
  };

  // ==========================================================
  // ADMIN REVENUE LOGGER
  // ==========================================================
  const logAdminRevenue = async (type:string, totalPool:number, userNet:number) => {
    try {
      const adminShare = totalPool * ADMIN_EARN_SHARE;
      await addDoc(collection(db,"AdminRevenue"), {
        type, totalPool, adminShare, userNet,
        uid:user?.uid||'', date:serverTimestamp()
      });
    } catch {}
  };

  // ==========================================================
  // FOLLOW SYSTEM
  // ==========================================================
  const handleFollow = async (targetUid:string) => {
    if (!user) return;
    try {
      const followRef   = doc(db,"users",user.uid,"following",targetUid);
      const followerRef = doc(db,"users",targetUid,"followers",user.uid);
      if (isFollowing) {
        await deleteDoc(followRef);
        await deleteDoc(followerRef);
        try { await updateDoc(doc(db,"users",user.uid),  { following: increment(-1) }); } catch {}
        try { await updateDoc(doc(db,"users",targetUid), { followers: increment(-1) }); } catch {}
        setIsFollowing(false); setFollowers(f => f-1);
      } else {
        await setDoc(followRef,   { uid:targetUid, date:serverTimestamp() });
        await setDoc(followerRef, { uid:user.uid,  date:serverTimestamp() });
        try { await updateDoc(doc(db,"users",user.uid),  { following: increment(1) }); } catch {}
        try {
          await updateDoc(doc(db,"users",targetUid), {
            followers: increment(1), followersCount: increment(1)
          });
        } catch {}
        try {
          await addDoc(collection(db,"users",targetUid,"notifications"), {
            type:'follow', fromUid:user.uid,
            fromUsername:username||'AJ_Member',
            fromPhoto:user.photoURL||'',
            createdAt:serverTimestamp(), read:false
          });
        } catch {}
        setIsFollowing(true); setFollowers(f => f+1);
        try {
          const theirF = await getDoc(doc(db,"users",targetUid,"following",user.uid));
          setIsMutualFriend(theirF.exists());
        } catch {}
      }
    } catch(e) { console.error('handleFollow', e); }
  };

  // Load notifications
  const loadNotifications = async () => {
    if (!user) return;
    try {
      const nSnap = await getDocs(query(collection(db,"users",user.uid,"notifications"), orderBy("createdAt","desc"), limit(20)));
      setNotifications(nSnap.docs.map(d => ({id:d.id,...d.data()})));
    } catch {}
  };

  const loadFollowingList = async () => {
    if (!user) return;
    try {
      const foSnap = await getDocs(collection(db,"users",user.uid,"following"));
      const list = await Promise.all(foSnap.docs.map(async d => {
        try {
          const snap = await getDoc(doc(db,"users",d.id));
          return snap.exists() ? { uid:d.id, ...snap.data() } : { uid:d.id, username:d.id };
        } catch { return { uid:d.id, username:d.id }; }
      }));
      setFollowingList(list.filter(Boolean));
    } catch {}
  };

  // ==========================================================
  // OPEN OR CREATE CHAT (Messaging System)
  // ==========================================================
  const openOrCreateChat = async (otherUid:string, otherData:any) => {
    if (!user) return;
    try {
      const chatId = [user.uid, otherUid].sort().join('_');
      const chatRef = doc(db,'chats',chatId);
      const cs = await getDoc(chatRef);
      if (!cs.exists()) {
        await setDoc(chatRef, {
          participants:[user.uid,otherUid],
          createdAt:serverTimestamp(), lastMessage:'', lastAt:serverTimestamp()
        });
      }
      setActiveChatId(chatId);
      setActiveChatUser(otherData);
      if (dmUnsubRef.current) { dmUnsubRef.current(); dmUnsubRef.current=null; }
      dmUnsubRef.current = onSnapshot(
        query(collection(db,'chats',chatId,'messages'), orderBy('createdAt','asc')),
        s => {
          setDmMessages(s.docs.map(d=>({id:d.id,...d.data()})));
          setTimeout(()=>dmEndRef.current?.scrollIntoView({behavior:'smooth'}),60);
        }
      );
      setSocialScreen('dm');
    } catch(e) { console.error('openOrCreateChat', e); setVvipAlert({msg:'Could not open chat. Please try again.'}); }
  };

  const sendDmMessage = async () => {
    if (!dmInput.trim() || !activeChatId || !user) return;
    const text = dmInput.trim(); setDmInput('');
    try {
      await addDoc(collection(db,'chats',activeChatId,'messages'), {
        uid:user.uid, username:username||user.displayName||'AJ Member',
        photo:tempPhoto||user.photoURL||'', text, createdAt:serverTimestamp()
      });
      await updateDoc(doc(db,'chats',activeChatId), { lastMessage:text, lastAt:serverTimestamp() });
    } catch(e) { console.error('sendDmMessage', e); }
  };

  // ==========================================================
  // OPEN PROFILE
  // ==========================================================
  const openProfile = async (uid:string) => {
    setScreen('social'); setSocialScreen('profile');
    setViewingUid(uid); setViewProfile(null);
    setProfileLoading(true); setProfilePosts([]); setProfileVideos([]);
    try {
      const snap = await getDoc(doc(db,"users",uid));
      let userData: any;
      if (snap.exists()) {
        userData = { ...snap.data() };
      } else {
        userData = { username:'AJ Member', bio:'', photo:'/logo.png', name:'AJ Member', postsCount:0, followersCount:0, followingCount:0, totalLikes:0 };
      }
      if (snap.exists()) {
        const fix: any = {};
        if (userData.postsCount     === undefined) fix.postsCount     = 0;
        if (userData.followersCount === undefined) fix.followersCount = 0;
        if (userData.followingCount === undefined) fix.followingCount = 0;
        if (userData.totalLikes     === undefined) fix.totalLikes     = 0;
        if (Object.keys(fix).length) {
          try { await updateDoc(doc(db,"users",uid), fix); } catch {}
          Object.assign(userData, fix);
        }
      }
      setViewProfile(userData);
      try {
        const pq1 = query(collection(db,"pulse_posts"), orderBy("createdAt","desc"), limit(30));
        const ps1 = await getDocs(pq1);
        const pulseAll = ps1.docs.map(d => ({id:d.id,...d.data() as any, views:(d.data() as any).views||0}));
        setProfilePosts(pulseAll.filter((p:any) => p.uid===uid && !p.isVideo));
        const pq2 = query(collection(db,"user_posts"), orderBy("createdAt","desc"), limit(30));
        const ps2 = await getDocs(pq2);
        const all = ps2.docs.map(d => ({id:d.id,...d.data() as any}));
        const feedVideos = all.filter((p:any) => p.uid===uid && p.isVideo).map((v:any) => ({...v, views:v.views||0}));
        let subVideos: any[] = [];
        try {
          const vSnap = await getDocs(query(collection(db,"users",uid,"videos"), orderBy("createdAt","desc"), limit(50)));
          subVideos = vSnap.docs.map(d => ({id:d.id,...d.data() as any, isVideo:true, views:(d.data() as any).views||0}));
        } catch {}
        const subIds = new Set(subVideos.map((v:any) => v.id));
        setProfileVideos([...subVideos, ...feedVideos.filter((v:any) => !subIds.has(v.id))]);
      } catch(e) { console.error('openProfile posts', e); }
      if (userData.followersCount !== undefined) {
        setFollowers(userData.followersCount);
      } else {
        try { setFollowers((await getDocs(collection(db,"users",uid,"followers"))).size); } catch {}
      }
      if (userData.followingCount !== undefined) {
        setFollowing(userData.followingCount);
      } else {
        try { setFollowing((await getDocs(collection(db,"users",uid,"following"))).size); } catch {}
      }
      setProfileTotalLikes(userData.totalLikes ?? 0);
      if (user) {
        try {
          const myF = await getDoc(doc(db,"users",user.uid,"following",uid));
          setIsFollowing(myF.exists());
          const theirF = await getDoc(doc(db,"users",uid,"following",user.uid));
          setIsMutualFriend(myF.exists() && theirF.exists());
        } catch {}
      }
    } catch(e) {
      console.error('openProfile error', e);
      setViewProfile({ username:'AJ Member', bio:'', photo:'/logo.png', postsCount:0, followersCount:0, followingCount:0, totalLikes:0 });
    } finally {
      setProfileLoading(false);
    }
  };

  // ==========================================================
  // WECHAT CONTACTS
  // ==========================================================
  const saveContactToFirestore = async (name: string) => {
    if (!user || !name.trim()) return;
    try {
      await addDoc(collection(db,"users",user.uid,"wechat_contacts"), { name: name.trim(), addedAt: serverTimestamp() });
    } catch(e) { console.error('saveContactToFirestore', e); }
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
          setVvipAlert({msg:`✅ ${cts.length} contact(s) synced!`,icon:"✅"});
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
  // ZEGOCLOUD CALL HANDLERS
  // ==========================================================
  const startZegoCall = (callType: 'video'|'audio') => {
    if (!user || !activeChatUser) return;
    const roomId = `call_${[user.uid, activeChatUser.uid].sort().join('_')}_${Date.now()}`;
    setZegoCallRoomId(roomId);
    setZegoCallType(callType);
    setZegoCallActive(true);
    // Notify the other user via Firestore
    try {
      addDoc(collection(db, 'call_signals'), {
        roomId, callType,
        callerUid: user.uid,
        callerName: username || 'AJ Member',
        callerPhoto: tempPhoto || user.photoURL || '',
        calleeUid: activeChatUser.uid,
        status: 'ringing',
        createdAt: serverTimestamp(),
      });
    } catch {}
    // Load ZegoCloud SDK and start call
    setTimeout(() => {
      handleStartZegoCall(roomId, user.uid, username || 'AJ Member', callType);
    }, 500);
  };

  const endZegoCall = () => {
    setZegoCallActive(false);
    setZegoCallRoomId('');
    setIncomingCall(null);
    // Clean up call signal
    if (zegoCallRoomId) {
      try {
        getDocs(query(collection(db,'call_signals'), limit(10))).then(snap => {
          snap.docs.forEach(d => {
            if (d.data().roomId === zegoCallRoomId) deleteDoc(d.ref).catch(()=>{});
          });
        });
      } catch {}
    }
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(
        collection(db,'call_signals'),
        orderBy('createdAt','desc'), limit(5)
      );
      const unsub = onSnapshot(q, snap => {
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.calleeUid === user.uid && data.status === 'ringing') {
            setIncomingCall({
              callerName:  data.callerName,
              callerPhoto: data.callerPhoto,
              callType:    data.callType,
              roomId:      data.roomId,
            });
          }
        });
      });
      return () => unsub();
    } catch {}
    return () => {};
  }, [user]);

  // ==========================================================
  // TIKREELS POST
  // ==========================================================
  const handleTiktokPost = async () => {
    if (!tiktokPostText.trim() && !tiktokPostImg) return setVvipAlert({msg:"Add caption or image!"});
    try {
      const videoReward = tiktokPostIsVideo ? 10 : 5; // Video +10, Photo +5 AJ Coins
      await addDoc(collection(db,"user_posts"), {
        text:tiktokPostText, image:tiktokPostImg, uid:user!.uid,
        username:username||"AJ_Member", photo:user!.photoURL||'',
        likes:0, views:0, isVideo:tiktokPostIsVideo,
        selectedSound: selectedSound || null,
        textOverlay: tikEditorTextOverlay || null,
        cssFilter: tikEditorFilter || 'none',
        createdAt:serverTimestamp()
      });
      await updateDoc(doc(db,"users",user!.uid), { balance: increment(videoReward) });
      await logAdminRevenue('tiktok_post', videoReward, videoReward);
      setTiktokPostText(''); setTiktokPostImg(''); setTiktokPostIsVideo(false);
      setTikEditorFilter('none'); setTikEditorTextOverlay(''); setSelectedSound(null);
      setTiktabMode('feed');
      setVvipAlert({msg:`🎬 Post published! +${videoReward} Coins 🪩`,icon:"🎬"});
    } catch(e) { console.error('handleTiktokPost', e); setVvipAlert({msg:'Post failed. Please try again.'}); }
  };

  // ==========================================================
  // GENERAL HANDLERS
  // ==========================================================
  const navigateWithAd = (to:string) => {
    if (typeof window!=='undefined' && (window as any).AJ_SDK) (window as any).AJ_SDK.showAd();
    if (to==='social')      { fetchSocialAPIs(); setScreen('social'); setSocialScreen('hub'); }
    else if (to==='wallet') { setScreen('wallet'); setWalletTab('main'); }
    else                    setScreen(to);
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
    const isVid = file.type.startsWith('video/');
    setPulsePostIsVideo(isVid);
    const url = await uploadToCloudinary(file);
    setTempPhoto(url || URL.createObjectURL(file));
  };

  const handleTiktokFileChange = async (e:any) => {
    const file = e.target.files?.[0]; if (!file) return;
    const isVid = file.type.startsWith('video/');
    setTiktokPostIsVideo(isVid);
    const url = await uploadToCloudinary(file);
    setTiktokPostImg(url || URL.createObjectURL(file));
  };

  const handleGoogleLogin = async () => {
    try {
      googleProvider.setCustomParameters({ prompt:'select_account' });
      await signInWithPopup(auth, googleProvider);
    } catch(e) { console.error('Google login error', e); }
  };

  const handleSignOut = async () => {
    try {
      if (user?.uid) await setUserOfflineStatus(user.uid);
      await signOut(auth);
    } catch {}
    setSocialScreen('hub'); setScreen('auth');
  };

  const handleCreateProfile = async () => {
    if (username.length<3) return setVvipAlert({msg:"Username too short!"});
    try {
      await updateDoc(doc(db,"users",user!.uid), {
        username: username.toLowerCase().trim(), bio,
        photo: tempPhoto||user!.photoURL||"/logo.png", hasSocialProfile:true
      });
      setHasSocialProfile(true); setSocialScreen('hub'); setVvipAlert({msg:"🚀 Profile Active!",icon:"🚀"});
    } catch(e) { console.error('handleCreateProfile', e); setVvipAlert({msg:'Profile save failed. Please try again.'}); }
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !user) return;
    try {
      await addDoc(collection(db,"global_chat"), {
        text:newMessage, uid:user.uid,
        username:username||"AJ_Member", photo:tempPhoto||user.photoURL||'',
        createdAt:serverTimestamp()
      });
      setNewMessage('');
    } catch(e) { console.error('sendChatMessage', e); }
  };

  const handlePhotoUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    setLoading(10);
    const url = await uploadToCloudinary(e.target.files[0]);
    if (url) {
      await updateDoc(doc(db, "users", user.uid), { photo: url });
      setTempPhoto(url);
    }
    setLoading(0);
  };

  const handleCreatePost = async () => {
    if (!postText.trim() && !tempPhoto) return setVvipAlert({msg:"Empty Post!"});
    try {
      const photoReward = pulsePostIsVideo ? 10 : 5; // Video +10, Photo +5 AJ Coins
      await addDoc(collection(db,"pulse_posts"), {
        text:postText, image:tempPhoto, uid:user!.uid,
        username:username||"AJ_Member", photo:user!.photoURL||'',
        likes:0, views:0, isVideo:pulsePostIsVideo, createdAt:serverTimestamp()
      });
      await updateDoc(doc(db,"users",user!.uid), { balance: increment(photoReward) });
      await logAdminRevenue('pulse_post', photoReward, photoReward);
      setPostText(''); setTempPhoto(''); setPulsePostIsVideo(false);
      setVvipAlert({msg:`🚀 Post Published! +${photoReward} Coins 🪩`,icon:"🚀"});
    } catch(e) { console.error('handleCreatePost', e); setVvipAlert({msg:'Post failed. Please try again.'}); }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !commentPostId) return;
    const col = (socialScreen === 'pulse') ? 'pulse_posts' : 'user_posts';
    try {
      await addDoc(collection(db, col, commentPostId, "comments"), {
        text:newComment, username:username||"AJ_Member",
        photo:user?.photoURL||'', createdAt:serverTimestamp()
      });
      setNewComment('');
    } catch(e) { console.error('submitComment', e); }
  };

  const handleDeletePost = async (id:string) => {
    const col = (socialScreen === 'pulse') ? 'pulse_posts' : 'user_posts';
    try {
      await deleteDoc(doc(db, col, id));
      setActiveMenuId(null);
      setVvipAlert({msg:'🗑️ Post deleted.', icon:'🗑️'});
    } catch(e) { console.error('handleDeletePost', e); }
  };

  const handleLike  = (id:string) => setLikedPosts((p:any) => ({...p,[id]:!p[id]}));
  const handleShare = (msg:string) => {
    if (navigator.share) {
      navigator.share({ title:'AJ Super Portal', text: msg, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setVvipAlert({msg:"Link copied!"});
    }
  };

  const activateBot = async (tier:string, cost:number) => {
    if (balance<cost) return setVvipAlert({msg:"Insufficient Balance!"});
    try {
      await updateDoc(doc(db,"users",user!.uid), {
        balance: increment(-cost), botTier:tier, invested:cost, lastSync:serverTimestamp()
      });
      await logAdminRevenue('ai_bot', cost, cost * USER_EARN_SHARE);
      setVvipAlert({msg:`${tier.toUpperCase()} BOT ACTIVATED!`});
    } catch(e) { console.error('activateBot', e); setVvipAlert({msg:'Activation failed. Please try again.'}); }
  };

  // ── WALLET ACTIONS
  const handlePurchase = async () => {
    if (purchaseAmount < MIN_PURCHASE)
      return setVvipAlert({msg:`Minimum purchase is ${MIN_PURCHASE} (= ${MIN_PURCHASE*COIN_RATE} Coins)`});
    if (!user?.uid) return setVvipAlert({msg:"Please log in first."});
    try {
      const baseBody: any = {
        price_amount:      purchaseAmount,
        price_currency:    "usd",
        pay_currency:      "usdtbsc",
        order_id:          user.uid,
        order_description: `AJ Coins — ${purchaseAmount} = ${purchaseAmount * COIN_RATE} Coins`,
        success_url:       window.location.href,
        cancel_url:        window.location.href,
        ipn_callback_url:  '/api/callback',
      };
      const res  = await fetch('https://api.nowpayments.io/v1/invoice', {
        method:  'POST',
        headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
        body:    JSON.stringify(baseBody),
      });
      const data = await res.json();
      const invoiceUrl = data.invoice_url || null;
      if (!invoiceUrl) throw new Error(data.message || 'Invoice creation failed');
      window.open(invoiceUrl, '_blank');
    } catch(e: any) {
      console.error('handlePurchase', e);
      setVvipAlert({msg:`Payment Error: ${e.message || 'Please try again.'}`});
    }
  };

  const handleTransfer = async () => {
    if (transferAmount<=0 || !transferId.trim()) return setVvipAlert({msg:"Fill all fields!"});
    if (balance<transferAmount) return setVvipAlert({msg:"Insufficient balance!"});
    if (transferId===user!.uid) return setVvipAlert({msg:"Cannot transfer to yourself."});
    try {
      const rSnap = await getDoc(doc(db,"users",transferId.trim()));
      if (!rSnap.exists()) return setVvipAlert({msg:"Recipient not found!"});
      await updateDoc(doc(db,"users",user!.uid),         { balance: increment(-transferAmount) });
      await updateDoc(doc(db,"users",transferId.trim()), { balance: increment(transferAmount) });
      try {
        await addDoc(collection(db,"notifications"), {
          title:"Transfer Sent",
          message:`Sent ${transferAmount} Coins to ID: ${transferId}`,
          date:serverTimestamp()
        });
      } catch {}
      setVvipAlert({msg:"✅ Transfer successful!",icon:"✅"}); setTransferAmount(0); setTransferId(''); setWalletTab('main');
    } catch(e) { console.error('handleTransfer', e); setVvipAlert({msg:'Transfer failed. Please try again.'}); }
  };

  const handleWithdraw = async () => {
    if (balance < WITHDRAW_MIN)
      return setVvipAlert({msg:`Minimum withdrawal is ${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE} USD). Current: ${balance.toFixed(0)} Coins.`});
    const isCard = false;
    if (!isCard) {
      if (!payoutId.trim()) return setVvipAlert({msg:`Enter your ${currentWithdrawMethod.field}.`});
    }
    try {
      const usdVal = balance / CASH_RATE;
      await updateDoc(doc(db,"users",user!.uid), { balance:0 });
      await addDoc(collection(db,"manual_withdrawals"), {
        uid:user!.uid, email:user!.email, coins:balance, amountUsd:usdVal,
        method:payoutMethod, payoutAddress: payoutId,
        status:"pending", date:serverTimestamp()
      });
      try {
        await addDoc(collection(db,"notifications"), {
          title:"Withdrawal Requested",
          message:`${balance} Coins ($${usdVal.toFixed(2)}) via ${payoutMethod} submitted for review.`,
          date:serverTimestamp()
        });
      } catch {}
      setVvipAlert({msg:"🚀 Withdrawal request submitted!",icon:"🚀"});
      setPayoutId(''); setCardHolder(''); setCardNumber(''); setCardExpiry('');
      setCardCVV(''); setCardBank(''); setCardCountry('');
      setWalletTab('main');
    } catch(e) { console.error('handleWithdraw', e); setVvipAlert({msg:'Withdrawal request failed. Please try again.'}); }
  };

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) return setVvipAlert({msg:"Enter referral code."});
    try {
      const rSnap = await getDoc(doc(db,"users",referralCode.trim()));
      if (!rSnap.exists()) return setVvipAlert({msg:"Referral Code not found."});
      const totalPool = REFERRAL_COINS;
      const referrerNet = parseFloat((totalPool * USER_EARN_SHARE).toFixed(4));
      await updateDoc(doc(db,"users",referralCode.trim()), { balance: increment(referrerNet) });
      await logAdminRevenue('referral', totalPool, referrerNet);
      try {
        await addDoc(collection(db,"notifications"), {
          title:"Referral Claimed",
          message:`+${referrerNet} Coins reward applied to referrer!`,
          date:serverTimestamp()
        });
      } catch {}
      setVvipAlert({msg:`Referral Applied! Referrer received ${referrerNet} Coins (30% share).`});
      setReferralCode('');
    } catch(e) { console.error('handleApplyReferral', e); setVvipAlert({msg:'Referral failed. Please try again.'}); }
  };

  // ==========================================================
  // AI ASSISTANT — Language Detection + Knowledge Base
  // ==========================================================
  const detectLanguage = (text: string): string => {
    const q = text.toLowerCase();
    const hinglishSignals = /\b(bhai|dost|yaar|kya|kaise|karo|hua|hoga|hoti|hota|seedha|bilkul|thoda|bohot|sirf|abhi|agar|toh|phir|mujhe|aapko|tumhara|mera|apna|paise|kamao|nikalo|karo|dekho|batao|samjhao|lao|bhejo|milega|milta|lagta|sahi|theek|accha|acha)\b/.test(q);
    if (hinglishSignals) return 'hin';
    if (/[\u0600-\u06FF]/.test(text)) {
      if (/[\u0679\u0688\u0691\u06BE\u06C1\u06CC\u06D2]/.test(text) ||
          /کوئن|پیسہ|نکالنا|لائیو|ریفرل|خریدنا|تحفہ|سکے|بیلنس|بھائی|دوست/.test(text))
        return 'ur';
      if (/[\u067E\u0686\u0698\u06AF]/.test(text) && /فارسی|ایران|ریال/.test(text))
        return 'fa';
      return 'ar';
    }
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
    if (/[\u3040-\u30FF]/.test(text)) return 'ja';
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
    if (/[\u0370-\u03FF]/.test(text)) return 'el';
    if (/[\u0590-\u05FF]/.test(text)) return 'he';
    if (/\b(bonjour|merci|monnaie|retirer|acheter|cadeau|combien|comment)\b/.test(q)) return 'fr';
    if (/\b(hola|gracias|moneda|retirar|comprar|regalo|cuánto|cómo)\b/.test(q))       return 'es';
    if (/\b(ciao|grazie|moneta|ritirare|comprare|regalo|quanto|come)\b/.test(q))      return 'it';
    if (/\b(olá|obrigado|moeda|retirar|comprar|presente|quanto|como)\b/.test(q))      return 'pt';
    if (/\b(hallo|danke|münze|auszahlen|kaufen|geschenk|wieviel|wie)\b/.test(q))      return 'de';
    if (/\b(merhaba|teşekkür|madeni|çekmek|satın|hediye|kadar|nasıl)\b/.test(q))     return 'tr';
    if (/\b(привет|спасибо|монета|вывести|купить|подарок|сколько|как)\b/.test(q))     return 'ru';
    if (/\b(halo|terima|koin|tarik|beli|hadiah|berapa|bagaimana)\b/.test(q))          return 'id';
    if (/\b(xin chào|cảm ơn|đồng xu|rút tiền|mua|quà tặng)\b/.test(q))              return 'vi';
    if (/\b(شکریہ|آپ|ہے|کیا|کیسے|میں|آپ کا)\b/.test(q))                             return 'ur';
    const locale = (typeof navigator !== 'undefined' ? navigator.language : 'en').split('-')[0].toLowerCase();
    const supported = ['fr','es','de','it','pt','tr','ru','id','vi','ar','hi','bn','zh','ja','ko','pa','ur','fa','th','el','he'];
    if (supported.includes(locale)) return locale;
    return 'en';
  };

  type BotLang = 'en'|'hin'|'ur'|'hi'|'ar'|'bn'|'pa'|'fr'|'es'|'de'|'it'|'pt'|'tr'|'ru'|'id'|'vi'|'zh'|'ja'|'ko'|'fa'|'th'|'el'|'he';
  const BOT_KB: Record<string, Record<BotLang|string, string>> = {
    greeting: {
      en:  `Welcome back! 😊 I can help you with:\n🎬 TikReels • 📡 AJ Pulse • 🎮 Gaming\n🪙 Coins & Earning • 💸 Withdraw • 🎁 Gifts • ⚔️ PK Battle\nJust ask me anything!`,
      hin: `Bhai, kya scene hai! 😄 Main yahan hoon:\n🎬 TikReels • 📡 AJ Pulse • 🎮 Gaming\n🪙 Coins earning • 💸 Withdraw • 🎁 Gifts • ⚔️ PK Battle\nKuch bhi poocho, seedha batata hoon! 🔥`,
      ur:  `خوش آمدید! 😊 میں ان چیزوں میں مدد کر سکتا ہوں:\n🎬 TikReels • 📡 AJ Pulse • 🎮 Gaming\n🪙 Coins • 💸 نکاسی • 🎁 تحفے • ⚔️ PK Battle\nکچھ بھی پوچھیں!`,
      hi:  `स्वागत है! 😊 मैं इनमें मदद कर सकता हूं:\n🎬 TikReels • 📡 AJ Pulse • 🎮 Gaming\n🪙 Coins • 💸 Withdrawal • 🎁 Gifts • ⚔️ PK\nकुछ भी पूछो!`,
      ar:  `مرحباً! 😊 يمكنني مساعدتك في:\n🎬 TikReels • 📡 AJ Pulse • 🎮 Gaming\n🪙 الكوينز • 💸 السحب • 🎁 الهدايا • ⚔️ PK\nاسألني أي شيء!`,
    },
    coin: {
      en:  `🪙 AJ Coins — Full Breakdown:\n\n• Rate: $1 = ${COIN_RATE} Coins | ${CASH_RATE} Coins = $1 cash-out\n• Welcome Bonus: 500 Coins on signup 🎉\n• Referral Bonus: +${REFERRAL_COINS} Coins per friend referred\n• Video Post (TikReel): +10 Coins per upload\n• Photo Post (Pulse): +5 Coins per post\n• AI Bot (Basic): 2% daily on invested coins\n• AI Bot (VVIP): 5% daily on invested coins\n• Live gifts received: 60% goes to you!\n\nGo to Wallet → Purchase to top up anytime. 💰`,
      hin: `Bhai, yeh lo puri detail! 🪙\n\n• Rate: $1 = ${COIN_RATE} Coins | Cash out: ${CASH_RATE} Coins = $1\n• Signup bonus: 500 Coins FREE 🎉\n• Referral: +${REFERRAL_COINS} Coins har dost ke liye\n• TikReel video upload: +10 Coins\n• Pulse photo post: +5 Coins\n• AI Bot Basic: 2% daily profit\n• AI Bot VVIP: 5% daily profit 🔥\n• Live pe gifts milein: 60% tumhara!\n\nWallet → Purchase se recharge karo, dost! 💰`,
      ur:  `🪙 AJ Coins — مکمل تفصیل:\n\n• شرح: $1 = ${COIN_RATE} Coins | ${CASH_RATE} Coins = $1\n• Signup بونس: 500 Coins مفت 🎉\n• ریفرل: +${REFERRAL_COINS} Coins\n• TikReel ویڈیو: +10 Coins\n• Pulse فوٹو: +5 Coins\n• AI Bot Basic: 2% روزانہ\n• AI Bot VVIP: 5% روزانہ 🔥\n• Live تحفے: 60% آپ کا!\n\nWallet → Purchase 💰`,
      hi:  `🪙 AJ Coins:\n\n• $1 = ${COIN_RATE} Coins | ${CASH_RATE} Coins = $1\n• Signup: 500 Coins 🎉\n• Referral: +${REFERRAL_COINS} Coins\n• TikReel Video: +10 Coins\n• Pulse Photo: +5 Coins\n• AI Bot Basic: 2% | VVIP: 5% 🔥\n• Gifts: 60% आपका!\n\nWallet → Purchase 💰`,
      ar:  `🪙 AJ Coins:\n\n• $1 = ${COIN_RATE} | ${CASH_RATE} = $1\n• Signup: 500 🎉\n• Referral: +${REFERRAL_COINS}\n• TikReel Video: +10\n• Pulse Photo: +5\n• AI Bot: 2-5% 🔥\n• Gifts: 60%\n\nالمحفظة → الشراء 💰`,
    },
    tikreels: {
      en:  `🎬 AJ TikReels — TikTok-style short videos!\n\n• Go to Social → AJ TikReels → Feed tab\n• Scroll up/down to watch videos (snap-scroll)\n• CENTER-TAP to pause/resume video\n• Like ❤️, Comment 💬, Share 🔗, or send Gifts 🎁\n• Upload your own: hit ➕ Post tab, add caption + image/video\n• Each video upload earns you +10 Coins 🪙\n• Photo post earns +5 Coins\n• CSS Filters, Music Picker & Text Overlay available in editor`,
      hin: `🎬 AJ TikReels:\n\n• Social → AJ TikReels → Feed\n• Videos scroll karo (snap-scroll)\n• CENTER TAP karo pause/resume ke liye\n• Like ❤️, Comment 💬, Gift 🎁\n• Video upload: +10 Coins 🔥\n• Photo post: +5 Coins\n• Editor mein Filters, Music, Text Overlay bhi hai!`,
      ur:  `🎬 AJ TikReels:\n\n• Social → AJ TikReels → Feed\n• Videos اسکرول کریں\n• CENTER TAP: pause/resume\n• Like ❤️، Comment 💬، Gift 🎁\n• Video: +10 Coins 🔥\n• Photo: +5 Coins\n• Editor: Filters، Music، Text Overlay`,
      hi:  `🎬 AJ TikReels:\n\n• Social → AJ TikReels → Feed\n• CENTER TAP: pause/resume\n• Video: +10 Coins 🔥\n• Photo: +5 Coins\n• Editor: Filters, Music, Text Overlay`,
      ar:  `🎬 AJ TikReels:\n\n• Social → AJ TikReels → Feed\n• CENTER TAP: pause/resume\n• Video: +10 كوين 🔥\n• Photo: +5 كوين\n• Editor: Filters, Music, Text`,
    },
    pulse: {
      en:  `📡 AJ Pulse — Instagram-style feed + Live streaming!\n\n📸 Feed:\n• Scroll posts, like, comment, share, send gifts\n• Post your own content → +5 Coins (photo) / +10 Coins (video)\n\n🔴 Go Live:\n• Social Hub → GO LIVE button\n• Share your Room ID so viewers can join\n• Viewers send gifts → You keep 60%!\n\n⚔️ PK Battle: 100 Coins entry, 5-min battle 🏆`,
      hin: `📡 AJ Pulse:\n\n📸 Feed:\n• Posts scroll, like/comment/gift\n• Photo post: +5 Coins | Video: +10 Coins\n\n🔴 Live:\n• GO LIVE → Room ID share karo\n• Gifts → 60% tumhara! 💰\n\n⚔️ PK Battle: 100 Coins, 5 min 🏆`,
      ur:  `📡 AJ Pulse:\n\n📸 فیڈ:\n• Photo: +5 Coins | Video: +10 Coins\n\n🔴 Live:\n• GO LIVE → Room ID شیئر\n• Gifts → 60% آپ کا!\n\n⚔️ PK: 100 Coins، 5 منٹ 🏆`,
      hi:  `📡 AJ Pulse:\n\n• Photo: +5 Coins | Video: +10 Coins\n• GO LIVE → Room ID share\n• Gifts → 60% आपका!\n• PK Battle: 100 Coins 🏆`,
      ar:  `📡 AJ Pulse:\n\n• Photo: +5 | Video: +10 كوين\n• GO LIVE → Room ID\n• Gifts → 60%\n• PK: 100 كوين 🏆`,
    },
    social: {
      en:  `👤 Social Features:\n\n• View any profile: tap any avatar\n• Follow / Unfollow from their profile page\n• Message (DM): tap "Message" on any profile\n• WeChat: private encrypted chat + Video/Audio calls via ZegoCloud\n• Profile: Posts, Followers, Following, Total Likes, video grid`,
      hin: `👤 Social Features:\n\n• Koi bhi profile: dp tap karo\n• Follow / Unfollow\n• DM: "Message" button 🔥\n• WeChat: private chat + Video/Audio call (ZegoCloud)\n• Profile: Posts, Followers, Likes, videos`,
      ur:  `👤 Social Features:\n\n• avatar ٹیپ → پروفائل\n• Follow / Unfollow\n• DM: "Message" 🔥\n• WeChat: private chat + Video/Audio call\n• Posts، Followers، Likes`,
      hi:  `👤 Social Features:\n\n• Avatar टैप → profile\n• Follow / Unfollow\n• DM + WeChat calls 🔥\n• Posts, Followers, Likes`,
      ar:  `👤 Social:\n\n• avatar → ملف\n• Follow/Unfollow\n• DM + WeChat calls 🔥\n• Posts, Followers, Likes`,
    },
    gaming: {
      en:  `🎮 AJ Gaming Zone — Play & Multiply Coins!\n\n• Access: Tap "Gaming" from the main Hub\n• Games: Rider King, Pulse Racer, Subsea Surge, Neon Strike, Volcano Escape\n• Game scores auto-credit AJ Coins via Game Bridge\n• Coming soon: Ludo Elite Royal, Puck Pulse Elite 🔜`,
      hin: `🎮 AJ Gaming Zone:\n\n• Main Hub → "Gaming"\n• Rider King, Pulse Racer, Subsea Surge, Neon Strike, Volcano Escape\n• Game score → auto coins credit 🔥\n• Jald: Ludo Elite Royal 🔜`,
      ur:  `🎮 Gaming:\n\n• Main Hub → "Gaming"\n• 5 games available\n• Score → auto coins 🔥\n• جلد: Ludo Elite Royal 🔜`,
      hi:  `🎮 Gaming:\n\n• Main Hub → "Gaming"\n• 5 games\n• Score → auto coins 🔥\n• जल्द: Ludo Elite Royal 🔜`,
      ar:  `🎮 Gaming:\n\n• "Gaming" من الرئيسية\n• 5 ألعاب\n• نقاط → كوينز تلقائي 🔥\n• قريباً: Ludo Elite Royal 🔜`,
    },
    refer: {
      en:  `👥 Referral System:\n\n• Your Referral Code = your User ID (find in Wallet or Social Hub)\n• Share your ID with friends\n• They go to Wallet → "Enter Referral Code" and paste your ID\n• You receive +${REFERRAL_COINS} Coins per successful referral 🎉\n• No limit — refer as many as you want!\n\nTip: Copy your ID from the Social Hub referral card 📤`,
      hin: `👥 Referral:\n\n• Tera ID = Referral Code\n• Doston ko share karo\n• Wo Wallet → Referral Code mein daalen\n• +${REFERRAL_COINS} Coins 🎉\n• Koi limit nahi!\n\nTip: Social Hub se copy karo 📤`,
      ur:  `👥 Referral:\n\n• آپ کا ID = Referral Code\n• شیئر کریں\n• Wallet → Referral Code\n• +${REFERRAL_COINS} Coins 🎉\n• کوئی حد نہیں!\n\nTip: WhatsApp پر شیئر 📤`,
      hi:  `👥 Referral:\n\n• ID = Referral Code\n• Share करो\n• Wallet → Referral Code\n• +${REFERRAL_COINS} Coins 🎉\n• कोई limit नहीं!\n\nTip: WhatsApp पर share 📤`,
      ar:  `👥 الإحالة:\n\n• معرّفك = رمز الإحالة\n• شارك\n• المحفظة → رمز الإحالة\n• +${REFERRAL_COINS} كوين 🎉\n• بلا حدود!\n\nنصيحة: شارك عبر واتساب 📤`,
    },
    withdraw: {
      en:  `💸 Withdrawal:\n\n• Minimum: ${WITHDRAW_MIN.toLocaleString()} Coins = $${WITHDRAW_MIN/CASH_RATE} USD\n• Rate: ${CASH_RATE} Coins = $1\n• Go to: Wallet → Withdraw\n\n📋 Methods:\n1. EasyPaisa\n2. JazzCash\n3. Binance USDT BSC\n4. AirTM\n\n📅 Processed monthly (25th–31st)`,
      hin: `💸 Withdrawal:\n\n• Minimum: ${WITHDRAW_MIN.toLocaleString()} Coins = $${WITHDRAW_MIN/CASH_RATE}\n• ${CASH_RATE} Coins = $1\n• Wallet → Withdraw\n\n📋 Methods: EasyPaisa, JazzCash, Binance, AirTM\n\n📅 Monthly 25th-31st`,
      ur:  `💸 نکاسی:\n\n• کم از کم: ${WITHDRAW_MIN.toLocaleString()} Coins = $${WITHDRAW_MIN/CASH_RATE}\n• Wallet → Withdraw\n• EasyPaisa، JazzCash، Binance، AirTM\n• ماہانہ 25-31`,
      hi:  `💸 Withdrawal:\n\n• Minimum: ${WITHDRAW_MIN.toLocaleString()} Coins = $${WITHDRAW_MIN/CASH_RATE}\n• Wallet → Withdraw\n• EasyPaisa, JazzCash, Binance, AirTM\n• Monthly 25th-31st`,
      ar:  `💸 السحب:\n\n• الحد الأدنى: ${WITHDRAW_MIN.toLocaleString()} = $${WITHDRAW_MIN/CASH_RATE}\n• المحفظة → سحب\n• EasyPaisa, JazzCash, Binance, AirTM\n• شهرياً 25-31`,
    },
    buy: {
      en:  `💳 Purchase Coins:\n\n• Go to: Wallet → Purchase\n• Method: Binance USDT BSC (auto-verified via NOWPayments)\n• Rate: $1 = ${COIN_RATE} Coins\n• Minimum: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\n• Coins credited automatically after payment confirmation 🔒`,
      hin: `💳 Coins khareedna:\n\n• Wallet → Purchase\n• Binance USDT BSC (auto-verified)\n• $1 = ${COIN_RATE} Coins\n• Minimum: $${MIN_PURCHASE}\n• Auto credit hoga! 🔒`,
      ur:  `💳 Coins خریدیں:\n\n• Wallet → Purchase\n• Binance USDT BSC\n• $1 = ${COIN_RATE} Coins\n• کم از کم: $${MIN_PURCHASE}\n• Auto credit 🔒`,
      hi:  `💳 Coins खरीदें:\n\n• Wallet → Purchase\n• Binance USDT BSC\n• $1 = ${COIN_RATE} Coins\n• Min: $${MIN_PURCHASE}\n• Auto credit 🔒`,
      ar:  `💳 شراء الكوينز:\n\n• المحفظة → شراء\n• Binance USDT BSC\n• $1 = ${COIN_RATE} كوين\n• الحد الأدنى: $${MIN_PURCHASE}\n• إضافة تلقائية 🔒`,
    },
    aibot: {
      en:  `🤖 AI Trading Bot:\n\n• Basic (25,000 Coins): 2% daily passive income\n• VVIP (75,000 Coins): 5% daily passive income\n• Earnings auto-credited to your balance\n• Go to: AI Trading Bot from main Hub\n• Activate once, earn forever! 💰`,
      hin: `🤖 AI Bot:\n\n• Basic (25k Coins): 2% daily\n• VVIP (75k Coins): 5% daily\n• Auto-credit hota hai\n• Main Hub → AI Trading Bot\n• Ek baar activate, hamesha earn! 💰`,
      ur:  `🤖 AI Bot:\n\n• Basic (25k): 2% روزانہ\n• VVIP (75k): 5% روزانہ\n• Auto credit\n• Main Hub → AI Bot\n• ایک بار activate، ہمیشہ earn! 💰`,
      hi:  `🤖 AI Bot:\n\n• Basic (25k): 2% daily\n• VVIP (75k): 5% daily\n• Auto credit\n• Main Hub → AI Bot\n• एक बार activate, हमेशा earn! 💰`,
      ar:  `🤖 AI Bot:\n\n• Basic (25k): 2% يومياً\n• VVIP (75k): 5% يومياً\n• إضافة تلقائية\n• Hub → AI Bot\n• فعّل مرة، اكسب دائماً! 💰`,
    },
    transfer: {
      en:  `🔄 Transfer Coins:\n\n• Go to: Wallet → Transfer\n• Enter recipient's User ID\n• Enter amount\n• Instant transfer to any AJ Portal user\n• Cannot transfer to yourself`,
      hin: `🔄 Transfer:\n\n• Wallet → Transfer\n• Recipient ka User ID daalo\n• Amount daalo\n• Instant transfer! 🔥`,
      ur:  `🔄 Transfer:\n\n• Wallet → Transfer\n• User ID\n• Amount\n• Instant! 🔥`,
      hi:  `🔄 Transfer:\n\n• Wallet → Transfer\n• User ID + Amount\n• Instant! 🔥`,
      ar:  `🔄 تحويل:\n\n• المحفظة → تحويل\n• معرّف المستلم + المبلغ\n• فوري! 🔥`,
    },
    wechat: {
      en:  `💬 WeChat — Private Encrypted Messaging:\n\n• Access: Social Hub → WeChat\n• Add contacts by name or sync from phone\n• Private 1-on-1 chat\n• 📹 Video Call & 📞 Audio Call via ZegoCloud (HD quality)\n• Incoming call notification with ringtone\n• Accept or Decline incoming calls`,
      hin: `💬 WeChat:\n\n• Social Hub → WeChat\n• Contacts add karo\n• Private 1-on-1 chat\n• 📹 Video Call & 📞 Audio Call (ZegoCloud HD)\n• Incoming call ringtone + Accept/Decline`,
      ur:  `💬 WeChat:\n\n• Social Hub → WeChat\n• Contacts add کریں\n• Private chat\n• 📹 Video & 📞 Audio Call (ZegoCloud)\n• Incoming call + Accept/Decline`,
      hi:  `💬 WeChat:\n\n• Social Hub → WeChat\n• Private chat\n• 📹 Video & 📞 Audio Call (ZegoCloud)\n• Incoming call ringtone`,
      ar:  `💬 WeChat:\n\n• Social Hub → WeChat\n• محادثة خاصة\n• 📹 فيديو & 📞 صوت (ZegoCloud)\n• مكالمة واردة`,
    },
    gift: {
      en:  `🎁 Gifts — Send Love to Creators!\n\n• Coffee ☕ — 500 Coins\n• Pizza Party 🍕 — 1,000 Coins\n• Mega Heart ❤️ — 2,500 Coins\n• Super Car 🏎️ — 5,000 Coins\n• Private Jet 🛩️ — 8,000 Coins\n• AJ Mansion 🏰 — 10,000 Coins\n\nCreator receives 60% of gift value. Admin keeps 40%.`,
      hin: `🎁 Gifts:\n\n• Coffee ☕ — 500 Coins\n• Pizza 🍕 — 1k Coins\n• Mega Heart ❤️ — 2.5k Coins\n• Super Car 🏎️ — 5k Coins\n• Jet 🛩️ — 8k Coins\n• Mansion 🏰 — 10k Coins\n\nCreator ko 60% milta hai!`,
      ur:  `🎁 تحفے:\n\n• Coffee ☕ — 500\n• Pizza 🍕 — 1k\n• Heart ❤️ — 2.5k\n• Car 🏎️ — 5k\n• Jet 🛩️ — 8k\n• Mansion 🏰 — 10k\n\nCreator: 60%`,
      hi:  `🎁 Gifts:\n\n• Coffee ☕ — 500\n• Pizza 🍕 — 1k\n• Heart ❤️ — 2.5k\n• Car 🏎️ — 5k\n• Jet 🛩️ — 8k\n• Mansion 🏰 — 10k\n\nCreator: 60%`,
      ar:  `🎁 الهدايا:\n\n• Coffee ☕ — 500\n• Pizza 🍕 — 1k\n• Heart ❤️ — 2.5k\n• Car 🏎️ — 5k\n• Jet 🛩️ — 8k\n• Mansion 🏰 — 10k\n\nالمنشئ: 60%`,
    },
    pk: {
      en:  `⚔️ PK Battle:\n\n• Challenge any live streamer to a 5-minute battle\n• Entry: ${PK_ENTRY_COINS} Coins from each participant\n• Viewers send gifts to their favorite side\n• Most gifts = WINNER 🏆\n• Go to: Social Hub → GO LIVE → PK button`,
      hin: `⚔️ PK Battle:\n\n• Kisi bhi live streamer ko challenge karo\n• Entry: ${PK_ENTRY_COINS} Coins\n• Viewers gifts bhejein\n• Jyada gifts = WINNER 🏆\n• GO LIVE → PK
 button`,
      ur:  `⚔️ PK Battle:\n\n• Entry: ${PK_ENTRY_COINS} Coins\n• 5 منٹ\n• زیادہ gifts = WINNER 🏆\n• GO LIVE → PK`,
      hi:  `⚔️ PK Battle:\n\n• Entry: ${PK_ENTRY_COINS} Coins\n• 5 min\n• ज्यादा gifts = WINNER 🏆\n• GO LIVE → PK`,
      ar:  `⚔️ PK Battle:\n\n• Entry: ${PK_ENTRY_COINS} كوين\n• 5 دقائق\n• أكثر هدايا = WINNER 🏆\n• GO LIVE → PK`,
    },
    live: {
      en:  `🔴 Go Live:\n\n• Social Hub → GO LIVE button (needs camera permission)\n• Share your Room ID so viewers can join\n• Viewers send gifts → You keep 60%!\n• Start PK Battle from the PK button\n• End live with the END LIVE button`,
      hin: `🔴 Go Live:\n\n• Social Hub → GO LIVE\n• Room ID share karo\n• Viewers gifts bhejein → 60% tumhara!\n• PK button se battle shuru karo`,
      ur:  `🔴 Live:\n\n• Social Hub → GO LIVE\n• Room ID شیئر\n• Gifts → 60%!\n• PK button`,
      hi:  `🔴 Live:\n\n• Social Hub → GO LIVE\n• Room ID share\n• Gifts → 60%!\n• PK button`,
      ar:  `🔴 Live:\n\n• GO LIVE\n• شارك Room ID\n• Gifts → 60%!\n• PK`,
    },
    bug_report: {
      en:  `🐛 Bug Report / Technical Issue:\n\nPlease contact our CEO directly for technical support:\n\n📱 WhatsApp: wa.me/96878994093\n📧 Email: ajcreatorstudio.hq@gmail.com\n\nDescribe your issue clearly and we'll fix it ASAP! 🔧`,
      hin: `🐛 Bug Report:\n\nCEO se directly contact karo:\n\n📱 WhatsApp: wa.me/96878994093\n📧 Email: ajcreatorstudio.hq@gmail.com\n\nApna issue clearly batao! 🔧`,
      ur:  `🐛 Bug Report:\n\nCEO سے رابطہ کریں:\n\n📱 WhatsApp: wa.me/96878994093\n📧 Email: ajcreatorstudio.hq@gmail.com`,
      hi:  `🐛 Bug Report:\n\nCEO से contact करें:\n\n📱 WhatsApp: wa.me/96878994093\n📧 Email: ajcreatorstudio.hq@gmail.com`,
      ar:  `🐛 تقرير خطأ:\n\nتواصل مع المدير:\n\n📱 واتساب: wa.me/96878994093\n📧 البريد: ajcreatorstudio.hq@gmail.com`,
    },
    sensitive_payment: {
      en:  `💳 For all payment, purchase, and withdrawal matters, please go directly to the Wallet section in the app. Our payment system is fully automated via NOWPayments. For manual issues, contact CEO on WhatsApp.`,
      hin: `💳 Payment ke liye Wallet section mein jao. Auto system hai NOWPayments ka. Manual issue ke liye CEO ko WhatsApp karo.`,
      ur:  `💳 Payment کے لیے Wallet section استعمال کریں۔ Manual issue: CEO WhatsApp`,
      hi:  `💳 Payment के लिए Wallet section जाएं। Manual issue: CEO WhatsApp`,
      ar:  `💳 للمدفوعات، اذهب إلى المحفظة. مشكلة يدوية: واتساب المدير`,
    },
    payment_issue: {
      en:  `⚠️ Payment Issue Detected!\n\nFor payment problems (coins not received, transaction stuck, wrong amount), please contact our CEO directly:\n\n📱 WhatsApp CEO Now →`,
      hin: `⚠️ Payment Issue!\n\nCoins nahi aaye ya transaction stuck hai? CEO ko WhatsApp karo:\n\n📱 WhatsApp CEO Now →`,
      ur:  `⚠️ Payment مسئلہ!\n\nCEO WhatsApp →`,
      hi:  `⚠️ Payment Issue!\n\nCEO WhatsApp →`,
      ar:  `⚠️ مشكلة دفع!\n\nواتساب المدير →`,
    },
    general: {
      en:  `I'm here to help! 😊 AJ Portal offers:\n\n🎬 TikReels — +10 Coins per video\n📡 AJ Pulse — +5 Coins per photo, +10 per video\n🎮 Gaming — auto coin rewards\n🪙 Coins — $1 = ${COIN_RATE} Coins, 500 signup bonus\n👥 Referral — +${REFERRAL_COINS} coins per friend\n💸 Withdraw — min ${WITHDRAW_MIN.toLocaleString()} coins\n🎁 Gifts — Coffee to Mansion\n⚔️ PK Battle\n🤖 AI Bot — 2-5% daily\n💬 WeChat — private chat + ZegoCloud calls\n\nAsk about any of these! 👆`,
      hin: `Bhai, main yahan hoon! 😊\n\n🎬 TikReels +10 Coins • 📡 Pulse +5/+10 • 🎮 Gaming\n🪙 $1=${COIN_RATE} Coins, 500 bonus\n👥 Referral +${REFERRAL_COINS} • 💸 Withdraw\n🎁 Gifts • ⚔️ PK • 🤖 AI Bot 2-5%\n💬 WeChat + ZegoCloud calls\n\nKisi bhi topic ke baare mein pooch! 🔥`,
      ur:  `میں حاضر ہوں! 😊\n\n🎬 TikReels +10 • 📡 Pulse +5/+10 • 🎮 Gaming\n🪙 Coins • 💸 Withdraw • 🎁 Gifts\n⚔️ PK • 🤖 AI Bot • 💬 WeChat\n\nکوئی بھی سوال پوچھیں!`,
      hi:  `मैं यहां हूं! 😊\n\n🎬 TikReels +10 • 📡 Pulse +5/+10 • 🎮 Gaming\n🪙 Coins • 💸 Withdraw • 🎁 Gifts\n⚔️ PK • 🤖 AI Bot • 💬 WeChat\n\nकुछ भी पूछो!`,
      ar:  `أنا هنا! 😊\n\n🎬 TikReels +10 • 📡 Pulse +5/+10 • 🎮 Gaming\n🪙 كوينز • 💸 سحب • 🎁 هدايا\n⚔️ PK • 🤖 AI Bot • 💬 WeChat\n\nاسألني!`,
    },
  };

  const matchBotTopic = (q: string, lastTopic: string): string => {
    const t = q.toLowerCase();
    if (/^(hi|hey|hello|salam|assalam|hii|helo|yo|sup|wassup|kia haal|kya haal|namaste|namaskar|bonjour|hola|ciao|merhaba|привет|halo)\b/.test(t)) return 'greeting';
    if (/bug|issue|error|problem|crash|not working|masla|mushkil|masky|khata|bug report|report bug/.test(t)) return 'bug_report';
    if (/payment.*(fail|not.*arriv|problem|issue|stuck|error|wrong|bug)|coin.*not.*arriv|deposit.*not|transaction.*id.*(not|fail|wrong)|technical.*bug|bug.*report|refund/.test(t)) return 'payment_issue';
    if (/withdraw|withdrawal|cash out|cashout|payout|purchase|buy|payment|invoice|charge|refund|top up|recharge|buy coins|how to withdraw|how to purchase|wallet/.test(t)) return 'sensitive_payment';
    if (/tikreel|tik.*reel|tiktok|short.*video|video.*upload|reel|view.*count|view.*format/.test(t)) return 'tikreels';
    if (/pulse|aj.*pulse|live|room.*id|join.*room|go.*live|stream|broadcast/.test(t)) return 'pulse';
    if (/follow|unfollow|profile|dm|direct.*message|message.*button|private.*chat|avatar|profile.*pic/.test(t)) return 'social';
    if (/game|gaming|play|rider|racer|surge|neon|volcano|ludo|puck|arcade/.test(t)) return 'gaming';
    if (/coin|balance|earn|earning|paise|kamao|کوئن|رصيد|بيلنس|سکے|bonus|signup.*bonus|welcome.*bonus/.test(t)) return 'coin';
    if (/refer|referral|ریفرل|friend.*code|code.*share|invite/.test(t)) return 'refer';
    if (/withdraw|cashout|cash.*out|nikalna|نکالنا|سحب|paisa.*nikalo|money.*out|easypaisa|jazzcash|binance|airtm|bank.*transfer/.test(t)) return 'withdraw';
    if (/buy|purchase|recharge|top.*up|kharido|خریدنا|شراء|coins.*khareed|add.*coin/.test(t)) return 'buy';
    if (/bot|ai.*bot|trading|profit|invest|passive|daily.*earn|vvip/.test(t)) return 'aibot';
    if (/transfer|send.*coin|bhejo|coin.*bhejo|transfer.*karo/.test(t)) return 'transfer';
    if (/wechat|chat|messenger|contact|audio.*call|video.*call|encrypted/.test(t)) return 'wechat';
    if (/gift|تحفہ|هدية|present|coffee|pizza|heart|mansion|jet|car/.test(t)) return 'gift';
    if (/pk|battle|challenge|rival|competition/.test(t)) return 'pk';
    if (/live.*stream|go.*live|stream.*now|broadcast/.test(t)) return 'live';
    if (t.split(' ').length <= 3 && lastTopic && lastTopic !== 'greeting' && lastTopic !== 'general') return lastTopic;
    return 'general';
  };

  const getBotReply = (topic: string, lang: string): string => {
    const topicData = BOT_KB[topic];
    if (!topicData) return getBotReply('general', lang);
    return topicData[lang] ?? topicData['hin'] ?? topicData['en'] ?? getBotReply('general', 'en');
  };

  const handleBotSend = () => {
    if (!botInput.trim()) return;
    const input   = botInput.trim();
    const rawLang = detectLanguage(input);
    const lang    = isFirstBotMsg.current ? 'en' : rawLang;
    isFirstBotMsg.current = false;
    const topic = matchBotTopic(input, lastBotTopicRef.current);
    lastBotTopicRef.current = topic;
    const reply = getBotReply(topic, lang);
    setBotMessages(m => [...m, { from:'user', text:input }, { from:'bot', text:reply, topic }]);
    setBotInput('');
  };

  const formatPkTime = (s:number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;


  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans select-none overflow-hidden">

      {/* ── ZegoCloud SDK ── */}
      <Script src="https://unpkg.com/@zegocloud/zego-uikit-prebuilt/zego-uikit-prebuilt.js" strategy="lazyOnload"/>

      {/* ── Monetag Zone 11337197 ── */}
      <script dangerouslySetInnerHTML={{__html:`(function(s){s.dataset.zone='11337197',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`}}/>
      {/* ── Monetag Zone 11349676 ── */}
      <script dangerouslySetInnerHTML={{__html:`(function(s){s.dataset.zone='11349676',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`}}/>

      {/* ── Hidden file inputs ── */}
      <input ref={fileInputRef}  type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange}/>
      <input ref={tiktokFileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleTiktokFileChange}/>
      <input ref={audioFileRef}  type="file" accept="audio/*"         className="hidden" onChange={e => { if (e.target.files?.[0]) setTiktokAudioFile(e.target.files[0]); }}/>

      {/* ── Overlays ── */}
      {vvipAlert && <VVIPAlert msg={vvipAlert.msg} icon={vvipAlert.icon} onClose={() => setVvipAlert(null)}/>}
      {cinematicGift && <CinematicGiftOverlay gift={cinematicGift} sender={cinematicSender} onDone={() => { setCinematicGift(null); setCinematicSender(''); }}/>}
      {incomingCall && (
        <IncomingCallOverlay
          callerName={incomingCall.callerName}
          callerPhoto={incomingCall.callerPhoto}
          callType={incomingCall.callType}
          onAccept={() => {
            setZegoCallRoomId(incomingCall.roomId);
            setZegoCallType(incomingCall.callType);
            setZegoCallActive(true);
            setIncomingCall(null);
            setTimeout(() => handleStartZegoCall(incomingCall.roomId, user?.uid||'', username||'AJ Member', incomingCall.callType), 500);
          }}
          onDecline={() => setIncomingCall(null)}
        />
      )}

      {/* ── ZegoCloud Call Container ── */}
      {zegoCallActive && (
        <div className="fixed inset-0 z-[9990] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a1a] border-b border-cyan-500/30">
            <span className="text-white font-black text-sm">{zegoCallType === 'video' ? '📹 Video Call' : '📞 Audio Call'} — @{activeChatUser?.username || 'User'}</span>
            <button onClick={endZegoCall} className="bg-red-600 text-white text-xs font-black px-4 py-2 rounded-full active:scale-95">End Call</button>
          </div>
          <div id="zego-call-container" className="flex-1 w-full"/>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SPLASH SCREEN
      ══════════════════════════════════════════════════════ */}
      {screen === 'splash' && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505]">
          <div className="relative z-[50]">
            <img src="/logo.png" alt="AJ Super Portal" className="w-24 h-24 rounded-3xl shadow-[0_0_60px_rgba(236,72,153,0.6)] animate-pulse"/>
          </div>
          <h1 className="mt-6 text-3xl font-black bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent tracking-widest uppercase">AJ SUPER PORTAL</h1>
          <p className="mt-2 text-xs text-gray-500 tracking-widest uppercase">Loading…</p>
          <div className="mt-8 w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 to-cyan-400 rounded-full transition-all duration-300" style={{width:`${loading}%`}}/>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          AUTH SCREEN
      ══════════════════════════════════════════════════════ */}
      {screen === 'auth' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#050505] px-6">
          <div className="relative z-[50]">
            <img src="/logo.png" alt="AJ" className="w-20 h-20 rounded-2xl shadow-[0_0_40px_rgba(236,72,153,0.5)]"/>
          </div>
          <h1 className="mt-5 text-2xl font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">AJ SUPER PORTAL</h1>
          <p className="mt-2 text-xs text-gray-400 text-center">TikReels • Pulse • Live • Gaming • Wallet</p>
          <button
            onClick={handleGoogleLogin}
            className="mt-10 w-full max-w-xs flex items-center justify-center gap-3 bg-white text-gray-900 font-black rounded-2xl py-4 shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-95 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </button>
          <p className="mt-6 text-[10px] text-gray-600 text-center max-w-xs">By continuing you agree to AJ Portal's Terms of Service and Privacy Policy.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          HUB SCREEN
      ══════════════════════════════════════════════════════ */}
      {screen === 'hub' && (
        <div className="flex flex-col min-h-screen bg-[#050505]">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative z-[50]">
                <img src="/logo.png" alt="AJ" className="w-9 h-9 rounded-xl shadow-[0_0_18px_rgba(236,72,153,0.5)]"/>
              </div>
              <div>
                <h1 className="text-sm font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">AJ SUPER PORTAL</h1>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Hub</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setNotifOpen(true); loadNotifications(); }} className="relative p-2 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                <span className="text-sm">🔔</span>
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-600 rounded-full text-[8px] font-black flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              <button onClick={handleSignOut} className="p-2 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                <LogOut size={14} className="text-gray-400"/>
              </button>
            </div>
          </div>

          {/* Sponsor Banner — non-clickable */}
          <div className="px-4 pt-3 pointer-events-none">
            <MonetagBanner siteId={MONETAG_PULSE_BANNER}/>
          </div>

          {/* Balance Card */}
          <div className="px-4 pt-4">
            <div className="rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(236,72,153,0.15)]" style={{background:'linear-gradient(135deg,#1a0a2e 0%,#0a0a1a 50%,#0d1a2e 100%)',border:'1px solid rgba(236,72,153,0.2)'}}>
              <div className="h-[2px] w-full bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400"/>
              <div className="p-5">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Total Balance</p>
                <p className="text-4xl font-black bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent mt-1">{parseFloat(displayBalance).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} <span className="text-lg text-yellow-400/70">🪙</span></p>
                <p className="text-xs text-gray-400 mt-1">≈ ${displayUsdt} USD</p>
                {botTier !== 'none' && (
                  <div className="mt-3 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-2xl px-3 py-2">
                    <span className="text-green-400 text-xs font-black animate-pulse">● LIVE</span>
                    <span className="text-green-300 text-xs font-black">{botTier.toUpperCase()} BOT ACTIVE</span>
                    <span className="ml-auto text-green-400 text-xs font-black">+{botTier==='vvip'?'5':'2'}% daily</span>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => { setScreen('wallet'); setWalletTab('purchase'); }} className="flex-1 py-2.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_18px_rgba(236,72,153,0.3)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>+ Buy Coins</button>
                  <button onClick={() => { setScreen('wallet'); setWalletTab('withdraw'); }} className="flex-1 py-2.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#0891b2,#0e7490)'}}>Withdraw</button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Nav Grid */}
          <div className="px-4 pt-4 grid grid-cols-3 gap-3">
            {[
              { icon:'🎬', label:'TikReels', action:() => { setScreen('social'); setSocialScreen('tikreels'); setTiktabMode('feed'); } },
              { icon:'📡', label:'AJ Pulse', action:() => { setScreen('social'); setSocialScreen('pulse'); setPulseTab('feed'); } },
              { icon:'💬', label:'WeChat',   action:() => { setScreen('social'); setSocialScreen('wechat'); } },
              { icon:'🎮', label:'Gaming',   action:() => setScreen('games') },
              { icon:'🤖', label:'AI Bot',   action:() => setScreen('aibot') },
              { icon:'💰', label:'Wallet',   action:() => { setScreen('wallet'); setWalletTab('main'); } },
            ].map(item => (
              <button key={item.label} onClick={item.action} className="flex flex-col items-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-4 active:scale-95 transition-all hover:border-pink-500/30">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Live Now */}
          {liveNowList.length > 0 && (
            <div className="px-4 pt-5">
              <p className="text-[10px] text-pink-400 font-black uppercase tracking-widest mb-3">🔴 Live Now</p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {liveNowList.map((room:any) => (
                  <button key={room.id} onClick={() => joinLiveByRoomId(room.id)} className="flex-shrink-0 flex flex-col items-center gap-1.5 active:scale-90 transition-all">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.4)]">
                      <img src={room.photo||'/logo.png'} className="w-full h-full object-cover"/>
                      <span className="absolute bottom-0.5 left-0.5 bg-red-600 text-white text-[7px] font-black px-1.5 rounded-full">LIVE</span>
                    </div>
                    <span className="text-[9px] text-gray-300 font-black max-w-[56px] truncate">@{room.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Referral Card */}
          <div className="px-4 pt-4 pb-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white">Refer & Earn</p>
                <p className="text-[9px] text-gray-400 truncate">Your ID: {user?.uid?.slice(0,16)}…</p>
              </div>
              <button onClick={() => copyToClipboard(user?.uid||'')} className="bg-pink-600/20 border border-pink-500/30 text-pink-400 text-[9px] font-black px-3 py-1.5 rounded-xl active:scale-90 transition-all">
                {copied ? '✓ Copied' : 'Copy ID'}
              </button>
            </div>
          </div>

          {/* Notifications Modal */}
          {notifOpen && (
            <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col">
              <div className="bg-[#0a0a1a] border-b border-white/10 px-4 py-4 flex items-center justify-between">
                <p className="text-sm font-black text-white">Notifications</p>
                <button onClick={() => setNotifOpen(false)}><X size={18} className="text-gray-400"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 && <p className="text-center text-gray-500 text-sm mt-10">No notifications yet.</p>}
                {notifications.map((n:any) => (
                  <div key={n.id} className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <p className="text-xs font-black text-white">{n.title}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SOCIAL SCREENS
      ══════════════════════════════════════════════════════ */}
      {screen === 'social' && (
        <div className="flex flex-col min-h-screen bg-[#050505]">

          {/* ── PROFILE SETUP ── */}
          {socialScreen === 'setup' && (
            <div className="flex flex-col min-h-screen bg-[#050505] px-4 pt-10">
              <button onClick={() => setSocialScreen('hub')} className="flex items-center gap-2 text-gray-400 mb-6 active:scale-95">
                <ArrowLeft size={16}/> Back
              </button>
              <h2 className="text-xl font-black text-white mb-1">Create Social Profile</h2>
              <p className="text-xs text-gray-400 mb-6">Set up your AJ Portal identity</p>
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-20 h-20 rounded-full border-2 border-pink-500 overflow-hidden cursor-pointer" onClick={handleImageClick}>
                  <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-full h-full object-cover"/>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Camera size={18} className="text-white"/></div>
                </div>
              </div>
              <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g,''))} placeholder="username (no spaces)" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm mb-3 focus:outline-none focus:border-pink-500/50"/>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio (optional)" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm mb-6 h-20 resize-none focus:outline-none focus:border-pink-500/50"/>
              <button onClick={handleCreateProfile} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                🚀 Activate Profile
              </button>
            </div>
          )}

          {/* ── SOCIAL HUB ── */}
          {socialScreen === 'hub' && (
            <div className="flex flex-col min-h-screen">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setScreen('hub')} className="active:scale-90 transition-all"><ArrowLeft size={16} className="text-gray-400"/></button>
                  <div className="relative z-[50]">
                    <img src="/logo.png" alt="AJ" className="w-7 h-7 rounded-lg"/>
                  </div>
                  <span className="text-sm font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">AJ SUPER PORTAL</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setScreen('social'); setSocialScreen('settings'); }} className="p-2 rounded-xl bg-white/5 border border-white/10 active:scale-90">
                    <Settings size={14} className="text-gray-400"/>
                  </button>
                </div>
              </div>

              {/* Sponsor Banner — non-clickable */}
              <div className="px-4 pt-3 pointer-events-none">
                <MonetagBanner siteId={MONETAG_PULSE_BANNER}/>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3">
                {/* Social Nav Buttons */}
                {[
                  { icon:'🎬', label:'AJ TikReels',  sub:'Short Videos',         action:() => { setSocialScreen('tikreels'); setTiktabMode('feed'); } },
                  { icon:'📡', label:'AJ Pulse',      sub:'Feed & Live Stream',   action:() => { setSocialScreen('pulse'); setPulseTab('feed'); } },
                  { icon:'💬', label:'WeChat',        sub:'Private Messaging',    action:() => setSocialScreen('wechat') },
                  { icon:'👥', label:'Community',     sub:'Global Chat',          action:() => setSocialScreen('chat') },
                ].map(item => (
                  <button key={item.label} onClick={item.action} className="w-full flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 active:scale-[0.98] transition-all hover:border-pink-500/20">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-black text-white">{item.label}</p>
                      <p className="text-[10px] text-gray-400">{item.sub}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-500"/>
                  </button>
                ))}

                {/* GO LIVE Button */}
                <button
                  onClick={() => { if (!liveActive) startLive(); else { setScreen('social'); setSocialScreen('live'); } }}
                  className="w-full flex items-center gap-4 rounded-2xl p-4 active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(239,68,68,0.3)]"
                  style={{background:'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05))',border:'1px solid rgba(239,68,68,0.3)'}}
                >
                  <span className="text-2xl">🔴</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-black text-red-400">{liveActive ? 'Back to Live' : 'GO LIVE'}</p>
                    <p className="text-[10px] text-gray-400">Stream to your audience</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-500"/>
                </button>

                {/* Join Live */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-black text-white mb-3">Join a Live Stream</p>
                  <div className="flex gap-2">
                    <input value={joinRoomInput} onChange={e => setJoinRoomInput(e.target.value)} placeholder="Enter Room ID" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-pink-500/50"/>
                    <button onClick={() => joinLiveByRoomId()} className="bg-pink-600 text-white text-xs font-black px-4 py-2 rounded-xl active:scale-90 transition-all">Join</button>
                  </div>
                </div>

                {/* Live Now */}
                {liveNowList.length > 0 && (
                  <div>
                    <p className="text-[10px] text-pink-400 font-black uppercase tracking-widest mb-3">🔴 Live Now</p>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {liveNowList.map((room:any) => (
                        <button key={room.id} onClick={() => joinLiveByRoomId(room.id)} className="flex-shrink-0 flex flex-col items-center gap-1.5 active:scale-90 transition-all">
                          <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.4)]">
                            <img src={room.photo||'/logo.png'} className="w-full h-full object-cover"/>
                            <span className="absolute bottom-0.5 left-0.5 bg-red-600 text-white text-[7px] font-black px-1.5 rounded-full">LIVE</span>
                          </div>
                          <span className="text-[9px] text-gray-300 font-black max-w-[56px] truncate">@{room.username}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TIKREELS ── */}
          {socialScreen === 'tikreels' && (
            <div className="flex flex-col h-screen bg-[#050505] overflow-hidden">
              {/* TikReels Header */}
              <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-safe pt-4 pb-2 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={() => setSocialScreen('hub')} className="p-2 rounded-full bg-black/40 backdrop-blur-sm active:scale-90 transition-all">
                  <ArrowLeft size={16} className="text-white"/>
                </button>
                <div className="flex gap-6">
                  {(['feed','create','profile'] as const).map(tab => (
                    <button key={tab} onClick={() => setTiktabMode(tab)} className={`text-sm font-black uppercase tracking-widest transition-all ${tiktabMode===tab ? 'text-white border-b-2 border-white pb-0.5' : 'text-gray-400'}`}>
                      {tab === 'feed' ? 'Feed' : tab === 'create' ? '+ Post' : 'Profile'}
                    </button>
                  ))}
                </div>
                <button onClick={() => setGlobalSoundOn(s => !s)} className="p-2 rounded-full bg-black/40 backdrop-blur-sm active:scale-90 transition-all">
                  {globalSoundOn ? <Volume2 size={16} className="text-white"/> : <VolumeX size={16} className="text-red-400"/>}
                </button>
              </div>

              {/* ── FEED TAB ── */}
              {tiktabMode === 'feed' && (
                <div
                  ref={videoFeedRef}
                  className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                  style={{ scrollSnapType: 'y mandatory' }}
                >
                  {[...pixaVideos].map((video, idx) => {
                    // Every 4th item is a Monetag ad
                    if (idx > 0 && idx % 4 === 0) {
                      return (
                        <div
                          key={`ad_${idx}`}
                          data-vidx={idx}
                          className="relative w-full h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505]"
                          style={{ scrollSnapAlign: 'start' }}
                        >
                          <MonetagVideoAd publisherId={MONETAG_PULSE_BANNER}/>
                        </div>
                      );
                    }
                    const isActive = activeVideoIdx === idx;
                    const iframeSrc = isActive && globalSoundOn
                      ? video.embedUrl?.replace('&mute=1','&mute=0')
                      : isActive
                        ? video.embedUrl
                        : '';
                    return (
                      <div
                        key={video.id || idx}
                        data-vidx={idx}
                        className="relative w-full h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505]"
                        style={{ scrollSnapAlign: 'start' }}
                      >
                        {/* Video iframe — center-click pauses */}
                        <div
                          className="absolute inset-0 w-full h-full"
                          onClick={() => setReelPaused(p => !p)}
                        >
                          <iframe
                            ref={el => { iframeRefs.current[idx] = el; }}
                            src={reelPaused && isActive ? '' : iframeSrc}
                            className="absolute inset-0 w-full h-full"
                            style={{ transform:'scale(1.15)', transformOrigin:'center center', pointerEvents:'none' }}
                            allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            frameBorder="0"
                            title={video.title}
                          />
                        </div>

                        {/* Pause indicator */}
                        {reelPaused && isActive && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                              <span className="text-white text-2xl">⏸</span>
                            </div>
                          </div>
                        )}

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"/>

                        {/* Right-side action buttons — stopPropagation so they don't pause */}
                        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
                          <button
                            onClick={e => { e.stopPropagation(); handleLike(video.id); }}
                            className="flex flex-col items-center gap-1 active:scale-90 transition-all"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${likedPosts[video.id] ? 'bg-red-500/30' : 'bg-black/40 backdrop-blur-sm'}`}>
                              <Heart size={18} className={likedPosts[video.id] ? 'text-red-400 fill-red-400' : 'text-white'}/>
                            </div>
                            <span className="text-white text-[9px] font-black">{likedPosts[video.id] ? '1' : '0'}</span>
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setCommentPostId(video.id); }}
                            className="flex flex-col items-center gap-1 active:scale-90 transition-all"
                          >
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <MessageSquare size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">0</span>
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleShare(video.title||'Check this out on AJ Portal!'); }}
                            className="flex flex-col items-center gap-1 active:scale-90 transition-all"
                          >
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Share2 size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Share</span>
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); if (user) { const g = giftItems[0]; sendGift(video.id, g); } }}
                            className="flex flex-col items-center gap-1 active:scale-90 transition-all"
                          >
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Gift size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Gift</span>
                          </button>
                        </div>

                        {/* Bottom info */}
                        <div className="absolute bottom-0 left-0 right-14 p-4 z-20 pointer-events-none">
                          <p className="text-white font-black text-sm leading-tight line-clamp-2">{video.title}</p>
                          <p className="text-gray-300 text-[10px] mt-1">@{video.user}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* User-uploaded TikReels */}
                  {userPosts.filter((p:any) => p.isVideo).map((post:any, idx:number) => {
                    const globalIdx = pixaVideos.length + idx;
                    const isActive  = activeVideoIdx === globalIdx;
                    return (
                      <div
                        key={post.id}
                        data-vidx={globalIdx}
                        className="relative w-full h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505]"
                        style={{ scrollSnapAlign: 'start' }}
                      >
                        <div className="absolute inset-0 w-full h-full" onClick={() => setReelPaused(p => !p)}>
                          <video
                            ref={el => { userVideoRefs.current[globalIdx] = el; }}
                            src={post.image}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay={isActive}
                            loop muted={!globalSoundOn}
                            playsInline
                            style={{ filter: post.cssFilter && post.cssFilter !== 'none' ? post.cssFilter : undefined }}
                          />
                        </div>
                        {reelPaused && isActive && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                              <span className="text-white text-2xl">⏸</span>
                            </div>
                          </div>
                        )}
                        {post.textOverlay && (
                          <div className="absolute top-1/3 left-0 right-0 flex justify-center pointer-events-none z-10">
                            <span className="bg-black/60 text-white font-black text-lg px-4 py-2 rounded-2xl backdrop-blur-sm">{post.textOverlay}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"/>
                        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
                          <button onClick={e => { e.stopPropagation(); handleLike(post.id); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${likedPosts[post.id] ? 'bg-red-500/30' : 'bg-black/40 backdrop-blur-sm'}`}>
                              <Heart size={18} className={likedPosts[post.id] ? 'text-red-400 fill-red-400' : 'text-white'}/>
                            </div>
                            <span className="text-white text-[9px] font-black">{post.likes||0}</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); setCommentPostId(post.id); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <MessageSquare size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">0</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleShare(post.text||''); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Share2 size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Share</span>
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-14 p-4 z-20 pointer-events-none">
                          <button className="flex items-center gap-2 mb-2 pointer-events-auto" onClick={e => { e.stopPropagation(); openProfile(post.uid); }}>
                            <img src={post.photo||'/logo.png'} className="w-8 h-8 rounded-full border border-white/30 object-cover"/>
                            <span className="text-white font-black text-xs">@{post.username}</span>
                          </button>
                          <p className="text-white text-sm font-bold line-clamp-2">{post.text}</p>
                          {post.selectedSound && <p className="text-gray-300 text-[10px] mt-1">🎵 {post.selectedSound}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── CREATE TAB (Advanced TikTok-style Editor) ── */}
              {tiktabMode === 'create' && (
                <div className="flex flex-col h-screen bg-[#050505] overflow-y-auto pt-16 pb-8 px-4">
                  <h2 className="text-lg font-black text-white mb-4">Create TikReel</h2>

                  {/* Media Preview with CSS Filter */}
                  <div
                    className="relative w-full aspect-[9/16] bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4 cursor-pointer"
                    onClick={handleTiktokImage}
                    style={{ filter: tikEditorFilter !== 'none' ? tikEditorFilter : undefined }}
                  >
                    {tiktokPostImg ? (
                      tiktokPostIsVideo
                        ? <video src={tiktokPostImg} className="w-full h-full object-cover" muted loop autoPlay playsInline/>
                        : <img src={tiktokPostImg} className="w-full h-full object-cover"/>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <PlusSquare size={32} className="text-gray-500"/>
                        <span className="text-gray-400 text-xs">Tap to add photo/video</span>
                      </div>
                    )}
                    {/* Text Overlay Preview */}
                    {tikEditorTextOverlay && (
                      <div className="absolute top-1/3 left-0 right-0 flex justify-center pointer-events-none">
                        <span className="bg-black/60 text-white font-black text-lg px-4 py-2 rounded-2xl backdrop-blur-sm">{tikEditorTextOverlay}</span>
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <textarea
                    value={tiktokPostText}
                    onChange={e => setTiktokPostText(e.target.value)}
                    placeholder="Add a caption…"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm mb-4 h-20 resize-none focus:outline-none focus:border-pink-500/50"
                  />

                  {/* Text Overlay Input */}
                  <div className="mb-4">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">📝 Text Overlay</p>
                    <input
                      value={tikEditorTextOverlay}
                      onChange={e => setTikEditorTextOverlay(e.target.value)}
                      placeholder="Text shown on video…"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"
                    />
                  </div>

                  {/* CSS Filters */}
                  <div className="mb-4">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">🎨 Filters</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {CSS_FILTERS.map(f => (
                        <button
                          key={f.value}
                          onClick={() => setTikEditorFilter(f.value)}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-90 ${tikEditorFilter === f.value ? 'bg-pink-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.5)]' : 'bg-white/5 border border-white/10 text-gray-300'}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Music / Sound Picker */}
                  <div className="mb-4">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">🎵 Sound</p>
                    {/* AJ Studio Sound marquee — clicking sets audio */}
                    <div
                      className="w-full bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30 rounded-2xl px-4 py-2 overflow-hidden cursor-pointer active:scale-95 transition-all mb-2"
                      onClick={() => { setSelectedSound('AJ Studio Sound'); setVvipAlert({msg:'🎵 AJ Studio Sound selected for your post!',icon:'🎵'}); }}
                    >
                      <div className="flex items-center gap-2">
                        <Music size={14} className="text-pink-400 flex-shrink-0"/>
                        <div className="overflow-hidden flex-1">
                          <p className="text-pink-300 text-[10px] font-black whitespace-nowrap animate-marquee">
                            🎵 AJ Studio Sound — Tap to use this track on your next post 🎵 AJ Studio Sound — Tap to use this track
                          </p>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setTikEditorShowMusic(m => !m)} className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3 active:scale-95 transition-all">
                      <div className="flex items-center gap-2">
                        <Music size={14} className="text-purple-400"/>
                        <span className="text-white text-xs font-black">{selectedSound || 'Choose Sound'}</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-500"/>
                    </button>
                    {tikEditorShowMusic && (
                      <div className="mt-2 bg-[#0a0a1a] border border-white/10 rounded-2xl overflow-hidden">
                        {AJ_SOUNDS.map(s => (
                          <button
                            key={s.id}
                            onClick={() => { setSelectedSound(s.label); setTikEditorShowMusic(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 active:scale-[0.98] transition-all ${selectedSound === s.label ? 'bg-pink-600/20' : ''}`}
                          >
                            <Music size={14} className={selectedSound === s.label ? 'text-pink-400' : 'text-gray-400'}/>
                            <span className={`text-sm font-black ${selectedSound === s.label ? 'text-pink-300' : 'text-white'}`}>{s.label}</span>
                            {selectedSound === s.label && <span className="ml-auto text-pink-400 text-xs">✓</span>}
                          </button>
                        ))}
                        <button
                          onClick={() => audioFileRef.current?.click()}
                          className="w-full flex items-center gap-3 px-4 py-3 active:scale-[0.98] transition-all"
                        >
                          <PlusSquare size={14} className="text-gray-400"/>
                          <span className="text-sm font-black text-gray-300">Upload Custom Audio</span>
                        </button>
                      </div>
                    )}
                    {tiktokAudioFile && (
                      <p className="text-[10px] text-green-400 mt-1 px-1">✓ Custom audio: {tiktokAudioFile.name}</p>
                    )}
                  </div>

                  <button onClick={handleTiktokPost} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                    🚀 Post TikReel (+{tiktokPostIsVideo ? 10 : 5} Coins)
                  </button>
                </div>
              )}

              {/* ── PROFILE TAB ── */}
              {tiktabMode === 'profile' && (
                <div className="flex flex-col h-screen bg-[#050505] overflow-y-auto pt-16 pb-8">
                  <div className="flex flex-col items-center px-4 py-6">
                    <div className="relative w-20 h-20 rounded-full border-2 border-pink-500 overflow-hidden cursor-pointer" onClick={handleImageClick}>
                      <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-full h-full object-cover"/>
                    </div>
                    <p className="text-white font-black text-lg mt-3">@{username||'AJ_Member'}</p>
                    <p className="text-gray-400 text-xs mt-1 text-center max-w-xs">{bio||'No bio yet.'}</p>
                    <div className="flex gap-8 mt-4">
                      <div className="text-center"><p className="text-white font-black text-lg">{userPosts.filter((p:any) => p.uid===user?.uid).length}</p><p className="text-gray-400 text-[10px]">Posts</p></div>
                      <div className="text-center"><p className="text-white font-black text-lg">0</p><p className="text-gray-400 text-[10px]">Followers</p></div>
                      <div className="text-center"><p className="text-white font-black text-lg">0</p><p className="text-gray-400 text-[10px]">Following</p></div>
                    </div>
                  </div>
                  <div className="flex border-b border-white/10">
                    {(['posts','following'] as const).map(tab => (
                      <button key={tab} onClick={() => setTikProfileSubTab(tab)} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${tikProfileSubTab===tab ? 'text-white border-b-2 border-pink-500' : 'text-gray-500'}`}>
                        {tab}
                      </button>
                    ))}
                  </div>
                  {tikProfileSubTab === 'posts' && (
                    <div className="grid grid-cols-3 gap-0.5 p-0.5">
                      {userPosts.filter((p:any) => p.uid===user?.uid).map((post:any) => (
                        <div key={post.id} className="relative aspect-square bg-white/5 overflow-hidden">
                          {post.image
                            ? <img src={post.image} className="w-full h-full object-cover"/>
                            : <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">📝</span></div>
                          }
                          <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
                            <span className="text-white text-[8px] font-black drop-shadow">{formatViews(post.views||0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {tikProfileSubTab === 'following' && (
                    <div className="px-4 py-4 space-y-3">
                      {followingList.length === 0 && <p className="text-center text-gray-500 text-sm mt-6">Not following anyone yet.</p>}
                      {followingList.map((f:any) => (
                        <button key={f.uid} onClick={() => openProfile(f.uid)} className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 active:scale-[0.98] transition-all">
                          <img src={f.photo||'/logo.png'} className="w-10 h-10 rounded-full object-cover border border-white/20"/>
                          <div className="flex-1 text-left">
                            <p className="text-white font-black text-sm">@{f.username||f.uid}</p>
                            <p className="text-gray-400 text-[10px]">{f.bio||''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Comment Sheet */}
              {commentPostId && (
                <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end">
                  <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl max-h-[70vh] flex flex-col">
                    <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                      <p className="text-sm font-black text-white">Comments</p>
                      <button onClick={() => setCommentPostId(null)}><X size={18} className="text-gray-400"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {postComments.length === 0 && <p className="text-center text-gray-500 text-sm">No comments yet. Be first!</p>}
                      {postComments.map((c:any) => (
                        <div key={c.id} className="flex gap-3">
                          <img src={c.photo||'/logo.png'} className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                          <div className="flex-1 bg-white/5 rounded-2xl px-3 py-2">
                            <p className="text-[10px] text-pink-400 font-black">@{c.username}</p>
                            <p className="text-white text-xs mt-0.5">{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 p-4 border-t border-white/10">
                      <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key==='Enter' && submitComment()} placeholder="Add a comment…" className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                      <button onClick={submitComment} className="bg-pink-600 text-white p-2.5 rounded-2xl active:scale-90 transition-all"><Send size={16}/></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── AJ PULSE ── */}
          {socialScreen === 'pulse' && (
            <div className="flex flex-col h-screen bg-[#050505] overflow-hidden">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <button onClick={() => setSocialScreen('hub')} className="active:scale-90 transition-all"><ArrowLeft size={16} className="text-gray-400"/></button>
                <div className="flex gap-6">
                  {(['feed','create','profile'] as const).map(tab => (
                    <button key={tab} onClick={() => setPulseTab(tab)} className={`text-xs font-black uppercase tracking-widest transition-all ${pulseTab===tab ? 'text-white border-b-2 border-white pb-0.5' : 'text-gray-400'}`}>
                      {tab === 'feed' ? 'Feed' : tab === 'create' ? '+ Post' : 'Profile'}
                    </button>
                  ))}
                </div>
                <button onClick={() => setPulseMuted(m => !m)} className="p-2 rounded-full bg-black/40 backdrop-blur-sm active:scale-90 transition-all">
                  {pulseMuted ? <VolumeX size={14} className="text-red-400"/> : <Volume2 size={14} className="text-white"/>}
                </button>
              </div>

              {/* ── PULSE FEED ── */}
              {pulseTab === 'feed' && (
                <div
                  ref={videoFeedRef}
                  className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                  style={{ scrollSnapType: 'y mandatory' }}
                >
                  {pulsePosts.map((post:any, idx:number) => {
                    if (idx > 0 && idx % 4 === 0) {
                      return (
                        <div key={`pulse_ad_${idx}`} data-vidx={idx} className="relative w-full h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505]" style={{ scrollSnapAlign:'start' }}>
                          <MonetagVideoAd publisherId={MONETAG_PULSE_BANNER}/>
                        </div>
                      );
                    }
                    const isActive = activeVideoIdx === idx;
                    return (
                      <div key={post.id} data-vidx={idx} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505] flex flex-col justify-end" style={{ scrollSnapAlign:'start' }}>
                        {post.isVideo && post.image ? (
                          <video
                            ref={el => { userVideoRefs.current[idx] = el; }}
                            src={post.image}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay={isActive} loop muted={pulseMuted} playsInline
                            onClick={() => setReelPaused(p => !p)}
                          />
                        ) : post.image ? (
                          <img src={post.image} className="absolute inset-0 w-full h-full object-cover"/>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50"/>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"/>
                        {/* Right actions */}
                        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
                          <button onClick={e => { e.stopPropagation(); handleLike(post.id); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${likedPosts[post.id] ? 'bg-red-500/30' : 'bg-black/40 backdrop-blur-sm'}`}>
                              <Heart size={18} className={likedPosts[post.id] ? 'text-red-400 fill-red-400' : 'text-white'}/>
                            </div>
                            <span className="text-white text-[9px] font-black">{post.likes||0}</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); setCommentPostId(post.id); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <MessageSquare size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">0</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleShare(post.text||''); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Share2 size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Share</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); setPulseGiftPostId(post.id); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Gift size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Gift</span>
                          </button>
                        </div>
                        {/* Bottom info */}
                        <div className="relative z-10 p-4">
                          <button className="flex items-center gap-2 mb-2" onClick={() => openProfile(post.uid)}>
                            <img src={post.photo||'/logo.png'} className="w-8 h-8 rounded-full border border-white/30 object-cover"/>
                            <span className="text-white font-black text-xs">@{post.username}</span>
                          </button>
                          <p className="text-white text-sm font-bold line-clamp-3">{post.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  {pulsePosts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 pt-32">
                      <span className="text-5xl">📡</span>
                      <p className="text-gray-400 text-sm">No posts yet. Be the first!</p>
                      <button onClick={() => setPulseTab('create')} className="bg-pink-600 text-white text-xs font-black px-6 py-3 rounded-2xl active:scale-95 transition-all">+ Create Post</button>
                    </div>
                  )}
                </div>
              )}

              {/* ── PULSE CREATE ── */}
              {pulseTab === 'create' && (
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  <div className="relative w-full aspect-video bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer" onClick={handleImageClick}>
                    {tempPhoto ? (
                      pulsePostIsVideo
                        ? <video src={tempPhoto} className="w-full h-full object-cover" muted loop autoPlay playsInline/>
                        : <img src={tempPhoto} className="w-full h-full object-cover"/>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <PlusSquare size={32} className="text-gray-500"/>
                        <span className="text-gray-400 text-xs">Tap to add photo/video</span>
                      </div>
                    )}
                  </div>
                  <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="What's on your mind?" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm h-24 resize-none focus:outline-none focus:border-pink-500/50"/>
                  <button onClick={handleCreatePost} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                    🚀 Post (+{pulsePostIsVideo ? 10 : 5} Coins)
                  </button>
                </div>
              )}

              {/* ── PULSE PROFILE ── */}
              {pulseTab === 'profile' && (
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col items-center px-4 py-6">
                    <div className="relative w-20 h-20 rounded-full border-2 border-pink-500 overflow-hidden cursor-pointer" onClick={handleImageClick}>
                      <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-full h-full object-cover"/>
                    </div>
                    <p className="text-white font-black text-lg mt-3">@{username||'AJ_Member'}</p>
                    <p className="text-gray-400 text-xs mt-1 text-center max-w-xs">{bio||'No bio yet.'}</p>
                    <div className="flex gap-8 mt-4">
                      <div className="text-center"><p className="text-white font-black text-lg">{pulsePosts.filter((p:any) => p.uid===user?.uid).length}</p><p className="text-gray-400 text-[10px]">Posts</p></div>
                      <div className="text-center"><p className="text-white font-black text-lg">0</p><p className="text-gray-400 text-[10px]">Followers</p></div>
                      <div className="text-center"><p className="text-white font-black text-lg">0</p><p className="text-gray-400 text-[10px]">Following</p></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 p-0.5">
                    {pulsePosts.filter((p:any) => p.uid===user?.uid).map((post:any) => (
                      <div key={post.id} className="relative aspect-square bg-white/5 overflow-hidden">
                        {post.image
                          ? <img src={post.image} className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">📝</span></div>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pulse Gift Panel */}
              {pulseGiftPostId && (
                <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end">
                  <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-black text-white">Send a Gift 🎁</p>
                      <button onClick={() => setPulseGiftPostId(null)}><X size={18} className="text-gray-400"/></button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {giftItems.map(g => (
                        <button key={g.id} onClick={() => { const post = pulsePosts.find((p:any) => p.id===pulseGiftPostId); if (post) { sendGift(post.uid, g); setPulseGiftPostId(null); } }} className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-3 active:scale-90 transition-all">
                          <span className="text-2xl">{g.icon}</span>
                          <span className="text-white text-[9px] font-black">{g.name}</span>
                          <span className="text-yellow-400 text-[9px] font-black">{g.cost.toLocaleString()} 🪙</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Pulse Comment Sheet */}
              {commentPostId && (
                <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end">
                  <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl max-h-[70vh] flex flex-col">
                    <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                      <p className="text-sm font-black text-white">Comments</p>
                      <button onClick={() => setCommentPostId(null)}><X size={18} className="text-gray-400"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {postComments.length === 0 && <p className="text-center text-gray-500 text-sm">No comments yet.</p>}
                      {postComments.map((c:any) => (
                        <div key={c.id} className="flex gap-3">
                          <img src={c.photo||'/logo.png'} className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                          <div className="flex-1 bg-white/5 rounded-2xl px-3 py-2">
                            <p className="text-[10px] text-pink-400 font-black">@{c.username}</p>
                            <p className="text-white text-xs mt-0.5">{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 p-4 border-t border-white/10">
                      <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key==='Enter' && submitComment()} placeholder="Add a comment…" className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                      <button onClick={submitComment} className="bg-pink-600 text-white p-2.5 rounded-2xl active:scale-90 transition-all"><Send size={16}/></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── WECHAT (Private Messaging + ZegoCloud Calls) ── */}
          {socialScreen === 'wechat' && (
            <div className="flex flex-col h-screen bg-[#050505]">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <button onClick={() => setSocialScreen('hub')} className="active:scale-90 transition-all"><ArrowLeft size={16} className="text-gray-400"/></button>
                <span className="text-sm font-black text-white">💬 WeChat</span>
                <button onClick={handleContactsSync} className="p-2 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                  <UserPlus size={14} className="text-gray-400"/>
                </button>
              </div>

              {/* Sponsor Banner — non-clickable */}
              <div className="px-4 pt-3 pointer-events-none">
                <MonetagBanner siteId={MONETAG_WECHAT_SPONSOR}/>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {wechatContacts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <span className="text-5xl">💬</span>
                    <p className="text-gray-400 text-sm text-center">No contacts yet.<br/>Tap + to add a contact.</p>
                    <button onClick={() => setAddContactOpen(true)} className="bg-pink-600 text-white text-xs font-black px-6 py-3 rounded-2xl active:scale-95 transition-all">+ Add Contact</button>
                  </div>
                )}
                {wechatContacts.map((name, i) => (
                  <button key={i} onClick={() => { setActiveChatUser({ uid: name, username: name, photo: '/logo.png' }); openOrCreateChat(name, { uid:name, username:name, photo:'/logo.png' }); }} className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-black text-sm">{name}</p>
                      <p className="text-gray-400 text-[10px]">Tap to chat</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-500"/>
                  </button>
                ))}
              </div>

              {addContactOpen && (
                <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end">
                  <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-black text-white">Add Contact</p>
                      <button onClick={() => setAddContactOpen(false)}><X size={18} className="text-gray-400"/></button>
                    </div>
                    <input value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="Contact name or User ID" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm mb-4 focus:outline-none focus:border-pink-500/50"/>
                    <button onClick={addManualContact} className="w-full py-3 rounded-2xl text-white font-black active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>Add</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DM CHAT ── */}
          {socialScreen === 'dm' && activeChatUser && (
            <div className="flex flex-col h-screen bg-[#050505]">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <button onClick={() => setSocialScreen('wechat')} className="active:scale-90 transition-all"><ArrowLeft size={16} className="text-gray-400"/></button>
                <img src={activeChatUser.photo||'/logo.png'} className="w-8 h-8 rounded-full object-cover border border-white/20"/>
                <div className="flex-1">
                  <p className="text-white font-black text-sm">@{activeChatUser.username||activeChatUser.uid}</p>
                  <p className="text-gray-500 text-[9px]">Private Chat</p>
                </div>
                {/* ZegoCloud Call Buttons */}
                <button
                  onClick={() => startZegoCall('audio')}
                  className="p-2 rounded-xl bg-green-600/20 border border-green-500/30 active:scale-90 transition-all"
                  title="Audio Call"
                >
                  <Phone size={14} className="text-green-400"/>
                </button>
                <button
                  onClick={() => startZegoCall('video')}
                  className="p-2 rounded-xl bg-cyan-600/20 border border-cyan-500/30 active:scale-90 transition-all"
                  title="Video Call"
                >
                  <VideoIcon size={14} className="text-cyan-400"/>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {dmMessages.length === 0 && <p className="text-center text-gray-500 text-sm mt-10">Say hello! 👋</p>}
                {dmMessages.map((msg:any) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.uid===user?.uid ? 'flex-row-reverse' : ''}`}>
                    <img src={msg.photo||'/logo.png'} className="w-7 h-7 rounded-full object-cover flex-shrink-0"/>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl ${msg.uid===user?.uid ? 'bg-pink-600/80 text-white' : 'bg-white/10 text-white'}`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={dmEndRef}/>
              </div>
              <div className="flex gap-2 p-4 border-t border-white/10 bg-[#050505]">
                <input value={dmInput} onChange={e => setDmInput(e.target.value)} onKeyDown={e => e.key==='Enter' && sendDmMessage()} placeholder="Message…" className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                <button onClick={sendDmMessage} className="bg-pink-600 text-white p-2.5 rounded-2xl active:scale-90 transition-all"><Send size={16}/></button>
              </div>
            </div>
          )}

          {/* ── COMMUNITY CHAT ── */}
          {socialScreen === 'chat' && (
            <div className="flex flex-col h-screen bg-[#050505]">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <button onClick={() => setSocialScreen('hub')} className="active:scale-90 transition-all"><ArrowLeft size={16} className="text-gray-400"/></button>
                <span className="text-sm font-black text-white">👥 Community Chat</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && <p className="text-center text-gray-500 text-sm mt-10">No messages yet. Start the conversation!</p>}
                {chatMessages.map((msg:any) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.uid===user?.uid ? 'flex-row-reverse' : ''}`}>
                    <img src={msg.photo||'/logo.png'} className="w-7 h-7 rounded-full object-cover flex-shrink-0"/>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl ${msg.uid===user?.uid ? 'bg-pink-600/80 text-white' : 'bg-white/10 text-white'}`}>
                      <p className="text-[9px] text-pink-300 font-black mb-0.5">@{msg.username}</p>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 p-4 border-t border-white/10 bg-[#050505]">
                <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key==='Enter' && sendChatMessage()} placeholder="Message the community…" className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                <button onClick={sendChatMessage} className="bg-pink-600 text-white p-2.5 rounded-2xl active:scale-90 transition-all"><Send size={16}/></button>
              </div>
            </div>
          )}

          {/* ── LIVE SCREEN ── */}
          {socialScreen === 'live' && liveActive && (
            <div className="flex flex-col h-screen bg-[#050505]">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full animate-pulse">🔴 LIVE</span>
                  <span className="text-white font-black text-sm">@{username||'AJ_Member'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPkChallengeOpen(true)} className="flex items-center gap-1.5 bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 text-[9px] font-black px-3 py-1.5 rounded-full active:scale-90 transition-all">
                    <Swords size={12}/> PK
                  </button>
                  <button onClick={stopLive} className="bg-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-full active:scale-90 transition-all">End Live</button>
                </div>
              </div>
              <div className="relative flex-1 bg-black overflow-hidden">
                <div id="video-container" className="absolute inset-0 w-full h-full"/>
                {cameraReady && <video ref={liveVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-0"/>}
                {/* Room ID */}
                <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-sm rounded-2xl px-3 py-2 flex items-center gap-2">
                  <span className="text-gray-400 text-[9px]">Room ID:</span>
                  <span className="text-white text-[9px] font-black max-w-[100px] truncate">{liveRoomId}</span>
                  <button onClick={() => copyToClipboard(liveRoomId)} className="text-pink-400 text-[9px] font-black active:scale-90">{copied?'✓':'Copy'}</button>
                </div>
                {/* PK Active */}
                {pkActive && (
                  <div className="absolute top-16 left-0 right-0 z-20 flex items-center justify-center gap-4 px-4">
                    <div className="flex-1 bg-pink-600/30 border border-pink-500/40 rounded-2xl p-3 text-center">
                      <p className="text-white font-black text-xs">@{username}</p>
                      <p className="text-yellow-400 font-black text-lg">{pkScore.me.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-white font-black text-sm">⚔️</span>
                      <span className="text-yellow-400 font-black text-xs">{formatPkTime(pkTimer)}</span>
                    </div>
                    <div className="flex-1 bg-cyan-600/30 border border-cyan-500/40 rounded-2xl p-3 text-center">
                      <p className="text-white font-black text-xs">@{pkRivalData?.username||'Rival'}</p>
                      <p className="text-yellow-400 font-black text-lg">{pkScore.rival.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {pkWinner && (
                  <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-6xl mb-4">🏆</p>
                      <p className="text-white font-black text-2xl">@{pkWinner} WINS!</p>
                      <button onClick={() => { setPkWinner(null); setPkActive(false); }} className="mt-4 bg-pink-600 text-white font-black px-6 py-3 rounded-2xl active:scale-95 transition-all">Close</button>
                    </div>
                  </div>
                )}
              </div>
              {/* Live Chat */}
              <div className="h-48 flex flex-col border-t border-white/10">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {liveChatMessages.map((msg:any) => (
                    <div key={msg.id} className="flex items-start gap-2">
                      <img src={msg.photo||'/logo.png'} className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5"/>
                      <div>
                        <span className="text-pink-400 text-[9px] font-black">@{msg.username} </span>
                        <span className="text-white text-[10px]">{msg.text}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={liveChatEndRef}/>
                </div>
                <div className="flex gap-2 p-3 border-t border-white/10">
                  <input value={liveChatInput} onChange={e => setLiveChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && sendLiveChatMessage()} placeholder="Say something…" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"/>
                  <button onClick={sendLiveChatMessage} className="bg-pink-600 text-white p-2 rounded-xl active:scale-90 transition-all"><Send size={12}/></button>
                </div>
              </div>
              {/* Gift Row */}
              <div className="flex gap-2 overflow-x-auto px-3 pb-3 scrollbar-hide">
                {giftItems.map(g => (
                  <button key={g.id} onClick={() => sendGift(user!.uid, g)} className="flex-shrink-0 flex flex-col items-center gap-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 active:scale-90 transition-all">
                    <span className="text-xl">{g.icon}</span>
                    <span className="text-white text-[8px] font-black">{g.cost.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── VIEWER LIVE ── */}
          {viewerRoom && (
            <div className="fixed inset-0 z-[9800] flex flex-col bg-[#050505]">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <button onClick={leaveViewerRoom} className="active:scale-90 transition-all"><ArrowLeft size={16} className="text-gray-400"/></button>
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">🔴 LIVE</span>
                  <span className="text-white font-black text-sm">@{viewerRoom.username}</span>
                </div>
                <div/>
              </div>
              <div className="relative flex-1 bg-black overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/live_stream?channel=${viewerRoom.uid}&autoplay=1&mute=0`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen frameBorder="0"
                />
              </div>
              <div className="h-48 flex flex-col border-t border-white/10">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {viewerChatMessages.map((msg:any) => (
                    <div key={msg.id} className="flex items-start gap-2">
                      <img src={msg.photo||'/logo.png'} className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5"/>
                      <div>
                        <span className="text-pink-400 text-[9px] font-black">@{msg.username} </span>
                        <span className="text-white text-[10px]">{msg.text}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={viewerChatEndRef}/>
                </div>
                <div className="flex gap-2 p-3 border-t border-white/10">
                  <input value={viewerChatInput} onChange={e => setViewerChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && sendViewerChatMessage()} placeholder="Say something…" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"/>
                  <button onClick={sendViewerChatMessage} className="bg-pink-600 text-white p-2 rounded-xl active:scale-90 transition-all"><Send size={12}/></button>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto px-3 pb-3 scrollbar-hide">
                {giftItems.map(g => (
                  <button key={g.id} onClick={() => sendGift(viewerRoom.uid, g)} className="flex-shrink-0 flex flex-col items-center gap-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 active:scale-90 transition-all">
                    <span className="text-xl">{g.icon}</span>
                    <span className="text-white text-[8px] font-black">{g.cost.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PROFILE VIEW ── */}
          {socialScreen === 'profile' && (
            <div className="flex flex-col min-h-screen bg-[#050505]">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <button onClick={() => setSocialScreen('hub')} className="active:scale-90 transition-all"><ArrowLeft size={16} className="text-gray-400"/></button>
                <span className="text-sm font-black text-white">Profile</span>
              </div>
              {profileLoading ? (
                <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"/></div>
              ) : viewProfile ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col items-center px-4 py-6">
                    <img src={viewProfile.photo||'/logo.png'} className="w-20 h-20 rounded-full border-2 border-pink-500 object-cover shadow-[0_0_24px_rgba(236,72,153,0.3)]"/>
                    <p className="text-white font-black text-lg mt-3">@{viewProfile.username||'AJ_Member'}</p>
                    <p className="text-gray-400 text-xs mt-1 text-center max-w-xs">{viewProfile.bio||''}</p>
                    <div className="flex gap-8 mt-4">
                      <div className="text-center"><p className="text-white font-black text-lg">{viewProfile.postsCount||0}</p><p className="text-gray-400 text-[10px]">Posts</p></div>
                      <div className="text-center"><p className="text-white font-black text-lg">{followers}</p><p className="text-gray-400 text-[10px]">Followers</p></div>
                      <div className="text-center"><p className="text-white font-black text-lg">{following}</p><p className="text-gray-400 text-[10px]">Following</p></div>
                    </div>
                    {viewingUid !== user?.uid && (
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => handleFollow(viewingUid!)} className={`px-6 py-2.5 rounded-2xl text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all ${isFollowing ? 'bg-white/10 border border-white/20' : 'bg-pink-600 shadow-[0_0_18px_rgba(236,72,153,0.4)]'}`}>
                          {isFollowing ? '✓ Following' : '+ Follow'}
                        </button>
                        <button onClick={() => openOrCreateChat(viewingUid!, viewProfile)} className="px-6 py-2.5 rounded-2xl text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all bg-white/10 border border-white/20">
                          Message
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 p-0.5">
                    {[...profilePosts, ...profileVideos].map((post:any) => (
                      <div key={post.id} className="relative aspect-square bg-white/5 overflow-hidden">
                        {post.image
                          ? <img src={post.image} className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">📝</span></div>
                        }
                        {post.isVideo && <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"><Film size={8} className="text-white"/></div>}
                        <div className="absolute bottom-1 left-1"><span className="text-white text-[8px] font-black drop-shadow">{formatViews(post.views||0)}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {socialScreen === 'settings' && (
            <div className="flex flex-col min-h-screen bg-[#050505]">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <button onClick={() => setSocialScreen('hub')} className="active:scale-90 transition-all"><ArrowLeft size={16} className="text-gray-400"/></button>
                <span className="text-sm font-black text-white">Settings</span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative w-20 h-20 rounded-full border-2 border-pink-500 overflow-hidden cursor-pointer">
                    <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-full h-full object-cover"/>
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer">
                      <Camera size={18} className="text-white"/>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpdate}/>
                    </label>
                  </div>
                </div>
                <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g,''))} placeholder="Username" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm h-20 resize-none focus:outline-none focus:border-pink-500/50"/>
                <button onClick={handleCreateProfile} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                  Save Profile
                </button>
                <button onClick={handleSignOut} className="w-full py-3 rounded-2xl text-red-400 font-black uppercase tracking-widest active:scale-95 transition-all bg-red-600/10 border border-red-500/20">
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* PK Challenge Modal */}
          {pkChallengeOpen && (
            <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end">
              <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-black text-white">⚔️ PK Challenge</p>
                  <button onClick={() => setPkChallengeOpen(false)}><X size={18} className="text-gray-400"/></button>
                </div>
                <p className="text-gray-400 text-xs mb-4">Enter your rival's User ID. Entry cost: {PK_ENTRY_COINS} Coins.</p>
                <input value={pkTargetId} onChange={e => setPkTargetId(e.target.value)} placeholder="Rival's User ID" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm mb-4 focus:outline-none focus:border-yellow-500/50"/>
                <button onClick={sendPkChallenge} className="w-full py-3 rounded-2xl text-white font-black active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>
                  ⚔️ Send Challenge ({PK_ENTRY_COINS} Coins)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          WALLET SCREEN
      ══════════════════════════════════════════════════════ */}
      {screen === 'wallet' && (
        <div className="flex flex-col min-h-screen bg-[#050505]">
          <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setScreen('hub')} className="active:scale-90 transition-all"><ArrowLeft size={16} className="text-gray-400"/></button>
            <span className="text-sm font-black text-white">💰 Wallet</span>
          </div>

          {/* Sponsor Banner — non-clickable */}
          <div className="px-4 pt-3 pointer-events-none">
            <MonetagBanner siteId={MONETAG_PULSE_BANNER}/>
          </div>

          {/* Balance */}
          <div className="px-4 pt-4">
            <div className="rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(236,72,153,0.15)]" style={{background:'linear-gradient(135deg,#1a0a2e 0%,#0a0a1a 50%,#0d1a2e 100%)',border:'1px solid rgba(236,72,153,0.2)'}}>
              <div className="h-[2px] w-full bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400"/>
              <div className="p-5">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Total Balance</p>
                <p className="text-4xl font-black bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent mt-1">{parseFloat(displayBalance).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} <span className="text-lg text-yellow-400/70">🪙</span></p>
                <p className="text-xs text-gray-400 mt-1">≈ ${displayUsdt} USD</p>
              </div>
            </div>
          </div>

          {/* Wallet Tabs */}
          <div className="flex gap-1 px-4 pt-4 overflow-x-auto scrollbar-hide">
            {[
              { id:'main',     label:'Overview' },
              { id:'purchase', label:'Buy Coins' },
              { id:'withdraw', label:'Withdraw' },
              { id:'transfer', label:'Transfer' },
              { id:'referral', label:'Referral' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setWalletTab(tab.id)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletTab===tab.id ? 'bg-pink-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.4)]' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">

            {/* OVERVIEW */}
            {walletTab === 'main' && (
              <div className="space-y-3">
                {[
                  { icon:'🪙', label:'Total Coins',   value:`${parseFloat(displayBalance).toLocaleString(undefined,{minimumFractionDigits:2})} Coins` },
                  { icon:'💵', label:'USD Value',     value:`$${displayUsdt}` },
                  { icon:'🤖', label:'Bot Tier',      value:botTier.toUpperCase() },
                  { icon:'📈', label:'Bot Profit',    value:`+${visualProfit.toFixed(4)} Coins` },
                  { icon:'💰', label:'Invested',      value:`${invested.toLocaleString()} Coins` },
                  { icon:'💸', label:'Min Withdraw',  value:`${WITHDRAW_MIN.toLocaleString()} Coins ($${WITHDRAW_MIN/CASH_RATE})` },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1">
                      <p className="text-gray-400 text-[10px] uppercase tracking-widest">{item.label}</p>
                      <p className="text-white font-black text-sm">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BUY COINS */}
            {walletTab === 'purchase' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400">Rate: $1 = {COIN_RATE} Coins. Min: ${MIN_PURCHASE}.</p>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Amount (USD)</p>
                  <input type="number" value={purchaseAmount} onChange={e => setPurchaseAmount(Number(e.target.value))} min={MIN_PURCHASE} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                  <p className="text-[10px] text-yellow-400 mt-1">= {(purchaseAmount*COIN_RATE).toLocaleString()} Coins</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[20,50,100,200,500].map(v => (
                    <button key={v} onClick={() => setPurchaseAmount(v)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-90 ${purchaseAmount===v ? 'bg-pink-600 text-white' : 'bg-white/5 border border-white/10 text-gray-300'}`}>${v}</button>
                  ))}
                </div>
                <button onClick={handlePurchase} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                  💳 Pay ${purchaseAmount} → Get {(purchaseAmount*COIN_RATE).toLocaleString()} Coins
                </button>
                <p className="text-[9px] text-gray-500 text-center">Powered by NOWPayments · Auto-credited on confirmation</p>
              </div>
            )}

            {/* WITHDRAW */}
            {walletTab === 'withdraw' && (
              <div className="space-y-4">
                <div className="bg-yellow-600/10 border border-yellow-500/20 rounded-2xl p-3">
                  <p className="text-yellow-400 text-xs font-black">Minimum Withdrawal: {WITHDRAW_MIN.toLocaleString()} Coins = ${WITHDRAW_MIN/CASH_RATE} USD</p>
                  <p className="text-gray-400 text-[10px] mt-1">Your balance: {balance.toFixed(0)} Coins {balance < WITHDRAW_MIN ? `(Need ${(WITHDRAW_MIN-balance).toFixed(0)} more)` : '✓ Eligible'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Payout Method</p>
                  <select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50">
                    {WITHDRAW_METHODS.map(m => <option key={m.label} value={m.label} className="bg-[#0a0a1a]">{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">{currentWithdrawMethod.field}</p>
                  <input value={payoutId} onChange={e => setPayoutId(e.target.value)} placeholder={currentWithdrawMethod.placeholder} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                </div>
                <button onClick={handleWithdraw} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(6,182,212,0.3)]" style={{background:'linear-gradient(135deg,#0891b2,#0e7490)'}}>
                  💸 Request Withdrawal
                </button>
                <p className="text-[9px] text-gray-500 text-center">Processed monthly (25th–31st). Rate: {CASH_RATE} Coins = $1</p>
              </div>
            )}

            {/* TRANSFER */}
            {walletTab === 'transfer' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Recipient User ID</p>
                  <input value={transferId} onChange={e => setTransferId(e.target.value)} placeholder="Paste recipient's User ID" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Amount (Coins)</p>
                  <input type="number" value={transferAmount} onChange={e => setTransferAmount(Number(e.target.value))} min={1} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                </div>
                <button onClick={handleTransfer} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.3)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                  🔄 Transfer Coins
                </button>
              </div>
            )}

            {/* REFERRAL */}
            {walletTab === 'referral' && (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-black text-white mb-1">Your Referral Code</p>
                  <p className="text-gray-400 text-[10px] mb-3">Share your User ID with friends. They paste it below to earn you {REFERRAL_COINS} Coins.</p>
                  <div className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2">
                    <span className="text-white text-xs flex-1 truncate font-mono">{user?.uid}</span>
                    <button onClick={() => copyToClipboard(user?.uid||'')} className="text-pink-400 text-[9px] font-black active:scale-90">{copied?'✓':'Copy'}</button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Enter Referral Code</p>
                  <input value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="Paste referrer's User ID" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                </div>
                <button onClick={handleApplyReferral} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.3)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                  🎉 Apply Referral Code
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          GAMES SCREEN
      ══════════════════════════════════════════════════════ */}
      {screen === 'games' && (
        <div className="flex flex-col min-h-screen bg-[#050505]">
          <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setScreen('hub')} className="active:scale-90 transition-all"><ArrowLeft size={16} className="text-gray-400"/></button>
            <span className="text-sm font-black text-white">🎮 Gaming Zone</span>
          </div>

          {/* Sponsor Banner — non-clickable */}
          <div className="px-4 pt-3 pointer-events-none">
            <MonetagBanner siteId={MONETAG_PULSE_BANNER}/>
          </div>

          {selectedGame ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10">
                <button onClick={() => setSelectedGame(null)} className="active:scale-90 transition-all"><ArrowLeft size={14} className="text-gray-400"/></button>
                <span className="text-xs font-black text-white">{selectedGame}</span>
              </div>
              <iframe
                src={selectedGame}
                className="flex-1 w-full border-0"
                allow="autoplay; fullscreen"
                title="Game"
                onLoad={() => {
                  // Game Bridge: listen for GAME_SCORE messages from the game iframe
                }}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Play games & earn AJ Coins automatically via Game Bridge</p>
              {[
                { name:'Rider King',      emoji:'🏍️', url:'https://aj-rider-king.vercel.app',    status:'live' },
                { name:'Pulse Racer',     emoji:'🏎️', url:'https://aj-pulse-racer.vercel.app',   status:'live' },
                { name:'Subsea Surge',    emoji:'🌊', url:'https://aj-subsea-surge.vercel.app',  status:'live' },
                { name:'Neon Strike',     emoji:'⚡', url:'https://aj-neon-strike.vercel.app',   status:'live' },
                { name:'Volcano Escape',  emoji:'🌋', url:'https://aj-volcano-escape.vercel.app',status:'live' },
                { name:'Ludo Elite Royal',emoji:'🎲', url:'',                                    status:'soon' },
                { name:'Puck Pulse Elite',emoji:'🏒', url:'',                                    status:'soon' },
              ].map(game => (
                <button
                  key={game.name}
                  onClick={() => game.url && setSelectedGame(game.url)}
                  disabled={!game.url}
                  className={`w-full flex items-center gap-4 rounded-2xl p-4 active:scale-[0.98] transition-all ${game.url ? 'bg-white/5 border border-white/10 hover:border-pink-500/20' : 'bg-white/3 border border-white/5 opacity-50 cursor-not-allowed'}`}
                >
                  <span className="text-2xl">{game.emoji}</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-black text-white">{game.name}</p>
                    <p className="text-[10px] text-gray-400">{game.status === 'live' ? 'Play now • Earn Coins' : 'Coming Soon'}</p>
                  </div>
                  {game.status === 'live' ? <ChevronRight size={14} className="text-gray-500"/> : <span className="text-[9px] text-yellow-400 font-black bg-yellow-400/10 px-2 py-0.5 rounded-full">SOON</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          AI BOT SCREEN
      ══════════════════════════════════════════════════════ */}
      {screen === 'aibot' && (
        <div className="flex flex-col min-h-screen bg-[#050505]">
          <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setScreen('hub')} className="active:scale-90 transition-all"><ArrowLeft size={16} className="text-gray-400"/></button>
            <span className="text-sm font-black text-white">🤖 AI Trading Bot</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Live Trade Log */}
            <div className="bg-[#0a0a1a] border border-green-500/20 rounded-2xl p-4">
              <p className="text-[10px] text-green-400 font-black uppercase tracking-widest mb-3">● Live Trade Log</p>
              <div className="space-y-1.5 font-mono">
                {tradeLogs.map((log, i) => (
                  <p key={i} className="text-green-300 text-[10px]">&gt; {log}</p>
                ))}
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between"><span className="text-gray-400 text-xs">Bot Tier</span><span className="text-white font-black text-xs">{botTier.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 text-xs">Invested</span><span className="text-white font-black text-xs">{invested.toLocaleString()} Coins</span></div>
              <div className="flex justify-between"><span className="text-gray-400 text-xs">Daily Rate</span><span className="text-green-400 font-black text-xs">{botTier==='vvip'?'5%':botTier==='basic'?'2%':'—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 text-xs">Profit (session)</span><span className="text-green-400 font-black text-xs">+{visualProfit.toFixed(4)} Coins</span></div>
            </div>

            {/* Tier Cards */}
            {[
              { tier:'basic', label:'Basic Bot', cost:25000, rate:'2%', icon:'🤖', color:'from-blue-600/20 to-blue-900/20', border:'border-blue-500/30', shadow:'rgba(59,130,246,0.3)' },
              { tier:'vvip',  label:'VVIP Bot',  cost:75000, rate:'5%', icon:'🚀', color:'from-pink-600/20 to-purple-900/20', border:'border-pink-500/30', shadow:'rgba(236,72,153,0.3)' },
            ].map(t => (
              <div key={t.tier} className={`bg-gradient-to-br ${t.color} border ${t.border} rounded-3xl p-5`} style={{boxShadow:`0 0 30px ${t.shadow}`}}>
                <div className="flex items-center
 gap-3 mb-3">
                  <span className="text-3xl">{t.icon}</span>
                  <div>
                    <p className="text-white font-black text-base">{t.label}</p>
                    <p className="text-gray-300 text-xs">{t.rate} daily passive income</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-400 text-[10px]">Activation Cost</p>
                    <p className="text-white font-black">{t.cost.toLocaleString()} Coins</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-[10px]">Daily Profit</p>
                    <p className="text-green-400 font-black">+{(t.cost * parseFloat(t.rate) / 100).toLocaleString()} Coins</p>
                  </div>
                </div>
                {botTier === t.tier ? (
                  <div className="w-full py-3 rounded-2xl text-center text-green-400 font-black text-sm bg-green-500/10 border border-green-500/20">
                    ✓ ACTIVE — Earning {t.rate} Daily
                  </div>
                ) : (
                  <button
                    onClick={() => activateBot(t.tier, t.cost)}
                    className="w-full py-3 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all"
                    style={{background:`linear-gradient(135deg,${t.tier==='vvip'?'#ec4899,#8b5cf6':'#3b82f6,#1d4ed8'})`}}
                  >
                    Activate {t.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          AI ASSISTANT FLOATING BUTTON + CHAT
      ══════════════════════════════════════════════════════ */}
      {user && screen !== 'splash' && screen !== 'auth' && (
        <>
          {/* Floating Button */}
          {!botOpen && (
            <button
              onClick={() => setBotOpen(true)}
              className="fixed bottom-6 right-4 z-[9500] w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.6)] active:scale-90 transition-all"
              style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}
            >
              <Bot size={22} className="text-white"/>
            </button>
          )}

          {/* Chat Panel */}
          {botOpen && (
            <div className="fixed bottom-0 right-0 left-0 z-[9500] flex flex-col bg-[#0a0a1a] border-t border-pink-500/30 rounded-t-3xl shadow-[0_-8px_40px_rgba(236,72,153,0.2)]" style={{maxHeight:'75vh'}}>
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <Bot size={16} className="text-white"/>
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">AJ AI Assistant</p>
                    <p className="text-green-400 text-[9px] font-black animate-pulse">● Online</p>
                  </div>
                </div>
                <button onClick={() => setBotOpen(false)} className="p-2 rounded-xl bg-white/5 active:scale-90 transition-all">
                  <X size={14} className="text-gray-400"/>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{minHeight:'200px',maxHeight:'50vh'}}>
                {botMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.from==='user' ? 'flex-row-reverse' : ''}`}>
                    {msg.from === 'bot' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Bot size={12} className="text-white"/>
                      </div>
                    )}
                    <div className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${msg.from==='user' ? 'bg-pink-600/80 text-white' : 'bg-white/10 text-white'}`}>
                      {msg.text}
                      {msg.topic === 'payment_issue' && (
                        <a href={CEO_WHATSAPP} target="_blank" rel="noopener noreferrer" className="block mt-2 bg-green-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl text-center active:scale-95 transition-all">
                          📱 WhatsApp CEO Now
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 p-4 border-t border-white/10">
                <input
                  value={botInput}
                  onChange={e => setBotInput(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && handleBotSend()}
                  placeholder="Ask anything about AJ Portal…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500/50"
                />
                <button onClick={handleBotSend} className="bg-pink-600 text-white p-2.5 rounded-2xl active:scale-90 transition-all shadow-[0_0_14px_rgba(236,72,153,0.4)]">
                  <Send size={16}/>
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

// ============================================================
// QUERY CLIENT WRAPPER + DEFAULT EXPORT
// ============================================================
const queryClient = new QueryClient();

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <AJSuperPortal/>
    </QueryClientProvider>
  );
}
