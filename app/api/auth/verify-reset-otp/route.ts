import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { VerifyResetOtpSchema } from "@/lib/validations";
import { isOtpExpired, generateOtp, otpExpiry } from "@/lib/otp";
import { signToken } from "@/lib/session";

// Reset token is itself a short-lived JWT (15 minutes), no DB storage needed
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = VerifyResetOtpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, otp } = result.data;

    await connectDB();

    const user = await User.findOne({ email }).select(
      "+passwordResetOtp +passwordResetOtpExpires"
    );

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 }
      );
    }

    if (!user.passwordResetOtp || !user.passwordResetOtpExpires) {
      return NextResponse.json(
        { error: "No reset code found. Please request a new one." },
        { status: 400 }
      );
    }

    if (isOtpExpired(user.passwordResetOtpExpires)) {
      return NextResponse.json(
        { error: "Reset code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (user.passwordResetOtp !== otp) {
      return NextResponse.json(
        { errors: { otp: ["Invalid reset code. Please try again."] } },
        { status: 400 }
      );
    }

    // OTP valid — clear it and issue a short-lived reset token (JWT, 15 min)
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;
    await user.save();

    // We reuse signToken but with a special scope claim; front-end passes it to /reset-password
    // Using a 15-minute token encoded in the userId field as "reset:userId"
    const resetToken = await signToken({
      userId: `reset:${String(user._id)}`,
      email: user.email,
      isVerified: user.isVerified,
    });

    return NextResponse.json({
      message: "OTP verified. You may now reset your password.",
      resetToken,
    });
  } catch (err) {
    console.error("[Verify Reset OTP Error]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
