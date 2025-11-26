// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Craft Symphony",
  description: "Professional, elegant belt showcase",
  keywords: [
    "prezent pod choinkę",
    "pasek skórzany",
    "pasek XL",
    "stojak pod HandPan",
    "stojak drewniany",
    "najlepsze paski skórzane",
    "pasek skóra licowa",
    "stojak z drewna bukowego pod HandPan",
    "prezent",
    "najwyższej jakości paski skórzane",
    "hand made",
    "rękodzieło",
    "unikatowe paski skórzane",
    "pasek Art",
    "artystyczne paski skórzane",
    "pudełka drewniane",
    "rękodzieło artystyczne",
    "paski skórzane wysokiej jakości",
    "paski skórzane Craft Symphony",
    "Craft Symphony",
    "pasek skórzany męski",
    "pasek skórzany dla kobiet",
    "pasek w rozmiarze S",
    "klamra do paska",
    "ozdobne klamry do paska",
    "stylowe paski",
    "paski w różnych kolorach",
    "pasek do spodni",
    "pasek do spódnicy",
    "eleganckie paski",
    "HandPan",
    "kolorowe paski skórzane",
    "wyrób ręczny",
    "paski skórzane najwyższej jakości",
    "klasyczny pasek skórzany",
    "stylowy pasek skórzany",
    "modny pasek skórzany",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
  themeColor: "#ffffff",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-neutral-900 dark:bg-neutral-950 dark:text-zinc-100 transition-colors duration-300`}
      >
        {children}
      </body>
    </html>
  );
}
