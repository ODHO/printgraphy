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
  items: Omit<IFooterMenuItem, "_id">[ ];
}> = [
  {
    title: "Site",
    order: 0,
    isActive: true,
    items: [
      { title: "Services", url: "/services", order: 0, isActive: true, openInNewTab: false },
      { title: "eCommerce / Products", url: "/products", order: 1, isActive: true, openInNewTab: false },
      { title: "Ordering", url: "/browsedesigns", order: 2, isActive: true, openInNewTab: false },
      { title: "About", url: "/about", order: 3, isActive: true, openInNewTab: false },
      { title: "Contact", url: "/contact", order: 4, isActive: true, openInNewTab: false },
    ],
  },
  {
    title: "The Group",
    order: 1,
    isActive: true,
    items: [
      { title: "Printgraphy — print & packaging", url: "#", order: 0, isActive: true, openInNewTab: false },
      { title: "AxisBlu Intelligence — software", url: "#", order: 1, isActive: true, openInNewTab: false },
      { title: "OnePoint Services — fulfillment", url: "#", order: 2, isActive: true, openInNewTab: false },
      { title: "Kool Synergy — commercialization", url: "#", order: 3, isActive: true, openInNewTab: false },
    ],
  },
  {
    title: "Details",
    order: 2,
    isActive: true,
    items: [
      { title: "No minimums", url: "#", order: 0, isActive: true, openInNewTab: false },
      { title: "Free file check", url: "#", order: 1, isActive: true, openInNewTab: false },
      { title: "Ships nationwide", url: "#", order: 2, isActive: true, openInNewTab: false },
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
