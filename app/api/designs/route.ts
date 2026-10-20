import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Design from "@/models/Design";
import { getSession } from "@/lib/session";

const GUEST_COOKIE = "cart_session";
const GUEST_MAX_AGE = 60 * 60 * 24 * 30;

function guestCookie(id: string) {
  return `${GUEST_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${GUEST_MAX_AGE}`;
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const session = await getSession();
  const guestSessionId = req.cookies.get(GUEST_COOKIE)?.value;

  const ors: Record<string, any>[] = [];
  if (session?.userId) ors.push({ userId: session.userId });
  if (guestSessionId) ors.push({ guestSessionId });

  if (ors.length === 0) {
    return NextResponse.json({ success: true, designs: [] });
  }

  const designs = await Design.find({ $or: ors }).sort({ updatedAt: -1 }).lean();
  return NextResponse.json({ success: true, designs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  await dbConnect();
  const body = await req.json();
  const { name, thumbnail, designData, templateId } = body;

  if (!designData) {
    return NextResponse.json({ success: false, message: "Design data is required." }, { status: 400 });
  }

  if (session?.userId) {
    const design = await Design.create({
      userId: session.userId,
      name: name || "My Saved Card Design",
      thumbnail,
      designData,
      templateId,
    });
    return NextResponse.json({ success: true, design }, { status: 201 });
  }

  let guestSessionId = req.cookies.get(GUEST_COOKIE)?.value;
  let createdCookie = false;
  if (!guestSessionId) {
    guestSessionId = crypto.randomUUID();
    createdCookie = true;
  }

  const design = await Design.create({
    guestSessionId,
    name: name || "My Saved Card Design",
    thumbnail,
    designData,
    templateId,
  });

  const response = NextResponse.json({ success: true, guest: true, design }, { status: 201 });
  if (createdCookie) response.headers.append("Set-Cookie", guestCookie(guestSessionId));
  return response;
}
