"use client";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

/* ===== Typy ===== */
export type Lang = "pl" | "en";

export type BeltImage = {
  url: string;
  altPl?: string;
  altEn?: string;
  isPrimary?: boolean;
  order?: number;
};

export type ApiItem = {
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  cenaPLN: number | string;
  rozmiarMin: number | string;
  rozmiarMax: number | string;
  rozmiarGlowny?: number | string | null;
  images?: BeltImage[];
  numerPaska?: number;
  rozSprz?: number | string | null;
};

export type ApiCategory = {
  slug: string;
  title: string;
  images?: (string | BeltImage)[];
  items: ApiItem[];
};

export type CatalogResponse = { categories: ApiCategory[] };

export type BeltItem = {
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  price: string | number;
  upperSize: string;
  lowerSize: string;
  images?: BeltImage[];
  mainSize?: string | number;
  buckleSize?: string | number; // sprzączka
  beltNo?: number;
};

export type CategoryData = {
  title: string;
  images?: BeltImage[];
  items: BeltItem[];
};

/* ===== UI teksty ===== */
const UI_STRINGS: Record<
  Lang,
  {
    navLeather: string;
    navWood: string;
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
    buckleSize: string;
    sizesInCm: string;
    about: string;
    loading: string;
    empty: string;
  }
> = {
  pl: {
    navLeather: "Skóra",
    navWood: "Drewno",
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
    buckleSize: "Rozmiar sprzączki",
    sizesInCm: "Rozmiary w cm",
    about:
      "Każdy pasek powstaje w całości ręcznie – od doboru skóry, przez cięcie i barwienie, po wykończenie krawędzi. Wierzymy w rzemiosło, które ma duszę: staranność detalu i ponadczasowy charakter. Nasze paski łączą tradycję z nowoczesną precyzją — projektowane z myślą o trwałości i pięknie, które dojrzewa z czasem.",
    loading: "Ładowanie katalogu…",
    empty: "Brak produktów do wyświetlenia.",
  },
  en: {
    navLeather: "Leather",
    navWood: "Wood",
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
    buckleSize: "Buckle size",
    sizesInCm: "Sizes in cm",
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

/* ===== utils ===== */
function formatPriceForLang(price: string | number | undefined, lang: Lang) {
  if (price == null) return "—";

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

  if (lang === "pl") return price;

  const numericPLN = Number(
    String(price).replace(/[^\d.,]/g, "").replace(/\s/g, "").replace(",", ".")
  );
  if (!isFinite(numericPLN)) return price;

  const usd = numericPLN / 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(usd);
}

function sortImages(imgs: BeltImage[] = []) {
  return [...imgs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function pickPrimary(imgs: BeltImage[] = []) {
  const sorted = sortImages(imgs);
  return sorted.find((i) => i.isPrimary) || sorted[0];
}

function toImageObjects(arr: (string | BeltImage)[] = []): BeltImage[] {
  return arr.map((x, i) =>
    typeof x === "string" ? { url: x, order: i } : { order: i, ...x }
  );
}

/* ===== Sekcja kategorii ===== */
function CategorySection({
  title,
  images = [],
  items,
  labels,
  lang,
}: CategoryData & { labels: Labels; lang: Lang }) {
  // HOOKI
  const [active, setActive] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // animacja (nie scrollujemy kolumny, ale zostawiamy sprężynę np. pod późniejsze efekty)
  const ySpring = useSpring(0, { stiffness: 120, damping: 20 });

  // Dane do galerii
  const belt = items[active];
  const beltGallery = belt?.images?.length ? sortImages(belt.images) : [];
  const categoryGallery = images?.length ? sortImages(images) : [];
  const gallery = beltGallery.length ? beltGallery : categoryGallery;

  // ref do karuzeli miniaturek (desktop)
const deskThumbsRef = useRef<HTMLDivElement | null>(null);

const scrollDesktopThumbs = (dir: "left" | "right") => {
  const el = deskThumbsRef.current;
  if (!el) return;
  const step = Math.round(el.clientWidth * 0.9); // ~90% szerokości kontenera
  el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
};


  // ALT wg języka
  const altFor = (img: BeltImage, fallback: string) =>
    (lang === "en" ? img.altEn || img.altPl : img.altPl || img.altEn) ||
    fallback;

  // reset hero przy zmianie paska
  useEffect(() => {
    const p = pickPrimary(beltGallery);
    setHeroIndex(Math.max(0, beltGallery.indexOf(p ?? beltGallery[0])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Swipe (mobile) – zmiana aktywnego paska
  const onTouchStart = (e: React.TouchEvent) =>
    setTouchStartX(e.touches[0].clientX);
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

  // miniatury: bierzemy primary (albo fallback) każdego paska w kategorii
  const beltThumbs = items
    .map((it, i) => {
      const p = pickPrimary(it.images || []);
      const src = p?.url || categoryGallery[0]?.url || "";
      return {
        url: src,
        beltNo: it.beltNo ?? i + 1,
        alt:
          (lang === "en"
            ? it.nameEn || it.name || `${labels.heroAltPrefix} ${i + 1}`
            : it.name || it.nameEn || `${labels.heroAltPrefix} ${i + 1}`) || "",
      };
    })
    .filter((t) => !!t.url);

  if (!items.length || !gallery.length) return null;

  const displayName =
    lang === "en" && belt?.nameEn ? belt.nameEn : belt?.name;
  const displayDesc =
    lang === "en" && belt?.descriptionEn
      ? belt.descriptionEn
      : belt?.description;

  const heroImg = gallery[heroIndex] ?? gallery[0];

  // zmiana zdjęcia strzałkami
  const goPrev = () =>
    setHeroIndex((i) => (i > 0 ? i - 1 : gallery.length - 1));
  const goNext = () =>
    setHeroIndex((i) => (i < gallery.length - 1 ? i + 1 : 0));

  return (
    <div>
      {/* Tytuł kategorii */}
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl md:text-3xl tracking-wide">
          Craft Symphony - {title}
        </h1>
      </div>

      {/* HERO */}
      <div className="relative">
        <div className="relative w-full">
          <div className="relative w-full aspect-[3/4] overflow-hidden rounded-2xl shadow-sm border border-neutral-200 bg-neutral-100">
            <AnimatePresence mode="wait">
              <motion.div
                key={`hero-${title}-${active}-${heroImg?.url ?? "noimg"}`}
                initial={{ opacity: 0, scale: 1.01 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.995 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative h-full w-full"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                {heroImg ? (
                  <>
                    <Image
                      src={heroImg.url}
                      alt={altFor(
                        heroImg,
                        `${labels.heroAltPrefix} ${
                          belt?.beltNo ?? displayName ?? `${active + 1}`
                        }`
                      )}
                      fill
                      sizes="(max-width:1280px) 90vw, 900px"
                      className="object-cover object-center"
                      priority={false}
                    />
                    {/* znak wodny w lewym dolnym rogu */}
{/* znak wodny w lewym dolnym rogu */}
<div className="absolute left-0 bottom-0 opacity-80">
  <div className="relative h-16 w-16 overflow-hidden rounded-md">
    <Image
      src="/images/znakwodny.png"
      alt="watermark"
      fill
      sizes="64px"
      className="object-contain pointer-events-none select-none"
    />
  </div>
</div>


                    {/* Strzałki na obrazie */}
                    <button
                      onClick={goPrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 hover:bg-black/50 text-white backdrop-blur-sm"
                      aria-label="Poprzednie zdjęcie"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 hover:bg-black/50 text-white backdrop-blur-sm"
                      aria-label="Następne zdjęcie"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-neutral-500">
                    Brak zdjęcia
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* MINIATURKI POD HERO */}
        {/* Mobile: duże kwadraty, poziomy scroll na całą szerokość */}
        {beltThumbs.length > 1 && (
          <div className="md:hidden mt-3">
            <div className="flex gap-3 overflow-x-auto px-1 py-1 snap-x snap-mandatory">
              {beltThumbs.map((thumb, i) => (
                <button
                  key={`m-thumb-${thumb.url}-${i}`}
                  onClick={() => setActive(i)}
                  className={`relative h-24 w-24 flex-none overflow-hidden rounded-lg border snap-start ${
                    i === active
                      ? "border-neutral-900 ring-2 ring-neutral-900"
                      : "border-neutral-300 hover:border-neutral-500"
                  }`}
                  aria-label={`${labels.selectBelt} ${thumb.beltNo}`}
                  title={`Pasek ${thumb.beltNo}`}
                >
                  <div className="relative h-24 w-24">
                    <Image
                      src={thumb.url}
                      alt={thumb.alt}
                      fill
                      sizes="96px"
                      className="object-cover rounded-lg"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

{/* Desktop: karuzela miniaturek pod hero */}
{beltThumbs.length > 1 && (
  <div className="hidden md:block mt-4 relative">
    {/* przyciski przewijania */}
<button
  type="button"
  aria-label="Przewiń w lewo"
  onClick={() => scrollDesktopThumbs("left")}
  className="
    absolute left-[-2.75rem] top-1/2 -translate-y-1/2 z-10
    hidden lg:flex h-10 w-10 items-center justify-center
    text-gray-800 hover:text-gray-900
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-800/40 rounded-full
  "
>
  <ChevronLeft className="h-7 w-7" />
</button>

    <div
      ref={deskThumbsRef}
      className="
    relative overflow-x-auto
    [scrollbar-width:none]           /* Firefox */
    [-ms-overflow-style:none]        /* IE/Edge */
    [&::-webkit-scrollbar]:hidden    /* Chrome/Safari/Opera */
  "
    >
      <div className="flex gap-3 px-1 py-1">
        {beltThumbs.map((thumb, i) => (
          <button
            key={`d-thumb-${thumb.url}-${i}`}
            onClick={() => setActive(i)}
            className={`relative aspect-square h-28 lg:h-32 flex-none overflow-hidden rounded-lg border transition ${
              i === active
                ? "border-neutral-500 ring-2 ring-neutral-500"
                : "border-neutral-300 hover:border-neutral-500"
            }`}
            aria-label={`${labels.selectBelt} ${thumb.beltNo}`}
            title={`Pasek ${thumb.beltNo}`}
          >
            <div className="relative h-full w-full">
              <Image
                src={thumb.url}
                alt={thumb.alt}
                fill
                sizes="(max-width:1280px) 120px, 160px"
                className="object-cover rounded-lg"
              />
            </div>
          </button>
        ))}
      </div>
    </div>

{/* przycisk w prawo – na zewnątrz, bez tła */}
<button
  type="button"
  aria-label="Przewiń w prawo"
  onClick={() => scrollDesktopThumbs("right")}
  className="
    absolute right-[-2.75rem] top-1/2 -translate-y-1/2 z-10
    hidden lg:flex h-10 w-10 items-center justify-center
    text-gray-800 hover:text-gray-900
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-800/40 rounded-full
  "
>
  <ChevronRight className="h-7 w-7" />
</button>
  </div>
)}

      </div>

      {/* OPIS + ROZMIARÓWKA */}
      <div className="mt-6 md:mt-8 text-center">
        <div className="text-center mb-3">
          <h3 className="font-serif text-base sm:text-lg tracking-wide">
            {labels.numberLabel}&nbsp;
            {belt?.beltNo ?? active + 1}&nbsp;
            {displayName ?? "—"}
          </h3>

        <p className="text-sm text-neutral-600 max-w-3xl mx-auto px-2">
            {displayDesc ?? "—"}
          </p>
        </div>

        {/* Rozmiary */}
        {/* Rozmiary */}
<div className="max-w-4xl mx-auto">
  {/* górny rozmiar */}


  {/* nagłówek: Rozmiary w cm */}
  <div className="text-center mt-2 sm:mt-14 mb-1 sm:mb-2">
    <span className="text-[11px] sm:text-[12px] uppercase tracking-wide text-neutral-500">
      {UI_STRINGS[lang].sizesInCm}
    </span>
  </div>
  <div className="text-center text-xs sm:text-sm text-neutral-600 mb-2 mb-[-48px]">
    {belt?.upperSize ?? "—"}
  </div>
  {/* Schemat */}
  <div className="rounded-2xl overflow-visible">
    <div className="relative mx-auto w-full max-w-xs sm:max-w-[40%] aspect-[3/2]">
      <Image
        src="/images/belt2.png"
        alt={labels.schemaAlt}
        fill
        sizes="(max-width:768px) 90vw, 40vw"
        className="object-contain"
      />

      {/* BĄBELKI TYLKO NA DESKTOPIE (po bokach schematu) */}
      <div className="hidden md:flex flex-col items-center gap-1 absolute top-1/2 -translate-y-1/2 left-0 -translate-x-[110%]">
        <em className="text-xs text-neutral-500 not-italic italic">
          {UI_STRINGS[lang].buckleSize}
        </em>
        <div className="inline-flex items-center gap-2 rounded-xl text-sm text-neutral-600 px-4  font-medium shadow-sm min-w-[8rem] justify-center">
          {typeof belt?.buckleSize !== "undefined" && belt?.buckleSize !== null ? `${belt.buckleSize}` : "—"}
        </div>
      </div>

      <div className="hidden md:flex flex-col items-center gap-1 absolute top-1/2 -translate-y-1/2 right-0 translate-x-[110%]">
        <em className="text-xs text-neutral-500 not-italic italic">
          {UI_STRINGS[lang].mainSize}
        </em>
        <div className="inline-flex items-center gap-2 rounded-xl text-sm text-neutral-600 px-4  font-medium shadow-sm min-w-[8rem] justify-center">
          {typeof belt?.mainSize !== "undefined" && belt?.mainSize !== null ? `${belt.mainSize}` : "—"}
        </div>
      </div>
    </div>
  </div>

  {/* dolny rozmiar */}
  <div className="text-center text-xs sm:text-sm text-neutral-600 mt-2 mt-[-48px]">
    {belt?.lowerSize ?? "—"}
  </div>

  {/* BĄBELKI NA MOBILE (pod schematem, małe i ciasne) */}
  <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden px-2">
    <div className="rounded-2xl  px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-sm text-neutral-600 text-center whitespace-nowrap">
        {UI_STRINGS[lang].buckleSize}
      </div>
      <div className="text-center text-sm font-medium leading-tight truncate">
        {typeof belt?.buckleSize !== "undefined" && belt?.buckleSize !== null ? `${belt.buckleSize}` : "—"}
      </div>
    </div>
    <div className="rounded-2xl  px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-sm text-neutral-600 text-center whitespace-nowrap">
        {UI_STRINGS[lang].mainSize}
      </div>
      <div className="text-center text-sm font-medium leading-tight truncate">
        {typeof belt?.mainSize !== "undefined" && belt?.mainSize !== null ? `${belt.mainSize}` : "—"}
      </div>
    </div>
  </div>
</div>


        <p className="mt-8 text-center text-[13px] text-neutral-600 mb-16 italic">
          {labels.price}{" "}
          <span className="font-medium tracking-wide">
            {formatPriceForLang(belt?.price, lang)}
          </span>
        </p>
      </div>
    </div>
  );
}

/* ===== Główny komponent – TYLKO dane z bazy ===== */
export default function LuxuryLanding({
  logo = "/images/logo3.png",
  aboutImage = "/images/3.png",
  defaultLang = "pl",
}: {
  logo?: string;
  aboutImage?: string;
  defaultLang?: Lang;
}) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const t = UI_STRINGS[lang];

  const [data, setData] = useState<CategoryData[] | null>(null);
  const [loading, setLoading] = useState(true);

  // persist + lang attr
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? ((localStorage.getItem("cs_lang") as Lang | null) || null)
        : null;
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    try {
      localStorage?.setItem?.("cs_lang", lang);
      document.documentElement.lang = lang;
    } catch {
      /* ignore */
    }
  }, [lang]);

  // Fetch + normalizacja
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/catalog", { cache: "no-store" });
        const json: CatalogResponse = await res.json();

        const normalized: CategoryData[] = (json?.categories ?? []).map(
          (cat) => {
            const catImages = toImageObjects(
              cat.images as (string | BeltImage)[]
            );

            const items: BeltItem[] = (cat.items ?? []).map((it) => {
              const min = Number(it.rozmiarMin);
              const max = Number(it.rozmiarMax);
              const upper = isFinite(Math.max(min, max))
                ? `${Math.max(min, max)} cm`
                : "—";
              const lower = isFinite(Math.min(min, max))
                ? `${Math.min(min, max)} cm`
                : "—";
              const main =
                it.rozmiarGlowny != null && it.rozmiarGlowny !== ""
                  ? `${it.rozmiarGlowny} cm`
                  : undefined;
              const buckle =
                it.rozSprz != null && it.rozSprz !== ""
                  ? `${Number(it.rozSprz)} cm`
                  : undefined;

              const imgs = sortImages(it.images || []);
              if (imgs.length && !imgs.some((x) => x.isPrimary)) {
                imgs[0].isPrimary = true;
              }

              return {
                name: it.title,
                nameEn: it.titleEn,
                description: it.description,
                descriptionEn: it.descriptionEn,
                price: it.cenaPLN,
                upperSize: upper,
                lowerSize: lower,
                mainSize: main,
                buckleSize: buckle,
                images: imgs,
                beltNo: it.numerPaska,
              };
            });

            return {
              title: cat.title,
              images: catImages,
              items,
            };
          }
        );

        if (!abort) setData(normalized);
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

  const hasRenderable = (c: CategoryData) => {
    const anyWithImages = (c.items || []).some(
      (it) => (it.images?.length || 0) > 0
    );
    const categoryImages = (c.images?.length || 0) > 0;
    return (c.items?.length || 0) > 0 && (anyWithImages || categoryImages);
  };

const navLink =
  "relative text-[12px] md:text-[13px] uppercase font-serif text-neutral-800 hover:text-neutral-950 transition " +
  "after:absolute after:-bottom-1 after:h-[1px] after:w-0 after:bg-neutral-900 after:transition-all after:duration-300 hover:after:w-full " +
  "focus:outline-none focus-visible:after:w-full";

  return (
    <div className="min-h-screen bg-[#f5f5ef] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#f5f5ef] backdrop-blur supports-[backdrop-filter]:bg-[#f5f5ef]">
        <div className="relative mx-auto max-w-6xl h-16 md:h-20 px-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full">
            <div /> {/* pusty wyrównywacz */}

            {/* Środek */}
            <div className="justify-self-center">
              <div className="flex items-center gap-6 md:gap-8">
          <Link href="/" className={`${navLink} after:left-0`}>{t.navLeather}</Link>


                <div className="relative h-14 w-14 md:h-20 md:w-20 shrink-0">
                  <Image
                    src={logo}
                    alt="Craft Symphony"
                    fill
                    sizes="80px"
                    className="object-contain"
                  />
                </div>

                <Link href="/wood" className={`${navLink} after:right-0`}>{t.navWood}</Link>







              </div>
            </div>

            {/* DESKTOP/TABLET: języki po prawej */}
            <div className="justify-self-end hidden sm:block">
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
                  <Image
                    src="/images/poland.png"
                    alt=""
                    width={20}
                    height={14}
                    className="rounded-[2px] shadow-sm"
                  />
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
                  <Image
                    src="/images/england.png"
                    alt=""
                    width={20}
                    height={14}
                    className="rounded-[2px] shadow-sm"
                  />
                  <span className="sr-only">EN</span>
                </button>
              </div>
            </div>
          </div>

          {/* MOBILE: pływające flagi w prawym górnym rogu */}
{/* MOBILE: pasek flag pod navbarem (fixed) */}
<div className="sm:hidden fixed top-16 inset-x-0 z-40">
  <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-end gap-1.5">
    <button
      onClick={() => setLang("pl")}
      aria-pressed={lang === "pl"}
      aria-label="Polski"
      title="Polski"
      className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors ${
        lang === "pl" ? "bg-[#eaeae2]" : "hover:bg-neutral-100"
      }`}
    >
      <Image
        src="/images/poland.png"
        alt=""
        width={20}
        height={14}
        className="rounded-[2px] shadow-sm"
      />
      <span className="sr-only">PL</span>
    </button>
    <button
      onClick={() => setLang("en")}
      aria-pressed={lang === "en"}
      aria-label="English"
      title="English"
      className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors ${
        lang === "en" ? "bg-[#eaeae2]" : "hover:bg-neutral-100"
      }`}
    >
      <Image
        src="/images/england.png"
        alt=""
        width={20}
        height={14}
        className="rounded-[2px] shadow-sm"
      />
      <span className="sr-only">EN</span>
    </button>
  </div>
</div>

        </div>
      </header>

      {/* MAIN */}
      <main className="pt-[5.75rem] md:pt-24 pb-24">
        <section className="mx-auto max-w-6xl px-4 space-y-16 md:space-y-24">
          {/* LOADING */}
          {loading && (
            <div className="text-center text-sm text-neutral-600">
              {t.loading}
            </div>
          )}

          {/* CATEGORIES FROM DB */}
          {!loading &&
            data &&
            data.filter(hasRenderable).map((cat, idx) => (
              <div key={`${cat.title}-${idx}`}>
                <CategorySection
                  title={cat.title}
                  images={cat.images}
                  items={cat.items}
                  labels={t}
                  lang={lang}
                />
                <div className="mx-auto w-[100%] h-px bg-neutral-300" />
              </div>
            ))}

          {/* EMPTY STATE */}
          {!loading && (data?.filter(hasRenderable).length ?? 0) === 0 && (
            <div className="text-center text-sm text-neutral-600">
              {t.empty}
            </div>
          )}

          {/* O rzemiośle + formularz */}
          <div className="mt-4 md:mt-6 text-center">
            {/* Formularz */}
            <div className="mt-12 md:mt-16 text-center">
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

            {/* Obraz o rzemiośle */}
            <div className="relative mx-auto h-64 md:h-[31rem] w-full max-w-3xl">
              <Image
                src={aboutImage}
                alt="Craft"
                fill
                sizes="(max-width:768px) 90vw, 60vw"
                className="object-contain"
              />
            </div>

            <p className="mt-4 md:mt-[-6] max-w-3xl mx-auto text-sm leading-relaxed text-neutral-700 px-2 italic">
              {t.about}
            </p>
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

            <div className="text-center text-xs text-neutral-500">
              © 2025 Craft Symphony
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
