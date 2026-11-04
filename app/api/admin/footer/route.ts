import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import FooterSettings from "@/models/FooterSettings";
import { mergeFooterContent } from "@/lib/footerContent";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";

export async function GET() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const doc = await FooterSettings.findOne({ key: "footer" }).lean();
  return NextResponse.json({ success: true, content: mergeFooterContent(doc?.content) });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const body = await req.json();
  const content = mergeFooterContent(body.content || body);

  const doc = await FooterSettings.findOneAndUpdate(
    { key: "footer" },
    { key: "footer", content },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ success: true, content: mergeFooterContent(doc?.content) });
}
