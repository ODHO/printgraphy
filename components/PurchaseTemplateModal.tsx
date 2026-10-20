"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface PurchaseTemplateModalProps {
  isOpen: boolean;
  template: {
    _id: string;
    title: string;
    description?: string;
    category: string;
    price: number;
    thumbnail?: string;
    canvas_config?: any;
    canvasConfig?: any;
  } | null;
  onClose: () => void;
  onSuccess: (result: { designId: string; template: any }) => void;
}

// ── Inner Stripe Payment Form ────────────────────────────────────
function StripeTemplatePaymentForm({
  template,
  paymentIntentId,
  price,
  onSuccess,
}: {
  template: any;
  paymentIntentId: string;
  price: number;
  onSuccess: (result: { designId: string; template: any }) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [purchased, setPurchased] = useState(false);

  // Submit via Stripe Elements
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (stripeError) {
        setErrorMsg(stripeError.message || "Stripe payment failed.");
        setLoading(false);
        return;
      }

      // Finalize unlock & save to dashboard on backend
      const res = await fetch(`/api/templates/${template._id}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: paymentIntent?.id || paymentIntentId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to finalize template unlock.");
      }

      setPurchased(true);
      setTimeout(() => {
        onSuccess({
          designId: data.designId,
          template: data.template || template,
        });
      }, 1200);
    } catch (err: any) {
      console.error("Payment confirmation error:", err);
      setErrorMsg(err.message || "Payment could not be processed.");
    } finally {
      setLoading(false);
    }
  };

  // Instant test-mode bypass option
  const handleInstantTestUnlock = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/templates/${template._id}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: `pi_mock_${Date.now()}`,
          mockPayment: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Instant unlock failed.");
      }

      setPurchased(true);
      setTimeout(() => {
        onSuccess({
          designId: data.designId,
          template: data.template || template,
        });
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Instant unlock failed.");
    } finally {
      setLoading(false);
    }
  };

  if (purchased) {
    return (
      <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h4 className="text-base font-bold text-white">Payment Successful!</h4>
        <p className="text-base text-zinc-400">Template has been unlocked and saved to your dashboard. Opening studio...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Stripe Payment Element */}
      <div className="p-3 bg-zinc-900/90 rounded-2xl border border-zinc-800">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {/* Error display */}
      {errorMsg && (
        <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-base flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Pay Button */}
      <button
        type="submit"
        disabled={loading || !stripe || !elements}
        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-base rounded-2xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            <span>Processing with Stripe...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-zinc-950" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Pay ${price.toFixed(2)} & Unlock Template</span>
          </>
        )}
      </button>

      {/* Test-Mode 1-Click Option */}
      <div className="pt-1 flex items-center justify-between text-base text-zinc-500">
        <span>Stripe Test Card: 4242...</span>
        <button
          type="button"
          onClick={handleInstantTestUnlock}
          disabled={loading}
          className="text-amber-400 hover:underline font-semibold cursor-pointer"
        >
          ⚡ Instant Test Unlock (1-Click)
        </button>
      </div>
    </form>
  );
}

// ── Main Modal Component ─────────────────────────────────────────
export default function PurchaseTemplateModal({
  isOpen,
  template,
  onClose,
  onSuccess,
}: PurchaseTemplateModalProps) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string>("");
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [requireLogin, setRequireLogin] = useState(false);

  // Initialize Payment Intent when modal opens
  useEffect(() => {
    if (!isOpen || !template) {
      setClientSecret(null);
      setPaymentIntentId("");
      setInitError(null);
      setRequireLogin(false);
      return;
    }

    setInitLoading(true);
    setInitError(null);
    setRequireLogin(false);

    fetch(`/api/templates/${template._id}/payment-intent`, {
      method: "POST",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          if (data.requireLogin) {
            setRequireLogin(true);
          } else {
            setInitError(data.message || "Failed to initialize payment session.");
          }
          return;
        }
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
      })
      .catch((err) => {
        console.error("Payment intent init error:", err);
        setInitError("Network error while connecting to payment service.");
      })
      .finally(() => setInitLoading(false));
  }, [isOpen, template?._id]);

  if (!isOpen || !template) return null;

  const canvasCfg = template.canvas_config || template.canvasConfig || {
    width: 105,
    height: 60,
    unit: "mm",
    orientation: "landscape",
  };
  const aspect = (canvasCfg.width || 105) / (canvasCfg.height || 60);
  const price = Number(template.price) || 0;

  const handleGoToLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    router.push(`/auth/signin?redirect=${encodeURIComponent(currentPath)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="relative w-full max-w-lg my-8 bg-[#18181b] border border-zinc-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-[#064FE0]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Unlock Premium Template</h3>
            <p className="text-base text-zinc-400">One-time purchase • Lifetime access & customization</p>
          </div>
        </div>

        {/* Template Preview Box */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row items-center gap-4">
          <div
            className="w-full sm:w-44 shrink-0 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center relative shadow-inner"
            style={{ aspectRatio: `${aspect}` }}
          >
            {template.thumbnail ? (
              <img
                src={template.thumbnail}
                alt={template.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-zinc-600 text-base font-bold uppercase tracking-wider">
                {template.category}
              </div>
            )}
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-base font-black bg-amber-500 text-white shadow">
              PRO
            </span>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <span className="inline-block px-2 py-0.5 rounded-md text-base font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 mb-1">
              {template.category}
            </span>
            <h4 className="font-extrabold text-base text-white truncate">{template.title}</h4>
            <p className="text-base text-zinc-400 mt-0.5">
              Dimensions: {canvasCfg.width} × {canvasCfg.height} {canvasCfg.unit}
            </p>
            <div className="mt-2 text-2xl font-black text-amber-400 tracking-tight">
              ${price.toFixed(2)}
            </div>
          </div>
        </div>

        {/* What's included checklist */}
        <div className="space-y-1.5 mb-5 text-base text-zinc-300 bg-white/5 border border-white/5 rounded-2xl p-3.5">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Full 2D vector & 3D realistic studio customization</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span><strong className="text-white">Auto-saved to your dashboard</strong> for anytime re-edits</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Commercial license & high-res print readiness</span>
          </div>
        </div>

        {/* Content States: Require Login, Error, Loading, or Stripe Elements Form */}
        {requireLogin ? (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 text-center space-y-3">
            <p className="text-base font-semibold text-zinc-200">
              Please sign in to complete your template purchase.
            </p>
            <button
              onClick={handleGoToLogin}
              className="w-full py-3 bg-[#064FE0] hover:bg-[#287ba8] text-white font-bold text-base rounded-xl transition-all shadow-md cursor-pointer"
            >
              Sign In to Your Account →
            </button>
          </div>
        ) : initLoading ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-base text-zinc-400 font-medium">Securing Stripe Checkout Session...</p>
          </div>
        ) : initError ? (
          <div className="space-y-3">
            <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-base flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{initError}</span>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-base font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        ) : clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: {
                  colorPrimary: "#f59e0b",
                  colorBackground: "#27272a",
                  colorText: "#ffffff",
                  colorDanger: "#f87171",
                  borderRadius: "14px",
                },
              },
            }}
          >
            <StripeTemplatePaymentForm
              template={template}
              paymentIntentId={paymentIntentId}
              price={price}
              onSuccess={onSuccess}
            />
          </Elements>
        ) : null}

        <p className="text-base text-zinc-500 text-center mt-3">
          Secured with 256-bit encryption by Stripe. Instant activation upon purchase.
        </p>
      </div>
    </div>
  );
}
