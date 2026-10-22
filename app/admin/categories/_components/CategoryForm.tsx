"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mediaSrc } from "@/lib/mediaUrl";
import { IVariation } from "@/models/Product";
import { PrintSize, asCanvasUnit, type CanvasUnit } from "@/lib/canvasUtils";
import { cleanGuideLines } from "@/lib/guideLines";
import {
  asCanvasType,
  cleanApparelColors,
  cleanApparelSizes,
  cleanDecorationMethods,
  cleanPrintArea,
  cleanPrintPlacements,
  DEFAULT_APPAREL_SIZES,
  DEFAULT_DECORATION_METHODS,
  DEFAULT_PRINT_AREA,
  DEFAULT_PRINT_PLACEMENTS,
  type ApparelColor,
  type ApparelSize,
  type CanvasType,
  type DecorationMethod,
  type PrintArea,
  type PrintPlacement,
} from "@/lib/mockupCanvas";
import { ICanvasGuideLine, SideMode } from "@/models/Category";
import { TextLayer } from "../../templates/_components/TemplateForm";
import ThreeDCardPreview from "@/components/ThreeDCardPreview";
import CanvasGuideLinesOverlay from "@/components/CanvasGuideLinesOverlay";
import MockupPrintAreaEditor from "@/components/admin/MockupPrintAreaEditor";
import AdminMediaLibraryModal from "@/components/admin/AdminMediaLibraryModal";

export interface FormCategoryVariationValue {
  _id?: string;
  name: string;
  image: string;
  price: string;
  description: string;
}

export interface FormCategoryVariation {
  _id?: string;
  name: string;
  required: boolean;
  values: FormCategoryVariationValue[];
}

export interface CategoryFormData {
  _id?: string;
  name: string;
  slug: string;
  description: string;
  price?: string;
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
  sortOrder: string;
  canvas_width: string;
  canvas_height: string;
  unit: "mm" | "cm" | "in" | "px";
  orientation: "landscape" | "portrait";
  bleed: string;
  bleedUnit: CanvasUnit;
  safe_area: string;
  safeAreaUnit: CanvasUnit;
  background_color: string;
  supports_back_side: boolean;
  side_mode?: SideMode;
  sides_count?: string;
  sides_names?: string[];
  guide_lines?: ICanvasGuideLine[];
  canvas_type?: CanvasType;
  mockup_image?: string;
  banner_image?: string;
  print_area?: PrintArea;
  print_placements?: PrintPlacement[];
  apparel_colors?: ApparelColor[];
  apparel_sizes?: ApparelSize[];
  decoration_methods?: DecorationMethod[];
  text_layers?: TextLayer[];
  default_template_data?: any;
  variations?: IVariation[];
  printSizes?: PrintSize[];
}

const PRESET_OPTIONS: Record<
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
    bg: string;
  }
> = {
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
    bg: "#18181b",
  },
  flyers: {
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
    bg: "#ffffff",
  },
  invitations: {
    name: "Invitations (5x7 in)",
    width: 127,
    height: 178,
    unit: "mm",
    orientation: "portrait",
    bleed: 3,
    safe_area: 4,
    supports_back_side: true,
    side_mode: "double",
    sides_count: 2,
    sides_names: ["Front", "Back"],
    guide_lines: [],
    bg: "#fafaf9",
  },
  brochures: {
    name: "Brochures (A4 Tri-fold)",
    width: 297,
    height: 210,
    unit: "mm",
    orientation: "landscape",
    bleed: 3,
    safe_area: 5,
    supports_back_side: true,
    side_mode: "multi",
    sides_count: 3,
    sides_names: ["Outside Front/Back", "Inside Spread", "Flap Panel"],
    guide_lines: [
      { id: "fold-1", name: "Left Panel Fold", orientation: "vertical", position: 33.33, unit: "percent", lineType: "fold", color: "#e74b2d" },
      { id: "fold-2", name: "Right Panel Fold", orientation: "vertical", position: 66.66, unit: "percent", lineType: "fold", color: "#e74b2d" },
    ],
    bg: "#ffffff",
  },
  "packaging-box": {
    name: "Packaging Box Net (4-Sides + Flaps)",
    width: 350,
    height: 250,
    unit: "mm",
    orientation: "landscape",
    bleed: 5,
    safe_area: 8,
    supports_back_side: true,
    side_mode: "multi",
    sides_count: 4,
    sides_names: ["Front Panel", "Right Side", "Back Panel", "Left Side"],
    guide_lines: [
      { id: "box-1", name: "Left Side Fold", orientation: "vertical", position: 25, unit: "percent", lineType: "fold", color: "#e74b2d" },
      { id: "box-2", name: "Center Spine Fold", orientation: "vertical", position: 50, unit: "percent", lineType: "fold", color: "#e74b2d" },
      { id: "box-3", name: "Right Side Fold", orientation: "vertical", position: 75, unit: "percent", lineType: "fold", color: "#e74b2d" },
      { id: "box-top", name: "Top Lid Fold", orientation: "horizontal", position: 25, unit: "percent", lineType: "score", color: "#d97706" },
      { id: "box-bottom", name: "Bottom Tuck Fold", orientation: "horizontal", position: 75, unit: "percent", lineType: "score", color: "#d97706" },
    ],
    bg: "#ffffff",
  },
  postcards: {
    name: "Postcards (A6)",
    width: 148,
    height: 105,
    unit: "mm",
    orientation: "landscape",
    bleed: 3,
    safe_area: 3,
    supports_back_side: true,
    side_mode: "double",
    sides_count: 2,
    sides_names: ["Front Side", "Back Side"],
    guide_lines: [],
    bg: "#ffffff",
  },
  posters: {
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
    bg: "#ffffff",
  },
  stickers: {
    name: "Stickers (Square)",
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
    bg: "#ffffff",
  },
  "t-shirts": {
    name: "T-Shirts (Print Area)",
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
    bg: "#18181b",
  },
  mugs: {
    name: "Mugs (Wrap Area)",
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
    bg: "#ffffff",
  },
};

interface CategoryFormProps {
  mode: "create" | "edit";
  categoryId?: string;
  initialData?: CategoryFormData;
}

export default function CategoryForm({ mode, categoryId, initialData }: CategoryFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingValImage, setUploadingValImage] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState<CategoryFormData>({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    description: initialData?.description ?? "",
    price: initialData?.price ?? "0.15",
    unitPrice: initialData?.unitPrice ?? "$0.15 each",
    image: initialData?.image ?? "",
    sortOrder: initialData?.sortOrder ?? "0",
    canvas_width: initialData?.canvas_width ?? "105",
    canvas_height: initialData?.canvas_height ?? "60",
    unit: initialData?.unit ?? "mm",
    orientation: initialData?.orientation ?? "landscape",
    bleed: initialData?.bleed ?? "3",
    bleedUnit: initialData?.bleedUnit ?? initialData?.unit ?? "mm",
    safe_area: initialData?.safe_area ?? "3",
    safeAreaUnit: initialData?.safeAreaUnit ?? initialData?.unit ?? "mm",
    background_color: initialData?.background_color ?? "#18181b",
    supports_back_side: initialData?.supports_back_side ?? true,
  });

  const [sideMode, setSideMode] = useState<SideMode>(() => {
    if (initialData?.side_mode) return initialData.side_mode;
    const count = Number(initialData?.sides_count);
    if (count > 2) return "multi";
    if (initialData?.supports_back_side === false || count === 1) return "single";
    return "double";
  });
  const [sidesCount, setSidesCount] = useState<number>(() => {
    const count = Number(initialData?.sides_count);
    if (Number.isFinite(count) && count > 0) return count;
    if (initialData?.side_mode === "single") return 1;
    if (initialData?.side_mode === "multi") return 3;
    return 2;
  });
  const [sidesNames, setSidesNames] = useState<string[]>(() => {
    if (initialData?.sides_names && initialData.sides_names.length > 0) {
      return initialData.sides_names;
    }
    if (initialData?.side_mode === "single") return ["Front Side"];
    if (initialData?.side_mode === "double") return ["Front Side", "Back Side"];
    return ["Side 1 / Panel A", "Side 2 / Panel B", "Side 3 / Panel C"];
  });
  const [guideLines, setGuideLines] = useState<ICanvasGuideLine[]>(() =>
    cleanGuideLines(initialData?.guide_lines || [])
  );
  const [canvasType, setCanvasType] = useState<CanvasType>(() =>
    asCanvasType(
      initialData?.canvas_type ||
        (cleanGuideLines(initialData?.guide_lines || []).length > 0 ? "dieline" : "flat"),
      "flat"
    )
  );
  const [mockupImage, setMockupImage] = useState(initialData?.mockup_image || "");
  const [bannerImage, setBannerImage] = useState(initialData?.banner_image || "");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [printArea, setPrintArea] = useState<PrintArea>(() =>
    cleanPrintArea(initialData?.print_area || DEFAULT_PRINT_AREA)
  );
  const [printPlacements, setPrintPlacements] = useState<PrintPlacement[]>(() => {
    const cleaned = cleanPrintPlacements(initialData?.print_placements || []);
    // New apparel categories start with Front only (Back is optional via toggle)
    if (!initialData?.print_placements?.length && asCanvasType(initialData?.canvas_type, "flat") === "mockup") {
      return [
        {
          id: "front",
          name: "Front",
          printArea: { ...DEFAULT_PRINT_AREA, label: "Front Print" },
        },
      ];
    }
    if (!initialData?.print_placements?.length) {
      return [
        {
          id: "front",
          name: "Front",
          printArea: { ...DEFAULT_PRINT_AREA, label: "Front Print" },
        },
      ];
    }
    return cleaned;
  });
  const [enableFront, setEnableFront] = useState(() => {
    const p = initialData?.print_placements;
    if (!Array.isArray(p) || !p.length) return true;
    return p.some((x: any) => x.id === "front" || String(x.name || "").toLowerCase() === "front");
  });
  const [enableBack, setEnableBack] = useState(() => {
    const p = initialData?.print_placements;
    if (!Array.isArray(p) || !p.length) return false;
    return p.some((x: any) => x.id === "back" || String(x.name || "").toLowerCase() === "back");
  });
  const [editSide, setEditSide] = useState<"front" | "back">("front");
  const [apparelColors, setApparelColors] = useState<ApparelColor[]>(() =>
    cleanApparelColors(initialData?.apparel_colors || [])
  );
  const [apparelSizes, setApparelSizes] = useState<ApparelSize[]>(() =>
    cleanApparelSizes(initialData?.apparel_sizes || DEFAULT_APPAREL_SIZES)
  );
  const [decorationMethods, setDecorationMethods] = useState<DecorationMethod[]>(() =>
    cleanDecorationMethods(initialData?.decoration_methods || DEFAULT_DECORATION_METHODS)
  );
  const [familyPicked, setFamilyPicked] = useState(mode === "edit" || Boolean(initialData?.canvas_type));
  const [uploadingMockup, setUploadingMockup] = useState(false);
  const [uploadingColorIdx, setUploadingColorIdx] = useState<number | null>(null);
  const [mediaPicker, setMediaPicker] = useState<null | {
    purpose: "mockup" | "color" | "layer" | "banner";
    colorIdx?: number;
    folder: string;
    currentUrl?: string;
    side?: "front" | "back";
  }>(null);

  const [textLayers, setTextLayers] = useState<TextLayer[]>(() => {
    if (initialData?.text_layers && initialData.text_layers.length > 0) return initialData.text_layers;
    if (initialData?.default_template_data?.textLayers && initialData.default_template_data.textLayers.length > 0) {
      return initialData.default_template_data.textLayers;
    }
    return [
      { id: "1", text: "Product Title / Header", x: 15, y: 30, fontSize: 22, color: "#ffffff", fontWeight: "bold", placementId: "front" },
      { id: "2", text: "Subtitle / Custom Text", x: 15, y: 50, fontSize: 13, color: "#f88768", fontWeight: "normal", placementId: "front" },
      { id: "3", text: "www.yourbrand.com", x: 15, y: 75, fontSize: 10, color: "#e4e4e7", fontWeight: "normal", placementId: "front" },
    ];
  });

  const [logoText, setLogoText] = useState<string>(
    initialData?.default_template_data?.logoText ?? "LOGO"
  );
  const [logoSize, setLogoSize] = useState<number>(
    initialData?.default_template_data?.logoSize ?? 28
  );
  const [logoPosition, setLogoPosition] = useState<"top-right" | "top-left" | "center" | "bottom-right">(
    initialData?.default_template_data?.logoPosition ?? "top-right"
  );
  const [activeLayerId, setActiveLayerId] = useState<string | null>("1");
  const [previewMode, setPreviewMode] = useState<"2d" | "3d">("2d");
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<"3d" | "2d">("3d");
  const [uploadingLayerImage, setUploadingLayerImage] = useState(false);
  const layerImageInputRef = useRef<HTMLInputElement>(null);

  const addTextLayer = () => {
    const newId = Date.now().toString();
    const newLayer: TextLayer = {
      id: newId,
      type: "text",
      text: "Add Text",
      x: 50,
      y: 40,
      fontSize: 14,
      color: canvasType === "mockup" ? "#111111" : "#ffffff",
      fontWeight: "normal",
      placementId: canvasType === "mockup" ? editSide : undefined,
    };
    setTextLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newId);
  };

  const addTextLayerAt = (x: number, y: number) => {
    const newId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Date.now().toString();
    const newLayer: TextLayer = {
      id: newId,
      type: "text",
      text: "Your Text",
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      fontSize: 18,
      color: "#111111",
      fontWeight: "bold",
      placementId: editSide,
    };
    setTextLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newId);
  };

  const handleLayerImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingLayerImage(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "category-mockup-layers");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error(data.message || "Failed to upload image");
      }
      const newId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Date.now().toString();
      const newLayer: TextLayer = {
        id: newId,
        type: "image",
        text: "Logo",
        src: data.url,
        x: 50,
        y: 55,
        fontSize: 14,
        color: "#111111",
        fontWeight: "normal",
        width: 36,
        height: 36,
        placementId: editSide,
      };
      setTextLayers((prev) => [...prev, newLayer]);
      setActiveLayerId(newId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload layer image");
    } finally {
      setUploadingLayerImage(false);
    }
  };

  const handleMockupUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingMockup(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "category-mockups");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error(data.message || "Failed to upload mockup image");
      }
      setMockupImage(data.url);
      setCanvasType("mockup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload mockup image");
    } finally {
      setUploadingMockup(false);
    }
  };

  const handleColorMockupUpload = async (idx: number, file: File | null) => {
    if (!file) return;
    setUploadingColorIdx(idx);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "category-color-mockups");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error(data.message || "Failed to upload color mockup");
      }
      setApparelColors((prev) =>
        prev.map((c, i) => (i === idx ? { ...c, mockupImage: data.url } : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload color mockup");
    } finally {
      setUploadingColorIdx(null);
    }
  };

  const updateTextLayer = (id: string, field: keyof TextLayer, value: any) => {
    setTextLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, [field]: value } : layer))
    );
  };

  const removeTextLayer = (id: string) => {
    setTextLayers((prev) => prev.filter((l) => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  // Sync once when editing a different category (avoid resetting while typing)
  useEffect(() => {
    if (!initialData?._id) return;
    if (initialData.side_mode) setSideMode(initialData.side_mode);
    else if (Number(initialData.sides_count) > 2) setSideMode("multi");
    if (initialData.sides_count) setSidesCount(Number(initialData.sides_count));
    if (initialData.sides_names && initialData.sides_names.length > 0) setSidesNames(initialData.sides_names);
    if (initialData.guide_lines) setGuideLines(cleanGuideLines(initialData.guide_lines));
    if (initialData.canvas_type) setCanvasType(asCanvasType(initialData.canvas_type, "flat"));
    else if (cleanGuideLines(initialData.guide_lines || []).length > 0) setCanvasType("dieline");
    if (initialData.mockup_image !== undefined) setMockupImage(initialData.mockup_image || "");
    if (initialData.banner_image !== undefined) setBannerImage(initialData.banner_image || "");
    if (initialData.print_area) setPrintArea(cleanPrintArea(initialData.print_area));
    if (initialData.print_placements) {
      const places = cleanPrintPlacements(initialData.print_placements);
      setPrintPlacements(places);
      const hasFront = places.some((p) => p.id === "front" || p.name.toLowerCase() === "front");
      const hasBack = places.some((p) => p.id === "back" || p.name.toLowerCase() === "back");
      setEnableFront(hasFront || (!hasFront && !hasBack));
      setEnableBack(hasBack);
      if (hasBack && !hasFront) setEditSide("back");
    }
    if (initialData.apparel_colors) setApparelColors(cleanApparelColors(initialData.apparel_colors));
    if (initialData.apparel_sizes) setApparelSizes(cleanApparelSizes(initialData.apparel_sizes));
    if (initialData.decoration_methods) {
      setDecorationMethods(cleanDecorationMethods(initialData.decoration_methods));
    }
    if (initialData.canvas_type) setFamilyPicked(true);
    if (initialData.text_layers && initialData.text_layers.length > 0) {
      setTextLayers(initialData.text_layers);
    } else if (initialData.default_template_data?.textLayers) {
      setTextLayers(initialData.default_template_data.textLayers);
    }
    if (initialData.default_template_data?.logoText) setLogoText(initialData.default_template_data.logoText);
    if (initialData.default_template_data?.logoSize) setLogoSize(initialData.default_template_data.logoSize);
    if (initialData.default_template_data?.logoPosition) setLogoPosition(initialData.default_template_data.logoPosition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?._id]);

  const [printSizes, setPrintSizes] = useState<PrintSize[]>(() => initialData?.printSizes || []);
  const [galleryImages, setGalleryImages] = useState<string[]>(() => initialData?.galleryImages || []);
  const [featureStory, setFeatureStory] = useState({
    title: initialData?.featureStory?.title || "",
    bullets: initialData?.featureStory?.bullets || "",
    sections: initialData?.featureStory?.sections?.length
      ? initialData.featureStory.sections
      : [{ heading: "", body: "" }],
    images: initialData?.featureStory?.images || [],
    relatedTitle: initialData?.featureStory?.relatedTitle || "",
  });
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [variations, setVariations] = useState<FormCategoryVariation[]>(() => {
    if (initialData?.variations && initialData.variations.length > 0) {
      return initialData.variations.map((v) => ({
        _id: v._id,
        name: v.name,
        required: v.required ?? true,
        values: (v.values || []).map((val) => ({
          _id: val._id,
          name: val.name,
          image: val.image ?? "",
          price: String(val.price ?? 0),
          description: val.description ?? "",
        })),
      }));
    }
    return [];
  });

  // Keep sidesNames array length in sync when sidesCount changes
  const handleSidesCountChange = (count: number) => {
    const newCount = Math.max(1, count);
    setSidesCount(newCount);
    setSidesNames((prev) => {
      const next = [...prev];
      if (next.length < newCount) {
        for (let i = next.length; i < newCount; i++) {
          next.push(`Side ${i + 1} / Panel ${String.fromCharCode(65 + i)}`);
        }
      } else if (next.length > newCount) {
        return next.slice(0, newCount);
      }
      return next;
    });
  };

  const handleSideModeChange = (mode: SideMode) => {
    setSideMode(mode);
    if (mode === "single") {
      setForm((prev) => ({ ...prev, supports_back_side: false }));
      setSidesCount(1);
      setSidesNames(["Front Side"]);
    } else if (mode === "double") {
      setForm((prev) => ({ ...prev, supports_back_side: true }));
      setSidesCount(2);
      setSidesNames(["Front Side", "Back Side"]);
    } else {
      setForm((prev) => ({ ...prev, supports_back_side: true }));
      const count = sidesCount < 3 ? 3 : sidesCount;
      setSidesCount(count);
      setSidesNames((prev) => {
        if (prev.length >= 3) return prev;
        return ["Side 1 / Panel A", "Side 2 / Panel B", "Side 3 / Panel C"];
      });
    }
  };

  // Guide Lines Helpers
  const addGuideLine = (orientation: "vertical" | "horizontal" = "vertical") => {
    const newId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `line_${crypto.randomUUID()}`
        : `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setGuideLines((prev) => [
      ...prev,
      {
        id: newId,
        name: orientation === "vertical" ? `Vertical Fold ${prev.length + 1}` : `Horizontal Fold ${prev.length + 1}`,
        orientation,
        position: orientation === "vertical" ? 33.33 : 50,
        unit: "percent",
        lineType: "fold",
        color: "#e74b2d",
      },
    ]);
  };

  const updateGuideLine = (id: string, field: keyof ICanvasGuideLine, value: any) => {
    setGuideLines((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        if (field === "position") {
          const next = Number(value);
          return { ...g, position: Number.isFinite(next) ? next : g.position };
        }
        if (field === "unit") {
          return { ...g, unit: value === "%" ? "percent" : value };
        }
        return { ...g, [field]: value };
      })
    );
  };

  const removeGuideLine = (id: string) => {
    setGuideLines((prev) => prev.filter((g) => g.id !== id));
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    setError("");
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const body = new FormData();
        body.append("file", files[i]);
        body.append("folder", "category-gallery");
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const data = await res.json();
        if (data.success && data.url) {
          uploadedUrls.push(data.url);
        }
      }
      setGalleryImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err: unknown) {
      setError("Failed to upload gallery images");
    } finally {
      setUploadingGallery(false);
    }
  };

  const addGalleryUrl = () => {
    setGalleryImages((prev) => [...prev, ""]);
  };

  const updateGalleryUrl = (idx: number, url: string) => {
    setGalleryImages((prev) => {
      const next = [...prev];
      next[idx] = url;
      return next;
    });
  };

  const removeGalleryImage = (idx: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const applyPreset = (presetKey: string) => {
    const preset = PRESET_OPTIONS[presetKey];
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || preset.name,
      slug: prev.slug || generateSlug(preset.name),
      canvas_width: String(preset.width),
      canvas_height: String(preset.height),
      unit: preset.unit,
      orientation: preset.orientation,
      bleed: String(preset.bleed),
      safe_area: String(preset.safe_area),
      supports_back_side: preset.supports_back_side,
      background_color: preset.bg,
    }));
    if (preset.side_mode) handleSideModeChange(preset.side_mode);
    if (preset.sides_count) handleSidesCountChange(preset.sides_count);
    if (preset.sides_names) setSidesNames(preset.sides_names);
    if (Array.isArray(preset.guide_lines)) setGuideLines(cleanGuideLines(preset.guide_lines));
  };

  const applyTriFoldPreset = () => {
    setCanvasType("dieline");
    applyPreset("brochures");
  };

  const applyHalfFoldPreset = () => {
    setCanvasType("dieline");
    handleSideModeChange("double");
    setSidesCount(2);
    setSidesNames(["Front Cover", "Back Cover"]);
    setGuideLines([
      { id: "half_1", name: "Center Spine Fold", orientation: "vertical", position: 50, unit: "percent", lineType: "fold", color: "#e74b2d" },
    ]);
  };

  const applyBoxNetPreset = () => {
    setCanvasType("dieline");
    applyPreset("packaging-box");
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingImage(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "categories");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error(data.message || "Failed to upload category image.");
      }
      setForm((prev) => ({ ...prev, image: data.url }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload category image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleBannerUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingBanner(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "category-banners");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error(data.message || "Failed to upload banner image.");
      }
      setBannerImage(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload banner image.");
    } finally {
      setUploadingBanner(false);
    }
  };

  // Variations helpers
  const addVariation = () => {
    setVariations((prev) => [
      ...prev,
      {
        name: "",
        required: true,
        values: [{ name: "Standard", image: "", price: "0", description: "" }],
      },
    ]);
  };

  const removeVariation = (varIdx: number) => {
    setVariations((prev) => prev.filter((_, idx) => idx !== varIdx));
  };

  const updateVariationField = (varIdx: number, field: keyof FormCategoryVariation, value: unknown) => {
    setVariations((prev) => {
      const next = [...prev];
      next[varIdx] = { ...next[varIdx], [field]: value };
      return next;
    });
  };

  const addVariationValue = (varIdx: number) => {
    setVariations((prev) => {
      const next = [...prev];
      const currentValues = next[varIdx].values;
      next[varIdx] = {
        ...next[varIdx],
        values: [...currentValues, { name: "", image: "", price: "0", description: "" }],
      };
      return next;
    });
  };

  const removeVariationValue = (varIdx: number, valIdx: number) => {
    setVariations((prev) => {
      const next = [...prev];
      next[varIdx] = {
        ...next[varIdx],
        values: next[varIdx].values.filter((_, idx) => idx !== valIdx),
      };
      return next;
    });
  };

  const updateVariationValue = (
    varIdx: number,
    valIdx: number,
    field: keyof FormCategoryVariationValue,
    value: string
  ) => {
    setVariations((prev) => {
      const next = [...prev];
      const currentValues = [...next[varIdx].values];
      currentValues[valIdx] = { ...currentValues[valIdx], [field]: value };
      next[varIdx] = { ...next[varIdx], values: currentValues };
      return next;
    });
  };

  const handleValueImageUpload = async (
    varIdx: number,
    valIdx: number,
    file: File | null
  ) => {
    if (!file) return;
    const key = `${varIdx}-${valIdx}`;
    setUploadingValImage(key);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "category-variations");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (data.success && data.url) {
        updateVariationValue(varIdx, valIdx, "image", data.url);
      } else {
        setError(data.message || "Failed to upload variation image");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload variation image");
    } finally {
      setUploadingValImage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const formattedVariations = variations
      .filter((v) => v.name.trim().length > 0)
      .map((v) => ({
        name: v.name.trim(),
        required: v.required,
        values: v.values
          .filter((val) => val.name.trim().length > 0)
          .map((val) => ({
            name: val.name.trim(),
            image: val.image.trim(),
            price: isNaN(parseFloat(val.price)) ? 0 : parseFloat(val.price),
            description: val.description.trim(),
          })),
      }));

    const payload = {
      name: form.name.trim(),
      slug: form.slug || generateSlug(form.name),
      description: form.description,
      price: isNaN(parseFloat(form.price || "")) ? 0.15 : parseFloat(form.price || ""),
      unitPrice: form.unitPrice || "",
      image: form.image,
      sortOrder: Number(form.sortOrder) || 0,
      canvas_width: Number(form.canvas_width) || 105,
      canvas_height: Number(form.canvas_height) || 60,
      unit: form.unit,
      orientation: form.orientation,
      bleed: Number(form.bleed) || 0,
      bleedUnit: form.bleedUnit || form.unit,
      safe_area: Number(form.safe_area) || 0,
      safeAreaUnit: form.safeAreaUnit || form.unit,
      printSizes,
      background_color: form.background_color,
      side_mode: sideMode,
      sides_count: sidesCount,
      sides_names: sidesNames,
      supports_back_side: sideMode !== "single",
      guide_lines: canvasType === "mockup" ? [] : cleanGuideLines(guideLines),
      canvas_type: canvasType,
      mockup_image: mockupImage,
      banner_image: bannerImage,
      print_area: cleanPrintArea(printArea),
      print_placements: cleanPrintPlacements(printPlacements),
      apparel_colors: cleanApparelColors(apparelColors),
      apparel_sizes: cleanApparelSizes(apparelSizes),
      decoration_methods: cleanDecorationMethods(decorationMethods),
      text_layers: textLayers.map((l) => ({
        ...l,
        placementId: l.placementId || (canvasType === "mockup" ? "front" : undefined),
      })),
      default_template_data: {
        bgColor: form.background_color,
        textColor: textLayers[0]?.color || "#ffffff",
        logoPosition,
        logoText,
        logoSize,
        textLayers,
      },
      galleryImages: galleryImages.filter((img) => img.trim().length > 0),
      featureStory: {
        title: featureStory.title.trim(),
        bullets: featureStory.bullets.trim(),
        sections: featureStory.sections.filter((section) => section.heading.trim() || section.body.trim()),
        images: featureStory.images.filter((img) => img.trim()),
        relatedTitle: featureStory.relatedTitle.trim(),
      },
      variations: formattedVariations,
    };

    try {
      const url = mode === "create" ? "/api/admin/categories" : `/api/admin/categories/${categoryId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      router.push("/admin/categories");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  // Live aspect ratio mini-visualizer calculation
  const numW = Math.max(1, Number(form.canvas_width) || 105);
  const numH = Math.max(1, Number(form.canvas_height) || 60);
  const formAspect = numW / numH;
  const previewBoxW = formAspect >= 1 ? 260 : Math.max(140, Math.round(260 * formAspect));
  const previewBoxH = formAspect >= 1 ? Math.max(120, Math.round(260 / formAspect)) : 260;

  const pickFamily = (type: CanvasType) => {
    setCanvasType(type);
    setFamilyPicked(true);
    if (type === "mockup") {
      setApparelSizes((prev) => (prev.length ? prev : cleanApparelSizes(DEFAULT_APPAREL_SIZES)));
      setDecorationMethods((prev) =>
        prev.length ? prev : cleanDecorationMethods(DEFAULT_DECORATION_METHODS)
      );
      setEnableFront(true);
      setEnableBack(false);
      setEditSide("front");
      setPrintPlacements([
        {
          id: "front",
          name: "Front",
          printArea: { ...DEFAULT_PRINT_AREA, label: "Front Print" },
        },
      ]);
      if (!apparelColors.length) {
        setApparelColors([
          { id: "white", name: "White", hex: "#ffffff" },
          { id: "black", name: "Black", hex: "#111111" },
          { id: "navy", name: "Navy", hex: "#1e3a5f" },
        ]);
      }
    }
  };

  const syncPlacementsFromToggles = (frontOn: boolean, backOn: boolean) => {
    setPrintPlacements((prev) => {
      const frontExisting = prev.find((p) => p.id === "front") || {
        id: "front",
        name: "Front",
        mockupImage: mockupImage || undefined,
        printArea: { ...DEFAULT_PRINT_AREA, label: "Front Print" },
      };
      const backExisting = prev.find((p) => p.id === "back") || {
        id: "back",
        name: "Back",
        printArea: { x: 28, y: 18, width: 44, height: 42, label: "Back Print" },
      };
      const next: PrintPlacement[] = [];
      if (frontOn) next.push({ ...frontExisting, id: "front", name: "Front" });
      if (backOn) next.push({ ...backExisting, id: "back", name: "Back" });
      if (!next.length) {
        next.push({ ...frontExisting, id: "front", name: "Front" });
      }
      return next;
    });
  };

  const activeSideLayers = textLayers.filter((l) => {
    const side = l.placementId || "front";
    return side === editSide;
  });

  const activeSideMockup =
    editSide === "front"
      ? mockupImage
      : printPlacements.find((p) => p.id === "back")?.mockupImage || "";

  const activeSidePrintArea =
    printPlacements.find((p) => p.id === editSide)?.printArea || printArea;

  const familyLabel =
    canvasType === "mockup"
      ? "Clothing & Bags"
      : canvasType === "dieline"
        ? "Packaging"
        : "Print";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl pb-16">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {mode === "create" ? "New Product Category" : `Edit Category: ${form.name || "Category"}`}
          </h1>
          <p className="text-zinc-500 text-base mt-0.5">
            {familyPicked
              ? `Configuring ${familyLabel} category — settings match this product family only.`
              : "First choose a product family. Configuration screens adapt to your selection."}
          </p>
        </div>
        {familyPicked && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-4 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[#e74b2d] text-base font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              See Canvas Preview
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/categories")}
              className="px-4 py-2 text-base font-bold text-zinc-600 border border-zinc-200 rounded-xl hover:bg-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#e74b2d]/20 disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving..." : mode === "create" ? "Create Category" : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-base">
          {error}
        </div>
      )}

      {!familyPicked ? (
        <div className="bg-white border border-zinc-200/80 rounded-3xl p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">What are you creating?</h2>
            <p className="text-base text-zinc-500 mt-1">
              Pick one family first. You only see the settings that apply to that type — Print, Packaging, or Clothing &amp; Bags stay separate.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(
              [
                {
                  id: "flat" as const,
                  title: "Print",
                  desc: "Business cards, flyers, posters, stickers — flat rectangular canvas.",
                },
                {
                  id: "dieline" as const,
                  title: "Packaging",
                  desc: "Boxes and cartons with fold lines, score lines, and multi-panel nets.",
                },
                {
                  id: "mockup" as const,
                  title: "Clothing & Bags",
                  desc: "T-shirts, hoodies, totes, hats — product photo with a printable zone.",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => pickFamily(opt.id)}
                className="text-left p-6 rounded-3xl border-2 border-zinc-200 hover:border-[#e74b2d] hover:bg-sky-50/50 transition-all cursor-pointer group"
              >
                <span className="text-lg font-bold text-zinc-900 group-hover:text-[#e74b2d] block">
                  {opt.title}
                </span>
                <span className="text-sm text-zinc-500 mt-2 block leading-relaxed">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
      {/* Family badge */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-100 text-[#e74b2d] text-sm font-bold">
          Family: {familyLabel}
        </span>
        {mode === "create" && (
          <button
            type="button"
            onClick={() => setFamilyPicked(false)}
            className="text-sm font-bold text-zinc-500 hover:text-[#e74b2d] cursor-pointer"
          >
            Change family
          </button>
        )}
        {mode === "edit" && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Change product family? Some settings may not apply to the new type.")) {
                setFamilyPicked(false);
              }
            }}
            className="text-sm font-bold text-zinc-500 hover:text-[#e74b2d] cursor-pointer"
          >
            Change family
          </button>
        )}
      </div>

      {/* Preset Selector Card — hide for clothing mockup */}
      {canvasType !== "mockup" && (
      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 space-y-3 shadow-sm">
        <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">Quick Preset Setup</h2>
        <div className="p-4 bg-[#fbfaf7] border border-sky-100 rounded-2xl space-y-2">
          <label className="text-base font-bold text-zinc-700 block">
            Select Standard Dimensions & Dieline Preset (Optional)
          </label>
          <select
            onChange={(e) => applyPreset(e.target.value)}
            defaultValue=""
            className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-800 font-semibold focus:outline-none focus:border-[#e74b2d] cursor-pointer"
          >
            <option value="" disabled>
              -- Select standard preset to prefill canvas dimensions & sides --
            </option>
            {Object.entries(PRESET_OPTIONS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.name} ({val.width} × {val.height} {val.unit}) - {val.side_mode.toUpperCase()} MODE ({val.sides_count} Sides)
              </option>
            ))}
          </select>
        </div>
      </div>
      )}

      {/* Category Info Card */}
      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">Category Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1">Category Name *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name,
                  slug: prev.slug ? prev.slug : generateSlug(name),
                }));
              }}
              className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
              placeholder="e.g., Packaging Boxes, Business Cards, Flyers"
            />
          </div>

          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1">URL Slug *</label>
            <input
              required
              type="text"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base font-mono text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
              placeholder="packaging-boxes"
            />
          </div>
        </div>

        <div>
          <label className="text-base font-bold text-zinc-700 block mb-1">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d] resize-none"
            placeholder="Brief category description for storefront browsing..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1">Base Price per Unit ($) *</label>
            <input
              type="number"
              step="0.001"
              min="0"
              required
              value={form.price || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
              placeholder="0.15"
            />
            <p className="text-base text-zinc-400 mt-1">Base price per unit. Will multiply by quantity and add paid variations.</p>
          </div>

          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1">Unit Price Tag *</label>
            <input
              type="text"
              required
              value={form.unitPrice || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
              className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
              placeholder="e.g., $0.15 each"
            />
            <p className="text-base text-zinc-400 mt-1">Label shown below price (e.g. &quot;$0.15 each&quot;)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1">Category Cover Image</label>
            <p className="text-base text-zinc-500 mb-2">
              Shown on the Clothing &amp; Bags grid cards (not the category page banner)
            </p>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                placeholder="https://... or /custom-category.png"
                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
              />
              <label className="px-3.5 py-2 rounded-xl bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold cursor-pointer shrink-0 shadow-sm">
                {uploadingImage ? "Uploading..." : "↑ Upload"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingImage}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    e.target.value = "";
                    void handleImageUpload(file);
                  }}
                />
              </label>
            </div>
            {form.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaSrc(form.image) || form.image}
                alt=""
                className="mt-2 w-full max-w-xs h-28 rounded-2xl object-cover border border-zinc-200"
              />
            ) : null}
          </div>

          {canvasType === "mockup" && (
            <div>
              <label className="text-base font-bold text-zinc-700 block mb-1">
                Category page banner
              </label>
              <p className="text-base text-zinc-500 mb-2">
                Wide hero on /clothing-bags/your-category — separate from the cover card
              </p>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  placeholder="https://... banner image"
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setMediaPicker({
                      purpose: "banner",
                      folder: "category-banners",
                      currentUrl: bannerImage,
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-base font-bold cursor-pointer shrink-0"
                >
                  Library
                </button>
                <label className="px-3.5 py-2 rounded-xl bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold cursor-pointer shrink-0 shadow-sm">
                  {uploadingBanner ? "…" : "↑ Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingBanner}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      e.target.value = "";
                      void handleBannerUpload(file);
                    }}
                  />
                </label>
              </div>
              {bannerImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaSrc(bannerImage) || bannerImage}
                  alt=""
                  className="mt-2 w-full h-28 rounded-2xl object-cover border border-zinc-200"
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* FULL CANVAS CONFIGURATION SECTION: Dimensions, Sides (Single/Double/3+ Multi), Dieline Fold Lines */}
      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#e74b2d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 4v16M15 4v16" />
              </svg>
              Canvas Type & Configuration
            </h2>
            <p className="text-base text-zinc-500 mt-0.5">
              Choose flat print, packaging dieline, or product mockup (t-shirt / handbag) — existing flows stay unchanged.
            </p>
          </div>
          <span className="text-base font-mono font-bold text-[#e74b2d] bg-sky-50 border border-sky-100 px-3 py-1 rounded-xl">
            Aspect Ratio: {formAspect.toFixed(2)} : 1
          </span>
        </div>

        {/* Canvas type locked by family picker — keep value in sync */}
        <input type="hidden" value={canvasType} readOnly />

        {canvasType === "mockup" ? (
          <div className="space-y-5 pt-2 border-t border-zinc-100">
            {/* Front / Back toggles */}
            <div>
              <h3 className="text-base font-bold text-zinc-900">Print sides</h3>
              <p className="text-sm text-zinc-500 mt-0.5">
                Turn on Front and/or Back. Each side has its own mockup, print area, and text/logo layers.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = !enableFront;
                    if (!next && !enableBack) return; // keep at least one
                    setEnableFront(next);
                    syncPlacementsFromToggles(next, enableBack);
                    if (!next) setEditSide("back");
                    else if (!enableBack) setEditSide("front");
                  }}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm cursor-pointer transition-all ${
                    enableFront
                      ? "border-[#e74b2d] bg-sky-50 text-[#e74b2d]"
                      : "border-zinc-200 bg-white text-zinc-500"
                  }`}
                >
                  <span
                    className={`w-10 h-6 rounded-full relative transition-colors ${
                      enableFront ? "bg-[#e74b2d]" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        enableFront ? "left-4.5 right-0.5 left-auto translate-x-4" : "left-0.5"
                      }`}
                      style={{ left: enableFront ? "18px" : "2px" }}
                    />
                  </span>
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !enableBack;
                    if (!next && !enableFront) return;
                    setEnableBack(next);
                    syncPlacementsFromToggles(enableFront, next);
                    if (next) setEditSide("back");
                    else setEditSide("front");
                  }}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm cursor-pointer transition-all ${
                    enableBack
                      ? "border-[#e74b2d] bg-sky-50 text-[#e74b2d]"
                      : "border-zinc-200 bg-white text-zinc-500"
                  }`}
                >
                  <span
                    className={`w-10 h-6 rounded-full relative transition-colors ${
                      enableBack ? "bg-[#e74b2d]" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: enableBack ? "18px" : "2px" }}
                    />
                  </span>
                  Back
                </button>
              </div>
              {enableBack && (
                <p className="mt-2 text-sm text-[#e74b2d] font-medium">
                  Back is on — switch to the Back tab below to set mockup, print area, and layers for the back.
                </p>
              )}
            </div>

            {/* Side editor tabs */}
            <div className="flex flex-wrap gap-1 p-1 bg-[#fbfaf7] rounded-full border border-zinc-200 w-fit">
              {enableFront && (
                <button
                  type="button"
                  onClick={() => {
                    setEditSide("front");
                    setActiveLayerId(null);
                  }}
                  className={`px-4 py-1.5 text-sm font-bold rounded-full cursor-pointer ${
                    editSide === "front" ? "bg-[#e74b2d] text-white" : "text-zinc-600"
                  }`}
                >
                  Edit Front
                </button>
              )}
              {enableBack && (
                <button
                  type="button"
                  onClick={() => {
                    setEditSide("back");
                    setActiveLayerId(null);
                  }}
                  className={`px-4 py-1.5 text-sm font-bold rounded-full cursor-pointer ${
                    editSide === "back" ? "bg-[#e74b2d] text-white" : "text-zinc-600"
                  }`}
                >
                  Edit Back
                </button>
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-900 capitalize">{editSide} mockup image</h3>
              <p className="text-base text-zinc-500 mt-0.5">
                Product photo for the {editSide}. Then drag the print area and add text or logos on this side.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={activeSideMockup}
                onChange={(e) => {
                  const url = e.target.value;
                  if (editSide === "front") {
                    setMockupImage(url);
                    setPrintPlacements((prev) =>
                      prev.map((p) => (p.id === "front" ? { ...p, mockupImage: url } : p))
                    );
                  } else {
                    setPrintPlacements((prev) => {
                      const hasBack = prev.some((p) => p.id === "back");
                      if (!hasBack) {
                        return [
                          ...prev,
                          {
                            id: "back",
                            name: "Back",
                            mockupImage: url,
                            printArea: { x: 28, y: 18, width: 44, height: 42, label: "Back Print" },
                          },
                        ];
                      }
                      return prev.map((p) => (p.id === "back" ? { ...p, mockupImage: url } : p));
                    });
                  }
                }}
                placeholder={`https://... or pick ${editSide} photo from library`}
                className="flex-1 bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
              />
              <button
                type="button"
                onClick={() =>
                  setMediaPicker({
                    purpose: "mockup",
                    folder: "category-mockups",
                    currentUrl: activeSideMockup,
                    side: editSide,
                  })
                }
                className="px-4 py-2 rounded-xl bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold cursor-pointer shrink-0 shadow-sm"
              >
                ↑ Upload {editSide === "front" ? "Front" : "Back"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Print area width</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={form.canvas_width}
                    onChange={(e) => setForm((prev) => ({ ...prev, canvas_width: e.target.value }))}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-sm font-bold"
                  />
                  <span className="self-center text-xs text-zinc-400 font-bold">{form.unit}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Print area height</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={form.canvas_height}
                    onChange={(e) => setForm((prev) => ({ ...prev, canvas_height: e.target.value }))}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-sm font-bold"
                  />
                  <span className="self-center text-xs text-zinc-400 font-bold">{form.unit}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Unit</label>
                <select
                  value={form.unit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, unit: e.target.value as CanvasUnit }))
                  }
                  className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-sm font-bold cursor-pointer"
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                  <option value="px">px</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={addTextLayer}
                  className="flex-1 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold rounded-xl cursor-pointer"
                >
                  + Add Text
                </button>
                <button
                  type="button"
                  disabled={uploadingLayerImage}
                  onClick={() =>
                    setMediaPicker({
                      purpose: "layer",
                      folder: "category-mockup-layers",
                      side: editSide,
                    })
                  }
                  className="flex-1 px-3 py-1.5 bg-[#e74b2d] hover:bg-[#c93e23] disabled:opacity-60 text-white text-sm font-bold rounded-xl cursor-pointer"
                >
                  {uploadingLayerImage ? "…" : "+ Logo"}
                </button>
                <input
                  ref={layerImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    e.target.value = "";
                    void handleLayerImageUpload(file);
                  }}
                />
              </div>
            </div>

            <MockupPrintAreaEditor
              mockupImage={activeSideMockup}
              printArea={activeSidePrintArea}
              layers={activeSideLayers as any}
              activeLayerId={activeLayerId}
              uploadingImage={uploadingLayerImage}
              onUploadImageClick={() =>
                setMediaPicker({
                  purpose: "layer",
                  folder: "category-mockup-layers",
                  side: editSide,
                })
              }
              onPrintAreaChange={(area) => {
                const labeled = {
                  ...area,
                  label: editSide === "front" ? "Front Print" : "Back Print",
                };
                if (editSide === "front") setPrintArea(labeled);
                setPrintPlacements((prev) => {
                  const has = prev.some((p) => p.id === editSide);
                  if (!has) {
                    return [
                      ...prev,
                      {
                        id: editSide,
                        name: editSide === "front" ? "Front" : "Back",
                        mockupImage: editSide === "front" ? mockupImage : undefined,
                        printArea: labeled,
                      },
                    ];
                  }
                  return prev.map((p) => (p.id === editSide ? { ...p, printArea: labeled } : p));
                });
              }}
              onAddLayerAt={addTextLayerAt}
              onSelectLayer={setActiveLayerId}
              onUpdateLayer={(id, patch) => {
                setTextLayers((prev) =>
                  prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
                );
              }}
              onDeleteLayer={removeTextLayer}
              onInsertLayer={(layer) => {
                const asText: TextLayer = {
                  id: layer.id,
                  type: layer.type === "image" ? "image" : "text",
                  text:
                    ("text" in layer ? layer.text : "Logo") ||
                    (layer.type === "image" ? "Logo" : "Text"),
                  src: layer.type === "image" ? layer.src : undefined,
                  x: layer.x,
                  y: layer.y,
                  fontSize: layer.fontSize || 14,
                  color: layer.color || "#111111",
                  fontWeight: (layer.fontWeight || "normal") as "normal" | "bold",
                  width: layer.type === "image" ? layer.width : undefined,
                  height: layer.type === "image" ? layer.height : undefined,
                  placementId: editSide,
                };
                setTextLayers((prev) => [...prev, asText]);
                setActiveLayerId(asText.id);
              }}
            />

            {/* Apparel colors */}
            <div className="space-y-3 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Garment Colors</h3>
                  <p className="text-sm text-zinc-500">Swatches customers pick on the product page.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setApparelColors((prev) => [
                      ...prev,
                      {
                        id: `color_${Date.now()}`,
                        name: "New Color",
                        hex: "#e74b2d",
                      },
                    ])
                  }
                  className="px-3 py-1.5 text-sm font-bold rounded-xl bg-zinc-900 text-white cursor-pointer"
                >
                  + Color
                </button>
              </div>
              <div className="space-y-2">
                {apparelColors.map((color, idx) => (
                  <div key={color.id} className="flex flex-wrap items-center gap-2 bg-[#fbfaf7] border border-zinc-200 rounded-2xl p-2.5">
                    <input
                      type="color"
                      value={color.hex}
                      onChange={(e) =>
                        setApparelColors((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, hex: e.target.value } : c))
                        )
                      }
                      className="w-9 h-9 rounded-lg border border-zinc-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color.name}
                      onChange={(e) =>
                        setApparelColors((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c))
                        )
                      }
                      className="flex-1 min-w-[100px] bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-sm font-bold"
                      placeholder="Color name"
                    />
                    <div className="flex flex-[2] min-w-[200px] items-center gap-1.5">
                      {color.mockupImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaSrc(color.mockupImage) || color.mockupImage}
                          alt=""
                          className="w-9 h-9 rounded-lg object-contain border border-zinc-200 bg-white shrink-0"
                        />
                      ) : null}
                      <input
                        type="text"
                        value={color.mockupImage || ""}
                        onChange={(e) =>
                          setApparelColors((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, mockupImage: e.target.value } : c))
                          )
                        }
                        className="flex-1 min-w-0 bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-sm"
                        placeholder="Color mockup URL (optional)"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setMediaPicker({
                            purpose: "color",
                            colorIdx: idx,
                            folder: "category-color-mockups",
                            currentUrl: color.mockupImage || "",
                          })
                        }
                        className="shrink-0 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-[#e74b2d] text-white hover:bg-[#c93e23] cursor-pointer"
                      >
                        {uploadingColorIdx === idx ? "…" : "↑ Library"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApparelColors((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Apparel sizes */}
            <div className="space-y-3 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Sizes</h3>
                  <p className="text-sm text-zinc-500">Size chart for the quantity matrix.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setApparelSizes((prev) => [...prev, { id: `size_${Date.now()}`, name: "Custom" }])
                  }
                  className="px-3 py-1.5 text-sm font-bold rounded-xl bg-zinc-900 text-white cursor-pointer"
                >
                  + Size
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {apparelSizes.map((size, idx) => (
                  <div key={size.id} className="flex items-center gap-1 bg-[#fbfaf7] border border-zinc-200 rounded-xl px-2 py-1">
                    <input
                      type="text"
                      value={size.name}
                      onChange={(e) =>
                        setApparelSizes((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, name: e.target.value } : s))
                        )
                      }
                      className="w-16 bg-transparent text-sm font-bold text-center focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setApparelSizes((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Decoration methods */}
            <div className="space-y-3 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Decoration Methods</h3>
                  <p className="text-sm text-zinc-500">How the design is applied to the garment.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDecorationMethods((prev) => [
                      ...prev,
                      { id: `deco_${Date.now()}`, name: "New Method", description: "", priceAddOn: 0 },
                    ])
                  }
                  className="px-3 py-1.5 text-sm font-bold rounded-xl bg-zinc-900 text-white cursor-pointer"
                >
                  + Method
                </button>
              </div>
              <div className="space-y-2">
                {decorationMethods.map((method, idx) => (
                  <div key={method.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-[#fbfaf7] border border-zinc-200 rounded-2xl p-2.5">
                    <input
                      type="text"
                      value={method.name}
                      onChange={(e) =>
                        setDecorationMethods((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, name: e.target.value } : m))
                        )
                      }
                      className="sm:col-span-3 bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-sm font-bold"
                      placeholder="Method name"
                    />
                    <input
                      type="text"
                      value={method.description || ""}
                      onChange={(e) =>
                        setDecorationMethods((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, description: e.target.value } : m))
                        )
                      }
                      className="sm:col-span-6 bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-sm"
                      placeholder="Short description"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={method.priceAddOn ?? 0}
                      onChange={(e) =>
                        setDecorationMethods((prev) =>
                          prev.map((m, i) =>
                            i === idx ? { ...m, priceAddOn: Number(e.target.value) || 0 } : m
                          )
                        )
                      }
                      className="sm:col-span-2 bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-sm font-mono"
                      placeholder="+$"
                      title="Price add-on"
                    />
                    <button
                      type="button"
                      onClick={() => setDecorationMethods((prev) => prev.filter((_, i) => i !== idx))}
                      className="sm:col-span-1 p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* Dimension Inputs + Live Visualizer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Dimension Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Canvas Width *</label>
                <input
                  required
                  type="number"
                  min={0.01}
                  step="any"
                  value={form.canvas_width}
                  onChange={(e) => {
                    const canvas_width = e.target.value;
                    setForm((prev) => {
                      const w = Number(canvas_width);
                      const h = Number(prev.canvas_height);
                      return {
                        ...prev,
                        canvas_width,
                        orientation: w > 0 && h > 0 && h > w ? "portrait" : w > 0 && h > 0 && w > h ? "landscape" : prev.orientation,
                      };
                    });
                  }}
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Canvas Height *</label>
                <input
                  required
                  type="number"
                  min={0.01}
                  step="any"
                  value={form.canvas_height}
                  onChange={(e) => {
                    const canvas_height = e.target.value;
                    setForm((prev) => {
                      const w = Number(prev.canvas_width);
                      const h = Number(canvas_height);
                      return {
                        ...prev,
                        canvas_height,
                        orientation: w > 0 && h > 0 && h > w ? "portrait" : w > 0 && h > 0 && w > h ? "landscape" : prev.orientation,
                      };
                    });
                  }}
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Measurement Unit</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm((prev) => ({ ...prev, unit: asCanvasUnit(e.target.value) }))}
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d] cursor-pointer"
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="in">inches</option>
                  <option value="px">pixels</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Orientation</label>
                <select
                  value={form.orientation}
                  onChange={(e) => setForm((prev) => ({ ...prev, orientation: e.target.value as any }))}
                  className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d] cursor-pointer"
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Bleed Margin</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.bleed}
                    onChange={(e) => setForm((prev) => ({ ...prev, bleed: e.target.value }))}
                    className="min-w-0 flex-1 bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base font-mono text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                  />
                  <select
                    value={form.bleedUnit}
                    onChange={(e) => setForm((prev) => ({ ...prev, bleedUnit: asCanvasUnit(e.target.value, prev.unit) }))}
                    className="w-[4.5rem] bg-[#fbfaf7] border border-zinc-200 rounded-xl px-2 py-2 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                  >
                    <option value="in">in</option>
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="px">px</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Safe Area Margin</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.safe_area}
                    onChange={(e) => setForm((prev) => ({ ...prev, safe_area: e.target.value }))}
                    className="min-w-0 flex-1 bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base font-mono text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                  />
                  <select
                    value={form.safeAreaUnit}
                    onChange={(e) => setForm((prev) => ({ ...prev, safeAreaUnit: asCanvasUnit(e.target.value, prev.unit) }))}
                    className="w-[4.5rem] bg-[#fbfaf7] border border-zinc-200 rounded-xl px-2 py-2 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                  >
                    <option value="in">in</option>
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="px">px</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="text-base font-bold text-zinc-700">Default Canvas Color:</label>
              <input
                type="color"
                value={form.background_color}
                onChange={(e) => setForm((prev) => ({ ...prev, background_color: e.target.value }))}
                className="w-9 h-9 rounded-xl border border-zinc-200 cursor-pointer bg-transparent"
              />
              <span className="text-base font-mono font-bold text-zinc-500">{form.background_color}</span>
            </div>
          </div>

          {/* Interactive Live Canvas & Dielines Visualizer Box (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-5 bg-[#18181b] rounded-3xl border border-zinc-800 text-white min-h-[260px] shadow-lg relative overflow-hidden">
            <div className="w-full flex items-center justify-between mb-3 text-xs uppercase tracking-wider font-bold text-zinc-400 px-1">
              <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPreviewMode("2d")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewMode === "2d" ? "bg-[#e74b2d] text-white shadow" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  2D Dieline View
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("3d")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewMode === "3d" ? "bg-[#e74b2d] text-white shadow" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  3D Box Model
                </button>
              </div>
              <span className="text-[#f88768] font-mono">{form.canvas_width} × {form.canvas_height} {form.unit}</span>
            </div>

            {previewMode === "3d" ? (
              <div className="w-full h-[250px] relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-[#0f1115]">
                <ThreeDCardPreview
                  categoryName={form.name || "Packaging Box"}
                  canvasConfig={{
                    width: Number(form.canvas_width) || 105,
                    height: Number(form.canvas_height) || 60,
                    unit: form.unit,
                    orientation: form.orientation,
                    bleed: Number(form.bleed) || 0,
                    bleedUnit: form.bleedUnit || form.unit,
                    safe_area: Number(form.safe_area) || 0,
                    safeAreaUnit: form.safeAreaUnit || form.unit,
                    supports_back_side: sideMode !== "single",
                    side_mode: sideMode,
                    sides_count: sidesCount,
                    sides_names: sidesNames,
                  }}
                  bgColor={form.background_color}
                  backBgColor={form.background_color}
                  logoText={logoText}
                  logoPosition={logoPosition}
                  logoSize={logoSize}
                  textLayers={textLayers}
                  sideDesigns={Array.from({ length: Math.max(1, sidesCount) }, (_, idx) => ({
                    bgColor: form.background_color || "#18181b",
                    objects:
                      idx === 0
                        ? textLayers.map((l) => ({
                            id: l.id,
                            type: "text",
                            text: l.text,
                            x: l.x,
                            y: l.y,
                            fontSize: l.fontSize,
                            color: l.color,
                            fontWeight: l.fontWeight,
                          }))
                        : [
                            {
                              id: `preview-label-${idx}`,
                              type: "text",
                              text: sidesNames[idx] || `Side ${idx + 1}`,
                              x: 50,
                              y: 46,
                              fontSize: 16,
                              color: "#f88768",
                              fontWeight: "bold",
                              textAlign: "center",
                            },
                          ],
                  }))}
                  frontDesign={{
                    bgColor: form.background_color,
                    objects: textLayers.map((l) => ({
                      id: l.id,
                      type: "text",
                      text: l.text,
                      x: l.x,
                      y: l.y,
                      fontSize: l.fontSize,
                      color: l.color,
                      fontWeight: l.fontWeight,
                    })),
                  }}
                />
                {guideLines.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                    <CanvasGuideLinesOverlay
                      lines={guideLines}
                      canvasWidth={numW}
                      canvasHeight={numH}
                      canvasUnit={form.unit}
                      showLabels={false}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Canvas Box */
              <div
                className="rounded-xl shadow-2xl relative border-2 border-dashed border-sky-400/60 overflow-hidden transition-all flex items-center justify-center"
                style={{
                  width: `${previewBoxW}px`,
                  height: `${previewBoxH}px`,
                  backgroundColor: form.background_color || "#ffffff",
                }}
              >
                {/* Bleed outline indicator */}
                {Number(form.bleed) > 0 && (
                  <div className="absolute inset-0 border border-red-500/50 pointer-events-none" title={`Bleed: ${form.bleed}${form.bleedUnit}`} />
                )}
                {/* Safe area outline indicator */}
                {Number(form.safe_area) > 0 && (
                  <div
                    className="absolute border border-dashed border-emerald-500/60 pointer-events-none"
                    style={{
                      left: "5%",
                      right: "5%",
                      top: "5%",
                      bottom: "5%",
                    }}
                    title={`Safe Area: ${form.safe_area}${form.safeAreaUnit}`}
                  />
                )}

                {/* Guide Lines / Fold Lines Overlay */}
                <CanvasGuideLinesOverlay
                  lines={guideLines}
                  canvasWidth={numW}
                  canvasHeight={numH}
                  canvasUnit={form.unit}
                />

                {/* Logo preview */}
                {logoText && (
                  <div
                    className={`absolute z-20 font-bold tracking-widest text-zinc-100 flex items-center justify-center border border-white/30 rounded px-1.5 py-0.5 bg-black/40 backdrop-blur pointer-events-none select-none ${
                      logoPosition === "top-right"
                        ? "top-2 right-2"
                        : logoPosition === "top-left"
                        ? "top-2 left-2"
                        : logoPosition === "center"
                        ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        : "bottom-2 right-2"
                    }`}
                    style={{ fontSize: `${Math.max(10, Math.round(logoSize * 0.45))}px` }}
                  >
                    {logoText}
                  </div>
                )}

                {/* Text layers preview */}
                {textLayers.map((layer) => (
                  <div
                    key={layer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLayerId(layer.id);
                    }}
                    className={`absolute z-20 cursor-pointer select-none px-1 rounded transition-all ${
                      activeLayerId === layer.id ? "ring-2 ring-sky-400 bg-sky-500/30" : "hover:bg-white/10"
                    }`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      fontSize: `${Math.max(9, Math.round(layer.fontSize * 0.45))}px`,
                      color: layer.color || "#ffffff",
                      fontWeight: layer.fontWeight || "normal",
                      fontStyle: layer.fontStyle || "normal",
                      textAlign: layer.textAlign || "left",
                      letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}px` : "normal",
                    }}
                  >
                    {layer.text}
                  </div>
                ))}

                <span className="text-xs font-bold text-zinc-500/80 bg-white/80 dark:bg-black/60 px-2 py-1 rounded-md backdrop-blur select-none z-0">
                  {sideMode.toUpperCase()} ({sidesCount} {sidesCount === 1 ? "Side" : "Sides"})
                </span>
              </div>
            )}

            {/* Legend footer */}
            <div className="flex items-center gap-4 mt-3 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Red: Bleed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Green: Safe</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Blue: Fold Line</span>
            </div>
          </div>
        </div>

        {/* CANVAS SIDES CONFIGURATION (Single / Double / 3+ Multi-Sides) */}
        <div className="pt-4 border-t border-zinc-100 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Canvas Sides & Panel Configuration</h3>
            <p className="text-base text-zinc-500 mt-0.5">
              Select single side, double side (Front & Back), or multi-panel 3/4/6 sides for packaging box nets, tri-folds, and multi-surface items.
            </p>
          </div>

          {/* Mode Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              onClick={() => handleSideModeChange("single")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                sideMode === "single"
                  ? "border-[#e74b2d] bg-sky-50/60 ring-2 ring-[#e74b2d]/20"
                  : "border-zinc-200 hover:border-zinc-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold text-zinc-900">Single Side (1-Sided)</span>
                <input
                  type="radio"
                  name="sideMode"
                  checked={sideMode === "single"}
                  onChange={() => handleSideModeChange("single")}
                  className="text-[#e74b2d] focus:ring-[#e74b2d] cursor-pointer"
                />
              </div>
              <p className="text-sm text-zinc-500">
                1 surface canvas only. Ideal for posters, stickers, mugs, banners, single-sided cards.
              </p>
            </div>

            <div
              onClick={() => handleSideModeChange("double")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                sideMode === "double"
                  ? "border-[#e74b2d] bg-sky-50/60 ring-2 ring-[#e74b2d]/20"
                  : "border-zinc-200 hover:border-zinc-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold text-zinc-900">Double Sides (2-Sided)</span>
                <input
                  type="radio"
                  name="sideMode"
                  checked={sideMode === "double"}
                  onChange={() => handleSideModeChange("double")}
                  className="text-[#e74b2d] focus:ring-[#e74b2d] cursor-pointer"
                />
              </div>
              <p className="text-sm text-zinc-500">
                2 canvas views (Front & Back). Ideal for standard business cards, flyers, t-shirts, postcards.
              </p>
            </div>

            <div
              onClick={() => handleSideModeChange("multi")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                sideMode === "multi"
                  ? "border-[#e74b2d] bg-sky-50/60 ring-2 ring-[#e74b2d]/20"
                  : "border-zinc-200 hover:border-zinc-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold text-zinc-900">Multi-Sides (3+ Panels)</span>
                <input
                  type="radio"
                  name="sideMode"
                  checked={sideMode === "multi"}
                  onChange={() => handleSideModeChange("multi")}
                  className="text-[#e74b2d] focus:ring-[#e74b2d] cursor-pointer"
                />
              </div>
              <p className="text-sm text-zinc-500">
                3, 4, 6 or N sides/panels. Ideal for packaging boxes, tri-fold brochures, product cartons.
              </p>
            </div>
          </div>

          {/* Panel Names Inputs if Double or Multi */}
          {sideMode !== "single" && (
            <div className="p-4 bg-[#fbfaf7] border border-zinc-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-base font-bold text-zinc-800">
                  Total Sides Count:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSidesCountChange(sidesCount - 1)}
                    disabled={sideMode === "double" ? sidesCount <= 2 : sidesCount <= 3}
                    className="w-8 h-8 rounded-lg border border-zinc-300 bg-white font-bold hover:bg-zinc-100 disabled:opacity-40 cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={sideMode === "double" ? 2 : 3}
                    max={12}
                    value={sidesCount}
                    onChange={(e) => handleSidesCountChange(Number(e.target.value))}
                    className="w-16 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-center font-mono font-bold text-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleSidesCountChange(sidesCount + 1)}
                    className="w-8 h-8 rounded-lg border border-zinc-300 bg-white font-bold hover:bg-zinc-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {Array.from({ length: sidesCount }).map((_, sideIdx) => (
                  <div key={`side-name-${sideIdx}`}>
                    <label className="text-xs font-bold text-zinc-500 block mb-1">
                      Side {sideIdx + 1} Name:
                    </label>
                    <input
                      type="text"
                      value={sidesNames[sideIdx] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSidesNames((prev) => {
                          const next = [...prev];
                          next[sideIdx] = val;
                          return next;
                        });
                      }}
                      placeholder={`e.g., Side ${sideIdx + 1}`}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-base font-semibold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CANVAS FOLD & GUIDE LINES BUILDER */}
        <div className="pt-4 border-t border-zinc-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-1.5">
                <span>Canvas Fold Lines & Dieline Guides</span>
              </h3>
              <p className="text-base text-zinc-500 mt-0.5">
                Add vertical or horizontal fold lines, score lines, and segment dielines for brochures or packaging boxes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={applyTriFoldPreset}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-sky-200 bg-sky-50 text-[#e74b2d] hover:bg-sky-100 cursor-pointer"
              >
                + Tri-Fold Lines
              </button>
              <button
                type="button"
                onClick={applyHalfFoldPreset}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
              >
                + Half-Fold Line
              </button>
              <button
                type="button"
                onClick={applyBoxNetPreset}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer"
              >
                + Box Net Dieline
              </button>
              <button
                type="button"
                onClick={() => addGuideLine("vertical")}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
              >
                + Add Vertical Line
              </button>
              <button
                type="button"
                onClick={() => addGuideLine("horizontal")}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer"
              >
                + Add Horizontal Line
              </button>
            </div>
          </div>

          {guideLines.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-[#fbfaf7]">
              <p className="text-base text-zinc-400 font-medium">No canvas fold lines or dieline guides added.</p>
              <p className="text-xs text-zinc-400 mt-1">
                Click &quot;+ Add Vertical Line&quot; or select one of the fold presets above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {guideLines.map((line) => (
                <div
                  key={line.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-[#fbfaf7] border border-zinc-200 rounded-2xl p-3"
                >
                  <div className="sm:col-span-3">
                    <label className="text-xs font-bold text-zinc-400 block mb-0.5">Line Name</label>
                    <input
                      type="text"
                      value={line.name}
                      onChange={(e) => updateGuideLine(line.id, "name", e.target.value)}
                      placeholder="e.g. Spine Fold"
                      className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-zinc-400 block mb-0.5">Orientation</label>
                    <select
                      value={line.orientation}
                      onChange={(e) => updateGuideLine(line.id, "orientation", e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-2 py-1 text-base font-bold text-zinc-900 cursor-pointer"
                    >
                      <option value="vertical">Vertical</option>
                      <option value="horizontal">Horizontal</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3 flex gap-1.5">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-zinc-400 block mb-0.5">Position</label>
                      <input
                        type="number"
                        step="any"
                        value={line.position}
                        onChange={(e) => updateGuideLine(line.id, "position", Number(e.target.value))}
                        className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1 text-base font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                      />
                    </div>
                    <div className="w-20">
                      <label className="text-xs font-bold text-zinc-400 block mb-0.5">Unit</label>
                      <select
                        value={line.unit || "percent"}
                        onChange={(e) => updateGuideLine(line.id, "unit", e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-xl px-1.5 py-1 text-base font-bold text-zinc-900 cursor-pointer"
                      >
                        <option value="percent">%</option>
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                        <option value="in">in</option>
                        <option value="px">px</option>
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-zinc-400 block mb-0.5">Line Type</label>
                    <select
                      value={line.lineType || "fold"}
                      onChange={(e) => updateGuideLine(line.id, "lineType", e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-2 py-1 text-base font-bold text-zinc-900 cursor-pointer"
                    >
                      <option value="fold">Fold Line (Dashed)</option>
                      <option value="score">Score Line (Dotted)</option>
                      <option value="cut">Cut Line (Solid)</option>
                      <option value="guide">Safety Guide</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between gap-2 pt-4 sm:pt-0">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={line.color || "#e74b2d"}
                        onChange={(e) => updateGuideLine(line.id, "color", e.target.value)}
                        className="w-7 h-7 rounded-lg border border-zinc-200 cursor-pointer bg-transparent"
                        title="Pick Line Color"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGuideLine(line.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove line"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}

        {/* CATEGORY DEFAULT LAYERS & LOGO CANVAS EDITOR — skip for mockup (handled in mockup editor above) */}
        {canvasType !== "mockup" && (
        <div className="pt-6 border-t border-zinc-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#e74b2d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Category Canvas Default Layers & Logo Editor
              </h3>
              <p className="text-base text-zinc-500 mt-0.5">
                Customize default text layers, logo text, logo position, and default layout for templates created in this category.
              </p>
            </div>
            <button
              type="button"
              onClick={addTextLayer}
              className="px-4 py-2 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
            >
              + Add Text Layer
            </button>
          </div>

          {/* Logo Setup Card */}
          <div className="p-4 bg-[#fbfaf7] border border-zinc-200 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Default Logo Placeholder Settings</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Logo Text</label>
                <input
                  type="text"
                  value={logoText}
                  onChange={(e) => setLogoText(e.target.value)}
                  placeholder="e.g. LOGO or BRAND"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-sm font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Logo Size (px)</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={logoSize}
                  onChange={(e) => setLogoSize(Number(e.target.value))}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-sm font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Logo Position</label>
                <select
                  value={logoPosition}
                  onChange={(e) => setLogoPosition(e.target.value as any)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-sm font-bold text-zinc-900 cursor-pointer focus:outline-none focus:border-[#e74b2d]"
                >
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="center">Center</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>
            </div>
          </div>

          {/* Text Layers Management List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Category Text Layers ({textLayers.length})</span>
            </div>

            {textLayers.length === 0 ? (
              <div className="py-6 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-[#fbfaf7]">
                <p className="text-sm text-zinc-400 font-medium">No default text layers added for this category.</p>
                <p className="text-xs text-zinc-400 mt-1">Click &quot;+ Add Text Layer&quot; to add customized layers for this category.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {textLayers.map((layer, idx) => (
                  <div
                    key={layer.id}
                    onClick={() => setActiveLayerId(layer.id)}
                    className={`p-4 rounded-2xl border transition-all ${
                      activeLayerId === layer.id
                        ? "border-[#e74b2d] bg-sky-50/50 ring-2 ring-[#e74b2d]/20"
                        : "border-zinc-200 bg-[#fbfaf7] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#e74b2d] text-white text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-bold text-zinc-900">Layer {idx + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTextLayer(layer.id);
                        }}
                        className="w-7 h-7 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                        title="Delete layer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-4">
                        <label className="text-xs font-bold text-zinc-500 block mb-1">Layer Text</label>
                        <input
                          type="text"
                          value={layer.text}
                          onChange={(e) => updateTextLayer(layer.id, "text", e.target.value)}
                          placeholder="Text layer content..."
                          className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-zinc-500 block mb-1">Font Size (px)</label>
                        <input
                          type="number"
                          min={8}
                          max={72}
                          value={layer.fontSize}
                          onChange={(e) => updateTextLayer(layer.id, "fontSize", Number(e.target.value))}
                          className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-zinc-500 block mb-1">Font Weight</label>
                        <select
                          value={layer.fontWeight || "normal"}
                          onChange={(e) => updateTextLayer(layer.id, "fontWeight", e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-xl px-2 py-1.5 text-sm font-semibold text-zinc-900 cursor-pointer focus:outline-none focus:border-[#e74b2d]"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-zinc-500 block mb-1">Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={layer.color || "#ffffff"}
                            onChange={(e) => updateTextLayer(layer.id, "color", e.target.value)}
                            className="w-8 h-8 rounded-lg border border-zinc-200 cursor-pointer bg-transparent shrink-0"
                          />
                          <span className="text-xs font-mono font-bold text-zinc-600 truncate">{layer.color}</span>
                        </div>
                      </div>

                      <div className="sm:col-span-2 flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-zinc-500 block mb-1">X Pos (%)</label>
                          <input
                            type="number"
                            min={0}
                            max={95}
                            value={layer.x}
                            onChange={(e) => updateTextLayer(layer.id, "x", Number(e.target.value))}
                            className="w-full bg-white border border-zinc-200 rounded-xl px-2 py-1.5 text-sm font-mono font-semibold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-bold text-zinc-500 block mb-1">Y Pos (%)</label>
                          <input
                            type="number"
                            min={0}
                            max={95}
                            value={layer.y}
                            onChange={(e) => updateTextLayer(layer.id, "y", Number(e.target.value))}
                            className="w-full bg-white border border-zinc-200 rounded-xl px-2 py-1.5 text-sm font-mono font-semibold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Dynamic Sizes Configuration Section */}
        <div className="pt-4 border-t border-zinc-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-zinc-900">Custom Dimensions / Print Sizes</h3>
              <p className="text-base text-zinc-500 mt-0.5">
                Leave empty if category has 1 standard size. Add sizes if this category is offered in multiple physical dimensions.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setPrintSizes((prev) => [
                  ...prev,
                  {
                    name: "",
                    width: Number(form.canvas_width) || 1,
                    height: Number(form.canvas_height) || 1,
                    unit: form.unit,
                    bleed: Number(form.bleed) || 0,
                    bleedUnit: form.bleedUnit || form.unit,
                    safeArea: Number(form.safe_area) || 0,
                    safeAreaUnit: form.safeAreaUnit || form.unit,
                    note: "",
                  },
                ])
              }
              className="px-3 py-1.5 text-base font-bold rounded-xl bg-zinc-900 text-white cursor-pointer shrink-0"
            >
              Add size
            </button>
          </div>

          {printSizes.length === 0 ? (
            <p className="text-base text-zinc-400">This product uses the default canvas width and height specified above.</p>
          ) : (
            <div className="space-y-3">
              {printSizes.map((size, index) => (
                <div key={`${size.name}-${index}`} className="rounded-2xl border border-zinc-200 bg-[#fbfaf7] p-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      value={size.name}
                      onChange={(e) =>
                        setPrintSizes((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))
                      }
                      placeholder="Size name"
                      className="sm:col-span-4 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                    />
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={size.width}
                      onChange={(e) =>
                        setPrintSizes((prev) => prev.map((row, i) => (i === index ? { ...row, width: Number(e.target.value) } : row)))
                      }
                      className="sm:col-span-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-base font-mono text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                    />
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={size.height}
                      onChange={(e) =>
                        setPrintSizes((prev) => prev.map((row, i) => (i === index ? { ...row, height: Number(e.target.value) } : row)))
                      }
                      className="sm:col-span-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-base font-mono text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                    />
                    <select
                      value={size.unit}
                      onChange={(e) =>
                        setPrintSizes((prev) => prev.map((row, i) => (i === index ? { ...row, unit: asCanvasUnit(e.target.value, row.unit) } : row)))
                      }
                      className="sm:col-span-2 bg-white border border-zinc-200 rounded-xl px-2 py-2 text-base font-bold text-zinc-900"
                    >
                      <option value="in">inches</option>
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="px">pixels</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setPrintSizes((prev) => prev.filter((_, i) => i !== index))}
                      className="sm:col-span-2 text-base font-bold text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <label className="text-base font-bold text-zinc-500">
                      Bleed
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={size.bleed}
                        onChange={(e) =>
                          setPrintSizes((prev) => prev.map((row, i) => (i === index ? { ...row, bleed: Number(e.target.value) } : row)))
                        }
                        className="mt-1 w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-base font-mono text-zinc-900"
                      />
                    </label>
                    <label className="text-base font-bold text-zinc-500">
                      Bleed unit
                      <select
                        value={size.bleedUnit}
                        onChange={(e) =>
                          setPrintSizes((prev) => prev.map((row, i) => (i === index ? { ...row, bleedUnit: asCanvasUnit(e.target.value, row.unit) } : row)))
                        }
                        className="mt-1 w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-base font-bold text-zinc-900"
                      >
                        <option value="in">in</option>
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                        <option value="px">px</option>
                      </select>
                    </label>
                    <label className="text-base font-bold text-zinc-500">
                      Safe area
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={size.safeArea}
                        onChange={(e) =>
                          setPrintSizes((prev) => prev.map((row, i) => (i === index ? { ...row, safeArea: Number(e.target.value) } : row)))
                        }
                        className="mt-1 w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-base font-mono text-zinc-900"
                      />
                    </label>
                    <label className="text-base font-bold text-zinc-500">
                      Safe unit
                      <select
                        value={size.safeAreaUnit}
                        onChange={(e) =>
                          setPrintSizes((prev) => prev.map((row, i) => (i === index ? { ...row, safeAreaUnit: asCanvasUnit(e.target.value, row.unit) } : row)))
                        }
                        className="mt-1 w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-base font-bold text-zinc-900"
                      >
                        <option value="in">in</option>
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                        <option value="px">px</option>
                      </select>
                    </label>
                  </div>
                  <input
                    value={size.note || ""}
                    onChange={(e) =>
                      setPrintSizes((prev) => prev.map((row, i) => (i === index ? { ...row, note: e.target.value } : row)))
                    }
                    placeholder="Optional note"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-base text-zinc-700 focus:outline-none focus:border-[#e74b2d]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Product Variations Card (Vistaprint style) */}
      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              Category Default Variations & Options
            </h2>
            <p className="text-base text-zinc-500 mt-0.5">
              Configure default variation groups (e.g. Paper Stock, Finish, Corner Style) and options for products in this category.
            </p>
          </div>
          <button
            type="button"
            onClick={addVariation}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Variation Group
          </button>
        </div>

        {variations.length === 0 ? (
          <div className="text-center py-8 bg-[#fbfaf7] border-2 border-dashed border-zinc-200 rounded-2xl">
            <p className="text-base font-medium text-zinc-500 mb-2">
              No category variations configured yet.
            </p>
            <button
              type="button"
              onClick={addVariation}
              className="text-base font-bold text-[#e74b2d] hover:underline cursor-pointer"
            >
              + Click here to add default variation (e.g. Paper Stock, Corners)
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {variations.map((v, varIdx) => (
              <div
                key={v._id || `cat-var-${varIdx}`}
                className="border border-zinc-200/80 rounded-2xl p-5 bg-[#fafcfd] space-y-4"
              >
                {/* Variation Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-zinc-200/60 shadow-2sm">
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="text-base font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Variation Group Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={v.name}
                      onChange={(e) => updateVariationField(varIdx, "name", e.target.value)}
                      placeholder="e.g. Paper Stock, Corner Style"
                      className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-lg px-3 py-1.5 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                    />
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <label className="flex items-center gap-2 text-base font-bold text-zinc-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={v.required}
                        onChange={(e) => updateVariationField(varIdx, "required", e.target.checked)}
                        className="rounded border-zinc-300 text-[#e74b2d] focus:ring-[#e74b2d] w-4 h-4 cursor-pointer"
                      />
                      Required Selection
                    </label>

                    <button
                      type="button"
                      onClick={() => removeVariation(varIdx)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete variation group"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Values List */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-zinc-700 uppercase tracking-wider">
                      Option Values for &ldquo;{v.name || "Variation"}&rdquo;
                    </h3>
                    <button
                      type="button"
                      onClick={() => addVariationValue(varIdx)}
                      className="text-base font-bold text-[#e74b2d] hover:underline cursor-pointer"
                    >
                      + Add Option Value
                    </button>
                  </div>

                  {v.values.map((val, valIdx) => {
                    const uploadKey = `${varIdx}-${valIdx}`;
                    const isUploadingThis = uploadingValImage === uploadKey;
                    const isFree = parseFloat(val.price) === 0 || val.price === "" || val.price === "0";

                    return (
                      <div
                        key={val._id || `cat-val-${varIdx}-${valIdx}`}
                        className="bg-white border border-zinc-200 rounded-xl p-3.5 space-y-3 shadow-2sm"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                          {/* Name */}
                          <div className="sm:col-span-5">
                            <label className="text-base font-bold text-zinc-500 block mb-1">
                              Option Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={val.name}
                              onChange={(e) => updateVariationValue(varIdx, valIdx, "name", e.target.value)}
                              placeholder="e.g. Standard Matte (14 pt)"
                              className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-lg px-3 py-1.5 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                            />
                          </div>

                          {/* Price */}
                          <div className="sm:col-span-3">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-base font-bold text-zinc-500">Price (USD)</label>
                              <span
                                className={`text-base font-extrabold px-1.5 py-0.5 rounded-full ${
                                  isFree ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-700"
                                }`}
                              >
                                {isFree ? "FREE ($0)" : `+$${parseFloat(val.price || "0").toFixed(2)}`}
                              </span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-base font-bold">
                                $
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={val.price}
                                onChange={(e) =>
                                  updateVariationValue(varIdx, valIdx, "price", e.target.value)
                                }
                                placeholder="0 (Free)"
                                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-lg pl-6 pr-3 py-1.5 text-base font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                              />
                            </div>
                          </div>

                          {/* Image */}
                          <div className="sm:col-span-3">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-base font-bold text-zinc-500">Image</label>
                              <label className="text-base font-bold text-[#e74b2d] hover:underline cursor-pointer">
                                {isUploadingThis ? "Uploading..." : "↑ Upload"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={isUploadingThis}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    e.target.value = "";
                                    void handleValueImageUpload(varIdx, valIdx, file);
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={val.image}
                                onChange={(e) =>
                                  updateVariationValue(varIdx, valIdx, "image", e.target.value)
                                }
                                placeholder="Image URL / S3"
                                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-lg px-2.5 py-1.5 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                              />
                              {val.image && (
                                <img
                                  src={val.image}
                                  alt="Preview"
                                  className="w-7 h-7 rounded-md object-cover border border-zinc-200 shadow-2sm flex-shrink-0 bg-white"
                                />
                              )}
                            </div>
                          </div>

                          {/* Remove */}
                          <div className="sm:col-span-1 flex items-center justify-center pt-5">
                            <button
                              type="button"
                              onClick={() => removeVariationValue(varIdx, valIdx)}
                              className="text-zinc-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove option"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <input
                            type="text"
                            value={val.description}
                            onChange={(e) =>
                              updateVariationValue(varIdx, valIdx, "description", e.target.value)
                            }
                            placeholder="Optional description (e.g., Smooth coated paper with subtle sheen)"
                            className="w-full bg-[#fbfaf7] border border-zinc-100 rounded-lg px-3 py-1 text-base text-zinc-600 focus:outline-none focus:border-[#e74b2d]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </>
      )}

      {/* FULLSCREEN CANVAS & 3D PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#12151e] border border-zinc-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-[#181c28]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e74b2d]/20 border border-[#e74b2d]/40 flex items-center justify-center text-[#f88768]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{form.name || "Category"} Canvas Preview</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                      {form.canvas_width} × {form.canvas_height} {form.unit}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Live structure preview for template creation ({sideMode.toUpperCase()} mode · {sidesCount} sides)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Mode Tabs */}
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalTab("3d")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      modalTab === "3d" ? "bg-[#e74b2d] text-white shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    3D Box View
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("2d")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      modalTab === "2d" ? "bg-[#e74b2d] text-white shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    2D Canvas Dieline
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-base font-bold"
                  title="Close preview"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center bg-[#0b0d13]">
              {modalTab === "3d" ? (
                <div className="w-full h-[480px] relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-[#0f1115]">
                  <ThreeDCardPreview
                    categoryName={form.name || "Packaging Box"}
                    canvasConfig={{
                      width: Number(form.canvas_width) || 105,
                      height: Number(form.canvas_height) || 60,
                      unit: form.unit,
                      orientation: form.orientation,
                      bleed: Number(form.bleed) || 0,
                      bleedUnit: form.bleedUnit || form.unit,
                      safe_area: Number(form.safe_area) || 0,
                      safeAreaUnit: form.safeAreaUnit || form.unit,
                      supports_back_side: sideMode !== "single",
                      side_mode: sideMode,
                      sides_count: sidesCount,
                      sides_names: sidesNames,
                    }}
                    bgColor={form.background_color}
                    backBgColor={form.background_color}
                    logoText={logoText}
                    logoPosition={logoPosition}
                    logoSize={logoSize}
                    textLayers={textLayers}
                    sideDesigns={Array.from({ length: Math.max(1, sidesCount) }, (_, idx) => ({
                      bgColor: form.background_color || "#18181b",
                      objects:
                        idx === 0
                          ? textLayers.map((l) => ({
                              id: l.id,
                              type: "text",
                              text: l.text,
                              x: l.x,
                              y: l.y,
                              fontSize: l.fontSize,
                              color: l.color,
                              fontWeight: l.fontWeight,
                            }))
                          : [
                              {
                                id: `preview-label-${idx}`,
                                type: "text",
                                text: sidesNames[idx] || `Side ${idx + 1}`,
                                x: 50,
                                y: 46,
                                fontSize: 16,
                                color: "#f88768",
                                fontWeight: "bold",
                                textAlign: "center",
                              },
                            ],
                    }))}
                    frontDesign={{
                      bgColor: form.background_color,
                      objects: textLayers.map((l) => ({
                        id: l.id,
                        type: "text",
                        text: l.text,
                        x: l.x,
                        y: l.y,
                        fontSize: l.fontSize,
                        color: l.color,
                        fontWeight: l.fontWeight,
                      })),
                    }}
                  />
                </div>
              ) : (
                <div
                  className="rounded-2xl shadow-2xl relative border-2 border-dashed border-sky-400/60 overflow-hidden transition-all flex items-center justify-center"
                  style={{
                    width: `${Math.min(680, previewBoxW * 2.2)}px`,
                    height: `${Math.min(480, previewBoxH * 2.2)}px`,
                    backgroundColor: form.background_color || "#ffffff",
                  }}
                >
                  {/* Bleed outline indicator */}
                  {Number(form.bleed) > 0 && (
                    <div className="absolute inset-0 border border-red-500/50 pointer-events-none" title={`Bleed: ${form.bleed}${form.bleedUnit}`} />
                  )}
                  {/* Safe area outline indicator */}
                  {Number(form.safe_area) > 0 && (
                    <div
                      className="absolute border border-dashed border-emerald-500/60 pointer-events-none"
                      style={{ left: "5%", right: "5%", top: "5%", bottom: "5%" }}
                      title={`Safe Area: ${form.safe_area}${form.safeAreaUnit}`}
                    />
                  )}

                  {/* Fold Lines Overlay */}
                  <CanvasGuideLinesOverlay
                    lines={guideLines}
                    canvasWidth={numW}
                    canvasHeight={numH}
                    canvasUnit={form.unit}
                  />

                  {/* Logo preview */}
                  {logoText && (
                    <div
                      className={`absolute z-20 font-bold tracking-widest text-zinc-100 flex items-center justify-center border border-white/30 rounded px-2 py-1 bg-black/40 backdrop-blur pointer-events-none select-none ${
                        logoPosition === "top-right"
                          ? "top-3 right-3"
                          : logoPosition === "top-left"
                          ? "top-3 left-3"
                          : logoPosition === "center"
                          ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                          : "bottom-3 right-3"
                      }`}
                      style={{ fontSize: `${Math.max(12, logoSize)}px` }}
                    >
                      {logoText}
                    </div>
                  )}

                  {/* Text layers preview */}
                  {textLayers.map((layer) => (
                    <div
                      key={layer.id}
                      className="absolute z-20 select-none px-1 rounded transition-all"
                      style={{
                        left: `${layer.x}%`,
                        top: `${layer.y}%`,
                        fontSize: `${Math.max(11, layer.fontSize)}px`,
                        color: layer.color || "#ffffff",
                        fontWeight: layer.fontWeight || "normal",
                        fontStyle: layer.fontStyle || "normal",
                        textAlign: layer.textAlign || "left",
                        letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}px` : "normal",
                      }}
                    >
                      {layer.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-[#181c28] border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-4">
                <span>Side Mode: <strong className="text-white">{sideMode.toUpperCase()}</strong></span>
                <span>Panels: <strong className="text-white">{sidesCount} ({sidesNames.join(", ")})</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminMediaLibraryModal
        open={Boolean(mediaPicker)}
        title={
          mediaPicker?.purpose === "color"
            ? "Garment color mockup"
            : mediaPicker?.purpose === "layer"
              ? "Logo / image layer"
              : mediaPicker?.purpose === "banner"
                ? "Category page banner"
                : "Product mockup"
        }
        currentUrl={mediaPicker?.currentUrl || ""}
        folder={mediaPicker?.folder || "uploads"}
        onClose={() => setMediaPicker(null)}
        onSelect={(url) => {
          if (!mediaPicker) return;
          if (mediaPicker.purpose === "banner") {
            setBannerImage(url);
          } else if (mediaPicker.purpose === "mockup") {
            const side = mediaPicker.side || editSide;
            if (side === "front") {
              setMockupImage(url);
              setPrintPlacements((prev) =>
                prev.map((p) => (p.id === "front" ? { ...p, mockupImage: url } : p))
              );
            } else {
              setPrintPlacements((prev) => {
                if (!prev.some((p) => p.id === "back")) {
                  return [
                    ...prev,
                    {
                      id: "back",
                      name: "Back",
                      mockupImage: url,
                      printArea: { x: 28, y: 18, width: 44, height: 42, label: "Back Print" },
                    },
                  ];
                }
                return prev.map((p) => (p.id === "back" ? { ...p, mockupImage: url } : p));
              });
            }
            setCanvasType("mockup");
          } else if (mediaPicker.purpose === "color" && typeof mediaPicker.colorIdx === "number") {
            const idx = mediaPicker.colorIdx;
            setApparelColors((prev) =>
              prev.map((c, i) => (i === idx ? { ...c, mockupImage: url } : c))
            );
          } else if (mediaPicker.purpose === "layer") {
            const newId =
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : Date.now().toString();
            const newLayer: TextLayer = {
              id: newId,
              type: "image",
              text: "Logo",
              src: url,
              x: 50,
              y: 55,
              fontSize: 14,
              color: "#111111",
              fontWeight: "normal",
              width: 36,
              height: 36,
              placementId: mediaPicker.side || editSide,
            };
            setTextLayers((prev) => [...prev, newLayer]);
            setActiveLayerId(newId);
          }
          setMediaPicker(null);
        }}
      />
    </form>
  );
}
