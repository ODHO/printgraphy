"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { mediaSrc } from "@/lib/mediaUrl";

export interface FeatureStory {
  title?: string;
  bullets?: string;
  sections?: { heading: string; body: string }[];
  images?: string[];
  relatedTitle?: string;
}

const DEFAULT_STORY: Required<FeatureStory> = {
  title: "Create a one-of-a-kind look for your card – quickly and easily.",
  bullets: [
    "Standard glossy, matte or uncoated paper",
    "Standard shape and corners included",
    "Premium paper upgrades",
    "Square shape upgrade available",
    "Rounded corner upgrade available",
    "Embossed gloss, raised foil & foil accent upgrades",
    "Quantities from 50 to 10,000+",
  ].join("\n"),
  sections: [
    {
      heading: "One-of-a-kind cards",
      body: "Your business is unique, and your business cards should be, too. Whether you're making first impressions, rewarding regulars with a loyalty card or giving satisfied clients your contact info for next time, we're here to help you look and feel ready to impress. Create a card that fits your business needs, personality and style.",
    },
    {
      heading: "Lots of options",
      body: "From traditional papers to thicker, heavier stocks and attention-grabbing special finishes, you've got a lot of great choices for your cards. Our standard paper options include glossy, matte or uncoated, and we also offer premium upgrades like linen, recycled matte, kraft and even hemp-blend or bamboo. And not only that, you can go with a square shape or rounded corners, too. For more info, go to the \"Options\" section. And for ideas and inspiration, check out some .",
    },
    {
      heading: "Step-by-step design process",
      body: "Our user-friendly design studio makes business card printing easier than ever. You can upload your own complete design, or you can pick from a wide range of templates, all tailored to specific industries, themes and uses. From there, it's quick and easy to add your own text, logo, images and more. To give you a better idea of what you're working with before you start designing, check out our guide to standard business card dimensions. Need more than 10,000? Send us a request.",
    },
  ],
  images: ["/card-design.png"],
  relatedTitle: "Explore Related Products",
};

function StoryImage({ src, alt, large }: { src: string; alt: string; large?: boolean }) {
  const local = src.startsWith("/") && !src.startsWith("/api/");
  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-md ${large ? "aspect-[4/5] sm:aspect-square" : "aspect-square"}`}>
      {local ? (
        <Image src={src} alt={alt} fill sizes={large ? "(max-width: 1024px) 100vw, 42vw" : "(max-width: 1024px) 50vw, 20vw"} className="object-cover" />
      ) : (
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}

function hasCustomStory(story?: FeatureStory | null) {
  if (!story) return false;
  return Boolean(
    story.title?.trim() ||
    story.bullets?.trim() ||
    story.relatedTitle?.trim() ||
    story.images?.some((src) => src.trim()) ||
    story.sections?.some((section) => section.heading?.trim() || section.body?.trim())
  );
}

function storyFromProduct(product: {
  featureStory?: FeatureStory;
  categoryId?: string | { _id?: string; featureStory?: FeatureStory };
  slug?: string;
} | null) {
  if (hasCustomStory(product?.featureStory)) return product!.featureStory!;
  const category = product?.categoryId;
  if (category && typeof category === "object" && hasCustomStory(category.featureStory)) {
    return category.featureStory!;
  }
  return null;
}

export default function ProductCardFeatures({ productId }: { productId?: string }) {
  const [story, setStory] = useState<FeatureStory | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const productRes = await fetch(`/api/products/${productId || "business-cards"}`);
      const productData = await productRes.json();
      const product = productData.product;
      const direct = storyFromProduct(product);
      if (direct) {
        if (!cancelled) setStory(direct);
        return;
      }

      const categoryId = typeof product?.categoryId === "string" ? product.categoryId : product?.categoryId?._id;
      const categoriesRes = await fetch("/api/categories");
      const categoriesData = await categoriesRes.json();
      const categories = Array.isArray(categoriesData.categories) ? categoriesData.categories : [];
      const match = categories.find((category: { _id?: string; slug?: string }) =>
        (categoryId && String(category._id) === String(categoryId)) ||
        category.slug === (productId || "business-cards")
      );
      if (!cancelled) setStory(match?.featureStory || null);
    };
    load().catch(() => {
      if (!cancelled) setStory(null);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const content = hasCustomStory(story) ? story! : DEFAULT_STORY;
  const bullets = (content.bullets || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const sections = (content.sections || []).filter((section) => section.heading?.trim() || section.body?.trim());
  const images = (content.images || []).map((src) => mediaSrc(src) || src).filter(Boolean);

  return (
    <section className="border-t border-zinc-200 pt-10 pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-7 flex flex-col gap-6">
          {content.title && (
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-tight">
              {content.title}
            </h2>
          )}
          {bullets.length > 0 && (
            <ul className="text-base sm:text-base text-zinc-700 flex flex-col gap-1.5 list-disc pl-4 font-normal">
              {bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {sections.map((section) => (
            <div key={section.heading || section.body} className="flex flex-col gap-1.5">
              {section.heading && <h3 className="text-base font-bold text-zinc-900">{section.heading}</h3>}
              {section.body && <p className="text-base sm:text-base text-zinc-600 leading-relaxed">{section.body}</p>}
            </div>
          ))}
          {content.relatedTitle && (
            <h3 className="text-xl font-extrabold text-zinc-900 pt-2">{content.relatedTitle}</h3>
          )}
        </div>
        {images.length > 0 && (
          <div className="lg:col-span-5 flex w-full flex-col gap-3">
            <StoryImage src={images[0]} alt={content.title || "Category story"} large />
            {images.length > 1 && (
              <div className="grid grid-cols-2 gap-3">
                {images.slice(1).map((src, index) => (
                  <StoryImage key={`${src}-${index}`} src={src} alt="" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
