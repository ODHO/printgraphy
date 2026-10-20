import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import User from "@/models/User";

// PUT /api/admin/users/[id] — toggle isAdmin, role, etc.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const { id } = await params;

  // Prevent admins from removing their own admin access
  if (id === auth.userId) {
    return NextResponse.json(
      { success: false, message: "Cannot modify your own admin status." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();

    // Only allow safe fields to be updated
    const allowedFields = ["isAdmin", "role", "isVerified"];
    const update: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) update[field] = body[field];
    }

    // Keep isAdmin and role in sync
    if ("isAdmin" in update) {
      update.role = update.isAdmin ? "admin" : "customer";
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true })
      .select("-passwordHash")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error("[Admin/Users PUT]", err);
    return NextResponse.json(
      { success: false, message: "Failed to update user." },
      { status: 500 }
    );
  }
}
