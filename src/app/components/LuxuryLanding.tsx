"use client";
import { useState, useEffect } from "react";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";

const defaultImages = Array.from({ length: 10 }, (_, i) => `/images/${i + 1}.jpeg`);

type LuxuryLandingProps = {
  images?: string[];
  title?: string;
  subtitle?: string;
  price?: string;
  logo?: string;
  newsletterImage?: string;
};

export default function LuxuryLanding({
  images = defaultImages,
  title = "Craft Symphony – Kategoria 1",
  subtitle = "Opis kategorii – coś tam, coś tam.",
  price = "1 290 PLN",
  logo = "/images/logo.png",
  newsletterImage = "/images/banner.png",
}: LuxuryLandingProps) {
  const [active, setActive] = useState(0);
  const [showSizes, setShowSizes] = useState(false);
  const [scrollIndex, setScrollIndex] = useState(0);

  const VISIBLE = 4;
  const THUMB_H = 96;
  const GAP = 12;

  // Smooth scroll animation using spring physics
  const ySpring = useSpring(-(scrollIndex * (THUMB_H + GAP)), {
    stiffness: 120,
    damping: 20,
  });

  const scrollUp = () => setScrollIndex((s) => Math.max(0, s - 1));
  const scrollDown = () => setScrollIndex((s) => Math.min(images.length - VISIBLE, s + 1));

  useEffect(() => {
    if (active < scrollIndex) setScrollIndex(active);
    if (active > scrollIndex + VISIBLE - 1) setScrollIndex(active - (VISIBLE - 1));
  }, [active]);

  useEffect(() => {
    ySpring.set(-(scrollIndex * (THUMB_H + GAP)));
  }, [scrollIndex]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-neutral-200">
        <div className="mx-auto max-w-6xl h-14 flex items-center justify-center">
          {logo ? (
            <img src={logo} alt="logo" className="h-8 w-8 object-contain" />
          ) : (
            <span className="tracking-[0.25em] uppercase text-xs font-serif">Craft Symphony</span>
          )}
        </div>
      </header>

      <main className="pt-24 pb-24">
        <section className="mx-auto max-w-6xl px-4 space-y-24">
          {[1, 2, 3].map((idx) => (
            <div key={idx}>
              {/* NAZWA KATEGORII */}
              <div className="mb-6 text-center">
                <h1 className="font-serif text-2xl md:text-3xl tracking-wide">
                  {`Craft Symphony – Kategoria ${idx}`}
                </h1>
                <p className="mt-2 text-sm text-neutral-600 max-w-3xl mx-auto">
                  {"Opis kategorii – coś tam, coś tam."}
                </p>
              </div>

              <div className="relative">
                <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-sm border border-neutral-200 relative">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={`${active}-${idx}`}
                      src={images[active]}
                      alt="hero"
                      className="h-full w-full object-cover"
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </AnimatePresence>

                  {/* MINIATURY */}
                  <motion.div
                    animate={showSizes ? { x: 80, opacity: 0 } : { x: 0, opacity: 1 }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="absolute inset-y-0 right-4 my-4 flex flex-col items-center justify-center gap-3 select-none"
                  >
                    <div className="absolute inset-y-0 -inset-x-2 rounded-2xl bg-black/35 backdrop-blur-sm border border-white/20" />

                    <button
                      onClick={scrollUp}
                      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 hover:bg-black/40 text-white shadow-sm"
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
                                i === active
                                  ? "border-neutral-900 shadow"
                                  : "border-neutral-300 hover:border-neutral-500"
                              }`}
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
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                  </motion.div>

                  {/* PANEL WIĘCEJ */}
                  <AnimatePresence>
                    {showSizes && (
                      <motion.div
                        initial={{ y: 200, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 200, opacity: 0 }}
                        transition={{ duration: 0.55, ease: "easeOut", delay: 0.25 }}
                        className="absolute bottom-0 inset-x-0 bg-black/70 text-white backdrop-blur p-6 border-t border-white/10"
                      >
                        <div className="text-center mb-3">
                          <h3 className="font-serif text-lg tracking-wide">{`Craft Symphony – Kategoria ${idx}`}</h3>
                          <p className="text-sm opacity-90 max-w-3xl mx-auto">{"Opis kategorii – coś tam, coś tam."}</p>
                        </div>

                        <h4 className="text-center font-serif tracking-wide text-sm uppercase opacity-80 mb-4">
                          Rozmiarówka (przykład)
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="rounded-xl border border-white/20 p-4">
                            <div className="flex items-center justify-between text-xs opacity-90 mb-2">
                              <span>Od sprzączki do 1. oczka</span>
                              <span>90 cm</span>
                            </div>
                            <div className="h-2 bg-white/20 rounded"></div>
                          </div>
                          <div className="rounded-xl border border-white/20 p-4">
                            <div className="flex items-center justify-between text-xs opacity-90 mb-2">
                              <span>Od sprzączki do ostatniego oczka</span>
                              <span>140 cm</span>
                            </div>
                            <div className="h-2 bg-white/20 rounded"></div>
                          </div>
                        </div>

                        <p className="mt-5 text-center text-[13px] opacity-90">
                          Cena: <span className="font-medium tracking-wide">{price}</span>
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 flex flex-col items-center text-center">
                <button
                  onClick={() => setShowSizes((v) => !v)}
                  className="px-8 py-3 rounded-xl border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white transition tracking-wider uppercase text-xs"
                >
                  Zobacz więcej
                </button>
              </div>
            </div>
          ))}

          {/* SEKCJA: poziome zdjęcie nad newsletterem + newsletter */}
          <div className="mt-24 space-y-10">
            <div className="w-full overflow-hidden rounded-2xl">
              <div className="mx-auto max-w-5xl aspect-[3/4] md:aspect-[2/3] h-[60vh] md:h-[70vh]">
                <img src={newsletterImage} alt="banner" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-24 py-10 text-center text-xs text-neutral-500">
          © 2025 Craft Symphony
        </footer>
      </main>
    </div>
  );
}