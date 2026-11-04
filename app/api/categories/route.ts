import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import { catalogImageFor } from "@/lib/catalogImages";

// GET /api/categories — public endpoint
export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = req.nextUrl;
  const canvasType = searchParams.get("canvas_type");

  const filter: Record<string, unknown> = { isActive: true };
  if (canvasType === "flat" || canvasType === "dieline" || canvasType === "mockup") {
    filter.canvas_type = canvasType;
  }

  const categories = await Category.find(filter)
    .sort({ sortOrder: 1, name: 1 })
    .select("-__v")
    .lean();

  const isUsableImage = (value?: string | null) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return false;
    if (trimmed.includes("placeholder")) return false;
    if (trimmed === "/slide.png" || trimmed === "/placeholder.jpg") return false;
    return true;
  };

  const themedCategories = categories.map((category) => {
    const sample = catalogImageFor(category.name, category.slug);
    const dbImage =
      [category.image, (category as { mockup_image?: string }).mockup_image].find(isUsableImage) ||
      sample;
    const galleryFromDb = Array.isArray((category as { galleryImages?: string[] }).galleryImages)
      ? ((category as { galleryImages?: string[] }).galleryImages || []).filter(isUsableImage)
      : [];

    return {
      ...category,
      image: dbImage,
      galleryImages: galleryFromDb.length > 0 ? galleryFromDb : [dbImage],
    };
  });

  return NextResponse.json({ success: true, categories: themedCategories });
}
