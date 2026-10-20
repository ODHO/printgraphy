import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import Category, { normalizeCategoryMockup, normalizeCategorySides } from "@/models/Category";
import { asCanvasUnit, cleanPrintSizes } from "@/lib/canvasUtils";
import Template from "@/models/Template";

// GET /api/admin/categories/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const { id } = await params;
  const category = await Category.findById(id).lean();

  if (!category) {
    return NextResponse.json(
      { success: false, message: "Category not found." },
      { status: 404 }
    );
  }

  // Count templates for this category
  const templateCount = await Template.countDocuments({
    $or: [{ categoryId: id }, { category: category.name }, { category: category.slug }],
  });

  return NextResponse.json({
    success: true,
    category: {
      ...category,
      templateCount,
    },
  });
}

// PUT /api/admin/categories/[id]
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
    if (body.slug) {
      body.slug = body.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    if (body.canvas_width !== undefined) body.canvas_width = Number(body.canvas_width);
    if (body.canvas_height !== undefined) body.canvas_height = Number(body.canvas_height);
    if (body.bleed !== undefined) body.bleed = Number(body.bleed) || 0;
    if (body.safe_area !== undefined) body.safe_area = Number(body.safe_area) || 0;
    if (body.bleedUnit !== undefined) body.bleedUnit = asCanvasUnit(body.bleedUnit, body.unit || "mm");
    if (body.safeAreaUnit !== undefined) body.safeAreaUnit = asCanvasUnit(body.safeAreaUnit, body.unit || "mm");
    if (body.printSizes !== undefined) body.printSizes = cleanPrintSizes(body.printSizes);

    // Always normalize and persist side/canvas panel config (packaging, apparel, multi-panel)
    const sides = normalizeCategorySides(body);
    body.side_mode = sides.side_mode;
    body.sides_count = sides.sides_count;
    body.sides_names = sides.sides_names;
    body.supports_back_side = sides.supports_back_side;
    if (body.guide_lines !== undefined) body.guide_lines = sides.guide_lines;
    const mockup = normalizeCategoryMockup(body);
    body.canvas_type = mockup.canvas_type;
    body.mockup_image = mockup.mockup_image;
    body.print_area = mockup.print_area;
    body.print_placements = mockup.print_placements;
    body.apparel_colors = mockup.apparel_colors;
    body.apparel_sizes = mockup.apparel_sizes;
    body.decoration_methods = mockup.decoration_methods;
    if (body.text_layers !== undefined) body.text_layers = Array.isArray(body.text_layers) ? body.text_layers : [];
    if (body.default_template_data !== undefined) body.default_template_data = body.default_template_data || {};

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, category });
  } catch (err) {
    console.error("[Admin/Categories PUT]", err);
    return NextResponse.json(
      { success: false, message: "Failed to update category." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/categories/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const force = searchParams.get("force") === "true";

  const category = await Category.findById(id);
  if (!category) {
    return NextResponse.json(
      { success: false, message: "Category not found." },
      { status: 404 }
    );
  }

  // Check if templates belong to this category
  const templateCount = await Template.countDocuments({
    $or: [{ categoryId: id }, { category: category.name }, { category: category.slug }],
  });

  if (templateCount > 0 && !force) {
    return NextResponse.json(
      {
        success: false,
        message: `Cannot delete category "${category.name}". It contains ${templateCount} template(s). Please delete or archive them first.`,
        templateCount,
      },
      { status: 400 }
    );
  }

  await Category.findByIdAndDelete(id);

  return NextResponse.json({
    success: true,
    message: `Category "${category.name}" deleted successfully.`,
  });
}
