import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { getSession } from "@/lib/session";
import { Types } from "mongoose";

// GET /api/orders — list authenticated user's orders
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(20, Number(searchParams.get("limit") ?? 10));

  const query = { userId: new Types.ObjectId(String(session.userId)) };
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-items.specs") // lighter list view
      .lean(),
    Order.countDocuments(query),
  ]);

  return NextResponse.json({
    success: true,
    orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
