import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import FooterMenu, { DEFAULT_FOOTER_MENU_COLUMNS } from "@/models/FooterMenu";
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

    let columns = await FooterMenu.find().sort({ order: 1 }).lean();

    if (!columns || columns.length === 0) {
      await FooterMenu.insertMany(DEFAULT_FOOTER_MENU_COLUMNS);
      columns = await FooterMenu.find().sort({ order: 1 }).lean();
    }

    return NextResponse.json({ success: true, columns });
  } catch (error) {
    console.error("Error fetching admin footer menu:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch footer menu columns" },
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
    const { title, isActive, items } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Column title is required" },
        { status: 400 }
      );
    }

    const maxCol = await FooterMenu.findOne().sort({ order: -1 }).lean();
    const nextOrder = maxCol ? maxCol.order + 1 : 0;

    const newColumn = await FooterMenu.create({
      title,
      order: nextOrder,
      isActive: isActive ?? true,
      items: Array.isArray(items) ? items : [],
    });

    return NextResponse.json({ success: true, column: newColumn }, { status: 201 });
  } catch (error) {
    console.error("Error creating footer menu column:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create footer menu column" },
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
    const { columns, action } = body;

    if (action === "seed") {
      await FooterMenu.deleteMany({});
      const seeded = await FooterMenu.insertMany(DEFAULT_FOOTER_MENU_COLUMNS);
      return NextResponse.json({ success: true, columns: seeded });
    }

    if (!Array.isArray(columns)) {
      return NextResponse.json(
        { success: false, message: "Invalid payload: columns array required" },
        { status: 400 }
      );
    }

    // Replace or bulk update columns
    for (const col of columns) {
      if (col._id) {
        await FooterMenu.findByIdAndUpdate(col._id, {
          title: col.title,
          order: col.order,
          isActive: col.isActive,
          items: col.items || [],
        });
      }
    }

    const updatedColumns = await FooterMenu.find().sort({ order: 1 }).lean();
    return NextResponse.json({ success: true, columns: updatedColumns });
  } catch (error) {
    console.error("Error updating footer menu columns:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update footer menu columns" },
      { status: 500 }
    );
  }
}
