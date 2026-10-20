"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface FooterMenuItem {
  _id?: string;
  title: string;
  url: string;
  order: number;
  isActive: boolean;
  openInNewTab?: boolean;
}

interface FooterColumn {
  _id?: string;
  title: string;
  order: number;
  isActive: boolean;
  items: FooterMenuItem[];
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: "Site",
    order: 0,
    isActive: true,
    items: [
      { title: "Services", url: "/services", order: 0, isActive: true },
      { title: "eCommerce / Products", url: "/products", order: 1, isActive: true },
      { title: "Ordering", url: "/browsedesigns", order: 2, isActive: true },
      { title: "About", url: "/about", order: 3, isActive: true },
      { title: "Contact", url: "/contact", order: 4, isActive: true },
    ],
  },
  {
    title: "The Group",
    order: 1,
    isActive: true,
    items: [
      { title: "Printgraphy — print & packaging", url: "#", order: 0, isActive: true },
      { title: "AxisBlu Intelligence — software", url: "#", order: 1, isActive: true },
      { title: "OnePoint Services — fulfillment", url: "#", order: 2, isActive: true },
      { title: "Kool Synergy — commercialization", url: "#", order: 3, isActive: true },
    ],
  },
  {
    title: "Details",
    order: 2,
    isActive: true,
    items: [
      { title: "No minimums", url: "#", order: 0, isActive: true },
      { title: "Free file check", url: "#", order: 1, isActive: true },
      { title: "Ships nationwide", url: "#", order: 2, isActive: true },
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const [columns, setColumns] = useState<FooterColumn[]>(DEFAULT_COLUMNS);

  useEffect(() => {
    fetch("/api/footer-menu")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.columns) && data.columns.length > 0) {
          setColumns(data.columns);
        }
      })
      .catch(() => {
        setColumns(DEFAULT_COLUMNS);
      });
  }, [pathname]);

  if (pathname?.startsWith("/auth")) {
    return null;
  }

  return (
    <footer className="w-full bg-[#0E1A2B] text-white">
      {/* Main footer grid */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Column 1 — Logo + About */}
        <div className="flex flex-col gap-5">
          <Link href="/" className="flex-shrink-0 w-fit">
            <Image
              src="/logo/printgraphy-footer.png"
              alt="Printgraphy Footer Logo"
              width={150}
              height={42}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <p className="text-base text-zinc-400 leading-relaxed max-w-[220px]">
            Printgraphy is a print, packaging, and sourcing company producing custom print, product packaging, and sourced materials for growing and enterprise brands.
          </p>
        </div>

        {/* Dynamic Footer Columns */}
        {columns.map((column) => (
          <div key={column._id || column.title} className="flex flex-col gap-4">
            <h3 className="text-base font-bold tracking-[0.12em] uppercase text-zinc-400">
              {column.title}
            </h3>
            <ul className="flex flex-col gap-3">
              {(column.items || []).map((link, idx) => (
                <li key={link._id || `${link.title}-${idx}`}>
                  <Link
                    href={link.url || "#"}
                    target={link.openInNewTab ? "_blank" : undefined}
                    rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                    className="text-base text-zinc-200 hover:text-white hover:underline underline-offset-2 transition-colors duration-200 inline-flex items-center gap-1.5"
                  >
                    <span>{link.title}</span>
                    {link.openInNewTab && (
                      <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-base text-zinc-500">
            US based, shipping nationwide. © {year} Printgraphy.
          </p>
          <p className="text-base text-zinc-500 font-semibold tracking-wide uppercase">
            © {year} PRINTGRAPHY.
          </p>
        </div>
      </div>
    </footer>
  );
}
