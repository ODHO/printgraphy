import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, coupons });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const body = await req.json();
  const { code, type, value, minOrderValue, maxDiscountAmount, expiryDate, usageLimit } = body;

  if (!code || !type || value === undefined) {
    return NextResponse.json({ success: false, message: "Code, type, and value are required." }, { status: 400 });
  }

  const existing = await Coupon.findOne({ code: code.toUpperCase() });
  if (existing) {
    return NextResponse.json({ success: false, message: "A coupon with this code already exists." }, { status: 400 });
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    type,
    value: Number(value),
    minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
    maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    usageLimit: usageLimit ? Number(usageLimit) : undefined,
    isActive: true,
  });

  return NextResponse.json({ success: true, coupon }, { status: 201 });
}
