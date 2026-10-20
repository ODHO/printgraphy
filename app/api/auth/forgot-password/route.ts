import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { ForgotPasswordSchema } from "@/lib/validations";
import { generateOtp, otpExpiry } from "@/lib/otp";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = ForgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = result.data;

    await connectDB();

    const user = await User.findOne({ email }).select(
      "+passwordResetOtp +passwordResetOtpExpires"
    );

    // Always return 200 to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message:
          "If an account exists with this email, a password reset code has been sent.",
      });
    }

    if (!user.isVerified) {
      return NextResponse.json(
        { error: "Please verify your email first before resetting your password." },
        { status: 403 }
      );
    }

    // Rate-limit: 1 OTP per 60 seconds
    if (
      user.passwordResetOtpExpires &&
      user.passwordResetOtpExpires.getTime() > Date.now() + 9 * 60 * 1000
    ) {
      return NextResponse.json(
        { error: "A reset code was recently sent. Please wait before requesting another." },
        { status: 429 }
      );
    }

    const otp = generateOtp();
    user.passwordResetOtp = otp;
    user.passwordResetOtpExpires = otpExpiry();
    await user.save();

    await sendPasswordResetEmail(email, otp);

    return NextResponse.json({
      message:
        "If an account exists with this email, a password reset code has been sent.",
      email,
    });
  } catch (err) {
    console.error("[Forgot Password Error]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
