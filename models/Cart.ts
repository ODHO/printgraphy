import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICartItem {
  _id?: Types.ObjectId;
  productId?: Types.ObjectId;
  templateId?: Types.ObjectId;
  name: string;
  thumbnail: string;
  backThumbnail?: string;
  price: number;
  quantity: number;
  specs: Record<string, string>; // e.g. { thickness: "Standard", corners: "Rounded" }
}

export interface ICart extends Document {
  userId?: Types.ObjectId;   // null for guest carts
  sessionId?: string;        // guest cart identifier
  items: ICartItem[];
  couponCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId:  { type: Schema.Types.ObjectId, ref: "Product",  required: false },
    templateId: { type: Schema.Types.ObjectId, ref: "Template", required: false },
    name:       { type: String, required: true },
    thumbnail:  { type: String, default: "" },
    backThumbnail: { type: String, default: "" },
    price:      { type: Number, required: true, min: 0 },
    quantity:   { type: Number, required: true, min: 1, default: 1 },
    specs:      { type: Map, of: String, default: {} },
  },
  { _id: true }
);

const CartSchema = new Schema<ICart>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User",  required: false, index: true },
    sessionId:  { type: String, required: false, index: true },
    items:      { type: [CartItemSchema], default: [] },
    couponCode: { type: String, required: false },
  },
  { timestamps: true }
);

// Ensure each cart is unique per user / session
CartSchema.index({ userId: 1 }, { sparse: true });
CartSchema.index({ sessionId: 1 }, { sparse: true });

if (mongoose.models.Cart && !mongoose.models.Cart.schema.path("items.backThumbnail")) {
  mongoose.deleteModel("Cart");
}

const Cart: Model<ICart> =
  (mongoose.models.Cart as Model<ICart>) ||
  mongoose.model<ICart>("Cart", CartSchema);

export default Cart;
