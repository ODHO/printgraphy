import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IVendorProduct extends Document {
  vendorId: Types.ObjectId;
  productId: Types.ObjectId;
  vendorCost: number;          // Vendor's entered cost for this product
  categoryBenchmarkMin: number; // Low benchmark reference
  categoryBenchmarkMax: number; // High benchmark reference
  isEligible: boolean;         // Automatic margin math gate
  createdAt: Date;
  updatedAt: Date;
}

const VendorProductSchema = new Schema<IVendorProduct>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    vendorCost: { type: Number, required: true, min: 0 },
    categoryBenchmarkMin: { type: Number, default: 0 },
    categoryBenchmarkMax: { type: Number, default: 0 },
    isEligible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

VendorProductSchema.index({ vendorId: 1, productId: 1 }, { unique: true });

const VendorProduct: Model<IVendorProduct> =
  (mongoose.models.VendorProduct as Model<IVendorProduct>) ||
  mongoose.model<IVendorProduct>("VendorProduct", VendorProductSchema);

export default VendorProduct;
