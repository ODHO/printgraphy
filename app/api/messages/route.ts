import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { addMessage, prepareMessage, readThread } from "@/lib/messaging";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  await dbConnect();
  const messages = await readThread("user", session.userId, "user");
  return NextResponse.json({ success: true, messages });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  await dbConnect();
  const body = await req.json();
  const cleaned = prepareMessage(body.body, body.attachmentUrl, body.attachmentName);
  if ("error" in cleaned) return NextResponse.json({ success: false, message: cleaned.error }, { status: 400 });
  const message = await addMessage("user", session.userId, "user", cleaned.text, cleaned.attachment);
  return NextResponse.json({ success: true, message });
}
