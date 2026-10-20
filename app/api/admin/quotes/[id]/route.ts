import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Quote from "@/models/Quote";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";

// PUT /api/admin/quotes/[id] — Update quote status, price, notes
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["status", "quotedPrice", "adminNotes"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }

  const quote = await Quote.findByIdAndUpdate(id, updates, { new: true });
  if (!quote) return NextResponse.json({ success: false, message: "Quote not found." }, { status: 404 });

  return NextResponse.json({ success: true, quote });
}
