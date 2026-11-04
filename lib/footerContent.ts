export interface FooterSocialLink {
  label: string;
  href: string;
  /** facebook | twitter | instagram | pinterest */
  icon: string;
}

export interface FooterPaymentBadge {
  label: string;
}

export interface FooterContent {
  logo: string;
  tagline: string;
  phoneLabel: string;
  phoneHref: string;
  privacyLabel: string;
  privacyHref: string;
  termsLabel: string;
  termsHref: string;
  copyright: string;
  regionLabel: string;
  trustpilot: {
    enabled: boolean;
    brand: string;
    ratingLabel: string;
    reviewText: string;
  };
  payments: FooterPaymentBadge[];
  social: FooterSocialLink[];
}

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  logo: "/logo/printgraphy-footer.png",
  tagline: "PRINTGRAPHI is here to help every step of the way.",
  phoneLabel: "Call 1-800-555-0190",
  phoneHref: "tel:18005550190",
  privacyLabel: "Privacy Policy",
  privacyHref: "/privacy",
  termsLabel: "Terms & Conditions",
  termsHref: "/terms",
  copyright: "© {year} PRINTGRAPHI. All rights reserved.",
  regionLabel: "United States",
  trustpilot: {
    enabled: true,
    brand: "Trustpilot",
    ratingLabel: "Excellent",
    reviewText: "Based on 120,000+ reviews",
  },
  payments: [
    { label: "AMEX" },
    { label: "DISCOVER" },
    { label: "MC" },
    { label: "PAYPAL" },
    { label: "VISA" },
    { label: "APPLE PAY" },
  ],
  social: [
    { label: "Facebook", href: "https://facebook.com", icon: "facebook" },
    { label: "X / Twitter", href: "https://twitter.com", icon: "twitter" },
    { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
    { label: "Pinterest", href: "https://pinterest.com", icon: "pinterest" },
  ],
};

export function mergeFooterContent(saved?: Partial<FooterContent> | null): FooterContent {
  const source = saved || {};
  return {
    ...DEFAULT_FOOTER_CONTENT,
    ...source,
    trustpilot: {
      ...DEFAULT_FOOTER_CONTENT.trustpilot,
      ...(source.trustpilot || {}),
    },
    payments:
      Array.isArray(source.payments) && source.payments.length > 0
        ? source.payments
        : DEFAULT_FOOTER_CONTENT.payments,
    social:
      Array.isArray(source.social) && source.social.length > 0
        ? source.social
        : DEFAULT_FOOTER_CONTENT.social,
  };
}

export function formatFooterCopyright(template: string, year = new Date().getFullYear()) {
  return (template || DEFAULT_FOOTER_CONTENT.copyright).replace(/\{year\}/g, String(year));
}
