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

type WoodPatch = Partial<{
  descriptionPl: string;
  descriptionEn: string | null;
  pricePLN: number;
  image: string;
  order: number;
}>;

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = assertAuth(req);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  const raw = (await req.json().catch(() => null)) as unknown;
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const patch: WoodPatch = {};

  if ("descriptionPl" in body)
    patch.descriptionPl = typeof body.descriptionPl === "string" ? body.descriptionPl : "";
  if ("descriptionEn" in body)
    patch.descriptionEn =
      typeof body.descriptionEn === "string" && body.descriptionEn.trim() !== ""
        ? body.descriptionEn
        : null;
  if ("pricePLN" in body) {
    const n = Number((body as Record<string, unknown>).pricePLN);
    if (!Number.isNaN(n)) patch.pricePLN = n;
  }
  if ("image" in body)
    patch.image = typeof body.image === "string" ? body.image : "";
  if ("order" in body) {
    const n = Number((body as Record<string, unknown>).order);
    patch.order = Number.isNaN(n) ? 0 : n;
  }

  await dbConnect();
  const updated = await WoodItem.findByIdAndUpdate(id, patch, { new: true });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = assertAuth(req);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  await dbConnect();
  const deleted = await WoodItem.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
