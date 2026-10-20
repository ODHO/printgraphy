import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { isVendorError, requireVendor } from "@/lib/vendorAuth";

function categoryPrice(price?: number) {
  return typeof price === "number" ? price : 0.15;
}

export async function GET() {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;

  const allCategories = await Category.find({ isActive: { $ne: false } })
    .sort({ sortOrder: 1, name: 1 })
    .select("name slug price")
    .lean();

  const assigned = (vendor.categoriesFulfilled || []).map((name) => name.trim().toLowerCase()).filter(Boolean);
  const matched = assigned.length
    ? allCategories.filter((category) => assigned.some((name) => category.name.toLowerCase().includes(name) || name.includes(category.name.toLowerCase())))
    : allCategories;
  const categories = (matched.length ? matched : allCategories).map((category) => ({
    _id: category._id,
    name: category.name,
    price: categoryPrice(category.price),
  }));

  const vendorProducts = await VendorProduct.find({ vendorId: vendor._id }).lean();
  const ids = vendorProducts.map((entry) => entry.productId);
  const [categoryDocs, productDocs] = await Promise.all([
    Category.find({ _id: { $in: ids } }).select("name price").lean(),
    Product.find({ _id: { $in: ids } }).select("name price").lean(),
  ]);
  const names = new Map<string, { name: string; price: number }>();
  categoryDocs.forEach((category) => names.set(String(category._id), { name: category.name, price: categoryPrice(category.price) }));
  productDocs.forEach((product) => names.set(String(product._id), { name: product.name, price: product.price }));

  return NextResponse.json({
    success: true,
    categories,
    vendorProducts: vendorProducts.map((entry) => ({
      ...entry,
      name: names.get(String(entry.productId))?.name || "Category",
      customerPrice: names.get(String(entry.productId))?.price || 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;

  const body = await req.json();
  const categoryId = body.categoryId || body.productId;
  if (!categoryId || body.vendorCost === undefined) {
    return NextResponse.json({ success: false, message: "Choose a category and enter a cost." }, { status: 400 });
  }

  const category = await Category.findById(categoryId).lean();
  const product = category ? null : await Product.findById(categoryId).lean();
  if (!category && !product) {
    return NextResponse.json({ success: false, message: "Category not found." }, { status: 404 });
  }

  const customerPrice = category ? categoryPrice(category.price) : product!.price;
  const benchmarkMin = Number((customerPrice * 0.4).toFixed(2));
  const benchmarkMax = Number((customerPrice * 0.6).toFixed(2));
  const isEligible = Number(body.vendorCost) <= customerPrice * 0.75;

  const vendorProduct = await VendorProduct.findOneAndUpdate(
    { vendorId: vendor._id, productId: categoryId },
    {
      vendorCost: Number(body.vendorCost),
      categoryBenchmarkMin: benchmarkMin,
      categoryBenchmarkMax: benchmarkMax,
      isEligible,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({
    success: true,
    vendorProduct,
    marginNotice: isEligible
      ? "Cost saved. You are eligible to fulfill this category."
      : "Cost is above the margin limit, so this category will not be offered to you.",
  });
}
