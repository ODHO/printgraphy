import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Page, { DEFAULT_CMS_PAGES } from "@/models/Page";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const { slug } = await params;

    let page = await Page.findOne({ slug: slug.toLowerCase(), isPublished: true }).lean();

    // If database has no pages at all, auto-seed defaults and re-fetch
    if (!page) {
      const count = await Page.countDocuments();
      if (count === 0) {
        await Page.insertMany(DEFAULT_CMS_PAGES);
        page = await Page.findOne({ slug: slug.toLowerCase(), isPublished: true }).lean();
      }
    }

    if (!page) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, page });
  } catch (error) {
    console.error("Error fetching page by slug:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch page" },
      { status: 500 }
    );
  }
}
