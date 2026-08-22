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
  title: "AI Campus Guardian | See. Understand. Protect.",
  description:
    "Transform campus surveillance into intelligent safety intelligence. AI Campus Guardian helps institutions detect events, understand situations, assess risk, and respond faster.",
  keywords: [
    "campus safety",
    "AI surveillance",
    "campus security",
    "intelligent monitoring",
    "risk assessment",
  ],
  openGraph: {
    title: "AI Campus Guardian",
    description: "From Passive CCTV to Proactive AI-Powered Campus Safety",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
