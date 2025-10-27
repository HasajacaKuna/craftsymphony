import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { WoodItem } from "@/models/WoodItem";

function assertAuth(req: NextRequest) {
  const got = req.headers.get("x-admin-password") || "";
  const good = process.env.ADMIN_PASSWORD || "";
  if (!good || got !== good) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  await dbConnect();
  const items = await WoodItem.find().sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const unauthorized = assertAuth(req);
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { descriptionPl, descriptionEn, pricePLN, image, order } = body || {};
  if (!descriptionPl || !pricePLN || !image) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }
  await dbConnect();
  const created = await WoodItem.create({
    descriptionPl,
    descriptionEn,
    pricePLN: Number(pricePLN),
    image,
    order: typeof order === "number" ? order : 0,
  });
  return NextResponse.json(created, { status: 201 });
}
