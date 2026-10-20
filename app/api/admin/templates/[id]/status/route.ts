import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import Template from "@/models/Template";

// POST /api/admin/templates/[id]/status — transition status to DRAFT, PUBLISHED, or ARCHIVED
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const { id } = await params;
  try {
    const { status } = await req.json();

    if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Status must be DRAFT, PUBLISHED, or ARCHIVED." },
        { status: 400 }
      );
    }

    const isActive = status === "PUBLISHED";
    const template = await Template.findByIdAndUpdate(
      id,
      { status, isActive },
      { new: true }
    );

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Template not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Template status changed to ${status}.`,
      template,
    });
  } catch (err) {
    console.error("[Admin/Templates Status POST]", err);
    return NextResponse.json(
      { success: false, message: "Failed to update template status." },
      { status: 500 }
    );
  }
}
