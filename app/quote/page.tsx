"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const CATEGORIES = [
  "Custom Packaging & Boxes",
  "Bulk Print & Collateral",
  "Sourcing & Apparel",
  "Large Format & Signs",
  "Labels & Stickers",
  "Other Special Request",
];

function CustomQuoteFormContent() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    contactName: "",
    email: "",
    companyName: "",
    phone: "",
    category: CATEGORIES[0],
    quantity: "500",
    targetTimeline: "2-3 weeks",
    description: "",
  });

  useEffect(() => {
    const qtyParam = searchParams?.get("quantity");
    const specsParam = searchParams?.get("specs");
    if (qtyParam || specsParam) {
      let descText = "";
      if (specsParam) {
        try {
          const parsed = JSON.parse(specsParam);
          const parts = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`);
          if (parts.length > 0) {
            descText = `Selected Specifications:\n` + parts.join("\n");
          }
        } catch {
          /* ignore */
        }
      }
      setForm((prev) => ({
        ...prev,
        category: "Bulk Print & Collateral",
        quantity: qtyParam || prev.quantity,
        description: descText || prev.description,
      }));
    }
  }, [searchParams]);

  const [submitting, setSubmitting] = useState(false);
  const [submittedQuote, setSubmittedQuote] = useState<{ referenceNumber: string } | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to submit quote request.");

      setSubmittedQuote(data.quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-zinc-900 pb-20">
      {/* Header Bar */}
      {/* <div className="bg-white border-b border-zinc-200">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-block">
            <img src="/logo/logo.png" alt="Printgraphy Logo" className="h-10 w-auto mx-auto object-contain" />
          </Link>
          <Link href="/browsedesigns" className="text-base font-semibold text-zinc-500 hover:text-zinc-900">
            Catalog →
          </Link>
        </div>
      </div> */}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {submittedQuote ? (
          <div className="bg-white rounded-3xl border border-zinc-200 p-8 sm:p-12 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <div>
              <h1 className="text-2xl font-black text-zinc-900">Quote Request Submitted</h1>
              <p className="text-base text-zinc-500 mt-1">
                Our sourcing specialists will review your requirements and respond within 24 hours.
              </p>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
              <p className="text-base text-zinc-400 font-medium uppercase tracking-wider">Quote Reference Number</p>
              <p className="text-xl font-black text-zinc-900 font-mono mt-0.5">{submittedQuote.referenceNumber}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/dashboard" className="flex-1 py-3 bg-zinc-900 text-white text-base font-bold rounded-xl text-center">
                View in Dashboard
              </Link>
              <Link href="/" className="flex-1 py-3 border border-zinc-200 text-zinc-700 text-base font-bold rounded-xl text-center">
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 space-y-8 shadow-sm">
            <div>
              <span className="px-3 py-1 bg-zinc-100 text-zinc-700 text-base font-bold uppercase tracking-wider rounded-full">
                Custom Orders
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 mt-2">Request a Custom Quote</h1>
              <p className="text-base sm:text-base text-zinc-500 mt-1">
                Need custom packaging, bulk sourcing, or specialized print specs? Submit your request below.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-base font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1.5">Project Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-base text-zinc-900 font-medium focus:outline-none focus:border-zinc-900 transition-all cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1.5">Estimated Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.quantity}
                    onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:border-zinc-900 transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1.5">Project Specs & Description *</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your dimensions, materials, finish, colors, and target deliverable requirements..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-base text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition-all resize-none"
                />
              </div>

              {/* Timeline */}
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1.5">Target Delivery Timeline</label>
                <input
                  type="text"
                  value={form.targetTimeline}
                  onChange={(e) => setForm((prev) => ({ ...prev, targetTimeline: e.target.value }))}
                  placeholder="e.g. 2-3 weeks, or Rush by Oct 15"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:border-zinc-900 transition-all"
                />
              </div>

              {/* Contact Info */}
              <div className="border-t border-zinc-100 pt-6 space-y-4">
                <h3 className="text-base font-bold text-zinc-400 uppercase tracking-wider">Contact Information</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-base font-bold text-zinc-700 block mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={form.contactName}
                      onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="text-base font-bold text-zinc-700 block mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="text-base font-bold text-zinc-700 block mb-1.5">Company Name</label>
                    <input
                      type="text"
                      value={form.companyName}
                      onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="text-base font-bold text-zinc-700 block mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-base text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-700 text-white font-bold text-base rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-60"
              >
                {submitting ? "Submitting Request..." : "Submit Quote Request →"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomQuotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#ffffff] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-[#329AD4] rounded-full animate-spin" />
      </div>
    }>
      <CustomQuoteFormContent />
    </Suspense>
  );
}
