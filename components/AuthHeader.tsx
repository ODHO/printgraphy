"use client";

import Link from "next/link";
import Image from "next/image";

export default function AuthHeader() {
  return (
    <header className="w-full bg-white font-sans border-b border-gray-150 relative z-30">
      {/* Topbar with background gradient */}
      <div className="w-full bg-gradient-to-r from-theme-gradient-start to-theme-gradient-end py-2.5 px-4 text-center">
        <p className="text-white text-base md:text-base font-medium tracking-wide">
          One-Of-A-Kind Fast Eco Luxury Printing + Elevate Your Brand With Endless Possibilities + Free Fast Delivery*
        </p>
      </div>

      {/* Main Header area with centered Logo only */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-center">
        <Link href="/" className="flex-shrink-0 transition-transform duration-200 hover:scale-105">
          <Image
            src="/logo/logo.png"
            alt="Printgraphy Logo"
            width={160}
            height={42}
            priority
            className="h-10 w-auto object-contain"
          />
        </Link>
      </div>
    </header>
  );
}
