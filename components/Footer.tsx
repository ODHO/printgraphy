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
    title: "USEFUL LINKS",
    order: 0,
    isActive: true,
    items: [
      { title: "Home", url: "/", order: 0, isActive: true },
      { title: "Deals", url: "/browsedesigns", order: 1, isActive: true },
      { title: "Business Cards", url: "/business-cards", order: 2, isActive: true },
      { title: "Post Cards", url: "/browsedesigns?category=Postcards", order: 3, isActive: true },
    ],
  },
  {
    title: "EXPLORE MORE",
    order: 1,
    isActive: true,
    items: [
      { title: "About Us", url: "/about", order: 0, isActive: true },
      { title: "Contact", url: "/contact", order: 1, isActive: true },
      { title: "FAQs", url: "/contact", order: 2, isActive: true },
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

  if (
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/vendor") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/customize")
  ) {
    return null;
  }

  return (
    <footer className="w-full bg-white px-4 sm:px-6 lg:px-8 pt-4 pb-0">
      {/* Floating Card Footer with Rounded Top Corners and Side Margins */}
      <div
        className="max-w-[1440px] mx-auto rounded-t-3xl rounded-b-none p-8 sm:p-12 lg:p-14 text-black shadow-sm"
        style={{ background: "#329AD4" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Column 1 — Logo + Sustainability Note */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex-shrink-0 w-fit">
              <Image
                src="/Untitled-1 4.png"
                alt="Printgraphy"
                width={160}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-xs sm:text-sm text-black/80 font-medium leading-relaxed max-w-[240px]">
              Our paper is sourced from FSC-certified mills. We plant enough trees to more than double our paper usage.
            </p>
          </div>

          {/* Dynamic / Default Footer Columns */}
          {columns.slice(0, 2).map((column) => (
            <div key={column._id || column.title} className="flex flex-col gap-3.5">
              <h3 className="text-sm font-extrabold tracking-[0.12em] uppercase text-black">
                {column.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {(column.items || []).map((link, idx) => (
                  <li key={link._id || `${link.title}-${idx}`}>
                    <Link
                      href={link.url || "#"}
                      target={link.openInNewTab ? "_blank" : undefined}
                      rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                      className="text-xs sm:text-sm font-medium text-black/85 hover:text-black hover:underline underline-offset-2 transition-colors inline-flex items-center gap-1.5"
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

          {/* Column 4 — Contact & Social Icons */}
          <div className="flex flex-col gap-3.5">
            <h3 className="text-sm font-extrabold tracking-[0.12em] uppercase text-black">
              CONTACT
            </h3>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-black/90 pt-1">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <a href="mailto:support@printgraphi.com" className="hover:underline">
                support@printgraphi.com
              </a>
            </div>

            {/* Social Icons (Pill/Circular badges) */}
            <div className="flex items-center gap-2.5 pt-3">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-black flex items-center justify-center transition-all"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-black flex items-center justify-center transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Community"
                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-black flex items-center justify-center transition-all"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom subtle copyright note */}
        <div className="mt-10 pt-6 border-t border-black/15 flex flex-col sm:flex-row items-center justify-between text-xs text-black/60 gap-2">
          <p>US based, shipping nationwide.</p>
          <p>© {year} Printgraphy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
