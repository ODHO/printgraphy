import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { isErrorResponse, requireAdmin } from "@/lib/adminAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const { id } = await params;
  const { amount, note } = await req.json();
  const payout = Number(amount);
  if (!payout || payout <= 0) {
    return NextResponse.json({ success: false, message: "Enter a payout amount." }, { status: 400 });
  }

  const vendor = await Vendor.findById(id);
  if (!vendor) return NextResponse.json({ success: false, message: "Vendor not found." }, { status: 404 });
  if (payout > vendor.earnedBalance) {
    return NextResponse.json({ success: false, message: "Payout is higher than the earned balance." }, { status: 400 });
  }

  vendor.earnedBalance = Number((vendor.earnedBalance - payout).toFixed(2));
  vendor.payouts.push({ amount: payout, note: String(note || ""), createdAt: new Date() });
  await vendor.save();

  return NextResponse.json({ success: true, vendor });
}
