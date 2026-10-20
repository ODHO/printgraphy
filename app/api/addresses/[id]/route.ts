import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Address from "@/models/Address";
import { getSession } from "@/lib/session";

// PUT /api/addresses/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ success: false }, { status: 401 });

  await dbConnect();
  const { id } = await params;
  const body = await req.json();

  if (body.isDefault) {
    await Address.updateMany({ userId: session.userId }, { isDefault: false });
  }

  const address = await Address.findOneAndUpdate(
    { _id: id, userId: session.userId },
    body,
    { new: true }
  );
  if (!address) return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
  return NextResponse.json({ success: true, address });
}

// DELETE /api/addresses/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ success: false }, { status: 401 });

  await dbConnect();
  const { id } = await params;
  await Address.findOneAndDelete({ _id: id, userId: session.userId });
  return NextResponse.json({ success: true });
}
