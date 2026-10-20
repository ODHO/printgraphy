"use client";

import { useState, useTransition, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white inline-block mr-2" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function ForgotPasswordContent() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.errors?.email) {
            setEmailError(data.errors.email[0]);
          } else {
            setError(data.error ?? "Something went wrong.");
          }
          return;
        }

        // Always show success regardless (prevent email enumeration)
        setSent(true);
        setTimeout(() => {
          router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}&mode=reset`);
        }, 2000);
      } catch {
        setError("Network error. Please check your connection.");
      }
    });
  };

  return (
    <div className="min-h-[calc(100vh-115px)] flex items-center justify-center relative py-12 px-4 overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image src="/banners/auth-banner.png" alt="Auth Background" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />
      </div>

      {/* Card */}
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-zinc-100/80 space-y-6 z-10 my-4">

        {sent ? (
          /* ── Success state ── */
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900">Check your inbox!</h2>
            <p className="text-base text-zinc-500 leading-relaxed">
              If an account exists for <span className="font-semibold text-zinc-800">{email}</span>, a reset code is on its way. Redirecting…
            </p>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            {/* Icon + heading */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-sky-50 text-[#064FE0] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-800 text-center leading-snug">
                Reset Your Password
              </h1>
              <p className="text-base sm:text-base text-zinc-600 text-center leading-relaxed">
                Enter your email and we&apos;ll send you a 6-digit reset code.
              </p>
            </div>

            {/* Global error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-base rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-base font-bold text-zinc-700">Email Address</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="hello@xprintz.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(""); setError(""); }}
                    required
                    disabled={isPending}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-base sm:text-base text-zinc-800 placeholder-zinc-400 focus:outline-none transition-all
                      ${emailError
                        ? "border border-red-300 bg-red-50 focus:border-red-400"
                        : "border border-zinc-200 focus:border-[#064FE0]"
                      }`}
                  />
                </div>
                {emailError && <p className="text-red-500 text-base mt-1">{emailError}</p>}
              </div>

              <button type="submit" disabled={isPending}
                className="w-full py-3.5 bg-[#064FE0] hover:bg-[#1e7ab0] disabled:opacity-70 text-white font-bold rounded-xl text-base transition-all duration-200 cursor-pointer shadow-md shadow-[#064FE0]/20 active:scale-[0.99] flex items-center justify-center">
                {isPending ? <><Spinner />Sending…</> : "Send Reset Code"}
              </button>

              <div className="text-center pt-2">
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

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordContent />
    </Suspense>
  );
}
