"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import { Pencil, Save, X, Trash2, Plus, Image as ImageIcon, Languages, ChevronUp, ChevronDown } from "lucide-react";

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
  cenaPLN: number;
  numerPaska: number;
  imagePath?: string; // JEDNO zdjęcie
};

type BeltItem = {
  name: string;
  description: string;
  price: string | number;
  upperSize: string;
  lowerSize: string;
  mainSize?: string | number;
  image?: string; // JEDNO zdjęcie
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

/* ========= PODGLĄD KATEGORII — jedno zdjęcie w hero + miniatury ========= */
function CategoryPreview({ title, belts, lang }: { title: string; belts: BeltItem[]; lang: Lang }) {
  // HOOKI — zawsze na górze
  const [active, setActive] = useState(0);
  const VISIBLE = 4;
  const THUMB_H = 96;
  const GAP = 12;
  const ySpring = useSpring(0, { stiffness: 120, damping: 20 });
  const [scrollIndex, setScrollIndex] = useState(0);
  const t = UI_STRINGS[lang];

  const hero = belts[active];
  const thumbs = belts.map((b) => b.image || "");

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

  // Guard PO wszystkich hookach
  if (!belts.length) {
    return null;
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl md:text-3xl tracking-wide">Craft Symphony - {title}</h1>
      </div>

      <div className="relative">
        <div className="relative aspect-[4/3] md:aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-sm border border-neutral-200">
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-${title}-${active}-${hero?.image ?? "noimg"}`}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative h-full w-full"
            >
              {hero?.image ? (
                <Image src={hero.image} alt={`${t.heroAltPrefix} ${hero?.name ?? `${active + 1}`}`} fill sizes="100vw" className="object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-neutral-500">Brak zdjęcia</div>
              )}
            </motion.div>
          </AnimatePresence>

          {thumbs.length > 1 && (
            <div className="hidden md:flex absolute inset-y-0 right-4 my-4 flex-col items-center justify-center gap-3 select-none">
              <div className="absolute inset-y-0 -inset-x-2 rounded-2xl bg-black/35 backdrop-blur-sm border border-white/20" />

              <button onClick={scrollUp} className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 hover:bg-black/40 text-white shadow-sm" aria-label={t.scrollUp}>
                <ChevronUp className="h-5 w-5" />
              </button>

              <div className="relative h-[calc(4*96px+3*12px)] w-28 overflow-hidden rounded-xl border border-white/20 bg-transparent">
                <motion.div style={{ y: ySpring }} className="absolute top-0 left-0 w-full">
                  <div className="flex flex-col gap-3 p-0">
                    {thumbs.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={`relative h-24 w-full overflow-hidden rounded-lg border transition ${i === active ? "border-neutral-900 shadow" : "border-neutral-300 hover:border-neutral-500"}`}
                        aria-label={`${t.numberLabel} ${i + 1}`}
                        title={`Pasek ${i + 1}`}
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

              <button onClick={scrollDown} className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 hover:bg-black/40 text-white shadow-sm" aria-label={t.scrollDown}>
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {belts.length > 1 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {belts.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className={`px-3 py-1.5 rounded-full border text-sm ${i === active ? "bg-neutral-900 text-white border-neutral-900" : "bg-white hover:bg-neutral-50"}`} title={`${t.numberLabel} ${i + 1}`}>
              {t.numberLabel} {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 md:mt-8 text-center">
        <div className="text-center mb-3">
          <h3 className="font-serif text-base sm:text-lg tracking-wide">
            {t.numberLabel} {active + 1} {hero?.name ?? "—"}
          </h3>
          <p className="text-sm text-neutral-600 max-w-3xl mx-auto px-2">{hero?.description ?? "—"}</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center text-sm text-neutral-600 mb-[-48px]">{hero?.upperSize ?? "—"}</div>

          <div className="rounded-2xl overflow-hidden">
            <div className="relative mx-auto w-2/3 md:w-1/3 aspect-[3/2]">
              <Image src="/images/belt2.png" alt={UI_STRINGS[lang].schemaAlt} fill sizes="(max-width:768px) 66vw, 33vw" className="object-contain" />
              <div className="hidden md:block absolute top-1/2 -translate-y-1/2 right-0 translate-x-[110%]">
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
  // HOOKI — zawsze na górze
  const [password, setPassword] = useState("");
  const [ok, setOk] = useState(false);

  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState("");

  const [editCat, setEditCat] = useState<Record<string, { name: string; slug: string }>>({});

  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    description:
      "Pasek ze skóry licowej najlepszej jakości, wycinany, farbiony ręcznie. Brzegi skóry malowane, zabezpieczony lakierem. Stosowane farby są głęboko penetrujące a co za tym idzie, nie złuszczają się, nie pękają, nie farbią ubrań gdy są mokre. Długość paska od klamry do końca 120cm.",
    rozmiarMin: "",
    rozmiarMax: "",
    rozmiarGlowny: "",
    cenaPLN: "",
    numerPaska: "",
    file: null as File | null,
    previewUrl: "" as string,
  });

  const [autoTranslateEN, setAutoTranslateEN] = useState(false);
  const [enCache, setEnCache] = useState<Record<string, { titleEn: string; descriptionEn: string }>>({});

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
        cenaPLN: string;
        numerPaska: string;
        imagePath?: string;
        newFile: File | null;
        newPreview?: string;
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

  /* ===== upload helper: jeden plik ===== */
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

  /* ===== items: create / edit / delete ===== */
  const submitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (!form.file) throw new Error("Dodaj zdjęcie");

      const uploadedPath = await uploadOne(form.file);

      await authedJSON("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: form.categoryId,
          title: form.title,
          description: form.description,
          rozmiarMin: Number(form.rozmiarMin),
          rozmiarMax: Number(form.rozmiarMax),
          rozmiarGlowny: form.rozmiarGlowny ? Number(form.rozmiarGlowny) : undefined,
          cenaPLN: Number(form.cenaPLN),
          numerPaska: Number(form.numerPaska),
          imagePath: uploadedPath,
        }),
      });

      if (form.previewUrl) URL.revokeObjectURL(form.previewUrl);

      setForm({
        categoryId: "",
        title: "",
        description:
          "Pasek ze skóry licowej najlepszej jakości, wycinany, farbiony ręcznie. Brzegi skóry malowane, zabezpieczony lakierem. Stosowane farby są głęboko penetrujące a co za tym idzie, nie złuszczają się, nie pękają, nie farbią ubrań gdy są mokre. Długość paska od klamry do końca 120cm.",
        rozmiarMin: "",
        rozmiarMax: "",
        rozmiarGlowny: "",
        cenaPLN: "",
        numerPaska: "",
        file: null,
        previewUrl: "",
      });

      await refreshItems();
      setMsg("Dodano przedmiot");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  const startEditItem = (it: Item) => {
    const catId = typeof it.categoryId === "string" ? it.categoryId : it.categoryId?._id;
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
        cenaPLN: String(it.cenaPLN ?? ""),
        numerPaska: String(it.numerPaska ?? ""),
        imagePath: it.imagePath,
        newFile: null,
        newPreview: "",
      },
    }));
  };

  const cancelEditItem = (id: string) =>
    setEditItem((s) => {
      const d = s[id];
      if (d?.newPreview) URL.revokeObjectURL(d.newPreview);
      const n = { ...s };
      delete n[id];
      return n;
    });

  const saveItem = async (id: string) => {
    const data = editItem[id];
    if (!data) return;
    setLoading(true);
    setMsg(null);
    try {
      let imagePath = data.imagePath || "";
      if (data.newFile) {
        imagePath = await uploadOne(data.newFile);
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
          cenaPLN: Number(data.cenaPLN),
          numerPaska: Number(data.numerPaska),
          imagePath,
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
        return {
          name: useEN ? nameEN || namePL : namePL,
          description: useEN ? descEN || descPL : descPL,
          price: i.cenaPLN,
          upperSize: `${Math.max(i.rozmiarMin, i.rozmiarMax)} cm`,
          lowerSize: `${Math.min(i.rozmiarMin, i.rozmiarMax)} cm`,
          mainSize: typeof i.rozmiarGlowny === "number" && !isNaN(i.rozmiarGlowny) ? `${i.rozmiarGlowny} cm` : undefined,
          image: i.imagePath,
        };
      });
      return { title: c.name, belts };
    });
  }, [cats, items, previewLang, autoTranslateEN, enCache]);

  // auto-translate cache — efekt ZAWSZE wywołany, warunek w środku
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
          <h2 className="font-medium mb-4">Dodaj pasek (mega prosto)</h2>

          <form onSubmit={submitItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required>
                <option value="">Wybierz kategorię…</option>
                {sortedCats.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tytuł (PL)" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required />
              <input type="number" value={form.numerPaska} onChange={(e) => setForm({ ...form, numerPaska: e.target.value })} placeholder="Nr paska" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required />
            </div>

            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Pasek ze skóry…" className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-lg" rows={3} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="number" value={form.rozmiarMin} onChange={(e) => setForm({ ...form, rozmiarMin: e.target.value })} placeholder="Rozmiar min (cm)" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required />
              <input type="number" value={form.rozmiarMax} onChange={(e) => setForm({ ...form, rozmiarMax: e.target.value })} placeholder="Rozmiar max (cm)" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required />
              <input type="number" value={form.rozmiarGlowny} onChange={(e) => setForm({ ...form, rozmiarGlowny: e.target.value })} placeholder="Rozmiar główny (cm)" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="number" value={form.cenaPLN} onChange={(e) => setForm({ ...form, cenaPLN: e.target.value })} placeholder="Cena (PLN)" className="rounded-xl border border-neutral-300 px-4 py-3 text-lg" required />
              <label className="md:col-span-2 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 px-4 py-6 cursor-pointer hover:bg-neutral-50">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  const url = file ? URL.createObjectURL(file) : "";
                  if (form.previewUrl) URL.revokeObjectURL(form.previewUrl);
                  setForm((s) => ({ ...s, file, previewUrl: url }));
                }} />
                <ImageIcon className="h-6 w-6" />
                <span className="text-lg">Wrzuć zdjęcie</span>
              </label>
            </div>

            {form.previewUrl && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="relative w-full aspect-[4/3]">
                  <Image src={form.previewUrl} alt="preview" fill className="object-cover rounded-xl border" />
                </div>
              </div>
            )}

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
                      const hero = editing?.newPreview || editing?.imagePath || it.imagePath || "/images/placeholder.png";
                      const catName = typeof it.categoryId === "string" ? it.categoryId : isCatObj(it.categoryId) ? it.categoryId.name : "";
                      return (
                        <div key={it._id} className="rounded-2xl p-3 flex flex-col gap-3 bg-white border">
                          <div className="relative w-full aspect-[4/3]">
                            <Image src={hero} alt={it.title} fill sizes="400px" className="object-cover rounded-xl border" />
                          </div>

                          {!editing ? (
                            <div className="flex-1 text-sm">
                              <div className="font-medium text-base">{it.title}</div>
                              <div className="text-neutral-600">Kategoria: {catName}</div>
                              <div className="text-neutral-600">Rozmiar: {it.rozmiarMin} – {it.rozmiarMax} cm</div>
                              {typeof it.rozmiarGlowny === "number" && (
                                <div className="text-neutral-600">Rozmiar główny: {it.rozmiarGlowny} cm</div>
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
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={editing.cenaPLN} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], cenaPLN: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2" placeholder="Cena" />
                                <input type="number" value={editing.numerPaska} onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], numerPaska: e.target.value } }))} className="rounded-xl border border-neutral-300 px-3 py-2" placeholder="Nr" />
                              </div>

                              <div>
                                <div className="text-xs text-neutral-500 mb-1">Zdjęcie</div>
                                <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 px-3 py-3 cursor-pointer hover:bg-neutral-50">
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setEditItem((s) => {
                                      const prev = s[it._id];
                                      if (prev?.newPreview) URL.revokeObjectURL(prev.newPreview);
                                      return { ...s, [it._id]: { ...prev, newFile: file, newPreview: file ? URL.createObjectURL(file) : "" } };
                                    });
                                  }} />
                                  <ImageIcon className="h-5 w-5" /> Podmień zdjęcie
                                </label>
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
