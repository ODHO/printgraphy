import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Vendor from "@/models/Vendor";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userId.startsWith("reset:")) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.userId).select(
      "firstName lastName email isVerified isAdmin role createdAt purchasedTemplates"
    );

    if (!user) {
      const response = NextResponse.json(
        { error: "User not found.", redirect: "/auth/signin" },
        { status: 401 }
      );
      response.cookies.set("xprintz_session", "", { expires: new Date(0), path: "/" });
      response.cookies.set("token", "", { expires: new Date(0), path: "/" });
      return response;
    }

    const vendor = await Vendor.exists({ email: user.email.toLowerCase() });

    return NextResponse.json({
      user: {
        id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: Boolean(user.isAdmin || user.role === "admin"),
        isVendor: Boolean(vendor),
        createdAt: user.createdAt,
        purchasedTemplates: (user.purchasedTemplates || []).map((id: any) => String(id)),
      },
    });
  } catch (err) {
    console.error("[Me Error]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
