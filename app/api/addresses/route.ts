import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Address from "@/models/Address";
import { getSession } from "@/lib/session";
import { Types } from "mongoose";

// GET /api/addresses
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }
  await dbConnect();
  const addresses = await Address.find({ userId: session.userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
  return NextResponse.json({ success: true, addresses });
}

// POST /api/addresses
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }
  await dbConnect();

  const body = await req.json();
  const { label, name, line1, line2, city, state, zip, country, phone, isDefault } = body;

  if (!name || !line1 || !city || !state || !zip || !country) {
    return NextResponse.json({ success: false, message: "Required address fields missing." }, { status: 400 });
  }

  // If this is set as default, clear other defaults
  if (isDefault) {
    await Address.updateMany({ userId: session.userId }, { isDefault: false });
  }

  const address = await Address.create({
    userId: new Types.ObjectId(String(session.userId)),
    label: label ?? "Home",
    name, line1, line2, city, state, zip,
    country: country ?? "US",
    phone,
    isDefault: isDefault ?? false,
  });

  return NextResponse.json({ success: true, address }, { status: 201 });
}
