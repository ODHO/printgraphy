import { NextResponse } from "next/server";
import Vendor, { type IVendor } from "@/models/Vendor";
import { getSession } from "@/lib/session";

export async function requireVendor(): Promise<IVendor | NextResponse> {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const vendor = await Vendor.findOne({ email: session.email.toLowerCase() });
  if (!vendor) {
    return NextResponse.json({ success: false, message: "This account is not a vendor." }, { status: 403 });
  }
  return vendor;
}

export function isVendorError(result: IVendor | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
