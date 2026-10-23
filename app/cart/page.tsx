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
      <div className="w-24 h-24 rounded-2xl bg-[#f7fbfe] overflow-hidden shrink-0 border border-[#d7e8f4] relative">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={item.name} className="w-full h-full object-contain p-1.5" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xs">No img</div>
        )}
        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide bg-[#329AD4] text-white px-1.5 py-0.5 rounded-md">
          Apparel
        </span>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="font-bold text-[#1e1d1b] text-base truncate">{item.name}</p>
          {specs.category && specs.category !== item.name && (
            <p className="text-sm text-zinc-500">{specs.category}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-[#f0f8fd] border border-[#d7e8f4] rounded-lg px-2.5 py-1"
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
                  className="w-10 h-10 rounded-lg object-contain bg-white border border-[#d7e8f4]"
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
    } catch {
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
    <div className="relative min-h-screen overflow-hidden bg-[#f7fbfe] font-sans text-[#1e1d1b]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_18%_0%,rgba(50,154,212,0.16),transparent_55%),radial-gradient(ellipse_at_92%_8%,rgba(85,178,231,0.1),transparent_48%)]"
      />

      <div className="relative border-b border-[#d7e8f4] bg-white/90 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/" className="inline-block">
            <img src="/logo/logo.png" alt="Printgraphy Logo" className="h-9 w-auto object-contain" />
          </Link>
          <span className="text-[#b8e0f6]">/</span>
          <h1 className="text-sm font-semibold text-zinc-600">Your Cart</h1>
        </div>
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#b8e0f6] border-t-[#329AD4] rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-[1.25rem] bg-white border border-[#d7e8f4] flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-[#88c9ef]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-black tracking-[-0.03em] text-[#1e1d1b] mb-2">Your cart is empty</h2>
            <p className="text-zinc-500 text-sm mb-6 max-w-sm">Browse our products and find something you love.</p>
            <Link
              href="/browsedesigns"
              className="px-6 py-2.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-sm font-bold rounded-2xl transition-all"
            >
              Browse Designs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-3">
              <div className="mb-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#329AD4]">Shopping bag</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[#1e1d1b]">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </h2>
              </div>

              {items.map((item) => {
                const isApparel = item.specs?.productFamily === "apparel";
                const visibleSpecs = Object.entries(item.specs ?? {}).filter(
                  ([key]) => !HIDDEN_SPEC_KEYS.has(key)
                );
                const thumb = mediaSrc(item.thumbnail) || item.thumbnail;

                return (
                  <div
                    key={item._id}
                    className={`bg-white/95 rounded-[1.25rem] border border-[#d7e8f4] p-4 sm:p-5 transition-opacity shadow-[0_12px_32px_-28px_rgba(32,90,130,0.45)] ${
                      updating === item._id ? "opacity-50" : ""
                    }`}
                  >
                    {isApparel ? (
                      <ApparelCartDetails item={item} />
                    ) : (
                      <div className="flex gap-4">
                        <div className="w-24 h-16 rounded-2xl bg-[#f0f8fd] overflow-hidden shrink-0 border border-[#d7e8f4]">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xs">
                              No img
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#1e1d1b] text-base truncate">{item.name}</p>
                          {visibleSpecs.length > 0 && (
                            <p className="text-sm text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                              {visibleSpecs.map(([key, value]) => `${key}: ${value}`).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#e7f1f8]">
                      <div className="flex items-center gap-1 bg-[#f0f8fd] rounded-xl p-1 border border-[#d7e8f4]">
                        <button
                          onClick={() => updateQty(item._id, item.quantity - 1)}
                          disabled={!!updating}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:bg-white transition-all cursor-pointer disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="text-sm font-bold text-[#1e1d1b] min-w-8 px-1 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item._id, item.quantity + 1)}
                          disabled={!!updating}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:bg-white transition-all cursor-pointer disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-black text-[#1e1d1b] text-base tracking-[-0.02em]">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeItem(item._id)}
                          disabled={!!updating}
                          className="text-zinc-300 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
                          aria-label="Remove item"
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

            <div className="lg:col-span-5">
              <div className="bg-white/95 rounded-[1.5rem] border border-[#d7e8f4] p-6 sticky top-20 space-y-5 shadow-[0_20px_50px_-36px_rgba(32,90,130,0.5)] backdrop-blur-sm">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#329AD4]">Summary</p>
                  <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-[#1e1d1b]">Order Summary</h2>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm text-zinc-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#1e1d1b]">${subtotal.toFixed(2)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                      <span>Promo Discount ({appliedCoupon.code})</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-zinc-600">
                    <span>Shipping</span>
                    {shippingCost === 0 ? (
                      <span className="font-semibold text-emerald-600">Free</span>
                    ) : (
                      <span className="font-semibold text-[#1e1d1b]">${shippingCost.toFixed(2)}</span>
                    )}
                  </div>

                  {subtotal > 0 && subtotal < 50 && (
                    <div className="text-sm text-[#2172a0] bg-[#eef7fc] border border-[#d7e8f4] rounded-xl px-3 py-2.5">
                      Add <strong>${(50 - subtotal).toFixed(2)}</strong> more to get free shipping
                    </div>
                  )}

                  <form onSubmit={handleApplyCoupon} className="pt-3 border-t border-[#e7f1f8] space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-500 block">
                      Have a Promo Code?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="ENTER CODE"
                        className="flex-1 px-3 py-2.5 rounded-xl border border-[#d7e8f4] text-sm font-mono font-bold uppercase text-[#1e1d1b] focus:outline-none focus:border-[#329AD4] focus:ring-2 focus:ring-[#329AD4]/20"
                      />
                      <button
                        type="submit"
                        disabled={validatingCoupon}
                        className="px-4 py-2.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-sm font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        {validatingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                    {couponMsg.text && (
                      <p className={`text-sm font-semibold ${couponMsg.isError ? "text-red-500" : "text-emerald-600"}`}>
                        {couponMsg.text}
                      </p>
                    )}
                  </form>

                  <div className="border-t border-[#e7f1f8] pt-3 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-[#1e1d1b]">Total</span>
                    <span className="text-2xl font-black tracking-[-0.03em] text-[#1e1d1b]">${total.toFixed(2)}</span>
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
                  className="w-full py-3.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-sm font-bold rounded-2xl transition-all cursor-pointer shadow-[0_10px_24px_-12px_rgba(50,154,212,0.9)]"
                >
                  Proceed to Checkout →
                </button>

                <Link href="/browsedesigns" className="block text-center text-sm text-zinc-500 hover:text-[#329AD4] transition-colors font-medium">
                  ← Continue Shopping
                </Link>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#e7f1f8]">
                  {[
                    { label: "Secure Checkout", icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    )},
                    { label: "Easy Returns", icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    )},
                    { label: "Fast Printing", icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )},
                  ].map((badge) => (
                    <div key={badge.label} className="flex flex-col items-center gap-1.5 text-center text-[#329AD4]">
                      {badge.icon}
                      <span className="text-[10px] text-zinc-500 font-semibold leading-tight">{badge.label}</span>
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
