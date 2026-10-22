"use client";

import Link from "next/link";
import Image from "next/image";

export default function AuthHeader() {
  return (
    <header className="w-full bg-[#fbfaf7] font-sans border-b border-black/10 relative z-30">
      {/* Main Header area with centered Logo only */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-center">
        <Link href="/" className="flex-shrink-0 transition-transform duration-200 hover:scale-105">
          <Image
            src="/logo/printgraphy-brand-v2.png"
            alt="Printgraphy"
            width={220}
            height={60}
            priority
            className="h-10 w-auto object-contain"
          />
        </Link>
      </div>
    </header>
  );
}
