import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Cart, { ICartItem } from "@/models/Cart";
import { getSession } from "@/lib/session";
import { Types } from "mongoose";

async function resolveCart(req: NextRequest) {
  const session = await getSession();
  const userId = session?.userId ? new Types.ObjectId(String(session.userId)) : null;
  const sessionId = req.cookies.get("cart_session")?.value;
  return userId ? { userId } : sessionId ? { sessionId } : null;
}

// PUT /api/cart/items/[itemId] — update quantity
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  await dbConnect();
  const { itemId } = await params;
  const { quantity } = await req.json();

  const query = await resolveCart(req);
  if (!query) return NextResponse.json({ success: false, message: "No cart found." }, { status: 404 });

  const cart = await Cart.findOne(query);
  if (!cart) return NextResponse.json({ success: false, message: "Cart not found." }, { status: 404 });

  const index = cart.items.findIndex((item: ICartItem) => item._id?.toString() === itemId);
  if (index === -1) return NextResponse.json({ success: false, message: "Item not found." }, { status: 404 });

  if (quantity <= 0) {
    cart.items.splice(index, 1);
  } else {
    cart.items[index].quantity = quantity;
  }

  await cart.save();
  return NextResponse.json({ success: true, cart });
}

// DELETE /api/cart/items/[itemId] — remove item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  await dbConnect();
  const { itemId } = await params;

  const query = await resolveCart(req);
  if (!query) return NextResponse.json({ success: false }, { status: 404 });

  const cart = await Cart.findOne(query);
  if (!cart) return NextResponse.json({ success: false }, { status: 404 });

  cart.items = cart.items.filter((item: ICartItem) => item._id?.toString() !== itemId);
  await cart.save();
  return NextResponse.json({ success: true, cart });
}
