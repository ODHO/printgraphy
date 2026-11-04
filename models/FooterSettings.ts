import mongoose, { Schema, Document, Model } from "mongoose";
import type { FooterContent } from "@/lib/footerContent";

export interface IFooterSettings extends Document {
  key: string;
  content: Partial<FooterContent>;
}

const FooterSettingsSchema = new Schema<IFooterSettings>(
  {
    key: { type: String, required: true, unique: true, default: "footer" },
    content: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

const FooterSettings: Model<IFooterSettings> =
  (mongoose.models.FooterSettings as Model<IFooterSettings>) ||
  mongoose.model<IFooterSettings>("FooterSettings", FooterSettingsSchema);

export default FooterSettings;
