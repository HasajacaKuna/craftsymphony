import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs"; // ważne: żeby mieć dostęp do fs

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "visits.json");

type VisitsData = { count: number };

function readCount(): number {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR);
    }
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify({ count: 0 }, null, 2));
      return 0;
    }
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const parsed: VisitsData = JSON.parse(raw);
    return typeof parsed.count === "number" ? parsed.count : 0;
  } catch (err) {
    console.error("READ ERROR /api/visits:", err);
    return 0;
  }
}

function writeCount(count: number) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR);
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify({ count }, null, 2));
  } catch (err) {
    console.error("WRITE ERROR /api/visits:", err);
  }
}

export async function GET() {
  const current = readCount();
  const next = current + 1;
  writeCount(next);

  console.log("VISIT:", { current, next });

  return NextResponse.json({ count: next });
}
