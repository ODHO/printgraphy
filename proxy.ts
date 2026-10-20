import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev_fallback_secret_change_in_production"
);
const COOKIE_NAME = "xprintz_session";

async function getSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await getSession(req);
  const isLoggedIn = !!session && !String(session.userId ?? "").startsWith("reset:");

  // ── Logged-in users visiting /auth/* → redirect to home ──────────────────
  if (isLoggedIn && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ── Unauthenticated users visiting /profile → redirect to /auth ───────────
  if (!isLoggedIn && pathname.startsWith("/profile")) {
    return NextResponse.redirect(new URL("/auth?tab=signin", req.url));
  }

  // ── Admin routes → require session (full isAdmin check happens in layout) ─
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/auth/signin", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/:path*", "/profile/:path*", "/admin/:path*"],
};
