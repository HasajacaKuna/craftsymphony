"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
} from "lucide-react";
/* ====== i18n ====== */
type Lang = "pl" | "en";

const UI = {
  pl: {
    leather: "Skóra",
    wood: "Drewno",
    heroAlt: "Rękodzieło drewniane — Craft Symphony",
    price: "Cena:",
    interestedHeading: "Jestem zainteresowany paskiem?",
    interestedText:
      "Podaj e-mail oraz numer produktu, a odezwiemy się z potwierdzeniem.",
    emailPh: "Twój e-mail",
    productNoPh: "Nr produktu",
    send: "Wyślij zapytanie",
    footerNote:
      "Ręcznie wykonane – każdy egzemplarz może się delikatnie różnić.",
    // ⬇ NOWE
    about:
      "Każdy drewniany produkt powstaje ręcznie — od selekcji drewna, przez obróbkę i toczenie, po olejowanie i końcowe wykończenie. Szanujemy naturalny rysunek słojów i nie ukrywamy go: to on nadaje charakter i indywidualność. Stawiamy na trwałość, funkcjonalność i ponadczasową prostotę.",
  },
  en: {
    leather: "Leather",
    wood: "Wood",
    heroAlt: "Wood handcraft — Craft Symphony",
    price: "Price:",
    interestedHeading: "Interested in a belt?",
    interestedText:
      "Leave your email and product number and we’ll get back with details.",
    emailPh: "Your email",
    productNoPh: "Product no.",
    send: "Send request",
    footerNote:
      "Handmade — each piece may slightly differ.",
    // ⬇ NEW
    about:
      "Every wooden piece is crafted by hand — from timber selection and shaping to oiling and finishing. We honor the natural grain instead of hiding it: that’s what gives each item its unique character. Built to last, functional, and timelessly simple.",
  },
} as const;

const formatPrice = (lang: Lang, pln: number) =>
  lang === "pl"
    ? `${pln.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} PLN`
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(pln / 4);

/* ====== dane demo (podmień ścieżki) ====== */
type WoodItem = {
  id: string;
  title: { pl: string; en: string };
  description: { pl: string; en: string };
  pricePLN: number;
  image: string;
};

const WOOD_ITEMS: WoodItem[] = [
  { id: "w1", title: { pl: "Patera dębowa", en: "Oak platter" }, description: { pl: "Ręcznie olejowana, idealna do serów i przekąsek.", en: "Hand-oiled, perfect for cheese and snacks." }, pricePLN: 240, image: "/images/wood/wood1.jpg" },
  { id: "w2", title: { pl: "Deska – orzech", en: "Board – walnut" }, description: { pl: "Naturalne usłojenie, rowek na soki po obwodzie.", en: "Natural grain, juice groove around the edge." }, pricePLN: 180, image: "/images/wood/wood2.jpg" },
  { id: "w3", title: { pl: "Podstawki (4 szt.)", en: "Coasters (set of 4)" }, description: { pl: "Lite drewno, filc od spodu. Każda sztuka unikatowa.", en: "Solid wood, felt bottom. Each piece unique." }, pricePLN: 90, image: "/images/wood/wood3.jpg" },
  { id: "w4", title: { pl: "Taca – jesion", en: "Tray – ash" }, description: { pl: "Smukłe uchwyty, matowe wykończenie.", en: "Slim handles, matte finish." }, pricePLN: 220, image: "/images/wood/wood4.jpg" },
  { id: "w5", title: { pl: "Misa – dąb", en: "Bowl – oak" }, description: { pl: "Toczona ręcznie, zabezpieczona olejem spożywczym.", en: "Hand-turned, food-safe oil finish." }, pricePLN: 260, image: "/images/wood/wood1.jpg" },
  { id: "w6", title: { pl: "Łyżka – buk", en: "Spoon – beech" }, description: { pl: "Lekka i wytrzymała do codziennego gotowania.", en: "Light and durable for everyday cooking." }, pricePLN: 45, image: "/images/wood/wood2.jpg" },
  { id: "w7", title: { pl: "Półmisek – czereśnia", en: "Platter – cherry" }, description: { pl: "Ciepły odcień, gładkie wykończenie.", en: "Warm tone, smooth finish." }, pricePLN: 190, image: "/images/wood/wood3.jpg" },
  { id: "w8", title: { pl: "Deska – wiąz", en: "Board – elm" }, description: { pl: "Wyraziste słoje, jedna krawędź live-edge.", en: "Bold grain, one live-edge side." }, pricePLN: 210, image: "/images/wood/wood4.jpg" },
];

/* ====== komponent ====== */
export default function WoodPage() {
  const [lang, setLang] = useState<Lang>("pl");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cs_lang") as Lang | null;
      if (saved === "pl" || saved === "en") setLang(saved);
      document.documentElement.lang = saved ?? "pl";
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("cs_lang", lang);
      document.documentElement.lang = lang;
    } catch {}
  }, [lang]);

  const t = UI[lang];

  return (
    <div className="min-h-screen bg-[#f5f5ef] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#f5f5ef] backdrop-blur supports-[backdrop-filter]:bg-[#f5f5ef] border-b border-neutral-200">
        <div className="mx-auto max-w-6xl h-16 md:h-20 px-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full">
            <div className="justify-self-start">
              <Link
                href="/"
                className="relative text-[12px] md:text-[13px] tracking-[0.2em] uppercase font-serif text-neutral-800 hover:text-neutral-950 transition after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0 after:bg-neutral-900 after:transition-all after:duration-300 hover:after:w-full"
              >
                {t.leather}
              </Link>
            </div>

            <div className="justify-self-center">
              <div className="relative h-14 w-14 md:h-20 md:w-20">
                <Image
                  src="/images/logo3.png"
                  alt="Craft Symphony"
                  fill
                  sizes="80px"
                  className="object-contain"
                />
              </div>
            </div>

            <div className="justify-self-end flex items-center gap-3">
              <span className="hidden sm:inline text-[12px] md:text-[13px] tracking-[0.2em] uppercase font-serif text-neutral-950">
                {t.wood}
              </span>
              <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white/80 backdrop-blur px-1.5 py-1 shadow-sm">
                <button
                  onClick={() => setLang("pl")}
                  aria-pressed={lang === "pl"}
                  className={`inline-flex items-center justify-center rounded-md p-1.5 ${
                    lang === "pl" ? "bg-[#f5f5ef]" : "hover:bg-neutral-100"
                  }`}
                  title="Polski"
                >
                  <Image src="/images/poland.png" alt="PL" width={20} height={14} className="rounded-[2px] shadow-sm" />
                </button>
                <button
                  onClick={() => setLang("en")}
                  aria-pressed={lang === "en"}
                  className={`inline-flex items-center justify-center rounded-md p-1.5 ${
                    lang === "en" ? "bg-[#f5f5ef]" : "hover:bg-neutral-100"
                  }`}
                  title="English"
                >
                  <Image src="/images/england.png" alt="EN" width={20} height={14} className="rounded-[2px] shadow-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* mobile: pasek flag pod navem */}
        <div className="sm:hidden border-t border-neutral-200 bg-[#f5f5ef]/95">
          <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-center gap-3">
            <button
              onClick={() => setLang("pl")}
              aria-pressed={lang === "pl"}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                lang === "pl" ? "border-neutral-900" : "border-neutral-300"
              }`}
              title="Polski"
            >
              <Image src="/images/poland.png" alt="PL" width={18} height={12} className="rounded-[2px] shadow-sm" />
              <span>PL</span>
            </button>
            <button
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                lang === "en" ? "border-neutral-900" : "border-neutral-300"
              }`}
              title="English"
            >
              <Image src="/images/england.png" alt="EN" width={18} height={12} className="rounded-[2px] shadow-sm" />
              <span>EN</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="pt-[calc(80px+40px)] sm:pt-24 pb-24">
        <section className="mx-auto max-w-6xl px-4">
          {/* HERO */}

          {/* GRID 1/2/4 */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WOOD_ITEMS.map((it) => (
              <article
                key={it.id}
                className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <div className="relative w-full aspect-square bg-neutral-100">
                  <Image
                    src={it.image}
                    alt={it.title[lang]}
                    fill
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                    className="object-cover object-center"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium tracking-wide">{it.title[lang]}</h3>
                  <p className="mt-2 text-sm text-neutral-600 line-clamp-3">
                    {it.description[lang]}
                  </p>
                  <div className="mt-4 text-sm">
                    <span className="text-neutral-500">{t.price}&nbsp;</span>
                    <span className="font-medium">{formatPrice(lang, it.pricePLN)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Formularz zainteresowania */}
          <div className="mt-14 md:mt-16 text-center">
            <h3 className="font-serif text-lg md:text-xl tracking-wide">
              {t.interestedHeading}
            </h3>
            <p className="mt-2 text-sm text-neutral-600 px-2">
              {t.interestedText}
            </p>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-5 flex flex-col sm:flex-row gap-3 justify-center items-center px-2"
            >
              <input
                type="email"
                required
                placeholder={t.emailPh}
                className="w-full sm:w-80 rounded-xl border-2 border-neutral-300 bg-[#f5f5ef] text-neutral-900 placeholder-neutral-500 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900/20"
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder={t.productNoPh}
                aria-label={t.productNoPh}
                className="w-full sm:w-40 rounded-xl border-2 border-neutral-300 bg-[#f5f5ef] text-neutral-900 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900/20"
              />
              <button className="w-full sm:w-auto px-6 py-3 bg-neutral-900 rounded-xl border border-neutral-900 text-white hover:bg-neutral-800 transition">
                {t.send}
              </button>
            </form>
          </div>

          {/* ⬇ NOWA SEKCJA: obraz 3.png + opis (PL/EN) */}
          <div className="mt-10 md:mt-12 text-center mb-14">
            <div className="relative mx-auto h-64 md:h-[31rem] w-full max-w-3xl">
              <Image
                src="/images/1.png"
                alt="Craft — workshop"
                fill
                sizes="(max-width:768px) 90vw, 60vw"
                className="object-contain"
              />
            </div>
            <p className="mt-4 max-w-3xl mx-auto text-sm leading-relaxed text-neutral-700 px-2 italic">
              {t.about}
            </p>
          </div>

          {/* Stopka */}
          <div className="space-y-2 ,t-8">
            <div className="mx-auto w-full h-px bg-neutral-300" />

            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 text-sm px-2">
              <div className="md:justify-self-start text-center md:text-left text-neutral-700">
                <div className="font-medium">kontakt@craftsymphony.pl</div>
                <div className="mt-1">+48 692 296 979</div>
              </div>

              <div className="text-center text-xs text-neutral-500" />

              <div className="md:justify-self-end flex items-center justify-center md:justify-end gap-5 text-neutral-700">
                <Link href="#" aria-label="Facebook" className="hover:opacity-80">
                  <Facebook />
                </Link>
                <Link href="#" aria-label="Instagram" className="hover:opacity-80">
                  <Instagram />
                </Link>
                <Link href="#" aria-label="YouTube" className="hover:opacity-80">
                  <Youtube />
                </Link>
                <Link href="#" aria-label="LinkedIn" className="hover:opacity-80">
                  <Linkedin />
                </Link>
              </div>
            </div>

            <div className="text-center text-xs text-neutral-500">
              © 2025 Craft Symphony
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
