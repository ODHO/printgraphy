import { Suspense } from "react";
import BusinessCardsCustomizeFlow from "@/components/BusinessCardsCustomizeFlow";

export default function CustomizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-[#e74b2d] rounded-full animate-spin" />
      </div>
    }>
      <BusinessCardsCustomizeFlow />
    </Suspense>
  );
}
