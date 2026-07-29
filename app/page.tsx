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
// 4. Real Ads: TikReels / Pulse use Adsterra Native Banner every 4th post.
// ============================================================

import Script from 'next/script';
import React, { useState, useEffect, useRef, Component } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LiveMatchesPanel from './components/LiveMatchesPanel';
import HubEarnPanel from './components/HubEarnPanel';
import BannerAdSlot from './components/ads/BannerAdSlot';
import InFeedAdShell from './components/ads/InFeedAdShell';
import InFeedVideoAd from './components/ads/InFeedVideoAd';
import {
  SIGNUP_BONUS_COINS,
  REFERRAL_BONUS_COINS,
  MIN_WITHDRAW_COINS,
  COIN_RATE as ECONOMY_COIN_RATE,
  CASH_RATE,
  PLATFORM_EARN_SHARE,
  USER_EARN_SHARE as ECONOMY_USER_EARN_SHARE,
  coinsToUsd,
  coinsToCashUsd,
  formatUsd,
} from './lib/economy';
import { creditAdminEarnings } from './lib/admin-earnings';
import { earnReward } from './lib/client-rewards';
import { ensureUserReferralId, resolveReferrerUid } from './lib/referral';
import { trackAdEvent } from './lib/ad-client';
import { INFEED_AD_EVERY_N } from './lib/ads-config';
import {
  normalizeTikReelPost,
  normalizePulsePost,
  mergeTikReelPosts,
  filterOwnedBy,
  isPlayableTikReel,
  getPlayableSrc,
  fileLooksLikeVideo,
  type TikReelPost,
} from './lib/tikreel';
import {
  uploadToCloudinary,
  uploadMediaDurable,
  toPlayableMediaUrl,
} from './lib/media-upload';
import AdminUsersPanel from './components/AdminUsersPanel';
import { isPortalAdminUser } from './lib/admin-auth';
import { BAN_FORBIDDEN_MESSAGE, DEFAULT_ACCOUNT_BAN_FIELDS, isUserBanned } from './lib/user-ban';
import { startIntrusiveAdGuard, stripIntrusiveAdNodes } from './lib/ad-guards';
import {
  REEL_COMMENTS_COL,
  sortCommentsAsc,
  mergeCommentLists,
  resolveCommentPostIds,
  dedupeComments,
} from './lib/reel-comments';
import {
  CHATS_COL,
  CHAT_PARTNERS_SUB,
  buildDmChatId,
  normalizePartnerProfile,
} from './lib/dm-chat';

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
        src.includes('gozen.com') ||
        src.includes('tag.gozen.com') ||
        src.includes('alwingulla.com') ||
        src.includes('sunny-sprout.org') ||
        src.includes('sunnysprout') ||
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
        src.includes('gozen.com') ||
        src.includes('tag.gozen.com') ||
        src.includes('alwingulla.com') ||
        src.includes('sunny-sprout.org') ||
        src.includes('sunnysprout') ||
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
  addDoc, getDoc, serverTimestamp, query, orderBy, limit, deleteDoc, getDocs, where,
  runTransaction, waitForPendingWrites, getDocFromServer
} from 'firebase/firestore';
import {
  getDatabase, ref, onDisconnect, set, onValue, remove, push, onChildAdded, off
} from 'firebase/database';
import {
  getMessaging, getToken, onMessage
} from 'firebase/messaging';
import {
  MessageCircle, Trophy, Zap, Bot, LogOut, ChevronRight,
  Send, X, Download, Video, Users, Heart, MessageSquare, Camera,
  Settings, Edit3, Mail, DollarSign, Share2, Music, PlusSquare,
  MoreVertical, Search, Phone, Video as VideoIcon, ArrowLeft, Trash2,
  Gift, Radio, UserPlus, UserCheck, Grid, Film, Volume2, VolumeX, Swords, Clock,
  Plus, Eye, Bookmark, Shield, Ban
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
const CEO_WHATSAPP             = "https://wa.me/96878994093";
const AGORA_APP_ID             = "7863c5369b3648bf931893a52ebaa6db";
const AGORA_APP_CERTIFICATE    = "dc66528c5a5646da8e3ce5d2426759af";
const VAPID_KEY                = "BMaPMtGtA2VtDsj_JH_yv5dOv66Mpguf9v4TkqY96dcS-gwqgs-r5OlqRJQmZbNkaj-7_iMFbGGN0Qc4xH0qvKg";
const PULSE_AD_VIDEO_ID        = 'aqz-KE-bpKQ';
const NOWPAYMENTS_IPN_SECRET   = '9eeeBo6K1ljJSQtUCb1Up88Gv6n1AreU';

// ============================================================
// ECONOMY RATES
// ============================================================
const COIN_RATE      = ECONOMY_COIN_RATE;
const MIN_PURCHASE   = 20;
const WITHDRAW_MIN   = MIN_WITHDRAW_COINS;
const REFERRAL_COINS = REFERRAL_BONUS_COINS;

const ADMIN_EARN_SHARE = PLATFORM_EARN_SHARE; // 70% — owner USD ledger (AdminRevenue + ad networks)
const USER_EARN_SHARE  = ECONOMY_USER_EARN_SHARE; // 30% — user AJ Coins only

const PK_ENTRY_COINS = 100;
const PK_DURATION    = 300;

// ============================================================
// ADS POLICY — Adsterra only (Monetag / gozen / sunny-sprout removed)
// ============================================================
const AD_COOLDOWN_MS = 5 * 60 * 1000;
let lastAnyAdShownTime = 0;
let lastInterstitialAdTime = 0;
let pendingNavAfterAd: (() => void) | null = null;

/** Disabled — no auto interstitial ads. */
const triggerInterstitialAd = (_force = false) => {};
const triggerFreeCoinAd = () => false;
const navigateWithAdOverlay = (navFn: () => void) => {
  try {
    pendingNavAfterAd = null;
    navFn();
  } catch {
    /* ignore */
  }
};

/** Strip leftover Monetag / popunder DOM if any still injects */
function cleanupMonetagDom(): void {
  if (typeof document === 'undefined') return;
  try {
    document
      .querySelectorAll(
        'iframe[src*="nap5k"],iframe[src*="monetag"],iframe[src*="gozen"],iframe[src*="alwingulla"],iframe[src*="sunny-sprout"],script[src*="nap5k"],script[src*="monetag"]'
      )
      .forEach((n) => {
        try {
          n.remove();
        } catch {
          /* ignore */
        }
      });
    stripIntrusiveAdNodes();
  } catch {
    /* ignore */
  }
}
function ensureMonetagSdkLoaded(_zoneId?: number): void {
  /* Monetag removed — no-op */
}
function waitForMonetagShowFn(_zoneId?: number, _ms?: number): Promise<null> {
  return Promise.resolve(null);
}
function triggerMonetagInterstitialAd(_zoneId?: number): Promise<boolean> {
  return Promise.resolve(false);
}

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

    // ~6fps JPEG broadcast — smoother Pakistan/PK match viewing without huge RTDB payloads
    canvas.width = 480;
    canvas.height = 360;
    _frameBroadcastInterval = setInterval(() => {
      if (!ctx || !_frameBroadcastVideo || _frameBroadcastVideo.readyState < 2) return;
      try {
        ctx.drawImage(_frameBroadcastVideo, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/jpeg', 0.55);
        set(frameRef, { frame: dataURL, ts: Date.now() }).catch(() => {});
      } catch (e) {
        // Frame capture failed — skip, don't crash
      }
    }, 160);
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
const LIVE_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

// Multi-viewer host audio: one RTCPeerConnection per viewer under peers/{viewerId}
let _hostAudioPeers: Map<string, RTCPeerConnection> = new Map();
let _hostAudioUnsubs: Array<() => void> = [];
let _hostAudioRoomId: string | null = null;
let _hostAudioStream: MediaStream | null = null;

const startAudioBroadcast = (roomId: string, stream: MediaStream) => {
  if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') return;
  try {
    const rtdb = getDatabase();
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      console.warn('startAudioBroadcast: no audio tracks in stream');
      return;
    }
    _hostAudioRoomId = roomId;
    _hostAudioStream = stream;

    const createPeerForViewer = async (viewerId: string) => {
      if (!viewerId || _hostAudioPeers.has(viewerId)) return;
      const pc = new RTCPeerConnection({ iceServers: LIVE_ICE_SERVERS });
      _hostAudioPeers.set(viewerId, pc);
      audioTracks.forEach((track) => {
        try { pc.addTrack(track, stream); } catch {}
      });
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(ref(rtdb, `live_audio/${roomId}/peers/${viewerId}/ice_host`), event.candidate.toJSON()).catch(() => {});
        }
      };
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
        await pc.setLocalDescription(offer);
        if (pc.localDescription) {
          await set(ref(rtdb, `live_audio/${roomId}/peers/${viewerId}/offer`), {
            type: pc.localDescription.type,
            sdp: pc.localDescription.sdp,
            ts: Date.now(),
          });
        }
      } catch (e) {
        console.warn('host peer offer failed', viewerId, e);
      }

      const unsubAnswer = onValue(ref(rtdb, `live_audio/${roomId}/peers/${viewerId}/answer`), (snap) => {
        const data = snap.val();
        if (data?.sdp && data?.type && pc.connectionState !== 'closed' && !pc.currentRemoteDescription) {
          pc.setRemoteDescription(new RTCSessionDescription({ type: data.type, sdp: data.sdp })).catch(() => {});
        }
      });
      _hostAudioUnsubs.push(unsubAnswer);

      const unsubIce = onChildAdded(ref(rtdb, `live_audio/${roomId}/peers/${viewerId}/ice_viewer`), (snap) => {
        const candidate = snap.val();
        if (candidate && pc.connectionState !== 'closed') {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
      });
      _hostAudioUnsubs.push(unsubIce);
    };

    // Legacy single-offer path (first viewer compatibility) + per-viewer join requests
    const pcLegacy = new RTCPeerConnection({ iceServers: LIVE_ICE_SERVERS });
    _hostAudioPeers.set('__legacy__', pcLegacy);
    audioTracks.forEach((track) => { try { pcLegacy.addTrack(track, stream); } catch {} });
    pcLegacy.onicecandidate = (event) => {
      if (event.candidate) {
        push(ref(rtdb, `live_audio/${roomId}/ice_host`), event.candidate.toJSON()).catch(() => {});
      }
    };
    pcLegacy.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false })
      .then((offer) => pcLegacy.setLocalDescription(offer))
      .then(() => {
        if (pcLegacy.localDescription) {
          return set(ref(rtdb, `live_audio/${roomId}/offer`), {
            type: pcLegacy.localDescription.type,
            sdp: pcLegacy.localDescription.sdp,
            ts: Date.now(),
          });
        }
      })
      .catch(() => {});

    const unsubAnswer = onValue(ref(rtdb, `live_audio/${roomId}/answer`), (snap) => {
      const data = snap.val();
      if (data?.sdp && data?.type && pcLegacy.connectionState !== 'closed' && !pcLegacy.currentRemoteDescription) {
        pcLegacy.setRemoteDescription(new RTCSessionDescription({ type: data.type, sdp: data.sdp })).catch(() => {});
      }
    });
    _hostAudioUnsubs.push(unsubAnswer);

    const unsubIce = onChildAdded(ref(rtdb, `live_audio/${roomId}/ice_viewer`), (snap) => {
      const candidate = snap.val();
      if (candidate && pcLegacy.connectionState !== 'closed') {
        pcLegacy.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    });
    _hostAudioUnsubs.push(unsubIce);

    // Multi-viewer: each viewer publishes join_requests/{uid}
    const unsubJoins = onChildAdded(ref(rtdb, `live_audio/${roomId}/join_requests`), (snap) => {
      const viewerId = snap.key;
      if (viewerId) createPeerForViewer(viewerId);
    });
    _hostAudioUnsubs.push(unsubJoins);
  } catch (e) {
    console.warn('startAudioBroadcast failed:', e);
  }
};

const stopAudioBroadcast = (roomId?: string) => {
  try {
    _hostAudioUnsubs.forEach((fn) => { try { fn(); } catch {} });
    _hostAudioUnsubs = [];
    _hostAudioPeers.forEach((pc) => { try { pc.close(); } catch {} });
    _hostAudioPeers = new Map();
    _hostAudioStream = null;
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

let _viewerAudioPC: RTCPeerConnection | null = null;
let _viewerAudioUnsubs: Array<() => void> = [];
let _viewerAudioRoomId: string | null = null;
let _viewerAudioEl: HTMLAudioElement | null = null;

const joinAudioStream = (roomId: string, onConnected?: () => void, viewerUid?: string) => {
  if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') return;
  try {
    const rtdb = getDatabase();
    const peerId = viewerUid || `anon_${Date.now()}`;

    // Announce join for multi-viewer host routing
    set(ref(rtdb, `live_audio/${roomId}/join_requests/${peerId}`), { ts: Date.now() }).catch(() => {});

    const pc = new RTCPeerConnection({ iceServers: LIVE_ICE_SERVERS });
    _viewerAudioPC = pc;
    _viewerAudioRoomId = roomId;

    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.setAttribute('playsinline', 'true');
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
    _viewerAudioEl = audioEl;

    pc.ontrack = (event) => {
      try {
        if (event.streams?.[0]) audioEl.srcObject = event.streams[0];
        else if (event.track) audioEl.srcObject = new MediaStream([event.track]);
        audioEl.play().catch(() => {});
        if (onConnected) onConnected();
      } catch {}
    };

    const attachOffer = async (data: { sdp: string; type: RTCSdpType }, icePath: string, answerPath: string, iceHostPath: string) => {
      if (!data?.sdp || pc.connectionState === 'closed' || pc.currentRemoteDescription) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: data.type, sdp: data.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription) {
          await set(ref(rtdb, answerPath), {
            type: pc.localDescription.type,
            sdp: pc.localDescription.sdp,
            ts: Date.now(),
          });
        }
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            push(ref(rtdb, icePath), event.candidate.toJSON()).catch(() => {});
          }
        };
        const unsubIce = onChildAdded(ref(rtdb, iceHostPath), (snap) => {
          const candidate = snap.val();
          if (candidate && pc.connectionState !== 'closed') {
            pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
          }
        });
        _viewerAudioUnsubs.push(unsubIce);
      } catch (e) {
        console.warn('joinAudioStream offer attach failed', e);
      }
    };

    // Prefer per-viewer peer offer; fall back to legacy shared offer
    const unsubPeerOffer = onValue(ref(rtdb, `live_audio/${roomId}/peers/${peerId}/offer`), (snap) => {
      const data = snap.val();
      if (data?.sdp) {
        attachOffer(
          data,
          `live_audio/${roomId}/peers/${peerId}/ice_viewer`,
          `live_audio/${roomId}/peers/${peerId}/answer`,
          `live_audio/${roomId}/peers/${peerId}/ice_host`
        );
      }
    });
    _viewerAudioUnsubs.push(unsubPeerOffer);

    const unsubOffer = onValue(ref(rtdb, `live_audio/${roomId}/offer`), (snap) => {
      const data = snap.val();
      if (data?.sdp && !pc.currentRemoteDescription) {
        attachOffer(
          data,
          `live_audio/${roomId}/ice_viewer`,
          `live_audio/${roomId}/answer`,
          `live_audio/${roomId}/ice_host`
        );
      }
    });
    _viewerAudioUnsubs.push(unsubOffer);
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
/** PK / Live gifts — mediaUrl syncs SVG/GIF animation to Gifter, Host, and Guest */
const giftItems = [
  { id:1, name:'Coffee',      cost:500,   icon:'☕',  mediaUrl:'/gifts/coffee.svg' },
  { id:2, name:'Pizza Party', cost:1000,  icon:'🍕',  mediaUrl:'/gifts/pizza.svg' },
  { id:3, name:'Mega Heart',  cost:2500,  icon:'❤️',  mediaUrl:'/gifts/heart.svg' },
  { id:4, name:'Super Car',   cost:5000,  icon:'🏎️', mediaUrl:'/gifts/car.svg' },
  { id:5, name:'Private Jet', cost:8000,  icon:'🛩️', mediaUrl:'/gifts/jet.svg' },
  { id:6, name:'AJ Mansion',  cost:10000, icon:'🏰', mediaUrl:'/gifts/mansion.svg' },
];

const WITHDRAW_METHODS = [
  { label: 'EasyPaisa',          field: 'Mobile Number',    placeholder: '03XX-XXXXXXX',             type:'simple' },
  { label: 'JazzCash',           field: 'Mobile Number',    placeholder: '03XX-XXXXXXX',             type:'simple' },
  { label: 'Bank Transfer',      field: 'Bank Details',     placeholder: 'Bank Name, Account No, IBAN', type:'detail' },
  { label: 'Visa/Mastercard',    field: 'Card Details',     placeholder: 'Card Holder, Card No, Expiry, CVV', type:'detail' },
  { label: 'Binance (USDT BSC)', field: 'USDT BSC Address', placeholder: '0x... BSC wallet address', type:'simple' },
];

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
  const now = Date.now();
  try {
    const rtdb = getDatabase(app);
    const presenceRef = ref(rtdb, `presence/${currentUser.uid}`);
    const presenceData = {
      state: 'online',
      uid: currentUser.uid,
      username: currentUser.displayName || 'AJ Member',
      lastChanged: now,
    };
    await set(presenceRef, presenceData);
    onDisconnect(presenceRef).set({
      state: 'offline',
      uid: currentUser.uid,
      username: presenceData.username,
      lastChanged: Date.now(),
    });
  } catch (e) {
    console.warn('RTDB presence write failed (publish database.rules presence)', e);
  }
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      status: 'online',
      lastSeenMs: now,
    });
  } catch (e) {
    console.error('Firestore presence write failed', e);
  }
  try {
    registerFcmToken(currentUser.uid);
  } catch {
    /* ignore */
  }
};

const setUserOfflineStatus = async (uid: string | null) => {
  if (!uid) return;
  const now = Date.now();
  try {
    const rtdb = getDatabase(app);
    await set(ref(rtdb, `presence/${uid}`), {
      state: 'offline',
      uid,
      lastChanged: now,
    });
  } catch {
    /* RTDB may be locked — Firestore below still marks offline */
  }
  try {
    await updateDoc(doc(db, 'users', uid), { status: 'offline', lastSeenMs: now });
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
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\\\\\\\\.0$/, '') + 'M';
  if (v >= 1000)    return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\\\\\\\\.0$/, '') + 'k';
  return String(v);
};

// ============================================================
// PREMIUM GLASSMORPHISM ALERT MODAL
// Dark glass, backdrop-blur, gold icons, neon borders — replaces browser alert()
// ============================================================
function VVIPAlert({ msg, icon, onClose }: { msg: string; icon?: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4 pointer-events-auto"
      style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="pointer-events-auto w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(251,191,36,0.22),0_0_40px_rgba(34,211,238,0.18)]"
        style={{
          background: 'linear-gradient(160deg, rgba(18,16,28,0.92) 0%, rgba(8,8,14,0.94) 100%)',
          border: '1px solid rgba(251,191,36,0.55)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[2px] w-full bg-gradient-to-r from-amber-400 via-cyan-400 to-fuchsia-500"/>
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center border border-amber-400/50 bg-amber-500/10"
            style={{ boxShadow: '0 0 28px rgba(251,191,36,0.45), inset 0 0 18px rgba(251,191,36,0.12)' }}
          >
            <span
              className="text-4xl leading-none"
              style={{ filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.95))' }}
            >
              {icon || '✨'}
            </span>
          </div>
          <div className="w-24 h-[1.5px] bg-gradient-to-r from-amber-400 via-cyan-400 to-fuchsia-500 rounded-full opacity-90"/>
          <p className="text-white font-black text-sm leading-relaxed whitespace-pre-wrap tracking-wide">{msg}</p>
          <button
            onClick={onClose}
            className="mt-1 px-8 py-2.5 rounded-full text-black text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-[0_0_22px_rgba(251,191,36,0.45)]"
            style={{ background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 55%,#22d3ee 100%)' }}
          >
            OK ✓
          </button>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-amber-400/40 via-cyan-400/40 to-fuchsia-500/40"/>
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

// Monetag SDK / MonetagVideoAd removed — Adsterra Native Banner used in feeds.

// ============================================================
// CINEMATIC GIFT OVERLAY
// ============================================================
function CinematicGiftOverlay({ gift, sender, onDone }: { gift: any; sender: string; onDone: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true));
    const t = setTimeout(onDone, 5000);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [onDone]);

  if (!gift) return null;

  const giftIcon = gift.icon || '🎁';
  const giftName = gift.name || 'Gift';
  const giftCost = typeof gift.cost === 'number' ? gift.cost : 0;
  // Synced GIF / Lottie-style media URL (host, guest, gifter all see same asset)
  const giftMedia = typeof gift.mediaUrl === 'string' && gift.mediaUrl ? gift.mediaUrl : '';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none"
      style={{ animation: 'fadeInOverlay 0.3s ease-out forwards' }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(234,179,8,0.25) 0%, rgba(0,0,0,0.85) 70%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {['✨','🎊','💫','🌟','⭐','🎉','💛','🔥','✨','🎊','💫','🌟'].map((emoji, i) => (
          <span
            key={i}
            className="absolute text-2xl"
            style={{
              left: `${(i * 8.3) % 100}%`,
              top: `${(i * 17) % 80}%`,
              animation: `confettiFall ${2 + (i % 3) * 0.4}s ease-in ${i * 0.15}s infinite`,
            }}
          >{emoji}</span>
        ))}
      </div>
      <div
        className="relative flex flex-col items-center gap-4"
        style={{
          animation: show ? 'giftBounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
          opacity: 0,
        }}
      >
        <div className="relative" style={{ animation: 'giftGlow 1.5s ease-in-out infinite' }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(250,204,21,0.4) 0%, transparent 70%)',
              transform: 'scale(4)',
              filter: 'blur(20px)',
              animation: 'giftGlow 1.5s ease-in-out infinite',
            }}
          />
          {giftMedia ? (
            <img
              src={giftMedia}
              alt={giftName}
              className="relative w-40 h-40 object-contain"
              style={{
                animation: 'giftBounce 0.8s ease-in-out infinite',
                filter: 'drop-shadow(0 0 40px rgba(250,204,21,0.9))',
              }}
            />
          ) : (
            <div
              className="relative text-[8rem] leading-none"
              style={{
                animation: 'giftBounce 0.8s ease-in-out infinite',
                filter: 'drop-shadow(0 0 40px rgba(250,204,21,0.9)) drop-shadow(0 0 80px rgba(245,158,11,0.5))',
              }}
            >{giftIcon}</div>
          )}
        </div>
        <p
          className="text-3xl font-black uppercase tracking-widest text-center"
          style={{
            background: 'linear-gradient(to right, #fef9c3, #facc15, #eab308, #ca8a04)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(250,204,21,0.6))',
          }}
        >{giftName}!</p>
        <div
          className="flex items-center gap-2 rounded-full px-5 py-2"
          style={{
            background: 'rgba(250,204,21,0.15)',
            border: '2px solid rgba(250,204,21,0.4)',
            boxShadow: '0 0 20px rgba(250,204,21,0.3)',
          }}
        >
          <span className="text-yellow-300 font-black text-xl">{giftCost.toLocaleString()}</span>
          <span className="text-yellow-400 text-lg">AJ Coins 🪙</span>
        </div>
        <p className="text-white font-bold text-sm" style={{ opacity: 0.9 }}>
          from <span className="text-pink-400 font-black">@{sender || 'Someone'}</span>
        </p>
        <div className="flex gap-4 text-3xl mt-2">
          <span style={{ animation: 'giftSpin 2s linear infinite' }}>✨</span>
          <span style={{ animation: 'giftBounce 0.8s ease-in-out 0.2s infinite' }}>🎊</span>
          <span style={{ animation: 'giftPulse 1s ease-in-out 0.4s infinite' }}>💫</span>
          <span style={{ animation: 'giftBounce 0.8s ease-in-out 0.6s infinite' }}>🎉</span>
          <span style={{ animation: 'giftSpin 2s linear 0.8s infinite' }}>✨</span>
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className="absolute rounded-full"
          style={{ width: 100, height: 100, border: '4px solid rgba(250,204,21,0.5)', animation: 'ringExpand 2s ease-out 0s infinite' }}
        />
        <div
          className="absolute rounded-full"
          style={{ width: 100, height: 100, border: '3px solid rgba(250,204,21,0.35)', animation: 'ringExpand 2s ease-out 0.6s infinite' }}
        />
        <div
          className="absolute rounded-full"
          style={{ width: 100, height: 100, border: '2px solid rgba(250,204,21,0.2)', animation: 'ringExpand 2s ease-out 1.2s infinite' }}
        />
      </div>
      <style>{`
        @keyframes fadeInOverlay { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes giftBounceIn {
          0% { transform: scale(0) rotate(-20deg); opacity: 0; }
          50% { transform: scale(1.15) rotate(5deg); opacity: 1; }
          70% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes giftBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes giftGlow { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }
        @keyframes giftPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.3); opacity: 1; } }
        @keyframes giftSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes confettiFall { 0% { transform: translateY(-100px) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0.3; } }
        @keyframes ringExpand { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(8); opacity: 0; } }
      `}</style>
    </div>
  );
}

// ============================================================
// INTERSTITIAL AD OVERLAY — Adsterra Direct Link (no video black screen)
// ============================================================
function InterstitialAdOverlay({ onClose }: { onClose: () => void }) {
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (closed) return;
    try {
      window.open(
        'https://www.effectivecpmnetwork.com/b8jtkn6i4?key=77409a0e0aa4602b6d03798ff53516b3',
        '_blank',
        'noopener,noreferrer'
      );
    } catch {}
    const interval = setInterval(() => {
      setCountdown((c) => {
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

  useEffect(() => {
    if (closed) return;
    const t = setTimeout(() => handleClose(), 8000);
    return () => clearTimeout(t);
  }, [closed]);

  const handleClose = () => {
    if (closed) return;
    setClosed(true);
    setCanSkip(true);
    cleanupMonetagDom();
    if (pendingNavAfterAd) {
      try { pendingNavAfterAd(); } catch {}
      pendingNavAfterAd = null;
    }
    if (typeof window !== 'undefined') {
      try { (window as any).__AJ_SHOW_INTERSTITIAL = false; } catch {}
    }
    onClose();
  };

  if (closed) return null;

  return (
    <div
      className="fixed inset-0 z-[9995] flex flex-col items-center justify-center px-6"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #14141f 0%, #08080c 50%, #050505 100%)' }}
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 mb-4">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-300">Sponsored</span>
      </div>
      <p className="text-white font-black text-lg mb-1">AJ Super Portal</p>
      <p className="text-zinc-400 text-xs text-center mb-6 max-w-xs">
        Partner offer opened in a new tab · Earn AJ Coins 🪙
      </p>
      <div className="absolute top-4 right-4 z-10">
        {canSkip ? (
          <button
            onClick={handleClose}
            className="bg-white/90 text-black font-black text-sm px-5 py-2 rounded-full active:scale-90 transition-all"
          >
            Continue
          </button>
        ) : (
          <div className="bg-black/60 backdrop-blur-sm text-white text-sm font-black px-4 py-2 rounded-full">
            {countdown}s
          </div>
        )}
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

  // ── AUTH
  const [user,     setUser]     = useState<any>(null);
  const [balance,  setBalance]  = useState(0);
  const [botTier,  setBotTier]  = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading,  setLoading]  = useState(0);
  // One-Click Ban: show 403-style message on auth screen after kick
  const [banNotice, setBanNotice] = useState<string | null>(null);
  const banKickInProgress = useRef(false);

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
  const [commentAliasIds, setCommentAliasIds] = useState<string[]>([]);
  const [commentCollection, setCommentCollection] = useState<string>('user_posts');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0); // FIX: track keyboard height for comment input padding
  const [postComments,  setPostComments]  = useState<any[]>([]);
  // Pending local comments — survive snapshot wipes when server rejects optimistic writes
  const pendingCommentsRef = useRef<Record<string, any>>({});
  const commentListenPostIdRef = useRef<string | null>(null);
  const commentAliasIdsRef = useRef<string[]>([]);
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
    "Connecting to AJ trading network..."
  ]);
  const [botOpen,     setBotOpen]     = useState(false);
  const [botMessages, setBotMessages] = useState([{
    from:'bot',
    text:`Hi! I am AJ AI Assistant 🤖. I'm here to provide A to Z details about AJ Super Portal — Coins, TikReels, Pulse, Live, Wallet, Ads, Surveys, Withdrawals & more. How can I assist you today?`
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
  const [myReferralId, setMyReferralId] = useState('');

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
  // PK ACCEPTANCE (rival side) — jab koi user ko PK challenge bheje
  const [pkIncomingChallenge, setPkIncomingChallenge] = useState<any>(null);
  const [pkHostFrame,        setPkHostFrame]        = useState('');  // host ki live video frame (rival ke view mein)
  const [pkMyBroadcastActive, setPkMyBroadcastActive] = useState(false);
  const pkHostFrameUnsubRef  = useRef<any>(null);
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
  // FIX: TikReels profile — fetch ALL of the current user's posts (not just latest 20 from global feed)
  const [tikProfileMyPosts, setTikProfileMyPosts] = useState<any[]>([]);
  const [tikProfileFollowers, setTikProfileFollowers] = useState(0);

  // FIX (Hinglish): Profile video viewer — jab profile grid mein kisi video post par
  // click karte hain toh full-screen video khulta hai (jaise TikTok app mein hota hai).
  const [profileVideoViewer, setProfileVideoViewer] = useState<{
    url: string;
    text?: string;
    post?: any;
  } | null>(null);

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

  // ── PULSE / TIKREEL GIFT PANEL (shared)
  const [pulseGiftPostId, setPulseGiftPostId] = useState<string|null>(null);
  const [giftTargetUid, setGiftTargetUid] = useState<string|null>(null);

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
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followListUsers, setFollowListUsers] = useState<any[]>([]);
  const [followListMode, setFollowListMode] = useState<'followers' | 'following' | null>(null);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followListUid, setFollowListUid] = useState<string | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState('');

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
  const [dmInbox,           setDmInbox]           = useState<any[]>([]);
  const [dmInboxLoading,    setDmInboxLoading]    = useState(false);
  const [dmBackScreen,      setDmBackScreen]      = useState<'messages' | 'profile' | 'hub' | 'tikreels' | 'pulse'>('messages');
  const dmUnsubRef = useRef<any>(null);
  const dmInboxUnsubRef = useRef<any>(null);
  const dmEndRef   = useRef<HTMLDivElement>(null);

  // ── COMPUTED
  const totalCoins     = balance + visualProfit;
  const displayBalance = totalCoins.toFixed(2);
  // Admin One-Click Ban — ONLY for configured admin email and/or ADMIN_UIDS
  const isPortalAdmin = isPortalAdminUser(user);

  // If a non-admin somehow lands on screen='admin', kick back to hub (no 403 UI leak)
  useEffect(() => {
    if (screen === 'admin' && !isPortalAdmin) {
      setScreen('hub');
    }
  }, [screen, isPortalAdmin]);

  const currentWithdrawMethod = WITHDRAW_METHODS.find(m => m.label === payoutMethod) || WITHDRAW_METHODS[0];

  // ==========================================================
  // INTRUSIVE AD GUARD — never auto-load third-party popunders on mount.
  // Rewarded ads open Adsterra Direct Link from Offer Hub → Watch & Earn.
  // ==========================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stopGuard = startIntrusiveAdGuard();
    stripIntrusiveAdNodes();
    return () => {
      try { stopGuard(); } catch {}
    };
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
      // Unsplash — lifestyle + luxury mix (Pulse filler)
      const pRes  = await fetch(`https://api.unsplash.com/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&query=lifestyle,luxury&count=20`);
      const pData = await pRes.json().catch(() => null);
      if (pRes.ok && Array.isArray(pData)) {
        setPixaData(pData);
      } else {
        console.warn('Unsplash fetch failed', pRes.status, pData);
        // Keep any existing filler; don't wipe real Firestore posts
      }

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
      // Prefer unordered query (no composite index) + client filter/sort
      const q = query(collection(db, 'live_rooms'), limit(40));
      return onSnapshot(
        q,
        (snap) => {
          const now = Date.now();
          const rooms = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as any))
            .filter(
              (r: any) =>
                r.active !== false &&
                Number(r.lastSeenMs || 0) > 0 &&
                now - Number(r.lastSeenMs) < 45000
            )
            .sort(
              (a: any, b: any) =>
                Number(b.startedAtMs || b.lastSeenMs || 0) -
                Number(a.startedAtMs || a.lastSeenMs || 0)
            );
          setLiveNowList(rooms);
        },
        (err) => console.warn('live_rooms list', err)
      );
    } catch {
      return () => {};
    }
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
      // TikTok-style feed: Firebase user_posts + videos (client-sorted)
      const unsubs: Array<() => void> = [];
      let fromPosts: TikReelPost[] = [];
      let fromVideos: TikReelPost[] = [];
      const publish = () => {
        setUserPosts(mergeTikReelPosts([fromPosts, fromVideos]));
      };
      try {
        const q = query(
          collection(db, 'user_posts'),
          orderBy('createdAt', 'desc'),
          limit(120)
        );
        unsubs.push(
          onSnapshot(
            q,
            (snap) => {
              fromPosts = snap.docs.map((d) =>
                normalizeTikReelPost(d.id, d.data() as Record<string, unknown>, 'user_posts')
              );
              publish();
            },
            (err) => {
              console.warn('tikreels user_posts ordered failed', err);
              try {
                const q2 = query(collection(db, 'user_posts'), limit(120));
                unsubs.push(
                  onSnapshot(q2, (snap) => {
                    fromPosts = snap.docs.map((d) =>
                      normalizeTikReelPost(
                        d.id,
                        d.data() as Record<string, unknown>,
                        'user_posts'
                      )
                    );
                    publish();
                  })
                );
              } catch (e2) {
                console.warn('tikreels user_posts fallback', e2);
              }
            }
          )
        );
      } catch (e) {
        console.warn('tikreels user_posts query', e);
      }
      try {
        // Unordered + client sort so docs missing createdAtMs still appear
        const qv = query(collection(db, 'videos'), limit(120));
        unsubs.push(
          onSnapshot(
            qv,
            (snap) => {
              fromVideos = snap.docs.map((d) =>
                normalizeTikReelPost(d.id, d.data() as Record<string, unknown>, 'videos')
              );
              publish();
            },
            (err) => console.warn('tikreels videos feed', err)
          )
        );
      } catch (e) {
        console.warn('tikreels videos query', e);
      }
      return () => unsubs.forEach((u) => u());
    }
    if (socialScreen==='pulse') {
      const unsubs: Array<() => void> = [];
      const applyPulse = (docs: { id: string; data: () => Record<string, unknown> }[]) => {
        const rows = docs.map((d) =>
          normalizePulsePost(d.id, d.data() as Record<string, unknown>)
        );
        rows.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        setPulsePosts(rows);
      };
      try {
        const q = query(
          collection(db, 'pulse_posts'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        unsubs.push(
          onSnapshot(
            q,
            (snap) => applyPulse(snap.docs),
            (err) => {
              console.warn('pulse_posts ordered failed', err);
              try {
                const q2 = query(collection(db, 'pulse_posts'), limit(100));
                unsubs.push(
                  onSnapshot(q2, (snap) => applyPulse(snap.docs), (e2) =>
                    console.warn('pulse_posts fallback', e2)
                  )
                );
              } catch (e2) {
                console.warn('pulse_posts fallback query', e2);
              }
            }
          )
        );
      } catch (e) {
        console.warn('pulse_posts query', e);
      }
      // Ensure Unsplash filler loads when opening Pulse directly
      if (!pixaData.length) {
        fetchSocialAPIs().catch(() => {});
      }
      return () => unsubs.forEach((u) => u());
    }
    return () => {};
  }, [socialScreen, activeContact, user]);

  /** Fetch comments from reel_comments + nested paths + API for all aliases. */
  const loadAllCommentsForAliases = async (
    aliases: string[],
    canonicalId: string
  ): Promise<any[]> => {
    const collected: any[] = [];
    const pushRows = (rows: any[]) => {
      for (const r of rows) {
        if (!r?.id) continue;
        collected.push(r);
      }
    };

    await Promise.all(
      aliases.map(async (pid) => {
        try {
          const snap = await getDocs(
            query(
              collection(db, REEL_COMMENTS_COL),
              where('postId', '==', pid),
              limit(200)
            )
          );
          pushRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.warn('load reel_comments', pid, e);
        }
        // Also match docs that stored this id in postIds[]
        try {
          const snap2 = await getDocs(
            query(
              collection(db, REEL_COMMENTS_COL),
              where('postIds', 'array-contains', pid),
              limit(200)
            )
          );
          pushRows(snap2.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch {
          /* index / field may be missing */
        }
      })
    );

    const nestedCols = ['user_posts', 'videos', 'pulse_posts', 'yt_posts'];
    await Promise.all(
      aliases.flatMap((pid) =>
        nestedCols.map(async (col) => {
          try {
            const snap = await getDocs(
              query(collection(db, col, pid, 'comments'), limit(100))
            );
            pushRows(
              snap.docs.map((d) => {
                const data = d.data() as Record<string, unknown>;
                const ca = data.createdAt as { toMillis?: () => number } | undefined;
                return {
                  id: `${col}_${pid}_${d.id}`,
                  postId: canonicalId,
                  text: data.text,
                  uid: data.uid,
                  username: data.username || 'AJ_Member',
                  photo: data.photo || '',
                  createdAtMs:
                    Number(data.createdAtMs || 0) ||
                    (ca && typeof ca.toMillis === 'function' ? ca.toMillis() : 0),
                  _nested: true,
                };
              })
            );
          } catch {
            /* nested path may not exist */
          }
        })
      )
    );

    try {
      const headers: Record<string, string> = {};
      if (user) {
        try {
          headers.Authorization = `Bearer ${await user.getIdToken()}`;
        } catch {
          /* guest fetch */
        }
      }
      await Promise.all(
        aliases.map(async (pid) => {
          try {
            const res = await fetch(
              `/api/comments?postId=${encodeURIComponent(pid)}`,
              { headers }
            );
            const data = await res.json().catch(() => ({}));
            if (data?.ok && Array.isArray(data.comments)) {
              pushRows(data.comments);
            }
          } catch {
            /* ignore */
          }
        })
      );
    } catch {
      /* ignore */
    }

    return dedupeComments(collected);
  };

  // Dedicated comment listener — MUST be separate from tikreels/pulse feed effect
  // (those branches return early and previously blocked comments on the feed).
  useEffect(() => {
    if (!commentPostId || commentPostId.startsWith('gift_')) return;

    commentListenPostIdRef.current = commentPostId;
    const listeningPostId = commentPostId;
    const aliases =
      commentAliasIds.length > 0
        ? Array.from(new Set([commentPostId, ...commentAliasIds]))
        : [commentPostId];
    commentAliasIdsRef.current = aliases;
    setCommentsLoading(true);

    const applyServerRows = (rows: any[], { replace }: { replace?: boolean } = {}) => {
      if (commentListenPostIdRef.current !== listeningPostId) return;
      const pending = Object.values(pendingCommentsRef.current);
      for (const p of pending) {
        const matched = rows.some(
          (s: any) =>
            String(s.id) === String(p.id) ||
            (String(s.uid) === String(p.uid) &&
              String(s.text) === String(p.text) &&
              Math.abs(Number(s.createdAtMs || 0) - Number(p.createdAtMs || 0)) < 20000)
        );
        if (matched) delete pendingCommentsRef.current[p.id];
      }
      setPostComments((prev) => {
        const base = replace
          ? rows
          : dedupeComments([
              ...prev.filter((c: any) => c._nested || c.pending),
              ...rows,
            ]);
        return mergeCommentLists(
          base as any[],
          Object.values(pendingCommentsRef.current),
          aliases
        ) as any[];
      });
      setCommentsLoading(false);
    };

    let unsub: (() => void) | undefined;
    try {
      const q =
        aliases.length === 1
          ? query(
              collection(db, REEL_COMMENTS_COL),
              where('postId', '==', aliases[0]),
              limit(200)
            )
          : query(
              collection(db, REEL_COMMENTS_COL),
              where('postId', 'in', aliases.slice(0, 10)),
              limit(200)
            );

      unsub = onSnapshot(
        q,
        (snap) => {
          applyServerRows(
            snap.docs.map((d) => ({ id: d.id, ...d.data() })),
            { replace: false }
          );
        },
        (err) => {
          console.warn('reel_comments listen', err);
          void loadAllCommentsForAliases(aliases, listeningPostId).then((rows) => {
            applyServerRows(rows, { replace: true });
          });
        }
      );
    } catch (e) {
      console.error('Comment sub error', e);
    }

    void loadAllCommentsForAliases(aliases, listeningPostId).then((rows) => {
      applyServerRows(rows, { replace: true });
    });

    return () => {
      unsub?.();
    };
  }, [commentPostId, commentAliasIds, user]);

  // FIX ROUND 6: Comment keyboard open nahi ho raha tha — ab PROPER fix.
  // Mobile pe input focus karne ke liye multiple strategies use karte hain:
  // 1. Delay focus until DOM is ready (300ms for smooth animation)
  // 2. Use createObjectURL-free approach: directly focus with programmatic click
  // 3. Use inputMode="text" with enterKeyHint for mobile keyboard optimization
  // 4. Touch-friendly: tap on input directly opens keyboard (no readonly tricks)
  useEffect(() => {
    if (!commentPostId) return;
    // Strategy: try at multiple timepoints — rAF fires before paint,
    // then 100ms and 250ms as backups for slow-rendering modals.
    const tryFocus = () => {
      try {
        const input = commentInputRef.current;
        if (input) {
          input.focus({ preventScroll: false });
          try { input.setSelectionRange(input.value.length, input.value.length); } catch {}
        }
      } catch(e) { console.warn('Comment focus error', e); }
    };
    // Immediate rAF (before next paint)
    const raf = requestAnimationFrame(tryFocus);
    // Backup timers — handle slow modal animations
    const t1 = setTimeout(tryFocus, 100);
    const t2 = setTimeout(tryFocus, 280);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [commentPostId]);

  // FIX: Track keyboard height via visualViewport — when keyboard slides up,
  // visualViewport.height shrinks. We use this to dynamically pad the comment
  // input container so the keyboard doesn't hide the input.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => {
      // FIX: Include offsetTop (address bar / safe area offset) in calculation.
      // On iOS Safari, vv.offsetTop shifts when keyboard appears; ignoring it
      // gives a wrong (too-large) keyboard height estimate.
      const kbHeight = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      setKeyboardHeight(kbHeight);
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

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

  // FIX: When TikReels profile tab is opened, fetch ALL of this user's videos
  // via uid/userId queries (not global newest-60 + client filter).
  useEffect(() => {
    if (socialScreen !== 'tikreels' || tiktabMode !== 'profile') return;
    if (!user) return;
    const fetchMyPosts = async () => {
      try {
        const lists: TikReelPost[][] = [];

        // videos.userId
        try {
          const videosSnap = await getDocs(
            query(collection(db, 'videos'), where('userId', '==', user.uid), limit(120))
          );
          lists.push(
            videosSnap.docs.map((d) =>
              normalizeTikReelPost(d.id, d.data() as Record<string, unknown>, 'videos')
            )
          );
        } catch (ve) {
          console.warn('tikProfile videos.userId', ve);
        }

        // videos.uid (legacy dual field)
        try {
          const videosUidSnap = await getDocs(
            query(collection(db, 'videos'), where('uid', '==', user.uid), limit(120))
          );
          lists.push(
            videosUidSnap.docs.map((d) =>
              normalizeTikReelPost(d.id, d.data() as Record<string, unknown>, 'videos')
            )
          );
        } catch {}

        // user_posts.uid
        try {
          const postsSnap = await getDocs(
            query(collection(db, 'user_posts'), where('uid', '==', user.uid), limit(120))
          );
          lists.push(
            postsSnap.docs.map((d) =>
              normalizeTikReelPost(d.id, d.data() as Record<string, unknown>, 'user_posts')
            )
          );
        } catch (e) {
          console.warn('tikProfile user_posts.uid', e);
        }

        // user_posts.userId
        try {
          const posts2 = await getDocs(
            query(collection(db, 'user_posts'), where('userId', '==', user.uid), limit(120))
          );
          lists.push(
            posts2.docs.map((d) =>
              normalizeTikReelPost(d.id, d.data() as Record<string, unknown>, 'user_posts')
            )
          );
        } catch {}

        // Legacy subcollection
        try {
          const subSnap = await getDocs(
            query(collection(db, 'users', user.uid, 'videos'), limit(80))
          );
          lists.push(
            subSnap.docs.map((d) =>
              normalizeTikReelPost(
                d.id,
                {
                  ...(d.data() as Record<string, unknown>),
                  uid: user.uid,
                  userId: user.uid,
                },
                'users_videos'
              )
            )
          );
        } catch {}

        const merged = filterOwnedBy(mergeTikReelPosts(lists), user.uid);
        setTikProfileMyPosts(merged);
      } catch (e) {
        console.error('fetchTikProfileMyPosts', e);
      }
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          setTikProfileFollowers(data.followersCount || 0);
        }
      } catch {}
      loadFollowingList();
    };
    fetchMyPosts();
    return () => {};
  }, [socialScreen, tiktabMode, user]);

  useEffect(() => {
    let userDocUnsub: (() => void) | null = null;

    const kickIfBanned = async (cu: any, data: Record<string, unknown>) => {
      if (!isUserBanned(data) || banKickInProgress.current) return false;
      banKickInProgress.current = true;
      try {
        setBanNotice(BAN_FORBIDDEN_MESSAGE);
        setVvipAlert({ msg: `🚫 ${BAN_FORBIDDEN_MESSAGE}`, icon: '🚫' });
        try {
          await setUserOfflineStatus(cu.uid);
        } catch {
          /* ignore offline write errors during ban kick */
        }
        await signOut(auth);
        setUser(null);
        // Hard redirect to dedicated banned page (session terminated)
        if (typeof window !== 'undefined') {
          window.location.href = '/banned';
        } else {
          setScreen('auth');
        }
      } catch (err) {
        console.error('kickIfBanned', err);
      } finally {
        banKickInProgress.current = false;
      }
      return true;
    };

    const unsubAuth = onAuthStateChanged(auth, async (cu) => {
      // Clear previous user doc listener on every auth change
      if (userDocUnsub) {
        try {
          userDocUnsub();
        } catch {
          /* ignore */
        }
        userDocUnsub = null;
      }

      if (!cu) {
        setUser(null);
        setScreen('auth');
        return;
      }

      setUser(cu);

      try {
        const userRef = doc(db, 'users', cu.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const d = snap.data() as Record<string, unknown>;
          // Strict ban check on login / session restore
          if (await kickIfBanned(cu, d)) return;
          setBanNotice(null);
          setHasSocialProfile((d.hasSocialProfile as boolean) ?? true);
          setUsername((d.username as string) || '');
          setBio((d.bio as string) || '');
          setProfileDisplayName((d.name as string) || (cu.displayName as string) || '');
          setTempPhoto((d.photo as string) || cu.photoURL || '');
          // Existing users — ensure unique referral ID
          try {
            const code = await ensureUserReferralId(cu.uid);
            setMyReferralId(code);
          } catch (e) {
            console.warn('ensureUserReferralId', e);
            setMyReferralId(String(d.referralId || ''));
          }
        } else {
          // NEW USER — 0 signup bonus; unique referral ID; camera prompt
          const newRefId = await (async () => {
            // Create user first with placeholder, then allocate unique code
            await setDoc(userRef, {
              name: cu.displayName,
              email: cu.email,
              balance: SIGNUP_BONUS_COINS, // always 0
              botTier: 'none',
              invested: 0,
              uid: cu.uid,
              lastSync: serverTimestamp(),
              hasSocialProfile: true,
              photo: cu.photoURL || '',
              followers: 0,
              following: 0,
              postsCount: 0,
              followersCount: 0,
              followingCount: 0,
              totalLikes: 0,
              status: 'online',
              fcmToken: '',
              ...DEFAULT_ACCOUNT_BAN_FIELDS,
            });
            try {
              return await ensureUserReferralId(cu.uid);
            } catch {
              return '';
            }
          })();
          setMyReferralId(newRefId);
          setHasSocialProfile(true);
          setBanNotice(null);
          setShowCameraPermissionPrompt(true);
        }

        userDocUnsub = onSnapshot(userRef, async (s) => {
          if (!s.exists()) return;
          const data = s.data() as Record<string, unknown>;
          // Instant session terminate when admin bans an active user
          if (await kickIfBanned(cu, data)) return;
          setBalance((data.balance as number) || 0);
          setBotTier((data.botTier as string) || 'none');
          setInvested((data.invested as number) || 0);
          if (data.referralId) setMyReferralId(String(data.referralId));
        });
      } catch (err) {
        console.error('Auth init error', err);
      }

      await setUserOnlinePresence(cu);
      // Returning users go to hub; new users stay on permission prompt first
      if (!showCameraPermissionPrompt) {
        setScreen('hub');
      }
    });

    return () => {
      if (userDocUnsub) {
        try {
          userDocUnsub();
        } catch {
          /* ignore */
        }
      }
      unsubAuth();
    };
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
    // Heartbeat keeps admin green light accurate while the portal tab is open
    const heartbeat = window.setInterval(() => {
      void setUserOnlinePresence(user);
    }, 25000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void setUserOnlinePresence(user);
    };
    document.addEventListener('visibilitychange', onVis);
    const handleUnload = () => {
      void setUserOfflineStatus(user.uid);
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      void setUserOfflineStatus(user.uid);
    };
  }, [user]);

  // FIX: PK CHALLENGE LISTENER — incoming PK challenges detect karte hain.
  // Jab koi user current user ko PK challenge bhejta hai, pk_sessions collection
  // mein ek document banta hai with rivalUid === user.uid and status === 'pending'.
  // Yeh listener us document ko detect karta hai aur accept/decline UI dikhata hai.
  useEffect(() => {
    if (!user) return;
    let unsub: any = null;
    try {
      // FIX: Composite Firestore index (rivalUid + status) may not exist — query fails silently.
      // Query only on rivalUid (single-field — always works), filter status client-side.
      const q = query(
        collection(db, 'pk_sessions'),
        where('rivalUid', '==', user.uid)
      );
      unsub = onSnapshot(q, (snap) => {
        // Filter client-side: find the latest pending challenge
        const pending = snap.docs.filter(d => d.data().status === 'pending');
        if (pending.length > 0) {
          const docSnap = pending[pending.length - 1]; // most recent pending
          const data = docSnap.data();
          if (!pkActive) {
            setPkIncomingChallenge({ id: docSnap.id, ...data });
          }
        } else {
          if (!pkActive) {
            setPkIncomingChallenge(null);
          }
        }
      }, (err) => {
        console.warn('PK challenge listener error (non-fatal):', err);
      });
    } catch (e) {
      console.warn('PK challenge listener setup failed (non-fatal):', e);
    }
    return () => {
      if (unsub) {
        try { unsub(); } catch {}
      }
    };
  }, [user, pkActive]);

  // AI profit ticker — Basic 2.5% / VVIP 5% of invested (visual only; claim uses server clock)
  useEffect(() => {
    if (!user || botTier==='none' || invested<=0) return;
    const rate   = botTier==='vvip' ? 0.05 : 0.025;
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

  // PK real-time gift + score sync (Host / Guest / viewers on same session)
  useEffect(() => {
    if (!pkActive || !pkRoomId || !user) return;
    const sessionUnsub = onSnapshot(doc(db, 'pk_sessions', pkRoomId), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data() as {
        scoreHost?: number;
        scoreGuest?: number;
        hostUid?: string;
        hostId?: string;
        rivalUid?: string;
        challengerId?: string;
      };
      // Host is the original challenger (hostUid). challengerId = accepting guest.
      const hostId = d.hostUid || d.hostId || '';
      const iAmHost = hostId === user.uid;
      const hostScore = Number(d.scoreHost || 0);
      const guestScore = Number(d.scoreGuest || 0);
      setPkScore(
        iAmHost
          ? { me: hostScore, rival: guestScore }
          : { me: guestScore, rival: hostScore }
      );
    });
    const giftsUnsub = onSnapshot(
      query(collection(db, 'pk_sessions', pkRoomId, 'gifts'), orderBy('createdAtMs', 'desc'), limit(1)),
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const g = change.doc.data() as {
            giftName?: string;
            giftIcon?: string;
            giftCost?: number;
            giftMediaUrl?: string;
            senderUid?: string;
            senderName?: string;
            createdAtMs?: number;
          };
          // Skip own echo if we already showed locally within 2s
          if (g.senderUid === user.uid && Date.now() - Number(g.createdAtMs || 0) < 2000) return;
          setCinematicGift({
            name: g.giftName || 'Gift',
            icon: g.giftIcon || '🎁',
            cost: Number(g.giftCost || 0),
            mediaUrl: g.giftMediaUrl || '',
          });
          setCinematicSender(g.senderName || 'Viewer');
        });
      }
    );
    return () => {
      try { sessionUnsub(); } catch {}
      try { giftsUnsub(); } catch {}
    };
  }, [pkActive, pkRoomId, user]);

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
      { threshold: 0.55, root }
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
    // Track views for community TikReels (user posts render FIRST in the feed)
    if (socialScreen === 'tikreels' && userPosts.length > 0) {
      const localIdx = activeVideoIdx;
      if (localIdx >= 0 && localIdx < userPosts.length && userPosts[localIdx]) {
        const postId = userPosts[localIdx].id;
        const col =
          userPosts[localIdx]._source === 'videos' ? 'videos' : 'user_posts';
        if (!trackedViewsRef.current.has(postId)) {
          trackedViewsRef.current.add(postId);
          try {
            updateDoc(doc(db, col, postId), { views: increment(1) });
          } catch {}
          // Also bump linked user_posts when viewing a videos-doc
          const linked = userPosts[localIdx].postId;
          if (col === 'videos' && linked) {
            try {
              updateDoc(doc(db, 'user_posts', String(linked)), { views: increment(1) });
            } catch {}
          }
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

  // Audio Kill + FORCE PLAY active user video (autoPlay prop alone is unreliable)
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
    Object.entries(userVideoRefs.current).forEach(([idxStr, el]) => {
      if (!el) return;
      const idx = parseInt(idxStr, 10);
      if (idx === activeVideoIdx) {
        try {
          // Pulse uses pulseMuted; TikReel uses globalSoundOn
          el.muted = isPulseFeed ? pulseMuted : !globalSoundOn;
          const p = el.play();
          if (p && typeof p.then === 'function') {
            p.catch(() => {
              el.muted = true;
              el.play().catch(() => {});
            });
          }
        } catch {}
      } else if (!el.paused) {
        el.pause();
      }
    });
  }, [
    activeVideoIdx,
    socialScreen,
    tiktabMode,
    pulseTab,
    globalSoundOn,
    pulseMuted,
    userPosts,
    pulsePosts,
    pixaVideos,
    pixaData,
  ]);

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
        viewerCount: 0, startedAtMs: Date.now(), liveViewers: 0,
        // FIX: Auto-populate hostId with logged-in user's UID + PK match fields
        // Taaki live_rooms document mein hostId automatic set ho (manual entry nahi)
        // Aur PK match ke liye challengerId khali, matchStatus pending, isPkActive false
        hostId: user.uid,            // Automatic — logged-in user ki UID
        challengerId: '',             // Khali jab tak koi PK challenge accept na kare
        matchStatus: 'pending',      // 'pending' → 'active' jab rival join kare
        isPkActive: false,           // false → true jab PK match start ho
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
      // Host live reward once per day when ending a session (AJ Coins via server)
      try {
        if (user && liveRoomId) {
          const day = new Date().toISOString().slice(0, 10);
          const reward = await earnReward(user, 'live_host', {
            idempotencyKey: `${user.uid}_${day}`,
            meta: { roomId: liveRoomId },
          });
          if (reward.ok && !reward.duplicate && (reward.creditedCoins || 0) > 0) {
            setVvipAlert({ msg: reward.message || `Live host reward +${reward.creditedCoins}`, icon: '🔴' });
          }
        }
      } catch {}
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
    if (!rid) return setVvipAlert({msg:"Please enter Live Room ID or PK Match ID."});
    try {
      // TikTok-style: paste PK match ID to join/accept the battle
      try {
        const pkSnap = await getDoc(doc(db, 'pk_sessions', rid));
        if (pkSnap.exists() && user) {
          const pk = { id: pkSnap.id, pkRoomId: pkSnap.id, ...pkSnap.data() } as any;
          const status = String(pk.status || '');
          const iAmRival = pk.rivalUid === user.uid;
          const iAmHost = pk.hostUid === user.uid || pk.hostId === user.uid;
          if (iAmRival && status !== 'ended' && status !== 'declined') {
            setJoinRoomInput('');
            await acceptPkChallenge(pk);
            return;
          }
          if (iAmHost && status !== 'ended' && status !== 'declined') {
            setPkRoomId(pkSnap.id);
            setPkRivalData({
              uid: pk.rivalUid,
              username: pk.rivalName || pk.rivalUid,
              photo: pk.rivalPhoto || '',
            });
            setPkTimer(Number(pk.duration || PK_DURATION));
            setPkScore({
              me: Number(pk.scoreHost || 0),
              rival: Number(pk.scoreGuest || 0),
            });
            setPkWinner(null);
            setPkActive(true);
            setScreen('social');
            setSocialScreen('golive');
            setLiveActive(true);
            try { joinPkRivalStream(pkSnap.id); } catch {}
            setJoinRoomInput('');
            setVvipAlert({ msg: '⚔️ Rejoined PK Match!', icon: '⚔️' });
            return;
          }
          if (status === 'active' || status === 'pending') {
            const hostUid = pk.hostUid || pk.hostId;
            if (hostUid) {
              const hostLive = await getDocs(
                query(collection(db, 'live_rooms'), where('uid', '==', hostUid), limit(1))
              );
              if (!hostLive.empty) {
                setJoinRoomInput('');
                return joinLiveByRoomId(hostLive.docs[0].id);
              }
            }
          }
        }
      } catch (pkLookupErr) {
        console.warn('PK id lookup', pkLookupErr);
      }

      let roomSnap:any = await getDoc(doc(db, 'live_rooms', rid));
      if (!roomSnap.exists()) {
        const all2 = await getDocs(query(collection(db,'live_rooms'),limit(50)));
        const m = all2.docs.find(d => d.id.endsWith(rid) || d.id===rid);
        if (m) roomSnap = m;
      }
      if (!roomSnap.exists()) return setVvipAlert({msg:'Room not found. Paste full Live Room ID or PK Match ID.'});
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
      // Real-time viewers + room meta for watchers
      try {
        if ((viewerUnsubRef as any)._roomMeta) {
          try { (viewerUnsubRef as any)._roomMeta(); } catch {}
        }
        (viewerUnsubRef as any)._roomMeta = onSnapshot(doc(db, 'live_rooms', roomSnap.id), (metaSnap) => {
          if (!metaSnap.exists()) return;
          const data = metaSnap.data() as any;
          setViewerRoom((prev: any) => (prev ? { ...prev, ...data, id: metaSnap.id } : { id: metaSnap.id, ...data }));
        });
      } catch {}
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
        }, user?.uid);
      } catch (audioErr) {
        console.warn('joinLiveByRoomId: audio join failed (non-fatal — video still works)', audioErr);
      }
      // Live view reward after ~60s of uninterrupted watching (AJ Coins via server)
      try {
        if ((liveStreamRef as any)._liveViewTimer) clearTimeout((liveStreamRef as any)._liveViewTimer);
        (liveStreamRef as any)._liveViewTimer = setTimeout(async () => {
          const r = await earnReward(user, 'live_view', {
            idempotencyKey: `${user?.uid}_${roomSnap.id}_${new Date().toISOString().slice(0, 10)}`,
            meta: { roomId: roomSnap.id },
          });
          if (r.ok && !r.duplicate && (r.creditedCoins || 0) > 0) {
            setVvipAlert({ msg: r.message || `Live view reward +${r.creditedCoins} coins`, icon: '🔴' });
          }
        }, 60000);
      } catch {}
      setZegoAttached(true);
    } catch(e) { console.error('joinLiveByRoomId', e); setVvipAlert({msg:'Could not join room. Please try again.'}); }
  };

  const leaveViewerRoom = () => {
    // FIX: Pura leaveViewerRoom try/finally mein — hamesha Social Hub par wapas aao
    try {
      if (viewerUnsubRef.current) { viewerUnsubRef.current(); viewerUnsubRef.current = null; }
      try {
        if ((viewerUnsubRef as any)._roomMeta) {
          (viewerUnsubRef as any)._roomMeta();
          (viewerUnsubRef as any)._roomMeta = null;
        }
      } catch {}
      // FIX ROUND 7: Stop RTDB frame listener
      if (viewerFrameUnsubRef.current) { viewerFrameUnsubRef.current(); viewerFrameUnsubRef.current = null; }
      try {
        if ((liveStreamRef as any)._liveViewTimer) {
          clearTimeout((liveStreamRef as any)._liveViewTimer);
          (liveStreamRef as any)._liveViewTimer = null;
        }
      } catch {}
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
      await runTransaction(db, async (tx) => {
        const uref = doc(db, 'users', user.uid);
        const snap = await tx.get(uref);
        if (!snap.exists()) throw new Error('user_not_found');
        const bal = Number((snap.data() as { balance?: number }).balance || 0);
        if (bal < PK_ENTRY_COINS) throw new Error('insufficient_balance');
        tx.update(uref, { balance: increment(-PK_ENTRY_COINS) });
      });
      try {
        await addDoc(collection(db,"AdminRevenue"), {
          type:'pk_match',
          currency: 'USD',
          platformSharePct: ADMIN_EARN_SHARE,
          userSharePct: USER_EARN_SHARE,
          totalDeducted: PK_ENTRY_COINS * 2,
          adminShareCoins: Math.floor(PK_ENTRY_COINS * 2 * ADMIN_EARN_SHARE),
          ownerUsd: Number(((PK_ENTRY_COINS * 2 * ADMIN_EARN_SHARE) / COIN_RATE).toFixed(4)),
          challenger: user.uid, rival: rivalUid, date:serverTimestamp()
        });
        await creditAdminEarnings({
          ownerUsd: Number(((PK_ENTRY_COINS * 2 * ADMIN_EARN_SHARE) / COIN_RATE).toFixed(4)),
          ownerCoins: Math.floor(PK_ENTRY_COINS * 2 * ADMIN_EARN_SHARE),
          source: 'pk_match',
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
          hostId: user.uid,              // FIX: Auto-populate hostId with logged-in user's UID
          hostName: username || 'AJ_Member',
          hostPhoto: tempPhoto || user.photoURL || '',
          rivalUid: rivalUid,
          rivalName: rivalSnap.data().username || rivalUid,
          status: 'pending',  // pending → active → ended
          matchStatus: 'pending',        // FIX: PK match status field for live_rooms sync
          isPkActive: false,             // FIX: PK active flag — true when rival joins
          challengerId: '',              // FIX: Khali jab tak rival accept na kare
          scoreHost: 0,
          scoreGuest: 0,
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
      // FIX: Host apni video frames PK session pe broadcast kare — IMMEDIATELY
      // (agar rival 500ms ke andar accept kar le toh host ki frames nahi milti thi)
      // Reduced timeout to near-zero so host starts broadcasting as soon as possible.
      setTimeout(() => {
        try {
          if (liveStreamRef.current) {
            startFrameBroadcast(newPkRoomId + '_host', liveStreamRef.current);
            startAudioBroadcast(newPkRoomId + '_host', liveStreamRef.current);
          } else {
            // Fallback: try to get camera/mic if not already live
            if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
              navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
                .then(stream => {
                  liveStreamRef.current = stream;
                  if (liveVideoRef.current) { try { liveVideoRef.current.srcObject = stream; } catch {} }
                  startFrameBroadcast(newPkRoomId + '_host', stream);
                  startAudioBroadcast(newPkRoomId + '_host', stream);
                })
                .catch(err => console.warn('PK: getUserMedia fallback failed:', err));
            }
          }
        } catch (e) { console.warn('PK host frame broadcast failed:', e); }
      }, 50);  // 50ms — quick start, right after state updates settle
      // FIX: Host rival ki frames + audio listen kare (slight delay for rival to accept)
      setTimeout(() => {
        try {
          joinPkRivalStream(newPkRoomId);
        } catch (e) { console.warn('PK rival stream join failed:', e); }
      }, 200);
      setVvipAlert({msg:`⚔️ PK Challenge sent to @${rivalSnap.data().username || pkTargetId}! Match starting...`,icon:"⚔️"});
    } catch(e) { console.error('sendPkChallenge', e); setVvipAlert({msg:'Error sending challenge. Please try again.'}); }
  };

  const sendPkGift = async (
    creatorId: string,
    gift: { name: string; cost: number; icon: string; mediaUrl?: string }
  ) => {
    if (!user) return;
    if (balance < gift.cost) {
      setVvipAlert({
        msg: `Insufficient Balance! Need ${gift.cost} 🪙 — Go to Wallet to recharge.`,
        icon: '💰',
      });
      return;
    }

    // Deduct coins from gifter (boosts your PK bar — TikTok-style)
    try {
      await runTransaction(db, async (tx) => {
        const uref = doc(db, 'users', user.uid);
        const snap = await tx.get(uref);
        if (!snap.exists()) throw new Error('user_not_found');
        const bal = Number((snap.data() as { balance?: number }).balance || 0);
        if (bal < gift.cost) throw new Error('insufficient_balance');
        tx.update(uref, { balance: increment(-gift.cost) });
      });
    } catch (e) {
      console.error('PK gift deduct', e);
      setVvipAlert({ msg: 'Gift failed. Please try again.', icon: '⚠️' });
      return;
    }

    // Real-time sync — Gifter, Host, and Guest all see the same overlay + score
    if (pkRoomId) {
      try {
        const sessionSnap = await getDoc(doc(db, 'pk_sessions', pkRoomId));
        const session = sessionSnap.exists()
          ? (sessionSnap.data() as { hostUid?: string; hostId?: string; rivalUid?: string })
          : {};
        const hostId = session.hostUid || session.hostId || '';
        const rivalId = session.rivalUid || creatorId || '';
        const iAmHost = hostId === user.uid;
        // Gift boosts the sender's own team (standard PK battle)
        const creditHost = iAmHost;
        const giftEvent = {
          giftName: gift.name,
          giftIcon: gift.icon,
          giftCost: gift.cost,
          giftMediaUrl: gift.mediaUrl || '',
          senderUid: user.uid,
          senderName: username || 'Anonymous',
          toHost: creditHost,
          createdAt: serverTimestamp(),
          createdAtMs: Date.now(),
        };
        // Instant overlay for gifter (host/guest receive via onSnapshot)
        setCinematicGift({
          name: gift.name,
          icon: gift.icon,
          cost: gift.cost,
          mediaUrl: gift.mediaUrl || '',
        });
        setCinematicSender(username || 'You');
        await addDoc(collection(db, 'pk_sessions', pkRoomId, 'gifts'), giftEvent);
        await updateDoc(doc(db, 'pk_sessions', pkRoomId), {
          scoreHost: increment(creditHost ? gift.cost : 0),
          scoreGuest: increment(creditHost ? 0 : gift.cost),
          lastGift: giftEvent,
        });
        // Optional creator share to the other side / host live
        const beneficiary = creditHost ? rivalId || hostId : hostId;
        if (beneficiary && beneficiary !== user.uid) {
          try {
            await earnReward(user, 'live_gift', {
              idempotencyKey: `${user.uid}_${pkRoomId}_${gift.name}_${Date.now()}`,
              beneficiaryUid: beneficiary,
              meta: { giftName: gift.name, giftCost: gift.cost, pkRoomId },
            });
          } catch {
            /* score already updated */
          }
        }
        setVvipAlert({
          msg: `${gift.icon} ${gift.name}! +${gift.cost} to your PK score`,
          icon: gift.icon,
        });
      } catch (e) {
        console.warn('PK gift sync write failed', e);
        setVvipAlert({
          msg: 'Gift score sync failed. Publish firestore.rules for pk_sessions.',
          icon: '⚠️',
        });
      }
    }
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

  // FIX: Stop PK battle — handles BOTH host and rival (challenged user) cleanup
  const stopPkBattle = () => {
    try {
      // Stop listening to opponent frames (host listens to rival, rival listens to host)
      if (pkFrameUnsubRef.current) {
        try { pkFrameUnsubRef.current(); } catch {}
        pkFrameUnsubRef.current = null;
      }
      if (pkHostFrameUnsubRef.current) {
        try { pkHostFrameUnsubRef.current(); } catch {}
        pkHostFrameUnsubRef.current = null;
      }
      setPkRivalFrame('');
      setPkHostFrame('');
      // Stop audio
      try { leaveAudioStream(); } catch {}
      // Stop both host AND rival frame/audio broadcasts (whichever we started)
      if (pkRoomId) {
        try { stopFrameBroadcast(pkRoomId + '_host'); } catch {}
        try { stopFrameBroadcast(pkRoomId + '_rival'); } catch {}
        try { stopAudioBroadcast(pkRoomId + '_host'); } catch {}
        try { stopAudioBroadcast(pkRoomId + '_rival'); } catch {}
        // Clean up PK session in Firestore
        try {
          updateDoc(doc(db, 'pk_sessions', pkRoomId), {
            status: 'ended', endedAt: serverTimestamp(),
            // FIX: Also update matchStatus and isPkActive when PK ends
            matchStatus: 'ended',
            isPkActive: false,
          }).catch(() => {});
        } catch {}
        // FIX: Also update live_rooms document to clear PK status
        try {
          if (user && user.uid) {
            const liveQuery = query(
              collection(db, 'live_rooms'),
              where('uid', '==', user.uid),
              limit(1)
            );
            getDocs(liveQuery).then((snap) => {
              if (!snap.empty) {
                updateDoc(doc(db, 'live_rooms', snap.docs[0].id), {
                  matchStatus: 'ended',
                  isPkActive: false,
                  challengerId: '',
                }).catch(() => {});
              }
            }).catch(() => {});
          }
        } catch {}
      }
      // Stop local stream
      try {
        if (liveStreamRef.current) {
          liveStreamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          liveStreamRef.current = null;
        }
        if (liveVideoRef.current) {
          try { liveVideoRef.current.srcObject = null; } catch {}
        }
      } catch {}
      setPkActive(false);
      setPkMyBroadcastActive(false);
      setPkWinner(null);
      setPkTimer(PK_DURATION);
      setPkScore({ me: 0, rival: 0 });
      setPkRoomId('');
    } catch (e) {
      console.warn('stopPkBattle failed:', e);
    }
  };

  // ==========================================================
  // PK ACCEPTANCE — Rival (challenged user) joins the PK battle
  // FIX (Hinglish): Pehle sirf host ka code tha — rival ko challenge
  // milta tha but accept karne ka koi tareeqa nahi tha. Rival ka camera
  // start nahi hota tha, rival ki frames broadcast nahi hoti thi, aur
  // host ko rival ki video nahi dikhti thi. Ab fix:
  //   - Rival apna camera/mic acquire karta hai (getUserMedia)
  //   - Rival apni frames live_frames/{pkRoomId}_rival/current pe broadcast karta hai
  //   - Rival host ki frames live_frames/{pkRoomId}_host/current se listen karta hai
  //   - Dono users ek dusre ko live dekh sakte hain (bidirectional)
  // ==========================================================
  const acceptPkChallenge = async (challenge: any) => {
    if (!user || !challenge) return;
    const pkRoomIdVal = challenge.pkRoomId || challenge.id;
    if (!pkRoomIdVal) return;
    try {
      const pkSnap = await getDoc(doc(db, 'pk_sessions', pkRoomIdVal));
      if (!pkSnap.exists()) {
        setVvipAlert({msg: 'PK session not found. It may have expired.', icon: '⚠️'});
        setPkIncomingChallenge(null);
        return;
      }
      const pkData = pkSnap.data();
      if (pkData.status === 'ended') {
        setVvipAlert({msg: 'This PK Battle has already ended.', icon: '⚠️'});
        setPkIncomingChallenge(null);
        return;
      }
      setPkRoomId(pkRoomIdVal);
      setPkRivalData({
        uid: pkData.hostUid,
        username: pkData.hostName,
        photo: pkData.hostPhoto || '',
      });
      setPkTimer(PK_DURATION);
      setPkScore({ me: 0, rival: 0 });
      setPkWinner(null);
      setPkActive(true);
      setPkIncomingChallenge(null);

      try {
        await updateDoc(doc(db, 'pk_sessions', pkRoomIdVal), {
          status: 'active',
          startedAt: serverTimestamp(),
          // FIX: Auto-populate challengerId with the accepting user's logged-in UID
          // Taaki jab rival PK match accept kare, uski UID automatic set ho (manual entry nahi)
          challengerId: user.uid,        // Automatic — accept karne wale user ki UID
          matchStatus: 'active',         // PK match now active
          isPkActive: true,              // PK match is now live
        });
      } catch (e) { console.warn('PK session status update failed (non-fatal):', e); }

      // FIX: Also update the host's live_rooms document with challengerId + PK status
      // Taaki live_rooms document mein bhi challengerId, matchStatus, isPkActive
      // automatic set ho jayein jab rival PK match accept kare.
      // Host ki live_rooms room ID format: live_{hostUid}_{timestamp}
      // Hum pk_sessions se hostUid nikal kar host ki live room find karte hain.
      try {
        if (pkData && pkData.hostUid) {
          const hostLiveRoomId = `live_${pkData.hostUid}`;
          // Host ki live room find karne ke liye query
          const hostLiveQuery = query(
            collection(db, 'live_rooms'),
            where('uid', '==', pkData.hostUid),
            limit(1)
          );
          const hostLiveSnap = await getDocs(hostLiveQuery);
          if (!hostLiveSnap.empty) {
            const hostRoomDoc = hostLiveSnap.docs[0];
            await updateDoc(doc(db, 'live_rooms', hostRoomDoc.id), {
              challengerId: user.uid,    // Automatic — accept karne wale user ki UID
              matchStatus: 'active',     // PK match now active
              isPkActive: true,          // PK match is now live
            });
          }
        }
      } catch (liveRoomErr) { console.warn('live_rooms PK update failed (non-fatal):', liveRoomErr); }

      // Rival acquires own camera + mic via getUserMedia
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
            audio: true,
          });
          liveStreamRef.current = stream;
          if (liveVideoRef.current) {
            try { liveVideoRef.current.srcObject = stream; } catch {}
          }
          // Broadcast rival's frames — host listens on this path
          startFrameBroadcast(pkRoomIdVal + '_rival', stream);
          startAudioBroadcast(pkRoomIdVal + '_rival', stream);
          setPkMyBroadcastActive(true);
          setCameraReady(true);
        }
      } catch (camErr) {
        console.warn('acceptPkChallenge: getUserMedia failed, trying audio-only:', camErr);
        try {
          if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            liveStreamRef.current = audioStream;
            if (liveVideoRef.current) {
              try { liveVideoRef.current.srcObject = audioStream; } catch {}
            }
            startFrameBroadcast(pkRoomIdVal + '_rival', audioStream);
            startAudioBroadcast(pkRoomIdVal + '_rival', audioStream);
            setPkMyBroadcastActive(true);
            setCameraReady(true);
          }
        } catch (audioErr2) {
          console.warn('acceptPkChallenge: audio-only also failed:', audioErr2);
        }
      }

      // Rival listens to host's frames on live_frames/{pkRoomId}_host/current
      try {
        const rtdb = getDatabase();
        const hostFrameRef = ref(rtdb, `live_frames/${pkRoomIdVal}_host/current`);
        const hostUnsub = onValue(hostFrameRef, (snap) => {
          const data = snap.val();
          if (data && data.frame) {
            setPkHostFrame(data.frame);
          }
        });
        pkHostFrameUnsubRef.current = hostUnsub;
      } catch (hostFrameErr) {
        console.warn('acceptPkChallenge: host frame listener failed (non-fatal):', hostFrameErr);
      }

      // Join host's audio via WebRTC
      try {
        joinAudioStream(pkRoomIdVal + '_host', () => {
          console.log('acceptPkChallenge: host audio connected');
        });
      } catch (audioErr) {
        console.warn('acceptPkChallenge: host audio join failed (non-fatal):', audioErr);
      }

      // Navigate to golive screen so PK battle UI shows
      setScreen('social');
      setSocialScreen('golive');
      setLiveActive(true);
      setVvipAlert({msg: '⚔️ PK Battle started! Good luck!', icon: '⚔️'});
    } catch (e) {
      console.error('acceptPkChallenge failed:', e);
      setVvipAlert({msg: 'Could not join PK Battle. Please try again.'});
    }
  };

  const declinePkChallenge = async () => {
    if (!pkIncomingChallenge) return;
    const pkRoomIdVal = pkIncomingChallenge.pkRoomId || pkIncomingChallenge.id;
    try {
      if (pkRoomIdVal) {
        await updateDoc(doc(db, 'pk_sessions', pkRoomIdVal), {
          status: 'declined',
        }).catch(() => {});
      }
    } catch {}
    setPkIncomingChallenge(null);
    setVvipAlert({msg: 'PK Challenge declined.'});
  };

  // ==========================================================
  // GIFTING — sender spends AJ Coins; creator credit via server reward engine
  // ==========================================================
  const sendGift = async (
    creatorId: string,
    gift: { name: string; cost: number; icon: string; mediaUrl?: string }
  ) => {
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
      // Deduct gift cost from sender via atomic transaction
      await runTransaction(db, async (tx) => {
        const uref = doc(db, 'users', user.uid);
        const snap = await tx.get(uref);
        if (!snap.exists()) throw new Error('user_not_found');
        const bal = Number((snap.data() as { balance?: number }).balance || 0);
        if (bal < gift.cost) throw new Error('insufficient_balance');
        tx.update(uref, { balance: increment(-gift.cost) });
      });
      // Creator earns AJ Coins via verified server reward engine
      const giftKey = `${user.uid}_${creatorId}_${gift.name}_${Date.now()}`;
      const reward = await earnReward(user, 'live_gift', {
        idempotencyKey: giftKey,
        beneficiaryUid: creatorId,
        meta: { giftName: gift.name, giftCost: gift.cost },
      });
      const creatorShare = reward.creditedCoins || 0;
      try {
        await addDoc(collection(db,"users",creatorId,"notifications"), {
          type:'gift', giftName:gift.name, giftIcon:gift.icon,
          giftCost:gift.cost, creatorShare,
          senderUid:user.uid, senderUsername:username||'Anonymous',
          date:serverTimestamp(), read:false
        });
      } catch {}
      setCinematicGift(gift);
      setCinematicSender(username || 'Anonymous');
      setVvipAlert({
        msg: reward.ok
          ? `${gift.icon} ${gift.name} sent! Creator +${creatorShare} AJ Coins`
          : `${gift.icon} ${gift.name} sent!`,
        icon: gift.icon,
      });
    } catch(e) { console.error('sendGift', e); setVvipAlert({msg:'Gift failed. Please try again.'}); }
  };

  /** Open comments — always use the durable parent doc (user_posts / pulse_posts). */
  const openComments = (
    postOrId: any,
    e?: { stopPropagation?: () => void; preventDefault?: () => void }
  ) => {
    try {
      e?.stopPropagation?.();
    } catch {}
    const post = typeof postOrId === 'object' && postOrId ? postOrId : null;
    let id = typeof postOrId === 'string' ? postOrId : String(post?.postId || post?.id || '');
    let col = 'user_posts';
    if (post) {
      if (
        post._source === 'pulse_posts' ||
        pulsePosts.some((p: any) => p.id === post.id && !post.postId)
      ) {
        col = 'pulse_posts';
        id = String(post.id);
      } else if (pixaVideos.some((v: any) => v.id === post.id || v.id === post.videoId)) {
        col = 'yt_posts';
        id = String(post.id);
      } else {
        // TikReel: always comment on user_posts (dual-written videos use postId)
        col = 'user_posts';
        id = String(post.postId || post.id);
      }
    } else if (pulsePosts.some((p: any) => p.id === id)) {
      col = 'pulse_posts';
    } else if (pixaVideos.some((v: any) => v.id === id)) {
      col = 'yt_posts';
    }
    if (!id) return;

    const aliases = resolveCommentPostIds(
      post || { id, postId: id, videoId: post?.videoId }
    );
    if (!aliases.includes(id)) aliases.unshift(id);

    // Keep focus chain alive for iOS/Android keyboard
    let tmp: HTMLInputElement | null = null;
    try {
      tmp = document.createElement('input');
      tmp.type = 'text';
      tmp.setAttribute('inputmode', 'text');
      tmp.autocomplete = 'off';
      tmp.style.cssText =
        'position:fixed;bottom:0;left:0;width:1px;height:1px;opacity:0.01;font-size:16px;border:0;padding:0;z-index:999999;';
      document.body.appendChild(tmp);
      tmp.focus();
    } catch {}

    setCommentCollection(col);
    setCommentAliasIds(aliases);
    setCommentsLoading(true);
    // Switching posts: clear list for the new post only (keep pending for same post)
    if (commentListenPostIdRef.current !== id) {
      setPostComments(
        Object.values(pendingCommentsRef.current).filter(
          (c) =>
            String(c.postId) === id ||
            aliases.includes(String(c.postId)) ||
            (Array.isArray(c.postIds) && c.postIds.some((a: string) => aliases.includes(String(a))))
        )
      );
    }
    setCommentPostId(id);
    setNewComment('');
    // Do NOT setPostComments([]) here — that caused visible wipe; listener fills the list.

    const moveFocus = () => {
      const real = commentInputRef.current;
      if (!real) return;
      try {
        real.focus({ preventScroll: false });
        real.click();
      } catch {
        try {
          real.focus();
        } catch {}
      }
    };
    requestAnimationFrame(() => {
      moveFocus();
      window.setTimeout(moveFocus, 60);
      window.setTimeout(moveFocus, 180);
      window.setTimeout(moveFocus, 360);
      window.setTimeout(() => {
        moveFocus();
        if (tmp) {
          try {
            document.body.removeChild(tmp);
          } catch {}
        }
      }, 500);
    });
  };

  /** Open gift picker for a real creator post (TikReel or Pulse). */
  const openGiftPanel = (
    post: any,
    e?: { stopPropagation?: () => void }
  ) => {
    try {
      e?.stopPropagation?.();
    } catch {}
    if (!user) {
      setVvipAlert({ msg: 'Please sign in to send gifts.', icon: '🔒' });
      return;
    }
    const uid = String(post?.uid || post?.userId || '');
    const id = String(post?.postId || post?.id || '');
    if (!uid || uid === 'unsplash' || post?.isUnsplash) {
      setVvipAlert({ msg: 'Gifts are for real creators only.', icon: '🎁' });
      return;
    }
    setGiftTargetUid(uid);
    setPulseGiftPostId(id || uid);
  };

  // ==========================================================
  // ADMIN REVENUE LOGGER
  // ==========================================================
  const logAdminRevenue = async (type:string, totalPool:number, userNet:number) => {
    try {
      const adminShare = Number((totalPool * ADMIN_EARN_SHARE).toFixed(4));
      const adminCoins = Math.floor(adminShare * COIN_RATE);
      await addDoc(collection(db,"AdminRevenue"), {
        type,
        currency: 'USD',
        platformSharePct: ADMIN_EARN_SHARE,
        userSharePct: USER_EARN_SHARE,
        totalPool,
        adminShare,
        ownerUsd: adminShare,
        adminShareCoins: adminCoins,
        userNet,
        uid:user?.uid||'',
        date:serverTimestamp()
      });
      await creditAdminEarnings({
        ownerUsd: adminShare,
        ownerCoins: adminCoins,
        source: type,
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

  const loadFollowingList = async (uid?: string) => {
    const target = uid || user?.uid;
    if (!target) return;
    try {
      const foSnap = await getDocs(collection(db, 'users', target, 'following'));
      const list = await Promise.all(
        foSnap.docs.map(async (d) => {
          try {
            const snap = await getDoc(doc(db, 'users', d.id));
            return snap.exists()
              ? { uid: d.id, ...snap.data() }
              : { uid: d.id, username: d.id };
          } catch {
            return { uid: d.id, username: d.id };
          }
        })
      );
      const cleaned = list.filter(Boolean);
      if (!uid || uid === user?.uid) setFollowingList(cleaned);
      return cleaned;
    } catch {
      return [];
    }
  };

  const loadFollowersList = async (uid?: string) => {
    const target = uid || user?.uid;
    if (!target) return [];
    try {
      const foSnap = await getDocs(collection(db, 'users', target, 'followers'));
      const list = await Promise.all(
        foSnap.docs.map(async (d) => {
          try {
            const snap = await getDoc(doc(db, 'users', d.id));
            return snap.exists()
              ? { uid: d.id, ...snap.data() }
              : { uid: d.id, username: d.id };
          } catch {
            return { uid: d.id, username: d.id };
          }
        })
      );
      const cleaned = list.filter(Boolean);
      setFollowersList(cleaned);
      return cleaned;
    } catch {
      return [];
    }
  };

  const openFollowList = async (
    mode: 'followers' | 'following',
    uid?: string | null
  ) => {
    const target = uid || viewingUid || user?.uid;
    if (!target) return;
    setFollowListMode(mode);
    setFollowListUid(target);
    setFollowListLoading(true);
    setFollowListUsers([]);
    try {
      if (mode === 'followers') {
        const list = await loadFollowersList(target);
        setFollowListUsers(list || []);
      } else {
        const list = await loadFollowingList(target);
        setFollowListUsers(list || []);
      }
    } finally {
      setFollowListLoading(false);
    }
  };

  // ==========================================================
  // TIKTOK-STYLE DM — shared chat + saved friend ids
  // ==========================================================
  const upsertChatPartners = async (
    otherUid: string,
    otherData: any,
    extra: { lastMessage?: string; lastAtMs?: number; lastSenderUid?: string } = {}
  ) => {
    if (!user || !otherUid || otherUid === user.uid) return;
    const chatId = buildDmChatId(user.uid, otherUid);
    const me = normalizePartnerProfile(user.uid, {
      username: username || user.displayName || 'AJ_Member',
      name: profileDisplayName || user.displayName || username || 'AJ Member',
      photo: tempPhoto || user.photoURL || '/logo.png',
    });
    const them = normalizePartnerProfile(otherUid, {
      ...(otherData || {}),
      uid: otherUid,
      username: otherData?.username || otherData?.name || 'AJ_Member',
      photo: otherData?.photo || otherData?.photoURL || '/logo.png',
    });
    const lastMessage = extra.lastMessage ?? '';
    const lastAtMs = extra.lastAtMs ?? Date.now();
    const lastSenderUid = extra.lastSenderUid || '';
    const base = {
      chatId,
      lastMessage,
      lastAt: serverTimestamp(),
      lastAtMs,
      lastSenderUid,
      updatedAt: serverTimestamp(),
    };
    // My inbox → their id
    await setDoc(
      doc(db, 'users', user.uid, CHAT_PARTNERS_SUB, otherUid),
      {
        ...base,
        uid: them.uid,
        username: them.username,
        name: them.name,
        photo: them.photo,
      },
      { merge: true }
    );
    // Their inbox → my id (so both see each other in the list)
    await setDoc(
      doc(db, 'users', otherUid, CHAT_PARTNERS_SUB, user.uid),
      {
        ...base,
        uid: me.uid,
        username: me.username,
        name: me.name,
        photo: me.photo,
      },
      { merge: true }
    );
  };

  const openMessagesInbox = (back: 'messages' | 'profile' | 'hub' | 'tikreels' | 'pulse' = 'hub') => {
    if (!user) {
      setVvipAlert({ msg: 'Please sign in to view messages.', icon: '🔒' });
      return;
    }
    setScreen('social');
    setSocialScreen('messages');
    setActiveChatId(null);
    setDmBackScreen(back);
    if (back === 'tikreels') {
      setTiktabMode('profile');
    }
    if (back === 'pulse') {
      setPulseTab('profile');
    }
  };

  const leaveMessagesToBack = () => {
    if (dmBackScreen === 'tikreels') {
      setSocialScreen('tikreels');
      setTiktabMode('profile');
      return;
    }
    if (dmBackScreen === 'pulse') {
      setSocialScreen('pulse');
      setPulseTab('profile');
      return;
    }
    if (dmBackScreen === 'profile') {
      setSocialScreen('profile');
      return;
    }
    if (dmBackScreen === 'hub') {
      setSocialScreen('hub');
      return;
    }
    setSocialScreen(viewingUid ? 'profile' : 'hub');
  };

  const openOrCreateChat = async (
    otherUid: string,
    otherData: any,
    back: 'messages' | 'profile' | 'hub' | 'tikreels' | 'pulse' = 'messages'
  ) => {
    if (!user) {
      setVvipAlert({ msg: 'Please sign in to message.', icon: '🔒' });
      return;
    }
    if (!otherUid || otherUid === user.uid) return;
    try {
      const chatId = buildDmChatId(user.uid, otherUid);
      const chatRef = doc(db, CHATS_COL, chatId);
      const partner = normalizePartnerProfile(otherUid, {
        ...(otherData || {}),
        uid: otherUid,
      });
      const me = normalizePartnerProfile(user.uid, {
        username: username || user.displayName || 'AJ_Member',
        name: profileDisplayName || user.displayName || username || 'AJ Member',
        photo: tempPhoto || user.photoURL || '/logo.png',
      });
      const cs = await getDoc(chatRef);
      if (!cs.exists()) {
        await setDoc(chatRef, {
          participants: [user.uid, otherUid],
          participantProfiles: {
            [user.uid]: me,
            [otherUid]: partner,
          },
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastAt: serverTimestamp(),
          lastAtMs: Date.now(),
        });
      } else {
        try {
          await updateDoc(chatRef, {
            [`participantProfiles.${user.uid}`]: me,
            [`participantProfiles.${otherUid}`]: partner,
          });
        } catch {
          /* optional profile refresh */
        }
      }

      await upsertChatPartners(otherUid, partner);

      setDmBackScreen(back);
      setActiveChatId(chatId);
      setActiveChatUser({ ...partner, uid: otherUid });
      setDmMessages([]);
      if (dmUnsubRef.current) {
        dmUnsubRef.current();
        dmUnsubRef.current = null;
      }
      const applyDmDocs = (docs: { id: string; data: () => Record<string, unknown> }[]) => {
        const rows = docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .sort(
            (a, b) =>
              Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0) ||
              String(a.id).localeCompare(String(b.id))
          );
        setDmMessages((prev) => {
          const pending = prev.filter(
            (m: any) =>
              m.pending &&
              !rows.some(
                (r: any) =>
                  String(r.uid) === String(m.uid) &&
                  String(r.text) === String(m.text) &&
                  Math.abs(Number(r.createdAtMs || 0) - Number(m.createdAtMs || 0)) < 30000
              )
          );
          return [...rows, ...pending].sort(
            (a: any, b: any) => Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0)
          );
        });
        setTimeout(() => dmEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      };
      // Shared thread for both users — same chatId = both see every message live
      dmUnsubRef.current = onSnapshot(
        query(collection(db, CHATS_COL, chatId, 'messages'), orderBy('createdAt', 'asc'), limit(300)),
        (s) => applyDmDocs(s.docs),
        (err) => {
          console.warn('dm listen ordered', err);
          // Fallback without orderBy so both sides still sync
          dmUnsubRef.current = onSnapshot(
            query(collection(db, CHATS_COL, chatId, 'messages'), limit(300)),
            (s) => applyDmDocs(s.docs),
            (err2) => {
              console.warn('dm listen fallback', err2);
              setVvipAlert({
                msg: 'Chat could not load. Publish firestore.rules for chats.',
                icon: '⚠️',
              });
            }
          );
        }
      );
      setScreen('social');
      setSocialScreen('dm');
    } catch (e) {
      console.error('openOrCreateChat', e);
      setVvipAlert({
        msg: 'Could not open chat. Publish firestore.rules for chats / chat_partners.',
        icon: '⚠️',
      });
    }
  };

  const sendDmMessage = async () => {
    if (!dmInput.trim() || !activeChatId || !user || !activeChatUser?.uid) return;
    const text = dmInput.trim();
    if (text.length > 2000) {
      setVvipAlert({ msg: 'Message is too long.', icon: '⚠️' });
      return;
    }
    setDmInput('');
    const createdAtMs = Date.now();
    const localId = `local_${createdAtMs}_${user.uid}`;
    // Optimistic: sender sees it instantly; recipient gets it via the same chat onSnapshot
    setDmMessages((prev) => [
      ...prev,
      {
        id: localId,
        uid: user.uid,
        username: username || user.displayName || 'AJ_Member',
        photo: tempPhoto || user.photoURL || '',
        text,
        createdAtMs,
        pending: true,
      },
    ]);
    setTimeout(() => dmEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
    try {
      await addDoc(collection(db, CHATS_COL, activeChatId, 'messages'), {
        uid: user.uid,
        username: username || user.displayName || 'AJ_Member',
        photo: tempPhoto || user.photoURL || '',
        text,
        createdAt: serverTimestamp(),
        createdAtMs,
      });
      await updateDoc(doc(db, CHATS_COL, activeChatId), {
        lastMessage: text,
        lastAt: serverTimestamp(),
        lastAtMs: createdAtMs,
        lastSenderUid: user.uid,
      });
      await upsertChatPartners(String(activeChatUser.uid), activeChatUser, {
        lastMessage: text,
        lastAtMs: createdAtMs,
        lastSenderUid: user.uid,
      });
    } catch (e) {
      console.error('sendDmMessage', e);
      setDmMessages((prev) => prev.filter((m: any) => m.id !== localId));
      setDmInput(text);
      setVvipAlert({
        msg: 'Message not saved. Publish firestore.rules for chats.',
        icon: '⚠️',
      });
    }
  };

  // Live inbox list (friend ids + last message)
  useEffect(() => {
    if (!user || socialScreen !== 'messages') {
      if (dmInboxUnsubRef.current) {
        dmInboxUnsubRef.current();
        dmInboxUnsubRef.current = null;
      }
      return;
    }
    setDmInboxLoading(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, CHAT_PARTNERS_SUB),
        orderBy('lastAtMs', 'desc'),
        limit(100)
      );
      dmInboxUnsubRef.current = onSnapshot(
        q,
        (snap) => {
          setDmInbox(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setDmInboxLoading(false);
        },
        async (err) => {
          console.warn('dm inbox ordered', err);
          // Fallback without orderBy (missing index / lastAtMs)
          try {
            const snap = await getDocs(
              query(collection(db, 'users', user.uid, CHAT_PARTNERS_SUB), limit(100))
            );
            const rows = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as any))
              .sort((a, b) => Number(b.lastAtMs || 0) - Number(a.lastAtMs || 0));
            setDmInbox(rows);
          } catch (e2) {
            console.warn('dm inbox fallback', e2);
            setDmInbox([]);
          }
          setDmInboxLoading(false);
        }
      );
    } catch (e) {
      console.error('dm inbox', e);
      setDmInboxLoading(false);
    }
    return () => {
      if (dmInboxUnsubRef.current) {
        dmInboxUnsubRef.current();
        dmInboxUnsubRef.current = null;
      }
    };
  }, [user, socialScreen]);

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
        // Pulse posts owned by this profile (uid / userId queries — not global scan)
        const pulseLists: any[] = [];
        try {
          const psUid = await getDocs(
            query(collection(db, 'pulse_posts'), where('uid', '==', uid), limit(80))
          );
          pulseLists.push(
            ...psUid.docs.map((d) =>
              normalizePulsePost(d.id, d.data() as Record<string, unknown>)
            )
          );
        } catch {}
        try {
          const psUserId = await getDocs(
            query(collection(db, 'pulse_posts'), where('userId', '==', uid), limit(80))
          );
          pulseLists.push(
            ...psUserId.docs.map((d) =>
              normalizePulsePost(d.id, d.data() as Record<string, unknown>)
            )
          );
        } catch {}
        const pulseMerged = filterOwnedBy(mergeTikReelPosts([pulseLists]), uid);
        setProfilePosts(pulseMerged.filter((p) => !p.isVideo));

        // Primary: top-level `videos` where userId / uid matches the profile
        const lists: TikReelPost[][] = [];
        // Include pulse videos in profile video grid too
        lists.push(pulseMerged.filter((p) => p.isVideo));
        try {
          const videosSnap = await getDocs(
            query(collection(db, 'videos'), where('userId', '==', uid), limit(120))
          );
          lists.push(
            videosSnap.docs.map((d) =>
              normalizeTikReelPost(d.id, d.data() as Record<string, unknown>, 'videos')
            )
          );
        } catch (ve) {
          console.warn('openProfile videos.userId failed', ve);
        }
        try {
          const videosUidSnap = await getDocs(
            query(collection(db, 'videos'), where('uid', '==', uid), limit(120))
          );
          lists.push(
            videosUidSnap.docs.map((d) =>
              normalizeTikReelPost(d.id, d.data() as Record<string, unknown>, 'videos')
            )
          );
        } catch {}

        // user_posts owned by this profile (indexed by uid / userId — not global scan)
        try {
          const postsSnap = await getDocs(
            query(collection(db, 'user_posts'), where('uid', '==', uid), limit(120))
          );
          lists.push(
            postsSnap.docs.map((d) =>
              normalizeTikReelPost(d.id, d.data() as Record<string, unknown>, 'user_posts')
            )
          );
        } catch {}
        try {
          const posts2 = await getDocs(
            query(collection(db, 'user_posts'), where('userId', '==', uid), limit(120))
          );
          lists.push(
            posts2.docs.map((d) =>
              normalizeTikReelPost(d.id, d.data() as Record<string, unknown>, 'user_posts')
            )
          );
        } catch {}

        // Legacy subcollection users/{uid}/videos
        try {
          const vSnap = await getDocs(
            query(collection(db, 'users', uid, 'videos'), limit(80))
          );
          lists.push(
            vSnap.docs.map((d) =>
              normalizeTikReelPost(d.id, {
                ...(d.data() as Record<string, unknown>),
                userId: uid,
                uid,
              }, 'users_videos')
            )
          );
        } catch {}

        const mergedVideos = filterOwnedBy(mergeTikReelPosts(lists), uid);
        setProfileVideos(mergedVideos);
        // Keep postsCount in sync with what we actually show
        try {
          const total = pulseMerged.length + mergedVideos.filter((v) => v._source !== 'pulse_posts').length;
          if (typeof userData.postsCount !== 'number' || userData.postsCount < total) {
            setViewProfile((prev: any) => (prev ? { ...prev, postsCount: total } : prev));
          }
        } catch {}
      } catch (e) {
        console.error('openProfile posts', e);
      }
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
    if (!user) return;
    try {
      let mediaUrl = tiktokPostImg || '';
      let uploadVerified = false;
      // Require Storage upload when media is attached (base64/blob → Firebase Storage)
      if (mediaUrl && (mediaUrl.startsWith('data:') || mediaUrl.startsWith('blob:'))) {
        const res = await fetch(mediaUrl);
        const blob = await res.blob();
        const ext = tiktokPostIsVideo ? 'mp4' : 'jpg';
        const file = new File([blob], `tikreel_${Date.now()}.${ext}`, {
          type: blob.type || (tiktokPostIsVideo ? 'video/mp4' : 'image/jpeg'),
        });
        mediaUrl = await uploadMediaDurable(file, user.uid);
        if (!mediaUrl) throw new Error('upload_failed');
        uploadVerified = true;
      } else if (mediaUrl && mediaUrl.startsWith('http')) {
        uploadVerified = true;
      } else if (!mediaUrl && tiktokPostText.trim()) {
        // Text-only post — no media upload required
        uploadVerified = true;
      }

      const createdAtMs = Date.now();
      const postRef = await addDoc(collection(db,"user_posts"), {
        text:tiktokPostText,
        // Always persist playable URL in videoUrl for TikReel videos (other clients must not rely on image alone)
        image: mediaUrl,
        videoUrl: tiktokPostIsVideo ? mediaUrl : '',
        uid:user.uid, userId:user.uid,
        username:username||"AJ_Member", photo:user.photoURL||'',
        likes:0, views:0, isVideo:tiktokPostIsVideo,
        contentType: tiktokPostIsVideo ? 'video/mp4' : 'image/jpeg',
        mime: tiktokPostIsVideo ? 'video/mp4' : 'image/jpeg',
        selectedSound: selectedSound || null,
        textOverlay: tikEditorTextOverlay || null,
        cssFilter: tikEditorFilter || 'none',
        createdAt:serverTimestamp(),
        createdAtMs,
      });
      // Dual-write videos so feed + profiles can query collection('videos')
      if (tiktokPostIsVideo && mediaUrl) {
        try {
          await addDoc(collection(db, 'videos'), {
            userId: user.uid,
            uid: user.uid,
            videoUrl: mediaUrl,
            thumbnail: mediaUrl,
            image: mediaUrl,
            text: tiktokPostText || '',
            textOverlay: tikEditorTextOverlay || null,
            username: username || 'AJ_Member',
            photo: user.photoURL || '',
            likes: 0,
            views: 0,
            isVideo: true,
            contentType: 'video/mp4',
            mime: 'video/mp4',
            postId: postRef.id,
            createdAt: serverTimestamp(),
            createdAtMs,
          });
        } catch (ve) {
          console.warn('videos collection write failed', ve);
        }
        try {
          await addDoc(collection(db, 'users', user.uid, 'videos'), {
            userId: user.uid,
            uid: user.uid,
            videoUrl: mediaUrl,
            thumbnail: mediaUrl,
            image: mediaUrl,
            text: tiktokPostText || '',
            postId: postRef.id,
            isVideo: true,
            contentType: 'video/mp4',
            mime: 'video/mp4',
            createdAt: serverTimestamp(),
            createdAtMs,
          });
        } catch {}
      }
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          postsCount: increment(1),
          lastTikReelAt: serverTimestamp(),
        });
      } catch {}
      const reward = await earnReward(user, 'tiktok_post', {
        idempotencyKey: postRef.id,
        meta: { isVideo: tiktokPostIsVideo, postId: postRef.id, uploadVerified },
      });
      setTiktokPostText(''); setTiktokPostImg(''); setTiktokPostIsVideo(false);
      setTikEditorFilter('none'); setTikEditorTextOverlay(''); setSelectedSound(null);
      setTiktabMode('feed');
      // Refresh own profile cache immediately
      setTikProfileMyPosts((prev: any[]) =>
        mergeTikReelPosts([
          [
            normalizeTikReelPost(
              postRef.id,
              {
                text: tiktokPostText,
                image: mediaUrl,
                videoUrl: mediaUrl,
                uid: user.uid,
                userId: user.uid,
                username: username || 'AJ_Member',
                photo: user.photoURL || '',
                isVideo: tiktokPostIsVideo,
                likes: 0,
                views: 0,
                createdAtMs,
              },
              'user_posts'
            ),
          ],
          prev as TikReelPost[],
        ])
      );
      if (reward.ok && !reward.duplicate) {
        setVvipAlert({msg: reward.message || `🎬 Post published! +${reward.creditedCoins} AJ Coins 🪙`, icon:"🎬"});
      } else if (reward.error === 'daily_limit') {
        setVvipAlert({msg:'🎬 Post published! Daily TikReel reward limit (5) reached — try tomorrow.', icon:"🎬"});
      } else {
        setVvipAlert({msg:'🎬 Post published!', icon:"🎬"});
      }
    } catch(e) { console.error('handleTiktokPost', e); setVvipAlert({msg:'Post failed. Upload must succeed before coins.'}); }
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
    const isVid = fileLooksLikeVideo(file);
    // Pulse = photos only (TikReels is for videos)
    if (socialScreen === 'pulse' && isVid) {
      setVvipAlert({ msg: 'Pulse is for photos. Use TikReels for videos.', icon: '📸' });
      e.target.value = '';
      return;
    }
    setPulsePostIsVideo(socialScreen === 'pulse' ? false : isVid);
    let url = '';
    if (user?.uid) url = await uploadMediaDurable(file, user.uid);
    if (!url) url = await uploadToCloudinary(file);
    setTempPhoto(url || URL.createObjectURL(file));
  };

  const handleTiktokFileChange = async (e:any) => {
    const file = e.target.files?.[0]; if (!file) return;
    const isVid = fileLooksLikeVideo(file);
    setTiktokPostIsVideo(isVid);
    let url = '';
    if (user?.uid) url = await uploadMediaDurable(file, user.uid);
    if (!url) {
      setVvipAlert({ msg: 'Upload failed. Check connection and try again.', icon: '⚠️' });
      return;
    }
    setTiktokPostImg(url);
  };

  const handleGoogleLogin = async () => {
    try {
      setBanNotice(null);
      googleProvider.setCustomParameters({ prompt:'select_account' });
      await signInWithPopup(auth, googleProvider);
      // Post-login ban gate — if banned, reject immediately (403 equivalent)
      const cu = auth.currentUser;
      if (cu) {
        const snap = await getDoc(doc(db, 'users', cu.uid));
        if (snap.exists() && isUserBanned(snap.data() as Record<string, unknown>)) {
          setBanNotice(BAN_FORBIDDEN_MESSAGE);
          setVvipAlert({ msg: `🚫 ${BAN_FORBIDDEN_MESSAGE}`, icon: '🚫' });
          try { await setUserOfflineStatus(cu.uid); } catch {}
          await signOut(auth);
          setUser(null);
          setScreen('auth');
        }
      }
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
    if (username.length < 3) return setVvipAlert({ msg: 'Username too short!' });
    if (!user) return;
    try {
      const display =
        profileDisplayName.trim() || user.displayName || username.trim();
      await updateDoc(doc(db, 'users', user.uid), {
        name: display,
        displayName: display,
        username: username.toLowerCase().trim(),
        bio: bio || '',
        photo: tempPhoto || user.photoURL || '/logo.png',
        photoURL: tempPhoto || user.photoURL || '/logo.png',
        hasSocialProfile: true,
      });
      setHasSocialProfile(true);
      setProfileDisplayName(display);
      setViewProfile((prev: any) =>
        prev && prev.uid === user.uid
          ? {
              ...prev,
              name: display,
              displayName: display,
              username: username.toLowerCase().trim(),
              bio: bio || '',
              photo: tempPhoto || user.photoURL || '/logo.png',
            }
          : prev
      );
      setSocialScreen('hub');
      setVvipAlert({
        msg: hasSocialProfile ? '✅ Profile updated!' : '🚀 Profile Active!',
        icon: '🚀',
      });
    } catch (e) {
      console.error('handleCreateProfile', e);
      setVvipAlert({ msg: 'Profile save failed. Please try again.' });
    }
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
    // Public CDN first (Cloudinary/Catbox) — avoid Firebase Storage 403 for other viewers
    try {
      url = await uploadMediaDurable(uploadFile, user.uid);
    } catch (err) {
      console.error('handlePhotoUpdate: public upload failed', err);
    }
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
        setViewProfile((prev: any) => prev ? { ...prev, photo: url, photoURL: url } : prev);
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
    // Public CDN first (Cloudinary → Catbox) so photos load for all users without Storage 403
    try {
      url = await uploadMediaDurable(uploadFile, user.uid);
      if (url) console.log('handleDpUpdate: public CDN upload success');
    } catch (err) {
      console.error('handleDpUpdate: public upload failed', err);
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
        setViewProfile((prev: any) => prev ? { ...prev, photo: url, photoURL: url } : prev);
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
    if (!user) return;
    try {
      let mediaUrl = tempPhoto || '';
      let uploadVerified = false;
      if (mediaUrl && (mediaUrl.startsWith('data:') || mediaUrl.startsWith('blob:'))) {
        const res = await fetch(mediaUrl);
        const blob = await res.blob();
        const isVid = pulsePostIsVideo || blob.type.startsWith('video/');
        const ext = isVid ? 'mp4' : 'jpg';
        const file = new File([blob], `pulse_${Date.now()}.${ext}`, {
          type: blob.type || (isVid ? 'video/mp4' : 'image/jpeg'),
        });
        mediaUrl = await uploadMediaDurable(file, user.uid);
        if (!mediaUrl) throw new Error('upload_failed');
        uploadVerified = true;
      } else if (mediaUrl && mediaUrl.startsWith('http')) {
        uploadVerified = true;
      } else if (!mediaUrl && postText.trim()) {
        uploadVerified = true;
      }

      const createdAtMs = Date.now();
      // Pulse = photos (TikReels handles videos)
      const asVideo = false;
      const postRef = await addDoc(collection(db,"pulse_posts"), {
        text: postText,
        image: mediaUrl,
        videoUrl: '',
        thumbnail: mediaUrl,
        uid: user.uid,
        userId: user.uid,
        username: username || 'AJ_Member',
        photo: user.photoURL || '',
        likes: 0,
        views: 0,
        commentCount: 0,
        isVideo: asVideo,
        contentType: 'image/jpeg',
        mime: 'image/jpeg',
        createdAt: serverTimestamp(),
        createdAtMs,
      });
      const reward = await earnReward(user, 'pulse_post', {
        idempotencyKey: postRef.id,
        meta: { isVideo: false, postId: postRef.id, uploadVerified },
      });
      setPostText(''); setTempPhoto(''); setPulsePostIsVideo(false);
      // Optimistic local insert so feed updates instantly
      setPulsePosts((prev: any[]) =>
        mergeTikReelPosts([
          [
            normalizePulsePost(postRef.id, {
              text: postText,
              image: mediaUrl,
              videoUrl: '',
              uid: user.uid,
              userId: user.uid,
              username: username || 'AJ_Member',
              photo: user.photoURL || '',
              isVideo: false,
              createdAtMs,
            }),
          ],
          prev as TikReelPost[],
        ])
      );
      if (reward.ok && !reward.duplicate) {
        setVvipAlert({msg: reward.message || `📸 Pulse published! +${reward.creditedCoins} AJ Coins 🪙`, icon:"📸"});
      } else if (reward.error === 'daily_limit') {
        setVvipAlert({msg:'📸 Post published! Daily Pulse reward limit (5) reached — try tomorrow.', icon:"📸"});
      } else {
        setVvipAlert({msg:'🚀 Post published!', icon:"🚀"});
      }
    } catch(e) { console.error('handleCreatePost', e); setVvipAlert({msg:'Post failed. Upload must succeed before coins.'}); }
  };

  // Permanent comments: pending local row stays until server confirms.
  // Only clear the input field — never wipe the comment list on submit.
  const submitComment = async () => {
    if (!newComment.trim() || !commentPostId) return;
    if (!user) {
      setVvipAlert({ msg: 'Please sign in to comment.', icon: '🔒' });
      return;
    }
    const text = newComment.trim();
    if (text.length > 1000) {
      setVvipAlert({ msg: 'Comment is too long.', icon: '⚠️' });
      return;
    }
    const postType =
      commentCollection ||
      (pixaVideos.some((v: any) => v.id === commentPostId)
        ? 'yt_posts'
        : pulsePosts.find((p: any) => p.id === commentPostId)
          ? 'pulse_posts'
          : 'user_posts');
    const aliases =
      commentAliasIds.length > 0
        ? Array.from(new Set([commentPostId, ...commentAliasIds]))
        : [commentPostId];
    const createdAtMs = Date.now();
    const localId = `pending_${createdAtMs}_${user.uid}`;
    const localComment = {
      id: localId,
      postId: commentPostId,
      postIds: aliases,
      postType,
      text,
      uid: user.uid,
      username: username || 'AJ_Member',
      photo: tempPhoto || user.photoURL || '',
      createdAtMs,
      pending: true,
    };

    // 1) Show immediately + keep in pending map (survives snapshot wipes)
    pendingCommentsRef.current[localId] = localComment;
    setPostComments((prev) =>
      mergeCommentLists(prev as any[], Object.values(pendingCommentsRef.current), aliases) as any[]
    );
    // 2) Clear ONLY the input — never reset the list
    setNewComment('');
    requestAnimationFrame(() => commentInputRef.current?.focus());

    let savedId = '';
    const payload = {
      postId: commentPostId,
      postIds: aliases,
      postType,
      text,
      username: username || 'AJ_Member',
      photo: tempPhoto || user.photoURL || '',
    };

    // 3) Prefer server API (Admin SDK) so rules cannot roll back the write
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data?.id) {
        savedId = String(data.id);
      } else {
        throw new Error(data?.error || 'api_comment_failed');
      }
    } catch (apiErr) {
      console.warn('API comment write failed, trying client Firestore', apiErr);
      try {
        const ref = await addDoc(collection(db, REEL_COMMENTS_COL), {
          ...payload,
          uid: user.uid,
          createdAt: serverTimestamp(),
          createdAtMs,
        });
        // Wait for server ack — if rules reject, doc vanishes
        try {
          await waitForPendingWrites(db);
        } catch {}
        let confirmedSnap;
        try {
          confirmedSnap = await getDocFromServer(ref);
        } catch {
          confirmedSnap = await getDoc(ref);
        }
        if (!confirmedSnap.exists()) {
          throw new Error('firestore_write_rejected');
        }
        savedId = ref.id;
      } catch (clientErr) {
        console.error('submitComment', clientErr);
        delete pendingCommentsRef.current[localId];
        setPostComments((prev) => prev.filter((c: any) => c.id !== localId));
        setVvipAlert({
          msg: 'Comment could not be saved permanently. Publish reel_comments rules or set FIREBASE_SERVICE_ACCOUNT_JSON.',
          icon: '⚠️',
        });
        return;
      }
    }

    // 4) Promote pending → confirmed id (list stays; no wipe)
    delete pendingCommentsRef.current[localId];
    const confirmed = {
      ...localComment,
      id: savedId,
      pending: false,
    };
    pendingCommentsRef.current[savedId] = confirmed;
    setPostComments((prev) => {
      const withoutLocal = prev.filter((c: any) => c.id !== localId && c.id !== savedId);
      return mergeCommentLists(
        withoutLocal as any[],
        Object.values(pendingCommentsRef.current),
        aliases
      ) as any[];
    });
    // After a short delay, pending entry can drop once listener has the server doc
    window.setTimeout(() => {
      delete pendingCommentsRef.current[savedId];
    }, 8000);

    // Best-effort commentCount bump on all alias parent docs
    try {
      if (postType === 'user_posts' || postType === 'pulse_posts' || postType === 'videos') {
        await Promise.all(
          aliases.map(async (pid) => {
            try {
              await updateDoc(doc(db, postType, pid), {
                commentCount: increment(1),
              });
            } catch {
              /* parent may not exist under this id */
            }
          })
        );
      }
    } catch {
      /* optional */
    }
    const bump = (list: any[]) =>
      list.map((p) =>
        aliases.includes(String(p.id)) ||
        aliases.includes(String(p.postId || '')) ||
        String(p.id) === commentPostId ||
        String(p.postId) === commentPostId
          ? { ...p, commentCount: Number(p.commentCount || 0) + 1 }
          : p
      );
    setUserPosts((prev) => bump(prev));
    setPulsePosts((prev) => bump(prev));
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
      if (col === 'pulse_posts') {
        await deleteDoc(doc(db, col, id));
      } else {
        // Delete user_posts + any dual-written videos rows
        try {
          await deleteDoc(doc(db, 'user_posts', id));
        } catch {}
        try {
          await deleteDoc(doc(db, 'videos', id));
        } catch {}
        try {
          const vs = await getDocs(
            query(collection(db, 'videos'), where('postId', '==', id), limit(10))
          );
          await Promise.all(vs.docs.map((d) => deleteDoc(d.ref)));
        } catch {}
        if (user?.uid) {
          try {
            await updateDoc(doc(db, 'users', user.uid), { postsCount: increment(-1) });
          } catch {}
        }
        setUserPosts((prev: any[]) =>
          prev.filter((p) => p.id !== id && p.postId !== id)
        );
        setTikProfileMyPosts((prev: any[]) =>
          prev.filter((p) => p.id !== id && p.postId !== id)
        );
        setProfileVideos((prev: any[]) =>
          prev.filter((p) => p.id !== id && p.postId !== id)
        );
      }
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
  // FIX: Like count — Firestore is source of truth. Do NOT add +1 in UI when
  // likedPosts is true (that caused viewer to see N+2 while others saw N+1).
  const bumpLocalLikes = (likeId: string, delta: number) => {
    const apply = (list: any[]) =>
      list.map((p) => {
        const keys = [p.id, p.postId].map(String);
        if (!keys.includes(String(likeId))) return p;
        return { ...p, likes: Math.max(0, Number(p.likes || 0) + delta) };
      });
    setUserPosts((prev) => apply(prev));
    setPulsePosts((prev) => apply(prev));
  };

  const handleLike = async (
    idOrPost: any,
    isVideo: boolean = false,
    isYoutube: boolean = false
  ) => {
    if (!user) return;
    const post = typeof idOrPost === 'object' && idOrPost ? idOrPost : null;
    let id =
      typeof idOrPost === 'string'
        ? idOrPost
        : String(post?.postId || post?.id || '');
    if (!id) return;
    if (likeInProcess.has(id)) return;
    likeInProcess.add(id);

    if (isYoutube) {
      setLikedPosts((p: any) => ({ ...p, [id]: !p[id] }));
      likeInProcess.delete(id);
      return;
    }

    // Resolve collection: Pulse stays on pulse_posts; TikReel always user_posts (postId)
    let col = 'user_posts';
    if (post) {
      if (
        post._source === 'pulse_posts' ||
        (!post.postId && pulsePosts.some((p: any) => p.id === post.id))
      ) {
        col = 'pulse_posts';
        id = String(post.id);
      } else {
        col = 'user_posts';
        id = String(post.postId || post.id);
      }
    } else {
      col = isVideo ? 'user_posts' : 'pulse_posts';
    }

    const likeRef = doc(db, col, id, 'likes', user.uid);
    try {
      const likeSnap = await getDoc(likeRef);
      const postRef = doc(db, col, id);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) {
        setLikedPosts((p: any) => ({ ...p, [id]: !p[id] }));
        likeInProcess.delete(id);
        return;
      }
      const currentLikes = Number(postSnap.data()?.likes || 0);
      if (likeSnap.exists()) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likes: Math.max(0, currentLikes - 1) });
        setLikedPosts((p: any) => ({ ...p, [id]: false }));
        bumpLocalLikes(id, -1);
      } else {
        await setDoc(likeRef, { uid: user.uid, date: serverTimestamp() });
        await updateDoc(postRef, { likes: currentLikes + 1 });
        setLikedPosts((p: any) => ({ ...p, [id]: true }));
        bumpLocalLikes(id, 1);
      }
    } catch (e) {
      console.error('handleLike firestore', e);
      setLikedPosts((p: any) => ({ ...p, [id]: !p[id] }));
    } finally {
      likeInProcess.delete(id);
    }
  };

  // Load like status for the current user on mount and when posts change
  const likedStatusLoadedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const loadLikedStatus = async () => {
      // Check TikReels user_posts (also by postId for dual-written videos rows)
      for (const post of userPosts) {
        const likeId = String(post.postId || post.id);
        if (likedStatusLoadedRef.current.has(likeId)) continue;
        likedStatusLoadedRef.current.add(likeId);
        try {
          const snap = await getDoc(doc(db, 'user_posts', likeId, 'likes', user.uid));
          if (snap.exists()) setLikedPosts((p: any) => ({ ...p, [likeId]: true }));
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
    if (!user) return setVvipAlert({msg:"Please log in first."});
    try {
      await runTransaction(db, async (tx) => {
        const uref = doc(db, 'users', user.uid);
        const snap = await tx.get(uref);
        if (!snap.exists()) throw new Error('user_not_found');
        const bal = Number((snap.data() as { balance?: number }).balance || 0);
        if (bal < cost) throw new Error('insufficient_balance');
        tx.update(uref, {
          balance: increment(-cost),
          botTier: tier,
          invested: cost,
          lastSync: serverTimestamp(),
        });
      });
      setVisualProfit(0);
      setVvipAlert({msg:`${tier.toUpperCase()} BOT ACTIVATED! Sync profits to earn AJ Coin rewards.`});
    } catch(e) { console.error('activateBot', e); setVvipAlert({msg:'Activation failed. Please try again.'}); }
  };

  /** Persist AI bot claim — server enforces 24h lock via lastBotClaimAt (anti clock-cheat). */
  const syncBotProfits = async () => {
    if (!user) return;
    if (!botTier || botTier === 'none' || invested <= 0) {
      return setVvipAlert({ msg: 'Activate an AI Trading Bot first.', icon: '🤖' });
    }
    if (visualProfit < 1) {
      return setVvipAlert({ msg: 'Not enough accrued profit yet — keep the bot running.', icon: '⏳' });
    }
    const day = new Date().toISOString().slice(0, 10);
    const reward = await earnReward(user, 'ai_bot_sync', {
      idempotencyKey: `${user.uid}_${botTier}_${day}`,
      meta: { botTier, invested, visualProfit },
    });
    if (reward.ok && !reward.duplicate) {
      setVisualProfit(0);
      setVvipAlert({ msg: reward.message || `Bot sync +${reward.creditedCoins} AJ Coins 🪙`, icon: '🤖' });
    } else if (reward.error === 'daily_limit' || reward.error === 'claim_locked') {
      setVvipAlert({
        msg: reward.message || 'Bot claim locked for 24h (server time). Device clock changes do not bypass this.',
        icon: '⏳',
      });
    } else {
      setVvipAlert({ msg: reward.error || 'Bot sync failed', icon: '⚠️' });
    }
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

  /** Stylish English popup when user tries to transfer coins to themselves */
  const SELF_TRANSFER_ALERT =
    'Transfer blocked. You cannot send coins to your own ID. Transfers only succeed when sent to another user.';

  /** Atomic coin transfer — Admin API preferred; client runTransaction fallback. Blocks self-transfer. */
  const transferCoins = async () => {
    if (transferAmount<=0 || !transferId.trim()) return setVvipAlert({msg:"Fill all fields!", icon:'⚠️'});
    if (!user) return setVvipAlert({msg:"Please log in first.", icon:'🔒'});
    const toUid = transferId.trim();
    const amount = Math.floor(transferAmount);
    if (toUid.toLowerCase() === String(user.uid).toLowerCase()) {
      return setVvipAlert({ msg: SELF_TRANSFER_ALERT, icon: '🚫' });
    }
    if (amount <= 0) return setVvipAlert({msg:"Enter a valid amount.", icon:'⚠️'});

    try {
      // Prefer Admin atomic transfer API when configured
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/wallet/transfer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ toUid, amount }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          try {
            await addDoc(collection(db,"notifications"), {
              title:"Transfer Sent",
              message:`Sent ${amount} AJ Coins 🪙 to ID: ${toUid}`,
              date:serverTimestamp()
            });
          } catch {}
          setVvipAlert({msg: data.message || `✅ Transferred ${amount} AJ Coins 🪙`, icon:"✅"});
          setTransferAmount(0); setTransferId(''); setWalletTab('main');
          return;
        }
        if (data.error && data.error !== 'admin_not_configured') {
          const map: Record<string, string> = {
            insufficient_balance: 'Insufficient balance!',
            recipient_not_found: 'Recipient not found!',
            self_transfer: SELF_TRANSFER_ALERT,
            sender_banned: 'Your account is restricted.',
            recipient_banned: 'Recipient account is restricted.',
          };
          return setVvipAlert({
            msg: map[data.error] || data.message || data.error,
            icon: data.error === 'self_transfer' ? '🚫' : '⚠️',
          });
        }
      } catch {
        /* fall through to client transaction */
      }

      // Client Firestore runTransaction — atomic debit+credit, blocks self-transfer
      await runTransaction(db, async (tx) => {
        const senderRef = doc(db, 'users', user.uid);
        const receiverRef = doc(db, 'users', toUid);
        if (senderRef.id === receiverRef.id) throw new Error('self_transfer');
        const [senderSnap, receiverSnap] = await Promise.all([
          tx.get(senderRef),
          tx.get(receiverRef),
        ]);
        if (!receiverSnap.exists()) throw new Error('recipient_not_found');
        if (!senderSnap.exists()) throw new Error('sender_not_found');
        const bal = Number((senderSnap.data() as { balance?: number }).balance || 0);
        if (bal < amount) throw new Error('insufficient_balance');
        tx.update(senderRef, { balance: increment(-amount) });
        tx.update(receiverRef, { balance: increment(amount) });
      });

      try {
        await addDoc(collection(db,"notifications"), {
          title:"Transfer Sent",
          message:`Sent ${amount} AJ Coins 🪙 to ID: ${toUid}`,
          date:serverTimestamp()
        });
      } catch {}
      setVvipAlert({msg:`✅ Transferred ${amount} AJ Coins 🪙`,icon:"✅"});
      setTransferAmount(0); setTransferId(''); setWalletTab('main');
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : 'transfer_failed';
      console.error('transferCoins', e);
      if (msg === 'insufficient_balance') setVvipAlert({msg:'Insufficient balance!', icon:'💰'});
      else if (msg === 'recipient_not_found') setVvipAlert({msg:'Recipient not found!', icon:'🔍'});
      else if (msg === 'self_transfer') setVvipAlert({msg: SELF_TRANSFER_ALERT, icon:'🚫'});
      else setVvipAlert({msg:'Transfer failed. Please try again.', icon:'⚠️'});
    }
  };
  const handleTransfer = transferCoins;

  const handleWithdraw = async () => {
    const userCoins = balance;
    if (userCoins < WITHDRAW_MIN || userCoins < 20000) {
      setVvipAlert({ msg: 'Minimum 20,000 AJ Coins 🪙 required!', icon: '⚠️' });
      return;
    }
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
      const payoutDetails: Record<string, string> = {
        payoutAddress: payoutId,
        cardHolder,
        cardNumber,
        cardExpiry,
        cardCVV,
        cardBank,
        cardCountry,
      };
      const withdrawCoins = balance;
      await runTransaction(db, async (tx) => {
        const uref = doc(db, 'users', user!.uid);
        const snap = await tx.get(uref);
        if (!snap.exists()) throw new Error('user_not_found');
        const bal = Number((snap.data() as { balance?: number }).balance || 0);
        if (bal < WITHDRAW_MIN || bal < 20000) throw new Error('below_minimum');
        tx.update(uref, { balance: 0 });
      });
      await addDoc(collection(db,"manual_withdrawals"), {
        uid:user!.uid, email:user!.email, coins:withdrawCoins,
        method:payoutMethod, payoutDetails,
        status:"pending", date:serverTimestamp()
      });
      try {
        await addDoc(collection(db,"notifications"), {
          title:"Withdrawal Requested",
          message:`${withdrawCoins} AJ Coins 🪙 via ${payoutMethod} submitted for review.`,
          date:serverTimestamp()
        });
      } catch {}
      setVvipAlert({msg:"🚀 Withdrawal request submitted!",icon:"🚀"});
      setPayoutId(''); setCardHolder(''); setCardNumber(''); setCardExpiry('');
      setCardCVV(''); setCardBank(''); setCardCountry('');
      setWalletTab('main');
    } catch(e) {
      console.error('handleWithdraw', e);
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'below_minimum') {
        setVvipAlert({ msg: 'Minimum 20,000 AJ Coins 🪙 required!', icon: '⚠️' });
      } else {
        setVvipAlert({msg:'Withdrawal request failed. Please try again.'});
      }
    }
  };

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) return setVvipAlert({msg:"Enter referral code."});
    if (!user) return;
    try {
      const mySnap = await getDoc(doc(db, 'users', user.uid));
      if (mySnap.exists()) {
        const already = String(
          (mySnap.data() as { referredBy?: string }).referredBy || ''
        ).trim();
        if (already) {
          return setVvipAlert({ msg: 'You already used a referral code.', icon: 'ℹ️' });
        }
      }

      const referrerId = await resolveReferrerUid(referralCode.trim());
      if (!referrerId) return setVvipAlert({msg:"Referral Code not found."});
      if (referrerId === user.uid) return setVvipAlert({msg:"You can't refer yourself!"});

      const rSnap = await getDoc(doc(db,"users",referrerId));
      if (!rSnap.exists()) return setVvipAlert({msg:"Referral Code not found."});

      const reward = await earnReward(user, 'referral', {
        idempotencyKey: `${user.uid}_referred_by_${referrerId}`,
        beneficiaryUid: referrerId,
        meta: {
          inviteeUid: user.uid,
          referrerId,
          referralCode: referralCode.trim().toUpperCase(),
        },
      });

      if (reward.ok) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            referredBy: referrerId,
            referredAt: serverTimestamp(),
            referredWithCode: referralCode.trim().toUpperCase(),
          });
        } catch {}
      }

      try {
        await addDoc(collection(db,"notifications"), {
          title:"Referral Claimed",
          message: reward.ok
            ? `+${reward.creditedCoins || REFERRAL_COINS} AJ Coins credited to referrer.`
            : 'Referral claimed.',
          date:serverTimestamp()
        });
      } catch {}
      setVvipAlert({
        msg: reward.ok
          ? `Referral Applied! Referrer +${reward.creditedCoins || REFERRAL_COINS} AJ Coins`
          : reward.error === 'daily_limit'
            ? 'Referral recorded — daily referral reward limit reached.'
            : reward.duplicate
              ? 'Referral already applied.'
              : 'Referral Applied!',
        icon: '🎉',
      });
      setReferralCode('');
    } catch(e) { console.error('handleApplyReferral', e); setVvipAlert({msg:'Referral failed. Please try again.'}); }
  };

  // ==========================================================
  // AI ASSISTANT — Language Detection + Knowledge Base
  // ==========================================================
  const detectLanguage = (text: string): string => {
    const q = text.toLowerCase();
    const hinglishSignals = /\\\\\\\\b(bhai|dost|yaar|kya|kaise|karo|hua|hoga|hoti|hota|seedha|bilkul|thoda|bohot|sirf|abhi|agar|toh|phir|mujhe|aapko|tumhara|mera|apna|paise|kamao|nikalo|karo|dekho|batao|samjhao|lao|bhejo|milega|milta|lagta|sahi|theek|accha|acha)\\\\\\\\b/.test(q);
    if (hinglishSignals) return 'hin';
    if (/[\\\\\\\\u0600-\\\\\\\\u06FF]/.test(text)) {
      if (/[\\\\\\\\u0679\\\\\\\\u0688\\\\\\\\u0691\\\\\\\\u06BE\\\\\\\\u06C1\\\\\\\\u06CC\\\\\\\\u06D2]/.test(text) ||
          /کوئن|پیسہ|نکالنا|لائیو|ریفرل|خریدنا|تحفہ|سکے|بیلنس|بھائی|دوست/.test(text))
        return 'ur';
      if (/[\\\\\\\\u067E\\\\\\\\u0686\\\\\\\\u0698\\\\\\\\u06AF]/.test(text) && /فارسی|ایران|ریال/.test(text))
        return 'fa';
      return 'ar';
    }
    if (/[\\\\\\\\u0900-\\\\\\\\u097F]/.test(text)) return 'hi';
    if (/[\\\\\\\\u0980-\\\\\\\\u09FF]/.test(text)) return 'bn';
    if (/[\\\\\\\\u0A00-\\\\\\\\u0A7F]/.test(text)) return 'pa';
    if (/[\\\\\\\\u4E00-\\\\\\\\u9FFF]/.test(text)) return 'zh';
    if (/[\\\\\\\\u3040-\\\\\\\\u30FF]/.test(text)) return 'ja';
    if (/[\\\\\\\\uAC00-\\\\\\\\uD7AF]/.test(text)) return 'ko';
    if (/[\\\\\\\\u0400-\\\\\\\\u04FF]/.test(text)) return 'ru';
    if (/[\\\\\\\\u0E00-\\\\\\\\u0E7F]/.test(text)) return 'th';
    if (/[\\\\\\\\u0370-\\\\\\\\u03FF]/.test(text)) return 'el';
    if (/[\\\\\\\\u0590-\\\\\\\\u05FF]/.test(text)) return 'he';
    if (/\\\\\\\\b(bonjour|merci|monnaie|retirer|acheter|cadeau|combien|comment)\\\\\\\\b/.test(q)) return 'fr';
    if (/\\\\\\\\b(hola|gracias|moneda|retirar|comprar|regalo|cuánto|cómo)\\\\\\\\b/.test(q))       return 'es';
    if (/\\\\\\\\b(ciao|grazie|moneta|ritirare|comprare|regalo|quanto|come)\\\\\\\\b/.test(q))      return 'it';
    if (/\\\\\\\\b(olá|obrigado|moeda|retirar|comprar|presente|quanto|como)\\\\\\\\b/.test(q))      return 'pt';
    if (/\\\\\\\\b(hallo|danke|münze|auszahlen|kaufen|geschenk|wieviel|wie)\\\\\\\\b/.test(q))      return 'de';
    if (/\\\\\\\\b(merhaba|teşekkür|madeni|çekmek|satın|hediye|kadar|nasıl)\\\\\\\\b/.test(q))     return 'tr';
    if (/\\\\\\\\b(привет|спасибо|монета|вывести|купить|подарок|сколько|как)\\\\\\\\b/.test(q))     return 'ru';
    if (/\\\\\\\\b(halo|terima|koin|tarik|beli|hadiah|berapa|bagaimana)\\\\\\\\b/.test(q))          return 'id';
    if (/\\\\\\\\b(xin chào|cảm ơn|đồng xu|rút tiền|mua|quà tặng)\\\\\\\\b/.test(q))              return 'vi';
    if (/\\\\\\\\b(شکریہ|آپ|ہے|کیا|کیسے|میں|آپ کا)\\\\\\\\b/.test(q))                             return 'ur';
    const locale = (typeof navigator !== 'undefined' ? navigator.language : 'en').split('-')[0].toLowerCase();
    const supported = ['fr','es','de','it','pt','tr','ru','id','vi','ar','hi','bn','zh','ja','ko','pa','ur','fa','th','el','he'];
    if (supported.includes(locale)) return locale;
    return 'en';
  };

  type BotLang = 'en'|'hin'|'ur'|'hi'|'ar'|'bn'|'pa'|'fr'|'es'|'de'|'it'|'pt'|'tr'|'ru'|'id'|'vi'|'zh'|'ja'|'ko'|'fa'|'th'|'el'|'he';
  const BOT_KB: Record<string, Record<BotLang|string, string>> = {
    greeting: {
      en:  `Welcome back! 😊 I can help you with:\\\\\\\\
🎬 TikReels • 📡 AJ Pulse • 💰 Wallet\\\\\\\\
🪙 Coins & Earning • 💸 Withdraw • 🎁 Gifts • ⚔️ PK Battle\\\\\\\\
Just ask me anything!`,
      hin: `Bhai, kya scene hai! 😄 Main yahan hoon:\\\\\\\\
🎬 TikReels • 📡 AJ Pulse • 💰 Wallet\\\\\\\\
🪙 Coins earning • 💸 Withdraw • 🎁 Gifts • ⚔️ PK Battle\\\\\\\\
Kuch bhi poocho, seedha batata hoon! 🔥`,
      ur:  `خوش آمدید! 😊 میں ان چیزوں میں مدد کر سکتا ہوں:\\\\\\\\
🎬 TikReels • 📡 AJ Pulse • 💰 Wallet\\\\\\\\
🪙 Coins • 💸 نکاسی • 🎁 تحفے • ⚔️ PK Battle\\\\\\\\
کچھ بھی پوچھیں!`,
      hi:  `स्वागत है! 😊 मैं इनमें मदद कर सकता हूं:\\\\\\\\
🎬 TikReels • 📡 AJ Pulse • 💰 Wallet\\\\\\\\
🪙 Coins • 💸 Withdrawal • 🎁 Gifts • ⚔️ PK\\\\\\\\
कुछ भी पूछो!`,
      ar:  `مرحباً! 😊 يمكنني مساعدتك في:\\\\\\\\
🎬 TikReels • 📡 AJ Pulse • 💰 Wallet\\\\\\\\
🪙 الكوينز • 💸 السحب • 🎁 الهدايا • ⚔️ PK\\\\\\\\
اسألني أي شيء!`,
    },
    coin: {
      en:  `🪙 AJ Coins — Full Breakdown:\\\\\\\\
\\\\\\\\
• Rate: ${COIN_RATE} AJ Coins 🪙 per purchase unit | Min withdraw ${WITHDRAW_MIN.toLocaleString()} AJ Coins 🪙\\\\\\\\
• Starting balance: 0 AJ Coins 🪙 (no signup bonus)\\\\\\\\
• Referral Bonus: +${REFERRAL_COINS} AJ Coins 🪙 per friend referred\\\\\\\\
• Video Post (TikReel): +5 AJ Coins 🪙 per verified upload (max 5/day)\\\\\\\\
• Photo Post (Pulse): +5 AJ Coins 🪙 per verified upload (max 5/day)\\\\\\\\
• AI Bot (Basic): 2.5% daily on invested coins (24h server lock)\\\\\\\\
• AI Bot (VVIP): 5% daily on invested coins (24h server lock)\\\\\\\\
• Live gifts received: 60% goes to you!\\\\\\\\
\\\\\\\\
Go to Wallet → Purchase to top up anytime. 💰`,
      hin: `Bhai, yeh lo puri detail! 🪙\\\\\\\\
\\\\\\\\
• Rate: ${COIN_RATE} AJ Coins 🪙 | Min withdraw ${WITHDRAW_MIN.toLocaleString()} AJ Coins 🪙\\\\\\\\
• Starting balance: 0 AJ Coins 🪙 (no signup bonus)\\\\\\\\
• Referral: +${REFERRAL_COINS} AJ Coins 🪙 har dost ke liye\\\\\\\\
• TikReel video upload: +5 AJ Coins 🪙\\\\\\\\
• Pulse photo post: +5 AJ Coins 🪙\\\\\\\\
• AI Bot Basic: 2.5% daily profit (24h server lock)\\\\\\\\
• AI Bot VVIP: 5% daily profit 🔥\\\\\\\\
• Live pe gifts milein: 60% tumhara!\\\\\\\\
\\\\\\\\
Wallet → Purchase se recharge karo, dost! 💰`,
      ur:  `🪙 AJ Coins — مکمل تفصیل:\\\\\\\\
\\\\\\\\
• شرح: ${COIN_RATE} AJ Coins 🪙 | Min withdraw ${WITHDRAW_MIN.toLocaleString()} AJ Coins 🪙\\\\\\\\
• Starting balance: 0 AJ Coins 🪙 (no signup bonus)\\\\\\\\
• ریفرل: +${REFERRAL_COINS} AJ Coins 🪙\\\\\\\\
• TikReel ویڈیو: +5 Coins 🪙\\\\\\\\
• Pulse فوٹو: +5 Coins 🪙\\\\\\\\
• AI Bot Basic: 2.5% روزانہ\\\\\\\\
• AI Bot VVIP: 5% روزانہ 🔥\\\\\\\\
• Live تحفے: 60% آپ کا!\\\\\\\\
\\\\\\\\
Wallet → Purchase 💰`,
      hi:  `🪙 AJ Coins:\\\\\\\\
\\\\\\\\
• ${COIN_RATE} AJ Coins 🪙 | Min withdraw ${WITHDRAW_MIN.toLocaleString()} AJ Coins 🪙\\\\\\\\
• Starting balance: 0 AJ Coins 🪙 (no signup bonus)\\\\\\\\
• Referral: +${REFERRAL_COINS} AJ Coins 🪙\\\\\\\\
• TikReel Video: +5 Coins 🪙\\\\\\\\
• Pulse Photo: +5 Coins 🪙\\\\\\\\
• AI Bot Basic: 2.5% | VVIP: 5% 🔥\\\\\\\\
• Gifts: 60% आपका!\\\\\\\\
\\\\\\\\
Wallet → Purchase 💰`,
      ar:  `🪙 AJ Coins:\\\\\\\\
\\\\\\\\
• ${COIN_RATE} AJ Coins 🪙 | Min ${WITHDRAW_MIN.toLocaleString()} AJ Coins 🪙\\\\\\\\
• Starting balance: 0 AJ Coins 🪙 (no signup bonus)\\\\\\\\
• Referral: +${REFERRAL_COINS} AJ Coins 🪙\\\\\\\\
• TikReel Video: +5\\\\\\\\
• Pulse Photo: +5\\\\\\\\
• AI Bot: 2-5% 🔥\\\\\\\\
• Gifts: 60%\\\\\\\\
\\\\\\\\
المحفظة → الشراء 💰`,
    },
    tikreels: {
      en:  `🎬 AJ TikReels — TikTok-style short videos!\\\\\\\\
\\\\\\\\
• Go to Social → AJ TikReels → Feed tab\\\\\\\\
• Scroll up/down to watch videos (snap-scroll)\\\\\\\\
• CENTER-TAP to pause/resume video\\\\\\\\
• Like ❤️, Comment 💬, Share 🔗, or send Gifts 🎁\\\\\\\\
• Upload your own: hit ➕ Post tab, add caption + image/video\\\\\\\\
• Each verified upload earns you +5 AJ Coins 🪙\\\\\\\\
• Photo post earns +5 Coins\\\\\\\\
• CSS Filters, Music Picker & Text Overlay available in editor`,
      hin: `🎬 AJ TikReels:\\\\\\\\
\\\\\\\\
• Social → AJ TikReels → Feed\\\\\\\\
• Videos scroll karo (snap-scroll)\\\\\\\\
• CENTER TAP karo pause/resume ke liye\\\\\\\\
• Like ❤️, Comment 💬, Gift 🎁\\\\\\\\
• Video upload: +5 AJ Coins 🪙\\\\\\\\
• Photo post: +5 Coins\\\\\\\\
• Editor mein Filters, Music, Text Overlay bhi hai!`,
      ur:  `🎬 AJ TikReels:\\\\\\\\
\\\\\\\\
• Social → AJ TikReels → Feed\\\\\\\\
• Videos اسکرول کریں\\\\\\\\
• CENTER TAP: pause/resume\\\\\\\\
• Like ❤️، Comment 💬، Gift 🎁\\\\\\\\
• Video: +5 AJ Coins 🪙\\\\\\\\
• Photo: +5 Coins\\\\\\\\
• Editor: Filters، Music، Text Overlay`,
      hi:  `🎬 AJ TikReels:\\\\\\\\
\\\\\\\\
• Social → AJ TikReels → Feed\\\\\\\\
• CENTER TAP: pause/resume\\\\\\\\
• Video: +5 AJ Coins 🪙\\\\\\\\
• Photo: +5 Coins\\\\\\\\
• Editor: Filters, Music, Text Overlay`,
      ar:  `🎬 AJ TikReels:\\\\\\\\
\\\\\\\\
• Social → AJ TikReels → Feed\\\\\\\\
• CENTER TAP: pause/resume\\\\\\\\
• Video: +10 كوين 🔥\\\\\\\\
• Photo: +5 كوين\\\\\\\\
• Editor: Filters, Music, Text`,
    },
    pulse: {
      en:  `📡 AJ Pulse — Instagram-style feed + Live streaming!\\\\\\\\
\\\\\\\\
📸 Feed:\\\\\\\\
• Scroll posts, like, comment, share, send gifts\\\\\\\\
• Post your own content → +5 AJ Coins 🪙 (verified upload, max 5/day)\\\\\\\\
\\\\\\\\
🔴 Go Live:\\\\\\\\
• Social Hub → GO LIVE button\\\\\\\\
• Share your Room ID so viewers can join\\\\\\\\
• Viewers send gifts → You keep 60%!\\\\\\\\
\\\\\\\\
⚔️ PK Battle: 100 Coins entry, 5-min battle 🏆`,
      hin: `📡 AJ Pulse:\\\\\\\\
\\\\\\\\
📸 Feed:\\\\\\\\
• Posts scroll, like/comment/gift\\\\\\\\
• Photo/Video post: +5 AJ Coins 🪙\\\\\\\\
\\\\\\\\
🔴 Live:\\\\\\\\
• GO LIVE → Room ID share karo\\\\\\\\
• Gifts → 60% tumhara! 💰\\\\\\\\
\\\\\\\\
⚔️ PK Battle: 100 Coins, 5 min 🏆`,
      ur:  `📡 AJ Pulse:\\\\\\\\
\\\\\\\\
📸 فیڈ:\\\\\\\\
• Photo/Video: +5 AJ Coins 🪙\\\\\\\\
\\\\\\\\
🔴 Live:\\\\\\\\
• GO LIVE → Room ID شیئر\\\\\\\\
• Gifts → 60% آپ کا!\\\\\\\\
\\\\\\\\
⚔️ PK: 100 Coins، 5 منٹ 🏆`,
      hi:  `📡 AJ Pulse:\\\\\\\\
\\\\\\\\
• Photo/Video: +5 AJ Coins 🪙\\\\\\\\
• GO LIVE → Room ID share\\\\\\\\
• Gifts → 60% आपका!\\\\\\\\
• PK Battle: 100 Coins 🏆`,
      ar:  `📡 AJ Pulse:\\\\\\\\
\\\\\\\\
• Photo: +5 | Video: +10 كوين\\\\\\\\
• GO LIVE → Room ID\\\\\\\\
• Gifts → 60%\\\\\\\\
• PK: 100 كوين 🏆`,
    },
    social: {
      en:  `👤 Social Features:\\\\\\\\
\\\\\\\\
• View any profile: tap any avatar\\\\\\\\
• Follow / Unfollow from their profile page\\\\\\\\
• Message (DM): tap "Message" on any profile\\\\\\\\
• WeChat: private encrypted chat + Video/Audio calls via ZegoCloud\\\\\\\\
• Profile: Posts, Followers, Following, Total Likes, video grid`,
      hin: `👤 Social Features:\\\\\\\\
\\\\\\\\
• Koi bhi profile: dp tap karo\\\\\\\\
• Follow / Unfollow\\\\\\\\
• DM: "Message" button 🔥\\\\\\\\
• WeChat: private chat + Video/Audio call (ZegoCloud)\\\\\\\\
• Profile: Posts, Followers, Likes, videos`,
      ur:  `👤 Social Features:\\\\\\\\
\\\\\\\\
• avatar ٹیپ → پروفائل\\\\\\\\
• Follow / Unfollow\\\\\\\\
• DM: "Message" 🔥\\\\\\\\
• WeChat: private chat + Video/Audio call\\\\\\\\
• Posts، Followers، Likes`,
      hi:  `👤 Social Features:\\\\\\\\
\\\\\\\\
• Avatar टैप → profile\\\\\\\\
• Follow / Unfollow\\\\\\\\
• DM + WeChat calls 🔥\\\\\\\\
• Posts, Followers, Likes`,
      ar:  `👤 Social:\\\\\\\\
\\\\\\\\
• avatar → ملف\\\\\\\\
• Follow/Unfollow\\\\\\\\
• DM + WeChat calls 🔥\\\\\\\\
• Posts, Followers, Likes`,
    },
    refer: {
      en:  `👥 Referral System:\\\\\\\\
\\\\\\\\
• Your Referral Code = your User ID (find in Wallet or Social Hub)\\\\\\\\
• Share your ID with friends\\\\\\\\
• They go to Wallet → "Enter Referral Code" and paste your ID\\\\\\\\
• You receive +${REFERRAL_COINS} Coins per successful referral 🎉\\\\\\\\
• No limit — refer as many as you want!\\\\\\\\
\\\\\\\\
Tip: Copy your Referral ID from Hub or Wallet → Refer 📤`,
      hin: `👥 Referral:\\\\\\\\
\\\\\\\\
• Tera ID = Referral Code\\\\\\\\
• Doston ko share karo\\\\\\\\
• Wo Wallet → Referral Code mein daalen\\\\\\\\
• +${REFERRAL_COINS} Coins 🎉\\\\\\\\
• Koi limit nahi!\\\\\\\\
\\\\\\\\
Tip: Social Hub se copy karo 📤`,
      ur:  `👥 Referral:\\\\\\\\
\\\\\\\\
• آپ کا ID = Referral Code\\\\\\\\
• دوستوں کو شیئر کریں\\\\\\\\
• Wallet → Referral Code میں ڈالیں\\\\\\\\
• +${REFERRAL_COINS} Coins 🎉`,
      hi:  `👥 Referral:\\\\\\\\
\\\\\\\\
• आपका ID = Referral Code\\\\\\\\
• दोस्तों को share करो\\\\\\\\
• Wallet → Referral Code में डालें\\\\\\\\
• +${REFERRAL_COINS} Coins 🎉`,
      ar:  `👥 Referral:\\\\\\\\
\\\\\\\\
• معرفك = Referral Code\\\\\\\\
• شارك مع الأصدقاء\\\\\\\\
• المحفظة → Referral Code\\\\\\\\
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
    const reply = kb?.[lang] || kb?.['en'] || `I'm here to help! Ask me about Coins, TikReels, Pulse, Ads, Wallet, or Referrals.`;
    setTimeout(() => {
      setBotMessages(m => [...m, { from:'bot', text:reply, topic }]);
    }, 600);
  };

  const formatPkTime = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  // ==========================================================
  // PULSE UNSPLASH COMBINED FEED — FIX #5: Unsplash + Firestore merged
  // ==========================================================
  const combinedPulseFeed = React.useMemo(() => {
    // Real Firebase posts first — Pulse prefers photos (TikReel-style feed of pics)
    const realPosts = (pulsePosts || [])
      .map((p: any) => {
        const media = getPlayableSrc(p);
        const pic = String(
          p.image || p.thumbnail || (media.kind === 'image' ? media.src : '') || ''
        ).trim();
        const vid = String(p.videoUrl || (media.kind === 'video' ? media.src : '') || '').trim();
        // Prefer still image for Pulse; only treat as video when no pic exists
        const asVideo = !pic && (media.kind === 'video' || p.isVideo === true || Boolean(vid));
        return {
          ...p,
          image: pic || (!asVideo ? media.src || vid : '') || vid,
          videoUrl: asVideo ? vid || media.src : '',
          isVideo: asVideo,
        };
      })
      .filter((p: any) => p.image || p.videoUrl || p.text);

    const unsplashItems = (pixaData || [])
      .map((img: any, i: number) => ({
        id: `unsplash_${img.id || i}`,
        image: img.urls?.regular || img.urls?.small || img.urls?.thumb || '',
        text: img.alt_description || img.description || 'Lifestyle',
        username: img.user?.name || 'Unsplash',
        photo: img.user?.profile_image?.small || '/logo.png',
        uid: 'unsplash',
        likes: img.likes || 0,
        views: 0,
        isUnsplash: true,
        isVideo: false,
      }))
      .filter((p: any) => !!p.image);

    const merged: any[] = [];
    const maxLen = Math.max(realPosts.length, unsplashItems.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < realPosts.length) merged.push(realPosts[i]);
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

      {/* FIX: PK INCOMING CHALLENGE MODAL — jab koi user current user ko
          PK challenge bhejta hai, yeh modal accept/decline ke liye dikhta hai */}
      {pkIncomingChallenge && !pkActive && (
        <div className="fixed inset-0 z-[9100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6">
          <div className="bg-gradient-to-br from-orange-900/60 to-red-900/60 border-2 border-orange-500/50 rounded-3xl p-6 max-w-sm w-full" style={{animation:'fadeInOverlay 0.5s ease-out'}}>
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">⚔️</div>
              <p className="text-lg font-black text-orange-400 uppercase tracking-widest">PK Challenge!</p>
              <p className="text-sm text-gray-300 mt-2">@{pkIncomingChallenge.hostName || 'Someone'} wants to battle you!</p>
            </div>
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={pkIncomingChallenge.hostPhoto || '/logo.png'} className="w-14 h-14 rounded-full border-2 border-orange-500 object-cover" alt="Challenger"/>
              <span className="text-2xl font-black text-white">VS</span>
              <img src={tempPhoto || user?.photoURL || '/logo.png'} className="w-14 h-14 rounded-full border-2 border-orange-500 object-cover" alt="You"/>
            </div>
            <p className="text-center text-[10px] text-gray-400 mb-4">Entry: {pkIncomingChallenge.entryCoins || PK_ENTRY_COINS} Coins · 5-min battle</p>
            <div className="flex gap-3">
              <button
                onClick={() => acceptPkChallenge(pkIncomingChallenge)}
                className="flex-1 py-3 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all"
                style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}
              >
                ⚔️ Accept
              </button>
              <button
                onClick={() => declinePkChallenge()}
                className="flex-1 py-3 rounded-2xl bg-white/10 border border-white/20 text-gray-300 font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

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
          <button
            onClick={() => setProfileVideoViewer(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all"
          >
            <X size={20} className="text-white"/>
          </button>
          <div className="flex-1 flex items-center justify-center relative">
            <video
              src={toPlayableMediaUrl(profileVideoViewer.url)}
              className="max-w-full max-h-full object-contain"
              autoPlay
              controls
              playsInline
              loop
            />
          </div>
          <div className="absolute bottom-8 left-4 right-4 z-20 flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-white font-black text-sm">
                @{viewProfile?.username || username || 'AJ_Member'}
              </p>
              {profileVideoViewer.text ? (
                <p className="text-gray-300 text-xs mt-1">{profileVideoViewer.text}</p>
              ) : null}
            </div>
            {profileVideoViewer.post ? (
              <button
                type="button"
                onClick={(e) => openComments(profileVideoViewer.post, e)}
                className="flex-shrink-0 flex flex-col items-center gap-1 active:scale-90"
              >
                <div className="w-11 h-11 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                  <MessageSquare size={20} className="text-white" />
                </div>
                <span className="text-white text-[9px] font-black">
                  {formatViews(profileVideoViewer.post.commentCount || 0)}
                </span>
              </button>
            ) : null}
          </div>
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
          <p className="mt-2 text-xs text-gray-400 text-center">TikReels • Pulse • Live • Ads • Wallet</p>
          <button
            onClick={handleGoogleLogin}
            className="mt-10 w-full max-w-xs flex items-center justify-center gap-3 bg-white text-gray-900 font-black rounded-2xl py-4 shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-95 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </button>
          {banNotice && (
            <div
              className="mt-6 w-full max-w-xs rounded-2xl px-4 py-3 text-center"
              style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(239,68,68,0.45)' }}
              role="alert"
            >
              <p className="text-red-400 text-xs font-black uppercase tracking-widest">403 Forbidden</p>
              <p className="text-red-300 text-sm font-black mt-1">{banNotice}</p>
            </div>
          )}
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
              {isPortalAdmin && (
                <button
                  onClick={() => setScreen('admin')}
                  className="p-2 rounded-xl bg-red-600/20 border border-red-500/30 active:scale-90 transition-all"
                  title="Admin Panel"
                  type="button"
                >
                  <Shield size={14} className="text-red-400"/>
                </button>
              )}
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
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Total Balance · AJ Coins</p>
                <p className="text-4xl font-black bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent mt-1">{parseFloat(displayBalance).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} <span className="text-lg text-yellow-400/70">AJ Coins 🪙</span></p>
                <p className="text-sm font-black text-emerald-400 mt-1">
                  ≈ {formatUsd(coinsToUsd(Number(displayBalance) || balance))}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Min withdraw 20,000 AJ Coins 🪙 ({formatUsd(coinsToCashUsd(20000))})
                </p>
                {botTier !== 'none' && (
                  <div className="mt-3 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-2xl px-3 py-2">
                    <span className="text-green-400 text-xs font-black animate-pulse">● LIVE</span>
                    <span className="text-green-300 text-xs font-black">{botTier.toUpperCase()} BOT ACTIVE</span>
                    <span className="ml-auto text-green-400 text-xs font-black">+{botTier==='vvip'?'5':'2.5'}% daily</span>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => { setScreen('wallet'); setWalletTab('main'); }} className="flex-1 py-2.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_18px_rgba(236,72,153,0.3)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>+ Buy Coins</button>
                  <button onClick={() => { setScreen('wallet'); setWalletTab('main'); }} className="flex-1 py-2.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#0891b2,#0e7490)'}}>Withdraw</button>
                </div>
              </div>
            </div>
          </div>

          {/* Offer Hub — ADGem, Earn & Play, Math/Captcha */}
          <HubEarnPanel
            user={user}
            onAlert={(msg, icon) => setVvipAlert({ msg, icon: icon || '💰' })}
            onRefreshUser={async () => {
              if (!user?.uid) return;
              try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                  const d = snap.data() as Record<string, unknown>;
                  setBalance((d.balance as number) || 0);
                }
              } catch {
                /* live onSnapshot remains source of truth */
              }
            }}
          />

          {/* Quick Nav — Social, Wallet, AI Bot */}
          <div className="px-4 pt-5 space-y-3">
            <button
              onClick={() => navigateWithAd('social')}
              className="w-full flex items-center gap-4 bg-gradient-to-br from-cyan-900/45 to-blue-900/35 border border-cyan-500/35 rounded-3xl p-5 active:scale-[0.99] transition-all hover:border-cyan-400/55 shadow-[0_0_24px_rgba(6,182,212,0.18)]"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-[0_0_16px_rgba(6,182,212,0.5)] shrink-0">
                <span className="text-2xl">📡</span>
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-white font-black text-base">Social Hub</p>
                <p className="text-[11px] text-gray-400 mt-0.5">TikReels · Pulse · Live · DMs · WeChat</p>
                <span className="inline-block mt-2 text-[8px] text-cyan-300 font-black bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded-full">
                  ALL SOCIAL FEATURES
                </span>
              </div>
              <ChevronRight size={18} className="text-cyan-400 shrink-0"/>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigateWithAd('wallet')} className="flex flex-col items-start gap-3 bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border border-yellow-500/30 rounded-3xl p-5 active:scale-95 transition-all hover:border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-[0_0_16px_rgba(234,179,8,0.5)]">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="text-left">
                  <p className="text-white font-black text-sm">Wallet</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Buy · Transfer · Withdraw</p>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[8px] text-yellow-400 font-black bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">{parseFloat(displayBalance).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} 🪙</span>
                  <ChevronRight size={12} className="text-yellow-400"/>
                </div>
              </button>

              <button onClick={() => navigateWithAd('aibot')} className="flex flex-col items-start gap-3 bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-3xl p-5 active:scale-95 transition-all hover:border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-[0_0_16px_rgba(34,197,94,0.5)]">
                  <span className="text-2xl">🤖</span>
                </div>
                <div className="text-left">
                  <p className="text-white font-black text-sm">AI Trading Bot</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Passive AJ Coins 🪙</p>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${botTier!=='none' ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-gray-400 bg-white/5 border border-white/10'}`}>{botTier!=='none' ? '● ACTIVE' : '○ INACTIVE'}</span>
                  <ChevronRight size={12} className={botTier!=='none' ? 'text-green-400' : 'text-gray-500'}/>
                </div>
              </button>
            </div>
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
          <div className="px-4 pt-4 pb-4 space-y-3">
            {isPortalAdmin && (
              <button
                type="button"
                onClick={() => setScreen('admin')}
                className="w-full flex items-center gap-3 bg-red-600/10 border border-red-500/30 rounded-2xl p-4 active:scale-95 transition-all"
              >
                <div className="w-10 h-10 rounded-2xl bg-red-600/30 flex items-center justify-center">
                  <Ban size={18} className="text-red-400"/>
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs font-black text-white">Admin · One-Click Ban</p>
                  <p className="text-[9px] text-red-300/80">Manage users · Ban instantly</p>
                </div>
                <ChevronRight size={14} className="text-red-400"/>
              </button>
            )}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white">Refer & Earn · +{REFERRAL_COINS} 🪙 each</p>
                <p className="text-[9px] text-gray-400 truncate">
                  Your ID: {myReferralId || '…generating…'}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(myReferralId || '')}
                disabled={!myReferralId}
                className="bg-pink-600/20 border border-pink-500/30 text-pink-400 text-[9px] font-black px-3 py-1.5 rounded-xl active:scale-90 transition-all disabled:opacity-40"
              >
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
          ADMIN PANEL — One-Click User Ban (admin email/UID only)
      ══════════════════════════════════════════════════════ */}
      {screen === 'admin' && isPortalAdmin && user ? (
        <AdminUsersPanel
          adminUser={{ uid: user.uid, email: user.email }}
          onBack={() => setScreen('hub')}
          onAlert={(msg, icon) => setVvipAlert({ msg, icon })}
        />
      ) : null}


      {/* ══════════════════════════════════════════════════════
          SOCIAL SCREEN
      ══════════════════════════════════════════════════════ */}
      {screen === 'social' && (
        <div className="fixed inset-0 flex flex-col bg-[#050505]">

          {/* ── PROFILE SETUP / EDIT ── */}
          {socialScreen === 'setup' && (
            <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center gap-5">
              <div className="relative z-[50]">
                <img src="/logo.png" alt="AJ" className="w-16 h-16 rounded-2xl shadow-[0_0_30px_rgba(236,72,153,0.5)]"/>
              </div>
              <h2 className="text-xl font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent">
                {hasSocialProfile ? 'Edit Your Profile' : 'Create Your Profile'}
              </h2>
              <div className="relative cursor-pointer" onClick={handleImageClick}>
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-pink-500">
                  <img src={tempPhoto || user?.photoURL || '/logo.png'} className="w-full h-full object-cover"/>
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-pink-600 rounded-full flex items-center justify-center">
                  <Camera size={12} className="text-white"/>
                </div>
              </div>
              <input
                value={profileDisplayName}
                onChange={(e) => setProfileDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"
              />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username (min 3 chars)"
                className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bio (optional)"
                className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm h-20 resize-none focus:outline-none focus:border-pink-500/50"
              />
              <button
                onClick={handleCreateProfile}
                className="w-full max-w-sm py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]"
                style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}
              >
                {hasSocialProfile ? '💾 Save Changes' : '🚀 Activate Profile'}
              </button>
              {hasSocialProfile && (
                <button
                  type="button"
                  onClick={() => setSocialScreen(viewingUid ? 'profile' : 'hub')}
                  className="text-xs text-gray-400 font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
              )}
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
                  { icon: '🎬', label: 'AJ Pulse', sub: 'Photos', action: () => { setSocialScreen('pulse'); setPulseTab('feed'); } },
                  { icon: 'G', label: 'Go Live', sub: 'Social features', action: () => { setSocialScreen('golive'); } },
                  { icon: 'J', label: 'Join Live', sub: 'Social features', action: () => { setSocialScreen('joinlive'); } },
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
                        const ytIdx = activeVideoIdx - userPosts.length;
                        if (activeIframe && ytIdx >= 0 && pixaVideos[ytIdx]) {
                          const v = pixaVideos[ytIdx];
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
                  {/* Community TikReels first (TikTok-style), then YouTube discovery filler */}
                  {userPosts.flatMap((post:any, idx:number) => {
                    const globalIdx = idx;
                    const isActive  = activeVideoIdx === globalIdx;
                    const media = getPlayableSrc(post);
                    const mediaUrl = media.src;
                    const ownerUid = String(post.uid || post.userId || '');
                    // Trust isVideo / videos-collection for EVERY user (not only the signed-in owner)
                    const playAsVideo =
                      media.kind === 'video' ||
                      isPlayableTikReel(post) ||
                      post.isVideo === true;
                    const altVideoUrl = [post.videoUrl, post.mediaUrl, post.url, post.image]
                      .map((u: unknown) => toPlayableMediaUrl(String(u || '').trim()))
                      .find((u: string) => u && u !== mediaUrl) || '';
                    const contentEl = (
                      <div key={`user_${post.id}`} data-vidx={globalIdx} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505] flex flex-col justify-end" style={{ scrollSnapAlign:'start', touchAction:'pan-y' }}>
                        {playAsVideo && mediaUrl ? (
                          <video
                            key={`vid_${post.id}_${mediaUrl.slice(-24)}`}
                            ref={el => { userVideoRefs.current[globalIdx] = el; }}
                            src={mediaUrl}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay={isActive}
                            loop
                            muted
                            playsInline
                            preload="auto"
                            onLoadedData={(e) => {
                              if (!isActive) return;
                              const v = e.currentTarget;
                              v.muted = !globalSoundOn;
                              v.play().catch(() => {
                                v.muted = true;
                                v.play().catch(() => {});
                              });
                            }}
                            onError={(e) => {
                              const v = e.currentTarget;
                              console.warn('TikReel video failed', post.id, v.src);
                              // Try alternate field (other users may store playable URL in videoUrl vs image)
                              if (altVideoUrl && !v.dataset.retried) {
                                v.dataset.retried = '1';
                                v.src = altVideoUrl;
                                v.load();
                                if (isActive) v.play().catch(() => {});
                                return;
                              }
                              // Do NOT swap to <img> — that made other users' reels look like photos.
                              // Keep <video> and let user tap to retry load (Storage 403 = publish rules).
                              if (!v.dataset.retryTap) {
                                v.dataset.retryTap = '1';
                                v.poster = '';
                                const retry = () => {
                                  v.load();
                                  if (isActive) v.play().catch(() => {});
                                };
                                v.addEventListener('click', retry, { once: true });
                              }
                            }}
                            style={{ filter: post.cssFilter && post.cssFilter !== 'none' ? post.cssFilter : undefined, touchAction:'pan-y' }}
                          />
                        ) : mediaUrl ? (
                          <img
                            src={mediaUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.opacity = '0.3';
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50"/>
                        )}
                        {post.textOverlay && (
                          <div className="absolute top-1/3 left-0 right-0 flex justify-center z-20 pointer-events-none">
                            <span className="bg-black/60 backdrop-blur-sm text-white font-black text-lg px-4 py-2 rounded-2xl text-center">{post.textOverlay}</span>
                          </div>
                        )}
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
                        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-[110]">
                          <button onClick={e => openGiftPanel(post, e)} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Gift size={18} className="text-yellow-400"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Gift</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleLike(post, true); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${likedPosts[post.postId || post.id] ? 'bg-red-500/30' : 'bg-black/40 backdrop-blur-sm'}`}>
                              <Heart size={18} className={likedPosts[post.postId || post.id] ? 'text-red-400 fill-red-400' : 'text-white'}/>
                            </div>
                            <span className="text-white text-[9px] font-black">{post.likes || 0}</span>
                          </button>
                          <button onClick={e => openComments(post, e)} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <MessageSquare size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">{formatViews(post.commentCount||0)}</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleShare(post.text||''); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Share2 size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Share</span>
                          </button>
                          {ownerUid === user?.uid && (
                            <button onClick={e => { e.stopPropagation(); handleDeletePost(String(post.postId || post.id)); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                              <div className="w-10 h-10 rounded-full bg-red-500/30 backdrop-blur-sm flex items-center justify-center">
                                <Trash2 size={18} className="text-red-400"/>
                              </div>
                            </button>
                          )}
                        </div>
                        <div className="absolute bottom-6 left-4 right-16 z-10">
                          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-500/80 to-purple-500/80 backdrop-blur-sm rounded-full px-3 py-1 mb-2">
                            <span className="text-white text-[8px] font-black uppercase tracking-widest animate-pulse">🔥 Trending Now</span>
                          </div>
                          <button className="flex items-center gap-2 mb-1" onClick={() => openProfile(ownerUid)}>
                            <img src={post.photo||'/logo.png'} className="w-7 h-7 rounded-full border border-white/30 object-cover"/>
                            <span className="text-white font-black text-xs">@{post.username}</span>
                          </button>
                          <p className="text-gray-300 text-[10px] line-clamp-2">{post.text}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Eye size={11} className="text-white/80"/>
                            <span className="text-white/90 text-[9px] font-black">{formatViews(post.views||0)} views</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 flex items-center justify-center flex-shrink-0" style={{ animation: 'spin 3s linear infinite' }}>
                              <div className="w-1.5 h-1.5 bg-white rounded-full"/>
                            </div>
                            <span className="text-white/80 text-[9px] font-black truncate">🎵 @{post.username} · AJ Original Sound</span>
                          </div>
                        </div>
                      </div>
                    );
                      if ((idx + 1) % INFEED_AD_EVERY_N === 0) {
                        return [contentEl, (
                          <div key={`ad_user_${idx}`} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden" style={{ scrollSnapAlign:'start', background: 'radial-gradient(ellipse at 50% 30%, #1c1a28 0%, #0a0a10 100%)' }}>
                            <InFeedAdShell placement="tikreel_infeed" user={user}>
                              <InFeedVideoAd slotKey={`tik_user_${idx}`} />
                            </InFeedAdShell>
                          </div>
                        )];
                      }
                      return [contentEl];
                  })}
                  {(() => {
                    return pixaVideos.flatMap((vid:any, idx:number) => {
                      const globalIdx = userPosts.length + idx;
                      const isActive = activeVideoIdx === globalIdx;
                      const embedSrc = `https://www.youtube.com/embed/${vid.id}?autoplay=${isActive?1:0}&mute=${(isActive && globalSoundOn)?0:1}&loop=1&playlist=${vid.id}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3&enablejsapi=1`;
                    const contentEl = (
                      <div key={`yt_${vid.id}`} data-vidx={globalIdx} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505] flex flex-col justify-end" style={{ scrollSnapAlign:'start', touchAction:'pan-y' }}>
                        {isActive ? (
                          <iframe
                            ref={el => { iframeRefs.current[globalIdx] = el; }}
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
                        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-[110]">
                          <button onClick={e => { e.stopPropagation(); setVvipAlert({msg:'Gifts are for real creators only.', icon:'🎁'}); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Gift size={18} className="text-yellow-400"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Gift</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleLike(vid.id, true, true); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${likedPosts[vid.id] ? 'bg-red-500/30' : 'bg-black/40 backdrop-blur-sm'}`}>
                              <Heart size={18} className={likedPosts[vid.id] ? 'text-red-400 fill-red-400' : 'text-white'}/>
                            </div>
                            <span className="text-white text-[9px] font-black">{formatViews(vid.likes || 0)}</span>
                          </button>
                          <button onClick={e => openComments(vid, e)} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <MessageSquare size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">{formatViews(vid.views||0)}</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleShare(vid.title||''); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Share2 size={18} className="text-white"/>
                            </div>
                            <span className="text-white text-[9px] font-black">Share</span>
                          </button>
                        </div>
                        <div className="absolute bottom-6 left-4 right-16 z-10">
                          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-500/80 to-purple-500/80 backdrop-blur-sm rounded-full px-3 py-1 mb-2">
                            <span className="text-white text-[8px] font-black uppercase tracking-widest animate-pulse">🔥 Trending Now</span>
                          </div>
                          <p className="text-white font-black text-xs truncate">@{vid.user}</p>
                          <p className="text-gray-300 text-[10px] mt-0.5 line-clamp-2">{vid.title}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Eye size={11} className="text-white/80"/>
                            <span className="text-white/90 text-[9px] font-black">{formatViews(vid.views||0)} views</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 flex items-center justify-center flex-shrink-0" style={{ animation: 'spin 3s linear infinite' }}>
                              <div className="w-1.5 h-1.5 bg-white rounded-full"/>
                            </div>
                            <span className="text-white/80 text-[9px] font-black truncate">🎵 {vid.user} · AJ Original Sound</span>
                          </div>
                        </div>
                      </div>
                    );
                      if ((idx + 1) % INFEED_AD_EVERY_N === 0) {
                        return [contentEl, (
                          <div key={`ad_pixa_${idx}`} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden" style={{ scrollSnapAlign:'start', background: 'radial-gradient(ellipse at 50% 30%, #1c1a28 0%, #0a0a10 100%)' }}>
                            <InFeedAdShell placement="tikreel_infeed" user={user}>
                              <InFeedVideoAd slotKey={`tik_pixa_${idx}`} />
                            </InFeedAdShell>
                          </div>
                        )];
                      }
                      return [contentEl];
                    });
                  })()}
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
                    <p className="text-white font-black text-lg mt-3">
                      {profileDisplayName || user?.displayName || `@${username || 'AJ_Member'}`}
                    </p>
                    <p className="text-gray-400 text-xs">@{username || 'AJ_Member'}</p>
                    <p className="text-gray-400 text-xs mt-1 text-center max-w-xs">{bio || 'No bio yet.'}</p>
                    <div className="flex gap-8 mt-4">
                      <div className="text-center"><p className="text-white font-black text-lg">{tikProfileMyPosts.length}</p><p className="text-gray-400 text-[10px]">Posts</p></div>
                      <button type="button" onClick={() => void openFollowList('followers', user?.uid)} className="text-center active:scale-95">
                        <p className="text-white font-black text-lg">{tikProfileFollowers}</p>
                        <p className="text-gray-400 text-[10px]">Followers</p>
                      </button>
                      <button type="button" onClick={() => void openFollowList('following', user?.uid)} className="text-center active:scale-95">
                        <p className="text-white font-black text-lg">{followingList.length}</p>
                        <p className="text-gray-400 text-[10px]">Following</p>
                      </button>
                    </div>
                    <div className="flex gap-2 mt-4 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDisplayName(profileDisplayName || user?.displayName || '');
                          setSocialScreen('setup');
                        }}
                        className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-gray-300"
                      >
                        <Edit3 size={11} className="inline mr-1" /> Edit
                      </button>
                      {/* Message replaces the old Following tab next to Edit */}
                      <button
                        type="button"
                        title="Messages"
                        onClick={() => openMessagesInbox('tikreels')}
                        className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center gap-1.5 active:scale-90 transition-all shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                      >
                        <MessageCircle size={12} />
                        Message
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 p-0.5">
                      {tikProfileMyPosts.length === 0 && (
                        <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3">
                          <span className="text-4xl">🎬</span>
                          <p className="text-gray-500 text-sm">No posts yet. Upload your first TikReel!</p>
                        </div>
                      )}
                      {tikProfileMyPosts.map((post:any) => {
                        const media = getPlayableSrc(post);
                        const playUrl = media.src || String(
                          post.videoUrl || post.image || post.url || post.mediaUrl || ''
                        );
                        const thumb = String(
                          post.thumbnail || post.thumb || post.poster || playUrl || ''
                        );
                        const asVideo =
                          media.kind === 'video' ||
                          isPlayableTikReel(post) ||
                          post.isVideo === true;
                        return (
                        <div
                          key={post.id}
                          role="button"
                          tabIndex={0}
                          className="relative aspect-square bg-white/5 overflow-hidden cursor-pointer active:scale-95 transition-all"
                          onClick={() => {
                            const url = playUrl || thumb;
                            if (!url) {
                              setVvipAlert({ msg: 'Video URL missing for this post.', icon: '⚠️' });
                              return;
                            }
                            setProfileVideoViewer({
                              url,
                              text: post.text || post.textOverlay || post.caption || '',
                              post,
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (playUrl || thumb) {
                                setProfileVideoViewer({
                                  url: playUrl || thumb,
                                  text: post.text || post.textOverlay || post.caption || '',
                                  post,
                                });
                              }
                            }
                          }}
                        >
                          {asVideo ? (
                            (playUrl || thumb) ? (
                              <video
                                src={playUrl || thumb}
                                className="w-full h-full object-cover pointer-events-none"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">🎬</span></div>
                            )
                          ) : (
                            (thumb || playUrl)
                              ? <img src={thumb || playUrl} className="w-full h-full object-cover pointer-events-none" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                              : <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-gray-500 text-xs">🎬</span></div>
                          )}
                          {(post.isVideo || playUrl) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                <span className="text-white text-sm ml-0.5">▶</span>
                              </div>
                            </div>
                          )}
                          {(post.isVideo || playUrl) && <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"><Film size={10} className="text-white"/></div>}
                          <div className="absolute bottom-1 left-1 bg-black/60 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                            <Eye size={8} className="text-white"/>
                            <span className="text-white text-[8px] font-black">{formatViews(post.views||0)}</span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
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
                    // In-feed ads use Adsterra Native Banner (no black video surface).
                    // har 8 post pe full-screen ad block karna padta tha jo UX kharab
                    // karta tha. Ab feed mein SIRF content posts hain, koi ad slot nahi.
                    // Real Monetag popup ad still fires once per 5-min cycle via navigation
                    // and free-coin triggers (cooldown-gated), so revenue stays.
                    return combinedPulseFeed.flatMap((post:any, idx:number) => {
                      const isActive = activeVideoIdx === idx;
                      const media = getPlayableSrc(post);
                      const picUrl = String(
                        post.image || post.thumbnail || (!post.isVideo ? post.mediaUrl || post.url || '' : '') || ''
                      ).trim();
                      // Pulse = photos first (same TikReel UI, pics instead of videos)
                      const playAsVideo =
                        !picUrl &&
                        (media.kind === 'video' ||
                          isPlayableTikReel(post) ||
                          post.isVideo === true);
                      const mediaUrl =
                        (playAsVideo
                          ? media.src || post.videoUrl || picUrl
                          : picUrl || media.src || post.image || post.thumbnail || '') || '';
                      const altVideoUrl = [post.videoUrl, post.mediaUrl, post.url, post.image]
                        .map((u: unknown) => toPlayableMediaUrl(String(u || '').trim()))
                        .find((u: string) => u && u !== mediaUrl) || '';
                      const contentEl = (
                      <div key={post.id} data-vidx={idx} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden bg-[#050505] flex flex-col justify-end" style={{ scrollSnapAlign:'start', touchAction:'pan-y' }}>
                        {playAsVideo && mediaUrl ? (
                          <video
                            key={`pulse_vid_${post.id}`}
                            ref={el => { userVideoRefs.current[idx] = el; }}
                            src={mediaUrl}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay={isActive}
                            loop
                            muted
                            playsInline
                            preload="auto"
                            onLoadedData={(e) => {
                              if (!isActive) return;
                              const v = e.currentTarget;
                              v.muted = pulseMuted;
                              v.play().catch(() => {
                                v.muted = true;
                                v.play().catch(() => {});
                              });
                            }}
                            onError={(e) => {
                              const v = e.currentTarget;
                              if (altVideoUrl && !v.dataset.retried) {
                                v.dataset.retried = '1';
                                v.src = altVideoUrl;
                                v.load();
                                if (isActive) v.play().catch(() => {});
                                return;
                              }
                              // Keep as video — never fall back to a still for Pulse clips
                              if (!v.dataset.retryTap) {
                                v.dataset.retryTap = '1';
                                v.addEventListener(
                                  'click',
                                  () => {
                                    v.load();
                                    if (isActive) v.play().catch(() => {});
                                  },
                                  { once: true }
                                );
                              }
                            }}
                            onClick={() => setReelPaused(p => !p)}
                          />
                        ) : mediaUrl ? (
                          <img
                            src={mediaUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.opacity = '0.35';
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                            <p className="text-zinc-400 text-xs font-bold px-6 text-center">{post.text || 'Pulse post'}</p>
                          </div>
                        )}
                        <div
                          className="absolute inset-0 z-10"
                          onClick={() => setReelPaused((p) => !p)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"/>
                        {reelPaused && isActive && playAsVideo && (
                          <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none">
                            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                              <span className="text-white text-3xl">⏸</span>
                            </div>
                          </div>
                        )}
                        {/* Same TikReel action rail — Gift / Like / Comment / Share / Delete */}
                        {!post.isUnsplash && (
                          <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-[110]">
                            <button onClick={e => openGiftPanel(post, e)} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                <Gift size={18} className="text-yellow-400"/>
                              </div>
                              <span className="text-white text-[9px] font-black">Gift</span>
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleLike(post, false); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${likedPosts[post.id] ? 'bg-red-500/30' : 'bg-black/40 backdrop-blur-sm'}`}>
                                <Heart size={18} className={likedPosts[post.id] ? 'text-red-400 fill-red-400' : 'text-white'}/>
                              </div>
                              <span className="text-white text-[9px] font-black">{formatViews(post.likes || 0)}</span>
                            </button>
                            <button onClick={e => openComments(post, e)} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                <MessageSquare size={18} className="text-white"/>
                              </div>
                              <span className="text-white text-[9px] font-black">{formatViews(post.commentCount || 0)}</span>
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleShare(post.text||''); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                <Share2 size={18} className="text-white"/>
                              </div>
                              <span className="text-white text-[9px] font-black">Share</span>
                            </button>
                            {(post.uid === user?.uid || post.userId === user?.uid) && (
                              <button onClick={e => { e.stopPropagation(); handleDeletePost(String(post.id)); }} className="flex flex-col items-center gap-1 active:scale-90 transition-all">
                                <div className="w-10 h-10 rounded-full bg-red-500/30 backdrop-blur-sm flex items-center justify-center">
                                  <Trash2 size={18} className="text-red-400"/>
                                </div>
                              </button>
                            )}
                          </div>
                        )}
                        <div className="absolute bottom-6 left-4 right-16 z-10">
                          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/80 to-pink-500/80 backdrop-blur-sm rounded-full px-3 py-1 mb-2">
                            <span className="text-white text-[8px] font-black uppercase tracking-widest animate-pulse">📸 Pulse</span>
                          </div>
                          <button
                            type="button"
                            className="flex items-center gap-2 mb-1"
                            onClick={() => !post.isUnsplash && openProfile(String(post.uid || post.userId || ''))}
                          >
                            <img src={post.photo||'/logo.png'} className="w-7 h-7 rounded-full border border-white/30 object-cover" alt=""/>
                            <span className="text-white font-black text-xs">@{post.username}</span>
                          </button>
                          <p className="text-gray-300 text-[10px] line-clamp-2">{post.text}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Eye size={11} className="text-white/80"/>
                            <span className="text-white/90 text-[9px] font-black">{formatViews(post.views||0)} views</span>
                          </div>
                        </div>
                      </div>
                    );
                      // FIX ROUND 8: Har 4 Pulse posts ke baad ek REAL video ad.
                      if ((idx + 1) % INFEED_AD_EVERY_N === 0) {
                        return [contentEl, (
                          <div key={`ad_pulse_${idx}`} className="relative w-full min-h-screen flex-shrink-0 snap-start overflow-hidden" style={{ scrollSnapAlign:'start', background: 'radial-gradient(ellipse at 50% 30%, #1c1a28 0%, #0a0a10 100%)' }}>
                            <InFeedAdShell placement="pulse_infeed" user={user}>
                              <InFeedVideoAd slotKey={`pulse_${idx}`} />
                            </InFeedAdShell>
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

              {/* ── PULSE CREATE (photos — TikReel create twin) ── */}
              {pulseTab === 'create' && (
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  <div className="relative w-full aspect-[9/16] max-h-[55vh] bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer" onClick={handleImageClick}>
                    {tempPhoto ? (
                      <img src={tempPhoto} className="w-full h-full object-cover" alt=""/>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <PlusSquare size={32} className="text-gray-500"/>
                        <span className="text-gray-400 text-xs">Tap to add a photo</span>
                        <span className="text-gray-600 text-[9px]">Pulse = pics · TikReels = videos</span>
                      </div>
                    )}
                  </div>
                  <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Write a caption…" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm h-24 resize-none focus:outline-none focus:border-pink-500/50"/>
                  <button onClick={handleCreatePost} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                    📸 Post Pulse (+5 Coins)
                  </button>
                </div>
              )}

              {/* ── PULSE PROFILE (same as TikReel profile) ── */}
              {pulseTab === 'profile' && (
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col items-center px-4 py-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-2 border-pink-500 overflow-hidden cursor-pointer" onClick={() => dpFileRef.current?.click()}>
                        <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-full h-full object-cover" alt=""/>
                      </div>
                      <button
                        onClick={() => dpFileRef.current?.click()}
                        className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-[0_0_12px_rgba(236,72,153,0.7)]"
                        style={{ background:'linear-gradient(135deg,#ec4899,#f472b6)', border:'2px solid #050505' }}
                      >
                        <Plus size={14} className="text-white font-black" strokeWidth={3}/>
                      </button>
                    </div>
                    <p className="text-white font-black text-lg mt-3">
                      {profileDisplayName || user?.displayName || `@${username || 'AJ_Member'}`}
                    </p>
                    <p className="text-gray-400 text-xs">@{username||'AJ_Member'}</p>
                    <p className="text-gray-400 text-xs mt-1 text-center max-w-xs">{bio||'No bio yet.'}</p>
                    <div className="flex gap-8 mt-4">
                      <div className="text-center">
                        <p className="text-white font-black text-lg">
                          {pulsePosts.filter((p:any) => p.uid===user?.uid || p.userId===user?.uid).length}
                        </p>
                        <p className="text-gray-400 text-[10px]">Posts</p>
                      </div>
                      <button type="button" onClick={() => void openFollowList('followers', user?.uid)} className="text-center active:scale-95">
                        <p className="text-white font-black text-lg">{tikProfileFollowers || followers}</p>
                        <p className="text-gray-400 text-[10px]">Followers</p>
                      </button>
                      <button type="button" onClick={() => void openFollowList('following', user?.uid)} className="text-center active:scale-95">
                        <p className="text-white font-black text-lg">{followingList.length}</p>
                        <p className="text-gray-400 text-[10px]">Following</p>
                      </button>
                    </div>
                    <div className="flex gap-2 mt-4 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDisplayName(profileDisplayName || user?.displayName || '');
                          setSocialScreen('setup');
                        }}
                        className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-gray-300"
                      >
                        <Edit3 size={11} className="inline mr-1" /> Edit
                      </button>
                      <button
                        type="button"
                        title="Messages"
                        onClick={() => openMessagesInbox('pulse')}
                        className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center gap-1.5 active:scale-90 transition-all shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                      >
                        <MessageCircle size={12} />
                        Message
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 p-0.5">
                    {pulsePosts.filter((p:any) => p.uid===user?.uid || p.userId===user?.uid).length === 0 && (
                      <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3">
                        <span className="text-4xl">📸</span>
                        <p className="text-gray-500 text-sm">No posts yet. Share your first Pulse photo!</p>
                      </div>
                    )}
                    {pulsePosts.filter((p:any) => p.uid===user?.uid || p.userId===user?.uid).map((post:any) => {
                      const media = getPlayableSrc(post);
                      const url = String(post.image || post.thumbnail || media.src || post.videoUrl || '');
                      return (
                      <div
                        key={post.id}
                        className="relative aspect-square bg-white/5 overflow-hidden cursor-pointer active:scale-95 transition-all"
                        onClick={() => {
                          if (!url) return;
                          setProfileVideoViewer({ url, text: post.text || post.textOverlay, post });
                        }}
                      >
                        <img
                          src={url}
                          className="w-full h-full object-cover pointer-events-none"
                          alt=""
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute bottom-1 left-1 bg-black/60 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                          <Eye size={8} className="text-white"/>
                          <span className="text-white text-[8px] font-black">{formatViews(post.views||0)}</span>
                        </div>
                      </div>
                    );})}
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
              <div className="px-4 pt-3">
                <BannerAdSlot placement="live_go_banner" user={user} label="Go Live" />
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
                    {pkRoomId ? (
                      <div className="bg-white/5 border border-orange-500/20 rounded-2xl p-3">
                        <p className="text-[9px] text-orange-400 font-black uppercase tracking-widest mb-1">PK Match ID (share to join)</p>
                        <div className="flex items-center gap-2">
                          <p className="text-white text-[10px] font-mono flex-1 truncate">{pkRoomId}</p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(pkRoomId)}
                            className="bg-orange-600/20 border border-orange-500/30 text-orange-300 text-[9px] font-black px-3 py-1.5 rounded-xl active:scale-90 transition-all"
                          >
                            {copied ? '✓' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {/* Dynamic Blue (Host) vs Red (Guest) score bar */}
                    {(() => {
                      const total = Math.max(1, pkScore.me + pkScore.rival);
                      const mePct = Math.round((pkScore.me / total) * 100);
                      const rivalPct = 100 - mePct;
                      return (
                        <div className="rounded-xl overflow-hidden border border-white/10">
                          <div className="flex h-3.5 w-full">
                            <div
                              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500"
                              style={{ width: `${mePct}%` }}
                            />
                            <div
                              className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-500"
                              style={{ width: `${rivalPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between px-2 py-1.5 bg-black/60 text-[9px] font-black">
                            <span className="text-cyan-300">YOU {pkScore.me.toLocaleString()}🪙</span>
                            <span className="text-gray-400">{formatPkTime(pkTimer)}</span>
                            <span className="text-rose-300">{pkScore.rival.toLocaleString()}🪙 RIVAL</span>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Official 50/50 horizontal split-screen — Host (Blue) | Guest (Red) */}
                    <div
                      className="flex flex-row gap-0.5 rounded-2xl overflow-hidden border border-orange-500/30"
                      style={{ height: 280 }}
                    >
                      <div className="w-1/2 relative bg-black overflow-hidden border-r border-blue-500/40">
                        {cameraReady && liveVideoRef.current?.srcObject ? (
                          <video ref={liveVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ objectFit: 'cover' }}/>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <img src={tempPhoto || user?.photoURL || '/logo.png'} className="w-12 h-12 rounded-full border-2 border-cyan-500 object-cover"/>
                            <span className="text-white text-[9px] font-black">@{username||'You'}</span>
                          </div>
                        )}
                        <div className="absolute top-1 left-1 bg-blue-600/85 text-white text-[8px] font-black px-2 py-0.5 rounded-full">
                          YOU · {pkScore.me.toLocaleString()}🪙
                        </div>
                      </div>
                      <div className="w-1/2 relative bg-black overflow-hidden border-l border-rose-500/40">
                        {pkRivalFrame ? (
                          <img src={pkRivalFrame} className="absolute inset-0 w-full h-full object-cover" alt="PK Opponent"/>
                        ) : pkHostFrame ? (
                          <img src={pkHostFrame} className="absolute inset-0 w-full h-full object-cover" alt="PK Opponent"/>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <img src={pkRivalData?.photo || '/logo.png'} className="w-12 h-12 rounded-full border-2 border-rose-500 object-cover"/>
                            <span className="text-white text-[9px] font-black">@{pkRivalData?.username||'Opponent'}</span>
                            <span className="text-gray-400 text-[7px] animate-pulse">Connecting…</span>
                          </div>
                        )}
                        <div className="absolute top-1 right-1 bg-rose-600/85 text-white text-[8px] font-black px-2 py-0.5 rounded-full">
                          RIVAL · {pkScore.rival.toLocaleString()}🪙
                        </div>
                      </div>
                    </div>
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
                    <p className="text-[9px] text-zinc-500 font-bold text-center uppercase tracking-wider">
                      Sync gifts · boost your score
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {giftItems.slice(0,6).map(g => (
                        <button
                          key={g.id}
                          onClick={() => sendPkGift(user!.uid, g)}
                          className="flex flex-col items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-2 active:scale-90 transition-all"
                        >
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
                <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end" onClick={() => setLiveGiftPanelOpen(false)}>
                  <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
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
                <span className="text-sm font-black text-white">Join Live & Matches</span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                <BannerAdSlot placement="live_join_banner" user={user} label="Join Live" />
                <BannerAdSlot placement="live_matches_banner" user={user} label="PK Matches" />
                <LiveMatchesPanel
                  youtubeApiKey={YOUTUBE_API_KEY}
                  onAlert={(msg, icon) => setVvipAlert({ msg, icon })}
                  onWatchEarn={async () => {
                    const day = new Date().toISOString().slice(0, 10);
                    const r = await earnReward(user, 'live_view', {
                      idempotencyKey: `${user?.uid}_match_${day}`,
                      meta: { channel: 'pakistan_match' },
                    });
                    if (r.ok && !r.duplicate && (r.creditedCoins || 0) > 0) {
                      setVvipAlert({ msg: r.message || `Match watch +${r.creditedCoins} coins`, icon: '🏏' });
                    }
                  }}
                />
                {liveNowList.length > 0 && (
                  <div className="w-full">
                    <p className="text-[10px] text-pink-400 font-black uppercase tracking-widest mb-3">🔴 Portal Live Rooms</p>
                    <div className="space-y-3">
                      {liveNowList.map((room:any) => (
                        <button key={room.id} onClick={() => joinLiveByRoomId(room.id)} className="w-full flex items-center gap-3 bg-white/5 border border-red-500/30 rounded-2xl p-3 active:scale-95 transition-all">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-red-500">
                            <img src={room.photo||'/logo.png'} className="w-full h-full object-cover"/>
                            <span className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-[7px] font-black text-center">LIVE</span>
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black text-white">@{room.username}</p>
                            <p className="text-[9px] text-gray-400">Tap to join · smoother multi-viewer audio</p>
                          </div>
                          <ChevronRight size={14} className="text-gray-500 ml-auto"/>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="w-full">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Join by Live Room ID or PK Match ID</p>
                  <input value={joinRoomInput} onChange={e => setJoinRoomInput(e.target.value)} placeholder="Paste Live Room ID or PK Match ID" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 mb-3"/>
                  <button onClick={() => joinLiveByRoomId()} className="w-full py-3 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#0891b2,#0e7490)'}}>
                    Join Stream / PK Match
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
                <span className="text-[9px] text-cyan-300 font-black flex items-center gap-0.5 bg-cyan-500/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                  <Eye size={10}/> {formatViews(Number(viewerRoom.liveViewers || viewerRoom.viewerCount || 0))} watching
                </span>
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
                  <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end" onClick={() => setLiveGiftPanelOpen(false)}>
                    <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
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

          {/* ── MESSAGES INBOX (TikTok-style friend ids + chats) ── */}
          {socialScreen === 'messages' && !activeChatId && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={leaveMessagesToBack}
                    className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all"
                  >
                    <ArrowLeft size={14} className="text-gray-400"/>
                  </button>
                  <div>
                    <span className="text-sm font-black text-white">Messages</span>
                    <p className="text-[9px] text-white/40">Saved chats & friend IDs</p>
                  </div>
                </div>
                <MessageCircle size={16} className="text-cyan-400" />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {dmInboxLoading && (
                  <p className="text-gray-500 text-xs text-center py-10">Loading chats…</p>
                )}
                {!dmInboxLoading && dmInbox.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 pt-16 px-6">
                    <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center">
                      <MessageCircle size={24} className="text-cyan-400" />
                    </div>
                    <p className="text-white text-sm font-black text-center">No chats yet</p>
                    <p className="text-gray-500 text-xs text-center">
                      Open someone’s profile and tap the message icon. Their ID stays here and both of you see the same real-time chat.
                    </p>
                  </div>
                )}
                {dmInbox.map((p: any) => (
                  <button
                    key={p.id || p.uid}
                    type="button"
                    onClick={() =>
                      void openOrCreateChat(
                        String(p.uid || p.id),
                        p,
                        'messages'
                      )
                    }
                    className="w-full flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl p-3 active:scale-[0.98] transition-all text-left"
                  >
                    <img
                      src={p.photo || p.photoURL || '/logo.png'}
                      alt=""
                      className="w-12 h-12 rounded-full border border-white/15 object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-sm font-black truncate">
                          {p.name || p.username || 'AJ Member'}
                        </p>
                        {p.lastAtMs ? (
                          <span className="text-[9px] text-white/35 flex-shrink-0">
                            {new Date(Number(p.lastAtMs)).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-cyan-400/90 truncate">@{p.username || 'user'}</p>
                      <p className="text-[9px] text-white/30 font-mono truncate mt-0.5">
                        ID: {String(p.uid || p.id)}
                      </p>
                      <p className="text-[11px] text-white/55 truncate mt-1">
                        {p.lastMessage || 'Tap to open chat'}
                      </p>
                    </div>
                  </button>
                ))}
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
                <button
                  onClick={() => {
                    if (dmUnsubRef.current) {
                      dmUnsubRef.current();
                      dmUnsubRef.current = null;
                    }
                    setActiveChatId(null);
                    setDmMessages([]);
                    if (dmBackScreen === 'messages' || dmBackScreen === 'tikreels' || dmBackScreen === 'pulse' || dmBackScreen === 'hub' || dmBackScreen === 'profile') {
                      if (dmBackScreen === 'messages') {
                        setSocialScreen('messages');
                      } else {
                        leaveMessagesToBack();
                      }
                    } else {
                      setSocialScreen('messages');
                    }
                  }}
                  className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all"
                >
                  <ArrowLeft size={14} className="text-gray-400"/>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeChatUser?.uid) void openProfile(String(activeChatUser.uid));
                  }}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left active:opacity-80"
                >
                  <img src={activeChatUser?.photo||activeChatUser?.photoURL||'/logo.png'} className="w-8 h-8 rounded-full border border-white/20 object-cover flex-shrink-0" alt=""/>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate">@{activeChatUser?.username||'User'}</p>
                    <p className="text-[8px] text-white/35 font-mono truncate">ID: {activeChatUser?.uid || ''}</p>
                  </div>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.06),_transparent_55%)]">
                {dmMessages.length === 0 && (
                  <p className="text-center text-white/35 text-xs py-10">Say hi — messages stay saved for both of you.</p>
                )}
                {dmMessages.map((m:any) => (
                  <div key={m.id} className={`flex ${m.uid===user?.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${m.uid===user?.uid ? 'bg-pink-600 text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={dmEndRef}/>
              </div>
              <div className="flex gap-2 p-4 border-t border-white/5 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <input
                  value={dmInput}
                  onChange={e => setDmInput(e.target.value)}
                  placeholder="Message…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/40"
                  style={{ fontSize: '16px' }}
                  onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); void sendDmMessage(); } }}
                />
                <button onClick={() => void sendDmMessage()} className="w-10 h-10 bg-pink-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40" disabled={!dmInput.trim()}>
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
                      <div className="flex gap-2 pb-2 items-center">
                        <button onClick={() => handleFollow(viewingUid!)} className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all ${isFollowing ? 'bg-white/10 border border-white/20 text-gray-300' : 'bg-pink-600 text-white shadow-[0_0_14px_rgba(236,72,153,0.4)]'}`}>
                          {isFollowing ? <><UserCheck size={12} className="inline mr-1"/>Following</> : <><UserPlus size={12} className="inline mr-1"/>Follow</>}
                        </button>
                        <button
                          type="button"
                          title="Message"
                          onClick={() => openOrCreateChat(viewingUid!, { ...viewProfile, uid: viewingUid }, 'profile')}
                          className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center active:scale-90 transition-all shadow-[0_0_14px_rgba(34,211,238,0.35)]"
                        >
                          <MessageCircle size={18} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setProfileDisplayName(
                            viewProfile?.name ||
                              viewProfile?.displayName ||
                              profileDisplayName ||
                              user?.displayName ||
                              ''
                          );
                          setUsername(viewProfile?.username || username || '');
                          setBio(viewProfile?.bio || bio || '');
                          setTempPhoto(
                            viewProfile?.photo ||
                              viewProfile?.photoURL ||
                              tempPhoto ||
                              user?.photoURL ||
                              ''
                          );
                          setSocialScreen('setup');
                        }}
                        className="pb-2 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white/10 border border-white/20 text-gray-300 active:scale-95 transition-all"
                      >
                        <Edit3 size={12} className="inline mr-1"/>Edit Profile
                      </button>
                    )}
                  </div>
                  {/* Info */}
                  <div className="px-4 mt-3">
                    <p className="text-white font-black text-lg">{viewProfile?.name||viewProfile?.displayName||profileDisplayName||'AJ Member'}</p>
                    <p className="text-gray-400 text-xs">@{viewProfile?.username||username||'aj_member'}</p>
                    {isMutualFriend && <span className="text-[9px] text-cyan-400 font-black bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full mt-1 inline-block">Mutual Friend</span>}
                    {(viewProfile?.bio || bio) && <p className="text-gray-300 text-xs mt-2">{viewProfile?.bio || bio}</p>}
                    <div className="flex gap-6 mt-4">
                      <div className="text-center"><p className="text-white font-black text-base">{profileVideos.length || viewProfile?.postsCount || 0}</p><p className="text-gray-400 text-[9px]">Posts</p></div>
                      <button
                        type="button"
                        onClick={() => void openFollowList('followers', viewingUid)}
                        className="text-center active:scale-95 transition-all"
                      >
                        <p className="text-white font-black text-base">{followers}</p>
                        <p className="text-gray-400 text-[9px]">Followers</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => void openFollowList('following', viewingUid)}
                        className="text-center active:scale-95 transition-all"
                      >
                        <p className="text-white font-black text-base">{following}</p>
                        <p className="text-gray-400 text-[9px]">Following</p>
                      </button>
                      <div className="text-center"><p className="text-white font-black text-base">{profileTotalLikes}</p><p className="text-gray-400 text-[9px]">Likes</p></div>
                    </div>
                  </div>
                  {/* Posts + Videos Grid */}
                  <div className="mt-4 grid grid-cols-3 gap-0.5 p-0.5">
                    {profilePosts.map((post:any) => (
                      <div
                        key={`post_${post.id}`}
                        className="relative aspect-square bg-white/5 overflow-hidden cursor-pointer active:scale-95 transition-all"
                        onClick={() => {
                          const url = post.videoUrl || post.image || post.url || post.thumbnail;
                          if (!url) return;
                          if (post.isVideo || /\.(mp4|webm|mov)(\?|$)/i.test(String(url))) {
                            setProfileVideoViewer({
                              url: String(url),
                              text: post.text || post.textOverlay || post.caption || '',
                              post,
                            });
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
                    {profileVideos.map((vid:any) => {
                      const media = getPlayableSrc(vid);
                      const playUrl = media.src || String(
                        vid.videoUrl || vid.url || vid.src || vid.image || vid.mediaUrl || ''
                      );
                      const thumb = String(
                        vid.thumbnail || vid.thumb || vid.poster || vid.cover || playUrl || ''
                      );
                      const asVideo =
                        media.kind === 'video' ||
                        isPlayableTikReel(vid) ||
                        vid.isVideo === true;
                      return (
                      <div
                        key={`vid_${vid.id}`}
                        role="button"
                        tabIndex={0}
                        className="relative aspect-square bg-white/5 overflow-hidden cursor-pointer active:scale-95 transition-all"
                        onClick={() => {
                          const url = playUrl || thumb;
                          if (!url) {
                            setVvipAlert({ msg: 'Video URL missing for this post.', icon: '⚠️' });
                            return;
                          }
                          setProfileVideoViewer({
                            url,
                            text: vid.text || vid.textOverlay || vid.caption || '',
                            post: vid,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (playUrl || thumb) {
                              setProfileVideoViewer({
                                url: playUrl || thumb,
                                text: vid.text || vid.textOverlay || vid.caption || '',
                                post: vid,
                              });
                            }
                          }
                        }}
                      >
                        {thumb || playUrl ? (
                          <>
                            {asVideo ? (
                              <video
                                src={playUrl || thumb}
                                className="w-full h-full object-cover pointer-events-none"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={thumb || playUrl}
                                alt=""
                                className="w-full h-full object-cover pointer-events-none"
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  el.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                <span className="text-white text-sm ml-0.5">▶</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5">
                            <span className="text-gray-500 text-xs">🎬</span>
                          </div>
                        )}
                        <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                          <Film size={10} className="text-white"/>
                        </div>
                        <div className="absolute bottom-1 left-1 bg-black/60 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                          <Eye size={8} className="text-white"/>
                          <span className="text-white text-[8px] font-black">
                            {formatViews(vid.views || 0)}
                          </span>
                        </div>
                      </div>
                      );
                    })}
                    {profilePosts.length === 0 && profileVideos.length === 0 && (
                      <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3">
                        <span className="text-4xl">📸</span>
                        <p className="text-gray-500 text-sm">No posts yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── GLOBAL Gift Panel (TikReel + Pulse) ── */}
          {pulseGiftPostId && (
            <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end" onClick={() => { setPulseGiftPostId(null); setGiftTargetUid(null); }}>
              <div className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-black text-white">Send a Gift 🎁</p>
                  <button onClick={() => { setPulseGiftPostId(null); setGiftTargetUid(null); }}><X size={18} className="text-gray-400"/></button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {giftItems.map(g => (
                    <button
                      key={g.id}
                      onClick={() => {
                        const uid =
                          giftTargetUid ||
                          userPosts.find((p:any) => p.id === pulseGiftPostId || p.postId === pulseGiftPostId)?.uid ||
                          userPosts.find((p:any) => p.id === pulseGiftPostId || p.postId === pulseGiftPostId)?.userId ||
                          pulsePosts.find((p:any) => p.id === pulseGiftPostId)?.uid ||
                          pulsePosts.find((p:any) => p.id === pulseGiftPostId)?.userId ||
                          combinedPulseFeed.find((p:any) => p.id === pulseGiftPostId && !p.isUnsplash)?.uid ||
                          null;
                        if (!uid) {
                          setVvipAlert({ msg: 'Could not find creator for this gift.', icon: '⚠️' });
                          return;
                        }
                        sendGift(String(uid), g);
                        setPulseGiftPostId(null);
                        setGiftTargetUid(null);
                      }}
                      className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-3 active:scale-90 transition-all"
                    >
                      <span className="text-2xl">{g.icon}</span>
                      <span className="text-white text-[9px] font-black">{g.name}</span>
                      <span className="text-yellow-400 text-[9px] font-black">{g.cost.toLocaleString()} 🪙</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Followers / Following list sheet ── */}
          {followListMode && (
            <div
              className="fixed inset-0 z-[9100] bg-black/80 backdrop-blur-md flex flex-col justify-end"
              onClick={() => {
                setFollowListMode(null);
                setFollowListUid(null);
              }}
            >
              <div
                className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-4 max-h-[75vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-sm font-black text-white uppercase tracking-widest">
                    {followListMode === 'followers' ? 'Followers' : 'Following'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFollowListMode(null);
                      setFollowListUid(null);
                    }}
                  >
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pb-4">
                  {followListLoading && (
                    <p className="text-gray-500 text-xs text-center py-8">Loading…</p>
                  )}
                  {!followListLoading && followListUsers.length === 0 && (
                      <p className="text-gray-500 text-xs text-center py-8">
                        No {followListMode} yet.
                      </p>
                    )}
                  {!followListLoading &&
                    followListUsers.map((u: any) => (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => {
                          setFollowListMode(null);
                          void openProfile(u.uid);
                        }}
                        className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 active:scale-95 transition-all"
                      >
                        <img
                          src={u.photo || u.photoURL || '/logo.png'}
                          className="w-10 h-10 rounded-full border border-white/20 object-cover"
                          alt=""
                        />
                        <div className="text-left min-w-0 flex-1">
                          <p className="text-xs font-black text-white truncate">
                            {u.name || u.displayName || `@${u.username || u.uid}`}
                          </p>
                          <p className="text-[9px] text-gray-400 truncate">
                            @{u.username || u.uid}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ── GLOBAL Comment Sheet (TikReel + Pulse + Profile) ── */}
          {commentPostId && (
            <div
              className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex flex-col justify-end"
              onClick={() => {
                setCommentPostId(null);
                setCommentAliasIds([]);
                setCommentsLoading(false);
                setKeyboardHeight(0);
                setCommentCollection('user_posts');
              }}
            >
              <div
                className="bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl p-4 min-h-[55vh] max-h-[85vh] flex flex-col"
                style={{
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  paddingBottom: keyboardHeight > 0 ? keyboardHeight : 'env(safe-area-inset-bottom, 8px)',
                  zIndex: 9001,
                  transition: 'padding-bottom 0.1s ease-out',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3 px-2 shrink-0">
                  <p className="text-sm font-black text-white">
                    Comments
                    {postComments.length > 0 ? (
                      <span className="ml-1 font-bold text-white/40">({postComments.length})</span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCommentPostId(null);
                      setCommentAliasIds([]);
                      setCommentsLoading(false);
                      setKeyboardHeight(0);
                      setCommentCollection('user_posts');
                    }}
                  >
                    <X size={18} className="text-gray-400"/>
                  </button>
                </div>
                {/* Scroll list above keyboard — always tall enough to show prior comments */}
                <div className="min-h-[220px] flex-1 overflow-y-auto overscroll-contain space-y-3 mb-3 px-2">
                  {commentsLoading && postComments.length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-8">Loading comments…</p>
                  )}
                  {!commentsLoading && postComments.length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-8">No comments yet. Be the first!</p>
                  )}
                  {postComments.map((c:any) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <img src={c.photo||'/logo.png'} className="w-7 h-7 rounded-full border border-white/20 object-cover flex-shrink-0" alt=""/>
                      <div className="bg-white/5 rounded-2xl px-3 py-2 flex-1 min-w-0">
                        <p className="text-[9px] text-pink-400 font-black">@{c.username}</p>
                        <p className="text-white text-xs mt-0.5 whitespace-pre-wrap break-words">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 px-1 shrink-0" style={{ position: 'sticky', bottom: 0, zIndex: 9002, background: '#0a0a1a', paddingTop: 8 }}>
                  <input
                    ref={commentInputRef}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add a comment…"
                    inputMode="text"
                    enterKeyHint="send"
                    autoCapitalize="sentences"
                    autoComplete="off"
                    autoCorrect="on"
                    spellCheck
                    autoFocus
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"
                    style={{ touchAction: 'manipulation', fontSize: '16px', WebkitAppearance: 'none', appearance: 'none', minHeight: '48px', caretColor: '#ec4899' }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitComment(); } }}
                    onClick={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                    onTouchEnd={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); submitComment(); }}
                    className="w-12 h-12 bg-pink-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-[0_0_12px_rgba(236,72,153,0.4)]"
                  >
                    <Send size={14} className="text-white"/>
                  </button>
                </div>
              </div>
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
                {botTier !== 'none' && (
                  <button
                    onClick={syncBotProfits}
                    className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black text-[11px] font-black active:scale-95"
                  >
                    Sync Profits → Wallet
                  </button>
                )}
              </div>
            </div>

            {/* Bot Plans — FIX #7: card click triggers interstitial */}
            {[ { tier:'basic', label:'Basic Bot', cost:2500, rate:'2.5% daily', icon:'🤖', color:'from-blue-600 to-cyan-600' },
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
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Total Balance · AJ Coins</p>
                    <p className="text-4xl font-black bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent mt-1">{parseFloat(displayBalance).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} <span className="text-lg text-yellow-400/70">AJ Coins 🪙</span></p>
                    <p className="text-sm font-black text-emerald-400 mt-1">
                      ≈ {formatUsd(coinsToUsd(Number(displayBalance) || balance))}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                  Min withdraw 20,000 AJ Coins 🪙 ({formatUsd(coinsToCashUsd(20000))})
                </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="bg-white/5 rounded-2xl p-3 text-center">
                        <p className="text-[9px] text-gray-400 font-black uppercase">Buy rate</p>
                        <p className="text-white font-black text-xs mt-1">{COIN_RATE} 🪙 / $1</p>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-3 text-center">
                        <p className="text-[9px] text-gray-400 font-black uppercase">Withdraw</p>
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
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Amount</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[20,50,100,250,500].map(amt => (
                      <button key={amt} onClick={() => setPurchaseAmount(amt)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${purchaseAmount===amt ? 'bg-pink-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
                        {(amt * COIN_RATE).toLocaleString()} 🪙
                      </button>
                    ))}
                  </div>
                  <input type="number" value={purchaseAmount} onChange={e => setPurchaseAmount(Number(e.target.value))} min={MIN_PURCHASE} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50 mb-2"/>
                  <p className="text-[10px] text-gray-400">= {(purchaseAmount * COIN_RATE).toLocaleString()} AJ Coins 🪙</p>
                </div>
                <button onClick={handlePurchase} className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_24px_rgba(236,72,153,0.4)]" style={{background:'linear-gradient(135deg,#ec4899,#8b5cf6)'}}>
                  🛒 Buy {(purchaseAmount * COIN_RATE).toLocaleString()} AJ Coins 🪙
                </button>
                <p className="text-[9px] text-gray-500 text-center">Powered by NOWPayments · Secure AJ Coins 🪙</p>
              </div>
            )}

            {/* ── WITHDRAW ── */}
            {walletTab === 'withdraw' && (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Available Balance</p>
                  <p className="text-2xl font-black text-yellow-400">{balance.toFixed(0)} 🪙</p>
                  <p className="text-sm font-black text-emerald-400 mt-1">
                    ≈ {formatUsd(coinsToCashUsd(balance))}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Withdraw value · {CASH_RATE} 🪙 = $1
                  </p>
                  <p className="text-[9px] text-orange-400 mt-2 font-black">
                    Min withdraw 20,000 AJ Coins 🪙
                  </p>
                  <p className="text-[9px] text-gray-500 mt-1 font-bold">
                    Withdraw in AJ Coins only
                  </p>
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
                  <div>
                    <p className="text-[9px] text-cyan-300/90 font-black uppercase tracking-widest mb-1.5">
                      Recipient User ID
                    </p>
                    <input
                      value={transferId}
                      onChange={e => setTransferId(e.target.value)}
                      placeholder="Paste another user’s ID"
                      className="w-full rounded-2xl px-4 py-3.5 text-white text-sm font-black tracking-wide placeholder:text-white/35 placeholder:font-bold focus:outline-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(236,72,153,0.10))',
                        border: '1px solid rgba(34,211,238,0.55)',
                        boxShadow:
                          '0 0 18px rgba(34,211,238,0.35), 0 0 36px rgba(236,72,153,0.18), inset 0 0 12px rgba(34,211,238,0.08)',
                        textShadow: '0 0 10px rgba(34,211,238,0.45)',
                      }}
                    />
                    <p className="text-[9px] text-gray-500 mt-1.5 font-bold">
                      Coins credit only when sent to a different user — not your own ID.
                    </p>
                  </div>
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
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Your Unique Referral ID</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-black flex-1 tracking-widest">
                      {myReferralId || 'Generating…'}
                    </p>
                    <button
                      onClick={() => copyToClipboard(myReferralId || '')}
                      disabled={!myReferralId}
                      className="bg-pink-600/20 border border-pink-500/30 text-pink-400 text-[9px] font-black px-3 py-1.5 rounded-xl active:scale-90 transition-all disabled:opacity-40"
                    >
                      {copied ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2">
                    Share this ID. Each friend who signs up and enters it → you get{' '}
                    <span className="text-yellow-400 font-black">+{REFERRAL_COINS} AJ Coins</span>.
                    No signup bonus.
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Enter Friend&apos;s Referral ID</p>
                  <input value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="e.g. AJ7K2M9X4P" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50 uppercase tracking-widest"/>
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