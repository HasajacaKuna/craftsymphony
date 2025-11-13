"use client";
import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Youtube, Linkedin } from "lucide-react";

type Lang = "pl" | "en";

export default function Navbar({
  lang,
  setLang,
  logo = "/images/logo3.png",
  labels, // <- { navLeather, navWood } z UI_STRINGS
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  logo?: string;
  labels: { navLeather: string; navWood: string };
}) {
  return (
    <header className="fixed top-0 inset-x-0 z-[60] bg-[#f5f5ef]">
      <div className="relative mx-auto max-w-6xl px-4">
        {/* Pasek (większy – większe logo) */}
        <div className="relative h-20 md:h-24">
          {/* Siatka 3 kolumny: [lewy: ikonki + link | LOGO | prawy link] */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full gap-6">
            {/* LEWO: ikonki przy lewej, słowo dosunięte do LOGO */}
            <nav className="flex items-center justify-between h-full">
              {/* Ikonki social – przy lewej krawędzi (na mobile można schować jeśli chcesz) */}
              <div className="hidden md:flex items-center justify-center md:justify-start gap-5 text-neutral-700">
                <Link
                  href="#"
                  aria-label="Facebook"
                  className="hover:opacity-80"
                >
                  <Facebook className="h-4 w-4" />
                </Link>
                <Link
                  href="#"
                  aria-label="Instagram"
                  className="hover:opacity-80"
                >
                  <Instagram className="h-4 w-4" />
                </Link>
              </div>

              {/* Napis przy logo */}
              <Link
                href="/"
                className="text-[12px] md:text-[13px] tracking-[0.2em] uppercase font-serif text-neutral-800 hover:text-neutral-950 ml-auto"
              >
                {labels.navLeather}
              </Link>
            </nav>

            {/* ŚRODEK: LOGO – absolutnie środkiem strony, niezależnie od długości słów */}
            <div className="relative h-12 w-12 md:h-24 md:w-24 select-none justify-self-center">
              <Image
                src={logo}
                alt="Craft Symphony"
                fill
                sizes="64px"
                className="object-contain"
                priority
              />
            </div>

            {/* PRAWY: słowo, dosunięte do LOGO */}
            <nav className="justify-self-start">
              <Link
                href="/wood"
                className="text-[12px] md:text-[13px] tracking-[0.2em] uppercase font-serif text-neutral-800 hover:text-neutral-950"
              >
                {labels.navWood}
              </Link>
            </nav>
          </div>

          {/* PANELE FLAG – przy prawej krawędzi, nie wpływa na pozycję LOGO */}
{/* PANELE FLAG – mobile: 40px od góry, desktop: wycentrowane w pionie */}
{/* PANELE FLAG – mobile: 40px od góry, desktop: wycentrowane w pionie */}
<div className="absolute right-0 top-[85px] md:top-1/2 md:-translate-y-1/2 flex items-center">
  <div className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white/80 backdrop-blur px-1.5 py-1 shadow-sm">
    <button
      type="button"
      onClick={() => setLang("pl")}
      aria-pressed={lang === "pl"}
      aria-label="Polski"
      title="Polski"
      className={`rounded-md p-1.5 ${
        lang === "pl" ? "bg-[#f0f0e8]" : "hover:bg-neutral-100"
      }`}
    >
      <Image
        src="/images/poland.png"
        alt=""
        width={20}
        height={14}
        className="rounded-[2px]"
      />
    </button>
    <button
      type="button"
      onClick={() => setLang("en")}
      aria-pressed={lang === "en"}
      aria-label="English"
      title="English"
      className={`rounded-md p-1.5 ${
        lang === "en" ? "bg-[#f0f0e8]" : "hover:bg-neutral-100"
      }`}
    >
      <Image
        src="/images/england.png"
        alt=""
        width={20}
        height={14}
        className="rounded-[2px]"
      />
    </button>
  </div>
</div>


        </div>
      </div>
    </header>
  );
}
