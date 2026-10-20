import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Coupon from "@/models/Coupon";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { code, cartSubtotal } = await req.json();

    if (!code) {
      return NextResponse.json({ success: false, message: "Coupon code is required." }, { status: 400 });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return NextResponse.json({ success: false, message: "Invalid or expired coupon code." }, { status: 404 });
    }

    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      return NextResponse.json({ success: false, message: "This coupon code has expired." }, { status: 400 });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ success: false, message: "This coupon has reached its maximum usage limit." }, { status: 400 });
    }

    const subtotal = Number(cartSubtotal || 0);
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum order subtotal of $${coupon.minOrderValue.toFixed(2)} required for coupon ${coupon.code}.`,
        },
        { status: 400 }
      );
    }

    let discountAmount = 0;
    if (coupon.type === "percentage") {
      discountAmount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.value;
    }

    discountAmount = Math.min(discountAmount, subtotal);

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount,
      },
      message: `Coupon ${coupon.code} applied successfully!`,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Error validating coupon." }, { status: 500 });
  }
}
