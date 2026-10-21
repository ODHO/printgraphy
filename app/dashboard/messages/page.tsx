"use client";

import Link from "next/link";
import MessagePanel from "@/components/MessagePanel";
import CustomerSidebar from "@/components/CustomerSidebar";

export default function CustomerMessagesPage() {
  return (
    <div className="w-full bg-white min-h-[calc(100vh-160px)] font-sans">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row items-start gap-8 lg:gap-12">
          {/* Uniform Sidebar */}
          <CustomerSidebar activeItem="Dashboard" />

          {/* Main Messages Content */}
          <main className="flex-1 w-full min-w-0">
            <h1 className="text-2xl sm:text-[32px] font-extrabold text-zinc-900 tracking-tight mb-6">
              Messages
            </h1>
            <div className="max-w-3xl">
              <MessagePanel
                endpoint="/api/messages"
                title="Printgraphy Admin"
                hint="This conversation is with the Printgraphi support & admin team."
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
