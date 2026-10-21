"use client";

import Link from "next/link";
import Image from "next/image";

export default function AuthHeader() {
  return (
    <header className="w-full bg-white font-sans border-b border-zinc-200/80 relative z-30">
      {/* Main Header area with centered Logo only */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-center">
        <Link href="/" className="flex-shrink-0 transition-transform duration-200 hover:scale-105">
          <Image
            src="/Untitled-1 3.png"
            alt="Printgraphi"
            width={160}
            height={42}
            priority
            className="h-9 w-auto object-contain"
          />
        </Link>
      </div>
    </header>
  );
}
