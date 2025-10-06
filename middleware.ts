// middleware.ts — HTTP Basic Auth for /admin
// ============================= — HTTP Basic Auth for /admin
// =============================
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  if (!url.pathname.startsWith("/admin")) return NextResponse.next();

  const auth = req.headers.get("authorization");
  const expectedUser = process.env.BASIC_AUTH_USER || "admin";
  const expectedPass = process.env.BASIC_AUTH_PASS || "changeme";

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const [user, pass] = Buffer.from(encoded, "base64").toString().split(":");
      if (user === expectedUser && pass === expectedPass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": "Basic realm=\"Secure Area\"" },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
