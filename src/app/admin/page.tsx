"use client";

import React, { useEffect, useState } from "react";
import { Upload, Trash2, GripVertical } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
const GALLERY_KEY = "GALLERY_IMAGES"; // shared with public page

type Img = { src: string };

export default function AdminPage() {
  // ---- state (HOOKS ALWAYS FIRST) ----
  const [authorized, setAuthorized] = useState(false);
  const [inputPass, setInputPass] = useState("");
  const expected = process.env.NEXT_PUBLIC_ADMIN_PASS ?? "haslo123";

  const [items, setItems] = useState<Img[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ---- load gallery from localStorage (supports old string[] format) ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(GALLERY_KEY);
      if (!raw) return setItems([]);
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "object" && x?.src)) {
        setItems(parsed as Img[]);
      } else if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        // migrate: string[] -> Img[]
        const migrated: Img[] = (parsed as string[]).map((src) => ({ src }));
        setItems(migrated);
        window.localStorage.setItem(GALLERY_KEY, JSON.stringify(migrated));
      }
    } catch {
      // ignore
    }
  }, []);

  // ---- helpers ----
  function save(next: Img[]) {
    setItems(next);
    try {
      window.localStorage.setItem(GALLERY_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function readAsDataURL(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setIsUploading(true);
    try {
      const dataUrls = await Promise.all(files.map(readAsDataURL));
      save([...items, ...dataUrls.map((src) => ({ src }))]);
    } finally {
      setIsUploading(false);
      e.currentTarget.value = "";
    }
  }

  // ---- reordering ----
  function move(idx: number, delta: -1 | 1) {
    const j = idx + delta;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(idx, 1);
    next.splice(j, 0, moved);
    save(next);
  }

  function onDragStart(idx: number) {
    setDragIndex(idx);
  }
  function onDragEnter(idx: number) {
    setDragOverIndex(idx);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault(); // allow drop
  }
  function onDrop(targetIdx: number) {
    if (dragIndex === null) return;
    const from = dragIndex;
    const to = targetIdx;
    setDragIndex(null);
    setDragOverIndex(null);
    if (from === to) return;

    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    save(next);
  }
  function onDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // ---- password screen (keep AFTER all hooks) ----
  if (!authorized) {
    return (
      <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputPass === expected) setAuthorized(true);
            }}
            className="w-full rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
          >
            <h1 className="text-center text-xl font-semibold">Admin access</h1>
            <p className="mt-1 text-center text-sm text-neutral-600 dark:text-zinc-400">
              Enter the password to continue
            </p>
            <div className="mt-5 space-y-3">
              <input
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none ring-amber-300/30 focus:ring dark:border-white/10 dark:bg-white/10"
                placeholder="Password"
                type="password"
                value={inputPass}
                onChange={(e) => setInputPass(e.target.value)}
                autoFocus
              />
              <button
                className="w-full rounded-lg bg-black px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
                type="submit"
              >
                Enter
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // ---- admin panel ----
  return (
    <main className="min-h-screen bg-white text-neutral-900 transition-colors duration-300 dark:bg-neutral-950 dark:text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-black/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/"className="text-lg font-semibold">Admin Panel</Link>
        </div>
      </header>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Upload */}
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <h2 className="text-base font-medium">Upload images</h2>
            <div className="mt-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-white/90 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFilesSelected}
                  className="sr-only"
                />
                <Upload className="h-4 w-4" />
                {isUploading ? "Uploading…" : "Choose files"}
              </label>
            </div>
          </div>

          {/* Grid (same look as public) */}
          <div className="mt-8">
            <h2 className="text-base font-medium">Current images ({items.length})</h2>

            {items.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-600 dark:text-zinc-400">
                No images yet. Upload to get started.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-6">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className={`group rounded-2xl cursor-pointer ${dragOverIndex === idx ? "ring-2 ring-amber-400" : ""}`}
                    draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragEnter={() => onDragEnter(idx)}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                    onDrop={() => onDrop(idx)}
                  >
                    <figure className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-black/10 bg-neutral-100 shadow-sm transition-colors dark:border-white/10 dark:bg-white/5">
 <div className="relative h-full w-full">
   <Image
     src={it.src}
     alt={`Image ${idx + 1}`}
     fill
     className="object-cover"
     sizes="(max-width: 1024px) 33vw, 33vw"
   />
 </div>                      {/* Drag handle / hint */}
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="rounded-md bg-black/50 px-2 py-0.5 text-[10px] text-white">
                          {idx + 1}
                        </span>
 <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-[10px] text-white">
   <GripVertical className="h-3.5 w-3.5" />
   Drag to reorder
 </span>
                      </div>
                    </figure>

                        <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                            onClick={() => move(idx, -1)}
                            className="w-[33%] rounded-lg border border-black/20 bg-neutral-200 py-2 text-sm font-medium text-black hover:bg-neutral-300 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                        >
                            ↑ Up
                        </button>
                        <button
                            onClick={() => move(idx, 1)}
                            className="w-[33%] rounded-lg border border-black/20 bg-neutral-200 py-2 text-sm font-medium text-black hover:bg-neutral-300 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                        >
                            ↓ Down
                        </button>
                        <button
                            onClick={() => {
                            const next = items.filter((_, i) => i !== idx);
                            save(next);
                            }}
                            className="w-[33%] rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                            ✕ Delete
                        </button>
                        </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
