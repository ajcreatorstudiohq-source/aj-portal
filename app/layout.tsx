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
 * Root layout — games bridge only.
 * No Monetag push / popunder / in-page-push scripts here.
 * Rewarded interstitial loads on-demand via app/lib/monetag-client.ts (zone 11377822).
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
