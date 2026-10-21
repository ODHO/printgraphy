import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import PaymentMethod from "@/models/PaymentMethod";
import { getSession } from "@/lib/session";
import { Types } from "mongoose";

// Helper to detect card type from card number
function detectCardBrand(num: string): "visa" | "mastercard" | "amex" | "discover" | "other" {
  const clean = num.replace(/\D/g, "");
  if (/^4/.test(clean)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(clean)) return "mastercard";
  if (/^3[47]/.test(clean)) return "amex";
  if (/^6(011|5)/.test(clean)) return "discover";
  return "visa";
}

// GET /api/payment-methods
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  await dbConnect();
  let methods = await PaymentMethod.find({ userId: session.userId })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, paymentMethods: methods });
}

// POST /api/payment-methods — add new card
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  await dbConnect();
  const body = await req.json();
  const { cardholderName, cardNumber, expiry, billingZip, isDefault, cardColor } = body;

  if (!cardholderName || !cardNumber || !expiry) {
    return NextResponse.json(
      { success: false, message: "Cardholder name, card number, and expiry date are required." },
      { status: 400 }
    );
  }

  const cleanNum = cardNumber.replace(/\D/g, "");
  if (cleanNum.length < 13 || cleanNum.length > 19) {
    return NextResponse.json(
      { success: false, message: "Invalid card number format." },
      { status: 400 }
    );
  }

  const parts = expiry.split("/");
  const expMonth = parts[0]?.trim() || "12";
  const expYear = parts[1]?.trim() || "28";
  const last4 = cleanNum.slice(-4);
  const cardType = detectCardBrand(cleanNum);

  // If this card is marked default, or is the first card, unset others
  const existingCount = await PaymentMethod.countDocuments({ userId: session.userId });
  const shouldBeDefault = isDefault || existingCount === 0;

  if (shouldBeDefault) {
    await PaymentMethod.updateMany(
      { userId: session.userId },
      { $set: { isDefault: false } }
    );
  }

  const newMethod = await PaymentMethod.create({
    userId: new Types.ObjectId(String(session.userId)),
    cardholderName: cardholderName.trim(),
    cardType,
    last4,
    expMonth,
    expYear,
    isDefault: shouldBeDefault,
    billingZip: billingZip?.trim() || "",
    cardColor: cardColor || (cardType === "mastercard" ? "#1E293B" : cardType === "amex" ? "#0F766E" : "#1B4D89"),
  });

  return NextResponse.json({ success: true, paymentMethod: newMethod }, { status: 201 });
}

// PATCH /api/payment-methods — set card as default
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  await dbConnect();
  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ success: false, message: "Payment method ID required." }, { status: 400 });
  }

  await PaymentMethod.updateMany({ userId: session.userId }, { $set: { isDefault: false } });
  const updated = await PaymentMethod.findOneAndUpdate(
    { _id: id, userId: session.userId },
    { $set: { isDefault: true } },
    { new: true }
  );

  return NextResponse.json({ success: true, paymentMethod: updated });
}

// DELETE /api/payment-methods — remove a card
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, message: "Payment method ID required." }, { status: 400 });
  }

  await PaymentMethod.findOneAndDelete({ _id: id, userId: session.userId });

  // If deleted card was default, make another one default if exists
  const remaining = await PaymentMethod.find({ userId: session.userId }).sort({ createdAt: -1 });
  if (remaining.length > 0 && !remaining.some((m) => m.isDefault)) {
    remaining[0].isDefault = true;
    await remaining[0].save();
  }

  return NextResponse.json({ success: true, message: "Payment method removed successfully." });
}
