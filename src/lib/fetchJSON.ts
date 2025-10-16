export async function fetchJSON<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T | null | { raw: string }> {
  const res = await fetch(input, init);
  const ctype = res.headers.get("content-type") || "";

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (ctype.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  // fallback na pusty/tekstowy response (np. 204 No Content)
  const txt = await res.text();
  if (!txt) return null;
  try {
    return JSON.parse(txt) as T;
  } catch {
    return { raw: txt };
  }
}
