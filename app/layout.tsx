import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AJ Super Portal",
  description: "AJ Studio Official App",
  manifest: "/manifest.json", // Metadata way
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Yeh line sab se zaroori hai manifest detect karwane ke liye */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#06b6d4" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
      </head>
      <body>{children}</body>
    </html>
  );
}