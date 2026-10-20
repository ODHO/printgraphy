import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import FooterMenu, { DEFAULT_FOOTER_MENU_COLUMNS } from "@/models/FooterMenu";

export async function GET() {
  try {
    await dbConnect();

    let columns = await FooterMenu.find({ isActive: true }).sort({ order: 1 }).lean();

    if (!columns || columns.length === 0) {
      const totalCount = await FooterMenu.countDocuments();
      if (totalCount === 0) {
        await FooterMenu.insertMany(DEFAULT_FOOTER_MENU_COLUMNS);
        columns = await FooterMenu.find({ isActive: true }).sort({ order: 1 }).lean();
      }
    }

    // Filter active items inside each active column
    const filteredColumns = columns.map((col) => ({
      ...col,
      items: (col.items || [])
        .filter((item) => item.isActive !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }));

    return NextResponse.json({ success: true, columns: filteredColumns });
  } catch (error) {
    console.error("Error fetching public footer menu:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch footer menu items" },
      { status: 500 }
    );
  }
}
