import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import User from "@/models/User";
import Template from "@/models/Template";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Order from "@/models/Order";
import Vendor from "@/models/Vendor";

export async function GET() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

    const [
      totalUsers,
      totalTemplates,
      totalCategories,
      totalProducts,
      totalOrders,
      newOrders,
      cancelledOrders,
      totalVendors,
      earningsAggregate,
      dailyAggregate,
      statusAggregate,
      topProducts,
    ] = await Promise.all([
      User.countDocuments(),
      Template.countDocuments(),
      Category.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({
        $or: [
          { createdAt: { $gte: sevenDaysAgo } },
          { fulfillmentStatus: "pending" },
        ],
      }),
      Order.countDocuments({ fulfillmentStatus: "cancelled" }),
      Vendor.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } },
          },
        },
      ]),
      Order.aggregate([{ $group: { _id: "$fulfillmentStatus", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            revenue: { $sum: "$items.totalPrice" },
            quantity: { $sum: "$items.quantity" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Fill gaps so the chart has one point per day, oldest first.
    const byDay = new Map(dailyAggregate.map((d: { _id: string; orders: number; revenue: number }) => [d._id, d]));
    const daily = Array.from({ length: 30 }, (_, i) => {
      const day = new Date(thirtyDaysAgo);
      day.setUTCDate(day.getUTCDate() + i);
      const key = day.toISOString().slice(0, 10);
      const hit = byDay.get(key);
      return { date: key, orders: hit?.orders ?? 0, revenue: hit?.revenue ?? 0 };
    });

    const ordersByStatus = Object.fromEntries(
      statusAggregate.map((s: { _id: string; count: number }) => [s._id, s.count])
    );

    const earnings = earningsAggregate[0]?.total || 0;

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("firstName lastName email phone")
      .lean();

    const recentVendors = await Vendor.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("name contactName email phone")
      .lean();

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber totalAmount paymentStatus fulfillmentStatus createdAt guestEmail shippingAddress.name")
      .lean();

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalTemplates,
        totalCategories,
        totalProducts,
        totalOrders,
        newOrders,
        cancelledOrders,
        totalVendors,
        earnings,
      },
      recentUsers,
      recentVendors,
      recentOrders,
      daily,
      ordersByStatus,
      topProducts: topProducts.map((p: { _id: string; revenue: number; quantity: number }) => ({
        name: p._id,
        revenue: p.revenue,
        quantity: p.quantity,
      })),
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load dashboard stats" },
      { status: 500 }
    );
  }
}
