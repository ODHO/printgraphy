import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Homepage from "@/models/Homepage";
import { mergeHomepage } from "@/lib/homepageContent";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";

export async function GET() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const doc = await Homepage.findOne({ key: "home" }).lean();
  return NextResponse.json({ success: true, content: mergeHomepage(doc?.content) });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const body = await req.json();
  const content = mergeHomepage(body.content || body);
  const doc = await Homepage.findOneAndUpdate(
    { key: "home" },
    { key: "home", content },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ success: true, content: mergeHomepage(doc?.content) });
}
