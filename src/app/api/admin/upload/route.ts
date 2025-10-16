import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import crypto from "crypto";
import { checkAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const origName = (file as File).name || "upload.bin";
  const safe = origName.replace(/[^\w.\-]+/g, "_");
  const key = `images/belts/${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${safe}`;

  // Wysyłka do Vercel Blob (wymaga BLOB_READ_WRITE_TOKEN w env)
  const { url } = await put(key, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN, // lokalnie z .env.local; na Vercel token z konfiguracji projektu
  });

  // Zwracamy "path" dla zgodności z Twoim frontendem
  return NextResponse.json({ url, path: url }, { status: 201 });
}
