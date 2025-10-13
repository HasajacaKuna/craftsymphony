"use client";
import { useState, useEffect, useMemo } from "react";
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

/** Domyślne obrazki — możesz podmienić na własne ścieżki */
const defaultImages = Array.from({ length: 10 }, (_, i) => `/images/${i + 1}.jpeg`);

type BeltItem = {
  name: string;
  description: string;
  price: string;
  upperSize: string;
  lowerSize: string;
};

type CategoryData = {
  title: string;
  images?: string[];
  items: BeltItem[];
};

type LuxuryLandingProps = {
  logo?: string;
  aboutImage?: string;
  /** Opcjonalnie możesz podać własne dane kategorii (obrazy + paski) */
  categoriesOverride?: Partial<Record<"M" | "L" | "ART", Partial<CategoryData>>>;
};

/** ——— Pojedyncza sekcja kategorii ——— */
function CategorySection({
  title,
  images = defaultImages,
  items,
}: CategoryData) {
  const [active, setActive] = useState(0);
  const [scrollIndex, setScrollIndex] = useState(0);

  const VISIBLE = 4;
  const THUMB_H = 96;
  const GAP = 12;

  // Zgrywamy liczbę pozycji z liczbą obrazków
  const belts: BeltItem[] = useMemo(() => {
    const copy = [...items];
    if (copy.length === 0) return [];
    while (copy.length < images.length) copy.push(items[items.length - 1]);
    return copy.slice(0, images.length);
  }, [images.length, items]);

  // smooth scroll miniaturek
  const ySpring = useSpring(-(scrollIndex * (THUMB_H + GAP)), {
    stiffness: 120,
    damping: 20,
  });

  const scrollUp = () => setScrollIndex((s) => Math.max(0, s - 1));
  const scrollDown = () => setScrollIndex((s) => Math.min(images.length - VISIBLE, s + 1));

  // trzymaj aktywną miniaturę w widoku
  useEffect(() => {
    if (active < scrollIndex) setScrollIndex(active);
    if (active > scrollIndex + VISIBLE - 1) setScrollIndex(active - (VISIBLE - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    ySpring.set(-(scrollIndex * (THUMB_H + GAP)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollIndex]);

  return (
    <div>
      {/* Tytuł kategorii */}
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl md:text-3xl tracking-wide">
          {title}{" "}
          <span className="text-neutral-400 text-base align-middle"></span>
        </h1>
      </div>

      {/* HERO */}
      <div className="relative">
        <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-sm border border-neutral-200 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-${title}-${active}`}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative h-full w-full"
            >
              <img
                src={images[active]}
                alt={belts[active]?.name ?? `Pasek ${active + 1}`}
                className="h-full w-full object-cover"
              />

              {/* numer paska w lewym dolnym rogu */}
            </motion.div>
          </AnimatePresence>

          {/* MINIATURY z numerkami */}
          <div className="absolute inset-y-0 right-4 my-4 flex flex-col items-center justify-center gap-3 select-none">
            <div className="absolute inset-y-0 -inset-x-2 rounded-2xl bg-black/35 backdrop-blur-sm border border-white/20" />

            <button
              onClick={scrollUp}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 hover:bg-black/40 text-white shadow-sm"
              aria-label="Przewiń w górę"
            >
              <ChevronUp className="h-5 w-5" />
            </button>

            <div className="relative h-[calc(4*96px+3*12px)] w-28 overflow-hidden rounded-xl border border-white/20 bg-transparent">
              <motion.div style={{ y: ySpring }} className="absolute top-0 left-0 w-full">
                <div className="flex flex-col gap-3 p-0">
                  {images.map((src, i) => (
<button
  key={i}
  onClick={() => setActive(i)}
  className={`relative h-24 w-full overflow-hidden rounded-lg border transition ${
    i === active ? "border-neutral-900 shadow" : "border-neutral-300 hover:border-neutral-500"
  }`}
  aria-label={`Wybierz pasek nr ${i + 1}`}
>
  <img src={src} alt={`thumb-${i + 1}`} className="h-full w-full object-cover" />
</button>

                  ))}
                </div>
              </motion.div>
            </div>

            <button
              onClick={scrollDown}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 hover:bg-black/40 text-white shadow-sm"
              aria-label="Przewiń w dół"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* OPIS + ROZMIARÓWKA */}
      <div className="mt-8 text-center">
<div className="text-center mb-3">
  <h3 className="font-serif text-lg tracking-wide">
    No.&nbsp;{active + 1}&nbsp;{belts[active]?.name ?? "—"}
  </h3>
  <p className="text-sm text-neutral-600 max-w-3xl mx-auto">
    {belts[active]?.description ?? "—"}
  </p>
</div>

        <div className="max-w-4xl mx-auto">
          {/* GÓRNA – większa wartość */}
          <div className="text-center text-sm text-neutral-600 mb-3">
            {belts[active]?.upperSize ?? "—"}
          </div>

          {/* Obrazek schematu */}
          <div className="rounded-2xl border border-neutral-200 overflow-hidden">
            <img
              src="/images/belt2.png"
              alt="Schemat paska – rozmiar"
              className="w-1/3 h-auto object-contain mx-auto"
            />
          </div>

          {/* DOLNA – mniejsza wartość */}
          <div className="text-center text-sm text-neutral-600 mt-3">
            {belts[active]?.lowerSize ?? "—"}
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] text-neutral-600">
          Cena: <span className="font-medium tracking-wide">{belts[active]?.price ?? "—"}</span>
        </p>
      </div>
    </div>
  );
}

/** ——— STRONA / GŁÓWNY KOMPONENT ——— */
export default function LuxuryLanding({
  logo = "/images/logo3.png",
  aboutImage = "/images/1.png",
  categoriesOverride,
}: LuxuryLandingProps) {
  // Domyślne dane trzech kategorii
  const categories: Record<"M" | "L" | "ART", CategoryData> = {
    M: {
      title: "Craft Symphony- Paski M i L",
      images: defaultImages.slice(0, 6),
      items: [
        { name: "Modena Black", description: "Klasyczny czarny, połysk, do garnituru.", price: "1 190 PLN", upperSize: "140 cm", lowerSize: "90 cm" },
        { name: "Milan Cognac", description: "Cognac z patyną, ręczne przeszycie.", price: "1 220 PLN", upperSize: "138 cm", lowerSize: "88 cm" },
        { name: "Marseille Chestnut", description: "Kasztanowy półmat, elegancki casual.", price: "1 150 PLN", upperSize: "136 cm", lowerSize: "86 cm" },
        { name: "Madrid Sand", description: "Piaskowy mat, kontrastowa nić.", price: "1 130 PLN", upperSize: "134 cm", lowerSize: "84 cm" },
        { name: "Munich Slate", description: "Chłodny łupek, minimalistyczna klamra.", price: "1 210 PLN", upperSize: "132 cm", lowerSize: "82 cm" },
        { name: "Malmo Walnut", description: "Orzechowy półmat, uniwersalny.", price: "1 180 PLN", upperSize: "130 cm", lowerSize: "80 cm" },
      ],
    },
    L: {
      title: "Craft Symphony - Paski XL i XXL",
      images: defaultImages.slice(2, 8),
      items: [
        { name: "Lugano Espresso", description: "Głęboki brąz espresso, matowa klamra.", price: "1 250 PLN", upperSize: "145 cm", lowerSize: "95 cm" },
        { name: "Lisbon Tan", description: "Jasnobrązowy z pull-upem, świetny do jeansów.", price: "1 180 PLN", upperSize: "142 cm", lowerSize: "92 cm" },
        { name: "Lyon Carbon", description: "Grafit półmat, nowoczesny charakter.", price: "1 290 PLN", upperSize: "140 cm", lowerSize: "90 cm" },
        { name: "Leeds Cocoa", description: "Ciemne kakao, gładka faktura.", price: "1 260 PLN", upperSize: "148 cm", lowerSize: "98 cm" },
        { name: "Lima Umber", description: "Ciepły brąz umber, pełne przeszycie.", price: "1 240 PLN", upperSize: "146 cm", lowerSize: "96 cm" },
        { name: "Lorient Night", description: "Głęboka czerń, satynowa klamra.", price: "1 300 PLN", upperSize: "144 cm", lowerSize: "94 cm" },
      ],
    },
    ART: {
      title: "Craft Symphony - Paski Artystyczne",
      images: defaultImages.slice(4, 10),
      items: [
        { name: "Aurora Indigo", description: "Ręczne cieniowanie granatu, unikatowy efekt.", price: "1 490 PLN", upperSize: "135 cm", lowerSize: "85 cm" },
        { name: "Eclipse Olive", description: "Oliwkowy satynowy mat, nieregularna faktura.", price: "1 530 PLN", upperSize: "132 cm", lowerSize: "84 cm" },
        { name: "Crimson Edge", description: "Czerwone krawędzie, farbowanie ręczne.", price: "1 590 PLN", upperSize: "130 cm", lowerSize: "82 cm" },
        { name: "Nebula Teal", description: "Morski teal z głębią koloru.", price: "1 560 PLN", upperSize: "134 cm", lowerSize: "83 cm" },
        { name: "Vortex Charcoal", description: "Węglowa czerń z mikroteksturą.", price: "1 520 PLN", upperSize: "133 cm", lowerSize: "81 cm" },
        { name: "Saffron Fade", description: "Złocista poświata, artystyczne przejścia.", price: "1 580 PLN", upperSize: "131 cm", lowerSize: "80 cm" },
      ],
    },
  };

  // Ewentualne nadpisania z props
  if (categoriesOverride?.M) categories.M = { ...categories.M, ...categoriesOverride.M };
  if (categoriesOverride?.L) categories.L = { ...categories.L, ...categoriesOverride.L };
  if (categoriesOverride?.ART) categories.ART = { ...categories.ART, ...categoriesOverride.ART };

  return (
    <div className="min-h-screen bg-[#f5f5ef] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#f5f5ef] backdrop-blur">
        <div className="relative mx-auto max-w-6xl h-20 flex items-center justify-center overflow-visible px-4">
          <nav className="flex items-center gap-4 md:gap-6">
            <Link
              href="/skora"
              className="relative text-[13px] tracking-[0.2em] uppercase font-serif text-neutral-800
                         hover:text-neutral-950 transition
                         after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0
                         after:bg-neutral-900 after:transition-all after:duration-300 hover:after:w-full
                         focus:outline-none focus-visible:after:w-full"
            >
              Skóra
            </Link>

            <img
              src={logo}
              alt="Craft Symphony"
              className="h-20 w-20 md:h-20 md:w-20 object-contain drop-shadow-sm"
            />

            <Link
              href="/drewno"
              className="relative text-[13px] tracking-[0.2em] uppercase font-serif text-neutral-800
                         hover:text-neutral-950 transition
                         after:absolute after:right-0 after:-bottom-1 after:h-[1px] after:w-0
                         after:bg-neutral-900 after:transition-all after:duration-300 hover:after:w-full
                         focus:outline-none focus-visible:after:w-full"
            >
              Drewno
            </Link>
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main className="pt-24 pb-24">
        <section className="mx-auto max-w-6xl px-4 space-y-24">
          {/* ——— Sekcja 1: Paski M ——— */}
          <CategorySection {...categories.M} />

          <div className="mx-auto w-[100%] h-px bg-neutral-300" />

          {/* ——— Sekcja 2: Paski L ——— */}
          <CategorySection {...categories.L} />

          <div className="mx-auto w-[100%] h-px bg-neutral-300" />

          {/* ——— Sekcja 3: Paski Artistics ——— */}
          <CategorySection {...categories.ART} />

          <div className="mt-16 mx-auto w-[100%] h-px bg-neutral-300" />

          {/* ——— O rzemiośle ——— */}
          <div className="mt-6 text-center">
            <p className="mt-6 max-w-3xl mx-auto text-sm leading-relaxed text-neutral-700">
              Każdy pasek powstaje w całości ręcznie – od doboru skóry, przez cięcie i barwienie, po wykończenie krawędzi.
              Wierzymy w rzemiosło, które ma duszę: staranność detalu i ponadczasowy charakter. Nasze paski łączą tradycję
              z nowoczesną precyzją — projektowane z myślą o trwałości i pięknie, które dojrzewa z czasem.
            </p>
            <img src={aboutImage} alt="Craft" className="mx-auto h-124 w-auto object-contain opacity-90" />
          </div>

          {/* ——— Formularz: Zamów pasek ——— */}
          <div className="mt-16 text-center">
            <h3 className="font-serif text-xl tracking-wide">Jestem zainteresowany paskiem?</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Podaj e-mail oraz numer paska, a odezwiemy się z potwierdzeniem.
            </p>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-5 flex flex-col sm:flex-row gap-3 justify-center items-center"
            >
              <input
                type="email"
                required
                placeholder="Twój e-mail"
                className="w-full sm:w-80 rounded-xl border border-neutral-300 bg-[##f5f5ef] text-neutral-900 placeholder-neutral-500 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900/20"
              />
              <input
                type="number"
                min={1}
                max={10}
                placeholder="Nr paska"
                className="w-full sm:w-40 rounded-xl border border-neutral-300 bg-[##f5f5ef] text-neutral-900 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900/20"
                aria-label="Numer paska"
              />
              <button className="px-6 py-3 bg-neutral-900 rounded-xl border border-neutral-900 text-white hover:bg-neutral-900 hover:text-white transition">
                Wyślij zapytanie
              </button>
            </form>
          </div>

          {/* ——— Stopka ——— */}
{/* --- STOPKA (sklejona do kreski) --- */}
<div className="space-y-2"> {/* kontrolujesz odstępy lokalnie */}
  <div className="mx-auto w-full h-px bg-neutral-300" />  {/* bez mt-16 */}
  
  <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 text-sm">
    <div className="md:justify-self-start text-center md:text-left text-neutral-700">
      <div className="font-medium">kontakt@craftsymphony.pl</div>
      <div className="mt-1">+48 600 000 000</div>
    </div>

    <div className="text-center text-xs text-neutral-500" />

    <div className="md:justify-self-end flex items-center justify-center md:justify-end gap-5 text-neutral-700">
      <Link href="#" aria-label="Facebook" className="hover:opacity-80"><Facebook /></Link>
      <Link href="#" aria-label="Instagram" className="hover:opacity-80"><Instagram /></Link>
      <Link href="#" aria-label="YouTube" className="hover:opacity-80"><Youtube /></Link>
      <Link href="#" aria-label="LinkedIn" className="hover:opacity-80"><Linkedin /></Link>
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
