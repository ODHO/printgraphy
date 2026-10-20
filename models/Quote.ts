import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type QuoteStatus = "submitted" | "under_review" | "quoted" | "approved" | "declined";

export interface IQuote extends Document {
  referenceNumber: string;     // e.g. XP-QT-2026-0001
  userId?: Types.ObjectId;
  contactName: string;
  email: string;
  companyName?: string;
  phone?: string;
  category: string;             // e.g. "Packaging", "Sourcing", "Bulk Print"
  quantity: number;
  targetTimeline?: string;
  description: string;
  attachmentUrls: string[];
  status: QuoteStatus;
  quotedPrice?: number;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<IQuote>(
  {
    referenceNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    contactName: { type: String, required: true },
    email: { type: String, required: true },
    companyName: { type: String },
    phone: { type: String },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    targetTimeline: { type: String },
    description: { type: String, required: true },
    attachmentUrls: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["submitted", "under_review", "quoted", "approved", "declined"],
      default: "submitted",
    },
    quotedPrice: { type: Number },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

const Quote: Model<IQuote> =
  (mongoose.models.Quote as Model<IQuote>) ||
  mongoose.model<IQuote>("Quote", QuoteSchema);

export default Quote;
