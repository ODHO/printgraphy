import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import FooterMenu from "@/models/FooterMenu";
import { getSession } from "@/lib/session";
import User from "@/models/User";

async function verifyAdmin() {
  const session = await getSession();
  if (!session) return false;
  await dbConnect();
  const user = await User.findById(session.userId).select("isAdmin").lean();
  return user?.isAdmin === true;
}

export async function PATCH(
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

    const updatedColumn = await FooterMenu.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedColumn) {
      return NextResponse.json({ success: false, message: "Column not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, column: updatedColumn });
  } catch (error) {
    console.error("Error updating footer menu column:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update column" },
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
    const deletedColumn = await FooterMenu.findByIdAndDelete(id);

    if (!deletedColumn) {
      return NextResponse.json({ success: false, message: "Column not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Column deleted successfully" });
  } catch (error) {
    console.error("Error deleting footer menu column:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete column" },
      { status: 500 }
    );
  }
}
