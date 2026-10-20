import { Suspense } from "react";
import BusinessCardsCustomizeFlow from "@/components/BusinessCardsCustomizeFlow";

export default function CustomizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin" />
      </div>
    }>
      <BusinessCardsCustomizeFlow />
    </Suspense>
  );
}
