import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Message from "@/models/Message";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ success: true, total: 0 });
  await dbConnect();
  const total = await Message.countDocuments({
    partyType: "user",
    partyId: session.userId,
    senderRole: "admin",
    readAt: null,
  });
  return NextResponse.json({ success: true, total });
}
