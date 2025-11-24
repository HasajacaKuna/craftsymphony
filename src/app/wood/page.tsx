"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";

/* ===== Typy zgodne z /api/catalog ===== */
type Lang = "pl" | "en";

type BeltImage = {
  url: string;
  altPl?: string;
  altEn?: string;
  isPrimary?: boolean;
  order?: number;
};

type ApiItem = {
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

type ApiCategory = {
  slug: string;
  title: string;
  images?: (string | BeltImage)[];
  items: ApiItem[];
};

type CatalogResponse = { categories: ApiCategory[] };

/* ===== Model dla WOOD (jak w leather, ale bez rozmiarów) ===== */
type WoodItem = {
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  price: string | number;
  images?: BeltImage[];
  productNo?: number;
  priceNum?: number | null;
};

type WoodCategory = {
  title: string;
  images?: BeltImage[];
  items: WoodItem[];
};

/* ===== UI (PL/EN) ===== */

type Labels = {
  navLeather: string;
  navWood: string;
  heroAltPrefix: string;
  numberLabel: string;
  price: string;
  interestedHeading: string;
  interestedText: string;
  emailPlaceholder: string;
  productNoPlaceholder: string;
  submit: string;
  about: string;
  loading: string;
  empty: string;

   messagePlaceholder: string;

  /* Modal */
  successTitle: string;
  successText: string;
  ok: string;
};

const UI_STRINGS: Record<Lang, Labels> = {
  pl: {
    navLeather: "Skóra",
    navWood: "Drewno",
    heroAltPrefix: "Produkt",
    numberLabel: "Nr.",
    price: "Cena:",
    interestedHeading: "Jestem zainteresowany?",
    interestedText:
      "Podaj e-mail oraz numer produktu — odezwiemy się z potwierdzeniem.",
    emailPlaceholder: "Twój e-mail",
    productNoPlaceholder: "Nr produktu",
    submit: "Wyślij zapytanie",
    about:
      "Każdy produkt z drewna powstaje w 100% ręcznie — od selekcji materiału, przez precyzyjną obróbkę i kształtowanie, aż po finalne szlifowanie i wykończenie powierzchni. Pracujemy z naturalnym surowcem, którego charakter i rysunek słojów czynią każdy egzemplarz unikatowym. Każdy detal tworzony jest z dbałością o estetykę, ergonomię oraz trwałość. Wierzymy w rzemiosło z duszą: w przedmioty, które dojrzewają z użytkowaniem, nabierają blasku i stają się częścią codziennych rytuałów. Naszym celem jest ponadczasowa forma zakorzeniona w tradycji, lecz wykonana z nowoczesną precyzją i szacunkiem do natury.",
    loading: "Ładowanie katalogu…",
    empty: "Brak produktów do wyświetlenia.",
    messagePlaceholder: "Twoja wiadomość (np. rozmiar, kolor, pytania)…",

    successTitle: "Dziękujemy za wiadomość!",
    successText:
      "Odezwziemy się najszybciej jak to możliwe. Sprawdź skrzynkę pocztową — wkrótce dostaniesz od nas odpowiedź.",
    ok: "OK, super",
  },
  en: {
    navLeather: "Leather",
    navWood: "Wood",
    heroAltPrefix: "Product",
    numberLabel: "No.",
    price: "Price:",
    messagePlaceholder: "Your message (size, colour, questions)…",
    interestedHeading: "Interested?",
    interestedText:
      "Leave your email and product number — we’ll get back to you.",
    emailPlaceholder: "Your email",
    productNoPlaceholder: "Product no.",
    submit: "Send request",
    about:
      "Each wooden product is crafted entirely by hand—from the selection of raw material, through precise shaping and carving, to the final sanding and surface treatment. We work with natural wood whose grain, tone, and imperfections make every piece truly unique. Every detail is refined with attention to aesthetics, ergonomics, and long-lasting durability. We believe in soulful craftsmanship: in objects that age gracefully, develop character over time, and become part of daily rituals. Our aim is timeless design rooted in tradition, finished with modern precision and deep respect for nature.",
    loading: "Loading catalog…",
    empty: "No products to display.",

    successTitle: "Thank you for your message!",
    successText:
      "We’ll get back to you as soon as possible. Please keep an eye on your inbox for our reply.",
    ok: "Great",
  },
};

/* ===== Utils ===== */

function sortImages(imgs: BeltImage[] = []) {
  return [...imgs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
function pickPrimary(imgs: BeltImage[] = []) {
  const sorted = sortImages(imgs);
  return sorted.find((i) => i.isPrimary) || sorted[0];
}

function formatPriceForLang(price: string | number | undefined, lang: Lang) {
  if (price == null) return "—";
  if (typeof price === "number") {
    if (lang === "pl") return `${price.toLocaleString("pl-PL")} PLN`;
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

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && isFinite(v)) return v;
  const m = String(v).match(/[\d,.]+/g)?.join("") ?? "";
  const n = Number(m.replace(",", "."));
  return isFinite(n) ? n : null;
}

function toImageObjects(arr: (string | BeltImage)[] = []): BeltImage[] {
  return arr.map((x, i) =>
    typeof x === "string" ? { url: x, order: i } : { order: i, ...x }
  );
}

/* ===== Modal ===== */
function Modal({
  open,
  onClose,
  title,
  text,
  okLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text: string;
  okLabel: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) {
      document.addEventListener("keydown", onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thanks-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={ref}
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-neutral-200 p-6 text-center"
      >
        <h3 id="thanks-title" className="text-lg font-semibold text-neutral-900">
          {title}
        </h3>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
          {text}
        </p>

        <div className="mt-5 flex justify-center">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition"
            autoFocus
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Sekcja kategorii WOOD – jak w leather, ale BEZ rozmiarów ===== */

function CategorySection({
  title,
  images = [],
  items,
  labels,
  lang,
}: WoodCategory & { labels: Labels; lang: Lang }) {
  const [active, setActive] = useState(0); // aktywny produkt
  const [heroIndex, setHeroIndex] = useState(0); // aktywne zdjęcie w galerii

  // NOWE: śledzimy proporcje obrazka (szerokość / wysokość)
  const [aspect, setAspect] = useState(1);
  const isLandscape = aspect > 1.15;

  const current = items[active];
  const categoryGallery = images?.length ? sortImages(images) : [];
  const itemGallery = current?.images?.length
    ? sortImages(current.images)
    : [];
  const gallery = itemGallery.length ? itemGallery : categoryGallery;

  useEffect(() => {
    setHeroIndex(0);
  }, [active]);

  const heroImg = gallery[heroIndex] ?? gallery[0];

  const goPrevImage = () => {
    if (!gallery.length) return;
    setHeroIndex((i) => (i > 0 ? i - 1 : gallery.length - 1));
  };
  const goNextImage = () => {
    if (!gallery.length) return;
    setHeroIndex((i) => (i < gallery.length - 1 ? i + 1 : 0));
  };

  const itemThumbs = items
    .map((it, i) => {
      const primary = pickPrimary(it.images || []);
      const src = primary?.url || categoryGallery[0]?.url || "";
      return {
        url: src,
        productNo: it.productNo ?? i + 1,
        alt:
          (lang === "en"
            ? it.nameEn || it.name || `${labels.heroAltPrefix} ${i + 1}`
            : it.name || it.nameEn || `${labels.heroAltPrefix} ${i + 1}`) || "",
      };
    })
    .filter((t) => !!t.url);

  const displayName =
    (lang === "en" && current?.nameEn ? current.nameEn : current?.name) ?? "";
  const displayDesc =
    (lang === "en" && current?.descriptionEn
      ? current.descriptionEn
      : current?.description) ?? "—";

  const altForHero =
    heroImg?.altPl || heroImg?.altEn
      ? lang === "en"
        ? heroImg.altEn || heroImg.altPl || ""
        : heroImg.altPl || heroImg.altEn || ""
      : `${labels.heroAltPrefix} ${current?.productNo ?? displayName ?? ""}`;

  if (!items.length || !gallery.length) return null;

  // tuż przed `return ( ... )` w CategorySection:
const numericPrice =
  (current?.priceNum ?? null) ??
  (typeof current?.price === "number" ? current.price : null);

const shouldShowPrice =
  numericPrice != null && numericPrice > 0;


  return (
    <div>
      {/* Tytuł kategorii */}
      <div className="mb-6 text-center">
        <h1 className="font-serif text-base sm:text-lg md:text-3xl tracking-normal sm:tracking-wide">
        </h1>
      </div>

      {/* HERO */}
      <>
        {/* MOBILE */}
        <div className="relative md:hidden">
          <div className="relative w-full">
            <div className="relative w-full aspect-[3/4] max-h-[60vh] overflow-hidden rounded-2xl shadow-sm border border-neutral-200 bg-neutral-100 mx-auto">
              {heroImg ? (
                <Image
                  src={heroImg.url}
                  alt={altForHero}
                  fill
                  sizes="(max-width: 768px) 100vw"
                  className="object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-neutral-500">
                  Brak zdjęcia
                </div>
              )}

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
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={goPrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 hover:bg-black/50 text-white"
                    aria-label="Poprzednie zdjęcie"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={goNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 hover:bg-black/50 text-white"
                    aria-label="Następne zdjęcie"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Miniaturki – MOBILE */}
          {itemThumbs.length > 1 && (
            <div className="mt-3">
              <div className="flex gap-3 overflow-x-auto px-1 py-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {itemThumbs.map((thumb, i) => (
                  <button
                    key={`m-thumb-${thumb.url}-${i}`}
                    onClick={() => setActive(i)}
                    className={`relative h-24 w-24 flex-none overflow-hidden rounded-lg border snap-start ${
                      i === active
                        ? "border-neutral-900 ring-2 ring-neutral-900"
                        : "border-neutral-300 hover:border-neutral-500"
                    }`}
                    aria-label={`${labels.numberLabel} ${thumb.productNo}`}
                    title={`Produkt ${thumb.productNo}`}
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
        </div>

        {/* DESKTOP */}
              {/* DESKTOP */}
      <div className="relative hidden md:block">
        <div className="relative w-full">
          <motion.div
              className="
                relative
                h-[55vh] max-h-[65vh]
                overflow-hidden rounded-2xl shadow-sm border border-neutral-200 bg-neutral-100
                mx-auto
              "
            animate={{
              // szerzej dla poziomych, węziej dla pionowych
              width: isLandscape ? "92%" : "56%",
            }}
            initial={false}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
          >
            <div className="absolute inset-0">
              {heroImg ? (
                <Image
                  src={heroImg.url}
                  alt={altForHero}
                  fill
                  sizes="1400px"
                  className="object-cover object-center"
                  onLoadingComplete={(img) => {
                    const el = img as HTMLImageElement;
                    const nw = el.naturalWidth || 0;
                    const nh = el.naturalHeight || 1;
                    if (nh !== 0) {
                      setAspect(nw / nh);
                    }
                  }}
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-neutral-500">
                  Brak zdjęcia
                </div>
              )}

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
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={goPrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 hover:bg-black/50 text-white"
                    aria-label="Poprzednie zdjęcie"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={goNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 hover:bg-black/50 text-white"
                    aria-label="Następne zdjęcie"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Miniaturki – DESKTOP */}
        {itemThumbs.length > 1 && (
          <div className="mt-4 relative">
            <div
              className="
                relative overflow-x-auto
                [scrollbar-width:none]
                [-ms-overflow-style:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
              <div className="flex gap-3 px-1 py-1 justify-center">
                {itemThumbs.map((thumb, i) => (
                  <button
                    key={`d-thumb-${thumb.url}-${i}`}
                    onClick={() => setActive(i)}
                    className={`relative aspect-square h-24 lg:h-24 flex-none overflow-hidden rounded-lg border transition ${
                      i === active
                        ? "border-neutral-500 ring-2 ring-neutral-500"
                        : "border-neutral-300 hover:border-neutral-500"
                    }`}
                    aria-label={`${labels.numberLabel} ${thumb.productNo}`}
                    title={`Produkt ${thumb.productNo}`}
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
          </div>
        )}
      </div>

      </>

{/* OPIS + CENA (bez rozmiarów) */}
<div className="mt-6 md:mt-8 text-center">
  <div className="text-center mb-3">
    <h3 className="font-serif text-base sm:text-lg tracking-wide">
      {labels.numberLabel}&nbsp;
      {current?.productNo ?? active + 1}&nbsp;
      {displayName || "—"}
    </h3>

    <p className="text-sm text-neutral-600 max-w-3xl mx-auto px-2">
      {displayDesc}
    </p>
  </div>

<p
  className={
    "mt-6 text-center text-[13px] text-neutral-600 mb-16 italic" +
    (shouldShowPrice ? "" : " invisible")
  }
>
  {shouldShowPrice && (
    <>
      {labels.price}{" "}
      <span className="font-medium tracking-wide">
        {formatPriceForLang(current?.price, lang)}
      </span>
    </>
  )}
</p>

</div>

    </div>
  );
}

/* ===== STRONA WOOD ===== */

export default function WoodPage() {
  const [lang, setLang] = useState<Lang>("pl");
  const [data, setData] = useState<WoodCategory[] | null>(null);
  const [loading, setLoading] = useState(true);

  // modal
  const [showThanks, setShowThanks] = useState(false);
  const [nextUrl, setNextUrl] = useState<string>("");

  // język z localStorage
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

  const t = UI_STRINGS[lang];

  // Obsługa powrotu z FormSubmit (?sent=1) -> pokaż modal
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("sent") === "1") {
        setShowThanks(true);
        url.searchParams.delete("sent");
        window.history.replaceState({}, "", url.toString());
      }
      url.searchParams.set("sent", "1");
      setNextUrl(url.toString());
    } catch {}
  }, []);

  // Fetch z /api/catalog -> tylko kategoria wood/drewno
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/catalog", { cache: "no-store" });
        const json: CatalogResponse = await res.json();

        const srcCats = (json?.categories ?? []).filter((cat) => {
          const slug = (cat.slug ?? "").toLowerCase().trim();
          const title = (cat.title ?? "").toLowerCase().trim();
          return slug === "wood" || title === "wood" || title === "drewno";
        });

        const normalized: WoodCategory[] = srcCats.map((cat) => {
          const catImages = toImageObjects(
            (cat.images as (string | BeltImage)[]) ?? []
          );

          const items: WoodItem[] = (cat.items ?? []).map((it) => {
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
              images: imgs,
              productNo: it.numerPaska,
              priceNum:
                typeof it.cenaPLN === "number" ? it.cenaPLN : num(it.cenaPLN),
            };
          });

          return {
            title: cat.title,
            images: catImages,
            items,
          };
        });

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

  const hasRenderable = (c: WoodCategory) => {
    const anyWithImages = (c.items || []).some(
      (it) => (it.images?.length || 0) > 0
    );
    const categoryImages = (c.images?.length || 0) > 0;
    return (c.items?.length || 0) > 0 && (anyWithImages || categoryImages);
  };

  return (
    <div className="min-h-screen bg-[#f5f5ef] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <Navbar
        lang={lang}
        setLang={setLang}
        logo="/images/logo3.png"
        labels={{ navLeather: t.navLeather, navWood: t.navWood }}
      />

      <main className="pt-[5.75rem] md:pt-24 pb-24">
        <section className="mx-auto max-w-6xl px-4 space-y-16 md:space-y-24">
          {/* LOADING */}
          {loading && (
            <div className="mt-8 text-center text-sm text-neutral-600">
              {t.loading}
            </div>
          )}

          {/* KATEGORIA WOOD – jak w leather */}
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
                <div className="mx-auto w-full h-px bg-neutral-300" />
              </div>
            ))}

          {/* EMPTY STATE */}
          {!loading &&
            (!data || data.filter(hasRenderable).length === 0) && (
              <div className="mt-10 text-center text-sm text-neutral-600">
                {t.empty}
              </div>
            )}

          {/* Formularz zainteresowania */}
          <div className="mt-8 md:mt-10 text-center">
            <h3 className="font-serif text-lg md:text-xl tracking-wide">
              {t.interestedHeading}
            </h3>

            <p className="mt-2 text-sm text-neutral-600 px-2">
              {t.interestedText}
            </p>

      <form
  action="https://formsubmit.co/contact@craftsymphony.com"
  method="POST"
  className="mt-5 flex flex-col items-center gap-3 px-2"
>
  {/* Opcje FormSubmit */}
  <input type="hidden" name="_captcha" value="false" />
  <input type="hidden" name="_template" value="table" />
  <input type="hidden" name="_next" value={nextUrl} />
  <input
    type="hidden"
    name="_subject"
    value={`${
      lang === "pl" ? "[DREWNO]" : "[WOOD]"
    } Nowe zapytanie produktowe ze strony`}
  />
  <input
    type="hidden"
    name="material"
    value={lang === "pl" ? "Drewno" : "Wood"}
  />
  {/* Honeypot */}
  <input
    type="text"
    name="_honey"
    className="hidden"
    tabIndex={-1}
    autoComplete="off"
  />

  {/* E-mail + numer produktu w jednym rzędzie (desktop) */}
  <div className="w-full max-w-xl flex flex-col sm:flex-row gap-3">
    <input
      name="email"
      type="email"
      required
      placeholder={t.emailPlaceholder}
      className="w-full rounded-xl border-2 border-neutral-300 bg-[#f5f5ef] text-neutral-900 placeholder-neutral-500 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900/20"
      aria-label={t.emailPlaceholder}
    />
    <input
      name="productNo"
      type="text"
      inputMode="numeric"
      pattern="[0-9]{1,6}"
      required
      placeholder={t.productNoPlaceholder}
      aria-label={t.productNoPlaceholder}
      className="w-full sm:w-40 rounded-xl border-2 border-neutral-300 bg-[#f5f5ef] text-neutral-900 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900/20"
    />
  </div>

  {/* Pole na wiadomość – ta sama szerokość */}
  <textarea
    name="message"
    required
    rows={4}
    placeholder={t.messagePlaceholder}
    aria-label={t.messagePlaceholder}
    className="w-full max-w-xl rounded-xl border-2 border-neutral-300 bg-[#f5f5ef] text-neutral-900 placeholder-neutral-500 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900/20"
  />

  <button
    type="submit"
    className="w-full max-w-xl sm:w-auto px-6 py-3 bg-neutral-900 rounded-xl border border-neutral-900 text-white hover:bg-neutral-800 transition disabled:opacity-50"
  >
    {t.submit}
  </button>
</form>

          </div>

          {/* Obraz + opis na dole */}
          <div className="mt-10 md:mt-12 text-center mb-14">
            <div className="relative mx-auto h-64 md:h-[31rem] w-full max-w-3xl">
              <Image
                src="/images/1.png"
                alt={
                  lang === "pl"
                    ? "Rzemiosło — pracownia"
                    : "Craft — workshop"
                }
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
          <div className="space-y-2 mt-8">
            <div className="mx-auto w-full h-px bg-neutral-300" />

            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 text-sm px-2">
              <div className="md:justify-self-start text-center md:text-left text-neutral-700">
                <div className="font-medium">kontakt@craftsymphony.pl</div>
                <div className="mt-1">+48 692 296 979</div>
              </div>

              <div className="text-center text-xs text-neutral-500" />

              <div className="md:justify-self-end flex items-center justify-center md:justify-end gap-5 text-neutral-700">
                <Link
                  href="#"
                  aria-label="Facebook"
                  className="hover:opacity-80"
                >
                  <Facebook />
                </Link>
                <Link
                  href="#"
                  aria-label="Instagram"
                  className="hover:opacity-80"
                >
                  <Instagram />
                </Link>
                <Link
                  href="#"
                  aria-label="YouTube"
                  className="hover:opacity-80"
                >
                  <Youtube />
                </Link>
                <Link
                  href="#"
                  aria-label="LinkedIn"
                  className="hover:opacity-80"
                >
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

      {/* MODAL */}
      <Modal
        open={showThanks}
        onClose={() => setShowThanks(false)}
        title={t.successTitle}
        text={t.successText}
        okLabel={t.ok}
      />
    </div>
  );
}
