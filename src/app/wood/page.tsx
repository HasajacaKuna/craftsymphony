"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import Navbar from "../components/Navbar";

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

type UIStrings = {
  navLeather: string;
  navWood: string;
  price: string;
  interestedHeading: string;
  interestedText: string;
  emailPh: string;
  productNoPh: string;
  send: string;
  about: string;
};


type CatalogResponse = { categories: ApiCategory[] };

/* ===== UI (PL/EN) ===== */
const UI: Record<Lang, UIStrings> = {
  pl: {
    navLeather: "Skóra",
    navWood: "Drewno",
    price: "Cena:",
    interestedHeading: "Jestem zainteresowany/a?",
    interestedText:
      "Podaj e-mail oraz numer produktu — odezwiemy się z potwierdzeniem.",
    emailPh: "Twój e-mail",
    productNoPh: "Nr produktu",
    send: "Wyślij zapytanie",
    about:
      "Każdy produkt z drewna powstaje w 100% ręcznie — od selekcji materiału, przez precyzyjną obróbkę i kształtowanie, aż po finalne szlifowanie i wykończenie powierzchni. Pracujemy z naturalnym surowcem, którego charakter i rysunek słojów czynią każdy egzemplarz unikatowym. Każdy detal tworzony jest z dbałością o estetykę, ergonomię oraz trwałość. Wierzymy w rzemiosło z duszą: w przedmioty, które dojrzewają z użytkowaniem, nabierają blasku i stają się częścią codziennych rytuałów. Naszym celem jest ponadczasowa forma zakorzeniona w tradycji, lecz wykonana z nowoczesną precyzją i szacunkiem do natury.",
  },
  en: {
    navLeather: "Leather",
    navWood: "Wood",
    price: "Price:",
    interestedHeading: "Interested?",
    interestedText:
      "Leave your email and product number — we’ll get back to you.",
    emailPh: "Your email",
    productNoPh: "Product no.",
    send: "Send request",
    about:
      "Each wooden product is crafted entirely by hand—from the selection of raw material, through precise shaping and carving, to the final sanding and surface treatment. We work with natural wood whose grain, tone, and imperfections make every piece truly unique. Every detail is refined with attention to aesthetics, ergonomics, and long-lasting durability. We believe in soulful craftsmanship: in objects that age gracefully, develop character over time, and become part of daily rituals. Our aim is timeless design rooted in tradition, finished with modern precision and deep respect for nature.",
  },
};

/* ===== Utils spójne z normalizacją ===== */
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

/* ===== Minimalny model do grida „wood” ===== */
type WoodCard = {
  id: string;
  image: string;
  /** NEW: nazwa produktu */
  namePl: string;
  nameEn?: string;
  /** NEW: numer produktu (jeśli brak w API, użyjemy id) */
  productNo?: number | string | null;

  descriptionPl: string;
  descriptionEn?: string;
  pricePLN: number | string;
  order?: number;
};


/* ===== STRONA WOOD (GRID) ===== */
export default function WoodPage() {
  const [lang, setLang] = useState<Lang>("pl");
  const [items, setItems] = useState<WoodCard[]>([]);
  const [loading, setLoading] = useState(true);

  // język z localStorage jak u Ciebie
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

  // fetch z /api/catalog -> tylko kategoria wood -> spłaszczenie itemów do grida
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/catalog", { cache: "no-store" });
        const json: CatalogResponse = await res.json();

        const woodCats = (json?.categories ?? []).filter((cat) => {
          const slug = (cat.slug ?? "").toLowerCase().trim();
          const title = (cat.title ?? "").toLowerCase().trim();
          return slug === "wood" || title === "wood";
        });

        // Spłaszcz wszystkie itemy z kategorii wood
const flat: WoodCard[] = woodCats.flatMap((cat, catIdx) => {
  return (cat.items ?? []).map((it, itemIdx) => {
    const primary = pickPrimary(it.images || []);

    const productNo = it.numerPaska ?? null;
    const fallbackId = `${(cat.slug || "wood")}-${catIdx}-${itemIdx}`;

    return {
      id: String(productNo ?? fallbackId),
      image: primary?.url || "",

      // NEW: nazwa + numer
      namePl: (it.title || "").trim() || `Produkt ${productNo ?? itemIdx + 1}`,
      nameEn: (it.titleEn || "").trim() || undefined,
      productNo,

      descriptionPl: it.description,
      descriptionEn: it.descriptionEn,
      pricePLN: it.cenaPLN,
      order: primary?.order ?? itemIdx,
    };
  });
});


        // Usuń pozycje bez obrazka (grid potrzebuje obrazów)
        const withImages = flat.filter((x) => !!x.image);

        // Posortuj po order
        withImages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        setItems(withImages);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="mt-10 text-center text-sm text-neutral-600">
          {lang === "pl" ? "Ładowanie…" : "Loading…"}
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="mt-10 text-center text-sm text-neutral-600">
          {lang === "pl" ? "Brak produktów" : "No products"}
        </div>
      );
    }
    return (
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((it) => (
          <article
            key={it.id}
            className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <div className="relative w-full aspect-square bg-neutral-100">
              <Image
                src={it.image}
                alt={lang === "pl" ? "Produkt drewniany" : "Wood product"}
                fill
                sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                className="object-cover object-center"
              />
            </div>
<div className="p-4">
  {/* NEW: Nazwa i numer nad opisem */}
  <h3 className="text-base font-medium text-neutral-900 leading-snug line-clamp-2">
    {lang === "pl" ? it.namePl : it.nameEn || it.namePl}
  </h3>
  <div className="mt-0.5 text-xs text-neutral-500">
    {lang === "pl" ? "Nr:" : "No."}{" "}
    <span className="tabular-nums">{it.productNo ?? it.id}</span>
  </div>

  <p className="mt-2 text-sm text-neutral-600 line-clamp-3">
    {lang === "pl" ? it.descriptionPl : it.descriptionEn || it.descriptionPl}
  </p>
  <div className="mt-4 text-sm">
    <span className="text-neutral-500">{t.price}&nbsp;</span>
    <span className="font-medium">
      {formatPriceForLang(it.pricePLN, lang)}
    </span>
  </div>
</div>

          </article>
        ))}
      </div>
    );
  }, [items, loading, lang]);

  return (
    <div className="min-h-screen bg-[#f5f5ef] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <Navbar
        lang={lang}
        setLang={setLang}
        logo="/images/logo3.png"
        labels={{ navLeather: t.navLeather, navWood: t.navWood }}
      />

      <main className="pt-[5.75rem] md:pt-24 pb-24">
        <section className="mx-auto max-w-6xl px-4">
          {/* GRID z kategorii WOOD */}
          {content}

          {/* Formularz zainteresowania */}
          <div className="mt-14 md:mt-16 text-center">
            <h3 className="font-serif text-lg md:text-xl tracking-wide">
              {t.interestedHeading}
            </h3>
            <p className="mt-2 text-sm text-neutral-600 px-2">
              {t.interestedText}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget as HTMLFormElement);
                const email = String(fd.get("email") || "");
                const no = String(fd.get("productNo") || "");
                if (!email || !no) return;
                // TODO: wyślij do swojego endpointu (np. /api/inquiry)
                console.log("send inquiry", { email, productNo: no });
                alert(
                  lang === "pl"
                    ? "Wysłano zapytanie. Dziękujemy!"
                    : "Request sent. Thank you!"
                );
                (e.currentTarget as HTMLFormElement).reset();
              }}
              className="mt-5 flex flex-col sm:flex-row gap-3 justify-center items-center px-2"
            >
              <input
                name="email"
                type="email"
                required
                placeholder={t.emailPh}
                className="w-full sm:w-80 rounded-xl border-2 border-neutral-300 bg-[#f5f5ef] text-neutral-900 placeholder-neutral-500 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900/20"
                aria-label={t.emailPh}
              />
              <input
                name="productNo"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{1,6}"
                required
                placeholder={t.productNoPh}
                aria-label={t.productNoPh}
                className="w-full sm:w-40 rounded-xl border-2 border-neutral-300 bg-[#f5f5ef] text-neutral-900 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900/20"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-neutral-900 rounded-xl border border-neutral-900 text-white hover:bg-neutral-800 transition disabled:opacity-50"
              >
                {t.send}
              </button>
            </form>
          </div>

          {/* Obraz + opis na dole */}
          <div className="mt-10 md:mt-12 text-center mb-14">
            <div className="relative mx-auto h-64 md:h-[31rem] w-full max-w-3xl">
              <Image
                src="/images/1.png"
                alt={lang === "pl" ? "Rzemiosło — pracownia" : "Craft — workshop"}
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
