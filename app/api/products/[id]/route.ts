import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Review from "@/models/Review";
import mongoose from "mongoose";
import { catalogImageFor } from "@/lib/catalogImages";

async function getReviewStats(targetId: string | mongoose.Types.ObjectId) {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(targetId.toString());
    const query = isObjectId
      ? { $or: [{ productId: new mongoose.Types.ObjectId(targetId.toString()) }, { productId: targetId.toString() }], isApproved: true }
      : { productId: targetId.toString(), isApproved: true };

    const reviews = await Review.find(query).lean();
    const count = reviews.length;
    const rating = count > 0 ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1)) : 0;
    return { rating, reviewCount: count };
  } catch {
    return { rating: 0, reviewCount: 0 };
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await dbConnect();

  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    // 1. Try finding Product by ID or Slug
    let product: any = null;
    if (isObjectId) {
      product = await Product.findById(id).populate("categoryId").lean();
    }
    if (!product) {
      product = await Product.findOne({ slug: id }).populate("categoryId").lean();
    }

    if (product && product.isActive) {
      // If product variations is empty, inherit from category variations
      const categoryObj: any = product.categoryId;
      const themedImage = catalogImageFor(product.name, product.slug, categoryObj?.name);
      const variations =
        product.variations && product.variations.length > 0
          ? product.variations
          : categoryObj?.variations || [];

      const galleryImages = [themedImage];

      const reviewStats = await getReviewStats(product._id);

      return NextResponse.json({
        success: true,
        product: {
          ...product,
          image: themedImage,
          rating: reviewStats.reviewCount > 0 ? reviewStats.rating : (product.rating || 0),
          reviewCount: reviewStats.reviewCount > 0 ? reviewStats.reviewCount : (product.reviewCount || 0),
          variations,
          galleryImages,
        },
      });
    }

    // 2. If no product, try finding Category by ID, Slug, or Name
    let category: any = null;
    if (isObjectId) {
      category = await Category.findById(id).lean();
    }
    if (!category) {
      const decodedId = decodeURIComponent(id).trim();
      const namePattern = decodedId.replace(/-/g, " ");
      category = await Category.findOne({
        $or: [
          { slug: id },
          { slug: decodedId },
          { name: { $regex: new RegExp(`^${namePattern}$`, "i") } },
          { name: { $regex: new RegExp(namePattern.replace(/ /g, ".*"), "i") } },
        ],
      }).lean();
    }

    if (category && category.isActive !== false) {
      const themedImage = catalogImageFor(category.name, category.slug);
      const galleryImages = [themedImage];

      const reviewStats = await getReviewStats(category._id);
      const slugReviewStats = category.slug ? await getReviewStats(category.slug) : { rating: 0, reviewCount: 0 };
      const finalCount = reviewStats.reviewCount || slugReviewStats.reviewCount;
      const finalRating = reviewStats.reviewCount ? reviewStats.rating : slugReviewStats.rating;

      return NextResponse.json({
        success: true,
        product: {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description || "Empowering your brand with high-quality printing solutions. Easily create cards you can't wait to hand out.",
          price: typeof category.price === "number" ? category.price : 0.15,
          unitPrice: category.unitPrice || `$${(category.price || 0.15).toFixed(2)} each`,
          image: themedImage,
          galleryImages,
          rating: finalRating,
          reviewCount: finalCount,
          isActive: true,
          variations: category.variations || [],
          featureStory: category.featureStory || {},
        },
      });
    }

    // 3. Fallback product for un-seeded category links
    const formattedTitle = decodeURIComponent(id)
      .replace(/-/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const reviewStats = await getReviewStats(id);

    return NextResponse.json({
      success: true,
      product: {
        _id: id,
        name: formattedTitle || "Custom Business Cards",
        slug: id,
        description: "Empowering your brand with high-quality printing solutions. Easily create cards you can't wait to hand out.",
        price: 0.15,
        unitPrice: "$0.15 Each / 100 Units",
        image: catalogImageFor(formattedTitle, id),
        galleryImages: [catalogImageFor(formattedTitle, id)],
        rating: reviewStats.rating,
        reviewCount: reviewStats.reviewCount,
        isActive: true,
        variations: [
          {
            name: "Paper Stock",
            required: true,
            values: [
              { name: "Standard (14pt)", price: 0, description: "Classic smooth finish" },
              { name: "Premium (16pt)", price: 0.05, description: "Extra sturdy stock" },
            ],
          },
          {
            name: "Corners",
            required: false,
            values: [
              { name: "Standard Corners", price: 0, description: "Traditional square corners" },
              { name: "Rounded Corners", price: 0.02, description: "Smooth rounded edges" },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error("[GET /api/products/[id]] Error:", error);
    return NextResponse.json({ success: false, message: "Invalid product or category ID." }, { status: 400 });
  }
}
