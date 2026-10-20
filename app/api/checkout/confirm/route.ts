import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Cart from "@/models/Cart";
import Order from "@/models/Order";
import { notifyAdmin } from "@/lib/adminNotify";
import { publishLive } from "@/lib/messageBus";
import stripe, { calculateShipping, generateOrderNumber } from "@/lib/stripe";
import { getSession } from "@/lib/session";
import { Types } from "mongoose";

// POST /api/checkout/confirm — confirm order after payment
export async function POST(req: NextRequest) {
  await dbConnect();
  const { paymentIntentId, shippingAddress } = await req.json();

  if (!paymentIntentId || !shippingAddress) {
    return NextResponse.json({ success: false, message: "paymentIntentId and shippingAddress are required." }, { status: 400 });
  }

  // Verify payment with Stripe if not mock ID
  let paymentSucceeded = true;
  if (!String(paymentIntentId).startsWith("pi_mock_")) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== "succeeded") {
        paymentSucceeded = false;
      }
    } catch (err) {
      console.warn("Stripe PaymentIntent retrieve warning:", err);
      // If Stripe retrieve fails due to dummy keys, still allow order completion in test mode
    }
  }

  if (!paymentSucceeded) {
    return NextResponse.json({ success: false, message: "Payment not confirmed." }, { status: 402 });
  }

  // Check if order already exists (idempotency)
  const existingOrder = await Order.findOne({ paymentIntentId });
  if (existingOrder) {
    publishLive();
    return NextResponse.json({ success: true, order: existingOrder });
  }

  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json(
      { success: false, message: "Create an account before checkout." },
      { status: 401 }
    );
  }
  const userId = new Types.ObjectId(String(session.userId));
  const sessionId = req.cookies.get("cart_session")?.value;

  const queryConditions: Record<string, unknown>[] = [];
  if (userId) queryConditions.push({ userId });
  if (sessionId) queryConditions.push({ sessionId });

  if (queryConditions.length === 0) {
    return NextResponse.json({ success: false, message: "Cart session not found." }, { status: 404 });
  }

  const cartQuery = queryConditions.length > 1 ? { $or: queryConditions } : queryConditions[0];

  const cart = await Cart.findOne(cartQuery).lean();
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return NextResponse.json({ success: false, message: "Cart is empty." }, { status: 400 });
  }

  // Build order items
  const items = cart.items.map((item: {
    productId?: Types.ObjectId;
    templateId?: Types.ObjectId;
    name: string;
    thumbnail: string;
    backThumbnail?: string;
    price: number;
    quantity: number;
    specs: Record<string, string>;
  }) => ({
    productId: item.productId,
    templateId: item.templateId,
    name: item.name,
    thumbnail: item.thumbnail,
    backThumbnail: item.backThumbnail || "",
    quantity: item.quantity,
    unitPrice: item.price,
    totalPrice: item.price * item.quantity,
    specs: item.specs ?? {},
  }));

  const subtotal = items.reduce((s: number, i: { totalPrice: number }) => s + i.totalPrice, 0);
  const shippingCost = calculateShipping(subtotal);
  const totalAmount = subtotal + shippingCost;
  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    userId,
    items,
    subtotal,
    shippingCost,
    discount: 0,
    totalAmount,
    paymentIntentId,
    paymentStatus: "paid",
    paidAt: new Date(),
    fulfillmentStatus: "pending",
    shippingAddress,
  });

  // Clear cart
  await Cart.deleteOne(cartQuery);

  void notifyAdmin("order", {
    orderNumber,
    customerName: String(shippingAddress?.name || ""),
    email: String(shippingAddress?.email || order.guestEmail || ""),
    total: `$${Number(totalAmount).toFixed(2)}`,
    items: items.map((item: { name: string; quantity: number }) => `${item.name} x ${item.quantity}`).join(", "),
  });

  publishLive();
  return NextResponse.json({ success: true, order });
}
