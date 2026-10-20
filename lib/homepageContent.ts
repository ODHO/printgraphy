export interface HomepageLinkItem {
  label: string;
  image: string;
  href: string;
}

export interface HomepagePhoto {
  image: string;
  handle: string;
  href?: string;
}

export interface HomepageContent {
  hero: {
    title: string;
    accent: string;
    body: string;
    highlight: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    image: string;
    imageAlt: string;
  };
  collections: {
    title: string;
    seeAllLabel: string;
    seeAllHref: string;
    items: HomepageLinkItem[];
  };
  topSellers: {
    title: string;
    items: HomepageLinkItem[];
  };
  tools: {
    title: string;
    items: HomepageLinkItem[];
  };
  newIn: {
    title: string;
    subtitle: string;
    items: HomepageLinkItem[];
  };
  logoBanner: {
    title: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
    image: string;
    imageAlt: string;
  };
  madeWith: {
    titleBefore: string;
    titleAccent: string;
    body: string;
    photos: HomepagePhoto[];
  };
}

export const DEFAULT_HOMEPAGE: HomepageContent = {
  hero: {
    title: "Save up to 50% off select invitations and announcements",
    accent: "UP TO 50% OFF",
    body: "Create a gorgeous suite that perfectly captures your vision, all while sticking to your wedding budget. Shop invites and RSVs along with accessories like stickers and envelopes.",
    highlight: "Code: SAVEVP • Ends Nov. 8",
    primaryLabel: "Find your dream suite",
    primaryHref: "/browsedesigns",
    secondaryLabel: "Shop all eligible products",
    secondaryHref: "/browsedesigns",
    image: "/banners/hero-invitations.png",
    imageAlt: "Wedding invitations and envelopes styled with eucalyptus",
  },
  collections: {
    title: "Shop by collection",
    seeAllLabel: "See all collections",
    seeAllHref: "/business-cards",
    items: [
      { label: "Top products, starting at $10", image: "/slide.png", href: "/business-cards" },
      { label: "Gifts for clients & employees", image: "/slide.png", href: "/business-cards" },
      { label: "Prepare for professional events", image: "/slide.png", href: "/business-cards" },
      { label: "Prepare for local & community events", image: "/slide.png", href: "/business-cards" },
      { label: "2-day delivery", image: "/slide.png", href: "/business-cards" },
      { label: "Launch my business", image: "/slide.png", href: "/business-cards" },
    ],
  },
  topSellers: {
    title: "Our Top Sellers",
    items: [
      { label: "Standard Business Cards", image: "/card-design.png", href: "/product/business-cards" },
      { label: "Flyers & Leaflets", image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80", href: "/product/flyers" },
      { label: "Invitations & Cards", image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80", href: "/product/invitations" },
      { label: "Stickers & Labels", image: "/new-in-stickers-labels.png", href: "/product/stickers" },
      { label: "Clothing & Apparel", image: "/new-in-clothing.png", href: "/clothing-bags" },
      { label: "Packaging & Boxes", image: "/new-in-packaging.png", href: "/product/mailer-boxes" },
    ],
  },
  tools: {
    title: "Tools that help you grow your digital business",
    items: [
      { label: "Logo design", image: "/logo-design.png", href: "/quote" },
      { label: "Social Media", image: "/social-media.png", href: "/quote" },
      { label: "Printgraphy Corporate Services", image: "/xprintz-corporate.png", href: "/quote" },
      { label: "Custom Business Websites", image: "/custom-business.png", href: "/quote" },
    ],
  },
  newIn: {
    title: "Empowering your brand with high-quality printing solutions.",
    subtitle: "Printgraphy designs and produces the print, packaging, and sourcing behind brands that care how they show up",
    items: [
      { label: "New in Clothing & Bags", image: "/new-in-clothing.png", href: "/clothing-bags" },
      { label: "New in Packaging", image: "/new-in-packaging.png", href: "/business-cards" },
      { label: "New in Stickers & Labels", image: "/new-in-stickers-labels.png", href: "/business-cards" },
      { label: "New in Promo Products", image: "/new-in-promo-products.png", href: "/business-cards" },
    ],
  },
  logoBanner: {
    title: "Design Your Complimentary Logo",
    body: "Printgraphy designs and produces the print, packaging, and sourcing behind brands",
    ctaLabel: "Get A Quote",
    ctaHref: "/quote",
    image: "/complimentary-logo.png",
    imageAlt: "Design Your Complimentary Logo — sample prints",
  },
  madeWith: {
    titleBefore: "Made by you,",
    titleAccent: "#MadeWithPRINTGRAPHY",
    body: "We love to see your custom creations. Post a photo on social media and add @Printgraphy and #MadeWithPrintgraphy for a chance to be featured here.",
    photos: [
      { image: "/photo-1.png", handle: "@thelotsflowerscove", href: "/business-cards" },
      { image: "/photo-2.png", handle: "@partysparklebyjen", href: "/business-cards" },
      { image: "/photo-3.png", handle: "@shimmy.shimmy.bang", href: "/business-cards" },
      { image: "/photo-4.png", handle: "@chickaandco", href: "/business-cards" },
    ],
  },
};

function mergeItems<T>(saved: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(saved) && saved.length > 0 ? saved : fallback;
}

export function mergeHomepage(saved?: Partial<HomepageContent> | null): HomepageContent {
  const source = saved || {};
  return {
    hero: { ...DEFAULT_HOMEPAGE.hero, ...(source.hero || {}) },
    collections: {
      ...DEFAULT_HOMEPAGE.collections,
      ...(source.collections || {}),
      items: mergeItems(source.collections?.items, DEFAULT_HOMEPAGE.collections.items),
    },
    topSellers: {
      ...DEFAULT_HOMEPAGE.topSellers,
      ...(source.topSellers || {}),
      items: mergeItems(source.topSellers?.items, DEFAULT_HOMEPAGE.topSellers.items),
    },
    tools: {
      ...DEFAULT_HOMEPAGE.tools,
      ...(source.tools || {}),
      items: mergeItems(source.tools?.items, DEFAULT_HOMEPAGE.tools.items),
    },
    newIn: {
      ...DEFAULT_HOMEPAGE.newIn,
      ...(source.newIn || {}),
      items: mergeItems(source.newIn?.items, DEFAULT_HOMEPAGE.newIn.items),
    },
    logoBanner: { ...DEFAULT_HOMEPAGE.logoBanner, ...(source.logoBanner || {}) },
    madeWith: {
      ...DEFAULT_HOMEPAGE.madeWith,
      ...(source.madeWith || {}),
      photos: mergeItems(source.madeWith?.photos, DEFAULT_HOMEPAGE.madeWith.photos),
    },
  };
}
