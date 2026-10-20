import Order from "@/models/Order";
import Vendor from "@/models/Vendor";
import VendorProduct from "@/models/VendorProduct";
import User from "@/models/User";
import { sendCustomerDeliveryEmail, sendDeliveryReminderEmail } from "@/lib/mailer";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function vendorEarningForOrder(vendorId: string, items: { productId?: { toString(): string } | string; quantity: number }[]) {
  const costs = await VendorProduct.find({ vendorId }).lean();
  const costByProduct = new Map(costs.map((entry) => [String(entry.productId), entry.vendorCost]));
  return Number(items.reduce((sum, item) => {
    const unit = item.productId ? costByProduct.get(String(item.productId)) : undefined;
    return sum + (unit ? unit * item.quantity : 0);
  }, 0).toFixed(2));
}

export async function qualifyOrderForPayout(orderId: string) {
  const order = await Order.findById(orderId);
  if (!order || !order.vendorId) return order;
  const bothConfirmed = order.fulfillmentStatus === "delivered" && Boolean(order.customerConfirmedAt);
  if (!bothConfirmed) return order;
  if (!order.deliveredAt) order.deliveredAt = new Date();
  if (!order.payoutQualifiedAt) order.payoutQualifiedAt = new Date();
  if (!order.payoutAmount) {
    order.payoutAmount = await vendorEarningForOrder(String(order.vendorId), order.items);
  }
  await order.save();
  return order;
}

export async function notifyCustomerOfDelivery(orderId: string, origin: string) {
  const order = await Order.findById(orderId).lean();
  if (!order || order.fulfillmentStatus !== "delivered") return;
  let email = order.guestEmail || "";
  if (order.userId) {
    const user = await User.findById(order.userId).select("email").lean();
    if (user?.email) email = user.email;
  }
  if (!email) return;
  await sendCustomerDeliveryEmail(email, order.orderNumber, `${origin}/dashboard/orders/${order._id}`);
}

export async function remindVendorsToMarkDelivered(origin: string) {
  const cutoff = new Date(Date.now() - DAY_MS);
  const stale = await Order.find({
    fulfillmentStatus: "shipped",
    vendorId: { $exists: true, $ne: null },
    shippedAt: { $lt: cutoff },
    $or: [{ deliveryReminderSentAt: { $exists: false } }, { deliveryReminderSentAt: null }],
  }).limit(20);

  for (const order of stale) {
    const vendor = await Vendor.findById(order.vendorId).select("email name").lean();
    if (vendor?.email) {
      await sendDeliveryReminderEmail(vendor.email, vendor.name, order.orderNumber, `${origin}/vendor/dashboard`);
    }
    order.deliveryReminderSentAt = new Date();
    await order.save();
  }
}
