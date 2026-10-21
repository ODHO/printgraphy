import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { VerifyOtpSchema } from "@/lib/validations";
import { isOtpExpired } from "@/lib/otp";
import { signToken, setSessionCookie } from "@/lib/session";
import { claimGuestWork } from "@/lib/claimGuest";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate
    const result = VerifyOtpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, otp } = result.data;

    await connectDB();

    // 2. Find user with OTP fields
    const user = await User.findOne({ email }).select(
      "+emailVerifyOtp +emailVerifyOtpExpires"
    );

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { message: "Email is already verified. You can sign in.", alreadyVerified: true },
        { status: 200 }
      );
    }

    // 3. Check OTP exists
    if (!user.emailVerifyOtp || !user.emailVerifyOtpExpires) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    // 4. Check expiry
    if (isOtpExpired(user.emailVerifyOtpExpires)) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // 5. Compare OTP (constant-time string compare via === is fine for 6-digit numeric)
    if (user.emailVerifyOtp !== otp) {
      return NextResponse.json(
        { errors: { otp: ["Invalid verification code. Please try again."] } },
        { status: 400 }
      );
    }

    // 6. Mark verified, clear OTP
    user.isVerified = true;
    user.emailVerifyOtp = undefined;
    user.emailVerifyOtpExpires = undefined;
    await user.save();

    // 7. Auto sign-in — issue session cookie with role claims
    const isAdmin = Boolean(user.isAdmin || user.role === "admin");
    const role = isAdmin ? "admin" : "customer";

    const token = await signToken({
      userId: String(user._id),
      email: user.email,
      isVerified: true,
      isAdmin,
      isVendor: false,
      role,
    });
    await setSessionCookie(token);
    await claimGuestWork(String(user._id), req.cookies.get("cart_session")?.value);

    return NextResponse.json({
      message: "Email verified successfully! You are now signed in.",
      user: {
        id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isAdmin,
        isVendor: false,
        role,
      },
      redirectTo: isAdmin ? "/admin" : "/",
    });
  } catch (err) {
    console.error("[Verify Email Error]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
