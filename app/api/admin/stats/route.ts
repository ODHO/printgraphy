import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import User from "@/models/User";
import Template from "@/models/Template";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Order from "@/models/Order";

export async function GET() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const [totalUsers, totalTemplates, totalCategories, totalProducts, totalOrders] =
    await Promise.all([
      User.countDocuments(),
      Template.countDocuments(),
      Category.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
    ]);

  const [freeTemplates, paidTemplates, activeTemplates] = await Promise.all([
    Template.countDocuments({ isPaid: false }),
    Template.countDocuments({ isPaid: true }),
    Template.countDocuments({ isActive: true }),
  ]);

  const recentTemplates = await Template.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("title category isPaid isActive createdAt")
    .lean();

  return NextResponse.json({
    success: true,
    stats: {
      totalUsers,
      totalTemplates,
      totalCategories,
      totalProducts,
      totalOrders,
      freeTemplates,
      paidTemplates,
      activeTemplates,
    },
    recentTemplates,
  });
}
