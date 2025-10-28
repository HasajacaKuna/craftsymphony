import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// ZWRACA: Promise<Response | undefined>
export async function requireAdmin(): Promise<Response | undefined> {
  const jar = await cookies();
  const c = jar.get("admin_session")?.value;
  if (c !== "ok") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return undefined; // ⬅️ zamiast null
}
