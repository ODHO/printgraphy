import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import Category, { DEFAULT_CATEGORY_PRESETS, normalizeCategoryMockup, normalizeCategorySides } from "@/models/Category";
import { asCanvasUnit, cleanPrintSizes } from "@/lib/canvasUtils";
import Template from "@/models/Template";

// GET /api/admin/categories
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";

  const filter: Record<string, unknown> = {};
  if (search) filter.name = { $regex: search, $options: "i" };

  const categories = await Category.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  // If no categories exist, automatically seed standard presets
  if (categories.length === 0 && !search) {
    const presetsToInsert = Object.values(DEFAULT_CATEGORY_PRESETS).map((p, idx) => ({
      name: p.name,
      slug: p.slug,
      description: p.description,
      canvas_width: p.canvas_width,
      canvas_height: p.canvas_height,
      unit: p.unit,
      orientation: p.orientation,
      bleed: p.bleed,
      safe_area: p.safe_area,
      background_color: p.background_color,
      supports_back_side: p.supports_back_side,
      side_mode: p.side_mode,
      sides_count: p.sides_count,
      sides_names: p.sides_names,
      guide_lines: p.guide_lines || [],
      isActive: true,
      sortOrder: idx + 1,
    }));

    await Category.insertMany(presetsToInsert);
    const seededCategories = await Category.find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    const categoriesWithCount = seededCategories.map((c) => ({
      ...c,
      templateCount: 0,
    }));

    return NextResponse.json({ success: true, categories: categoriesWithCount });
  }

  // Count templates for each category
  const categoryIds = categories.map((c) => c._id);
  const categoryNames = categories.map((c) => c.name);

  const templateCounts = await Template.aggregate([
    {
      $match: {
        $or: [
          { categoryId: { $in: categoryIds } },
          { category: { $in: categoryNames } },
        ],
      },
    },
    {
      $group: {
        _id: { $ifNull: ["$categoryId", "$category"] },
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map<string, number>();
  templateCounts.forEach((tc) => {
    countMap.set(String(tc._id), tc.count);
  });

  const categoriesWithCount = categories.map((c) => {
    const countById = countMap.get(String(c._id)) || 0;
    const countByName = countMap.get(c.name) || 0;
    return {
      ...c,
      templateCount: Math.max(countById, countByName),
    };
  });

  return NextResponse.json({ success: true, categories: categoriesWithCount });
}

// POST /api/admin/categories
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  try {
    const body = await req.json();

    // Check for seed action
    if (body.action === "seed") {
      let createdCount = 0;
      for (const preset of Object.values(DEFAULT_CATEGORY_PRESETS)) {
        const existing = await Category.findOne({ slug: preset.slug });
        if (!existing) {
          await Category.create({
            ...preset,
            isActive: true,
            sortOrder: createdCount + 1,
          });
          createdCount++;
        }
      }
      const updatedCategories = await Category.find({}).sort({ sortOrder: 1 }).lean();
      return NextResponse.json({
        success: true,
        message: `Seeded ${createdCount} categories.`,
        categories: updatedCategories,
      });
    }

    const {
      name,
      slug,
      description,
      price,
      unitPrice,
      image,
      parentId,
      isActive,
      sortOrder,
      canvas_width,
      canvas_height,
      unit,
      orientation,
      bleed,
      bleedUnit,
      safe_area,
      safeAreaUnit,
      printSizes,
      background_color,
      supports_back_side,
      side_mode,
      sides_count,
      sides_names,
      guide_lines,
      canvas_type,
      mockup_image,
      banner_image,
      print_area,
      print_placements,
      apparel_colors,
      apparel_sizes,
      decoration_methods,
      text_layers,
      default_template_data,
      galleryImages,
      featureStory,
      variations,
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Category name is required." },
        { status: 400 }
      );
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const category = await Category.create({
      name: name.trim(),
      slug: cleanSlug,
      description: description ?? "",
      price: price !== undefined && !isNaN(parseFloat(price)) ? Number(price) : 0.15,
      unitPrice: unitPrice !== undefined ? String(unitPrice) : "",
      image: image ?? "",
      banner_image: banner_image || "",
      galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
      featureStory: featureStory || {},
      parentId: parentId ?? undefined,
      isActive: isActive ?? true,
      sortOrder: Number(sortOrder) || 0,
      canvas_width: Number(canvas_width) || 105,
      canvas_height: Number(canvas_height) || 60,
      unit: unit || "mm",
      orientation: orientation || "landscape",
      bleed: Number(bleed) || 0,
      bleedUnit: asCanvasUnit(bleedUnit, unit || "mm"),
      safe_area: Number(safe_area) || 0,
      safeAreaUnit: asCanvasUnit(safeAreaUnit, unit || "mm"),
      printSizes: cleanPrintSizes(printSizes),
      background_color: background_color || "#18181b",
      text_layers: Array.isArray(text_layers) ? text_layers : [],
      default_template_data: default_template_data || {},
      ...normalizeCategorySides({
        side_mode,
        sides_count,
        sides_names,
        supports_back_side,
        guide_lines,
      }),
      ...normalizeCategoryMockup({
        canvas_type,
        mockup_image,
        print_area,
        print_placements,
        apparel_colors,
        apparel_sizes,
        decoration_methods,
        guide_lines,
      }),
      variations: variations ?? [],
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { success: false, message: "A category with that slug already exists." },
        { status: 409 }
      );
    }
    console.error("[Admin/Categories POST]", err);
    return NextResponse.json(
      { success: false, message: "Failed to create category." },
      { status: 500 }
    );
  }
}
