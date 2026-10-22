import { Suspense } from "react";
import BusinessCardStudioFlow from "@/components/BusinessCardStudioFlow";

export default function Browsedesigns() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#ffffff] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-[#329AD4] rounded-full animate-spin" />
      </div>
    }>
      <BusinessCardStudioFlow />
    </Suspense>
  );
}
