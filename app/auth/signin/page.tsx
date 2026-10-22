"use client";

import { Suspense } from "react";
import AuthFlow from "@/components/AuthFlow";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-140px)] flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-2 border-sky-200 border-t-[#e74b2d] rounded-full animate-spin" />
        </div>
      }
    >
      <AuthFlow initialMode="signin" />
    </Suspense>
  );
}
