import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Item from "@/models/Item";
import Category from "@/models/Category";
import { checkAdminPassword } from "@/lib/auth";
import type { Types } from "mongoose";

export const dynamic = "force-dynamic";
// export const runtime = "nodejs"; // odkomentuj, jeśli Mongoose sypie się na Edge

/* ===== Typy wejścia (admin) ===== */
type ImageInput = Partial<{
  url: string;
  altPl: string;
  altEn: string;
  isPrimary: boolean;
  order: number;
}>;

interface CreateItemBody {
  categoryId: string;
  title?: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  rozmiarMin?: number | string;
  rozmiarMax?: number | string;
  rozmiarGlowny?: number | string | null;
  rozSprz?: number | string | null; // ⬅️ NOWE
  cenaPLN?: number | string;
  numerPaska?: number | string;
  images?: ImageInput[];
  /** kompatybilność wstecz – pojedyncze zdjęcie */
  imagePath?: string;
}

/* ===== Typy dokumentów po .lean() (dla GET) ===== */
type ImgLean = {
  url?: string;
  altPl?: string;
  altEn?: string;
  isPrimary?: boolean;
  order?: number;
};

type CategoryRefLean = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
};

type ItemLean =
  | {
      _id: Types.ObjectId;
      categoryId: Types.ObjectId; // przed populate
      title?: string;
      titleEn?: string;
      description?: string;
      descriptionEn?: string;
      rozmiarMin?: number;
      rozmiarMax?: number;
      rozmiarGlowny?: number | null;
      rozSprz?: number | null;
      cenaPLN?: number;
      numerPaska?: number;
      images?: ImgLean[];
      createdAt?: Date;
    }
  | {
      _id: Types.ObjectId;
      categoryId: CategoryRefLean; // po populate
      title?: string;
      titleEn?: string;
      description?: string;
      descriptionEn?: string;
      rozmiarMin?: number;
      rozmiarMax?: number;
      rozmiarGlowny?: number | null;
      rozSprz?: number | null;
      cenaPLN?: number;
      numerPaska?: number;
      images?: ImgLean[];
      createdAt?: Date;
    };

/* ===== utils ===== */
function toNumber(n: unknown, fallback = 0): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}
function toOptNumber(n: unknown): number | null {
  if (n === "" || n === undefined || n === null) return null;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

function normalizeImages(input?: ImageInput[], fallbackSingleUrl?: string) {
  // jeśli brak tablicy, ale mamy legacy imagePath — opakuj
  const src: ImageInput[] =
    (Array.isArray(input) && input.filter(Boolean)) ||
    (fallbackSingleUrl ? [{ url: fallbackSingleUrl, isPrimary: true, order: 0 }] : []);

  // odfiltruj bez URL
  const cleaned = src
    .map((img, i) => ({
      url: String(img?.url || ""),
      altPl: (img?.altPl ?? "").toString(),
      altEn: (img?.altEn ?? "").toString(),
      isPrimary: Boolean(img?.isPrimary),
      order: typeof img?.order === "number" ? img.order : i,
    }))
    .filter((x) => !!x.url);

  // sort po order
  cleaned.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // gwarancja dokładnie jednego primary
  const hasPrimary = cleaned.some((x) => x.isPrimary);
  if (!hasPrimary && cleaned[0]) cleaned[0].isPrimary = true;
  else if (hasPrimary) {
    let hit = false;
    cleaned.forEach((x) => {
      if (x.isPrimary && !hit) hit = true;
      else if (x.isPrimary && hit) x.isPrimary = false;
    });
  }

  // przelicz order sekwencyjnie
  cleaned.forEach((x, i) => (x.order = i));
  return cleaned;
}

/* ===== POST: create item ===== */
export async function POST(req: NextRequest) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateItemBody;
  try {
    body = (await req.json()) as CreateItemBody; // (jeśli form-data → req.formData())
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    categoryId,
    title = "",
    titleEn = "",
    description = "",
    descriptionEn = "",
    rozmiarMin,
    rozmiarMax,
    rozmiarGlowny,
    cenaPLN,
    numerPaska,
    images,
    imagePath, // legacy
  } = body;

  if (!categoryId || typeof categoryId !== "string") {
    return NextResponse.json({ error: "Brak lub nieprawidłowe categoryId" }, { status: 400 });
  }

  await dbConnect();

  const cat = await Category.findById(categoryId).select("_id").lean();
  if (!cat) {
    return NextResponse.json({ error: "Kategoria nie istnieje" }, { status: 400 });
  }

  const imagesNormalized = normalizeImages(images, imagePath);

  const doc = await Item.create({
    categoryId: String(categoryId),
    title: String(title),
    titleEn: String(titleEn),
    description: String(description),
    descriptionEn: String(descriptionEn),
    rozmiarMin: toNumber(rozmiarMin),
    rozmiarMax: toNumber(rozmiarMax),
    rozmiarGlowny: toOptNumber(rozmiarGlowny),
    rozSprz: toOptNumber(body.rozSprz), // ⬅️ TU
    cenaPLN: toNumber(cenaPLN),
    numerPaska: toNumber(numerPaska),
    images: imagesNormalized,
  });

  // zwracamy podstawowe pola
  return NextResponse.json(
    {
      ok: true,
      item: {
        _id: doc._id,
        categoryId: doc.categoryId,
        title: doc.title,
        titleEn: doc.titleEn,
        description: doc.description,
        descriptionEn: doc.descriptionEn,
        rozmiarMin: doc.rozmiarMin,
        rozmiarMax: doc.rozmiarMax,
        rozmiarGlowny: doc.rozmiarGlowny,
        cenaPLN: doc.cenaPLN,
        numerPaska: doc.numerPaska,
        images: doc.images,
        createdAt: doc.createdAt,
      },
    },
    { status: 201 }
  );
}

/* ===== GET: lista dla panelu admina ===== */
export async function GET(req: NextRequest) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const items = await Item.find(
    {},
    {
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
    }
  )
    .populate("categoryId", "name slug")
    .sort({ numerPaska: 1, createdAt: 1 })
    .lean<ItemLean[]>();

  // defensywnie: posortuj i zapewnij primary
  const safe = items.map((it): ItemLean => {
    const imgsSrc = Array.isArray(it.images) ? it.images : [];
    const imgs: ImgLean[] = [...imgsSrc].sort(
      (a, b) => (a?.order ?? 0) - (b?.order ?? 0)
    );

    if (imgs.length && !imgs.some((x) => Boolean(x?.isPrimary))) {
      imgs[0].isPrimary = true;
    }

    imgs.forEach((x, i) => {
      x.order = typeof x.order === "number" ? x.order : i;
    });

    return { ...it, images: imgs };
  });

  return NextResponse.json(safe);
}
