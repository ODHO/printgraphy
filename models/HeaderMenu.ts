import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMenuLink {
  title: string;
  url: string;
}

export interface IMenuColumn {
  title: string;
  links: IMenuLink[];
}

export interface IMenuFeature {
  image: string;
  title: string;
  text: string;
  url: string;
  linkLabel: string;
}

export interface IHeaderMenuItem {
  _id?: string;
  title: string;
  url: string;
  order: number;
  isActive: boolean;
  openInNewTab: boolean;
  loginOnly: boolean;
  categoryId?: Types.ObjectId | string | null;
  columns?: IMenuColumn[];
  feature?: IMenuFeature;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IHeaderMenuItemDocument extends Document {
  title: string;
  url: string;
  order: number;
  isActive: boolean;
  openInNewTab: boolean;
  loginOnly: boolean;
  categoryId?: Types.ObjectId | null;
  columns: IMenuColumn[];
  feature: IMenuFeature;
  createdAt: Date;
  updatedAt: Date;
}

export function cleanMenuColumns(input: unknown): IMenuColumn[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 12)
    .map((column) => {
      const row = column as { title?: string; links?: { title?: string; url?: string }[] };
      const links = Array.isArray(row?.links)
        ? row.links
            .slice(0, 24)
            .map((link) => ({
              title: String(link?.title || "").trim().slice(0, 80),
              url: String(link?.url || "").trim().slice(0, 300),
            }))
            .filter((link) => link.title && link.url)
        : [];
      return { title: String(row?.title || "").trim().slice(0, 80), links };
    })
    .filter((column) => column.title);
}

export function cleanMenuFeature(input: unknown): IMenuFeature {
  const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    image: String(row.image || "").trim().slice(0, 500),
    title: String(row.title || "").trim().slice(0, 80),
    text: String(row.text || "").trim().slice(0, 180),
    url: String(row.url || "").trim().slice(0, 300),
    linkLabel: String(row.linkLabel || "").trim().slice(0, 40),
  };
}

export function buildMenuDropdown(
  item: { columns?: IMenuColumn[]; feature?: IMenuFeature; url?: string },
  category?: { name?: string; image?: string; variations?: { name?: string; values?: { name?: string }[] }[] } | null
) {
  const columns: IMenuColumn[] = [];
  for (const variation of category?.variations || []) {
    const links = (variation.values || [])
      .filter((value) => value?.name)
      .map((value) => ({
        title: value.name as string,
        url: `/browsedesigns?category=${encodeURIComponent(category?.name || "")}&variation=${encodeURIComponent(value.name || "")}`,
      }));
    if (variation.name && links.length) columns.push({ title: variation.name, links });
  }
  columns.push(...cleanMenuColumns(item.columns));

  const saved = cleanMenuFeature(item.feature);
  const feature: IMenuFeature = {
    image: saved.image || category?.image || "",
    title: saved.title,
    text: saved.text,
    url: saved.url || item.url || "",
    linkLabel: saved.linkLabel || (saved.url || category?.image ? "Browse Designs" : ""),
  };
  const hasFeature = Boolean(feature.image || feature.title || feature.text);
  if (!columns.length && !hasFeature) return null;
  return { columns, feature: hasFeature ? feature : null };
}

export const DEFAULT_HEADER_MENU_ITEMS: Omit<IHeaderMenuItem, "_id">[] = [
  { title: "Home", url: "/", order: 0, isActive: true, openInNewTab: false, loginOnly: false },
  { title: "Deals", url: "/browsedesigns", order: 1, isActive: true, openInNewTab: false, loginOnly: false },
  { title: "Business Cards", url: "/business-cards", order: 2, isActive: true, openInNewTab: false, loginOnly: false },
  { title: "Post Cards", url: "/browsedesigns?category=Postcards", order: 3, isActive: true, openInNewTab: false, loginOnly: false },
  { title: "Signs & Banners", url: "/browsedesigns?category=Banners", order: 4, isActive: true, openInNewTab: false, loginOnly: false },
  { title: "Clothing & Bags", url: "/clothing-bags", order: 5, isActive: true, openInNewTab: false, loginOnly: false },
  { title: "Promotional Printing", url: "/browsedesigns", order: 6, isActive: true, openInNewTab: false, loginOnly: false },
  { title: "Booklets", url: "/browsedesigns?category=Booklets", order: 7, isActive: true, openInNewTab: false, loginOnly: false },
  { title: "Books", url: "/browsedesigns?category=Books", order: 8, isActive: true, openInNewTab: false, loginOnly: false },
  { title: "Calendars", url: "/browsedesigns?category=Calendars", order: 9, isActive: true, openInNewTab: false, loginOnly: false },
  { title: "Shopping Bags", url: "/browsedesigns?category=Bags", order: 10, isActive: true, openInNewTab: false, loginOnly: false },
];

const HeaderMenuSchema = new Schema<IHeaderMenuItemDocument>(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    openInNewTab: { type: Boolean, default: false },
    loginOnly: { type: Boolean, default: false },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    columns: {
      type: [
        {
          title: { type: String, trim: true },
          links: {
            type: [{ title: { type: String, trim: true }, url: { type: String, trim: true } }],
            default: [],
          },
        },
      ],
      default: [],
    },
    feature: {
      image: { type: String, default: "" },
      title: { type: String, default: "" },
      text: { type: String, default: "" },
      url: { type: String, default: "" },
      linkLabel: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

HeaderMenuSchema.index({ order: 1 });

if (mongoose.models.HeaderMenu && !mongoose.models.HeaderMenu.schema.path("columns")) {
  delete mongoose.models.HeaderMenu;
}

const HeaderMenu: Model<IHeaderMenuItemDocument> =
  (mongoose.models.HeaderMenu as Model<IHeaderMenuItemDocument>) ||
  mongoose.model<IHeaderMenuItemDocument>("HeaderMenu", HeaderMenuSchema);

export default HeaderMenu;
