// =============================
// app/page.tsx
// =============================
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Minimalistic, elegant belt gallery (with theme + gallery persistence)
 * - Dark by default; theme persists to localStorage
 * - 3 portrait images per row
 * - Images are loaded from localStorage (key: GALLERY_IMAGES). If empty, use DEFAULTS.
 */

type Img = { name?: string; src: string };

const DEFAULTS: string[] = [
  "/images/1.jpeg", "/images/2.jpeg", "/images/3.jpeg",
  "/images/4.jpeg", "/images/5.jpeg", "/images/6.jpeg",
  "/images/7.jpeg", "/images/8.jpeg", "/images/9.jpeg",
  "/images/10.jpeg", "/images/11.jpeg", "/images/12.jpeg",
];

const THEME_KEY = "THEME"; // 'dark' | 'light'
const GALLERY_KEY = "GALLERY_IMAGES"; // Img[] | string[]

export default function Page() {
  // Initialize theme from localStorage or default to dark
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved === "dark";
    return true; // default
  });

  // Load gallery images from localStorage or defaults; supports Img[] and string[]
  const [images, setImages] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try {
      const raw = window.localStorage.getItem(GALLERY_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "object" && x?.src)) {
        return (parsed as Img[]).map((it) => it.src);
      }
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        return parsed as string[];
      }
    } catch {}
    return DEFAULTS;
  });

  // Persist theme + apply Tailwind dark class
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try { window.localStorage.setItem(THEME_KEY, isDark ? "dark" : "light"); } catch {}
  }, [isDark]);

  // Seed gallery if empty
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = window.localStorage.getItem(GALLERY_KEY);
    if (!existing) {
      try { window.localStorage.setItem(GALLERY_KEY, JSON.stringify(images)); } catch {}
    }
  }, []);

  // Group into rows of 3
  const rows = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < images.length; i += 3) out.push(images.slice(i, i + 3));
    return out;
  }, [images]);

  return (
    <main className="min-h-screen bg-white text-neutral-900 transition-colors duration-300 dark:bg-neutral-950 dark:text-zinc-100">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/70 backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-black/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-medium tracking-wide">Craft Symphony — Leather & Wood</h1>

          {/* THEME SWITCH (top-right) */}
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label="Toggle theme"
            onClick={() => setIsDark((v) => !v)}
            className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-white/90 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
          >
            <span className="relative inline-flex h-5 w-9 items-center rounded-full border border-black/10 bg-neutral-200 transition-all dark:border-white/15 dark:bg-neutral-700">
              <span
                className="absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all group-aria-checked:translate-x-[18px] dark:bg-neutral-300"
                style={{ transform: isDark ? "translate(18px, -50%)" : "translate(0, -50%)" }}
              />
            </span>
            {isDark ? (
              <>
                <Moon className="h-4 w-4" />
                <span>Dark mode</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4" />
                <span>Light mode</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* GALLERY: 3 columns per row */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-6">
                {row.map((src, j) => (
                  <figure
                    key={`${i}-${j}`}
                    className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-black/10 bg-neutral-100 shadow-sm transition-colors dark:border-white/10 dark:bg-white/5"
                  >
                    <img
                      src={src}
                      alt={`Belt ${i + 1} — shot ${j + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </figure>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/5 py-8 text-sm transition-colors dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-neutral-600 dark:text-zinc-400">
          © {new Date().getFullYear()} — Craft Symphony — Leather & Wood
        </div>
      </footer>
    </main>
  );
}
