import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Template from "@/models/Template";
import stripe from "@/lib/stripe";
import { getSession } from "@/lib/session";

// POST /api/templates/[id]/payment-intent — create Stripe Payment Intent for paid template
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const session = await getSession();
    if (!session || !session.userId || String(session.userId).startsWith("reset:")) {
      return NextResponse.json(
        {
          success: false,
          requireLogin: true,
          message: "Please sign in to purchase this template.",
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const template = await Template.findOne({ _id: id, isActive: true }).lean();

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Template not found." },
        { status: 404 }
      );
    }

    const price = Number(template.price) || 0;
    const amountInCents = Math.max(50, Math.round(price * 100)); // minimum 50 cents for Stripe

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: "template_license",
        templateId: String(template._id),
        templateTitle: template.title,
        userId: String(session.userId),
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: price,
    });
  } catch (err: any) {
    console.error("Failed to create template payment intent:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to initialize Stripe payment.",
      },
      { status: 500 }
    );
  }
}
