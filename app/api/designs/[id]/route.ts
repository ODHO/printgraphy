import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Design from "@/models/Design";
import { getSession } from "@/lib/session";

const GUEST_COOKIE = "cart_session";

async function findOwnedDesign(req: NextRequest, id: string) {
  const session = await getSession();
  const guestSessionId = req.cookies.get(GUEST_COOKIE)?.value;
  const ors: Record<string, string>[] = [];
  if (session?.userId) ors.push({ userId: session.userId });
  if (guestSessionId) ors.push({ guestSessionId });
  if (!ors.length) return null;
  return Design.findOne({ _id: id, $or: ors });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await dbConnect();
  const design = await findOwnedDesign(req, id);
  if (!design) {
    return NextResponse.json({ success: false, message: "Design not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true, design });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await dbConnect();
  const body = await req.json();
  const { name, thumbnail, designData } = body;
  const design = await findOwnedDesign(req, id);

  if (!design) {
    return NextResponse.json({ success: false, message: "Design not found." }, { status: 404 });
  }

  if (name) design.name = name;
  if (thumbnail) design.thumbnail = thumbnail;
  if (designData) design.designData = designData;
  await design.save();

  const session = await getSession();
  return NextResponse.json({ success: true, guest: !session?.userId, design });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await dbConnect();
  const design = await findOwnedDesign(req, id);
  if (!design) {
    return NextResponse.json({ success: false, message: "Design not found." }, { status: 404 });
  }
  await design.deleteOne();
  return NextResponse.json({ success: true, message: "Design deleted." });
}
