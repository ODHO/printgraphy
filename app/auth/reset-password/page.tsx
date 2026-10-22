"use client";

import { Suspense } from "react";
import AuthFlow from "@/components/AuthFlow";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-140px)] flex items-center justify-center bg-[#FAF8F5]/50">
          <div className="w-8 h-8 border-2 border-sky-200 border-t-[#329AD4] rounded-full animate-spin" />
        </div>
      }
    >
      <AuthFlow initialMode="reset" />
    </Suspense>
  );
}
