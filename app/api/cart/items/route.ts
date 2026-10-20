import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Cart from "@/models/Cart";
import { getSession } from "@/lib/session";
import { Types } from "mongoose";

async function resolveCart(req: NextRequest) {
  const session = await getSession();
  const userId = session?.userId ? new Types.ObjectId(String(session.userId)) : null;
  const sessionId = req.cookies.get("cart_session")?.value;

  const query = userId ? { userId } : sessionId ? { sessionId } : null;
  return { query, userId, sessionId };
}

// POST /api/cart/items — add item to cart
export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  const { productId, templateId, name, thumbnail, backThumbnail, price, quantity = 1, specs = {} } = body;

  if (!name || price === undefined || price === null || Number.isNaN(Number(price))) {
    return NextResponse.json({ success: false, message: "name and price are required." }, { status: 400 });
  }

  const { query, userId, sessionId } = await resolveCart(req);

  let guestSessionId = sessionId;
  const headers = new Headers();

  // Create guest session id if needed
  if (!userId && !sessionId) {
    guestSessionId = crypto.randomUUID();
    headers.append("Set-Cookie", `cart_session=${guestSessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
  }

  const cartQuery = userId ? { userId } : { sessionId: guestSessionId };

  // Upsert cart
  let cart = await Cart.findOne(cartQuery);
  if (!cart) {
    cart = new Cart({ ...cartQuery, items: [] });
  }

  // Same catalog item only merges when specs match (apparel designs stay separate)
  const existingIdx = cart.items.findIndex(
    (i: { productId?: Types.ObjectId; templateId?: Types.ObjectId; specs?: Record<string, unknown> }) => {
      const sameProduct = Boolean(productId) && String(i.productId) === String(productId);
      const sameTemplate = Boolean(templateId) && String(i.templateId) === String(templateId);
      if (!sameProduct && !sameTemplate) return false;
      return JSON.stringify(i.specs || {}) === JSON.stringify(specs || {});
    }
  );

  if (existingIdx >= 0) {
    cart.items[existingIdx].quantity += quantity;
    if (thumbnail) cart.items[existingIdx].thumbnail = thumbnail;
    if (backThumbnail) cart.items[existingIdx].backThumbnail = backThumbnail;
  } else {
    cart.items.push({
      ...(productId && { productId: new Types.ObjectId(productId) }),
      ...(templateId && { templateId: new Types.ObjectId(templateId) }),
      name,
      thumbnail: thumbnail ?? "",
      backThumbnail: backThumbnail ?? "",
      price,
      quantity,
      specs,
    });
  }

  await cart.save();

  return NextResponse.json({ success: true, cart }, { headers });
}
