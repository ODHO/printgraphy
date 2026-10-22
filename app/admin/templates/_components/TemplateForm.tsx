import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThreeDCardPreview from "@/components/ThreeDCardPreview";
import TextStyleControls from "@/components/TextStyleControls";
import { ADMIN_LAYOUT, textLayerDomStyle } from "@/lib/cardRender";
import { ICanvasGuideLine, SideMode } from "@/models/Category";

interface ApiCategoryVariation {
  name: string;
  required?: boolean;
  values: {
    name: string;
    price: number;
    description?: string;
  }[];
}

interface ApiCategoryItem {
  _id: string;
  name: string;
  slug: string;
  canvas_width?: number;
  canvas_height?: number;
  unit?: "mm" | "cm" | "in" | "px";
  orientation?: "landscape" | "portrait";
  bleed?: number;
  bleedUnit?: "mm" | "cm" | "in" | "px";
  safe_area?: number;
  safeAreaUnit?: "mm" | "cm" | "in" | "px";
  background_color?: string;
  supports_back_side?: boolean;
  side_mode?: SideMode;
  sides_count?: number;
  sides_names?: string[];
  guide_lines?: ICanvasGuideLine[];
  text_layers?: TextLayer[];
  default_template_data?: {
    bgColor?: string;
    textColor?: string;
    logoPosition?: "top-right" | "top-left" | "center" | "bottom-right";
    logoText?: string;
    logoSize?: number;
    textLayers?: TextLayer[];
  };
  variations?: ApiCategoryVariation[];
}

export interface TextLayer {
  id: string;
  /** text (default) or image/logo placed on mockup */
  type?: "text" | "image";
  text: string;
  /** Image URL when type === "image" */
  src?: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
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
  /** Image size as % of print area when type === "image" */
  width?: number;
  height?: number;
  /** Apparel mockup side — front (default) or back */
  placementId?: "front" | "back" | string;
}

export interface TemplateCanvasConfig {
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
  side_mode?: SideMode;
  sides_count?: number;
  sides_names?: string[];
  guide_lines?: ICanvasGuideLine[];
}

export interface TemplateFormData {
  title: string;
  description: string;
  category: string;
  categoryId?: string;
  isPaid: boolean;
  price: string;
  isActive: boolean;
  thumbnail: string;
  tags: string;
  canvas_config: TemplateCanvasConfig;
  templateData: {
    bgColor: string;
    textColor: string;
    logoPosition: "top-right" | "top-left" | "center" | "bottom-right";
    logoText: string;
    logoSize: number;
    textLayers: TextLayer[];
  };
  selectedVariations?: Record<string, string>;
  variations?: ApiCategoryVariation[];
}

interface Props {
  initialData?: Partial<TemplateFormData> & { canvas_config?: Partial<TemplateCanvasConfig> };
  mode: "create" | "edit";
  templateId?: string;
}

const TEMPLATE_CATEGORIES = [
  "Packaging Boxes",
  "Product Boxes",
  "T-Shirts",
  "Mugs",
  "Business Cards",
  "Flyers",
  "Posters",
  "Stickers",
  "Corporate",
  "Creative",
  "Minimalist",
  "Luxury",
  "Modern",
  "Vintage",
];

const PRODUCT_CANVAS_PRESETS: Record<
  string,
  {
    name: string;
    width: number;
    height: number;
    unit: "mm" | "cm" | "in" | "px";
    orientation: "landscape" | "portrait";
    bleed: number;
    safe_area: number;
    supports_back_side: boolean;
    side_mode: SideMode;
    sides_count: number;
    sides_names: string[];
    guide_lines: ICanvasGuideLine[];
  }
> = {
  "packaging-boxes": {
    name: "Packaging Boxes (Dieline Net)",
    width: 280,
    height: 280,
    unit: "mm",
    orientation: "landscape",
    bleed: 5,
    safe_area: 10,
    supports_back_side: true,
    side_mode: "multi",
    sides_count: 4,
    sides_names: ["Front Panel", "Right Side", "Back Panel", "Left Side"],
    guide_lines: [
      { id: "box_1", name: "Left Fold", orientation: "vertical", position: 25, unit: "percent", lineType: "fold", color: "#e74b2d" },
      { id: "box_2", name: "Center Fold", orientation: "vertical", position: 50, unit: "percent", lineType: "fold", color: "#e74b2d" },
      { id: "box_3", name: "Right Fold", orientation: "vertical", position: 75, unit: "percent", lineType: "fold", color: "#e74b2d" },
    ],
  },
  "product-boxes": {
    name: "Product Retail Boxes",
    width: 220,
    height: 180,
    unit: "mm",
    orientation: "landscape",
    bleed: 4,
    safe_area: 8,
    supports_back_side: true,
    side_mode: "multi",
    sides_count: 4,
    sides_names: ["Front Panel", "Right Panel", "Back Panel", "Left Panel"],
    guide_lines: [
      { id: "pbox_1", name: "Panel Divider 1", orientation: "vertical", position: 25, unit: "percent", lineType: "fold", color: "#e74b2d" },
      { id: "pbox_2", name: "Panel Divider 2", orientation: "vertical", position: 50, unit: "percent", lineType: "fold", color: "#e74b2d" },
      { id: "pbox_3", name: "Panel Divider 3", orientation: "vertical", position: 75, unit: "percent", lineType: "fold", color: "#e74b2d" },
    ],
  },
  "t-shirts": {
    name: "T-Shirts & Apparel",
    width: 300,
    height: 400,
    unit: "mm",
    orientation: "portrait",
    bleed: 0,
    safe_area: 15,
    supports_back_side: true,
    side_mode: "double",
    sides_count: 2,
    sides_names: ["Chest Front", "Back Side"],
    guide_lines: [],
  },
  "mugs": {
    name: "Mugs & Drinkware",
    width: 200,
    height: 90,
    unit: "mm",
    orientation: "landscape",
    bleed: 0,
    safe_area: 6,
    supports_back_side: false,
    side_mode: "single",
    sides_count: 1,
    sides_names: ["Wrap Around"],
    guide_lines: [],
  },
  "business-cards": {
    name: "Business Cards",
    width: 105,
    height: 60,
    unit: "mm",
    orientation: "landscape",
    bleed: 3,
    safe_area: 3,
    supports_back_side: true,
    side_mode: "double",
    sides_count: 2,
    sides_names: ["Front Side", "Back Side"],
    guide_lines: [],
  },
  "flyers": {
    name: "Flyers (A5)",
    width: 148,
    height: 210,
    unit: "mm",
    orientation: "portrait",
    bleed: 3,
    safe_area: 5,
    supports_back_side: true,
    side_mode: "double",
    sides_count: 2,
    sides_names: ["Front", "Back"],
    guide_lines: [],
  },
  "posters": {
    name: "Posters (A3)",
    width: 297,
    height: 420,
    unit: "mm",
    orientation: "portrait",
    bleed: 5,
    safe_area: 10,
    supports_back_side: false,
    side_mode: "single",
    sides_count: 1,
    sides_names: ["Front"],
    guide_lines: [],
  },
  "stickers": {
    name: "Stickers & Labels",
    width: 75,
    height: 75,
    unit: "mm",
    orientation: "landscape",
    bleed: 2,
    safe_area: 3,
    supports_back_side: false,
    side_mode: "single",
    sides_count: 1,
    sides_names: ["Front"],
    guide_lines: [],
  },
};

const DEFAULT_LAYERS: TextLayer[] = [
  { id: "1", text: "Stephen", x: 10, y: 30, fontSize: 22, color: "#ffffff", fontWeight: "bold" },
  { id: "2", text: "Manager", x: 10, y: 48, fontSize: 13, color: "#f88768", fontWeight: "normal" },
  { id: "3", text: "+1 (555) 123-4567", x: 10, y: 76, fontSize: 10, color: "#e4e4e7", fontWeight: "normal" },
  { id: "4", text: "stephen@zyora.com", x: 42, y: 76, fontSize: 10, color: "#e4e4e7", fontWeight: "normal" },
  { id: "5", text: "Poissy 15 rue de la Boëtie", x: 68, y: 76, fontSize: 10, color: "#e4e4e7", fontWeight: "normal" },
];

const BG_PRESETS = [
  { label: "Matte Black", value: "#141414" },
  { label: "Deep Navy", value: "#0a1128" },
  { label: "Pure White", value: "#ffffff" },
  { label: "Luxury Red", value: "#4a0404" },
  { label: "Forest Green", value: "#062c1b" },
  { label: "Royal Blue", value: "#1b365d" },
];

export default function TemplateForm({ initialData, mode, templateId }: Props) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const thumbnailRef = useRef<HTMLInputElement | null>(null);

  const [dbCategories, setDbCategories] = useState<ApiCategoryItem[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>(
    initialData?.selectedVariations || {}
  );

  const [form, setForm] = useState<TemplateFormData>({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    category: initialData?.category ?? TEMPLATE_CATEGORIES[0],
    categoryId: initialData?.categoryId ?? "",
    isPaid: initialData?.isPaid ?? false,
    price: initialData?.price ?? "0",
    isActive: initialData?.isActive ?? true,
    thumbnail: initialData?.thumbnail ?? "",
    tags: initialData?.tags ?? "",
    canvas_config: {
      width: initialData?.canvas_config?.width ?? 105,
      height: initialData?.canvas_config?.height ?? 60,
      unit: initialData?.canvas_config?.unit ?? "mm",
      orientation: initialData?.canvas_config?.orientation ?? "landscape",
      bleed: initialData?.canvas_config?.bleed ?? 3,
      bleedUnit: initialData?.canvas_config?.bleedUnit ?? "mm",
      safe_area: initialData?.canvas_config?.safe_area ?? 3,
      safeAreaUnit: initialData?.canvas_config?.safeAreaUnit ?? "mm",
      background_color: initialData?.canvas_config?.background_color ?? "#141414",
      supports_back_side: initialData?.canvas_config?.supports_back_side ?? true,
      side_mode: initialData?.canvas_config?.side_mode ?? "double",
      sides_count: initialData?.canvas_config?.sides_count ?? 2,
      sides_names: initialData?.canvas_config?.sides_names ?? ["Front Side", "Back Side"],
      guide_lines: initialData?.canvas_config?.guide_lines ?? [],
    },
    templateData: {
      bgColor: initialData?.templateData?.bgColor ?? "#141414",
      textColor: initialData?.templateData?.textColor ?? "#ffffff",
      logoPosition: initialData?.templateData?.logoPosition ?? "top-right",
      logoText: initialData?.templateData?.logoText ?? "Z",
      logoSize: initialData?.templateData?.logoSize ?? 28,
      textLayers: initialData?.templateData?.textLayers ?? DEFAULT_LAYERS,
    },
  });

  const applyCategoryObject = (catObj: ApiCategoryItem) => {
    const categoryDefaultLayers =
      catObj.default_template_data?.textLayers ||
      (Array.isArray(catObj.text_layers) && catObj.text_layers.length > 0
        ? catObj.text_layers
        : undefined);

    const categoryBgColor =
      catObj.default_template_data?.bgColor ||
      catObj.background_color;

    setForm((prev) => ({
      ...prev,
      category: catObj.name,
      categoryId: catObj._id,
      canvas_config: {
        width: catObj.canvas_width || prev.canvas_config.width,
        height: catObj.canvas_height || prev.canvas_config.height,
        unit: catObj.unit || prev.canvas_config.unit,
        orientation: catObj.orientation || prev.canvas_config.orientation,
        bleed: catObj.bleed ?? prev.canvas_config.bleed,
        bleedUnit: catObj.bleedUnit || catObj.unit || prev.canvas_config.unit,
        safe_area: catObj.safe_area ?? prev.canvas_config.safe_area,
        safeAreaUnit: catObj.safeAreaUnit || catObj.unit || prev.canvas_config.unit,
        background_color: categoryBgColor || prev.canvas_config.background_color,
        supports_back_side: catObj.supports_back_side ?? prev.canvas_config.supports_back_side,
        side_mode: catObj.side_mode || (catObj.supports_back_side === false ? "single" : "double"),
        sides_count: catObj.sides_count || (catObj.side_mode === "single" ? 1 : 2),
        sides_names: catObj.sides_names && catObj.sides_names.length > 0 ? catObj.sides_names : ["Front Side", "Back Side"],
        guide_lines: catObj.guide_lines || [],
      },
      templateData: {
        ...prev.templateData,
        bgColor: categoryBgColor || prev.templateData.bgColor,
        logoText: catObj.default_template_data?.logoText ?? prev.templateData.logoText,
        logoSize: catObj.default_template_data?.logoSize ?? prev.templateData.logoSize,
        logoPosition: catObj.default_template_data?.logoPosition ?? prev.templateData.logoPosition,
        textLayers: categoryDefaultLayers ? JSON.parse(JSON.stringify(categoryDefaultLayers)) : prev.templateData.textLayers,
      },
    }));
  };

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories)) {
          setDbCategories(data.categories);
          if (mode === "create" && data.categories.length > 0) {
            let matchedCat = data.categories.find(
              (c: ApiCategoryItem) =>
                c._id === form.categoryId || c.name === form.category || c.slug === form.category
            );
            if (!matchedCat) matchedCat = data.categories[0];
            if (matchedCat) {
              applyCategoryObject(matchedCat);
            }
          }
        }
      })
      .catch(() => {});
  }, [mode]);

  const [activeLayerId, setActiveLayerId] = useState<string | null>("1");
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [thumbnailDragOver, setThumbnailDragOver] = useState(false);

  // 3D View Mode & Side Selection State
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [cardSide, setCardSide] = useState<"front" | "back">("front");
  const [activeSideIndex, setActiveSideIndex] = useState<number>(0);
  const [alignmentLines, setAlignmentLines] = useState<{ type: "v" | "h"; pos: number }[]>([]);

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveLayerId(id);
    setDraggingLayerId(id);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingLayerId || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    let x = Math.max(0, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
    let y = Math.max(0, Math.min(90, ((e.clientY - rect.top) / rect.height) * 100));

    // Canva-Style Smart Alignment & Snapping
    const activeLines: { type: "v" | "h"; pos: number }[] = [];
    const SNAP_TOLERANCE = 2.5;

    const targetXList = [50, 10, 90, ...form.templateData.textLayers.filter((l) => l.id !== draggingLayerId).map((l) => l.x)];
    for (const targetX of targetXList) {
      if (Math.abs(x - targetX) <= SNAP_TOLERANCE) {
        x = targetX;
        if (!activeLines.some((l) => l.type === "v" && l.pos === targetX)) {
          activeLines.push({ type: "v", pos: targetX });
        }
        break;
      }
    }

    const targetYList = [50, 10, 90, ...form.templateData.textLayers.filter((l) => l.id !== draggingLayerId).map((l) => l.y)];
    for (const targetY of targetYList) {
      if (Math.abs(y - targetY) <= SNAP_TOLERANCE) {
        y = targetY;
        if (!activeLines.some((l) => l.type === "h" && l.pos === targetY)) {
          activeLines.push({ type: "h", pos: targetY });
        }
        break;
      }
    }

    setAlignmentLines(activeLines);

    setForm((prev) => ({
      ...prev,
      templateData: {
        ...prev.templateData,
        textLayers: prev.templateData.textLayers.map((l) =>
          l.id === draggingLayerId ? { ...l, x, y } : l
        ),
      },
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingLayerId) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      setDraggingLayerId(null);
      setAlignmentLines([]);
    }
  };

  const addLayer = () => {
    const newId = Date.now().toString();
    const newLayer: TextLayer = {
      id: newId,
      text: "Custom Layer",
      x: 20,
      y: 40,
      fontSize: 14,
      color: "#ffffff",
      fontWeight: "normal",
    };
    setForm((prev) => ({
      ...prev,
      templateData: {
        ...prev.templateData,
        textLayers: [...prev.templateData.textLayers, newLayer],
      },
    }));
    setActiveLayerId(newId);
  };

  const updateLayer = (id: string, updates: Partial<TextLayer>) => {
    setForm((prev) => ({
      ...prev,
      templateData: {
        ...prev.templateData,
        textLayers: prev.templateData.textLayers.map((l) =>
          l.id === id ? { ...l, ...updates } : l
        ),
      },
    }));
  };

  const deleteLayer = (id: string) => {
    setForm((prev) => ({
      ...prev,
      templateData: {
        ...prev.templateData,
        textLayers: prev.templateData.textLayers.filter((l) => l.id !== id),
      },
    }));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  const processThumbnailFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setForm((prev) => ({ ...prev, thumbnail: e.target?.result as string }));
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setForm((prev) => ({ ...prev, thumbnail: data.url }));
      }
    } catch (err) {
      console.error("Failed to upload template thumbnail to S3:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Template title is required.");
      return;
    }

    setSaving(true);

    const priceNum = parseFloat(form.price || "0");
    const currentCategoryObj = dbCategories.find(
      (c) => c.name === form.category || c.slug === form.category || c._id === form.categoryId
    );

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      categoryId: currentCategoryObj?._id || form.categoryId,
      isPaid: priceNum > 0,
      price: priceNum,
      isActive: form.isActive,
      thumbnail: form.thumbnail,
      tags: typeof form.tags === "string" ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : form.tags,
      canvas_config: form.canvas_config,
      templateData: form.templateData,
      selectedVariations,
      variations: currentCategoryObj?.variations || [],
    };

    try {
      const url = mode === "create" ? "/api/admin/templates" : `/api/admin/templates/${templateId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? "Save failed.");

      router.push("/admin/templates");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const activeLayer = form.templateData.textLayers.find((l) => l.id === activeLayerId);

  // Dynamic canvas viewport sizing
  const canvasWidthNum = Number(form.canvas_config.width) || 105;
  const canvasHeightNum = Number(form.canvas_config.height) || 60;
  const canvasAspect = canvasWidthNum / canvasHeightNum;
  let stageW = 460;
  let stageH = Math.round(460 / canvasAspect);
  if (stageH > 440) {
    stageH = 440;
    stageW = Math.round(440 * canvasAspect);
  }

  const sidesList = form.canvas_config.sides_names && form.canvas_config.sides_names.length > 0
    ? form.canvas_config.sides_names
    : form.canvas_config.side_mode === "single"
    ? ["Front Side"]
    : ["Front Side", "Back Side"];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {mode === "create" ? "New Product Template" : "Edit Template"}
          </h1>
          <p className="text-zinc-500 text-base mt-0.5">
            {mode === "create" ? "Design a custom packaging box, T-shirt, mug, or card template according to category canvas" : "Update template design, category canvas dimensions, and fold line layout"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/templates")}
            className="px-4 py-2 text-base font-bold text-zinc-600 border border-zinc-200 rounded-xl hover:bg-white transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#e74b2d]/20 disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Saving..." : mode === "create" ? "Create Template" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-base font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ── Left: Settings Panel (4 cols) ──────────────────── */}
        <div className="xl:col-span-4 space-y-4">

          {/* Basic Info Box */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">Basic Info</h2>

            <div>
              <label className="text-base font-bold text-zinc-700 block mb-1">Template Title *</label>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Custom Packaging Box Pro"
                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
              />
            </div>

            <div>
              <label className="text-base font-bold text-zinc-700 block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Short description of this product template..."
                rows={2}
                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d] resize-none"
              />
            </div>

            <div>
              <label className="text-base font-bold text-zinc-700 block mb-1">Category *</label>
              <select
                required
                value={form.category}
                onChange={(e) => {
                  const newCatName = e.target.value;
                  const catObj = dbCategories.find((c) => c.name === newCatName || c.slug === newCatName || c._id === newCatName);
                  if (catObj) {
                    applyCategoryObject(catObj);
                  } else {
                    const slugKey = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                    const preset = PRODUCT_CANVAS_PRESETS[slugKey];
                    setForm((prev) => ({
                      ...prev,
                      category: newCatName,
                      canvas_config: preset
                        ? {
                            width: preset.width,
                            height: preset.height,
                            unit: preset.unit,
                            orientation: preset.orientation,
                            bleed: preset.bleed,
                            bleedUnit: preset.unit,
                            safe_area: preset.safe_area,
                            safeAreaUnit: preset.unit,
                            background_color: prev.templateData.bgColor,
                            supports_back_side: preset.supports_back_side,
                            side_mode: preset.side_mode,
                            sides_count: preset.sides_count,
                            sides_names: preset.sides_names,
                            guide_lines: preset.guide_lines,
                          }
                        : prev.canvas_config,
                    }));
                  }
                }}
                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d] cursor-pointer"
              >
                {(dbCategories.length > 0 ? dbCategories.map((c) => c.name) : TEMPLATE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-base font-bold text-zinc-700 block mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="packaging, box, apparel, custom"
                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
              />
            </div>
          </div>

          {/* Canvas Dimensions & Product Size Specifications Box */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">
                Category Canvas & Dieline Specs
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-[#e74b2d] uppercase font-mono">
                {form.canvas_config.side_mode || "DOUBLE"} MODE
              </span>
            </div>

            {/* Category Canvas Summary Badge */}
            <div className="p-3 bg-[#fbfaf7] border border-sky-100 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-zinc-800">
                <span>Canvas Size:</span>
                <span className="font-mono text-[#e74b2d]">{form.canvas_config.width} × {form.canvas_config.height} {form.canvas_config.unit}</span>
              </div>
              <div className="flex justify-between text-zinc-500 font-medium">
                <span>Bleed / Safe Area:</span>
                <span>{form.canvas_config.bleed}{form.canvas_config.bleedUnit || form.canvas_config.unit} / {form.canvas_config.safe_area}{form.canvas_config.safeAreaUnit || form.canvas_config.unit}</span>
              </div>
              <div className="flex justify-between text-zinc-500 font-medium">
                <span>Sides / Panels:</span>
                <span className="font-bold text-zinc-700">{sidesList.length} Panels ({sidesList.join(", ")})</span>
              </div>
              {form.canvas_config.guide_lines && form.canvas_config.guide_lines.length > 0 && (
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span>Fold Lines:</span>
                  <span className="font-bold text-sky-700">{form.canvas_config.guide_lines.length} Lines configured</span>
                </div>
              )}
            </div>

            {/* Quick Category Presets */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-2">Quick Product Preset</label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PRODUCT_CANVAS_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        canvas_config: {
                          ...prev.canvas_config,
                          width: preset.width,
                          height: preset.height,
                          unit: preset.unit,
                          orientation: preset.orientation,
                          bleed: preset.bleed,
                          safe_area: preset.safe_area,
                          supports_back_side: preset.supports_back_side,
                          side_mode: preset.side_mode,
                          sides_count: preset.sides_count,
                          sides_names: preset.sides_names,
                          guide_lines: preset.guide_lines,
                        },
                      }));
                    }}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all text-left cursor-pointer ${
                      form.canvas_config.width === preset.width && form.canvas_config.height === preset.height
                        ? "bg-[#e74b2d] text-white border-[#e74b2d] shadow-xs"
                        : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-400"
                    }`}
                  >
                    <span className="block truncate">{preset.name}</span>
                    <span className="text-[10px] opacity-80 font-mono">
                      {preset.width} × {preset.height} {preset.unit}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Canvas Dimensions Form Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Width</label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={form.canvas_config.width}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      canvas_config: { ...prev.canvas_config, width: Number(e.target.value) || 1 },
                    }))
                  }
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-1.5 text-sm font-mono text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Height</label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={form.canvas_config.height}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      canvas_config: { ...prev.canvas_config, height: Number(e.target.value) || 1 },
                    }))
                  }
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-1.5 text-sm font-mono text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Unit</label>
                <select
                  value={form.canvas_config.unit}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      canvas_config: {
                        ...prev.canvas_config,
                        unit: e.target.value as "mm" | "cm" | "in" | "px",
                        bleedUnit: e.target.value as any,
                        safeAreaUnit: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d] cursor-pointer"
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                  <option value="px">px</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Orientation</label>
                <select
                  value={form.canvas_config.orientation}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      canvas_config: {
                        ...prev.canvas_config,
                        orientation: e.target.value as "landscape" | "portrait",
                      },
                    }))
                  }
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d] cursor-pointer"
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>
            </div>
          </div>

          {/* Template Variations & Spec Defaults Box */}
          {(() => {
            const currentCat = dbCategories.find(
              (c) => c.name === form.category || c.slug === form.category || c._id === form.categoryId
            );
            if (!currentCat?.variations?.length) return null;

            return (
              <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#e74b2d] uppercase tracking-wider">
                    Template Variations & Defaults
                  </h2>
                  <span className="text-base text-zinc-400 font-medium">Pre-select specs</span>
                </div>

                {currentCat.variations.map((v) => (
                  <div key={v.name} className="space-y-1">
                    <label className="text-base font-bold text-zinc-700 block mb-1">
                      {v.name}
                    </label>
                    <select
                      value={selectedVariations[v.name] || v.values[0]?.name || ""}
                      onChange={(e) =>
                        setSelectedVariations((prev) => ({
                          ...prev,
                          [v.name]: e.target.value,
                        }))
                      }
                      className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d] cursor-pointer font-medium"
                    >
                      {v.values.map((val) => (
                        <option key={val.name} value={val.name}>
                          {val.name} {val.price > 0 ? `(+$${val.price.toFixed(2)})` : "(Included)"}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Pricing & Status Box */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">Pricing & Status</h2>

            <div>
              <label className="text-base font-bold text-zinc-700 block mb-1">Price (USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-base">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl pl-8 pr-4 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                />
              </div>
              <p className="text-base text-zinc-500 mt-1.5 font-medium">
                {parseFloat(form.price || "0") > 0 ? (
                  <span className="text-amber-600">📦 This is a <strong>paid</strong> template</span>
                ) : (
                  <span className="text-emerald-600">✓ This is a <strong>free</strong> template</span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-zinc-900">Active</p>
                <p className="text-base text-zinc-400">Visible to customers on browse designs</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${form.isActive ? "bg-[#e74b2d]" : "bg-zinc-300"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isActive ? "left-5.5" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Thumbnail Upload Box */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 space-y-3 shadow-xs">
            <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">Thumbnail</h2>
            <div
              onClick={() => thumbnailRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setThumbnailDragOver(true); }}
              onDragLeave={() => setThumbnailDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setThumbnailDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processThumbnailFile(file);
              }}
              className={`relative w-full aspect-[3/2] rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden bg-[#fbfaf7] ${
                thumbnailDragOver ? "border-[#e74b2d] bg-sky-50" : "border-zinc-200 hover:border-[#e74b2d]"
              }`}
            >
              {form.thumbnail ? (
                <img src={form.thumbnail} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
              ) : (
                <div className="text-center">
                  <svg className="w-7 h-7 text-zinc-400 mx-auto mb-1.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-base text-zinc-400 font-semibold">Click or drag to upload thumbnail</p>
                </div>
              )}
            </div>
            {form.thumbnail && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, thumbnail: "" }))}
                className="text-base text-red-500 font-bold hover:underline cursor-pointer"
              >
                Remove thumbnail
              </button>
            )}
            <input ref={thumbnailRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processThumbnailFile(f); }} />
          </div>

          {/* Design Settings Box */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">Canvas Design</h2>

            {/* Background Color */}
            <div>
              <label className="text-base font-bold text-zinc-700 block mb-2">Background Color</label>
              <div className="flex flex-wrap gap-2">
                {BG_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, templateData: { ...prev.templateData, bgColor: c.value } }))}
                    title={c.label}
                    className={`w-7 h-7 rounded-lg border-2 transition-all cursor-pointer ${form.templateData.bgColor === c.value ? "border-[#e74b2d] scale-110 shadow-sm" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
                <div className="relative">
                  <input
                    type="color"
                    value={form.templateData.bgColor}
                    onChange={(e) => setForm((prev) => ({ ...prev, templateData: { ...prev.templateData, bgColor: e.target.value } }))}
                    className="w-7 h-7 rounded-lg cursor-pointer border-2 border-zinc-200 bg-transparent"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>

            {/* Logo Text & Position */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Logo Text</label>
                <input
                  type="text"
                  maxLength={3}
                  value={form.templateData.logoText}
                  onChange={(e) => setForm((prev) => ({ ...prev, templateData: { ...prev.templateData, logoText: e.target.value } }))}
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                />
              </div>
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Logo Position</label>
                <select
                  value={form.templateData.logoPosition}
                  onChange={(e) => setForm((prev) => ({ ...prev, templateData: { ...prev.templateData, logoPosition: e.target.value as "top-right" | "top-left" | "center" | "bottom-right" } }))}
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base font-semibold text-zinc-900 focus:outline-none focus:border-[#e74b2d] cursor-pointer"
                >
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="center">Center</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>
            </div>

            {/* Logo Size / Width Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-base font-bold text-zinc-700 block">Logo Size / Width</label>
                <span className="text-base font-mono font-bold text-[#e74b2d]">{form.templateData.logoSize || 28}px</span>
              </div>
              <input
                type="range"
                min={16}
                max={120}
                value={form.templateData.logoSize || 28}
                onChange={(e) => setForm((prev) => ({ ...prev, templateData: { ...prev.templateData, logoSize: Number(e.target.value) } }))}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#e74b2d]"
              />
            </div>
          </div>

          {/* Active Text Layer Editor */}
          {activeLayer && (
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">Edit Text Layer</h2>
                <button
                  type="button"
                  onClick={() => deleteLayer(activeLayer.id)}
                  className="text-base text-red-500 font-bold hover:underline cursor-pointer"
                >
                  Delete
                </button>
              </div>

              <input
                type="text"
                value={activeLayer.text}
                onChange={(e) => updateLayer(activeLayer.id, { text: e.target.value })}
                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                placeholder="Layer text"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-base text-zinc-500 font-bold block mb-1">Font Size</label>
                  <input
                    type="number"
                    min={8}
                    max={60}
                    value={activeLayer.fontSize}
                    onChange={(e) => updateLayer(activeLayer.id, { fontSize: Number(e.target.value) })}
                    className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-lg px-2 py-1.5 text-base text-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-base text-zinc-500 font-bold block mb-1">Color</label>
                  <input
                    type="color"
                    value={activeLayer.color}
                    onChange={(e) => updateLayer(activeLayer.id, { color: e.target.value })}
                    className="w-full h-[30px] rounded-lg cursor-pointer bg-[#fbfaf7] border border-zinc-200"
                  />
                </div>
              </div>

              <TextStyleControls
                layer={activeLayer}
                accent="#e74b2d"
                onChange={(patch) => updateLayer(activeLayer.id, patch)}
              />
            </div>
          )}

          <button
            type="button"
            onClick={addLayer}
            className="w-full py-2.5 rounded-2xl border border-dashed border-zinc-300 text-base font-bold text-zinc-600 hover:bg-white hover:border-[#e74b2d] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5 text-[#e74b2d]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Text Layer
          </button>
        </div>

        {/* ── Right: Live Canvas & 3D Preview (8 cols) ──────────────── */}
        <div className="xl:col-span-8 space-y-4">
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 space-y-4 sticky top-6 shadow-xs">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Category Template Canvas & 3D Preview</span>
                  <span className="font-mono text-xs text-[#e74b2d] bg-sky-50 px-2 py-0.5 rounded-md font-bold">
                    {canvasWidthNum} × {canvasHeightNum} {form.canvas_config.unit}
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Template renders according to category fold lines, safe area, and realistic 3D perspective.
                </p>
              </div>

              {/* View Mode Pills */}
              <div className="inline-flex p-1 bg-zinc-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode("3d")}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    viewMode === "3d" ? "bg-zinc-900 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  ✨ 3D Realistic View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("2d")}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    viewMode === "2d" ? "bg-[#e74b2d] text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  ✏️ 2D Drag & Edit
                </button>
              </div>
            </div>

            {/* Sides / Panels Switcher Tabs */}
            {sidesList.length > 1 && (
              <div className="flex items-center gap-2 p-1.5 bg-[#fbfaf7] border border-zinc-200/80 rounded-2xl overflow-x-auto">
                <span className="text-xs font-bold text-zinc-400 px-2 uppercase tracking-wider">Panels:</span>
                {sidesList.map((sideName, idx) => (
                  <button
                    key={`panel-tab-${idx}`}
                    type="button"
                    onClick={() => {
                      setActiveSideIndex(idx);
                      const s = idx === 0 ? "front" : "back";
                      setCardSide(s);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      activeSideIndex === idx
                        ? "bg-[#e74b2d] text-white shadow-xs"
                        : "bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    {sideName}
                  </button>
                ))}
              </div>
            )}

            {/* Card Preview Viewport */}
            <div className="bg-[#111318] rounded-2xl p-4 border border-zinc-800 flex items-center justify-center min-h-[440px] relative overflow-hidden">
              {viewMode === "3d" ? (
                <div className="w-full h-[420px] relative">
                  <ThreeDCardPreview
                    bgColor={form.templateData.bgColor}
                    backBgColor={form.templateData.bgColor}
                    logoText={form.templateData.logoText}
                    logoImage={null}
                    logoPosition={form.templateData.logoPosition}
                    logoSize={form.templateData.logoSize || 28}
                    textLayers={form.templateData.textLayers}
                    sideIndex={activeSideIndex}
                    side={cardSide}
                    thickness="Standard"
                    corners="Rounded Corners"
                    name={form.title || "Template Preview"}
                    email="contact@company.com"
                    website="www.company.com"
                    onSideIndexChange={(idx) => {
                      setActiveSideIndex(idx);
                      setCardSide(idx === 1 ? "back" : "front");
                    }}
                    onSideChange={(s) => {
                      setCardSide(s);
                      setActiveSideIndex(s === "front" ? 0 : 1);
                    }}
                    canvasConfig={{
                      width: form.canvas_config.width,
                      height: form.canvas_config.height,
                      unit: form.canvas_config.unit,
                      orientation: form.canvas_config.orientation,
                      bleed: form.canvas_config.bleed,
                      bleedUnit: form.canvas_config.bleedUnit,
                      safe_area: form.canvas_config.safe_area,
                      safeAreaUnit: form.canvas_config.safeAreaUnit,
                      supports_back_side: form.canvas_config.supports_back_side,
                      side_mode: form.canvas_config.side_mode,
                      sides_count: form.canvas_config.sides_count,
                      sides_names: form.canvas_config.sides_names,
                    }}
                    previewWidth={stageW}
                    previewHeight={stageH}
                    cardLayout={ADMIN_LAYOUT}
                    textColor={form.templateData.textColor}
                    cornerRadius={12}
                  />
                </div>
              ) : (
                /* 2D Drag & Edit Canvas */
                <div className="w-full flex items-center justify-center py-6">
                  <div
                    ref={cardRef}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className="relative rounded-xl shadow-2xl overflow-hidden select-none border-2 border-red-500/80"
                    style={{ width: stageW, height: stageH, backgroundColor: form.templateData.bgColor }}
                  >
                    {/* Safety Area Overlay Guide */}
                    {form.canvas_config.safe_area > 0 && (
                      <div className="absolute inset-3 border border-dashed border-emerald-400/80 pointer-events-none z-10 flex items-start justify-end p-1">
                        <span className="text-[9px] font-bold text-emerald-400 bg-black/60 px-1 rounded">
                          Safe Area ({form.canvas_config.safe_area}{form.canvas_config.safeAreaUnit || form.canvas_config.unit})
                        </span>
                      </div>
                    )}
                    {/* Bleed Tag */}
                    {form.canvas_config.bleed > 0 && (
                      <div className="absolute top-1 left-1 pointer-events-none z-10">
                        <span className="text-[9px] font-bold text-red-400 bg-black/60 px-1 rounded">
                          Bleed ({form.canvas_config.bleed}{form.canvas_config.bleedUnit || form.canvas_config.unit})
                        </span>
                      </div>
                    )}

                    {/* Category Fold Lines / Dieline Guides */}
                    {form.canvas_config.guide_lines?.map((line) => {
                      const pos = line.unit === "percent" ? line.position : Math.min(100, Math.max(0, (line.position / canvasWidthNum) * 100));
                      const lineStyle = line.lineType === "score" ? "dotted" : line.lineType === "cut" ? "solid" : "dashed";

                      if (line.orientation === "vertical") {
                        return (
                          <div
                            key={line.id}
                            className="absolute top-0 bottom-0 pointer-events-none z-15 flex flex-col items-center"
                            style={{
                              left: `${pos}%`,
                              borderLeft: `2px ${lineStyle} ${line.color || "#f88768"}`,
                            }}
                          >
                            <span
                              className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow z-20 mt-1.5 whitespace-nowrap opacity-90"
                              style={{ backgroundColor: line.color || "#f88768" }}
                            >
                              {line.name} ({pos.toFixed(1)}%)
                            </span>
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={line.id}
                            className="absolute left-0 right-0 pointer-events-none z-15 flex items-center"
                            style={{
                              top: `${pos}%`,
                              borderTop: `2px ${lineStyle} ${line.color || "#f88768"}`,
                            }}
                          >
                            <span
                              className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow z-20 ml-1.5 whitespace-nowrap opacity-90"
                              style={{ backgroundColor: line.color || "#d97706" }}
                            >
                              {line.name} ({pos.toFixed(1)}%)
                            </span>
                          </div>
                        );
                      }
                    })}

                    {/* Canva-Style Smart Alignment Guide Lines */}
                    {alignmentLines.map((line, idx) => (
                      <div
                        key={idx}
                        className={`absolute pointer-events-none z-30 transition-all ${
                          line.type === "v"
                            ? "top-0 bottom-0 w-[1.5px] bg-[#f88768] shadow-[0_0_8px_#f88768]"
                            : "left-0 right-0 h-[1.5px] bg-[#f88768] shadow-[0_0_8px_#f88768]"
                        }`}
                        style={
                          line.type === "v"
                            ? { left: `${line.pos}%` }
                            : { top: `${line.pos}%` }
                        }
                      />
                    ))}

                    {/* Logo */}
                    {form.templateData.logoText && (
                      <div
                        className={`absolute flex items-center justify-center font-bold text-white rounded-md z-10 ${
                          form.templateData.logoPosition === "top-right" ? "top-4 right-4" :
                          form.templateData.logoPosition === "top-left" ? "top-4 left-4" :
                          form.templateData.logoPosition === "bottom-right" ? "bottom-4 right-4" :
                          "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        }`}
                        style={{
                          width: form.templateData.logoSize,
                          height: form.templateData.logoSize,
                          fontSize: form.templateData.logoSize * 0.4,
                          backgroundColor: "#e74b2d",
                        }}
                      >
                        {form.templateData.logoText}
                      </div>
                    )}

                    {/* Text Layers */}
                    {form.templateData.textLayers.map((layer) => (
                      <span
                        key={layer.id}
                        onPointerDown={(e) => handlePointerDown(layer.id, e)}
                        className={`absolute cursor-move z-20 touch-none px-1 rounded ${
                          activeLayerId === layer.id ? "outline outline-2 outline-[#e74b2d] outline-offset-1" : ""
                        }`}
                        style={{
                          ...textLayerDomStyle(layer, ADMIN_LAYOUT),
                          userSelect: "none",
                          maxWidth: "90%",
                        }}
                      >
                        {layer.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Layer List */}
            <div className="space-y-1.5">
              <p className="text-base text-zinc-500 font-bold">Text Layers ({form.templateData.textLayers.length})</p>
              {form.templateData.textLayers.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setActiveLayerId(layer.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                    activeLayerId === layer.id ? "border-[#e74b2d] bg-sky-50" : "border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="text-base text-zinc-800 font-bold truncate flex-1">{layer.text}</span>
                  <span className="text-base text-zinc-400 font-mono shrink-0">{layer.fontSize}px</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
