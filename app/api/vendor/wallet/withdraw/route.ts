import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { isVendorError, requireVendor } from "@/lib/vendorAuth";
import { syncVendorBalance, vendorWallet } from "@/lib/vendorWallet";
import { publishLive } from "@/lib/messageBus";

export async function POST(req: NextRequest) {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;

  const { amount } = await req.json();
  const payout = Number(amount);
  const summary = await vendorWallet(vendor);
  if (!payout || payout <= 0) {
    return NextResponse.json({ success: false, message: "Enter an amount to withdraw." }, { status: 400 });
  }
  if (payout > summary.available) {
    return NextResponse.json({ success: false, message: "That amount is higher than the available wallet balance." }, { status: 400 });
  }
  const payoutVendor = await Vendor.findById(vendor._id).select("+stripeSecretKey");
  if (!payoutVendor?.stripeSecretKey) {
    return NextResponse.json({ success: false, message: "Add your Stripe secret key before withdrawing." }, { status: 400 });
  }

  const vendorStripe = new Stripe(payoutVendor.stripeSecretKey);
  let transferId = "";
  try {
    const balance = await vendorStripe.balance.retrieve();
    const availableCents = balance.available.find((entry) => entry.currency === "usd")?.amount || 0;
    if (availableCents < Math.round(payout * 100)) {
      return NextResponse.json({
        success: false,
        message: `That Stripe account has $${(availableCents / 100).toFixed(2)} available to pay out. Withdrawals are sent from the Stripe account these keys belong to.`,
      }, { status: 400 });
    }
    const sent = await vendorStripe.payouts.create({
      amount: Math.round(payout * 100),
      currency: "usd",
      description: `Printgraphy wallet withdrawal for ${vendor.name}`,
    });
    transferId = sent.id;
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Stripe could not send this withdrawal.";
    const message = raw.toLowerCase().includes("insufficient")
      ? "That Stripe account does not have enough balance to pay out this amount."
      : raw;
    return NextResponse.json({ success: false, message }, { status: 400 });
  }

  vendor.wallet.push({
    type: "withdrawal",
    amount: payout,
    orderNumber: "",
    note: "Withdrawn to your Stripe bank account",
    transferId,
    createdAt: new Date(),
  });
  const next = await syncVendorBalance(vendor);
  publishLive();
  return NextResponse.json({ success: true, message: `$${payout.toFixed(2)} paid out from your Stripe account.`, wallet: next });
}
