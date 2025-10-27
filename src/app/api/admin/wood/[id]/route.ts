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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = assertAuth(req);
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const patch: any = {};
  if ("descriptionPl" in body) patch.descriptionPl = body.descriptionPl ?? "";
  if ("descriptionEn" in body) patch.descriptionEn = body.descriptionEn ?? null;
  if ("pricePLN" in body) patch.pricePLN = Number(body.pricePLN);
  if ("image" in body) patch.image = body.image ?? "";
  if ("order" in body) patch.order = body.order == null ? 0 : Number(body.order);

  await dbConnect();
  const updated = await WoodItem.findByIdAndUpdate(params.id, patch, { new: true });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = assertAuth(req);
  if (unauthorized) return unauthorized;

  await dbConnect();
  const deleted = await WoodItem.findByIdAndDelete(params.id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
