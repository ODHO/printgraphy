import Order from "@/models/Order";
import Vendor, { type IVendor } from "@/models/Vendor";

function money(value: number) {
  return Number(value.toFixed(2));
}

export function orderMoneySplit(order: {
  totalAmount?: number;
  vendorPayment?: number;
  payoutAmount?: number;
  reprint?: { flagged?: boolean; amount?: number } | null;
}) {
  const customerPaid = money(Number(order.totalAmount || 0));
  const vendorPayment = money(Number(order.vendorPayment || order.payoutAmount || 0));
  const reprint = order.reprint?.flagged ? money(Number(order.reprint.amount || 0)) : 0;
  const vendorNet = money(vendorPayment - reprint);
  const adminKeeps = money(customerPaid - vendorNet);
  return { customerPaid, vendorPayment, reprint, vendorNet, adminKeeps };
}

export async function vendorWallet(vendor: IVendor) {
  const orders = await Order.find({ vendorId: vendor._id })
    .select("orderNumber vendorPayment payoutAmount payoutReleasedAt fulfillmentStatus reprint")
    .lean();

  const credits = orders
    .filter((order) => order.payoutReleasedAt)
    .map((order) => ({
      type: "credit" as const,
      amount: Number(order.vendorPayment || order.payoutAmount || 0),
      orderNumber: order.orderNumber,
      note: `Payment from ${order.orderNumber}`,
      createdAt: order.payoutReleasedAt as Date,
    }));

  const reprints = orders
    .filter((order) => order.reprint?.flagged && Number(order.reprint.amount) > 0)
    .map((order) => ({
      type: "reprint" as const,
      amount: Number(order.reprint?.amount || 0),
      orderNumber: order.orderNumber,
      note: `Fault reprint on ${order.orderNumber}`,
      createdAt: order.reprint?.createdAt || order.payoutReleasedAt || new Date(),
    }));

  const reprintOrders = new Set(reprints.map((entry) => entry.orderNumber));
  const ledger = (vendor.wallet || [])
    .filter((entry) => entry.type === "withdrawal" || (entry.type === "debit" && !reprintOrders.has(entry.orderNumber)))
    .map((entry) => ({
      type: entry.type,
      amount: entry.amount,
      orderNumber: entry.orderNumber,
      note: entry.note,
      transferId: entry.transferId,
      createdAt: entry.createdAt,
    }));

  const withdrawn = money(ledger.filter((entry) => entry.type === "withdrawal").reduce((sum, entry) => sum + entry.amount, 0));
  const extraDebits = money(ledger.filter((entry) => entry.type === "debit").reduce((sum, entry) => sum + entry.amount, 0));
  const releasedNumbers = new Set(orders.filter((order) => order.payoutReleasedAt).map((order) => order.orderNumber));
  const reprintTotal = money(reprints.filter((entry) => releasedNumbers.has(entry.orderNumber)).reduce((sum, entry) => sum + entry.amount, 0));
  const credited = money(credits.reduce((sum, entry) => sum + entry.amount, 0));
  const pending = money(orders
    .filter((order) => !order.payoutReleasedAt && order.fulfillmentStatus !== "cancelled")
    .reduce((sum, order) => sum + Math.max(0, Number(order.vendorPayment || 0) - (order.reprint?.flagged ? Number(order.reprint.amount || 0) : 0)), 0));

  return {
    available: money(credited - reprintTotal - withdrawn - extraDebits),
    pending,
    withdrawn,
    credited,
    reprintTotal,
    entries: [...credits, ...reprints, ...ledger].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}

export async function syncVendorBalance(vendor: IVendor) {
  const summary = await vendorWallet(vendor);
  vendor.earnedBalance = summary.available;
  await vendor.save();
  return summary;
}
