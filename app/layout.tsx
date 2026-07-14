import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AJ Super Portal",
  description: "AJ Studio Official App",
  manifest: "/manifest.json", // Next.js khud link tag bana dega
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Apple/iOS ke liye extra support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <meta name="theme-color" content="#06b6d4" />
      </head>
      <body>{children}</body>
    </html>
  );
}