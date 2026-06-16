import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafePath AI | Predict Danger. Protect Lives.",
  description: "SafePath AI is an AI-powered Predictive Safety Intelligence Platform that predicts route risks, tracks live locations, triggers SOS alerts, and provides real-time voice assistance in English & Tamil.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
