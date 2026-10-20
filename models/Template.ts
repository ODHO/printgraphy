import "server-only";
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  letterSpacing?: number;
  underline?: boolean;
  opacity?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
}

export interface ITemplateData {
  bgColor: string;
  textColor: string;
  logoPosition: "top-right" | "top-left" | "center" | "bottom-right";
  logoText: string;
  logoImage?: string | null;
  logoSize: number;
  imageOpacity: number;
  textLayers: ITextLayer[];
}

export interface ICanvasObject {
  id: string;
  type: "text" | "shape" | "image" | "logo";
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  isLocked?: boolean;
  isVisible?: boolean;
  // Text specific
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  // Shape specific
  shapeType?: "rectangle" | "rounded-rect" | "circle" | "line" | "star" | "badge";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  // Image specific
  src?: string;
  fit?: "contain" | "cover";
  lockAspectRatio?: boolean;
}

export interface IDesignSide {
  bgColor: string;
  objects: ICanvasObject[];
}

export interface ITemplateCanvasConfig {
  width: number;
  height: number;
  unit: "mm" | "cm" | "in" | "px";
  orientation: "landscape" | "portrait";
  bleed: number;
  bleedUnit?: "mm" | "cm" | "in" | "px";
  safe_area: number;
  safeAreaUnit?: "mm" | "cm" | "in" | "px";
  background_color: string;
  supports_back_side: boolean;
  side_mode?: "single" | "double" | "multi";
  sides_count?: number;
  sides_names?: string[];
  guide_lines?: any[];
  canvas_type?: "flat" | "dieline" | "mockup";
  mockup_image?: string;
  print_area?: { x: number; y: number; width: number; height: number; label?: string };
}

export interface ITemplate extends Document {
  title: string;
  slug?: string;
  description: string;
  category: string;
  categoryId?: Types.ObjectId;
  tags: string[];
  thumbnail: string; // base64 data URL or image URL
  backThumbnail?: string;
  isPaid: boolean;
  price: number; // 0 = free
  isActive: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  canvas_config?: ITemplateCanvasConfig;
  front_design?: IDesignSide;
  back_design?: IDesignSide;
  side_designs?: IDesignSide[];
  templateData: ITemplateData;
  selectedVariations?: Record<string, string>;
  variations?: any[];
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TextLayerSchema = new Schema<ITextLayer>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    fontSize: { type: Number, required: true },
    color: { type: String, required: true },
    fontWeight: { type: String, enum: ["normal", "bold"], default: "normal" },
    fontStyle: { type: String, enum: ["normal", "italic"], default: "normal" },
    fontFamily: { type: String, default: "" },
    textAlign: { type: String, enum: ["left", "center", "right"], default: "left" },
    letterSpacing: { type: Number, default: 0 },
    underline: { type: Boolean, default: false },
    opacity: { type: Number, default: 1 },
    textTransform: { type: String, enum: ["none", "uppercase", "lowercase"], default: "none" },
  },
  { _id: false }
);

const TemplateDataSchema = new Schema<ITemplateData>(
  {
    bgColor: { type: String, default: "#1a1a1a" },
    textColor: { type: String, default: "#ffffff" },
    logoPosition: {
      type: String,
      enum: ["top-right", "top-left", "center", "bottom-right"],
      default: "top-right",
    },
    logoText: { type: String, default: "" },
    logoImage: { type: String, default: null },
    logoSize: { type: Number, default: 36 },
    imageOpacity: { type: Number, default: 90 },
    textLayers: { type: [TextLayerSchema], default: [] },
  },
  { _id: false }
);

const TemplateSchema = new Schema<ITemplate>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, required: true, trim: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: false, index: true },
    tags: { type: [String], default: [] },
    thumbnail: { type: String, default: "" },
    backThumbnail: { type: String, default: "" },
    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    canvas_config: {
      width: { type: Number, default: 105 },
      height: { type: Number, default: 60 },
      unit: { type: String, default: "mm" },
      orientation: { type: String, default: "landscape" },
      bleed: { type: Number, default: 3 },
      bleedUnit: { type: String, enum: ["mm", "cm", "in", "px"], default: "mm" },
      safe_area: { type: Number, default: 3 },
      safeAreaUnit: { type: String, enum: ["mm", "cm", "in", "px"], default: "mm" },
      background_color: { type: String, default: "#18181b" },
      supports_back_side: { type: Boolean, default: true },
      side_mode: { type: String, enum: ["single", "double", "multi"], default: "double" },
      sides_count: { type: Number, default: 2 },
      sides_names: { type: [String], default: ["Front", "Back"] },
      guide_lines: { type: Schema.Types.Mixed, default: [] },
      canvas_type: { type: String, enum: ["flat", "dieline", "mockup"], default: "flat" },
      mockup_image: { type: String, default: "" },
      print_area: { type: Schema.Types.Mixed, default: null },
    },
    front_design: {
      type: Schema.Types.Mixed,
      default: () => ({ bgColor: "#18181b", objects: [] }),
    },
    back_design: {
      type: Schema.Types.Mixed,
      default: () => ({ bgColor: "#141414", objects: [] }),
    },
    side_designs: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    templateData: { type: TemplateDataSchema, required: false },
    selectedVariations: { type: Schema.Types.Mixed, default: {} },
    variations: { type: Schema.Types.Mixed, default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

// Auto-compute isPaid and sync isActive with status
TemplateSchema.pre("save", function () {
  this.isPaid = this.price > 0;
  if (this.status) {
    this.isActive = this.status === "PUBLISHED";
  } else {
    this.status = this.isActive ? "PUBLISHED" : "DRAFT";
  }
});

const compiledCanvas = mongoose.models.Template?.schema.path("canvas_config") as
  | { schema?: { path: (key: string) => unknown } }
  | undefined;
if (
  mongoose.models.Template &&
  (!compiledCanvas?.schema?.path("bleedUnit") ||
    !compiledCanvas?.schema?.path("side_mode") ||
    !compiledCanvas?.schema?.path("guide_lines") ||
    !compiledCanvas?.schema?.path("canvas_type") ||
    !mongoose.models.Template.schema.path("side_designs"))
) {
  delete mongoose.models.Template;
}

const Template: Model<ITemplate> =
  (mongoose.models.Template as Model<ITemplate>) ||
  mongoose.model<ITemplate>("Template", TemplateSchema);

export default Template;
