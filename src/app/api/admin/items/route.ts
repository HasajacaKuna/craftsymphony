import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Item from "@/models/Item";
import Category from "@/models/Category";
import { checkAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
// export const runtime = "nodejs"; // odkomentuj, jeśli miałbyś kłopot z Mongoose na Edge

export async function POST(req: NextRequest) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json(); // jeśli wysyłasz form-data, użyj req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    categoryId,
    title,
    description = "",
    rozmiarMin,
    rozmiarMax,
    cenaPLN,
    numerPaska,
    imagePath,
  } = body ?? {};

  await dbConnect();

  // Walidacje podstawowe
  if (!categoryId) {
    return NextResponse.json({ error: "Brak categoryId" }, { status: 400 });
  }
  const cat = await Category.findById(categoryId);
  if (!cat) {
    return NextResponse.json({ error: "Kategoria nie istnieje" }, { status: 400 });
  }

  const doc = await Item.create({
    categoryId: String(categoryId),
    title: String(title ?? ""),
    description: String(description ?? ""),
    rozmiarMin: Number(rozmiarMin ?? 0),
    rozmiarMax: Number(rozmiarMax ?? 0),
    cenaPLN: Number(cenaPLN ?? 0),
    numerPaska: Number(numerPaska ?? 0),
    imagePath: imagePath ? String(imagePath) : undefined,
  });

  // ZAWSZE coś zwróć – nawet jeśli to tylko { ok: true }
  return NextResponse.json({ ok: true, item: doc }, { status: 201 });
}

export async function GET() {
  await dbConnect();
  const items = await Item.find().populate("categoryId", "name slug");
  return NextResponse.json({ items });
}
