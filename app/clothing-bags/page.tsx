import type { Metadata } from "next";
import Link from "next/link";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import { mediaSrc } from "@/lib/mediaUrl";

export const metadata: Metadata = {
  title: "Clothing & Bags — Printgraphy",
  description:
    "Custom t-shirts, hoodies, totes, and bags — design on a product mockup and order from one.",
};

export const dynamic = "force-dynamic";

function coverSrc(cat: {
  image?: string;
  mockup_image?: string;
  galleryImages?: string[];
}) {
  const raw =
    cat.image ||
    (Array.isArray(cat.galleryImages) && cat.galleryImages[0]) ||
    cat.mockup_image ||
    "/new-in-clothing.png";
  return mediaSrc(raw) || raw;
}

export default async function ClothingBagsHubPage() {
  await dbConnect();
  const categories = await Category.find({ isActive: true, canvas_type: "mockup" })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return (
    <div className="min-h-screen bg-[#f8fbfd] font-sans">
      <div className="bg-white border-b border-zinc-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">
            Clothing & Bags
          </h1>
          <p className="mt-2 text-base text-zinc-500 max-w-2xl">
            Pick a product to customize with your logo or message.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {categories.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
            <p className="text-lg font-bold text-zinc-700">No clothing categories yet</p>
            <p className="text-base text-zinc-500 mt-2 max-w-md mx-auto">
              In Admin → Categories, create a <strong>Clothing & Bags</strong> category and upload a
              cover image.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const href = `/clothing-bags/${cat.slug || cat._id}`;
              const img = coverSrc(cat as any);
              return (
                <Link
                  key={String(cat._id)}
                  href={href}
                  className="group relative rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 min-h-[300px] sm:min-h-[360px] block bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <h2 className="text-2xl font-black text-white tracking-tight">{cat.name}</h2>
                    <p className="text-sm text-white/80 mt-1 line-clamp-2">
                      {cat.description || "Customize with your logo or message"}
                    </p>
                    <span className="inline-flex mt-4 text-sm font-bold text-white bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-2 group-hover:bg-[#2196D2] group-hover:border-[#2196D2] transition-colors">
                      Shop {cat.name} →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
