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
        <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-sm font-bold rounded-2xl transition-all cursor-pointer shadow-[0_10px_24px_-12px_rgba(50,154,212,0.9)] disabled:opacity-60 flex items-center justify-center gap-2"
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
      <div className="p-4 bg-[#eef7fc] rounded-2xl border border-[#d7e8f4] text-sm text-[#164967] space-y-1">
        <p className="font-bold text-[#1e1d1b]">Instant Payment & Test Mode Active</p>
        <p>Click below to complete your print order and generate a live order tracking reference.</p>
      </div>
      {error && (
        <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-sm font-bold rounded-2xl transition-all cursor-pointer shadow-[0_10px_24px_-12px_rgba(50,154,212,0.9)] disabled:opacity-60 flex items-center justify-center gap-2"
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
      <label className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-500 block mb-1.5">{label}</label>
      <input
        type="text"
        required={key !== "line2" && key !== "phone"}
        value={addr[key]}
        onChange={(e) => setAddr((prev) => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-white border border-[#d7e8f4] rounded-xl px-4 py-2.5 text-sm text-[#1e1d1b] placeholder-zinc-400 focus:outline-none focus:border-[#329AD4] focus:ring-2 focus:ring-[#329AD4]/20 transition-all"
      />
    </div>
  );

  const isMockPayment = isMock || !clientSecret || clientSecret.includes("mock") || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_51...");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7fbfe] font-sans text-[#1e1d1b]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_18%_0%,rgba(50,154,212,0.16),transparent_55%),radial-gradient(ellipse_at_92%_8%,rgba(85,178,231,0.1),transparent_48%)]"
      />

      <div className="relative border-b border-[#d7e8f4] bg-white/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/" className="inline-block">
            <img src="/logo/logo.png" alt="Printgraphy Logo" className="h-9 w-auto object-contain" />
          </Link>
          <span className="text-[#b8e0f6]">/</span>
          <h1 className="text-sm font-semibold text-zinc-600">Checkout</h1>
        </div>
      </div>

      <div className="relative border-b border-[#e7f1f8] bg-white/70 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3 text-sm font-semibold">
          {[
            { key: "address", label: "1 · Shipping" },
            { key: "payment", label: "2 · Payment" },
          ].map((s, i) => {
            const active = step === s.key;
            const done = s.key === "address" && step === "payment";
            return (
              <div key={s.key} className="flex items-center gap-3">
                {i > 0 && <span className="h-px w-8 bg-[#d7e8f4]" />}
                <span
                  className={`inline-flex items-center rounded-xl px-3 py-1.5 ${
                    active || done
                      ? "bg-[#eef7fc] text-[#329AD4] border border-[#d7e8f4]"
                      : "text-zinc-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            {step === "address" && (
              <div className="bg-white/95 rounded-[1.5rem] border border-[#d7e8f4] p-5 sm:p-7 shadow-[0_20px_50px_-36px_rgba(32,90,130,0.45)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#329AD4]">Delivery</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[#1e1d1b] mb-5">Shipping Address</h2>

                {savedAddresses.length > 0 && (
                  <div className="mb-5 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-500">Saved Addresses</p>
                    <div className="grid gap-2">
                      {savedAddresses.map((a) => (
                        <button
                          key={a._id}
                          type="button"
                          onClick={() => setAddr({ name: a.name, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, zip: a.zip, country: a.country, phone: "" })}
                          className={`text-left p-3.5 rounded-2xl border text-sm transition-all cursor-pointer ${
                            addr.line1 === a.line1 && addr.zip === a.zip
                              ? "border-[#329AD4] bg-[#eef7fc] shadow-[0_0_0_3px_rgba(50,154,212,0.12)]"
                              : "border-[#d7e8f4] hover:border-[#88c9ef] bg-white"
                          }`}
                        >
                          <p className="font-semibold text-[#1e1d1b]">{a.name} — {a.label}</p>
                          <p className="text-zinc-500 text-sm mt-0.5">{a.line1}, {a.city}, {a.state} {a.zip}</p>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 border-t border-[#e7f1f8]" />
                      <span className="text-xs text-zinc-400">or enter a new address</span>
                      <div className="flex-1 border-t border-[#e7f1f8]" />
                    </div>
                  </div>
                )}

                {initError && (
                  <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">{initError}</div>
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
                    <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="w-4 h-4 rounded border-[#d7e8f4] accent-[#329AD4]" />
                    <span className="text-sm text-zinc-600">Save this address for future orders</span>
                  </label>

                  <button
                    type="submit"
                    disabled={creatingIntent}
                    className="w-full py-3.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-sm font-bold rounded-2xl transition-all cursor-pointer shadow-[0_10px_24px_-12px_rgba(50,154,212,0.9)] disabled:opacity-60 flex items-center justify-center gap-2"
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

            {step === "payment" && clientSecret && (
              <div className="bg-white/95 rounded-[1.5rem] border border-[#d7e8f4] p-5 sm:p-7 shadow-[0_20px_50px_-36px_rgba(32,90,130,0.45)]">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#329AD4]">Secure pay</p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[#1e1d1b]">Payment</h2>
                  </div>
                  <button onClick={() => setStep("address")} className="text-sm font-semibold text-[#329AD4] hover:text-[#2884b8] transition-colors cursor-pointer">
                    ← Edit Address
                  </button>
                </div>

                <div className="mb-5 p-3.5 rounded-2xl bg-[#f7fbfe] border border-[#d7e8f4] text-sm">
                  <p className="font-semibold text-[#1e1d1b]">{addr.name}</p>
                  <p className="text-zinc-500 mt-0.5">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.zip}</p>
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
                    options={{ clientSecret, appearance: { theme: "stripe", variables: { borderRadius: "14px", colorPrimary: "#329AD4", fontFamily: "system-ui, sans-serif" } } }}
                  >
                    <CheckoutForm
                      paymentIntentId={paymentIntentId}
                      shippingAddress={addr}
                      total={totalAmount}
                    />
                  </Elements>
                )}

                <p className="text-xs text-zinc-400 text-center mt-4 flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Secured & Encrypted Checkout.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white/95 rounded-[1.5rem] border border-[#d7e8f4] p-6 sticky top-20 space-y-4 shadow-[0_20px_50px_-36px_rgba(32,90,130,0.5)] backdrop-blur-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#329AD4]">Summary</p>
                <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-[#1e1d1b]">Order Summary</h3>
              </div>

              {loadingCart ? (
                <div className="py-3 text-center text-sm text-zinc-400">Loading order items...</div>
              ) : cartItems.length === 0 ? (
                <div className="py-2 text-sm text-zinc-400">Your cart is empty.</div>
              ) : (
                <div className="space-y-3 pb-3 border-b border-[#e7f1f8] max-h-56 overflow-y-auto">
                  {cartItems.map((item, idx) => (
                    <div key={item._id || idx} className="flex items-center gap-3 text-sm">
                      <div className="w-12 h-10 rounded-xl bg-[#f0f8fd] border border-[#d7e8f4] overflow-hidden shrink-0">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-300">Item</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1e1d1b] truncate">{item.name}</p>
                        <p className="text-zinc-400 text-xs">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-[#1e1d1b]">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 text-sm text-zinc-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#1e1d1b]">${(subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  {shippingCost === 0
                    ? <span className="font-semibold text-emerald-600">Free</span>
                    : <span className="font-semibold text-[#1e1d1b]">${(shippingCost || 0).toFixed(2)}</span>
                  }
                </div>
                <div className="border-t border-[#e7f1f8] pt-2.5 flex justify-between items-baseline">
                  <span className="font-bold text-[#1e1d1b]">Total</span>
                  <span className="text-2xl font-black tracking-[-0.03em] text-[#1e1d1b]">${(totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#e7f1f8] space-y-2">
                <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-[0.12em]">Accepted Payments</p>
                <div className="flex flex-wrap gap-2">
                  {["Visa", "MC", "AmEx", "Apple Pay"].map((p) => (
                    <span key={p} className="px-2.5 py-1 rounded-lg bg-[#f0f8fd] border border-[#d7e8f4] text-xs font-bold text-[#2172a0]">{p}</span>
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
