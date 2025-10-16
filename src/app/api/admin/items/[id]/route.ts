import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Item from "@/models/Item";
import Category from "@/models/Category";
import { checkAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
// Jeśli zobaczysz błąd o Edge runtime + Mongoose, odkomentuj poniższe:
// export const runtime = "nodejs";

type RouteParams = { id: string };
type RouteContext = { params: Promise<RouteParams> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  type ItemUpdate = Partial<{
    categoryId: string;
    title: string;
    description: string;
    rozmiarMin: number;
    rozmiarMax: number;
    cenaPLN: number;
    numerPaska: number;
    imagePath: string;
  }>;
  const update: ItemUpdate = {};

  if (body.title !== undefined) update.title = String(body.title);
  if (body.description !== undefined) update.description = String(body.description || "");
  if (body.rozmiarMin !== undefined) update.rozmiarMin = Number(body.rozmiarMin);
  if (body.rozmiarMax !== undefined) update.rozmiarMax = Number(body.rozmiarMax);
  if (body.cenaPLN !== undefined) update.cenaPLN = Number(body.cenaPLN);
  if (body.numerPaska !== undefined) update.numerPaska = Number(body.numerPaska);
  if (body.imagePath !== undefined) update.imagePath = String(body.imagePath);

  await dbConnect();

  if (body.categoryId) {
    const cat = await Category.findById(body.categoryId);
    if (!cat) {
      return NextResponse.json({ error: "Kategoria nie istnieje" }, { status: 400 });
    }
    update.categoryId = String(body.categoryId);
  }

  const saved = await Item.findByIdAndUpdate(id, update, { new: true })
    .populate("categoryId", "name slug");

  if (!saved) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  await dbConnect();
  await Item.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
