import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Template from "@/models/Template";
import Category from "@/models/Category";
import mongoose from "mongoose";

// GET /api/templates — public endpoint for browsing templates
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const category = searchParams.get("category")?.trim() ?? "";
    const categoryId = searchParams.get("categoryId")?.trim() ?? "";
    const isPaid = searchParams.get("isPaid");
    const search = searchParams.get("search")?.trim() ?? "";

    // Show active or published templates
    const statusCondition = {
      $or: [
        { status: "PUBLISHED" },
        { isActive: true },
        { status: { $exists: false } },
      ],
    };

    const andConditions: any[] = [statusCondition];

    // Handle Category Filter
    if (category && category.toLowerCase() !== "all") {
      const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const cleanBase = category.replace(/\s*\([^)]*\)/g, "").trim();
      const escapedBase = cleanBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const categoryOrConditions: any[] = [
        { category: { $regex: new RegExp(escaped, "i") } },
      ];

      if (escapedBase && escapedBase.toLowerCase() !== escaped.toLowerCase()) {
        categoryOrConditions.push({ category: { $regex: new RegExp(escapedBase, "i") } });
      }

      const isHexId = /^[0-9a-fA-F]{24}$/.test(category);
      if (isHexId) {
        categoryOrConditions.push({ categoryId: new mongoose.Types.ObjectId(category) });
      }

      // Also look up related Category document to find its exact ObjectId and name
      try {
        const catQuery = isHexId
          ? { _id: new mongoose.Types.ObjectId(category) }
          : {
              $or: [
                { name: { $regex: new RegExp(`^${escaped}$`, "i") } },
                { slug: category.toLowerCase() },
              ],
            };
        const catDoc = await Category.findOne(catQuery).lean();
        if (catDoc) {
          categoryOrConditions.push({ categoryId: catDoc._id });
          const catDocEscaped = (catDoc as any).name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          categoryOrConditions.push({ category: { $regex: new RegExp(catDocEscaped, "i") } });
        }
      } catch (_) {}

      andConditions.push({ $or: categoryOrConditions });
    }

    if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
      andConditions.push({ categoryId: new mongoose.Types.ObjectId(categoryId) });
    }

    if (isPaid === "true") andConditions.push({ isPaid: true });
    if (isPaid === "false") andConditions.push({ isPaid: false });
    if (search) {
      const searchEscaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(searchEscaped, "i");
      andConditions.push({
        $or: [
          { title: pattern },
          { description: pattern },
          { category: pattern },
          { tags: pattern },
          { slug: pattern },
        ],
      });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0] || {};

    const [templates, total] = await Promise.all([
      Template.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-thumbnail")
        .lean(),
      Template.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      templates,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error("Error in /api/templates GET:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch templates", templates: [] },
      { status: 500 }
    );
  }
}
