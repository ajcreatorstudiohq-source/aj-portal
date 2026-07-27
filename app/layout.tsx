import './globals.css'
import { Space_Grotesk, Syne } from 'next/font/google'
import Script from 'next/script'
import {
  ADSTERRA_NATIVE_BANNER_SRC,
  ADSTERRA_REWARDED_LINK,
  ADSTERRA_SOCIAL_BAR_SRC,
} from './lib/ads-config'

const bodyFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-aj-body',
})
const displayFont = Syne({
  subsets: ['latin'],
  variable: '--font-aj-display',
})

export const metadata = {
  title: 'AJ Super Portal',
  description: 'Offer Hub · Earn AJ Coins · Live PK · Premium Dark GPT Hub',
}

/**
 * Root layout — premium dark shell.
 * Ads: Adsterra Social Bar + Native Banner only (no Monetag).
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <head>
        <Script src="/aj-sdk.js" strategy="beforeInteractive" />
        <Script id="aj-kill-intrusive-ads" strategy="beforeInteractive">
          {`
            (function () {
              var BLOCKED_SRC = [
                'tag.gozen.com','gozen.com','alwingulla.com','sunny-sprout.org','sunnysprout',
                'nap5k.com','monetag','al5sm.com','n6wxm.com','quge5.com','omg10.com',
                'push.min.js','push.js','in-page-push','inpagepush','popunder',
                'multi-tag','multitag','smartlink','smart-tag','propeller','notification.js','onclicka'
              ];
              var BLOCKED_OPEN = [
                'tag.gozen.com','gozen.com','alwingulla.com','sunny-sprout.org','sunnysprout',
                'nap5k.com','monetag','omg10.com'
              ];
              var FAKE_TOAST = [
                'you have 1 new message','new message!','demo account','$50,000',
                '50000 credited','50,000 credited','credited to your demo','$50k'
              ];
              function isBlockedSrc(src) {
                src = (src || '').toLowerCase();
                for (var i = 0; i < BLOCKED_SRC.length; i++) {
                  if (src.indexOf(BLOCKED_SRC[i]) !== -1) return true;
                }
                return false;
              }
              function allowAdsterra(src) {
                return (src || '').toLowerCase().indexOf('effectivecpmnetwork.com') !== -1;
              }
              function scrubScripts() {
                try {
                  document.querySelectorAll('script[src]').forEach(function (el) {
                    var src = (el.getAttribute('src') || '').toLowerCase();
                    if (allowAdsterra(src)) return;
                    if (isBlockedSrc(src)) {
                      try { el.remove(); } catch (e) {}
                    }
                  });
                } catch (e2) {}
              }
              function scrubFakeToasts() {
                try {
                  if (!document.body) return;
                  var nodes = document.body.querySelectorAll('div,aside,section,span,p');
                  for (var i = 0; i < nodes.length; i++) {
                    var el = nodes[i];
                    if (!(el instanceof HTMLElement)) continue;
                    var t = (el.textContent || '').toLowerCase();
                    if (!t || t.length > 420) continue;
                    for (var j = 0; j < FAKE_TOAST.length; j++) {
                      if (t.indexOf(FAKE_TOAST[j]) !== -1) {
                        try { el.remove(); } catch (e3) {}
                        break;
                      }
                    }
                  }
                  document.querySelectorAll('#grip_wall,#InlineBoxMainOuterLayer,#main_back,#main_div').forEach(function (n) {
                    try { n.remove(); } catch (e4) {}
                  });
                  try { window.onbeforeunload = null; } catch (e5) {}
                } catch (e6) {}
              }
              try {
                var _open = window.open;
                window.open = function (url, name, specs) {
                  var href = String(url || '').toLowerCase();
                  if (allowAdsterra(href) || href.indexOf('ridefiles.net') !== -1 || href.indexOf('bitlabs') !== -1) {
                    return _open.call(window, url, name, specs);
                  }
                  for (var i = 0; i < BLOCKED_OPEN.length; i++) {
                    if (href.indexOf(BLOCKED_OPEN[i]) !== -1) {
                      console.warn('[AJ] blocked popunder', href.slice(0, 100));
                      return null;
                    }
                  }
                  return _open.call(window, url, name, specs);
                };
              } catch (e7) {}
              if (!document.getElementById('aj-kill-intrusive-css')) {
                var style = document.createElement('style');
                style.id = 'aj-kill-intrusive-css';
                style.textContent = [
                  '[class*="push-notification"],[class*="push_notification"],[class*="in-page-push"],',
                  '[class*="inpagepush"],[id*="push-notification"],[id*="in-page-push"],',
                  'iframe[src*="push"],iframe[src*="inpage"],iframe[src*="ipp"],',
                  'iframe[src*="gozen"],iframe[src*="alwingulla"],iframe[src*="sunny-sprout"],',
                  'iframe[src*="nap5k"],iframe[src*="monetag"],iframe[src*="omg10"]{',
                  'display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;}'
                ].join('');
                (document.head || document.documentElement).appendChild(style);
              }
              function scrub() { scrubScripts(); scrubFakeToasts(); }
              scrub();
              setInterval(scrub, 700);
              document.addEventListener('DOMContentLoaded', scrub);
              try {
                new MutationObserver(scrub).observe(document.documentElement, { childList: true, subtree: true });
              } catch (e8) {}
            })();
          `}
        </Script>
        <Script id="aj-sdk-init" strategy="afterInteractive">
          {`
            if (!window.AJ_SDK) {
              window.AJ_SDK = {
                directLink: ${JSON.stringify(ADSTERRA_REWARDED_LINK)},
                showAd: function() {
                  try { window.open(${JSON.stringify(ADSTERRA_REWARDED_LINK)}, '_blank', 'noopener,noreferrer'); } catch (e) {}
                },
                sendScore: function() { console.log("SDK: sendScore ignored — no wallet credit"); },
                addBalance: function() { console.log("SDK: addBalance ignored — no wallet credit"); },
                reportLevel: function(gameId, level) {
                  try {
                    if (window.parent && window.parent !== window) {
                      window.parent.postMessage({ type: 'GAME_LEVEL_REACHED', gameId: gameId, level: level }, '*');
                    }
                  } catch (e) {}
                }
              };
            } else {
              window.AJ_SDK.directLink = ${JSON.stringify(ADSTERRA_REWARDED_LINK)};
              window.AJ_SDK.showAd = function() {
                try { window.open(${JSON.stringify(ADSTERRA_REWARDED_LINK)}, '_blank', 'noopener,noreferrer'); } catch (e) {}
              };
              window.AJ_SDK.sendScore = function() { console.log("SDK: sendScore ignored — no wallet credit"); };
              window.AJ_SDK.addBalance = function() { console.log("SDK: addBalance ignored — no wallet credit"); };
            }
          `}
        </Script>
      </head>
      <body
        className={`${bodyFont.className} antialiased bg-[#050505] text-white`}
        style={{ fontFamily: 'var(--font-aj-body), system-ui, sans-serif' }}
      >
        {children}
        {/* Adsterra Native Banner invoke.js — container lives in TikReel/Pulse slots */}
        <Script
          src={ADSTERRA_NATIVE_BANNER_SRC}
          strategy="afterInteractive"
          data-adsterra="native-banner"
        />
        {/* Adsterra Social Bar — end of body */}
        <Script
          src={ADSTERRA_SOCIAL_BAR_SRC}
          strategy="afterInteractive"
          data-adsterra="social-bar"
        />
      </body>
    </html>
  )
}
