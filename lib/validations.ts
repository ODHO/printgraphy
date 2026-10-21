import { z } from "zod";

// ─── Signup ───────────────────────────────────────────────────────────────────
export const SignupSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name too long")
      .trim(),
    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name too long")
      .trim(),
    email: z.email("Please enter a valid email address").trim().toLowerCase(),
    password: z
      .string()
      .min(8, "8 characters minimum")
      .regex(/[A-Z]/, "1 uppercase letter required")
      .regex(/[a-z]/, "1 lowercase letter required")
      .regex(/[0-9]/, "1 number required"),
    confirmPassword: z.string().optional(),
  })
  .refine((d) => !d.confirmPassword || d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof SignupSchema>;

// ─── Signin ───────────────────────────────────────────────────────────────────
export const SigninSchema = z.object({
  email: z.email("Please enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export type SigninInput = z.infer<typeof SigninSchema>;

// ─── Forgot Password ──────────────────────────────────────────────────────────
export const ForgotPasswordSchema = z.object({
  email: z.string().min(1, "Please enter your email or phone").trim(),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export const VerifyOtpSchema = z.object({
  email: z.email("Invalid email").trim().toLowerCase(),
  otp: z
    .string()
    .min(4, "OTP must be 4 digits")
    .max(6)
    .regex(/^\d+$/, "OTP must be numeric"),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

// ─── Verify Reset OTP ─────────────────────────────────────────────────────────
export const VerifyResetOtpSchema = z.object({
  email: z.email("Invalid email").trim().toLowerCase(),
  otp: z
    .string()
    .min(4, "OTP must be 4 digits")
    .max(6)
    .regex(/^\d+$/, "OTP must be numeric"),
});

export type VerifyResetOtpInput = z.infer<typeof VerifyResetOtpSchema>;

// ─── Reset Password ───────────────────────────────────────────────────────────
export const ResetPasswordSchema = z
  .object({
    resetToken: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "8 characters minimum")
      .regex(/[A-Z]/, "1 uppercase letter required")
      .regex(/[a-z]/, "1 lowercase letter required")
      .regex(/[0-9]/, "1 number required"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
