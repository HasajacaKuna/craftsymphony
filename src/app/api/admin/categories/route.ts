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
  const cats = await Category.find().sort({ order: 1, createdAt: 1 });
  return NextResponse.json(cats);
}

export async function POST(req: Request) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const name = (body?.name || "").toString();
  const providedSlug = (body?.slug || "").toString();
  if (!name) return NextResponse.json({ error: "Podaj nazwę" }, { status: 400 });

  await dbConnect();
  const slug = providedSlug || slugify(name);
  const exists = await Category.findOne({ slug });
  if (exists) return NextResponse.json({ error: "Taki slug już istnieje" }, { status: 409 });

  // pobierz ostatnią kategorię po 'order' i wylicz następną wartość
  // wariant A: z lean + typem
  const last = await Category.findOne().sort({ order: -1 }).lean<{ order?: number }>();
  const nextOrder = (typeof last?.order === "number" ? last.order : -1) + 1;

  // wariant B (alternatywa): bez lean()
  // const last = await Category.findOne().sort({ order: -1 }).select("order").exec();
  // const nextOrder = ((last?.order as number | undefined) ?? -1) + 1;

  const created = await Category.create({ name, slug, order: nextOrder });
  return NextResponse.json(created, { status: 201 });
}
