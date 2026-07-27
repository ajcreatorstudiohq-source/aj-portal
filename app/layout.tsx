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
  description: 'Gaming, Social and AI Hub',
}

/**
 * Root layout — premium dark shell.
 * ONLY allowed ad SDK: Monetag zone 11377822 (loaded on demand with data-sdk).
 * Blocks sunny-sprout / gozen / alwingulla / popunder / fake credit toasts.
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
        <Script id="aj-sdk-init" strategy="afterInteractive">
          {`
            if (!window.AJ_SDK) {
              window.AJ_SDK = {
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
              var BLOCKED_SRC = [
                'tag.gozen.com','gozen.com','alwingulla.com','sunny-sprout.org','sunnysprout',
                'push.min.js','push.js','in-page-push','inpagepush','popunder','multi-tag',
                'multitag','smartlink','smart-tag','propeller','notification.js','onclicka'
              ];
              var FAKE_TOAST = [
                'you have 1 new message','new message!','demo account','$50,000',
                '50000 credited','50,000 credited','credited to your demo'
              ];
              function scrubScripts() {
                try {
                  document.querySelectorAll('script[src]').forEach(function (el) {
                    var src = (el.getAttribute('src') || '').toLowerCase();
                    var zone = el.getAttribute('data-zone') || '';
                    if (el.hasAttribute('data-sdk') && src.indexOf('nap5k.com') !== -1 && zone === '11377822') return;
                    for (var i = 0; i < BLOCKED_SRC.length; i++) {
                      if (src.indexOf(BLOCKED_SRC[i]) !== -1) {
                        try { el.remove(); } catch (e) {}
                        return;
                      }
                    }
                    // Block bare Monetag tags without our zone data-sdk
                    if (src.indexOf('nap5k.com') !== -1 && !el.hasAttribute('data-sdk')) {
                      try { el.remove(); } catch (e0) {}
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
              function scrub() { scrubScripts(); scrubFakeToasts(); }
              if (!document.getElementById('aj-kill-fake-toasts')) {
                var style = document.createElement('style');
                style.id = 'aj-kill-fake-toasts';
                style.textContent = [
                  '[class*="push-notification"],[class*="push_notification"],[class*="in-page-push"],',
                  '[class*="inpagepush"],[id*="push-notification"],[id*="in-page-push"],',
                  'iframe[src*="push"],iframe[src*="inpage"],iframe[src*="ipp"],',
                  'iframe[src*="gozen"],iframe[src*="alwingulla"],iframe[src*="sunny-sprout"]{',
                  'display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;}'
                ].join('');
                document.head.appendChild(style);
              }
              scrub();
              setInterval(scrub, 700);
              document.addEventListener('DOMContentLoaded', scrub);
              try {
                new MutationObserver(scrub).observe(document.documentElement, { childList: true, subtree: true });
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
