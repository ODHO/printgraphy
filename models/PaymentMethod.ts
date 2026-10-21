import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPaymentMethod extends Document {
  userId: Types.ObjectId;
  cardholderName: string;
  cardType: "visa" | "mastercard" | "amex" | "discover" | "other";
  last4: string;
  expMonth: string;
  expYear: string;
  isDefault: boolean;
  cardColor?: string;
  billingZip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cardholderName: { type: String, required: true, trim: true },
    cardType: {
      type: String,
      enum: ["visa", "mastercard", "amex", "discover", "other"],
      default: "visa",
    },
    last4: { type: String, required: true, trim: true },
    expMonth: { type: String, required: true, trim: true },
    expYear: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    cardColor: { type: String, default: "#1E293B" },
    billingZip: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

const PaymentMethod: Model<IPaymentMethod> =
  (mongoose.models.PaymentMethod as Model<IPaymentMethod>) ||
  mongoose.model<IPaymentMethod>("PaymentMethod", PaymentMethodSchema);

export default PaymentMethod;
