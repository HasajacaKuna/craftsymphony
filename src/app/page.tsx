"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Minimalistyczna, elegancka galeria zdjęć pasków
 * -------------------------------------------------
 * Wymagania klienta:
 * - Strona główna w wersji CIEMNEJ (domyślnie)
 * - Przełącznik (prawy górny róg) zmieniający tryb ciemny/jaśniejszy
 * - Profesjonalna siatka zdjęć pionowych: 3 zdjęcia w wierszu
 * - Zdjęcia robione telefonem (pion), więc używamy proporcji ~3/4
 *
 * Użycie (Next.js App Router):
 * 1) Zapisz jako app/page.tsx
 * 2) Podmień ścieżki w GALLERY na własne pliki (np. /images/belts/001-1.jpg)
 * 3) Tailwind z włączonym dark mode: { darkMode: "class" }
 */

// Każdy wiersz to jeden pasek (3 ujęcia)
const GALLERY: string[][] = [
  ["/images/belts/001-1.jpg", "/images/belts/001-2.jpg", "/images/belts/001-3.jpg"],
  ["/images/belts/002-1.jpg", "/images/belts/002-2.jpg", "/images/belts/002-3.jpg"],
  ["/images/belts/003-1.jpg", "/images/belts/003-2.jpg", "/images/belts/003-3.jpg"],
  ["/images/belts/004-1.jpg", "/images/belts/004-2.jpg", "/images/belts/004-3.jpg"],
];

export default function Page() {
  // Domyślnie ciemny
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Dodajemy klasę "dark" do <html> — Tailwind użyje wariantów dark:
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <main className="min-h-screen bg-white text-neutral-900 transition-colors duration-300 dark:bg-neutral-950 dark:text-zinc-100">
      {/* Pasek górny */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/70 backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-black/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-medium tracking-wide">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-400 align-middle" />
            Galeria pasków
          </h1>

          {/* Przełącznik trybu (prawy górny róg) */}
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label="Przełącz motyw"
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
                <span>Tryb ciemny</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4" />
                <span>Tryb jasny</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Intro */}
      <section className="border-b border-black/5 py-10 transition-colors dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.26em] text-neutral-600 dark:text-zinc-400">kolekcja</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Profesjonalna, elegancka prezentacja</h2>
          <p className="mt-3 max-w-2xl text-sm text-neutral-600 dark:text-zinc-400">
            Każdy wiersz to jeden pasek, a w nim trzy ujęcia — pionowe, w proporcji ok. 3/4.
          </p>
        </div>
      </section>

      {/* GALERIA: 3 kolumny w każdym wierszu */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {GALLERY.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-6">
                {row.map((src, j) => (
                  <figure
                    key={j}
                    className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-black/10 bg-neutral-100 shadow-sm transition-colors dark:border-white/10 dark:bg-white/5"
                  >
                    <img
                      src={src}
                      alt={`Pasek ${i + 1} — ujęcie ${j + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    {/* Subtelny gradient i podpis */}
                    <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-[11px] text-white/90 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="absolute inset-x-0 -bottom-1 top-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <span className="relative">Pasek {i + 1}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stopka minimal */}
      <footer className="border-t border-black/5 py-8 text-sm transition-colors dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-neutral-600 dark:text-zinc-400">
          © {new Date().getFullYear()} — Galeria pasków
        </div>
      </footer>
    </main>
  );
}
