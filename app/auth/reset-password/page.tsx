"use client";

import { useState, useTransition, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white inline-block mr-2" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 text-base transition-colors ${met ? "text-emerald-600 font-medium" : "text-zinc-400"}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={met ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
      </svg>
      {label}
    </span>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("resetToken") ?? "";

  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string[]; confirmPassword?: string[] }>({});
  const [globalError, setGlobalError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Redirect if no resetToken in URL
  if (!resetToken) {
    return (
      <div className="min-h-[calc(100vh-115px)] flex items-center justify-center relative py-12 px-4 font-sans">
        <div className="bg-white rounded-3xl p-10 shadow-2xl max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="font-bold text-zinc-900 text-lg">Invalid Reset Link</h2>
          <p className="text-base text-zinc-500">This link is invalid or has expired. Please start the password reset process again.</p>
          <Link href="/auth/forget" className="inline-block mt-2 text-base font-semibold text-[#064FE0] hover:underline">
            Request a new reset code →
          </Link>
        </div>
      </div>
    );
  }

  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^a-zA-Z0-9]/.test(password),
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalError("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resetToken, password, confirmPassword }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.errors) {
            setErrors(data.errors);
          } else {
            setGlobalError(data.error ?? "Something went wrong.");
          }
          return;
        }

        setSubmitted(true);
        setTimeout(() => router.push("/auth?tab=signin"), 2000);
      } catch {
        setGlobalError("Network error. Please check your connection.");
      }
    });
  };

  const inputCls = "w-full pl-10 pr-10 py-3 border border-zinc-200 focus:border-[#064FE0] rounded-xl text-base sm:text-base text-zinc-800 placeholder-zinc-400 focus:outline-none transition-all";
  const inputErrCls = "w-full pl-10 pr-10 py-3 border border-red-300 bg-red-50 focus:border-red-400 rounded-xl text-base sm:text-base text-zinc-800 placeholder-zinc-400 focus:outline-none transition-all";

  return (
    <div className="min-h-[calc(100vh-115px)] flex items-center justify-center relative py-12 px-4 overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image src="/banners/auth-banner.png" alt="Auth Background" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />
      </div>

      {/* Card */}
      <div className="w-full max-w-[460px] bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-zinc-100/80 space-y-6 z-10 my-4">

        {submitted ? (
          /* ── Success ── */
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900">Password Reset!</h2>
            <p className="text-base text-zinc-500">Your password has been updated. Redirecting to Sign In…</p>
          </div>
        ) : (
          <>
            {/* Icon + heading */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-sky-50 text-[#064FE0] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-800 leading-snug">
                Create New Password
              </h1>
              <p className="text-base sm:text-base text-zinc-600 leading-relaxed">
                Your new password must be different from previously used passwords.
              </p>
            </div>

            {/* Global error */}
            {globalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-base rounded-xl px-4 py-3">
                {globalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-base font-bold text-zinc-700">New Password</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                    required
                    disabled={isPending}
                    className={errors.password ? inputErrCls : inputCls}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-base mt-1">{errors.password[0]}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-base font-bold text-zinc-700">Confirm New Password</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                    required
                    disabled={isPending}
                    className={errors.confirmPassword ? inputErrCls : inputCls}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-base mt-1">{errors.confirmPassword[0]}</p>}
              </div>

              {/* Password Rules */}
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 space-y-1.5">
                <p className="font-semibold text-zinc-700 text-base">Password must contain:</p>
                <div className="grid grid-cols-2 gap-1 pt-0.5">
                  <PasswordRule met={rules.length} label="8+ characters" />
                  <PasswordRule met={rules.uppercase} label="1 uppercase" />
                  <PasswordRule met={rules.number} label="1 number" />
                  <PasswordRule met={rules.symbol} label="1 symbol" />
                </div>
              </div>

              <button type="submit" disabled={isPending}
                className="w-full py-3.5 bg-[#064FE0] hover:bg-[#1e7ab0] disabled:opacity-70 text-white font-bold rounded-xl text-base transition-all duration-200 cursor-pointer shadow-md shadow-[#064FE0]/20 active:scale-[0.99] flex items-center justify-center">
                {isPending ? <><Spinner />Resetting…</> : "Reset Password"}
              </button>

              <div className="text-center pt-1">
                <Link href="/auth" className="text-base font-semibold text-[#064FE0] hover:underline">
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
