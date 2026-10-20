import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { ResetPasswordSchema } from "@/lib/validations";
import { verifyToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = ResetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { resetToken, password } = result.data;

    // 1. Verify the reset token
    const payload = await verifyToken(resetToken);
    if (!payload || !payload.userId.startsWith("reset:")) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please start over." },
        { status: 401 }
      );
    }

    const userId = payload.userId.replace("reset:", "");

    await connectDB();

    // 2. Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // 3. Hash the new password
    const passwordHash = await bcrypt.hash(password, 12);
    user.passwordHash = passwordHash;

    // 4. Clear any leftover reset fields
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;

    await user.save();

    return NextResponse.json({
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (err) {
    console.error("[Reset Password Error]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
