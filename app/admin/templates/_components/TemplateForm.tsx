import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThreeDCardPreview from "@/components/ThreeDCardPreview";
import TextStyleControls from "@/components/TextStyleControls";
import { ADMIN_LAYOUT, textLayerDomStyle } from "@/lib/cardRender";
import { ICanvasGuideLine, SideMode } from "@/models/Category";
import { Badge, Card, CardHeader, Icon, Notice, PageHeader, buttonClass, cx, inputClass, labelClass } from "@/components/admin/ui";

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
      { id: "box_1", name: "Left Fold", orientation: "vertical", position: 25, unit: "percent", lineType: "fold", color: "#329AD4" },
      { id: "box_2", name: "Center Fold", orientation: "vertical", position: 50, unit: "percent", lineType: "fold", color: "#329AD4" },
      { id: "box_3", name: "Right Fold", orientation: "vertical", position: 75, unit: "percent", lineType: "fold", color: "#329AD4" },
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
      { id: "pbox_1", name: "Panel Divider 1", orientation: "vertical", position: 25, unit: "percent", lineType: "fold", color: "#329AD4" },
      { id: "pbox_2", name: "Panel Divider 2", orientation: "vertical", position: 50, unit: "percent", lineType: "fold", color: "#329AD4" },
      { id: "pbox_3", name: "Panel Divider 3", orientation: "vertical", position: 75, unit: "percent", lineType: "fold", color: "#329AD4" },
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
  { id: "2", text: "Manager", x: 10, y: 48, fontSize: 13, color: "#55b2e7", fontWeight: "normal" },
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
      <PageHeader
        icon="templates"
        back={{ href: "/admin/templates", label: "Back to templates" }}
        title={mode === "create" ? "New Product Template" : "Edit Template"}
        description={mode === "create" ? "Design a custom packaging box, T-shirt, mug, or card template according to category canvas" : "Update template design, category canvas dimensions, and fold line layout"}
      />

      {error && (
        <Notice tone="red" title="Could not save template">
          {error}
        </Notice>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ── Left: Settings Panel (4 cols) ──────────────────── */}
        <div className="xl:col-span-4 space-y-5">

          {/* Basic Info Box */}
          <Card>
            <CardHeader icon="pages" title="Basic Info" subtitle="Title, category and search tags" />
            <div className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Template Title <span className="text-rose-500">*</span></label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Custom Packaging Box Pro"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short description of this product template..."
                  rows={2}
                  className={cx(inputClass, "resize-none")}
                />
              </div>

              <div>
                <label className={labelClass}>Category <span className="text-rose-500">*</span></label>
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
                  className={cx(inputClass, "cursor-pointer font-medium")}
                >
                  {(dbCategories.length > 0 ? dbCategories.map((c) => c.name) : TEMPLATE_CATEGORIES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Tags <span className="font-normal text-zinc-400">(comma separated)</span></label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="packaging, box, apparel, custom"
                  className={inputClass}
                />
              </div>
            </div>
          </Card>

          {/* Canvas Dimensions & Product Size Specifications Box */}
          <Card>
            <CardHeader
              icon="grid"
              title="Canvas & Dieline Specs"
              subtitle="Inherited from the category"
              action={
                <span className="inline-flex items-center rounded-full bg-[#EAF5FB] px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-[#2884b8] ring-1 ring-inset ring-[#329AD4]/20 whitespace-nowrap">
                  {form.canvas_config.side_mode || "DOUBLE"} MODE
                </span>
              }
            />
            <div className="p-5 space-y-4">
              {/* Category Canvas Summary Badge */}
              <div className="p-3.5 bg-[#f0f8fd] border border-[#dbeefb] rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between gap-3 font-semibold text-zinc-800">
                  <span>Canvas Size</span>
                  <span className="font-mono text-[#2884b8]">{form.canvas_config.width} × {form.canvas_config.height} {form.canvas_config.unit}</span>
                </div>
                <div className="flex justify-between gap-3 text-zinc-500">
                  <span>Bleed / Safe Area</span>
                  <span className="font-mono">{form.canvas_config.bleed}{form.canvas_config.bleedUnit || form.canvas_config.unit} / {form.canvas_config.safe_area}{form.canvas_config.safeAreaUnit || form.canvas_config.unit}</span>
                </div>
                <div className="flex justify-between gap-3 text-zinc-500">
                  <span className="shrink-0">Sides / Panels</span>
                  <span className="font-semibold text-zinc-700 text-right">{sidesList.length} Panels ({sidesList.join(", ")})</span>
                </div>
                {form.canvas_config.guide_lines && form.canvas_config.guide_lines.length > 0 && (
                  <div className="flex justify-between gap-3 text-zinc-500">
                    <span>Fold Lines</span>
                    <span className="font-semibold text-[#1b5b80]">{form.canvas_config.guide_lines.length} Lines configured</span>
                  </div>
                )}
              </div>

              {/* Quick Category Presets */}
              <div>
                <label className={labelClass}>Quick Product Preset</label>
                <div className="grid grid-cols-2 gap-2">
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
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all text-left cursor-pointer ${
                        form.canvas_config.width === preset.width && form.canvas_config.height === preset.height
                          ? "bg-[#329AD4] text-white border-[#329AD4] shadow-sm shadow-[#329AD4]/25"
                          : "bg-white border-zinc-200 text-zinc-700 hover:border-[#b8e0f6] hover:bg-[#f0f8fd]"
                      }`}
                    >
                      <span className="block truncate">{preset.name}</span>
                      <span className="text-[10px] opacity-80 font-mono font-normal">
                        {preset.width} × {preset.height} {preset.unit}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Canvas Dimensions Form Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Width</label>
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
                    className={cx(inputClass, "font-mono")}
                  />
                </div>
                <div>
                  <label className={labelClass}>Height</label>
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
                    className={cx(inputClass, "font-mono")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Unit</label>
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
                    className={cx(inputClass, "cursor-pointer")}
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                    <option value="px">px</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Orientation</label>
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
                    className={cx(inputClass, "cursor-pointer")}
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Template Variations & Spec Defaults Box */}
          {(() => {
            const currentCat = dbCategories.find(
              (c) => c.name === form.category || c.slug === form.category || c._id === form.categoryId
            );
            if (!currentCat?.variations?.length) return null;

            return (
              <Card>
                <CardHeader icon="layers" title="Variations & Defaults" subtitle="Pre-select specs for this template" />
                <div className="p-5 space-y-4">
                  {currentCat.variations.map((v) => (
                    <div key={v.name}>
                      <label className={labelClass}>
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
                        className={cx(inputClass, "cursor-pointer")}
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
              </Card>
            );
          })()}

          {/* Pricing & Status Box */}
          <Card>
            <CardHeader icon="dollar" title="Pricing & Status" subtitle="Price and storefront visibility" />
            <div className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm pointer-events-none">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    className={cx(inputClass, "pl-8")}
                  />
                </div>
                <div className="mt-2">
                  {parseFloat(form.price || "0") > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/15"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />This is a <strong className="font-semibold">paid</strong> template</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />This is a <strong className="font-semibold">free</strong> template</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Active</p>
                  <p className="text-xs text-zinc-500">Visible to customers on browse designs</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  className={`w-10 h-5.5 shrink-0 rounded-full transition-colors relative cursor-pointer ${form.isActive ? "bg-[#329AD4]" : "bg-zinc-300"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isActive ? "left-5.5" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          </Card>

          {/* Thumbnail Upload Box */}
          <Card>
            <CardHeader
              icon="image"
              title="Thumbnail"
              subtitle="Shown on the browse designs grid"
              action={
                form.thumbnail ? (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, thumbnail: "" }))}
                    className={buttonClass("danger", "sm")}
                  >
                    <Icon name="trash" className="w-3.5 h-3.5" />
                    Remove
                  </button>
                ) : undefined
              }
            />
            <div className="p-5">
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
                className={`group relative w-full aspect-[3/2] rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
                  thumbnailDragOver ? "border-[#329AD4] bg-[#EAF5FB]" : "border-[#b8e0f6] bg-[#f0f8fd]/60 hover:border-[#329AD4] hover:bg-[#f0f8fd]"
                }`}
              >
                {form.thumbnail ? (
                  <>
                    <img src={form.thumbnail} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/45 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow">
                        <Icon name="upload" className="w-3.5 h-3.5" />
                        Replace image
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center px-4">
                    <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#329AD4] shadow-xs">
                      <Icon name="upload" className="w-5 h-5" />
                    </span>
                    <p className="text-sm font-semibold text-[#1b5b80]">Click or drag to upload thumbnail</p>
                    <p className="text-xs text-zinc-400 mt-0.5">PNG, JPG or WEBP</p>
                  </div>
                )}
              </div>
              <input ref={thumbnailRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processThumbnailFile(f); }} />
            </div>
          </Card>

          {/* Design Settings Box */}
          <Card>
            <CardHeader icon="sparkle" title="Canvas Design" subtitle="Background and logo placeholder" />
            <div className="p-5 space-y-4">
              {/* Background Color */}
              <div>
                <label className={labelClass}>Background Color</label>
                <div className="flex flex-wrap gap-2">
                  {BG_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, templateData: { ...prev.templateData, bgColor: c.value } }))}
                      title={c.label}
                      className={`w-8 h-8 rounded-lg border-2 ring-1 ring-zinc-200 transition-all cursor-pointer ${form.templateData.bgColor === c.value ? "border-[#329AD4] scale-110 shadow-sm" : "border-white hover:scale-105"}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                  <div className="relative">
                    <input
                      type="color"
                      value={form.templateData.bgColor}
                      onChange={(e) => setForm((prev) => ({ ...prev, templateData: { ...prev.templateData, bgColor: e.target.value } }))}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-dashed border-[#b8e0f6] bg-white p-0.5"
                      title="Custom color"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Text & Position */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Logo Text</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={form.templateData.logoText}
                    onChange={(e) => setForm((prev) => ({ ...prev, templateData: { ...prev.templateData, logoText: e.target.value } }))}
                    className={cx(inputClass, "font-semibold")}
                  />
                </div>
                <div>
                  <label className={labelClass}>Logo Position</label>
                  <select
                    value={form.templateData.logoPosition}
                    onChange={(e) => setForm((prev) => ({ ...prev, templateData: { ...prev.templateData, logoPosition: e.target.value as "top-right" | "top-left" | "center" | "bottom-right" } }))}
                    className={cx(inputClass, "cursor-pointer")}
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-700 block">Logo Size / Width</label>
                  <span className="text-xs font-mono font-semibold text-[#2884b8] bg-[#EAF5FB] px-2 py-0.5 rounded-md">{form.templateData.logoSize || 28}px</span>
                </div>
                <input
                  type="range"
                  min={16}
                  max={120}
                  value={form.templateData.logoSize || 28}
                  onChange={(e) => setForm((prev) => ({ ...prev, templateData: { ...prev.templateData, logoSize: Number(e.target.value) } }))}
                  className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#329AD4]"
                />
              </div>
            </div>
          </Card>

          {/* Active Text Layer Editor */}
          {activeLayer && (
            <Card>
              <CardHeader
                icon="edit"
                title="Edit Text Layer"
                subtitle="Selected layer on the canvas"
                action={
                  <button
                    type="button"
                    onClick={() => deleteLayer(activeLayer.id)}
                    className={buttonClass("danger", "sm")}
                  >
                    <Icon name="trash" className="w-3.5 h-3.5" />
                    Delete
                  </button>
                }
              />
              <div className="p-5 space-y-3">
                <input
                  type="text"
                  value={activeLayer.text}
                  onChange={(e) => updateLayer(activeLayer.id, { text: e.target.value })}
                  className={inputClass}
                  placeholder="Layer text"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Font Size</label>
                    <input
                      type="number"
                      min={8}
                      max={60}
                      value={activeLayer.fontSize}
                      onChange={(e) => updateLayer(activeLayer.id, { fontSize: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Color</label>
                    <input
                      type="color"
                      value={activeLayer.color}
                      onChange={(e) => updateLayer(activeLayer.id, { color: e.target.value })}
                      className="w-full h-[42px] rounded-xl cursor-pointer bg-white border border-zinc-200 p-1 shadow-xs"
                    />
                  </div>
                </div>

                <TextStyleControls
                  layer={activeLayer}
                  accent="#329AD4"
                  onChange={(patch) => updateLayer(activeLayer.id, patch)}
                />
              </div>
            </Card>
          )}

          <button
            type="button"
            onClick={addLayer}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-[#b8e0f6] bg-[#f0f8fd]/60 text-sm font-semibold text-[#2884b8] hover:bg-[#EAF5FB] hover:border-[#329AD4] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Icon name="plus" className="w-4 h-4" strokeWidth={2.4} />
            Add Text Layer
          </button>
        </div>

        {/* ── Right: Live Canvas & 3D Preview (8 cols) ──────────────── */}
        <div className="xl:col-span-8 space-y-4">
          <Card className="sticky top-6">
            <CardHeader
              icon="eye"
              title={
                <span className="flex flex-wrap items-center gap-2">
                  <span>Template Canvas & 3D Preview</span>
                  <span className="font-mono text-[11px] text-[#2884b8] bg-[#EAF5FB] px-2 py-0.5 rounded-md font-semibold">
                    {canvasWidthNum} × {canvasHeightNum} {form.canvas_config.unit}
                  </span>
                </span>
              }
              subtitle="Template renders according to category fold lines, safe area, and realistic 3D perspective."
              action={
                /* View Mode Pills */
                <div className="inline-flex shrink-0 p-1 bg-zinc-100/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode("3d")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      viewMode === "3d" ? "bg-white text-[#2884b8] shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    3D Realistic View
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("2d")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      viewMode === "2d" ? "bg-white text-[#2884b8] shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    2D Drag & Edit
                  </button>
                </div>
              }
            />
            <div className="p-5 sm:p-6 space-y-4">

            {/* Sides / Panels Switcher Tabs */}
            {sidesList.length > 1 && (
              <div className="flex items-center gap-1.5 p-1.5 bg-zinc-50 border border-zinc-200/70 rounded-xl overflow-x-auto">
                <span className="text-[11px] font-semibold text-zinc-400 px-2 uppercase tracking-wider">Panels</span>
                {sidesList.map((sideName, idx) => (
                  <button
                    key={`panel-tab-${idx}`}
                    type="button"
                    onClick={() => {
                      setActiveSideIndex(idx);
                      const s = idx === 0 ? "front" : "back";
                      setCardSide(s);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activeSideIndex === idx
                        ? "bg-[#329AD4] text-white shadow-sm shadow-[#329AD4]/25"
                        : "bg-white text-zinc-600 border border-zinc-200 hover:border-[#b8e0f6] hover:text-[#2884b8]"
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
                              borderLeft: `2px ${lineStyle} ${line.color || "#55b2e7"}`,
                            }}
                          >
                            <span
                              className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow z-20 mt-1.5 whitespace-nowrap opacity-90"
                              style={{ backgroundColor: line.color || "#55b2e7" }}
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
                              borderTop: `2px ${lineStyle} ${line.color || "#55b2e7"}`,
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
                            ? "top-0 bottom-0 w-[1.5px] bg-[#55b2e7] shadow-[0_0_8px_#55b2e7]"
                            : "left-0 right-0 h-[1.5px] bg-[#55b2e7] shadow-[0_0_8px_#55b2e7]"
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
                          backgroundColor: "#329AD4",
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
                          activeLayerId === layer.id ? "outline outline-2 outline-[#329AD4] outline-offset-1" : ""
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Text Layers</p>
                <Badge tone="brand">{form.templateData.textLayers.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {form.templateData.textLayers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setActiveLayerId(layer.id)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      activeLayerId === layer.id ? "border-[#329AD4] bg-[#f0f8fd] ring-2 ring-[#329AD4]/10" : "border-zinc-200 hover:border-[#b8e0f6] hover:bg-zinc-50"
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-md shrink-0 ring-1 ring-zinc-200"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span className="text-sm text-zinc-800 font-medium truncate flex-1">{layer.text}</span>
                    <span className="text-xs text-zinc-400 font-mono shrink-0">{layer.fontSize}px</span>
                  </button>
                ))}
              </div>
            </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-30 -mx-1 rounded-2xl border border-zinc-200/70 bg-white/85 backdrop-blur-md px-4 sm:px-5 py-3 shadow-[0_-6px_20px_-12px_rgba(27,91,128,0.25)]">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            {mode === "create" ? "Review the canvas preview, then create the template." : "Changes are applied once you save."}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/templates")}
              className={buttonClass("secondary")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={buttonClass("primary")}
            >
              {saving ? <span className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <Icon name="check" className="w-4 h-4" strokeWidth={2.2} />}
              {saving ? "Saving..." : mode === "create" ? "Create Template" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
