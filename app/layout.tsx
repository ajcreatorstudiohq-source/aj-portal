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
 * - Games bridge (aj-sdk.js) only on every page
 * - CPAGrip offerwall script is registered here (id=1906642) but the intrusive
 *   locker UI is hosted on /offerwall so it does not hijack hub/live screens.
 * - Monetag push/popunder are NOT loaded globally (rewarded interstitial on demand).
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
        {/* CPAGrip Offer Wall — script_include id 1906642 */}
        <Script
          id="cpagrip-script-include"
          src="https://ridefiles.net/script_include.php?id=1906642"
          strategy="lazyOnload"
          data-cpagrip-wall="1906642"
        />
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
            // Soft-guard: if CPAGrip content locker mounts on non-offerwall routes, remove it.
            (function () {
              function scrubCpaGripLocker() {
                try {
                  var path = (window.location && window.location.pathname) || '';
                  if (path.indexOf('/offerwall') === 0) return;
                  var wall = document.getElementById('grip_wall');
                  if (wall && wall.parentNode) wall.parentNode.removeChild(wall);
                  var inlineBox = document.getElementById('InlineBoxMainOuterLayer');
                  if (inlineBox && inlineBox.parentNode) inlineBox.parentNode.removeChild(inlineBox);
                  var mainBack = document.getElementById('main_back');
                  if (mainBack && mainBack.parentNode) mainBack.parentNode.removeChild(mainBack);
                  var mainDiv = document.getElementById('main_div');
                  if (mainDiv && mainDiv.parentNode) mainDiv.parentNode.removeChild(mainDiv);
                  if (typeof window.grip_wall_forceclose === 'function') {
                    try { window.grip_wall_forceclose(); } catch (e) {}
                  }
                  try { window.onbeforeunload = null; } catch (e2) {}
                } catch (e3) {}
              }
              scrubCpaGripLocker();
              setInterval(scrubCpaGripLocker, 1500);
              document.addEventListener('DOMContentLoaded', scrubCpaGripLocker);
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
