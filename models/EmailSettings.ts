import mongoose, { Schema, Document, Model } from "mongoose";
import type { EmailSettingsContent } from "@/lib/emailSettings";

export interface IEmailSettings extends Document {
  key: string;
  content: Partial<EmailSettingsContent>;
}

const EmailSettingsSchema = new Schema<IEmailSettings>(
  {
    key: { type: String, required: true, unique: true, default: "mail" },
    content: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

const EmailSettings: Model<IEmailSettings> =
  (mongoose.models.EmailSettings as Model<IEmailSettings>) ||
  mongoose.model<IEmailSettings>("EmailSettings", EmailSettingsSchema);

export default EmailSettings;
