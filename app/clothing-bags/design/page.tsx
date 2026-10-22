import type { Metadata } from "next";
import { Suspense } from "react";
import ApparelCustomizeFlow from "@/components/ApparelCustomizeFlow";

export const metadata: Metadata = {
  title: "Design Apparel — Clothing & Bags — Printgraphy",
};

export default function ClothingBagsDesignPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#329AD4] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ApparelCustomizeFlow />
    </Suspense>
  );
}
