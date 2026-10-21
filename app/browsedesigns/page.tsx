import { Suspense } from "react";
import BusinessCardStudioFlow from "@/components/BusinessCardStudioFlow";

export default function Browsedesigns() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-[#2196D2] rounded-full animate-spin" />
      </div>
    }>
      <BusinessCardStudioFlow />
    </Suspense>
  );
}
