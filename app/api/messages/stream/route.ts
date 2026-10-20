import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { messageStream } from "@/lib/messageBus";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  const userId = session.userId;
  return messageStream((event) => event.partyType === "user" && event.partyId === userId);
}
