"use client";

import { useState, useTransition, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNextPath } from "@/lib/accountGate";

// ─── Types ───────────────────────────────────────────────────────────────────
interface FieldErrors {
  firstName?: string[];
  lastName?: string[];
  email?: string[];
  password?: string[];
  confirmPassword?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ErrorMsg({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="text-red-500 text-base mt-1">{msgs[0]}</p>;
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

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white inline-block mr-2" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ─── Social Button ────────────────────────────────────────────────────────────
function SocialButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  const [showToast, setShowToast] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setShowToast(true); setTimeout(() => setShowToast(false), 2500); }}
        className="w-full py-3 px-4 border border-zinc-200 hover:border-zinc-300 rounded-xl text-base sm:text-base font-semibold text-zinc-700 flex items-center justify-center gap-3 bg-white transition-all hover:bg-zinc-50 cursor-pointer shadow-xs"
      >
        {icon}
        {label}
      </button>
      {showToast && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-base px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
          Coming soon!
        </div>
      )}
    </div>
  );
}

// ─── Google Icon ──────────────────────────────────────────────────────────────
const GoogleIcon = (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29A11.97 11.97 0 000 12c0 1.92.45 3.74 1.29 5.39l3.99-3.15z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z" />
  </svg>
);

const FacebookIcon = (
  <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// ─── SIGNUP FORM ──────────────────────────────────────────────────────────────
function accountNotice(notice: string | null) {
  if (notice === "draft") {
    return "Create an account to keep this design. After you register, it will be waiting in your drafts.";
  }
  if (notice === "paid") {
    return "Create an account before opening a paid template. You can finish registration and come back to it.";
  }
  if (notice === "checkout") {
    return "Create an account before checkout. Your saved design will be in your drafts after you register.";
  }
  return "";
}

function SignupForm({ onFlip }: { onFlip: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notice = accountNotice(searchParams.get("notice"));
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setGlobalError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalError("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await res.json();

        if (!res.ok && res.status !== 200) {
          if (data.errors) {
            setErrors(data.errors);
          } else {
            setGlobalError(data.error ?? "Something went wrong.");
          }
          return;
        }

        const next = new URLSearchParams({ email: form.email });
        const returnTo = searchParams.get("next");
        if (returnTo) next.set("next", returnTo);
        router.push(`/auth/verify-otp?${next.toString()}`);
      } catch {
        setGlobalError("Network error. Please check your connection.");
      }
    });
  };

  const inputCls =
    "w-full px-4 py-3 bg-[#e8e8e8]/70 focus:bg-white rounded-xl text-base sm:text-base text-zinc-800 placeholder-zinc-500 border border-transparent focus:border-[#064FE0] focus:outline-none transition-all";
  const inputErrCls =
    "w-full px-4 py-3 bg-red-50 rounded-xl text-base sm:text-base text-zinc-800 placeholder-zinc-500 border border-red-300 focus:border-red-400 focus:outline-none transition-all";

  return (
    <div className="w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-zinc-100/80 backface-hidden flex flex-col justify-between space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold text-zinc-800 text-center leading-snug">
        Sign Up With Printgraphy
      </h1>
      {notice && (
        <p className="text-base font-semibold text-[#1e7ab0] bg-sky-50 border border-sky-100 rounded-xl px-3 py-2 text-center">
          {notice}
        </p>
      )}

      {/* Social */}
      <div className="space-y-3">
        <SocialButton icon={GoogleIcon} label="Continue with Google" />
        <SocialButton icon={FacebookIcon} label="Continue with Facebook" />
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-zinc-200" />
        <span className="absolute bg-white px-3 text-base text-zinc-400 font-medium uppercase">Or</span>
      </div>

      {/* Global error */}
      {globalError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-base rounded-xl px-4 py-3">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              type="text"
              placeholder="First Name"
              value={form.firstName}
              onChange={set("firstName")}
              className={errors.firstName ? inputErrCls : inputCls}
              disabled={isPending}
            />
            <ErrorMsg msgs={errors.firstName} />
          </div>
          <div>
            <input
              type="text"
              placeholder="Last Name"
              value={form.lastName}
              onChange={set("lastName")}
              className={errors.lastName ? inputErrCls : inputCls}
              disabled={isPending}
            />
            <ErrorMsg msgs={errors.lastName} />
          </div>
        </div>

        {/* Email */}
        <div>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={set("email")}
            className={errors.email ? inputErrCls : inputCls}
            disabled={isPending}
          />
          <ErrorMsg msgs={errors.email} />
        </div>

        {/* Password */}
        <div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={set("password")}
              className={`${errors.password ? inputErrCls : inputCls} pr-10`}
              disabled={isPending}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
              <EyeIcon open={showPassword} />
            </button>
          </div>
          <ErrorMsg msgs={errors.password} />
        </div>

        {/* Confirm Password */}
        <div>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              className={`${errors.confirmPassword ? inputErrCls : inputCls} pr-10`}
              disabled={isPending}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
              <EyeIcon open={showConfirm} />
            </button>
          </div>
          <ErrorMsg msgs={errors.confirmPassword} />
        </div>

        {/* Terms */}
        <p className="text-base text-zinc-400 text-center leading-relaxed pt-1">
          By signing up, you agree to our{" "}
          <a href="/pages/terms-and-conditions" className="text-[#064FE0] hover:underline font-medium">Terms and Conditions</a>
        </p>

        {/* Submit */}
        <button type="submit" disabled={isPending}
          className="w-full py-3.5 bg-[#064FE0] hover:bg-[#1e7ab0] disabled:opacity-70 text-white font-bold rounded-xl text-base transition-all duration-200 cursor-pointer shadow-md shadow-[#064FE0]/20 active:scale-[0.99] flex items-center justify-center">
          {isPending ? <><Spinner />Creating Account…</> : "Create Account"}
        </button>

        <button type="button" onClick={onFlip} disabled={isPending}
          className="w-full py-3.5 border-2 border-[#064FE0] hover:bg-[#064FE0]/5 text-[#064FE0] font-bold rounded-xl text-base transition-all duration-200 cursor-pointer active:scale-[0.99]">
          Already have an account?
        </button>
      </form>
    </div>
  );
}

// ─── SIGNIN FORM ──────────────────────────────────────────────────────────────
function SigninForm({ onFlip }: { onFlip: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    email: searchParams.get("email") ?? "",
    password: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setGlobalError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalError("");
    setSuccessMsg("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.needsVerification) {
            const next = new URLSearchParams({ email: form.email });
            const returnTo = searchParams.get("next");
            if (returnTo) next.set("next", returnTo);
            router.push(`/auth/verify-otp?${next.toString()}`);
            return;
          }
          if (data.errors) {
            setErrors(data.errors);
          } else {
            setGlobalError(data.error ?? "Sign in failed.");
          }
          return;
        }

        setSuccessMsg(`Welcome back, ${data.user.firstName}!`);
        const destination = safeNextPath(searchParams.get("next"), "/");
        setTimeout(() => router.push(destination), 800);
      } catch {
        setGlobalError("Network error. Please check your connection.");
      }
    });
  };

  const inputWithIconCls =
    "w-full pl-10 pr-10 py-3 border border-zinc-200 focus:border-[#064FE0] rounded-xl text-base sm:text-base text-zinc-800 placeholder-zinc-400 focus:outline-none transition-all";
  const inputWithIconErrCls =
    "w-full pl-10 pr-10 py-3 border border-red-300 bg-red-50 focus:border-red-400 rounded-xl text-base sm:text-base text-zinc-800 placeholder-zinc-400 focus:outline-none transition-all";

  return (
    <div className="absolute inset-0 w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-zinc-100/80 backface-hidden rotate-y-180 flex flex-col justify-between space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold text-zinc-800 text-center leading-snug">
        Sign In To Your Account
      </h1>
      {accountNotice(searchParams.get("notice")) && (
        <p className="text-base font-semibold text-[#1e7ab0] bg-sky-50 border border-sky-100 rounded-xl px-3 py-2 text-center">
          {accountNotice(searchParams.get("notice"))}
        </p>
      )}

      {/* Social */}
      <div className="space-y-3">
        <SocialButton icon={GoogleIcon} label="Sign in with Google" />
        <SocialButton icon={FacebookIcon} label="Sign in with Facebook" />
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-zinc-200" />
        <span className="absolute bg-white px-3 text-base text-zinc-400 font-medium uppercase">Or</span>
      </div>

      {/* Global error */}
      {globalError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-base rounded-xl px-4 py-3">
          {globalError}
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
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
              value={form.email}
              onChange={set("email")}
              className={errors.email ? inputWithIconErrCls : inputWithIconCls}
              disabled={isPending}
            />
          </div>
          <ErrorMsg msgs={errors.email} />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-base font-bold text-zinc-700">Password</label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={form.password}
              onChange={set("password")}
              className={errors.password ? inputWithIconErrCls : inputWithIconCls}
              disabled={isPending}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
              <EyeIcon open={showPassword} />
            </button>
          </div>
          <ErrorMsg msgs={errors.password} />
        </div>

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between text-base pt-1">
          <label className="flex items-center gap-2 text-zinc-600 cursor-pointer">
            <input type="checkbox" className="rounded border-zinc-300 text-[#064FE0] focus:ring-[#064FE0]" />
            Remember me
          </label>
          <Link href="/auth/forget" className="text-[#064FE0] hover:underline font-medium">
            Forgot password?
          </Link>
        </div>

        {/* Terms */}
        <p className="text-base text-zinc-400 text-center leading-relaxed pt-1">
          By signing in, you agree to our{" "}
          <a href="#" className="text-[#064FE0] hover:underline font-medium">Terms and Conditions</a>
        </p>

        {/* Submit */}
        <button type="submit" disabled={isPending}
          className="w-full py-3.5 bg-[#064FE0] hover:bg-[#1e7ab0] disabled:opacity-70 text-white font-bold rounded-xl text-base transition-all duration-200 cursor-pointer shadow-md shadow-[#064FE0]/20 active:scale-[0.99] flex items-center justify-center">
          {isPending ? <><Spinner />Signing In…</> : "Sign In"}
        </button>

        <button type="button" onClick={onFlip} disabled={isPending}
          className="w-full py-3.5 border-2 border-[#064FE0] hover:bg-[#064FE0]/5 text-[#064FE0] font-bold rounded-xl text-base transition-all duration-200 cursor-pointer active:scale-[0.99]">
          Make an Account
        </button>
      </form>
    </div>
  );
}

// ─── PAGE CONTENT (needs Suspense for useSearchParams) ────────────────────────
function AuthPageContent() {
  const searchParams = useSearchParams();
  const initialFlipped = searchParams.get("tab") === "signin";
  const [isFlipped, setIsFlipped] = useState(initialFlipped);

  return (
    <div className="min-h-[calc(100vh-115px)] flex items-center justify-center relative py-12 px-4 overflow-hidden font-sans">

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image src="/banners/auth-banner.png" alt="Auth Background" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />
      </div>

      {/* 3D Flip Card */}
      <div className="w-full max-w-[480px] min-h-[640px] perspective-1000 z-10 my-4">
        <div className={`relative w-full h-full duration-700 transition-transform transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}>
          {/* Front — Signup */}
          <SignupForm onFlip={() => setIsFlipped(true)} />
          {/* Back — Signin */}
          <SigninForm onFlip={() => setIsFlipped(false)} />
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  );
}
