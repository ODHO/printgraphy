import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { IVariation, IVariationValue } from "./Product";
import type { PrintSize } from "@/lib/canvasUtils";
import { cleanGuideLines, type CanvasGuideLine } from "@/lib/guideLines";
import {
  asCanvasType,
  cleanApparelColors,
  cleanApparelSizes,
  cleanDecorationMethods,
  cleanPrintArea,
  cleanPrintPlacements,
  DEFAULT_PRINT_AREA,
  type ApparelColor,
  type ApparelSize,
  type CanvasType,
  type DecorationMethod,
  type PrintArea,
  type PrintPlacement,
} from "@/lib/mockupCanvas";

export type CanvasUnit = "mm" | "cm" | "in" | "px";
export type CanvasOrientation = "landscape" | "portrait";
export type SideMode = "single" | "double" | "multi";
export type { ApparelColor, ApparelSize, CanvasType, DecorationMethod, PrintArea, PrintPlacement };

export type ICanvasGuideLine = CanvasGuideLine;

export interface ICategoryCanvasConfig {
  canvas_width: number;
  canvas_height: number;
  unit: CanvasUnit;
  orientation: CanvasOrientation;
  bleed: number;
  bleedUnit?: CanvasUnit;
  safe_area: number;
  safeAreaUnit?: CanvasUnit;
  background_color: string;
  supports_back_side: boolean;
  side_mode?: SideMode;
  sides_count?: number;
  sides_names?: string[];
  guide_lines?: ICanvasGuideLine[];
  /** flat = cards/flyers; dieline = boxes with folds; mockup = apparel/bags with product photo */
  canvas_type?: CanvasType;
  mockup_image?: string;
  /** Full-width category page hero (Clothing & Bags) — separate from cover card image */
  banner_image?: string;
  print_area?: PrintArea;
  print_placements?: PrintPlacement[];
  apparel_colors?: ApparelColor[];
  apparel_sizes?: ApparelSize[];
  decoration_methods?: DecorationMethod[];
  text_layers?: any[];
  default_template_data?: any;
  printSizes?: PrintSize[];
}

export interface ICategory extends Document, ICategoryCanvasConfig {
  name: string;
  slug: string;
  description: string;
  image: string;
  galleryImages?: string[];
  featureStory?: {
    title?: string;
    bullets?: string;
    sections?: { heading: string; body: string }[];
    images?: string[];
    relatedTitle?: string;
  };
  parentId?: Types.ObjectId;
  isActive: boolean;
  sortOrder: number;
  price?: number;
  unitPrice?: string;
  variations?: IVariation[];
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_CATEGORY_PRESETS: Record<string, ICategoryCanvasConfig & { name: string; slug: string; description: string }> = {
  "business-cards": {
    name: "Business Cards",
    slug: "business-cards",
    description: "Standard business cards for professional branding",
    canvas_width: 105,
    canvas_height: 60,
    unit: "mm",
    orientation: "landscape",
    bleed: 3,
    safe_area: 3,
    background_color: "#18181b",
    supports_back_side: true,
    side_mode: "double",
    sides_count: 2,
    sides_names: ["Front Side", "Back Side"],
    guide_lines: [],
  },
  "flyers": {
    name: "Flyers",
    slug: "flyers",
    description: "Marketing and promotional flyers (A5 standard)",
    canvas_width: 148,
    canvas_height: 210,
    unit: "mm",
    orientation: "portrait",
    bleed: 3,
    safe_area: 5,
    background_color: "#ffffff",
    supports_back_side: true,
    side_mode: "double",
    sides_count: 2,
    sides_names: ["Front", "Back"],
    guide_lines: [],
  },
  "invitations": {
    name: "Invitations",
    slug: "invitations",
    description: "Event and wedding invitations (5x7 inch)",
    canvas_width: 127,
    canvas_height: 178,
    unit: "mm",
    orientation: "portrait",
    bleed: 3,
    safe_area: 4,
    background_color: "#fafaf9",
    supports_back_side: true,
    side_mode: "double",
    sides_count: 2,
    sides_names: ["Front", "Back"],
    guide_lines: [],
  },
  "brochures": {
    name: "Brochures",
    slug: "brochures",
    description: "Tri-fold product brochures (A4)",
    canvas_width: 297,
    canvas_height: 210,
    unit: "mm",
    orientation: "landscape",
    bleed: 3,
    safe_area: 5,
    background_color: "#ffffff",
    supports_back_side: true,
    side_mode: "multi",
    sides_count: 3,
    sides_names: ["Outside Front/Back", "Inside Spread", "Flap Panel"],
    guide_lines: [
      { id: "fold-1", name: "Left Fold", orientation: "vertical", position: 33.33, unit: "percent", lineType: "fold", color: "#064FE0" },
      { id: "fold-2", name: "Right Fold", orientation: "vertical", position: 66.66, unit: "percent", lineType: "fold", color: "#064FE0" },
    ],
  },
  "postcards": {
    name: "Postcards",
    slug: "postcards",
    description: "Direct mail and greeting postcards (A6)",
    canvas_width: 148,
    canvas_height: 105,
    unit: "mm",
    orientation: "landscape",
    bleed: 3,
    safe_area: 3,
    background_color: "#ffffff",
    supports_back_side: true,
    side_mode: "double",
    sides_count: 2,
    sides_names: ["Front Side", "Back Side"],
    guide_lines: [],
  },
  "posters": {
    name: "Posters",
    slug: "posters",
    description: "High impact display posters (A3)",
    canvas_width: 297,
    canvas_height: 420,
    unit: "mm",
    orientation: "portrait",
    bleed: 5,
    safe_area: 10,
    background_color: "#ffffff",
    supports_back_side: false,
    side_mode: "single",
    sides_count: 1,
    sides_names: ["Front"],
    guide_lines: [],
  },
  "stickers": {
    name: "Stickers",
    slug: "stickers",
    description: "Custom cut brand and product stickers",
    canvas_width: 75,
    canvas_height: 75,
    unit: "mm",
    orientation: "landscape",
    bleed: 2,
    safe_area: 3,
    background_color: "#ffffff",
    supports_back_side: false,
    side_mode: "single",
    sides_count: 1,
    sides_names: ["Front"],
    guide_lines: [],
  },
  "t-shirts": {
    name: "T-Shirts",
    slug: "t-shirts",
    description: "Apparel chest and back print area",
    canvas_width: 300,
    canvas_height: 400,
    unit: "mm",
    orientation: "portrait",
    bleed: 0,
    safe_area: 15,
    background_color: "#18181b",
    supports_back_side: true,
    side_mode: "double",
    sides_count: 2,
    sides_names: ["Chest Front", "Back Side"],
    guide_lines: [],
  },
  "mugs": {
    name: "Mugs",
    slug: "mugs",
    description: "Ceramic drinkware wrap-around print area",
    canvas_width: 200,
    canvas_height: 90,
    unit: "mm",
    orientation: "landscape",
    bleed: 0,
    safe_area: 6,
    background_color: "#ffffff",
    supports_back_side: false,
    side_mode: "single",
    sides_count: 1,
    sides_names: ["Wrap Around"],
    guide_lines: [],
  },
};

const CategoryVariationValueSchema = new Schema<IVariationValue>(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true, default: 0, min: 0 },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const CategoryVariationSchema = new Schema<IVariation>(
  {
    name: { type: String, required: true, trim: true },
    required: { type: Boolean, default: true },
    values: { type: [CategoryVariationValueSchema], default: [] },
  },
  { _id: true }
);

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "" },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", required: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    // Category Canvas Configuration
    canvas_width: { type: Number, default: 105 },
    canvas_height: { type: Number, default: 60 },
    unit: { type: String, enum: ["mm", "cm", "in", "px"], default: "mm" },
    orientation: { type: String, enum: ["landscape", "portrait"], default: "landscape" },
    bleed: { type: Number, default: 3 },
    bleedUnit: { type: String, enum: ["mm", "cm", "in", "px"], default: "mm" },
    safe_area: { type: Number, default: 3 },
    safeAreaUnit: { type: String, enum: ["mm", "cm", "in", "px"], default: "mm" },
    background_color: { type: String, default: "#18181b" },
    supports_back_side: { type: Boolean, default: true },
    side_mode: { type: String, enum: ["single", "double", "multi"], default: "double" },
    sides_count: { type: Number, default: 2 },
    sides_names: { type: [String], default: ["Front", "Back"] },
    guide_lines: {
      type: [
        new Schema(
          {
            id: { type: String, required: true },
            name: { type: String, default: "" },
            orientation: { type: String, enum: ["vertical", "horizontal"], required: true },
            position: { type: Number, required: true },
            unit: { type: String, enum: ["percent", "mm", "cm", "in", "px"], default: "percent" },
            lineType: { type: String, enum: ["fold", "score", "cut", "guide"], default: "fold" },
            color: { type: String, default: "#064FE0" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    canvas_type: { type: String, enum: ["flat", "dieline", "mockup"], default: "flat" },
    mockup_image: { type: String, default: "" },
    banner_image: { type: String, default: "" },
    print_area: {
      type: new Schema(
        {
          x: { type: Number, default: DEFAULT_PRINT_AREA.x },
          y: { type: Number, default: DEFAULT_PRINT_AREA.y },
          width: { type: Number, default: DEFAULT_PRINT_AREA.width },
          height: { type: Number, default: DEFAULT_PRINT_AREA.height },
          label: { type: String, default: "Print Area" },
        },
        { _id: false }
      ),
      default: () => ({ ...DEFAULT_PRINT_AREA }),
    },
    print_placements: { type: Schema.Types.Mixed, default: [] },
    apparel_colors: { type: Schema.Types.Mixed, default: [] },
    apparel_sizes: { type: Schema.Types.Mixed, default: [] },
    decoration_methods: { type: Schema.Types.Mixed, default: [] },
    text_layers: { type: Schema.Types.Mixed, default: [] },
    default_template_data: { type: Schema.Types.Mixed, default: {} },
    printSizes: {
      type: [
        new Schema(
          {
            name: { type: String, required: true, trim: true },
            width: { type: Number, required: true },
            height: { type: Number, required: true },
            unit: { type: String, enum: ["mm", "cm", "in", "px"], default: "in" },
            bleed: { type: Number, default: 0 },
            bleedUnit: { type: String, enum: ["mm", "cm", "in", "px"], default: "in" },
            safeArea: { type: Number, default: 0 },
            safeAreaUnit: { type: String, enum: ["mm", "cm", "in", "px"], default: "in" },
            note: { type: String, default: "" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    galleryImages: { type: [String], default: [] },
    featureStory: { type: Schema.Types.Mixed, default: () => ({}) },
    price: { type: Number, default: 0.15 },
    unitPrice: { type: String, default: "" },
    variations: { type: [CategoryVariationSchema], default: [] },
  },
  { timestamps: true }
);

/** Normalize single / double / multi side canvas settings for packaging, apparel, etc. */
export function normalizeCategorySides(input: {
  side_mode?: unknown;
  sides_count?: unknown;
  sides_names?: unknown;
  supports_back_side?: unknown;
  guide_lines?: unknown;
}) {
  const namesIn = Array.isArray(input.sides_names)
    ? input.sides_names.map((n) => String(n ?? "").trim()).filter(Boolean)
    : [];
  let count = Number(input.sides_count);
  if (!Number.isFinite(count) || count < 1) {
    count = namesIn.length || (input.supports_back_side === false ? 1 : 2);
  }
  count = Math.max(1, Math.min(12, Math.round(count)));

  let mode = String(input.side_mode || "") as SideMode | "";
  if (mode !== "single" && mode !== "double" && mode !== "multi") {
    mode = count <= 1 ? "single" : count === 2 ? "double" : "multi";
  }
  if (mode === "single") count = 1;
  else if (mode === "double") count = 2;
  else if (count < 3) count = Math.max(3, namesIn.length || 3);

  const defaultNames =
    mode === "single"
      ? ["Front Side"]
      : mode === "double"
        ? ["Front Side", "Back Side"]
        : Array.from({ length: count }, (_, i) => `Side ${i + 1} / Panel ${String.fromCharCode(65 + i)}`);

  const sides_names = Array.from({ length: count }, (_, i) => namesIn[i] || defaultNames[i] || `Side ${i + 1}`);

  return {
    side_mode: mode as SideMode,
    sides_count: count,
    sides_names,
    supports_back_side: mode !== "single",
    guide_lines: cleanGuideLines(input.guide_lines),
  };
}

export function normalizeCategoryMockup(input: {
  canvas_type?: unknown;
  mockup_image?: unknown;
  print_area?: unknown;
  print_placements?: unknown;
  apparel_colors?: unknown;
  apparel_sizes?: unknown;
  decoration_methods?: unknown;
  guide_lines?: unknown;
}) {
  let canvas_type = asCanvasType(input.canvas_type, "flat");
  // Infer dieline when admin configured fold lines but left type as flat
  if (canvas_type === "flat" && cleanGuideLines(input.guide_lines).length > 0) {
    canvas_type = "dieline";
  }
  const print_placements = cleanPrintPlacements(input.print_placements);
  const print_area =
    canvas_type === "mockup" && print_placements[0]
      ? cleanPrintArea(input.print_area || print_placements[0].printArea)
      : cleanPrintArea(input.print_area);
  return {
    canvas_type,
    mockup_image: String(input.mockup_image || "").trim(),
    print_area,
    print_placements: canvas_type === "mockup" ? print_placements : [],
    apparel_colors: canvas_type === "mockup" ? cleanApparelColors(input.apparel_colors) : [],
    apparel_sizes: canvas_type === "mockup" ? cleanApparelSizes(input.apparel_sizes) : [],
    decoration_methods: canvas_type === "mockup" ? cleanDecorationMethods(input.decoration_methods) : [],
  };
}

// Bust stale schema cache so new side/print fields are never stripped on save
if (
  mongoose.models.Category &&
  (!mongoose.models.Category.schema.path("side_mode") ||
    !mongoose.models.Category.schema.path("sides_count") ||
    !mongoose.models.Category.schema.path("guide_lines") ||
    !mongoose.models.Category.schema.path("printSizes") ||
    !mongoose.models.Category.schema.path("bleedUnit") ||
    !mongoose.models.Category.schema.path("canvas_type") ||
    !mongoose.models.Category.schema.path("mockup_image") ||
    !mongoose.models.Category.schema.path("banner_image") ||
    !mongoose.models.Category.schema.path("print_area") ||
    !mongoose.models.Category.schema.path("print_placements") ||
    !mongoose.models.Category.schema.path("apparel_colors") ||
    (mongoose.models.Category.schema.path("guide_lines") as { instance?: string } | undefined)?.instance === "Mixed")
) {
  delete mongoose.models.Category;
} else if (process.env.NODE_ENV !== "production" && mongoose.models.Category) {
  delete mongoose.models.Category;
}

const Category: Model<ICategory> =
  (mongoose.models.Category as Model<ICategory>) ||
  mongoose.model<ICategory>("Category", CategorySchema);

export default Category;

