import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { isVendorError, requireVendor } from "@/lib/vendorAuth";
import { syncVendorBalance, vendorWallet } from "@/lib/vendorWallet";
import { publishLive } from "@/lib/messageBus";

function publicVendor(vendor: {
  _id: unknown;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  marketsCovered: string[];
  categoriesFulfilled: string[];
  status: string;
  isAvailable: boolean;
  capacityPerWeek: number;
  stripeAccountId?: string;
  stripePublishableKey?: string;
  stripeSecretSaved?: boolean;
  stripeAccountEmail?: string;
  accountHolderName?: string;
  earnedBalance: number;
  payouts?: { amount: number; note: string; createdAt: Date }[];
  metrics?: {
    acceptanceRate: number;
    onTimePercentage: number;
    reprintRate: number;
    avgTurnaroundHours: number;
  };
}) {
  return {
    _id: vendor._id,
    name: vendor.name,
    contactName: vendor.contactName,
    email: vendor.email,
    phone: vendor.phone,
    marketsCovered: vendor.marketsCovered,
    categoriesFulfilled: vendor.categoriesFulfilled,
    status: vendor.status,
    isAvailable: vendor.isAvailable,
    capacityPerWeek: vendor.capacityPerWeek,
    stripeAccountId: vendor.stripeAccountId || "",
    stripePublishableKey: vendor.stripePublishableKey || "",
    stripeSecretSaved: Boolean(vendor.stripeSecretSaved),
    stripeAccountEmail: vendor.stripeAccountEmail || "",
    accountHolderName: vendor.accountHolderName || "",
    earnedBalance: vendor.earnedBalance || 0,
    payouts: vendor.payouts || [],
    metrics: vendor.metrics,
  };
}

export async function GET() {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;
  const stored = await Vendor.findById(vendor._id).select("+stripeSecretKey");
  const wallet = await syncVendorBalance(vendor);
  const plain = vendor.toObject();
  delete plain.stripeSecretKey;
  return NextResponse.json({
    success: true,
    vendor: { ...publicVendor({ ...plain, stripeSecretSaved: Boolean(stored?.stripeSecretKey) }), earnedBalance: wallet.available },
    wallet,
  });
}

export async function PUT(req: NextRequest) {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;

  const body = await req.json();
  if (typeof body.isAvailable === "boolean") {
    if (vendor.status !== "active") {
      return NextResponse.json({ success: false, message: "This vendor account is not active." }, { status: 403 });
    }
    vendor.isAvailable = body.isAvailable;
  }

  const storedSecret = await Vendor.findById(vendor._id).select("+stripeSecretKey");
  const secret = typeof body.stripeSecretKey === "string" ? body.stripeSecretKey.trim() : "";
  const publishable = typeof body.stripePublishableKey === "string" ? body.stripePublishableKey.trim() : "";
  if (secret || publishable) {
    if (secret && !/^sk_(test|live)_/.test(secret)) {
      return NextResponse.json({ success: false, message: "The secret key should start with sk_test_ or sk_live_." }, { status: 400 });
    }
    if (publishable && !/^pk_(test|live)_/.test(publishable)) {
      return NextResponse.json({ success: false, message: "The publishable key should start with pk_test_ or pk_live_." }, { status: 400 });
    }
    const secretToCheck = secret || storedSecret?.stripeSecretKey || "";
    if (!secretToCheck) {
      return NextResponse.json({ success: false, message: "Add the secret key from your Stripe dashboard." }, { status: 400 });
    }
    const publishableToCheck = publishable || vendor.stripePublishableKey || "";
    const secretMode = secretToCheck.startsWith("sk_test_") ? "test" : "live";
    const publishableMode = publishableToCheck.startsWith("pk_test_") ? "test" : publishableToCheck.startsWith("pk_live_") ? "live" : "";
    if (publishableMode && publishableMode !== secretMode) {
      return NextResponse.json({ success: false, message: "Use a test publishable key with a test secret key, or live with live." }, { status: 400 });
    }
    if (secret) {
      try {
        await new Stripe(secret).balance.retrieve();
        vendor.stripeSecretKey = secret;
      } catch {
        return NextResponse.json({ success: false, message: "Stripe rejected that secret key. Copy it again from Developers → API keys." }, { status: 400 });
      }
    }
    if (publishable) vendor.stripePublishableKey = publishable;
  }
  if (typeof body.accountHolderName === "string") vendor.accountHolderName = body.accountHolderName.trim();
  if (typeof body.stripeAccountEmail === "string") vendor.stripeAccountEmail = body.stripeAccountEmail.trim().toLowerCase();

  await vendor.save();
  publishLive();
  const wallet = await vendorWallet(vendor);
  const savedSecret = secret || storedSecret?.stripeSecretKey || "";
  const plain = vendor.toObject();
  delete plain.stripeSecretKey;
  return NextResponse.json({
    success: true,
    vendor: { ...publicVendor({ ...plain, stripeSecretSaved: Boolean(savedSecret) }), earnedBalance: wallet.available },
    wallet,
  });
}
