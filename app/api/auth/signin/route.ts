import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Vendor from "@/models/Vendor";
import { SigninSchema } from "@/lib/validations";
import { signToken, setSessionCookie } from "@/lib/session";
import { claimGuestWork } from "@/lib/claimGuest";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate input
    const result = SigninSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    await connectDB();

    // 2. Find user — explicitly select passwordHash
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      return NextResponse.json(
        { errors: { email: ["No account found with this email address."] } },
        { status: 401 }
      );
    }

    // 3. Check password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { errors: { password: ["Incorrect password. Please try again."] } },
        { status: 401 }
      );
    }

    // 4. Require email verification
    if (!user.isVerified) {
      return NextResponse.json(
        {
          error: "Please verify your email before signing in.",
          email,
          needsVerification: true,
        },
        { status: 403 }
      );
    }

    // 5. Determine role & permissions
    const isAdmin = Boolean(user.isAdmin || user.role === "admin");
    const vendor = await Vendor.exists({
      email: { $regex: new RegExp(`^${user.email.trim()}$`, "i") },
    });
    const isVendor = Boolean(vendor);
    const role = isAdmin ? "admin" : isVendor ? "vendor" : "customer";

    // 6. Issue JWT session cookie with role claims
    const token = await signToken({
      userId: String(user._id),
      email: user.email,
      isVerified: user.isVerified,
      isAdmin,
      isVendor,
      role,
    });

    await setSessionCookie(token);
    await claimGuestWork(String(user._id), req.cookies.get("cart_session")?.value);

    return NextResponse.json({
      message: "Signed in successfully.",
      user: {
        id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isAdmin,
        isVendor,
        role,
      },
      redirectTo: isAdmin ? "/admin" : isVendor ? "/vendor/dashboard" : "/",
    });
  } catch (err) {
    console.error("[Signin Error]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
