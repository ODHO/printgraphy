import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IVariationValue {
  _id?: string;
  name: string;
  image?: string;
  price: number;
  description?: string;
}

export interface IVariation {
  _id?: string;
  name: string;
  required?: boolean;
  values: IVariationValue[];
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  categoryId?: Types.ObjectId;
  price: number;
  unitPrice: string; // e.g., "$0.15 Each / 100 Units"
  image: string;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  tags: string[];
  variations?: IVariation[];
  createdAt: Date;
  updatedAt: Date;
}

const VariationValueSchema = new Schema<IVariationValue>(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true, default: 0, min: 0 },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const VariationSchema = new Schema<IVariation>(
  {
    name: { type: String, required: true, trim: true },
    required: { type: Boolean, default: true },
    values: { type: [VariationValueSchema], default: [] },
  },
  { _id: true }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: false },
    price: { type: Number, required: true, min: 0 },
    unitPrice: { type: String, default: "" },
    image: { type: String, default: "" },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    tags: { type: [String], default: [] },
    variations: { type: [VariationSchema], default: [] },
  },
  { timestamps: true }
);

if (mongoose.models.Product && !mongoose.models.Product.schema.path("variations")) {
  delete mongoose.models.Product;
}

const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ||
  mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
