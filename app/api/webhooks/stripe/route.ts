import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import stripe from "@/lib/stripe";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";

// POST /api/webhooks/stripe — handle Stripe events
export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not set." }, { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature error:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  await dbConnect();

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      await Order.findOneAndUpdate(
        { paymentIntentId: pi.id },
        { paymentStatus: "paid", paidAt: new Date() }
      );
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      await Order.findOneAndUpdate(
        { paymentIntentId: pi.id },
        { paymentStatus: "failed" }
      );
      break;
    }

    case "payment_intent.canceled": {
      const pi = event.data.object;
      await Order.findOneAndUpdate(
        { paymentIntentId: pi.id },
        { paymentStatus: "failed", fulfillmentStatus: "cancelled" }
      );
      break;
    }

    default:
      // Ignore other events
      break;
  }

  return NextResponse.json({ received: true });
}
