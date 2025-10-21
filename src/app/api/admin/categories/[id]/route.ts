import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import Category from "@/models/Category";
import Item from "@/models/Item";
import { checkAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ✅ params może być obiektem albo Promise'em
type RouteParams = { id: string };
type MaybePromise<T> = T | Promise<T>;
type RouteContext = { params: MaybePromise<RouteParams> };

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

type CategoryUpdate = Partial<{ name: string; slug: string; order: number }>;
type PatchBody = Partial<{ name: string; slug: string; order: number }>;


export async function PATCH(req: NextRequest, ctx: RouteContext) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params; // ✅ ważne: await
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // ---- bez any + walidacja kształtu
  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof bodyUnknown !== "object" || bodyUnknown === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const body = bodyUnknown as PatchBody;

  const update: CategoryUpdate = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.slug === "string") update.slug = body.slug.trim().toLowerCase();
  if (typeof body.order === "number") update.order = Math.trunc(body.order);

  if (!update.name && !update.slug && typeof update.order !== "number") {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await dbConnect();

  // pobierz aktualny dokument (potrzebne przy generowaniu slug z name)
  const current = (await Category.findById(id, { _id: 1, name: 1, slug: 1 }).lean()) as
    | { name?: string; slug?: string }
    | null;

  if (!current) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  // slug: jeśli podano (nawet pusty), generujemy z (nowej) nazwy lub bieżącej
  if (Object.prototype.hasOwnProperty.call(update, "slug")) {
    const raw = update.slug ?? "";
    const base = raw || update.name || current?.name || "";
    const final = slugify(base).slice(0, 140);
    if (!final) {
      return NextResponse.json({ error: "Nie udało się wygenerować slug" }, { status: 400 });
    }
    // sprawdź unikalność, pomijając bieżący dokument
    const exists = await Category.findOne({ slug: final, _id: { $ne: id } }).lean();
    if (exists) {
      return NextResponse.json({ error: "Taki slug już istnieje" }, { status: 409 });
    }
    update.slug = final;
  } else if (update.name) {
    // jeśli zmieniamy name, ale nie wysłano slug – pozostaw aktualny slug
    // (jeśli chcesz auto-aktualizację slug przy zmianie nazwy, odkomentuj poniższy blok)
    /*
    const final = slugify(update.name).slice(0, 140);
    const exists = await Category.findOne({ slug: final, _id: { $ne: id } }).lean();
    if (exists) return NextResponse.json({ error: "Taki slug już istnieje" }, { status: 409 });
    update.slug = final;
    */
  }

  // proste ograniczenia długości
  if (update.name && update.name.length > 120) {
    return NextResponse.json({ error: "Nazwa jest za długa" }, { status: 400 });
  }

  const saved = await Category.findByIdAndUpdate(id, update, {
    new: true,
    projection: { name: 1, slug: 1, order: 1, createdAt: 1 },
  });

  if (!saved) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params; // ✅
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await dbConnect();

  const cat = await Category.findById(id, { _id: 1 }).lean();
  if (!cat) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  // kaskadowe usunięcie itemów z tej kategorii
  const itemsRes = await Item.deleteMany({ categoryId: id });
  await Category.findByIdAndDelete(id);

  return NextResponse.json({ ok: true, deletedItems: itemsRes?.deletedCount ?? 0 });
}
