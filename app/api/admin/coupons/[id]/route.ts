import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  await dbConnect();
  const body = await req.json();

  const coupon = await Coupon.findByIdAndUpdate(id, body, { new: true });
  if (!coupon) {
    return NextResponse.json({ success: false, message: "Coupon not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, coupon });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  await dbConnect();

  await Coupon.findByIdAndDelete(id);
  return NextResponse.json({ success: true, message: "Coupon deleted." });
}
