import './globals.css'
import { Space_Grotesk, Syne } from 'next/font/google'
import Script from 'next/script'

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
 * ONLY allowed ad SDK: Monetag zone 11377822 (loaded on demand with data-sdk).
 * Deletes/blocks sunny-sprout / gozen / alwingulla / popunder / push / omg10.
 * No automatic redirects from intrusive ad networks.
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
                'omg10.com','push.min.js','push.js','in-page-push','inpagepush','popunder',
                'multi-tag','multitag','smartlink','smart-tag','propeller','notification.js','onclicka'
              ];
              var BLOCKED_OPEN = [
                'tag.gozen.com','gozen.com','alwingulla.com','sunny-sprout.org','sunnysprout','omg10.com'
              ];
              function isBlockedSrc(src) {
                src = (src || '').toLowerCase();
                for (var i = 0; i < BLOCKED_SRC.length; i++) {
                  if (src.indexOf(BLOCKED_SRC[i]) !== -1) return true;
                }
                if (src.indexOf('nap5k.com') !== -1) return true; // bare Monetag checked with attrs below
                return false;
              }
              function allowMonetag(el, src) {
                var zone = el.getAttribute('data-zone') || '';
                return el.hasAttribute('data-sdk') && src.indexOf('nap5k.com') !== -1 && zone === '11377822';
              }
              function scrubScripts() {
                try {
                  document.querySelectorAll('script[src]').forEach(function (el) {
                    var src = (el.getAttribute('src') || '').toLowerCase();
                    if (allowMonetag(el, src)) return;
                    if (isBlockedSrc(src) || (src.indexOf('nap5k.com') !== -1 && !el.hasAttribute('data-sdk'))) {
                      try { el.remove(); } catch (e) {}
                    }
                  });
                } catch (e2) {}
              }
              function scrubIframes() {
                try {
                  document.querySelectorAll('iframe[src]').forEach(function (el) {
                    var src = (el.getAttribute('src') || '').toLowerCase();
                    for (var i = 0; i < BLOCKED_OPEN.length; i++) {
                      if (src.indexOf(BLOCKED_OPEN[i]) !== -1) {
                        try { el.remove(); } catch (e) {}
                        return;
                      }
                    }
                  });
                } catch (e3) {}
              }
              try {
                var _open = window.open;
                window.open = function (url, name, specs) {
                  var href = String(url || '').toLowerCase();
                  for (var i = 0; i < BLOCKED_OPEN.length; i++) {
                    if (href.indexOf(BLOCKED_OPEN[i]) !== -1) {
                      console.warn('[AJ] blocked popunder', href.slice(0, 100));
                      return null;
                    }
                  }
                  return _open.call(window, url, name, specs);
                };
              } catch (e4) {}
              try { window.onbeforeunload = null; } catch (e5) {}
              if (!document.getElementById('aj-kill-intrusive-css')) {
                var style = document.createElement('style');
                style.id = 'aj-kill-intrusive-css';
                style.textContent = [
                  '[class*="push-notification"],[class*="push_notification"],[class*="in-page-push"],',
                  '[class*="inpagepush"],[id*="push-notification"],[id*="in-page-push"],',
                  'iframe[src*="push"],iframe[src*="inpage"],iframe[src*="ipp"],',
                  'iframe[src*="gozen"],iframe[src*="alwingulla"],iframe[src*="sunny-sprout"],',
                  'iframe[src*="omg10"]{display:none!important;visibility:hidden!important;',
                  'pointer-events:none!important;opacity:0!important;}'
                ].join('');
                (document.head || document.documentElement).appendChild(style);
              }
              function scrub() { scrubScripts(); scrubIframes(); try { window.onbeforeunload = null; } catch (e6) {} }
              scrub();
              setInterval(scrub, 600);
              document.addEventListener('DOMContentLoaded', scrub);
              try {
                new MutationObserver(scrub).observe(document.documentElement, { childList: true, subtree: true });
              } catch (e7) {}
            })();
          `}
        </Script>
        <Script id="aj-sdk-init" strategy="afterInteractive">
          {`
            if (!window.AJ_SDK) {
              window.AJ_SDK = {
                directLink: '',
                showAd: function() { console.log("SDK: showAd (local only)"); },
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
              window.AJ_SDK.directLink = '';
              window.AJ_SDK.sendScore = function() { console.log("SDK: sendScore ignored — no wallet credit"); };
              window.AJ_SDK.addBalance = function() { console.log("SDK: addBalance ignored — no wallet credit"); };
              if (typeof window.AJ_SDK.reportLevel !== 'function') {
                window.AJ_SDK.reportLevel = function(gameId, level) {
                  try {
                    if (window.parent && window.parent !== window) {
                      window.parent.postMessage({ type: 'GAME_LEVEL_REACHED', gameId: gameId, level: level }, '*');
                    }
                  } catch (e) {}
                };
              }
            }
            (function () {
              var FAKE_TOAST = [
                'you have 1 new message','new message!','demo account','$50,000',
                '50000 credited','50,000 credited','credited to your demo'
              ];
              function scrubFakeToasts() {
                try {
                  if (!document.body) return;
                  var nodes = document.body.querySelectorAll('div,aside,section,span,p');
                  for (var i = 0; i < nodes.length; i++) {
                    var el = nodes[i];
                    if (!(el instanceof HTMLElement)) continue;
                    var t = (el.textContent || '').toLowerCase();
                    if (!t || t.length > 420) continue;
                    var hit = false;
                    for (var j = 0; j < FAKE_TOAST.length; j++) {
                      if (t.indexOf(FAKE_TOAST[j]) !== -1) { hit = true; break; }
                    }
                    if (!hit) continue;
                    try { el.remove(); } catch (e3) {}
                  }
                  document.querySelectorAll('#grip_wall,#InlineBoxMainOuterLayer,#main_back,#main_div').forEach(function (n) {
                    try { n.remove(); } catch (e4) {}
                  });
                  try { window.onbeforeunload = null; } catch (e5) {}
                } catch (e6) {}
              }
              scrubFakeToasts();
              setInterval(scrubFakeToasts, 700);
              try {
                new MutationObserver(scrubFakeToasts).observe(document.documentElement, { childList: true, subtree: true });
              } catch (e7) {}
            })();
          `}
        </Script>
      </head>
      <body
        className={`${bodyFont.className} antialiased bg-[#050505] text-white`}
        style={{ fontFamily: 'var(--font-aj-body), system-ui, sans-serif' }}
      >
        {children}
      </body>
    </html>
  )
}
