import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Page from "@/models/Page";
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const page = await Page.findById(id).lean();

    if (!page) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, page });
  } catch (error) {
    console.error("Error fetching single page by id:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch page" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, slug, content, blocks, metaTitle, metaDescription, isPublished, addToHeaderMenu } = body;

    const existingPage = await Page.findById(id);
    if (!existingPage) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
    }

    let cleanSlug = existingPage.slug;
    if (slug && slug !== existingPage.slug) {
      cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const duplicate = await Page.findOne({ slug: cleanSlug, _id: { $ne: id } }).lean();
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: `Slug "/${cleanSlug}" is already taken by another page.` },
          { status: 400 }
        );
      }
    }

    existingPage.title = title ?? existingPage.title;
    existingPage.slug = cleanSlug;
    existingPage.content = content ?? existingPage.content;
    if (Array.isArray(blocks)) {
      existingPage.blocks = blocks;
    }
    existingPage.metaTitle = metaTitle ?? existingPage.metaTitle;
    existingPage.metaDescription = metaDescription ?? existingPage.metaDescription;
    if (typeof isPublished === "boolean") {
      existingPage.isPublished = isPublished;
    }

    await existingPage.save();

    // Optionally add link to header menu if requested
    if (addToHeaderMenu) {
      const pageUrl = `/pages/${cleanSlug}`;
      const existingMenu = await HeaderMenu.findOne({ url: pageUrl }).lean();
      if (!existingMenu) {
        const maxItem = await HeaderMenu.findOne().sort({ order: -1 }).lean();
        const nextOrder = maxItem ? maxItem.order + 1 : 0;
        await HeaderMenu.create({
          title: existingPage.title,
          url: pageUrl,
          order: nextOrder,
          isActive: true,
          openInNewTab: false,
        });
      }
    }

    return NextResponse.json({ success: true, page: existingPage });
  } catch (error) {
    console.error("Error updating page:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update page" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deletedPage = await Page.findByIdAndDelete(id);

    if (!deletedPage) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Page deleted successfully" });
  } catch (error) {
    console.error("Error deleting page:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete page" },
      { status: 500 }
    );
  }
}
