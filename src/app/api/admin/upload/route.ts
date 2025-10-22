import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import crypto from "crypto";
import { checkAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ===== Konfiguracja i typy =====
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"] as const;
type AllowedExt = typeof ALLOWED_EXT[number];

const RAW_MAX_MB = Number.parseFloat(process.env.MAX_UPLOAD_MB ?? "");
const MAX_MB = Number.isFinite(RAW_MAX_MB) ? RAW_MAX_MB : 300;

// Normalizujemy typ MIME → rozszerzenie (jpeg → jpg)
function extFromMime(mime: string): AllowedExt | null {
  const m = mime.toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return null;
}

function sanitizeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

function isAllowedExt(ext: string): ext is AllowedExt {
  return (ALLOWED_EXT as readonly string[]).includes(ext.toLowerCase());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!checkAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Missing BLOB_READ_WRITE_TOKEN" },
      { status: 500 }
    );
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

  const f = file as File;
  const size = typeof f.size === "number" ? f.size : 0;
  const contentType = (f.type || "application/octet-stream").toLowerCase();

  // Walidacje: typ i rozmiar
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image/* allowed" }, { status: 415 });
  }

  const fromMime = extFromMime(contentType); // jpeg → jpg, itd.
  const origName = f.name || "upload";
  const origExtRaw = (origName.split(".").pop() || "").toLowerCase();
  const origExt = origExtRaw === "jpeg" ? "jpg" : origExtRaw;

  const finalExt = (isAllowedExt(origExt) ? (origExt as AllowedExt) : fromMime) ?? null;

  if (!finalExt || !isAllowedExt(finalExt)) {
    return NextResponse.json(
      { error: `Unsupported format. Allowed: ${ALLOWED_EXT.join(", ")}` },
      { status: 415 }
    );
  }

  if (size > MAX_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_MB} MB)` },
      { status: 413 }
    );
  }

  // Nazwa pliku: yyyy/mm/dd/uuid_oczyszczona
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const uuid = crypto.randomUUID();
  const safeBase = sanitizeName(origName.replace(/\.[^.]+$/, "")); // bez rozszerzenia
  const key = `images/belts/${yyyy}/${mm}/${dd}/${uuid}_${safeBase}.${finalExt}`;

  // Upload do Vercel Blob
  const { url } = await put(key, file, {
    access: "public",
    token,
    contentType, // warto ustawić explicite
    // cacheControl: "public, max-age=31536000, immutable",
  });

  // Zgodność: zwracamy też 'path'
  return NextResponse.json(
    {
      url,
      path: url,
      key,
      name: `${safeBase}.${finalExt}`,
      size,
      contentType,
    },
    { status: 201 }
  );
}
