import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type VendorStatus = "active" | "paused" | "deactivated";

export interface IVendorMetrics {
  acceptanceRate: number;      // 0 - 100%
  onTimePercentage: number;    // 0 - 100%
  reprintRate: number;         // 0 - 100%
  avgTurnaroundHours: number;
}

export interface IVendor extends Document {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  marketsCovered: string[];    // Zip codes or city regions
  categoriesFulfilled: string[]; // e.g. ["Business Cards", "Packaging"]
  status: VendorStatus;
  isAvailable: boolean;        // Availability toggle (active vs paused notifications)
  capacityPerWeek: number;
  stripeAccountId?: string;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeAccountEmail?: string;
  accountHolderName?: string;
  earnedBalance: number;
  wallet: { type: "credit" | "withdrawal" | "debit"; amount: number; orderNumber: string; note: string; transferId: string; createdAt: Date }[];
  declinedOrderIds: Types.ObjectId[];
  payouts: { amount: number; note: string; createdAt: Date }[];
  metrics: IVendorMetrics;
  createdAt: Date;
  updatedAt: Date;
}

const VendorMetricsSchema = new Schema<IVendorMetrics>(
  {
    acceptanceRate: { type: Number, default: 100 },
    onTimePercentage: { type: Number, default: 100 },
    reprintRate: { type: Number, default: 0 },
    avgTurnaroundHours: { type: Number, default: 48 },
  },
  { _id: false }
);

const VendorSchema = new Schema<IVendor>(
  {
    name: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    marketsCovered: { type: [String], default: [] },
    categoriesFulfilled: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["active", "paused", "deactivated"],
      default: "active",
    },
    isAvailable: { type: Boolean, default: true },
    capacityPerWeek: { type: Number, default: 500 },
    stripeAccountId: { type: String, default: "" },
    stripePublishableKey: { type: String, default: "" },
    stripeSecretKey: { type: String, default: "", select: false },
    stripeAccountEmail: { type: String, default: "" },
    accountHolderName: { type: String, default: "" },
    earnedBalance: { type: Number, default: 0 },
    wallet: {
      type: [
        new Schema(
          {
            type: { type: String, enum: ["credit", "withdrawal", "debit"], required: true },
            amount: { type: Number, required: true },
            orderNumber: { type: String, default: "" },
            note: { type: String, default: "" },
            transferId: { type: String, default: "" },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    declinedOrderIds: { type: [Schema.Types.ObjectId], default: [] },
    payouts: {
      type: [
        new Schema(
          {
            amount: { type: Number, required: true },
            note: { type: String, default: "" },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    metrics: { type: VendorMetricsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

if (mongoose.models.Vendor && !mongoose.models.Vendor.schema.path("stripeSecretKey")) {
  mongoose.deleteModel("Vendor");
}

const Vendor: Model<IVendor> =
  (mongoose.models.Vendor as Model<IVendor>) ||
  mongoose.model<IVendor>("Vendor", VendorSchema);

export default Vendor;
