import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { isErrorResponse, requireAdmin } from "@/lib/adminAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const { id } = await params;
  const { body } = await req.json();
  const text = String(body || "").trim();
  if (!text) {
    return NextResponse.json({ success: false, message: "Write a note first." }, { status: 400 });
  }

  const order = await Order.findByIdAndUpdate(
    id,
    { $push: { messages: { author: auth.email, body: text, createdAt: new Date() } } },
    { new: true }
  ).populate("vendorId", "name email phone marketsCovered status");

  if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
  return NextResponse.json({ success: true, order });
}
