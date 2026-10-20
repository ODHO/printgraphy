"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerHref, viewerIsSignedIn } from "@/lib/accountGate";
import { mediaSrc } from "@/lib/mediaUrl";

interface CartItem {
  _id: string;
  name: string;
  thumbnail: string;
  price: number;
  quantity: number;
  specs: Record<string, string>;
}

interface Cart {
  items: CartItem[];
}

const HIDDEN_SPEC_KEYS = new Set([
  "employeeData",
  "design",
  "placements",
  "productFamily",
  "categorySlug",
  "colorHex",
  "mockup",
  "designPreview",
  "designTexts",
  "summary",
]);

function parseDesignPreviews(specs: Record<string, string>): string[] {
  const urls: string[] = [];
  if (specs.designPreview) urls.push(specs.designPreview);
  if (specs.mockup && specs.mockup !== specs.designPreview) urls.push(specs.mockup);

  try {
    const raw = specs.design ? JSON.parse(specs.design) : null;
    if (raw && typeof raw === "object") {
      const layers = Array.isArray(raw)
        ? raw
        : Object.values(raw).flatMap((v) => (Array.isArray(v) ? v : []));
      for (const layer of layers) {
        if (layer && typeof layer === "object" && (layer as { type?: string }).type === "image") {
          const src = (layer as { src?: string }).src;
          if (src && !urls.includes(src)) urls.push(src);
        }
      }
    }
  } catch {
    /* ignore */
  }
  return urls.slice(0, 4);
}

function ApparelCartDetails({ item }: { item: CartItem }) {
  const specs = item.specs || {};
  const previews = parseDesignPreviews(specs);
  const thumb =
    mediaSrc(item.thumbnail || specs.designPreview || specs.mockup) ||
    item.thumbnail ||
    specs.mockup ||
    "";
  const chips = [
    specs.color ? { label: "Color", value: specs.color, swatch: specs.colorHex } : null,
    specs.sizes ? { label: "Sizes", value: specs.sizes } : null,
    specs.decoration ? { label: "Decoration", value: specs.decoration } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; swatch?: string }>;

  return (
    <div className="flex gap-4">
      <div className="w-24 h-24 rounded-2xl bg-[#f8fbfd] overflow-hidden shrink-0 border border-zinc-200 relative">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={item.name} className="w-full h-full object-contain p-1.5" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xs">No img</div>
        )}
        <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wide bg-[#064FE0] text-white px-1.5 py-0.5 rounded">
          Apparel
        </span>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="font-bold text-zinc-900 text-base truncate">{item.name}</p>
          {specs.category && specs.category !== item.name && (
            <p className="text-sm text-zinc-500">{specs.category}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-full px-2.5 py-1"
            >
              {c.swatch ? (
                <span
                  className="w-3 h-3 rounded-full border border-zinc-300 shrink-0"
                  style={{ backgroundColor: c.swatch }}
                />
              ) : null}
              <span className="text-zinc-400 font-medium">{c.label}</span>
              {c.value}
            </span>
          ))}
        </div>

        {specs.designTexts ? (
          <p className="text-sm text-zinc-500 truncate">
            Text: <span className="text-zinc-700 font-medium">{specs.designTexts}</span>
          </p>
        ) : null}

        {previews.length > 0 ? (
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Design</span>
            <div className="flex gap-1.5">
              {previews.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={mediaSrc(src) || src}
                  alt=""
                  className="w-10 h-10 rounded-lg object-contain bg-white border border-zinc-200"
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState({ text: "", isError: false });
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cart");
    const data = await res.json();
    if (data.success) setCart(data.cart);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const updateQty = async (itemId: string, quantity: number) => {
    setUpdating(itemId);
    const res = await fetch(`/api/cart/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    const data = await res.json();
    if (data.success) setCart(data.cart);
    setUpdating(null);
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);
    const res = await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) setCart(data.cart);
    setUpdating(null);
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setValidatingCoupon(true);
    setCouponMsg({ text: "", isError: false });

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, cartSubtotal: subtotal }),
      });

      const data = await res.json();
      if (!data.success) {
        setCouponMsg({ text: data.message || "Invalid coupon.", isError: true });
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({ code: data.coupon.code, discountAmount: data.coupon.discountAmount });
        setCouponMsg({ text: data.message, isError: false });
      }
    } catch (err) {
      setCouponMsg({ text: "Error applying coupon.", isError: true });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const items = cart?.items ?? [];
  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const shippingCost = subtotalAfterDiscount > 50 || items.length === 0 ? 0 : 9.99;
  const total = subtotalAfterDiscount + shippingCost;

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/" className="inline-block">
            <img src="/logo/logo.png" alt="Printgraphy Logo" className="h-10 w-auto mx-auto object-contain" />
          </Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-base font-semibold text-zinc-600">Your Cart</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-zinc-100 flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Your cart is empty</h2>
            <p className="text-zinc-500 text-base mb-6">Browse our products and find something you love.</p>
            <Link href="/browsedesigns" className="px-6 py-2.5 bg-zinc-900 text-white text-base font-semibold rounded-xl hover:bg-zinc-700 transition-all">
              Browse Designs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-7 space-y-3">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">{items.length} item{items.length !== 1 ? "s" : ""}</h2>

              {items.map((item) => {
                const isApparel = item.specs?.productFamily === "apparel";
                const visibleSpecs = Object.entries(item.specs ?? {}).filter(
                  ([key]) => !HIDDEN_SPEC_KEYS.has(key)
                );
                const thumb = mediaSrc(item.thumbnail) || item.thumbnail;

                return (
                  <div
                    key={item._id}
                    className={`bg-white rounded-2xl border border-zinc-100 p-4 transition-opacity ${
                      updating === item._id ? "opacity-50" : ""
                    }`}
                  >
                    {isApparel ? (
                      <ApparelCartDetails item={item} />
                    ) : (
                      <div className="flex gap-4">
                        <div className="w-20 h-14 rounded-xl bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300 text-base">
                              No img
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-zinc-900 text-base truncate">{item.name}</p>
                          {visibleSpecs.length > 0 && (
                            <p className="text-sm text-zinc-400 mt-0.5 line-clamp-2">
                              {visibleSpecs.map(([key, value]) => `${key}: ${value}`).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-50">
                      <div className="flex items-center gap-2 bg-zinc-100 rounded-lg p-1">
                        <button
                          onClick={() => updateQty(item._id, item.quantity - 1)}
                          disabled={!!updating}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-600 hover:bg-white hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="text-base font-bold text-zinc-900 min-w-8 px-1 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item._id, item.quantity + 1)}
                          disabled={!!updating}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-600 hover:bg-white hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-black text-zinc-900 text-base">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeItem(item._id)}
                          disabled={!!updating}
                          className="text-zinc-300 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-zinc-100 p-6 sticky top-20 space-y-4">
                <h2 className="text-base font-bold text-zinc-900">Order Summary</h2>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-base text-zinc-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-base text-emerald-600 font-semibold">
                      <span>Promo Discount ({appliedCoupon.code})</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-base text-zinc-600">
                    <span>Shipping</span>
                    {shippingCost === 0 ? (
                      <span className="font-semibold text-emerald-600">Free</span>
                    ) : (
                      <span className="font-semibold">${shippingCost.toFixed(2)}</span>
                    )}
                  </div>

                  {subtotal > 0 && subtotal < 50 && (
                    <div className="text-base text-zinc-400 bg-zinc-50 rounded-lg px-3 py-2">
                      Add <strong>${(50 - subtotal).toFixed(2)}</strong> more to get free shipping 🎉
                    </div>
                  )}

                  {/* Promo Code Form */}
                  <form onSubmit={handleApplyCoupon} className="pt-2 border-t border-zinc-100 space-y-1.5">
                    <label className="text-base font-bold text-zinc-700 block">Have a Promo Code?</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="ENTER CODE"
                        className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-base font-mono font-bold uppercase text-zinc-900 focus:outline-none focus:border-[#064FE0]"
                      />
                      <button
                        type="submit"
                        disabled={validatingCoupon}
                        className="px-4 py-2 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        {validatingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                    {couponMsg.text && (
                      <p className={`text-base font-semibold ${couponMsg.isError ? "text-red-500" : "text-emerald-600"}`}>
                        {couponMsg.text}
                      </p>
                    )}
                  </form>

                  <div className="border-t border-zinc-100 pt-2.5 flex justify-between">
                    <span className="text-base font-bold text-zinc-900">Total</span>
                    <span className="text-base font-black text-zinc-900">${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (!(await viewerIsSignedIn())) {
                      router.push(registerHref("/cart", "checkout"));
                      return;
                    }
                    router.push("/checkout");
                  }}
                  className="w-full py-3 bg-zinc-900 hover:bg-zinc-700 text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-zinc-900/10"
                >
                  Proceed to Checkout →
                </button>

                <Link href="/browsedesigns" className="block text-center text-base text-zinc-400 hover:text-zinc-600 transition-colors">
                  ← Continue Shopping
                </Link>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100">
                  {[
                    { icon: "🔒", label: "Secure Checkout" },
                    { icon: "🔄", label: "Easy Returns" },
                    { icon: "⚡", label: "Fast Printing" },
                  ].map((badge) => (
                    <div key={badge.label} className="flex flex-col items-center gap-1 text-center">
                      <span className="text-base">{badge.icon}</span>
                      <span className="text-base text-zinc-400 font-medium leading-tight">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
