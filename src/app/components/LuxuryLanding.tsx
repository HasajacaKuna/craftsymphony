"use client";
import { useState, useEffect, useRef } from "react";
import { motion, useSpring } from "framer-motion";
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
import Navbar from "../components/Navbar"; // ścieżkę dostosuj do siebie

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
  upperSizeNum?: number | null;
lowerSizeNum?: number | null;
mainSizeNum?: number | null;
buckleSizeNum?: number | null;
priceNum?: number | null;

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
    filters: string;
    openFilters: string;
    close: string;
    apply: string;
    clearAll:string;
    search:string;
    priceRange: string;
    lengthRange:string;
    buckleRange:string;
    beltNo:string;
    matching:string;
    any: string;

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
    mainSize: "Długość paska",
    buckleSize: "Szerokość klamry",
    sizesInCm: "Rozmiary w cm",
    about:
      "Każdy pasek powstaje w całości ręcznie – od doboru skóry, przez cięcie i barwienie, po wykończenie krawędzi. Wierzymy w rzemiosło, które ma duszę: staranność detalu i ponadczasowy charakter. Nasze paski łączą tradycję z nowoczesną precyzją — projektowane z myślą o trwałości i pięknie, które dojrzewa z czasem.",
    loading: "Ładowanie katalogu…",
    empty: "Brak produktów do wyświetlenia.",
    // W KAŻDYM języku (pl/en) dodaj:
filters: "Filtry",
openFilters: "Pokaż filtry",
close: "Zamknij",
apply: "Zastosuj",
clearAll: "Wyczyść",
search: "Szukaj",
priceRange: "Cena (PLN)",
lengthRange: "Długość paska (cm)",
buckleRange: "Szerokość klamry (cm)",
beltNo: "Numer paska",
matching: "pasuje",
any: "Dowolny"

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
    mainSize: "Belt length",
    buckleSize: "Buckle width",
    sizesInCm: "Sizes in cm",
    about:
      "Each belt is crafted entirely by hand — from leather selection and cutting to dyeing and edge finishing. We believe in soul-filled craftsmanship: meticulous detail and timeless character. Our belts blend tradition with modern precision, designed for durability and beauty that matures over time.",
    loading: "Loading catalog…",
    empty: "No products to display.",
    filters: "Filters",
openFilters: "Show filters",
close: "Close",
apply: "Apply",
clearAll: "Clear",
search: "Search",
priceRange: "Price (PLN)",
lengthRange: "Belt length (cm)",
buckleRange: "Buckle width (cm)",
beltNo: "Belt number",
matching: "match",
any: "Any"

  },
};

export type LuxuryLandingProps = {
  logo?: string;
  aboutImage?: string;
  defaultLang?: Lang;
};

export type Labels = (typeof UI_STRINGS)["pl"];

/* ===== utils ===== */

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && isFinite(v)) return v;
  const m = String(v).match(/[\d,.]+/g)?.join("") ?? "";
  const n = Number(m.replace(",", "."));
  return isFinite(n) ? n : null;
}

function clampRange([min, max]: [number, number]): [number, number] {
  return [Math.min(min, max), Math.max(min, max)];
}

function inNumRange(x: number | null, r?: [number, number] | null) {
  if (x == null || !r) return true;
  return x >= r[0] && x <= r[1];
}

function formatPriceForLang(price: string | number | undefined, lang: Lang) {
  if (price == null) return "—";

  if (typeof price === "number") {
    if (lang === "pl") {
      return `${price.toLocaleString("pl-PL")} PLN`;
    }
    const eur = price / 4;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(eur);
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
const [processedSrc, setProcessedSrc] = useState<Record<string, string>>({});

  
  const [active, setActive] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // do crossfade
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [nextLoaded, setNextLoaded] = useState(false);

  // animacja (placeholder pod przyszłe efekty)
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
    const step = Math.round(el.clientWidth * 0.9);
    el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  };

  // ALT wg języka
  const altFor = (img: BeltImage, fallback: string) =>
    (lang === "en" ? img.altEn || img.altPl : img.altPl || img.altEn) ||
    fallback;

  // reset hero przy zmianie paska — wybierz primary nowego paska
  useEffect(() => {
    const p = pickPrimary(beltGallery);
    setHeroIndex(Math.max(0, beltGallery.indexOf(p ?? beltGallery[0])));
    // gdy zmienia się pasek, włącz crossfade ze starego kadru
    setPrevUrl((u) => u ?? gallery[heroIndex]?.url ?? null);
    setNextLoaded(false);
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
      setPrevUrl(gallery[heroIndex]?.url ?? null);
      setNextLoaded(false);
      setActive((prev) => {
        const next = prev + (dx < 0 ? 1 : -1);
        return Math.max(0, Math.min(items.length - 1, next));
      });
    }
    setTouchStartX(null);
  };

  

  // miniatury: primary (albo fallback) każdego paska
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
    (lang === "en" && belt?.nameEn ? belt.nameEn : belt?.name) ?? "";
  const displayDesc =
    (lang === "en" && belt?.descriptionEn
      ? belt.descriptionEn
      : belt?.description) ?? "—";

  const heroImg = gallery[heroIndex] ?? gallery[0];

  // helper do płynnej zmiany zdjęcia w tej samej galerii
  const setHeroSafely = (updater: (i: number) => number) => {
    setPrevUrl(gallery[heroIndex]?.url ?? null);
    setNextLoaded(false);
    setHeroIndex(updater);
  };

  // strzałki
  const goPrev = () => setHeroSafely((i) => (i > 0 ? i - 1 : gallery.length - 1));
  const goNext = () => setHeroSafely((i) => (i < gallery.length - 1 ? i + 1 : 0));

  // klik na miniaturze (desktop/mobile)
  const handleSelectActive = (i: number) => {
    setPrevUrl(gallery[heroIndex]?.url ?? null);
    setNextLoaded(false);
    setActive(i);
  };

  // Obrót poziomych obrazów o 90° (-> pion) i zwrot dataURL; bezpieczny (CORS -> fallback)
async function rotateIfLandscape(imgEl: HTMLImageElement, src: string) {
  try {
    const nw = imgEl.naturalWidth;
    const nh = imgEl.naturalHeight;
    if (!nw || !nh) return null;
    if (nw <= nh) return null; // już pion — nic nie rób

    // Canvas: po obrocie szerokość = nh, wysokość = nw
    const canvas = document.createElement("canvas");
    canvas.width = nh;
    canvas.height = nw;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // środek -> obrót 90° -> rysunek
    ctx.translate(nh / 2, nw / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(imgEl, -nw / 2, -nh / 2, nw, nh);

    // Jakość 0.9; można zmienić na "image/png" jeśli wolisz bezstratnie
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    return dataUrl;
  } catch {
    // np. CORS „tainted canvas” — trudno, zostaw oryginał
    return null;
  }
}


  return (
    <div>
      {/* Tytuł kategorii */}
      <div className="mb-6 text-center">
        <h1 className="font-serif text-base sm:text-lg md:text-3xl tracking-normal sm:tracking-wide">
          Craft Symphony - {title}
        </h1>
      </div>

      {/* HERO */}
      <div className="relative">
        <div className="relative w-full">
          {/* Portretowy kadr (bez mignięć; crossfade) */}
          <div className="relative w-full md:w-1/2 aspect-[3/4] max-h-[60vh] md:max-h-none overflow-hidden rounded-2xl shadow-sm border border-neutral-200 bg-neutral-100 mx-auto">
            <div
              className="absolute inset-0"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {/* Poprzedni kadr – znika dopiero gdy nowe się załaduje */}
              {prevUrl && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: nextLoaded ? 0 : 1 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="absolute inset-0 will-change-[opacity]"
                >
                  <Image
                    src={prevUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 900px"
                    className="object-cover object-center select-none pointer-events-none"
                    priority={false}
                  />
                </motion.div>
              )}

              {/* Aktualny kadr – fade-in po załadowaniu */}
              <motion.div
                key={heroImg?.url ?? "noimg"}
                initial={{ opacity: 0.001 }}
                animate={{ opacity: nextLoaded ? 1 : 0.001 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="absolute inset-0 will-change-[opacity]"
              >
                {heroImg ? (
                  <Image
                    src={heroImg.url}
                    alt={altFor(
                      heroImg,
                      `${UI_STRINGS[lang].heroAltPrefix} ${
                        belt?.beltNo ?? displayName ?? `${active + 1}`
                      }`
                    )}
                    fill
                    sizes="(max-width: 768px) 100vw, 900px"
                    className="object-cover object-center"
                    onLoadingComplete={() => {
                      setNextLoaded(true);
                      setTimeout(() => setPrevUrl(null), 200);
                    }}
                    priority={false}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-neutral-500">
                    Brak zdjęcia
                  </div>
                )}
              </motion.div>

              {/* znak wodny */}
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

              {/* Strzałki */}
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
            </div>
          </div>
        </div>

        {/* MINIATURKI POD HERO */}
        {/* Mobile */}
        {beltThumbs.length > 1 && (
          <div className="md:hidden mt-3">
            <div className="flex gap-3 overflow-x-auto px-1 py-1 snap-x snap-mandatory">
              {beltThumbs.map((thumb, i) => (
                <button
                  key={`m-thumb-${thumb.url}-${i}`}
                  onClick={() => handleSelectActive(i)}
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
                [scrollbar-width:none]
                [-ms-overflow-style:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
              <div className="flex gap-3 px-1 py-1">
                {beltThumbs.map((thumb, i) => (
                  <button
                    key={`d-thumb-${thumb.url}-${i}`}
                    onClick={() => handleSelectActive(i)}
                    className={`relative aspect-square h-24 lg:h-24 flex-none overflow-hidden rounded-lg border transition ${
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
            {displayName || "—"}
          </h3>

          <p className="text-sm text-neutral-600 max-w-3xl mx-auto px-2">
            {displayDesc}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mt-2 sm:mt-14 mb-1 sm:mb-2">
            <span className="text-[11px] sm:text-[12px] uppercase tracking-wide text-neutral-500">
              {UI_STRINGS[lang].sizesInCm}
            </span>
          </div>
          <div className="text-center text-xs sm:text-sm text-neutral-600 mb-2 mb-[-48px]">
            {belt?.upperSize ?? "—"}
          </div>

          <div className="rounded-2xl overflow-visible">
            <div className="relative mx-auto w-full max-w-xs sm:max-w-[40%] aspect-[3/2]">
              <Image
                src="/images/belt2.png"
                alt={labels.schemaAlt}
                fill
                sizes="(max-width:768px) 90vw, 40vw"
                className="object-contain"
              />

              <div className="hidden md:flex flex-col items-center gap-1 absolute top-1/2 -translate-y-1/2 left-0 -translate-x-[110%]">
                <em className="text-xs text-neutral-500 not-italic italic">
                  {UI_STRINGS[lang].buckleSize}
                </em>
                <div className="inline-flex items-center gap-2 rounded-xl text-sm text-neutral-600 px-4  font-medium shadow-sm min-w-[8rem] justify-center">
                  {typeof belt?.buckleSize !== "undefined" &&
                  belt?.buckleSize !== null
                    ? `${belt.buckleSize}`
                    : "—"}
                </div>
              </div>

              <div className="hidden md:flex flex-col items-center gap-1 absolute top-1/2 -translate-y-1/2 right-0 translate-x-[110%]">
                <em className="text-xs text-neutral-500 not-italic italic">
                  {UI_STRINGS[lang].mainSize}
                </em>
                <div className="inline-flex items-center gap-2 rounded-xl text-sm text-neutral-600 px-4  font-medium shadow-sm min-w-[8rem] justify-center">
                  {typeof belt?.mainSize !== "undefined" &&
                  belt?.mainSize !== null
                    ? `${belt.mainSize}`
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs sm:text-sm text-neutral-600 mt-2 mt-[-48px]">
            {belt?.lowerSize ?? "—"}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden px-2">
            <div className="rounded-2xl  px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-xs text-neutral-600 text-center whitespace-nowrap">
                {UI_STRINGS[lang].buckleSize}
              </div>
              <div className="text-center text-sm  leading-tight truncate mt-2">
                {typeof belt?.buckleSize !== "undefined" &&
                belt?.buckleSize !== null
                  ? `${belt.buckleSize}`
                  : "—"}
              </div>
            </div>
            <div className="rounded-2xl  px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-xs text-neutral-600 text-center whitespace-nowrap">
                {UI_STRINGS[lang].mainSize}
              </div>
              <div className="text-center text-sm  leading-tight truncate mt-2">
                {typeof belt?.mainSize !== "undefined" &&
                belt?.mainSize !== null
                  ? `${belt.mainSize}`
                  : "—"}
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

const [isFiltersOpen, setFiltersOpen] = useState(false);

useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFiltersOpen(false); };
  document.addEventListener("keydown", onKey);
  document.body.style.overflow = isFiltersOpen ? "hidden" : "";
  return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
}, [isFiltersOpen]);


type Filters = {
  q: string;
  price?: [number, number] | null;
  length?: [number, number] | null; // po mainSizeNum
  buckle?: [number, number] | null;
  beltNo?: number | null;
};

const [filters, setFilters] = useState<Filters>({
  q: "",
  price: null,
  length: null,
  buckle: null,
  beltNo: null,
});


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

// 1) Odfiltrowanie kategorii "wood" (na wszelki wypadek po slug i po tytule w PL/EN)
const srcCats = (json?.categories ?? []).filter(cat => {
  const slug = cat.slug?.toLowerCase?.() ?? "";
  const title = cat.title?.toLowerCase?.() ?? "";
  return slug !== "wood" && title !== "wood" && title !== "drewno";
});

// 2) Dopiero teraz mapujemy do naszego kształtu
const normalized: CategoryData[] = srcCats.map((cat) => {

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
                // DODAJ do zwracanego obiektu BeltItem:
upperSizeNum: isFinite(Math.max(min, max)) ? Math.max(min, max) : null,
lowerSizeNum: isFinite(Math.min(min, max)) ? Math.min(min, max) : null,
mainSizeNum: num(it.rozmiarGlowny),
buckleSizeNum: num(it.rozSprz),
priceNum: typeof it.cenaPLN === "number" ? it.cenaPLN : num(it.cenaPLN),

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

    // === FILTROWANIE (globalnie, przed renderem) ===
  const predicate = (it: BeltItem) => {
    const txt =
      (it.name ?? "") +
      " " +
      (it.nameEn ?? "") +
      " " +
      (it.description ?? "") +
      " " +
      (it.descriptionEn ?? "");

    const qOk =
      !filters.q ||
      txt.toLowerCase().includes(filters.q.toLowerCase());

    const priceOk = inNumRange(it.priceNum ?? null, filters.price ?? undefined);
    const lengthOk = inNumRange(it.mainSizeNum ?? null, filters.length ?? undefined);
    const buckleOk = inNumRange(it.buckleSizeNum ?? null, filters.buckle ?? undefined);
    const beltNoOk =
      filters.beltNo == null ? true : it.beltNo === filters.beltNo;

    return qOk && priceOk && lengthOk && buckleOk && beltNoOk;
  };

  const filteredData: CategoryData[] | null = !data
    ? null
    : data.map((cat) => ({
        ...cat,
        items: (cat.items ?? []).filter(predicate),
      }));

        const totalMatches =
    filteredData?.reduce((s, c) => s + (c.items?.length ?? 0), 0) ?? 0;



  const allItems = (data ?? []).flatMap(c => c.items ?? []);

const bounds = {
  price: clampRange([
    Math.min(...allItems.map(i => i.priceNum ?? Infinity)),
    Math.max(...allItems.map(i => i.priceNum ?? -Infinity)),
  ] as [number, number]),
  length: clampRange([
    Math.min(...allItems.map(i => i.mainSizeNum ?? Infinity)),
    Math.max(...allItems.map(i => i.mainSizeNum ?? -Infinity)),
  ] as [number, number]),
  buckle: clampRange([
    Math.min(...allItems.map(i => i.buckleSizeNum ?? Infinity)),
    Math.max(...allItems.map(i => i.buckleSizeNum ?? -Infinity)),
  ] as [number, number]),
};


  const navLink =
    "relative text-[12px] md:text-[13px] uppercase font-serif text-neutral-800 hover:text-neutral-950 transition " +
    "after:absolute after:-bottom-1 after:h-[1px] after:w-0 after:bg-neutral-900 after:transition-all after:duration-300 hover:after:w-full " +
    "focus:outline-none focus-visible:after:w-full";

  return (
    <div className="min-h-screen bg-[#f5f5ef] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <Navbar
        lang={lang}
        setLang={setLang}
        logo="/images/logo3.png"
        labels={{ navLeather: t.navLeather, navWood: t.navWood }}
      />

      {/* MAIN */}
      <main className="pt-[5.75rem] md:pt-24 pb-24">
        <section className="mx-auto max-w-6xl px-4 space-y-16 md:space-y-24">
          {/* LOADING */}
          {loading && (
            <div className="text-center text-sm text-neutral-600">
              {t.loading}
            </div>
          )}

{/* GLOBALNY PRZYCISK FILTRÓW — FIXED, WYRÓWNANY DO LEWEJ SEKCJI */}
<div
  className="
    fixed left-0 right-0 z-40
    top-[5.75rem] md:top-24
    pointer-events-none
  "
>
  <div className="mx-auto max-w-6xl px-4">
    <div className="flex justify-start">
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white/80 backdrop-blur px-4 py-2 text-sm hover:bg-white shadow-sm"
      >
        {t.openFilters}
      </button>
    </div>
  </div>
</div>




          {/* CATEGORIES FROM DB */}
{!loading &&
  filteredData &&
  filteredData.filter(hasRenderable).map((cat, idx) => (
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
{!loading && (filteredData?.filter(hasRenderable).length ?? 0) === 0 && (
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

      {/* OVERLAY */}
{isFiltersOpen && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={() => setFiltersOpen(false)}
    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
    aria-hidden
  />
)}

{/* SZUFLADA LEWA */}
<motion.aside
  initial={{ x: "-100%" }}
  animate={{ x: isFiltersOpen ? 0 : "-100%" }}
  transition={{ type: "spring", stiffness: 320, damping: 32 }}
  className="fixed left-0 top-0 z-50 h-dvh w-[90vw] max-w-md bg-[#f7f7f2] shadow-2xl border-r border-neutral-200"
  role="dialog"
  aria-modal="true"
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(_, info) => {
    if (info.offset.x < -80) setFiltersOpen(false);
  }}
>
  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
    <h2 className="text-sm font-medium uppercase tracking-wide">{t.filters}</h2>
    <button
      type="button"
      onClick={() => setFiltersOpen(false)}
      className="rounded-lg border border-neutral-300 px-3 py-1 text-sm hover:bg-white"
    >
      {t.close}
    </button>
  </div>

  {/* FORMULARZ FILTRÓW */}
  <div className="p-4 space-y-4 overflow-y-auto h-[calc(100dvh-56px)]">
    {/* Szukaj */}
    <div>
      <label className="block text-xs uppercase tracking-wide text-neutral-600 mb-1 mt-8">
        {t.search}
      </label>
      <input
        value={filters.q}
        onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
        placeholder="np. brąz, klasyczny..."
        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
    </div>

    {/* Cena */}
    <fieldset>
      <legend className="block text-xs uppercase tracking-wide text-neutral-600 mb-1">
        {t.priceRange}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder={String(bounds.price?.[0] ?? "")}
          value={filters.price?.[0] ?? ""}
          onChange={e => {
            const v = num(e.target.value) ?? undefined;
            setFilters(f => ({ ...f, price: v != null || f.price?.[1] != null ? [v ?? (bounds.price?.[0] ?? 0), f.price?.[1] ?? (bounds.price?.[1] ?? 0)] : null }));
          }}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder={String(bounds.price?.[1] ?? "")}
          value={filters.price?.[1] ?? ""}
          onChange={e => {
            const v = num(e.target.value) ?? undefined;
            setFilters(f => ({ ...f, price: v != null || f.price?.[0] != null ? [f.price?.[0] ?? (bounds.price?.[0] ?? 0), v ?? (bounds.price?.[1] ?? 0)] : null }));
          }}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
      </div>
    </fieldset>

    {/* Długość główna */}
    <fieldset>
      <legend className="block text-xs uppercase tracking-wide text-neutral-600 mb-1">
        {t.lengthRange}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder={String(bounds.length?.[0] ?? "")}
          value={filters.length?.[0] ?? ""}
          onChange={e => {
            const v = num(e.target.value) ?? undefined;
            setFilters(f => ({ ...f, length: v != null || f.length?.[1] != null ? [v ?? (bounds.length?.[0] ?? 0), f.length?.[1] ?? (bounds.length?.[1] ?? 0)] : null }));
          }}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder={String(bounds.length?.[1] ?? "")}
          value={filters.length?.[1] ?? ""}
          onChange={e => {
            const v = num(e.target.value) ?? undefined;
            setFilters(f => ({ ...f, length: v != null || f.length?.[0] != null ? [f.length?.[0] ?? (bounds.length?.[0] ?? 0), v ?? (bounds.length?.[1] ?? 0)] : null }));
          }}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
      </div>
    </fieldset>

    {/* Szerokość klamry */}
    <fieldset>
      <legend className="block text-xs uppercase tracking-wide text-neutral-600 mb-1">
        {t.buckleRange}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder={String(bounds.buckle?.[0] ?? "")}
          value={filters.buckle?.[0] ?? ""}
          onChange={e => {
            const v = num(e.target.value) ?? undefined;
            setFilters(f => ({ ...f, buckle: v != null || f.buckle?.[1] != null ? [v ?? (bounds.buckle?.[0] ?? 0), f.buckle?.[1] ?? (bounds.buckle?.[1] ?? 0)] : null }));
          }}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder={String(bounds.buckle?.[1] ?? "")}
          value={filters.buckle?.[1] ?? ""}
          onChange={e => {
            const v = num(e.target.value) ?? undefined;
            setFilters(f => ({ ...f, buckle: v != null || f.buckle?.[0] != null ? [f.buckle?.[0] ?? (bounds.buckle?.[0] ?? 0), v ?? (bounds.buckle?.[1] ?? 0)] : null }));
          }}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
      </div>
    </fieldset>

    {/* Numer paska */}
    <div>
      <label className="block text-xs uppercase tracking-wide text-neutral-600 mb-1">
        {t.beltNo}
      </label>
      <input
        type="number"
        value={filters.beltNo ?? ""}
        onChange={e => setFilters(f => ({ ...f, beltNo: e.target.value ? Number(e.target.value) : null }))}
        placeholder={t.any}
        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
      />
    </div>

    {/* Akcje */}
    <div className="flex gap-2 pt-2">
      <button
        type="button"
        onClick={() => setFilters({ q: "", price: null, length: null, buckle: null, beltNo: null })}
        className="flex-1 rounded-xl border border-neutral-300 px-4 py-2 text-sm hover:bg-white"
      >
        {t.clearAll}
      </button>
      <button
        type="button"
        onClick={() => setFiltersOpen(false)}
        className="flex-1 rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm hover:opacity-90"
      >
        {t.apply}
      </button>
    </div>
  </div>
</motion.aside>

    </div>

    
  );
}
