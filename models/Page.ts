import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPageItem {
  _id?: string;
  title: string;
  slug: string;
  content: string;
  blocks?: any[];
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPageDocument extends Document {
  title: string;
  slug: string;
  content: string;
  blocks: any[];
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_CMS_PAGES: Omit<IPageItem, "_id">[] = [
  {
    title: "About Us",
    slug: "about-us",
    content: `
      <h2>Welcome to Printgraphy</h2>
      <p>Printgraphy is your premier destination for one-of-a-kind eco-luxury printing and brand collateral. We specialize in fast, high-quality business cards, custom promotional materials, marketing collateral, and personalized design templates.</p>
      <h3>Our Commitment to Quality</h3>
      <p>With cutting-edge print technologies, sustainable materials, and easy-to-use online design studios, we empower businesses and individuals to elevate their visual identity effortlessly.</p>
    `,
    metaTitle: "About Us — Printgraphy Luxury Printing",
    metaDescription: "Learn more about Printgraphy eco-luxury printing services and visual design solutions.",
    isPublished: true,
  },
  {
    title: "Terms & Conditions",
    slug: "terms-and-conditions",
    content: `
      <h2>Terms and Conditions</h2>
      <p>Welcome to Printgraphy. By accessing or using our website and services, you agree to comply with and be bound by the following terms and conditions.</p>
      <h3>1. Service Usage</h3>
      <p>All design assets, uploaded materials, and order specifications submitted through our platform are subject to verification and proofing prior to production.</p>
      <h3>2. Shipping & Delivery</h3>
      <p>Delivery estimates are provided upon checkout. Express delivery services are subject to location availability.</p>
    `,
    metaTitle: "Terms & Conditions — Printgraphy",
    metaDescription: "Read the official terms and conditions for Printgraphy products and services.",
    isPublished: true,
  },
  {
    title: "Privacy Policy",
    slug: "privacy-policy",
    content: `
      <h2>Privacy Policy</h2>
      <p>At Printgraphy, we respect your privacy and are committed to protecting your personal data.</p>
      <h3>Information We Collect</h3>
      <p>We collect personal information such as your name, email address, delivery details, and order preferences to provide seamless printing services and customer support.</p>
      <h3>Data Security</h3>
      <p>Your transaction data is encrypted and securely processed using industry standard security protocols.</p>
    `,
    metaTitle: "Privacy Policy — Printgraphy",
    metaDescription: "Review Printgraphy privacy policies and data protection practices.",
    isPublished: true,
  },
  {
    title: "Marketing",
    slug: "marketing",
    content: `
      <h2>The Brand And The Digital Presence Behind The Product</h2>
      <p>Websites, identity, and brand strategy, built by the same technology team that runs the Printgraphy operating layer. Design that's ready to sell the moment your product is ready to ship.</p>
    `,
    metaTitle: "Marketing & Digital Brand Intelligence — Printgraphy",
    metaDescription: "Websites, identity, and brand strategy, built by AxisBlu Intelligence.",
    isPublished: true,
  },
];

const PageSchema = new Schema<IPageDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    content: { type: String, default: "" },
    blocks: { type: Schema.Types.Mixed, default: [] },
    metaTitle: { type: String, default: "", trim: true },
    metaDescription: { type: String, default: "", trim: true },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Page: Model<IPageDocument> =
  (mongoose.models.Page as Model<IPageDocument>) ||
  mongoose.model<IPageDocument>("Page", PageSchema);

export default Page;
