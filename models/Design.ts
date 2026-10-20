import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDesign extends Document {
  userId?: mongoose.Types.ObjectId;
  guestSessionId?: string;
  templateId?: mongoose.Types.ObjectId;
  name: string;
  thumbnail?: string;
  designData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const DesignSchema = new Schema<IDesign>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },
    guestSessionId: { type: String, required: false, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: "Template" },
    name: { type: String, required: true, trim: true, default: "My Saved Card Design" },
    thumbnail: { type: String },
    designData: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

if (mongoose.models.Design && !mongoose.models.Design.schema.path("guestSessionId")) {
  mongoose.deleteModel("Design");
}

const Design: Model<IDesign> =
  mongoose.models.Design || mongoose.model<IDesign>("Design", DesignSchema);

export default Design;
