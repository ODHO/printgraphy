import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import HeaderMenu, { DEFAULT_HEADER_MENU_ITEMS, cleanMenuColumns, cleanMenuFeature } from "@/models/HeaderMenu";
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

    let items = await HeaderMenu.find().sort({ order: 1 }).lean();

    if (!items || items.length === 0) {
      await HeaderMenu.insertMany(DEFAULT_HEADER_MENU_ITEMS);
      items = await HeaderMenu.find().sort({ order: 1 }).lean();
    }

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Error fetching admin header menu:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch header menu items" },
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
    const { title, url, openInNewTab, isActive, loginOnly, categoryId, columns, feature } = body;

    if (!title || !url) {
      return NextResponse.json(
        { success: false, message: "Title and URL are required" },
        { status: 400 }
      );
    }

    // Get maximum order to place new item at the end
    const maxItem = await HeaderMenu.findOne().sort({ order: -1 }).lean();
    const nextOrder = maxItem ? maxItem.order + 1 : 0;

    const newItem = await HeaderMenu.create({
      title,
      url,
      order: nextOrder,
      isActive: isActive ?? true,
      openInNewTab: openInNewTab ?? false,
      loginOnly: loginOnly ?? false,
      categoryId: categoryId || null,
      columns: cleanMenuColumns(columns),
      feature: cleanMenuFeature(feature),
    });

    return NextResponse.json({ success: true, item: newItem }, { status: 201 });
  } catch (error) {
    console.error("Error creating header menu item:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create header menu item" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items, action } = body;

    // Handle re-seeding default items
    if (action === "seed") {
      await HeaderMenu.deleteMany({});
      const seeded = await HeaderMenu.insertMany(DEFAULT_HEADER_MENU_ITEMS);
      return NextResponse.json({ success: true, items: seeded });
    }

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { success: false, message: "Invalid payload: items array required" },
        { status: 400 }
      );
    }

    // Bulk update positions/orders
    const bulkOps = items.map((item: { _id: string; order: number; isActive?: boolean; title?: string; url?: string; openInNewTab?: boolean; loginOnly?: boolean }) => ({
      updateOne: {
        filter: { _id: item._id },
        update: {
          $set: {
            order: item.order,
            ...(typeof item.isActive === "boolean" ? { isActive: item.isActive } : {}),
            ...(item.title ? { title: item.title } : {}),
            ...(item.url ? { url: item.url } : {}),
            ...(typeof item.openInNewTab === "boolean" ? { openInNewTab: item.openInNewTab } : {}),
            ...(typeof item.loginOnly === "boolean" ? { loginOnly: item.loginOnly } : {}),
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await HeaderMenu.bulkWrite(bulkOps);
    }

    const updatedItems = await HeaderMenu.find().sort({ order: 1 }).lean();
    return NextResponse.json({ success: true, items: updatedItems });
  } catch (error) {
    console.error("Error updating header menu order:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update menu items" },
      { status: 500 }
    );
  }
}
