import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { mediaSrc } from "@/lib/mediaUrl";
import {
  cleanApparelColors,
  cleanApparelSizes,
  cleanDecorationMethods,
} from "@/lib/mockupCanvas";

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

function bannerSrc(cat: {
  banner_image?: string;
  image?: string;
  mockup_image?: string;
}) {
  const raw = cat.banner_image || cat.image || cat.mockup_image || "/new-in-clothing.png";
  return mediaSrc(raw) || raw;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  await dbConnect();
  const cat = await Category.findOne({
    isActive: true,
    canvas_type: "mockup",
    $or: [
      { slug },
      ...(slug.match(/^[a-f0-9]{24}$/i) ? [{ _id: slug }] : []),
    ],
  }).lean();
  return {
    title: cat ? `${cat.name} — Clothing & Bags — Printgraphy` : "Clothing & Bags — Printgraphy",
  };
}

export default async function ClothingBagsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  await dbConnect();

  const cat = await Category.findOne({
    isActive: true,
    canvas_type: "mockup",
    $or: [{ slug }, ...(slug.match(/^[a-f0-9]{24}$/i) ? [{ _id: slug }] : [])],
  }).lean();

  if (!cat) notFound();

  const products = await Product.find({
    isActive: true,
    categoryId: cat._id,
  })
    .sort({ createdAt: -1 })
    .lean();

  const colors = cleanApparelColors(cat.apparel_colors);
  const sizes = cleanApparelSizes(cat.apparel_sizes);
  const methods = cleanDecorationMethods(cat.decoration_methods);
  const banner = bannerSrc(cat as any);
  const cover = coverSrc(cat as any);
  const designHref = `/clothing-bags/design?category=${encodeURIComponent(cat.slug || String(cat._id))}`;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Admin-uploaded category banner (not cover) */}
      <section className="relative w-full min-h-[42vh] sm:min-h-[48vh] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/15" />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col justify-end min-h-[42vh] sm:min-h-[48vh]">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
            {cat.name}
          </h1>
          {cat.description ? (
            <p className="mt-2 text-base sm:text-lg text-white/85 max-w-2xl">{cat.description}</p>
          ) : null}
          <div className="mt-6">
            <Link
              href={designHref}
              className="inline-flex px-6 py-3 bg-[#2196D2] hover:bg-[#1B85BD] text-white font-bold rounded-xl shadow-lg transition-colors"
            >
              Start designing
            </Link>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Cover image product card (not the page banner) */}
        <div className="rounded-3xl border border-zinc-200 overflow-hidden mb-10 grid grid-cols-1 lg:grid-cols-2 bg-gradient-to-br from-[#e8f4fc] via-white to-white shadow-sm">
          <div className="relative min-h-[280px] lg:min-h-[400px] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={cat.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="p-6 sm:p-10 flex flex-col justify-center space-y-5">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#2196D2] mb-2">
                Customize
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">
                Make it yours
              </h2>
              <p className="mt-2 text-zinc-500 leading-relaxed">
                Choose color and sizes, pick a decoration method, then place your design on the
                mockup.
              </p>
            </div>
            {colors.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-wider uppercase text-zinc-400 mb-2">
                  Colors
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.slice(0, 12).map((c) => (
                    <span
                      key={c.id}
                      title={c.name}
                      className="w-9 h-9 rounded-full border-2 border-white shadow ring-1 ring-zinc-200"
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-zinc-500">
              {sizes.map((s) => s.name).join(" · ")}
              {methods.length > 0 ? (
                <span className="text-zinc-400">
                  {" "}
                  · {methods.length} decoration option{methods.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={designHref}
                className="inline-flex px-6 py-3 bg-[#2196D2] hover:bg-[#1B85BD] text-white font-bold rounded-xl transition-colors shadow-md shadow-[#2196D2]/25"
              >
                Start designing
              </Link>
              {typeof cat.price === "number" && cat.price > 0 && (
                <p className="text-sm font-bold text-zinc-600">
                  From ${Number(cat.price).toFixed(2)}
                  {cat.unitPrice ? ` · ${cat.unitPrice}` : ""}
                </p>
              )}
            </div>
          </div>
        </div>

        {products.length > 0 && (
          <div>
            <h3 className="text-xl font-black text-zinc-900 mb-5">More in this category</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p: any) => {
                const pImg = mediaSrc(p.image || cover) || p.image || cover;
                return (
                  <Link
                    key={String(p._id)}
                    href={`/clothing-bags/design?category=${encodeURIComponent(cat.slug || String(cat._id))}&productId=${p._id}`}
                    className="group rounded-3xl overflow-hidden border border-zinc-200 hover:shadow-lg transition-all bg-white"
                  >
                    <div className="aspect-[4/3] relative overflow-hidden bg-[#f8fbfd]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pImg}
                        alt={p.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <p className="font-bold text-zinc-900">{p.name}</p>
                      {p.price != null && (
                        <p className="text-sm text-zinc-500 mt-0.5">${Number(p.price).toFixed(2)}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
