"use client";

import CategoryForm from "../../_components/CategoryForm";
import { IVariation } from "@/models/Product";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price?: number;
  unitPrice?: string;
  image: string;
  galleryImages?: string[];
  featureStory?: {
    title?: string;
    bullets?: string;
    sections?: { heading: string; body: string }[];
    images?: string[];
    relatedTitle?: string;
  };
  sortOrder: number;
  canvas_width: number;
  canvas_height: number;
  unit: "mm" | "cm" | "in" | "px";
  orientation: "landscape" | "portrait";
  bleed: number;
  bleedUnit?: "mm" | "cm" | "in" | "px";
  safe_area: number;
  safeAreaUnit?: "mm" | "cm" | "in" | "px";
  side_mode?: "single" | "double" | "multi";
  sides_count?: number;
  sides_names?: string[];
  guide_lines?: any[];
  canvas_type?: "flat" | "dieline" | "mockup";
  mockup_image?: string;
  banner_image?: string;
  print_area?: {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
  };
  print_placements?: any[];
  apparel_colors?: any[];
  apparel_sizes?: any[];
  decoration_methods?: any[];
  text_layers?: any[];
  default_template_data?: any;
  printSizes?: {
    name: string;
    width: number;
    height: number;
    unit: "mm" | "cm" | "in" | "px";
    bleed: number;
    bleedUnit: "mm" | "cm" | "in" | "px";
    safeArea: number;
    safeAreaUnit: "mm" | "cm" | "in" | "px";
    note?: string;
  }[];
  background_color: string;
  supports_back_side: boolean;
  variations?: IVariation[];
}

export default function CategoryEditClient({ category }: { category: Category }) {
  return (
    <CategoryForm
      mode="edit"
      categoryId={category._id}
      initialData={{
        _id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        price: category.price !== undefined ? String(category.price) : "0.15",
        unitPrice: category.unitPrice ?? "$0.15 each",
        image: category.image || "",
        galleryImages: category.galleryImages || [],
        featureStory: category.featureStory || {},
        sortOrder: String(category.sortOrder ?? 0),
        canvas_width: String(category.canvas_width || 105),
        canvas_height: String(category.canvas_height || 60),
        unit: category.unit || "mm",
        orientation: category.orientation || "landscape",
        bleed: String(category.bleed ?? 3),
        bleedUnit: category.bleedUnit || category.unit || "mm",
        safe_area: String(category.safe_area ?? 3),
        safeAreaUnit: category.safeAreaUnit || category.unit || "mm",
        side_mode:
          category.side_mode ||
          (Number(category.sides_count) > 2
            ? "multi"
            : category.supports_back_side === false
              ? "single"
              : "double"),
        sides_count: String(
          category.sides_count ??
            (category.side_mode === "single"
              ? 1
              : category.side_mode === "multi"
                ? 3
                : Number(category.sides_count) > 2
                  ? category.sides_count
                  : 2)
        ),
        sides_names: category.sides_names || [],
        guide_lines: category.guide_lines || [],
        canvas_type: category.canvas_type || "flat",
        mockup_image: category.mockup_image || "",
        banner_image: category.banner_image || "",
        print_area: category.print_area,
        print_placements: category.print_placements || [],
        apparel_colors: category.apparel_colors || [],
        apparel_sizes: category.apparel_sizes || [],
        decoration_methods: category.decoration_methods || [],
        text_layers: category.text_layers || [],
        default_template_data: category.default_template_data || {},
        printSizes: category.printSizes || [],
        background_color: category.background_color || "#18181b",
        supports_back_side: category.supports_back_side ?? true,
        variations: category.variations ?? [],
      }}
    />
  );
}
