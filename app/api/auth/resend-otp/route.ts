import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { ForgotPasswordSchema } from "@/lib/validations";
import { generateOtp, otpExpiry } from "@/lib/otp";
import { sendVerifyEmail } from "@/lib/mailer";

// Rate-limit: prevent hammering (1 OTP per 60 seconds)
const RESEND_COOLDOWN_MS = 60 * 1000;

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
      "+emailVerifyOtp +emailVerifyOtpExpires"
    );

    // Always return 200 to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message:
          "If an account exists with this email, a new OTP has been sent.",
      });
    }

    // Rate-limit check
    if (
      user.emailVerifyOtpExpires &&
      user.emailVerifyOtpExpires.getTime() - RESEND_COOLDOWN_MS * 9 > Date.now()
    ) {
      const secondsLeft = Math.ceil(
        (user.emailVerifyOtpExpires.getTime() - 9 * RESEND_COOLDOWN_MS - Date.now()) / 1000
      );
      return NextResponse.json(
        { error: `Please wait ${secondsLeft}s before requesting a new code.` },
        { status: 429 }
      );
    }

    const otp = generateOtp();
    user.emailVerifyOtp = otp;
    user.emailVerifyOtpExpires = otpExpiry();
    await user.save();

    await sendVerifyEmail(email, otp);

    return NextResponse.json({
      message: "If an account exists with this email, a new OTP has been sent.",
    });
  } catch (err) {
    console.error("[Resend OTP Error]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
