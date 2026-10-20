import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Page, { DEFAULT_CMS_PAGES } from "@/models/Page";
import HeaderMenu from "@/models/HeaderMenu";
import { getSession } from "@/lib/session";
import User from "@/models/User";

async function verifyAdmin() {
  const session = await getSession();
  if (!session) return false;
  await dbConnect();
  const user = await User.findById(session.userId).select("isAdmin").lean();
  return user?.isAdmin === true;
}

export async function GET() {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let pages = await Page.find().sort({ createdAt: -1 }).lean();

    if (!pages || pages.length === 0) {
      await Page.insertMany(DEFAULT_CMS_PAGES);
      pages = await Page.find().sort({ createdAt: -1 }).lean();
    }

    return NextResponse.json({ success: true, pages });
  } catch (error) {
    console.error("Error fetching admin pages:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch pages" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, slug, content, metaTitle, metaDescription, isPublished, addToHeaderMenu } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { success: false, message: "Title and slug are required" },
        { status: 400 }
      );
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Check slug uniqueness
    const existing = await Page.findOne({ slug: cleanSlug }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Page with slug "/${cleanSlug}" already exists.` },
        { status: 400 }
      );
    }

    const newPage = await Page.create({
      title: title.trim(),
      slug: cleanSlug,
      content: content || "",
      metaTitle: metaTitle || title.trim(),
      metaDescription: metaDescription || "",
      isPublished: isPublished ?? true,
    });

    // Optionally attach to header menu immediately
    if (addToHeaderMenu) {
      const maxItem = await HeaderMenu.findOne().sort({ order: -1 }).lean();
      const nextOrder = maxItem ? maxItem.order + 1 : 0;
      await HeaderMenu.create({
        title: title.trim(),
        url: `/pages/${cleanSlug}`,
        order: nextOrder,
        isActive: true,
        openInNewTab: false,
      });
    }

    return NextResponse.json({ success: true, page: newPage }, { status: 201 });
  } catch (error) {
    console.error("Error creating page:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create page" },
      { status: 500 }
    );
  }
}
