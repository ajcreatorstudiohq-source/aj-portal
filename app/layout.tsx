import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AJ Super Portal",
  description: "The Sovereign Digital Empire",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* MONETAG VERIFICATION TAG */}
        <meta name="monetag" content="9aaedb10af8b3eddc9af804041bc39dd" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <main className="min-h-full flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}