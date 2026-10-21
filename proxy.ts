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
  const session = (await getSession(req)) as any;
  const isLoggedIn = !!session && !String(session.userId ?? "").startsWith("reset:");
  const isAdmin = Boolean(session?.isAdmin || session?.role === "admin");
  const isVendor = Boolean(session?.isVendor || session?.role === "vendor");

  // 1. Logged-in users visiting /auth/* → redirect to their respective portal
  if (isLoggedIn && pathname.startsWith("/auth")) {
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (isVendor) {
      return NextResponse.redirect(new URL("/vendor/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 2. Admin routes → strictly require admin privileges
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/auth/signin", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin) {
      // Non-admin (customer or vendor) is blocked from /admin
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // 3. Vendor portal routes
  if (pathname.startsWith("/vendor/login")) {
    return NextResponse.redirect(new URL("/auth/signin?redirect=/vendor/dashboard", req.url));
  }

  if (pathname.startsWith("/vendor/dashboard") || pathname.startsWith("/vendor/orders")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/auth/signin", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // If logged in, layout.tsx performs the real-time MongoDB check safely.
  }

  // 4. Customer dashboard & profile routes → require login
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/profile")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/auth/signin", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/vendor/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/auth/:path*",
  ],
};
