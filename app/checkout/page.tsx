"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Link from "next/link";
import { registerHref, viewerIsSignedIn } from "@/lib/accountGate";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

// ── Address form ──────────────────────────────────────────────
interface ShippingAddr {
  name: string; line1: string; line2: string;
  city: string; state: string; zip: string; country: string; phone: string;
}

const EMPTY_ADDR: ShippingAddr = { name: "", line1: "", line2: "", city: "", state: "", zip: "", country: "US", phone: "" };

interface SavedAddress {
  _id: string; label: string; name: string; line1: string; line2?: string;
  city: string; state: string; zip: string; country: string; isDefault: boolean;
}

// ── Inner checkout form (inside <Elements>) ───────────────────
function CheckoutForm({
  paymentIntentId,
  shippingAddress,
  total,
}: {
  paymentIntentId: string;
  shippingAddress: ShippingAddr;
  total: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError("");

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed.");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      // Confirm order in our DB
      const res = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId, shippingAddress }),
      });
      const data = await res.json();

      if (data.success) {
        router.push(`/checkout/success?order=${data.order.orderNumber}`);
      } else {
        setError("Payment succeeded but order creation failed. Contact support.");
      }
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["card"],
        }}
      />
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-base">{error}</div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-700 text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-zinc-900/10 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${total.toFixed(2)}`
        )}
      </button>
    </form>
  );
}

// ── Test/Demo Checkout Form (when Stripe API is unconfigured or in test mode) ──
function MockCheckoutForm({
  paymentIntentId,
  shippingAddress,
  total,
}: {
  paymentIntentId: string;
  shippingAddress: ShippingAddr;
  total: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId, shippingAddress }),
      });
      const data = await res.json();

      if (data.success && data.order) {
        router.push(`/checkout/success?order=${data.order.orderNumber}`);
      } else {
        setError(data.message || "Failed to create order. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 text-base text-sky-800 space-y-1">
        <p className="font-bold text-sky-900">💳 Instant Payment & Test Mode Active</p>
        <p>Click below to complete your print order and generate a live order tracking reference.</p>
      </div>
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-base">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-700 text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-zinc-900/10 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing Order...
          </>
        ) : (
          `Complete Order ($${total.toFixed(2)}) →`
        )}
      </button>
    </form>
  );
}

// ── Main checkout page ────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<"address" | "payment">("address");
  const [addr, setAddr] = useState<ShippingAddr>(EMPTY_ADDR);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [saveAddr, setSaveAddr] = useState(false);

  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [isMock, setIsMock] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const [creatingIntent, setCreatingIntent] = useState(false);
  const [initError, setInitError] = useState("");

  const [cartItems, setCartItems] = useState<{ _id: string; name: string; thumbnail?: string; price: number; quantity: number }[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);

  useEffect(() => {
    viewerIsSignedIn().then((signedIn) => {
      if (!signedIn) router.replace(registerHref("/checkout", "checkout"));
    });
  }, [router]);

  // Load saved addresses and active cart items & dynamic totals
  useEffect(() => {
    Promise.all([
      fetch("/api/addresses").then((r) => r.json()),
      fetch("/api/cart").then((r) => r.json()),
    ])
      .then(([addrData, cartData]) => {
        if (addrData.success && addrData.addresses?.length > 0) {
          setSavedAddresses(addrData.addresses);
          const def = addrData.addresses.find((a: SavedAddress) => a.isDefault) ?? addrData.addresses[0];
          setAddr({ name: def.name, line1: def.line1, line2: def.line2 ?? "", city: def.city, state: def.state, zip: def.zip, country: def.country, phone: "" });
        }

        if (cartData.success && cartData.cart) {
          const items = cartData.cart.items || [];
          setCartItems(items);

          const calculatedSubtotal = items.reduce(
            (acc: number, item: { price: number; quantity: number }) => acc + (item.price || 0) * (item.quantity || 1),
            0
          );
          const calculatedShipping = calculatedSubtotal >= 50 || items.length === 0 ? 0 : 5.99;
          const calculatedTotal = calculatedSubtotal + calculatedShipping;

          setSubtotal(calculatedSubtotal);
          setShippingCost(calculatedShipping);
          setTotalAmount(calculatedTotal);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCart(false));
  }, []);

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitError("");
    setCreatingIntent(true);

    // Optionally save address
    if (saveAddr) {
      fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addr, label: "Saved" }),
      }).catch(() => {});
    }

    // Create payment intent
    const res = await fetch("/api/checkout/session", { method: "POST" });
    const data = await res.json();

    if (!data.success) {
      setInitError(data.message ?? "Failed to start checkout. Make sure your cart isn't empty.");
      setCreatingIntent(false);
      return;
    }

    
    setClientSecret(data.clientSecret);
    setPaymentIntentId(data.paymentIntentId);
    setIsMock(Boolean(data.isMock));
    setSubtotal(data.subtotal);
    setShippingCost(data.shippingCost);
    setTotalAmount(data.totalAmount);
    setStep("payment");
    setCreatingIntent(false);
  };

  const field = (label: string, key: keyof ShippingAddr, placeholder = "", half = false) => (
    <div className={half ? "col-span-1" : "col-span-2"}>
      <label className="text-base font-semibold text-zinc-600 block mb-1.5">{label}</label>
      <input
        type="text"
        required={key !== "line2" && key !== "phone"}
        value={addr[key]}
        onChange={(e) => setAddr((prev) => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-base text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-all"
      />
    </div>
  );

  const isMockPayment = isMock || !clientSecret || clientSecret.includes("mock") || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_51...");

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/" className="inline-block">
            <img src="/logo/logo.png" alt="Printgraphy Logo" className="h-10 w-auto mx-auto object-contain" />
          </Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-base font-semibold text-zinc-600">Checkout</h1>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-base font-semibold">
          {[
            { key: "address", label: "Shipping" },
            { key: "payment", label: "Payment" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <span className="text-zinc-300">›</span>}
              <span className={step === s.key || (s.key === "address" && step === "payment") ? "text-zinc-900" : "text-zinc-400"}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left — Form */}
          <div className="lg:col-span-7 space-y-6">

            {/* ── STEP 1: Address ── */}
            {step === "address" && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="text-base font-bold text-zinc-900 mb-5">Shipping Address</h2>

                {/* Saved Addresses */}
                {savedAddresses.length > 0 && (
                  <div className="mb-5 space-y-2">
                    <p className="text-base font-semibold text-zinc-500 uppercase tracking-wide">Saved Addresses</p>
                    <div className="grid gap-2">
                      {savedAddresses.map((a) => (
                        <button
                          key={a._id}
                          type="button"
                          onClick={() => setAddr({ name: a.name, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, zip: a.zip, country: a.country, phone: "" })}
                          className={`text-left p-3 rounded-xl border text-base transition-all cursor-pointer ${
                            addr.line1 === a.line1 && addr.zip === a.zip
                              ? "border-zinc-900 bg-zinc-50"
                              : "border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <p className="font-semibold text-zinc-900">{a.name} — {a.label}</p>
                          <p className="text-zinc-500 text-base mt-0.5">{a.line1}, {a.city}, {a.state} {a.zip}</p>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 border-t border-zinc-100" />
                      <span className="text-base text-zinc-400">or enter a new address</span>
                      <div className="flex-1 border-t border-zinc-100" />
                    </div>
                  </div>
                )}

                {initError && (
                  <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-base">{initError}</div>
                )}

                <form onSubmit={handleAddressSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {field("Full Name *", "name", "John Smith")}
                    {field("Address Line 1 *", "line1", "123 Main St")}
                    {field("Address Line 2", "line2", "Apt 4B")}
                    {field("City *", "city", "New York", true)}
                    {field("State *", "state", "NY", true)}
                    {field("ZIP Code *", "zip", "10001", true)}
                    {field("Country *", "country", "US", true)}
                    {field("Phone", "phone", "+1 555 000 0000")}
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="w-4 h-4 rounded border-zinc-300 accent-zinc-900" />
                    <span className="text-base text-zinc-600">Save this address for future orders</span>
                  </label>

                  <button
                    type="submit"
                    disabled={creatingIntent}
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-700 text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-zinc-900/10 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {creatingIntent ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Setting up payment...
                      </>
                    ) : "Continue to Payment →"}
                  </button>
                </form>
              </div>
            )}

            {/* ── STEP 2: Payment ── */}
            {step === "payment" && clientSecret && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold text-zinc-900">Payment</h2>
                  <button onClick={() => setStep("address")} className="text-base text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                    ← Edit Address
                  </button>
                </div>

                {/* Address summary */}
                <div className="mb-5 p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-base">
                  <p className="font-semibold text-zinc-900">{addr.name}</p>
                  <p className="text-zinc-500 text-base mt-0.5">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.zip}</p>
                </div>

                {isMockPayment ? (
                  <MockCheckoutForm
                    paymentIntentId={paymentIntentId}
                    shippingAddress={addr}
                    total={totalAmount}
                  />
                ) : (
                  <Elements
                    stripe={stripePromise}
                    options={{ clientSecret, appearance: { theme: "stripe", variables: { borderRadius: "12px", colorPrimary: "#18181b", fontFamily: "system-ui, sans-serif" } } }}
                  >
                    <CheckoutForm
                      paymentIntentId={paymentIntentId}
                      shippingAddress={addr}
                      total={totalAmount}
                    />
                  </Elements>
                )}

                {/* Security note */}
                <p className="text-base text-zinc-400 text-center mt-4 flex items-center justify-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Secured & Encrypted Checkout.
                </p>
              </div>
            )}
          </div>

          {/* Right — Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-zinc-100 p-6 sticky top-20 space-y-4">
              <h3 className="text-base font-bold text-zinc-900">Order Summary</h3>

              {/* Dynamic Cart Items List */}
              {loadingCart ? (
                <div className="py-3 text-center text-base text-zinc-400">Loading order items...</div>
              ) : cartItems.length === 0 ? (
                <div className="py-2 text-base text-zinc-400">Your cart is empty.</div>
              ) : (
                <div className="space-y-3 pb-3 border-b border-zinc-100 max-h-56 overflow-y-auto">
                  {cartItems.map((item, idx) => (
                    <div key={item._id || idx} className="flex items-center gap-3 text-base">
                      <div className="w-12 h-10 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base text-zinc-300">Item</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-zinc-900 truncate">{item.name}</p>
                        <p className="text-zinc-400 text-base">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-zinc-900">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 text-base text-zinc-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">${(subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  {shippingCost === 0
                    ? <span className="font-semibold text-emerald-600">Free</span>
                    : <span className="font-semibold">${(shippingCost || 0).toFixed(2)}</span>
                  }
                </div>
                <div className="border-t border-zinc-100 pt-2 flex justify-between">
                  <span className="font-bold text-zinc-900">Total</span>
                  <span className="font-black text-zinc-900">${(totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 space-y-2">
                <p className="text-base text-zinc-400 font-semibold uppercase tracking-wide">Accepted Payments</p>
                <div className="flex gap-2">
                  {["Visa", "MC", "AmEx", "Apple Pay"].map((p) => (
                    <span key={p} className="px-2 py-1 rounded-md bg-zinc-100 text-base font-bold text-zinc-500">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
