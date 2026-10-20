"use client";

import Link from "next/link";
import MessagePanel from "@/components/MessagePanel";

export default function CustomerMessagesPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-zinc-900 pb-20">
      <div className="bg-white border-b border-zinc-200">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-base font-bold text-zinc-600">Dashboard</Link>
            <span className="text-zinc-300">/</span>
            <span className="text-base font-bold text-zinc-900">Messages</span>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl">
        <MessagePanel endpoint="/api/messages" title="Printgraphy admin" hint="This conversation is with the admin team." />
      </div>
    </div>
  );
}
