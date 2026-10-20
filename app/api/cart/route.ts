import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Cart from "@/models/Cart";
import { getSession } from "@/lib/session";

async function getCartQuery(req: NextRequest) {
  const session = await getSession();
  const userId = session?.userId ? String(session.userId) : null;
  const sessionId = req.cookies.get("cart_session")?.value;

  const conditions: Record<string, unknown>[] = [];
  if (userId) conditions.push({ userId });
  if (sessionId) conditions.push({ sessionId });

  if (conditions.length === 0) return null;
  return conditions.length > 1 ? { $or: conditions } : conditions[0];
}

// GET /api/cart — get current cart
export async function GET(req: NextRequest) {
  await dbConnect();
  const query = await getCartQuery(req);
  if (!query) return NextResponse.json({ success: true, cart: { items: [] } });

  const cart = await Cart.findOne(query).lean();
  return NextResponse.json({ success: true, cart: cart ?? { items: [] } });
}

// DELETE /api/cart — clear cart
export async function DELETE(req: NextRequest) {
  await dbConnect();
  const query = await getCartQuery(req);
  if (!query) return NextResponse.json({ success: true });

  await Cart.deleteOne(query);
  return NextResponse.json({ success: true });
}
