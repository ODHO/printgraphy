"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");

  return (
    <div className="min-h-screen bg-[#fbfaf7] font-sans flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-zinc-100 p-8 max-w-md w-full text-center space-y-6 shadow-xl shadow-zinc-900/5">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-2xl">
          ✓
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">Order Placed!</h1>
          <p className="text-base text-zinc-500 mt-1">
            Thank you for your order. We&apos;ve received your payment and started processing.
          </p>
        </div>

        {orderNumber && (
          <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
            <p className="text-base text-zinc-400 font-medium uppercase tracking-wider">Order Reference</p>
            <p className="text-lg font-black text-zinc-900 font-mono mt-0.5">{orderNumber}</p>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <Link
            href="/dashboard/orders"
            className="block w-full py-3 bg-zinc-900 hover:bg-zinc-700 text-white text-base font-bold rounded-xl transition-all shadow-lg shadow-zinc-900/10"
          >
            Track Your Order →
          </Link>
          <Link
            href="/"
            className="block w-full py-3 text-zinc-600 hover:text-zinc-900 text-base font-semibold transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
