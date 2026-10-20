import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import dbConnect from "@/lib/mongodb";
import Page from "@/models/Page";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPageData(slug: string) {
  try {
    await dbConnect();
    const page = await Page.findOne({ slug: slug.toLowerCase(), isPublished: true }).lean();
    return page;
  } catch (error) {
    console.error("Error fetching page data:", error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageData(slug);

  if (!page) {
    return {
      title: "Page Not Found — Printgraphy",
    };
  }

  return {
    title: page.metaTitle || `${page.title} — Printgraphy`,
    description: page.metaDescription || `Read ${page.title} on Printgraphy`,
  };
}

export default async function PublicCustomPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPageData(slug);

  if (!page) {
    notFound();
  }

  const isFullBleedPage =
    (page.blocks && Array.isArray(page.blocks) && page.blocks.length > 0) ||
    page.content?.includes("<section") ||
    page.content?.includes("w-full");

  return (
    <div className="min-h-screen bg-[#FAF8F5] font-sans flex flex-col justify-between">
      <div>
        {isFullBleedPage ? (
          <main className="w-full overflow-hidden">
            {/* Page Builder Render */}
            <div
              className="w-full space-y-0"
              dangerouslySetInnerHTML={{ __html: page.content || "" }}
            />
          </main>
        ) : (
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-base font-semibold text-zinc-400 mb-6">
              <Link href="/" className="hover:text-[#064FE0] transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-zinc-700">{page.title}</span>
            </nav>

            {/* Article Container Card */}
            <article className="bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-10 shadow-sm space-y-6">
              <div className="border-b border-zinc-100 pb-6 space-y-2">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
                  {page.title}
                </h1>
                <p className="text-base text-zinc-400">
                  Last updated on {new Date(page.updatedAt || page.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div
                className="prose prose-zinc prose-sky max-w-none text-zinc-700 text-base leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{ __html: page.content || "<p>This page has no content yet.</p>" }}
              />
            </article>

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-zinc-200 rounded-2xl text-base font-bold text-zinc-700 hover:bg-zinc-50 transition-all shadow-xs"
              >
                ← Back to Homepage
              </Link>
            </div>
          </main>
        )}
      </div>

    </div>
  );
}
