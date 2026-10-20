import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { isErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { addMessage, listConversations, listPeople, partyExists, prepareMessage, readThread, unreadCount } from "@/lib/messaging";
import type { MessageParty } from "@/models/Message";

function partyFrom(value: string | null): MessageParty | null {
  return value === "user" || value === "vendor" ? value : null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  await dbConnect();

  const party = partyFrom(req.nextUrl.searchParams.get("party"));
  if (!party) return NextResponse.json({ success: false, message: "Choose users or vendors." }, { status: 400 });

  const withId = req.nextUrl.searchParams.get("with") || "";

  if (withId) {
    if (!(await partyExists(party, withId))) {
      return NextResponse.json({ success: false, message: "That conversation was not found." }, { status: 404 });
    }
    const messages = await readThread(party, withId, "admin");
    const [userUnread, vendorUnread] = await Promise.all([unreadCount("user"), unreadCount("vendor")]);
    return NextResponse.json({ success: true, messages, userUnread, vendorUnread });
  }

  const [userUnread, vendorUnread] = await Promise.all([unreadCount("user"), unreadCount("vendor")]);

  const [conversations, people] = await Promise.all([listConversations(party), listPeople(party)]);
  return NextResponse.json({ success: true, conversations, people, userUnread, vendorUnread });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  await dbConnect();

  const body = await req.json();
  const party = partyFrom(typeof body.party === "string" ? body.party : null);
  const withId = typeof body.with === "string" ? body.with : "";
  const cleaned = prepareMessage(body.body, body.attachmentUrl, body.attachmentName);
  if (!party || !withId) return NextResponse.json({ success: false, message: "Choose who to message." }, { status: 400 });
  if ("error" in cleaned) return NextResponse.json({ success: false, message: cleaned.error }, { status: 400 });
  if (!(await partyExists(party, withId))) {
    return NextResponse.json({ success: false, message: "That person was not found." }, { status: 404 });
  }

  const message = await addMessage(party, withId, "admin", cleaned.text, cleaned.attachment);
  return NextResponse.json({ success: true, message });
}
