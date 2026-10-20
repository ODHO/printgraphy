import Cart from "@/models/Cart";
import Design from "@/models/Design";
import { Types } from "mongoose";

/** Attach a guest's saved designs and cart to the account they just signed in with. */
export async function claimGuestWork(userId: string, guestSessionId?: string | null) {
  if (!guestSessionId) return;
  const owner = new Types.ObjectId(userId);

  await Design.updateMany(
    { guestSessionId, $or: [{ userId: null }, { userId: { $exists: false } }] },
    { $set: { userId: owner }, $unset: { guestSessionId: 1 } }
  );

  const guestCart = await Cart.findOne({
    sessionId: guestSessionId,
    $or: [{ userId: null }, { userId: { $exists: false } }],
  });
  if (!guestCart || guestCart.items.length === 0) return;

  const userCart = await Cart.findOne({ userId: owner });
  if (userCart) {
    userCart.items.push(...guestCart.items);
    await userCart.save();
    await guestCart.deleteOne();
    return;
  }

  await Cart.updateOne({ _id: guestCart._id }, { $set: { userId: owner }, $unset: { sessionId: 1 } });
}
