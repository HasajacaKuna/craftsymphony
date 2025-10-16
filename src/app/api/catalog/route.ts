import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Category from "@/models/Category";
import Item from "@/models/Item";

export const dynamic = "force-dynamic";

function formatPrice(pln: number) {
  return `${pln.toLocaleString("pl-PL")} PLN`;
}

export async function GET() {
  await dbConnect();

  const cats = await Category.find({}, { name: 1, slug: 1, order: 1 })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const items = await Item.find({}, { categoryId: 1, title: 1, description: 1, rozmiarMin: 1, rozmiarMax: 1, cenaPLN: 1, numerPaska: 1, imagePath: 1 })
    .sort({ numerPaska: 1, createdAt: 1 })
    .lean();

  const map = new Map<string, typeof items>();
  for (const it of items) {
    const key = String(it.categoryId);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }

  const categories = cats.map((c) => {
    const its = map.get(String(c._id)) ?? [];
    return {
      slug: c.slug,
      title: c.name,
      images: its.map((i) => i.imagePath),
      items: its.map((i) => ({
        name: i.title,
        description: i.description || "",
        price: formatPrice(Number(i.cenaPLN)),
        upperSize: `${Math.max(Number(i.rozmiarMin), Number(i.rozmiarMax))} cm`,
        lowerSize: `${Math.min(Number(i.rozmiarMin), Number(i.rozmiarMax))} cm`,
      })),
    };
  });

  return NextResponse.json({ categories });
}
