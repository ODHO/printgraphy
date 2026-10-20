import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  isVerified: boolean;

  // Admin access
  isAdmin: boolean;
  role: "customer" | "admin";

  // Email verification OTP
  emailVerifyOtp?: string;
  emailVerifyOtpExpires?: Date;

  // Password-reset OTP
  passwordResetOtp?: string;
  passwordResetOtpExpires?: Date;

  // Short-lived reset token issued after OTP validation
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;

  purchasedTemplates?: mongoose.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    isVerified: { type: Boolean, default: false },

    // Admin access
    isAdmin: { type: Boolean, default: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },

    // Email verification
    emailVerifyOtp: { type: String, select: false },
    emailVerifyOtpExpires: { type: Date, select: false },

    // Password reset
    passwordResetOtp: { type: String, select: false },
    passwordResetOtpExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetTokenExpires: { type: Date, select: false },

    purchasedTemplates: [{ type: Schema.Types.ObjectId, ref: "Template", default: [] }],
  },
  { timestamps: true }
);

// Prevent model re-compilation during hot-reload
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;

