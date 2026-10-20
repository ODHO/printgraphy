import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IOrderItem {
  productId?: Types.ObjectId;
  templateId?: Types.ObjectId;
  name: string;
  thumbnail: string;
  backThumbnail?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specs: Record<string, string>;
}

export interface IShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type FulfillmentStatus =
  | "pending"
  | "assigned"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface IOrder extends Document {
  orderNumber: string;
  userId?: Types.ObjectId;
  guestEmail?: string;

  items: IOrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;

  paymentIntentId?: string;
  paymentStatus: PaymentStatus;
  paidAt?: Date;

  fulfillmentStatus: FulfillmentStatus;
  vendorId?: Types.ObjectId;

  shippingAddress: IShippingAddress;
  trackingNumber?: string;
  trackingCarrier?: string;
  shippedAt?: Date;
  deliveredAt?: Date;

  notes?: string;
  couponCode?: string;
  vendorCredited?: boolean;
  payoutQualifiedAt?: Date;
  vendorPayment?: number;
  vendorAgreedAt?: Date;
  payoutAmount?: number;
  payoutReleasedAt?: Date;
  payoutTransferId?: string;
  customerConfirmedAt?: Date;
  deliveryReminderSentAt?: Date;
  assignedAt?: Date;
  productionNotes?: string;
  messages?: { author: string; body: string; createdAt: Date }[];
  reprint?: { flagged: boolean; amount: number; note: string; createdAt: Date };

  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId:  { type: Schema.Types.ObjectId, ref: "Product" },
    templateId: { type: Schema.Types.ObjectId, ref: "Template" },
    name:       { type: String, required: true },
    thumbnail:  { type: String, default: "" },
    backThumbnail: { type: String, default: "" },
    quantity:   { type: Number, required: true, min: 1 },
    unitPrice:  { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    specs:      { type: Map, of: String, default: {} },
  },
  { _id: false }
);

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    name:    { type: String, required: true },
    line1:   { type: String, required: true },
    line2:   { type: String },
    city:    { type: String, required: true },
    state:   { type: String, required: true },
    zip:     { type: String, required: true },
    country: { type: String, required: true, default: "US" },
    phone:   { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId:     { type: Schema.Types.ObjectId, ref: "User", index: true },
    guestEmail: { type: String },

    items:    { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, required: true, default: 0 },
    discount:     { type: Number, default: 0 },
    totalAmount:  { type: Number, required: true },

    paymentIntentId: { type: String, index: true },
    paymentStatus:   {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paidAt: { type: Date },

    fulfillmentStatus: {
      type: String,
      enum: ["pending", "assigned", "in_production", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },

    shippingAddress: { type: ShippingAddressSchema, required: true },
    trackingNumber:  { type: String },
    trackingCarrier: { type: String },
    shippedAt:       { type: Date },
    deliveredAt:     { type: Date },

    notes:      { type: String },
    couponCode: { type: String },
    vendorCredited: { type: Boolean, default: false },
    payoutQualifiedAt: { type: Date },
    vendorPayment: { type: Number, default: 0 },
    vendorAgreedAt: { type: Date },
    payoutAmount: { type: Number, default: 0 },
    payoutReleasedAt: { type: Date },
    payoutTransferId: { type: String, default: "" },
    customerConfirmedAt: { type: Date },
    deliveryReminderSentAt: { type: Date },
    assignedAt: { type: Date },
    productionNotes: { type: String, default: "" },
    messages: {
      type: [
        new Schema(
          {
            author: { type: String, required: true },
            body: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    reprint: {
      type: new Schema(
        {
          flagged: { type: Boolean, default: false },
          amount: { type: Number, default: 0 },
          note: { type: String, default: "" },
          createdAt: { type: Date },
        },
        { _id: false }
      ),
    },
  },
  { timestamps: true }
);

if (
  mongoose.models.Order &&
  (!mongoose.models.Order.schema.path("items.backThumbnail") ||
    !mongoose.models.Order.schema.path("vendorCredited") ||
    !mongoose.models.Order.schema.path("productionNotes") ||
    !mongoose.models.Order.schema.path("customerConfirmedAt") ||
    !mongoose.models.Order.schema.path("payoutAmount") ||
    !mongoose.models.Order.schema.path("vendorPayment"))
) {
  mongoose.deleteModel("Order");
}

const Order: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) ||
  mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
