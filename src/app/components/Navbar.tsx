"use client";
import Image from "next/image";
import Link from "next/link";

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
          {/* Siatka 3 kolumny: [lewy link | LOGO | prawy link] */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full gap-4">
            {/* LEWY: słowo, zawsze dosunięte do LOGO */}
            <nav className="justify-self-end">
              <Link
                href="/"
                className="text-[12px] md:text-[13px] tracking-[0.2em] uppercase font-serif text-neutral-800 hover:text-neutral-950"
              >
                {labels.navLeather}
              </Link>
            </nav>

            {/* ŚRODEK: LOGO – absolutnie środkiem strony, niezależnie od długości słów */}
            <div className="relative h-12 w-12 md:h-16 md:w-16 select-none justify-self-center">
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
          <div className="absolute inset-y-0 right-0 flex items-center">
            <div className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white/80 backdrop-blur px-1.5 py-1 shadow-sm">
              <button
                type="button"
                onClick={() => setLang("pl")}
                aria-pressed={lang === "pl"}
                aria-label="Polski"
                title="Polski"
                className={`rounded-md p-1.5 ${lang === "pl" ? "bg-[#f0f0e8]" : "hover:bg-neutral-100"}`}
              >
                <Image src="/images/poland.png" alt="" width={20} height={14} className="rounded-[2px]" />
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                aria-pressed={lang === "en"}
                aria-label="English"
                title="English"
                className={`rounded-md p-1.5 ${lang === "en" ? "bg-[#f0f0e8]" : "hover:bg-neutral-100"}`}
              >
                <Image src="/images/england.png" alt="" width={20} height={14} className="rounded-[2px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
