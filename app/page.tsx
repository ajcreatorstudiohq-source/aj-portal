"use client";
import Script from 'next/script';
import React, { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Zego Cloud Configuration ---
const ZEGO_APP_ID = 16846398;
const ZEGO_SERVER_SECRET = "830c1be79acb7e0bb63dbb4d081b2a95";
// ── Fix #9: Firebase inline config with exact keys ──────────
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

// ── Fix #9: Exact Firebase keys ──────────────────────────────
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

const app          = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth         = getAuth(app);
const db           = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ============================================================
// API KEYS & CONFIG
// ============================================================
const UNSPLASH_ACCESS_KEY    = "W4x76VphkyY9fzP3DbJPfXLhdD6x063gW--Voifn_UE";
const YOUTUBE_API_KEY        = "AIzaSyD9vR3hNLt7pBNlm6PMaZWbJOB9QGcrD1Y";
const NOWPAYMENTS_API_KEY    = "3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7";
const CLOUDINARY_CLOUD_NAME  = "atm28akz";
const CLOUDINARY_UPLOAD_PRESET = "aj_portal";
const CEO_EMAIL              = "ajcreatorstudio.hq@gmail.com";
const CEO_WHATSAPP           = "https://wa.me/96878994093";
const AGORA_APP_ID           = "7863c5369b3648bf931893a52ebaa6db";
const AGORA_APP_CERTIFICATE  = "dc66528c5a5646da8e3ce5d2426759af";
const VAPID_KEY              = "BMaPMtGtA2VtDsj_JH_yv5dOv66Mpguf9v4TkqY96dcS-gwqgs-r5OlqRJQmZbNkaj-7_iMFbGGN0Qc4xH0qvKg";
const MONETAG_PULSE_BANNER   = 11337197;
const PULSE_AD_VIDEO_ID      = 'aqz-KE-bpKQ';  // Sponsor ad YouTube ID
const NOWPAYMENTS_IPN_SECRET = '9eeeBo6K1ljJSQtUCb1Up88Gv6n1AreU'; // IPN secret for verification
const MONETAG_WECHAT_SPONSOR = 11337185;

// ============================================================
// ECONOMY RATES
// ============================================================
const COIN_RATE      = 100;
const CASH_RATE      = 500;
const MIN_PURCHASE   = 20;
const WITHDRAW_MIN   = 10000;
const REFERRAL_COINS = 50;

const USER_EARN_SHARE  = 0.30;
const ADMIN_EARN_SHARE = 0.70;

const PK_ENTRY_COINS = 100;
const PK_DURATION = 300;
// --- Zego Live & WeChat Call Handler ---
const handleStartLiveOrCall = (roomID, currentUserId, currentUserName) => {
  if (typeof window !== "undefined" && window.ZegoUIKitPrebuilt) {
    const kitToken = window.ZegoUIKitPrebuilt.generateKitTokenForTest(
      ZEGO_APP_ID,
      ZEGO_SERVER_SECRET,
      roomID,
      currentUserId,
      currentUserName
    );
    
    const zp = window.ZegoUIKitPrebuilt.create(kitToken);
    zp.joinRoom({
      container: document.querySelector("#video-container"),
      scenario: {
        mode: window.ZegoUIKitPrebuilt.LiveStreaming,
      },
    });
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
  { label: 'EasyPaisa',                    field: 'Mobile Number',      placeholder: '03XX-XXXXXXX',                 type:'simple' },
  { label: 'JazzCash',                     field: 'Mobile Number',      placeholder: '03XX-XXXXXXX',                 type:'simple' },
  { label: 'Binance (USDT BSC)',           field: 'USDT BSC Address',   placeholder: '0x... BSC wallet address',     type:'simple' },
  { label: 'AirTM',                        field: 'AirTM Email',        placeholder: 'your@email.com',               type:'simple' },
  
];

// ============================================================
// CLOUDINARY UPLOADER
// ============================================================
const uploadToCloudinary = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  // Use /video/upload for video files, /image/upload for images
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
    onDisconnect(presenceRef).set({
      ...presenceData,
      state: 'offline',
      lastChanged: Date.now(),
    });
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
      const body = payload.notification?.body || '';
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    });
  } catch (e) {
    console.error('setupForegroundNotificationListener', e);
  }
};

// ============================================================
// Fix #6: formatCount — 1k/2k/1.5M view counter for thumbnails
// ============================================================
const formatViews = (v: number): string => {
  if (!v || v <= 0) return '0';
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000)    return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(v);
};

// ============================================================
// MONETAG BANNER COMPONENT
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

          <p className="text-white font-black text-sm leading-relaxed whitespace-pre-wrap tracking-wide">
            {msg}
          </p>

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
// MONETAG VIDEO AD COMPONENT — YouTube embed (no black screen)
// ============================================================
const AJ_AD_VIDEO_ID = 'aqz-KE-bpKQ';

function MonetagVideoAd({ publisherId }: { publisherId: number }) {
  const [adMuted, setAdMuted] = React.useState(true);
  const adSrc = `https://www.youtube-nocookie.com/embed/${AJ_AD_VIDEO_ID}?autoplay=1&mute=${adMuted?1:0}&loop=1&playlist=${AJ_AD_VIDEO_ID}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3`;
  return (
    <div className="absolute inset-0 w-full h-full bg-[#050505] overflow-hidden">
      {/* Working YouTube ad — no more black screen */}
      <iframe
        src={adSrc}
        className="absolute inset-0 w-full h-full"
        style={{ transform:'scale(1.15)', transformOrigin:'center center', pointerEvents:'auto' }}
        allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        frameBorder="0"
        title="Sponsored Ad"
      />
      {/* Sponsored badge */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <span className="bg-pink-600/90 backdrop-blur-sm text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-[0_0_14px_rgba(236,72,153,0.7)]">
          📢 Sponsored
        </span>
      </div>
      {/* Sound toggle */}
      <button
        onClick={() => setAdMuted(m => !m)}
        className="absolute bottom-6 right-4 z-20 bg-[#050505]/70 backdrop-blur-sm border border-white/20 rounded-full p-2 text-white active:scale-90 transition-all"
      >
        {adMuted
          ? <VolumeX size={16} className="text-red-400"/>
          : <Volume2 size={16} className="text-green-400"/>}
      </button>
      {/* Skip hint */}
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
  const [username,   setUsername]   = useState('');
  const [bio,        setBio]        = useState('');
  const [tempPhoto,  setTempPhoto]  = useState('');
  const [pendingMode,setPendingMode]= useState('');

  // ── CONTENT
  const [pixaData,     setPixaData]     = useState<any[]>([]);
  const [pixaVideos,   setPixaVideos]   = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [userPosts,    setUserPosts]    = useState<any[]>([]);  // TikReels feed
  const [pulsePosts,   setPulsePosts]   = useState<any[]>([]);  // Fix #3: AJ Pulse separate feed
  const [postText,     setPostText]     = useState('');
  const [newMessage,   setNewMessage]   = useState('');
  const [activeContact,setActiveContact]= useState<string|null>(null);

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
  const [selectedSound,      setSelectedSound]      = useState<string|null>(null);
  const [tiktokAudioFile,    setTiktokAudioFile]    = useState<File|null>(null);
  const [tiktokPostIsVideo,  setTiktokPostIsVideo]  = useState(false);  // TikReel media type
  const [pulsePostIsVideo,   setPulsePostIsVideo]   = useState(false);  // Pulse media type
  const [copied,        setCopied]        = useState(false);

  // ── AI
  const [visualProfit, setVisualProfit] = useState(0);
  const [tradeLogs,    setTradeLogs]    = useState([
    "Initialising Neural Link...",
    "Analysing Market Volatility...",
    "Connecting to AJ liquidity pool..."
  ]);
  const [botOpen,     setBotOpen]     = useState(false);
  // Fix #8: First message always in English
  const [botMessages, setBotMessages] = useState([{
    from:'bot',
    text:`Hi! I am AJ AI Assistant 🤖. I'm here to provide A to Z details about AJ Super Portal — Coins, TikReels, Pulse, Live, Games, Wallet, Withdrawals & more. How can I assist you today?`
  }]);
  const [botInput, setBotInput] = useState('');
  const lastBotTopicRef  = useRef<string>('greeting');
  const isFirstBotMsg    = useRef<boolean>(true);  // Smart AI: 1st reply always English

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

  const [payoutId,       setPayoutId]       = useState('');
  const [referralCode,   setReferralCode]   = useState('');

  // ── NOTIFICATIONS
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);

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
  const [liveChatOpen,    setLiveChatOpen]    = useState(false);
  const [liveChatInput,   setLiveChatInput]   = useState('');
  const [liveChatMessages,setLiveChatMessages]= useState<any[]>([]);
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

  // ── TIKREELS SOUND
  const [soundEnabledVideos, setSoundEnabledVideos] = useState<{[key:string]:boolean}>({});

  // ── TIKREELS
  const [tiktabMode,        setTiktabMode]        = useState<'feed'|'create'|'profile'>('feed');
  const [tikProfileSubTab,  setTikProfileSubTab]  = useState<'posts'|'following'>('posts');

  // ── PERFORMANCE: TikReels windowing
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [reelPaused,    setReelPaused]    = useState(false); // Pause/Resume on click
  const videoFeedRef = useRef<HTMLDivElement>(null);
  // Fix #11: Audio Bleeding — track iframe refs so we can mute/unmount on scroll
  const iframeRefs = useRef<{ [key: number]: HTMLIFrameElement | null }>({});
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

      // Fix 2: Rotate across keyword sets and shuffle results each time TikReel opens
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
      // Fisher-Yates shuffle for randomized order on every open
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
          .filter((r:any) => {
            if (!r.lastSeenMs) return false;
            return (now - r.lastSeenMs) < 15000;
          });
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
    // Fix #3: TikReels uses 'user_posts', AJ Pulse uses 'pulse_posts' (separate collections)
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
        // Comments work on both collections; try pulse_posts first then user_posts
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

  // Fix: Re-fetch fresh random YouTube videos every time TikReel tab is opened
  useEffect(() => {
    if (socialScreen !== 'tikreels') return;
    const fetchFreshVideos = async () => {
      try {
        const YT_KEYWORDS = [
          'Hindi Shorts viral',
          'Bollywood Movie Clips funny',
          'Funny Cartoons Hindi',
          'Comedy Shorts India',
          'Desi Funny Videos',
          'Hindi Stand Up Comedy',
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
        setActiveVideoIdx(0); // reset to first video on every fresh load
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
          const ref  = doc(db,"users",cu.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const d = snap.data();
            setHasSocialProfile(d.hasSocialProfile ?? true);
            setUsername(d.username||'');
            setBio(d.bio||'');
            setTempPhoto(d.photo||cu.photoURL||'');
          } else {
            // Fix #4: Initialize new users with hasSocialProfile:true and all Number fields
            await setDoc(ref, {
              name:cu.displayName, email:cu.email,
              balance:500, botTier:'none', invested:0,
              uid:cu.uid, lastSync:serverTimestamp(),
              hasSocialProfile:true,           // Fix #4: true by default
              photo:cu.photoURL||'',
              followers:0, following:0,
              postsCount:0,                    // Fix #4: Number field
              followersCount:0,                // Fix #4: Number field
              followingCount:0,                // Fix #4: Number field
              totalLikes:0,                    // Fix #4: Number field
              status:'online',
              fcmToken:'',
            });
            setHasSocialProfile(true);
          }
          onSnapshot(ref, s => {
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
    setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
  const unsubPulse = onSnapshot(collection(db, "posts"), (snapshot) => {
    setPulsePosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
  return () => { unsubReels(); unsubPulse(); };
}, []);
  // ── GAME COINS: postMessage listener
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
          setPkWinner(pkScore.me >= pkScore.rival ? (username || 'You') : (pkRivalData?.username || 'Rival'));
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
  // TIKREELS + PULSE WINDOWING — Audio Bleeding fix via IntersectionObserver
  // Covers both TikReels (YouTube iframes) and Pulse (user video elements)
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
            // Pause user-uploaded <video> elements that scroll off-screen
            const uv = userVideoRefs.current[idx];
            if (uv && !uv.paused) uv.pause();
          }
        });
      },
      // threshold 0.8 — video must be 80% visible before becoming "active"
      { threshold: 0.8, root }
    );
    const slides = root.querySelectorAll('[data-vidx]');
    slides.forEach(el => obs.observe(el));
    return () => {
      obs.disconnect();
      // Clean up iframe refs when feed unmounts to stop all audio
      iframeRefs.current = {};
    };
  }, [pixaVideos, socialScreen, tiktabMode, userPosts, pulseTab, pulsePosts]);

  // Audio Bleeding — when activeVideoIdx changes, blank ALL off-screen YouTube
  // iframes (fastest way to kill audio; JS pause() is ignored cross-origin).
  useEffect(() => {
    const isTikFeed   = socialScreen === 'tikreels' && tiktabMode === 'feed';
    const isPulseFeed = socialScreen === 'pulse'    && pulseTab   === 'feed';
    if (!isTikFeed && !isPulseFeed) return;
    setReelPaused(false);
    Object.entries(iframeRefs.current).forEach(([idxStr, el]) => {
      if (!el) return;
      const idx = parseInt(idxStr, 10);
      if (idx !== activeVideoIdx) {
        if (el.src && (el.src.includes('youtube.com') || el.src.includes('youtube-nocookie.com'))) {
          el.src = '';
        }
      }
    });
    // Also pause any off-screen user video elements
    Object.entries(userVideoRefs.current).forEach(([idxStr, el]) => {
      if (!el) return;
      const idx = parseInt(idxStr, 10);
      if (idx !== activeVideoIdx && !el.paused) el.pause();
    });
  }, [activeVideoIdx, socialScreen, tiktabMode, pulseTab]);

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
      uid: user.uid,
      username: username || 'AJ_Member',
      photo: tempPhoto || user.photoURL || '',
      roomId,
      startedAt: serverTimestamp(),
      active: true,
      lastSeenMs: Date.now()
    });
    
    const heartbeat = setInterval(async () => {
      try {
        await updateDoc(doc(db, "live_rooms", roomId), { lastSeenMs: Date.now() });
      } catch (e) {}
    }, 10000);
    
    (liveStreamRef as any)._heartbeat = heartbeat;
    
    try {
      await addDoc(collection(db, "notifications"), {
        title: "🔴 Live Now!",
        message: `@${username || 'AJ_Member'} just went LIVE! Tap to join.`,
        deepLink: `/live/${roomId}`,
        date: serverTimestamp()
      });
    } catch (e) {}
  } catch (e) {
    setVipAlert({msg:"Camera permission denied. Please allow camera access."});
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
    setViewerRoom(null);
    setViewerRoomId('');
    setViewerChatMessages([]);
    setViewerChatInput('');
  };

  const sendViewerChatMessage = async () => {
    if (!viewerChatInput.trim() || !viewerRoomId || !user) return;
    try {
      await addDoc(collection(db, 'live_rooms', viewerRoomId, 'messages'), {
        uid: user.uid,
        username: username || 'AJ_Member',
        photo: tempPhoto || user.photoURL || '',
        text: viewerChatInput.trim(),
        createdAt: serverTimestamp()
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
          challenger: user.uid, rival: pkTargetId.trim(),
          date:serverTimestamp()
        });
      } catch {}
      try {
        await addDoc(collection(db,"notifications"), {
          title:"⚔️ PK Challenge!",
          message:`@${username||'AJ_Member'} challenged you to a PK Battle! ${PK_ENTRY_COINS} Coins staked.`,
          deepLink:`/pk/${liveRoomId}`,
          date:serverTimestamp()
        });
      } catch {}
      setPkRivalData(rivalSnap.data());
      setPkTimer(PK_DURATION);
      setPkScore({ me:0, rival:0 });
      setPkWinner(null);
      setPkActive(true);
      setPkChallengeOpen(false);
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
      // Req 4: VVIP style — no native confirm()
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
        try { await updateDoc(doc(db,"users",user.uid),    { following: increment(-1) }); } catch {}
        try { await updateDoc(doc(db,"users",targetUid),   { followers: increment(-1) }); } catch {}
        setIsFollowing(false); setFollowers(f => f-1);
      } else {
        await setDoc(followRef,   { uid:targetUid, date:serverTimestamp() });
        await setDoc(followerRef, { uid:user.uid,  date:serverTimestamp() });
        try { await updateDoc(doc(db,"users",user.uid),    { following: increment(1) }); } catch {}
        try {
          await updateDoc(doc(db,"users",targetUid), {
            followers: increment(1),
            followersCount: increment(1)  // Req 2: followersCount as Number
          });
        } catch {}
        // Req 2: Notification "X followed you"
        try {
          await addDoc(collection(db,"users",targetUid,"notifications"), {
            type:'follow', fromUid:user.uid,
            fromUsername:username||'AJ_Member',
            fromPhoto:user.photoURL||'',
            createdAt:serverTimestamp(), read:false
          });
        } catch {}
        setIsFollowing(true); setFollowers(f => f+1);
        // Check mutual after follow
        try {
          const theirF = await getDoc(doc(db,"users",targetUid,"following",user.uid));
          setIsMutualFriend(theirF.exists());
        } catch {}
      }
    } catch(e) { console.error('handleFollow', e); }
  };

  // Req 2: Load notifications
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
          createdAt:serverTimestamp(),
          lastMessage:'',
          lastAt:serverTimestamp()
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
        uid:user.uid,
        username:username||user.displayName||'AJ Member',
        photo:tempPhoto||user.photoURL||'',
        text,
        createdAt:serverTimestamp()
      });
      await updateDoc(doc(db,'chats',activeChatId), { lastMessage:text, lastAt:serverTimestamp() });
    } catch(e) { console.error('sendDmMessage', e); }
  };

  // ==========================================================
  // Fix #5: OPEN PROFILE — Always renders, never shows 404
  // ==========================================================
  const openProfile = async (uid:string) => {
    setScreen('social');
    setSocialScreen('profile');
    setViewingUid(uid);
    setViewProfile(null);
    setProfileLoading(true);
    setProfilePosts([]);
    setProfileVideos([]);

    try {
      const snap = await getDoc(doc(db,"users",uid));

      // Fix #5: If doc missing, use safe defaults — never crash
      let userData: any;
      if (snap.exists()) {
        userData = { ...snap.data() };
      } else {
        userData = {
          username: 'AJ Member',
          bio: '',
          photo: '/logo.png',
          name: 'AJ Member',
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
          totalLikes: 0,
        };
      }

      // Fix #5: Auto-initialize missing Number stats fields (self-healing)
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

      // Fetch posts from pulse_posts + user_posts
      try {
        // Pulse posts
        const pq1 = query(collection(db,"pulse_posts"), orderBy("createdAt","desc"), limit(30));
        const ps1 = await getDocs(pq1);
        const pulseAll = ps1.docs.map(d => ({id:d.id,...d.data() as any, views:(d.data() as any).views||0}));
        setProfilePosts(pulseAll.filter((p:any) => p.uid===uid && !p.isVideo));

        // TikReel posts
        const pq2 = query(collection(db,"user_posts"), orderBy("createdAt","desc"), limit(30));
        const ps2 = await getDocs(pq2);
        const all = ps2.docs.map(d => ({id:d.id,...d.data() as any}));
        const feedVideos = all.filter((p:any) => p.uid===uid && p.isVideo).map((v:any) => ({...v, views:v.views||0}));

        // Fix #6: Fetch from users/{uid}/videos sub-collection
        let subVideos: any[] = [];
        try {
          const vSnap = await getDocs(
            query(collection(db,"users",uid,"videos"), orderBy("createdAt","desc"), limit(50))
          );
          subVideos = vSnap.docs.map(d => ({id:d.id,...d.data() as any, isVideo:true, views:(d.data() as any).views||0}));
        } catch {}

        const subIds = new Set(subVideos.map((v:any) => v.id));
        setProfileVideos([...subVideos, ...feedVideos.filter((v:any) => !subIds.has(v.id))]);
      } catch(e) { console.error('openProfile posts', e); }

      // Set follower/following counts
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
          // Req 2: Check mutual follow → "Your Friend" label
          const theirF = await getDoc(doc(db,"users",uid,"following",user.uid));
          setIsMutualFriend(myF.exists() && theirF.exists());
        } catch {}
      }
    } catch(e) {
      console.error('openProfile error', e);
      // Even on total failure, always show a safe default profile
      setViewProfile({
        username: 'AJ Member',
        bio: '',
        photo: '/logo.png',
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        totalLikes: 0,
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // ==========================================================
  // WECHAT CONTACTS
  // ==========================================================
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

  const saveContactToFirestore = async (name: string) => {
    if (!user || !name.trim()) return;
    try {
      const colRef = collection(db,"users",user.uid,"wechat_contacts");
      await addDoc(colRef, { name: name.trim(), addedAt: serverTimestamp() });
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
  // TIKREELS POST
  // ==========================================================
  const handleTiktokPost = async () => {
    if (!tiktokPostText.trim() && !tiktokPostImg) return setVvipAlert({msg:"Add caption or image!"});
    try {
      const videoReward = 10; // +10 AJ Coins for TikReel video post
      await addDoc(collection(db,"user_posts"), {
        text:tiktokPostText, image:tiktokPostImg, uid:user!.uid,
        username:username||"AJ_Member", photo:user!.photoURL||'',
        likes:0, views:0, isVideo:tiktokPostIsVideo, createdAt:serverTimestamp()
      });
      await updateDoc(doc(db,"users",user!.uid), { balance: increment(videoReward) });
      await logAdminRevenue('tiktok_post', videoReward, videoReward);
      setTiktokPostText(''); setTiktokPostImg(''); setTiktokPostIsVideo(false);
      setTiktabMode('feed');
      setVvipAlert({msg:`🎬 Post published! +${videoReward} Coins 🪩`,icon:"🎬"});
    } catch(e) { console.error('handleTiktokPost', e); setVvipAlert({msg:'Post failed. Please try again.'}); }
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

  // Fix #3: AJ Pulse posts go to 'pulse_posts' collection with addDoc (no overwrite)
  
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
      // Fix #3: Use 'pulse_posts' collection, addDoc ensures no overwrite, sorted by createdAt
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
    // Req 4: VVIP style — no native confirm(), use inline delete
    const col = (socialScreen === 'pulse') ? 'pulse_posts' : 'user_posts';
    try {
      await deleteDoc(doc(db, col, id));
      setActiveMenuId(null);
      setVvipAlert({msg:'🗑️ Post deleted.', icon:'🗑️'});
    } catch(e) { console.error('handleDeletePost', e); }
  };

  const handleLike  = (id:string) => setLikedPosts((p:any) => ({...p,[id]:!p[id]}));
  // Fix #2: Native share API
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
  // Crypto (USDT BSC): NOWPayments invoice → auto-credited via IPN
  // Card / Bank: in-app form → saved to Firebase → admin credits manually
  const handlePurchase = async () => {
    if (purchaseAmount < MIN_PURCHASE)
      return setVvipAlert({msg:`Minimum purchase is ${MIN_PURCHASE} (= ${MIN_PURCHASE*COIN_RATE} Coins)`});
    if (!user?.uid) return setVvipAlert({msg:"Please log in first."});

    // ── Crypto path: Binance USDT BSC via NOWPayments invoice
    try {
      const baseBody: any = {
        price_amount:      purchaseAmount,
        price_currency:    "usd",
        pay_currency:      "usdtbsc",
        order_id:          user.uid,
        order_description: `AJ Coins — ${purchaseAmount} = ${purchaseAmount * COIN_RATE} Coins`,
        success_url:       window.location.href,
        cancel_url:        window.location.href,
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
      await updateDoc(doc(db,"users",user!.uid),        { balance: increment(-transferAmount) });
      await updateDoc(doc(db,"users",transferId.trim()),{ balance: increment(transferAmount) });
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
    if (isCard) {
      if (!cardHolder.trim())  return setVvipAlert({msg:'Enter Cardholder Name.'});
      const rawNum = cardNumber.replace(/\s/g,'');
      if (rawNum.length < 13 || rawNum.length > 19) return setVvipAlert({msg:'Enter a valid Card Number (13-19 digits).'});
      if (!cardExpiry.trim())  return setVvipAlert({msg:'Enter Card Expiry (MM/YY).'});
      if (!cardCVV.trim())     return setVvipAlert({msg:'Enter CVV.'});
      if (!cardCountry.trim()) return setVvipAlert({msg:'Enter your Country.'});
    } else {
      if (!payoutId.trim()) return setVvipAlert({msg:`Enter your ${currentWithdrawMethod.field}.`});
    }
    try {
      const usdVal = balance / CASH_RATE;
      const cardDetails = isCard ? {
        cardHolder, cardNumber:cardNumber.replace(/\s/g,''),
        cardExpiry, cardCVV, cardBank, cardCountry
      } : {};
      await updateDoc(doc(db,"users",user!.uid), { balance:0 });
      await addDoc(collection(db,"manual_withdrawals"), {
        uid:user!.uid, email:user!.email, coins:balance, amountUsd:usdVal,
        method:payoutMethod,
        payoutAddress: isCard ? `${cardHolder} / ${cardNumber.replace(/\s/g,'')}` : payoutId,
        ...cardDetails,
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

  // ══════════════════════════════════════════════════════════
  // Fix #8: AI ASSISTANT — A to Z Knowledge, Language Matching
  // ══════════════════════════════════════════════════════════
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
    if (/\b(hola|gracias|moneda|retirar|comprar|regalo|cuánto|cómo)\b/.test(q))        return 'es';
    if (/\b(ciao|grazie|moneta|ritirare|comprare|regalo|quanto|come)\b/.test(q))       return 'it';
    if (/\b(olá|obrigado|moeda|retirar|comprar|presente|quanto|como)\b/.test(q))       return 'pt';
    if (/\b(hallo|danke|münze|auszahlen|kaufen|geschenk|wieviel|wie)\b/.test(q))       return 'de';
    if (/\b(merhaba|teşekkür|madeni|çekmek|satın|hediye|kadar|nasıl)\b/.test(q))      return 'tr';
    if (/\b(привет|спасибо|монета|вывести|купить|подарок|сколько|как)\b/.test(q))      return 'ru';
    if (/\b(halo|terima|koin|tarik|beli|hadiah|berapa|bagaimana)\b/.test(q))           return 'id';
    if (/\b(xin chào|cảm ơn|đồng xu|rút tiền|mua|quà tặng)\b/.test(q))               return 'vi';
    if (/\b(شکریہ|آپ|ہے|کیا|کیسے|میں|آپ کا)\b/.test(q))                              return 'ur';
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
      en:  `🪙 AJ Coins — Full Breakdown:\n\n• Rate: $1 = ${COIN_RATE} Coins | ${CASH_RATE} Coins = $1 cash-out\n• Welcome Bonus: 500 Coins on signup 🎉\n• Referral Bonus: +${REFERRAL_COINS} Coins per friend referred\n• Post on AJ Pulse: +0.75 Coins per post\n• TikReel video: +0.75 Coins per upload\n• AI Bot (Basic): 2% daily on invested coins\n• AI Bot (VVIP): 5% daily on invested coins\n• Live gifts received: 60% goes to you!\n\nGo to Wallet → Purchase to top up anytime. 💰`,
      hin: `Bhai, yeh lo puri detail! 🪙\n\n• Rate: $1 = ${COIN_RATE} Coins | Cash out: ${CASH_RATE} Coins = $1\n• Signup bonus: 500 Coins FREE 🎉\n• Referral: +${REFERRAL_COINS} Coins har dost ke liye\n• Post karo AJ Pulse pe: +0.75 Coins\n• TikReel video upload: +0.75 Coins\n• AI Bot Basic: 2% daily profit\n• AI Bot VVIP: 5% daily profit 🔥\n• Live pe gifts milein: 60% tumhara!\n\nWallet → Purchase se recharge karo, dost! 💰`,
      ur:  `🪙 AJ Coins — مکمل تفصیل:\n\n• شرح: $1 = ${COIN_RATE} Coins | ${CASH_RATE} Coins = $1 نکاسی\n• Signup بونس: 500 Coins مفت 🎉\n• ریفرل بونس: +${REFERRAL_COINS} Coins ہر دوست کے لیے\n• AJ Pulse پوسٹ: +0.75 Coins\n• TikReel ویڈیو: +0.75 Coins\n• AI Bot Basic: 2% روزانہ منافع\n• AI Bot VVIP: 5% روزانہ منافع 🔥\n• Live تحفے: 60% آپ کا!\n\nWallet → Purchase سے ٹاپ اَپ کریں 💰`,
      hi:  `🪙 AJ Coins — पूरी जानकारी:\n\n• दर: $1 = ${COIN_RATE} Coins | ${CASH_RATE} Coins = $1\n• Signup बोनस: 500 Coins मुफ्त 🎉\n• रेफरल: +${REFERRAL_COINS} Coins प्रति दोस्त\n• AJ Pulse पोस्ट: +0.75 Coins\n• TikReel वीडियो: +0.75 Coins\n• AI Bot Basic: 2% दैनिक\n• AI Bot VVIP: 5% दैनिक 🔥\n• Live उपहार: 60% आपका!\n\nWallet → Purchase से टॉप अप करें 💰`,
      ar:  `🪙 AJ Coins — تفاصيل كاملة:\n\n• السعر: $1 = ${COIN_RATE} كوين | ${CASH_RATE} كوين = $1\n• مكافأة التسجيل: 500 كوين مجاناً 🎉\n• الإحالة: +${REFERRAL_COINS} كوين لكل صديق\n• نشر على AJ Pulse: +0.75 كوين\n• TikReel فيديو: +0.75 كوين\n• AI Bot أساسي: 2% يومياً\n• AI Bot VVIP: 5% يومياً 🔥\n• هدايا البث المباشر: 60% لك!\n\nاذهب إلى المحفظة → الشراء للشحن 💰`,
    },

    tikreels: {
      en:  `🎬 AJ TikReels — TikTok-style short videos!\n\n• Go to Social → AJ TikReels → Feed tab\n• Scroll up/down to watch videos\n• Click the avatar/profile pic to view any creator's profile\n• Toggle Sound ON/OFF with the top-right button\n• Like ❤️, Comment 💬, Share 🔗, or send Gifts 🎁\n• Upload your own: hit ➕ Post tab, add caption + image/video\n• Each upload earns you +0.75 Coins 🪙\n• View counts show as 1k, 2k, 1.5M on profile grids`,
      hin: `🎬 AJ TikReels — TikTok jaisi short videos!\n\n• Social → AJ TikReels → Feed tab pe jao\n• Videos scroll karo\n• Kisi bhi creator ki profile pic tap karo → unki profile open\n• Sound ON/OFF ka button upar right mein hai\n• Like ❤️, Comment 💬, Gift 🎁 kar sakte ho\n• Apni video upload karo: ➕ Post tab → +0.75 Coins milenge 🔥\n• Profile grid pe views 1k, 2k, 1.5M format mein dikhte hain`,
      ur:  `🎬 AJ TikReels — TikTok طرز کی مختصر ویڈیوز!\n\n• Social → AJ TikReels → Feed tab\n• ویڈیوز اسکرول کریں\n• کسی کی بھی پروفائل تصویر ٹیپ کریں → پروفائل کھلے گی\n• آواز ON/OFF بٹن اوپر دائیں\n• Like ❤️، Comment 💬، Gift 🎁\n• اپنی ویڈیو: ➕ Post tab → +0.75 Coins 🔥\n• پروفائل گرڈ پر views: 1k، 2k، 1.5M فارمیٹ`,
      hi:  `🎬 AJ TikReels — TikTok स्टाइल!\n\n• Social → AJ TikReels → Feed\n• Videos scroll करें\n• Profile pic टैप → profile खुलेगी\n• Sound ON/OFF बटन ऊपर\n• Like ❤️, Comment 💬, Gift 🎁\n• Video upload: ➕ Post → +0.75 Coins 🔥\n• Profile grid: 1k, 2k, 1.5M format`,
      ar:  `🎬 AJ TikReels:\n\n• Social → AJ TikReels → Feed\n• مرر الفيديوهات\n• اضغط على الصورة الشخصية → ملف المنشئ\n• Sound ON/OFF\n• أعجب ❤️، علق 💬، هدية 🎁\n• ارفع فيديو: ➕ Post → +0.75 كوين 🔥\n• عدد المشاهدات: 1k، 2k، 1.5M`,
    },

    pulse: {
      en:  `📡 AJ Pulse — Instagram-style feed + Live streaming!\n\n📸 Feed:\n• Scroll posts, like, comment, share, send gifts\n• Tap any user's avatar → opens their full profile\n• Post your own content → +0.75 Coins per post\n\n🔴 Go Live:\n• Social Hub → GO LIVE button (needs camera permission)\n• Share your Room ID so viewers can join\n• Viewers send gifts → You keep 60% of gift value!\n• OR join someone's live: paste their Room ID → Join\n\n⚔️ PK Battle: Challenge any live streamer — 100 Coins entry, 5-min battle, most gifts wins! 🏆`,
      hin: `📡 AJ Pulse — Instagram + Live streaming combo!\n\n📸 Feed:\n• Posts scroll karo, like/comment/gift karo\n• Kisi bhi user ki dp tap karo → uski profile open 🔥\n• Apni post daalo → +0.75 Coins\n\n🔴 Live:\n• Social Hub → GO LIVE (camera permission chahiye)\n• Room ID share karo taaki log join kar sakein\n• Viewers gifts bhejein → 60% tumhara! 💰\n• Kisi aur ki live join karo: Room ID paste karo → Join\n\n⚔️ PK Battle: 100 Coins entry, 5 min, jyada gifts = jeet! 🏆`,
      ur:  `📡 AJ Pulse:\n\n📸 فیڈ:\n• پوسٹس اسکرول، like/comment/gift\n• avatar ٹیپ → پروفائل 🔥\n• اپنی پوسٹ → +0.75 Coins\n\n🔴 Live:\n• Social Hub → GO LIVE\n• Room ID شیئر کریں\n• gifts → 60% آپ کا! 💰\n\n⚔️ PK Battle: 100 Coins، 5 منٹ 🏆`,
      hi:  `📡 AJ Pulse:\n\n📸 Feed:\n• Posts, like/comment/gift\n• Avatar टैप → profile 🔥\n• अपनी post → +0.75 Coins\n\n🔴 Live:\n• Social Hub → GO LIVE\n• Room ID share करें\n• Gifts → 60% आपका! 💰\n\n⚔️ PK Battle: 100 Coins, 5 min 🏆`,
      ar:  `📡 AJ Pulse:\n\n📸 منشورات:\n• تصفح، like/comment/gift\n• avatar → ملف شخصي 🔥\n• نشر → +0.75 كوين\n\n🔴 بث مباشر:\n• GO LIVE\n• شارك Room ID\n• gifts → 60% لك!\n\n⚔️ PK Battle: 100 كوين، 5 دقائق 🏆`,
    },

    social: {
      en:  `👤 Social Features — A to Z:\n\n• 🔍 View any profile: tap any avatar/profile pic anywhere\n• ➕ Follow / Unfollow from their profile page\n• 💬 Message (DM): tap "Message" button on any profile\n• 📊 Profile: Posts, Followers, Following, Total Likes, video grid\n• 📹 Video grid shows view counts (1k, 2k format)\n• 🎯 Setup your own: Social Hub → Settings → Edit Profile`,
      hin: `👤 Social Features:\n\n• 🔍 Koi bhi profile: dp ya avatar tap karo\n• ➕ Follow / Unfollow profile page pe\n• 💬 DM: "Message" button → private chat 🔥\n• 📊 Profile: Posts, Followers, Following, Likes, videos\n• 📹 Video grid: 1k, 2k views\n• 🎯 Apni profile: Social Hub → Settings → Edit Profile`,
      ur:  `👤 Social Features:\n\n• 🔍 کوئی بھی پروفائل: avatar ٹیپ\n• ➕ Follow / Unfollow\n• 💬 DM: "Message" → private chat 🔥\n• 📊 Posts، Followers، Likes، videos\n• 📹 1k، 2k views\n• 🎯 اپنی: Social Hub → Settings`,
      hi:  `👤 Social Features:\n\n• 🔍 Profile: avatar टैप\n• ➕ Follow / Unfollow\n• 💬 DM: "Message" 🔥\n• 📊 Posts, Followers, Likes, videos\n• 📹 1k, 2k views\n• 🎯 अपनी: Settings → Edit Profile`,
      ar:  `👤 الميزات الاجتماعية:\n\n• 🔍 أي ملف: اضغط الصورة\n• ➕ متابعة / إلغاء\n• 💬 رسالة خاصة 🔥\n• 📊 منشورات، متابعون، إعجابات\n• 📹 1k، 2k مشاهدة\n• 🎯 إعداد ملفك: Settings`,
    },

    gaming: {
      en:  `🎮 AJ Gaming Zone — Play & Multiply Coins!\n\n• Access: Tap "Gaming" from the main Hub\n• Games: Rider King, Pulse Racer, Subsea Surge, Neon Strike, Volcano Escape\n• Play 1v1 style games to multiply your AJ Coins\n• Coming soon: Ludo Elite Royal, Puck Pulse Elite 🔜`,
      hin: `🎮 AJ Gaming Zone:\n\nBhai, yeh games hain:\n• Main Hub → "Gaming"\n• Rider King, Pulse Racer, Subsea Surge, Neon Strike, Volcano Escape\n• 1v1 games khelo, coins multiply honge 🔥\n• Jald: Ludo Elite Royal, Puck Pulse Elite 🔜`,
      ur:  `🎮 AJ Gaming Zone:\n\n• Main Hub → "Gaming"\n• Rider King، Pulse Racer، Subsea Surge، Neon Strike، Volcano Escape\n• Coins multiply کریں 🔥\n• جلد: Ludo Elite Royal، Puck Pulse Elite 🔜`,
      hi:  `🎮 AJ Gaming Zone:\n\n• Main Hub → "Gaming"\n• Rider King, Pulse Racer, Subsea Surge, Neon Strike, Volcano Escape\n• Coins multiply करो 🔥\n• जल्द: Ludo Elite Royal 🔜`,
      ar:  `🎮 منطقة الألعاب:\n\n• "Gaming" من الرئيسية\n• Rider King، Pulse Racer، Subsea Surge، Neon Strike، Volcano Escape\n• اضاعف كوينزك 🔥\n• قريباً: Ludo Elite Royal 🔜`,
    },

    refer: {
      en:  `👥 Referral System — Earn Free Coins!\n\n• Your Referral Code = your User ID (find it in Wallet or Social Hub)\n• Share your ID with friends\n• They go to Wallet → "Enter Referral Code" and paste your ID\n• You receive +${REFERRAL_COINS} Coins per successful referral 🎉\n• No limit — refer as many as you want!\n\nTip: Copy your ID from the Social Hub referral card and share on WhatsApp/Instagram 📤`,
      hin: `👥 Referral System:\n\n• Tera Referral Code = tera User ID (Wallet ya Social Hub mein)\n• ID apne doston ko share karo\n• Wo Wallet → "Enter Referral Code" mein tera ID daalen\n• Tujhe +${REFERRAL_COINS} Coins milenge 🎉\n• Koi limit nahi!\n\nTip: Social Hub se copy karo aur WhatsApp pe share karo 📤`,
      ur:  `👥 Referral System:\n\n• آپ کا Referral Code = آپ کا User ID\n• ID شیئر کریں\n• Wallet → "Enter Referral Code"\n• +${REFERRAL_COINS} Coins 🎉\n• کوئی حد نہیں!\n\nTip: WhatsApp پر شیئر کریں 📤`,
      hi:  `👥 Referral System:\n\n• Referral Code = User ID\n• ID दोस्तों को share करो\n• Wallet → "Enter Referral Code"\n• +${REFERRAL_COINS} Coins 🎉\n• कोई limit नहीं!\n\nTip: WhatsApp पर share करो 📤`,
      ar:  `👥 نظام الإحالة:\n\n• رمز الإحالة = معرّفك\n• شارك المعرّف\n• المحفظة → "أدخل رمز الإحالة"\n• +${REFERRAL_COINS} كوين 🎉\n• بلا حدود!\n\nنصيحة: شارك عبر واتساب 📤`,
    },

    withdraw: {
      en:  `💸 Withdrawal — How to Cash Out:\n\n• Minimum: ${WITHDRAW_MIN.toLocaleString()} Coins = $${WITHDRAW_MIN/CASH_RATE} USD\n• Rate: ${CASH_RATE} Coins = $1\n• Go to: Wallet → Withdraw\n\n📋 Methods:\n1. EasyPaisa\n2. JazzCash\n3. Binance USDT BSC\n4. AirTM\n5. Bank / Visa / Mastercard\n\n📅 Withdrawals processed monthly: 25th – 31st of each month.`,
      hin: `💸 Withdraw kaise karo:\n\n• Minimum: ${WITHDRAW_MIN.toLocaleString()} Coins = $${WITHDRAW_MIN/CASH_RATE}\n• Rate: ${CASH_RATE} Coins = $1\n• Wallet → Withdraw\n\n📋 Methods:\n1. EasyPaisa\n2. JazzCash\n3. Binance USDT BSC\n4. AirTM\n5. Bank / Visa / Mastercard\n\n📅 Withdrawal 25 se 31 tarikh ke beech process hoti hai. 🙏`,
      ur:  `💸 نکاسی:\n\n• کم از کم: ${WITHDRAW_MIN.toLocaleString()} Coins = $${WITHDRAW_MIN/CASH_RATE}\n• Wallet → Withdraw\n\n📋 طریقے:\n1. EasyPaisa\n2. JazzCash\n3. Binance USDT BSC\n4. AirTM\n5. Bank / Visa / Mastercard\n\n📅 نکاسی ہر ماہ 25 سے 31 تاریخ کے درمیان!`,
      hi:  `💸 Withdrawal:\n\n• Minimum: ${WITHDRAW_MIN.toLocaleString()} Coins = $${WITHDRAW_MIN/CASH_RATE}\n• Wallet → Withdraw\n\n📋 Methods:\n1. EasyPaisa\n2. JazzCash\n3. Binance USDT BSC\n4. AirTM\n5. Bank / Visa / Mastercard\n\n📅 Withdrawal हर महीने 25 से 31 तारीख के बीच!`,
      ar:  `💸 السحب:\n\n• الحد الأدنى: ${WITHDRAW_MIN.toLocaleString()} كوين = $${WITHDRAW_MIN/CASH_RATE}\n• المحفظة → السحب\n\n📋 الطرق:\n1. EasyPaisa\n2. JazzCash\n3. Binance USDT BSC\n4. AirTM\n5. بنك / فيزا / ماستركارد\n\n📅 تُعالَج عمليات السحب شهرياً من 25 إلى 31 من كل شهر!`,
    },

    buy: {
      en:  `💰 Purchase AJ Coins:\n\n• Minimum: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\n• Rate: $1 = ${COIN_RATE} Coins\n• Wallet → Purchase\n\n📋 Options:\n1. Binance USDT BSC (auto invoice)\n2. Airtm\n3. EasyPaisa\n4. JazzCash\n5. Bank / Visa / Mastercard\n\nSend payment → enter TX ID → submit. Coins credited within minutes! ✅`,
      hin: `💰 Coins kharido:\n\n• Minimum: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\n• $1 = ${COIN_RATE} Coins\n• Wallet → Purchase\n\n📋 Options:\n1. Binance USDT BSC\n2. Airtm\n3. EasyPaisa\n4. JazzCash\n5. Bank / Visa / Mastercard\n\nPayment → TX ID → Submit! Kuch minute mein Coins ✅`,
      ur:  `💰 Coins خریدیں:\n\n• کم از کم: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\n• Wallet → Purchase\n\n📋 طریقے:\n1. Binance\n2. Airtm\n3. EasyPaisa\n4. JazzCash\n5. Bank / Visa\n\nPayment → TX ID → Submit ✅`,
      hi:  `💰 Coins खरीदें:\n\n• Minimum: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins\n• Wallet → Purchase\n\nPayment → TX ID → Submit!\nकुछ मिनट में Coins ✅`,
      ar:  `💰 شراء كوينز:\n\n• الحد الأدنى: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} كوين\n• المحفظة → شراء\n\nادفع → أدخل TX ID → أرسل!\nكوينز خلال دقائق ✅`,
    },

    live: {
      en:  `📡 Go Live on AJ Portal:\n\n1. Social Hub → tap "GO LIVE"\n2. Allow camera + microphone\n3. Live starts in HD\n4. Share your Room ID — viewers paste it to join\n5. Viewers send gifts → you keep 60%! 💰\n\n⚔️ PK Battle:\n• PK button → rival's User ID\n• 100 Coins from each\n• 5 min timer — most gifts wins 🏆`,
      hin: `📡 AJ Portal pe Live:\n\n1. Social Hub → "GO LIVE"\n2. Camera + mic allow karo\n3. HD streaming shuru\n4. Room ID share karo\n5. Viewers gifts bhejein → 60% tera! 💰\n\n⚔️ PK: rival ID → 100 Coins → 5 min → jyada gifts = jeet 🏆`,
      ur:  `📡 Live:\n\n1. GO LIVE\n2. Camera allow\n3. Room ID شیئر\n4. gifts → 60% آپ کا 💰\n\n⚔️ PK: User ID → 100 Coins → 5 منٹ 🏆`,
      hi:  `📡 Live:\n\n1. GO LIVE\n2. Camera allow\n3. Room ID share\n4. Gifts → 60% आपका 💰\n\n⚔️ PK: User ID → 100 Coins → 5 min 🏆`,
      ar:  `📡 البث المباشر:\n\n1. GO LIVE\n2. اسمح بالكاميرا\n3. شارك Room ID\n4. هدايا → 60% لك 💰\n\n⚔️ PK: User ID → 100 كوين → 5 دقائق 🏆`,
    },

    gift: {
      en:  `🎁 Gift System:\n\n☕ Coffee — 500 Coins\n🍕 Pizza Party — 1,000 Coins\n❤️ Mega Heart — 2,500 Coins\n🏎️ Super Car — 5,000 Coins\n🛩️ Private Jet — 8,000 Coins\n🏰 AJ Mansion — 10,000 Coins\n\n• Send in live streams or Pulse posts\n• Creator gets 60% 🎊`,
      hin: `🎁 Gift System:\n\n☕ Coffee — 500 Coins\n🍕 Pizza — 1,000 Coins\n❤️ Mega Heart — 2,500 Coins\n🏎️ Super Car — 5,000 Coins\n🛩️ Private Jet — 8,000 Coins\n🏰 AJ Mansion — 10,000 Coins\n\n• Live ya Pulse pe bhejo\n• Creator ko 60% 🎊`,
      ur:  `🎁 Gift System:\n\n☕ Coffee — 500\n🍕 Pizza — 1,000\n❤️ Mega Heart — 2,500\n🏎️ Car — 5,000\n🛩️ Jet — 8,000\n🏰 Mansion — 10,000 Coins\n\n• 60% Creator کا 🎊`,
      hi:  `🎁 Gift System:\n\n☕ Coffee — 500\n🍕 Pizza — 1,000\n❤️ Heart — 2,500\n🏎️ Car — 5,000\n🛩️ Jet — 8,000\n🏰 Mansion — 10,000 Coins\n\n• Creator को 60% 🎊`,
      ar:  `🎁 نظام الهدايا:\n\n☕ قهوة — 500\n🍕 بيتزا — 1,000\n❤️ قلب — 2,500\n🏎️ سيارة — 5,000\n🛩️ طائرة — 8,000\n🏰 قصر — 10,000 كوين\n\n• المنشئ يحصل على 60% 🎊`,
    },

    pk: {
      en:  `⚔️ PK Battle — Live Competition!\n\n• Must be LIVE to start\n• PK button → rival's User ID\n• Both lose 100 Coins as entry\n• 5-minute countdown\n• Most gift coins = Winner 🏆`,
      hin: `⚔️ PK Battle:\n\n• Pehle Live jao\n• PK button → rival User ID\n• Dono se 100 Coins\n• 5 minute\n• Jyada gifts = jeet 🏆`,
      ur:  `⚔️ PK Battle:\n\n• Live جائیں\n• PK → حریف ID\n• 100 Coins دونوں سے\n• 5 منٹ\n• زیادہ gifts = فاتح 🏆`,
      hi:  `⚔️ PK Battle:\n\n• Live जाएं\n• PK → rival ID\n• 100 Coins\n• 5 min\n• ज़्यादा gifts = जीत 🏆`,
      ar:  `⚔️ PK Battle:\n\n• في البث المباشر\n• PK → معرّف المنافس\n• 100 كوين من كل\n• 5 دقائق\n• أكثر هدايا = فوز 🏆`,
    },

    aibot: {
      en:  `🤖 AI Trading Bot — Passive Income!\n\n• Main Hub → "AI Trading Bot"\n\n💎 Basic: 25,000 Coins → 2% daily profit\n👑 VVIP: 75,000 Coins → 5% daily profit 🔥\n\n• Profits added to your balance every second\n• Runs 24/7 — set and forget!\n• Withdraw profits anytime (once minimum reached)`,
      hin: `🤖 AI Trading Bot:\n\n• Main Hub → "AI Trading Bot"\n\n💎 Basic: 25,000 Coins → 2% daily\n👑 VVIP: 75,000 Coins → 5% daily 🔥\n\n• Profits har second add hote hain\n• 24/7 chalta hai\n• Jab minimum ho withdraw karo`,
      ur:  `🤖 AI Trading Bot:\n\n• Main Hub → "AI Trading Bot"\n\n💎 Basic: 25,000 → 2% daily\n👑 VVIP: 75,000 → 5% daily 🔥\n\n• منافع خودکار add\n• 24/7`,
      hi:  `🤖 AI Bot:\n\n• Main Hub → "AI Trading Bot"\n\n💎 Basic: 25,000 → 2% daily\n👑 VVIP: 75,000 → 5% daily 🔥`,
      ar:  `🤖 روبوت التداول:\n\n• الرئيسية → "AI Trading Bot"\n\n💎 أساسي: 25,000 → 2% يومياً\n👑 VVIP: 75,000 → 5% يومياً 🔥`,
    },

    transfer: {
      en:  `🔄 Coin Transfer:\n\n• Wallet → Transfer\n• Enter recipient's User ID\n• Enter amount\n• Confirm — instant transfer!\n\n⚠️ Cannot transfer to yourself. Irreversible.`,
      hin: `🔄 Transfer:\n\n• Wallet → Transfer\n• Recipient User ID\n• Amount\n• Confirm — turant!\n\n⚠️ Apne aap ko nahi, undo nahi hota`,
      ur:  `🔄 Transfer:\n\n• Wallet → Transfer\n• User ID\n• رقم\n• Confirm — فوری!\n\n⚠️ ناقابل واپسی`,
      hi:  `🔄 Transfer:\n\n• Wallet → Transfer\n• User ID + Amount\n• Confirm — तुरंत!\n\n⚠️ Irreversible`,
      ar:  `🔄 تحويل:\n\n• المحفظة → تحويل\n• معرّف + مبلغ\n• تأكيد — فوري!\n\n⚠️ غير قابل للتراجع`,
    },

    wechat: {
      en:  `💬 AJ WeChat — Encrypted Messenger:\n\n• Social → AJ WeChat\n• Sync contacts or add manually\n• Tap any contact → private chat\n• Audio 📞 & Video 📹 calls in chat header\n• All messages end-to-end encrypted 🔒`,
      hin: `💬 AJ WeChat:\n\n• Social → AJ WeChat\n• Contacts sync ya manually add\n• Tap → private chat\n• Audio 📞 + Video 📹 call\n• Sab messages encrypted 🔒`,
      ur:  `💬 AJ WeChat:\n\n• Social → AJ WeChat\n• Contacts add\n• Tap → private chat\n• Audio 📞 Video 📹\n• encrypted 🔒`,
      hi:  `💬 AJ WeChat:\n\n• Social → AJ WeChat\n• Tap → private chat\n• Audio 📞 Video 📹\n• Encrypted 🔒`,
      ar:  `💬 AJ WeChat:\n\n• Social → AJ WeChat\n• اضغط → محادثة خاصة\n• مكالمة 📞 📹\n• مشفر 🔒`,
    },

    payment_issue: {
      en:  `⚠️ Payment / Technical Issue:\n\nIf your coins haven't arrived after submitting a Transaction ID, or you're facing a technical bug:\n\n👇 Contact CEO directly on WhatsApp:`,
      hin: `⚠️ Payment ya Technical Problem:\n\nBhai, agar Transaction ID submit karne ke baad bhi Coins nahi aaye:\n\n👇 CEO se seedha WhatsApp pe baat karo:`,
      ur:  `⚠️ Payment / Technical مسئلہ:\n\nاگر Coins نہیں آئے یا bug ہے:\n\n👇 CEO سے WhatsApp:`,
      hi:  `⚠️ Payment / Technical Issue:\n\nCoins नहीं आए या bug है:\n\n👇 CEO WhatsApp:`,
      ar:  `⚠️ مشكلة:\n\nلم تصل كوينزك أو خطأ تقني:\n\n👇 واتساب CEO:`,
    },

    // Do NOT provide sensitive purchase/withdrawal step-by-step details in chat
    sensitive_payment: {
      en: `⚠️ I cannot provide detailed purchase or withdrawal instructions here. Please use the Wallet → Purchase or Wallet → Withdraw pages in the app for transaction flows, or contact support if something failed.`,
      hin: `⚠️ Main yahan purchase/withdrawal ki puri detail nahi de sakta. Wallet → Purchase ya Wallet → Withdraw use karo, ya support se rabta karo.`,
      ur: `⚠️ میں یہاں خریداری یا نکاسی کی مکمل تفصیلات نہیں دے سکتا۔ براہِ مہربانی Wallet → Purchase یا Wallet → Withdraw استعمال کریں یا سپورٹ سے رابطہ کریں۔`,
      hi: `⚠️ मैं यहाँ purchase/withdrawal की पूरी जानकारी नहीं दे सकता। Wallet → Purchase या Wallet → Withdraw का उपयोग करें या सपोर्ट से संपर्क करें।`,
      ar: `⚠️ لا أستطيع تقديم تفاصيل الشراء/السحب هنا. الرجاء استخدام Wallet → Purchase أو Wallet → Withdraw أو التواصل مع الدعم.`,
    },

    // Bug reports should be routed to the CEO with WhatsApp and email contact
    bug_report: {
      en: `⚠️ Thanks for reporting this. Please contact our CEO directly on WhatsApp: ${CEO_WHATSAPP} or email: ${CEO_EMAIL} so we can investigate your issue promptly.`,
      hin: `⚠️ Shukriya bug report karne ke liye. CEO se WhatsApp par baat karein: ${CEO_WHATSAPP} ya email bhejein: ${CEO_EMAIL}`,
      ur: `⚠️ مسئلہ رپورٹ کرنے کے لیے شکریہ۔ براہِ کرم CEO سے WhatsApp پر رابطہ کریں: ${CEO_WHATSAPP} یا ای میل کریں: ${CEO_EMAIL}`,
      hi: `⚠️ रिपोर्ट करने के लिए धन्यवाद। CEO से WhatsApp पर बात करें: ${CEO_WHATSAPP} या मेल करें: ${CEO_EMAIL}`,
      ar: `⚠️ شكراً لتبليغك عن المشكلة. يرجى التواصل مع المدير التنفيذي عبر واتساب: ${CEO_WHATSAPP} أو البريد الإلكتروني: ${CEO_EMAIL}`,
    },

    general: {
      en:  `I'm here to help! 😊 AJ Portal offers:\n\n🎬 TikReels — earn per upload\n📡 AJ Pulse — live + gifts\n🎮 Gaming — 1v1 coin games\n🪙 Coins — $1 = ${COIN_RATE} Coins, 500 signup bonus\n👥 Referral — +${REFERRAL_COINS} coins per friend\n💸 Withdraw — min ${WITHDRAW_MIN.toLocaleString()} coins\n🎁 Gifts — Coffee to Mansion\n⚔️ PK Battle\n🤖 AI Bot — 2-5% daily\n💬 WeChat — private chat\n\nAsk about any of these! 👆`,
      hin: `Bhai, main yahan hoon! 😊\n\n🎬 TikReels • 📡 AJ Pulse • 🎮 Gaming\n🪙 $1=${COIN_RATE} Coins, 500 bonus\n👥 Referral +${REFERRAL_COINS} • 💸 Withdraw\n🎁 Gifts • ⚔️ PK • 🤖 AI Bot 2-5%\n💬 WeChat\n\nKisi bhi topic ke baare mein pooch! 🔥`,
      ur:  `میں حاضر ہوں! 😊\n\n🎬 TikReels • 📡 Pulse • 🎮 Gaming\n🪙 Coins • 💸 Withdraw • 🎁 Gifts\n⚔️ PK • 🤖 AI Bot • 💬 WeChat\n\nکوئی بھی سوال پوچھیں!`,
      hi:  `मैं यहां हूं! 😊\n\n🎬 TikReels • 📡 Pulse • 🎮 Gaming\n🪙 Coins • 💸 Withdraw • 🎁 Gifts\n⚔️ PK • 🤖 AI Bot • 💬 WeChat\n\nकुछ भी पूछो!`,
      ar:  `أنا هنا! 😊\n\n🎬 TikReels • 📡 Pulse • 🎮 Gaming\n🪙 كوينز • 💸 سحب • 🎁 هدايا\n⚔️ PK • 🤖 AI Bot • 💬 WeChat\n\nاسألني!`,
    },
  };

  const matchBotTopic = (q: string, lastTopic: string): string => {
    const t = q.toLowerCase();
    if (/^(hi|hey|hello|salam|assalam|hii|helo|yo|sup|wassup|kia haal|kya haal|namaste|namaskar|bonjour|hola|ciao|merhaba|привет|halo)\b/.test(t)) return 'greeting';
    // Bug/issue reporting should be routed to CEO contact
    if (/bug|issue|error|problem|crash|not working|masla|mushkil|masky|khata|bug report|report bug/.test(t)) return 'bug_report';
    // Sensitive payment topics: refuse to give detailed purchase/withdrawal flow in chat
    if (/withdraw|withdrawal|cash out|cashout|payout|purchase|buy|payment|invoice|charge|refund|top up|recharge|buy coins|how to withdraw|how to purchase|wallet/.test(t)) return 'sensitive_payment';
    if (/payment.*(fail|not.*arriv|problem|issue|stuck|error|wrong|bug)|coin.*not.*arriv|deposit.*not|transaction.*id.*(not|fail|wrong)|technical.*bug|bug.*report|refund/.test(t)) return 'payment_issue';
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

  // Smart AI Bot: 1st reply always English → then auto-match Hinglish/Urdu/Arabic etc.
  const handleBotSend = () => {
    if (!botInput.trim()) return;
    const input   = botInput.trim();
    const rawLang = detectLanguage(input);
    // First message → English so new users understand the bot
    // Every subsequent message → match the user's own language automatically
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
  // SPLASH
  // ==========================================================
  if (screen==='splash') return (
    <main className="h-screen bg-[#050505] flex flex-col items-center justify-center text-white text-center">
      <div className="w-40 h-40 bg-[#050505] rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8">
        <img src="/logo.png" className="w-full h-full object-cover" alt="AJ"/>
      </div>
      <h1 className="text-3xl font-black tracking-widest uppercase animate-pulse">AJ PORTAL</h1>
    </main>
  );

  // ==========================================================
  // AUTH
  // ==========================================================
  if (screen==='auth') return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 italic text-cyan-400 uppercase">AJ <span className="text-white">ID</span></h2>
        <button onClick={handleGoogleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl  transition-all shadow-xl">
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
      <input type="file" ref={fileInputRef}  onChange={handleFileChange}       accept="image/*,video/*" className="hidden"/>
      <input type="file" ref={tiktokFileRef} onChange={handleTiktokFileChange} accept="image/*,video/*" className="hidden"/>
      <input type="file" ref={audioFileRef}  onChange={e => { const f = e.target.files?.[0]; if(f) setTiktokAudioFile(f); }} accept="audio/*" className="hidden"/>

      {/* VVIP NEON ALERT MODAL — Req 4 */}
      {vvipAlert && (
        <VVIPAlert msg={vvipAlert.msg} icon={vvipAlert.icon} onClose={() => setVvipAlert(null)}/>
      )}

      {/* EDIT POST MODAL — Req 2 */}
      {editPostId && (
        <div className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a1a] border border-pink-500/30 rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <p className="text-xs font-black text-pink-400 uppercase tracking-widest mb-3">✏️ Edit Post</p>
            <textarea
              value={editPostText}
              onChange={e => setEditPostText(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white outline-none focus:border-pink-500 h-24 font-bold resize-none"
              placeholder="Edit your caption..."/>
            <div className="flex gap-3 mt-3">
              <button onClick={async () => {
                if (!editPostId) return;
                const col = socialScreen === 'pulse' ? 'pulse_posts' : 'user_posts';
                try {
                  await updateDoc(doc(db, col, editPostId), { text: editPostText });
                  setEditPostId(null); setEditPostText('');
                  setVvipAlert({msg:'✅ Post updated!', icon:'✏️'});
                } catch { setVvipAlert({msg:'Update failed. Try again.'}); }
              }} className="flex-1 py-2.5 bg-pink-600 rounded-2xl font-black text-xs text-white uppercase tracking-widest">
                Save
              </button>
              <button onClick={() => { setEditPostId(null); setEditPostText(''); }}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CINEMATIC GIFT OVERLAY */}
      {cinematicGift && (
        <CinematicGiftOverlay
          gift={cinematicGift}
          sender={cinematicSender}
          onDone={() => { setCinematicGift(null); setCinematicSender(''); }}
        />
      )}
{/* MONETAG ADS */}
<Script id="monetag-banner-ad" src="https://nap5k.com" data-zone="11337197" strategy="afterInteractive" />
<Script id="monetag-vignette-ad" src="https://n6wxm.com" data-zone="11349676" strategy="afterInteractive" />
      {/* HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer" onClick={() => { setNotifOpen(!notifOpen); setUnreadCount(0); }}>
            <Bell size={22} className="text-white hover:text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text transition-all"/>
            {unreadCount>0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center border border-black animate-pulse">
                {unreadCount>9?'9+':unreadCount}
              </span>
            )}
          </div>
          <div onClick={() => navigateWithAd('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer hover:bg-white/5 backdrop-blur-xl border border-white/10 transition-all">
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

      {/* HOME HUB */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        {/* AI ASSISTANT — Hub Top Right */}
        <div className="fixed top-20 right-4 z-[150]">
          <button onClick={() => setBotOpen(!botOpen)}
            className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-green-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center justify-center text-black hover:scale-110 transition-all active:scale-90 border-2 border-white/20">
            {botOpen?<X size={20}/>:<Bot size={20}/>}
          </button>
        </div>

        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          {[
            { label:'Gaming',        icon:<Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2"/>, sc:'arcade', hover:'hover:border-cyan-400' },
            { label:'Social',        icon:<Zap     className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2"/>, sc:'social', hover:'hover:border-pink-500' },
            { label:'Wallet',        icon:<img src="/gold.jpg" className="w-14 h-14 mb-2 rounded-full border-2 border-yellow-500 shadow-md"/>, sc:'wallet', hover:'hover:border-yellow-500' },
            { label:'AI Trading Bot',icon:<Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2"/>, sc:'ai',     hover:'hover:border-green-500' },
          ].map(m => (
            <div key={m.label} onClick={() => navigateWithAd(m.sc)}
              className={`backdrop-blur-2xl bg-white/[0.07] border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl  transition-all ${m.hover} relative z-30`}>
              {m.icon}
              <span className="font-black text-xs md:text-3xl uppercase tracking-tighter">{m.label}</span>
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="relative w-24 h-24 md:w-96 md:h-96 bg-[#050505] border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden">
              <img src="/logo.png" className="w-full h-full object-cover opacity-60 animate-pulse"/>
            </div>
          </div>
        </div>

        {/* Sponsor Banner — Hub, static non-clickable, passive revenue */}
        <div className="w-full max-w-4xl mt-10 px-4 pointer-events-none select-none">
          <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-950/60 to-amber-950/30 border border-yellow-500/20 rounded-2xl px-5 py-3 shadow-inner">
            <span className="text-yellow-500/70 text-[8px] font-black uppercase tracking-widest border border-yellow-500/30 px-2 py-0.5 rounded-full shrink-0">Sponsored</span>
            <p className="text-gray-400 text-[10px] font-bold leading-snug">🌐 AJ Super Portal — Oman's #1 Social Earnings Platform. Earn Daily, Withdraw Anytime. Join 1M+ Members!</p>
          </div>
        </div>
      </section>

      {/* AI ASSISTANT CHAT PANEL */}
      {botOpen && screen==='hub' && (
        <div className="fixed bottom-24 right-6 z-[900] w-80 md:w-96 h-[480px] bg-white/[0.04] border border-cyan-500/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden backdrop-blur-2xl">
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
                <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed font-bold whitespace-pre-line ${msg.from==='user'?'bg-cyan-600 text-white rounded-tr-none':'bg-white/5 backdrop-blur-xl border border-white/10 text-gray-200 rounded-tl-none border border-white/10'}`}>
                  {msg.text}
                  {msg.from==='bot' && (msg as any).topic === 'payment_issue' && (
                    <a href={CEO_WHATSAPP} target="_blank" className="block mt-2 bg-green-500 text-black text-[10px] font-black uppercase px-3 py-2 rounded-xl text-center hover:bg-green-400 transition-all">
                      💬 WhatsApp CEO — Get Help Now
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-white/10 flex gap-3">
            <input type="text" value={botInput} onChange={e => setBotInput(e.target.value)}
              onKeyDown={e => e.key==='Enter'&&handleBotSend()} placeholder="Ask about Coins, Referral, Live..."
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500 font-bold"/>
            <button onClick={handleBotSend} className="bg-cyan-500 p-3 rounded-full text-black shadow-lg active:scale-90 transition-all">
              <Send size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* ARCADE */}
      {screen==='arcade' && (
        <div className="fixed inset-0 z-[300] bg-[#050505] flex flex-col h-screen overflow-hidden">
          {!selectedGame ? (
            <div className="p-8 overflow-y-auto flex-1">
              <button onClick={() => { setScreen('hub'); setSelectedGame(null); }}
                className="text-cyan-400 font-bold mb-6 tracking-widest uppercase flex items-center gap-2">
                <ArrowLeft size={20}/> BACK
              </button>
              {/* Sponsor Banner — Games Zone, static non-clickable */}
              <div className="w-full max-w-5xl mx-auto mb-8 pointer-events-none select-none">
                <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-950/60 to-blue-950/30 border border-cyan-500/20 rounded-2xl px-5 py-3 shadow-inner">
                  <span className="text-cyan-500/70 text-[8px] font-black uppercase tracking-widest border border-cyan-500/30 px-2 py-0.5 rounded-full shrink-0">Sponsored</span>
                  <p className="text-gray-400 text-[10px] font-bold leading-snug">🎮 Play-to-Earn Gaming Zone — Win AJ Coins in every match! 5 games live now, more launching soon.</p>
                </div>
              </div>
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
                    <h3 className="font-black text-sm uppercase text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text">{game}</h3>
                    <button disabled className="mt-4 w-full py-2 rounded-full font-black text-[10px] bg-yellow-500/20 text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text uppercase cursor-not-allowed">Coming Soon</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <div className="w-full bg-[#050505] h-12 flex items-center px-4 border-b border-white/10 shrink-0">
                <button onClick={() => setSelectedGame(null)} className="text-cyan-400 font-black text-[10px] uppercase tracking-widest">← BACK</button>
                <div className="flex-1 text-center font-black uppercase text-[10px] opacity-40">{selectedGame}</div>
              </div>
              <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g,'-')}/index.html`}
                className="w-full h-full border-none flex-1" title="Game"/>
            </div>
          )}
        </div>
      )}

      {/* SOCIAL */}
      {screen==='social' && (
        <div className="fixed inset-0 z-[400] bg-slate-950 flex flex-col h-screen overflow-hidden">
          <header className="sticky top-0 w-full p-4 bg-[#050505]/90 backdrop-blur-md border-b border-white/10 flex justify-between items-center z-[500] rounded-b-3xl shrink-0">
            {socialScreen==='hub'
              ? <button onClick={() => setScreen('hub')} className="text-pink-500 font-black text-xs uppercase">← HUB</button>
              : <button onClick={() => setSocialScreen('hub')} className="text-pink-500 font-black text-xs uppercase">← BACK</button>
            }
            <h2 className="text-xl font-black uppercase text-center flex-1 tracking-[0.12em] bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(236,72,153,0.9)] animate-pulse select-none">⚡ AJ SUPER PORTAL</h2>
            <button onClick={() => setSocialScreen('settings_menu')} className="bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-full text-pink-500 hover:bg-white/20 shadow-lg">
              <Settings size={22}/>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">

            {/* SOCIAL HUB */}
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
                  <p className="text-[10px] font-black text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text uppercase tracking-widest mb-2">🎁 Refer & Earn — Your Referral Code</p>
                  <div className="flex items-center justify-between bg-[#050505]/40 px-3 py-2 rounded-xl">
                    <span className="text-xs font-mono text-yellow-300 truncate max-w-[200px]">{user?.uid}</span>
                    <button onClick={() => copyToClipboard(user?.uid||"")} className="text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text text-[10px] font-black uppercase">
                      {copied?"Copied ✓":"Copy"}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2">Share ID → New user enters it → You get +{REFERRAL_COINS} Coins!</p>
                </div>

                {/* Req 2: Notifications panel button */}
                <button onClick={() => { setShowNotifs(!showNotifs); loadNotifications(); }}
                  className="w-full py-3 bg-white/5 border border-yellow-500/30 rounded-2xl font-black uppercase text-yellow-400 text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-500/10 transition-all">
                  🔔 Notifications {notifications.filter((n:any)=>!n.read).length > 0 && <span className="bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5">{notifications.filter((n:any)=>!n.read).length}</span>}
                </button>
                {showNotifs && notifications.length > 0 && (
                  <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-3 space-y-2 max-h-48 overflow-y-auto">
                    {notifications.map((n:any) => (
                      <div key={n.id} className="flex items-center gap-3">
                        <img src={n.fromPhoto||'/logo.png'} className="w-8 h-8 rounded-full border border-pink-500 object-cover shrink-0"/>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-white">@{n.fromUsername} followed you!</p>
                          <p className="text-[9px] text-gray-500">Tap to follow back</p>
                        </div>
                        <button onClick={() => n.fromUid && handleFollow(n.fromUid)}
                          className="px-3 py-1.5 bg-pink-600 rounded-full text-[9px] font-black text-white uppercase shrink-0">
                          Follow Back
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* GO LIVE */}
                <button onClick={startLive}
                  className="w-full py-4 bg-red-600 rounded-[2rem] font-black uppercase text-white tracking-[0.2em] shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95 transition-all duration-200   transition-all flex items-center justify-center gap-3 ">
                  <Radio size={22} className="animate-pulse"/> GO LIVE (Camera + Gifts)
                </button>

                {/* JOIN BY ROOM ID */}
                <div className="bg-white/5 border border-cyan-500/30 rounded-3xl p-4">
                  <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Radio size={11}/> Join a Live Stream by Room ID
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinRoomInput}
                      onChange={e => setJoinRoomInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && joinLiveByRoomId()}
                      placeholder="Paste Room ID here..."
                      className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-cyan-500 font-mono"
                    />
                    <button
                      onClick={() => joinLiveByRoomId()}
                      className="bg-cyan-600 px-4 py-2.5 rounded-xl text-[10px] font-black text-black uppercase tracking-widest  transition-all shadow-lg">
                      Join
                    </button>
                  </div>
                </div>

                {/* LIVE NOW LOBBY */}
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
                          <div key={room.id} className="flex items-center gap-3 bg-[#050505]/40 p-3 rounded-2xl border border-red-500/20 cursor-pointer hover:border-red-500 transition-all "
                            onClick={() => joinLiveByRoomId(room.roomId)}>
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

                {/* MODULE CARDS */}
<div className="mb-4"><MonetagBanner siteId={11337197} /></div>
                {[
                  { n:'AJ TikReels', i:Video,        d:'TikTok Style Videos', s:'tikreels'  },
                  { n:'AJ Pulse',    i:Users,         d:'Insta Style Feed',    s:'pulse'     },
                  { n:'AJ WeChat',   i:MessageSquare, d:'VVIP Messenger',      s:'chatlist'  },
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

            {/* Fix #5: USER PROFILE — Always renders, never shows 404 */}
            {socialScreen==='profile' && (
              <div className="max-w-md mx-auto pb-24">
                {profileLoading && (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-pink-500 border-t-transparent animate-spin"/>
                    <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Loading Profile...</p>
                  </div>
                )}
                {!profileLoading && viewProfile && (
                  <>
                  <div className="relative h-44 bg-gradient-to-br from-pink-600/30 to-cyan-600/30 rounded-b-[3rem]">
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                      <img src={viewProfile.photo||'/logo.png'} className="w-24 h-24 rounded-full border-4 border-slate-950 shadow-2xl"/>
                    </div>
                  </div>
                  <div className="mt-16 text-center px-6">
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest">@{viewProfile.username||'AJ_MEMBER'}</h2>
                    {viewProfile.name && <p className="text-sm text-gray-400 mt-1 font-bold">{viewProfile.name}</p>}
                    <p className="text-sm text-gray-400 mt-1 font-bold">{viewProfile.bio||'No bio yet.'}</p>

                    {/* STATS */}
                    <div className="flex justify-center gap-8 mt-6">
                      {[
                        {l:'Posts',     v: profilePosts.length + profileVideos.length},
                        {l:'Followers', v: followers},
                        {l:'Following', v: following},
                        {l:'Likes',     v: profileTotalLikes},
                      ].map(s => (
                        <div key={s.l} className="text-center">
                          <p className="text-xl font-black text-white">{formatViews(s.v)}</p>
                          <p className="text-[9px] text-gray-500 uppercase font-bold">{s.l}</p>
                        </div>
                      ))}
                    </div>

                    {/* FOLLOW + MESSAGE BUTTONS */}
                    {viewingUid !== user?.uid && (
                      <div className="flex flex-col gap-2 mt-6 items-center">
                        {/* Req 2: Your Friend label for mutual follows */}
                        {isMutualFriend && (
                          <div className="flex items-center gap-1 bg-green-500/15 border border-green-500/30 px-4 py-1.5 rounded-full mb-1">
                            <UserCheck size={12} className="text-green-400"/>
                            <span className="text-green-400 text-[10px] font-black uppercase tracking-widest">Your Friend</span>
                          </div>
                        )}
                        <div className="flex gap-3 w-full">
                        <button
                          onClick={() => { if (viewingUid) { handleFollow(viewingUid); } }}
                          className={`flex-1 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all  ${isFollowing?'bg-white/5 backdrop-blur-xl border border-white/10 border border-white/20 text-white':'bg-pink-600 text-white shadow-lg'}`}>
                          {isFollowing ? <><UserCheck size={16}/> Following</> : <><UserPlus size={16}/> Follow</>}
                        </button>
                        <button
                          onClick={() => {
                            if (viewingUid && viewProfile) openOrCreateChat(viewingUid, viewProfile);
                          }}
                          className="flex-1 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-600/30 transition-all ">
                          <MessageCircle size={16}/> Message
                        </button>
                        </div>
                      </div>
                    )}

                    {/* TABS */}
                    <div className="flex gap-4 mt-8 border-b border-white/10">
                      {[{t:'Posts',i:<Grid size={18}/>},{t:'Videos',i:<Film size={18}/>}].map(tab => (
                        <button key={tab.t} className="flex-1 flex items-center justify-center gap-2 py-3 font-black text-xs uppercase tracking-widest text-pink-400 border-b-2 border-pink-500">
                          {tab.i}{tab.t}
                        </button>
                      ))}
                    </div>

                    {/* Fix #6: Video grid with formatViews on every thumbnail */}
                    <div className="grid grid-cols-3 gap-1 mt-4">
                      {[...profilePosts, ...profileVideos].map((p:any) => (
                        <div key={p.id} className="aspect-square bg-white/5 rounded-xl overflow-hidden relative">
                          {(p.image||p.url||p.thumbnail)
                            ? <img src={p.image||p.url||p.thumbnail} className="w-full h-full object-cover" loading="lazy" decoding="async"/>
                            : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-600/20 to-cyan-600/20"><Film size={24} className="text-pink-400"/></div>
                          }
                          {/* Fix #6: View counter bottom-left with formatViews */}
                          <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-[#050505]/60 px-1.5 py-0.5 rounded-full">
                            <Film size={8} className="text-white opacity-70"/>
                            <span className="text-[8px] font-black text-white">{formatViews(p.views ?? 0)}</span>
                          </div>
                        </div>
                      ))}
                      {profileVideos.length===0 && profilePosts.length===0 && (
                        <div className="col-span-3 py-12 text-center">
                          <Film size={36} className="text-gray-600 mx-auto mb-3"/>
                          <p className="text-gray-500 text-xs font-black uppercase tracking-widest">No posts uploaded yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                  </>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {socialScreen==='settings_menu' && (
              <div className="max-w-md mx-auto p-10 flex flex-col gap-6">
                <h2 className="text-3xl font-black text-cyan-400 italic mb-4 uppercase tracking-widest">Settings</h2>
                <button onClick={() => setSocialScreen('setup')}
                  className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4 hover:bg-white/5 backdrop-blur-xl border border-white/10 transition-all shadow-xl">
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
                <div className="flex gap-0 bg-[#050505] border-b border-white/10 shrink-0">
                  {(['feed','create','profile'] as const).map(t => (
                    <button key={t} onClick={() => { setTiktabMode(t); if(t==='profile') loadFollowingList(); }}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tiktabMode===t?'text-pink-500 border-b-2 border-pink-500':'text-gray-500'}`}>
                      {t==='feed'?'🎬 Feed':t==='create'?'➕ Post':'👤 Profile'}
                    </button>
                  ))}
                  {/* Req 3: GO LIVE inside TikReel — like TikTok */}
                  <button onClick={startLive} title="Go Live"
                    className="px-3 py-3 flex items-center gap-1 border-l border-white/10 text-red-400 hover:text-red-300 transition-all shrink-0">
                    <Radio size={13} className="animate-pulse"/><span className="text-[9px] font-black">🔴</span>
                  </button>
                </div>
                {/* FEED (TikReels) */}
{tiktabMode === 'feed' && (
  <div ref={videoFeedRef} className="h-full w-full max-w-md mx-auto snap-y snap-mandatory overflow-y-auto no-scrollbar bg-black relative">
    {(!userPosts || userPosts.length === 0) ? (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
        <p className="text-sm font-bold uppercase tracking-wider mb-2">No Reels Yet</p>
        <p className="text-xs">Be the first to upload a TikReel!</p>
      </div>
    ) : (
      userPosts.map((p: any, idx: number) => {
        // Safe media URL extraction
        const videoSrc = p.url || p.videoUrl || p.mediaUrl || p.tiktokPostImg || p.video || '';
        const isYouTube = videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be');
        const ytEmbedUrl = isYouTube ? (
          videoSrc.includes('embed') 
            ? videoSrc 
            : `https://www.youtube.com/embed/${videoSrc.split('v=')[1]?.split('&')[0] || videoSrc.split('shorts/')[1]?.split('?')[0]}?autoplay=1&mute=${globalSoundOn ? 0 : 1}&controls=0&loop=1`
        ) : null;

        return (
          <div key={p.id || idx} className="h-full w-full snap-start relative flex items-center justify-center bg-black overflow-hidden shrink-0">
            {/* Media Player */}
            {isYouTube && ytEmbedUrl ? (
              <iframe 
                src={ytEmbedUrl} 
                className="w-full h-full pointer-events-none" 
                allow="autoplay; encrypted-media" 
                title="Shorts"
              />
            ) : p.isVideo || videoSrc.includes('.mp4') || videoSrc.includes('video') || videoSrc.startsWith('data:video') ? (
              <video src={videoSrc} className="w-full h-full object-cover" autoPlay loop muted={!globalSoundOn} playsInline />
            ) : (
              <img src={videoSrc || p.photo || p.image || '/logo.png'} className="w-full h-full object-cover" onError={(e: any) => { e.target.src = '/logo.png'; }} />
            )}

            {/* Mute/Unmute Toggle Button */}
            <button onClick={() => setGlobalSoundOn(!globalSoundOn)} className="absolute top-16 right-4 z-30 bg-black/40 backdrop-blur-md p-2 rounded-full text-white/80 hover:text-white border border-white/10">
              {globalSoundOn ? '🔊' : '🔇'}
            </button>

            {/* Right Action Sidebar */}
            <div className="absolute right-3 bottom-20 z-30 flex flex-col items-center gap-5">
              {/* Profile Avatar & Follow Plus Button */}
              <div className="relative group cursor-pointer">
                <img 
                  src={p.userPhoto || p.photo || '/logo.png'} 
                  onClick={() => setTiktabMode('profile')}
                  className="w-11 h-11 rounded-full border-2 border-pink-500 object-cover shadow-lg" 
                />
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (typeof handleFollowUser === 'function') {
                      handleFollowUser(p.author || p.username || p.userId);
                    } else if (typeof toggleFollow === 'function') {
                      toggleFollow(p.author || p.username || p.userId);
                    } else {
                      alert(`Followed @${p.username || p.author || 'User'}!`);
                    }
                  }} 
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-500 hover:bg-pink-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold shadow-md active:scale-90 transition-transform"
                >
                  +
                </button>
              </div>
              
              <button onClick={() => handleLike && handleLike(p.id)} className="flex flex-col items-center gap-1 group">
                <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 group-active:scale-125 transition-transform">
                  ❤️
                </div>
                <span className="text-[11px] font-bold text-white shadow-sm">{p.likes || 0}</span>
              </button>
              
              <button onClick={() => setCommentPostId && setCommentPostId(p.id)} className="flex flex-col items-center gap-1">
                <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                  💬
                </div>
                <span className="text-[11px] font-bold text-white shadow-sm">{p.commentsCount || 0}</span>
              </button>
              
              <button className="flex flex-col items-center gap-1">
                <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                  🔗
                </div>
                <span className="text-[10px] font-bold text-white shadow-sm">Share</span>
              </button>
            </div>

            {/* Bottom Caption Overlay */}
            <div className="absolute bottom-4 left-4 right-16 z-20 flex flex-col gap-1.5 text-left bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 rounded-xl">
              <p className="font-black text-sm text-white tracking-wide">@{p.username || p.author || 'AJ_Creator'}</p>
              <p className="text-xs text-gray-200 line-clamp-2 leading-snug">{p.caption || p.text || 'Check out this TikReel! 🔥'}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-pink-400 font-semibold">
                <span>🎵 Original Sound - {p.username || 'AJ Empire'}</span>
              </div>
            </div>
          </div>
        );
      })
    )}
  </div>
)}
                {/* CREATE (TikReels) */}
                {tiktabMode==='create' && (
                  <div className="max-w-md mx-auto p-6 space-y-6">
                    <h3 className="text-xl font-black text-pink-500 uppercase tracking-widest">📹 Create Video Post</h3>
                    <div className="border-2 border-dashed border-pink-500/40 rounded-3xl p-8 text-center cursor-pointer bg-white/5 hover:bg-white/5 backdrop-blur-xl border border-white/10 transition-all" onClick={handleTiktokImage}>
                      {tiktokPostImg
                        ? tiktokPostIsVideo
                          ? <video src={tiktokPostImg} controls className="w-full max-h-64 rounded-2xl object-cover" playsInline/>
                          : <img src={tiktokPostImg} className="w-full max-h-48 object-cover rounded-2xl"/>
                        : <><Film size={48} className="text-pink-500/40 mx-auto mb-3"/><p className="text-[10px] text-gray-500 uppercase font-black">Tap to select Video / Image</p></>
                      }
                    </div>
                    <textarea value={tiktokPostText} onChange={e => setTiktokPostText(e.target.value)} placeholder="Add caption..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-pink-500 h-24 font-bold"/>
                    {/* Fix 3a: Select Audio / Music from Phone */}
                    <button
                      type="button"
                      onClick={() => audioFileRef.current?.click()}
                      className="w-full py-3 bg-white/5 border border-pink-500/30 rounded-2xl font-black uppercase text-pink-400 text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-pink-500/10  transition-all"
                    >
                      <Music size={14}/> {tiktokAudioFile ? `🎵 ${tiktokAudioFile.name}` : 'Select Audio / Music from Phone'}
                    </button>
                    {selectedSound && !tiktokAudioFile && (
                      <p className="text-[10px] text-pink-400 font-bold text-center">🎵 Using: {selectedSound.slice(0,40)}</p>
                    )}
                    <button onClick={handleTiktokPost} className="w-full py-4 bg-pink-600 rounded-2xl font-black uppercase text-white tracking-widest shadow-lg  transition-all">
                      PUBLISH (+20 🪙)
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
                        {[{l:'Videos',v:userPosts.filter((p:any)=>p.uid===user?.uid).length},{l:'Followers',v:followers},{l:'Following',v:following}].map(s => (
                          <div key={s.l} className="text-center">
                            <p className="text-xl font-black text-white">{s.v}</p>
                            <p className="text-[9px] text-gray-500 uppercase font-bold">{s.l}</p>
                          </div>
                        ))}
                      </div>
                      {/* Sub-tabs: Posts | Following */}
                      <div className="flex gap-0 border-b border-white/10 mt-5">
                        <button onClick={() => setTikProfileSubTab('posts')}
                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tikProfileSubTab==='posts'?'text-pink-500 border-b-2 border-pink-500':'text-gray-500'}`}>
                          <Grid size={12} className="inline mr-1"/>Posts
                        </button>
                        <button onClick={() => { setTikProfileSubTab('following'); loadFollowingList(); }}
                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tikProfileSubTab==='following'?'text-pink-500 border-b-2 border-pink-500':'text-gray-500'}`}>
                          <UserCheck size={12} className="inline mr-1"/>Following ({following})
                        </button>
                      </div>
                     {tikProfileSubTab === 'posts' && (
            <div className="grid grid-cols-3 gap-1 mt-4">
              {userPosts.filter((p: any) => p.uid === user?.uid).map((p: any) => (
                <div key={p.id} className="aspect-square bg-white/5 rounded-xl overflow-hidden">
                  {(p.url || p.videoUrl || p.mediaUrl || p.tiktokPostImg || p.image || p.video) ? (
                    <img 
                      src={p.url || p.videoUrl || p.mediaUrl || p.tiktokPostImg || p.image || '/logo.png'} 
                      className="w-full h-full object-cover" 
                      onError={(e: any) => { e.target.src = '/logo.png'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <Film size={24} className="text-pink-500/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
                      {tikProfileSubTab==='following' && (
                        <div className="flex flex-col gap-0 mt-2">
                          {followingList.length===0 && (
                            <div className="py-12 text-gray-500 text-xs text-center">You are not following anyone yet.</div>
                          )}
                          {followingList.map((fu:any) => (
                            <div key={fu.uid}
                              onClick={() => openProfile(fu.uid)}
                              className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-all rounded-2xl">
                              <img src={fu.photo||'/logo.png'} loading="lazy" decoding="async"
                                className="w-11 h-11 rounded-full border-2 border-pink-500 object-cover"/>
                              <div className="flex-1">
                                <p className="font-black text-white text-xs tracking-widest">@{fu.username||'AJ_MEMBER'}</p>
                                <p className="text-[10px] text-gray-500 font-bold">{fu.bio||'AJ Portal Member'}</p>
                              </div>
                              <div className="w-6 h-6 rounded-full bg-pink-600/20 border border-pink-500/30 flex items-center justify-center">
                                <UserCheck size={12} className="text-pink-400"/>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AJ PULSE — TikReel-style full-screen snap-scroll UI clone */}
            {socialScreen==='pulse' && (
              <div className="flex flex-col h-full">
                {/* PULSE TAB BAR — Feed | Create | Profile */}
                <div className="flex gap-0 bg-[#050505] border-b border-white/10 shrink-0">
                  {(['feed','create','profile'] as const).map(t => (
                    <button key={t} onClick={() => setPulseTab(t)}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${pulseTab===t ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500'}`}>
                      {t==='feed' ? '📡 Feed' : t==='create' ? '➕ Create' : '👤 Profile'}
                    </button>
                  ))}
                </div>

                {pulseTab==='feed' ? (
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="bg-slate-950/98 p-3 border-b border-pink-500/20 sticky top-0 z-20 shrink-0">
                      <div className="flex gap-2 items-center">
                        <img src={user?.photoURL||'/logo.png'} className="w-8 h-8 rounded-full border-2 border-pink-500 flex-shrink-0 object-cover"/>
                        <div className="flex-1 flex flex-col gap-1">
                          <textarea value={postText} onChange={e => setPostText(e.target.value)}
                            placeholder="Share your moment..."
                            className="w-full bg-white/5 rounded-xl px-3 py-2 text-xs outline-none border border-white/10 h-9 text-white font-bold resize-none leading-tight"/>
                          {tempPhoto && (
                            <div className="relative w-full rounded-xl overflow-hidden border border-pink-500/30">
                              {pulsePostIsVideo
                                ? <video src={tempPhoto} controls className="w-full max-h-40 object-cover" playsInline/>
                                : <img src={tempPhoto} className="w-full max-h-40 object-cover"/>
                              }
                              <button onClick={() => { setTempPhoto(''); setPulsePostIsVideo(false); }}
                                className="absolute top-1 right-1 bg-[#050505]/70 text-white text-[9px] font-black px-2 py-0.5 rounded-full">✕</button>
                            </div>
                          )}
                        </div>
                        <button onClick={handleImageClick} className="text-gray-400 hover:text-pink-400 transition-all p-1.5 shrink-0">
                          <Camera size={18}/>
                        </button>
                        <button onClick={handleCreatePost}
                          className="bg-pink-600 px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 text-white whitespace-nowrap shrink-0">
                          POST +10🪙
                        </button>
                      </div>
                    </div>

                    <div className="snap-y snap-mandatory overflow-y-auto flex-1 bg-[#050505]" style={{ touchAction:'pan-y', overscrollBehavior:'contain' }}>
                      {(() => {
                        const pulseFeed: any[] = [];
                        const maxK = Math.max(pulsePosts.length, pixaData.length);
                        for (let k = 0; k < maxK; k++) {
                          if (k < pulsePosts.length) pulseFeed.push({ ...pulsePosts[k], _src: 'user' });
                          if (k < pixaData.length) pulseFeed.push({
                            _src:   'unsplash',
                            id:     `unsp-${k}`,
                            image:  pixaData[k]?.urls?.regular,
                            username: pixaData[k]?.user?.name || 'AJ Creator',
                            text:   pixaData[k]?.alt_description || 'AJ Lifestyle',
                            photo:  pixaData[k]?.user?.profile_image?.small || '/logo.png',
                            likes:  pixaData[k]?.likes || 0,
                          });
                        }
                        return pulseFeed.map((post: any, idx: number) => (
                          <React.Fragment key={post.id || `pf-${idx}`}>
                            {idx > 0 && idx % 5 === 0 && (
                              <div className="h-[85vh] w-full snap-start relative overflow-hidden bg-[#050505]">
                                <MonetagVideoAd publisherId={11279683}/>
                              </div>
                            )}

                            <div className="h-[85vh] w-full snap-start relative bg-[#050505] overflow-hidden"
                              style={{ contain:'layout style paint', willChange:'transform' }}>
                              {post.image
                                ? <img src={post.image} className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async"/>
                                : <div className="absolute inset-0 bg-gradient-to-br from-pink-950/60 via-slate-900 to-black"/>
                              }
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25 pointer-events-none"/>

                              <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center z-10">
                                <div className="relative cursor-pointer"
                                  onClick={() => post._src==='user' && post.uid && openProfile(post.uid)}>
                                  <img src={post.photo||'/logo.png'} loading="lazy" decoding="async"
                                    className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-xl active:scale-90 transition-all"/>
                                  {post._src==='user' && (
                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-pink-600 rounded-full flex items-center justify-center border-2 border-black text-white text-[11px] font-black shadow-lg">+</div>
                                  )}
                                </div>
                                <div onClick={() => post._src==='user' && handleLike(post.id)}
                                  className="flex flex-col items-center cursor-pointer active:scale-125 transition-all">
                                  <Heart size={32} className={likedPosts[post.id]?"text-red-500 fill-red-500":"text-white"}/>
                                  <span className="text-[9px] font-bold text-white mt-0.5">{formatViews(post.likes||0)}</span>
                                </div>
                                <div className="flex flex-col items-center cursor-pointer"
                                  onClick={() => post._src==='user' && setCommentPostId(post.id)}>
                                  <MessageCircle size={32} className="text-white"/>
                                  <span className="text-[9px] font-bold text-white mt-0.5">{formatViews(post.comments||0)}</span>
                                </div>
                                <div onClick={() => handleShare(post.text||'' )} className="flex flex-col items-center cursor-pointer text-white">
                                  <Share2 size={30}/><span className="text-[9px] font-bold mt-0.5">Share</span>
                                </div>
                                {post._src==='user' && post.uid!==user?.uid && (
                                  <div className="flex flex-col items-center cursor-pointer text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text"
                                    onClick={() => setPulseGiftPostId(post.id)}>
                                    <Gift size={28}/><span className="text-[9px] font-bold mt-0.5">Gift</span>
                                  </div>
                                )}
                              </div>

                              <div className="absolute bottom-8 left-4 text-white max-w-[72%] z-10">
                                <p className="font-black text-sm cursor-pointer drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]"
                                  onClick={() => post._src==='user' && post.uid && openProfile(post.uid)}>
                                  @{post.username||'AJ_Creator'}
                                </p>
                                {post.text && (
                                  <p className="text-[11px] text-gray-200 mt-0.5 line-clamp-2 font-medium leading-snug">
                                    {post.text}
                                  </p>
                                )}
                              </div>

                              {post._src==='user' && post.uid===user?.uid && (
                                <div className="absolute top-4 right-4 z-20">
                                  <button onClick={() => setActiveMenuId(activeMenuId===post.id?null:post.id)}
                                    className="bg-[#050505]/50 backdrop-blur-sm rounded-full p-2 active:scale-90 transition-all">
                                    <MoreVertical size={16} className="text-white"/>
                                  </button>
                                  {activeMenuId===post.id && (
                                    <div className="absolute right-0 top-11 bg-slate-900 border border-white/10 p-3 rounded-xl z-[1000] shadow-2xl min-w-[110px]">
                                      <button
                                        onClick={() => { setEditPostId(post.id); setEditPostText(post.text||''); setActiveMenuId(null); }}
                                        className="text-blue-400 text-[10px] font-black flex items-center gap-2 uppercase w-full mb-2 hover:opacity-70">
                                        <Edit3 size={14}/> Edit
                                      </button>
                                      <button onClick={() => handleDeletePost(post.id)}
                                        className="text-red-500 text-[10px] font-black flex items-center gap-2 uppercase w-full hover:opacity-70">
                                        <Trash2 size={14}/> Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              {post._src==='unsplash' && (
                                <div className="absolute top-4 left-4 z-10 pointer-events-none">
                                  <span className="text-[7px] font-bold text-white/50 bg-[#050505]/40 px-2 py-0.5 rounded-full">
                                    📸 Unsplash
                                  </span>
                                </div>
                              )}
                            </div>
                          </React.Fragment>
                        ));
                      })()}

                      {pulsePosts.length===0 && pixaData.length===0 && (
                        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-8">
                          <Users size={56} className="text-pink-500/30"/>
                          <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Loading feed...</p>
                          <p className="text-gray-600 text-[11px] font-bold">Be the first to share your moment!</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : pulseTab==='create' ? (
                  <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-md mx-auto w-full">
                    <h3 className="text-xl font-black uppercase text-center tracking-[0.12em] bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(236,72,153,0.7)]">
                      📡 Share Your Moment
                    </h3>

                    <div
                      className="border-2 border-dashed border-pink-500/50 rounded-3xl p-8 text-center cursor-pointer bg-white/5 hover:bg-pink-500/5 transition-all active:scale-[0.98]"
                      onClick={handleImageClick}
                    >
                      {tempPhoto ? (
                        pulsePostIsVideo
                          ? <video src={tempPhoto} controls className="w-full max-h-64 rounded-2xl object-cover" playsInline/>
                          : <img src={tempPhoto} className="w-full max-h-48 object-cover rounded-2xl" alt="preview"/>
                      ) : (
                        <>
                          <Camera size={52} className="text-pink-500/50 mx-auto mb-3"/>
                          <p className="text-[11px] text-gray-400 uppercase font-black tracking-widest">Tap to add Photo / Video</p>
                          <p className="text-[9px] text-gray-600 mt-1">JPG · PNG · MP4 supported</p>
                        </>
                      )}
                    </div>

                    <textarea
                      value={postText}
                      onChange={e => setPostText(e.target.value)}
                      placeholder="Write a caption..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-pink-500 h-28 font-bold resize-none transition-colors"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => setPulsePostIsVideo(false)}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${!pulsePostIsVideo ? 'bg-pink-600 border-pink-600 text-white shadow-[0_0_14px_rgba(236,72,153,0.5)]' : 'bg-white/5 border-white/10 text-gray-400'}`}
                      >📸 Photo (+5 🪙)</button>
                      <button
                        onClick={() => setPulsePostIsVideo(true)}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${pulsePostIsVideo ? 'bg-purple-600 border-purple-600 text-white shadow-[0_0_14px_rgba(139,92,246,0.5)]' : 'bg-white/5 border-white/10 text-gray-400'}`}
                      >🎬 Video (+10 🪙)</button>
                    </div>

                    <button
                      onClick={() => { handleCreatePost(); setPulseTab('feed'); }}
                      className="w-full py-4 rounded-2xl font-black uppercase text-white tracking-[0.15em] shadow-[0_0_30px_rgba(236,72,153,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                      style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}
                    >
                      PUBLISH (+{pulsePostIsVideo ? 10 : 5} 🪙)
                    </button>
                  </div>
                ) : pulseTab==='profile' ? (
                  <div className="flex-1 overflow-y-auto max-w-md mx-auto w-full pb-24">
                    <div className="relative h-32 bg-gradient-to-br from-pink-600/30 to-cyan-600/30">
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                        <div className="relative">
                          <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-20 h-20 rounded-full border-4 border-[#050505] shadow-2xl object-cover"/>
                          <button title="Change Photo"
                            onClick={() => { const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange=async(e:any)=>{ const f=e.target.files?.[0]; if(!f) return; const fd=new FormData(); fd.append('file',f); fd.append('upload_preset',CLOUDINARY_UPLOAD_PRESET); try{ const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,{method:'POST',body:fd}); const data=await res.json(); if(data.secure_url){ await updateDoc(doc(db,'users',user!.uid),{photoURL:data.secure_url,photo:data.secure_url}); setTempPhoto(data.secure_url); setVvipAlert({msg:'✅ Profile photo updated!',icon:'📸'}); }}catch{}; }; inp.click(); }}
                            className="absolute -bottom-1 -right-1 w-6 h-6 bg-pink-600 rounded-full border-2 border-[#050505] flex items-center justify-center text-white text-xs font-black shadow-lg active:scale-90 transition-all">+</button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-14 text-center px-5">
                      <h2 className="text-lg font-black text-white uppercase tracking-widest">@{username||'AJ_MEMBER'}</h2>
                      <p className="text-xs text-gray-400 mt-1 font-bold">{bio||'No bio yet.'}</p>
                      <div className="flex justify-center gap-8 mt-4">
                        {[{v:pulsePosts.filter((p:any)=>p.uid===user?.uid).length,l:'Posts'},{v:followers,l:'Followers'},{v:following,l:'Following'}].map(s=>(
                          <div key={s.l} className="text-center">
                            <p className="text-lg font-black text-white">{s.v}</p>
                            <p className="text-[9px] text-gray-500 uppercase font-bold">{s.l}</p>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => user && openProfile(user.uid)}
                        className="mt-4 px-6 py-2 bg-white/5 border border-pink-500/30 rounded-full text-xs font-black text-pink-400 uppercase tracking-widest hover:bg-pink-500/10 transition-all">
                        View Full Profile
                      </button>
                    </div>
                    <div className="mt-6 px-4">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">My Posts</p>
                      <div className="grid grid-cols-3 gap-1">
                        {pulsePosts.filter((p:any)=>p.uid===user?.uid).map((p:any)=>(
                          <div key={p.id} className="aspect-square bg-white/5 rounded-xl overflow-hidden">
                            {(p.image || p.thumbnail) ? (
                              p.isVideo
                                ? <div className="relative w-full h-full">
                                    <img
                                      src={p.thumbnail || p.image}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-7 h-7 rounded-full bg-[#050505]/60 flex items-center justify-center">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
                                      </div>
                                    </div>
                                  </div>
                                : <img
                                    src={p.image || p.thumbnail}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={e => { (e.target as HTMLImageElement).src='/logo.png'; }}
                                  />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-pink-900/20 to-cyan-900/20">
                                <Film size={20} className="text-white/20"/>
                                <p className="text-[8px] text-gray-600 font-bold px-1 text-center line-clamp-2">{p.text?.slice(0,25)}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* WECHAT CONTACT LIST */}
            {socialScreen==='chatlist' && (
              <div className="max-w-md mx-auto bg-[#111b21] min-h-screen pb-24">
                <div className="bg-[#202c33] p-5 flex justify-between items-center border-b border-white/5">
                  <h2 className="font-black text-xl text-white uppercase tracking-widest">AJ WeChat</h2>
                  <div className="flex gap-3">
                    <button onClick={handleContactsSync} className="text-[9px] font-black text-cyan-400 uppercase border border-cyan-500/30 px-3 py-2 rounded-xl hover:bg-cyan-500/10 transition-all">
                      + Sync Contacts
                    </button>
                    <button onClick={() => setAddContactOpen(true)} className="text-[9px] font-black text-pink-400 uppercase border border-pink-500/30 px-3 py-2 rounded-xl hover:bg-pink-500/10 transition-all">
                      + Add
                    </button>
                  </div>
                </div>
                {addContactOpen && (
                  <div className="p-4 bg-[#2a3942] border-b border-white/5">
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">Add Contact Manually</p>
                    <input type="text" value={newContact} onChange={e => setNewContact(e.target.value)}
                      placeholder="Enter contact name..." className="w-full bg-[#050505] border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-cyan-500 font-bold mb-2"/>
                    <div className="flex gap-2">
                      <button onClick={addManualContact} className="flex-1 bg-cyan-500 py-2 rounded-xl text-[10px] font-black text-black uppercase">Add</button>
                      <button onClick={() => setAddContactOpen(false)} className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 py-2 rounded-xl text-[10px] font-black text-white uppercase">Cancel</button>
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

            {/* WECHAT CHAT */}
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
                  <div className="flex gap-4 text-[#aebac1]">
                    <button onClick={() => setVvipAlert({msg:`📹 Video Call — Agora App ID: ${AGORA_APP_ID.slice(0,8)}... (WebRTC enabled)`})}
                      className="cursor-pointer hover:text-cyan-400 transition-all p-1 rounded-full hover:bg-cyan-500/10">
                      <VideoIcon size={20}/>
                    </button>
                    <button onClick={() => setVvipAlert({msg:`📞 Audio Call — Agora App ID: ${AGORA_APP_ID.slice(0,8)}... (WebRTC enabled)`})}
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
                    className="w-full bg-[#050505]/40 border border-white/10 p-4 rounded-2xl font-bold text-white outline-none focus:border-pink-500"/>
                  <label className="text-[10px] font-black text-pink-500 ml-1 uppercase tracking-widest">Bio</label>
                  <textarea placeholder="Tell the world about you..." value={bio} onChange={e => setBio(e.target.value)}
                    className="w-full bg-[#050505]/40 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none h-28 focus:border-pink-500"/>
                  <button onClick={handleCreateProfile}
                    className="w-full mt-8 py-5 bg-pink-600 rounded-[1.5rem] font-black uppercase shadow-[0_10px_30px_rgba(236,72,153,0.3)]  transition-all text-white border-b-4 border-pink-800 tracking-[0.2em]">
                    ACTIVATE PROFILE
                  </button>
                </div>
                <button onClick={() => setSocialScreen('hub')} className="mt-6 text-gray-500 uppercase text-[9px] font-black w-full">Back</button>
              </div>
            )}

          </div>

          {/* PULSE GIFT MODAL */}
          {pulseGiftPostId && (
            <div className="fixed inset-0 z-[1000] bg-[#050505]/70 backdrop-blur-md flex items-end">
              <div className="w-full bg-[#111b21] rounded-t-[3rem] border-t-2 border-yellow-500 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-black text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text uppercase tracking-widest flex items-center gap-2"><Gift size={18}/> Send Gift</h3>
                  <X className="cursor-pointer text-gray-500" onClick={() => setPulseGiftPostId(null)}/>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {giftItems.map(g => (
                    <button key={g.id} onClick={() => { sendGift(pulseGiftPostId, g); setPulseGiftPostId(null); }}
                      className="bg-white/5 border border-white/10 py-3 rounded-2xl text-[9px] font-black uppercase hover:border-yellow-500 transition-all flex flex-col items-center gap-1 ">
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
            <div className="fixed inset-0 z-[1000] bg-[#050505]/70 backdrop-blur-md flex items-end">
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
                    className="flex-1 bg-[#050505]/40 border border-white/10 rounded-xl p-4 text-xs outline-none focus:ring-1 focus:ring-pink-500 text-white font-bold"/>
                  <button onClick={submitComment} className="bg-pink-600 p-4 rounded-xl active:scale-90 transition-all text-white"><Send size={18}/></button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          Fix #1 & #2: GO LIVE — Fixed UI layout (no overlap)
          Share Room ID box is stacked ABOVE END LIVE in a flex-col
          Fix #2: Copy & Share uses navigator.share (native app list)
          ============================================================ */}
      {liveActive && (
        <div className="fixed inset-0 z-[600] bg-[#050505] flex flex-col">

          {/* PK ACTIVE — Split Screen */}
          {pkActive ? (
            <div className="flex-1 flex flex-col">
              <div className="bg-[#050505]/90 p-3 flex items-center justify-between border-b border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <Swords size={18} className="text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text"/>
                  <span className="font-black text-xs text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text uppercase tracking-widest">PK BATTLE</span>
                </div>
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full">
                  <Clock size={14} className="text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text"/>
                  <span className="font-black text-sm text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text tabular-nums">{formatPkTime(pkTimer)}</span>
                </div>
                <div className="text-[10px] font-black text-white">
                  <span className="text-cyan-400">{pkScore.me}</span>
                  <span className="text-gray-500 mx-1">vs</span>
                  <span className="text-pink-400">{pkScore.rival}</span>
                </div>
              </div>

              <div className="flex-1 flex">
                <div className="flex-1 relative border-r border-yellow-500/40">
                  <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full object-cover"/>
                  <div className="absolute top-3 left-3 bg-red-600 px-3 py-1 rounded-full flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
                    <span className="text-white font-black text-[9px]">YOU</span>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-[#050505]/50 px-2 py-1 rounded-lg">
                    <span className="text-cyan-400 font-black text-[10px]">🪙 {pkScore.me}</span>
                  </div>
                </div>
                <div className="flex-1 relative bg-[#050505] backdrop-blur-xl border border-white/10">
                  <div className="w-full h-full flex items-center justify-center flex-col gap-3">
                    <img src={pkRivalData?.photo||'/logo.png'} className="w-20 h-20 rounded-full border-4 border-pink-500"/>
                    <p className="font-black text-white text-sm uppercase">@{pkRivalData?.username||'Rival'}</p>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
                    <span className="text-[10px] text-red-400 font-bold">LIVE</span>
                  </div>
                  <div className="absolute top-3 right-3 bg-pink-600 px-3 py-1 rounded-full">
                    <span className="text-white font-black text-[9px]">RIVAL</span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-[#050505]/50 px-2 py-1 rounded-lg">
                    <span className="text-pink-400 font-black text-[10px]">🪙 {pkScore.rival}</span>
                  </div>
                </div>
              </div>

              <div className="absolute left-3 bottom-[200px] w-[45%] max-h-32 overflow-y-auto bg-[#050505]/30 backdrop-blur-sm rounded-2xl p-2 border border-white/10 pointer-events-none">
                {chatMessages.slice(-6).map((m:any, i:number) => (
                  <p key={i} className="text-[9px] text-white font-bold mb-0.5 leading-tight">
                    <span className="text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text">@{m.username}: </span>{m.text}
                  </p>
                ))}
              </div>

              {pkWinner && (
                <div className="absolute inset-0 bg-[#050505]/80 flex items-center justify-center z-50 flex-col gap-6">
                  <div className="text-8xl animate-bounce">🏆</div>
                  <h2 className="text-3xl font-black text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text uppercase tracking-widest">
                    {pkWinner === (username||'You') ? '🎉 YOU WIN!' : `@${pkWinner} Wins!`}
                  </h2>
                  <button onClick={() => { setPkWinner(null); setPkActive(false); setPkTimer(PK_DURATION); setPkScore({me:0,rival:0}); }}
                    className="bg-yellow-500 px-8 py-3 rounded-full font-black text-black uppercase">Continue</button>
                </div>
              )}
            </div>
          ) : (
            /* Fix #1: NORMAL LIVE VIEW — proper stacked layout, no overlap */
            <div className="relative flex-1 bg-[#050505]">
              <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full object-cover"/>
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#050505] flex-col gap-4">
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

              {/* Fix #1: Share Room ID + END LIVE stacked vertically — no overlap */}
              <div className="absolute top-5 right-4 z-20 flex flex-col items-end gap-3">
                {/* Share Room ID box */}
                <div className="bg-[#050505]/85 border border-cyan-500/50 rounded-2xl px-3 py-2.5 backdrop-blur-md shadow-xl w-44">
                  <p className="text-[8px] text-cyan-400 font-black uppercase tracking-widest mb-1">Share Room ID</p>
                  <p className="text-white font-black text-[11px] font-mono tracking-wider truncate">{liveRoomId.slice(-14)}</p>
                  {/* Fix #2: Use navigator.share for native app sheet */}
                  <button
                    onClick={() => {
                      const shareText = `Join my live stream on AJ Super Portal! Room ID: ${liveRoomId}`;
                      if (navigator.share) {
                        navigator.share({
                          title: 'AJ Super Portal — Live Stream',
                          text: shareText,
                          url: window.location.href,
                        }).catch(() => {
                          navigator.clipboard?.writeText(liveRoomId);
                          setVvipAlert({msg:'Room ID copied!'});
                        });
                      } else {
                        navigator.clipboard?.writeText(liveRoomId);
                        setVvipAlert({msg:'Room ID copied! Share it so viewers can join.'});
                      }
                    }}
                    className="mt-1.5 w-full bg-cyan-600 text-black text-[8px] font-black uppercase rounded-lg py-1 tracking-widest  transition-all flex items-center justify-center gap-1">
                    <Share2 size={9}/> Copy & Share
                  </button>
                </div>
                {/* END LIVE button — below the Share box, no overlap */}
                <button
                  onClick={stopLive}
                  className="bg-red-600 px-5 py-2.5 rounded-full font-black text-white text-xs uppercase shadow-xl  transition-all w-44 text-center">
                  ⏹ END LIVE
                </button>
              </div>

              {/* PK Button — left side, unchanged */}
              <button onClick={() => setPkChallengeOpen(true)}
                className="absolute top-20 left-6 bg-yellow-500 px-4 py-2 rounded-full font-black text-black text-xs uppercase shadow-xl  flex items-center gap-2">
                <Swords size={14}/> PK
              </button>

              <div className="absolute left-3 bottom-48 w-[55%] max-h-36 overflow-y-auto bg-[#050505]/30 backdrop-blur-sm rounded-2xl p-3 border border-white/10 pointer-events-none">
                {chatMessages.slice(-8).map((m:any, i:number) => (
                  <p key={i} className="text-[9px] text-white font-bold mb-1 leading-tight">
                    <span className="text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text">@{m.username}: </span>{m.text}
                  </p>
                ))}
              </div>

              <button
                onClick={() => setLiveChatOpen(o => !o)}
                className="absolute bottom-36 right-6 bg-cyan-600 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl border-2 border-cyan-400 active:scale-90 transition-all z-20">
                <MessageCircle size={20} className="text-white"/>
              </button>
            </div>
          )}

          {/* LIVE CHAT OVERLAY */}
          {liveChatOpen && liveActive && (
            <div className="absolute bottom-[80px] left-3 w-72 h-64 z-30 flex flex-col bg-[#050505]/60 backdrop-blur-md rounded-3xl border border-cyan-500/30 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#050505]/40">
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
                      <span className="text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text">@{m.username}: </span>{m.text}
                    </p>
                  ))
                }
                <div ref={liveChatEndRef}/>
              </div>
              <div className="flex gap-2 p-2 border-t border-white/10 bg-[#050505]/40">
                <input
                  type="text"
                  value={liveChatInput}
                  onChange={e => setLiveChatInput(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && sendLiveChatMessage()}
                  placeholder="Say something..."
                  className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 border border-white/10 rounded-full px-3 py-1.5 text-[10px] text-white outline-none focus:ring-1 focus:ring-cyan-500 font-bold"
                />
                <button onClick={sendLiveChatMessage} className="bg-cyan-500 p-1.5 rounded-full text-black active:scale-90 transition-all">
                  <Send size={12}/>
                </button>
              </div>
            </div>
          )}

          {/* PK CHALLENGE MODAL */}
          {pkChallengeOpen && (
            <div className="absolute inset-0 z-[800] bg-[#050505]/80 flex items-center justify-center p-6">
              <div className="bg-[#0d1117] border-2 border-yellow-500/40 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <Swords size={28} className="text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text"/>
                  <h3 className="font-black text-xl text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text uppercase tracking-widest">PK Challenge</h3>
                </div>
                <p className="text-[10px] text-gray-400 mb-4 font-bold">
                  ⚠️ {PK_ENTRY_COINS} AJ Coins will be deducted from BOTH participants. 5-minute battle!
                </p>
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Rival's User ID</label>
                  <input type="text" value={pkTargetId} onChange={e => setPkTargetId(e.target.value)}
                    placeholder="Paste rival user ID..." className="w-full bg-[#050505]/40 border border-white/10 p-4 rounded-xl text-xs text-white outline-none focus:border-yellow-500 font-bold"/>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={sendPkChallenge}
                    className="flex-1 bg-yellow-500 py-3 rounded-xl font-black uppercase text-black  transition-all flex items-center justify-center gap-2">
                    <Swords size={16}/> Challenge!
                  </button>
                  <button onClick={() => setPkChallengeOpen(false)}
                    className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 py-3 rounded-xl font-black uppercase text-white  transition-all">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* GIFT PANEL */}
          <div className="bg-[#0d1117] border-t border-white/10 p-4 shrink-0">
            <p className="text-[10px] text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <Gift size={14}/> Send Gifts to Creator 🎁
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {giftItems.map(g => (
                <button key={g.id} onClick={() => sendGift(user!.uid, g)}
                  className="flex-shrink-0 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl text-center hover:border-yellow-500 transition-all ">
                  <div className="text-2xl mb-1">{g.icon}</div>
                  <p className="text-[9px] font-black uppercase text-white">{g.name}</p>
                  <p className="text-[8px] text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text">{g.cost.toLocaleString()} 🪙</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WALLET */}
      {screen==='wallet' && (
        <div className="fixed inset-0 z-[300] bg-[#050505]/98 flex flex-col items-center p-8 overflow-y-auto">
          <button onClick={() => { setScreen('hub'); setWalletTab('main'); }}
            className="self-start text-cyan-400 mb-8 font-bold uppercase tracking-widest flex items-center gap-2">
            <ArrowLeft size={18}/> BACK
          </button>
          <div className="w-full max-w-md backdrop-blur-2xl bg-[#111]/80 border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
            <h2 className="text-5xl font-black text-yellow-500 mb-2 tracking-tighter">{displayBalance} 🪙</h2>
            <p className="text-green-400 font-black text-xl mb-2 tracking-[0.2em]">${displayUsdt}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-6">
              Buy: $1 = {COIN_RATE} Coins | Min Purchase: ${MIN_PURCHASE} | Min Withdraw: {WITHDRAW_MIN.toLocaleString()} Coins = $20 USD
            </p>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mb-6 text-left">
              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1">Your Referral Code (User ID)</p>
              <div className="flex justify-between items-center bg-[#050505]/40 px-3 py-2 rounded-xl">
                <span className="text-xs font-mono text-cyan-400 truncate max-w-[200px]">{user?.uid}</span>
                <button onClick={() => copyToClipboard(user?.uid||"")} className="text-cyan-400 text-[10px] font-black uppercase">
                  {copied?"Copied ✓":"Copy"}
                </button>
              </div>
            </div>

            {/* Sponsor Banner — Wallet, static non-clickable */}
            <div className="w-full pointer-events-none select-none mb-2">
              <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-950/50 to-orange-950/30 border border-yellow-500/20 rounded-xl px-4 py-2.5 shadow-inner">
                <span className="text-yellow-500/70 text-[7px] font-black uppercase tracking-widest border border-yellow-500/30 px-1.5 py-0.5 rounded-full shrink-0">Sponsored</span>
                <p className="text-gray-500 text-[9px] font-bold leading-snug">💰 Binance — World's #1 Crypto Exchange. Trade BTC, ETH & 350+ Coins instantly.</p>
              </div>
            </div>

            {walletTab==='main' && (
              <div className="flex flex-col gap-4">
                <button onClick={() => setWalletTab('purchase')} className="bg-white text-black py-4 rounded-[1.5rem] font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-all duration-200   transition-all">Purchase</button>
                <button onClick={() => setWalletTab('transfer')} className="bg-white/5 backdrop-blur-xl border border-white/10 text-cyan-400 py-4 rounded-[1.5rem] font-black border border-cyan-500/30 uppercase hover:bg-white/5 transition-all">Transfer</button>
                <button onClick={() => setWalletTab('withdraw')} className="bg-white/5 backdrop-blur-xl border border-white/10 text-pink-500 py-4 rounded-[1.5rem] font-black border border-pink-500/30 uppercase hover:bg-white/5 transition-all">Withdraw</button>
                <button onClick={() => setWalletTab('referral')} className="bg-white/5 backdrop-blur-xl border border-white/10 text-yellow-500 py-4 rounded-[1.5rem] font-black border border-yellow-500/30 uppercase hover:bg-white/5 transition-all">Enter Referral Code</button>
              </div>
            )}

            {walletTab==='purchase' && (
              <div className="flex flex-col gap-6 text-left">
                <label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Payment Method</label>
                {/* NOWPayments — Binance USDT BSC auto-verified */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-cyan-500 bg-cyan-500/10 text-left w-full">
                    <span className="text-3xl">₿</span>
                    <div className="flex-1">
                      <p className="font-black text-sm text-white">Binance USDT (BSC)</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">Crypto — Auto-verified via NOWPayments</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[8px] font-black text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full">Instant</span>
                      <div className="w-3 h-3 bg-cyan-500 rounded-full"/>
                    </div>
                  </div>
                </div>
                {/* Amount box — always visible */}
                <div className="bg-[#050505] border-2 border-white/10 p-6 rounded-[2rem] text-center shadow-inner">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-3 tracking-[0.3em]">You will receive</p>
                  <p className="text-yellow-500 text-5xl font-black mb-5">{(purchaseAmount*COIN_RATE).toLocaleString()} 🪙</p>
                  <div className="flex items-center justify-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <DollarSign className="text-green-400" size={28}/>
                    <input type="number" min={MIN_PURCHASE}
                      value={purchaseAmount===0?'':purchaseAmount}
                      onChange={e => setPurchaseAmount(e.target.value===''?0:Number(e.target.value))}
                      className="bg-transparent text-white text-3xl w-32 text-center font-black outline-none"/>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-3 font-bold">$1 = {COIN_RATE} AJ Coins | Min ${MIN_PURCHASE}</p>
                </div>

                {/* Security badge */}
                <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-2xl px-4 py-3">
                  <span className="text-lg">🔒</span>
                  <div>
                    <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">100% Automated — NOWPayments</p>
                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">Coins credited automatically after payment confirmation</p>
                  </div>
                </div>
                <button onClick={handlePurchase} className="bg-cyan-500 py-5 rounded-2xl font-black uppercase shadow-xl hover:scale-[1.02]  transition-all text-black tracking-widest">
                  Proceed to Payment →
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
                      className="w-full bg-[#050505] border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block mb-1">Coins to Transfer</label>
                    <input type="number" placeholder="Amount" value={transferAmount||''}
                      onChange={e => setTransferAmount(Number(e.target.value))}
                      className="w-full bg-[#050505] border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500"/>
                  </div>
                </div>
                <button onClick={handleTransfer} className="bg-cyan-500 py-4 rounded-2xl font-black uppercase tracking-wider text-black  transition-all">
                  Submit Transfer
                </button>
                <button onClick={() => setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase font-black">Cancel</button>
              </div>
            )}

            {walletTab==='withdraw' && (
              <div className="flex flex-col gap-6 text-left">
                <h3 className="text-lg font-black text-pink-500 uppercase tracking-widest">Withdraw Coins</h3>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                  <p className="text-[10px] text-red-400 font-bold uppercase leading-relaxed">
                    ⚠️ Minimum: {WITHDRAW_MIN.toLocaleString()} Coins = $20 USD. {CASH_RATE} Coins = $1.<br/>📅 Withdrawals are processed monthly from the 25th to 31st of each month.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">Payout Method</label>
                    <select value={payoutMethod}
                      onChange={e => {
                        setPayoutMethod(e.target.value);
                        setPayoutId(''); setCardHolder(''); setCardNumber('');
                        setCardExpiry(''); setCardCVV(''); setCardBank(''); setCardCountry('');
                      }}
                      className="w-full bg-[#050505] backdrop-blur-xl border border-white/10 border border-white/10 p-4 rounded-xl text-white font-bold outline-none">
                      {WITHDRAW_METHODS.map(m => <option key={m.label}>{m.label}</option>)}
                    </select>
                  </div>

                  {currentWithdrawMethod.type !== 'card' && (
                    <div>
                      <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">{currentWithdrawMethod.field}</label>
                      <input type="text" placeholder={currentWithdrawMethod.placeholder} value={payoutId}
                        onChange={e => setPayoutId(e.target.value)}
                        className="w-full bg-[#050505] border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-pink-500"/>
                    </div>
                  )}

                  {currentWithdrawMethod.type === 'card' && (
                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-pink-600/10 to-cyan-600/10 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                        <span className="text-2xl">💳</span>
                        <p className="text-[9px] text-gray-400 font-bold leading-relaxed">Works with any bank worldwide — Visa, Mastercard, Maestro, UnionPay, Mada, and more.</p>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">Cardholder Name</label>
                        <input type="text" placeholder="JOHN DOE" value={cardHolder}
                          onChange={e => setCardHolder(e.target.value.toUpperCase())}
                          className="w-full bg-[#050505] border border-white/10 p-3 rounded-xl text-xs font-black text-white outline-none focus:border-pink-500 tracking-widest uppercase"/>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">Card Number</label>
                        <input type="text" inputMode="numeric" placeholder="1234 5678 9012 3456"
                          value={cardNumber} maxLength={19}
                          onChange={e => {
                            const raw = e.target.value.replace(/\D/g,'');
                            const fmt = raw.match(/.{1,4}/g)?.join(' ') || raw;
                            setCardNumber(fmt);
                          }}
                          className="w-full bg-[#050505] border border-white/10 p-3 rounded-xl text-sm font-black text-white outline-none focus:border-pink-500 tracking-[0.2em]"/>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">Expiry (MM/YY)</label>
                          <input type="text" inputMode="numeric" placeholder="08/28"
                            value={cardExpiry} maxLength={5}
                            onChange={e => {
                              let v = e.target.value.replace(/\D/g,'');
                              if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2,4);
                              setCardExpiry(v);
                            }}
                            className="w-full bg-[#050505] border border-white/10 p-3 rounded-xl text-sm font-black text-white outline-none focus:border-pink-500 tracking-widest"/>
                        </div>
                        <div className="w-28">
                          <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">CVV</label>
                          <input type="password" inputMode="numeric" placeholder="•••"
                            value={cardCVV} maxLength={4}
                            onChange={e => setCardCVV(e.target.value.replace(/\D/g,''))}
                            className="w-full bg-[#050505] border border-white/10 p-3 rounded-xl text-sm font-black text-white outline-none focus:border-pink-500 tracking-widest"/>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Bank Name <span className="text-gray-600 normal-case">(optional)</span></label>
                        <input type="text" placeholder="e.g. Al Rajhi, HDFC, Barclays..."
                          value={cardBank} onChange={e => setCardBank(e.target.value)}
                          className="w-full bg-[#050505] border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-pink-500"/>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">Country</label>
                        <input type="text" placeholder="e.g. Pakistan, India, UK, USA..."
                          value={cardCountry} onChange={e => setCardCountry(e.target.value)}
                          className="w-full bg-[#050505] border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-pink-500"/>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <p className="text-[9px] text-gray-400 font-bold">
                    Your balance: <span className="text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text font-black">{balance.toFixed(0)} Coins</span> ≈ <span className="text-green-400 font-black">${(balance/CASH_RATE).toFixed(2)} USD</span>
                  </p>
                </div>
                <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-2xl font-black uppercase tracking-wider text-white  transition-all">
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
                    className="w-full bg-[#050505] border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-yellow-500"/>
                </div>
                <p className="text-[9px] text-gray-500">Referrer gets +{REFERRAL_COINS} Coins when you submit their ID (30% net share).</p>
                <button onClick={handleApplyReferral} className="bg-yellow-500 py-4 rounded-2xl font-black uppercase tracking-wider text-black  transition-all">
                  Submit Referral
                </button>
                <button onClick={() => setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase font-black">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI BOT SCREEN */}
      {screen==='ai' && (
        <div className="fixed inset-0 z-[600] bg-[#050505] flex flex-col items-center p-8 overflow-y-auto">
          <div className="w-full max-w-4xl pt-10">
            <button onClick={() => setScreen('hub')} className="text-green-400 font-bold text-sm mb-12 uppercase tracking-widest">← Back</button>
          </div>
          <h2 className="text-5xl font-black mb-6 text-center uppercase text-white italic tracking-tighter">AI Trading Bot</h2>
          {/* Sponsor Banner — AI Bot section, static non-clickable */}
          <div className="w-full max-w-2xl mb-10 pointer-events-none select-none">
            <div className="flex items-center gap-3 bg-gradient-to-r from-green-950/60 to-emerald-950/30 border border-green-500/20 rounded-2xl px-5 py-3 shadow-inner">
              <span className="text-green-500/70 text-[8px] font-black uppercase tracking-widest border border-green-500/30 px-2 py-0.5 rounded-full shrink-0">Sponsored</span>
              <p className="text-gray-400 text-[10px] font-bold leading-snug">📈 AI-Powered Auto Trading — 2–5% Daily Passive Returns. Fully Automated. Start with 25,000 AJ Coins.</p>
            </div>
          </div>
          {botTier!=='none' && (
            <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-8 rounded-[3.5rem] text-center mb-16 shadow-[0_0_50px_rgba(34,197,94,0.15)]">
              <div className="w-full bg-[#050505]/50 border border-green-500/30 p-8 rounded-3xl font-mono text-left shadow-inner">
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
                  className={`mt-8 w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 transition-all duration-200   ${botTier===b.tier?`bg-${b.color}-500 text-black cursor-not-allowed`:`bg-${b.color}-600 text-white`}`}>
                  {botTier===b.tier?"RUNNING":"ACTIVATE"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOUNDER CARD */}
      <section className="py-20 bg-[#050505] flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" className="w-full max-w-4xl rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.9)] hover:scale-[1.01] transition-all border border-white/5" alt="Founder"/>
      </section>

      {/* VIEWER SCREEN */}
      {viewerRoom && !liveActive && (
        <div className="fixed inset-0 z-[600] bg-[#050505] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-[#050505]/80 border-b border-white/10 z-10">
            <div className="flex items-center gap-3">
              <img src={viewerRoom.photo||'/logo.png'} className="w-9 h-9 rounded-full border-2 border-red-500 object-cover"/>
              <div>
                <p className="font-black text-white text-xs uppercase tracking-widest">@{viewerRoom.username}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
                  <span className="text-[9px] text-red-400 font-black uppercase">LIVE</span>
                </div>
              </div>
            </div>
            <button onClick={leaveViewerRoom}
              className="bg-red-600/20 border border-red-500/30 px-3 py-1.5 rounded-full text-[10px] font-black text-red-400 uppercase tracking-widest  transition-all">
              Leave
            </button>
          </div>

          <div className="relative flex-1 bg-gradient-to-br from-slate-900 to-black flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 opacity-40">
              <Radio size={64} className="text-red-500 animate-pulse"/>
              <p className="text-white font-black uppercase tracking-widest text-sm">Watching @{viewerRoom.username}</p>
              <p className="text-gray-500 text-[10px] font-bold">Live video via Agora (HD)</p>
            </div>

            <div className="absolute left-3 bottom-28 w-[60%] max-h-40 overflow-y-auto flex flex-col gap-1 pointer-events-none">
              {viewerChatMessages.slice(-10).map((m:any) => (
                <div key={m.id} className="flex items-start gap-1.5">
                  <img src={m.photo||'/logo.png'} className="w-5 h-5 rounded-full border border-pink-500 flex-shrink-0 mt-0.5"/>
                  <p className="text-[10px] text-white font-bold leading-tight bg-[#050505]/40 rounded-xl px-2 py-1">
                    <span className="text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text">@{m.username}: </span>{m.text}
                  </p>
                </div>
              ))}
              <div ref={viewerChatEndRef}/>
            </div>

            <div className="absolute right-4 bottom-36 flex flex-col items-center gap-1 cursor-pointer"
              onClick={() => setPulseGiftPostId(viewerRoomId)}>
              <Gift size={32} className="text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text"/>
              <span className="text-[9px] font-black text-yellow-500 bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text">Gift</span>
            </div>
          </div>

          <div className="flex gap-2 px-3 py-3 bg-[#050505]/90 border-t border-white/10">
            <img src={user?.photoURL||'/logo.png'} className="w-8 h-8 rounded-full border border-pink-500 flex-shrink-0 object-cover"/>
            <input
              type="text"
              value={viewerChatInput}
              onChange={e => setViewerChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendViewerChatMessage()}
              placeholder="Say something to the streamer..."
              className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 border border-white/10 rounded-full px-4 py-2 text-[11px] text-white outline-none focus:ring-1 focus:ring-cyan-500 font-bold"
            />
            <button onClick={sendViewerChatMessage}
              className="bg-cyan-500 p-2 rounded-full text-black active:scale-90 transition-all shadow-lg">
              <Send size={14}/>
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#050505] py-24 px-10 border-t border-white/5 text-center flex flex-col items-center relative overflow-hidden">
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
// BELL ICON
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

// ============================================================
// APP ROOT — all wiring lives here in page.tsx
// ============================================================
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AJSuperPortal />
    </QueryClientProvider>
  );
}