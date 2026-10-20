import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAddress extends Document {
  userId: Types.ObjectId;
  label: string;           // e.g. "Home", "Office"
  name: string;            // Recipient name
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label:     { type: String, default: "Home" },
    name:      { type: String, required: true },
    line1:     { type: String, required: true },
    line2:     { type: String },
    city:      { type: String, required: true },
    state:     { type: String, required: true },
    zip:       { type: String, required: true },
    country:   { type: String, required: true, default: "US" },
    phone:     { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Address: Model<IAddress> =
  (mongoose.models.Address as Model<IAddress>) ||
  mongoose.model<IAddress>("Address", AddressSchema);

export default Address;
