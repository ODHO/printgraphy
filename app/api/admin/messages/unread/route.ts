import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { isErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { unreadCount } from "@/lib/messaging";

export async function GET() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  await dbConnect();
  const [user, vendor] = await Promise.all([unreadCount("user"), unreadCount("vendor")]);
  return NextResponse.json({ success: true, user, vendor, total: user + vendor });
}
