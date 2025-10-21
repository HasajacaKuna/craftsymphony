import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import Item from "@/models/Item";
import Category from "@/models/Category";
import { checkAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
// export const runtime = "nodejs";

/* ===== Route context (zgodny z validator.ts) ===== */
type RouteParams = { id: string };
type MaybePromise<T> = T | Promise<T>;
type RouteContext = { params: MaybePromise<RouteParams> };

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

/* ===== Typy wejścia ===== */
type ImageInput =
  | {
      url?: string;
      altPl?: string;
      altEn?: string;
      isPrimary?: boolean;
      order?: number;
    }
  | string;

type NormalizedImage = {
  url: string;
  altPl?: string;
  altEn?: string;
  isPrimary: boolean;
  order: number;
};

type PatchBody = Partial<{
  categoryId: string;
  title: string;
  description: string;
  titleEn: string;
  descriptionEn: string;
  rozmiarMin: number | string;
  rozmiarMax: number | string;
  rozmiarGlowny: number | string | null;
  rozSprz: number | string | null;
  cenaPLN: number | string;
  numerPaska: number | string;
  images: ImageInput[]; // nowe API (oraz legacy: string[])
  imagePath: string; // legacy
}>;

/* ===== utils ===== */
const toNum = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const toNumNull = (v: unknown): number | null => {
  if (v === "" || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function normalizeImages(
  input?: ImageInput[],
  singleUrlLegacy?: string
): NormalizedImage[] {
  // 1) zbuduj tablicę obiektów
  const raw: NormalizedImage[] =
    (Array.isArray(input) ? input : [])
      .filter(Boolean)
      .map((img, idx) =>
        typeof img === "string"
          ? { url: img, altPl: "", altEn: "", isPrimary: false, order: idx }
          : {
              url: img?.url ?? "",
              altPl: img?.altPl ?? "",
              altEn: img?.altEn ?? "",
              isPrimary: Boolean(img?.isPrimary),
              order: typeof img?.order === "number" ? img.order : idx,
            }
      ) || [];

  if (!raw.length && singleUrlLegacy) {
    raw.push({
      url: singleUrlLegacy,
      altPl: "",
      altEn: "",
      isPrimary: true,
      order: 0,
    });
  }

  // 2) wyczyść bez URL
  const cleaned = raw.filter(
    (x) => typeof x.url === "string" && x.url.trim().length > 0
  );

  // 3) sort po order
  cleaned.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // 4) dokładnie jeden primary
  const hasPrimary = cleaned.some((x) => x.isPrimary);
  if (!hasPrimary && cleaned[0]) cleaned[0].isPrimary = true;
  else if (hasPrimary) {
    let seen = false;
    cleaned.forEach((x) => {
      if (x.isPrimary && !seen) seen = true;
      else if (x.isPrimary && seen) x.isPrimary = false;
    });
  }

  // 5) przepnij order sekwencyjnie
  cleaned.forEach((x, i) => (x.order = i));

  return cleaned;
}

/* ===== PATCH ===== */
type ItemUpdate = Partial<{
  categoryId: string;
  title: string;
  description: string;
  titleEn: string;
  descriptionEn: string;
  rozmiarMin: number | undefined;
  rozmiarMax: number | undefined;
  rozmiarGlowny: number | null;
  rozSprz: number | null;
  cenaPLN: number | undefined;
  numerPaska: number | undefined;
  images: NormalizedImage[];
}>;

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ⬇️ kluczowa zmiana: params może być Promise
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // --- bez any + walidacja kształtu
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

  const update: ItemUpdate = {};

  if (body.title !== undefined) update.title = String(body.title);
  if (body.description !== undefined)
    update.description = String(body.description ?? "");
  if (body.titleEn !== undefined) update.titleEn = String(body.titleEn ?? "");
  if (body.descriptionEn !== undefined)
    update.descriptionEn = String(body.descriptionEn ?? "");

  if (body.rozmiarMin !== undefined)
    update.rozmiarMin = toNum(body.rozmiarMin);
  if (body.rozmiarMax !== undefined)
    update.rozmiarMax = toNum(body.rozmiarMax);
  if (body.rozmiarGlowny !== undefined)
    update.rozmiarGlowny = toNumNull(body.rozmiarGlowny);
  if (body.rozSprz !== undefined) update.rozSprz = toNumNull(body.rozSprz);

  if (body.cenaPLN !== undefined) update.cenaPLN = toNum(body.cenaPLN);
  if (body.numerPaska !== undefined) update.numerPaska = toNum(body.numerPaska);

  // categoryId – walidacja istnienia
  if (body.categoryId !== undefined) {
    if (!isValidObjectId(String(body.categoryId))) {
      return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
    }
    await dbConnect();
    const cat = await Category.findById(body.categoryId)
      .select("_id")
      .lean();
    if (!cat) {
      return NextResponse.json({ error: "Kategoria nie istnieje" }, { status: 400 });
    }
    update.categoryId = String(body.categoryId);
  }

  // images – pełna zamiana listy (także legacy imagePath)
  if (Array.isArray(body.images) || body.imagePath !== undefined) {
    update.images = normalizeImages(
      Array.isArray(body.images) ? body.images : undefined,
      body.imagePath ? String(body.imagePath) : undefined
    );
  }

  await dbConnect();

  const saved = await Item.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
    projection: {
      categoryId: 1,
      title: 1,
      titleEn: 1,
      description: 1,
      descriptionEn: 1,
      rozmiarMin: 1,
      rozmiarMax: 1,
      rozmiarGlowny: 1,
      rozSprz: 1,
      cenaPLN: 1,
      numerPaska: 1,
      "images.url": 1,
      "images.altPl": 1,
      "images.altEn": 1,
      "images.isPrimary": 1,
      "images.order": 1,
      createdAt: 1,
    },
  }).populate("categoryId", "name slug");

  if (!saved) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  return NextResponse.json(saved);
}

/* ===== DELETE ===== */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ⬇️ kluczowa zmiana: params może być Promise
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await dbConnect();
  const res = await Item.findByIdAndDelete(id, { projection: { _id: 1 } });

  if (!res) {
    return NextResponse.json({ ok: false, deleted: false }, { status: 404 });
  }
  return NextResponse.json({ ok: true, deleted: true });
}
