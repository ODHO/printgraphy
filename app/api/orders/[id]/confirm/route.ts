import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { getSession } from "@/lib/session";
import { Types } from "mongoose";
import { qualifyOrderForPayout } from "@/lib/vendorPayout";
import { publishLive } from "@/lib/messageBus";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ success: false, message: "Sign in to confirm this order." }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;
  const order = await Order.findOne({
    _id: id,
    userId: new Types.ObjectId(String(session.userId)),
  });

  if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
  if (order.fulfillmentStatus !== "delivered") {
    return NextResponse.json({ success: false, message: "You can confirm this order after the vendor marks it delivered." }, { status: 400 });
  }
  if (!order.customerConfirmedAt) order.customerConfirmedAt = new Date();
  await order.save();
  const ready = await qualifyOrderForPayout(String(order._id));

  publishLive();
  return NextResponse.json({ success: true, order: ready || order });
}
