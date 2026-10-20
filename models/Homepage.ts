import mongoose, { Schema, Document, Model } from "mongoose";
import type { HomepageContent } from "@/lib/homepageContent";

export interface IHomepage extends Document {
  key: string;
  content: Partial<HomepageContent>;
}

const HomepageSchema = new Schema<IHomepage>(
  {
    key: { type: String, required: true, unique: true, default: "home" },
    content: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

const Homepage: Model<IHomepage> =
  (mongoose.models.Homepage as Model<IHomepage>) ||
  mongoose.model<IHomepage>("Homepage", HomepageSchema);

export default Homepage;
