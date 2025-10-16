import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Category from "@/models/Category";
import Item from "@/models/Item";
import { checkAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!checkAdminPassword(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = params.id;
  const body = await req.json();

  type CategoryUpdate = Partial<{ name: string; slug: string; order: number }>;
  const update: CategoryUpdate = {};

  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.slug === "string") update.slug = body.slug.toLowerCase().trim();
  if (typeof body.order === "number") update.order = body.order;

  await dbConnect();
  const saved = await Category.findByIdAndUpdate(id, update, { new: true });
  if (!saved) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  return NextResponse.json(saved);
}


export async function DELETE(req: Request, { params }: Params) {
  if (!checkAdminPassword(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = params.id;
  await dbConnect();
  // Kaskadowo usuwamy przedmioty z tej kategorii
  await Item.deleteMany({ categoryId: id });
  await Category.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
