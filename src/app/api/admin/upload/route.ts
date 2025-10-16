import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { checkAdminPassword } from "@/lib/auth";


export const runtime = "nodejs"; // wymagane do zapisu na dysk
export const dynamic = "force-dynamic";


export async function POST(req: Request) {
if (!checkAdminPassword(req)) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}


const form = await req.formData();
const file = form.get("file") as File | null;
if (!file) return NextResponse.json({ error: "Brak pliku" }, { status: 400 });


const bytes = await file.arrayBuffer();
const buffer = Buffer.from(bytes);


const uploadDir = path.join(process.cwd(), "public", "images", "belts");
await mkdir(uploadDir, { recursive: true });


const ext = path.extname(file.name) || ".jpg";
const safeBase = path.basename(file.name, ext).replace(/[^a-z0-9_-]/gi, "_");
const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeBase}${ext}`;
const fullPath = path.join(uploadDir, filename);


await writeFile(fullPath, buffer);


const relative = `/images/belts/${filename}`;
return NextResponse.json({ path: relative });
}