"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.user) {
        throw new Error(data.message || "Invalid credentials.");
      }

      const vendorRes = await fetch("/api/vendor/profile");
      const vendorData = await vendorRes.json();
      if (!vendorRes.ok || !vendorData.success) {
        throw new Error("This account is not a vendor.");
      }

      localStorage.setItem("vendorId", vendorData.vendor._id);
      localStorage.setItem("vendorName", vendorData.vendor.name);
      router.push("/vendor/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-[#f8fbfd] text-zinc-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-zinc-200 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-xs">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <img src="/logo/logo.png" alt="Printgraphy Logo" className="h-10 w-auto mx-auto object-contain" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight pt-2">Vendor portal</h1>
          <p className="text-base text-zinc-500">Sign in with your vendor account</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-base rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1.5">Vendor email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@facility.com"
              className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#064FE0]"
            />
          </div>

          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#064FE0]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold text-base rounded-xl shadow-md shadow-[#064FE0]/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/" className="text-base text-zinc-500 hover:text-zinc-900 transition-colors">
            Back to Printgraphy
          </Link>
        </div>
      </div>
    </div>
  );
}
