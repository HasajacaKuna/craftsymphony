import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Item from "@/models/Item";
import Category from "@/models/Category";
import { checkAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
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
    titleEn: string;
    descriptionEn: string;
    rozmiarMin: number;
    rozmiarMax: number;
    rozmiarGlowny: number | null;
    cenaPLN: number;
    numerPaska: number;
    images: string[];
    imagePath: string;
  }>;

  const update: ItemUpdate = {};

  const toNum = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : undefined);
  const toNumNull = (v: unknown) => (v === null || v === "" || v === undefined ? null : Number(v));

  if (body.title !== undefined) update.title = String(body.title);
  if (body.description !== undefined) update.description = String(body.description || "");
  if (body.titleEn !== undefined) update.titleEn = String(body.titleEn || "");
  if (body.descriptionEn !== undefined) update.descriptionEn = String(body.descriptionEn || "");

  if (body.rozmiarMin !== undefined) update.rozmiarMin = toNum(body.rozmiarMin)!;
  if (body.rozmiarMax !== undefined) update.rozmiarMax = toNum(body.rozmiarMax)!;
  if (body.rozmiarGlowny !== undefined) update.rozmiarGlowny = toNumNull(body.rozmiarGlowny) as number | null;

  if (body.cenaPLN !== undefined) update.cenaPLN = toNum(body.cenaPLN)!;
  if (body.numerPaska !== undefined) update.numerPaska = toNum(body.numerPaska)!;

  // images[] (pełna zamiana listy)
  if (Array.isArray(body.images)) {
    const safe = body.images.filter(Boolean);
    update.images = safe;
    // legacy sync: jeśli mamy choć jedno, ustaw imagePath na pierwsze
    update.imagePath = safe[0] || "";
  }

  // manualny legacy override (opcjonalnie)
  if (body.imagePath !== undefined) {
    update.imagePath = String(body.imagePath || "");
    // jeśli nie przekazano images[], możesz chcieć też nadpisać images = [imagePath]
    if (!update.images && update.imagePath) {
      update.images = [update.imagePath];
    }
  }

  await dbConnect();

  if (body.categoryId) {
    const cat = await Category.findById(body.categoryId);
    if (!cat) {
      return NextResponse.json({ error: "Kategoria nie istnieje" }, { status: 400 });
    }
    update.categoryId = String(body.categoryId);
  }

  const saved = await Item.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).populate("categoryId", "name slug");

  if (!saved) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }
  return NextResponse.json(saved);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  if (!checkAdminPassword(_req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  await dbConnect();
  await Item.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
