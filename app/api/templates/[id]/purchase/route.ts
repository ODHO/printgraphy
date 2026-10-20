import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Template from "@/models/Template";
import User from "@/models/User";
import Design from "@/models/Design";
import Order from "@/models/Order";
import { notifyAdmin } from "@/lib/adminNotify";
import stripe, { generateOrderNumber } from "@/lib/stripe";
import { getSession } from "@/lib/session";
import { Types } from "mongoose";

// POST /api/templates/[id]/purchase — purchase and unlock a paid template, and save to dashboard
export async function POST(
  req: NextRequest,
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
          message: "Please sign in to your account to purchase and unlock this premium template.",
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

    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    const templateObjectId = new Types.ObjectId(id);
    const alreadyPurchased = (user.purchasedTemplates || []).some(
      (tId: any) => String(tId) === String(id)
    );

    // If already purchased, find existing draft or create one
    if (alreadyPurchased) {
      let existingDesign = await Design.findOne({
        userId: user._id,
        templateId: templateObjectId,
      }).lean();

      if (!existingDesign) {
        existingDesign = await Design.create({
          userId: user._id,
          templateId: templateObjectId,
          name: `${template.title} (Purchased)`,
          thumbnail: template.thumbnail || "",
          designData: {
            cardData: {
              name: `${user.firstName || "Stephen"} ${user.lastName || ""}`.trim(),
              title: "Manager",
              email: user.email,
              phone: "",
              address: "",
              side: "front",
              thickness: "standard",
              texture: "matte",
              corners: "standard",
            },
            textLayers:
              template.templateData?.textLayers && template.templateData.textLayers.length > 0
                ? template.templateData.textLayers
                : [
                    {
                      id: "1",
                      text: `${user.firstName || "Stephen"} ${user.lastName || ""}`.trim(),
                      x: 10,
                      y: 28,
                      fontSize: 24,
                      color: "#ffffff",
                      fontWeight: "bold",
                    },
                  ],
            bgColor: template.templateData?.bgColor || "#18181b",
            canvas_config: template.canvas_config,
            category: template.category,
            front_design: template.front_design,
            back_design: template.back_design,
            isPurchased: true,
            purchasedAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        isUnlocked: true,
        alreadyPurchased: true,
        designId: existingDesign._id,
        message: "Template is already unlocked in your account.",
      });
    }

    const body = await req.json().catch(() => ({}));
    const { paymentIntentId } = body;

    // Verify payment with Stripe if real paymentIntentId is provided
    if (paymentIntentId && !String(paymentIntentId).startsWith("pi_mock_")) {
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.status !== "succeeded") {
          return NextResponse.json(
            { success: false, message: "Payment has not succeeded yet with Stripe." },
            { status: 402 }
          );
        }
      } catch (stripeErr: any) {
        console.warn("Stripe PaymentIntent verify notice:", stripeErr.message);
      }
    }

    // Process payment
    const price = Number(template.price) || 0;
    const orderNumber = await generateOrderNumber();

    // 1. Record template unlock in user's profile
    user.purchasedTemplates = user.purchasedTemplates || [];
    user.purchasedTemplates.push(templateObjectId);
    await user.save();

    // 2. Automatically save the design to the user's dashboard!
    const defaultTextLayers =
      template.templateData?.textLayers && template.templateData.textLayers.length > 0
        ? template.templateData.textLayers
        : [
            {
              id: "1",
              text: `${user.firstName || "Stephen"} ${user.lastName || ""}`.trim(),
              x: 10,
              y: 28,
              fontSize: 24,
              color: "#ffffff",
              fontWeight: "bold",
            },
            {
              id: "2",
              text: "Manager",
              x: 10,
              y: 46,
              fontSize: 13,
              color: "#38bdf8",
              fontWeight: "normal",
            },
          ];

    const savedDesign = await Design.create({
      userId: user._id,
      templateId: templateObjectId,
      name: `${template.title} (Purchased)`,
      thumbnail: template.thumbnail || "",
      designData: {
        cardData: {
          name: `${user.firstName || "Stephen"} ${user.lastName || ""}`.trim(),
          title: "Manager",
          email: user.email,
          phone: "",
          address: "",
          side: "front",
          thickness: "standard",
          texture: "matte",
          corners: "standard",
          quantity: 100,
        },
        textLayers: defaultTextLayers,
        bgColor: template.templateData?.bgColor || "#18181b",
        backBgColor: "#141414",
        textColor: template.templateData?.textColor || "#ffffff",
        canvas_config: template.canvas_config,
        category: template.category,
        front_design: template.front_design,
        back_design: template.back_design,
        isPurchased: true,
        purchasedAt: new Date(),
        purchasePrice: price,
        orderNumber,
      },
    });

    // 3. Create Order record for digital license receipt
    try {
      await Order.create({
        orderNumber,
        userId: user._id,
        items: [
          {
            templateId: templateObjectId,
            name: `Premium Template License: ${template.title}`,
            thumbnail: template.thumbnail || "",
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            specs: {
              type: "Digital Template License",
              category: template.category,
            },
          },
        ],
        subtotal: price,
        shippingCost: 0,
        discount: 0,
        totalAmount: price,
        paymentStatus: "paid",
        paidAt: new Date(),
        fulfillmentStatus: "delivered",
      });
      void notifyAdmin("order", {
        orderNumber,
        customerName: String(user.firstName || user.email || ""),
        email: String(user.email || ""),
        total: `$${Number(price).toFixed(2)}`,
        items: `Premium template: ${template.title}`,
      });
    } catch (orderErr) {
      console.warn("Template purchase order creation notice:", orderErr);
    }

    return NextResponse.json({
      success: true,
      message: `"${template.title}" has been successfully unlocked and saved to your dashboard!`,
      isUnlocked: true,
      designId: savedDesign._id,
      template,
    });
  } catch (err: any) {
    console.error("Template purchase error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to process template purchase.",
      },
      { status: 500 }
    );
  }
}
