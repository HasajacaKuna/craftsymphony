import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Category from "@/models/Category";
import { checkAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function GET(req: Request) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();
  const cats = await Category.find({}, { name: 1, slug: 1, order: 1, createdAt: 1 })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  return NextResponse.json(cats);
}

type CreateCategoryBody = {
  name: string;
  slug?: string;
};

export async function POST(req: Request) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // unikamy `any` i walidujemy kształt
  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof bodyUnknown !== "object" || bodyUnknown === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const body = bodyUnknown as Partial<CreateCategoryBody>;

  const rawName = String(body?.name ?? "").trim();
  const rawSlug = String(body?.slug ?? "").trim();

  if (!rawName) {
    return NextResponse.json({ error: "Podaj nazwę" }, { status: 400 });
  }
  if (rawName.length > 120) {
    return NextResponse.json({ error: "Nazwa jest za długa" }, { status: 400 });
  }

  await dbConnect();

  const slug = (rawSlug ? slugify(rawSlug) : slugify(rawName)).slice(0, 140);
  if (!slug) {
    return NextResponse.json({ error: "Nie udało się wygenerować slug" }, { status: 400 });
  }

  const exists = await Category.findOne({ slug }).lean();
  if (exists) {
    return NextResponse.json({ error: "Taki slug już istnieje" }, { status: 409 });
  }

  // wylicz nextOrder (bez bitowych sztuczek)
  const last = await Category.findOne({}, { order: 1 }).sort({ order: -1 }).lean<{ order?: number }>();
  const nextOrder = (typeof last?.order === "number" ? last.order : -1) + 1;

  const created = await Category.create({ name: rawName, slug, order: nextOrder });

  return NextResponse.json(
    { _id: created._id, name: created.name, slug: created.slug, order: created.order, createdAt: created.createdAt },
    { status: 201 }
  );
}
