"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus, Save, Trash2, Pencil, X, Image as ImageIcon,
  ArrowUpAZ, ArrowDownAZ, Languages, ChevronLeft
} from "lucide-react";

/* ========= helpers ========= */
const API_HEADERS = (pwd: string) => ({ "x-admin-password": pwd });

function errToString(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

type UploadResp = { path: string };

function isUploadResp(x: unknown): x is UploadResp {
  if (typeof x !== "object" || x === null) return false;
  const obj = x as Record<string, unknown>;
  return typeof obj.path === "string";
}



async function readJSON<T = unknown>(res: Response): Promise<T | null | { raw: string }> {
  const ctype = res.headers.get("content-type") || "";
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    try {
      const parsed = text ? (JSON.parse(text) as { error?: unknown; message?: unknown }) : null;
      const msg =
        (typeof parsed?.error === "string" && parsed.error) ||
        (typeof parsed?.message === "string" && parsed.message) ||
        text ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }
  if (!text) return null;
  if (ctype.includes("application/json")) {
    try { return JSON.parse(text) as T; } catch { return { raw: text }; }
  }
  try { return JSON.parse(text) as T; } catch { return { raw: text }; }
}

/* ========= types ========= */
type Lang = "pl" | "en";

type WoodItem = {
  _id: string;
  descriptionPl: string;
  descriptionEn?: string;
  pricePLN: number;
  image: string;     // URL
  order?: number;
};

const UI = {
  pl: {
    title: "WOOD — zarządzanie",
    back: "Powrót do panelu",
    addNew: "Dodaj produkt",
    listTitle: "Lista produktów",
    previewTitle: "Podgląd (jak na stronie WOOD)",
    enAuto: "EN auto",
    fields: {
      descPl: "Opis (PL)",
      descEn: "Opis (EN)",
      price: "Cena (PLN)",
      order: "Kolejność",
      image: "Zdjęcie",
    },
    upload: "Wrzuć zdjęcie",
    create: "Dodaj",
    save: "Zapisz",
    cancel: "Anuluj",
    delete: "Usuń",
    empty: "Brak produktów",
    loading: "Ładowanie…",
  },
  en: {
    title: "WOOD — management",
    back: "Back to admin",
    addNew: "Add product",
    listTitle: "Products",
    previewTitle: "Preview (WOOD page)",
    enAuto: "EN auto",
    fields: {
      descPl: "Description (PL)",
      descEn: "Description (EN)",
      price: "Price (PLN)",
      order: "Order",
      image: "Image",
    },
    upload: "Upload image",
    create: "Create",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    empty: "No products",
    loading: "Loading…",
  },
} as const;

function formatPrice(lang: Lang, pln: number) {
  return lang === "pl"
    ? `${pln.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} PLN`
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(pln / 4);
}

/* ========= page ========= */
export default function AdminWoodPage() {
  // auth
  const [password, setPassword] = useState("");
  const [, setOk] = useState(false); // setter zostaje, zmienna niepotrzebna

  const [uiLang, setUiLang] = useState<Lang>("pl");
  const t = UI[uiLang];

  // data
  const [items, setItems] = useState<WoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // create
  const [cDescPl, setCDescPl] = useState("");
  const [cDescEn, setCDescEn] = useState("");
  const [cPrice, setCPrice] = useState<string>("");
  const [cOrder, setCOrder] = useState<string>("");
  const [cFile, setCFile] = useState<File | null>(null);
  const [cPreview, setCPreview] = useState<string | null>(null);

  // edit state
  const [edit, setEdit] = useState<Record<string, {
    descriptionPl: string; descriptionEn: string;
    pricePLN: string; order: string;
    newFile?: File | null; newPreview?: string | null;
  }>>({});

  // lang persistence + admin password
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cs_lang") as Lang | null;
      if (saved === "pl" || saved === "en") setUiLang(saved);
      const pwd = localStorage.getItem("admin_pwd") || "";
      setPassword(pwd);
      document.documentElement.lang = saved ?? "pl";
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("cs_lang", uiLang); document.documentElement.lang = uiLang; } catch {}
  }, [uiLang]);

  const authedFetch = useCallback(
    async (input: string | URL, init?: RequestInit) => {
      const res = await fetch(input, {
        ...init,
        headers: { ...(init?.headers || {}), ...API_HEADERS(password) },
        cache: "no-store",
      });
      if (res.status === 401) throw new Error("Błędne hasło");
      return res;
    },
    [password]
  );

  const authedJSON = useCallback(
    async <T = unknown>(input: string | URL, init?: RequestInit) => {
      const res = await authedFetch(input, init);
      return readJSON<T>(res);
    },
    [authedFetch]
  );

  const refresh = useCallback(async () => {
    setLoading(true); setMsg(null);
    try {
      const data = (await authedJSON<WoodItem[]>("/api/admin/wood")) ?? [];
      const arr = Array.isArray(data) ? data : [];
      arr.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
      setItems(arr);
      setOk(true);
    } catch (e) {
      setMsg(errToString(e));
      setOk(false);
    } finally {
      setLoading(false);
    }
  }, [authedJSON]);

  useEffect(() => { refresh(); }, [refresh]);

const uploadOne = async (file: File) => {
  const fd = new FormData();
  fd.append("file", file);

  const data = await authedJSON<UploadResp>("/api/admin/upload", {
    method: "POST",
    body: fd,
  });

  if (!isUploadResp(data)) {
    throw new Error("Upload nie zwrócił poprawnej odpowiedzi (brak pola 'path').");
  }

  return data.path;
};

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      if (!cFile) throw new Error("Dodaj zdjęcie");
      const img = await uploadOne(cFile);
      await authedJSON("/api/admin/wood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptionPl: cDescPl.trim(),
          descriptionEn: cDescEn.trim() || undefined,
          pricePLN: Number(cPrice),
          image: img,
          order: cOrder ? Number(cOrder) : undefined,
        }),
      });
      // cleanup
      if (cPreview) URL.revokeObjectURL(cPreview);
      setCDescPl(""); setCDescEn(""); setCPrice(""); setCOrder(""); setCFile(null); setCPreview(null);
      await refresh();
      setMsg("Dodano produkt");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (it: WoodItem) => {
    setEdit(s => ({
      ...s,
      [it._id]: {
        descriptionPl: it.descriptionPl || "",
        descriptionEn: it.descriptionEn || "",
        pricePLN: String(it.pricePLN ?? ""),
        order: String(it.order ?? ""),
        newFile: null,
        newPreview: null,
      }
    }));
  };
  const cancelEdit = (id: string) => {
    setEdit(s => {
      const p = s[id]?.newPreview; if (p) URL.revokeObjectURL(p);
      const n = { ...s }; delete n[id]; return n;
    });
  };
  const saveEdit = async (id: string) => {
    const data = edit[id]; if (!data) return;
    setLoading(true); setMsg(null);
    try {
      let image: string | undefined;
      if (data.newFile) image = await uploadOne(data.newFile);
      await authedJSON(`/api/admin/wood/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptionPl: data.descriptionPl.trim(),
          descriptionEn: data.descriptionEn.trim() || undefined,
          pricePLN: Number(data.pricePLN),
          order: data.order ? Number(data.order) : null,
          ...(image ? { image } : {}),
        }),
      });
      cancelEdit(id);
      await refresh();
      setMsg("Zapisano");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };
  const deleteItem = async (id: string) => {
    if (!confirm("Usunąć produkt?")) return;
    setLoading(true); setMsg(null);
    try {
      await authedJSON(`/api/admin/wood/${id}`, { method: "DELETE" });
      await refresh();
      setMsg("Usunięto");
    } catch (e) {
      setMsg(errToString(e));
    } finally {
      setLoading(false);
    }
  };

  // szybka zmiana kolejności (swap z sąsiadem)
  const move = async (id: string, dir: -1 | 1) => {
    const sorted = [...items].sort((a,b)=> (a.order??0)-(b.order??0));
    const idx = sorted.findIndex(i=>i._id===id);
    const j = idx + dir;
    if (idx<0 || j<0 || j>=sorted.length) return;
    const a = sorted[idx], b = sorted[j];
    const aOrder = a.order ?? idx, bOrder = b.order ?? j;
    setLoading(true); setMsg(null);
    try {
      await authedJSON(`/api/admin/wood/${a._id}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ order: bOrder }) });
      await authedJSON(`/api/admin/wood/${b._id}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ order: aOrder }) });
      await refresh();
    } catch(e){ setMsg(errToString(e)); }
    finally{ setLoading(false); }
  };

  const previewLang: Lang = uiLang;
  const previewCards = useMemo(() => {
    const arr = [...items].sort((a,b)=>(a.order??0)-(b.order??0));
    return arr.map(it => ({
      image: it.image,
      desc: previewLang==="pl" ? it.descriptionPl : (it.descriptionEn || it.descriptionPl),
      price: it.pricePLN,
    }));
  }, [items, previewLang]);

  return (
    <main className="min-h-screen bg-[#f5f5ef] text-neutral-900 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-neutral-50">
              <ChevronLeft className="h-4 w-4" /> {t.back}
            </Link>
            <h1 className="text-xl md:text-2xl font-serif">{t.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={()=> setUiLang(l=> l==="pl" ? "en":"pl")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${uiLang==="en" ? "bg-neutral-900 text-white border-neutral-900":"bg-white"}`}
              title="Przełącz PL/EN UI"
            >
              <Languages className="h-4 w-4" /> {UI[uiLang].enAuto}
            </button>
            <input
              type="password"
              value={password}
              onChange={(e)=> setPassword(e.target.value)}
              placeholder="hasło admina"
              className="rounded-lg border border-neutral-300 px-3 py-1.5"
              onBlur={()=> { try{ localStorage.setItem("admin_pwd", password); }catch{} }}
            />
          </div>
        </header>

        {/* Create */}
        <section className="rounded-2xl border border-neutral-300 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="font-medium mb-4">{t.addNew}</h2>
          <form onSubmit={createItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="block text-sm text-neutral-600">{t.fields.descPl}</label>
              <textarea
                value={cDescPl}
                onChange={e=> setCDescPl(e.target.value)}
                className="w-full h-32 rounded-xl border px-3 py-2"
                required
              />
              <label className="block text-sm text-neutral-600">{t.fields.descEn}</label>
              <textarea
                value={cDescEn}
                onChange={e=> setCDescEn(e.target.value)}
                className="w-full h-32 rounded-xl border px-3 py-2"
              />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-600">{t.fields.price}</label>
                  <input
                    type="number"
                    value={cPrice}
                    onChange={e=> setCPrice(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-600">{t.fields.order}</label>
                  <input
                    type="number"
                    value={cOrder}
                    onChange={e=> setCOrder(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="opcjonalnie"
                  />
                </div>
              </div>

              <label className="block text-sm text-neutral-600">{t.fields.image}</label>
              <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 px-4 py-6 cursor-pointer hover:bg-neutral-50">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e)=> {
                    const f = (e.target.files && e.target.files[0]) || null;
                    if (!f) return;
                    if (cPreview) URL.revokeObjectURL(cPreview);
                    setCFile(f);
                    setCPreview(URL.createObjectURL(f));
                  }}
                />
                <ImageIcon className="h-5 w-5" />
                <span>{UI[uiLang].upload}</span>
              </label>

              {cPreview && (
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border">
                  <Image src={cPreview as string} alt="preview" fill className="object-cover" />
                  <button
                    type="button"
                    className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-white/85 border"
                    onClick={()=> { if (cPreview) URL.revokeObjectURL(cPreview); setCPreview(null); setCFile(null); }}
                  >
                    {t.cancel}
                  </button>
                </div>
              )}

              <button disabled={loading} className="w-full rounded-xl bg-neutral-900 text-white px-6 py-3 inline-flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> {loading ? "Zapisywanie…" : UI[uiLang].create}
              </button>
            </div>
          </form>
        </section>

        {/* List */}
        <section className="rounded-2xl border border-neutral-300 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">{t.listTitle}</h2>
            {loading && <div className="text-sm text-neutral-500">{UI[uiLang].loading}</div>}
          </div>

          {items.length === 0 ? (
            <div className="text-sm text-neutral-500">{UI[uiLang].empty}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((it, idx) => {
                const ed = edit[it._id];
                const canUp = idx > 0;
                const canDown = idx < items.length - 1;
                return (
                  <div key={it._id} className="rounded-2xl border p-3 bg-white">
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border">
                      <Image src={ed?.newPreview ?? it.image} alt="wood" fill className="object-cover" />
                    </div>

                    {!ed ? (
                      <>
                        <div className="mt-3 text-sm text-neutral-700 line-clamp-3">{it.descriptionPl}</div>
                        <div className="text-xs text-neutral-500">EN: {it.descriptionEn || "—"}</div>
                        <div className="mt-2 text-sm">Cena: {it.pricePLN} PLN</div>
                        <div className="text-xs text-neutral-500">Kolejność: {it.order ?? "—"}</div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={()=> move(it._id, -1)} disabled={!canUp} title="W górę" className={`px-3 py-1.5 rounded border ${canUp ? "hover:bg-neutral-50":"opacity-40 cursor-not-allowed"}`}>
                            <ArrowUpAZ className="h-4 w-4" />
                          </button>
                          <button onClick={()=> move(it._id, 1)} disabled={!canDown} title="W dół" className={`px-3 py-1.5 rounded border ${canDown ? "hover:bg-neutral-50":"opacity-40 cursor-not-allowed"}`}>
                            <ArrowDownAZ className="h-4 w-4" />
                          </button>

                          <button onClick={()=> startEdit(it)} className="px-3 py-1.5 rounded border hover:bg-neutral-50 inline-flex items-center gap-1.5">
                            <Pencil className="h-4 w-4" /> Edytuj
                          </button>
                          <button onClick={()=> deleteItem(it._id)} className="px-3 py-1.5 rounded border hover:bg-red-50 text-red-600 inline-flex items-center gap-1.5">
                            <Trash2 className="h-4 w-4" /> {t.delete}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                        <textarea value={ed.descriptionPl} onChange={e=> setEdit(s=> ({ ...s, [it._id]: { ...s[it._id], descriptionPl: e.target.value } }))} className="rounded border px-2 py-1.5" rows={3} placeholder="Opis PL" />
                        <textarea value={ed.descriptionEn} onChange={e=> setEdit(s=> ({ ...s, [it._id]: { ...s[it._id], descriptionEn: e.target.value } }))} className="rounded border px-2 py-1.5" rows={3} placeholder="Opis EN" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" value={ed.pricePLN} onChange={e=> setEdit(s=> ({ ...s, [it._id]: { ...s[it._id], pricePLN: e.target.value } }))} className="rounded border px-2 py-1.5" placeholder="Cena PLN" />
                          <input type="number" value={ed.order} onChange={e=> setEdit(s=> ({ ...s, [it._id]: { ...s[it._id], order: e.target.value } }))} className="rounded border px-2 py-1.5" placeholder="Kolejność" />
                        </div>

                        <label className="flex items-center justify-center gap-2 rounded border-2 border-dashed px-3 py-3 cursor-pointer hover:bg-neutral-50">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e)=> {
                              const f = (e.target.files && e.target.files[0]) || null;
                              setEdit(s=> {
                                const cur = s[it._id];
                                if (!cur) return s;
                                if (cur.newPreview) URL.revokeObjectURL(cur.newPreview);
                                return { ...s, [it._id]: { ...cur, newFile: f, newPreview: f ? URL.createObjectURL(f) : null } };
                              });
                            }}
                          />
                          <ImageIcon className="h-4 w-4" /> Zmień zdjęcie
                        </label>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <button onClick={()=> saveEdit(it._id)} className="px-3 py-1.5 rounded border hover:bg-green-50 text-green-700 inline-flex items-center gap-1.5">
                            <Save className="h-4 w-4" /> {t.save}
                          </button>
                          <button onClick={()=> cancelEdit(it._id)} className="px-3 py-1.5 rounded border hover:bg-neutral-50 inline-flex items-center gap-1.5">
                            <X className="h-4 w-4" /> {t.cancel}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Preview */}
        <section className="rounded-2xl border border-neutral-300 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="font-medium mb-4">{t.previewTitle}</h2>
          {previewCards.length === 0 ? (
            <div className="text-sm text-neutral-500">{UI[uiLang].empty}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {previewCards.map((p, i)=> (
                <article key={i} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
                  <div className="relative w-full aspect-square bg-neutral-100">
                    <Image src={p.image} alt="wood" fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw" className="object-cover object-center" />
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-neutral-600 line-clamp-3">{p.desc}</p>
                    <div className="mt-4 text-sm">
                      <span className="text-neutral-500">Cena:&nbsp;</span>
                      <span className="font-medium">{formatPrice(uiLang, p.price)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {msg && <div className="text-sm text-neutral-700">{msg}</div>}
      </div>
    </main>
  );
}
