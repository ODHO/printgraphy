import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import FooterMenu, { DEFAULT_FOOTER_MENU_COLUMNS } from "@/models/FooterMenu";
import FooterSettings from "@/models/FooterSettings";
import { mergeFooterContent } from "@/lib/footerContent";

export async function GET() {
  try {
    await dbConnect();

    const [settingsDoc, menuColumns] = await Promise.all([
      FooterSettings.findOne({ key: "footer" }).lean(),
      FooterMenu.find({ isActive: true }).sort({ order: 1 }).lean(),
    ]);

    let columns = menuColumns;
    if (!columns || columns.length === 0) {
      const totalCount = await FooterMenu.countDocuments();
      if (totalCount === 0) {
        await FooterMenu.insertMany(DEFAULT_FOOTER_MENU_COLUMNS);
        columns = await FooterMenu.find({ isActive: true }).sort({ order: 1 }).lean();
      }
    }

    const filteredColumns = (columns || []).map((col) => ({
      ...col,
      items: (col.items || [])
        .filter((item) => item.isActive !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }));

    return NextResponse.json({
      success: true,
      content: mergeFooterContent(settingsDoc?.content),
      columns: filteredColumns,
    });
  } catch (error) {
    console.error("Error fetching footer:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch footer" }, { status: 500 });
  }
}
