import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { SignupSchema } from "@/lib/validations";
import { generateOtp, otpExpiry } from "@/lib/otp";
import { sendVerifyEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate input
    const result = SignupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password } = result.data;

    await connectDB();

    // 2. Check for existing user
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.isVerified) {
        return NextResponse.json(
          { errors: { email: ["An account with this email already exists."] } },
          { status: 409 }
        );
      }
      // Unverified — resend OTP and let them verify
      const otp = generateOtp();
      existing.emailVerifyOtp = otp;
      existing.emailVerifyOtpExpires = otpExpiry();
      await existing.save();
      await sendVerifyEmail(email, otp);
      return NextResponse.json(
        {
          message: "Account already exists but is unverified. A new OTP has been sent.",
          email,
          needsVerification: true,
        },
        { status: 200 }
      );
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 4. Generate email verification OTP
    const otp = generateOtp();

    // 5. Save user
    await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      isVerified: false,
      emailVerifyOtp: otp,
      emailVerifyOtpExpires: otpExpiry(),
    });

    // 6. Send verification email
    await sendVerifyEmail(email, otp);

    return NextResponse.json(
      {
        message: "Account created! Please verify your email with the OTP we sent.",
        email,
        needsVerification: true,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Signup Error]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
