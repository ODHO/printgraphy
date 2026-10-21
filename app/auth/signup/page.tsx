"use client";

import { Suspense } from "react";
import AuthFlow from "@/components/AuthFlow";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-140px)] flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-2 border-sky-200 border-t-[#2196D2] rounded-full animate-spin" />
        </div>
      }
    >
      <AuthFlow initialMode="signup" />
    </Suspense>
  );
}
