import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Category from "@/models/Category";
import Item from "@/models/Item";
import type { Types } from "mongoose";

export const dynamic = "force-dynamic";

/* ===== Typy z bazy (po .lean()) ===== */
type CatLean = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  order?: number;
  createdAt?: Date;
};

type ImgLean = {
  url?: string;
  altPl?: string;
  altEn?: string;
  isPrimary?: boolean;
  order?: number;
};

type ItemLean = {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
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

/* ===== Typy odpowiedzi API ===== */
type ApiImage = {
  url: string;
  altPl?: string;
  altEn?: string;
  isPrimary: boolean;
  order: number;
};

type ApiItemOut = {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  cenaPLN: number;
  rozmiarMin: number;
  rozmiarMax: number;
  rozmiarGlowny: number | null;
  rozSprz: number | null;
  numerPaska: number;
  images: ApiImage[];
};

type ApiCategoryOut = {
  slug: string;
  title: string;
  images: { url: string; order: number }[]; // fallback dla kategorii
  items: ApiItemOut[];
};

export async function GET() {
  await dbConnect();

  // 1) kategorie
  const cats = await Category.find({}, { name: 1, slug: 1, order: 1, createdAt: 1 })
    .sort({ order: 1, createdAt: 1 })
    .lean<CatLean[]>();

  // 2) itemy (nowe pola + images[])
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
    .sort({ numerPaska: 1, createdAt: 1 })
    .lean<ItemLean[]>();

  // 3) grupowanie itemów po kategorii
  const map = new Map<string, ItemLean[]>();
  for (const it of items) {
    const key = String(it.categoryId);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }

  // 4) budowa odpowiedzi
  const categories: ApiCategoryOut[] = cats.map((c) => {
    const its = map.get(String(c._id)) ?? [];

    const itemsOut: ApiItemOut[] = its.map((i) => {
      const images: ApiImage[] = Array.isArray(i.images)
        ? i.images
            .map((img, idx): ApiImage | null => {
              const url = (img?.url ?? "").trim();
              if (!url) return null;
              const order =
                typeof img?.order === "number" ? img.order : Number.isFinite(idx) ? idx : 0;
              return {
                url,
                altPl: img?.altPl ?? "",
                altEn: img?.altEn ?? "",
                isPrimary: Boolean(img?.isPrimary),
                order,
              };
            })
            .filter((x): x is ApiImage => x !== null)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [];

      // gwarancja jednego primary
      if (images.length && !images.some((x) => x.isPrimary)) {
        images[0].isPrimary = true;
      } else if (images.length) {
        let seen = false;
        images.forEach((im) => {
          if (im.isPrimary && !seen) seen = true;
          else if (im.isPrimary && seen) im.isPrimary = false;
        });
      }

      return {
        title: i.title || "",
        titleEn: i.titleEn || "",
        description: i.description || "",
        descriptionEn: i.descriptionEn || "",
        cenaPLN: Number(i.cenaPLN ?? 0),
        rozmiarMin: Number(i.rozmiarMin ?? 0),
        rozmiarMax: Number(i.rozmiarMax ?? 0),
        rozmiarGlowny: i.rozmiarGlowny == null ? null : Number(i.rozmiarGlowny),
        rozSprz: i.rozSprz == null ? null : Number(i.rozSprz),
        numerPaska:
          typeof i.numerPaska === "number" ? i.numerPaska : Number(i.numerPaska ?? 0),
        images,
      };
    });

    // 5) obrazy kategorii (fallback: primary lub 1-sze z każdego itemu)
    const catImages = itemsOut
      .map((it) => {
        const sorted = [...(it.images ?? [])].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        const primary = sorted.find((im) => im.isPrimary)?.url || sorted[0]?.url;
        return primary;
      })
      .filter((u): u is string => Boolean(u))
      .map((url, idx) => ({ url, order: idx }));

    return {
      slug: c.slug,
      title: c.name,
      images: catImages,
      items: itemsOut,
    };
  });

  return NextResponse.json({ categories });
}
