import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import Template from "@/models/Template";

// POST /api/admin/templates/[id]/duplicate — duplicate an existing template
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const { id } = await params;
  const original = await Template.findById(id).lean();

  if (!original) {
    return NextResponse.json(
      { success: false, message: "Original template not found." },
      { status: 404 }
    );
  }

  try {
    const copySuffix = Date.now().toString(36).slice(-4);
    const newTitle = `${original.title} (Copy)`;
    const newSlug = `${(original.slug || original.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}-copy-${copySuffix}`;

    const duplicated = await Template.create({
      title: newTitle,
      slug: newSlug,
      description: original.description,
      category: original.category,
      categoryId: original.categoryId,
      tags: original.tags || [],
      thumbnail: original.thumbnail,
      backThumbnail: original.backThumbnail,
      price: original.price || 0,
      isPaid: (original.price || 0) > 0,
      status: "DRAFT",
      isActive: false,
      canvas_config: original.canvas_config,
      front_design: original.front_design,
      back_design: original.back_design,
      side_designs: original.side_designs || [],
      templateData: original.templateData,
      createdBy: auth.userId,
    });

    return NextResponse.json({
      success: true,
      message: `Template duplicated as "${newTitle}".`,
      template: duplicated,
    }, { status: 201 });
  } catch (err) {
    console.error("[Admin/Templates Duplicate POST]", err);
    return NextResponse.json(
      { success: false, message: "Failed to duplicate template." },
      { status: 500 }
    );
  }
}
