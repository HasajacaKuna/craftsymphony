"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useSpring } from "framer-motion";
// na górze pliku, wśród importów z lucide-react:
import { Pencil, Save, X, Trash2, Plus, Image as ImageIcon, Languages, ChevronUp, ChevronDown, Star, StarOff, ArrowUpAZ, ArrowDownAZ, ChevronLeft, ChevronRight } from "lucide-react";
/* ========= helpers ========= */
const API_HEADERS = (pwd: string) => ({ "x-admin-password": pwd });
function errToString(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/* bezpieczne czytanie JSON z Response */
async function readJSON<T = unknown>(res: Response): Promise<T | null | { raw: string }> {
  const ctype = res.headers.get("content-type") || "";
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    try {
      const parsed: unknown = text ? JSON.parse(text) : null;
      let msg = text || `HTTP ${res.status}`;
      if (parsed && typeof parsed === "object") {
        const p = parsed as { error?: unknown; message?: unknown };
        const errMsg = typeof p.error === "string" ? p.error : undefined;
        const msgMsg = typeof p.message === "string" ? p.message : undefined;
        msg = errMsg ?? msgMsg ?? msg;
      }
      throw new Error(msg);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  if (!text) return null;

  if (ctype.includes("application/json")) {
    try {
      return JSON.parse(text) as T;
    } catch {
      return { raw: text };
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text };
  }
}

/* ========= types ========= */
type Lang = "pl" | "en";

type Category = { _id: string; name: string; slug: string; order?: number };
type CategoryRef = { _id: string; name: string; slug: string };

export type ItemImage = {
  url: string;
  altPl?: string;
  altEn?: string;
  isPrimary?: boolean;
  order?: number;
};

type Item = {
  _id: string;
  categoryId: CategoryRef | string;
  title: string;
  description: string;
  titleEn?: string;
  descriptionEn?: string;
  rozmiarMin: number;
  rozmiarMax: number;
  rozmiarGlowny?: number | null;
  rozSprz?: number | null;
  cenaPLN: number;
  numerPaska: number;
  images: ItemImage[];
};

// 1) BeltItem – z numerem:
type BeltItem = {
  name: string;
  description: string;
  price: string | number;
  upperSize: string;
  lowerSize: string;
  mainSize?: string | number;
  buckleSize?: string | number; // ⬅️ NOWE
  image?: string;
  beltNo?: number;
};

// Type guard for populated category
function isCatObj(x: Item["categoryId"]): x is CategoryRef {
  return typeof x === "object" && x !== null && "_id" in x && typeof (x as CategoryRef)._id === "string";
}

const UI_STRINGS: Record<
  Lang,
  {
    preview: string;
    numberLabel: string;
    heroAltPrefix: string;
    schemaAlt: string;
    price: string;
    mainSize: string;
    scrollUp: string;
    scrollDown: string;
    buckleSize: string,
    sizesInCm: string,
  }
> = {
  pl: {
    preview: "Podgląd (jak na stronie głównej)",
    numberLabel: "Nr.",
    heroAltPrefix: "Pasek",
    schemaAlt: "Schemat paska – rozmiar",
    price: "Cena:",
    mainSize: "Rozmiar główny",
    scrollUp: "Przewiń w górę",
    scrollDown: "Przewiń w dół",
        buckleSize: "Rozmiar sprzączki",
    sizesInCm: "Rozmiary w cm",
    
  },
  en: {
    preview: "Preview (like the homepage)",
    numberLabel: "No.",
    heroAltPrefix: "Belt",
    schemaAlt: "Belt diagram — size",
    price: "Price:",
    mainSize: "Main size",
    scrollUp: "Scroll up",
    scrollDown: "Scroll down",
    buckleSize: "Buckle size",
    sizesInCm: "Sizes in cm",
  },
};

/* ========= price formatting (PL → PLN / EN → USD=PLN/4) ========= */
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
  const numericPLN = Number(String(price).replace(/[^\d.,]/g, "").replace(/\s/g, "").replace(",", "."));
  if (!isFinite(numericPLN)) return price;
  const usd = numericPLN / 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(usd);
}

/* ========= PODGLĄD KATEGORII ========= */
function CategoryPreview({ title, belts, lang }: { title: string; belts: BeltItem[]; lang: Lang }) {
  const [active, setActive] = useState(0);

  // >>> HOOKI ZAWSZE NA GÓRZE <<<
  const [heroIdx, setHeroIdx] = useState(0); // index zdjęcia w galerii aktywnego paska
  useEffect(() => setHeroIdx(0), [active]);

  const VISIBLE = 4;
  const THUMB_H = 96;
  const GAP = 12;
  const ySpring = useSpring(0, { stiffness: 120, damping: 20 });
  const [scrollIndex, setScrollIndex] = useState(0);
  const t = UI_STRINGS[lang];

  const hero = belts[active];
  const thumbs = belts.map((b) => b.image || "");
  const gallery = thumbs.filter(Boolean);

  useEffect(() => {
    if (!thumbs.length) return;
    if (active < scrollIndex) setScrollIndex(active);
    if (active > scrollIndex + VISIBLE - 1) setScrollIndex(active - (VISIBLE - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, thumbs.length]);

  useEffect(() => {
    if (!thumbs.length) return;
    ySpring.set(-(scrollIndex * (THUMB_H + GAP)));
  }, [scrollIndex, thumbs.length, ySpring]);

  const maxScrollIndex = Math.max(0, thumbs.length - VISIBLE);
  const scrollUp = () => setScrollIndex((s) => Math.max(0, s - 1));
  const scrollDown = () => setScrollIndex((s) => Math.min(maxScrollIndex, s + 1));

  const goPrev = () => setHeroIdx((i) => (i > 0 ? i - 1 : Math.max(0, gallery.length - 1)));
  const goNext = () => setHeroIdx((i) => (i < gallery.length - 1 ? i + 1 : 0));

  // DOPIERO TERAZ ewentualny wczesny return
  if (!belts.length) return null;

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl md:text-3xl tracking-wide">Craft Symphony - {title}</h1>
      </div>

      {/* HERO pionowy + kolumna miniaturek po prawej (desktop) */}
      <div className="relative">
        <div className="hidden md:grid grid-cols-[1fr_auto] gap-4 items-start">
          {/* HERO – pionowy, obraz zawsze pasuje (contain) + watermark + strzałki */}
          <div className="relative w-full">
            <div className="relative w-full aspect-[3/4] overflow-hidden rounded-2xl shadow-sm border border-neutral-200 bg-neutral-100">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`hero-${title}-${active}-${gallery[heroIdx] ?? "noimg"}`}
                  initial={{ opacity: 0, scale: 1.01 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative h-full w-full"
                >
                  {gallery[heroIdx] ? (
                    <>
                      <Image
                        src={gallery[heroIdx]}
                        alt={`${t.heroAltPrefix} ${hero?.name ?? `${active + 1}`}`}
                        fill
                        sizes="(max-width:1280px) 70vw, 800px"
                        className="object-contain"
                      />
                      {/* znak wodny */}
                      <div className="absolute left-2 bottom-2 opacity-80">
                        <div className="relative h-8 w-8">
                          <Image src="/images/znakwodny.png" alt="watermark" fill sizes="32px" className="object-contain pointer-events-none select-none" />
                        </div>
                      </div>
                      {/* strzałki */}
                      {gallery.length > 1 && (
                        <>
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
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-neutral-500">Brak zdjęcia</div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* MINIATURY – prawa kolumna, poza obrazem */}
          {thumbs.length > 1 && (
            <div className="sticky top-24 self-start">
              <div className="flex flex-col items-center gap-3">
                <button onClick={scrollUp} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white hover:bg-neutral-50" aria-label={t.scrollUp}>
                  <ChevronUp className="h-5 w-5" />
                </button>

                <div className="relative h-[calc(4*96px+3*12px)] w-28 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                  <motion.div style={{ y: ySpring }} className="absolute top-0 left-0 w-full">
                    <div className="flex flex-col gap-3 p-2">
                      {thumbs.map((src, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setActive(i);
                            setHeroIdx(0);
                          }}
                          className={`relative h-24 w-full overflow-hidden rounded-lg border transition ${i === active ? "border-neutral-900 shadow" : "border-neutral-300 hover:border-neutral-500"}`}
                          aria-label={`${t.numberLabel} ${(belts[i]?.beltNo ?? i + 1)}`}
                          title={`Pasek ${(belts[i]?.beltNo ?? i + 1)}`}
                        >
                          <div className="relative h-24 w-full">
                            {src ? (
                              <Image src={src} alt={`thumb-${i + 1}`} fill sizes="112px" className="object-cover rounded-lg" />
                            ) : (
                              <div className="absolute inset-0 grid place-items-center text-neutral-300 text-xs">—</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>

                <button onClick={scrollDown} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white hover:bg-neutral-50" aria-label={t.scrollDown}>
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MOBILE – hero pionowy + miniatury w rzędzie */}
        <div className="md:hidden mt-0">
          <div className="relative w-full aspect-[3/4] overflow-hidden rounded-2xl shadow-sm border border-neutral-200 bg-neutral-100">
            <AnimatePresence mode="wait">
              <motion.div
                key={`m-hero-${title}-${active}-${gallery[heroIdx] ?? "noimg"}`}
                initial={{ opacity: 0, scale: 1.01 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative h-full w-full"
              >
                {gallery[heroIdx] ? (
                  <>
                    <Image src={gallery[heroIdx]} alt={`${t.heroAltPrefix} ${hero?.name ?? `${active + 1}`}`} fill sizes="100vw" className="object-contain" />
                    <div className="absolute left-2 bottom-2 opacity-80">
                      <div className="relative h-7 w-7">
                        <Image src="/images/znakwodny.png" alt="watermark" fill sizes="28px" className="object-contain pointer-events-none select-none" />
                      </div>
                    </div>
                    {gallery.length > 1 && (
                      <>
                        <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/35 hover:bg-black/50 text-white backdrop-blur-sm" aria-label="Poprzednie zdjęcie">
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/35 hover:bg-black/50 text-white backdrop-blur-sm" aria-label="Następne zdjęcie">
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-neutral-500">Brak zdjęcia</div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {thumbs.length > 1 && (
            <div className="mt-3">
              <div className="flex gap-3 overflow-x-auto px-1 py-1 snap-x snap-mandatory">
                {thumbs.map((src, i) => (
                  <button
                    key={`m-thumb-${i}`}
                    onClick={() => {
                      setActive(i);
                      setHeroIdx(0);
                    }}
                    className={`relative h-20 w-20 flex-none overflow-hidden rounded-lg border snap-start ${i === active ? "border-neutral-900 ring-2 ring-neutral-900" : "border-neutral-300 hover:border-neutral-500"}`}
                    aria-label={`${t.numberLabel} ${i + 1}`}
                  >
                    <div className="relative h-20 w-20">
                      {src ? (
                        <Image src={src} alt={`thumb-${i + 1}`} fill sizes="80px" className="object-cover rounded-lg" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-neutral-300 text-xs">—</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OPIS + ROZMIARÓWKA */}
      <div className="mt-6 md:mt-8 text-center">
        <div className="text-center mb-3">
          <p className="text-sm text-neutral-600 max-w-3xl mx-auto px-2">{hero?.description ?? "—"}</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center text-sm text-neutral-600 mb-[-48px]">{hero?.upperSize ?? "—"}</div>

          {/* nagłówek: Rozmiary w cm / Sizes in cm */}
          <div className="text-center mt-14 mb-2">
            <span className="text-[12px] uppercase tracking-wide text-neutral-500">{UI_STRINGS[lang].sizesInCm}</span>
          </div>

          <div className="rounded-2xl overflow-visible">
            <div className="relative mx-auto w-2/3 md:w-1/3 aspect-[3/2]">
              <Image src="/images/belt2.png" alt={UI_STRINGS[lang].schemaAlt} fill sizes="(max-width:768px) 66vw, 33vw" className="object-contain" />

              {/* LEWY bąbelek: sprzączka + podpis */}
              <div className="hidden md:flex flex-col items-center gap-1 absolute top-1/2 -translate-y-1/2 left-0 -translate-x-[110%]">
                <em className="text-xs text-neutral-500 not-italic italic">{UI_STRINGS[lang].buckleSize}</em>
                <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white/95 px-4 py-3 text-base font-medium shadow-sm min-w-[8rem] justify-center">
                  {typeof hero?.buckleSize !== "undefined" && hero?.buckleSize !== null ? `${hero.buckleSize}` : "—"}
                </div>
              </div>

              {/* PRAWY bąbelek: rozmiar główny + podpis */}
              <div className="hidden md:flex flex-col items-center gap-1 absolute top-1/2 -translate-y-1/2 right-0 translate-x-[110%]">
                <em className="text-xs text-neutral-500 not-italic italic">{UI_STRINGS[lang].mainSize}</em>
                <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white/95 px-4 py-3 text-base font-medium shadow-sm min-w-[8rem] justify-center">
                  {typeof hero?.mainSize !== "undefined" && hero?.mainSize !== null ? `${hero.mainSize}` : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-neutral-600 mt-[-48px]">{hero?.lowerSize ?? "—"}</div>
        </div>

        <p className="mt-8 text-center text-[13px] text-neutral-600 mb-16 italic">
          {UI_STRINGS[lang].price} <span className="font-medium tracking-wide">{formatPriceForLang(hero?.price, lang)}</span>
        </p>
      </div>
    </div>
  );
}


/* ========= główna strona panelu ========= */
export default function AdminPage() {
  // HOOKI
  const [password, setPassword] = useState("");
  const [ok, setOk] = useState(false);

  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState("");

  const [editCat, setEditCat] = useState<Record<string, { name: string; slug: string }>>({});

  // CREATE form (z wieloma zdjęciami + EN)
  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    titleEn: "",
    description:
      "Pasek ze skóry licowej najlepszej jakości, wycinany, farbiony ręcznie. Brzegi skóry malowane, zabezpieczony lakierem. Stosowane farby są głęboko penetrujące a co za tym idzie, nie złuszczają się, nie pękają, nie farbią ubrań gdy są mokre. Długość paska od klamry do końca 120cm.",
    descriptionEn: "",
    rozmiarMin: "",
    rozmiarMax: "",
    rozmiarGlowny: "",
    rozSprz: "",
    cenaPLN: "",
    numerPaska: "",
    files: [] as File[],
    previews: [] as string[],
    imagesMeta: [] as Omit<ItemImage, "url">[], // alt-y/isPrimary/order dla uploadowanych
  });

  const [autoTranslateEN, setAutoTranslateEN] = useState(false);
  const [enCache, setEnCache] = useState<Record<string, { titleEn: string; descriptionEn: string }>>({});

  // EDIT state per item – z wieloma zdjęciami
  const [editItem, setEditItem] = useState<
    Record<
      string,
      {
        categoryId: string;
        title: string;
        description: string;
        titleEn?: string;
        descriptionEn?: string;
        rozmiarMin: string;
        rozmiarMax: string;
        rozmiarGlowny: string;
        rozSprz: string;
        cenaPLN: string;
        numerPaska: string;

        images: ItemImage[];     // istniejące (z URL-ami)
        newFiles: File[];        // nowe do uploadu
        newPreviews: string[];   // URL.createObjectURL
        newMeta: Omit<ItemImage, "url">[]; // meta dla nowych
      }
    >
  >({});

  const [previewLang, setPreviewLang] = useState<Lang>("pl");

  /* ===== auth persistence ===== */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_pwd");
      if (saved) setPassword(saved);
    } catch {
      /* ignore */
    }
  }, []);

  /* ===== fetch helper ===== */
  const authedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await fetch(input, {
      ...init,
      headers: { ...(init?.headers || {}), ...API_HEADERS(password) },
      cache: "no-store",
    });
    if (res.status === 401) throw new Error("Błędne hasło");
    return res;
  };

  const authedJSON = async <T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T | null | { raw: string }> => {
    const res = await authedFetch(input, init);
    return readJSON<T>(res);
  };

  const tryAuth = async () => {
    try {
      const catsData = (await authedJSON<Category[]>("/api/admin/categories")) ?? [];
      setCats(Array.isArray(catsData) ? catsData : []);
      await refreshItems();
      setOk(true);
      localStorage.setItem("admin_pwd", password);
    } catch (e) {
      setOk(false);
      setMsg(errToString(e));
    }
  };

  const refreshCats = async () => {
    const data = (await authedJSON<Category[]>("/api/admin/categories")) ?? [];
    setCats(Array.isArray(data) ? data : []);
  };

  const refreshItems = async () => {
    const data = (await authedJSON<Item[]>("/api/admin/items")) ?? [];
    const arr = Array.isArray(data) ? data : [];
    // fallback: jeżeli jakiś item nie ma orderów/isPrimary – generujemy
    arr.forEach((it) => {
      it.images = (it.images ?? [])
        .map((img, idx) => ({ order: idx, isPrimary: idx === 0, altPl: "", altEn: "", ...img }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
    setItems(arr);
  };

  /* ===== translator helper (opcjonalny) ===== */
  async function translatePLtoEN(text: string): Promise<string> {
    try {
      const res = await authedFetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source: "pl", target: "en" }),
      });
      const data = await readJSON<{ text: string }>(res);
      const maybe = data as { text?: unknown } | null;
      if (maybe && typeof maybe.text === "string") {
        return maybe.text;
      }
      return text;
    } catch {
      return text;
    }
  }

  /* ===== kategorie: create / edit / delete / reorder ===== */
  const submitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await authedJSON("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName }),
      });
      setNewCatName("");
      await refreshCats();
      setMsg("Dodano kategorię");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  const startEditCat = (c: Category) => setEditCat((s) => ({ ...s, [c._id]: { name: c.name, slug: c.slug } }));
  const cancelEditCat = (id: string) =>
    setEditCat((s) => {
      const n = { ...s };
      delete n[id];
      return n;
    });
  const saveCat = async (id: string) => {
    const data = editCat[id];
    if (!data) return;
    setLoading(true);
    setMsg(null);
    try {
      await authedJSON(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, slug: data.slug }),
      });
      cancelEditCat(id);
      await refreshCats();
      setMsg("Zapisano kategorię");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  const deleteCat = async (id: string) => {
    if (!confirm("Usunąć kategorię i wszystkie jej przedmioty?")) return;
    setLoading(true);
    setMsg(null);
    try {
      await authedJSON(`/api/admin/categories/${id}`, { method: "DELETE" });
      await Promise.all([refreshCats(), refreshItems()]);
      setMsg("Usunięto kategorię");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  // zamiana order z sąsiadem
  const moveCat = async (id: string, dir: -1 | 1) => {
    const sorted = [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = sorted.findIndex((c) => c._id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];
    const aOrder = a.order ?? idx;
    const bOrder = b.order ?? swapIdx;

    setLoading(true);
    setMsg(null);
    try {
      await authedJSON(`/api/admin/categories/${a._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: bOrder }),
      });
      await authedJSON(`/api/admin/categories/${b._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: aOrder }),
      });
      await refreshCats();
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  /* ===== upload helpers ===== */
  const uploadOne = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const upData = (await authedJSON<{ path: string }>("/api/admin/upload", { method: "POST", body: fd })) as
      | { path: string }
      | null;
    if (!upData || typeof upData !== "object" || !("path" in upData)) {
      throw new Error("Błędna odpowiedź z uploadu");
    }
    return (upData as { path: string }).path;
  };

  const uploadMany = async (files: File[]) => {
    const urls: string[] = [];
    for (const f of files) {
      // upload sekwencyjny – prosto i stabilnie
      const url = await uploadOne(f);
      urls.push(url);
    }
    return urls;
  };

  /* ===== items: create / edit / delete ===== */

  // CREATE
  const submitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (!form.files.length) throw new Error("Dodaj co najmniej jedno zdjęcie");

      const uploaded = await uploadMany(form.files);
      // zlep meta + url-e
      const imgs: ItemImage[] = uploaded.map((url, i) => ({
        url,
        ...(form.imagesMeta[i] || {}),
        order: form.imagesMeta[i]?.order ?? i,
        isPrimary: form.imagesMeta[i]?.isPrimary ?? i === 0,
      }));

      await authedJSON("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: form.categoryId,
          title: form.title,
          titleEn: form.titleEn || undefined,
          description: form.description,
          descriptionEn: form.descriptionEn || undefined,
          rozmiarMin: Number(form.rozmiarMin),
          rozmiarMax: Number(form.rozmiarMax),
          rozmiarGlowny: form.rozmiarGlowny ? Number(form.rozmiarGlowny) : undefined,
          rozSprz: form.rozSprz ? Number(form.rozSprz) : undefined,
          cenaPLN: Number(form.cenaPLN),
          numerPaska: Number(form.numerPaska),
          images: imgs,
        }),
      });

      // cleanup previews
      form.previews.forEach((u) => URL.revokeObjectURL(u));

      // reset
      setForm({
        categoryId: "",
        title: "",
        titleEn: "",
        description:
          "Pasek ze skóry licowej najlepszej jakości, wycinany, farbiony ręcznie. Brzegi skóry malowane, zabezpieczony lakierem. Stosowane farby są głęboko penetrujące a co za tym idzie, nie złuszczają się, nie pękają, nie farbią ubrań gdy są mokre. Długość paska od klamry do końca 120cm.",
        descriptionEn: "",
        rozmiarMin: "",
        rozmiarMax: "",
        rozmiarGlowny: "",
        rozSprz: "", 
        cenaPLN: "",
        numerPaska: "",
        files: [],
        previews: [],
        imagesMeta: [],
      });

      await refreshItems();
      setMsg("Dodano przedmiot");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  // START EDIT
  const startEditItem = (it: Item) => {
    const catId = typeof it.categoryId === "string" ? it.categoryId : it.categoryId?._id;
    // posortuj po order
    const sortedImgs = [...(it.images ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    // jeżeli brak primary – ustaw pierwszy
    if (!sortedImgs.some((x) => x.isPrimary)) {
      if (sortedImgs[0]) sortedImgs[0].isPrimary = true;
    }
    setEditItem((s) => ({
      ...s,
      [it._id]: {
        categoryId: catId || "",
        title: it.title || "",
        description: it.description || "",
        titleEn: it.titleEn || "",
        descriptionEn: it.descriptionEn || "",
        rozmiarMin: String(it.rozmiarMin ?? ""),
        rozmiarMax: String(it.rozmiarMax ?? ""),
        rozmiarGlowny: it.rozmiarGlowny != null ? String(it.rozmiarGlowny) : "",
        rozSprz: it.rozSprz != null ? String(it.rozSprz) : "",
        cenaPLN: String(it.cenaPLN ?? ""),
        numerPaska: String(it.numerPaska ?? ""),
        images: sortedImgs,
        newFiles: [],
        newPreviews: [],
        newMeta: [],
      },
    }));
  };

  const cancelEditItem = (id: string) =>
    setEditItem((s) => {
      const d = s[id];
      d?.newPreviews?.forEach((u) => URL.revokeObjectURL(u));
      const n = { ...s };
      delete n[id];
      return n;
    });

  // SAVE EDIT
  const saveItem = async (id: string) => {
    const data = editItem[id];
    if (!data) return;
    setLoading(true);
    setMsg(null);
    try {
      // upload nowych
      const newUrls = await uploadMany(data.newFiles);
      const newImgs: ItemImage[] = newUrls.map((url, i) => ({
        url,
        ...(data.newMeta[i] || {}),
        order: data.newMeta[i]?.order ?? (data.images.length + i),
        isPrimary: data.newMeta[i]?.isPrimary ?? false,
      }));

      // sklej wszystko
      const merged = [...data.images, ...newImgs]
        .map((img, idx) => ({ ...img, order: img.order ?? idx })) // upewnij się, że każdy ma order
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      // gwarancja jednego primary
      if (!merged.some((x) => x.isPrimary)) {
        if (merged[0]) merged[0].isPrimary = true;
      } else {
        // jeżeli kilka zaznaczonych, zostaw pierwszy
        let hit = false;
        merged.forEach((m) => {
          if (m.isPrimary && !hit) {
            hit = true;
          } else if (m.isPrimary && hit) {
            m.isPrimary = false;
          }
        });
      }

      await authedJSON(`/api/admin/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: data.categoryId,
          title: data.title,
          description: data.description,
          titleEn: data.titleEn || undefined,
          descriptionEn: data.descriptionEn || undefined,
          rozmiarMin: Number(data.rozmiarMin),
          rozmiarMax: Number(data.rozmiarMax),
          rozmiarGlowny: data.rozmiarGlowny ? Number(data.rozmiarGlowny) : null,
          rozSprz: data.rozSprz ? Number(data.rozSprz) : null,
          cenaPLN: Number(data.cenaPLN),
          numerPaska: Number(data.numerPaska),
          images: merged,
        }),
      });

      cancelEditItem(id);
      await refreshItems();
      setMsg("Zapisano przedmiot");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Usunąć przedmiot?")) return;
    setLoading(true);
    setMsg(null);
    try {
      await authedJSON(`/api/admin/items/${id}`, { method: "DELETE" });
      await refreshItems();
      setMsg("Usunięto przedmiot");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  /* ===== dane do podglądu ===== */
  const groupedForPreview = useMemo(() => {
    const sortedCats = [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return sortedCats.map((c) => {
      const its = items
        .filter((i) => {
          const cat = i.categoryId;
          const id = typeof cat === "string" ? cat : isCatObj(cat) ? cat._id : "";
          return id === c._id;
        })
        .sort((a, b) => (a.numerPaska ?? 0) - (b.numerPaska ?? 0));

      const belts: BeltItem[] = its.map((i) => {
        const namePL = i.title || "";
        const descPL = i.description || "";
        const nameEN = enCache[i._id]?.titleEn || i.titleEn;
        const descEN = enCache[i._id]?.descriptionEn || i.descriptionEn;
        const useEN = autoTranslateEN || previewLang === "en";
        const primary = (i.images ?? []).find((im) => im.isPrimary) || (i.images ?? [])[0];

        return {
          name: useEN ? nameEN || namePL : namePL,
          description: useEN ? descEN || descPL : descPL,
          price: i.cenaPLN,
          upperSize: `${Math.max(i.rozmiarMin, i.rozmiarMax)} cm`,
          lowerSize: `${Math.min(i.rozmiarMin, i.rozmiarMax)} cm`,
          mainSize: typeof i.rozmiarGlowny === "number" && !isNaN(i.rozmiarGlowny) ? `${i.rozmiarGlowny} cm` : undefined,
          // NOWE: sprzączka → bąbelek po lewej
          buckleSize: typeof i.rozSprz === "number" && !isNaN(i.rozSprz) ? `${i.rozSprz} cm` : undefined,
          image: primary?.url,
          beltNo: i.numerPaska,
        };
      });

      return { title: c.name, belts };
    });
  }, [cats, items, previewLang, autoTranslateEN, enCache]);

  // auto-translate cache — efekt
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!autoTranslateEN) return;
      const map: Record<string, { titleEn: string; descriptionEn: string }> = { ...enCache };
      for (const it of items) {
        if (map[it._id]?.titleEn && map[it._id]?.descriptionEn) continue;
        const titleEn = await translatePLtoEN(it.title || "");
        const descriptionEn = await translatePLtoEN(it.description || "");
        if (cancelled) return;
        map[it._id] = { titleEn, descriptionEn };
      }
      if (!cancelled) setEnCache(map);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTranslateEN, items]);

  /* ===== login screen ===== */
  if (!ok) {
    return (
      <main className="min-h-screen bg-[#f5f5ef] text-neutral-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-serif mb-2">Panel administracyjny</h1>
          <p className="text-sm text-neutral-600 mb-4">Podaj hasło, aby przejść dalej.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="hasło"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
          <button onClick={tryAuth} className="w-full px-4 py-2 rounded-lg bg-neutral-900 text-white">Zaloguj</button>
          {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
        </div>
      </main>
    );
  }

  /* ===== main admin UI ===== */
  const sortedCats = [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // helpers UI do reorder/toggle primary w CREATE
  const setCreateImgMeta = (idx: number, patch: Partial<Omit<ItemImage, "url">>) =>
    setForm((s) => {
      const meta = [...s.imagesMeta];
      meta[idx] = { ...meta[idx], ...patch };
      return { ...s, imagesMeta: meta };
    });

  const ensureOnePrimaryCreate = (setIndexPrimary: number) =>
    setForm((s) => {
      const meta = s.imagesMeta.map((m, i) => ({ ...m, isPrimary: i === setIndexPrimary }));
      return { ...s, imagesMeta: meta };
    });

  const reorderCreate = (idx: number, dir: -1 | 1) =>
    setForm((s) => {
      const files = [...s.files];
      const previews = [...s.previews];
      const meta = [...s.imagesMeta];
      const j = idx + dir;
      if (j < 0 || j >= files.length) return s;
      [files[idx], files[j]] = [files[j], files[idx]];
      [previews[idx], previews[j]] = [previews[j], previews[idx]];
      [meta[idx], meta[j]] = [meta[j], meta[idx]];
      // przelicz ordery
      const withOrder = meta.map((m, i) => ({ ...m, order: i }));
      return { ...s, files, previews, imagesMeta: withOrder };
    });

  return (
    <main className="min-h-screen bg-[#f5f5ef] text-neutral-900 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-serif">Panel administracyjny</h1>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <button
              onClick={() => setAutoTranslateEN((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${autoTranslateEN ? "bg-neutral-900 text-white border-neutral-900" : "bg-white"}`}
              title="Automatyczne tłumaczenie PL→EN (podgląd)"
            >
              <Languages className="h-4 w-4" /> EN auto
            </button>
            <span>Hasło zapisane lokalnie</span>
          </div>
        </header>

        {/* KATEGORIE */}
        <section className="rounded-2xl border border-neutral-300 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="font-medium mb-4">Kategorie</h2>

          <form onSubmit={submitCategory} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-4">
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nazwa kategorii"
              className="rounded-lg border border-neutral-300 px-4 py-3 text-lg"
              required
            />
            <button disabled={loading} className="rounded-lg bg-neutral-900 text-white px-6 py-3 text-lg">
              {loading ? "Zapisywanie…" : "Dodaj kategorię"}
            </button>
          </form>

          <ul className="text-sm text-neutral-700 divide-y divide-neutral-200">
            {sortedCats.map((c, i) => {
              const isEditing = !!editCat[c._id];
              const canUp = i > 0;
              const canDown = i < sortedCats.length - 1;
              return (
                <li key={c._id} className="py-3 flex items-center gap-3">
                  {!isEditing ? (
                    <div className="flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-neutral-500">/{c.slug}</div>
                    </div>
                  ) : (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        value={editCat[c._id].name}
                        onChange={(e) => setEditCat((s) => ({ ...s, [c._id]: { ...s[c._id], name: e.target.value } }))}
                        className="rounded border border-neutral-300 px-3 py-1.5"
                      />
                      <input
                        value={editCat[c._id].slug}
                        onChange={(e) => setEditCat((s) => ({ ...s, [c._id]: { ...s[c._id], slug: e.target.value } }))}
                        className="rounded border border-neutral-300 px-3 py-1.5"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button onClick={() => moveCat(c._id, -1)} disabled={!canUp} className={`p-2 rounded ${canUp ? "hover:bg-neutral-100" : "opacity-40 cursor-not-allowed"}`} title="Przenieś w górę">↑</button>
                    <button onClick={() => moveCat(c._id, 1)} disabled={!canDown} className={`p-2 rounded ${canDown ? "hover:bg-neutral-100" : "opacity-40 cursor-not-allowed"}`} title="Przenieś w dół">↓</button>

                    {!isEditing ? (
                      <>
                        <button onClick={() => startEditCat(c)} className="p-2 rounded hover:bg-neutral-100" title="Edytuj">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteCat(c._id)} className="p-2 rounded hover:bg-red-50 text-red-600" title="Usuń">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => saveCat(c._id)} className="p-2 rounded hover:bg-green-50 text-green-700" title="Zapisz">
                          <Save className="h-4 w-4" />
                        </button>
                        <button onClick={() => cancelEditCat(c._id)} className="p-2 rounded hover:bg-neutral-100" title="Anuluj">
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
            {cats.length === 0 && <li className="py-3 text-neutral-500">Brak kategorii</li>}
          </ul>
        </section>

        {/* PRZEDMIOTY */}
        <section className="rounded-2xl border border-neutral-300 bg-white p-4 md:p-6 shadow-sm text-gray-800">
          <h2 className="font-medium mb-4">Dodaj pasek (multi-zdjęcia + EN)</h2>

          <form onSubmit={submitItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required>
                <option value="">Wybierz kategorię…</option>
                {sortedCats.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tytuł (PL)" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required />
              <input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} placeholder="Title (EN)" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opis (PL)" className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-lg" rows={3} />
              <textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} placeholder="Description (EN)" className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-lg" rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="number" value={form.rozmiarMin} onChange={(e) => setForm({ ...form, rozmiarMin: e.target.value })} placeholder="Rozmiar min (cm)" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required />
              <input type="number" value={form.rozmiarMax} onChange={(e) => setForm({ ...form, rozmiarMax: e.target.value })} placeholder="Rozmiar max (cm)" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required />
              <input
                type="number"
                value={form.rozSprz}
                onChange={(e) => setForm({ ...form, rozSprz: e.target.value })}
                placeholder="Rozmiar sprzączki (cm)"
                className="rounded-xl border border-neutral-300 px-4 py-3 text-lg"
              />
              <input type="number" value={form.rozmiarGlowny} onChange={(e) => setForm({ ...form, rozmiarGlowny: e.target.value })} placeholder="Rozmiar główny (cm)" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="number" value={form.cenaPLN} onChange={(e) => setForm({ ...form, cenaPLN: e.target.value })} placeholder="Cena (PLN)" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required />
              <input type="number" value={form.numerPaska} onChange={(e) => setForm({ ...form, numerPaska: e.target.value })} placeholder="Nr paska" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required />
            </div>

            {/* UPLOAD WIELOKROTNY */}
            <div className="space-y-3">
              <label className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 px-4 py-6 cursor-pointer hover:bg-neutral-50">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    const previews = files.map((f) => URL.createObjectURL(f));
                    const meta: Omit<ItemImage, "url">[] = files.map((_, i) => ({
                      altPl: "",
                      altEn: "",
                      isPrimary: form.files.length === 0 && i === 0, // jeśli pierwsze zdjęcia – ustaw primary na pierwszym
                      order: form.files.length + i,
                    }));
                    setForm((s) => ({
                      ...s,
                      files: [...s.files, ...files],
                      previews: [...s.previews, ...previews],
                      imagesMeta: [...s.imagesMeta, ...meta],
                    }));
                  }}
                />
                <ImageIcon className="h-6 w-6" />
                <span className="text-lg">Wrzuć zdjęcia (możesz wiele)</span>
              </label>

              {/* Galeria draft */}
              {form.previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {form.previews.map((src, i) => {
                    const meta = form.imagesMeta[i] || {};
                    const primary = !!meta.isPrimary;
                    return (
                      <div key={i} className="rounded-xl border overflow-hidden">
                        <div className="relative w-full aspect-[4/3]">
                          <Image src={src} alt={`preview-${i + 1}`} fill className="object-cover" />
                          <div className="absolute top-2 left-2 flex gap-1">
                            <button type="button" onClick={() => ensureOnePrimaryCreate(i)} className={`px-2 py-1 text-xs rounded ${primary ? "bg-yellow-400/90" : "bg-white/80 border"}`} title={primary ? "Zdjęcie główne" : "Ustaw jako główne"}>
                              {primary ? <Star className="h-3.5 w-3.5" /> : <StarOff className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <button type="button" onClick={() => reorderCreate(i, -1)} className="px-2 py-1 text-xs rounded bg-white/80 border" title="W górę">
                              <ArrowUpAZ className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => reorderCreate(i, 1)} className="px-2 py-1 text-xs rounded bg-white/80 border" title="W dół">
                              <ArrowDownAZ className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          <input
                            value={meta.altPl ?? ""}
                            onChange={(e) => setCreateImgMeta(i, { altPl: e.target.value })}
                            className="w-full rounded border px-2 py-1 text-xs"
                            placeholder="ALT (PL)"
                          />
                          <input
                            value={meta.altEn ?? ""}
                            onChange={(e) => setCreateImgMeta(i, { altEn: e.target.value })}
                            className="w-full rounded border px-2 py-1 text-xs"
                            placeholder="ALT (EN)"
                          />
                          <button
                            type="button"
                            className="w-full rounded border px-2 py-1 text-xs hover:bg-red-50 text-red-600"
                            onClick={() =>
                              setForm((s) => {
                                const files = [...s.files];
                                const previews = [...s.previews];
                                const meta = [...s.imagesMeta];
                                URL.revokeObjectURL(previews[i]);
                                files.splice(i, 1);
                                previews.splice(i, 1);
                                meta.splice(i, 1);
                                // przelicz order
                                const withOrder = meta.map((m, idx) => ({ ...m, order: idx }));
                                // jeżeli usunęliśmy primary – ustaw 0 jako primary
                                if (!withOrder.some((m) => m.isPrimary) && withOrder[0]) withOrder[0].isPrimary = true;
                                return { ...s, files, previews, imagesMeta: withOrder };
                              })
                            }
                          >
                            Usuń
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button disabled={loading} className="w-full rounded-2xl bg-neutral-900 text-white px-6 py-4 text-xl font-medium inline-flex items-center justify-center gap-2">
              <Plus className="h-5 w-5" /> {loading ? "Zapisywanie…" : "Dodaj pasek"}
            </button>
          </form>

          {msg && <p className="mt-3 text-sm text-neutral-700">{msg}</p>}

          <h3 className="mt-8 font-medium">Paski wg kategorii</h3>
          <div className="mt-4 space-y-8">
            {sortedCats.map((c) => {
              const its = items
                .filter((i) => {
                  const cat = i.categoryId;
                  const id = typeof cat === "string" ? cat : isCatObj(cat) ? cat._id : "";
                  return id === c._id;
                })
                .sort((a, b) => (a.numerPaska ?? 0) - (b.numerPaska ?? 0));
              return (
                <div key={c._id}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold">{c.name}</h4>
                    <div className="text-xs text-neutral-500">{its.length} szt.</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {its.map((it) => {
                      const editing = editItem[it._id];
                      const primary = (editing?.images ?? it.images ?? []).find((im) => im.isPrimary) || (editing?.images ?? it.images ?? [])[0];
                      const hero = primary?.url || "/images/placeholder.png";
                      const catName = typeof it.categoryId === "string" ? it.categoryId : isCatObj(it.categoryId) ? it.categoryId.name : "";
                      return (
                        <div key={it._id} className="rounded-2xl p-3 flex flex-col gap-3 bg-white border">
                          <div className="relative w-full aspect-[4/3]">
                            <Image src={hero} alt={it.title} fill sizes="400px" className="object-cover rounded-xl border" />
                          </div>

                          {!editing ? (
                            <div className="flex-1 text-sm">
                              <div className="font-medium text-base">{it.title}</div>
                              <div className="text-neutral-600">EN: {it.titleEn || "—"}</div>
                              <div className="text-neutral-600">Kategoria: {catName}</div>
                              <div className="text-neutral-600">Rozmiar: {it.rozmiarMin} – {it.rozmiarMax} cm</div>
                              {typeof it.rozmiarGlowny === "number" && (
                                <div className="text-neutral-600">Rozmiar główny: {it.rozmiarGlowny} cm</div>
                              )}
                              {typeof it.rozSprz === "number" && (
                                <div className="text-neutral-600">Sprzączka: {it.rozSprz} cm</div>
                              )}
                              <div className="text-neutral-600">Cena: {it.cenaPLN} PLN, Nr: {it.numerPaska}</div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button onClick={() => startEditItem(it)} className="px-4 py-2 rounded-lg border hover:bg-neutral-50 text-neutral-700 inline-flex items-center gap-1.5">
                                  <Pencil className="h-4 w-4" /> Edytuj
                                </button>
                                <button onClick={() => deleteItem(it._id)} className="px-4 py-2 rounded-lg border hover:bg-red-50 text-red-600 inline-flex items-center gap-1.5">
                                  <Trash2 className="h-4 w-4" /> Usuń
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 grid grid-cols-1 gap-2 text-sm">
                              <select value={editing.categoryId} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], categoryId: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2">
                                {sortedCats.map((sc) => (
                                  <option key={sc._id} value={sc._id}>{sc.name}</option>
                                ))}
                              </select>
                              <input value={editing.title} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], title: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2" placeholder="Tytuł (PL)" />
                              <textarea value={editing.description} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], description: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2" placeholder="Opis (PL)" rows={2} />

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input value={editing.titleEn || ""} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], titleEn: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2" placeholder="Title (EN)" />
                                <input value={editing.descriptionEn || ""} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], descriptionEn: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2" placeholder="Description (EN)" />
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <input type="number" value={editing.rozmiarMin} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], rozmiarMin: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2" placeholder="Min" />
                                <input type="number" value={editing.rozmiarMax} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], rozmiarMax: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2" placeholder="Max" />
                                <input type="number" value={editing.rozmiarGlowny} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], rozmiarGlowny: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2" placeholder="Główny" />
                                <input
                                  type="number"
                                  value={editing.rozSprz}
                                  onChange={(e) =>
                                    setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], rozSprz: e.target.value } }))
                                  }
                                  className="rounded-xl border border-neutral-300 px-3 py-2"
                                  placeholder="Sprzączka"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={editing.cenaPLN} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], cenaPLN: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2" placeholder="Cena" />
                                <input type="number" value={editing.numerPaska} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], numerPaska: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2" placeholder="Nr" />
                              </div>

                              {/* ISTNIEJĄCE ZDJĘCIA */}
                              <div className="mt-2">
                                <div className="text-xs text-neutral-500 mb-1">Zdjęcia</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {editing.images.map((img, i) => (
                                    <div key={i} className="rounded-lg border overflow-hidden">
                                      <div className="relative w-full aspect-[4/3]">
                                        <Image src={img.url} alt={img.altPl || img.altEn || `img-${i + 1}`} fill className="object-cover" />
                                        <div className="absolute top-2 left-2 flex gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditItem((s) => {
                                                const cur = s[it._id];
                                                const imgs = cur.images.map((m, idx) => ({ ...m, isPrimary: idx === i }));
                                                return { ...s, [it._id]: { ...cur, images: imgs } };
                                              })
                                            }
                                            className={`px-2 py-1 text-xs rounded ${img.isPrimary ? "bg-yellow-400/90" : "bg-white/80 border"}`}
                                            title={img.isPrimary ? "Zdjęcie główne" : "Ustaw jako główne"}
                                          >
                                            {img.isPrimary ? <Star className="h-3.5 w-3.5" /> : <StarOff className="h-3.5 w-3.5" />}
                                          </button>
                                        </div>
                                        <div className="absolute top-2 right-2 flex gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditItem((s) => {
                                                const cur = s[it._id];
                                                const imgs = [...cur.images];
                                                if (i > 0) {
                                                  [imgs[i - 1], imgs[i]] = [imgs[i], imgs[i - 1]];
                                                }
                                                // przelicz ordery
                                                imgs.forEach((m, idx) => (m.order = idx));
                                                return { ...s, [it._id]: { ...cur, images: imgs } };
                                              })
                                            }
                                            className="px-2 py-1 text-xs rounded bg-white/80 border"
                                            title="W górę"
                                          >
                                            <ArrowUpAZ className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditItem((s) => {
                                                const cur = s[it._id];
                                                const imgs = [...cur.images];
                                                if (i < imgs.length - 1) {
                                                  [imgs[i + 1], imgs[i]] = [imgs[i], imgs[i + 1]];
                                                }
                                                imgs.forEach((m, idx) => (m.order = idx));
                                                return { ...s, [it._id]: { ...cur, images: imgs } };
                                              })
                                            }
                                            className="px-2 py-1 text-xs rounded bg-white/80 border"
                                            title="W dół"
                                          >
                                            <ArrowDownAZ className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="p-2 space-y-1">
                                        <input
                                          value={img.altPl ?? ""}
                                          onChange={(e) =>
                                            setEditItem((s) => {
                                              const cur = s[it._id];
                                              const imgs = [...cur.images];
                                              imgs[i] = { ...imgs[i], altPl: e.target.value };
                                              return { ...s, [it._id]: { ...cur, images: imgs } };
                                            })
                                          }
                                          className="w-full rounded border px-2 py-1 text-xs"
                                          placeholder="ALT (PL)"
                                        />
                                        <input
                                          value={img.altEn ?? ""}
                                          onChange={(e) =>
                                            setEditItem((s) => {
                                              const cur = s[it._id];
                                              const imgs = [...cur.images];
                                              imgs[i] = { ...imgs[i], altEn: e.target.value };
                                              return { ...s, [it._id]: { ...cur, images: imgs } };
                                            })
                                          }
                                          className="w-full rounded border px-2 py-1 text-xs"
                                          placeholder="ALT (EN)"
                                        />
                                        <button
                                          type="button"
                                          className="w-full rounded border px-2 py-1 text-xs hover:bg-red-50 text-red-600"
                                          onClick={() =>
                                            setEditItem((s) => {
                                              const cur = s[it._id];
                                              const imgs = [...cur.images];
                                              imgs.splice(i, 1);
                                              imgs.forEach((m, idx) => (m.order = idx));
                                              if (!imgs.some((m) => m.isPrimary) && imgs[0]) imgs[0].isPrimary = true;
                                              return { ...s, [it._id]: { ...cur, images: imgs } };
                                            })
                                          }
                                        >
                                          Usuń
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* DODAJ NOWE ZDJĘCIA */}
                              <div className="mt-2">
                                <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 px-3 py-3 cursor-pointer hover:bg-neutral-50">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      if (!files.length) return;
                                      const previews = files.map((f) => URL.createObjectURL(f));
                                      setEditItem((s) => {
                                        const cur = s[it._id];
                                        const startOrder = cur.images.length + cur.newFiles.length;
                                        const newMeta = files.map((_, idx) => ({ altPl: "", altEn: "", isPrimary: false, order: startOrder + idx }));
                                        return {
                                          ...s,
                                          [it._id]: {
                                            ...cur,
                                            newFiles: [...cur.newFiles, ...files],
                                            newPreviews: [...cur.newPreviews, ...previews],
                                            newMeta: [...cur.newMeta, ...newMeta],
                                          },
                                        };
                                      });
                                    }}
                                  />
                                  <ImageIcon className="h-5 w-5" /> Dodaj zdjęcia
                                </label>

                                {/* podgląd nowych */}
                                {editing.newPreviews.length > 0 && (
                                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {editing.newPreviews.map((src, i) => {
                                      const meta = editing.newMeta[i] || {};
                                      const absoluteIndex = i; // w nowej paczce
                                      return (
                                        <div key={i} className="rounded-lg border overflow-hidden">
                                          <div className="relative w-full aspect-[4/3]">
                                            <Image src={src} alt={`new-${i}`} fill className="object-cover" />
                                            <div className="absolute top-2 left-2">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setEditItem((s) => {
                                                    const cur = s[it._id];
                                                    const nm = cur.newMeta.map((m, idx) => ({ ...m, isPrimary: idx === absoluteIndex }));
                                                    // kasujemy primary w istniejących
                                                    const imgs = cur.images.map((m) => ({ ...m, isPrimary: false }));
                                                    return { ...s, [it._id]: { ...cur, images: imgs, newMeta: nm } };
                                                  })
                                                }
                                                className={`px-2 py-1 text-xs rounded ${meta.isPrimary ? "bg-yellow-400/90" : "bg-white/80 border"}`}
                                                title={meta.isPrimary ? "Zdjęcie główne" : "Ustaw jako główne"}
                                              >
                                                {meta.isPrimary ? <Star className="h-3.5 w-3.5" /> : <StarOff className="h-3.5 w-3.5" />}
                                              </button>
                                            </div>
                                          </div>
                                          <div className="p-2 space-y-1">
                                            <input
                                              value={meta.altPl ?? ""}
                                              onChange={(e) =>
                                                setEditItem((s) => {
                                                  const cur = s[it._id];
                                                  const nm = [...cur.newMeta];
                                                  nm[i] = { ...nm[i], altPl: e.target.value };
                                                  return { ...s, [it._id]: { ...cur, newMeta: nm } };
                                                })
                                              }
                                              className="w-full rounded border px-2 py-1 text-xs"
                                              placeholder="ALT (PL)"
                                            />
                                            <input
                                              value={meta.altEn ?? ""}
                                              onChange={(e) =>
                                                setEditItem((s) => {
                                                  const cur = s[it._id];
                                                  const nm = [...cur.newMeta];
                                                  nm[i] = { ...nm[i], altEn: e.target.value };
                                                  return { ...s, [it._id]: { ...cur, newMeta: nm } };
                                                })
                                              }
                                              className="w-full rounded border px-2 py-1 text-xs"
                                              placeholder="ALT (EN)"
                                            />
                                            <button
                                              type="button"
                                              className="w-full rounded border px-2 py-1 text-xs hover:bg-red-50 text-red-600"
                                              onClick={() =>
                                                setEditItem((s) => {
                                                  const cur = s[it._id];
                                                  const nf = [...cur.newFiles];
                                                  const np = [...cur.newPreviews];
                                                  const nm = [...cur.newMeta];
                                                  URL.revokeObjectURL(np[i]);
                                                  nf.splice(i, 1);
                                                  np.splice(i, 1);
                                                  nm.splice(i, 1);
                                                  nm.forEach((m, idx) => (m.order = cur.images.length + idx));
                                                  return { ...s, [it._id]: { ...cur, newFiles: nf, newPreviews: np, newMeta: nm } };
                                                })
                                              }
                                            >
                                              Usuń
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <button onClick={() => saveItem(it._id)} className="px-4 py-2 rounded-lg border hover:bg-green-50 text-green-700 inline-flex items-center gap-1.5">
                                  <Save className="h-4 w-4" /> Zapisz
                                </button>
                                <button onClick={() => cancelEditItem(it._id)} className="px-4 py-2 rounded-lg border hover:bg-neutral-50 inline-flex items-center gap-1.5">
                                  <X className="h-4 w-4" /> Anuluj
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {its.length === 0 && <div className="text-sm text-neutral-500">Brak przedmiotów w tej kategorii</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PODGLĄD (jak na stronie głównej) */}
        <section className="rounded-2xl border border-neutral-300 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">{UI_STRINGS[previewLang].preview}</h2>
            <div className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-1.5 py-1">
              <button onClick={() => setPreviewLang("pl")} aria-pressed={previewLang === "pl"} title="Polski" className={`inline-flex items-center justify-center rounded-md p-1.5 ${previewLang === "pl" ? "bg-[#f5f5ef]" : "hover:bg-neutral-100"}`}>
                <Image src="/images/poland.png" alt="" width={20} height={14} className="rounded-[2px]" />
              </button>
              <button onClick={() => setPreviewLang("en")} aria-pressed={previewLang === "en"} title="English" className={`inline-flex items-center justify-center rounded-md p-1.5 ${previewLang === "en" ? "bg-[#f5f5ef]" : "hover:bg-neutral-100"}`}>
                <Image src="/images/england.png" alt="" width={20} height={14} className="rounded-[2px]" />
              </button>
            </div>
          </div>

          <div className="space-y-16">
            {groupedForPreview.filter((g) => g.belts.length).map((g, idx) => (
              <div key={idx}>
                <CategoryPreview title={g.title} belts={g.belts} lang={previewLang} />
                <div className="mt-6 mx-auto w-full h-px bg-neutral-200" />
              </div>
            ))}
            {groupedForPreview.every((g) => !g.belts.length) && <div className="text-sm text-neutral-500">Brak danych do podglądu</div>}
          </div>
        </section>

        {msg && <div className="text-sm text-neutral-700">{msg}</div>}
      </div>
    </main>
  );
}
