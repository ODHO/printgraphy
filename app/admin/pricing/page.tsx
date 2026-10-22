"use client";

import { useEffect, useState } from "react";
import { Badge, Card, CardHeader, EmptyState, Icon, PageHeader, SkeletonRows, StatTile } from "@/components/admin/ui";

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

function gateStatus(vp: VendorProductItem) {
  const ok = vp.isEligible && vp.vendorCost <= Number(vp.categoryBenchmarkMax || vp.vendorCost);
  const label = !vp.isEligible ? "MARGIN LOW" : vp.vendorCost > Number(vp.categoryBenchmarkMax || 0) ? "OUTLIER" : "IN RANGE";
  return { ok, label };
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

  const passing = vendorProducts.filter((vp) => gateStatus(vp).ok).length;
  const flagged = vendorProducts.length - passing;

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        icon="subscription"
        title="Pricing Oversight & Benchmark Gating"
        description="Fixed customer platform pricing vs vendor entered costs and 25% margin eligibility rules."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Customer prices" value={<span className="tabular-nums">{products.length}</span>} hint="Fixed platform products" icon="tag" tone="brand" loading={loading} />
        <StatTile label="Vendor entries" value={<span className="tabular-nums">{vendorProducts.length}</span>} hint="Unit costs submitted" icon="vendors" tone="violet" loading={loading} />
        <StatTile label="In range" value={<span className="tabular-nums">{passing}</span>} hint="Passing the margin gate" icon="check" tone="green" loading={loading} />
        <StatTile label="Flagged" value={<span className="tabular-nums">{flagged}</span>} hint="Margin low or outlier" icon="ban" tone="red" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Customer Fixed Platform Prices */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader
            icon="tag"
            title="Customer Fixed Prices"
            subtitle="What customers pay on the storefront"
            action={!loading && <Badge tone="brand">{products.length}</Badge>}
          />
          {loading ? (
            <SkeletonRows rows={6} />
          ) : products.length === 0 ? (
            <EmptyState icon="tag" title="No products priced yet" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {products.map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 hover:bg-[#f0f8fd]/70 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
                      <Icon name="products" className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-medium text-zinc-900 truncate">{p.name}</span>
                  </div>
                  <span className="shrink-0 rounded-lg bg-[#f0f8fd] px-2.5 py-1 text-sm font-semibold text-[#1b5b80] tabular-nums">
                    ${p.price.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Vendor Costs & Margin Gating */}
        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader
            icon="vendors"
            title="Vendor Cost Entries & Margin Gate"
            subtitle="Vendor unit costs checked against category benchmarks"
            action={!loading && <Badge tone="violet">{vendorProducts.length}</Badge>}
          />
          {loading ? (
            <SkeletonRows rows={6} />
          ) : vendorProducts.length === 0 ? (
            <EmptyState
              icon="vendors"
              title="No vendor cost entries"
              description="No vendor cost entries recorded yet. Vendors enter unit costs in their fulfillment portal."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {vendorProducts.map((vp) => {
                const gate = gateStatus(vp);
                return (
                  <li key={vp._id} className="flex flex-col gap-3 px-5 sm:px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-[#f0f8fd]/70 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{vp.vendorId?.name || "Vendor"}</p>
                      <p className="text-xs text-zinc-500 truncate">{vp.productId?.name || "Product"}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="rounded-lg bg-zinc-50 px-2 py-1 text-xs text-zinc-500 tabular-nums ring-1 ring-inset ring-zinc-200/70">
                        Bench ${Number(vp.categoryBenchmarkMin || 0).toFixed(0)}–${Number(vp.categoryBenchmarkMax || 0).toFixed(0)}
                      </span>
                      <span className="text-sm font-semibold text-zinc-800 tabular-nums">Cost: ${vp.vendorCost.toFixed(2)}</span>
                      <Badge tone={gate.ok ? "green" : "red"} dot className="uppercase tracking-wide">
                        {gate.label}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
