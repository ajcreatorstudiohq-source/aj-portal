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
 * - Games bridge (aj-sdk.js) only
 * - NO CPAGrip script_include (offer wall opens via direct show.php URL)
 * - NO Monetag push/popunder/gozen scripts (rewarded interstitial loaded on demand only)
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
            // Kill intrusive Monetag push / popunder / gozen / floating fake-credit widgets
            (function () {
              var BLOCKED = ['tag.gozen.com','gozen.com','push.min.js','in-page-push','inpagepush','popunder','multi-tag','notification'];
              function isBlockedSrc(src) {
                if (!src) return false;
                var s = String(src).toLowerCase();
                if (s.indexOf('nap5k.com/tag.min.js') !== -1) return false; // allowed interstitial SDK only when data-sdk
                for (var i = 0; i < BLOCKED.length; i++) {
                  if (s.indexOf(BLOCKED[i]) !== -1) return true;
                }
                return false;
              }
              function scrub() {
                try {
                  document.querySelectorAll('script[src]').forEach(function (el) {
                    var src = el.getAttribute('src') || '';
                    if (el.hasAttribute('data-sdk') && src.indexOf('nap5k.com') !== -1) return;
                    if (isBlockedSrc(src) || src.toLowerCase().indexOf('gozen') !== -1) {
                      try { el.remove(); } catch (e) {}
                    }
                  });
                  document.querySelectorAll('#grip_wall,#InlineBoxMainOuterLayer,#main_back,#main_div').forEach(function (n) {
                    try { n.remove(); } catch (e2) {}
                  });
                  try { window.onbeforeunload = null; } catch (e3) {}
                } catch (e4) {}
              }
              scrub();
              setInterval(scrub, 2000);
              document.addEventListener('DOMContentLoaded', scrub);
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
