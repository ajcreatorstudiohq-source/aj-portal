import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Next.js Metadata API
export const metadata: Metadata = {
  title: "AJ Super Portal",
  description: "Official AJ Studio Portal - Sovereign Digital Empire",
  manifest: "/manifest.json",
  icons: {
    apple: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Yeh lines browser ko manifest aur PWA detect karne par majboor karengi */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#06b6d4" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AJ Portal" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        
        {/* Viewport setting for mobile reliability */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}