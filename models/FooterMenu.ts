import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFooterMenuItem {
  _id?: string;
  title: string;
  url: string;
  order: number;
  isActive: boolean;
  openInNewTab: boolean;
}

export interface IFooterColumnDocument extends Document {
  title: string;
  order: number;
  isActive: boolean;
  items: IFooterMenuItem[];
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_FOOTER_MENU_COLUMNS: Array<{
  title: string;
  order: number;
  isActive: boolean;
  items: Omit<IFooterMenuItem, "_id">[];
}> = [
  {
    title: "Let Us Help",
    order: 0,
    isActive: true,
    items: [
      { title: "My Account", url: "/dashboard/account", order: 0, isActive: true, openInNewTab: false },
      { title: "Shipping", url: "/contact", order: 1, isActive: true, openInNewTab: false },
      { title: "Contact & Support", url: "/contact", order: 2, isActive: true, openInNewTab: false },
      { title: "Ideas & Advice", url: "/browsedesigns", order: 3, isActive: true, openInNewTab: false },
      { title: "Accessibility", url: "/contact", order: 4, isActive: true, openInNewTab: false },
    ],
  },
  {
    title: "Our Company",
    order: 1,
    isActive: true,
    items: [
      { title: "About Us", url: "/about", order: 0, isActive: true, openInNewTab: false },
      { title: "Careers", url: "/contact", order: 1, isActive: true, openInNewTab: false },
      { title: "Ambassador Program", url: "/contact", order: 2, isActive: true, openInNewTab: false },
      { title: "PRINTGRAPHI Advantage", url: "/about", order: 3, isActive: true, openInNewTab: false },
      { title: "For Investors", url: "/contact", order: 4, isActive: true, openInNewTab: false },
      { title: "For Media", url: "/contact", order: 5, isActive: true, openInNewTab: false },
      { title: "Sustainability", url: "/about", order: 6, isActive: true, openInNewTab: false },
      { title: "Do Not Sell or Share My Info", url: "/privacy", order: 7, isActive: true, openInNewTab: false },
    ],
  },
];

const FooterMenuItemSchema = new Schema<IFooterMenuItem>(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    openInNewTab: { type: Boolean, default: false },
  },
  { _id: true }
);

const FooterColumnSchema = new Schema<IFooterColumnDocument>(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    items: [FooterMenuItemSchema],
  },
  { timestamps: true }
);

FooterColumnSchema.index({ order: 1 });

const FooterMenu: Model<IFooterColumnDocument> =
  (mongoose.models.FooterMenu as Model<IFooterColumnDocument>) ||
  mongoose.model<IFooterColumnDocument>("FooterMenu", FooterColumnSchema);

export default FooterMenu;
