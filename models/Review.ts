import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReview extends Document {
  productId: mongoose.Types.ObjectId | string;
  userId?: mongoose.Types.ObjectId;
  userName: string;
  role?: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  isApproved: boolean;
  adminReply?: string;
  adminRepliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: { type: Schema.Types.Mixed, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    userName: { type: String, required: true, trim: true },
    role: { type: String, default: "Verified Customer", trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true },
    comment: { type: String, required: true, trim: true },
    isApproved: { type: Boolean, default: true },
    adminReply: { type: String, default: "", trim: true },
    adminRepliedAt: { type: Date },
  },
  { timestamps: true }
);

if (mongoose.models.Review && !mongoose.models.Review.schema.path("adminReply")) {
  delete mongoose.models.Review;
}

const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);

export default Review;
