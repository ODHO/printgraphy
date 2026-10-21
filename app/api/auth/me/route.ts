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
      "firstName lastName email phone city avatar isVerified isAdmin role createdAt purchasedTemplates"
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

    const isAdmin = Boolean(user.isAdmin || user.role === "admin");
    const vendor = await Vendor.exists({
      email: { $regex: new RegExp(`^${user.email.trim()}$`, "i") },
    });
    const isVendor = Boolean(vendor);
    const role = isAdmin ? "admin" : isVendor ? "vendor" : (user.role || "customer");

    return NextResponse.json({
      user: {
        id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || "",
        city: user.city || "",
        avatar: user.avatar || "",
        isVerified: user.isVerified,
        isAdmin,
        isVendor,
        role,
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

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.userId.startsWith("reset:")) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, phone, city, avatar } = body;

    await connectDB();

    const updateFields: Record<string, any> = {};
    if (typeof firstName === "string") updateFields.firstName = firstName.trim();
    if (typeof lastName === "string") updateFields.lastName = lastName.trim();
    if (typeof phone === "string") updateFields.phone = phone.trim();
    if (typeof city === "string") updateFields.city = city.trim();
    if (typeof avatar === "string") updateFields.avatar = avatar;

    const updatedUser = await User.findByIdAndUpdate(
      session.userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("firstName lastName email phone city avatar isVerified isAdmin role createdAt");

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: String(updatedUser._id),
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone || "",
        city: updatedUser.city || "",
        avatar: updatedUser.avatar || "",
        isVerified: updatedUser.isVerified,
        isAdmin: Boolean(updatedUser.isAdmin || updatedUser.role === "admin"),
        role: updatedUser.role || "customer",
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (err) {
    console.error("[Update Profile Error]", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}

