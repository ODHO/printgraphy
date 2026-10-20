import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import HeaderMenu, { DEFAULT_HEADER_MENU_ITEMS, buildMenuDropdown } from "@/models/HeaderMenu";
import Category from "@/models/Category";

export async function GET() {
  try {
    await dbConnect();

    let items = await HeaderMenu.find({ isActive: true }).sort({ order: 1 }).lean();

    // If database has no menu items at all, seed defaults automatically
    if (!items || items.length === 0) {
      const totalCount = await HeaderMenu.countDocuments();
      if (totalCount === 0) {
        await HeaderMenu.insertMany(DEFAULT_HEADER_MENU_ITEMS);
        items = await HeaderMenu.find({ isActive: true }).sort({ order: 1 }).lean();
      }
    }

    const categoryIds = items.map((item) => item.categoryId).filter((id): id is NonNullable<typeof id> => Boolean(id));
    const categories = categoryIds.length
      ? await Category.find({ _id: { $in: categoryIds }, isActive: true })
          .select("name image variations")
          .lean()
      : [];
    const byId = new Map(categories.map((category) => [String(category._id), category]));
    const withDropdowns = items.map((item) => ({
      ...item,
      dropdown: buildMenuDropdown(item, item.categoryId ? byId.get(String(item.categoryId)) : null),
    }));

    return NextResponse.json({ success: true, items: withDropdowns });
  } catch (error) {
    console.error("Error fetching public header menu:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch header menu items" },
      { status: 500 }
    );
  }
}
