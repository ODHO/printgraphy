import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Quote from "@/models/Quote";
import { notifyAdmin } from "@/lib/adminNotify";
import { getSession } from "@/lib/session";
import { Types } from "mongoose";

async function generateQuoteReference(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Quote.countDocuments();
  const seq = String(count + 1).padStart(4, "0");
  return `XP-QT-${year}-${seq}`;
}

// POST /api/quotes — Submit a custom quote request
export async function POST(req: NextRequest) {
  await dbConnect();

  const session = await getSession();
  const userId = session?.userId ? new Types.ObjectId(String(session.userId)) : undefined;

  const body = await req.json();
  const { contactName, email, companyName, phone, category, quantity, targetTimeline, description, attachmentUrls } = body;

  if (!contactName || !email || !category || !quantity || !description) {
    return NextResponse.json(
      { success: false, message: "Name, email, category, quantity, and description are required." },
      { status: 400 }
    );
  }

  const referenceNumber = await generateQuoteReference();

  const quote = await Quote.create({
    referenceNumber,
    ...(userId && { userId }),
    contactName,
    email,
    companyName,
    phone,
    category,
    quantity: Number(quantity),
    targetTimeline,
    description,
    attachmentUrls: attachmentUrls || [],
    status: "submitted",
  });

  void notifyAdmin("quote", {
    reference: referenceNumber,
    name: String(contactName),
    email: String(email),
    category: String(category),
    quantity: String(quantity),
    description: String(description),
  });

  return NextResponse.json({ success: true, quote });
}

// GET /api/quotes — Get user's submitted quotes
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  await dbConnect();
  const quotes = await Quote.find({ userId: new Types.ObjectId(String(session.userId)) })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, quotes });
}
