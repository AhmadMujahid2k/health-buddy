import { NextResponse, type NextRequest } from "next/server";

/**
 * Block writes from other websites. Browsers always send an Origin header on cross-site POST/PUT/DELETE,
 * even for "simple" requests that skip CORS preflight, so a page you visit can't log entries or run Claude
 * on your account. Tools without an Origin header (curl, scripts) still work.
 */
export function proxy(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return NextResponse.next();
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  // localhost and 127.0.0.1 are the same machine
  const norm = (host: string | null) => (host ?? "").replace(/^(localhost|\[::1\])(?=:|$)/, "127.0.0.1");
  let sameHost = true;
  if (origin) {
    try {
      sameHost = norm(new URL(origin).host) === norm(req.headers.get("host"));
    } catch {
      sameHost = false;
    }
  }
  if (!sameHost || site === "cross-site") return NextResponse.json({ error: "cross-site request blocked" }, { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
