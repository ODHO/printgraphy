"use client";

import { useState, useRef, useEffect, useTransition, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNextPath } from "@/lib/accountGate";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white inline-block mr-2" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const mode = searchParams.get("mode"); // "reset" or undefined

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(30);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((n) => n - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(paste)) return;
    const digits = paste.slice(0, 6).split("");
    const newOtp = [...otp];
    digits.forEach((d, i) => { newOtp[i] = d; });
    setOtp(newOtp);
    inputRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        // Choose endpoint based on mode
        const endpoint = mode === "reset" ? "/api/auth/verify-reset-otp" : "/api/auth/verify-email";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: code }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.errors?.otp?.[0] ?? data.error ?? "Verification failed.");
          return;
        }

        if (mode === "reset") {
          // Pass resetToken to the reset-password page
          router.push(`/auth/reset-password?resetToken=${encodeURIComponent(data.resetToken)}&email=${encodeURIComponent(email)}`);
        } else {
          setSuccessMsg("Email verified! Signing you in…");
          const destination = safeNextPath(searchParams.get("next"), "/dashboard");
          setTimeout(() => router.push(destination), 1000);
        }
      } catch {
        setError("Network error. Please try again.");
      }
    });
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    setError("");

    startResendTransition(async () => {
      try {
        const endpoint = mode === "reset" ? "/api/auth/forgot-password" : "/api/auth/resend-otp";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Could not resend code.");
          return;
        }

        setResendTimer(60);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setSuccessMsg("A new code has been sent.");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  };

  const isLoading = isPending || isResending;

  return (
    <div className="min-h-[calc(100vh-115px)] flex items-center justify-center relative py-12 px-4 overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image src="/banners/auth-banner.png" alt="Auth Background" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />
      </div>

      {/* Card */}
      <div className="w-full max-w-[460px] bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-zinc-100/80 space-y-6 z-10 my-4">

        {/* Icon + heading */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-sky-50 text-[#064FE0] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-800 leading-snug">
            {mode === "reset" ? "Enter Reset Code" : "Verify Your Email"}
          </h1>
          <p className="text-base sm:text-base text-zinc-600 leading-relaxed">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-zinc-800">{email || "your email"}</span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-base rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Success */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-base rounded-xl px-4 py-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP Inputs */}
          <div className="flex items-center justify-between gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={isLoading}
                className={`w-11 h-14 sm:w-13 sm:h-15 text-center text-xl font-bold text-zinc-900 rounded-xl focus:outline-none transition-all shadow-xs
                  ${error ? "bg-red-50 border border-red-300 focus:border-red-400"
                    : digit ? "bg-[#064FE0]/10 border-2 border-[#064FE0] text-[#064FE0]"
                      : "bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-[#064FE0]"
                  }`}
              />
            ))}
          </div>

          {/* Resend */}
          <div className="text-center text-base text-zinc-500 font-medium">
            Didn&apos;t receive the code?{" "}
            {resendTimer > 0 ? (
              <span className="text-zinc-400">Resend in <span className="font-bold text-zinc-700">{resendTimer}s</span></span>
            ) : (
              <button type="button" onClick={handleResend} disabled={isResending}
                className="text-[#064FE0] font-bold hover:underline cursor-pointer disabled:opacity-60">
                {isResending ? "Resending…" : "Resend Code"}
              </button>
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={isLoading}
            className="w-full py-3.5 bg-[#064FE0] hover:bg-[#1e7ab0] disabled:opacity-70 text-white font-bold rounded-xl text-base transition-all duration-200 cursor-pointer shadow-md shadow-[#064FE0]/20 active:scale-[0.99] flex items-center justify-center">
            {isPending ? <><Spinner />Verifying…</> : "Verify & Proceed"}
          </button>

          <div className="text-center pt-1">
            <Link href="/auth" className="text-base font-semibold text-[#064FE0] hover:underline">
              ← Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpContent />
    </Suspense>
  );
}
