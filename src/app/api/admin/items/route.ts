import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Item from "@/models/Item";
import Category from "@/models/Category";
import { checkAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
// export const runtime = "nodejs"; // odkomentuj, jeśli Mongoose sypie się na Edge

/** Wejście do POST /api/admin/items */
interface CreateItemBody {
  categoryId: string;
  title?: string;
  description?: string;
  rozmiarMin?: number | string;
  rozmiarMax?: number | string;
  cenaPLN?: number | string;
  numerPaska?: number | string;
  imagePath?: string;
}

function toNumber(n: unknown, fallback = 0): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

export async function POST(req: NextRequest) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json(); // jeśli wysyłasz form-data, użyj req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // prosta walidacja kształtu
  if (typeof bodyUnknown !== "object" || bodyUnknown === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const body = bodyUnknown as Partial<CreateItemBody>;

  const {
    categoryId,
    title,
    description = "",
    rozmiarMin,
    rozmiarMax,
    cenaPLN,
    numerPaska,
    imagePath,
  } = body;

  await dbConnect();

  // Walidacje podstawowe
  if (!categoryId || typeof categoryId !== "string") {
    return NextResponse.json({ error: "Brak lub nieprawidłowe categoryId" }, { status: 400 });
  }
  const cat = await Category.findById(categoryId);
  if (!cat) {
    return NextResponse.json({ error: "Kategoria nie istnieje" }, { status: 400 });
  }

  const doc = await Item.create({
    categoryId: String(categoryId),
    title: String(title ?? ""),
    description: String(description ?? ""),
    rozmiarMin: toNumber(rozmiarMin),
    rozmiarMax: toNumber(rozmiarMax),
    cenaPLN: toNumber(cenaPLN),
    numerPaska: toNumber(numerPaska),
    imagePath: imagePath ? String(imagePath) : undefined,
  });

  return NextResponse.json({ ok: true, item: doc }, { status: 201 });
}

export async function GET() {
  await dbConnect();
  const items = await Item.find().populate("categoryId", "name slug");
  // Front oczekuje tablicy Item[]:
  return NextResponse.json(items);
}
