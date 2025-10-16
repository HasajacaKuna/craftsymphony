import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Item from "@/models/Item";
import Category from "@/models/Category";
import { checkAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  if (!checkAdminPassword(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = params.id;
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
  if (body.categoryId) {
    const cat = await Category.findById(body.categoryId);
    if (!cat) return NextResponse.json({ error: "Kategoria nie istnieje" }, { status: 400 });
    update.categoryId = body.categoryId;
  }

  await dbConnect();
  const saved = await Item.findByIdAndUpdate(id, update, { new: true }).populate("categoryId", "name slug");
  if (!saved) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  return NextResponse.json(saved);
}

export async function DELETE(req: Request, { params }: Params) {
  if (!checkAdminPassword(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = params.id;
  await dbConnect();
  await Item.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
