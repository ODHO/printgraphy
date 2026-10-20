import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Template from "@/models/Template";
import User from "@/models/User";
import { getSession } from "@/lib/session";

// GET /api/templates/[id] — full template data (for editor) with unlock status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const { id } = await params;
  const template = await Template.findOne({ _id: id, isActive: true }).lean();

  if (!template) {
    return NextResponse.json(
      { success: false, message: "Template not found." },
      { status: 404 }
    );
  }

  const session = await getSession();
  let isUnlocked = !template.isPaid || (template.price || 0) === 0;

  if (!isUnlocked && session?.userId) {
    const user = await User.findById(session.userId).select("purchasedTemplates").lean();
    if (user?.purchasedTemplates?.some((tId: any) => String(tId) === String(id))) {
      isUnlocked = true;
    }
  }

  return NextResponse.json({
    success: true,
    template,
    isUnlocked,
    userId: session?.userId ? String(session.userId) : null,
  });
}
