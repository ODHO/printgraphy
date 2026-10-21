"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNextPath } from "@/lib/accountGate";

export type AuthMode = "signin" | "signup" | "forgot" | "verify" | "reset";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29A11.97 11.97 0 000 12c0 1.92.45 3.74 1.29 5.39l3.99-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="w-5 h-5 text-[#292929]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-[#292929]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white inline-block mr-2" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function AuthFlow({
  initialMode = "signin",
}: {
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<AuthMode>(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "signup" || urlMode === "signin" || urlMode === "forgot" || urlMode === "verify" || urlMode === "reset") {
      return urlMode as AuthMode;
    }
    return initialMode;
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [toast, setToast] = useState("");

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password
  const [forgotInput, setForgotInput] = useState(() => searchParams.get("email") || "");

  // OTP 4 digits
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpMode, setOtpMode] = useState<"signup" | "reset">(() => (searchParams.get("mode") === "reset" ? "reset" : "signup"));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset password
  const [resetToken, setResetToken] = useState(() => searchParams.get("resetToken") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const showSocialToast = (msg = "Google login coming soon!") => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // ── Handle Sign In ──────────────────────────────────────────────────────────
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid email or password");
          return;
        }

        const queryNext = searchParams.get("next") || searchParams.get("redirect");
        let destination = "/dashboard";
        if (data.user?.isAdmin) {
          destination = queryNext?.startsWith("/admin") ? queryNext : "/admin";
        } else if (data.user?.isVendor) {
          destination = queryNext?.startsWith("/vendor") ? queryNext : "/vendor/dashboard";
        } else {
          // Customer: If next param was specified (e.g. checkout, cart, browsedesigns), send them there; otherwise default to customer portal
          destination = (queryNext && !queryNext.startsWith("/admin") && !queryNext.startsWith("/vendor"))
            ? safeNextPath(queryNext, "/dashboard")
            : "/dashboard";
        }

        router.push(destination);
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  };

  // ── Handle Sign Up ──────────────────────────────────────────────────────────
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!firstName.trim() || firstName.trim().length < 2) {
      setError("First name must be at least 2 characters");
      return;
    }
    if (!lastName.trim() || lastName.trim().length < 2) {
      setError("Last name must be at least 2 characters");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least 1 uppercase letter");
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least 1 lowercase letter");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least 1 number");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email, password, confirmPassword: password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.errors ? Object.values(data.errors).flat()[0] as string : data.error || "Failed to create account");
          return;
        }

        setOtpMode("signup");
        setOtp(["", "", "", ""]);
        setMode("verify");
      } catch {
        setError("Network error. Please try again.");
      }
    });
  };

  // ── Handle Forgot Password ──────────────────────────────────────────────────
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: forgotInput }),
        });
        await res.json();

        // Transition to OTP screen for reset
        setEmail(forgotInput);
        setOtpMode("reset");
        setOtp(["", "", "", ""]);
        setMode("verify");
      } catch {
        setError("Network error. Please try again.");
      }
    });
  };

  // ── Handle OTP verification ─────────────────────────────────────────────────
  const handleOtpChange = (index: number, val: string) => {
    if (val && !/^\d+$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val ? val.slice(-1) : "";
    setOtp(newOtp);
    setError("");
    if (val && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(paste)) return;
    const digits = paste.slice(0, 4).split("");
    const newOtp = ["", "", "", ""];
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(digits.length, 3)]?.focus();
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 4) {
      setError("Please enter all 4 digits.");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        const endpoint = otpMode === "reset" ? "/api/auth/verify-reset-otp" : "/api/auth/verify-email";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: code }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.errors?.otp?.[0] || data.error || "Verification failed");
          return;
        }

        if (otpMode === "reset") {
          setResetToken(data.resetToken || "");
          setMode("reset");
        } else {
          setSuccessMsg("Email verified! Redirecting to your dashboard…");
          const queryNext = searchParams.get("next") || searchParams.get("redirect");
          let destination = "/dashboard";
          if (data.user?.isAdmin) {
            destination = "/admin";
          } else if (data.user?.isVendor) {
            destination = "/vendor/dashboard";
          } else if (queryNext && !queryNext.startsWith("/admin") && !queryNext.startsWith("/vendor")) {
            destination = safeNextPath(queryNext, "/dashboard");
          }
          setTimeout(() => {
            router.push(destination);
            router.refresh();
          }, 1000);
        }
      } catch {
        setError("Network error. Please try again.");
      }
    });
  };

  // ── Handle Password Reset ───────────────────────────────────────────────────
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resetToken, password: newPassword, confirmPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to reset password");
          return;
        }

        setSuccessMsg("Password reset successfully! Please sign in.");
        setTimeout(() => {
          setMode("signin");
          setPassword("");
        }, 1200);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 bg-white sm:bg-zinc-50/30">
      <div className="w-full max-w-[480px] bg-white rounded-[32px] p-6 sm:p-10 md:p-12 shadow-[0_4px_32px_rgba(0,0,0,0.06)] border border-zinc-100/90 relative">
        {toast && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs py-1.5 px-4 rounded-full shadow-lg z-50 animate-bounce text-center max-w-xs">
            {toast}
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
            {successMsg}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 1: SIGN UP WITH YOUR PRINTGRAPHI ACCOUNT
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "signup" && (
          <div>
            <h1 className="text-center text-[26px] sm:text-[30px] font-bold text-[#292929] tracking-tight leading-[1.25] mb-8">
              Sign Up With Your Printgraphi Account.
            </h1>

            {/* Google Signup Button */}
            <button
              type="button"
              onClick={() => showSocialToast()}
              className="w-full py-3.5 sm:py-4 px-6 border border-zinc-200/90 rounded-full text-base font-medium text-[#292929] flex items-center justify-center gap-3.5 bg-white hover:bg-zinc-50/80 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer mb-8 sm:mb-9"
            >
              <GoogleIcon />
              <span className="text-[15px] sm:text-base font-medium">Sign Up With Google</span>
            </button>

            <h2 className="text-left text-lg sm:text-[20px] font-bold text-[#292929] mb-6">
              Or, sign up with email.
            </h2>

            <form onSubmit={handleSignUp} className="space-y-6">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full border-b border-zinc-300 py-3 px-1 text-[15px] sm:text-base text-[#292929] placeholder:text-[#71717A] focus:border-[#2196D2] focus:outline-none transition-colors bg-transparent"
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full border-b border-zinc-300 py-3 px-1 text-[15px] sm:text-base text-[#292929] placeholder:text-[#71717A] focus:border-[#2196D2] focus:outline-none transition-colors bg-transparent"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="relative">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border-b border-zinc-300 py-3 px-1 text-[15px] sm:text-base text-[#292929] placeholder:text-[#71717A] focus:border-[#2196D2] focus:outline-none transition-colors bg-transparent"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border-b border-zinc-300 py-3 pl-1 pr-10 text-[15px] sm:text-base text-[#292929] placeholder:text-[#71717A] focus:border-[#2196D2] focus:outline-none transition-colors bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[#292929] hover:opacity-70 transition-opacity cursor-pointer p-1"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              {/* Password Requirements Guide */}
              <div className="grid grid-cols-2 gap-x-6 text-[12px] sm:text-[13px] text-[#71717A] pt-0.5 leading-relaxed">
                <div>
                  <p>8 characters minimum</p>
                  <p>1 lowercase letter</p>
                </div>
                <div>
                  <p>1 uppercase letter</p>
                  <p>1 number</p>
                </div>
              </div>

              {/* Agreement Note */}
              <div className="text-center pt-3 pb-1">
                <p className="text-xs sm:text-[13px] text-[#71717A] leading-relaxed">
                  By signing in, you have read and agree to our
                </p>
                <Link
                  href="/pages/terms"
                  className="text-xs sm:text-[13px] text-[#2196D2] hover:underline font-normal inline-block mt-0.5"
                >
                  Printgraphi General Terms and Conditions
                </Link>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMode("signin");
                  }}
                  className="w-full py-4 px-6 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-2xl text-base sm:text-[17px] font-semibold text-[#2196D2] shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all cursor-pointer text-center"
                >
                  Sign In
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-4 px-6 bg-[#2196D2] hover:bg-[#1B85BD] text-white rounded-2xl text-base sm:text-[17px] font-semibold shadow-[0_6px_20px_rgba(33,150,210,0.35)] transition-all cursor-pointer text-center"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner /> Creating Account...
                    </span>
                  ) : (
                    "Make an Account"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 2: SIGN IN WITH YOUR PRINTGRAPHI ACCOUNT
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "signin" && (
          <div>
            <h1 className="text-center text-[26px] sm:text-[30px] font-bold text-[#292929] tracking-tight leading-[1.25] mb-8">
              Sign In With Your Printgraphi Account.
            </h1>

            {/* Google Continue Button */}
            <button
              type="button"
              onClick={() => showSocialToast()}
              className="w-full py-3.5 sm:py-4 px-6 border border-zinc-200/90 rounded-full text-base font-medium text-[#292929] flex items-center justify-center gap-3.5 bg-white hover:bg-zinc-50/80 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer mb-8 sm:mb-9"
            >
              <GoogleIcon />
              <span className="text-[15px] sm:text-base font-medium">Continue With Google</span>
            </button>

            <h2 className="text-left text-lg sm:text-[20px] font-bold text-[#292929] mb-6">
              Or, sign in with email.
            </h2>

            <form onSubmit={handleSignIn} className="space-y-6">
              {/* Email */}
              <div className="relative">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border-b border-zinc-300 py-3 px-1 text-[15px] sm:text-base text-[#292929] placeholder:text-[#71717A] focus:border-[#2196D2] focus:outline-none transition-colors bg-transparent"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border-b border-zinc-300 py-3 pl-1 pr-10 text-[15px] sm:text-base text-[#292929] placeholder:text-[#71717A] focus:border-[#2196D2] focus:outline-none transition-colors bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[#292929] hover:opacity-70 transition-opacity cursor-pointer p-1"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs sm:text-[13px] pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-[#2196D2] focus:ring-[#2196D2] cursor-pointer"
                  />
                  <span className="text-[#292929] underline underline-offset-2">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setForgotInput(email);
                    setMode("forgot");
                  }}
                  className="text-[#2196D2] hover:underline font-normal cursor-pointer"
                >
                  Forgot password ?
                </button>
              </div>

              {/* Agreement Note */}
              <div className="text-center pt-4 pb-1">
                <p className="text-xs sm:text-[13px] text-[#71717A] leading-relaxed">
                  By signing in, you have read and agree to our
                </p>
                <Link
                  href="/pages/terms"
                  className="text-xs sm:text-[13px] text-[#2196D2] hover:underline font-normal inline-block mt-0.5"
                >
                  Printgraphi General Terms and Conditions
                </Link>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-4 pt-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-4 px-6 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-2xl text-base sm:text-[17px] font-semibold text-[#2196D2] shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all cursor-pointer text-center"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner /> Signing In...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMode("signup");
                  }}
                  className="w-full py-4 px-6 bg-[#2196D2] hover:bg-[#1B85BD] text-white rounded-2xl text-base sm:text-[17px] font-semibold shadow-[0_6px_20px_rgba(33,150,210,0.35)] transition-all cursor-pointer text-center"
                >
                  Make an Account
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 3: VERIFY OTP (4 BOXES)
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "verify" && (
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#292929] tracking-tight leading-snug">
              Verify OTP
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#71717A] leading-relaxed">
              Now enter your 4 digit code we&apos;ve sent you on the<br />
              email <span className="text-[#2196D2] underline font-medium">{email || "abc123@gmail.com"}</span>
            </p>

            <form onSubmit={handleOtpVerify}>
              {/* 4 Light Sky Blue Boxes */}
              <div className="flex justify-center items-center gap-3 sm:gap-4 my-8">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#DDF0FB] border border-zinc-400 text-center text-2xl font-bold text-[#292929] focus:outline-none focus:ring-2 focus:ring-[#2196D2] focus:border-[#2196D2] focus:bg-white transition-all shadow-inner"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-4 px-6 bg-[#2196D2] hover:bg-[#1B85BD] text-white rounded-2xl text-base sm:text-[17px] font-semibold shadow-[0_6px_20px_rgba(33,150,210,0.35)] transition-all cursor-pointer text-center"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Verifying...
                  </span>
                ) : (
                  "Verify"
                )}
              </button>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMode(otpMode === "reset" ? "forgot" : "signup");
                  }}
                  className="text-xs sm:text-sm text-[#71717A] hover:text-[#292929] transition-colors cursor-pointer"
                >
                  ← Back to {otpMode === "reset" ? "Forgot Password" : "Sign Up"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 4: FORGET PASSWORD
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "forgot" && (
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#292929] tracking-tight leading-snug">
              Forget Password
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#71717A] font-normal">
              Don&apos;t worry We have got Your back
            </p>

            <form onSubmit={handleForgotSubmit} className="mt-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Email Or Phone"
                  value={forgotInput}
                  onChange={(e) => setForgotInput(e.target.value)}
                  required
                  className="w-full border-b border-zinc-300 py-3 px-1 text-[15px] sm:text-base text-[#292929] placeholder:text-[#71717A] focus:border-[#2196D2] focus:outline-none transition-colors bg-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-8 py-4 px-6 bg-[#2196D2] hover:bg-[#1B85BD] text-white rounded-2xl text-base sm:text-[17px] font-semibold shadow-[0_6px_20px_rgba(33,150,210,0.35)] transition-all cursor-pointer text-center"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Sending Code...
                  </span>
                ) : (
                  "Send Code"
                )}
              </button>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMode("signin");
                  }}
                  className="text-xs sm:text-sm text-[#71717A] hover:text-[#292929] transition-colors cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 5: RESET PASSWORD
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "reset" && (
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#292929] tracking-tight leading-snug">
              Reset Password
            </h1>

            <form onSubmit={handleResetSubmit} className="mt-8 space-y-6">
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full border-b border-zinc-300 py-3 pl-1 pr-10 text-[15px] sm:text-base text-[#292929] placeholder:text-[#71717A] focus:border-[#2196D2] focus:outline-none transition-colors bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  aria-label={showNewPass ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[#292929] hover:opacity-70 transition-opacity cursor-pointer p-1"
                >
                  <EyeIcon open={showNewPass} />
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full border-b border-zinc-300 py-3 pl-1 pr-10 text-[15px] sm:text-base text-[#292929] placeholder:text-[#71717A] focus:border-[#2196D2] focus:outline-none transition-colors bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  aria-label={showConfirmPass ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[#292929] hover:opacity-70 transition-opacity cursor-pointer p-1"
                >
                  <EyeIcon open={showConfirmPass} />
                </button>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-8 py-4 px-6 bg-[#2196D2] hover:bg-[#1B85BD] text-white rounded-2xl text-base sm:text-[17px] font-semibold shadow-[0_6px_20px_rgba(33,150,210,0.35)] transition-all cursor-pointer text-center"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </button>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMode("signin");
                  }}
                  className="text-xs sm:text-sm text-[#71717A] hover:text-[#292929] transition-colors cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
