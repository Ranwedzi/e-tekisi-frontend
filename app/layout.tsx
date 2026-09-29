"use client";
import { useEffect } from "react";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  useEffect(() => {
    const checkSession = () => {
      const sessionStr = localStorage.getItem('etekisi_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (Date.now() - session.loginTime > thirtyMinutes) {
          localStorage.removeItem('etekisi_session');
          alert("Session expired. Please login again.");
          window.location.href = "/login";
        }
      }
    };

    checkSession();
    // Check every minute while the app is open
    const interval = setInterval(checkSession, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F5F5F7]`}>
        {children}
      </body>
    </html>
  );
}