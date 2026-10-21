import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import { sendVendorWelcomeEmail } from "@/lib/mailer";

// GET /api/admin/vendors — List vendors with filtering
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { contactName: { $regex: search, $options: "i" } },
    ];
  }

  const [vendors, total] = await Promise.all([
    Vendor.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Vendor.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    vendors,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// POST /api/admin/vendors — Register / Add a vendor
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const body = await req.json();
  const { name, contactName, email, phone, marketsCovered, categoriesFulfilled, capacityPerWeek } = body;

  if (!name || !contactName || !email || !phone) {
    return NextResponse.json(
      { success: false, message: "Name, contact name, email, and phone are required." },
      { status: 400 }
    );
  }

  const existing = await Vendor.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { success: false, message: "A vendor with this email already exists." },
      { status: 400 }
    );
  }

  // 1. Generate temp password & create Vendor User account
  const tempPass = `XP-Vendor-${Math.floor(100000 + Math.random() * 900000)}`;
  const hashedPassword = await bcrypt.hash(tempPass, 10);

  let vendorUser = await User.findOne({ email });
  if (!vendorUser) {
    vendorUser = await User.create({
      firstName: contactName.split(" ")[0] || contactName,
      lastName: contactName.split(" ").slice(1).join(" ") || "Vendor",
      email,
      passwordHash: hashedPassword,
      isVerified: true,
    });
  }

  // 2. Create Vendor Profile
  const vendor = await Vendor.create({
    name,
    contactName,
    email,
    phone,
    marketsCovered: marketsCovered || [],
    categoriesFulfilled: categoriesFulfilled || [],
    capacityPerWeek: capacityPerWeek || 500,
    status: "active",
    isAvailable: true,
  });

  // 3. Dispatch automated welcome email to Vendor
  const origin = req.nextUrl.origin;
  const portalUrl = `${origin}/auth/signin?redirect=/vendor/dashboard`;
  await sendVendorWelcomeEmail(email, name, tempPass, portalUrl);

  return NextResponse.json(
    {
      success: true,
      vendor,
      tempPass,
      message: `Vendor onboarded successfully! Welcome email sent to ${email}`,
    },
    { status: 201 }
  );
}
