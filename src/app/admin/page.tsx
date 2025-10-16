"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import { ChevronUp, ChevronDown, Pencil, Save, X, Trash2 } from "lucide-react";

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

/* ========= types ========= */
type Lang = "pl" | "en";

type Category = { _id: string; name: string; slug: string; order?: number };
type Item = {
  _id: string;
  categoryId: { _id: string; name: string; slug: string } | string;
  title: string;
  description: string;
  rozmiarMin: number;
  rozmiarMax: number;
  cenaPLN: number;
  numerPaska: number;
  imagePath: string;
};

type BeltItem = {
  name: string;
  description: string;
  price: string | number;
  upperSize: string;
  lowerSize: string;
};

const UI_STRINGS: Record<
  Lang,
  {
    preview: string;
    numberLabel: string;
    selectBelt: string;
    scrollUp: string;
    scrollDown: string;
    heroAltPrefix: string;
    schemaAlt: string;
    price: string;
  }
> = {
  pl: {
    preview: "Podgląd (jak na stronie głównej)",
    numberLabel: "Nr.",
    selectBelt: "Wybierz pasek nr",
    scrollUp: "Przewiń w górę",
    scrollDown: "Przewiń w dół",
    heroAltPrefix: "Pasek",
    schemaAlt: "Schemat paska – rozmiar",
    price: "Cena:",
  },
  en: {
    preview: "Preview (like the homepage)",
    numberLabel: "No.",
    selectBelt: "Select belt no.",
    scrollUp: "Scroll up",
    scrollDown: "Scroll down",
    heroAltPrefix: "Belt",
    schemaAlt: "Belt diagram — size",
    price: "Price:",
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

/* ========= mini komponent podglądu kategorii (jak na froncie) ========= */
function CategoryPreview({
  title,
  images,
  items,
  lang,
}: {
  title: string;
  images: string[];
  items: BeltItem[];
  lang: Lang;
}) {
  // Hooki zawsze na górze (bez warunków)
  const [active, setActive] = useState(0);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const VISIBLE = 4;
  const THUMB_H = 96;
  const GAP = 12;
  const ySpring = useSpring(0, { stiffness: 120, damping: 20 });

  const t = UI_STRINGS[lang];

  // Dane do renderu (dopiero po hookach)
  const count = Math.min(images.length, items.length);
  const displayImages = images.slice(0, count);
  const displayItems = items.slice(0, count);
  const belt = displayItems[active];

  useEffect(() => {
    ySpring.set(-(scrollIndex * (THUMB_H + GAP)));
  }, [scrollIndex, ySpring]);

  useEffect(() => {
    if (active < scrollIndex) setScrollIndex(active);
    if (active > scrollIndex + VISIBLE - 1) setScrollIndex(active - (VISIBLE - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      setActive((p) => Math.max(0, Math.min(displayImages.length - 1, p + (dx < 0 ? 1 : -1))));
    }
    setTouchStartX(null);
  };

  if (count === 0) return null;

  const maxScrollIndex = Math.max(0, displayImages.length - VISIBLE);

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl md:text-3xl tracking-wide">Craft Symphony - {title}</h1>
      </div>

      <div className="relative">
        <div className="relative aspect-[4/3] md:aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-${title}-${active}`}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative h-full w-full"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <Image
                src={displayImages[active]}
                alt={`${t.heroAltPrefix} ${belt?.name ?? `${active + 1}`}`}
                fill
                sizes="100vw"
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {displayImages.length > 1 && (
            <div className="hidden md:flex absolute inset-y-0 right-4 my-4 flex-col items-center justify-center gap-3 select-none">
              <div className="absolute inset-y-0 -inset-x-2 rounded-2xl bg-black/35 backdrop-blur-sm border border-white/20" />
              <button
                onClick={() => setScrollIndex((s) => Math.max(0, s - 1))}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 hover:bg-black/40 text-white shadow-sm"
                aria-label={t.scrollUp}
              >
                <ChevronUp className="h-5 w-5" />
              </button>

              <div className="relative h-[calc(4*96px+3*12px)] w-28 overflow-hidden rounded-xl border border-white/20 bg-transparent">
                <motion.div style={{ y: ySpring }} className="absolute top-0 left-0 w-full">
                  <div className="flex flex-col gap-3 p-0">
                    {displayImages.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={`relative h-24 w-full overflow-hidden rounded-lg border transition ${
                          i === active ? "border-neutral-900 shadow" : "border-neutral-300 hover:border-neutral-500"
                        }`}
                        aria-label={`${t.selectBelt} ${i + 1}`}
                      >
                        <div className="relative h-24 w-full">
                          <Image src={src} alt={`thumb-${i + 1}`} fill sizes="112px" className="object-cover rounded-lg" />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>

              <button
                onClick={() => setScrollIndex((s) => Math.min(maxScrollIndex, s + 1))}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 hover:bg-black/40 text-white shadow-sm"
                aria-label={t.scrollDown}
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 md:mt-8 text-center">
        <div className="text-center mb-3">
          <h3 className="font-serif text-base sm:text-lg tracking-wide">
            {t.numberLabel}\u00a0{active + 1}\u00a0{belt?.name ?? "—"}
          </h3>
          <p className="text-sm text-neutral-600 max-w-3xl mx-auto px-2">{belt?.description ?? "—"}</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center text-sm text-neutral-600 mb-[-48px]">{belt?.upperSize ?? "—"}</div>

          <div className="rounded-2xl overflow-hidden">
            <div className="relative mx-auto w-2/3 md:w-1/3 aspect-[3/2]">
              <Image src="/images/belt2.png" alt={t.schemaAlt} fill sizes="(max-width:768px) 66vw, 33vw" className="object-contain" />
            </div>
          </div>

          <div className="text-center text-sm text-neutral-600 mt-[-48px]">{belt?.lowerSize ?? "—"}</div>
        </div>

        <p className="mt-8 text-center text-[13px] text-neutral-600 mb-16 italic">
          {t.price}{" "}
          <span className="font-medium tracking-wide">{formatPriceForLang(belt?.price, lang)}</span>
        </p>
      </div>
    </div>
  );
}

/* ========= główna strona panelu ========= */
export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [ok, setOk] = useState(false);

  // dane
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // dodawanie kategorii
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");

  // edycja kategorii
  const [editCat, setEditCat] = useState<Record<string, { name: string; slug: string }>>({});

  // dodawanie itemu
  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    description: "",
    rozmiarMin: "",
    rozmiarMax: "",
    cenaPLN: "",
    numerPaska: "",
    file: null as File | null,
  });

  // edycja itemu
  const [editItem, setEditItem] = useState<
    Record<
      string,
      {
        categoryId: string;
        title: string;
        description: string;
        rozmiarMin: string;
        rozmiarMax: string;
        cenaPLN: string;
        numerPaska: string;
        file: File | null;
      }
    >
  >({});

  // język w podglądzie
  const [previewLang, setPreviewLang] = useState<Lang>("pl");

  /* ===== auth persistence ===== */
  useEffect(() => {
    const saved = localStorage.getItem("admin_pwd");
    if (saved) setPassword(saved);
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

  const tryAuth = async () => {
    try {
      const r = await authedFetch("/api/admin/categories");
      if (r.ok) {
        setOk(true);
        localStorage.setItem("admin_pwd", password);
        setCats(await r.json());
        await refreshItems();
      }
    } catch (e) {
      setOk(false);
      setMsg(errToString(e));
    }
  };

  const refreshCats = async () => {
    const r = await authedFetch("/api/admin/categories");
    setCats(await r.json());
  };
  const refreshItems = async () => {
    const r = await authedFetch("/api/admin/items");
    setItems(await r.json());
  };

  /* ===== kategorie: create / edit / delete / reorder ===== */
  const submitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const r = await authedFetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...API_HEADERS(password) },
        body: JSON.stringify({ name: newCatName, slug: newCatSlug || undefined }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Błąd");
      setNewCatName("");
      setNewCatSlug("");
      await refreshCats();
      setMsg("Dodano kategorię");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  const startEditCat = (c: Category) => setEditCat((s) => ({ ...s, [c._id]: { name: c.name, slug: c.slug } }));

  const cancelEditCat = (id: string) => setEditCat((s) => {
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
      const r = await authedFetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...API_HEADERS(password) },
        body: JSON.stringify({ name: data.name, slug: data.slug }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Błąd");
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
      const r = await authedFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json()).error || "Błąd");
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
      const r1 = await authedFetch(`/api/admin/categories/${a._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...API_HEADERS(password) },
        body: JSON.stringify({ order: bOrder }),
      });
      if (!r1.ok) throw new Error((await r1.json()).error || "Błąd");

      const r2 = await authedFetch(`/api/admin/categories/${b._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...API_HEADERS(password) },
        body: JSON.stringify({ order: aOrder }),
      });
      if (!r2.ok) throw new Error((await r2.json()).error || "Błąd");

      await refreshCats();
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  /* ===== items: create / edit / delete ===== */
  const submitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (!form.file) throw new Error("Dodaj zdjęcie");

      const fd = new FormData();
      fd.append("file", form.file);
      const up = await authedFetch("/api/admin/upload", { method: "POST", body: fd });
      if (!up.ok) throw new Error((await up.json()).error || "Błąd uploadu");
      const upData = (await up.json()) as { path: string };

      const r = await authedFetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...API_HEADERS(password) },
        body: JSON.stringify({
          categoryId: form.categoryId,
          title: form.title,
          description: form.description,
          rozmiarMin: Number(form.rozmiarMin),
          rozmiarMax: Number(form.rozmiarMax),
          cenaPLN: Number(form.cenaPLN),
          numerPaska: Number(form.numerPaska),
          imagePath: upData.path,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Błąd");

      setForm({ categoryId: "", title: "", description: "", rozmiarMin: "", rozmiarMax: "", cenaPLN: "", numerPaska: "", file: null });
      await refreshItems();
      setMsg("Dodano przedmiot");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  const startEditItem = (it: Item) => {
    setEditItem((s) => ({
      ...s,
      [it._id]: {
        categoryId: typeof it.categoryId === "string" ? it.categoryId : it.categoryId._id,
        title: it.title,
        description: it.description || "",
        rozmiarMin: String(it.rozmiarMin ?? ""),
        rozmiarMax: String(it.rozmiarMax ?? ""),
        cenaPLN: String(it.cenaPLN ?? ""),
        numerPaska: String(it.numerPaska ?? ""),
        file: null,
      },
    }));
  };

  const cancelEditItem = (id: string) => setEditItem((s) => {
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
      let imagePath: string | undefined;

      if (data.file) {
        const fd = new FormData();
        fd.append("file", data.file);
        const up = await authedFetch("/api/admin/upload", { method: "POST", body: fd });
        if (!up.ok) throw new Error((await up.json()).error || "Błąd uploadu");
        const upData = (await up.json()) as { path: string };
        imagePath = upData.path;
      }

      const r = await authedFetch(`/api/admin/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...API_HEADERS(password) },
        body: JSON.stringify({
          categoryId: data.categoryId,
          title: data.title,
          description: data.description,
          rozmiarMin: Number(data.rozmiarMin),
          rozmiarMax: Number(data.rozmiarMax),
          cenaPLN: Number(data.cenaPLN),
          numerPaska: Number(data.numerPaska),
          ...(imagePath ? { imagePath } : {}),
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Błąd");

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
      const r = await authedFetch(`/api/admin/items/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json()).error || "Błąd");
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
        .filter((i) => (typeof i.categoryId === "string" ? i.categoryId : i.categoryId?._id) === c._id)
        .sort((a, b) => (a.numerPaska ?? 0) - (b.numerPaska ?? 0));

      const images = its.map((i) => i.imagePath);
      const belts: BeltItem[] = its.map((i) => ({
        name: i.title,
        description: i.description || "",
        price: i.cenaPLN, // liczbowo – formatujemy w komponencie
        upperSize: `${Math.max(i.rozmiarMin, i.rozmiarMax)} cm`,
        lowerSize: `${Math.min(i.rozmiarMin, i.rozmiarMax)} cm`,
      }));
      return { title: c.name, images, items: belts };
    });
  }, [cats, items]);

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
          <button onClick={tryAuth} className="w-full px-4 py-2 rounded-lg bg-neutral-900 text-white">
            Zaloguj
          </button>
          {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
        </div>
      </main>
    );
  }

  /* ===== main admin UI ===== */
  const sortedCats = [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <main className="min-h-screen bg-[#f5f5ef] text-neutral-900 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-serif">Panel administracyjny</h1>
          <div className="text-xs text-neutral-500">Hasło zapisane lokalnie</div>
        </header>

        {/* ========== KATEGORIE ========== */}
        <section className="rounded-2xl border border-neutral-300 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="font-medium mb-4">Kategorie</h2>

          <form onSubmit={submitCategory} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nazwa kategorii"
              className="rounded-lg border border-neutral-300 px-3 py-2"
              required
            />
            {/* opcjonalny slug (jeśli backend nie generuje automatycznie) */}
            <input
              value={newCatSlug}
              onChange={(e) => setNewCatSlug(e.target.value)}
              placeholder="Slug (opcjonalnie)"
              className="rounded-lg border border-neutral-300 px-3 py-2"
            />
            <button disabled={loading} className="rounded-lg bg-neutral-900 text-white px-4 py-2">
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
                  {/* reorder */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveCat(c._id, -1)}
                      disabled={!canUp || loading}
                      title="Przenieś wyżej"
                      className={`p-1.5 rounded border ${canUp ? "hover:bg-neutral-50" : "opacity-40 cursor-not-allowed"}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveCat(c._id, 1)}
                      disabled={!canDown || loading}
                      title="Przenieś niżej"
                      className={`p-1.5 rounded border ${canDown ? "hover:bg-neutral-50" : "opacity-40 cursor-not-allowed"}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* content */}
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

                  {/* actions */}
                  <div className="flex items-center gap-2">
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

        {/* ========== PRZEDMIOTY ========== */}
        <section className="rounded-2xl border border-neutral-300 bg-white p-4 md:p-6 shadow-sm text-gray-800">
          <h2 className="font-medium mb-4">Dodaj przedmiot</h2>

          <form onSubmit={submitItem} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="rounded-lg border border-neutral-300 px-3 py-2"
              required
            >
              <option value="">Wybierz kategorię…</option>
              {sortedCats.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Tytuł"
              className="rounded-lg border border-neutral-300 px-3 py-2"
              required
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Opis"
              className="rounded-lg border border-neutral-300 px-3 py-2 md:col-span-2"
              rows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={form.rozmiarMin}
                onChange={(e) => setForm({ ...form, rozmiarMin: e.target.value })}
                placeholder="Rozmiar min (cm)"
                className="rounded-lg border border-neutral-300 px-3 py-2"
                required
              />
              <input
                type="number"
                value={form.rozmiarMax}
                onChange={(e) => setForm({ ...form, rozmiarMax: e.target.value })}
                placeholder="Rozmiar max (cm)"
                className="rounded-lg border border-neutral-300 px-3 py-2"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={form.cenaPLN}
                onChange={(e) => setForm({ ...form, cenaPLN: e.target.value })}
                placeholder="Cena (PLN)"
                className="rounded-lg border border-neutral-300 px-3 py-2"
                required
              />
              <input
                type="number"
                value={form.numerPaska}
                onChange={(e) => setForm({ ...form, numerPaska: e.target.value })}
                placeholder="Nr paska"
                className="rounded-lg border border-neutral-300 px-3 py-2"
                required
              />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
              className="rounded-lg border border-neutral-300 px-3 py-2 md:col-span-2"
              required
            />
            <button disabled={loading} className="rounded-lg bg-neutral-900 text-white px-4 py-2 md:col-span-2">
              {loading ? "Zapisywanie…" : "Dodaj przedmiot"}
            </button>
          </form>

          {msg && <p className="mt-3 text-sm text-neutral-700">{msg}</p>}

          <h3 className="mt-8 font-medium">Lista przedmiotów</h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((it) => {
              const editing = editItem[it._id];
              return (
                <div key={it._id} className="rounded-xl p-3 flex gap-3 bg-white">
                  <div className="relative w-24 h-24">
                    <Image src={it.imagePath} alt={it.title} fill sizes="96px" className="object-cover rounded-lg border" />
                  </div>

                  {!editing ? (
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{it.title}</div>
                      <div className="text-neutral-600">
                        Kategoria: {typeof it.categoryId === "string" ? it.categoryId : it.categoryId?.name}
                      </div>
                      <div className="text-neutral-600">
                        Rozmiar: {it.rozmiarMin} – {it.rozmiarMax} cm
                      </div>
                      <div className="text-neutral-600">Cena: {it.cenaPLN} PLN, Nr: {it.numerPaska}</div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => startEditItem(it)} className="px-3 py-1.5 rounded border hover:bg-neutral-50 text-neutral-700 flex items-center gap-1">
                          <Pencil className="h-4 w-4" /> Edytuj
                        </button>
                        <button onClick={() => deleteItem(it._id)} className="px-3 py-1.5 rounded border hover:bg-red-50 text-red-600 flex items-center gap-1">
                          <Trash2 className="h-4 w-4" /> Usuń
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 grid grid-cols-1 gap-2 text-sm">
                      <select
                        value={editing.categoryId}
                        onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], categoryId: e.target.value } }))}
                        className="rounded border border-neutral-300 px-3 py-1.5"
                      >
                        {sortedCats.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={editing.title}
                        onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], title: e.target.value } }))}
                        className="rounded border border-neutral-300 px-3 py-1.5"
                        placeholder="Tytuł"
                      />
                      <textarea
                        value={editing.description}
                        onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], description: e.target.value } }))}
                        className="rounded border border-neutral-300 px-3 py-1.5"
                        placeholder="Opis"
                        rows={2}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={editing.rozmiarMin}
                          onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], rozmiarMin: e.target.value } }))}
                          className="rounded border border-neutral-300 px-3 py-1.5"
                          placeholder="Min"
                        />
                        <input
                          type="number"
                          value={editing.rozmiarMax}
                          onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], rozmiarMax: e.target.value } }))}
                          className="rounded border border-neutral-300 px-3 py-1.5"
                          placeholder="Max"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={editing.cenaPLN}
                          onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], cenaPLN: e.target.value } }))}
                          className="rounded border border-neutral-300 px-3 py-1.5"
                          placeholder="Cena"
                        />
                        <input
                          type="number"
                          value={editing.numerPaska}
                          onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], numerPaska: e.target.value } }))}
                          className="rounded border border-neutral-300 px-3 py-1.5"
                          placeholder="Nr"
                        />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditItem((s) => ({ ...s, [it._id]: { ...s[it._id], file: e.target.files?.[0] || null } }))}
                        className="rounded border border-neutral-300 px-3 py-1.5"
                      />
                      <div className="mt-1 flex gap-2">
                        <button onClick={() => saveItem(it._id)} className="px-3 py-1.5 rounded border hover:bg-green-50 text-green-700 flex items-center gap-1">
                          <Save className="h-4 w-4" /> Zapisz
                        </button>
                        <button onClick={() => cancelEditItem(it._id)} className="px-3 py-1.5 rounded border hover:bg-neutral-50 flex items-center gap-1">
                          <X className="h-4 w-4" /> Anuluj
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {items.length === 0 && <div className="text-sm text-neutral-500">Brak przedmiotów</div>}
          </div>
        </section>

        {/* ========== PODGLĄD (jak na stronie głównej) ========== */}
        <section className="rounded-2xl border border-neutral-300 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">{UI_STRINGS[previewLang].preview}</h2>
            <div className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-1.5 py-1">
              <button
                onClick={() => setPreviewLang("pl")}
                aria-pressed={previewLang === "pl"}
                title="Polski"
                className={`inline-flex items-center justify-center rounded-md p-1.5 ${previewLang === "pl" ? "bg-[#f5f5ef]" : "hover:bg-neutral-100"}`}
              >
                <Image src="/images/poland.png" alt="" width={20} height={14} className="rounded-[2px]" />
              </button>
              <button
                onClick={() => setPreviewLang("en")}
                aria-pressed={previewLang === "en"}
                title="English"
                className={`inline-flex items-center justify-center rounded-md p-1.5 ${previewLang === "en" ? "bg-[#f5f5ef]" : "hover:bg-neutral-100"}`}
              >
                <Image src="/images/england.png" alt="" width={20} height={14} className="rounded-[2px]" />
              </button>
            </div>
          </div>

          <div className="space-y-16">
            {groupedForPreview
              .filter((g) => g.images.length && g.items.length)
              .map((g, idx) => (
                <div key={idx}>
                  <CategoryPreview title={g.title} images={g.images} items={g.items} lang={previewLang} />
                  <div className="mt-6 mx-auto w-full h-px bg-neutral-200" />
                </div>
              ))}
            {groupedForPreview.every((g) => !g.images.length) && (
              <div className="text-sm text-neutral-500">Brak danych do podglądu</div>
            )}
          </div>
        </section>

        {msg && <div className="text-sm text-neutral-700">{msg}</div>}
      </div>
    </main>
  );
}
