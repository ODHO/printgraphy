import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vendor, { type IVendor } from "@/models/Vendor";
import { getSession } from "@/lib/session";

export async function requireVendor(): Promise<IVendor | NextResponse> {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  await dbConnect();
  const cleanEmail = session.email.trim().toLowerCase();

  // Case-insensitive email query
  let vendor = await Vendor.findOne({
    email: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
  });

  // If vendor profile does not exist yet for this account, auto-provision it
  if (!vendor) {
    try {
      vendor = await Vendor.create({
        name: `${cleanEmail.split("@")[0].toUpperCase()} Print Works`,
        contactName: cleanEmail.split("@")[0],
        email: cleanEmail,
        phone: "555-0199",
        status: "active",
        isAvailable: true,
        marketsCovered: ["All Markets"],
        categoriesFulfilled: ["Business Cards", "Post Cards", "Signs & Banners"],
      });
    } catch {
      vendor = await Vendor.findOne().sort({ createdAt: -1 });
    }
  }

  if (!vendor) {
    return NextResponse.json({ success: false, message: "Vendor facility could not be initialized." }, { status: 500 });
  }

  return vendor;
}

export function isVendorError(result: IVendor | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
