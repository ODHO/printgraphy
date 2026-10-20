import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import Template from "@/models/Template";
import Category from "@/models/Category";
import { syncCanvasToLegacyTemplateData } from "@/lib/canvasUtils";
import mongoose from "mongoose";

// GET /api/admin/templates — list all templates with advanced filtering
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const category = searchParams.get("category") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const status = searchParams.get("status") ?? "";
  const isPaid = searchParams.get("isPaid");
  const search = searchParams.get("search") ?? "";

  // Build query filter
  const andConditions: any[] = [];
  if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
    andConditions.push({ categoryId: new mongoose.Types.ObjectId(categoryId) });
  } else if (category && category !== "all") {
    const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const orConditions: any[] = [
      { category: { $regex: new RegExp(escaped, "i") } },
    ];
    if (/^[0-9a-fA-F]{24}$/.test(category)) {
      orConditions.push({ categoryId: new mongoose.Types.ObjectId(category) });
    }
    andConditions.push({ $or: orConditions });
  }

  if (status) {
    andConditions.push({ status });
  }
  if (isPaid === "true") andConditions.push({ isPaid: true });
  if (isPaid === "false") andConditions.push({ isPaid: false });
  if (search) {
    const searchEscaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    andConditions.push({ title: { $regex: searchEscaped, $options: "i" } });
  }

  const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0] || {};

  const [templates, total] = await Promise.all([
    Template.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("categoryId", "name slug canvas_width canvas_height unit orientation bleed safe_area")
      .lean(),
    Template.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    templates,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// POST /api/admin/templates — create a template
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  try {
    const body = await req.json();

    const {
      title,
      slug,
      description,
      category,
      categoryId,
      tags,
      thumbnail,
      backThumbnail,
      price,
      status = "DRAFT",
      canvas_config,
      front_design,
      back_design,
      side_designs,
      templateData,
      selectedVariations,
      variations,
    } = body;

    if (!title || (!category && !categoryId)) {
      return NextResponse.json(
        { success: false, message: "title and category are required." },
        { status: 400 }
      );
    }

    // Resolve Category if categoryId provided
    let categoryName = category;
    let resolvedCanvasConfig = canvas_config;

    if (categoryId) {
      const catDoc = await Category.findById(categoryId);
      if (catDoc) {
        categoryName = catDoc.name;
        if (!resolvedCanvasConfig) {
          resolvedCanvasConfig = {
            width: catDoc.canvas_width,
            height: catDoc.canvas_height,
            unit: catDoc.unit,
            orientation: catDoc.orientation,
            bleed: catDoc.bleed,
            bleedUnit: catDoc.bleedUnit || catDoc.unit,
            safe_area: catDoc.safe_area,
            safeAreaUnit: catDoc.safeAreaUnit || catDoc.unit,
            background_color: catDoc.background_color,
            supports_back_side: catDoc.supports_back_side,
            side_mode: catDoc.side_mode || (catDoc.supports_back_side === false ? "single" : "double"),
            sides_count: catDoc.sides_count || 2,
            sides_names: catDoc.sides_names || ["Front", "Back"],
            guide_lines: catDoc.guide_lines || [],
            canvas_type: catDoc.canvas_type || "flat",
            mockup_image: catDoc.mockup_image || "",
            print_area: catDoc.print_area || undefined,
          };
        }
      }
    }

    // Auto-generate slug if not provided
    const cleanSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Synchronize legacy templateData for backward compatibility with customer business card flow
    let syncedTemplateData = templateData;
    if (!syncedTemplateData && front_design) {
      syncedTemplateData = syncCanvasToLegacyTemplateData(
        front_design.bgColor || "#18181b",
        front_design.objects || []
      );
    }

    const priceNum = Number(price) || 0;
    const isPublished = status === "PUBLISHED";

    const template = await Template.create({
      title: title.trim(),
      slug: cleanSlug,
      description: description ?? "",
      category: categoryName,
      categoryId: categoryId || undefined,
      tags: Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      thumbnail: thumbnail ?? "",
      backThumbnail: backThumbnail ?? "",
      price: priceNum,
      isPaid: priceNum > 0,
      status,
      isActive: isPublished,
      canvas_config: resolvedCanvasConfig,
      front_design: front_design || { bgColor: "#18181b", objects: [] },
      back_design: back_design || { bgColor: "#141414", objects: [] },
      side_designs: Array.isArray(side_designs) ? side_designs : [],
      templateData: syncedTemplateData || {
        bgColor: "#18181b",
        textColor: "#ffffff",
        logoPosition: "top-right",
        logoText: "",
        logoSize: 36,
        imageOpacity: 90,
        textLayers: [],
      },
      selectedVariations: selectedVariations || {},
      variations: variations || [],
      createdBy: auth.userId,
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (err) {
    console.error("[Admin/Templates POST]", err);
    return NextResponse.json(
      { success: false, message: "Failed to create template." },
      { status: 500 }
    );
  }
}
