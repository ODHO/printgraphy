import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

/**
 * Server-side helper for admin API routes.
 * Verifies the user session and checks the isAdmin flag.
 * Returns the userId if authorized, or a NextResponse error if not.
 */
export async function requireAdmin(): Promise<
  { userId: string; email: string } | NextResponse
> {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  // Double-check isAdmin in DB (JWT may be stale if role was revoked)
  await dbConnect();
  const user = await User.findById(session.userId).select("isAdmin").lean();

  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { success: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  return { userId: session.userId, email: session.email };
}

/**
 * Type guard — check if result is a NextResponse error
 */
export function isErrorResponse(
  result: { userId: string; email: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
