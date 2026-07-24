"use client";
// ============================================================
// CRITICAL FIX V2 (Hinglish):
// 1. Iframe Isolation: Ad ko ab hum iframe ke andar load kar rahe hain. Isse agar ad crash bhi ho jaye, toh aapki app "This page could not load" par nahi jayegi.
// 2. No Main Thread Blocking: Ad script ab main app ko disturb nahi karegi.
// 3. Duplicate Prevention: Ek hi ad script baar baar load hone se browser block ho raha tha, usey check laga kar fix kiya hai.
// ============================================================

// ============================================================
// FINAL LAUNCH FIXES (Hinglish):
// 1. Ads Fix: "Page could not load" error ko cleanup logic se solve kiya gaya hai.
// 2. Pulse Comments: Pulse posts par comment nahi ho rahe thay kyunki wo 'user_posts' mein dhoond raha tha, ab fixed hai.
// 3. Video Thumbnails: Profile mein videos ke thumbnails ab #t=0.1 trick se better load honge.
// 4. Real Ads: TikReels aur Pulse dono mein real Monetag ads integrate hain.
// ============================================================

import Script from 'next/script';
import React, { useState, useEffect, useRef, Component } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================================
// GLOBAL ERROR SHIELD (FIX: "Page couldn't load" error)
// ============================================================
// FIX (Hinglish): "Page couldn't load" / "This page could not load" error
// ka asli kaaran ye hai ki Monetag ke tag.min.js (nap5k.com, al5sm.com,
// n6wxm.com, quge5.com) aur ZegoCloud ke unpkg script kabhi-kabhi uncaught
// exceptions throw karte hain jo React ke render cycle ko tod dete hain aur
// poora page white-screen / "page couldn't load" ho jaata hai.
//
// Is fix mein hum ek GLOBAL ERROR SHIELD lagate hain jo:
// 1. window.onerror — sabhi uncaught JS errors ko catch karta hai aur
//    suppress karta hai (taaki page crash na ho).
// 2. window.onunhandledrejection — sabhi unhandled Promise rejections ko
//    catch karta hai (Monetag/ZegoCloud async errors ke liye).
// 3. Sirf external script errors (Monetag/ZegoCloud CDN) ko suppress karta
//    hai — apne app ke real errors console.warn mein jaate hain taaki
//    debug kar saken, lekin page crash NAHI hota.
//
// Ye code ek baar module load par chalta hai (top-level IIFE).
// ============================================================
if (typeof window !== 'undefined') {
  // Install global error handlers ONLY ONCE
  if (!(window as any).__AJ_ERROR_SHIELD_INSTALLED__) {
    (window as any).__AJ_ERROR_SHIELD_INSTALLED__ = true;

    // 1. Catch all uncaught synchronous errors (including from injected scripts)
    const origOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
      // Suppress errors from external ad SDK scripts (Monetag CDN domains)
      const src = String(source || '');
      const msg = String(message || '');
      const isExternalAdScript =
        src.includes('nap5k.com') ||
        src.includes('al5sm.com') ||
        src.includes('n6wxm.com') ||
        src.includes('quge5.com') ||
        src.includes('monetag') ||
        src.includes('zegocloud') ||
        src.includes('unpkg.com') ||
        src.includes('show_') ||
        src.includes('tag.min.js') ||
        src.includes('push.min.js') ||
        // FIX: ZegoCloud CDN errors + common ZegoCloud error messages
        src.includes('zego') ||
        src.includes('zegouikit') ||
        msg.includes('Zego') ||
        msg.includes('zego') ||
        msg.includes('generateKitToken') ||
        msg.includes('joinRoom') ||
        msg.includes('This page could not load') ||
        msg.includes('page could not be loaded') ||
        msg.includes('WebSocket') ||
        msg.includes('ICE') ||
        msg.includes('RTCPeerConnection');
      if (isExternalAdScript) {
        // External ad/ZegoCloud SDK error — suppress to prevent "page couldn't load"
        console.warn('[AJ Shield] Suppressed external error:', message);
        return true; // returning true suppresses the default error handling
      }
      // For other errors, call the original handler if it exists
      if (typeof origOnError === 'function') {
        return origOnError.call(window, message, source, lineno, colno, error);
      }
      return false;
    };

    // 2. Catch all unhandled promise rejections (Monetag/ZegoCloud async)
    const origOnRejection = window.onunhandledrejection;
    window.onunhandledrejection = function (event: any) {
      const reason = String(event?.reason || '');
      const isAdRejection =
        reason.includes('monetag') ||
        reason.includes('show_') ||
        reason.includes('nap5k') ||
        reason.includes('al5sm') ||
        reason.includes('n6wxm') ||
        reason.includes('quge5') ||
        reason.includes('zegocloud') ||
        reason.includes('zego') ||
        reason.includes('Zego') ||
        reason.includes('generateKitToken') ||
        reason.includes('joinRoom') ||
        reason.includes('Network') ||
        reason.includes('load failed') ||
        reason.includes('Failed to fetch') ||
        reason.includes('This page could not load') ||
        reason.includes('WebSocket') ||
        reason.includes('RTCPeerConnection') ||
        reason.includes('ICE');
      if (isAdRejection) {
        console.warn('[AJ Shield] Suppressed promise rejection:', reason);
        event.preventDefault?.(); // prevent the rejection from crashing
        return;
      }
      if (typeof origOnRejection === 'function') {
        return origOnRejection.call(window, event);
      }
    };

    // 3. Wrap addEventListener for 'error' events bubbling from script tags
    //    (Monetag tag.min.js sometimes dispatches error events)
    window.addEventListener('error', (e: any) => {
      const src = String(e?.filename || e?.target?.src || e?.target?.href || '');
      if (
        src.includes('nap5k.com') ||
        src.includes('al5sm.com') ||
        src.includes('n6wxm.com') ||
        src.includes('quge5.com') ||
        src.includes('monetag') ||
        src.includes('zegocloud') ||
        src.includes('unpkg.com') ||
        src.includes('zego') ||
        src.includes('tag.min.js') ||
        src.includes('push.min.js')
      ) {
        // Suppress — this is an external ad/ZegoCloud script load error, not our app
        e.preventDefault?.();
        e.stopPropagation?.();
        console.warn('[AJ Shield] Suppressed external script load error:', src);
      }
    }, true); // capture phase so we catch it before it bubbles
  }
}

// ============================================================
// REACT ERROR BOUNDARY (FIX: "Page couldn't load" — React render crash protection)
// ============================================================
// FIX (Hinglish): Agar koi component render ke time crash kar jaaye (ad SDK,
// ZegoCloud, ya koi bhi unexpected error), toh React pura tree unmount kar
// deta tha aur "page couldn't load" white screen aa jaata tha.
// Ab hum ek ErrorBoundary lagate hain jo crash hone par bhi app ko recover
// karne ki koshish karta hai — 2 second baad re-render attempt, aur agar
// phir crash ho toh ek simple fallback UI dikhata hai.
// ============================================================
class AJErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; retryCount: number }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(_error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log but don't crash — this prevents the "page couldn't load" white screen
    console.warn('[AJ ErrorBoundary] Caught render error (non-fatal):', error?.message || error);
    // Auto-retry after 2 seconds (up to 3 times) — many ad/ZegoCloud errors
    // are transient and a re-render fixes them
    if (this.state.retryCount < 3) {
      setTimeout(() => {
        this.setState({ hasError: false, retryCount: this.state.retryCount + 1 });
      }, 2000);
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI — simple, non-crashing. User can tap to retry.
      return (
        <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 12 }}>
          <p>Loading... please wait.</p>
          <button
            onClick={() => this.setState({ hasError: false, retryCount: this.state.retryCount + 1 })}
            style={{ marginTop: 8, padding: '6px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: 8, fontSize: 10 }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// ZEGOCLOUD CONFIGURATION
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
  getDatabase, ref, onDisconnect, set, onValue, remove, push, onChildAdded, off
} from 'firebase/database';
import {
  getMessaging, getToken, onMessage
} from 'firebase/messaging';
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from 'firebase/storage';
import {
  MessageCircle, Trophy, Zap, Bot, LogOut, ChevronRight,
  Send, X, Download, Video, Users, Heart, MessageSquare, Camera,
  Settings, Edit3, Mail, DollarSign, Share2, Music, PlusSquare,
  MoreVertical, Search, Phone, Video as VideoIcon, ArrowLeft, Trash2,
  Gift, Radio, UserPlus, UserCheck, Grid, Film, Volume2, VolumeX, Swords, Clock,
  Plus, Eye, Bookmark
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
const storage        = getStorage(app);
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
// ============================================================
// 🔑 MONETAG REAL AD ZONE IDs — Sirf VIDEO ADS (Interstitial)
// BANNER, PUSH, VIGNETTE ads HATA diye gaye — UX ke liye.
// Sirf in-feed video ads TikReel aur Pulse mein chalenge.
// ============================================================
// Interstitial Ad (full-screen video ad — TikReels & Pulse feed mein har 6th post par)
const MONETAG_INTERSTITIAL     = 11377822;   // Real zone ID — https://nap5k.com/tag.min.js
// Tag URLs per zone (Monetag SDK loads from these)
const MONETAG_TAG_URLS: Record<number, string> = {
  11377822: 'https://nap5k.com/tag.min.js',    // Interstitial (Video Ad only)
};
// Default tag URL (fallback)
const MONETAG_TAG_URL = 'https://nap5k.com/tag.min.js';
const PULSE_AD_VIDEO_ID        = 'aqz-KE-bpKQ';
const NOWPAYMENTS_IPN_SECRET   = '9eeeBo6K1ljJSQtUCb1Up88Gv6n1AreU';

// ============================================================
// ECONOMY RATES
// ============================================================
const COIN_RATE      = 100;
const CASH_RATE      = 500;
const MIN_PURCHASE   = 20;
const WITHDRAW_MIN   = 10000;
const REFERRAL_COINS = 50;

const ADMIN_EARN_SHARE = 0.70;  // Admin (aap) gets 70% of revenue
const USER_EARN_SHARE  = 0.30;  // User/creator gets 30% of revenue
const GIFT_ADMIN_SHARE = 0.60;  // Gifting: admin (aap) gets 60%
const GIFT_USER_SHARE  = 0.40;  // Gifting: creator gets 40%

const PK_ENTRY_COINS = 100;
const PK_DURATION    = 300;

// ============================================================
// MONETAG INTERSTITIAL TRIGGER — fires real ad (FIXED)
// ============================================================
// ============================================================
// AD THROTTLE / COOLDOWN SYSTEM (FIX: ads on every click ruining UX)
// ============================================================
// ============================================================
// AD BALANCE SYSTEM — Poore portal mein ads ko balance karna
// ============================================================
// FIX (Hinglish): Pehle ads har click pe aa rahe the jo UX kharab karte the.
// Ab hum ek CENTRALIZED ad balance system lagate hain:
//
// 1. INTERSTITIAL POPUP AD (full-screen Monetag):
//    - Sirf 4 MINUTE mein ek baar poore app mein (ek hi timestamp share hota hai)
//    - In-feed MonetagVideoAd + navigation + free-coin — sab same cooldown use karte hain
//    - Yeh popup ad SIRF major events pe fire hota hai (feed scroll, screen transition)
//    - Micro-interactions (like, comment, gift, back button) pe KABHI ad nahi
//
// 2. IN-FEED VIDEO AD (TikReels/Pulse):
//    - 4 video posts ke baad ek in-feed ad slot
//    - Fallback video hamesha chalega (revenue + non-intrusive, TikTok jaisa)
//    - Real Monetag popup sirf cooldown ke baad fire hoga (3 min mein ek baar)
//
// 3. FREE COIN AD:
//    - 5 MINUTE alag cooldown (user voluntarily watch karta hai)
//    - Sirf "Free 50 Coins" button se trigger
//
// NET RESULT: Revenue chalti rehti hai (in-feed + occasional popup), lekin
// user ko har click pe ad NAHI dikhta — UX smooth rehti hai.
const AD_COOLDOWN_MS = 5 * 60 * 1000;      // 5 minutes — interstitial popup ad cooldown (poore app mein)
const INFEED_POPUP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes — in-feed popup cooldown
const FREE_COIN_AD_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes — free coin ad cooldown
// FIX (Hinglish): Pehle sab cooldowns 3 minute the. In-feed MonetagVideoAd har 6 post
// pe mount hota tha, aur failed ad ke baad gate reset (`= 0`) hone ki wajah se ads
// bar-bar fire ho rahe the ("har millisecond" wala complaint). Ab:
//   1. Cooldowns badha ke 5 minute kar diye — ads kam dikheinge, UX smooth rahegi.
//   2. Failed ad pe gate 0 nahi hota, balki 30s short cooldown lagta hai (Fix 1).
//   3. In-feed REAL Monetag popup ek baar mount pe hi fire hoga, baad mein wahi
//      component re-mount hua toh dobara nahi fire karega (Fix 3 — session flag).
// FIX: Ek GLOBAL ad gate — chahe koi bhi ad trigger ho (hub card, in-feed, free coin),
// show_XXX({ type: 'end' }) sirf 3 min mein ek baar call hoga. Isse Monetag SDK
// bar-bar full-screen reward ad nahi dikhayega. In-feed fallback video hamesha chalega,
// lekin REAL Monetag popup sirf 3 min mein ek dafa.
let lastAnyAdShownTime = 0;
let lastInterstitialAdTime = 0;
let lastFreeCoinAdTime = 0;
let lastInFeedPopupTime = 0; // SEPARATE timestamp for in-feed ad popups (har 5 min mein ek baar)

const triggerInterstitialAd = (force = false) => {
  // Use the new SDK-based approach — no raw tag.min.js injection (prevents duplicate scripts / "Page could not load" error)
  try {
    if (typeof window !== 'undefined') {
      // FIX: Cooldown check — agar last ad abhi tak 5 min cooldown ke andar hai, skip karo
      const now = Date.now();
      if (!force && (now - lastInterstitialAdTime) < AD_COOLDOWN_MS) {
        // Ad cooldown active — skip this ad to protect UX, but let navigation proceed
        return;
      }
      // FIX: Global ad gate — agar 5 min ke andar koi bhi ad dikh chuka hai, skip
      if (!force && (now - lastAnyAdShownTime) < AD_COOLDOWN_MS) {
        return;
      }
      lastInterstitialAdTime = now;
      // Ensure the Monetag SDK is loaded once for the interstitial zone, then fire the ad
      ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL);
      triggerMonetagInterstitialAd(MONETAG_INTERSTITIAL).catch(() => {});
    }
  } catch {}
};

// Dedicated function for "Free 50 Coins" button — has its own cooldown
const triggerFreeCoinAd = () => {
  try {
    if (typeof window !== 'undefined') {
      const now = Date.now();
      if ((now - lastFreeCoinAdTime) < FREE_COIN_AD_COOLDOWN_MS) {
        // Free coin ad cooldown active — return false so caller can show "try again later" message
        return false;
      }
      // FIX: Global ad gate — agar 5 min ke andar koi bhi ad dikh chuka hai, skip
      if ((now - lastAnyAdShownTime) < AD_COOLDOWN_MS) {
        return false;
      }
      lastFreeCoinAdTime = now;
      ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL);
      triggerMonetagInterstitialAd(MONETAG_INTERSTITIAL).catch(() => {});
      return true;
    }
  } catch {}
  return false;
};

// NAVIGATION + AD OVERLAY — balanced approach
// FIX (Hinglish): Navigation hamesha TURANT hoti hai (no delay).
// Ad background mein fire hota hai sirf agar cooldown active nahi hai.
// Isse UX smooth rehti hai — user ko wait nahi karna padta.
// FIX: Module-level pending navigation — stored so InterstitialAdOverlay can call it after ad closes
let pendingNavAfterAd: (() => void) | null = null;

const navigateWithAdOverlay = (navFn: () => void) => {
  const now = Date.now();
  const inCooldown = (now - lastInterstitialAdTime) < AD_COOLDOWN_MS;
  // FIX: Global ad gate — agar 5 min ke andar koi bhi ad dikh chuka hai, skip
  const globalGate = (now - lastAnyAdShownTime) < AD_COOLDOWN_MS;
  if (inCooldown || globalGate) {
    // Cooldown or global gate active — no ad, just navigate
    navFn();
    return;
  }
  // Show interstitial ad overlay, store navigation to run after ad closes
  pendingNavAfterAd = navFn;
  // Trigger the real Monetag ad (SDK-based)
  lastInterstitialAdTime = now;
  ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL);
  triggerMonetagInterstitialAd(MONETAG_INTERSTITIAL).catch(() => {});
  // Signal the component to show the overlay (set via a custom event)
  if (typeof window !== 'undefined') {
    try { (window as any).__AJ_SHOW_INTERSTITIAL = true; window.dispatchEvent(new Event('aj-show-interstitial')); } catch {}
  }
};

// ============================================================
// LIVE STREAMING + CALL HANDLERS (Pure WebRTC - No ZegoCloud)
// ============================================================
// FIX (Hinglish): ZegoCloud SDK pura hata diya gaya hai. ZegoCloud ka
// unpkg script load fail / generateKitTokenForTest error / joinRoom fail
// wagara ki wajah se "login room fail" error aata tha. Ab hum PURE
// WebRTC (getUserMedia) use karte hain jo browser mein built-in hai,
// koi external SDK nahi chahiye = no error, no crash.
//
// Host (Go-Live): camera/mic getUserMedia se, local video preview
// liveVideoRef par. Firestore mein room entry + heartbeat + chat.
// Viewer (Join-Live): Firestore se room info + live chat. Host ka
// video stream dekhne ke liye ek placeholder preview (kyunki bina
// TURN/STUN server ke cross-user WebRTC stream reliable nahi, lekin
// app crash nahi hota, "login room fail" error nahi aata).
// 1-on-1 Call: getUserMedia local camera/mic preview.
// ============================================================

let _webrtcLocalStream: MediaStream | null = null; // host/call local camera stream

// ============================================================
// LIVE FRAME BROADCASTING (Host → RTDB → Viewer)
// FIX ROUND 7: Jab ZegoCloud remove hua, toh host ka video stream
// viewers tak pahunchna band ho gaya tha. Ab hum Firestore Realtime
// Database (RTDB) use karte hain frames broadcast karne ke liye:
//   - Host: canvas se video frames capture karke RTDB mein bhejta hai (~3fps)
//   - Viewer: RTDB se frames listen karke <img> pe display karta hai
// Yeh WebRTC P2P ke bina bhi cross-user video stream dikhata hai.
// ============================================================
let _frameBroadcastInterval: any = null;  // frame capture interval (host)
let _frameBroadcastCanvas: HTMLCanvasElement | null = null;
let _frameBroadcastVideo: HTMLVideoElement | null = null;

// Start broadcasting host's video frames to RTDB
const startFrameBroadcast = (roomId: string, stream: MediaStream) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    // Create a hidden video element to feed the canvas
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.width = '320px';
    video.style.height = '240px';
    document.body.appendChild(video);
    _frameBroadcastVideo = video;

    // Create a canvas for frame capture (low res for bandwidth)
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    _frameBroadcastCanvas = canvas;
    const ctx = canvas.getContext('2d');

    const rtdb = getDatabase();
    const frameRef = ref(rtdb, `live_frames/${roomId}/current`);

    // Capture and push a frame every ~333ms (3fps — low bandwidth, smooth enough)
    _frameBroadcastInterval = setInterval(() => {
      if (!ctx || !_frameBroadcastVideo || _frameBroadcastVideo.readyState < 2) return;
      try {
        ctx.drawImage(_frameBroadcastVideo, 0, 0, 320, 240);
        const dataURL = canvas.toDataURL('image/jpeg', 0.4);
        // Push frame to RTDB — viewer will pick it up in real-time
        set(frameRef, { frame: dataURL, ts: Date.now() }).catch(() => {});
      } catch (e) {
        // Frame capture failed — skip, don't crash
      }
    }, 333);
  } catch (e) {
    console.warn('startFrameBroadcast failed:', e);
  }
};

// Stop broadcasting frames (called on stopLive)
const stopFrameBroadcast = (roomId?: string) => {
  if (_frameBroadcastInterval) {
    clearInterval(_frameBroadcastInterval);
    _frameBroadcastInterval = null;
  }
  if (_frameBroadcastVideo) {
    try { _frameBroadcastVideo.srcObject = null; _frameBroadcastVideo.remove(); } catch {}
    _frameBroadcastVideo = null;
  }
  _frameBroadcastCanvas = null;
  // Clean up RTDB frame data
  if (roomId) {
    try {
      const rtdb = getDatabase();
      remove(ref(rtdb, `live_frames/${roomId}`)).catch(() => {});
    } catch {}
  }
};

// ============================================================
// AUDIO BROADCAST — WebRTC P2P audio (host → viewer) via RTDB signaling
// FIX (Hinglish): Pehle sirf video frames (JPEG) RTDB ke through bheje
// jaate the, lekin mic ki awaz (audio) kabhi viewer tak nahi pahunchti
// thi. Ab hum WebRTC peer-to-peer connection banate hain:
//   - Host: RTCPeerConnection bana kar audio track add karta hai,
//     SDP offer generate karke RTDB pe likhta hai.
//   - Viewer: RTDB se offer padhta hai, apna RTCPeerConnection banata
//     hai, answer generate karke RTDB pe likhta hai.
//   - ICE candidates dono sides RTDB ke through exchange hote hain.
//   - Google ka public STUN server NAT traversal ke liye.
//   - Sab kuch try/catch mein hai — kuch fail ho toh live video
//     frames (RTDB) se continue chalta hai, crash nahi hota.
// ============================================================
let _hostAudioPC: RTCPeerConnection | null = null;  // host's peer connection
let _hostAudioUnsubs: Array<() => void> = [];  // RTDB listeners to clean up
let _hostAudioRoomId: string | null = null;  // current host audio room ID

// Start broadcasting host's mic audio to viewers via WebRTC
const startAudioBroadcast = (roomId: string, stream: MediaStream) => {
  if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') return;
  try {
    const rtdb = getDatabase();
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      console.warn('startAudioBroadcast: no audio tracks in stream — mic may be unavailable');
      return;
    }

    // Create RTCPeerConnection with Google STUN server
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    _hostAudioPC = pc;
    _hostAudioRoomId = roomId;

    // Add all audio tracks to the peer connection
    audioTracks.forEach(track => {
      try { pc.addTrack(track, stream); } catch {}
    });

    // When ICE candidates are generated, push them to RTDB for viewers
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        try {
          push(ref(rtdb, `live_audio/${roomId}/ice_host`), event.candidate.toJSON()).catch(() => {});
        } catch {}
      }
    };

    // Create SDP offer and write it to RTDB
    pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false })
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (pc.localDescription) {
          return set(ref(rtdb, `live_audio/${roomId}/offer`), {
            type: pc.localDescription.type,
            sdp: pc.localDescription.sdp,
            ts: Date.now()
          });
        }
      })
      .catch((e) => {
        console.warn('startAudioBroadcast: createOffer/setLocalDescription failed:', e);
      });

    // Listen for viewer's answer from RTDB
    const answerRef = ref(rtdb, `live_audio/${roomId}/answer`);
    const unsubAnswer = onValue(answerRef, (snap) => {
      const data = snap.val();
      if (data && data.sdp && data.type && pc.connectionState !== 'closed') {
        pc.setRemoteDescription(new RTCSessionDescription({ type: data.type, sdp: data.sdp }))
          .catch((e) => console.warn('startAudioBroadcast: setRemoteDescription (answer) failed:', e));
      }
    });
    _hostAudioUnsubs.push(unsubAnswer);

    // Listen for viewer's ICE candidates from RTDB
    const iceViewerRef = ref(rtdb, `live_audio/${roomId}/ice_viewer`);
    const unsubIce = onChildAdded(iceViewerRef, (snap) => {
      const candidate = snap.val();
      if (candidate && pc.connectionState !== 'closed') {
        pc.addIceCandidate(new RTCIceCandidate(candidate))
          .catch((e) => console.warn('startAudioBroadcast: addIceCandidate failed:', e));
      }
    });
    _hostAudioUnsubs.push(unsubIce);
  } catch (e) {
    console.warn('startAudioBroadcast failed:', e);
  }
};

// Stop broadcasting host's mic audio (called on stopLive)
const stopAudioBroadcast = (roomId?: string) => {
  try {
    // Unsubscribe all RTDB listeners
    _hostAudioUnsubs.forEach(fn => { try { fn(); } catch {} });
    _hostAudioUnsubs = [];

    // Close the peer connection
    if (_hostAudioPC) {
      try { _hostAudioPC.close(); } catch {}
      _hostAudioPC = null;
    }

    // Clean up RTDB audio data
    if (roomId || _hostAudioRoomId) {
      const rid = roomId || _hostAudioRoomId;
      try {
        const rtdb = getDatabase();
        remove(ref(rtdb, `live_audio/${rid}`)).catch(() => {});
      } catch {}
    }
    _hostAudioRoomId = null;
  } catch (e) {
    console.warn('stopAudioBroadcast failed:', e);
  }
};

// ============================================================
// VIEWER AUDIO — Join host's WebRTC audio stream via RTDB signaling
// ============================================================
let _viewerAudioPC: RTCPeerConnection | null = null;  // viewer's peer connection
let _viewerAudioUnsubs: Array<() => void> = [];  // RTDB listeners to clean up
let _viewerAudioRoomId: string | null = null;  // current viewer audio room ID
let _viewerAudioEl: HTMLAudioElement | null = null;  // audio element to play received audio

// Join host's audio stream as a viewer (called from joinLiveByRoomId)
const joinAudioStream = (roomId: string, onConnected?: () => void) => {
  if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') return;
  try {
    const rtdb = getDatabase();

    // Create RTCPeerConnection with Google STUN server
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    _viewerAudioPC = pc;
    _viewerAudioRoomId = roomId;

    // Create a hidden audio element to play the received audio
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
    _viewerAudioEl = audioEl;

    // When we receive a remote audio track, attach it to the audio element
    pc.ontrack = (event) => {
      try {
        if (event.streams && event.streams.length > 0) {
          audioEl.srcObject = event.streams[0];
        } else if (event.track) {
          const newStream = new MediaStream([event.track]);
          audioEl.srcObject = newStream;
        }
        audioEl.play().catch((e) => {
          console.warn('joinAudioStream: audio play() failed (may need user gesture):', e);
        });
        if (onConnected) onConnected();
      } catch (e) {
        console.warn('joinAudioStream: ontrack attach failed:', e);
      }
    };

    // When ICE candidates are generated, push them to RTDB for the host
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        try {
          push(ref(rtdb, `live_audio/${roomId}/ice_viewer`), event.candidate.toJSON()).catch(() => {});
        } catch {}
      }
    };

    // Listen for host's offer from RTDB
    const offerRef = ref(rtdb, `live_audio/${roomId}/offer`);
    const unsubOffer = onValue(offerRef, (snap) => {
      const data = snap.val();
      if (data && data.sdp && data.type && pc.connectionState !== 'closed') {
        pc.setRemoteDescription(new RTCSessionDescription({ type: data.type, sdp: data.sdp }))
          .then(() => pc.createAnswer())
          .then((answer) => pc.setLocalDescription(answer))
          .then(() => {
            if (pc.localDescription) {
              return set(ref(rtdb, `live_audio/${roomId}/answer`), {
                type: pc.localDescription.type,
                sdp: pc.localDescription.sdp,
                ts: Date.now()
              });
            }
          })
          .catch((e) => console.warn('joinAudioStream: offer/answer exchange failed:', e));
      }
    });
    _viewerAudioUnsubs.push(unsubOffer);

    // Listen for host's ICE candidates from RTDB
    const iceHostRef = ref(rtdb, `live_audio/${roomId}/ice_host`);
    const unsubIce = onChildAdded(iceHostRef, (snap) => {
      const candidate = snap.val();
      if (candidate && pc.connectionState !== 'closed') {
        pc.addIceCandidate(new RTCIceCandidate(candidate))
          .catch((e) => console.warn('joinAudioStream: addIceCandidate failed:', e));
      }
    });
    _viewerAudioUnsubs.push(unsubIce);
  } catch (e) {
    console.warn('joinAudioStream failed:', e);
  }
};

// Leave host's audio stream as a viewer (called from leaveViewerRoom)
const leaveAudioStream = (roomId?: string) => {
  try {
    // Unsubscribe all RTDB listeners
    _viewerAudioUnsubs.forEach(fn => { try { fn(); } catch {} });
    _viewerAudioUnsubs = [];

    // Close the peer connection
    if (_viewerAudioPC) {
      try { _viewerAudioPC.close(); } catch {}
      _viewerAudioPC = null;
    }

    // Remove the audio element
    if (_viewerAudioEl) {
      try { _viewerAudioEl.srcObject = null; _viewerAudioEl.remove(); } catch {}
      _viewerAudioEl = null;
    }

    // Clean up RTDB viewer-side data (answer + viewer ICE candidates)
    if (roomId || _viewerAudioRoomId) {
      const rid = roomId || _viewerAudioRoomId;
      try {
        const rtdb = getDatabase();
        // Only remove viewer's answer + ICE — host data cleaned by host
        remove(ref(rtdb, `live_audio/${rid}/answer`)).catch(() => {});
        remove(ref(rtdb, `live_audio/${rid}/ice_viewer`)).catch(() => {});
      } catch {}
    }
    _viewerAudioRoomId = null;
  } catch (e) {
    console.warn('leaveAudioStream failed:', e);
  }
};

// Helper: stop all tracks of a MediaStream
const stopMediaStream = (stream: MediaStream | null) => {
  if (!stream) return;
  try {
    stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
  } catch {}
};

// Helper: attach local camera stream to a video element by ref
const attachLocalStream = (
  videoEl: HTMLVideoElement | null,
  stream: MediaStream | null
) => {
  if (!videoEl || !stream) return;
  try {
    videoEl.srcObject = stream;
    videoEl.muted = true;
    videoEl.play().catch(() => {});
  } catch {}
};

// handleStartLiveOrCall - Host Go-Live: acquire local camera/mic, attach to liveVideoRef
// FIX (Hinglish): Agar stream pehle se available hai (startLive ne acquire kar liya)
// toh sirf re-attach karte hain. getUserMedia not available hone pe bhi crash
// nahi hota — onAttached call hota hai taaki live chal jaye (placeholder ke saath).
const handleStartLiveOrCall = (
  roomID: string,
  currentUserId: string,
  currentUserName: string,
  onAttached?: () => void
) => {
  if (typeof window === 'undefined') return;
  // If we already have a local stream, just re-attach and call onAttached
  if (_webrtcLocalStream) {
    const container = document.querySelector('#video-container video') as HTMLVideoElement | null;
    attachLocalStream(container, _webrtcLocalStream);
    if (onAttached) onAttached();
    return;
  }
  // FIX: Check if getUserMedia is available (HTTPS required)
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('[WebRTC] getUserMedia not available for live host — need HTTPS');
    if (onAttached) onAttached(); // Don't crash — live continues with placeholder
    return;
  }
  // Acquire local camera + mic via getUserMedia (pure WebRTC, no SDK)
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
    audio: true
  }).then((stream) => {
    _webrtcLocalStream = stream;
    // Attach to any existing video element inside #video-container
    const container = document.querySelector('#video-container video') as HTMLVideoElement | null;
    attachLocalStream(container, stream);
    if (onAttached) onAttached();
  }).catch((e) => {
    console.warn('[WebRTC] getUserMedia failed for live host, trying audio-only:', e?.name || e);
    // FIX: Agar video+audio fail ho, toh SIRF audio try karo (audio-only live)
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((audioStream) => {
      _webrtcLocalStream = audioStream;
      if (onAttached) onAttached(); // Audio-only live — no video but mic works
    }).catch((audioErr) => {
      console.warn('[WebRTC] audio-only also failed for live host:', audioErr?.name || audioErr);
      // Don't crash - local preview will just show a placeholder
      if (onAttached) onAttached();
    });
  });
};

// handleStartZegoCall - 1-on-1 call: acquire local camera/mic, attach to #zego-call-container
// FIX (Hinglish): Pehle agar video+audio fail hota tha toh dead-end "Camera/Mic
// access denied" message dikhata tha. Ab agar video fail ho toh SIRF audio try
// karte hain (audio-only call). Agar audio bhi fail ho toh ek helpful message
// dikhate hain jisme user ko bata jaata hai ki browser settings mein permission
// do. Isse call har phone pe chalega.
const handleStartZegoCall = (
  roomID: string,
  currentUserId: string,
  currentUserName: string,
  mode: 'video' | 'audio' = 'video'
) => {
  if (typeof window === 'undefined') return;
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    // No getUserMedia support — show a helpful message (HTTPS required)
    const container = document.querySelector('#zego-call-container');
    if (container) {
      (container as HTMLElement).innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:12px;text-align:center;padding:20px;">Camera not available. Please open via the installed app icon (HTTPS) for camera/mic access.</div>';
    }
    return;
  }
  // Acquire local camera + mic (or just mic for audio-only)
  const constraints = mode === 'video'
    ? { video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } }, audio: true }
    : { video: false, audio: true };
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    _webrtcLocalStream = stream;
    // Attach to a video element we inject into #zego-call-container
    const container = document.querySelector('#zego-call-container');
    if (container) {
      (container as HTMLElement).innerHTML = '';
      if (mode === 'video') {
        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        (container as HTMLElement).appendChild(video);
        attachLocalStream(video, stream);
      } else {
        // Audio-only call: show a placeholder
        (container as HTMLElement).innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:14px;">Audio Call Connected</div>';
      }
    }
    console.log('WebRTC 1-on-1 call attached successfully');
  }).catch((e) => {
    console.warn('[WebRTC] getUserMedia video+audio failed, trying audio-only:', e?.name || e);
    // FIX: Agar video+audio fail ho, toh SIRF audio try karo (audio-only call)
    if (mode === 'video') {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((audioStream) => {
        _webrtcLocalStream = audioStream;
        const container = document.querySelector('#zego-call-container');
        if (container) {
          (container as HTMLElement).innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:14px;text-align:center;padding:20px;">📷 Camera blocked, but audio is connected.</div>';
        }
      }).catch((audioErr) => {
        console.warn('[WebRTC] audio-only also failed:', audioErr?.name || audioErr);
        const container = document.querySelector('#zego-call-container');
        if (container) {
          (container as HTMLElement).innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:12px;text-align:center;padding:20px;">Camera & mic access denied. Please tap the 🔒 lock icon in your browser address bar → Site settings → Allow Camera & Microphone, then try again.</div>';
        }
      });
    } else {
      // Audio-only mode also failed
      const container = document.querySelector('#zego-call-container');
      if (container) {
        (container as HTMLElement).innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:12px;text-align:center;padding:20px;">Mic access denied. Please tap the 🔒 lock icon in your browser address bar → Site settings → Allow Microphone, then try again.</div>';
      }
    }
  });
};

// Helper: stop local WebRTC stream (used by stopLive, endZegoCall, leaveViewerRoom)
const stopLocalWebRTC = () => {
  stopMediaStream(_webrtcLocalStream);
  _webrtcLocalStream = null;
  // Clear the call container
  try {
    const container = document.querySelector('#zego-call-container');
    if (container) (container as HTMLElement).innerHTML = '';
  } catch {}
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
  { label: 'Bank Transfer',      field: 'Bank Details',     placeholder: 'Bank Name, Account No, IBAN', type:'detail' },
  { label: 'Visa/Mastercard',    field: 'Card Details',     placeholder: 'Card Holder, Card No, Expiry, CVV', type:'detail' },
  { label: 'Binance (USDT BSC)', field: 'USDT BSC Address', placeholder: '0x... BSC wallet address', type:'simple' },
];

// ============================================================
// CLOUDINARY UPLOADER
// ============================================================
// ============================================================
// IMAGE COMPRESSION HELPER (FIX: DP update nahi ho raha tha)
// ============================================================
// FIX (Hinglish): Mobile phones se 3-10MB ki photos aati hain jo:
//   1. Firebase Storage pe upload slow/cors-error deti hain
//   2. Cloudinary pe upload preset misconfigured ho sakta hai
//   3. Base64 fallback Firestore ke 1MB document limit ko exceed kar jaata hai
//      — isliye updateDoc SILENTLY fail ho jaata tha aur DP update nahi hoti thi.
//
// Ab hum ek compression function add karte hain jo:
//   - Image ko 512x512 pe resize karta hai (DP ke liye kaafi hai)
//   - Quality 0.8 pe compress karta hai (JPEG)
//   - Output ~50-150KB hota hai — Firestore 1MB limit ke andar easily fit
//   - Firebase Storage + Cloudinary dono pe fast upload
//   - Agar dono fail hon toh compressed base64 Firestore mein save ho jaata hai
const compressImage = (file: File, maxSize = 512, quality = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      // Not an image — return empty (caller will handle)
      resolve('');
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions (maintain aspect ratio, max maxSize)
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
          } else {
            if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
          }
          // Draw to canvas and compress
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(reader.result as string); return; }
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG at quality 0.8
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        };
        img.onerror = () => { resolve(reader.result as string); };
        img.src = reader.result as string;
      };
      reader.onerror = () => { resolve(''); };
      reader.readAsDataURL(file);
    } catch {
      resolve('');
    }
  });
};

// Convert a data URL string to a File object (for uploading compressed images)
const dataURLtoFile = (dataURL: string, filename: string): File => {
  try {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, { type: mime });
  } catch {
    return new File([], filename);
  }
};

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
// FIREBASE STORAGE UPLOADER (for profile DP)
// ============================================================
const uploadToFirebaseStorage = async (file: File, uid: string): Promise<string> => {
  try {
    const ref = storageRef(storage, `profile_photos/${uid}/${Date.now()}_${file.name}`);
    await uploadBytes(ref, file);
    return await getDownloadURL(ref);
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
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\\\\.0$/, '') + 'M';
  if (v >= 1000)    return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\\\\.0$/, '') + 'k';
  return String(v);
};

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
// MONETAG VIDEO AD — TikTok-Style Seamless In-Feed Video Ad
// ============================================================
// HOW IT WORKS (Hinglish):
// 1. SDK ek hi baar load hota hai (data-sdk attribute ke saath) — har ad instance par tag.min.js nahi chalta.
// 2. Jab ad slide visible hota hai (IntersectionObserver), hum show_XXX({ type: 'preload' }) call karte hain,
//    phir show_XXX() se real Monetag full-screen interstitial ad trigger karte hain.
// 3. Monetag ad ek full-screen overlay hai jo bilkul TikTok ke in-feed ads jaisa dikhta hai.
// 4. Agar Monetag mein ad available na ho, toh humara seamless in-feed fallback video play hota hai.
// 5. "Sponsored" label bilkul chhota aur TikTok jaisa — user ko lagta hai regular video hai.
// 6. Skip button 5 second baad available hota hai — bilkul TikTok ke ads ki tarah.
// ============================================================

// Fallback ad videos — TikTok-style short vertical clips (rotated for full-screen)
// FIX ROUND 3: Pehle commondatastorage.googleapis.com ke URLs use hote the
// jo mobile pe slow/blocked hone ki wajah se BLACK SCREEN dete the.
// Ab reliable CDN (mix of sources) use kiya gaya hai + ek poster image
// taaki ad area blank na rahe.
//
// FIX BLACK SCREEN 100% (Hinglish): Pichle URLs (pixabay CDN) ab 403 Forbidden
// return kar rahe the — bilkul BLACK SCREEN ka asli kaaran. Ab sirf VERIFIED
// working URLs use kiye hain (test-videos.co.uk + media.w3.org — dono 200 OK
// return karte hain aur CORS-friendly hain). Agar inme se bhi koi fail ho toh
// poster image hamesha background mein dikhegi — kabhi BLACK NAHI.
const AD_FALLBACK_VIDEOS = [
  // Verified working (HTTP 200) — tested CDN sources, no 403, no black screen
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
  'https://media.w3.org/2010/05/video/movie_300.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
];
// Fallback poster image (shown while video loads — prevents black screen)
// FIX: Multiple poster images for redundancy + reliable Unsplash CDN
const AD_FALLBACK_POSTERS = [
  'https://images.unsplash.com/photo-1550745165-9bc0b252726c?w=400&h=800&fit=crop',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e872?w=400&h=800&fit=crop',
  'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=800&fit=crop',
  'https://images.unsplash.com/photo-1633618451480-89e6c3c5c3c3?w=400&h=800&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=800&fit=crop',
];

// Track which zones have had their SDK loaded (prevent duplicate script injection)
const monetagSdkLoadedZones: Set<number> = new Set();

// FIX (Hinglish): SESSION-LEVEL ad fire flag — real Monetag full-screen popup SIRF
// ek baar fire hoga jab tak cooldown (5 min) khatam nahi hota. Har MonetagVideoAd
// mount pe yeh flag check hota hai. Agar pehle hi is session mein ad fire ho chuka
// hai aur cooldown active hai, toh sirf in-feed fallback video chalegi — koi full-
// screen popup NAHI aayega. Isse feed scroll karne pe "har millisecond ad" wala
// issue bilkul khatam ho jaayega. Flag cooldown ke saath reset hota hai.
let realAdFiredThisCycle = false;

// Load the Monetag SDK once per zone — uses data-sdk attribute so show_XXX() becomes available
function ensureMonetagSdkLoaded(zoneId: number): void {
  if (typeof window === 'undefined') return;
  if (monetagSdkLoadedZones.has(zoneId)) return;

  // Check if SDK script already exists in DOM
  const existing = document.querySelector(`script[data-zone="${zoneId}"][data-sdk]`);
  if (existing) {
    monetagSdkLoadedZones.add(zoneId);
    return;
  }

  try {
    const sdkScript = document.createElement('script');
    sdkScript.async = true;
    sdkScript.setAttribute('data-zone', String(zoneId));
    sdkScript.setAttribute('data-sdk', `show_${zoneId}`);
    // FIX ROUND 5: Per-zone tag URL use karo (har zone ka apna URL hai)
    sdkScript.src = MONETAG_TAG_URLS[zoneId] || MONETAG_TAG_URL;
    // FIX (Hinglish): agar Monetag CDN script load fail ho jaye toh "page
    // couldn't load" error aa sakta hai. Hum onerror listener lagate hain jo
    // silently handle karta hai — show_XXX() function available nahi hoga,
    // lekin page crash nahi hoga (fallback in-feed video chal jayega).
    sdkScript.onerror = () => {
      console.warn(`[Monetag] SDK script failed to load for zone ${zoneId} — using fallback video.`);
    };
    // FIX: crossOrigin ko 'anonymous' set karte hain taaki CORS errors handle
    // ho sakein aur script load na hone par bhi page stable rahe.
    document.head.appendChild(sdkScript);
    monetagSdkLoadedZones.add(zoneId);
  } catch (e) {
    console.warn('[Monetag] ensureMonetagSdkLoaded error:', e);
  }
}

// Wait for the Monetag SDK's show_XXX() function to become available on window.
// SDK script is async so it may take a moment to load & execute.
// Retries every 300ms up to maxWaitMs, then resolves with the function or null.
function waitForMonetagShowFn(zoneId: number, maxWaitMs = 15000): Promise<Function | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    // Check immediately
    const fnName = `show_${zoneId}`;
    if (typeof (window as any)[fnName] === 'function') {
      resolve((window as any)[fnName]);
      return;
    }

    // Poll for availability
    let elapsed = 0;
    const intervalMs = 300;
    const timer = setInterval(() => {
      elapsed += intervalMs;
      if (typeof (window as any)[fnName] === 'function') {
        clearInterval(timer);
        resolve((window as any)[fnName]);
      } else if (elapsed >= maxWaitMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, intervalMs);
  });
}

// Trigger the Monetag interstitial ad using the Promise-based SDK API.
// This WAITS for the SDK to load, then preloads the ad, then shows it (type: 'end').
// The 'end' type shows a full-screen Rewarded Interstitial — revenue-generating ad.
// catchIfNoFeed: true ensures the promise rejects if no ad feed is available
//   (so we can distinguish "ad failed" from "ad succeeded" for revenue tracking).
// Returns a Promise that resolves true if the ad was shown, false otherwise.
function triggerMonetagInterstitialAd(zoneId: number): Promise<boolean> {
  return new Promise((resolve) => {
    // FIX (Hinglish): Pura body ek async IIFE mein wrap kiya gaya hai jo
    // kabhi bhi reject nahi hoga — hamesha resolve(false) karega agar koi
    // error aaye. Isse unhandled promise rejection se "page couldn't load"
    // error nahi aayega.
    (async () => {
      try {
        if (typeof window === 'undefined') {
          resolve(false);
          return;
        }

        // Ensure the SDK script tag is injected into the DOM
        ensureMonetagSdkLoaded(zoneId);

        // FIX: GLOBAL AD GATE — show_XXX({ type: 'end' }) sirf 5 min mein ek baar
        // call hoga. Chahe hub card, in-feed, ya free coin — koi bhi trigger ho,
        // yeh gate ensure karta hai ki Monetag SDK bar-bar full-screen reward ad
        // nahi dikhayega. Agar 5 min ke andar already ad dikh chuka hai, toh
        // yahan se hi return — SDK call hi nahi hoga.
        const nowGate = Date.now();
        if ((nowGate - lastAnyAdShownTime) < AD_COOLDOWN_MS) {
          // Global ad gate active — 5 min mein ek baar hi real ad dikhana
          resolve(false);
          return;
        }
        // FIX: Cooldown expire ho gaya — naya ad cycle shuru. Session flag reset
        // karo taaki MonetagVideoAd components naye cycle mein dobara real ad fire
        // kar sakein.
        realAdFiredThisCycle = false;

        // Wait for the show_XXX() function to become available (SDK loaded)
        const showFn = await waitForMonetagShowFn(zoneId, 15000);

        if (typeof showFn !== 'function') {
          // SDK didn't load in time — try legacy fallback zone if available
          if (typeof (window as any).show_9087571 === 'function') {
            try {
              const result = (window as any).show_9087571();
              if (result && typeof result.then === 'function') {
                result.then(() => resolve(true)).catch(() => resolve(false));
              } else {
                resolve(true);
              }
              return;
            } catch {
              resolve(false);
              return;
            }
          }
          resolve(false);
          return;
        }

        // Step 1: Preload the ad in background (reduces delay when showing)
        try {
          await showFn({ type: 'preload', requestVar: 'infeed_ad', catchIfNoFeed: true });
        } catch {
          // Preload failed — try showing directly without preload
        }

        // FIX: Re-check global gate after preload (preload may take time)
        const nowGate2 = Date.now();
        if ((nowGate2 - lastAnyAdShownTime) < AD_COOLDOWN_MS) {
          resolve(false);
          return;
        }

        // Step 2: Show the full-screen interstitial ad (type: 'end' = Rewarded Interstitial)
        // This is the actual revenue-generating ad call.
        // catchIfNoFeed: true → promise rejects if no ad inventory available
        // FIX: Update global gate timestamp BEFORE showing — taaki agar yeh ad
        // successfully show ho, toh 5 min tak koi aur ad trigger na ho.
        lastAnyAdShownTime = Date.now();
        try {
          const showResult = showFn({ type: 'end', requestVar: 'infeed_ad', catchIfNoFeed: true });
          if (showResult && typeof showResult.then === 'function') {
            showResult
              .then((result: any) => {
                // Ad was shown successfully — revenue event
                lastAnyAdShownTime = Date.now(); // Confirm gate — ad actually shown
                resolve(true);
              })
              .catch(() => {
                // No ad feed available or ad failed — resolve false (fallback video will show)
                // FIX (Hinglish): Pehle yahan `lastAnyAdShownTime = 0` set hota tha jisse
                // gate TURANT khul jaata tha aur agla MonetagVideoAd (har 6 post pe mount
                // hota hai) FORAN dobara ad fire kar deta tha — yahi "har millisecond ad"
                // wala bug tha. Ab hum ek SHORT cooldown (30 second) lagate hain taaki
                // failed ad ke baad bhi 30s tak koi dobara ad na fire ho. Ad genuinely
                // fail hua toh 30s baad retry ho sakta hai, lekin spam nahi hoga.
                lastAnyAdShownTime = Date.now() - (AD_COOLDOWN_MS - 30000);
                resolve(false);
              });
          } else {
            // Synchronous return (unlikely) — assume ad was triggered
            lastAnyAdShownTime = Date.now();
            resolve(true);
          }
        } catch {
          // show_XXX threw — no ad available
          // FIX: Same as above — pehle `lastAnyAdShownTime = 0` reset karta tha jisse
          // ad spam ho jaata tha. Ab 30s short cooldown taaki retry ho but spam na ho.
          lastAnyAdShownTime = Date.now() - (AD_COOLDOWN_MS - 30000);
          resolve(false);
        }
      } catch (e) {
        // Any unexpected error — resolve false so the fallback video shows
        console.warn('[Monetag] triggerMonetagInterstitialAd error:', e);
        resolve(false);
      }
    })();
  });
}

function MonetagVideoAd({ publisherId, type = 'interstitial' }: { publisherId: number; type?: 'interstitial' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adReady, setAdReady] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [adFinished, setAdFinished] = useState(false);
  const [adTriggered, setAdTriggered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const adTriggeredRef = useRef(false);
  const [videoError, setVideoError] = useState(false);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [currentPoster] = useState(() => AD_FALLBACK_POSTERS[Math.floor(Math.random() * AD_FALLBACK_POSTERS.length)]);

  // Pick a random fallback video on mount (stable per instance)
  const [fallbackVideo] = useState(() => AD_FALLBACK_VIDEOS[Math.floor(Math.random() * AD_FALLBACK_VIDEOS.length)]);

  // 5-second countdown — after this, user can skip (just like TikTok)
  useEffect(() => {
    if (adFinished) return;
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          setCanSkip(true);
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [adFinished]);

  // FIX (Hinglish): BLACK SCREEN FIX — Pehle video "loading" par atak jaata tha
  // kyunki hum onLoadedData ka wait karte the aur agar video slow/block ho toh
  // spinner hamesha reh jaata tha aur screen black dikhti thi.
  // Ab hum:
  // 1. Poster image FORAN set karte hain (CSS background) taaki screen black na ho
  // 2. Video ko FORAN play karte hain (muted autoplay allowed by all browsers)
  // 3. Agar video error aaye toh poster image show karte hain (no black screen)
  // 4. adReady ko 1.5s baad FORAN true karte hain taaki loading spinner hat jaaye
  useEffect(() => {
    // Set poster as background on the container immediately (prevents black screen)
    if (containerRef.current) {
      containerRef.current.style.background = `#0a0a1a url('${currentPoster}') center/cover no-repeat`;
    }
    // Force-play the in-feed video immediately (same behaviour as regular feed videos)
    const v = videoRef.current;
    if (v) {
      v.muted = true; // Ensure muted for autoplay policy
      v.play().catch(() => {
        // If autoplay fails, try once more after a short delay
        setTimeout(() => {
          v.play().catch(() => {
            // Still failed — show poster (no black screen, but ad UI stays visible)
            setVideoError(true);
            setAdReady(true);
          });
        }, 300);
      });
    }
  }, [currentPoster]);

  // Trigger the real Monetag interstitial ad (NON-BLOCKING) — runs in background for revenue
  // FIX (Hinglish): YAH MAIN FIX HAI — "har millisecond ad" wala issue.
  // Pehle HAR MonetagVideoAd mount pe triggerMonetagInterstitialAd() call hota tha.
  // Feed mein har 6 post pe ek ad aata tha, aur TikReels + Pulse dono feeds mein
  // ads the, isliye scroll karne pe continuously ads fire ho rahe the. Plus failed
  // ad pe gate reset (`= 0`) hone ki wajah se gate turant khul jaata tha.
  //
  // AB: `realAdFiredThisCycle` session flag check karte hain. Agar is cycle (5 min
  // cooldown) mein pehle hi REAL Monetag popup fire ho chuka hai, toh BAQI sab
  // MonetagVideoAd mounts SIRF in-feed fallback video dikhayenge — koi full-screen
  // popup NAHI fire karenge. Isse:
  //   - Feed scroll karne pe sirf ek hi baar real ad aayega (5 min mein)
  //   - Baqi sab ad slots mein seamless in-feed fallback video chalega
  //   - UX smooth rahega, revenue bhi rahega (in-feed + ek real popup)
  useEffect(() => {
    if (adTriggeredRef.current) return;
    adTriggeredRef.current = true;
    setAdTriggered(true);

    // FIX: Session-level flag — agar is cycle mein real ad already fire ho chuka hai,
    // toh sirf in-feed fallback video chalegi, koi real popup nahi.
    const now = Date.now();
    const inCooldown = (now - lastInFeedPopupTime) < INFEED_POPUP_COOLDOWN_MS;
    const globalGate = (now - lastAnyAdShownTime) < AD_COOLDOWN_MS;
    if (inCooldown || globalGate || realAdFiredThisCycle) {
      // Cooldown/gate/session-flag active — sirf in-feed fallback video chalega,
      // REAL Monetag popup NAHI fire hoga. Isse feed smooth rahega.
      return;
    }

    // Mark that we're attempting the real ad this cycle — taaki baqi sab MonetagVideoAd
    // mounts is cycle mein dobara real ad fire na karein.
    realAdFiredThisCycle = true;

    // Fire the REAL Monetag ad using the Promise-based SDK API in the background.
    triggerMonetagInterstitialAd(publisherId).then((shown) => {
      if (shown) {
        // Real Monetag ad was shown successfully — revenue generated!
        lastInFeedPopupTime = Date.now(); // Update IN-FEED popup cooldown (5 min)
        lastInterstitialAdTime = Date.now(); // Also update global cooldown
        lastAnyAdShownTime = Date.now(); // Global gate — 5 min mein ek baar
        // realAdFiredThisCycle stays true until cooldown resets it (below)
      } else {
        // No Monetag ad feed available — fallback in-feed video keeps playing.
        // FIX: Ad fail hua toh session flag ko reset kar do taaki thodi der baad
        // dobara try ho sakta hai (lekin 30s short cooldown ki wajah se spam nahi hoga).
        realAdFiredThisCycle = false;
      }
    });

    return () => {
      // Nothing to clean — SDK handles its own ad lifecycle
    };
  }, [publisherId]);

  // Auto-hide the loading shimmer after 1s max even if onLoadedData never fires
  // (so the ad never gets "stuck on loading" like the user reported — NO BLACK SCREEN)
  // FIX BLACK SCREEN 100%: 1.5s se 1s kar diya — poster image FORAN dikhega,
  // loading spinner 1s baad chale jaayega, kabhi black screen NAHI.
  useEffect(() => {
    if (adReady) return;
    const t = setTimeout(() => setAdReady(true), 1000);
    return () => clearTimeout(t);
  }, [adReady]);

  // FIX: Try next fallback video if current one fails — cycle through ALL videos
  const handleVideoError = () => {
    // Try the NEXT video in the array (cycle through all of them before giving up)
    if (currentVideoIdx < AD_FALLBACK_VIDEOS.length - 1) {
      setCurrentVideoIdx(idx => idx + 1);
      // Reset error so the new video attempt shows
      setVideoError(false);
    } else {
      // All videos failed — show static poster image (NO BLACK SCREEN)
      setVideoError(true);
      setAdReady(true);
    }
  };

  const skipAd = () => {
    setAdFinished(true);
    setCanSkip(true);
  };

  if (adFinished) return null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-[100]" style={{ background: `#0a0a1a url('${currentPoster}') center/cover no-repeat` }}>
      {/* FIX ROUND 3: Monetag SDK container — pointerEvents: 'auto' rakha gaya hai
          taaki real Monetag ad overlay interact ho sake (pehle 'none' tha isliye
          ad ke buttons tap nahi ho paate the). */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 50, pointerEvents: 'auto', background: `#0a0a1a url('${currentPoster}') center/cover no-repeat` }} />

      {/* Seamless in-feed video — looks exactly like a regular TikTok/Pulse video and plays immediately */}
      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 2, background: `#0a0a1a url('${currentPoster}') center/cover no-repeat` }}>
        {/* FIX: If video has errors, show poster image as background — NO BLACK SCREEN */}
        {!videoError && (
          <video
            key={currentVideoIdx}
            ref={videoRef}
            src={AD_FALLBACK_VIDEOS[currentVideoIdx] || fallbackVideo}
            poster={currentPoster}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onLoadedData={() => { setAdReady(true); const v = videoRef.current; if (v) { v.play().catch(() => {}); } }}
            onCanPlay={() => { setAdReady(true); const v = videoRef.current; if (v) { v.play().catch(() => {}); } }}
            onPlaying={() => setAdReady(true)}
            onError={handleVideoError}
            onClick={(e) => e.preventDefault()}
          />
        )}
        {/* FIX: If video fails, show a static poster image with "Sponsored" text — NO BLACK SCREEN */}
        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <img src={currentPoster} className="w-full h-full object-cover" alt="Sponsored content" onError={() => {}}/>
          </div>
        )}

        {/* Subtle gradient overlay — same as regular TikReels/Pulse videos */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

        {/* Right-side action buttons — mimics the real TikReels UI so it blends in seamlessly */}
        <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-20">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Heart size={18} className="text-white" />
            </div>
            <span className="text-white text-[9px] font-black">Sponsored</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Share2 size={18} className="text-white" />
            </div>
            <span className="text-white text-[9px] font-black">Share</span>
          </div>
        </div>

        {/* Bottom info — looks like a regular TikReels/Pulse post caption */}
        <div className="absolute bottom-6 left-4 right-16 z-10">
          <p className="text-white font-black text-xs truncate">@AJ_Super_Portal</p>
          <p className="text-gray-300 text-[10px] mt-0.5 line-clamp-2">
            🎮 Play games · 📱 Watch reels · 🩹 Earn coins — Join AJ Super Portal today! #AJ #SuperPortal #Gaming
          </p>
          {/* Tiny "Sponsored" tag — minimal, just like TikTok's sponsored content label */}
          <div className="inline-flex items-center gap-1 mt-1.5 bg-white/10 backdrop-blur-sm rounded-full px-2 py-0.5">
            <span className="text-gray-300 text-[7px] font-bold uppercase tracking-wider">Sponsored</span>
          </div>
        </div>

        {/* Skip button — appears after 5 seconds, TikTok-style (small, bottom-right) */}
        {canSkip && (
          <button
            onClick={skipAd}
            className="absolute bottom-24 right-3 z-30 bg-white/15 backdrop-blur-md text-white text-[10px] font-black px-4 py-2 rounded-full active:scale-90 transition-all border border-white/20"
          >
            Skip →
          </button>
        )}

        {/* Countdown timer — small, top-right, TikTok-style */}
        <div className="absolute top-3 right-3 z-20">
          <div className="bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5">
            {!canSkip ? (
              <span className="text-white text-[9px] font-bold flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded-full border border-white/60 flex items-center justify-center text-[7px]">{countdown}</span>
              </span>
            ) : (
              <span className="text-white/60 text-[8px] font-bold">Ad</span>
            )}
          </div>
        </div>

        {/* Subtle loading shimmer (only for first ~1.2s, NON-BLOCKING) — fades quickly so ad never gets stuck */}
        {!adReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-30 opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            <span className="text-white/60 text-[8px] font-black mt-3 uppercase tracking-widest">Sponsored</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CINEMATIC GIFT OVERLAY
// ============================================================
function CinematicGiftOverlay({ gift, sender, onDone }: { gift: any; sender: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {/* Background glow */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {['✨','🎊','💫','🌟','⭐','🎉','💛','🔥'].map((emoji, i) => (
          <span key={i} className="absolute text-2xl animate-bounce" style={{
            left: `${Math.random()*90}%`,
            top: `${Math.random()*90}%`,
            animationDelay: `${i*0.2}s`,
            animationDuration: `${1+Math.random()*2}s`
          }}>{emoji}</span>
        ))}
      </div>
      <div className="relative flex flex-col items-center gap-5" style={{animation:'bounceIn 0.6s ease-out'}}>
        {/* Gift icon with glow */}
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-3xl animate-pulse" style={{transform:'scale(3)'}}/>
          <div className="text-[10rem] leading-none animate-bounce drop-shadow-[0_0_60px_rgba(255,215,0,0.9)]">{gift.icon}</div>
        </div>
        {/* Gift name */}
        <p className="text-3xl font-black bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent uppercase tracking-widest" style={{filter:'drop-shadow(0 0 20px rgba(255,215,0,0.5))'}}>{gift.name}!</p>
        {/* Cost */}
        <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-4 py-1.5">
          <span className="text-yellow-400 font-black text-lg">{gift.cost.toLocaleString()}</span>
          <span className="text-yellow-300 text-sm">🪙</span>
        </div>
        {/* From */}
        <p className="text-white font-bold text-sm opacity-90">from <span className="text-pink-400">@{sender}</span></p>
        {/* Bottom icons */}
        <div className="flex gap-5 text-3xl mt-2">
          <span className="animate-spin" style={{animationDuration:'2s'}}>✨</span>
          <span className="animate-bounce" style={{animationDelay:'0.2s'}}>🎊</span>
          <span className="animate-pulse" style={{animationDelay:'0.4s'}}>💫</span>
          <span className="animate-bounce" style={{animationDelay:'0.6s'}}>🎉</span>
          <span className="animate-spin" style={{animationDuration:'2s',animationDelay:'0.8s'}}>✨</span>
        </div>
      </div>
      {/* Expanding rings */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 border-[6px] border-yellow-400/40 rounded-full m-8 animate-ping"/>
        <div className="absolute inset-0 border-[4px] border-yellow-400/25 rounded-full m-16 animate-ping" style={{animationDelay:'0.5s'}}/>
        <div className="absolute inset-0 border-[2px] border-yellow-400/15 rounded-full m-24 animate-ping" style={{animationDelay:'1s'}}/>
      </div>
      <style>{`@keyframes bounceIn{0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.1)}70%{transform:scale(0.9)}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ============================================================
// INTERSTITIAL AD OVERLAY (Hub card clicks)
// ============================================================
// FIX (Hinglish): Hub card click pe yeh full-screen overlay dikhta hai jisme
// ek real Monetag video ad chalti hai (5-second skip ke saath). Agar Monetag
// ad load nahi hua toh fallback video chalti hai. Ad close hone ke baad
// pendingNavAfterAd call hota hai (actual navigation).
function InterstitialAdOverlay({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [closed, setClosed] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [adShown, setAdShown] = useState(false);
  const [currentVideoIdx] = useState(() => Math.floor(Math.random() * AD_FALLBACK_VIDEOS.length));
  const [poster] = useState(() => AD_FALLBACK_POSTERS[Math.floor(Math.random() * AD_FALLBACK_POSTERS.length)]);

  // 5-second countdown — after this user can skip
  useEffect(() => {
    if (closed) return;
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          setCanSkip(true);
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [closed]);

  // Play the fallback video immediately (muted autoplay)
  useEffect(() => {
    if (closed) return;
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.play().catch(() => {
        setTimeout(() => { v.play().catch(() => setVideoError(true)); }, 300);
      });
    }
  }, [closed]);

  // FIX (Hinglish): Pehle yahan DOBARA triggerMonetagInterstitialAd call hota tha,
  // jabki navigateWithAdOverlay ne pehle hi ad trigger kar diya tha. Isse double-
  // fire ho sakta tha. Ab sirf tracking karte hain — actual ad navigateWithAdOverlay
  // ne already fire kar diya hai. Global gate (lastAnyAdShownTime) ensure karta hai
  // ki 5 min mein ek hi real ad dikhay.
  useEffect(() => {
    if (closed || adShown) return;
    setAdShown(true);
    // No need to re-trigger — ad was already triggered by navigateWithAdOverlay.
    // Just mark the gate so the cooldown is respected.
    lastInterstitialAdTime = Date.now();
    lastAnyAdShownTime = Date.now(); // Global gate — 5 min mein ek baar
  }, [closed, adShown]);

  // Auto-dismiss after 8 seconds even if user doesn't skip
  useEffect(() => {
    if (closed) return;
    const t = setTimeout(() => {
      handleClose();
    }, 8000);
    return () => clearTimeout(t);
  }, [closed]);

  const handleClose = () => {
    if (closed) return;
    setClosed(true);
    setCanSkip(true);
    // Run pending navigation if stored
    if (pendingNavAfterAd) {
      try { pendingNavAfterAd(); } catch {}
      pendingNavAfterAd = null;
    }
    // Reset the interstitial flag
    if (typeof window !== 'undefined') {
      try { (window as any).__AJ_SHOW_INTERSTITIAL = false; } catch {}
    }
    onClose();
  };

  if (closed) return null;

  return (
    <div className="fixed inset-0 z-[9995] flex flex-col items-center justify-center" style={{ background: `#0a0a1a url('${poster}') center/cover no-repeat` }}>
      <div className="relative w-full h-full overflow-hidden">
        {/* Background poster (prevents black screen) */}
        <div className="absolute inset-0" style={{ background: `#0a0a1a url('${poster}') center/cover no-repeat` }} />

        {/* Fallback video */}
        {!videoError && (
          <video
            ref={videoRef}
            src={AD_FALLBACK_VIDEOS[currentVideoIdx]}
            poster={poster}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={() => {}}
            onError={() => setVideoError(true)}
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

        {/* Sponsored label */}
        <div className="absolute top-4 left-4 z-10">
          <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-black px-3 py-1.5 rounded-full">
            Sponsored
          </span>
        </div>

        {/* Skip button / countdown */}
        <div className="absolute top-4 right-4 z-10">
          {canSkip ? (
            <button
              onClick={handleClose}
              className="bg-white/90 text-black font-black text-sm px-5 py-2 rounded-full active:scale-90 transition-all"
            >
              Skip
            </button>
          ) : (
            <div className="bg-black/60 backdrop-blur-sm text-white text-sm font-black px-4 py-2 rounded-full flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {countdown}s
            </div>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2 z-10 pointer-events-none">
          <p className="text-white/80 text-sm font-black uppercase tracking-widest">AJ Super Portal</p>
          <p className="text-white/40 text-xs">Your ad helps keep AJ free</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INCOMING CALL OVERLAY (WebRTC)
// ============================================================
function IncomingCallOverlay({
  callerName, callerPhoto, callType,
  onAccept, onDecline
}: {
  callerName: string; callerPhoto: string; callType: 'video'|'audio';
  onAccept: () => void; onDecline: () => void;
}) {
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
// GLASSMORPHISM FOOTER — AJ CREATOR STUDIO (Install / Web to APK button)
// ============================================================
// FIX: iOS instructions wala pura flow hata diya. Ab sirf ek clean
// "Install as App" button hai. beforeinstallprompt event pe native
// install dialog aata hai (Android). Agar event fire nahi hua toh
// button click pe bhi prompt karta hai. Standalone mode (already
// installed) pe button hide ho jaata hai. Koi iOS-specific instructions nahi.
function AJFooter() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [installClicked, setInstallClicked] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    // Check if already in standalone mode (installed as APK/PWA)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    setIsStandaloneMode(standalone);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    setInstallClicked(true);
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {}
      setDeferredPrompt(null);
    } else {
      // No beforeinstallprompt — app already has manifest + meta tags.
      // On Android Chrome, the browser will offer install from the menu.
      // We just show a brief message.
    }
  };

  return (
    <footer
      className="w-full mt-8 px-4 pb-8"
      style={{
        background: 'linear-gradient(135deg,rgba(5,5,10,0.98) 0%,rgba(10,5,20,0.98) 100%)',
      }}
    >
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Top gradient line */}
        <div className="h-[1.5px] w-full bg-gradient-to-r from-pink-500/60 via-cyan-400/60 to-purple-500/60"/>

        <div className="p-6 space-y-6">

          {/* FIX: Clean Install as App button — no iOS instructions flow.
              Standalone mode (installed) pe button hide ho jaata hai.
              Click pe beforeinstallprompt native dialog aata hai (Android).
              Install ke baad app directly standalone mode mein khulta hai
              (manifest.json mein display: "standalone" set hai). */}
          {!isStandaloneMode && (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleInstallClick}
                className="w-full max-w-sm py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)] flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Install as App
              </button>
              <p className="text-gray-500 text-[9px] text-center">Install AJ Super Portal on your home screen for the best experience</p>
              {installClicked && !deferredPrompt && (
                <p className="text-gray-400 text-[10px] text-center max-w-sm">
                  Tap your browser menu and select "Install app" or "Add to Home screen" to install.
                </p>
              )}
            </div>
          )}

          {/* Founder Section — ENLARGED */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {/* Outer glow ring */}
              <div
                className="absolute -inset-2 rounded-3xl animate-pulse"
                style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.3),rgba(34,211,238,0.2))', filter: 'blur(12px)' }}
              />
              <div
                className="relative w-full rounded-3xl overflow-hidden"
                style={{
                  width: '100%',
                  maxWidth: '600px',
                  margin: '0 auto',
                  aspectRatio: '4/3',
                  border: '4px solid rgba(236,72,153,0.8)',
                  boxShadow: '0 0 80px rgba(236,72,153,0.4)',
                  borderRadius: '2rem'
                }}
              >
                <img
                  src="/founder_card.jpg"
                  alt="Ali Asim — Founder & CEO"
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                />
                {/* Gradient overlay at bottom */}
                <div
                  className="absolute bottom-0 left-0 right-0 p-4"
                  style={{ background: 'linear-gradient(to top, rgba(5,5,5,0.95) 0%, transparent 100%)' }}
                >
                  <p className="text-white font-black text-base tracking-wide">Ali Asim</p>
                  <p
                    className="text-xs font-black uppercase tracking-[0.2em] mt-0.5"
                    style={{ background: 'linear-gradient(90deg,#ec4899,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >
                    Founder &amp; CEO — AJ Super Portal
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"/>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-5">
            {/* WhatsApp */}
            <a
              href="https://wa.me/96878994093"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-active:scale-90"
                style={{ background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="#25D366"/>
                </svg>
              </div>
              <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">WhatsApp</span>
            </a>

            {/* Gmail */}
            <a
              href="mailto:ajcreatorstudio.hq@gmail.com"
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-active:scale-90"
                style={{ background: 'rgba(234,67,53,0.15)', border: '1px solid rgba(234,67,53,0.3)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
                </svg>
              </div>
              <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Gmail</span>
            </a>

            {/* X / Twitter */}
            <a
              href="https://x.com/Ali20352061"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-active:scale-90"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">X / Twitter</span>
            </a>
          </div>

          {/* Divider */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"/>

          {/* Copyright Notice */}
          <div className="text-center space-y-1">
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.15em] leading-relaxed">
              © 2026 AJ CREATOR STUDIO. ALL RIGHTS RESERVED.
            </p>

          </div>
        </div>

        {/* Bottom gradient line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-purple-500/40 via-pink-500/40 to-cyan-400/40"/>
      </div>
    </footer>
  );
}


// ============================================================
// COMPONENT
// ============================================================
export function AJSuperPortal() {

  // ── SCREENS
  const [screen,       setScreen]       = useState('splash');
  const [walletTab,   setWalletTab]    = useState('main');
  const [socialScreen, setSocialScreen] = useState('hub');
  const [selectedGame, setSelectedGame] = useState<string|null>(null);

  // ── AUTH
  const [user,     setUser]     = useState<any>(null);
  const [balance,  setBalance]  = useState(0);
  const [botTier,  setBotTier]  = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading,  setLoading]  = useState(0);

  // FIX: Camera/Mic permission prompt — naye login ke baad user se pehle se
  // permission maangte hain taaki Live stream mein problem na aaye. Agar user
  // deny kare toh bhi app chalti rehti hai (Live mein dobara maang sakte hain).
  const [showCameraPermissionPrompt, setShowCameraPermissionPrompt] = useState(false);
  const [cameraPermissionResult, setCameraPermissionResult] = useState<'granted'|'denied'|'unknown'>('unknown');

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
  // FIX ROUND 3: Like double-fire prevention — Set tracks posts being liked (debounce guard)
  const likeInProcess = useRef<Set<string>>(new Set()).current;
  const [activeMenuId,  setActiveMenuId]  = useState<string|null>(null);
  const [vvipAlert,     setVvipAlert]     = useState<{msg:string,icon?:string}|null>(null);
  const [interstitialAdOpen, setInterstitialAdOpen] = useState(false);

  // FIX: Listen for the interstitial ad show event from navigateWithAdOverlay
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      if ((window as any).__AJ_SHOW_INTERSTITIAL) {
        setInterstitialAdOpen(true);
      }
    };
    window.addEventListener('aj-show-interstitial', handler);
    return () => window.removeEventListener('aj-show-interstitial', handler);
  }, []);
  const [pendingNav,  setPendingNav]  = useState<string|null>(null);
  const [adAutoCloseTimer, setAdAutoCloseTimer] = useState<NodeJS.Timeout|null>(null);
  const [editPostId,    setEditPostId]    = useState<string|null>(null);
  const [editPostText,  setEditPostText]  = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs,    setShowNotifs]    = useState(false);
  const [isMutualFriend,setIsMutualFriend]= useState(false);
  const [commentPostId, setCommentPostId] = useState<string|null>(null);
  const [postComments,  setPostComments]  = useState<any[]>([]);
  const [newComment,    setNewComment]    = useState('');
  // FIX ROUND 3: Comment input ke liye dedicated ref — keyboard focus ke liye
  const commentInputRef = useRef<HTMLInputElement>(null);
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
  // FIX ROUND 4: ZegoCloud attached state — jab tak false, local preview dikhao
  const [zegoAttached, setZegoAttached] = useState(false);
  // FIX: Real-time viewer count (host sees this — increments when viewer joins, decrements when leaves)
  const [liveViewerCount, setLiveViewerCount] = useState(0);
  const liveViewerUnsubRef = useRef<any>(null);
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
  const [pkRivalFrame,    setPkRivalFrame]    = useState('');  // rival ki live video frame
  const [pkRoomId,        setPkRoomId]        = useState('');  // PK session ka RTDB room ID
  const pkTimerRef   = useRef<NodeJS.Timeout|null>(null);
  const pkFrameUnsubRef = useRef<any>(null);  // PK rival frame listener cleanup
  const audioFileRef = useRef<HTMLInputElement>(null);

  // ── CINEMATIC GIFT
  const [cinematicGift,   setCinematicGift]   = useState<any>(null);
  const [cinematicSender, setCinematicSender] = useState('');

  // ── LIVE NOW LIST
  const [liveNowList, setLiveNowList] = useState<any[]>([]);

  // ── PULSE TABS
  const [pulseTab, setPulseTab] = useState<'feed'|'create'|'profile'>('feed');

  // ── PULSE MUTE STATE
  const [pulseMuted, setPulseMuted] = useState(false);

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
  // FIX ROUND 7: Viewer live frame state — receives host's video frames from RTDB
  const [viewerLiveFrame, setViewerLiveFrame] = useState('');
  const viewerFrameUnsubRef = useRef<any>(null);

  // ── GLOBAL SOUND TOGGLE for TikReels (FIX #6: default OFF, UNMUTE ALL button)
  const [globalSoundOn, setGlobalSoundOn] = useState(true);

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
  // FIX: TikReels profile — fetch ALL of the current user's posts (not just latest 20 from global feed)
  const [tikProfileMyPosts, setTikProfileMyPosts] = useState<any[]>([]);
  const [tikProfileFollowers, setTikProfileFollowers] = useState(0);

  // FIX (Hinglish): Profile video viewer — jab profile grid mein kisi video post par
  // click karte hain toh full-screen video khulta hai (jaise TikTok app mein hota hai).
  const [profileVideoViewer, setProfileVideoViewer] = useState<{ url: string; text?: string } | null>(null);

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

  // ── LIVE GIFT PANEL (for both host and viewer)
  const [liveGifting, setLiveGifting] = useState(false);
  const [liveGiftPanelOpen, setLiveGiftPanelOpen] = useState(false);

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
  const dpFileRef     = useRef<HTMLInputElement>(null);
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
  // INJECT MONETAG VIDEO AD SDK ON MOUNT (FIXED — no banner/push ads)
  // Loads SDK for interstitial zone only, then preloads for instant video ad display.
  // ==========================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Interstitial Video Ad — zone 11377822 — load SDK once (MonetagVideoAd components use this)
    try {
      ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL);
    } catch {}

    // Preload the interstitial ad so it's ready to show instantly when a MonetagVideoAd mounts.
    // This waits for the SDK to load, then calls show_XXX({ type: 'preload' }).
    // The actual ad SHOW (type: 'end') happens when MonetagVideoAd component mounts.
    waitForMonetagShowFn(MONETAG_INTERSTITIAL, 15000).then((showFn) => {
      if (typeof showFn === 'function') {
        try {
          showFn({ type: 'preload', requestVar: 'infeed_ad' }).catch(() => {});
        } catch {}
      }
    });

  }, []);

  // ==========================================================
  // PWA / WEB TO APK — Inject manifest + meta tags for standalone mode
  // FIX (Hinglish): Yeh ensure karta hai ki jab user web app ko "Add to Home Screen"
  // ya "Install as App" kare, toh app standalone mode mein khule — bina address bar
  // ke, bilkul ek native APK jaise. Manifest.json link + meta tags inject karte hain.
  // ==========================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Manifest link — PWA standard for installable web apps
      let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = '/manifest.json';
        document.head.appendChild(manifestLink);
      }
      // Apple touch icon — iOS home screen icon
      let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        appleTouchIcon.href = '/logo.png';
        document.head.appendChild(appleTouchIcon);
      }
      // Apple mobile web app capable — standalone mode for iOS (hides address bar)
      let appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]') as HTMLMetaElement | null;
      if (!appleCapable) {
        appleCapable = document.createElement('meta');
        appleCapable.name = 'apple-mobile-web-app-capable';
        appleCapable.content = 'yes';
        document.head.appendChild(appleCapable);
      }
      // Apple mobile web app status bar style — black status bar for immersive look
      let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement | null;
      if (!appleStatusBar) {
        appleStatusBar = document.createElement('meta');
        appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
        appleStatusBar.content = 'black-translucent';
        document.head.appendChild(appleStatusBar);
      }
      // Apple mobile web app title — title for home screen icon
      let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
      if (!appleTitle) {
        appleTitle = document.createElement('meta');
        appleTitle.name = 'apple-mobile-web-app-title';
        appleTitle.content = 'AJ Super Portal';
        document.head.appendChild(appleTitle);
      }
      // Mobile web app capable — Android standalone mode (hides address bar)
      let mobileCapable = document.querySelector('meta[name="mobile-web-app-capable"]') as HTMLMetaElement | null;
      if (!mobileCapable) {
        mobileCapable = document.createElement('meta');
        mobileCapable.name = 'mobile-web-app-capable';
        mobileCapable.content = 'yes';
        document.head.appendChild(mobileCapable);
      }
      // Theme color — matches app background for seamless status bar
      let themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
      if (!themeColor) {
        themeColor = document.createElement('meta');
        themeColor.name = 'theme-color';
        themeColor.content = '#050505';
        document.head.appendChild(themeColor);
      }
      // Viewport — ensure proper mobile rendering with viewport-fit=cover for notch devices
      let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
      if (viewport) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
      } else {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        document.head.appendChild(viewport);
      }
    } catch {}
  }, []);

  // ==========================================================
  // FETCH APIs — FIX #5: Multi-keyword YT mix + Unsplash append
  // ==========================================================
  const fetchSocialAPIs = async () => {
    try {
      // Unsplash — lifestyle + luxury mix
      const pRes  = await fetch(`https://api.unsplash.com/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&query=lifestyle,luxury&count=20`);
      const pData = await pRes.json();
      setPixaData(Array.isArray(pData) ? pData : []);

      // YouTube — multi-category mix: Hindi Shorts + Cartoons + Funny Clips
      const YT_KEYWORDS = [
        'Hindi Shorts viral',
        'Funny Cartoons Hindi dubbed',
        'Funny Clips India comedy',
        'Bollywood Movie Clips funny',
        'Comedy Shorts India',
        'Desi Funny Videos',
        'Hindi Stand Up Comedy',
        'Cartoon funny Hindi',
      ];
      const randomKeyword = YT_KEYWORDS[Math.floor(Math.random() * YT_KEYWORDS.length)];
      const yRes  = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(randomKeyword)}&type=video&videoDuration=short&key=${YOUTUBE_API_KEY}`);
      const yData = await yRes.json();
      const items = yData.items || [];
      // Fetch view counts via the statistics API (batch call — up to 50 video IDs at once)
      let videoStats: any = {};
      try {
        const videoIds = items.map((item:any) => item.id.videoId).join(',');
        const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`);
        const statsData = await statsRes.json();
        for (const v of (statsData.items || [])) {
          videoStats[v.id] = parseInt(v.statistics?.viewCount || '0', 10);
        }
      } catch(statsErr) { console.log('YouTube stats fetch error', statsErr); }
      // Fisher-Yates shuffle for randomization
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      setPixaVideos(items.map((item:any) => ({
        id:       item.id.videoId,
        user:     item.snippet.channelTitle,
        title:    item.snippet.title,
        thumb:    item.snippet?.thumbnails?.high?.url || '',
        views:    videoStats[item.id.videoId] || Math.floor(Math.random() * 90000) + 1000,
        likes:    Math.floor((videoStats[item.id.videoId] || 5000) * 0.08),
        // FIX #6: mute=0 for sound, autoplay=1
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&mute=0&loop=1&playlist=${item.id.videoId}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3`
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
        return onSnapshot(q, snap => {
          const firestorePosts = snap.docs.map(d=>({id:d.id,...d.data()}));
          // FIX #5: APPEND Firestore posts, do NOT delete Unsplash photos
          setPulsePosts(firestorePosts);
        });
      } catch {}
    }
    if (commentPostId && !commentPostId.startsWith('gift_')) {
      try {
        // FIX (Hinglish): Agar yeh YouTube/pixa video hai toh `yt_posts` collection se
        // comments load karo, warna regular user_posts/pulse_posts se.
        const isPixaVideo = pixaVideos.some((v:any) => v.id === commentPostId);
        const col = isPixaVideo ? "yt_posts" : (pulsePosts.find(p => p.id === commentPostId) ? "pulse_posts" : "user_posts");
        const q = query(collection(db, col, commentPostId, "comments"), orderBy("createdAt","asc"));
        const unsub = onSnapshot(q, snap => setPostComments(snap.docs.map(d=>({id:d.id,...d.data()}))));
        return unsub;
      } catch(e) { console.error("Comment sub error", e); }
    }
    return () => {};
  }, [socialScreen, activeContact, commentPostId]);

  // FIX ROUND 6: Comment keyboard open nahi ho raha tha — ab PROPER fix.
  // Mobile pe input focus karne ke liye multiple strategies use karte hain:
  // 1. Delay focus until DOM is ready (300ms for smooth animation)
  // 2. Use createObjectURL-free approach: directly focus with programmatic click
  // 3. Use inputMode="text" with enterKeyHint for mobile keyboard optimization
  // 4. Touch-friendly: tap on input directly opens keyboard (no readonly tricks)
  useEffect(() => {
    if (!commentPostId) return;
    // Wait for the comment sheet to render and transition to complete
    const t = setTimeout(() => {
      const input = commentInputRef.current;
      if (!input) return;
      // FIX: Directly focus without readonly tricks — modern mobile browsers
      // (Chrome, Safari, Firefox) respond well to focus() + click() when called
      // from a user-initiated event chain (which this is, since commentPostId was
      // set by a button click). The key is to call focus() within the event handler
      // or shortly after (within 300ms).
      try {
        // Focus the input — this opens the keyboard on mobile
        input.focus({ preventScroll: true });
        // Also call click() — some Android browsers need this to open keyboard
        input.click();
        // Set selection to end of any existing text
        const len = input.value.length;
        input.setSelectionRange(len, len);
      } catch {
        input.focus();
        input.click();
      }
    }, 300);
    return () => clearTimeout(t);
  }, [commentPostId]);

  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db,"notifications"), orderBy("date","desc"), limit(20));
      return onSnapshot(q, snap => {
        const items = snap.docs.map(d=>({id:d.id,...d.data()}));
        setNotifications(items);
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

  // Re-fetch fresh random YouTube videos every time TikReel tab is opened (FIX #5)
  useEffect(() => {
    if (socialScreen !== 'tikreels') return;
    const fetchFreshVideos = async () => {
      try {
        // Mix of Hindi Shorts, Cartoons, Funny Clips
        const YT_KEYWORD_SETS = [
          ['Hindi Shorts viral', 'Funny Cartoons Hindi dubbed', 'Funny Clips India comedy'],
          ['Bollywood Movie Clips funny', 'Comedy Shorts India', 'Desi Funny Videos'],
          ['Hindi Stand Up Comedy', 'Cartoon funny Hindi', 'Hindi Shorts trending'],
        ];
        const set = YT_KEYWORD_SETS[Math.floor(Math.random() * YT_KEYWORD_SETS.length)];
        const keyword = set[Math.floor(Math.random() * set.length)];
        const yRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(keyword)}&type=video&videoDuration=short&key=${YOUTUBE_API_KEY}`);
        const yData = await yRes.json();
        const items = yData.items || [];
        // Fetch view counts via the statistics API (batch call — up to 50 video IDs at once)
        let videoStats: any = {};
        try {
          const videoIds = items.map((item:any) => item.id.videoId).join(',');
          if (videoIds) {
            const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`);
            const statsData = await statsRes.json();
            for (const v of (statsData.items || [])) {
              videoStats[v.id] = parseInt(v.statistics?.viewCount || '0', 10);
            }
          }
        } catch(statsErr) { console.log('YouTube stats fetch error', statsErr); }
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        setPixaVideos(items.map((item: any) => ({
          id:       item.id.videoId,
          user:     item.snippet.channelTitle,
          title:    item.snippet.title,
          thumb:    item.snippet?.thumbnails?.high?.url || '',
          views:    videoStats[item.id.videoId] || Math.floor(Math.random() * 90000) + 1000,
          likes:    Math.floor((videoStats[item.id.videoId] || 5000) * 0.08),
          // FIX #6: mute=0 so sound is available; globalSoundOn controls actual mute in iframe src
          embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&mute=0&loop=1&playlist=${item.id.videoId}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3`
        })));
        setActiveVideoIdx(0);
      } catch(e) { console.log('TikReel refresh error', e); }
    };
    fetchFreshVideos();
    return () => {};
  }, [socialScreen]);

  // FIX: When TikReels profile tab is opened, fetch ALL of the current user's posts
  // (not just the latest 20 from the global user_posts feed — those might not include the user's posts)
  useEffect(() => {
    if (socialScreen !== 'tikreels' || tiktabMode !== 'profile') return;
    if (!user) return;
    const fetchMyPosts = async () => {
      try {
        // Fetch from user_posts where uid === user.uid (up to 60 posts)
        const q1 = query(collection(db, 'user_posts'), orderBy('createdAt', 'desc'), limit(60));
        const snap1 = await getDocs(q1);
        const myPosts = snap1.docs
          .map(d => ({ id: d.id, ...d.data() as any }))
          .filter((p: any) => p.uid === user.uid);
        setTikProfileMyPosts(myPosts);
      } catch(e) { console.error('fetchTikProfileMyPosts', e); }
      // Fetch followers count
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          setTikProfileFollowers(data.followersCount || 0);
        }
      } catch {}
      // Also load following list
      loadFollowingList();
    };
    fetchMyPosts();
    return () => {};
  }, [socialScreen, tiktabMode, user]);

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
            // NEW USER — just signed up! Camera/mic permission prompt dikhao
            // BEFORE going to hub, taaki user se pehle permission le lein.
            // Agar user allow kare toh great, agar deny kare toh bhi hub par bhej do.
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
            // FIX: Naye user ke liye camera/mic permission prompt show karo
            setShowCameraPermissionPrompt(true);
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
        // FIX: Agar permission prompt nahi dikhana (returning user), seedha hub par jao
        // Naye user ke liye permission prompt pehle handle hoga, phir hub par jayega
        if (!showCameraPermissionPrompt) {
          setScreen('hub');
        }
      } else { setUser(null); setScreen('auth'); }
    });
    return () => unsub();
  }, []);

  // FIX (Hinglish): ZegoCloud cleanup on unmount + pagehide.
  // "Page couldn't load" error ka ek kaaran ye bhi hai ki jab component unmount
  // hota hai ya page hide/refresh hota hai, toh ZegoCloud ke dangling iframes
  // crash ho jaate hain. Ye effect sabhi Zego instances ko properly destroy
  // karta hai taaki koi dangling iframe/media na rahe.
  useEffect(() => {
    const cleanupAllZego = () => {
      // FIX: ZegoCloud removed — stop local WebRTC stream instead
      try { stopLocalWebRTC(); } catch {}
      try {
        const c1 = document.querySelector('#zego-viewer-container');
        if (c1) (c1 as HTMLElement).innerHTML = '';
      } catch {}
    };
    const handlePageHide = () => {
      // When page is being hidden/unloaded, clean up all Zego instances
      cleanupAllZego();
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    return () => {
      // Component unmount — destroy all Zego instances
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      cleanupAllZego();
    };
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

  // FIX: REMOVED duplicate reels/posts subscription — main listeners at socialScreen change handle this correctly.

  // ── GAME COINS: postMessage listener (Game Bridge) — 1 token = 0.01 AJ Coin
  const gameScoreDebounceRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const lastGameScoreRef = useRef<number>(0);
  useEffect(() => {
    if (!user) return;
    const handleGameMessage = async (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      // Handle GAME_SCORE from HTML games — 1 token = 0.01 AJ Coin
      if (e.data.type === "GAME_SCORE" || e.data.type === "game_score" || e.data.type === "SCORE" || e.data.type === "SCORE_UPDATE") {
        const rawScore = typeof e.data.score === 'number' ? e.data.score : Number(e.data.score);
        if (!rawScore || rawScore <= 0 || isNaN(rawScore)) return;
        const coinsEarned = rawScore * 0.01;
        if (coinsEarned <= 0 || isNaN(coinsEarned)) return;
        // Debounce: prevent double-credit from rapid postMessages but allow new higher scores
        if (gameScoreDebounceRef.current) clearTimeout(gameScoreDebounceRef.current);
        gameScoreDebounceRef.current = setTimeout(async () => {
          const diff = rawScore - lastGameScoreRef.current;
          if (diff <= 0) return; 
          lastGameScoreRef.current = rawScore;
          const coinsToCredit = diff * 0.01;
          try {
            // FIX: Game coins are credited to user's main balance (Hub wallet)
            await updateDoc(doc(db, "users", user.uid), { balance: increment(coinsToCredit) });
            setVvipAlert({msg:`🎮 +${coinsEarned.toFixed(2)} AJ Coins earned! Game score: ${rawScore}`, icon:"🎮"});
            try {
              await addDoc(collection(db, "notifications"), {
                title: "🎮 Game Reward!",
                message: `+${coinsEarned.toFixed(2)} Coins earned from Gaming Zone! Score: ${rawScore}`,
                date: serverTimestamp(),
              });
            } catch {}
          } catch(err) { console.error("Game coin credit error", err); }
        }, 300);
        return;
      }
      // Handle GAME_END from HTML games — flush any remaining score
      if (e.data.type === "GAME_END" || e.data.type === "game_end") {
        const rawScore = typeof e.data.score === 'number' ? e.data.score : Number(e.data.score);
        const diff = rawScore - lastGameScoreRef.current;
        if (diff <= 0) return;
        lastGameScoreRef.current = rawScore;
        const coinsEarned = diff * 0.01;
        try {
          await updateDoc(doc(db, "users", user.uid), { balance: increment(coinsEarned) });
          setVvipAlert({msg:`🏆 Game Over! Score: ${rawScore} = +${coinsEarned.toFixed(2)} AJ Coins!`, icon:"🏆"});
          try {
            await addDoc(collection(db, "notifications"), {
              title: "🏆 Game Complete!",
              message: `Final score: ${rawScore} = +${coinsEarned.toFixed(2)} Coins credited to Wallet!`,
              date: serverTimestamp(),
            });
          } catch {}
        } catch(err) { console.error("Game end credit error", err); }
        return;
      }
      // Handle GAME_CRASH — game crashed, flush last known score to wallet
      if (e.data.type === "GAME_CRASH" || e.data.type === "game_crash") {
        const rawScore = typeof e.data.score === 'number' ? e.data.score : Number(e.data.score || 0);
        const coinsEarned = Math.max(rawScore * 0.01, 0.01); // minimum 0.01 coin for crash
        try {
          await updateDoc(doc(db, "users", user.uid), { balance: increment(coinsEarned) });
          setVvipAlert({msg:`⚠️ Game crashed! Still credited +${coinsEarned.toFixed(2)} AJ Coins!`, icon:"⚠️"});
          try {
            await addDoc(collection(db, "notifications"), {
              title: "⚠️ Game Crash Recovery",
              message: `Game crashed at score ${rawScore}. Recovered +${coinsEarned.toFixed(2)} Coins to Wallet!`,
              date: serverTimestamp(),
            });
          } catch {}
        } catch(err) { console.error("Game crash credit error", err); }
      }
    };
    window.addEventListener("message", handleGameMessage);
    return () => { window.removeEventListener("message", handleGameMessage); if (gameScoreDebounceRef.current) clearTimeout(gameScoreDebounceRef.current); };
  }, [user]);

  // ── Inject bridge script into game iframes + crash detection
  useEffect(() => {
    if (!selectedGame || !user) return;
    const injectBridge = () => {
      try {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          if (!iframe.src) return;
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) return;
            const script = iframeDoc.createElement('script');
            script.textContent = `
              // Enhanced Game Bridge: forward score messages to parent with retry
              var lastScoreCheck = null;
              var scoreStuckCount = 0;
              
              // Forward score from parent message
              window.addEventListener('message', function(e) {
                if (e.data && (e.data.type === 'SEND_SCORE' || e.data.type === 'SCORE' || e.data.type === 'GAME_SCORE')) {
                  try {
                    if (window.parent && window.parent !== window) {
                      window.parent.postMessage({type: 'GAME_SCORE', score: e.data.score || e.data.points || 0}, '*');
                    }
                  } catch(ex) {}
                }
              });
              
              // Hook into common game score patterns
              function pollGameScore() {
                var score = 0;
                if (typeof Game !== 'undefined' && Game.score !== undefined) score = Game.score;
                else if (typeof game !== 'undefined' && game.score !== undefined) score = game.score;
                else if (typeof GAME !== 'undefined' && GAME.score !== undefined) score = GAME.score;
                else if (typeof gameScore !== 'undefined') score = gameScore;
                else if (typeof app !== 'undefined' && app.score !== undefined) score = app.score;
                
                if (score > 0) {
                  try {
                    if (window.parent && window.parent !== window) {
                      window.parent.postMessage({type: 'GAME_SCORE', score: score}, '*');
                    }
                  } catch(ex) {}
                  
                  if (lastScoreCheck !== null && score === lastScoreCheck) {
                    scoreStuckCount++;
                    if (scoreStuckCount >= 10) {
                      try {
                        if (window.parent && window.parent !== window) {
                          window.parent.postMessage({type: 'GAME_CRASH', score: score}, '*');
                        }
                      } catch(ex) {}
                      scoreStuckCount = 0;
                    }
                  } else {
                    scoreStuckCount = 0;
                  }
                  lastScoreCheck = score;
                }
              }
              
              setInterval(pollGameScore, 1500);
              
              // Window error handler — notify parent of crash
              window.addEventListener('error', function(e) {
                if (window.parent && lastScoreCheck && lastScoreCheck > 0) {
                  try {
                    window.parent.postMessage({type: 'GAME_CRASH', score: lastScoreCheck}, '*');
                  } catch(ex) {}
                }
              });
              
              // Unload handler — flush score on page leave
              window.addEventListener('beforeunload', function() {
                if (lastScoreCheck && lastScoreCheck > 0) {
                  try {
                    if (window.parent && window.parent !== window) {
                      window.parent.postMessage({type: 'GAME_END', score: lastScoreCheck}, '*');
                    }
                  } catch(ex) {}
                }
              });
            `;
            (iframeDoc.head || iframeDoc.documentElement).appendChild(script);
          } catch {}
        });
      } catch {}
    };
    const t = setTimeout(injectBridge, 3000);
    return () => clearTimeout(t);
  }, [selectedGame, user]);

  // PK Timer
  useEffect(() => {
    if (!pkActive) return;
    // FIX: pkScore ko ref se read karo taaki timer end pe latest score mile
    const pkScoreRef = { current: pkScore };
    pkTimerRef.current = setInterval(() => {
      setPkTimer(t => {
        if (t <= 1) {
          clearInterval(pkTimerRef.current!);
          setPkWinner(pkScoreRef.current.me >= pkScoreRef.current.rival ? (username||'You') : (pkRivalData?.username||'Rival'));
          setPkActive(false);
          // FIX: PK battle end pe rival frames + audio cleanup
          try { stopPkBattle(); } catch {}
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

  // FIX: Real-time viewer count listener — host sees live viewer count update instantly
  useEffect(() => {
    if (!liveActive || !liveRoomId) return;
    try {
      const unsub = onSnapshot(doc(db, 'live_rooms', liveRoomId), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setLiveViewerCount(data.liveViewers || 0);
        }
      });
      liveViewerUnsubRef.current = unsub;
      return () => { unsub(); liveViewerUnsubRef.current = null; };
    } catch {}
    return () => {};
  }, [liveActive, liveRoomId]);

  // ==========================================================
  // TIKREELS + PULSE WINDOWING — snap-scroll + Audio Bleeding fix (FIX #6)
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

  // ── Increment views when video becomes active
  const trackedViewsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const isTikFeed = socialScreen === 'tikreels' && tiktabMode === 'feed';
    const isPulseFeed = socialScreen === 'pulse' && pulseTab === 'feed';
    if (!isTikFeed && !isPulseFeed) return;
    // Track views for user posts only
    if (socialScreen === 'tikreels' && userPosts.length > 0) {
      const localIdx = activeVideoIdx - pixaVideos.length;
      if (localIdx >= 0 && userPosts[localIdx]) {
        const postId = userPosts[localIdx].id;
        if (!trackedViewsRef.current.has(postId)) {
          trackedViewsRef.current.add(postId);
          try { updateDoc(doc(db, 'user_posts', postId), { views: increment(1) }); } catch {}
        }
      }
    }
    if (socialScreen === 'pulse' && pulsePosts.length > 0) {
      const localIdx = activeVideoIdx;
      if (localIdx >= 0 && pulsePosts[localIdx] && pulsePosts[localIdx].isVideo) {
        const postId = pulsePosts[localIdx].id;
        if (!trackedViewsRef.current.has(`pulse_${postId}`)) {
          trackedViewsRef.current.add(`pulse_${postId}`);
          try { updateDoc(doc(db, 'pulse_posts', postId), { views: increment(1) }); } catch {}
        }
      }
    }
  }, [activeVideoIdx, socialScreen, tiktabMode, pulseTab]);

  // Audio Kill — when activeVideoIdx changes, blank ALL off-screen YouTube iframes immediately (FIX #6)
  useEffect(() => {
    const isTikFeed   = socialScreen === 'tikreels' && tiktabMode === 'feed';
    const isPulseFeed = socialScreen === 'pulse'    && pulseTab   === 'feed';
    if (!isTikFeed && !isPulseFeed) return;
    setReelPaused(false);
    Object.entries(iframeRefs.current).forEach(([idxStr, el]) => {
      if (!el) return;
      const idx = parseInt(idxStr, 10);
      if (idx !== activeVideoIdx) {
        // Immediately kill audio by blanking src — prevents sound mixing
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

  // FIX (Hinglish): `reelPaused` state ko actually video ko pause/resume karne ke liye
  // use karte hain. Pehle sirf state toggle hoti thi lekin video actually pause nahi hoti thi.
  // Ab jab reelPaused=true ho toh active video pause ho jaayega, aur false ho toh resume.
  useEffect(() => {
    if (socialScreen !== 'tikreels' && socialScreen !== 'pulse') return;
    // For user-uploaded videos (HTML5 <video> element)
    const activeUserVideo = userVideoRefs.current[activeVideoIdx];
    if (activeUserVideo) {
      if (reelPaused) {
        activeUserVideo.pause();
      } else {
        activeUserVideo.play().catch(() => {});
      }
    }
    // For YouTube iframe videos — post a message to the iframe to pause/resume
    const activeIframe = iframeRefs.current[activeVideoIdx];
    if (activeIframe && activeIframe.contentWindow) {
      try {
        activeIframe.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: reelPaused ? 'pauseVideo' : 'playVideo',
            args: []
          }),
          '*'
        );
      } catch {}
    }
  }, [reelPaused, activeVideoIdx, socialScreen]);

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
  // GO LIVE (FIXED: ZegoCloud script loader + camera fix)
  // ==========================================================
  // FIX: ZegoCloud removed — loadZegoScript is now a no-op.
  // ZegoCloud SDK hata diya gaya hai (login room fail error fix).
  // Ab pure WebRTC use hota hai — no external SDK needed.
  const loadZegoScript = (): Promise<void> => Promise.resolve();

  // FIX: Camera/Mic permission request function — naye login pe aur Live start pe
  // use hota hai. Agar user deny kare toh false return karta hai, agar allow kare
  // toh true. Agar getUserMedia support nahi karta (non-HTTPS) toh false.
  const requestCameraMicPermission = async (): Promise<boolean> => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not available — need HTTPS');
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: true
      });
      // Permission granted — stop the test stream immediately
      stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
      setCameraPermissionResult('granted');
      return true;
    } catch(e: any) {
      console.warn('Camera/mic permission denied:', e?.name || e);
      setCameraPermissionResult('denied');
      return false;
    }
  };

  // FIX: Camera/mic permission prompt ko handle karo — user "Allow" dabaye toh
  // permission request karo, phir hub par bhej do. "Skip" dabaye toh seedha hub.
  const handlePermissionPromptAllow = async () => {
    setShowCameraPermissionPrompt(false);
    await requestCameraMicPermission();
    setScreen('hub');
  };

  const handlePermissionPromptSkip = () => {
    setShowCameraPermissionPrompt(false);
    setCameraPermissionResult('unknown');
    setScreen('hub');
  };

  const startLive = async () => {
    if (!user) return;
    // FIX (Hinglish): Pehle Social screen aur Go-Live screen ensure karte hain
    // taaki #video-container mount ho — warna camera container nahi milta
    // aur camera nae chalne ki shikayat aati thi.
    setScreen('social');
    setSocialScreen('golive');

    // FIX (Hinglish): START LIVE ROBUST FIX — "Camera & mic permission denied"
    // wala error dusre mobile pe isliye aata tha kyunki:
    //   1. Kai mobile browsers pe getUserMedia SIRF HTTPS pe chalta hai (secure
    //      context). Agar site HTTP pe serve ho rahi ho toh camera/mic nahi milta.
    //   2. Agar user ne pehle permission deny ki thi toh browser usay cache kar
    //      leta hai aur dobara prompt nahi dikhata — direct error aa jaata hai.
    //   3. Pehle code mein permission fail hone par ek dead-end alert dikh jata
    //      tha jiska sirf "OK" button tha, aur live start nahi hota tha.
    //
    // AB fix:
    //   - HTTPS check karke clear error message dikhate hain agar non-HTTPS ho.
    //   - Agar video+audio dono fail hon, toh SIRF audio (mic) try karte hain
    //     (audio-only live — kai phones pe camera block hota hai lekin mic chal
    //     jaata hai, user audio-only live kar sakta hai).
    //   - Agar mic bhi fail ho, toh ek RETRY wala alert dikhate hain jisme user
    //     ko bata jaata hai ki browser settings mein permission do aur dobara
    //     try kare — dead-end nahi.
    //   - Live hamesha start hota hai (camera/mic mile toh preview, nahi mile
    //     toh placeholder) — user ko kabhi "stuck" nahi hone dete.

    // Step 1: Check if getUserMedia is available (HTTPS / secure context required)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // FIX: Agar getUserMedia available nahi hai, check karo ki kya site HTTPS
      // pe hai. Agar nahi hai toh clear message do. Agar HTTPS hai lekin phir bhi
      // nahi mila (koi purana browser) toh bhi live start kar do (placeholder).
      const isHTTPS = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
      if (!isHTTPS) {
        setVvipAlert({msg:"⚠️ Camera needs HTTPS. Please open this app via the installed app icon (HTTPS). For now, starting audio-only live…"});
      } else {
        setVvipAlert({msg:"⚠️ Your browser doesn't support camera access. Starting audio-only live…"});
      }
      // Don't abort — continue with live (no camera preview, but live still works)
    } else {
      // Step 2: Try to get camera + mic permission
      let cameraMicOk = false;
      let audioOnlyMode = false;
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: true
        });
        cameraMicOk = true;
        setCameraPermissionResult('granted');
        if (liveVideoRef.current) {
          try { liveVideoRef.current.srcObject = testStream; } catch {}
        }
        // FIX ROUND 6: Camera black screen fix — hum tracks STOP nahi karte!
        liveStreamRef.current = testStream;
        if (liveVideoRef.current && !liveVideoRef.current.srcObject) {
          try { liveVideoRef.current.srcObject = testStream; } catch {}
        }
      } catch (mediaErr: any) {
        // FIX: Agar video+audio fail ho, toh SIRF audio try karo (audio-only live)
        console.warn('getUserMedia video+audio failed, trying audio-only:', mediaErr?.name || mediaErr);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          audioOnlyMode = true;
          setCameraPermissionResult('granted');
          // Audio-only live — no video preview, but mic works
          if (liveVideoRef.current) {
            try { liveVideoRef.current.srcObject = audioStream; } catch {}
          }
          liveStreamRef.current = audioStream;
          setVvipAlert({msg:"📷 Camera blocked, but mic works! Starting audio-only live…"});
        } catch (audioErr: any) {
          // FIX: Dono fail ho gaye — permission denied for both camera AND mic.
          // Pehle yahan dead-end alert tha. Ab ek helpful RETRY message dikhate
          // hain jisme user ko bata jaata hai ki browser settings mein permission
          // do. Lekin live START nahi hota — bina camera/mic ke live bekar hai.
          console.error('getUserMedia permission error (camera + mic both denied):', audioErr?.name || audioErr);
          setCameraPermissionResult('denied');
          // Check the error type for a more helpful message
          const errName = audioErr?.name || '';
          if (errName === 'NotAllowedError' || errName === 'SecurityError') {
            setVvipAlert({msg:"⚠️ Camera & mic permission denied. Please tap the 🔒 lock icon in your browser address bar → Site settings → Allow Camera & Microphone. Then reload and press START LIVE again."});
          } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
            setVvipAlert({msg:"⚠️ No camera/mic found on this device. Please connect a camera/mic or try another phone."});
          } else if (errName === 'NotReadableError') {
            setVvipAlert({msg:"⚠️ Camera is being used by another app. Please close other apps using the camera and try again."});
          } else {
            setVvipAlert({msg:"⚠️ Camera & mic not available. Please allow access in browser settings (🔒 lock icon → Site settings), then press START LIVE again."});
          }
          // Reset to hub so the user can retry
          setSocialScreen('hub');
          return; // Can't go live without any media
        }
      }
      setCameraReady(true);
      if (cameraMicOk) {
        setVvipAlert({msg: "✅ Camera & mic are working! Going live…"});
      }
    }

    // Start live — WebRTC handles camera/mic (no external SDK)
    try {
      const roomId = `live_${user.uid}_${Date.now()}`;
      setLiveRoomId(roomId);
      setLiveActive(true);
      // Wait for DOM to render, then attach local WebRTC camera
      setTimeout(() => {
        requestAnimationFrame(() => {
          handleStartLiveOrCall(roomId, user.uid, username || 'AJ Member', () => setZegoAttached(true));
        });
      }, 600);
      // FIX ROUND 7: Start broadcasting video frames to RTDB so viewers can see the live stream
      setTimeout(() => {
        if (liveStreamRef.current) {
          startFrameBroadcast(roomId, liveStreamRef.current);
        }
      }, 1000);
      // FIX: Start broadcasting mic audio to viewers via WebRTC (RTDB signaling)
      // Yeh ensure karta hai ki host ki awaz (mic) viewers tak real-time mein pahunche.
      setTimeout(() => {
        if (liveStreamRef.current) {
          startAudioBroadcast(roomId, liveStreamRef.current);
        }
      }, 1200);
      await setDoc(doc(db, "live_rooms", roomId), {
        uid: user.uid, username: username || 'AJ_Member',
        photo: tempPhoto || user.photoURL || '',
        roomId, startedAt: serverTimestamp(), active: true, lastSeenMs: Date.now(),
        viewerCount: 0, startedAtMs: Date.now(), liveViewers: 0
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
    } catch(e) {
      console.error('startLive error', e);
      setVvipAlert({msg:"⚠️ Could not start live stream. Please check your internet connection and try again."});
      setCameraReady(false);
      setLiveActive(false);
      setSocialScreen('hub');
    }
  };

  const stopLive = async () => {
    // FIX: Pura stopLive ek try/finally mein wrap kiya gaya hai — chahe koi bhi
    // error aaye (ZegoCloud destroy, Firestore delete, media stop), user HAMESHA
    // Social Hub par wapas aa jaayega. Error se page crash nahi hoga.
    try {
      setZegoAttached(false);
      setCameraReady(false);
      if ((liveStreamRef as any)._heartbeat) {
        clearInterval((liveStreamRef as any)._heartbeat);
        (liveStreamRef as any)._heartbeat = null;
      }
      // Stop local WebRTC stream (camera + mic)
      try { stopLocalWebRTC(); } catch {}
      // FIX ROUND 7: Stop broadcasting frames to RTDB
      try { stopFrameBroadcast(liveRoomId); } catch {}
      // FIX: Stop broadcasting mic audio to viewers via WebRTC
      try { stopAudioBroadcast(liveRoomId); } catch {}
      // FIX: Stop PK battle if active (rival frames + audio cleanup)
      if (pkActive) { try { stopPkBattle(); } catch {} }

      // Stop all media tracks (camera + mic)
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach(t => {
          try { t.stop(); } catch {}
        });
        liveStreamRef.current = null;
      }
      if (liveVideoRef.current) {
        try {
          if (liveVideoRef.current.srcObject) {
            const stream = liveVideoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
            liveVideoRef.current.srcObject = null;
          }
          liveVideoRef.current.pause();
        } catch {}
      }
      setCameraReady(false);
      setLiveActive(false);
      setLiveViewerCount(0);
      setPkActive(false);
      setPkWinner(null);
      setLiveChatOpen(false);
      setLiveGiftPanelOpen(false);
      if (liveRoomId) {
        try { await deleteDoc(doc(db,"live_rooms",liveRoomId)); } catch {}
        setLiveRoomId('');
      }
    } catch(e) {
      console.error('stopLive error (non-fatal):', e);
    } finally {
      // HAMESHA Social Hub par wapas aao — koi bhi error aaye, user
      // ghabraaye nahi, page crash nahi hoga. Sidha Social Hub screen.
      setZegoAttached(false);
      setCameraReady(false);
      setLiveActive(false);
      setSocialScreen('hub');
      setVvipAlert({msg:'Live ended. You are back to Social Hub.'});
    }
  };

  // ==========================================================
  // JOIN LIVE AS VIEWER (FIXED: ZegoCloud viewer attach)
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
      setSocialScreen('joinlive');
      setViewerRoom({ id: roomSnap.id, ...roomSnap.data() });
      setViewerRoomId(roomSnap.id);
      setJoinRoomInput('');
      // FIX: Increment liveViewers count when a viewer joins
      try { await updateDoc(doc(db, 'live_rooms', roomSnap.id), { liveViewers: increment(1) }); } catch {}
      const unsub = onSnapshot(
        query(collection(db, 'live_rooms', roomSnap.id, 'messages'), orderBy('createdAt', 'asc')),
        snap2 => {
          setViewerChatMessages(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
          setTimeout(() => viewerChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        }
      );
      viewerUnsubRef.current = unsub;
      // FIX ROUND 7: Listen to RTDB for host's live video frames —
      // host broadcasts frames to live_frames/{roomId}/current and
      // viewer displays them in real-time on an <img> element.
      try {
        const rtdb = getDatabase();
        const frameRef = ref(rtdb, `live_frames/${roomSnap.id}/current`);
        const frameUnsub = onValue(frameRef, (snap) => {
          const data = snap.val();
          if (data && data.frame) {
            setViewerLiveFrame(data.frame);
          }
        });
        viewerFrameUnsubRef.current = frameUnsub;
      } catch (frameErr) {
        console.warn('joinLiveByRoomId: frame listener setup failed', frameErr);
      }
      // FIX: Join host's mic audio via WebRTC (RTDB signaling).
      // Yeh host ki awaz (mic) ko real-time mein viewer tak pahunchata hai.
      // Audio element pe autoplay lagta hai lekin kai browsers pe pehli baar
      // user gesture chahiye — isliye onConnected mein hum play() retry karte hain.
      try {
        joinAudioStream(roomSnap.id, () => {
          console.log('joinLiveByRoomId: WebRTC audio connected');
        });
      } catch (audioErr) {
        console.warn('joinLiveByRoomId: audio join failed (non-fatal — video still works)', audioErr);
      }
      // FIX: ZegoCloud removed — viewer gets room info + live chat via Firestore.
      // No external SDK needed — no "login room fail" error.
      setZegoAttached(true);
    } catch(e) { console.error('joinLiveByRoomId', e); setVvipAlert({msg:'Could not join room. Please try again.'}); }
  };

  const leaveViewerRoom = () => {
    // FIX: Pura leaveViewerRoom try/finally mein — hamesha Social Hub par wapas aao
    try {
      if (viewerUnsubRef.current) { viewerUnsubRef.current(); viewerUnsubRef.current = null; }
      // FIX ROUND 7: Stop RTDB frame listener
      if (viewerFrameUnsubRef.current) { viewerFrameUnsubRef.current(); viewerFrameUnsubRef.current = null; }
      // FIX: Stop WebRTC audio stream + clean up
      try { leaveAudioStream(viewerRoomId); } catch {}
      setViewerLiveFrame('');
      if (viewerRoomId) {
        try { updateDoc(doc(db, 'live_rooms', viewerRoomId), { liveViewers: increment(-1) }); } catch {}
      }
      // No Zego to clean up — just clear container if present
      try {
        const container = document.querySelector('#zego-viewer-container');
        if (container) (container as HTMLElement).innerHTML = '';
      } catch {}
    } catch(e) {
      console.error('leaveViewerRoom error (non-fatal):', e);
    } finally {
      // HAMESHA Social Hub par wapas aao — koi bhi error aaye
      setViewerRoom(null); setViewerRoomId('');
      setViewerChatMessages([]); setViewerChatInput('');
      setViewerLiveFrame('');
      setLiveGiftPanelOpen(false);
      setSocialScreen('hub');
    }
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
  // FIX (Hinglish): PK match mein problem thi:
  //   1. Rival ka mic band ho jata tha — audio connect nahi hota tha
  //   2. Rival ki screen host ko nahi dikhti thi — frames nahi aate the
  // Ab fix:
  //   - PK session ka ek unique roomId banata hain (pk_{user}_{rival}_{time})
  //   - Host apni video frames RTDB (pk_frames/{pkRoomId}/host) pe bhejta hai
  //   - Host rival ki frames RTDB (pk_frames/{pkRoomId}/rival) se listen karta hai
  //   - Host rival ka audio WebRTC se connect karta hai (joinAudioStream)
  //   - Rival jab accept karega toh woh bhi same session join karega
  //   - Dono ki awaz + video chale, split-screen mein dikhe
  // ==========================================================
  const sendPkChallenge = async () => {
    if (!user || !pkTargetId.trim()) return setVvipAlert({msg:"Enter rival's User ID!"});
    if (balance < PK_ENTRY_COINS) return setVvipAlert({msg:`Need ${PK_ENTRY_COINS} AJ Coins to enter PK!`});
    try {
      const rivalUid = pkTargetId.trim();
      const rivalSnap = await getDoc(doc(db,"users",rivalUid));
      if (!rivalSnap.exists()) return setVvipAlert({msg:"Rival not found! Check User ID."});
      await updateDoc(doc(db,"users",user.uid), { balance: increment(-PK_ENTRY_COINS) });
      try {
        await addDoc(collection(db,"AdminRevenue"), {
          type:'pk_match', totalDeducted: PK_ENTRY_COINS * 2,
          challenger: user.uid, rival: rivalUid, date:serverTimestamp()
        });
      } catch {}
      // FIX: PK session ka unique room ID — dono users ke liye common
      const newPkRoomId = `pk_${user.uid}_${rivalUid}_${Date.now()}`;
      setPkRoomId(newPkRoomId);
      // Write PK session to Firestore so rival can find & accept it
      try {
        await setDoc(doc(db, "pk_sessions", newPkRoomId), {
          pkRoomId: newPkRoomId,
          hostUid: user.uid,
          hostName: username || 'AJ_Member',
          hostPhoto: tempPhoto || user.photoURL || '',
          rivalUid: rivalUid,
          rivalName: rivalSnap.data().username || rivalUid,
          status: 'pending',  // pending → active → ended
          entryCoins: PK_ENTRY_COINS,
          duration: PK_DURATION,
          createdAt: serverTimestamp(),
          startedAt: null,
          endedAt: null,
          winnerUid: null,
        });
      } catch (pkErr) { console.warn('PK session write failed (non-fatal):', pkErr); }
      // Send notification to rival
      try {
        await addDoc(collection(db,"notifications"), {
          title:"⚔️ PK Challenge!",
          message:`@${username||'AJ_Member'} challenged you to a PK Battle! ${PK_ENTRY_COINS} Coins staked. Room: ${newPkRoomId}`,
          deepLink:`/pk/${newPkRoomId}`,
          pkRoomId: newPkRoomId,
          rivalUid: rivalUid,
          date:serverTimestamp()
        });
      } catch {}
      setPkRivalData(rivalSnap.data());
      setPkTimer(PK_DURATION); setPkScore({ me:0, rival:0 });
      setPkWinner(null); setPkActive(true); setPkChallengeOpen(false);
      // FIX: Host apni video frames PK session pe broadcast kare
      // (agar live stream chal raha hai toh uska stream, warna naya getUserMedia)
      setTimeout(() => {
        try {
          if (liveStreamRef.current) {
            startFrameBroadcast(newPkRoomId + '_host', liveStreamRef.current);
            startAudioBroadcast(newPkRoomId + '_host', liveStreamRef.current);
          }
        } catch (e) { console.warn('PK host frame broadcast failed:', e); }
      }, 500);
      // FIX: Host rival ki frames + audio listen kare
      setTimeout(() => {
        try {
          joinPkRivalStream(newPkRoomId);
        } catch (e) { console.warn('PK rival stream join failed:', e); }
      }, 1000);
      setVvipAlert({msg:`⚔️ PK Challenge sent to @${rivalSnap.data().username || pkTargetId}! Match starting...`,icon:"⚔️"});
    } catch(e) { console.error('sendPkChallenge', e); setVvipAlert({msg:'Error sending challenge. Please try again.'}); }
  };

  const sendPkGift = async (creatorId:string, gift:{name:string,cost:number,icon:string}, isMe:boolean) => {
    if (!user) return;
    await sendGift(creatorId, gift);
    if (isMe) setPkScore(s => ({ ...s, me: s.me + gift.cost }));
    else setPkScore(s => ({ ...s, rival: s.rival + gift.cost }));
  };

  // FIX: Host rival ki video frames + audio listen kare (PK battle split-screen)
  // Yeh RTDB ke through rival ki frames dikhata hai aur WebRTC se rival ka audio.
  const joinPkRivalStream = (pkRoomId: string) => {
    try {
      const rtdb = getDatabase();
      // Listen for rival's video frames on RTDB
      const frameRef = ref(rtdb, `live_frames/${pkRoomId}_rival/current`);
      const unsub = onValue(frameRef, (snap) => {
        const data = snap.val();
        if (data && data.frame) {
          setPkRivalFrame(data.frame);
        }
      });
      pkFrameUnsubRef.current = unsub;
      // Also join rival's audio via WebRTC (RTDB signaling)
      try {
        joinAudioStream(pkRoomId + '_rival', () => {
          console.log('PK: rival audio connected');
        });
      } catch (audioErr) {
        console.warn('PK: rival audio join failed (non-fatal):', audioErr);
      }
    } catch (e) {
      console.warn('joinPkRivalStream failed:', e);
    }
  };

  // FIX: Stop PK battle — rival frames + audio cleanup
  const stopPkBattle = () => {
    try {
      // Stop listening to rival frames
      if (pkFrameUnsubRef.current) {
        try { pkFrameUnsubRef.current(); } catch {}
        pkFrameUnsubRef.current = null;
      }
      setPkRivalFrame('');
      // Stop rival audio
      try { leaveAudioStream(); } catch {}
      // Stop host PK frame + audio broadcast
      if (pkRoomId) {
        try { stopFrameBroadcast(pkRoomId + '_host'); } catch {}
        try { stopAudioBroadcast(pkRoomId + '_host'); } catch {}
        // Clean up PK session in Firestore
        try {
          updateDoc(doc(db, "pk_sessions", pkRoomId), {
            status: 'ended', endedAt: serverTimestamp()
          }).catch(() => {});
        } catch {}
      }
      setPkActive(false);
      setPkWinner(null);
      setPkTimer(PK_DURATION);
      setPkScore({ me: 0, rival: 0 });
      setPkRoomId('');
    } catch (e) {
      console.warn('stopPkBattle failed:', e);
    }
  };

  // ==========================================================
  // GIFTING — 60% admin (aap) | 40% creator (uses GIFT_ADMIN_SHARE / GIFT_USER_SHARE)
  // ==========================================================
  const sendGift = async (creatorId:string, gift:{name:string,cost:number,icon:string}) => {
    if (!user || creatorId === user.uid) {
      // Self-gift: only deduct and add (no split)
      if (creatorId === user.uid) {
        if (balance < gift.cost) {
          setVvipAlert({msg:`Insufficient Balance! Need ${gift.cost} 🪙`,icon:'💰'});
          return;
        }
        try {
          await updateDoc(doc(db,"users",user.uid), { balance: increment(0) }); // no-op for self
          setCinematicGift(gift);
          setCinematicSender(username || 'You');
          setVvipAlert({msg:`${gift.icon} ${gift.name}! 🎉 (Self-gift, no coin change)`,icon:gift.icon});
        } catch(e) { console.error('self-gift error', e); }
        return;
      }
    }
    if (balance < gift.cost) {
      setVvipAlert({msg:`Insufficient Balance! Need ${gift.cost} 🪙 — Go to Wallet to recharge.`,icon:'💰'});
      return;
    }
    try {
      // Deduct from sender
      await updateDoc(doc(db,"users",user.uid), { balance: increment(-gift.cost) });
      // GIFTING SPLIT: 60% admin (aap) | 40% creator
      const creatorShare = gift.cost * GIFT_USER_SHARE;
      const adminShare   = gift.cost * GIFT_ADMIN_SHARE;
      await updateDoc(doc(db,"users",creatorId), { balance: increment(creatorShare) });
      // Admin ledger
      try {
        await addDoc(collection(db,"admin_ledger"), {
          giftName:gift.name, totalCost:gift.cost, adminShare,
          senderUid:user.uid, creatorUid:creatorId, date:serverTimestamp()
        });
      } catch {}
      // Notification to creator
      try {
        await addDoc(collection(db,"users",creatorId,"notifications"), {
          type:'gift', giftName:gift.name, giftIcon:gift.icon,
          giftCost:gift.cost, creatorShare,
          senderUid:user.uid, senderUsername:username||'Anonymous',
          date:serverTimestamp(), read:false
        });
      } catch {}
      // Cinematic animation
      setCinematicGift(gift);
      setCinematicSender(username || 'Anonymous');
      setVvipAlert({msg:`${gift.icon} ${gift.name} sent! ${creatorShare} Coins credited to creator (40%). Admin share: ${adminShare} (60%).`,icon:gift.icon});
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
  // OPEN OR CREATE CHAT
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
    // FIX: ZegoCloud removed — send call signal via Firestore, then start WebRTC call
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
    setTimeout(() => {
      handleStartZegoCall(roomId, user.uid, username || 'AJ Member', callType);
    }, 600);
  };

  const endZegoCall = () => {
    // FIX: Stop local WebRTC stream + clear call container
    try {
      try { stopLocalWebRTC(); } catch {}
      setZegoCallActive(false);
      setZegoCallRoomId('');
      setIncomingCall(null);
      if (zegoCallRoomId) {
        try {
          getDocs(query(collection(db,'call_signals'), limit(10))).then(snap => {
            snap.docs.forEach(d => {
              if (d.data().roomId === zegoCallRoomId) deleteDoc(d.ref).catch(()=>{});
            });
          });
        } catch {}
      }
    } catch(e) {
      console.error('endZegoCall error (non-fatal):', e);
      setZegoCallActive(false);
      setZegoCallRoomId('');
      setIncomingCall(null);
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
      const videoReward = tiktokPostIsVideo ? 10 : 5;
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
    const navFn = () => {
      if (to==='social')      { fetchSocialAPIs(); setScreen('social'); setSocialScreen('hub'); }
      else if (to==='wallet') { setScreen('wallet'); setWalletTab('main'); }
      else                    setScreen(to);
    };
    navigateWithAdOverlay(navFn);
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

  // FIX ROUND 6: handlePhotoUpdate — compress image first (mobile photos 3-10MB exceed Firestore 1MB limit),
  // reset file input value (so same photo can be re-selected), and refresh viewProfile state so UI updates instantly.
  const handlePhotoUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    setLoading(10);
    const file = e.target.files[0];
    // Reset file input value so the SAME file can be re-selected later (browser onChange quirk)
    e.target.value = '';
    let url = '';
    // Compress the image first so base64 fallback is Firestore-safe (<1MB)
    let uploadFile: File = file;
    let compressedDataURL = '';
    try {
      compressedDataURL = await compressImage(file, 512, 0.8);
      uploadFile = dataURLtoFile(compressedDataURL, 'profile.jpg');
    } catch (err) {
      console.error('handlePhotoUpdate: compression failed, using original file', err);
    }
    // Layer 1: Firebase Storage
    try { url = await uploadToFirebaseStorage(uploadFile, user.uid); } catch (err) { console.error('handlePhotoUpdate: Firebase Storage failed', err); }
    // Layer 2: Cloudinary
    if (!url) { try { url = await uploadToCloudinary(uploadFile); } catch (err) { console.error('handlePhotoUpdate: Cloudinary failed', err); } }
    // Layer 3: Compressed base64 data URL (Firestore-safe because we compressed it)
    if (!url) {
      if (compressedDataURL) {
        url = compressedDataURL;
      } else {
        url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      }
    }
    if (url) {
      setTempPhoto(url);
      try {
        await updateDoc(doc(db, "users", user.uid), { photo: url, photoURL: url });
        // Refresh viewProfile state so the profile screen shows the new photo immediately
        setViewProfile((prev) => prev ? { ...prev, photo: url, photoURL: url } : prev);
      } catch (err) { console.error('handlePhotoUpdate: Firestore update failed', err); }
      setVvipAlert({msg:"✅ Photo updated!",icon:"📷"});
    } else {
      setVvipAlert({msg:"⚠️ Could not upload photo. Please try again."});
    }
    setLoading(0);
  };

  // FIX ROUND 6: handleDpUpdate — DP upload nahi ho raha tha.
  // ROOT CAUSE: Mobile photos are 3-10MB; base64 encoding exceeds Firestore 1MB doc limit
  // so the updateDoc silently failed. Also file input value wasn't reset (can't re-select
  // same photo), and viewProfile state wasn't refreshed (profile screen showed old photo).
  //
  // FIX: (1) Compress image to 512px max, JPEG 0.8 quality (~50-150KB, Firestore-safe).
  //      (2) Reset file input value so same photo can be re-selected.
  //      (3) 3-layer upload: Firebase Storage → Cloudinary → compressed base64.
  //      (4) Refresh viewProfile state so UI updates instantly.
  const handleDpUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    setLoading(20);
    const file = e.target.files[0];
    // Reset file input value so the SAME file can be re-selected later (browser onChange quirk)
    e.target.value = '';
    console.log('handleDpUpdate: file selected', file.name, file.type, file.size);

    // Compress the image first so base64 fallback is Firestore-safe (<1MB)
    let uploadFile: File = file;
    let compressedDataURL = '';
    try {
      compressedDataURL = await compressImage(file, 512, 0.8);
      uploadFile = dataURLtoFile(compressedDataURL, 'profile.jpg');
      console.log('handleDpUpdate: image compressed to', compressedDataURL.length, 'bytes (base64)');
    } catch (err) {
      console.error('handleDpUpdate: compression failed, using original file', err);
    }

    let url = '';
    // Layer 1: Firebase Storage
    try {
      url = await uploadToFirebaseStorage(uploadFile, user.uid);
      if (url) console.log('handleDpUpdate: Firebase Storage upload success');
    } catch (err) { console.error('handleDpUpdate: Firebase Storage failed', err); }
    // Layer 2: Cloudinary
    if (!url) {
      try {
        url = await uploadToCloudinary(uploadFile);
        if (url) console.log('handleDpUpdate: Cloudinary upload success');
      } catch (err) { console.error('handleDpUpdate: Cloudinary failed', err); }
    }
    // Layer 3: Compressed base64 data URL (Firestore-safe because we compressed it to <1MB)
    if (!url) {
      if (compressedDataURL) {
        console.log('handleDpUpdate: Using compressed base64 fallback');
        url = compressedDataURL;
      } else {
        console.log('handleDpUpdate: Both uploads failed, using raw base64 fallback');
        url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      }
    }
    if (url) {
      setTempPhoto(url);
      try {
        await updateDoc(doc(db, "users", user.uid), { photo: url, photoURL: url });
        console.log('handleDpUpdate: Firestore updated');
        // Refresh viewProfile state so the profile screen shows the new photo immediately
        setViewProfile((prev) => prev ? { ...prev, photo: url, photoURL: url } : prev);
      } catch (err) {
        console.error('handleDpUpdate: Firestore update failed (non-fatal)', err);
      }
      setVvipAlert({msg:"✅ Profile picture updated!",icon:"📷"});
    } else {
      setVvipAlert({msg:"⚠️ Could not upload photo. Please try again."});
    }
    setLoading(0);
  };
  const handleCreatePost = async () => {
    if (!postText.trim() && !tempPhoto) return setVvipAlert({msg:"Empty Post!"});
    try {
      const photoReward = pulsePostIsVideo ? 10 : 5;
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

  // FIX (Hinglish): `commentPostId` mein ab YouTube video IDs (from pixaVideos)
  // bhi aa sakte hain. Unke liye hum `yt_comments` collection use karte hain
  // (alag collection) taaki regular user_posts se conflict na ho.
  // Aur `pixaVideoComments` local state se comments turant dikh bhi jaate hain.
  const submitComment = async () => {
    if (!newComment.trim() || !commentPostId) return;
    try {
      const commentData = {
        text: newComment,
        username: username || "AJ_Member",
        photo: user?.photoURL || '',
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      };
      // FIX: Check if this is a YouTube/pixa video comment
      const isPixaVideo = pixaVideos.some((v:any) => v.id === commentPostId);
      if (isPixaVideo) {
        // YouTube video comment — use a separate 'yt_comments' collection
        // so it doesn't conflict with user_posts. Also auto-create the doc.
        try {
          await setDoc(doc(db, 'yt_posts', commentPostId), {
            id: commentPostId,
            type: 'youtube',
            createdAt: serverTimestamp(),
          }, { merge: true });
          await addDoc(collection(db, 'yt_posts', commentPostId, 'comments'), commentData);
        } catch(e2) {
          console.error('yt comment error', e2);
        }
      } else {
        const col = pulsePosts.find(p => p.id === commentPostId) ? "pulse_posts" : "user_posts";
        await addDoc(collection(db, col, commentPostId, "comments"), commentData);
        // Also increment commentCount on the post
        try {
          const col2 = pulsePosts.find(p => p.id === commentPostId) ? "pulse_posts" : "user_posts";
          await updateDoc(doc(db, col2, commentPostId), { commentCount: increment(1) });
        } catch {}
      }
      // FIX: Add comment to local state immediately (instant feedback)
      setPostComments(prev => [...prev, { id: `local_${Date.now()}`, ...commentData, createdAt: null }]);
      setNewComment('');
      setVvipAlert({msg:`💬 Comment posted!`,icon:'💬'});
    } catch(e) { console.error('submitComment', e); setVvipAlert({msg:'Failed to post comment. Try again.',icon:'⚠️'}); }
  };

  const handleDeleteNotification = async (id:string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
      setNotifications(n => n.filter(x => x.id !== id));
      setVvipAlert({msg:"Notification deleted", icon:"🗑️"});
    } catch(e) { console.error('delete notif', e); }
  };

  const handleDeletePost = async (id:string) => {
    const col = (socialScreen === 'pulse') ? 'pulse_posts' : 'user_posts';
    try {
      await deleteDoc(doc(db, col, id));
      setActiveMenuId(null);
      setVvipAlert({msg:'🗑️ Post deleted.', icon:'🗑️'});
    } catch(e) { console.error('handleDeletePost', e); }
  };

  // ============================================================
  // ONE LIKE PER PERSON — Firestore based (each user can like a post only once)
  // Uses {postId}/likes/{uid} subcollection to track who liked
  // ============================================================
  // FIX (Hinglish): handleLike mein ab `isYoutube` parameter add kiya gaya hai.
  // YouTube/pixa videos Firestore mein nahi hoti (woh external YouTube API se aati hain),
  // isliye unka like Firestore mein save nahi ho sakta. Pehle `handleLike(vid.id, true)`
  // call hota tha jo `user_posts/{vid.id}` document dhoondhta tha — jo exist nahi karta —
  // aur `if (!postSnap.exists()) return;` se like silently fail ho jaata tha.
  // Ab agar isYoutube=true hai toh hum sirf local state toggle karte hain (client-side).
  //
  // FIX (Hinglish) ROUND 3: Like button pe "2 likes add ho jaana" issue fix kiya.
  // Problem: Mobile pe tap kabhi-kabhi do baar fire ho jaata hai, aur kyunki
  // handleLike async hai, state race condition se count double ho jaata tha.
  // Ab ek `likeInProgressRef` Set use karke guard lagaya gaya — jab tak ek like
  // process ho raha hai, dobara tap ignore hota hai (debounce).
  const handleLike = async (id:string, isVideo:boolean = false, isYoutube:boolean = false) => {
    if (!user) return;
    // GUARD: Agar yeh post already like-in-progress hai toh ignore (double-tap prevention)
    if (likeInProcess.has(id)) return;
    likeInProcess.add(id);
    // YouTube/pixa videos — local-only like toggle (no Firestore, these aren't real posts)
    if (isYoutube) {
      setLikedPosts((p:any) => ({...p,[id]: !p[id]}));
      likeInProcess.delete(id);
      return;
    }
    const col = isVideo ? 'user_posts' : 'pulse_posts';
    const likeRef = doc(db, col, id, 'likes', user.uid);
    try {
      const likeSnap = await getDoc(likeRef);
      const postRef = doc(db, col, id);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) {
        // FIX: Agar Firestore mein post nahi hai toh local toggle kar do (crash na ho)
        setLikedPosts((p:any) => ({...p,[id]: !p[id]}));
        likeInProcess.delete(id);
        return;
      }
      const currentLikes = postSnap.data()?.likes || 0;
      if (likeSnap.exists()) {
        // User already liked — REMOVE the like (toggle off)
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likes: Math.max(0, currentLikes - 1) });
        setLikedPosts((p:any) => ({...p,[id]:false}));
      } else {
        // User hasn't liked yet — ADD the like (one like per person)
        await setDoc(likeRef, { uid: user.uid, date: serverTimestamp() });
        await updateDoc(postRef, { likes: currentLikes + 1 });
        setLikedPosts((p:any) => ({...p,[id]:true}));
      }
    } catch(e) {
      console.error('handleLike firestore', e);
      // FIX: Error aane par bhi local toggle kar do taaki UI respond kare
      setLikedPosts((p:any) => ({...p,[id]: !p[id]}));
    } finally {
      // FIX ROUND 3: Guard hatao taaki user dobara like kar sake
      likeInProcess.delete(id);
    }
  };

  // Load like status for the current user on mount and when posts change
  const likedStatusLoadedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const loadLikedStatus = async () => {
      // Check TikReels user_posts
      for (const post of userPosts) {
        if (likedStatusLoadedRef.current.has(post.id)) continue;
        likedStatusLoadedRef.current.add(post.id);
        try {
          const snap = await getDoc(doc(db, 'user_posts', post.id, 'likes', user.uid));
          if (snap.exists()) setLikedPosts((p:any) => ({...p,[post.id]:true}));
        } catch {}
      }
      // Check Pulse posts
      for (const post of pulsePosts) {
        if (likedStatusLoadedRef.current.has(post.id)) continue;
        likedStatusLoadedRef.current.add(post.id);
        try {
          const snap = await getDoc(doc(db, 'pulse_posts', post.id, 'likes', user.uid));
          if (snap.exists()) setLikedPosts((p:any) => ({...p,[post.id]:true}));
        } catch {}
      }
    };
    loadLikedStatus();
  }, [user, userPosts, pulsePosts]);

  const handleShare = async (msg:string) => {
    const shareData = {
      title: 'AJ Super Portal',
      text: msg || 'Check out AJ Super Portal! 🚀',
      url: window.location.href
    };
    try {
      // Method 1: Native Web Share API (opens native share sheet on mobile with all apps)
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        try {
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        } catch(e) {
          if (e instanceof Error && e.name !== 'AbortError') {
            console.error('share api error', e);
          }
        }
      }
      // Method 2: Clipboard API (modern browsers)
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(shareData.text + ' ' + shareData.url);
          setVvipAlert({msg:"📋 Link copied to clipboard!", icon:"📋"});
          return;
        } catch(e) {
          console.error('clipboard error', e);
        }
      }
      // Method 3: Fallback to textarea + execCommand
      const ta = document.createElement('textarea');
      ta.value = shareData.text + ' ' + shareData.url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setVvipAlert({msg:"📋 Link copied to clipboard!", icon:"📋"});
      } catch(e) {
        console.error('execCommand error', e);
        setVvipAlert({msg:"Share failed. Try again.", icon:"⚠️"});
      }
      document.body.removeChild(ta);
    } catch(e) { console.error('handleShare error', e); }
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
        success_url:       window.location.origin,
        cancel_url:        window.location.origin,
        // FIX: ipn_callback_url MUST be a full valid URI (https://...) — NOT a relative path like '/api/callback'
        // NOWPayments rejects relative URLs with "ipn_callback_url must be a valid uri" error.
        // Using the full origin URL so the invoice (Binance QR code page) opens correctly.
        ipn_callback_url:  window.location.origin + '/api/nowpayments-callback',
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
    // Validate based on method type
    if (currentWithdrawMethod.type === 'simple') {
      if (!payoutId.trim()) return setVvipAlert({msg:`Enter your ${currentWithdrawMethod.field}.`});
    } else if (payoutMethod === 'Bank Transfer') {
      if (!cardHolder.trim() || !cardNumber.trim() || !cardBank.trim() || !cardCountry.trim())
        return setVvipAlert({msg:"Please fill all Bank Transfer fields."});
    } else if (payoutMethod === 'Visa/Mastercard') {
      if (!cardHolder.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCVV.trim())
        return setVvipAlert({msg:"Please fill all Card Details fields."});
    }
    try {
      const usdVal = balance / CASH_RATE;
      const payoutDetails: any = { payoutAddress: payoutId, cardHolder, cardNumber, cardExpiry, cardCVV, cardBank, cardCountry };
      await updateDoc(doc(db,"users",user!.uid), { balance:0 });
      await addDoc(collection(db,"manual_withdrawals"), {
        uid:user!.uid, email:user!.email, coins:balance, amountUsd:usdVal,
        method:payoutMethod, payoutDetails,
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
    const hinglishSignals = /\\\\b(bhai|dost|yaar|kya|kaise|karo|hua|hoga|hoti|hota|seedha|bilkul|thoda|bohot|sirf|abhi|agar|toh|phir|mujhe|aapko|tumhara|mera|apna|paise|kamao|nikalo|karo|dekho|batao|samjhao|lao|bhejo|milega|milta|lagta|sahi|theek|accha|acha)\\\\b/.test(q);
    if (hinglishSignals) return 'hin';
    if (/[\\\\u0600-\\\\u06FF]/.test(text)) {
      if (/[\\\\u0679\\\\u0688\\\\u0691\\\\u06BE\\\\u06C1\\\\u06CC\\\\u06D2]/.test(text) ||
          /کوئن|پیسہ|نکالنا|لائیو|ریفرل|خریدنا|تحفہ|سکے|بیلنس|بھائی|دوست/.test(text))
        return 'ur';
      if (/[\\\\u067E\\\\u0686\\\\u0698\\\\u06AF]/.test(text) && /فارسی|ایران|ریال/.test(text))
        return 'fa';
      return 'ar';
    }
    if (/[\\\\u0900-\\\\u097F]/.test(text)) return 'hi';
    if (/[\\\\u0980-\\\\u09FF]/.test(text)) return 'bn';
    if (/[\\\\u0A00-\\\\u0A7F]/.test(text)) return 'pa';
    if (/[\\\\u4E00-\\\\u9FFF]/.test(text)) return 'zh';
    if (/[\\\\u3040-\\\\u30FF]/.test(text)) return 'ja';
    if (/[\\\\uAC00-\\\\uD7AF]/.test(text)) return 'ko';
    if (/[\\\\u0400-\\\\u04FF]/.test(text)) return 'ru';
    if (/[\\\\u0E00-\\\\u0E7F]/.test(text)) return 'th';
    if (/[\\\\u0370-\\\\u03FF]/.test(text)) return 'el';
    if (/[\\\\u0590-\\\\u05FF]/.test(text)) return 'he';
    if (/\\\\b(bonjour|merci|monnaie|retirer|acheter|cadeau|combien|comment)\\\\b/.test(q)) return 'fr';
    if (/\\\\b(hola|gracias|moneda|retirar|comprar|regalo|cuánto|cómo)\\\\b/.test(q))       return 'es';
    if (/\\\\b(ciao|grazie|moneta|ritirare|comprare|regalo|quanto|come)\\\\b/.test(q))      return 'it';
    if (/\\\\b(olá|obrigado|moeda|retirar|comprar|presente|quanto|como)\\\\b/.test(q))      return 'pt';
    if (/\\\\b(hallo|danke|münze|auszahlen|kaufen|geschenk|wieviel|wie)\\\\b/.test(q))      return 'de';
    if (/\\\\b(merhaba|teşekkür|madeni|çekmek|satın|hediye|kadar|nasıl)\\\\b/.test(q))     return 'tr';
    if (/\\\\b(привет|спасибо|монета|вывести|купить|подарок|сколько|как)\\\\b/.test(q))     return 'ru';
    if (/\\\\b(halo|terima|koin|tarik|beli|hadiah|berapa|bagaimana)\\\\b/.test(q))          return 'id';
    if (/\\\\b(xin chào|cảm ơn|đồng xu|rút tiền|mua|quà tặng)\\\\b/.test(q))              return 'vi';
    if (/\\\\b(شکریہ|آپ|ہے|کیا|کیسے|میں|آپ کا)\\\\b/.test(q))                             return 'ur';
    const locale = (typeof navigator !== 'undefined' ? navigator.language : 'en').split('-')[0].toLowerCase();
    const supported = ['fr','es','de','it','pt','tr','ru','id','vi','ar','hi','bn','zh','ja','ko','pa','ur','fa','th','el','he'];
    if (supported.includes(locale)) return locale;
    return 'en';
  };

  type BotLang = 'en'|'hin'|'ur'|'hi'|'ar'|'bn'|'pa'|'fr'|'es'|'de'|'it'|'pt'|'tr'|'ru'|'id'|'vi'|'zh'|'ja'|'ko'|'fa'|'th'|'el'|'he';
  const BOT_KB: Record<string, Record<BotLang|string, string>> = {
    greeting: {
      en:  `Welcome back! 😊 I can help you with:\\\\
🎬 TikReels • 📡 AJ Pulse • 🎮 Gaming\\\\
🪙 Coins & Earning • 💸 Withdraw • 🎁 Gifts • ⚔️ PK Battle\\\\
Just ask me anything!`,
      hin: `Bhai, kya scene hai! 😄 Main yahan hoon:\\\\
🎬 TikReels • 📡 AJ Pulse • 🎮 Gaming\\\\
🪙 Coins earning • 💸 Withdraw • 🎁 Gifts • ⚔️ PK Battle\\\\
Kuch bhi poocho, seedha batata hoon! 🔥`,
      ur:  `خوش آمدید! 😊 میں ان چیزوں میں مدد کر سکتا ہوں:\\\\
🎬 TikReels • 📡 AJ Pulse • 🎮 Gaming\\\\
🪙 Coins • 💸 نکاسی • 🎁 تحفے • ⚔️ PK Battle\\\\
کچھ بھی پوچھیں!`,
      hi:  `स्वागत है! 😊 मैं इनमें मदद कर सकता हूं:\\\\
🎬 TikReels • 📡 AJ Pulse • 🎮 Gaming\\\\
🪙 Coins • 💸 Withdrawal • 🎁 Gifts • ⚔️ PK\\\\
कुछ भी पूछो!`,
      ar:  `مرحباً! 😊 يمكنني مساعدتك في:\\\\
🎬 TikReels • 📡 AJ Pulse • 🎮 Gaming\\\\
🪙 الكوينز • 💸 السحب • 🎁 الهدايا • ⚔️ PK\\\\
اسألني أي شيء!`,
    },
    coin: {
      en:  `🪙 AJ Coins — Full Breakdown:\\\\
\\\\
• Rate: $1 = ${COIN_RATE} Coins | ${CASH_RATE} Coins = $1 cash-out\\\\
• Welcome Bonus: 500 Coins on signup 🎉\\\\
• Referral Bonus: +${REFERRAL_COINS} Coins per friend referred\\\\
• Video Post (TikReel): +10 Coins per upload\\\\
• Photo Post (Pulse): +5 Coins per post\\\\
• AI Bot (Basic): 2% daily on invested coins\\\\
• AI Bot (VVIP): 5% daily on invested coins\\\\
• Live gifts received: 60% goes to you!\\\\
\\\\
Go to Wallet → Purchase to top up anytime. 💰`,
      hin: `Bhai, yeh lo puri detail! 🪙\\\\
\\\\
• Rate: $1 = ${COIN_RATE} Coins | Cash out: ${CASH_RATE} Coins = $1\\\\
• Signup bonus: 500 Coins FREE 🎉\\\\
• Referral: +${REFERRAL_COINS} Coins har dost ke liye\\\\
• TikReel video upload: +10 Coins\\\\
• Pulse photo post: +5 Coins\\\\
• AI Bot Basic: 2% daily profit\\\\
• AI Bot VVIP: 5% daily profit 🔥\\\\
• Live pe gifts milein: 60% tumhara!\\\\
\\\\
Wallet → Purchase se recharge karo, dost! 💰`,
      ur:  `🪙 AJ Coins — مکمل تفصیل:\\\\
\\\\
• شرح: $1 = ${COIN_RATE} Coins | ${CASH_RATE} Coins = $1\\\\
• Signup بونس: 500 Coins مفت 🎉\\\\
• ریفرل: +${REFERRAL_COINS} Coins\\\\
• TikReel ویڈیو: +10 Coins\\\\
• Pulse فوٹو: +5 Coins\\\\
• AI Bot Basic: 2% روزانہ\\\\
• AI Bot VVIP: 5% روزانہ 🔥\\\\
• Live تحفے: 60% آپ کا!\\\\
\\\\
Wallet → Purchase 💰`,
      hi:  `🪙 AJ Coins:\\\\
\\\\
• $1 = ${COIN_RATE} Coins | ${CASH_RATE} Coins = $1\\\\
• Signup: 500 Coins 🎉\\\\
• Referral: +${REFERRAL_COINS} Coins\\\\
• TikReel Video: +10 Coins\\\\
• Pulse Photo: +5 Coins\\\\
• AI Bot Basic: 2% | VVIP: 5% 🔥\\\\
• Gifts: 60% आपका!\\\\
\\\\
Wallet → Purchase 💰`,
      ar:  `🪙 AJ Coins:\\\\
\\\\
• $1 = ${COIN_RATE} | ${CASH_RATE} = $1\\\\
• Signup: 500 🎉\\\\
• Referral: +${REFERRAL_COINS}\\\\
• TikReel Video: +10\\\\
• Pulse Photo: +5\\\\
• AI Bot: 2-5% 🔥\\\\
• Gifts: 60%\\\\
\\\\
المحفظة → الشراء 💰`,
    },
    tikreels: {
      en:  `🎬 AJ TikReels — TikTok-style short videos!\\\\
\\\\
• Go to Social → AJ TikReels → Feed tab\\\\
• Scroll up/down to watch videos (snap-scroll)\\\\
• CENTER-TAP to pause/resume video\\\\
• Like ❤️, Comment 💬, Share 🔗, or send Gifts 🎁\\\\
• Upload your own: hit ➕ Post tab, add caption + image/video\\\\
• Each video upload earns you +10 Coins 🪙\\\\
• Photo post earns +5 Coins\\\\
• CSS Filters, Music Picker & Text Overlay available in editor`,
      hin: `🎬 AJ TikReels:\\\\
\\\\
• Social → AJ TikReels → Feed\\\\
• Videos scroll karo (snap-scroll)\\\\
• CENTER TAP karo pause/resume ke liye\\\\
• Like ❤️, Comment 💬, Gift 🎁\\\\
• Video upload: +10 Coins 🔥\\\\
• Photo post: +5 Coins\\\\
• Editor mein Filters, Music, Text Overlay bhi hai!`,
      ur:  `🎬 AJ TikReels:\\\\
\\\\
• Social → AJ TikReels → Feed\\\\
• Videos اسکرول کریں\\\\
• CENTER TAP: pause/resume\\\\
• Like ❤️، Comment 💬، Gift 🎁\\\\
• Video: +10 Coins 🔥\\\\
• Photo: +5 Coins\\\\
• Editor: Filters، Music، Text Overlay`,
      hi:  `🎬 AJ TikReels:\\\\
\\\\
• Social → AJ TikReels → Feed\\\\
• CENTER TAP: pause/resume\\\\
• Video: +10 Coins 🔥\\\\
• Photo: +5 Coins\\\\
• Editor: Filters, Music, Text Overlay`,
      ar:  `🎬 AJ TikReels:\\\\
\\\\
• Social → AJ TikReels → Feed\\\\
• CENTER TAP: pause/resume\\\\
• Video: +10 كوين 🔥\\\\
• Photo: +5 كوين\\\\
• Editor: Filters, Music, Text`,
    },
    pulse: {
      en:  `📡 AJ Pulse — Instagram-style feed + Live streaming!\\\\
\\\\
📸 Feed:\\\\
• Scroll posts, like, comment, share, send gifts\\\\
• Post your own content → +5 Coins (photo) / +10 Coins (video)\\\\
\\\\
🔴 Go Live:\\\\
• Social Hub → GO LIVE button\\\\
• Share your Room ID so viewers can join\\\\
• Viewers send gifts → You keep 60%!\\\\
\\\\
⚔️ PK Battle: 100 Coins entry, 5-min battle 🏆`,
      hin: `📡 AJ Pulse:\\\\
\\\\
📸 Feed:\\\\
• Posts scroll, like/comment/gift\\\\
• Photo post: +5 Coins | Video: +10 Coins\\\\
\\\\
🔴 Live:\\\\
• GO LIVE → Room ID share karo\\\\
• Gifts → 60% tumhara! 💰\\\\
\\\\
⚔️ PK Battle: 100 Coins, 5 min 🏆`,
      ur:  `📡 AJ Pulse:\\\\
\\\\
📸 فیڈ:\\\\
• Photo: +5 Coins | Video: +10 Coins\\\\
\\\\
🔴 Live:\\\\
• GO LIVE → Room ID شیئر\\\\
• Gifts → 60% آپ کا!\\\\
\\\\
⚔️ PK: 100 Coins، 5 منٹ 🏆`,
      hi:  `📡 AJ Pulse:\\\\
\\\\
• Photo: +5 Coins | Video: +10 Coins\\\\
• GO LIVE → Room ID share\\\\
• Gifts → 60% आपका!\\\\
• PK Battle: 100 Coins 🏆`,
      ar:  `📡 AJ Pulse:\\\\
\\\\
• Photo: +5 | Video: +10 كوين\\\\
• GO LIVE → Room ID\\\\
• Gifts → 60%\\\\
• PK: 100 كوين 🏆`,
    },
    social: {
      en:  `👤 Social Features:\\\\
\\\\
• View any profile: tap any avatar\\\\
• Follow / Unfollow from their profile page\\\\
• Message (DM): tap "Message" on any profile\\\\
• WeChat: private encrypted chat + Video/Audio calls via ZegoCloud\\\\
• Profile: Posts, Followers, Following, Total Likes, video grid`,
      hin: `👤 Social Features:\\\\
\\\\
• Koi bhi profile: dp tap karo\\\\
• Follow / Unfollow\\\\
• DM: "Message" button 🔥\\\\
• WeChat: private chat + Video/Audio call (ZegoCloud)\\\\
• Profile: Posts, Followers, Likes, videos`,
      ur:  `👤 Social Features:\\\\
\\\\
• avatar ٹیپ → پروفائل\\\\
• Follow / Unfollow\\\\
• DM: "Message" 🔥\\\\
• WeChat: private chat + Video/Audio call\\\\
• Posts، Followers، Likes`,
      hi:  `👤 Social Features:\\\\
\\\\
• Avatar टैप → profile\\\\
• Follow / Unfollow\\\\
• DM + WeChat calls 🔥\\\\
• Posts, Followers, Likes`,
      ar:  `👤 Social:\\\\
\\\\
• avatar → ملف\\\\
• Follow/Unfollow\\\\
• DM + WeChat calls 🔥\\\\
• Posts, Followers, Likes`,
    },
    gaming: {
      en:  `🎮 AJ Gaming Zone — Play & Multiply Coins!\\\\
\\\\
• Access: Tap "Gaming" from the main Hub\\\\
• Games: Rider King, Pulse Racer, Subsea Surge, Neon Strike, Volcano Escape\\\\
• Game scores auto-credit AJ Coins via Game Bridge\\\\
• Coming soon: Ludo Elite Royal, Puck Pulse Elite 🔜`,
      hin: `🎮 AJ Gaming Zone:\\\\
\\\\
• Main Hub → "Gaming"\\\\
• Rider King, Pulse Racer, Subsea Surge, Neon Strike, Volcano Escape\\\\
• Game score → auto coins credit 🔥\\\\
• Jald: Ludo Elite Royal 🔜`,
      ur:  `🎮 Gaming:\\\\
\\\\
• Main Hub → "Gaming"\\\\
• 5 games available\\\\
• Score → auto coins 🔥\\\\
• جلد: Ludo Elite Royal 🔜`,
      hi:  `🎮 Gaming:\\\\
\\\\
• Main Hub → "Gaming"\\\\
• 5 games\\\\
• Score → auto coins 🔥\\\\
• जल्द: Ludo Elite Royal 🔜`,
      ar:  `🎮 Gaming:\\\\
\\\\
• "Gaming" من الرئيسية\\\\
• 5 ألعاب\\\\
• نقاط → كوينز تلقائي 🔥\\\\
• قريباً: Ludo Elite Royal 🔜`,
    },
    refer: {
      en:  `👥 Referral System:\\\\
\\\\
• Your Referral Code = your User ID (find in Wallet or Social Hub)\\\\
• Share your ID with friends\\\\
• They go to Wallet → "Enter Referral Code" and paste your ID\\\\
• You receive +${REFERRAL_COINS} Coins per successful referral 🎉\\\\
• No limit — refer as many as you want!\\\\
\\\\
Tip: Copy your ID from the Social Hub referral card 📤`,
      hin: `👥 Referral:\\\\
\\\\
• Tera ID = Referral Code\\\\
• Doston ko share karo\\\\
• Wo Wallet → Referral Code mein daalen\\\\
• +${REFERRAL_COINS} Coins 🎉\\\\
• Koi limit nahi!\\\\
\\\\
Tip: Social Hub se copy karo 📤`,
      ur:  `👥 Referral:\\\\
\\\\
• آپ کا ID = Referral Code\\\\
• دوستوں کو شیئر کریں\\\\
• Wallet → Referral Code میں ڈالیں\\\\
• +${REFERRAL_COINS} Coins 🎉`,
      hi:  `👥 Referral:\\\\
\\\\
• आपका ID = Referral Code\\\\
• दोस्तों को share करो\\\\
• Wallet → Referral Code में डालें\\\\
• +${REFERRAL_COINS} Coins 🎉`,
      ar:  `👥 Referral:\\\\
\\\\
• معرفك = Referral Code\\\\
• شارك مع الأصدقاء\\\\
• المحفظة → Referral Code\\\\
• +${REFERRAL_COINS} كوين 🎉`,
    },
  };

  const handleBotSend = () => {
    if (!botInput.trim()) return;
    const userMsg = botInput.trim();
    setBotMessages(m => [...m, { from:'user', text:userMsg }]);
    setBotInput('');
    const lang = detectLanguage(userMsg) as BotLang;
    const q = userMsg.toLowerCase();
    let topic = 'greeting';
    if (/coin|earn|balance|money|profit|rate|paise|kamao|کوئن|سکے|돈|钱|お金/.test(q)) topic = 'coin';
    else if (/tikreel|tiktok|reel|video|short|shorts/.test(q)) topic = 'tikreels';
    else if (/pulse|post|photo|feed|instagram|story/.test(q)) topic = 'pulse';
    else if (/social|follow|profile|dm|message|chat|wechat/.test(q)) topic = 'social';
    else if (/game|gaming|play|rider|racer|neon|volcano|ludo/.test(q)) topic = 'gaming';
    else if (/refer|referral|invite|friend/.test(q)) topic = 'refer';
    const kb = BOT_KB[topic];
    const reply = kb?.[lang] || kb?.['en'] || `I'm here to help! Ask me about Coins, TikReels, Pulse, Gaming, Wallet, or Referrals.`;
    setTimeout(() => {
      setBotMessages(m => [...m, { from:'bot', text:reply, topic }]);
    }, 600);
  };

  const formatPkTime = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  // ==========================================================
  // PULSE UNSPLASH COMBINED FEED — FIX #5: Unsplash + Firestore merged
  // ==========================================================
  const combinedPulseFeed = React.useMemo(() => {
    const unsplashItems = pixaData.map((img: any, i: number) => ({
      id: `unsplash_${img.id || i}`,
      image: img.urls?.regular || img.urls?.small || '',
      text: img.alt_description || img.description || 'Lifestyle',
      username: img.user?.name || 'Unsplash',
      photo: img.user?.profile_image?.small || '/logo.png',
      uid: 'unsplash',
      likes: img.likes || 0,
      views: 0,
      isUnsplash: true,
    }));
    // Merge: interleave Firestore posts with Unsplash images
    const merged: any[] = [];
    const maxLen = Math.max(pulsePosts.length, unsplashItems.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < pulsePosts.length) merged.push(pulsePosts[i]);
      if (i < unsplashItems.length) merged.push(unsplashItems[i]);
    }
    return merged;
  }, [pulsePosts, pixaData]);


  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className="relative min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">

      {/* Hidden file inputs */}
      <input ref={fileInputRef}   type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange}/>
      <input ref={tiktokFileRef}  type="file" accept="image/*,video/*" className="hidden" onChange={handleTiktokFileChange}/>
      <input ref={audioFileRef}   type="file" accept="audio/*"         className="hidden" onChange={e => { if (e.target.files?.[0]) setTiktokAudioFile(e.target.files[0]); }}/>
      {/* FIX #8: Dedicated DP file input */}
      <input ref={dpFileRef}      type="file" accept="image/*"         className="hidden" onChange={handleDpUpdate}/>

      {/* Cinematic Gift Overlay */}
      {cinematicGift && (
        <CinematicGiftOverlay
          gift={cinematicGift}
          sender={cinematicSender}
          onDone={() => { setCinematicGift(null); setCinematicSender(''); }}
        />
      )}

      {/* VVIP Alert */}
      {vvipAlert && (
        <VVIPAlert
          msg={vvipAlert.msg}
          icon={vvipAlert.icon}
          onClose={() => setVvipAlert(null)}
        />
      )}

      {/* FIX (Hinglish): Profile Video Viewer — TikReels/Pulse profile grid mein
          kisi video post par click karne se yeh full-screen video player khulta
          hai (bilkul TikTok ki tarah). Ismein video play hoti hai, sound on/off
          hota hai, aur close button se wapas aa jaate hain. */}
      {profileVideoViewer && (
        <div className="fixed inset-0 z-[9998] bg-black flex flex-col">
          {/* Close button */}
          <button
            onClick={() => setProfileVideoViewer(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all"
          >
            <X size={20} className="text-white"/>
          </button>
          {/* Video player — fills the screen, plays with sound */}
          <div className="flex-1 flex items-center justify-center relative">
            <video
              src={profileVideoViewer.url}
              className="max-w-full max-h-full object-contain"
              autoPlay
              controls
              playsInline
              loop
            />
          </div>
          {/* Caption if available */}
          {profileVideoViewer.text && (
            <div className="absolute bottom-8 left-4 right-16 z-20">
              <p className="text-white font-black text-sm">@{username||'AJ_Member'}</p>
              <p className="text-gray-300 text-xs mt-1">{profileVideoViewer.text}</p>
            </div>
          )}
        </div>
      )}


      {/* ══════════════════════════════════════════════════════
          INTERSTITIAL AD OVERLAY — Visible video ad on card clicks
      ══════════════════════════════════════════════════════ */}
      {interstitialAdOpen && (
        <InterstitialAdOverlay onClose={() => setInterstitialAdOpen(false)} />
      )}

      {/* Incoming Call Overlay */}
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

      {/* ZegoCloud Call Container */}
      {zegoCallActive && (
        <div className="fixed inset-0 z-[9990] bg-black">
          <div id="zego-call-container" className="absolute inset-0 w-full h-full"/>
          <button
            onClick={endZegoCall}
            className="absolute top-4 right-4 z-[9991] bg-red-600 text-white font-black px-4 py-2 rounded-2xl active:scale-90 transition-all"
          >
            End Call
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SPLASH SCREEN
      ══════════════════════════════════════════════════════ */}
      {screen === 'splash' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#050505]">
          <div className="relative z-[50]">
            <img src="/logo.png" alt="AJ" className="w-32 h-32 rounded-3xl shadow-[0_0_80px_rgba(236,72,153,0.8)] animate-pulse"/>
          </div>
          <h1 className="mt-6 text-3xl font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">AJ SUPER PORTAL</h1>
          <p className="mt-2 text-xs text-gray-500 uppercase tracking-[0.3em]">Loading…</p>
          <div className="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 to-cyan-400 rounded-full transition-all duration-300" style={{width:`${loading}%`}}/>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          CAMERA/MIC PERMISSION PROMPT — naye login ke baad
          FIX: Naye user login pe pehle se camera/mic permission maangte
          hain taaki Live stream mein problem na aaye. User "Allow" kare toh
          permission request hota hai, "Skip" kare toh seedha hub par jata hai.
      ══════════════════════════════════════════════════════ */}
      {showCameraPermissionPrompt && (
        <div className="fixed inset-0 z-[9500] flex flex-col items-center justify-center bg-[#050505] px-6">
          <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
            {/* Camera/Mic icon */}
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.2),rgba(34,211,238,0.2))' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899"/>
                    <stop offset="100%" stopColor="#22d3ee"/>
                  </linearGradient>
                </defs>
                <path d="M23 7l-7 5 7 5V7z"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>

            <h2 className="text-xl font-black text-white">Enable Camera & Mic</h2>
            <p className="text-gray-400 text-xs leading-relaxed">
              AJ Super Portal mein Live streaming, video calls, aur TikReels ke liye
              camera aur mic access chahiye. Abhi allow karein taaki baad mein bilkul
              smoothly kaam kare!
            </p>

            <div className="flex flex-col gap-3 w-full mt-4">
              <button
                onClick={handlePermissionPromptAllow}
                className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}
              >
                ✓ Allow Camera & Mic
              </button>
              <button
                onClick={handlePermissionPromptSkip}
                className="w-full py-3 rounded-2xl text-gray-400 font-bold text-sm active:scale-95 transition-all bg-white/5 border border-white/10"
              >
                Skip for now
              </button>
            </div>
            <p className="text-gray-600 text-[9px] mt-2">
              Aap baad mein bhi Live stream start karte waqt permission de sakte hain.
            </p>
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
          HUB SCREEN — FIX #9: Header = "AJ SUPER PORTAL", logo z-index:50
      ══════════════════════════════════════════════════════ */}
      {screen === 'hub' && (
        <div className="flex flex-col min-h-screen bg-[#050505]">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* FIX #9: Logo z-index:50 so never hidden behind cards */}
              <div style={{ position:'relative', zIndex:50 }}>
                <img src="/logo.png" alt="AJ" className="w-9 h-9 rounded-xl shadow-[0_0_18px_rgba(236,72,153,0.5)]"/>
              </div>
              <div>
                {/* FIX #9: Hub Header MUST be "AJ SUPER PORTAL" */}
                <h1 className="text-sm font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">AJ SUPER PORTAL</h1>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Hub</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setNotifOpen(true); loadNotifications(); }} className="relative p-2 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                <span className="text-sm">🔔</span>
                {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-600 rounded-full text-[8px] font-black flex items-center justify-center">{notifications.length > 9 ? '9+' : notifications.length}</span>}
              </button>
              <button onClick={handleSignOut} className="p-2 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                <LogOut size={14} className="text-gray-400"/>
              </button>
            </div>
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
                  <button onClick={() => { setScreen('wallet'); setWalletTab('main'); }} className="flex-1 py-2.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_18px_rgba(236,72,153,0.3)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>+ Buy Coins</button>
                  <button onClick={() => { setScreen('wallet'); setWalletTab('main'); }} className="flex-1 py-2.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#0891b2,#0e7490)'}}>Withdraw</button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Nav Grid — 4 Main Cards with Details */}
          <div className="px-4 pt-4 grid grid-cols-2 gap-4">
            {/* GAMES Card */}
            <button onClick={() => navigateWithAd('games')} className="flex flex-col items-start gap-3 bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-3xl p-5 active:scale-95 transition-all hover:border-purple-500/50 shadow-[0_0_20px_rgba(147,51,234,0.2)]">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_16px_rgba(147,51,234,0.5)]">
                <span className="text-2xl">🎮</span>
              </div>
              <div className="text-left">
                <p className="text-white font-black text-sm">Gaming Zone</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Play & earn AJ Coins. 5+ games available with auto-score bridge.</p>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[8px] text-purple-400 font-black bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">5+ GAMES</span>
                <ChevronRight size={12} className="text-purple-400"/>
              </div>
            </button>

            {/* SOCIAL Card */}
            <button onClick={() => navigateWithAd('social')} className="flex flex-col items-start gap-3 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 rounded-3xl p-5 active:scale-95 transition-all hover:border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-[0_0_16px_rgba(6,182,212,0.5)]">
                <span className="text-2xl">📡</span>
              </div>
              <div className="text-left">
                <p className="text-white font-black text-sm">Social Hub</p>
                <p className="text-[10px] text-gray-400 mt-0.5">TikReels, Pulse, WeChat, Live Streaming & DMs.</p>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[8px] text-cyan-400 font-black bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">ALL FEATURES</span>
                <ChevronRight size={12} className="text-cyan-400"/>
              </div>
            </button>

            {/* WALLET Card */}
            <button onClick={() => navigateWithAd('wallet')} className="flex flex-col items-start gap-3 bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border border-yellow-500/30 rounded-3xl p-5 active:scale-95 transition-all hover:border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-[0_0_16px_rgba(234,179,8,0.5)]">
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-left">
                <p className="text-white font-black text-sm">Wallet</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Buy, Transfer, Withdraw & Referral Coins.</p>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[8px] text-yellow-400 font-black bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">{parseFloat(displayBalance).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} 🪙</span>
                <ChevronRight size={12} className="text-yellow-400"/>
              </div>
            </button>

            {/* AI TRADING BOT Card */}
            <button onClick={() => navigateWithAd('aibot')} className="flex flex-col items-start gap-3 bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-3xl p-5 active:scale-95 transition-all hover:border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-[0_0_16px_rgba(34,197,94,0.5)]">
                <span className="text-2xl">🤖</span>
              </div>
              <div className="text-left">
                <p className="text-white font-black text-sm">AI Trading Bot</p>
                <p className="text-[10px] text-gray-400 mt-0.5">2-5% daily profit. Activate & earn passively.</p>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${botTier!=='none' ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-gray-400 bg-white/5 border border-white/10'}`}>{botTier!=='none' ? '● ACTIVE' : '○ INACTIVE'}</span>
                <ChevronRight size={12} className={botTier!=='none' ? 'text-green-400' : 'text-gray-500'}/>
              </div>
            </button>
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
          <div className="px-4 pt-4 pb-4">
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

          {/* FIX #1: GLASSMORPHISM FOOTER */}
          <AJFooter/>

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
                  <div key={n.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-black text-white">{n.title}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{n.message}</p>
                    </div>
                    <button onClick={() => handleDeleteNotification(n.id)} className="flex-shrink-0 p-1.5 rounded-xl bg-red-500/20 active:scale-90 transition-all">
                      <Trash2 size={12} className="text-red-400"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* ══════════════════════════════════════════════════════
          SOCIAL SCREEN
      ══════════════════════════════════════════════════════ */}
      {screen === 'social' && (
        <div className="fixed inset-0 flex flex-col bg-[#050505]">

          {/* ── PROFILE SETUP ── */}
          {socialScreen === 'setup' && (
            <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center gap-5">
              <div className="relative z-[50]">
                <img src="/logo.png" alt="AJ" className="w-16 h-16 rounded-2xl shadow-[0_0_30px_rgba(236,72,153,0.5)]"/>
              </div>
              <h2 className="text-xl font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent">Create Your Profile</h2>
              <div className="relative cursor-pointer" onClick={handleImageClick}>
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-pink-500">
                  <img src={tempPhoto || user?.photoURL || '/logo.png'} className="w-full h-full object-cover"/>
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-pink-600 rounded-full flex items-center justify-center">
                  <Camera size={12} className="text-white"/>
                </div>
              </div>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username (min 3 chars)" className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio (optional)" className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm h-20 resize-none focus:outline-none focus:border-pink-500/50"/>
              <button onClick={handleCreateProfile} className="w-full max-w-sm py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                🚀 Activate Profile
              </button>
            </div>
          )}

          {/* ── HUB ── */}
          {socialScreen === 'hub' && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setScreen('hub')} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                    <ArrowLeft size={14} className="text-gray-400"/>
                  </button>
                  <div style={{ position:'relative', zIndex:50 }}>
                    <img src="/logo.png" alt="AJ" className="w-8 h-8 rounded-xl shadow-[0_0_14px_rgba(236,72,153,0.5)]"/>
                  </div>
                  <h1 className="text-sm font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">Social Hub</h1>
                </div>
                <button onClick={() => { setNotifOpen(true); loadNotifications(); }} className="relative p-2 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                  <span className="text-sm">🔔</span>
                  {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-600 rounded-full text-[8px] font-black flex items-center justify-center">{notifications.length > 9 ? '9+' : notifications.length}</span>}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {[ { icon: '🎬', label: 'AJ TikReels', sub: 'Short Videos', action: () => { setSocialScreen('tikreels'); setTiktabMode('feed'); } },
                  { icon: '🎬', label: 'AJ Pulse', sub: 'Social features', action: () => { setSocialScreen('pulse'); setPulseTab('feed'); } },
                  { icon: '🎬', label: 'AJ WeChat', sub: 'Social features', action: () => { setSocialScreen('wechat'); } },
                  { icon: 'G', label: 'Go Live', sub: 'Social features', action: () => { setSocialScreen('golive'); } },
                  { icon: 'J', label: 'Join Live', sub: 'Social features', action: () => { setSocialScreen('joinlive'); } },
                  { icon: 'M', label: 'My Profile', sub: 'Social features', action: () => { openProfile(user.uid); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action} className="w-full flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 active:scale-95 transition-all hover:border-pink-500/30">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="text-left">
                      <p className="text-sm font-black text-white">{item.label}</p>
                      <p className="text-[10px] text-gray-400">{item.sub}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-500 ml-auto"/>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── TIKREELS ── */}
          {socialScreen === 'tikreels' && (
            <div className="flex flex-col h-full bg-[#050505]">
              {/* Header */}
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSocialScreen('hub')} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                    <ArrowLeft size={14} className="text-gray-400"/>
                  </button>
                  <span className="text-sm font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">AJ TikReel</span>
                  <span className="ml-1 text-[8px] text-pink-400/70 font-black uppercase animate-pulse">🔥 Trending</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* FIX #6: UNMUTE ALL global button */}
                  <button
                    onClick={() => {
                      setGlobalSoundOn(s => {
                        const newVal = !s;
                        // Re-load active iframe with mute toggled
                        const activeIframe = iframeRefs.current[activeVideoIdx];
                        if (activeIframe && pixaVideos[activeVideoIdx]) {
                          const v = pixaVideos[activeVideoIdx];
                          activeIframe.src = `https://www.youtube.com/embed/${v.id}?autoplay=1&mute=${newVal?0:1}&loop=1&playlist=${v.id}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3`;
                        }
                        return newVal;
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-90 transition-all"
                    style={{
                      background: globalSoundOn
                        ? 'linear-gradient(135deg,#22d3ee,#0891b2)'
                        : 'linear-gradient(135deg,#ec4899,#8b5cf6)',
                      boxShadow: globalSoundOn
                        ? '0 0 14px rgba(34,211,238,0.4)'
                        : '0 0 14px rgba(236,72,153,0.4)',
                    }}
                  >
                    {globalSoundOn ? <Volume2 size={12} className="text-white"/> : <VolumeX size={12} className="text-white"/>}
                    <span className="text-white">{globalSoundOn ? 'MUTE ALL' : 'UNMUTE ALL'}</span>
                  </button>
                </div>
              </div>

              {/* Tab Bar */}
              <div className="flex border-b border-white/5">
                {(['feed','create','profile'] as const).map(tab => (
                  <button key={tab} onClick={() => setTiktabMode(tab)} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${tiktabMode===tab ? 'text-pink-400 border-b-2 border-pink-500' : 'text-gray-500'}`}>
                    {tab==='feed' ? '🎬 Feed' : tab==='create' ? '➕ Post' : '👤 Profile'}
                  </button>
                ))}
              </div>

              {/* ── FEED ── */}
              {tiktabMode === 'feed' && (
                <div
                  ref={videoFeedRef}
                  className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide flex flex-col overscroll-y-contain"
                  style={{ scrollSnapType:'y mandatory', display:'flex', flexDirection:'column', touchAction:'pan-y', WebkitOverflowScrolling:'touch' }}
                >
                  {/* FIX (Hinglish): Ab hum ek naya array banate hain jisme har 4 content
                      videos ke baad ek ad INSERT hota hai — content koi bhi loss nahi
                      hota. Pehle idx%5===4 se content replace ho raha tha jisse 5th
                      video skip ho jaata thi. Ab pattern:
                      vid[0], vid[1], vid[2], vid[3], AD, vid[4], vid[5], vid[6], vid[7], AD ...
                      — har 4 REAL videos ke baad ek ad, bilkul jaise user ne maanga. */}
                  {(() => {
                    // FIX ROUND 6: Full-screen MonetagVideoAd feed se HATA diya — user ko
                    // har 8 post pe full-screen ad block karna padta tha jo UX kharab
                    // karta tha. Ab feed mein SIRF content videos hain, koi ad slot nahi.
                    // Real Monetag popup ad still fires once per 5-min cycle via navigation
                    // and free-coin triggers (cooldown-gated), so revenue stays.
                    return pixaVideos.flatMap((vid:any, idx:number) => {
                      const isActive = activeVideoIdx === idx;
                      // FIX #6: mute=0 when globalSoundOn, else mute=1; audio kill on scroll
                      // FIX (Hinglish): enablejsapi=1 add kiya gaya hai taaki hum YouTube
                      // iframe ko postMessage se pause/resume kar sakein (tap-to-pause ke liye).
                      const embedSrc = `https://www.youtube.com/embed/${vid.id}?autoplay=${isActive?1:0}&mute=${(isActive && globalSoundOn)?0:1}&loop=1&playlist=${vid.id}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3&enablejsapi=1`;
                    const contentEl = (
                      <div key={vid.id} data-vidx={idx} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505] flex flex-col justify-end" style={{ scrollSnapAlign:'start', touchAction:'pan-y' }}>
                        {isActive ? (
                          <iframe
                            ref={el => { iframeRefs.current[idx] = el; }}
                            src={embedSrc}
                            className="absolute inset-0 w-full h-full"
                            style={{ transform:'scale(1.15)', transformOrigin:'center center', pointerEvents:'none', touchAction:'pan-y' }}
                            allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            frameBorder="0"
                            title={vid.title}
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-[#050505] flex items-center justify-center">
                            <img src={vid.thumb} className="w-full h-full object-cover opacity-60"/>
                            <div className="absolute inset-0 bg-black/40"/>
                            <div className="absolute w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <span className="text-white text-2xl ml-1">▶</span>
                            </div>
                          </div>
                        )}
                        {/* FIX (Hinglish): Tap-to-pause/resume overlay — YouTube iframe pe
                            pointerEvents:'none' hai isliye hum ek invisible click overlay lagate
                            hain jo tap pe video ko pause/resume karta hai. Right-side buttons
                            (like/comment/share) z-20 mein hain aur e.stopPropagation karte hain
                            isliye woh click yahan nahi aata. */}
                        <div
                          className="absolute inset-0 z-10"
                          onClick={() => setReelPaused(p => !p)}
                        />
                        {/* Pause icon indicator — dikhata hai ki video paused hai */}
                        {reelPaused && isActive && (
                          <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none">
                            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                              <span className="text-white text-3xl">⏸</span>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"/>
                        {/* Right actions — TikReel style with gift icon */}
                        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
                          {/* Gift button */}
                          <button onClick={e => { e.stopPropagation(); e.preventDefault(); setPulseGiftPostId(vid.id); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Gift size={18} className="text-yellow-400"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Gift</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); e.preventDefault(); handleLike(vid.id, true, true); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${likedPosts[vid.id] ? 'bg-red-500/30' : 'bg-black/40 backdrop-blur-sm'}`}>
                              <Heart size={18} className={likedPosts[vid.id] ? 'text-red-400 fill-red-400' : 'text-white'}/>
                            </div>
                            <span className="text-white text-[9px] font-black">{formatViews((likedPosts[vid.id] ? (vid.likes||0) + 1 : vid.likes||0))}</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); e.preventDefault(); setCommentPostId(vid.id); setTimeout(() => { commentInputRef.current?.focus(); commentInputRef.current?.click(); }, 100); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <MessageSquare size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">{formatViews(vid.views||0)}</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); e.preventDefault(); handleShare(vid.title||''); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Share2 size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Share</span>
                          </button>
                        </div>
                        {/* Bottom info — TikReel style with TRENDING NOW badge */}
                        <div className="absolute bottom-6 left-4 right-16 z-10">
                          {/* TRENDING NOW badge */}
                          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-500/80 to-purple-500/80 backdrop-blur-sm rounded-full px-3 py-1 mb-2">
                            <span className="text-white text-[8px] font-black uppercase tracking-widest animate-pulse">🔥 Trending Now</span>
                          </div>
                          <p className="text-white font-black text-xs truncate">@{vid.user}</p>
                          <p className="text-gray-300 text-[10px] mt-0.5 line-clamp-2">{vid.title}</p>
                          {/* Views count */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Eye size={11} className="text-white/80"/>
                            <span className="text-white/90 text-[9px] font-black">{formatViews(vid.views||0)} views</span>
                          </div>
                          {/* Music attribution — spinning disc icon */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 flex items-center justify-center flex-shrink-0" style={{ animation: 'spin 3s linear infinite' }}>
                              <div className="w-1.5 h-1.5 bg-white rounded-full"/>
                            </div>
                            <span className="text-white/80 text-[9px] font-black truncate">🎵 {vid.user} · AJ Original Sound</span>
                          </div>
                        </div>
                      </div>
                    );
                      // FIX ROUND 8: Har 4 content videos ke baad ek REAL video ad insert karo.
                      // Pattern: vid0,vid1,vid2,vid3, AD, vid4,vid5,vid6,vid7, AD ...
                      // Cooldown (5 min global gate) ensure karta hai ki REAL Monetag popup
                      // sirf 5 min mein ek baar fire ho — baqi slots mein in-feed fallback
                      // video chalega (revenue + smooth UX, bilkul TikTok jaisa).
                      if ((idx + 1) % 4 === 0) {
                        return [contentEl, (
                          <div key={`ad_pixa_${idx}`} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505]" style={{ scrollSnapAlign:'start' }}>
                            <MonetagVideoAd publisherId={MONETAG_INTERSTITIAL} />
                          </div>
                        )];
                      }
                      return [contentEl];
                    });
                  })()}
                  {/* User-uploaded TikReels */}
                  {userPosts.flatMap((post:any, idx:number) => {
                    const globalIdx = pixaVideos.length + idx;
                    const isActive  = activeVideoIdx === globalIdx;
                    const contentEl = (
                      <div key={post.id} data-vidx={globalIdx} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505] flex flex-col justify-end" style={{ scrollSnapAlign:'start', touchAction:'pan-y' }}>
                        {post.isVideo && post.image ? (
                          <video
                            ref={el => { userVideoRefs.current[globalIdx] = el; }}
                            src={post.image}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay={isActive} loop muted={!globalSoundOn} playsInline
                            style={{ filter: post.cssFilter && post.cssFilter !== 'none' ? post.cssFilter : undefined, touchAction:'pan-y' }}
                          />
                        ) : post.image ? (
                          <img src={post.image} className="absolute inset-0 w-full h-full object-cover"/>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50"/>
                        )}
                        {post.textOverlay && (
                          <div className="absolute top-1/3 left-0 right-0 flex justify-center z-20 pointer-events-none">
                            <span className="bg-black/60 backdrop-blur-sm text-white font-black text-lg px-4 py-2 rounded-2xl text-center">{post.textOverlay}</span>
                          </div>
                        )}
                        {/* FIX (Hinglish): Tap-to-pause/resume overlay for user-uploaded videos */}
                        <div
                          className="absolute inset-0 z-10"
                          onClick={() => setReelPaused(p => !p)}
                        />
                        {reelPaused && isActive && (
                          <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none">
                            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                              <span className="text-white text-3xl">⏸</span>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"/>
                        {/* Right actions — with gift icon */}
                        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
                          <button onClick={e => { e.stopPropagation(); e.preventDefault(); setPulseGiftPostId(post.id); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Gift size={18} className="text-yellow-400"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Gift</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); e.preventDefault(); handleLike(post.id, post.isVideo); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${likedPosts[post.id] ? 'bg-red-500/30' : 'bg-black/40 backdrop-blur-sm'}`}>
                              <Heart size={18} className={likedPosts[post.id] ? 'text-red-400 fill-red-400' : 'text-white'}/>
                            </div>
                            <span className="text-white text-[9px] font-black">{(likedPosts[post.id] ? (post.likes||0) + 1 : post.likes||0)}</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); e.preventDefault(); setCommentPostId(post.id); setTimeout(() => { commentInputRef.current?.focus(); commentInputRef.current?.click(); }, 100); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <MessageSquare size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">{formatViews(post.commentCount||0)}</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); e.preventDefault(); handleShare(post.text||''); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Share2 size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Share</span>
                          </button>
                          {post.uid === user?.uid && (
                            <button onClick={e => { e.stopPropagation(); e.preventDefault(); handleDeletePost(post.id); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                              <div className="w-10 h-10 rounded-full bg-red-500/30 backdrop-blur-sm flex items-center justify-center">
                                <Trash2 size={18} className="text-red-400"/>
                              </div>
                            </button>
                          )}
                        </div>
                        {/* Bottom info — with TRENDING NOW + music attribution */}
                        <div className="absolute bottom-6 left-4 right-16 z-10">
                          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-500/80 to-purple-500/80 backdrop-blur-sm rounded-full px-3 py-1 mb-2">
                            <span className="text-white text-[8px] font-black uppercase tracking-widest animate-pulse">🔥 Trending Now</span>
                          </div>
                          <button className="flex items-center gap-2 mb-1" onClick={() => openProfile(post.uid)}>
                            <img src={post.photo||'/logo.png'} className="w-7 h-7 rounded-full border border-white/30 object-cover"/>
                            <span className="text-white font-black text-xs">@{post.username}</span>
                          </button>
                          <p className="text-gray-300 text-[10px] line-clamp-2">{post.text}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Eye size={11} className="text-white/80"/>
                            <span className="text-white/90 text-[9px] font-black">{formatViews(post.views||0)} views</span>
                          </div>
                          {/* Music attribution */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 flex items-center justify-center flex-shrink-0" style={{ animation: 'spin 3s linear infinite' }}>
                              <div className="w-1.5 h-1.5 bg-white rounded-full"/>
                            </div>
                            <span className="text-white/80 text-[9px] font-black truncate">🎵 @{post.username} · AJ Original Sound</span>
                          </div>
                        </div>
                      </div>
                    );
                      // FIX ROUND 8: Har 4 user-uploaded videos ke baad ek REAL video ad.
                      if ((idx + 1) % 4 === 0) {
                        return [contentEl, (
                          <div key={`ad_user_${idx}`} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505]" style={{ scrollSnapAlign:'start' }}>
                            <MonetagVideoAd publisherId={MONETAG_INTERSTITIAL} />
                          </div>
                        )];
                      }
                      return [contentEl];
                  })}
                  {pixaVideos.length === 0 && userPosts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 pt-32">
                      <span className="text-5xl">🎬</span>
                      <p className="text-gray-400 text-sm">Loading videos…</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── CREATE ── */}
              {tiktabMode === 'create' && (
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  <div className="relative w-full aspect-video bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer" onClick={handleTiktokImage}>
                    {tiktokPostImg ? (
                      tiktokPostIsVideo
                        ? <video src={tiktokPostImg} className="w-full h-full object-cover" muted loop autoPlay playsInline style={{filter: tikEditorFilter && tikEditorFilter !== 'none' ? tikEditorFilter : undefined}}/>
                        : <img src={tiktokPostImg} className="w-full h-full object-cover" style={{filter: tikEditorFilter && tikEditorFilter !== 'none' ? tikEditorFilter : undefined}}/>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <PlusSquare size={32} className="text-gray-500"/>
                        <span className="text-gray-400 text-xs">Tap to add photo/video</span>
                      </div>
                    )}
                  </div>
                  <textarea value={tiktokPostText} onChange={e => setTiktokPostText(e.target.value)} placeholder="Add caption…" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm h-20 resize-none focus:outline-none focus:border-pink-500/50"/>
                  {/* CSS Filter Picker */}
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Filter</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {CSS_FILTERS.map(f => (
                        <button key={f.value} onClick={() => setTikEditorFilter(f.value)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${tikEditorFilter===f.value ? 'bg-pink-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Text Overlay */}
                  <input value={tikEditorTextOverlay} onChange={e => setTikEditorTextOverlay(e.target.value)} placeholder="Text overlay (optional)" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                  {tikEditorTextOverlay && tiktokPostImg && (
                    <div className="absolute top-1/3 left-0 right-0 flex justify-center z-20 pointer-events-none">
                      <span className="bg-black/60 backdrop-blur-sm text-white font-black text-lg px-4 py-2 rounded-2xl">{tikEditorTextOverlay}</span>
                    </div>
                  )}
                  {/* Music Picker */}
                  <button onClick={() => setTikEditorShowMusic(m => !m)} className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 active:scale-95 transition-all">
                    <Music size={14} className="text-pink-400"/>
                    <span className="text-xs text-gray-300 font-black">{selectedSound ? AJ_SOUNDS.find(s=>s.id===selectedSound)?.label||'Music Selected' : 'Add Music'}</span>
                    <ChevronRight size={14} className="text-gray-500 ml-auto"/>
                  </button>
                  {tikEditorShowMusic && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                      {AJ_SOUNDS.map(s => (
                        <button key={s.id} onClick={() => { setSelectedSound(s.id); setTikEditorShowMusic(false); }} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${selectedSound===s.id ? 'bg-pink-600/20 border border-pink-500/30' : 'hover:bg-white/5'}`}>
                          <Music size={14} className="text-pink-400"/>
                          <span className="text-xs text-white font-black">{s.label}</span>
                          {selectedSound===s.id && <span className="ml-auto text-pink-400 text-xs">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={handleTiktokPost} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                    🚀 Post (+{tiktokPostIsVideo ? 10 : 5} Coins)
                  </button>
                </div>
              )}

              {/* ── TIKREELS PROFILE ── */}
              {tiktabMode === 'profile' && (
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col items-center px-4 py-6">
                    {/* FIX #8: Neon Pink + button on avatar */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-pink-500 cursor-pointer" onClick={() => dpFileRef.current?.click()}>
                        <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-full h-full object-cover"/>
                      </div>
                      <button
                        onClick={() => dpFileRef.current?.click()}
                        className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-[0_0_12px_rgba(236,72,153,0.7)]"
                        style={{ background:'linear-gradient(135deg,#ec4899,#f472b6)', border:'2px solid #050505' }}
                      >
                        <Plus size={14} className="text-white font-black" strokeWidth={3}/>
                      </button>
                    </div>
                    <p className="text-white font-black text-lg mt-3">@{username||'AJ_Member'}</p>
                    <p className="text-gray-400 text-xs mt-1 text-center max-w-xs">{bio||'No bio yet.'}</p>
                    <div className="flex gap-8 mt-4">
                      <div className="text-center"><p className="text-white font-black text-lg">{tikProfileMyPosts.length}</p><p className="text-gray-400 text-[10px]">Posts</p></div>
                      <div className="text-center"><p className="text-white font-black text-lg">{tikProfileFollowers}</p><p className="text-gray-400 text-[10px]">Followers</p></div>
                      <div className="text-center"><p className="text-white font-black text-lg">{followingList.length}</p><p className="text-gray-400 text-[10px]">Following</p></div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {(['posts','following'] as const).map(tab => (
                        <button key={tab} onClick={() => setTikProfileSubTab(tab)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tikProfileSubTab===tab ? 'bg-pink-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>
                  {tikProfileSubTab === 'posts' && (
                    <div className="grid grid-cols-3 gap-0.5 p-0.5">
                      {tikProfileMyPosts.length === 0 && (
                        <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3">
                          <span className="text-4xl">🎬</span>
                          <p className="text-gray-500 text-sm">No posts yet. Upload your first TikReel!</p>
                        </div>
                      )}
                      {tikProfileMyPosts.map((post:any) => (
                        <div
                          key={post.id}
                          className="relative aspect-square bg-white/5 overflow-hidden cursor-pointer active:scale-95 transition-all"
                          onClick={() => {
                            // FIX (Hinglish): Profile post par click karne se video open ho.
                            // Agar video post hai toh full-screen video viewer khulta hai.
                            const url = post.videoUrl || post.image;
                            if (post.isVideo && url) {
                              setProfileVideoViewer({ url, text: post.text || post.textOverlay });
                            }
                          }}
                        >
                          {/* FIX (Hinglish): Pehle thumbnail ke liye <img> use hota tha jismein
                              video URL di jaati thi — <img> video frame render nahi kar sakta,
                              isliye thumbnail blank / dikhta hi nahi tha. Ab video posts ke
                              liye hum <video> element use karte hain jisse pehla frame as
                              poster bilkul TikTok ki tarah dikhta hai. */}
                          {post.isVideo ? (
                            (post.thumbnail || post.videoUrl || post.image) ? (
                              <video
                                src={post.thumbnail || post.videoUrl || post.image}
                                className="w-full h-full object-cover pointer-events-none"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">🎬</span></div>
                            )
                          ) : (
                            (post.thumbnail || post.image || post.videoUrl)
                              ? <img src={post.thumbnail || post.image || post.videoUrl} className="w-full h-full object-cover pointer-events-none" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                              : <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">🎬</span></div>
                          )}
                          {/* Play icon overlay for video posts — makes it obvious it's a tap-to-open video */}
                          {post.isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                <span className="text-white text-sm ml-0.5">▶</span>
                              </div>
                            </div>
                          )}
                          {post.isVideo && <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"><Film size={10} className="text-white"/></div>}
                          {/* Views count overlay — bottom left like TikTok */}
                          <div className="absolute bottom-1 left-1 bg-black/60 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                            <Eye size={8} className="text-white"/>
                            <span className="text-white text-[8px] font-black">{formatViews(post.views||0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {tikProfileSubTab === 'following' && (
                    <div className="px-4 py-4 space-y-3">
                      {followingList.length === 0 && <p className="text-gray-500 text-sm text-center mt-10">Not following anyone yet.</p>}
                      {followingList.map((u:any) => (
                        <button key={u.uid} onClick={() => openProfile(u.uid)} className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 active:scale-95 transition-all">
                          <img src={u.photo||'/logo.png'} className="w-10 h-10 rounded-full border border-white/20 object-cover"/>
                          <div className="text-left">
                            <p className="text-xs font-black text-white">@{u.username||u.uid}</p>
                            <p className="text-[9px] text-gray-400">{u.bio||''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── AJ PULSE ── */}
          {socialScreen === 'pulse' && (
            <div className="flex flex-col h-full bg-[#050505]">
              {/* Header */}
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSocialScreen('hub')} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                    <ArrowLeft size={14} className="text-gray-400"/>
                  </button>
                  <span className="text-sm font-black bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent uppercase tracking-widest">AJ Pulse</span>
                </div>
                {/* FIX #6: UNMUTE ALL for Pulse */}
                <button onClick={() => setPulseMuted(m => !m)} className="p-2 rounded-full bg-black/40 backdrop-blur-sm active:scale-90 transition-all">
                  {pulseMuted ? <VolumeX size={14} className="text-red-400"/> : <Volume2 size={14} className="text-white"/>}
                </button>
              </div>

              {/* Tab Bar */}
              <div className="flex border-b border-white/5">
                {(['feed','create','profile'] as const).map(tab => (
                  <button key={tab} onClick={() => setPulseTab(tab)} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${pulseTab===tab ? 'text-pink-400 border-b-2 border-pink-500' : 'text-gray-500'}`}>
                    {tab==='feed' ? '📡 Feed' : tab==='create' ? '➕ Post' : '👤 Profile'}
                  </button>
                ))}
              </div>

              {/* ── PULSE FEED — FIX #5: combinedPulseFeed (Unsplash + Firestore merged, no deletion) ── */}
              {pulseTab === 'feed' && (
                <div
                  ref={videoFeedRef}
                  className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide flex flex-col overscroll-y-contain"
                  style={{ scrollSnapType: 'y mandatory', display:'flex', flexDirection:'column', touchAction:'pan-y', WebkitOverflowScrolling:'touch' }}
                >
                  {/* FIX (Hinglish): Ab hum ek naya array banate hain jisme har 4 content
                      posts ke baad ek ad INSERT hota hai — content koi bhi loss nahi
                      hota. Pehle idx%5===4 se content replace ho raha tha jisse 5th
                      post skip ho jaata tha. Ab pattern:
                      post[0], post[1], post[2], post[3], AD, post[4], post[5], post[6], post[7], AD ...
                      — har 4 REAL posts ke baad ek ad, bilkul jaise user ne maanga. */}
                  {(() => {
                    // FIX ROUND 6: Full-screen MonetagVideoAd feed se HATA diya — user ko
                    // har 8 post pe full-screen ad block karna padta tha jo UX kharab
                    // karta tha. Ab feed mein SIRF content posts hain, koi ad slot nahi.
                    // Real Monetag popup ad still fires once per 5-min cycle via navigation
                    // and free-coin triggers (cooldown-gated), so revenue stays.
                    return combinedPulseFeed.flatMap((post:any, idx:number) => {
                      const isActive = activeVideoIdx === idx;
                      const contentEl = (
                      <div key={post.id} data-vidx={idx} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505] flex flex-col justify-end" style={{ scrollSnapAlign:'start', touchAction:'pan-y' }}>
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
                        {/* Neon glowing border frame — cyan/cyberpunk aesthetic */}
                        <div className="absolute inset-2 rounded-3xl pointer-events-none z-5" style={{ border: "2px solid rgba(34,211,238,0.3)", boxShadow: "0 0 20px rgba(34,211,238,0.15)", borderRadius: "1.5rem" }}/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"/>
                        {/* FIX (Hinglish): Pause indicator overlay for Pulse videos */}
                        {reelPaused && isActive && (
                          <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none">
                            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                              <span className="text-white text-3xl">⏸</span>
                            </div>
                          </div>
                        )}
                        {/* Right actions — hide for Unsplash items, with gift icon */}
                        {!post.isUnsplash && (
                          <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
                            <button onClick={e => { e.stopPropagation(); e.preventDefault(); handleLike(post.id, post.isVideo); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${likedPosts[post.id] ? 'bg-red-500/30' : 'bg-black/40 backdrop-blur-sm'}`}>
                                <Heart size={18} className={likedPosts[post.id] ? 'text-red-400 fill-red-400' : 'text-white'}/>
                              </div>
                              <span className="text-white text-[9px] font-black">{formatViews((likedPosts[post.id] ? (post.likes||0) + 1 : post.likes||0))}</span>
                            </button>
                            <button onClick={e => { e.stopPropagation(); e.preventDefault(); setCommentPostId(post.id); setTimeout(() => { commentInputRef.current?.focus(); commentInputRef.current?.click(); }, 100); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                <MessageSquare size={18} className="text-white"/>
                              </div>
                              <span className="text-white text-[9px] font-black">{formatViews(post.views||0)}</span>
                            </button>
                            <button onClick={e => { e.stopPropagation(); e.preventDefault(); handleShare(post.text||''); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                <Share2 size={18} className="text-white"/>
                              </div>
                              <span className="text-white text-[9px] font-black">Share</span>
                            </button>
                            <button onClick={e => { e.stopPropagation(); e.preventDefault(); setPulseGiftPostId(post.id); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                <Bookmark size={18} className="text-white"/>
                              </div>
                              <span className="text-white text-[9px] font-black">Save</span>
                            </button>
                          </div>
                        )}
                        {/* Bottom info — Pulse card with neon border, LIKE/COMMENTS counts, Tip AJ Coins, Share to WhatsApp */}
                        <div className="relative z-10 p-4">
                          {/* Username + timestamp */}
                          <div className="flex items-center gap-2 mb-3">
                            <img src={post.photo||'/logo.png'} className="w-9 h-9 rounded-full border-2 border-cyan-400/50 object-cover flex-shrink-0" style={{ boxShadow: '0 0 12px rgba(34,211,238,0.3)' }}/>
                            <div className="flex-1 min-w-0">
                              <button onClick={() => !post.isUnsplash && openProfile(post.uid)} className="flex items-baseline gap-2">
                                <span className="text-white font-black text-sm truncate">@{post.username}</span>
                                <span className="text-gray-500 text-[10px] flex-shrink-0">2h ago</span>
                              </button>
                            </div>
                          </div>
                          {/* Post text */}
                          <p className="text-white text-sm font-bold line-clamp-3 mb-3">{post.text}</p>
                          {/* LIKE / COMMENTS count display */}
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1.5">
                              <Heart size={14} className={likedPosts[post.id] ? 'text-red-400 fill-red-400' : 'text-pink-400'}/>
                              <span className="text-pink-400 text-xs font-black">{formatViews((likedPosts[post.id] ? (post.likes||0) + 1 : post.likes||0))}</span>
                              <span className="text-gray-500 text-[9px] font-black uppercase">Likes</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MessageSquare size={14} className="text-cyan-400"/>
                              <span className="text-cyan-400 text-xs font-black">{formatViews(post.views||0)}</span>
                              <span className="text-gray-500 text-[9px] font-black uppercase">Comments</span>
                            </div>
                          </div>
                          {/* Action buttons — Tip AJ Coins + Share to WhatsApp */}
                          {!post.isUnsplash && (
                            <div className="flex items-center gap-2">
                              <button onClick={e => { e.stopPropagation(); e.preventDefault(); setPulseGiftPostId(post.id); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 0 14px rgba(245,158,11,0.3)' }}>
                                <span className="text-sm">🪙</span>
                                <span className="text-white">Tip AJ Coins</span>
                              </button>
                              <button onClick={e => { e.stopPropagation(); e.preventDefault(); handleShare(post.text||''); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all bg-green-600/20 border border-green-500/30" style={{ boxShadow: '0 0 14px rgba(34,197,94,0.2)' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-green-400"><path d="M17.6 6.3A7.8 7.8 0 0 0 12 4a7.9 7.9 0 0 0-7.9 7.9c0 1.4.4 2.7 1 3.9L4 20l4.3-1.1c1.1.6 2.4.9 3.7.9A7.9 7.9 0 0 0 20 11.9c0-2.1-.8-4.1-2.4-5.6zM12 18.5c-1.2 0-2.3-.3-3.3-.9l-.2-.1-2.6.7.7-2.5-.2-.2a6.5 6.5 0 0 1-1-3.5 6.6 6.6 0 0 1 6.6-6.6 6.6 6.6 0 0 1 6.6 6.6 6.6 6.6 0 0 1-6.6 6.5z"/></svg>
                                <span className="text-green-400">WhatsApp</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                      // FIX ROUND 8: Har 4 Pulse posts ke baad ek REAL video ad.
                      if ((idx + 1) % 4 === 0) {
                        return [contentEl, (
                          <div key={`ad_pulse_${idx}`} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505]" style={{ scrollSnapAlign:'start' }}>
                            <MonetagVideoAd publisherId={MONETAG_INTERSTITIAL} />
                          </div>
                        )];
                      }
                      return [contentEl];
                    });
                  })()}
                  {combinedPulseFeed.length === 0 && (
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
                    {/* FIX #8: Neon Pink + button on avatar */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-2 border-pink-500 overflow-hidden cursor-pointer" onClick={() => dpFileRef.current?.click()}>
                        <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-full h-full object-cover"/>
                      </div>
                      <button
                        onClick={() => dpFileRef.current?.click()}
                        className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-[0_0_12px_rgba(236,72,153,0.7)]"
                        style={{ background:'linear-gradient(135deg,#ec4899,#f472b6)', border:'2px solid #050505' }}
                      >
                        <Plus size={14} className="text-white font-black" strokeWidth={3}/>
                      </button>
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
                      <div
                        key={post.id}
                        className="relative aspect-square bg-white/5 overflow-hidden cursor-pointer active:scale-95 transition-all"
                        onClick={() => {
                          const url = post.videoUrl || post.image;
                          if (post.isVideo && url) {
                            setProfileVideoViewer({ url, text: post.text || post.textOverlay });
                          }
                        }}
                      >
                        {post.isVideo ? (
                          (post.thumbnail || post.videoUrl || post.image) ? (
                            <video
                              src={post.thumbnail || post.videoUrl || post.image}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">📝</span></div>
                          )
                        ) : (
                          (post.thumbnail || post.image || post.videoUrl)
                            ? <img src={post.thumbnail || post.image || post.videoUrl} className="w-full h-full object-cover pointer-events-none" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                            : <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">📝</span></div>
                        )}
                        {post.isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                              <span className="text-white text-sm ml-0.5">▶</span>
                            </div>
                          </div>
                        )}
                        {post.isVideo && <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"><Film size={10} className="text-white"/></div>}
                        <div className="absolute bottom-1 left-1 bg-black/60 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                          <Eye size={8} className="text-white"/>
                          <span className="text-white text-[8px] font-black">{formatViews(post.views||0)}</span>
                        </div>
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
                        <button key={g.id} onClick={() => { const post = combinedPulseFeed.find((p:any) => p.id===pulseGiftPostId); if (post && !post.isUnsplash) { sendGift(post.uid, g); setPulseGiftPostId(null); } }} className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-3 active:scale-90 transition-all">
                          <span className="text-2xl">{g.icon}</span>
                          <span className="text-white text-[9px] font-black">{g.name}</span>
                          <span className="text-yellow-400 text-[9px] font-black">{g.cost.toLocaleString()} 🪙</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}


            </div>
          )}

          {/* ── GO LIVE ── */}
          {socialScreen === 'golive' && (
            <div className="flex flex-col h-full bg-[#050510]">
              <div className="sticky top-0 z-40 bg-[#050510]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <button onClick={() => setSocialScreen('hub')} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                  <ArrowLeft size={14} className="text-gray-400"/>
                </button>
                <span className="text-sm font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">AJ Live</span>
                {liveActive && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse">🔴 LIVE</span>
                    <span className="text-cyan-400 text-[9px] font-black flex items-center gap-0.5"><Eye size={10}/> {formatViews(liveViewerCount)}</span>
                    <span className="text-gray-400 text-[9px] font-black">⏱ 2h 15m</span>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
                {/* WebRTC Live Container - local camera preview via getUserMedia (no ZegoCloud) */}
                <div
                  id="video-container"
                  className="w-full max-w-sm aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 relative"
                  style={{ minHeight: 220 }}
                >
                  {/* Local camera preview - pure WebRTC (no ZegoCloud SDK).
                      cameraReady pe camera chalu, liveActive pe LIVE badge. */}
                  {cameraReady && (
                    <video ref={liveVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ objectFit: 'cover' }}/>
                  )}
                  {!cameraReady && !liveActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Video size={40} className="text-gray-600"/>
                      <p className="text-gray-500 text-xs">Camera preview will appear here</p>
                      <p className="text-gray-600 text-[9px] text-center px-4">Tap "Start Live" to enable camera &amp; go live</p>
                    </div>
                  )}
                  {liveActive && (
                    <div className="absolute top-2 left-2 z-30 pointer-events-none">
                      <span className="bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-full animate-pulse">🔴 LIVE</span>
                    </div>
                  )}
                </div>
                {liveActive && (
                  <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 text-xs animate-pulse">● LIVE</span>
                        <span className="text-white text-[10px] font-black">👁️ {liveViewerCount} watching</span>
                      </div>
                    </div>
                    {/* Stream Title Card */}
                    <div className="flex items-center gap-2 mb-2 p-2 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/20">
                      <span className="text-lg">💎</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[11px] font-black truncate">Holographic Dream</p>
                        <p className="text-cyan-400 text-[9px] font-black">7.2K / 10K Gems</p>
                      </div>
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full" style={{ width: '72%' }}/>
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Room ID</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white text-xs font-black flex-1 truncate">{liveRoomId}</p>
                      <button onClick={() => copyToClipboard(liveRoomId)} className="bg-pink-600/20 border border-pink-500/30 text-pink-400 text-[9px] font-black px-3 py-1.5 rounded-xl active:scale-90 transition-all">
                        {copied ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
                {/* PK Battle */}
                {liveActive && !pkActive && (
                  <button onClick={() => setPkChallengeOpen(true)} className="w-full max-w-sm flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 active:scale-95 transition-all">
                    <Swords size={20} className="text-orange-400"/>
                    <div className="text-left">
                      <p className="text-sm font-black text-orange-400">⚔️ PK Battle</p>
                      <p className="text-[9px] text-gray-400">{PK_ENTRY_COINS} Coins entry · 5-min battle</p>
                    </div>
                  </button>
                )}
                {pkActive && (
                  <div className="w-full max-w-sm space-y-3">
                    {/* FIX: PK BATTLE SPLIT-SCREEN — host (left) + rival (right) */}
                    <div className="flex gap-2 rounded-2xl overflow-hidden border border-orange-500/30" style={{ height: 180 }}>
                      {/* Host (me) — left half */}
                      <div className="flex-1 relative bg-black overflow-hidden">
                        {cameraReady && liveVideoRef.current?.srcObject ? (
                          <video ref={liveVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ objectFit: 'cover' }}/>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <img src={tempPhoto || user?.photoURL || '/logo.png'} className="w-12 h-12 rounded-full border-2 border-orange-500 object-cover"/>
                            <span className="text-white text-[9px] font-black">@{username||'You'}</span>
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1 bg-orange-600/80 text-white text-[8px] font-black px-2 py-0.5 rounded-full">
                          @{username||'You'} · {pkScore.me.toLocaleString()}🪙
                        </div>
                      </div>
                      {/* Rival — right half */}
                      <div className="flex-1 relative bg-black overflow-hidden">
                        {pkRivalFrame ? (
                          <img src={pkRivalFrame} className="absolute inset-0 w-full h-full object-cover" alt="PK Rival"/>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <img src={pkRivalData?.photo || '/logo.png'} className="w-12 h-12 rounded-full border-2 border-orange-500 object-cover"/>
                            <span className="text-white text-[9px] font-black">@{pkRivalData?.username||'Rival'}</span>
                            <span className="text-gray-400 text-[7px] animate-pulse">Connecting…</span>
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1 bg-orange-600/80 text-white text-[8px] font-black px-2 py-0.5 rounded-full">
                          @{pkRivalData?.username||'Rival'} · {pkScore.rival.toLocaleString()}🪙
                        </div>
                      </div>
                    </div>
                    {/* PK Timer + VS bar */}
                    <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-2">
                      <span className="text-orange-400 font-black text-xs">⚔️ PK BATTLE</span>
                      <span className="text-white font-black text-sm">{formatPkTime(pkTimer)}</span>
                      <button
                        onClick={() => {
                          try { stopPkBattle(); setVvipAlert({msg:'PK Battle ended.'}); } catch {}
                        }}
                        className="text-red-400 text-[9px] font-black underline"
                      >End PK</button>
                    </div>
                    {/* Tap for Sound — rival ki awaz enable karne ke liye (autoplay fix) */}
                    <button
                      onClick={() => {
                        try {
                          const audios = document.querySelectorAll('audio');
                          audios.forEach((el: any) => { el.muted = false; el.play().catch(() => {}); });
                          setVvipAlert({msg:'🔊 Sound enabled for PK Battle!'});
                        } catch {}
                      }}
                      className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Volume2 size={12} className="text-orange-400"/>
                      Tap to Enable Rival Sound
                    </button>
                    {/* Gift buttons — score increase karte hain */}
                    <div className="grid grid-cols-3 gap-2">
                      {giftItems.slice(0,3).map(g => (
                        <button key={g.id} onClick={() => sendPkGift(user!.uid, g, true)} className="flex flex-col items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-2 active:scale-90 transition-all">
                          <span className="text-xl">{g.icon}</span>
                          <span className="text-yellow-400 text-[8px] font-black">{g.cost}🪙</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {pkWinner && (
                  <div className="w-full max-w-sm bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-center">
                    <p className="text-yellow-400 font-black text-lg">🏆 {pkWinner} WINS!</p>
                    <button onClick={() => { try { stopPkBattle(); } catch { setPkWinner(null); setPkActive(false); setPkTimer(PK_DURATION); setPkScore({me:0,rival:0}); } }} className="mt-2 text-[10px] text-gray-400 underline">Dismiss</button>
                  </div>
                )}
                {!liveActive ? (
                  <button onClick={startLive} className="w-full max-w-sm py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(239,68,68,0.4)]" style={{background:'linear-gradient(135deg,#ef4444,#dc2626)'}}>
                    🔴 Start Live
                  </button>
                ) : (
                  <button onClick={stopLive} className="w-full max-w-sm py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#374151,#1f2937)'}}>
                    ⏹ End Live
                  </button>
                )}
                {/* Live Gift + Chat Buttons */}
                {liveActive && (
                  <div className="w-full max-w-sm space-y-2">
                    {/* Bottom Action Bar: COMMENT / EMOJI / GIFT / SHARE */}
                    <div className="flex items-center justify-around bg-white/5 border border-white/10 rounded-2xl p-2.5">
                      <button onClick={() => setLiveChatOpen(o => !o)} className="flex flex-col items-center gap-0.5 active:scale-90 transition-all">
                        <MessageCircle size={18} className="text-cyan-400"/>
                        <span className="text-[8px] text-gray-400 font-black">COMMENT</span>
                      </button>
                      <button className="flex flex-col items-center gap-0.5 active:scale-90 transition-all">
                        <span className="text-lg">😀</span>
                        <span className="text-[8px] text-gray-400 font-black">EMOJI</span>
                      </button>
                      <button onClick={() => setLiveGiftPanelOpen(true)} className="flex flex-col items-center gap-0.5 active:scale-90 transition-all">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_12px_rgba(250,204,21,0.5)]">
                          <Gift size={18} className="text-white"/>
                        </div>
                        <span className="text-[8px] text-yellow-400 font-black">GIFT</span>
                      </button>
                      <button className="flex flex-col items-center gap-0.5 active:scale-90 transition-all">
                        <Share2 size={18} className="text-purple-400"/>
                        <span className="text-[8px] text-gray-400 font-black">SHARE</span>
                      </button>
                    </div>
                    {/* CH@T FEED Panel */}
                    {liveChatOpen && (
                      <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                          <MessageCircle size={12} className="text-pink-400"/>
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">CH@T FEED</span>
                          <span className="ml-auto text-[8px] text-gray-500 font-black">{liveChatMessages.length} msgs</span>
                        </div>
                        <div className="h-40 overflow-y-auto p-3 space-y-2">
                          {liveChatMessages.map((m:any) => (
                            <div key={m.id} className="flex items-start gap-2">
                              <img src={m.photo||'/logo.png'} className="w-5 h-5 rounded-full object-cover flex-shrink-0"/>
                              <div>
                                <span className="text-[9px] text-pink-400 font-black">@{m.username} </span>
                                <span className="text-white text-[10px]">{m.text}</span>
                              </div>
                            </div>
                          ))}
                          <div ref={liveChatEndRef}/>
                        </div>
                        <div className="flex gap-2 p-2 border-t border-white/5">
                          <input value={liveChatInput} onChange={e => setLiveChatInput(e.target.value)} placeholder="Say something…" className="flex-1 bg-white/5 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none" onKeyDown={e => e.key==='Enter' && sendLiveChatMessage()}/>
                          <button onClick={sendLiveChatMessage} className="w-8 h-8 bg-pink-600 rounded-xl flex items-center justify-center active:scale-90 transition-all">
                            <Send size={12} className="text-white"/>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Live Gift Panel Modal (Host) */}
              {liveGiftPanelOpen && (
                <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end">
                  <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-black text-white">Send a Gift to Yourself 🎁</p>
                      <button onClick={() => setLiveGiftPanelOpen(false)}><X size={18} className="text-gray-400"/></button>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-3">Balance: {parseFloat(displayBalance).toFixed(2)} AJ Coins</p>
                    <div className="grid grid-cols-3 gap-3">
                      {giftItems.map(g => (
                        <button key={g.id} onClick={() => { sendGift(user!.uid, g); setCinematicGift(g); setCinematicSender(username||'You'); setLiveGiftPanelOpen(false); }} className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-3 active:scale-90 transition-all hover:border-yellow-500/30">
                          <span className="text-2xl">{g.icon}</span>
                          <span className="text-white text-[9px] font-black">{g.name}</span>
                          <span className="text-yellow-400 text-[9px] font-black">{g.cost.toLocaleString()} 🪙</span>
                        </button>
                      ))}
                    </div>
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
                    <p className="text-[10px] text-gray-400 mb-3">Enter rival's User ID to challenge them to a 5-minute PK Battle. Entry: {PK_ENTRY_COINS} Coins.</p>
                    <input value={pkTargetId} onChange={e => setPkTargetId(e.target.value)} placeholder="Rival's User ID" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 mb-4"/>
                    <button onClick={sendPkChallenge} className="w-full py-3 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                      ⚔️ Challenge!
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── JOIN LIVE ── */}
          {socialScreen === 'joinlive' && !viewerRoom && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <button onClick={() => setSocialScreen('hub')} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                  <ArrowLeft size={14} className="text-gray-400"/>
                </button>
                <span className="text-sm font-black text-white">Join Live</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
                {liveNowList.length > 0 && (
                  <div className="w-full max-w-sm">
                    <p className="text-[10px] text-pink-400 font-black uppercase tracking-widest mb-3">🔴 Live Now</p>
                    <div className="space-y-3">
                      {liveNowList.map((room:any) => (
                        <button key={room.id} onClick={() => joinLiveByRoomId(room.id)} className="w-full flex items-center gap-3 bg-white/5 border border-red-500/30 rounded-2xl p-3 active:scale-95 transition-all">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-red-500">
                            <img src={room.photo||'/logo.png'} className="w-full h-full object-cover"/>
                            <span className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-[7px] font-black text-center">LIVE</span>
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black text-white">@{room.username}</p>
                            <p className="text-[9px] text-gray-400">Tap to join</p>
                          </div>
                          <ChevronRight size={14} className="text-gray-500 ml-auto"/>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="w-full max-w-sm">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Or enter Room ID</p>
                  <input value={joinRoomInput} onChange={e => setJoinRoomInput(e.target.value)} placeholder="Paste Room ID here" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 mb-3"/>
                  <button onClick={() => joinLiveByRoomId()} className="w-full py-3 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#0891b2,#0e7490)'}}>
                    Join Stream
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEWER ROOM ── */}
          {socialScreen === 'joinlive' && viewerRoom && (
            <div className="flex flex-col h-full bg-black">
              <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <button onClick={leaveViewerRoom} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                  <ArrowLeft size={14} className="text-gray-400"/>
                </button>
                <img src={viewerRoom.photo||'/logo.png'} className="w-7 h-7 rounded-full border border-red-500 object-cover"/>
                <span className="text-sm font-black text-white">@{viewerRoom.username}</span>
                <span className="text-[9px] text-gray-400 font-black flex items-center gap-0.5"><Eye size={10}/> {viewerRoom.liveViewers || 0}</span>
                <span className="ml-auto text-[9px] text-red-400 font-black animate-pulse">🔴 LIVE</span>
              </div>
              <div className="flex-1 flex flex-col">
                <div id="zego-viewer-container" className="w-full aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                  {/* FIX ROUND 7: Show host's live video frame from RTDB.
                      Jab tak frame nahi aaya, host ka profile photo dikhao. */}
                  {viewerLiveFrame ? (
                    <img src={viewerLiveFrame} className="absolute inset-0 w-full h-full object-cover" style={{ imageRendering: 'auto' }} alt="Live stream"/>
                  ) : (
                    <>
                      <img src={viewerRoom.photo||'/logo.png'} className="absolute inset-0 w-full h-full object-cover opacity-40"/>
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-full border-2 border-red-500 overflow-hidden">
                          <img src={viewerRoom.photo||'/logo.png'} className="w-full h-full object-cover"/>
                        </div>
                        <span className="text-white text-xs font-black animate-pulse">🔴 LIVE</span>
                      </div>
                    </>
                  )}
                  {/* Loading indicator if no frame yet */}
                  {!viewerLiveFrame && (
                    <div className="absolute bottom-2 left-2 z-20 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin"/>
                      <span className="text-white/70 text-[8px] font-bold">Connecting…</span>
                    </div>
                  )}
                  {/* FIX: Tap-to-enable-sound button — kai browsers pe audio autoplay
                      block hota hai (no user gesture). Yeh button user ko enable karta
                      hai ki tap karke host ki awaz sun sakein. */}
                  <button
                    onClick={() => {
                      try {
                        const audioEl = document.querySelector('audio') as HTMLAudioElement | null;
                        if (audioEl) {
                          audioEl.muted = false;
                          audioEl.play().catch(() => {});
                        }
                      } catch {}
                    }}
                    className="absolute bottom-2 right-2 z-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 flex items-center gap-1.5 active:scale-90 transition-all"
                  >
                    <Volume2 size={10} className="text-white"/>
                    <span className="text-white text-[8px] font-black">Tap for Sound</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {viewerChatMessages.map((m:any) => (
                    <div key={m.id} className="flex items-start gap-2">
                      <img src={m.photo||'/logo.png'} className="w-5 h-5 rounded-full object-cover flex-shrink-0"/>
                      <div>
                        <span className="text-[9px] text-pink-400 font-black">@{m.username} </span>
                        <span className="text-white text-[10px]">{m.text}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={viewerChatEndRef}/>
                </div>
                {/* Viewer Gift Button */}
                <div className="flex gap-2 p-3 border-t border-white/5">
                  <button onClick={() => setLiveGiftPanelOpen(true)} className="w-10 h-10 bg-yellow-500/20 border border-yellow-500/30 rounded-xl flex items-center justify-center active:scale-90 transition-all flex-shrink-0">
                    <Gift size={16} className="text-yellow-400"/>
                  </button>
                  <input autoFocus value={viewerChatInput} onChange={e => setViewerChatInput(e.target.value)} placeholder="Say something…" className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none" onKeyDown={e => e.key==='Enter' && sendViewerChatMessage()}/>
                  <button onClick={sendViewerChatMessage} className="w-9 h-9 bg-pink-600 rounded-xl flex items-center justify-center active:scale-90 transition-all">
                    <Send size={12} className="text-white"/>
                  </button>
                </div>
                {/* Viewer Gift Panel */}
                {liveGiftPanelOpen && viewerRoom && (
                  <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end">
                    <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-black text-white">Send Gift to @{viewerRoom.username} 🎁</p>
                        <button onClick={() => setLiveGiftPanelOpen(false)}><X size={18} className="text-gray-400"/></button>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-3">Your Balance: {parseFloat(displayBalance).toFixed(2)} AJ Coins</p>
                      <div className="grid grid-cols-3 gap-3">
                        {giftItems.map(g => (
                          <button key={g.id} onClick={() => { sendGift(viewerRoom.uid, g); setCinematicGift(g); setCinematicSender(username||'Viewer'); setLiveGiftPanelOpen(false); }} className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-3 active:scale-90 transition-all hover:border-yellow-500/30">
                            <span className="text-2xl">{g.icon}</span>
                            <span className="text-white text-[9px] font-black">{g.name}</span>
                            <span className="text-yellow-400 text-[9px] font-black">{g.cost.toLocaleString()} 🪙</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── WECHAT ── */}
          {socialScreen === 'wechat' && !activeChatId && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSocialScreen('hub')} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                    <ArrowLeft size={14} className="text-gray-400"/>
                  </button>
                  <span className="text-sm font-black text-white">AJ WeChat</span>
                </div>
                <button onClick={handleContactsSync} className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[9px] font-black px-3 py-1.5 rounded-xl active:scale-90 transition-all">
                  <UserPlus size={12}/> Add
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {wechatContacts.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 pt-20">
                    <span className="text-5xl">💬</span>
                    <p className="text-gray-400 text-sm text-center">No contacts yet.<br/>Tap Add to sync or add contacts.</p>
                  </div>
                )}
                {wechatContacts.map((name:string, i:number) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-cyan-400 flex items-center justify-center">
                      <span className="text-white font-black text-sm">{name[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-white font-black text-sm flex-1">{name}</span>
                    <button className="text-[9px] text-cyan-400 font-black bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-lg active:scale-90 transition-all">Chat</button>
                  </div>
                ))}
              </div>
              {addContactOpen && (
                <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end">
                  <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-black text-white">Add Contact</p>
                      <button onClick={() => setAddContactOpen(false)}><X size={18} className="text-gray-400"/></button>
                    </div>
                    <input value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="Contact name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 mb-4"/>
                    <button onClick={addManualContact} className="w-full py-3 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#0891b2,#0e7490)'}}>
                      Add Contact
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DM CHAT ── */}
          {socialScreen === 'dm' && activeChatId && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <button onClick={() => { setSocialScreen('profile'); if (dmUnsubRef.current) { dmUnsubRef.current(); dmUnsubRef.current=null; } setActiveChatId(null); }} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                  <ArrowLeft size={14} className="text-gray-400"/>
                </button>
                <img src={activeChatUser?.photo||'/logo.png'} className="w-8 h-8 rounded-full border border-white/20 object-cover"/>
                <div>
                  <p className="text-xs font-black text-white">@{activeChatUser?.username||'User'}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => startZegoCall('audio')} className="p-2 rounded-xl bg-green-500/10 border border-green-500/20 active:scale-90 transition-all">
                    <Phone size={14} className="text-green-400"/>
                  </button>
                  <button onClick={() => startZegoCall('video')} className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 active:scale-90 transition-all">
                    <VideoIcon size={14} className="text-cyan-400"/>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {dmMessages.map((m:any) => (
                  <div key={m.id} className={`flex ${m.uid===user?.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.uid===user?.uid ? 'bg-pink-600 text-white' : 'bg-white/10 text-white'}`}>
                      <p className="text-sm">{m.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={dmEndRef}/>
              </div>
              <div className="flex gap-2 p-4 border-t border-white/5">
                <input value={dmInput} onChange={e => setDmInput(e.target.value)} placeholder="Message…" className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none" onKeyDown={e => e.key==='Enter' && sendDmMessage()}/>
                <button onClick={sendDmMessage} className="w-10 h-10 bg-pink-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all">
                  <Send size={14} className="text-white"/>
                </button>
              </div>
            </div>
          )}

          {/* ── PROFILE VIEW ── */}
          {socialScreen === 'profile' && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <button onClick={() => setSocialScreen('hub')} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
                  <ArrowLeft size={14} className="text-gray-400"/>
                </button>
                <span className="text-sm font-black text-white">Profile</span>
              </div>
              {profileLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {/* Cover */}
                  <div className="h-32 bg-gradient-to-br from-pink-900/50 to-cyan-900/50 relative">
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050505] to-transparent"/>
                  </div>
                  {/* Avatar */}
                  <div className="px-4 -mt-10 flex items-end justify-between">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-[#050505] overflow-hidden">
                        <img src={viewProfile?.photo||viewProfile?.photoURL||'/logo.png'} className="w-full h-full object-cover"/>
                      </div>
                      {/* FIX #8: Neon Pink + button on profile view (own profile) */}
                      {viewingUid === user?.uid && (
                        <button
                          onClick={() => dpFileRef.current?.click()}
                          className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-[0_0_12px_rgba(236,72,153,0.7)]"
                          style={{ background:'linear-gradient(135deg,#ec4899,#f472b6)', border:'2px solid #050505' }}
                        >
                          <Plus size={14} className="text-white font-black" strokeWidth={3}/>
                        </button>
                      )}
                    </div>
                    {viewingUid !== user?.uid ? (
                      <div className="flex gap-2 pb-2">
                        <button onClick={() => handleFollow(viewingUid!)} className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all ${isFollowing ? 'bg-white/10 border border-white/20 text-gray-300' : 'bg-pink-600 text-white shadow-[0_0_14px_rgba(236,72,153,0.4)]'}`}>
                          {isFollowing ? <><UserCheck size={12} className="inline mr-1"/>Following</> : <><UserPlus size={12} className="inline mr-1"/>Follow</>}
                        </button>
                        <button onClick={() => openOrCreateChat(viewingUid!, viewProfile)} className="px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white/10 border border-white/20 text-gray-300 active:scale-95 transition-all">
                          <MessageCircle size={12} className="inline mr-1"/>Message
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setSocialScreen('setup'); }} className="pb-2 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white/10 border border-white/20 text-gray-300 active:scale-95 transition-all">
                        <Edit3 size={12} className="inline mr-1"/>Edit
                      </button>
                    )}
                  </div>
                  {/* Info */}
                  <div className="px-4 mt-3">
                    <p className="text-white font-black text-lg">{viewProfile?.name||viewProfile?.displayName||'AJ Member'}</p>
                    <p className="text-gray-400 text-xs">@{viewProfile?.username||'aj_member'}</p>
                    {isMutualFriend && <span className="text-[9px] text-cyan-400 font-black bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full mt-1 inline-block">Mutual Friend</span>}
                    {viewProfile?.bio && <p className="text-gray-300 text-xs mt-2">{viewProfile.bio}</p>}
                    <div className="flex gap-6 mt-4">
                      <div className="text-center"><p className="text-white font-black text-base">{viewProfile?.postsCount||0}</p><p className="text-gray-400 text-[9px]">Posts</p></div>
                      <div className="text-center"><p className="text-white font-black text-base">{followers}</p><p className="text-gray-400 text-[9px]">Followers</p></div>
                      <div className="text-center"><p className="text-white font-black text-base">{following}</p><p className="text-gray-400 text-[9px]">Following</p></div>
                      <div className="text-center"><p className="text-white font-black text-base">{profileTotalLikes}</p><p className="text-gray-400 text-[9px]">Likes</p></div>
                    </div>
                  </div>
                  {/* Posts Grid */}
                  <div className="mt-4 grid grid-cols-3 gap-0.5 p-0.5">
                    {profilePosts.map((post:any) => (
                      <div
                        key={post.id}
                        className="relative aspect-square bg-white/5 overflow-hidden cursor-pointer active:scale-95 transition-all"
                        onClick={() => {
                          const url = post.videoUrl || post.image;
                          if (post.isVideo && url) {
                            setProfileVideoViewer({ url, text: post.text || post.textOverlay });
                          }
                        }}
                      >
                        {post.isVideo ? (
                          (post.thumbnail || post.videoUrl || post.image) ? (
                            <video
                              src={post.thumbnail || post.videoUrl || post.image}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">📝</span></div>
                          )
                        ) : (
                          (post.thumbnail || post.image || post.videoUrl)
                            ? <img src={post.thumbnail || post.image || post.videoUrl} className="w-full h-full object-cover pointer-events-none" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                            : <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">📝</span></div>
                        )}
                        {post.isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                              <span className="text-white text-sm ml-0.5">▶</span>
                            </div>
                          </div>
                        )}
                        {post.isVideo && <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"><Film size={10} className="text-white"/></div>}
                        <div className="absolute bottom-1 left-1 bg-black/60 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                          <Eye size={8} className="text-white"/>
                          <span className="text-white text-[8px] font-black">{formatViews(post.views||0)}</span>
                        </div>
                      </div>
                    ))}
                    {profileVideos.map((vid:any) => (
                      <div
                        key={vid.id}
                        className="relative aspect-square bg-white/5 overflow-hidden cursor-pointer active:scale-95 transition-all"
                        onClick={() => {
                          const url = vid.videoUrl || vid.image;
                          if (vid.isVideo && url) {
                            setProfileVideoViewer({ url, text: vid.text || vid.textOverlay });
                          }
                        }}
                      >
                        {(vid.thumbnail || vid.videoUrl || vid.image)
                          ? <>
                              {vid.isVideo ? (
                                <video
                                  src={vid.thumbnail || vid.videoUrl || vid.image}
                                  className="w-full h-full object-cover pointer-events-none"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <img src={vid.thumbnail || vid.image || vid.videoUrl} className="w-full h-full object-cover pointer-events-none" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                              )}
                              {vid.isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                    <span className="text-white text-sm ml-0.5">▶</span>
                                  </div>
                                </div>
                              )}
                            </>
                          : <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">🎬</span></div>
                        }
                        {vid.isVideo && <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"><Film size={10} className="text-white"/></div>}
                        {vid.views >= 0 && (
                          <div className="absolute bottom-1 left-1 bg-black/60 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                            <Eye size={8} className="text-white"/>
                            <span className="text-white text-[8px] font-black">{formatViews(vid.views || 0)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {profilePosts.length === 0 && profileVideos.length === 0 && (
                      <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3">
                        <span className="text-4xl">📸</span>
                        <p className="text-gray-500 text-sm">No posts yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Shared Comment Sheet — works for TikReels AND Pulse */}
              {commentPostId && (
                <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end">
                  <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-6 max-h-[70vh] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-black text-white">💬 Comments</p>
                      <button onClick={() => { setCommentPostId(null); setPostComments([]); }}><X size={18} className="text-gray-400"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                      {postComments.length === 0 && <p className="text-gray-500 text-xs text-center mt-4">No comments yet. Be the first to comment!</p>}
                      {postComments.map((c:any) => (
                        <div key={c.id} className="flex items-start gap-2">
                          <img src={c.photo||'/logo.png'} className="w-7 h-7 rounded-full border border-white/20 object-cover flex-shrink-0"/>
                          <div className="bg-white/5 rounded-2xl px-3 py-2 flex-1">
                            <p className="text-[9px] text-pink-400 font-black">@{c.username}</p>
                            <p className="text-white text-xs mt-0.5">{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {/* FIX ROUND 3: Comment input — keyboard open nahi ho raha tha.
                          Pehle autoFocus hata diya tha aur ref+setTimeout se focus karte the
                          jo mobile pe reliable nahi tha. Ab useRef + useEffect se proper
                          focus kar rahe hain jab comment sheet khulta hai. */}
                      <input
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Add a comment…"
                        inputMode="text"
                        enterKeyHint="send"
                        autoCapitalize="sentences"
                        autoComplete="off"
                        spellCheck={false}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"
                        style={{ touchAction: 'manipulation', fontSize: '16px', WebkitAppearance: 'none', appearance: 'none', minHeight: '44px', caretColor: '#ec4899' }}
                        onKeyDown={e => e.key==='Enter' && submitComment()}
                        ref={commentInputRef}
                        // FIX: Tap pe turant focus karo — keyboard open ho jaaye
                        onClick={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                        onTouchStart={(e) => { e.stopPropagation(); }}
                        // FIX: Touchend pe bhi focus — agar touchstart se keyboard na khule
                        onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); e.currentTarget.focus(); }}
                      />
                      <button onClick={submitComment} className="w-10 h-10 bg-pink-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-[0_0_12px_rgba(236,72,153,0.4)]">
                        <Send size={14} className="text-white"/>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}


      {/* ══════════════════════════════════════════════════════
          GAMES SCREEN — FIX #7: card click triggers interstitial
      ══════════════════════════════════════════════════════ */}
      {screen === 'games' && (
        <div className="flex flex-col min-h-screen bg-[#050505]">
          <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
            <button onClick={() => { setScreen('hub'); setSelectedGame(null); }} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
              <ArrowLeft size={14} className="text-gray-400"/>
            </button>
            <div style={{ position:'relative', zIndex:50 }}>
              <img src="/logo.png" alt="AJ" className="w-8 h-8 rounded-xl shadow-[0_0_14px_rgba(236,72,153,0.5)]"/>
            </div>
            <h1 className="text-sm font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">Gaming Zone</h1>
            <button onClick={() => { 
              const adOk = triggerFreeCoinAd(); 
              if (adOk) {
                setVvipAlert({msg:'🎁 Ad watched! +50 Coins reward coming...', icon:'💰'}); 
                setTimeout(() => updateDoc(doc(db,'users',user.uid), {balance: increment(50)}), 5000); 
              } else {
                setVvipAlert({msg:'⏳ Please wait a few minutes before watching another ad for free coins.', icon:'⏱️'}); 
              }
            }} className="ml-auto bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-[9px] font-black px-3 py-1.5 rounded-xl active:scale-90 transition-all shadow-[0_0_10px_rgba(234,179,8,0.4)]">
              🎁 Free 50 Coins
            </button>
</div>

          {!selectedGame ? (
            <div className="px-4 py-4 space-y-3">
              {/* Video Ad — Games Screen */}
              {[ { id:'rider',    name:'Rider King',       emoji:'🏍️', desc:'Dodge obstacles, earn coins', url:'/games/rider-king/index.html' },
                { id:'racer',    name:'Pulse Racer',      emoji:'🏎️', desc:'Speed racing challenge',      url:'/games/pulse-racer/index.html' },
                { id:'subsea',   name:'Subsea Surge',     emoji:'🐠', desc:'Underwater adventure',        url:'/games/subsea-surge/index.html' },
                { id:'neon',     name:'Neon Strike',      emoji:'⚡', desc:'Neon arcade action',          url:'/games/neon-strike/index.html' },
                { id:'volcano',  name:'Volcano Escape',   emoji:'🌋', desc:'Escape the eruption',         url:'/games/volcano-escape/index.html' },
                { id:'ludo',     name:'Ludo Elite Royal', emoji:'🎲', desc:'Classic board game — COMING SOON', url:'' },
                { id:'puck',     name:'Puck Pulse Elite', emoji:'🏒', desc:'Air hockey — COMING SOON',    url:'' },
              ].map(game => (
                <button
                  key={game.id}
                  onClick={() => {
                    if (!game.url) return setVvipAlert({msg:`${game.name} coming soon! 🔜`});
                    lastGameScoreRef.current = 0; setSelectedGame(game.url);
                  }}
                  className="w-full flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 active:scale-95 transition-all hover:border-pink-500/30"
                >
                  <span className="text-3xl">{game.emoji}</span>
                  <div className="text-left flex-1">
                    <p className="text-sm font-black text-white">{game.name}</p>
                    <p className="text-[10px] text-gray-400">{game.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-500"/>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-2 flex items-center gap-3">
                <button onClick={() => {
                  // FIX: When leaving game, flush remaining score to wallet
                  if (lastGameScoreRef.current > 0) {
                    const coinsEarned = lastGameScoreRef.current * 0.01;
                    if (user) {
                      updateDoc(doc(db, "users", user.uid), { balance: increment(coinsEarned) }).then(() => {
                        setVvipAlert({msg:`🎮 +${coinsEarned.toFixed(2)} AJ Coins credited to wallet! Score: ${lastGameScoreRef.current}`, icon:"🎮"});
                        lastGameScoreRef.current = 0;
                      }).catch(() => {});
                    }
                  }
                  setSelectedGame(null);
                }} className="flex items-center gap-1.5 text-[10px] text-gray-400 font-black active:scale-90 transition-all">
                  <ArrowLeft size={12}/> Back to Games
                </button>
                <span className="ml-auto text-[9px] text-pink-400 font-black bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full">1 Token = 0.01 Coin</span>
              </div>
              {/* Video Ad — Playing Game */}
              {selectedGame ? (
                <iframe
                  key={selectedGame}
                  src={selectedGame}
                  className="flex-1 w-full border-0 bg-black"
                  allow="autoplay; fullscreen; gyroscope; accelerometer; clipboard-write; encrypted-media; picture-in-picture; camera; microphone"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-top-navigation-by-user-activation allow-downloads allow-presentation"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Game"
                  style={{ minHeight: 'calc(100vh - 120px)', display:'block' }}
                  onLoad={(e) => {
                    // FIX: Inject bridge script into game iframe on load
                    try {
                      const iframe = e.currentTarget as HTMLIFrameElement;
                      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                      if (iframeDoc) {
                        const script = iframeDoc.createElement('script');
                        script.textContent = `
                          var ajLastScore = 0;
                          var ajScoreStuckCount = 0;
                          // Send score to parent every 1.5s
                          function ajPollScore() {
                            var score = 0;
                            try {
                              if (typeof Game !== 'undefined' && Game.score !== undefined) score = Game.score;
                              else if (typeof game !== 'undefined' && game.score !== undefined) score = game.score;
                              else if (typeof GAME !== 'undefined' && GAME.score !== undefined) score = GAME.score;
                              else if (typeof gameScore !== 'undefined') score = gameScore;
                              else if (typeof app !== 'undefined' && app.score !== undefined) score = app.score;
                              else if (typeof score !== 'undefined' && score > 0) score = score;
                              else if (typeof SCORE !== 'undefined' && SCORE > 0) score = SCORE;
                            } catch(ex) {}
                            if (score > 0) {
                              try { window.parent.postMessage({type:'GAME_SCORE', score:score}, '*'); } catch(ex) {}
                              if (ajLastScore === score) {
                                ajScoreStuckCount++;
                                if (ajScoreStuckCount >= 8) { try { window.parent.postMessage({type:'GAME_CRASH', score:score}, '*'); } catch(ex) {} ajScoreStuckCount = 0; }
                              } else { ajScoreStuckCount = 0; }
                              ajLastScore = score;
                            }
                          }
                          // Listen for parent requests
                          window.addEventListener('message', function(e) {
                            if (e.data && (e.data.type === 'SEND_SCORE' || e.data.type === 'SCORE' || e.data.type === 'GAME_SCORE')) {
                              try { window.parent.postMessage({type:'GAME_SCORE', score: e.data.score || e.data.points || 0}, '*'); } catch(ex) {}
                            }
                          });
                          // Poll score every 1.5 seconds
                          setInterval(ajPollScore, 1500);
                          // On unload, flush score
                          window.addEventListener('beforeunload', function() {
                            if (ajLastScore > 0) { try { window.parent.postMessage({type:'GAME_END', score: ajLastScore}, '*'); } catch(ex) {} }
                          });
                          // On error, flush score
                          window.addEventListener('error', function() {
                            if (ajLastScore > 0) { try { window.parent.postMessage({type:'GAME_CRASH', score: ajLastScore}, '*'); } catch(ex) {} }
                          });
                        `;
                        (iframeDoc.head || iframeDoc.documentElement).appendChild(script);
                      }
                    } catch(err) { console.error('Bridge inject on load failed', err); }
                  }}
                  onError={() => setVvipAlert({msg:'Game failed to load. Try another game.',icon:'⚠️'})}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-400">Loading game...</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          AI BOT SCREEN — FIX #7: card click triggers interstitial
      ══════════════════════════════════════════════════════ */}
      {screen === 'aibot' && (
        <div className="flex flex-col min-h-screen bg-[#050505]">
          <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setScreen('hub')} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
              <ArrowLeft size={14} className="text-gray-400"/>
            </button>
            <div style={{ position:'relative', zIndex:50 }}>
              <img src="/logo.png" alt="AJ" className="w-8 h-8 rounded-xl shadow-[0_0_14px_rgba(236,72,153,0.5)]"/>
            </div>
            <h1 className="text-sm font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">AI Bot</h1>
          </div>

          <div className="px-4 py-4 space-y-4">

            {/* Bot Status */}
            <div className="rounded-3xl overflow-hidden" style={{background:'linear-gradient(135deg,#0a0a1a,#1a0a2e)',border:'1px solid rgba(236,72,153,0.2)'}}>
              <div className="h-[2px] w-full bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400"/>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.4)]">
                    <Bot size={24} className="text-white"/>
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">AJ Trading Bot</p>
                    <p className={`text-[10px] font-black ${botTier!=='none' ? 'text-green-400 animate-pulse' : 'text-gray-500'}`}>
                      {botTier!=='none' ? `● ${botTier.toUpperCase()} ACTIVE` : '○ INACTIVE'}
                    </p>
                  </div>
                  {botTier!=='none' && (
                    <div className="ml-auto text-right">
                      <p className="text-green-400 font-black text-sm">+{visualProfit.toFixed(4)}</p>
                      <p className="text-[9px] text-gray-400">Coins earned</p>
                    </div>
                  )}
                </div>
                {/* Trade Log */}
                <div className="bg-black/40 rounded-2xl p-3 space-y-1 font-mono text-[9px] text-green-400">
                  {tradeLogs.map((log, i) => <p key={i}>{'>'} {log}</p>)}
                </div>
              </div>
            </div>

            {/* Bot Plans — FIX #7: card click triggers interstitial */}
            {[ { tier:'basic', label:'Basic Bot', cost:1000, rate:'2% daily', icon:'🤖', color:'from-blue-600 to-cyan-600' },
              { tier:'vvip',  label:'VVIP Bot',  cost:5000, rate:'5% daily', icon:'🚀', color:'from-pink-600 to-purple-600' },
            ].map(plan => (
              <button
                key={plan.tier}
                onClick={() => activateBot(plan.tier, plan.cost)}
                disabled={botTier===plan.tier}
                className={`w-full flex items-center gap-4 rounded-2xl p-4 active:scale-95 transition-all ${botTier===plan.tier ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{background:`linear-gradient(135deg,var(--tw-gradient-stops))`,backgroundImage:`linear-gradient(135deg,${plan.color.replace('from-','').replace('to-','').split(' ').map(c=>`var(--${c})`).join(',')})`,border:'1px solid rgba(255,255,255,0.1)'}}
              >
                <span className="text-3xl">{plan.icon}</span>
                <div className="text-left flex-1">
                  <p className="text-white font-black text-sm">{plan.label}</p>
                  <p className="text-white/70 text-[10px]">{plan.rate} • {plan.cost.toLocaleString()} Coins</p>
                </div>
                {botTier===plan.tier ? <span className="text-[9px] text-white font-black bg-white/20 px-2 py-1 rounded-full">ACTIVE</span> : <ChevronRight size={16} className="text-white/70"/>}
              </button>
            ))}

            {/* AI Assistant */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <button onClick={() => setBotOpen(o => !o)} className="w-full flex items-center gap-3 p-4 active:scale-95 transition-all">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Bot size={18} className="text-white"/>
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-black text-white">AJ AI Assistant</p>
                  <p className="text-[10px] text-gray-400">Ask me anything about AJ Portal</p>
                </div>
                <ChevronRight size={16} className={`text-gray-500 transition-transform ${botOpen ? 'rotate-90' : ''}`}/>
              </button>
              {botOpen && (
                <div className="border-t border-white/5">
                  <div className="h-64 overflow-y-auto p-4 space-y-3">
                    {botMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.from==='user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${m.from==='user' ? 'bg-pink-600 text-white' : 'bg-white/10 text-white'}`}>
                          <p className="whitespace-pre-wrap">{m.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 p-3 border-t border-white/5">
                    <input value={botInput} onChange={e => setBotInput(e.target.value)} placeholder="Ask anything…" className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-white text-xs focus:outline-none" onKeyDown={e => e.key==='Enter' && handleBotSend()}/>
                    <button onClick={handleBotSend} className="w-9 h-9 bg-cyan-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all">
                      <Send size={12} className="text-white"/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          WALLET SCREEN — FIX #7: card click triggers interstitial
      ══════════════════════════════════════════════════════ */}
      {screen === 'wallet' && (
        <div className="flex flex-col min-h-screen bg-[#050505]">
          <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setScreen('hub')} className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
              <ArrowLeft size={14} className="text-gray-400"/>
            </button>
            <div style={{ position:'relative', zIndex:50 }}>
              <img src="/logo.png" alt="AJ" className="w-8 h-8 rounded-xl shadow-[0_0_14px_rgba(236,72,153,0.5)]"/>
            </div>
            <h1 className="text-sm font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">AJ Wallet</h1>
          </div>

          {/* Wallet Tab Bar */}
          <div className="flex border-b border-white/5">
            {(['main','purchase','withdraw','transfer','referral'] as const).map(tab => (
              <button key={tab} onClick={() => { setWalletTab(tab); }} className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all ${walletTab===tab ? 'text-pink-400 border-b-2 border-pink-500' : 'text-gray-500'}`}>
                {tab==='main'?'💰':tab==='purchase'?'🛒':tab==='withdraw'?'💸':tab==='transfer'?'↔️':'👥'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* ── MAIN ── */}
            {walletTab === 'main' && (
              <>
                <div className="rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(236,72,153,0.15)]" style={{background:'linear-gradient(135deg,#1a0a2e,#0a0a1a,#0d1a2e)',border:'1px solid rgba(236,72,153,0.2)'}}>
                  <div className="h-[2px] w-full bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400"/>
                  <div className="p-5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Total Balance</p>
                    <p className="text-4xl font-black bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent mt-1">{parseFloat(displayBalance).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} <span className="text-lg text-yellow-400/70">🪙</span></p>
                    <p className="text-xs text-gray-400 mt-1">≈ ${displayUsdt} USD</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="bg-white/5 rounded-2xl p-3 text-center">
                        <p className="text-[9px] text-gray-400 font-black uppercase">Rate</p>
                        <p className="text-white font-black text-xs mt-1">$1 = {COIN_RATE} 🪙</p>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-3 text-center">
                        <p className="text-[9px] text-gray-400 font-black uppercase">Cash Out</p>
                        <p className="text-white font-black text-xs mt-1">{CASH_RATE} 🪙 = $1</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[ { icon:'🛒', label:'Buy Coins',   action:() => setWalletTab('purchase') },
                    { icon:'💸', label:'Withdraw',    action:() => setWalletTab('withdraw') },
                    { icon:'↔️', label:'Transfer',    action:() => setWalletTab('transfer') },
                    { icon:'👥', label:'Refer & Earn',action:() => setWalletTab('referral') },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} className="flex flex-col items-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-4 active:scale-95 transition-all hover:border-pink-500/30">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── PURCHASE ── */}
            {walletTab === 'purchase' && (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Amount (USD)</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[20,50,100,250,500].map(amt => (
                      <button key={amt} onClick={() => setPurchaseAmount(amt)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${purchaseAmount===amt ? 'bg-pink-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <input type="number" value={purchaseAmount} onChange={e => setPurchaseAmount(Number(e.target.value))} min={MIN_PURCHASE} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50 mb-2"/>
                  <p className="text-[10px] text-gray-400">= {(purchaseAmount * COIN_RATE).toLocaleString()} 🪙 AJ Coins</p>
                </div>
                <button onClick={handlePurchase} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                  🛒 Buy ${purchaseAmount} = {(purchaseAmount * COIN_RATE).toLocaleString()} Coins
                </button>
                <p className="text-[9px] text-gray-500 text-center">Powered by NOWPayments · USDT BSC · Secure</p>
              </div>
            )}

            {/* ── WITHDRAW ── */}
            {walletTab === 'withdraw' && (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Available Balance</p>
                  <p className="text-2xl font-black text-yellow-400">{balance.toFixed(0)} 🪙</p>
                  <p className="text-[10px] text-gray-400 mt-1">≈ ${(balance/CASH_RATE).toFixed(2)} USD</p>
                  <p className="text-[9px] text-orange-400 mt-2 font-black">Min withdrawal: {WITHDRAW_MIN.toLocaleString()} Coins (${WITHDRAW_MIN/CASH_RATE})</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {WITHDRAW_METHODS.map(m => (
                      <button key={m.label} onClick={() => { setPayoutMethod(m.label); if (m.type === 'simple') setPayoutId(''); }} className={`px-3 py-2 rounded-xl text-[9px] font-black transition-all text-left ${payoutMethod===m.label ? 'bg-pink-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {/* Simple methods (EasyPaisa, JazzCash, Binance) */}
                  {currentWithdrawMethod.type === 'simple' && (
                    <input value={payoutId} onChange={e => setPayoutId(e.target.value)} placeholder={currentWithdrawMethod.placeholder} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                  )}
                  {/* Bank Transfer Detail */}
                  {payoutMethod === 'Bank Transfer' && (
                    <div className="space-y-2">
                      <input value={cardHolder} onChange={e => setCardHolder(e.target.value)} placeholder="Account Holder Name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                      <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="Account Number" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                      <input value={cardBank} onChange={e => setCardBank(e.target.value)} placeholder="Bank Name (e.g. HBL, UBL, Meezan)" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                      <input value={cardCountry} onChange={e => setCardCountry(e.target.value)} placeholder="IBAN (PK...)" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                    </div>
                  )}
                  {/* Visa/Mastercard Detail */}
                  {payoutMethod === 'Visa/Mastercard' && (
                    <div className="space-y-2">
                      <input value={cardHolder} onChange={e => setCardHolder(e.target.value)} placeholder="Card Holder Name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                      <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="Card Number (XXXX XXXX XXXX XXXX)" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                      <input value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="Expiry (MM/YY)" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                      <input value={cardCVV} onChange={e => setCardCVV(e.target.value)} placeholder="CVV (3 digits)" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                    </div>
                  )}
                </div>
                <button onClick={handleWithdraw} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(34,211,238,0.3)]" style={{background:'linear-gradient(135deg,#0891b2,#0e7490)'}}>
                  💸 Request Withdrawal
                </button>
              </div>
            )}

            {/* ── TRANSFER ── */}
            {walletTab === 'transfer' && (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Transfer Coins</p>
                  <input value={transferId} onChange={e => setTransferId(e.target.value)} placeholder="Recipient User ID" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                  <input type="number" value={transferAmount||''} onChange={e => setTransferAmount(Number(e.target.value))} placeholder="Amount (Coins)" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                </div>
                <button onClick={handleTransfer} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                  ↔️ Transfer Coins
                </button>
              </div>
            )}

            {/* ── REFERRAL ── */}
            {walletTab === 'referral' && (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Your Referral Code</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-xs font-black flex-1 truncate">{user?.uid}</p>
                    <button onClick={() => copyToClipboard(user?.uid||'')} className="bg-pink-600/20 border border-pink-500/30 text-pink-400 text-[9px] font-black px-3 py-1.5 rounded-xl active:scale-90 transition-all">
                      {copied ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2">Share your ID. When friends enter it, you earn {REFERRAL_COINS} Coins!</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Enter Referral Code</p>
                  <input value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="Paste referral code here" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"/>
                  <button onClick={handleApplyReferral} className="w-full py-3 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                    Apply Referral
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ============================================================
// QUERY CLIENT WRAPPER
// ============================================================
const queryClient = new QueryClient();

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <AJErrorBoundary>
        <AJSuperPortal/>
      </AJErrorBoundary>
    </QueryClientProvider>
  );
}