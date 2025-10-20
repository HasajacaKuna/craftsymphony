"use client";
import { useState, useEffect } from "react";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

/* ===== Typy ===== */
export type BeltItem = {
  name: string;
  description: string;
  /** opcjonalnie, jeśli API zwraca od razu EN */
  nameEn?: string;
  descriptionEn?: string;
  /** cena może przyjść jako number (PLN) lub string (np. "1 190 PLN") */
  price: string | number;
  upperSize: string;
  lowerSize: string;
  /** NOWE: galeria zdjęć per pasek */
  images?: string[];
  /** NOWE: rozmiar główny */
  mainSize?: string | number;
};

export type CategoryData = {
  title: string;
  /** Fallback – jeśli item nie ma własnych zdjęć, użyjemy zdjęć kategorii */
  images?: string[];
  items: BeltItem[];
};

export type ApiCategory = {
  slug: string;
  title: string;
  /** Może nie istnieć, jeśli przechodzimy na galerie per item */
  images?: string[];
  items: BeltItem[];
};

export type CatalogResponse = { categories: ApiCategory[] };

export type Lang = "pl" | "en";

/* ===== UI teksty ===== */
const UI_STRINGS: Record<
  Lang,
  {
    navLeather: string;
    navWood: string;
    scrollUp: string;
    scrollDown: string;
    selectBelt: string;
    heroAltPrefix: string;
    schemaAlt: string;
    numberLabel: string;
    interestedHeading: string;
    interestedText: string;
    emailPlaceholder: string;
    beltNoPlaceholder: string;
    submit: string;
    price: string;
    mainSize: string;
    about: string;
    loading: string;
    empty: string;
  }
> = {
  pl: {
    navLeather: "Skóra",
    navWood: "Drewno",
    scrollUp: "Przewiń w górę",
    scrollDown: "Przewiń w dół",
    selectBelt: "Wybierz pasek nr",
    heroAltPrefix: "Pasek",
    schemaAlt: "Schemat paska – rozmiar",
    numberLabel: "Nr.",
    interestedHeading: "Jestem zainteresowany paskiem?",
    interestedText:
      "Podaj e-mail oraz numer paska, a odezwiemy się z potwierdzeniem.",
    emailPlaceholder: "Twój e-mail",
    beltNoPlaceholder: "Nr paska",
    submit: "Wyślij zapytanie",
    price: "Cena:",
    mainSize: "Rozmiar główny",
    about:
      "Każdy pasek powstaje w całości ręcznie – od doboru skóry, przez cięcie i barwienie, po wykończenie krawędzi. Wierzymy w rzemiosło, które ma duszę: staranność detalu i ponadczasowy charakter. Nasze paski łączą tradycję z nowoczesną precyzją — projektowane z myślą o trwałości i pięknie, które dojrzewa z czasem.",
    loading: "Ładowanie katalogu…",
    empty: "Brak produktów do wyświetlenia.",
  },
  en: {
    navLeather: "Leather",
    navWood: "Wood",
    scrollUp: "Scroll up",
    scrollDown: "Scroll down",
    selectBelt: "Select belt no.",
    heroAltPrefix: "Belt",
    schemaAlt: "Belt diagram — size",
    numberLabel: "No.",
    interestedHeading: "Interested in a belt?",
    interestedText:
      "Leave your email and belt number and we’ll get back to you with details.",
    emailPlaceholder: "Your email",
    beltNoPlaceholder: "Belt no.",
    submit: "Send request",
    price: "Price:",
    mainSize: "Main size",
    about:
      "Each belt is crafted entirely by hand — from leather selection and cutting to dyeing and edge finishing. We believe in soul-filled craftsmanship: meticulous detail and timeless character. Our belts blend tradition with modern precision, designed for durability and beauty that matures over time.",
    loading: "Loading catalog…",
    empty: "No products to display.",
  },
};

export type LuxuryLandingProps = {
  logo?: string;
  aboutImage?: string;
  defaultLang?: Lang;
};

export type Labels = (typeof UI_STRINGS)["pl"];

function formatPriceForLang(price: string | number | undefined, lang: Lang) {
  if (price == null) return "—";

  // Liczba z bazy
  if (typeof price === "number") {
    if (lang === "pl") {
      return `${price.toLocaleString("pl-PL")} PLN`;
    }
    const usd = price / 4;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(usd);
  }

  // String z bazy (np. "1 190 PLN")
  if (lang === "pl") return price;

  const numericPLN = Number(
    String(price)
      .replace(/[^\d.,]/g, "")
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  if (!isFinite(numericPLN)) return price;

  const usd = numericPLN / 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(usd);
}

/* ===== Sekcja kategorii (renderuje tylko to, co przyjdzie z API) ===== */
function CategorySection({
  title,
  images = [],
  items,
  labels,
  lang,
}: CategoryData & { labels: Labels; lang: Lang }) {
  // 1) HOOKI ZAWSZE NA GÓRZE (zero warunków/returnów przed nimi)
  const [active, setActive] = useState(0);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Stałe UI
  const VISIBLE = 4;
  const THUMB_H = 96; // większe miniatury
  const GAP = 12;
  const ySpring = useSpring(0, { stiffness: 120, damping: 20 });

  // 2) LOGIKA DANYCH – galeria bierze zdjęcia z wybranego PASKA, a gdy ich brak, spada do zdjęć KATEGORII
  const belt = items[active];
  const gallery = (belt?.images?.length ? belt.images : images) ?? [];

  // Utrzymanie widoczności aktywnej miniatury
  useEffect(() => {
    if (!gallery.length) return;
    if (active < scrollIndex) setScrollIndex(active);
    if (active > scrollIndex + VISIBLE - 1) setScrollIndex(active - (VISIBLE - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, gallery.length]);

  // Aktualizacja sprężyny przesuwu listy miniaturek
  useEffect(() => {
    if (!gallery.length) return;
    ySpring.set(-(scrollIndex * (THUMB_H + GAP)));
  }, [gallery.length, scrollIndex, ySpring]);

  // Swipe (mobile)
  const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const THRESHOLD = 40;
    if (Math.abs(dx) > THRESHOLD) {
      setActive((prev) => {
        const next = prev + (dx < 0 ? 1 : -1);
        return Math.max(0, Math.min(items.length - 1, next));
      });
    }
    setTouchStartX(null);
  };

  // Scroll przyciski (miniatury / desktop)
  const maxScrollIndex = Math.max(0, gallery.length - VISIBLE);
  const scrollUp = () => setScrollIndex((s) => Math.max(0, s - 1));
  const scrollDown = () => setScrollIndex((s) => Math.min(maxScrollIndex, s + 1));

  // Po hookach można bezpiecznie warunkowo nie renderować
  if (!items.length || !gallery.length) return null;

  // EN fallback: jeśli API daje tłumaczenia, pokaż je w wersji EN
  const displayName = lang === "en" && belt?.nameEn ? belt.nameEn : belt?.name;
  const displayDesc = lang === "en" && belt?.descriptionEn ? belt.descriptionEn : belt?.description;

  return (
    <div>
      {/* Tytuł kategorii */}
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl md:text-3xl tracking-wide">Craft Symphony - {title}</h1>
      </div>

      {/* HERO */}
      <div className="relative">
        <div className="relative aspect-[4/3] md:aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-sm border border-neutral-200">
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-${title}-${active}-${gallery[0]}`}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative h-full w-full"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <Image
                src={gallery[0]}
                alt={`${labels.heroAltPrefix} ${displayName ?? `${active + 1}`}`}
                fill
                sizes="100vw"
                className="object-cover"
                priority={false}
              />
            </motion.div>
          </AnimatePresence>

          {/* MINIATURY (DESKTOP) */}
          {gallery.length > 1 && (
            <div className="hidden md:flex absolute inset-y-0 right-4 my-4 flex-col items-center justify-center gap-3 select-none">
              <div className="absolute inset-y-0 -inset-x-2 rounded-2xl bg-black/35 backdrop-blur-sm border border-white/20" />

              <button
                onClick={scrollUp}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 hover:bg-black/40 text-white shadow-sm"
                aria-label={labels.scrollUp}
              >
                <ChevronUp className="h-5 w-5" />
              </button>

              <div className="relative h-[calc(4*96px+3*12px)] w-28 overflow-hidden rounded-xl border border-white/20 bg-transparent">
                <motion.div style={{ y: ySpring }} className="absolute top-0 left-0 w-full">
                  <div className="flex flex-col gap-3 p-0">
                    {gallery.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          // klik miniatury zmienia zdjęcie w hero (na 1. po kliknięciu zamieniamy kolejność)
                          const reordered = [src, ...gallery.filter((_, j) => j !== i)];
                          // hack: prosta rotacja – zamiana pierwszego z i-tym poprzez lokalny side-effect
                          // w produkcji lepiej trzymać indeks aktywnego zdjęcia w stanie
                          (belt.images && belt.images.length) && (belt.images = reordered);
                        }}
                        className={`relative h-24 w-full overflow-hidden rounded-lg border transition ${
                          i === 0 ? "border-neutral-900 shadow" : "border-neutral-300 hover:border-neutral-500"
                        }`}
                        aria-label={`${labels.selectBelt} ${i + 1}`}
                        title={`Podgląd ${i + 1}`}
                      >
                        <div className="relative h-24 w-full">
                          <Image src={src} alt={`thumb-${i + 1}`} fill sizes="112px" className="object-cover rounded-lg" />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>

              <button
                onClick={scrollDown}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 hover:bg-black/40 text-white shadow-sm"
                aria-label={labels.scrollDown}
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MINIATURY (MOBILE) */}
      {gallery.length > 1 && (
        <div className="md:hidden mt-3">
          <div className="flex gap-3 overflow-x-auto px-1 py-1 snap-x snap-mandatory">
            {gallery.map((src, i) => (
              <button
                key={`m-thumb-${i}`}
                onClick={() => {
                  const reordered = [src, ...gallery.filter((_, j) => j !== i)];
                  (belt.images && belt.images.length) && (belt.images = reordered);
                }}
                className={`relative h-20 w-20 flex-none overflow-hidden rounded-lg border snap-start ${
                  i === 0 ? "border-neutral-900 ring-2 ring-neutral-900" : "border-neutral-300 hover:border-neutral-500"
                }`}
                aria-label={`${labels.selectBelt} ${i + 1}`}
              >
                <div className="relative h-20 w-20">
                  <Image src={src} alt={`thumb-${i + 1}`} fill sizes="80px" className="object-cover rounded-lg" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* OPIS + ROZMIARÓWKA */}
      <div className="mt-6 md:mt-8 text-center">
        <div className="text-center mb-3">
          <h3 className="font-serif text-base sm:text-lg tracking-wide">
            {labels.numberLabel}&nbsp;{active + 1}&nbsp;{displayName ?? "—"}
          </h3>
          <p className="text-sm text-neutral-600 max-w-3xl mx-auto px-2">{displayDesc ?? "—"}</p>
        </div>

        {/* ROZMIARY wokół schematu jak wcześniej: góra/dół + main po prawej od belt.png */}
        <div className="max-w-4xl mx-auto">
          {/* GÓRA */}
          <div className="text-center text-sm text-neutral-600 mb-[-48px]">
            {belt?.upperSize ?? "—"}
          </div>

          <div className="rounded-2xl overflow-hidden">
            <div className="relative mx-auto w-2/3 md:w-1/3 aspect-[3/2]">
              <Image
                src="/images/belt2.png"
                alt={labels.schemaAlt}
                fill
                sizes="(max-width:768px) 66vw, 33vw"
                className="object-contain"
                priority={false}
              />

              {/* MAIN SIZE BUBBLE — z prawej strony obrazka */}
              <div className="hidden md:block absolute top-1/2 -translate-y-1/2 right-0 translate-x-[110%]">
                <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white/95 px-4 py-3 text-base font-medium shadow-sm min-w-[8rem] justify-center">
                  {typeof belt?.mainSize !== "undefined" && belt?.mainSize !== null ? `${belt.mainSize}` : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* DÓŁ */}
          <div className="text-center text-sm text-neutral-600 mt-[-48px]">
            {belt?.lowerSize ?? "—"}
          </div>
        </div>

        <p className="mt-8 text-center text-[13px] text-neutral-600 mb-16 italic">
          {labels.price}{" "}
          <span className="font-medium tracking-wide">{formatPriceForLang(belt?.price as any, lang)}</span>
        </p>
      </div>
    </div>
  );
}


/* ===== Główny komponent – TYLKO dane z bazy ===== */
export default function LuxuryLanding({
  logo = "/images/logo3.png",
  aboutImage = "/images/1.png",
  defaultLang = "pl",
}: LuxuryLandingProps) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const t = UI_STRINGS[lang];

  const [data, setData] = useState<ApiCategory[] | null>(null);
  const [loading, setLoading] = useState(true);

  // persist + lang attr
  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? ((localStorage.getItem("cs_lang") as Lang | null) || null) : null;
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    // useEffect i tak nie działa na serwerze – nie trzeba warunkować wywołania hooka
    try {
      localStorage?.setItem?.("cs_lang", lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  }, [lang]);

  // fetch katalogu z backendu
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/catalog", { cache: "no-store" });
        const json: CatalogResponse = await res.json();
        if (!abort) setData(json.categories || []);
      } catch {
        if (!abort) setData([]);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  const hasRenderable = (c: ApiCategory) => {
    const anyWithImages = (c.items || []).some((it) => (it.images?.length || 0) > 0);
    const categoryImages = (c.images?.length || 0) > 0;
    return (c.items?.length || 0) > 0 && (anyWithImages || categoryImages);
  };

  return (
    <div className="min-h-screen bg-[#f5f5ef] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#f5f5ef] backdrop-blur supports-[backdrop-filter]:bg-[#f5f5ef]">
        <div className="relative mx-auto max-w-6xl h-16 md:h-20 px-4">
          {/* 3 kolumny: lewa pusta | środkowa z grupą [Skóra | LOGO | Drewno] | prawa z językami */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full">
            <div /> {/* pusty wyrównywacz */}

            {/* ŚRODEK: Skóra | LOGO | Drewno — całość wycentrowana */}
            <div className="justify-self-center">
              <div className="flex items-center gap-6 md:gap-8">
                <Link
                  href="/"
                  className="relative text-[12px] md:text-[13px] tracking-[0.2em] uppercase font-serif text-neutral-800
                       hover:text-neutral-950 transition
                       after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0
                       after:bg-neutral-900 after:transition-all after:duration-300 hover:after:w-full
                       focus:outline-none focus-visible:after:w-full"
                >
                  {t.navLeather}
                </Link>

                <div className="relative h-14 w-14 md:h-20 md:w-20 shrink-0">
                  <Image src={logo} alt="Craft Symphony" fill sizes="80px" className="object-contain" priority={false} />
                </div>

                <Link
                  href="/"
                  className="relative text-[12px] md:text-[13px] tracking-[0.2em] uppercase font-serif text-neutral-800
                       hover:text-neutral-950 transition
                       after:absolute after:right-0 after:-bottom-1 after:h-[1px] after:w-0
                       after:bg-neutral-900 after:transition-all after:duration-300 hover:after:w-full
                       focus:outline-none focus-visible:after:w-full"
                >
                  {t.navWood}
                </Link>
              </div>
            </div>

            {/* PRAWO: przełącznik języka — w prawej kolumnie, nie rusza wycentrowania */}
            <div className="justify-self-end">
              <div className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white/80 backdrop-blur px-1.5 py-1 shadow-sm">
                {/* PL */}
                <button
                  onClick={() => setLang("pl")}
                  aria-pressed={lang === "pl"}
                  aria-label="Polski"
                  title="Polski"
                  className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#f5f5ef]
              ${lang === "pl" ? "bg-[#f5f5ef]" : "hover:bg-neutral-100"}`}
                >
                  <Image src="/images/poland.png" alt="" width={20} height={14} className="rounded-[2px] shadow-sm" priority={false} />
                  <span className="sr-only">PL</span>
                </button>

                {/* EN */}
                <button
                  onClick={() => setLang("en")}
                  aria-pressed={lang === "en"}
                  aria-label="English"
                  title="English"
                  className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#f5f5ef]
              ${lang === "en" ? "bg-[#f5f5ef]" : "hover:bg-neutral-100"}`}
                >
                  <Image src="/images/england.png" alt="" width={20} height={14} className="rounded-[2px] shadow-sm" priority={false} />
                  <span className="sr-only">EN</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="pt-20 md:pt-24 pb-24">
        <section className="mx-auto max-w-6xl px-4 space-y-16 md:space-y-24">
          {/* LOADING */}
          {loading && <div className="text-center text-sm text-neutral-600">{t.loading}</div>}

          {/* CATEGORIES FROM DB */}
          {!loading && data && data.filter(hasRenderable).map((cat) => (
            <div key={cat.slug}>
              <CategorySection title={cat.title} images={cat.images} items={cat.items} labels={t} lang={lang} />
              <div className="mx-auto w-[100%] h-px bg-neutral-300" />
            </div>
          ))}

          {/* EMPTY STATE */}
          {!loading && (data?.filter(hasRenderable).length ?? 0) === 0 && (
            <div className="text-center text-sm text-neutral-600">{t.empty}</div>
          )}

          {/* O rzemiośle */}
          <div className="mt-4 md:mt-6 text-center">
            <p className="mt-4 md:mt-6 max-w-3xl mx-auto text-sm leading-relaxed text-neutral-700 px-2 italic">{t.about}</p>
            <div className="relative mx-auto h-64 md:h-[31rem] w-full max-w-3xl">
              <Image src={aboutImage} alt="Craft" fill sizes="(max-width:768px) 90vw, 60vw" className="object-contain" priority={false} />
            </div>
          </div>

          {/* Formularz */}
          <div className="mt-12 md:mt-16 text-center">
            <h3 className="font-serif text-lg md:text-xl tracking-wide">{t.interestedHeading}</h3>
            <p className="mt-2 text-sm text-neutral-600 px-2">{t.interestedText}</p>

            <form onSubmit={(e) => e.preventDefault()} className="mt-5 flex flex-col sm:flex-row gap-3 justify-center items-center px-2">
              <input
                type="email"
                required
                placeholder={t.emailPlaceholder}
                className="w-full sm:w-80 rounded-xl border-2 border-neutral-300 bg-[#f5f5ef] text-neutral-900 placeholder-neutral-500 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900/20"
              />
              <input
                type="number"
                min={1}
                max={9999}
                placeholder={t.beltNoPlaceholder}
                className="w-full sm:w-40 rounded-xl border-2 border-neutral-300 bg-[#f5f5ef] text-neutral-900 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900/20"
                aria-label={t.beltNoPlaceholder}
              />
              <button className="w-full sm:w-auto px-6 py-3 bg-neutral-900 rounded-xl border border-neutral-900 text-white hover:bg-neutral-900 hover:text-white transition">
                {t.submit}
              </button>
            </form>
          </div>

          {/* Stopka */}
          <div className="space-y-2">
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

            <div className="text-center text-xs text-neutral-500">© 2025 Craft Symphony</div>
          </div>
        </section>
      </main>
    </div>
  );
}
