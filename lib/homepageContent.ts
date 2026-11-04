export interface HomepageLinkItem {
  label: string;
  image: string;
  href: string;
  /** Optional card CTA text (used by Top sellers — defaults to "Customize") */
  ctaLabel?: string;
}

export interface HomepagePhoto {
  image: string;
  handle: string;
  href?: string;
}

export interface HomepageSpotlightItem {
  category: string;
  label: string;
  image: string;
  href: string;
}

export interface HomepageServiceItem {
  label: string;
  body: string;
  href: string;
  /** Icon key: briefcase | palette | box | user | chip | globe */
  icon: string;
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
  spotlight: {
    title: string;
    seeAllLabel: string;
    seeAllHref: string;
    items: HomepageSpotlightItem[];
  };
  tools: {
    title: string;
    seeAllLabel: string;
    seeAllHref: string;
    items: HomepageServiceItem[];
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
  newsletter: {
    title: string;
    body: string;
    placeholder: string;
    submitLabel: string;
    image: string;
    imageAlt: string;
  };
  madeWith: {
    titleBefore: string;
    titleAccent: string;
    body: string;
    photos: HomepagePhoto[];
  };
  emailList: {
    eyebrow: string;
    title: string;
    placeholder: string;
    submitLabel: string;
    image: string;
    imageAlt: string;
  };
  about: {
    title: string;
    body: string;
    features: { title: string; body: string }[];
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
    image: "/banners/hero-invitations-v2.png",
    imageAlt: "Wedding invitations and envelopes styled with eucalyptus",
  },
  collections: {
    title: "Shop by collection",
    seeAllLabel: "View all collections",
    seeAllHref: "/business-cards",
    items: [
      { label: "Try for $10", image: "/catalog/business-stationery-v2.png", href: "/product/business-cards" },
      { label: "Prepare for busy season", image: "/catalog/signs-posters-v2.png", href: "/product/posters" },
      { label: "Professional Events", image: "/catalog/print-collateral-v2.png", href: "/product/brochures" },
      { label: "Business Gifts & Giveaways", image: "/catalog/promo-products-v2.png", href: "/product/mugs" },
      { label: "Holiday Packaging", image: "/catalog/packaging-v2.png", href: "/product/mailer-boxes" },
      { label: "Weddings & Celebrations", image: "/catalog/print-collateral-v2.png", href: "/product/invitations" },
    ],
  },
  topSellers: {
    title: "Ready for your next idea",
    items: [
      { label: "Custom T-Shirts", image: "/catalog/apparel-totes-v2.png", href: "/clothing-bags", ctaLabel: "Customize" },
      { label: "Shipping Packaging", image: "/catalog/packaging-v2.png", href: "/product/mailer-boxes", ctaLabel: "Customize" },
      { label: "Outdoor Banners", image: "/catalog/signs-posters-v2.png", href: "/product/posters", ctaLabel: "Customize" },
      { label: "Shopping Bags", image: "/catalog/apparel-totes-v2.png", href: "/clothing-bags", ctaLabel: "Customize" },
      { label: "Celebration Invitations", image: "/catalog/print-collateral-v2.png", href: "/product/invitations", ctaLabel: "Customize" },
      { label: "Feather Flags", image: "/catalog/signs-posters-v2.png", href: "/product/posters", ctaLabel: "Customize" },
    ],
  },
  spotlight: {
    title: "PRINTGRAPHI Ambassador Spotlight: happy tears",
    seeAllLabel: "Read More",
    seeAllHref: "/business-cards",
    items: [
      {
        category: "AMBASSADOR SPOTLIGHT",
        label: "Flour & Blooms Bakery",
        image: "/catalog/promo-products-v2.png",
        href: "/business-cards",
      },
      {
        category: "BUSINESS CARDS",
        label: "Foil & Specialty Finishes",
        image: "/catalog/business-stationery-v2.png",
        href: "/product/business-cards",
      },
      {
        category: "MAILER BOXES",
        label: "Eco-Friendly Custom Packaging",
        image: "/catalog/packaging-v2.png",
        href: "/product/mailer-boxes",
      },
      {
        category: "STICKERS",
        label: "Custom Die-Cut Sheet Stickers",
        image: "/catalog/stickers-labels-v2.png",
        href: "/product/stickers",
      },
    ],
  },
  tools: {
    title: "Tools, services and expert support to build your business.",
    seeAllLabel: "See all services",
    seeAllHref: "/quote",
    items: [
      {
        label: "All Services",
        body: "Explore our full spectrum of professional printing, distribution, and commercial design solutions built for you.",
        href: "/quote",
        icon: "briefcase",
      },
      {
        label: "Brand Kit",
        body: "Maintain absolute brand consistency with pre-saved layouts, logos, color palettes, and fonts for all print items.",
        href: "/quote",
        icon: "palette",
      },
      {
        label: "Sampling Hub",
        body: "Get hands-on experience by ordering physically printed sample packs to test paper thickness, finishes, and textures.",
        href: "/quote",
        icon: "box",
      },
      {
        label: "Design Services",
        body: "Work closely with real graphic design professionals who will draw up custom visual assets specifically for your products.",
        href: "/quote",
        icon: "user",
      },
      {
        label: "AI Logomaker",
        body: "Draft premium smart logos in minutes with our algorithmic designer tool, instantly ready for web and high-resolution print.",
        href: "/quote",
        icon: "chip",
      },
      {
        label: "PRINTGRAPHI x Wix Websites",
        body: "Build a stunning, fully customizable digital storefront integrated with your printed collateral for full multichannel success.",
        href: "/quote",
        icon: "globe",
      },
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
    title: "The best gifts start early",
    body: "Skip the holiday rush and shop personalized corporate or family gifts early for everyone on your list. Make this season memorable with premium photo prints and custom keepsakes.",
    ctaLabel: "Start shopping",
    ctaHref: "/business-cards",
    image: "/catalog/promo-products-v2.png",
    imageAlt: "Branded notebooks and drinkware gift set",
  },
  newsletter: {
    title: "Get 15% off your order when you sign up for our emails",
    body: "Yes, I'd like to receive special offer emails from PRINTGRAPHI, as well as news about products, services and my designs in progress.",
    placeholder: "Subscription email",
    submitLabel: "Submit",
    image: "/catalog/business-stationery-v2.png",
    imageAlt: "Colorful business card boxes on a desk",
  },
  madeWith: {
    titleBefore: "Made by you,",
    titleAccent: "#MadeWithPrintGraphi",
    body: "We love to see your custom creations. Post a photo on social media and add @Printgraphi and #MadeWithPrintGraphi for a chance to be featured here.",
    photos: [
      { image: "/catalog/business-stationery-v2.png", handle: "@bloom_boutique", href: "/business-cards" },
      { image: "/catalog/promo-products-v2.png", handle: "@roasters_den", href: "/business-cards" },
      { image: "/catalog/packaging-v2.png", handle: "@clay_studio", href: "/business-cards" },
      { image: "/catalog/stickers-labels-v2.png", handle: "@paper_crafts", href: "/business-cards" },
      { image: "/catalog/apparel-totes-v2.png", handle: "@wear_art", href: "/clothing-bags" },
    ],
  },
  emailList: {
    eyebrow: "IT'S GOOD TO BE ON THE LIST.",
    title: "Get 15% off your order when you sign up for our emails",
    placeholder: "Subscription email",
    submitLabel: "Submit",
    image: "/catalog/apparel-totes-v2.png",
    imageAlt: "Team in branded apparel",
  },
  about: {
    title: "PRINTGRAPHI: Here for small business since 1995.",
    body: "PRINTGRAPHI is a full-service print shop that makes printing and designing marketing materials easy for small businesses. Print business cards, flyers, invitations, and more with custom templates or your own designs — and get them delivered to your door.",
    features: [
      {
        title: "Easy Design",
        body: "Our online tools make the process as simple and clear as possible, and we're working to improve your experience all the time.",
      },
      {
        title: "Make It Match",
        body: "Our designs can be used across multiple printed products, which makes it easier for you to create consistent, professional marketing.",
      },
    ],
  },
};

function mergeItems<T>(saved: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(saved) && saved.length > 0 ? saved : fallback;
}

function isServiceItems(items: unknown): items is HomepageServiceItem[] {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every((item) => item && typeof item === "object" && "body" in item && "label" in item);
}

export function mergeHomepage(saved?: Partial<HomepageContent> | null): HomepageContent {
  const source = saved || {};
  const toolsSource = source.tools || {};
  const toolsItems = isServiceItems((toolsSource as { items?: unknown }).items)
    ? (toolsSource as { items: HomepageServiceItem[] }).items
    : DEFAULT_HOMEPAGE.tools.items;

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
    spotlight: {
      ...DEFAULT_HOMEPAGE.spotlight,
      ...(source.spotlight || {}),
      items: mergeItems(source.spotlight?.items, DEFAULT_HOMEPAGE.spotlight.items),
    },
    tools: {
      ...DEFAULT_HOMEPAGE.tools,
      ...toolsSource,
      items: toolsItems,
    },
    newIn: {
      ...DEFAULT_HOMEPAGE.newIn,
      ...(source.newIn || {}),
      items: mergeItems(source.newIn?.items, DEFAULT_HOMEPAGE.newIn.items),
    },
    logoBanner: { ...DEFAULT_HOMEPAGE.logoBanner, ...(source.logoBanner || {}) },
    newsletter: { ...DEFAULT_HOMEPAGE.newsletter, ...(source.newsletter || {}) },
    madeWith: {
      ...DEFAULT_HOMEPAGE.madeWith,
      ...(source.madeWith || {}),
      photos: mergeItems(source.madeWith?.photos, DEFAULT_HOMEPAGE.madeWith.photos),
    },
    emailList: { ...DEFAULT_HOMEPAGE.emailList, ...(source.emailList || {}) },
    about: {
      ...DEFAULT_HOMEPAGE.about,
      ...(source.about || {}),
      features: mergeItems(source.about?.features, DEFAULT_HOMEPAGE.about.features),
    },
  };
}
