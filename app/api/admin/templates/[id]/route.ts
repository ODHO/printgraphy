import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import Template from "@/models/Template";
import { syncCanvasToLegacyTemplateData } from "@/lib/canvasUtils";

// GET /api/admin/templates/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const { id } = await params;
  const template = await Template.findById(id)
    .populate("categoryId", "name slug canvas_width canvas_height unit orientation bleed safe_area background_color supports_back_side")
    .lean();

  if (!template) {
    return NextResponse.json(
      { success: false, message: "Template not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, template });
}

// PUT /api/admin/templates/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const { id } = await params;
  try {
    const body = await req.json();

    // Auto-compute isPaid from price
    if (typeof body.price === "number") {
      body.isPaid = body.price > 0;
    }

    // Sync status and isActive
    if (body.status) {
      body.isActive = body.status === "PUBLISHED";
    } else if (body.isActive !== undefined) {
      body.status = body.isActive ? "PUBLISHED" : "DRAFT";
    }

    // Clean tags if string
    if (typeof body.tags === "string") {
      body.tags = body.tags.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    // Sync legacy templateData from front_design for backward compatibility
    if (body.front_design && !body.templateData) {
      body.templateData = syncCanvasToLegacyTemplateData(
        body.front_design.bgColor || "#18181b",
        body.front_design.objects || []
      );
    }

    const template = await Template.findByIdAndUpdate(
      id,
      { $set: body },
      {
        new: true,
        runValidators: true,
      }
    ).populate("categoryId");

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Template not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, template });
  } catch (err) {
    console.error("[Admin/Templates PUT]", err);
    return NextResponse.json(
      { success: false, message: "Failed to update template." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/templates/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const { id } = await params;
  const template = await Template.findByIdAndDelete(id);

  if (!template) {
    return NextResponse.json(
      { success: false, message: "Template not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, message: "Template deleted." });
}
