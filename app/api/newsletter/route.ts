import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import NewsletterSubscriber from "@/models/NewsletterSubscriber";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 });
    }

    await dbConnect();

    const existing = await NewsletterSubscriber.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json({ success: true, message: "You're already subscribed." });
    }

    await NewsletterSubscriber.create({ email });
    return NextResponse.json({ success: true, message: "Thanks — you're signed up for offers." });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ success: true, message: "You're already subscribed." });
    }
    console.error("newsletter subscribe failed:", error);
    return NextResponse.json({ success: false, message: "Could not subscribe." }, { status: 500 });
  }
}
