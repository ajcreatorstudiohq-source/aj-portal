import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script' // Next.js ka special script component

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AJ Super Portal',
  description: 'Gaming, Social and AI Hub',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* 1. Pehle aapki main SDK file load hogi */}
        <Script 
          src="/aj-sdk.js" 
          strategy="beforeInteractive" 
        />

        {/* 2. Yeh script ensure karega ke window.AJ_SDK hamesha available rahe */}
        <Script id="aj-sdk-init" strategy="afterInteractive">
          {`
            if (!window.AJ_SDK) {
              window.AJ_SDK = {
                showAd: function() { 
                  console.log("SDK: Showing Interstitial Ad...");
                  // Agar asli SDK load nahi hua to ye dummy function chalega
                },
                addBalance: function(data) {
                  console.log("SDK: Syncing Balance...", data);
                }
              };
            }
          `}
        </Script>
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}