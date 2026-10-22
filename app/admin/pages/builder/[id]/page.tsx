"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";

export interface ColumnItem {
  id: string;
  heading: string;
  text: string;
  imgUrl: string;
  btnText: string;
  btnUrl: string;
  bgColor: string;
  textColor: string;
}

export interface BuilderBlock {
  id: string;
  type:
    | "customContainer"
    | "marketingHero"
    | "splitFeature"
    | "threeStageGrid"
    | "darkBanner"
    | "corporateEcosystem"
    | "hero"
    | "heading"
    | "text"
    | "image"
    | "features"
    | "cta"
    | "faq"
    | "contact"
    | "html"
    | "list"
    | "quote"
    | "buttons"
    | "spacer"
    | "separator"
    | "video"
    | "gallery"
    | "table"
    | "cover";
  props: Record<string, any>;
  styles: {
    bgColor: string;
    textColor: string;
    bgImage: string;
    bgOverlay: string;
    paddingTop: number;
    paddingBottom: number;
    textAlign: "left" | "center" | "right";
    borderRadius: number;
    fullWidthBg: boolean;
    containerWidth: "full" | "7xl" | "5xl" | "3xl";
    boxShadow: "none" | "sm" | "md" | "lg" | "xl" | "2xl";
  };
}

export const SYSTEM_PRESET_IMAGES = [
  { label: "Marketing Hero Banner", url: "/banners/marketing-banner.png" },
  { label: "Dark Hub Stage Banner", url: "/banners/bg-hub-stage.png" },
  { label: "Half Blue Gradient Bg", url: "/banners/half-bg.png" },
  { label: "Home Banner Dark", url: "/banners/home-banner.png" },
  { label: "Ellipse Blush Right", url: "/ellipse-right.png" },
  { label: "Ellipse Blush Left", url: "/ellipse-left.png" },
  { label: "Why Printgraphy Build", url: "/whyxprint-build.png" },
  { label: "Custom Website Showcase", url: "/second-marketing-img.png" },
  { label: "Logo & Branding Showcase", url: "/logo-branding.png" },
  { label: "Social Media Showcase", url: "/social-media-marketing.png" },
  { label: "Made & Moved As One", url: "/made-and-move-as-one.png" },
  { label: "Photo Card 1", url: "/xprint-photo-1.png" },
  { label: "Photo Card 2", url: "/xprint-photo-2.png" },
  { label: "Photo Card 3", url: "/xprint-photo-3.png" },
  { label: "Badge Icon 1", url: "/image-icon-1.png" },
  { label: "Badge Icon 2", url: "/image-icon-2.png" },
  { label: "Badge Icon 3", url: "/image-icon-3.png" },
];

const DEFAULT_BLOCK_PRESETS: Record<string, Omit<BuilderBlock, "id">> = {
  customContainer: {
    type: "customContainer",
    props: {
      columnsCount: 2, // 1, 2, 3, 4
      columnLayout: "50-50", // "100", "50-50", "60-40", "40-60", "33-33-33", "25-25-25-25"
      columns: [
        {
          id: "col-1",
          heading: "Flexible Left Column Heading",
          text: "Write your custom paragraph here. Upload images, add buttons, and style this column.",
          imgUrl: "",
          btnText: "Explore More",
          btnUrl: "/browsedesigns",
          bgColor: "#ffffff",
          textColor: "#18181b",
        },
        {
          id: "col-2",
          heading: "Flexible Right Column Heading",
          text: "Upload custom images or add content widgets to this right column.",
          imgUrl: "/second-marketing-img.png",
          btnText: "Contact Us",
          btnUrl: "/contact",
          bgColor: "#fbfaf7",
          textColor: "#18181b",
        },
      ],
    },
    styles: {
      bgColor: "#ffffff",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 64,
      paddingBottom: 64,
      textAlign: "left",
      borderRadius: 16,
      fullWidthBg: true,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  marketingHero: {
    type: "marketingHero",
    props: {
      badgeText: "Marketing & Digital Brand Intelligence",
      title: "The Brand And The Digital Presence Behind The Product.",
      subtitle: "Websites, identity, and brand strategy, built by the same technology team that runs the Printgraphy operating layer.",
      body: "Design that's ready to sell the moment your product is ready to ship.",
      btn1Text: "Start A Project",
      btn1Url: "/quote",
      btn2Text: "Book A Consultation",
      btn2Url: "/contact",
      heroImg: "/whyxprint-build.png",
      blushImg: "/ellipse-right.png",
    },
    styles: {
      bgColor: "#ffffff",
      textColor: "#18181b",
      bgImage: "/banners/marketing-banner.png",
      bgOverlay: "rgba(255,255,255,0)",
      paddingTop: 80,
      paddingBottom: 80,
      textAlign: "left",
      borderRadius: 0,
      fullWidthBg: true,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  splitFeature: {
    type: "splitFeature",
    props: {
      imagePosition: "right",
      badgeText: "Custom Website",
      title: "A site that converts, not just exists.",
      tagline: "Your business, built for the web",
      body: "Our website is your storefront before a customer ever sees the product. We design and develop custom sites optimized for how people actually shop, from first click to checkout.",
      features: [
        "Custom website design and development",
        "Responsive and mobile-first by default",
        "User experience built around your customer, not a template",
        "SEO-ready structure and fast, clean builds",
      ],
      btnText: "Start Your Website",
      btnUrl: "/quote",
      imgUrl: "/second-marketing-img.png",
      showRadialGlow: true,
    },
    styles: {
      bgColor: "#ffffff",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 80,
      paddingBottom: 80,
      textAlign: "left",
      borderRadius: 0,
      fullWidthBg: true,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  threeStageGrid: {
    type: "threeStageGrid",
    props: {
      badgeText: "One hub, three stages, zero handoffs",
      title: "From first sketch to final delivery, it never leaves the family.",
      body: "Most companies make you stitch together a designer, a printer, and a shipping provider yourself. Printgraphy was built so you never have to.",
      cards: [
        {
          iconUrl: "/design-and-brand-icon.png",
          title: "Design and brand, by AxisBlu.",
          desc: "Logo design, brand identity, custom websites, ecommerce builds, and launch strategy.",
        },
        {
          iconUrl: "/print-products-icon.png",
          title: "Print and produce, by Printgraphy.",
          desc: "Business and marketing print, corporate office supplies, and full packaging.",
        },
        {
          iconUrl: "/store-delivery-icon.png",
          title: "Store and deliver, by OPS",
          desc: "Warehousing, inventory storage, logistics, and shipping delivery straight to your customer.",
        },
      ],
    },
    styles: {
      bgColor: "#FAF8F5",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 80,
      paddingBottom: 80,
      textAlign: "left",
      borderRadius: 0,
      fullWidthBg: true,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  darkBanner: {
    type: "darkBanner",
    props: {
      headline: "Built for brands at every stage of growth, whether it's your first logo file or your millionth unit shipped.",
      bgImgUrl: "/banners/bg-hub-stage.png",
      bullets: [
        "Startups and first-time founders building a brand from zero",
        "Ecommerce and DTC brands scaling their digital presence",
        "Retail and product businesses that need print and digital in sync",
        "Corporate and enterprise teams consolidating vendors into one accountable partner",
      ],
    },
    styles: {
      bgColor: "#09090b",
      textColor: "#ffffff",
      bgImage: "/banners/bg-hub-stage.png",
      bgOverlay: "rgba(0,0,0,0.6)",
      paddingTop: 48,
      paddingBottom: 48,
      textAlign: "left",
      borderRadius: 28,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "2xl",
    },
  },
  corporateEcosystem: {
    type: "corporateEcosystem",
    props: {
      topBadge: "Printgraphy Corporate Services",
      topTitle: "Everything a product brand needs, under one roof.",
      topTagline: "One ecosystem, from first sketch to final delivery",
      topDesc: "Most agencies stop at the file handoff. Printgraphy doesn't, because the same operation that designs your brand also prints it, packages it, stores it, and gets it to your customer's door.",
      topBtnText: "Talk To Our Enterprise Team",
      topBtnUrl: "/contact",
      cards: [
        {
          badgeUrl: "/image-icon-1.png",
          title: "Design and build, by AxisBlu Intelligence.",
          imgUrl: "/xprint-photo-1.png",
          desc: "Logo and brand identity, custom websites, ecommerce platforms, and strategy.",
        },
        {
          badgeUrl: "/image-icon-2.png",
          title: "Print and produce, by Printgraphy.",
          imgUrl: "/xprint-photo-2.png",
          desc: "Business print, corporate supplies, and full-scale product packaging.",
        },
        {
          badgeUrl: "/image-icon-3.png",
          title: "Store and deliver, by OnePoint Services.",
          imgUrl: "/xprint-photo-3.png",
          desc: "Warehousing, inventory storage, logistics, and last-mile delivery.",
        },
      ],
      bottomHighlight: "One idea in, one product delivered, The cycle never leaves our hand.",
      bottomBadge: "How it connects back to the hub",
      bottomTitle: "What you build here becomes what ships everywhere else.",
      bottomTagline: "Make your brand instantly recognizable",
      bottomDesc: "Your brand system sets the standard your packaging is printed to. Your website is where your go-to-market work sends traffic, and your product itself moves through the same operation.",
      bottomBgImg: "/banners/half-bg.png",
    },
    styles: {
      bgColor: "#1c1d22",
      textColor: "#ffffff",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 0,
      paddingBottom: 0,
      textAlign: "left",
      borderRadius: 0,
      fullWidthBg: true,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  hero: {
    type: "hero",
    props: {
      title: "Elevate Your Brand With Custom Luxury Printing",
      subtitle: "Fast, eco-luxury printing solutions for business cards, brochures, and marketing collateral.",
      buttonText: "Browse Templates",
      buttonUrl: "/browsedesigns",
    },
    styles: {
      bgColor: "#e74b2d",
      textColor: "#ffffff",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 48,
      paddingBottom: 48,
      textAlign: "center",
      borderRadius: 24,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "lg",
    },
  },
  heading: {
    type: "heading",
    props: {
      text: "Section Heading Title",
      level: "h2",
    },
    styles: {
      bgColor: "transparent",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 16,
      paddingBottom: 8,
      textAlign: "left",
      borderRadius: 0,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  text: {
    type: "text",
    props: {
      content: "Write your detailed paragraph text here. Customize colors, fonts, background images, and paddings using the inspector panel on the left.",
    },
    styles: {
      bgColor: "transparent",
      textColor: "#3f3f46",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 12,
      paddingBottom: 12,
      textAlign: "left",
      borderRadius: 0,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  image: {
    type: "image",
    props: {
      url: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=1000&auto=format&fit=crop&q=80",
      alt: "Custom Print Showcase",
      caption: "Eco-Luxury Custom Printing Sample",
    },
    styles: {
      bgColor: "transparent",
      textColor: "#71717a",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 16,
      paddingBottom: 16,
      textAlign: "center",
      borderRadius: 16,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  features: {
    type: "features",
    props: {
      items: [
        { icon: "⚡", title: "Fast Production", desc: "Same-day printing and rapid dispatch options available." },
        { icon: "🌿", title: "Eco-Friendly Materials", desc: "Sustainably sourced premium paper stocks and non-toxic inks." },
        { icon: "🎨", title: "Custom Studios", desc: "Drag-and-drop online design canvas with real-time proofing." },
      ],
    },
    styles: {
      bgColor: "#fbfaf7",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 32,
      paddingBottom: 32,
      textAlign: "left",
      borderRadius: 20,
      fullWidthBg: true,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  cta: {
    type: "cta",
    props: {
      title: "Ready to Start Your Custom Design?",
      subtitle: "Choose from hundreds of customizable templates or design from scratch.",
      buttonText: "Open Design Studio",
      buttonUrl: "/customize",
    },
    styles: {
      bgColor: "#0f172a",
      textColor: "#ffffff",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 40,
      paddingBottom: 40,
      textAlign: "center",
      borderRadius: 24,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  faq: {
    type: "faq",
    props: {
      title: "Frequently Asked Questions",
      items: [
        { q: "What is the standard turnaround time?", a: "Most print orders ship within 2 to 4 business days." },
        { q: "Can I upload my own print-ready PDF?", a: "Yes, our studio accepts high-res PDF, PNG, SVG, and AI vector formats." },
        { q: "Do you offer sample kits?", a: "Yes, paper stock sample kits can be ordered directly from our catalog." },
      ],
    },
    styles: {
      bgColor: "#ffffff",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 24,
      paddingBottom: 24,
      textAlign: "left",
      borderRadius: 16,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  contact: {
    type: "contact",
    props: {
      heading: "Get In Touch With Our Print Specialists",
      email: "support@printgraphi.com",
      phone: "+1 (800) 555-XPRINT",
      address: "100 Luxury Print Ave, Suite 400, New York, NY",
    },
    styles: {
      bgColor: "#f1f5f9",
      textColor: "#0f172a",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 32,
      paddingBottom: 32,
      textAlign: "left",
      borderRadius: 20,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  list: {
    type: "list",
    props: {
      style: "bullet",
      items: ["First point", "Second point", "Third point"],
    },
    styles: {
      bgColor: "transparent",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 12,
      paddingBottom: 12,
      textAlign: "left",
      borderRadius: 0,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  quote: {
    type: "quote",
    props: {
      text: "A short quote or testimonial goes here.",
      cite: "Customer name",
    },
    styles: {
      bgColor: "#fbfaf7",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 28,
      paddingBottom: 28,
      textAlign: "left",
      borderRadius: 16,
      fullWidthBg: false,
      containerWidth: "5xl",
      boxShadow: "none",
    },
  },
  buttons: {
    type: "buttons",
    props: {
      label: "Get a quote",
      href: "/quote",
      label2: "Browse designs",
      href2: "/browsedesigns",
    },
    styles: {
      bgColor: "transparent",
      textColor: "#ffffff",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 16,
      paddingBottom: 16,
      textAlign: "left",
      borderRadius: 0,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  spacer: {
    type: "spacer",
    props: { height: 48 },
    styles: {
      bgColor: "transparent",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 0,
      paddingBottom: 0,
      textAlign: "left",
      borderRadius: 0,
      fullWidthBg: true,
      containerWidth: "full",
      boxShadow: "none",
    },
  },
  separator: {
    type: "separator",
    props: {},
    styles: {
      bgColor: "transparent",
      textColor: "#e4e4e7",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 12,
      paddingBottom: 12,
      textAlign: "center",
      borderRadius: 0,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  video: {
    type: "video",
    props: {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      caption: "",
    },
    styles: {
      bgColor: "transparent",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 16,
      paddingBottom: 16,
      textAlign: "center",
      borderRadius: 16,
      fullWidthBg: false,
      containerWidth: "5xl",
      boxShadow: "none",
    },
  },
  gallery: {
    type: "gallery",
    props: {
      images: [
        { url: "/slide.png", caption: "Photo 1" },
        { url: "/slide.png", caption: "Photo 2" },
        { url: "/slide.png", caption: "Photo 3" },
      ],
    },
    styles: {
      bgColor: "transparent",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 16,
      paddingBottom: 16,
      textAlign: "left",
      borderRadius: 0,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  table: {
    type: "table",
    props: {
      headers: "Item | Details",
      rows: "Paper | Glossy, matte, or uncoated\nQuantity | 50 to 10,000+",
    },
    styles: {
      bgColor: "#ffffff",
      textColor: "#18181b",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 16,
      paddingBottom: 16,
      textAlign: "left",
      borderRadius: 12,
      fullWidthBg: false,
      containerWidth: "5xl",
      boxShadow: "none",
    },
  },
  cover: {
    type: "cover",
    props: {
      title: "Your page headline",
      subtitle: "A short line under the headline.",
      buttonText: "Get started",
      buttonUrl: "/quote",
      image: "/banners/home-banner.png",
    },
    styles: {
      bgColor: "#18181b",
      textColor: "#ffffff",
      bgImage: "",
      bgOverlay: "rgba(0,0,0,0.35)",
      paddingTop: 72,
      paddingBottom: 72,
      textAlign: "center",
      borderRadius: 0,
      fullWidthBg: true,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
  html: {
    type: "html",
    props: {
      code: `<div style="padding: 24px; border: 2px dashed #e74b2d; text-align: center; border-radius: 16px; background: #fff1eb;">
  <h3 style="color: #e74b2d; font-weight: 800; font-size: 18px; margin-bottom: 8px;">Custom HTML / SVG Container</h3>
  <p style="color: #4a5568; font-size: 14px;">Embed custom vector graphics, widgets, maps, or HTML sections here.</p>
</div>`,
    },
    styles: {
      bgColor: "transparent",
      textColor: "#000000",
      bgImage: "",
      bgOverlay: "transparent",
      paddingTop: 16,
      paddingBottom: 16,
      textAlign: "left",
      borderRadius: 0,
      fullWidthBg: false,
      containerWidth: "7xl",
      boxShadow: "none",
    },
  },
};

function isImageKey(key: string) {
  return key === "url" || /img|image|icon|photo|badge|src/i.test(key);
}

async function uploadBuilderImage(file: File) {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", "uploads");
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = await res.json();
  if (!data.success || !data.url) throw new Error("Upload failed");
  return data.url as string;
}

function BlockFields({ props, onChange }: { props: Record<string, any>; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      {Object.entries(props).map(([key, value]) => (
        <FieldRow key={key} name={key} value={value} onChange={(next) => onChange(key, next)} />
      ))}
    </div>
  );
}

function FieldRow({ name, value, onChange }: { name: string; value: any; onChange: (value: any) => void }) {
  const label = name.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
  if (name === "level") {
    return (
      <label className="block text-base text-zinc-400">
        Heading level
        <select value={value || "h2"} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white">
          {["h1", "h2", "h3", "h4"].map((level) => <option key={level} value={level}>{level.toUpperCase()}</option>)}
        </select>
      </label>
    );
  }
  if (name === "style" && (value === "bullet" || value === "number")) {
    return (
      <label className="block text-base text-zinc-400">
        List style
        <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white">
          <option value="bullet">Bulleted</option>
          <option value="number">Numbered</option>
        </select>
      </label>
    );
  }
  if (name === "imagePosition") {
    return (
      <label className="block text-base text-zinc-400">
        Image position
        <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white">
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </label>
    );
  }
  if (typeof value === "number") {
    return (
      <label className="block text-base text-zinc-400">
        {label}
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white" />
      </label>
    );
  }
  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-2 text-base text-zinc-300">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
    );
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return (
      <label className="block text-base text-zinc-400">
        {label} (one per line)
        <textarea rows={4} value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} className="mt-1 w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white" />
      </label>
    );
  }
  if (Array.isArray(value) && value.every((item) => item && typeof item === "object")) {
    return (
      <div className="space-y-2">
        <p className="text-base font-bold text-zinc-400">{label}</p>
        {value.map((item, index) => (
          <div key={index} className="rounded-xl border border-zinc-700 p-2 space-y-2">
            {Object.entries(item).map(([itemKey, itemValue]) => (
              <FieldRow
                key={itemKey}
                name={itemKey}
                value={itemValue}
                onChange={(next) => {
                  const updated = value.map((entry, entryIndex) => entryIndex === index ? { ...entry, [itemKey]: next } : entry);
                  onChange(updated);
                }}
              />
            ))}
            <button type="button" onClick={() => onChange(value.filter((_, entryIndex) => entryIndex !== index))} className="text-base font-bold text-red-400 cursor-pointer">Remove</button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...value, { ...value[0] }])}
          className="text-base font-bold text-sky-400 cursor-pointer"
        >
          + Add
        </button>
      </div>
    );
  }
  if (typeof value === "string" && isImageKey(name)) {
    return (
      <div>
        <label className="text-base text-zinc-400 block mb-1">{label}</label>
        <div className="flex items-center gap-2">
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white" />
          <label className="px-3 py-1.5 bg-[#e74b2d] text-white text-base font-bold rounded-xl shrink-0 cursor-pointer">
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              onChange(await uploadBuilderImage(file));
            }} />
          </label>
        </div>
      </div>
    );
  }
  if (typeof value === "string" && (value.length > 80 || /body|content|desc|text|subtitle|caption|rows/i.test(name))) {
    return (
      <label className="block text-base text-zinc-400">
        {label}
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white" />
      </label>
    );
  }
  if (typeof value === "string") {
    return (
      <label className="block text-base text-zinc-400">
        {label}
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white" />
      </label>
    );
  }
  return null;
}

function CanvasFallback({ block }: { block: BuilderBlock }) {
  const title = block.props.title || block.props.text || block.props.headline || block.props.heading || block.props.topTitle || block.type;
  const body = block.props.subtitle || block.props.body || block.props.content || block.props.topDesc || "";
  return (
    <div className="py-4 space-y-2 text-left">
      <p className="text-base font-bold uppercase tracking-wide text-zinc-400">{block.type}</p>
      <p className="text-lg font-bold">{title}</p>
      {body && <p className="text-base opacity-80">{body}</p>}
      {Array.isArray(block.props.items) && (
        <ul className="text-base list-disc pl-5">
          {block.props.items.slice(0, 4).map((item: any, index: number) => (
            <li key={index}>{typeof item === "string" ? item : item.q || item.title || item.caption || ""}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ElementorPageBuilder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  const [blocks, setBlocks] = useState<BuilderBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Inspector & Viewport State
  const [leftTab, setLeftTab] = useState<"elements" | "style" | "settings">("elements");
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Drag & Drop State
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [dragOverBlockIndex, setDragOverBlockIndex] = useState<number | null>(null);

  // ── WORDPRESS MEDIA LIBRARY MODAL STATE ──────────────────────────────
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<{ type: "style" | "prop" | "colProp"; key: string; colIndex?: number } | null>(null);
  const [mediaTab, setMediaTab] = useState<"library" | "upload">("library");
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string }[]>([]);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}`);
      const data = await res.json();
      if (data.success && data.page) {
        const p = data.page;
        setPageTitle(p.title || "");
        setPageSlug(p.slug || "");
        setIsPublished(p.isPublished ?? true);
        setMetaTitle(p.metaTitle || "");
        setMetaDescription(p.metaDescription || "");

        if (Array.isArray(p.blocks) && p.blocks.length > 0) {
          setBlocks(p.blocks);
        } else if (p.content) {
          setBlocks([
            {
              id: "initial-html-block",
              type: "html",
              props: { code: p.content },
              styles: {
                bgColor: "transparent",
                textColor: "#000000",
                bgImage: "",
                bgOverlay: "transparent",
                paddingTop: 20,
                paddingBottom: 20,
                textAlign: "left",
                borderRadius: 0,
                fullWidthBg: true,
                containerWidth: "7xl",
                boxShadow: "none",
              },
            },
          ]);
        } else {
          setBlocks([
            { id: `b-heading-${Date.now()}`, ...JSON.parse(JSON.stringify(DEFAULT_BLOCK_PRESETS.heading)) },
            { id: `b-text-${Date.now() + 1}`, ...JSON.parse(JSON.stringify(DEFAULT_BLOCK_PRESETS.text)) },
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to load page for builder:", err);
      showToast("Failed to load page for builder", "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchUploadedImages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/upload");
      const data = await res.json();
      if (data.success && Array.isArray(data.images)) {
        setUploadedImages(data.images);
      }
    } catch (err) {
      console.error("Failed to fetch uploaded images:", err);
    }
  }, []);

  useEffect(() => {
    fetchPage();
    fetchUploadedImages();
  }, [fetchPage, fetchUploadedImages]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const addBlock = (type: keyof typeof DEFAULT_BLOCK_PRESETS) => {
    const preset = DEFAULT_BLOCK_PRESETS[type];
    if (!preset) return;

    const newBlock: BuilderBlock = {
      id: `b-${type}-${Date.now()}`,
      type: preset.type as any,
      props: JSON.parse(JSON.stringify(preset.props)),
      styles: JSON.parse(JSON.stringify(preset.styles)),
    };

    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    setLeftTab("style");
  };

  // Drag & Drop Reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedBlockIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverBlockIndex !== index) {
      setDragOverBlockIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === dropIndex) {
      setDraggedBlockIndex(null);
      setDragOverBlockIndex(null);
      return;
    }

    const updated = [...blocks];
    const [moved] = updated.splice(draggedBlockIndex, 1);
    updated.splice(dropIndex, 0, moved);

    setBlocks(updated);
    setDraggedBlockIndex(null);
    setDragOverBlockIndex(null);
  };

  const moveBlock = (index: number, dir: "up" | "down") => {
    const targetIdx = dir === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;

    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setBlocks(updated);
  };

  const duplicateBlock = (index: number) => {
    const original = blocks[index];
    const dup: BuilderBlock = {
      ...JSON.parse(JSON.stringify(original)),
      id: `b-${original.type}-${Date.now()}`,
    };
    const updated = [...blocks];
    updated.splice(index + 1, 0, dup);
    setBlocks(updated);
    setSelectedBlockId(dup.id);
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const updateSelectedProp = (key: string, value: any) => {
    if (!selectedBlockId) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === selectedBlockId ? { ...b, props: { ...b.props, [key]: value } } : b))
    );
  };

  const updateSelectedColumn = (colIndex: number, key: string, value: any) => {
    if (!selectedBlockId || !selectedBlock?.props?.columns) return;
    const updatedCols = [...selectedBlock.props.columns];
    updatedCols[colIndex] = { ...updatedCols[colIndex], [key]: value };
    updateSelectedProp("columns", updatedCols);
  };

  // Change Columns Count for Container Block
  const setContainerColumnsCount = (count: number) => {
    if (!selectedBlockId || !selectedBlock) return;
    const currentCols = selectedBlock.props.columns || [];
    const newCols: ColumnItem[] = [];

    for (let i = 0; i < count; i++) {
      if (currentCols[i]) {
        newCols.push(currentCols[i]);
      } else {
        newCols.push({
          id: `col-${i + 1}`,
          heading: `Column ${i + 1} Title`,
          text: `Column ${i + 1} description and paragraph content. Add images, buttons, and custom colors.`,
          imgUrl: "",
          btnText: "Learn More",
          btnUrl: "/browsedesigns",
          bgColor: i % 2 === 0 ? "#ffffff" : "#fbfaf7",
          textColor: "#18181b",
        });
      }
    }

    updateSelectedProp("columnsCount", count);
    updateSelectedProp("columns", newCols);
  };

  const updateSelectedStyle = (key: string, value: any) => {
    if (!selectedBlockId) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === selectedBlockId ? { ...b, styles: { ...b.styles, [key]: value } } : b))
    );
  };

  // Open Media Picker Modal
  const openMediaPicker = (type: "style" | "prop" | "colProp", key: string, colIndex?: number) => {
    setMediaTarget({ type, key, colIndex });
    let currentVal: any = "";
    if (type === "style") {
      currentVal = selectedBlock?.styles?.[key as keyof typeof selectedBlock.styles] || "";
    } else if (type === "prop") {
      currentVal = selectedBlock?.props?.[key] || "";
    } else if (type === "colProp" && typeof colIndex === "number") {
      currentVal = selectedBlock?.props?.columns?.[colIndex]?.[key] || "";
    }
    setSelectedMediaUrl(typeof currentVal === "string" ? currentVal : "");
    setShowMediaModal(true);
    fetchUploadedImages();
  };

  // Upload file directly to public/uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        showToast("Image uploaded to public/uploads successfully!");
        setSelectedMediaUrl(data.url);
        fetchUploadedImages();
        setMediaTab("library");
      } else {
        throw new Error(data.message || "Failed to upload image");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const applySelectedMedia = () => {
    if (!mediaTarget || !selectedBlockId) return;
    if (mediaTarget.type === "style") {
      updateSelectedStyle(mediaTarget.key, selectedMediaUrl);
    } else if (mediaTarget.type === "prop") {
      updateSelectedProp(mediaTarget.key, selectedMediaUrl);
    } else if (mediaTarget.type === "colProp" && typeof mediaTarget.colIndex === "number") {
      updateSelectedColumn(mediaTarget.colIndex, mediaTarget.key, selectedMediaUrl);
    }
    setShowMediaModal(false);
  };

  // Compile HTML for public site
  const esc = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const compileHTML = (): string => {
    return blocks
      .map((block) => {
        const st = block.styles;
        const bgImgCss = st.bgImage ? `background-image: url('${st.bgImage}'); background-size: cover; background-position: center;` : "";
        const styleAttr = `style="background-color: ${st.bgColor}; ${bgImgCss} color: ${st.textColor}; padding-top: clamp(16px, 4vw, ${st.paddingTop}px); padding-bottom: clamp(16px, 4vw, ${st.paddingBottom}px); text-align: ${st.textAlign}; border-radius: ${st.borderRadius}px;"`;

        const containerClass =
          st.containerWidth === "full"
            ? "w-full px-4 sm:px-6 lg:px-8"
            : st.containerWidth === "3xl"
            ? "max-w-3xl mx-auto px-4 sm:px-6"
            : st.containerWidth === "5xl"
            ? "max-w-5xl mx-auto px-4 sm:px-6"
            : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

        switch (block.type) {
          case "customContainer": {
            const cols = block.props.columns || [];
            const colGridClass =
              cols.length === 1
                ? "grid-cols-1"
                : cols.length === 3
                ? "grid-cols-1 md:grid-cols-3"
                : cols.length === 4
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                : "grid-cols-1 md:grid-cols-2";

            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass}">
                  <div class="grid ${colGridClass} gap-8 items-stretch">
                    ${cols
                      .map(
                        (col: ColumnItem) => `
                      <div class="rounded-2xl p-6 border border-zinc-100 shadow-sm flex flex-col justify-between space-y-4" style="background-color: ${col.bgColor || "#ffffff"}; color: ${col.textColor || "#18181b"};">
                        <div class="space-y-3">
                          ${col.imgUrl ? `<div class="w-full rounded-xl overflow-hidden mb-2"><img src="${col.imgUrl}" alt="${col.heading || ""}" class="w-full h-auto object-cover" /></div>` : ""}
                          ${col.heading ? `<h3 class="text-xl font-extrabold tracking-tight">${col.heading}</h3>` : ""}
                          ${col.text ? `<p class="text-base opacity-90 leading-relaxed">${col.text}</p>` : ""}
                        </div>
                        ${col.btnText ? `<div><a href="${col.btnUrl}" class="inline-block px-5 py-2.5 bg-[#e74b2d] text-white font-bold rounded-lg text-base shadow-md">${col.btnText}</a></div>` : ""}
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                </div>
              </section>
            `;
          }

          case "marketingHero":
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass} py-16 sm:py-24 relative z-10">
                  <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                    <div class="lg:col-span-6 space-y-6">
                      ${block.props.badgeText ? `<div class="inline-block"><span class="px-4 py-1.5 rounded-full bg-[#fff1eb] border border-[#e74b2d]/30 text-[#e74b2d] text-base font-bold tracking-wide shadow-2xs">${block.props.badgeText}</span></div>` : ""}
                      <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.12]" style="color: ${st.textColor};">${block.props.title || ""}</h1>
                      <p class="text-[#e74b2d] font-bold text-lg sm:text-xl tracking-tight">${block.props.subtitle || ""}</p>
                      <p class="text-base sm:text-base leading-relaxed max-w-xl opacity-90" style="color: ${st.textColor};">${block.props.body || ""}</p>
                      <div class="flex flex-col sm:flex-row items-center gap-4 pt-2">
                        ${block.props.btn1Text ? `<a href="${block.props.btn1Url || "#"}" class="w-full sm:w-auto px-7 py-3.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-bold rounded-md text-base sm:text-base shadow-lg shadow-[#e74b2d]/30 transition-all text-center">${block.props.btn1Text}</a>` : ""}
                        ${block.props.btn2Text ? `<a href="${block.props.btn2Url || "#"}" class="w-full sm:w-auto px-7 py-3.5 bg-[#1c1d22] hover:bg-zinc-800 text-white font-bold rounded-md text-base sm:text-base shadow-lg transition-all text-center">${block.props.btn2Text}</a>` : ""}
                      </div>
                    </div>
                    <div class="lg:col-span-6 relative flex items-center justify-center">
                      ${block.props.blushImg ? `<img src="${block.props.blushImg}" alt="Blush Glow" class="absolute -top-12 -right-12 w-64 h-64 object-contain pointer-events-none z-0" />` : ""}
                      ${block.props.heroImg ? `
                        <div class="relative z-10 w-full max-w-xl rounded-[28px] overflow-hidden shadow-2xl border border-white bg-white">
                          <img src="${block.props.heroImg}" alt="${block.props.title || ""}" class="w-full h-auto object-cover" />
                        </div>
                      ` : ""}
                    </div>
                  </div>
                </div>
              </section>
            `;

          case "splitFeature": {
            const isLeft = block.props.imagePosition === "left";
            return `
              <section class="relative w-full py-20 overflow-hidden" ${styleAttr}>
                <div class="${containerClass}">
                  <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                    <div class="lg:col-span-6 ${isLeft ? "lg:order-1" : "lg:order-2"} space-y-6 z-10">
                      ${block.props.badgeText ? `<div class="inline-block"><span class="px-4 py-1.5 rounded-full bg-[#fff1eb] border border-[#e74b2d]/30 text-[#e74b2d] text-base font-bold tracking-wide">${block.props.badgeText}</span></div>` : ""}
                      <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.12]" style="color: ${st.textColor};">${block.props.title || ""}</h2>
                      <p class="text-[#e74b2d] font-bold text-lg sm:text-xl tracking-tight">${block.props.tagline || ""}</p>
                      <p class="text-base sm:text-base leading-relaxed opacity-90" style="color: ${st.textColor};">${block.props.body || ""}</p>
                      <ul class="space-y-3.5 pt-2">
                        ${(block.props.features || [])
                          .map(
                            (feat: string) => `
                          <li class="flex items-center gap-3 font-bold text-base sm:text-base" style="color: ${st.textColor};">
                            <span class="shrink-0 text-[#e74b2d]">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M2 12L7.25 17L9.875 14M8 12L13.25 17L22 7M16 7L12.5 11" stroke="#e74b2d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </span>
                            <span>${feat}</span>
                          </li>
                        `
                          )
                          .join("")}
                      </ul>
                      ${block.props.btnText ? `<div class="pt-4"><a href="${block.props.btnUrl || "#"}" class="inline-block px-8 py-3.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-bold rounded-md text-base sm:text-base shadow-lg shadow-[#e74b2d]/30 transition-all">${block.props.btnText}</a></div>` : ""}
                    </div>
                    <div class="lg:col-span-6 ${isLeft ? "lg:order-2" : "lg:order-1"} relative flex items-center justify-center">
                      ${block.props.imgUrl ? `
                        <div class="relative z-10 w-full max-w-xl rounded-[28px] overflow-hidden shadow-xl border border-white bg-white">
                          <img src="${block.props.imgUrl}" alt="${block.props.title || ""}" class="w-full h-auto object-cover" />
                        </div>
                      ` : ""}
                    </div>
                  </div>
                </div>
              </section>
            `;
          }

          case "threeStageGrid":
            return `
              <section class="relative w-full py-20 overflow-hidden" ${styleAttr}>
                <div class="${containerClass}">
                  <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    <div class="lg:col-span-4 space-y-4">
                      ${block.props.badgeText ? `<div class="inline-block"><span class="px-4 py-1.5 rounded-full bg-[#fff1eb] border border-[#e74b2d]/30 text-[#e74b2d] text-base font-bold tracking-wide">${block.props.badgeText}</span></div>` : ""}
                      <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight" style="color: ${st.textColor};">${block.props.title || ""}</h2>
                      <p class="text-base leading-relaxed opacity-90" style="color: ${st.textColor};">${block.props.body || ""}</p>
                    </div>
                    <div class="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                      ${(block.props.cards || [])
                        .map(
                          (card: any) => `
                        <div class="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs flex flex-col space-y-4">
                          ${card.iconUrl ? `<div class="w-12 h-12 shrink-0"><img src="${card.iconUrl}" alt="${card.title || ""}" class="w-full h-full object-contain" /></div>` : ""}
                          <h3 class="font-extrabold text-zinc-900 text-base leading-snug">${card.title || ""}</h3>
                          <p class="text-base text-zinc-600 leading-relaxed">${card.desc || ""}</p>
                        </div>
                      `
                        )
                        .join("")}
                    </div>
                  </div>
                </div>
              </section>
            `;

          case "darkBanner":
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass}">
                  <div class="relative rounded-[28px] overflow-hidden bg-zinc-950 p-8 sm:p-12 border border-zinc-800 shadow-2xl">
                    ${block.props.bgImgUrl ? `<img src="${block.props.bgImgUrl}" alt="Banner Bg" class="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" />` : ""}
                    <div class="relative z-10 space-y-6 max-w-4xl">
                      <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">${block.props.headline || ""}</h2>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        ${(block.props.bullets || [])
                          .map(
                            (bullet: string) => `
                          <div class="flex items-start gap-3 bg-white/5 border border-white/10 backdrop-blur-xs rounded-xl p-4">
                            <span class="shrink-0 text-[#e74b2d] font-bold">✓</span>
                            <span class="text-base sm:text-base font-medium text-zinc-200">${bullet}</span>
                          </div>
                        `
                          )
                          .join("")}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            `;

          case "corporateEcosystem":
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="py-16 sm:py-24 ${containerClass} text-center space-y-6">
                  ${block.props.topBadge ? `<span class="px-4 py-1.5 rounded-full bg-[#fff1eb] border border-[#e74b2d]/30 text-[#e74b2d] text-base font-bold tracking-wide inline-block">${block.props.topBadge}</span>` : ""}
                  <h2 class="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto" style="color: ${st.textColor};">${block.props.topTitle || ""}</h2>
                  <p class="text-[#e74b2d] font-bold text-lg sm:text-xl">${block.props.topTagline || ""}</p>
                  <p class="text-base sm:text-base max-w-2xl mx-auto leading-relaxed opacity-90" style="color: ${st.textColor};">${block.props.topDesc || ""}</p>
                  ${block.props.topBtnText ? `<div><a href="${block.props.topBtnUrl || "#"}" class="inline-block px-8 py-3.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-bold rounded-md text-base shadow-lg shadow-[#e74b2d]/30 transition-all">${block.props.topBtnText}</a></div>` : ""}

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 text-left">
                    ${(block.props.cards || [])
                      .map(
                        (card: any) => `
                      <div class="bg-[#24262d] rounded-2xl border border-zinc-700/60 p-6 flex flex-col justify-between space-y-4 shadow-xl">
                        <div class="space-y-4">
                          ${card.badgeUrl ? `<div class="w-10 h-10"><img src="${card.badgeUrl}" alt="Badge" class="w-full h-full object-contain" /></div>` : ""}
                          <h3 class="text-lg font-extrabold text-white leading-snug">${card.title || ""}</h3>
                          ${card.imgUrl ? `<div class="w-full h-48 rounded-xl overflow-hidden border border-zinc-700"><img src="${card.imgUrl}" alt="${card.title || ""}" class="w-full h-full object-cover" /></div>` : ""}
                          <p class="text-base text-zinc-400 leading-relaxed">${card.desc || ""}</p>
                        </div>
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                </div>

                <div class="relative w-full bg-cover bg-center py-16 px-4" style="background-image: url('${block.props.bottomBgImg || "/banners/half-bg.png"}');">
                  <div class="${containerClass} text-center space-y-4 relative z-10">
                    ${block.props.bottomBadge ? `<span class="px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-base font-bold">${block.props.bottomBadge}</span>` : ""}
                    <h3 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">${block.props.bottomTitle || ""}</h3>
                    <p class="text-[#e74b2d] font-bold text-base sm:text-lg">${block.props.bottomTagline || ""}</p>
                    <p class="text-zinc-300 text-base max-w-xl mx-auto leading-relaxed">${block.props.bottomDesc || ""}</p>
                    ${block.props.bottomHighlight ? `<div class="pt-2"><span class="inline-block px-6 py-2.5 rounded-xl bg-white text-zinc-900 font-extrabold text-base shadow-lg">${block.props.bottomHighlight}</span></div>` : ""}
                  </div>
                </div>
              </section>
            `;

          case "hero":
            return `
              <section class="relative w-full py-16 overflow-hidden" ${styleAttr}>
                <div class="${containerClass} text-center space-y-4">
                  <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight" style="color: ${st.textColor};">${block.props.title || ""}</h1>
                  <p class="text-base opacity-90 max-w-2xl mx-auto">${block.props.subtitle || ""}</p>
                  ${block.props.buttonText ? `<div class="pt-2"><a href="${block.props.buttonUrl || "#"}" class="inline-block px-7 py-3 bg-white text-zinc-900 font-bold rounded-xl text-base shadow-md hover:bg-zinc-100 transition-all">${block.props.buttonText}</a></div>` : ""}
                </div>
              </section>
            `;

          case "heading":
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass}">
                  <${block.props.level || "h2"} class="text-2xl sm:text-3xl font-extrabold tracking-tight" style="color: ${st.textColor};">${block.props.text || ""}</${block.props.level || "h2"}>
                </div>
              </section>
            `;

          case "text":
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass}">
                  <p class="text-base sm:text-base leading-relaxed" style="color: ${st.textColor};">${block.props.content || ""}</p>
                </div>
              </section>
            `;

          case "image":
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass}">
                  <img src="${block.props.url || ""}" alt="${block.props.alt || ""}" class="max-w-full h-auto mx-auto block rounded-2xl" style="border-radius: ${st.borderRadius}px;" />
                  ${block.props.caption ? `<p class="text-base text-center mt-2 opacity-80" style="color: ${st.textColor};">${block.props.caption}</p>` : ""}
                </div>
              </section>
            `;

          case "features":
            return `
              <section class="relative w-full py-16 overflow-hidden" ${styleAttr}>
                <div class="${containerClass}">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    ${(block.props.items || [])
                      .map(
                        (item: any) => `
                      <div class="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-3">
                        <div class="text-3xl">${item.icon || "⚡"}</div>
                        <h3 class="font-extrabold text-zinc-900 text-lg">${item.title || ""}</h3>
                        <p class="text-base text-zinc-600 leading-relaxed">${item.desc || ""}</p>
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                </div>
              </section>
            `;

          case "cta":
            return `
              <section class="relative w-full py-16 overflow-hidden" ${styleAttr}>
                <div class="${containerClass} text-center space-y-6">
                  <h2 class="text-3xl font-extrabold tracking-tight" style="color: ${st.textColor};">${block.props.title || ""}</h2>
                  <p class="text-base opacity-90 max-w-xl mx-auto">${block.props.subtitle || ""}</p>
                  ${block.props.buttonText ? `<div><a href="${block.props.buttonUrl || "#"}" class="inline-block px-8 py-3.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-bold rounded-md text-base shadow-lg transition-all">${block.props.buttonText}</a></div>` : ""}
                </div>
              </section>
            `;

          case "faq":
            return `
              <section class="relative w-full py-16 overflow-hidden" ${styleAttr}>
                <div class="${containerClass} space-y-8">
                  <h2 class="text-2xl sm:text-3xl font-extrabold text-center tracking-tight" style="color: ${st.textColor};">${block.props.title || ""}</h2>
                  <div class="space-y-4 max-w-3xl mx-auto">
                    ${(block.props.items || [])
                      .map(
                        (item: any) => `
                      <div class="bg-white rounded-2xl p-5 border border-zinc-200 shadow-2xs space-y-2">
                        <h3 class="font-bold text-zinc-900 text-base">${item.q || ""}</h3>
                        <p class="text-base text-zinc-600 leading-relaxed">${item.a || ""}</p>
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                </div>
              </section>
            `;

          case "contact":
            return `
              <section class="relative w-full py-16 overflow-hidden" ${styleAttr}>
                <div class="${containerClass} max-w-3xl mx-auto bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm space-y-6">
                  <h2 class="text-2xl font-extrabold text-zinc-900 tracking-tight">${block.props.heading || ""}</h2>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-base font-semibold text-zinc-700">
                    ${block.props.email ? `<div><span class="block text-zinc-400 text-base uppercase font-bold">Email</span>${block.props.email}</div>` : ""}
                    ${block.props.phone ? `<div><span class="block text-zinc-400 text-base uppercase font-bold">Phone</span>${block.props.phone}</div>` : ""}
                    ${block.props.address ? `<div><span class="block text-zinc-400 text-base uppercase font-bold">Address</span>${block.props.address}</div>` : ""}
                  </div>
                </div>
              </section>
            `;

          case "html":
            return `<section class="relative w-full overflow-hidden" ${styleAttr}><div class="${containerClass}">${block.props.code || ""}</div></section>`;

          case "list": {
            const tag = block.props.style === "number" ? "ol" : "ul";
            const listClass = tag === "ol" ? "list-decimal" : "list-disc";
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass}">
                  <${tag} class="${listClass} pl-5 space-y-2 text-base sm:text-base" style="color: ${st.textColor};">
                    ${(block.props.items || []).map((item: string) => `<li>${esc(item)}</li>`).join("")}
                  </${tag}>
                </div>
              </section>
            `;
          }

          case "quote":
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass}">
                  <blockquote class="border-l-4 border-[#e74b2d] pl-5 space-y-2">
                    <p class="text-lg sm:text-xl font-semibold leading-relaxed" style="color: ${st.textColor};">${esc(block.props.text)}</p>
                    ${block.props.cite ? `<cite class="block text-base not-italic opacity-70">${esc(block.props.cite)}</cite>` : ""}
                  </blockquote>
                </div>
              </section>
            `;

          case "buttons":
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass} flex flex-wrap gap-3">
                  ${block.props.label ? `<a href="${esc(block.props.href || "#")}" class="inline-block px-6 py-3 bg-[#e74b2d] text-white font-bold rounded-lg text-base">${esc(block.props.label)}</a>` : ""}
                  ${block.props.label2 ? `<a href="${esc(block.props.href2 || "#")}" class="inline-block px-6 py-3 border border-[#e74b2d] text-[#e74b2d] font-bold rounded-lg text-base">${esc(block.props.label2)}</a>` : ""}
                </div>
              </section>
            `;

          case "spacer":
            return `<div style="height: ${Number(block.props.height) || 32}px;"></div>`;

          case "separator":
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass}"><hr style="border: 0; border-top: 1px solid ${st.textColor || "#e4e4e7"};" /></div>
              </section>
            `;

          case "video": {
            const rawUrl = String(block.props.url || "");
            const youtube = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
            const embed = youtube
              ? `<iframe src="https://www.youtube.com/embed/${youtube[1]}" class="w-full aspect-video rounded-2xl" allowfullscreen></iframe>`
              : `<video src="${esc(rawUrl)}" class="w-full rounded-2xl" controls></video>`;
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass} space-y-2">
                  ${embed}
                  ${block.props.caption ? `<p class="text-base text-center opacity-70">${esc(block.props.caption)}</p>` : ""}
                </div>
              </section>
            `;
          }

          case "gallery":
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass}">
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    ${(block.props.images || []).map((image: { url?: string; caption?: string }) => `
                      <figure class="space-y-2">
                        <img src="${esc(image.url || "")}" alt="${esc(image.caption || "")}" class="w-full aspect-square object-cover rounded-2xl" />
                        ${image.caption ? `<figcaption class="text-base opacity-70">${esc(image.caption)}</figcaption>` : ""}
                      </figure>
                    `).join("")}
                  </div>
                </div>
              </section>
            `;

          case "table": {
            const headers = String(block.props.headers || "").split("|").map((cell) => cell.trim()).filter(Boolean);
            const rows = String(block.props.rows || "").split("\n").map((row) => row.split("|").map((cell) => cell.trim())).filter((row) => row.some(Boolean));
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                <div class="${containerClass} overflow-x-auto">
                  <table class="w-full text-base border-collapse">
                    <thead><tr>${headers.map((cell) => `<th class="text-left border-b border-zinc-200 px-3 py-2 font-bold">${esc(cell)}</th>`).join("")}</tr></thead>
                    <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td class="border-b border-zinc-100 px-3 py-2">${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
                  </table>
                </div>
              </section>
            `;
          }

          case "cover":
            return `
              <section class="relative w-full overflow-hidden" ${styleAttr}>
                ${block.props.image ? `<img src="${esc(block.props.image)}" alt="" class="absolute inset-0 w-full h-full object-cover" />` : ""}
                <div class="${containerClass} relative z-10 space-y-4">
                  <h2 class="text-3xl sm:text-5xl font-extrabold tracking-tight" style="color: ${st.textColor};">${esc(block.props.title)}</h2>
                  ${block.props.subtitle ? `<p class="text-base sm:text-lg opacity-90" style="color: ${st.textColor};">${esc(block.props.subtitle)}</p>` : ""}
                  ${block.props.buttonText ? `<div><a href="${esc(block.props.buttonUrl || "#")}" class="inline-block px-7 py-3 bg-[#e74b2d] text-white font-bold rounded-lg text-base">${esc(block.props.buttonText)}</a></div>` : ""}
                </div>
              </section>
            `;

          default:
            return "";
        }
      })
      .join("\n");
  };

  const savePage = async () => {
    setSaving(true);
    const htmlOutput = compileHTML();

    const payload = {
      title: pageTitle,
      slug: pageSlug,
      content: htmlOutput,
      blocks,
      isPublished,
      metaTitle,
      metaDescription,
    };

    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Page layout saved & published successfully!");
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save page", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#1e1e24] flex items-center justify-center text-white font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-base text-zinc-400 font-mono">Opening Elementor Page Builder...</p>
        </div>
      </div>
    );
  }

  const viewportWidth =
    viewportMode === "mobile"
      ? "w-[390px]"
      : viewportMode === "tablet"
      ? "w-[768px]"
      : "w-full max-w-6xl";

  return (
    <div className="fixed inset-0 z-50 bg-[#14151a] text-zinc-100 font-sans flex flex-col overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-base font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-900 text-emerald-100 border-emerald-700"
              : "bg-red-900 text-red-100 border-red-700"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── TOP CONTROL BAR ────────────────────────────────── */}
      <header className="h-14 bg-[#1e1e24] border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/admin/pages"
            className="flex items-center gap-2 text-base font-bold text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl"
          >
            ← Exit Builder
          </Link>
          <div className="h-4 w-px bg-zinc-700 hidden sm:block" />
          <div className="min-w-0 hidden sm:block">
            <input
              type="text"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              className="bg-transparent text-base font-bold text-white focus:outline-none focus:bg-white/5 px-2 py-1 rounded-lg"
              placeholder="Page Title"
            />
          </div>
        </div>

        {/* Viewport Switcher */}
        <div className="flex items-center bg-[#14151a] border border-zinc-700 rounded-xl p-0.5">
          <button
            onClick={() => setViewportMode("desktop")}
            className={`px-3 py-1 text-base font-bold rounded-lg transition-all ${
              viewportMode === "desktop" ? "bg-[#e74b2d] text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            💻 Desktop
          </button>
          <button
            onClick={() => setViewportMode("tablet")}
            className={`px-3 py-1 text-base font-bold rounded-lg transition-all ${
              viewportMode === "tablet" ? "bg-[#e74b2d] text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            📱 Tablet
          </button>
          <button
            onClick={() => setViewportMode("mobile")}
            className={`px-3 py-1 text-base font-bold rounded-lg transition-all ${
              viewportMode === "mobile" ? "bg-[#e74b2d] text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            📱 Mobile
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPublished((p) => !p)}
            className={`px-3 py-1.5 rounded-xl text-base font-bold border transition-all ${
              isPublished
                ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                : "bg-amber-950 text-amber-300 border-amber-700"
            }`}
          >
            {isPublished ? "Published" : "Draft"}
          </button>

          <Link
            href={`/pages/${pageSlug}`}
            target="_blank"
            className="px-3 py-1.5 rounded-xl text-base font-bold bg-white/5 hover:bg-white/10 text-zinc-300 border border-zinc-700 hidden md:block"
          >
            Preview ↗
          </Link>

          <button
            onClick={savePage}
            disabled={saving}
            className="px-5 py-1.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#e74b2d]/30 cursor-pointer disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save & Publish"}
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-80 bg-[#1e1e24] border-r border-zinc-800 flex flex-col shrink-0 select-none">
          <div className="flex border-b border-zinc-800 bg-[#14151a]">
            <button
              onClick={() => setLeftTab("elements")}
              className={`flex-1 py-3 text-base font-bold text-center border-b-2 transition-all ${
                leftTab === "elements" ? "border-[#e74b2d] text-[#e74b2d] bg-white/5" : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              + Add Section
            </button>
            <button
              onClick={() => setLeftTab("style")}
              className={`flex-1 py-3 text-base font-bold text-center border-b-2 transition-all ${
                leftTab === "style" ? "border-[#e74b2d] text-[#e74b2d] bg-white/5" : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ⚙️ Inspector
            </button>
            <button
              onClick={() => setLeftTab("settings")}
              className={`flex-1 py-3 text-base font-bold text-center border-b-2 transition-all ${
                leftTab === "settings" ? "border-[#e74b2d] text-[#e74b2d] bg-white/5" : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🔍 Page SEO
            </button>
          </div>

          {/* TAB 1: ADD SECTION / CONTAINER WIDGETS */}
          {leftTab === "elements" && (
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <span className="text-base font-bold text-sky-400 uppercase tracking-wider block">
                Elementor Grid & Columns Container
              </span>

              <button
                onClick={() => addBlock("customContainer")}
                className="w-full p-4 bg-[#e74b2d]/20 border-2 border-dashed border-[#e74b2d] hover:bg-[#e74b2d]/30 rounded-2xl flex items-center justify-center gap-3 text-white font-bold text-base transition-all cursor-pointer shadow-md"
              >
                <span className="text-xl">📊</span>
                <span>Add Grid Container (1, 2, 3, 4 Cols)</span>
              </button>

              <span className="text-base font-bold text-zinc-400 uppercase tracking-wider block pt-2">
                Pre-Built Layout Sections
              </span>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: "marketingHero", label: "Marketing Hero Section", icon: "🚀", desc: "Hero with background banner & dual CTA" },
                  { key: "splitFeature", label: "Feature Showcase (2-Col)", icon: "✨", desc: "Left/Right image with checkmark list" },
                  { key: "threeStageGrid", label: "3-Stage Cards Stack", icon: "📦", desc: "Left title + 3 feature cards" },
                  { key: "darkBanner", label: "Dark Stage Banner", icon: "🌙", desc: "Dark card with SVG bullet points" },
                  { key: "corporateEcosystem", label: "Corporate Ecosystem", icon: "🏢", desc: "Overlapping cards & half-bg bottom section" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => addBlock(item.key as any)}
                    className="p-3 bg-white/5 hover:bg-[#e74b2d]/20 border border-zinc-700/80 hover:border-[#e74b2d] rounded-xl flex items-center gap-3 transition-all cursor-pointer group text-left"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="text-base font-bold text-zinc-200 group-hover:text-white">{item.label}</div>
                      <div className="text-base text-zinc-400 truncate">{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <span className="text-base font-bold text-zinc-400 uppercase tracking-wider block pt-3">
                WordPress blocks
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "heading", label: "Heading", icon: "H" },
                  { key: "text", label: "Paragraph", icon: "¶" },
                  { key: "list", label: "List", icon: "•" },
                  { key: "quote", label: "Quote", icon: "“" },
                  { key: "image", label: "Image", icon: "🖼" },
                  { key: "gallery", label: "Gallery", icon: "▦" },
                  { key: "video", label: "Video", icon: "▶" },
                  { key: "buttons", label: "Buttons", icon: "▣" },
                  { key: "cover", label: "Cover", icon: "▣" },
                  { key: "table", label: "Table", icon: "⊞" },
                  { key: "spacer", label: "Spacer", icon: "↕" },
                  { key: "separator", label: "Separator", icon: "—" },
                  { key: "faq", label: "FAQ", icon: "?" },
                  { key: "cta", label: "Call to action", icon: "→" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => addBlock(item.key as keyof typeof DEFAULT_BLOCK_PRESETS)}
                    className="p-3 bg-white/5 hover:bg-[#e74b2d]/20 border border-zinc-700/80 hover:border-[#e74b2d] rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-base font-bold text-zinc-300">{item.label}</span>
                  </button>
                ))}
              </div>

              <span className="text-base font-bold text-zinc-400 uppercase tracking-wider block pt-3">
                More widgets
              </span>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "hero", label: "Simple Hero", icon: "🎯" },
                  { key: "features", label: "3-Col Grid", icon: "⚡" },
                  { key: "contact", label: "Contact Box", icon: "📞" },
                  { key: "html", label: "Custom HTML", icon: "</>" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => addBlock(item.key as any)}
                    className="p-3 bg-white/5 hover:bg-[#e74b2d]/20 border border-zinc-700/80 hover:border-[#e74b2d] rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group text-center"
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="text-base font-bold text-zinc-300 group-hover:text-white">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: INSPECTOR & FULL STYLING */}
          {leftTab === "style" && (
            <div className="p-4 space-y-5 overflow-y-auto flex-1 text-base">
              {selectedBlock ? (
                <>
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-base font-bold text-[#e74b2d] uppercase tracking-wider">
                      Editing: {selectedBlock.type} Block
                    </span>
                    <button onClick={() => deleteBlock(selectedBlock.id)} className="text-base text-red-400 hover:text-red-300 font-bold">
                      Delete Section
                    </button>
                  </div>

                  {/* GRID CONTAINER COLUMNS SWITCHER & EDITING */}
                  {selectedBlock.type === "customContainer" && (
                    <div className="space-y-4">
                      <span className="text-base font-bold text-sky-400 uppercase tracking-wider block">
                        Grid Columns Layout Switcher
                      </span>

                      <div>
                        <label className="text-base text-zinc-400 block mb-1.5">Number of Columns</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 2, 3, 4].map((num) => (
                            <button
                              key={num}
                              onClick={() => setContainerColumnsCount(num)}
                              className={`py-2 rounded-xl font-bold text-base border transition-all ${
                                (selectedBlock.props.columnsCount || 2) === num
                                  ? "bg-[#e74b2d] text-white border-[#e74b2d]"
                                  : "bg-white/5 text-zinc-400 border-zinc-700 hover:text-white"
                              }`}
                            >
                              {num} Col{num > 1 ? "s" : ""}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Edit Each Column Item */}
                      <div className="space-y-3 pt-2">
                        <span className="text-base font-bold text-zinc-400 uppercase tracking-wider block">
                          Edit Column Contents
                        </span>

                        {(selectedBlock.props.columns || []).map((col: ColumnItem, idx: number) => (
                          <div key={col.id || idx} className="bg-white/5 border border-zinc-700/80 rounded-2xl p-3 space-y-2.5">
                            <span className="font-bold text-sky-400 text-base">Column {idx + 1} Settings</span>

                            <div>
                              <label className="text-base text-zinc-400 block mb-1">Column Heading</label>
                              <input
                                type="text"
                                value={col.heading || ""}
                                onChange={(e) => updateSelectedColumn(idx, "heading", e.target.value)}
                                className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-2.5 py-1 text-base text-white"
                              />
                            </div>

                            <div>
                              <label className="text-base text-zinc-400 block mb-1">Column Paragraph</label>
                              <textarea
                                rows={2}
                                value={col.text || ""}
                                onChange={(e) => updateSelectedColumn(idx, "text", e.target.value)}
                                className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-2.5 py-1 text-base text-white resize-none"
                              />
                            </div>

                            <div>
                              <label className="text-base text-zinc-400 block mb-1">Column Image</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={col.imgUrl || ""}
                                  onChange={(e) => updateSelectedColumn(idx, "imgUrl", e.target.value)}
                                  className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-2.5 py-1 text-base text-white font-mono"
                                />
                                <button
                                  onClick={() => openMediaPicker("colProp", "imgUrl", idx)}
                                  className="px-2.5 py-1 bg-[#e74b2d] text-white text-base font-bold rounded-xl shrink-0"
                                >
                                  Upload 🖼️
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-base text-zinc-400 block mb-1">Button Label</label>
                                <input
                                  type="text"
                                  value={col.btnText || ""}
                                  onChange={(e) => updateSelectedColumn(idx, "btnText", e.target.value)}
                                  className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-2 py-1 text-base text-white"
                                />
                              </div>
                              <div>
                                <label className="text-base text-zinc-400 block mb-1">Button URL</label>
                                <input
                                  type="text"
                                  value={col.btnUrl || ""}
                                  onChange={(e) => updateSelectedColumn(idx, "btnUrl", e.target.value)}
                                  className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-2 py-1 text-base text-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PRESET SECTION PROPERTIES */}
                  {selectedBlock.type !== "customContainer" && (
                    <div className="space-y-3">
                      <span className="text-base font-bold text-zinc-400 uppercase tracking-wider block">
                        Content & Text Parameters
                      </span>

                      {selectedBlock.type === "marketingHero" && (
                        <>
                          <div>
                            <label className="text-base text-zinc-400 block mb-1">Badge Pill Text</label>
                            <input
                              type="text"
                              value={selectedBlock.props.badgeText || ""}
                              onChange={(e) => updateSelectedProp("badgeText", e.target.value)}
                              className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white"
                            />
                          </div>
                          <div>
                            <label className="text-base text-zinc-400 block mb-1">Headline Title</label>
                            <textarea
                              rows={2}
                              value={selectedBlock.props.title || ""}
                              onChange={(e) => updateSelectedProp("title", e.target.value)}
                              className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white resize-none"
                            />
                          </div>
                          <div>
                            <label className="text-base text-zinc-400 block mb-1">Hero Image</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={selectedBlock.props.heroImg || ""}
                                onChange={(e) => updateSelectedProp("heroImg", e.target.value)}
                                className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white font-mono"
                              />
                              <button
                                onClick={() => openMediaPicker("prop", "heroImg")}
                                className="px-3 py-1.5 bg-[#e74b2d] text-white text-base font-bold rounded-xl shrink-0"
                              >
                                Upload 🖼️
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {selectedBlock.type === "splitFeature" && (
                        <>
                          <div>
                            <label className="text-base text-zinc-400 block mb-1">Section Title</label>
                            <input
                              type="text"
                              value={selectedBlock.props.title || ""}
                              onChange={(e) => updateSelectedProp("title", e.target.value)}
                              className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white"
                            />
                          </div>
                          <div>
                            <label className="text-base text-zinc-400 block mb-1">Showcase Image</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={selectedBlock.props.imgUrl || ""}
                                onChange={(e) => updateSelectedProp("imgUrl", e.target.value)}
                                className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white font-mono"
                              />
                              <button
                                onClick={() => openMediaPicker("prop", "imgUrl")}
                                className="px-3 py-1.5 bg-[#e74b2d] text-white text-base font-bold rounded-xl shrink-0"
                              >
                                Upload 🖼️
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {selectedBlock.type === "image" && (
                        <div>
                          <label className="text-base text-zinc-400 block mb-1">Image URL / File</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={selectedBlock.props.url || ""}
                              onChange={(e) => updateSelectedProp("url", e.target.value)}
                              className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white font-mono"
                            />
                            <button
                              onClick={() => openMediaPicker("prop", "url")}
                              className="px-3 py-1.5 bg-[#e74b2d] text-white text-base font-bold rounded-xl shrink-0"
                            >
                              Upload 🖼️
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedBlock.type === "text" && (
                        <div>
                          <label className="text-base text-zinc-400 block mb-1">Paragraph Text</label>
                          <textarea
                            rows={4}
                            value={selectedBlock.props.content || ""}
                            onChange={(e) => updateSelectedProp("content", e.target.value)}
                            className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-1.5 text-base text-white resize-none"
                          />
                        </div>
                      )}

                      {selectedBlock.type === "html" && (
                        <div>
                          <label className="text-base text-zinc-400 block mb-1">Raw HTML / SVG Code</label>
                          <textarea
                            rows={6}
                            value={selectedBlock.props.code || ""}
                            onChange={(e) => updateSelectedProp("code", e.target.value)}
                            className="w-full bg-[#14151a] border border-zinc-700 rounded-xl p-3 text-base text-sky-300 font-mono resize-none"
                          />
                        </div>
                      )}

                      {!["customContainer", "marketingHero", "splitFeature", "image", "text", "html"].includes(selectedBlock.type) && (
                        <BlockFields props={selectedBlock.props} onChange={updateSelectedProp} />
                      )}
                    </div>
                  )}

                  {/* CONTAINER & PAGE WIDTH SETTINGS */}
                  <div className="space-y-3 pt-3 border-t border-zinc-800">
                    <span className="text-base font-bold text-sky-400 uppercase tracking-wider block">
                      Container Width & Layout Size
                    </span>

                    <div>
                      <label className="text-base text-zinc-400 block mb-1">Container Width</label>
                      <select
                        value={selectedBlock.styles.containerWidth || "7xl"}
                        onChange={(e) => updateSelectedStyle("containerWidth", e.target.value as any)}
                        className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-base text-white"
                      >
                        <option value="full">Full Width (100% Edge-to-Edge)</option>
                        <option value="7xl">Boxed Extra Wide (1280px / 7xl)</option>
                        <option value="5xl">Boxed Medium (1024px / 5xl)</option>
                        <option value="3xl">Boxed Narrow (768px / 3xl)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-base text-zinc-400 block mb-1">Section Background Image</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={selectedBlock.styles.bgImage || ""}
                          onChange={(e) => updateSelectedStyle("bgImage", e.target.value)}
                          placeholder="/banners/marketing-banner.png"
                          className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-2.5 py-1 text-base text-white font-mono"
                        />
                        <button
                          onClick={() => openMediaPicker("style", "bgImage")}
                          className="px-3 py-1.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl shrink-0 cursor-pointer"
                        >
                          Upload 🖼️
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* COLOR & SPACING STYLES */}
                  <div className="space-y-3 pt-3 border-t border-zinc-800">
                    <span className="text-base font-bold text-zinc-400 uppercase tracking-wider block">
                      Section Styling & Spacing
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-base text-zinc-400 block mb-1">Background Color</label>
                        <input
                          type="color"
                          value={selectedBlock.styles.bgColor === "transparent" ? "#ffffff" : selectedBlock.styles.bgColor}
                          onChange={(e) => updateSelectedStyle("bgColor", e.target.value)}
                          className="w-full h-8 bg-transparent rounded-lg cursor-pointer border border-zinc-700"
                        />
                      </div>

                      <div>
                        <label className="text-base text-zinc-400 block mb-1">Text Color</label>
                        <input
                          type="color"
                          value={selectedBlock.styles.textColor || "#18181b"}
                          onChange={(e) => updateSelectedStyle("textColor", e.target.value)}
                          className="w-full h-8 bg-transparent rounded-lg cursor-pointer border border-zinc-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-base text-zinc-400 block mb-1">Text alignment</label>
                      <select
                        value={selectedBlock.styles.textAlign || "left"}
                        onChange={(e) => updateSelectedStyle("textAlign", e.target.value as "left" | "center" | "right")}
                        className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-base text-white"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-base text-zinc-400 block mb-1">Padding Top (px)</label>
                        <input
                          type="number"
                          value={selectedBlock.styles.paddingTop}
                          onChange={(e) => updateSelectedStyle("paddingTop", Number(e.target.value))}
                          className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-2.5 py-1 text-base text-white"
                        />
                      </div>

                      <div>
                        <label className="text-base text-zinc-400 block mb-1">Padding Bottom (px)</label>
                        <input
                          type="number"
                          value={selectedBlock.styles.paddingBottom}
                          onChange={(e) => updateSelectedStyle("paddingBottom", Number(e.target.value))}
                          className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-2.5 py-1 text-base text-white"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center space-y-2">
                  <p className="text-zinc-500 text-base">No section selected.</p>
                  <p className="text-zinc-600 text-base">
                    Click any section on the canvas to inspect and customize its settings.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAGE SEO */}
          {leftTab === "settings" && (
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-base font-bold text-zinc-300 block mb-1">Page Title</label>
                <input
                  type="text"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-2 text-base text-white"
                />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-300 block mb-1">URL Slug</label>
                <input
                  type="text"
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value)}
                  className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-2 text-base font-mono text-white"
                />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-300 block mb-1">Meta Title</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-2 text-base text-white"
                />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-300 block mb-1">Meta Description</label>
                <textarea
                  rows={3}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="w-full bg-[#14151a] border border-zinc-700 rounded-xl px-3 py-2 text-base text-white resize-none"
                />
              </div>
            </div>
          )}
        </aside>

        {/* ── CENTER LIVE CANVAS ───────────────────────────────── */}
        <main className="flex-1 bg-[#14151a] p-6 overflow-y-auto flex justify-center items-start">
          <div className={`transition-all duration-300 bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[600px] border border-zinc-200 text-zinc-900 ${viewportWidth}`}>
            <div className="bg-[#18181b] text-white px-6 py-3 flex items-center justify-between text-base border-b border-zinc-800">
              <span className="font-bold tracking-wider">PRINTGRAPHY LIVE CANVAS</span>
              <span className="text-base text-zinc-400 font-mono">/pages/{pageSlug || "slug"}</span>
            </div>

            <div className="space-y-4 min-h-[500px]">
              {blocks.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed border-zinc-300 rounded-3xl space-y-3 m-6">
                  <p className="text-zinc-500 font-bold text-base">Canvas is empty.</p>
                  <p className="text-zinc-400 text-base max-w-sm mx-auto">
                    Click "+ Add Section" from the left panel to start building your page.
                  </p>
                </div>
              ) : (
                blocks.map((block, index) => {
                  const isSelected = selectedBlockId === block.id;
                  const isDragging = draggedBlockIndex === index;
                  const isDragOver = dragOverBlockIndex === index;
                  const st = block.styles;

                  const containerClass =
                    st.containerWidth === "full"
                      ? "w-full"
                      : st.containerWidth === "3xl"
                      ? "max-w-3xl mx-auto"
                      : st.containerWidth === "5xl"
                      ? "max-w-5xl mx-auto"
                      : "max-w-6xl mx-auto";

                  return (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={() => {
                        setSelectedBlockId(block.id);
                        setLeftTab("style");
                      }}
                      className={`relative group transition-all cursor-pointer ${
                        isSelected ? "ring-4 ring-[#e74b2d] ring-offset-2 z-30" : "hover:ring-2 hover:ring-sky-300"
                      } ${isDragging ? "opacity-30" : ""} ${isDragOver ? "border-t-4 border-[#e74b2d]" : ""}`}
                      style={{
                        backgroundColor: st.bgColor,
                        backgroundImage: st.bgImage ? `url('${st.bgImage}')` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        color: st.textColor,
                        paddingTop: `${viewportMode === "mobile" ? Math.min(st.paddingTop, 24) : viewportMode === "tablet" ? Math.min(st.paddingTop, 40) : st.paddingTop}px`,
                        paddingBottom: `${viewportMode === "mobile" ? Math.min(st.paddingBottom, 24) : viewportMode === "tablet" ? Math.min(st.paddingBottom, 40) : st.paddingBottom}px`,
                        textAlign: st.textAlign,
                        borderRadius: `${st.borderRadius}px`,
                      }}
                    >
                      {/* Floating Control Bar */}
                      <div className="absolute top-3 right-3 z-40 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/90 text-white p-1 rounded-xl flex items-center gap-1 shadow-lg text-base">
                        <span className="px-2 py-0.5 font-mono text-base text-sky-400 font-bold uppercase">
                          {block.type}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveBlock(index, "up"); }}
                          disabled={index === 0}
                          className="w-6 h-6 hover:bg-white/20 rounded flex items-center justify-center disabled:opacity-30"
                        >▲</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveBlock(index, "down"); }}
                          disabled={index === blocks.length - 1}
                          className="w-6 h-6 hover:bg-white/20 rounded flex items-center justify-center disabled:opacity-30"
                        >▼</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); duplicateBlock(index); }}
                          className="w-6 h-6 hover:bg-white/20 rounded flex items-center justify-center"
                        >📋</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                          className="w-6 h-6 hover:bg-red-500/80 rounded flex items-center justify-center text-red-300"
                        >✕</button>
                      </div>

                      {/* Canvas Render Block */}
                      <div className={viewportMode === "mobile" ? "px-3" : "px-6"}>
                        {block.type === "customContainer" && (
                          <div className={containerClass}>
                            <div className={`grid gap-6 items-stretch ${
                              viewportMode === "mobile" || (block.props.columns || []).length <= 1
                                ? "grid-cols-1"
                                : viewportMode === "tablet"
                                ? "grid-cols-2"
                                : (block.props.columns || []).length === 3
                                ? "grid-cols-3"
                                : (block.props.columns || []).length === 4
                                ? "grid-cols-4"
                                : "grid-cols-2"
                            }`}>
                              {(block.props.columns || []).map((col: ColumnItem, i: number) => (
                                <div
                                  key={col.id || i}
                                  className="rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-3 text-left"
                                  style={{ backgroundColor: col.bgColor, color: col.textColor }}
                                >
                                  <div className="space-y-2">
                                    {col.imgUrl && (
                                      <img src={col.imgUrl} alt={col.heading} className="w-full h-auto rounded-xl object-cover" />
                                    )}
                                    {col.heading && <h3 className="font-extrabold text-lg tracking-tight">{col.heading}</h3>}
                                    {col.text && <p className="text-base opacity-90 leading-relaxed">{col.text}</p>}
                                  </div>
                                  {col.btnText && (
                                    <div>
                                      <span className="inline-block px-4 py-2 bg-[#e74b2d] text-white text-base font-bold rounded-lg shadow-xs">
                                        {col.btnText}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {block.type === "marketingHero" && (
                          <div className={`${containerClass} grid gap-8 items-center text-left py-6 ${viewportMode === "desktop" ? "grid-cols-2" : "grid-cols-1"}`}>
                            <div className="space-y-4">
                              <span className="px-3 py-1 rounded-full bg-[#fff1eb] border border-[#e74b2d]/30 text-[#e74b2d] text-base font-bold">
                                {block.props.badgeText}
                              </span>
                              <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 leading-tight">{block.props.title}</h1>
                              <p className="text-[#e74b2d] font-bold text-base sm:text-base">{block.props.subtitle}</p>
                              <p className="text-zinc-600 text-base sm:text-base">{block.props.body}</p>
                              <div className={`flex gap-3 pt-2 ${viewportMode === "mobile" ? "flex-col" : "flex-row"}`}>
                                <span className="px-5 py-2.5 bg-[#e74b2d] text-white text-base font-bold rounded-md shadow-md">
                                  {block.props.btn1Text}
                                </span>
                                <span className="px-5 py-2.5 bg-[#1c1d22] text-white text-base font-bold rounded-md shadow-md">
                                  {block.props.btn2Text}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-center">
                              <img src={block.props.heroImg} alt="Hero Showcase" className="w-full h-auto rounded-2xl shadow-lg border border-zinc-100" />
                            </div>
                          </div>
                        )}

                        {block.type === "splitFeature" && (
                          <div className={`${containerClass} grid gap-8 items-center text-left py-6 ${viewportMode === "desktop" ? "grid-cols-2" : "grid-cols-1"}`}>
                            <div className={`space-y-4 ${viewportMode === "desktop" && block.props.imagePosition === "left" ? "order-2" : "order-1"}`}>
                              <span className="px-3 py-1 rounded-full bg-[#fff1eb] border border-[#e74b2d]/30 text-[#e74b2d] text-base font-bold">
                                {block.props.badgeText}
                              </span>
                              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">{block.props.title}</h2>
                              <p className="text-[#e74b2d] font-bold text-base">{block.props.tagline}</p>
                              <p className="text-zinc-600 text-base sm:text-base">{block.props.body}</p>
                              <ul className="space-y-2">
                                {(block.props.features || []).map((f: string, i: number) => (
                                  <li key={i} className="flex items-center gap-2 text-base font-bold text-zinc-800">
                                    <span className="text-[#e74b2d]">✓</span> {f}
                                  </li>
                                ))}
                              </ul>
                              {block.props.btnText && (
                                <span className="inline-block px-5 py-2.5 bg-[#e74b2d] text-white text-base font-bold rounded-md shadow-md">
                                  {block.props.btnText}
                                </span>
                              )}
                            </div>
                            <div className={`flex justify-center ${viewportMode === "desktop" && block.props.imagePosition === "left" ? "order-1" : "order-2"}`}>
                              <img src={block.props.imgUrl} alt="Feature" className="w-full h-auto rounded-2xl shadow-lg" />
                            </div>
                          </div>
                        )}

                        {block.type === "hero" && (
                          <div className="space-y-3 py-6">
                            <h1 className="text-3xl font-black">{block.props.title}</h1>
                            <p className="text-base opacity-90 max-w-xl mx-auto">{block.props.subtitle}</p>
                            <span className="inline-block px-5 py-2 bg-white text-zinc-900 font-bold rounded-lg text-base shadow-md">
                              {block.props.buttonText}
                            </span>
                          </div>
                        )}

                        {block.type === "heading" && <h2 className="text-2xl font-bold py-2">{block.props.text}</h2>}
                        {block.type === "text" && <p className="text-base leading-relaxed py-2">{block.props.content}</p>}
                        {block.type === "image" && (
                          <img src={block.props.url} alt={block.props.alt} className="max-w-full mx-auto rounded-xl py-2" />
                        )}
                        {block.type === "html" && <div dangerouslySetInnerHTML={{ __html: block.props.code }} />}
                        {!["customContainer", "marketingHero", "splitFeature", "hero", "heading", "text", "image", "html"].includes(block.type) && (
                          <CanvasFallback block={block} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── WORDPRESS MEDIA LIBRARY MODAL ────────────────────────────────────── */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e24] border border-zinc-700 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-white">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">🖼️</span>
                <h3 className="font-extrabold text-base text-white">WordPress Media Library & Image Upload</h3>
              </div>
              <button
                onClick={() => setShowMediaModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-zinc-800 bg-[#14151a] px-6">
              <button
                onClick={() => setMediaTab("library")}
                className={`py-3 text-base font-bold border-b-2 px-4 transition-all ${
                  mediaTab === "library"
                    ? "border-[#e74b2d] text-[#e74b2d] bg-white/5"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                Media Library ({uploadedImages.length + SYSTEM_PRESET_IMAGES.length})
              </button>
              <button
                onClick={() => setMediaTab("upload")}
                className={`py-3 text-base font-bold border-b-2 px-4 transition-all ${
                  mediaTab === "upload"
                    ? "border-[#e74b2d] text-[#e74b2d] bg-white/5"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                ↑ Upload New Image File
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 min-h-[350px]">
              {mediaTab === "upload" && (
                <div className="flex flex-col items-center justify-center h-full py-12 border-2 border-dashed border-zinc-700 rounded-2xl bg-white/5 text-center space-y-4">
                  <span className="text-4xl animate-bounce">📤</span>
                  <div>
                    <h4 className="font-bold text-base text-white">Upload image file to /public/uploads</h4>
                    <p className="text-base text-zinc-400 mt-1">Supports PNG, JPG, WEBP, SVG graphics up to 10MB</p>
                  </div>
                  <label className="px-6 py-2.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl cursor-pointer shadow-lg transition-all inline-block">
                    {uploading ? "Uploading Image..." : "Select File From Device"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {mediaTab === "library" && (
                <div className="space-y-4">
                  {uploadedImages.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-base font-bold text-sky-400 uppercase tracking-wider block">
                        Server Uploaded Files (/public/uploads)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {uploadedImages.map((img, i) => (
                          <div
                            key={i}
                            onClick={() => setSelectedMediaUrl(img.url)}
                            className={`relative group rounded-xl overflow-hidden border-2 cursor-pointer transition-all aspect-square bg-zinc-900 ${
                              selectedMediaUrl === img.url
                                ? "border-[#e74b2d] ring-4 ring-[#e74b2d]/40 scale-95"
                                : "border-zinc-700 hover:border-zinc-400"
                            }`}
                          >
                            <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 text-base text-zinc-300 font-mono truncate text-center">
                              {img.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <span className="text-base font-bold text-zinc-400 uppercase tracking-wider block">
                      System Theme & Banner Assets
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {SYSTEM_PRESET_IMAGES.map((img, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedMediaUrl(img.url)}
                          className={`relative group rounded-xl overflow-hidden border-2 cursor-pointer transition-all aspect-square bg-zinc-900 ${
                            selectedMediaUrl === img.url
                              ? "border-[#e74b2d] ring-4 ring-[#e74b2d]/40 scale-95"
                              : "border-zinc-700 hover:border-zinc-400"
                          }`}
                        >
                          <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 text-base text-zinc-300 font-sans truncate text-center">
                            {img.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 bg-[#14151a] flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <span className="text-base text-zinc-400 block truncate">
                  Selected URL: <span className="text-white font-mono">{selectedMediaUrl || "None"}</span>
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowMediaModal(false)}
                  className="px-4 py-2 rounded-xl text-base font-bold text-zinc-400 hover:text-white bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={applySelectedMedia}
                  disabled={!selectedMediaUrl}
                  className="px-6 py-2 rounded-xl text-base font-bold bg-[#e74b2d] hover:bg-[#c93e23] text-white disabled:opacity-50 shadow-lg cursor-pointer"
                >
                  Insert Into Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
