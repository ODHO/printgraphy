import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { getSession } from "@/lib/session";
import { Types } from "mongoose";

// GET /api/orders/[id] — order detail (owner only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;

  const order = await Order.findOne({
    _id: id,
    userId: new Types.ObjectId(String(session.userId)),
  }).lean();

  if (!order) {
    return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, order });
}
