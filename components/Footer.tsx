"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { mediaSrc } from "@/lib/mediaUrl";
import {
  DEFAULT_FOOTER_CONTENT,
  formatFooterCopyright,
  type FooterContent,
} from "@/lib/footerContent";

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
    title: "Let Us Help",
    order: 0,
    isActive: true,
    items: [
      { title: "My Account", url: "/dashboard/account", order: 0, isActive: true },
      { title: "Shipping", url: "/contact", order: 1, isActive: true },
      { title: "Contact & Support", url: "/contact", order: 2, isActive: true },
      { title: "Ideas & Advice", url: "/browsedesigns", order: 3, isActive: true },
      { title: "Accessibility", url: "/contact", order: 4, isActive: true },
    ],
  },
  {
    title: "Our Company",
    order: 1,
    isActive: true,
    items: [
      { title: "About Us", url: "/about", order: 0, isActive: true },
      { title: "Careers", url: "/contact", order: 1, isActive: true },
      { title: "Ambassador Program", url: "/contact", order: 2, isActive: true },
      { title: "PRINTGRAPHI Advantage", url: "/about", order: 3, isActive: true },
      { title: "For Investors", url: "/contact", order: 4, isActive: true },
      { title: "For Media", url: "/contact", order: 5, isActive: true },
      { title: "Sustainability", url: "/about", order: 6, isActive: true },
      { title: "Do Not Sell or Share My Info", url: "/privacy", order: 7, isActive: true },
    ],
  },
];

function PaymentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-8 min-w-[52px] items-center justify-center rounded border border-white/15 bg-white/5 px-2 text-[9px] font-bold tracking-wide text-white/70">
      {label}
    </span>
  );
}

function SocialIcon({ icon }: { icon: string }) {
  const key = (icon || "").toLowerCase();
  if (key === "facebook") {
    return (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path d="M14 9h3V6h-3c-1.6 0-3 1.4-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z" />
      </svg>
    );
  }
  if (key === "twitter" || key === "x") {
    return (
      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  if (key === "instagram") {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect width="18" height="18" x="3" y="3" rx="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
      <path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.3 9.2-.1-.8-.2-2 0-2.9.2-.8 1.3-5.4 1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.5-.3 1.1.5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.6 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.5 2.1-4.5 4.3 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.2c0 .2-.2.2-.3.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.8-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2-.5-2.4-1.2l-.7 2.5c-.2.9-.9 2-1.3 2.7 1 .3 2 .5 3.1.5 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
    </svg>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const [content, setContent] = useState<FooterContent>(DEFAULT_FOOTER_CONTENT);
  const [columns, setColumns] = useState<FooterColumn[]>(DEFAULT_COLUMNS);

  useEffect(() => {
    fetch("/api/footer")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.success) return;
        if (data.content) setContent(data.content);
        if (Array.isArray(data.columns) && data.columns.length > 0) setColumns(data.columns);
      })
      .catch(() => {});
  }, [pathname]);

  if (
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/vendor") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/customize")
  ) {
    return null;
  }

  const navColumns = columns.filter((c) => c.isActive !== false).slice(0, 3);
  const logoSrc = mediaSrc(content.logo) || content.logo || "/logo/printgraphy-footer.png";
  const logoLocal = logoSrc.startsWith("/") && !logoSrc.startsWith("/api/");

  return (
    <footer className="w-full bg-[#071A3D] text-white">
      <div className="container mx-auto px-4 pt-12 pb-8 sm:px-6 sm:pt-14 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Link href="/" className="w-fit shrink-0">
            {logoLocal ? (
              <Image
                src={logoSrc}
                alt="Printgraphi"
                width={200}
                height={56}
                className="h-10 w-auto object-contain sm:h-11"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="Printgraphi" className="h-10 w-auto object-contain sm:h-11" />
            )}
          </Link>
          <p className="max-w-sm text-sm font-medium text-white/75 sm:text-right sm:text-[15px]">
            {content.tagline}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:gap-12 items-baseline">
          {navColumns.map((column) => (
            <div key={column._id || column.title}>
              <h3 className="text-sm font-bold text-white sm:text-[15px]">{column.title}</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {(column.items || [])
                  .filter((item) => item.isActive !== false)
                  .map((link, idx) => (
                    <li key={link._id || `${link.title}-${idx}`}>
                      <Link
                        href={link.url || "#"}
                        target={link.openInNewTab ? "_blank" : undefined}
                        rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                        className="text-sm text-white/65 transition hover:text-white"
                      >
                        {link.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}

          {content.trustpilot.enabled && (
            <div className="flex lg:justify-end">
              <div className="w-full max-w-[240px] rounded-xl border border-white/15 bg-[#04112a] px-5 py-4">
                <p className="text-sm font-bold tracking-tight text-[#00b67a]">{content.trustpilot.brand}</p>
                <div className="mt-2 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className="flex h-5 w-5 items-center justify-center bg-[#00b67a] text-[10px] text-white"
                      aria-hidden
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{content.trustpilot.ratingLabel}</p>
                <p className="mt-0.5 text-xs text-white/55">{content.trustpilot.reviewText}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-14 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {content.payments
              .filter((p) => p.label?.trim())
              .map((payment, idx) => (
                <PaymentBadge key={`${payment.label}-${idx}`} label={payment.label} />
              ))}
          </div>

          <div className="flex items-center gap-2.5">
            {content.social
              .filter((s) => s.href?.trim())
              .map((item, idx) => (
                <SocialLink key={`${item.label}-${idx}`} href={item.href} label={item.label || "Social"}>
                  <SocialIcon icon={item.icon} />
                </SocialLink>
              ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/15 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a href={content.phoneHref || "#"} className="transition hover:text-white">
              {content.phoneLabel}
            </a>
            <span className="hidden text-white/25 sm:inline" aria-hidden>
              |
            </span>
            <Link href={content.privacyHref || "/privacy"} className="transition hover:text-white">
              {content.privacyLabel}
            </Link>
            <span className="hidden text-white/25 sm:inline" aria-hidden>
              |
            </span>
            <Link href={content.termsHref || "/terms"} className="transition hover:text-white">
              {content.termsLabel}
            </Link>
          </div>

          <p className="sm:text-center">{formatFooterCopyright(content.copyright, year)}</p>

          <div className="flex items-center gap-1.5 sm:justify-end">
            <svg className="h-3.5 w-3.5 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M3.5 9h17M3.5 15h17M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z" />
            </svg>
            <span>{content.regionLabel}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
