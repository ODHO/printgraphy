import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Cart from "@/models/Cart";
import { getSession } from "@/lib/session";
import stripe, { calculateShipping } from "@/lib/stripe";
import { Types } from "mongoose";

// POST /api/checkout/session — create Stripe Payment Intent or fallback session
export async function POST(req: NextRequest) {
  await dbConnect();

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
    return NextResponse.json({ success: false, message: "No active cart session found." }, { status: 400 });
  }

  const cartQuery = queryConditions.length > 1 ? { $or: queryConditions } : queryConditions[0];

  const cart = await Cart.findOne(cartQuery).lean();
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return NextResponse.json({ success: false, message: "Your cart is empty." }, { status: 400 });
  }

  // Calculate totals
  const subtotal = cart.items.reduce(
    (sum: number, item: { price: number; quantity: number }) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );
  const shippingCost = calculateShipping(subtotal);
  const totalAmount = subtotal + shippingCost;

  // Try creating Stripe Payment Intent
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.max(50, Math.round(totalAmount * 100)), // cents (min 50 cents)
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: userId ? String(userId) : "",
        sessionId: sessionId ?? "",
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      isMock: false,
      subtotal,
      shippingCost,
      totalAmount,
    });
  } catch (stripeError) {
    console.warn("Stripe Payment Intent error fallback to test mode:", stripeError);
    const mockId = `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return NextResponse.json({
      success: true,
      clientSecret: `${mockId}_secret_test`,
      paymentIntentId: mockId,
      isMock: true,
      subtotal,
      shippingCost,
      totalAmount,
    });
  }
}
