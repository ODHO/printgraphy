"use client";

import { useEffect, useState } from "react";

interface ProductItem {
  _id: string;
  name: string;
  price: number;
}

interface VendorProductItem {
  _id: string;
  vendorCost: number;
  categoryBenchmarkMin?: number;
  categoryBenchmarkMax?: number;
  isEligible: boolean;
  vendorId?: { _id: string; name: string };
  productId?: { _id: string; name: string; price: number };
}

export default function AdminPricingPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [vendorProducts, setVendorProducts] = useState<VendorProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProducts(d.products || []);
          setVendorProducts(d.vendorProducts || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Pricing Oversight & Benchmark Gating</h1>
        <p className="text-zinc-500 text-base mt-0.5">
          Fixed customer platform pricing vs vendor entered costs and 25% margin eligibility rules.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Fixed Platform Prices */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">
              Customer Fixed Prices ({products.length})
            </h2>

            <div className="space-y-2">
              {products.map((p) => (
                <div key={p._id} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#edf4f9]/40 border border-sky-100/60">
                  <span className="text-zinc-900 text-base font-bold">{p.name}</span>
                  <span className="text-[#064FE0] font-mono font-black text-base">${p.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vendor Costs & Margin Gating */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">
              Vendor Cost Entries & Margin Gate ({vendorProducts.length})
            </h2>

            {vendorProducts.length === 0 ? (
              <p className="text-zinc-400 text-base py-10 text-center">
                No vendor cost entries recorded yet. Vendors enter unit costs in their fulfillment portal.
              </p>
            ) : (
              <div className="space-y-2">
                {vendorProducts.map((vp) => (
                  <div key={vp._id} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#edf4f9]/40 border border-sky-100/60">
                    <div>
                      <p className="text-zinc-900 text-base font-bold">{vp.vendorId?.name || "Vendor"}</p>
                      <p className="text-zinc-400 text-base">{vp.productId?.name || "Product"}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 font-mono text-base">
                        Bench ${Number(vp.categoryBenchmarkMin || 0).toFixed(0)}–${Number(vp.categoryBenchmarkMax || 0).toFixed(0)}
                      </span>
                      <span className="text-zinc-700 font-mono font-bold text-base">Cost: ${vp.vendorCost.toFixed(2)}</span>
                      <span className={`px-2.5 py-1 rounded-full text-base font-bold ${
                        vp.isEligible && vp.vendorCost <= Number(vp.categoryBenchmarkMax || vp.vendorCost)
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {!vp.isEligible ? "MARGIN LOW" : vp.vendorCost > Number(vp.categoryBenchmarkMax || 0) ? "OUTLIER" : "IN RANGE"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
