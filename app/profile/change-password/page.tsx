"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function ChangePasswordPage() {
  const router = useRouter();

  // User state
  const [userEmail, setUserEmail] = useState("");
  const [fetchingUser, setFetchingUser] = useState(true);

  // Form Mode: "normal" (with current password) or "forgot_otp" (reset via email code)
  const [mode, setMode] = useState<"normal" | "forgot_otp">("normal");

  // Input states
  const [currentPassword, setCurrentPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Toggle password visibility
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Loading & status states
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Fetch logged-in user email on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      })
      .then((data) => {
        if (data.user?.email) {
          setUserEmail(data.user.email);
        }
      })
      .catch(() => {
        router.replace("/auth?tab=signin");
      })
      .finally(() => setFetchingUser(false));
  }, [router]);

  // Handler to trigger sending OTP email
  const handleSendResetEmail = async () => {
    if (!userEmail) return;
    setError("");
    setInfoMessage("");
    setSendingOtp(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset code.");
      }

      setMode("forgot_otp");
      setInfoMessage(`We've sent a 6-digit verification code to ${userEmail}. Please check your inbox.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error sending email code.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Submit standard password update (with current password)
  const handleNormalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update password.");
      }

      setSuccess("Your password has been changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Submit password reset via OTP code
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otpCode || otpCode.trim().length < 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Verify OTP to obtain reset token
      const verifyRes = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, otp: otpCode.trim() }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.resetToken) {
        throw new Error(verifyData.error || verifyData.errors?.otp?.[0] || "Invalid or expired reset code.");
      }

      // Step 2: Perform password reset using reset token
      const resetRes = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken: verifyData.resetToken,
          password: newPassword,
          confirmPassword: confirmPassword,
        }),
      });

      const resetData = await resetRes.json();
      if (!resetRes.ok) {
        throw new Error(resetData.error || "Failed to reset password.");
      }

      setSuccess("Password reset successfully! You can now use your new password.");
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      setInfoMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingUser) {
    return (
      <div className="min-h-screen bg-[#f8fbfd] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fbfd] font-sans text-zinc-900 pb-20">
      {/* Top Navbar */}
      <div className="bg-white border-b border-zinc-200/80">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image src="/logo/logo.png" alt="Printgraphy Logo" width={140} height={36} className="h-8 w-auto object-contain" />
            </Link>
            <span className="text-zinc-300">/</span>
            <Link href="/profile" className="text-base font-semibold text-zinc-500 hover:text-zinc-800 transition-colors">
              Profile
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-base font-bold text-zinc-800">Change Password</span>
          </div>

          <Link
            href="/profile"
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-sm font-bold rounded-xl transition-all"
          >
            ← Back to Profile
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto px-4 sm:px-6 pt-10">
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs p-6 sm:p-8 space-y-6">
          
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#064FE0] flex items-center justify-center mx-auto text-xl border border-sky-100">
              🔒
            </div>
            <h1 className="text-xl font-bold text-zinc-900 pt-2">
              {mode === "normal" ? "Change Account Password" : "Reset Password via Email"}
            </h1>
            <p className="text-sm text-zinc-500">
              {mode === "normal"
                ? "Enter your current password and choose a new one."
                : `We'll verify your email code sent to ${userEmail}`}
            </p>
          </div>

          {/* Info Banner */}
          {infoMessage && (
            <div className="p-4 bg-sky-50 border border-sky-200 text-sky-800 rounded-2xl text-sm leading-relaxed flex items-start gap-2">
              <span className="text-base">📧</span>
              <div>{infoMessage}</div>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>✓</span> {success}
              </div>
              <p className="text-xs text-emerald-700">
                Your password update is complete.
              </p>
              <div className="pt-2">
                <Link
                  href="/profile"
                  className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Return to Profile →
                </Link>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-2xl flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* MODE 1: Standard Password Update */}
          {mode === "normal" && (
            <form onSubmit={handleNormalSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-zinc-700 block">
                    Current Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={sendingOtp}
                    className="text-xs font-bold text-[#064FE0] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {sendingOtp ? "Sending code..." : "Forgot password?"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    required
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#064FE0] transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showCurrent ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-sm font-bold text-zinc-700 block mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    required
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#064FE0] transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showNew ? "Hide" : "Show"}
                  </button>
                </div>
                <span className="text-[11px] text-zinc-400 mt-1 block">Must be minimum 6 characters.</span>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="text-sm font-bold text-zinc-700 block mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    required
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#064FE0] transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>

              {/* Alternative prompt */}
              <div className="pt-2 text-center border-t border-zinc-100">
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={sendingOtp}
                  className="text-xs text-zinc-500 hover:text-[#064FE0] font-medium transition-colors cursor-pointer"
                >
                  Don&apos;t remember your password? <span className="font-bold underline">Send Reset Email →</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: Reset Password via Email OTP */}
          {mode === "forgot_otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              {/* 6-Digit Email Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-zinc-700 block">
                    6-Digit Email Code *
                  </label>
                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={sendingOtp}
                    className="text-xs font-bold text-[#064FE0] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {sendingOtp ? "Resending..." : "Resend Code"}
                  </button>
                </div>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 123456"
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest text-zinc-900 focus:outline-none focus:border-[#064FE0] transition-colors"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">Check your inbox ({userEmail}) for the 6-digit reset code.</span>
              </div>

              {/* New Password */}
              <div>
                <label className="text-sm font-bold text-zinc-700 block mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    required
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#064FE0] transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showNew ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="text-sm font-bold text-zinc-700 block mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    required
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#064FE0] transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Verifying & Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>

              {/* Back to normal mode */}
              <div className="pt-2 text-center border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setMode("normal");
                    setError("");
                    setInfoMessage("");
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-800 font-medium transition-colors cursor-pointer"
                >
                  ← I know my current password
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
