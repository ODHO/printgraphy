"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThreeDCardPreview, { DynamicCanvasConfig } from "@/components/ThreeDCardPreview";
import { calculateFitDimensions, CanvasDimensions, CanvasUnit, type PrintSize } from "@/lib/canvasUtils";
import { mediaSrc } from "@/lib/mediaUrl";
import SpacingGapOverlay from "@/components/SpacingGapOverlay";
import {
  selectionGapForAnchor,
  selectionGapFromElement,
  selectionGapFromPercents,
  snapDragBox,
  snapTargetsFromCard,
  type SelectionGap,
} from "@/lib/cardRender";
import type { ICanvasGuideLine, SideMode } from "@/models/Category";
import CanvasGuideLinesOverlay from "@/components/CanvasGuideLinesOverlay";
import { cleanGuideLines } from "@/lib/guideLines";

export interface CanvasObject {
  id: string;
  type: "text" | "shape" | "image" | "logo";
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage of canvas width
  height: number; // percentage of canvas height
  widthMode?: "inline" | "full" | "custom";
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
  letterSpacing?: number;
  underline?: boolean;
  textTransform?: "none" | "uppercase" | "lowercase";
  // Shape specific
  shapeType?: "rectangle" | "rounded-rect" | "circle" | "line" | "badge";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  // Image specific
  src?: string;
  fit?: "contain" | "cover";
  lockAspectRatio?: boolean;
}

export interface DesignSideState {
  bgColor: string;
  bgImage?: string;
  bgFit?: "cover" | "contain";
  bgOpacity?: number;
  bgGradient?: string;
  bgGradientAngle?: number;
  bgStyle?: "color" | "gradient" | "image" | "image-gradient";
  objects: CanvasObject[];
}

export interface CategoryVariationValue {
  name: string;
  price: number;
  description?: string;
}

export interface CategoryVariation {
  name: string;
  required?: boolean;
  values: CategoryVariationValue[];
}

export interface CategoryInfo {
  _id?: string;
  name: string;
  slug?: string;
  canvas_width: number;
  canvas_height: number;
  unit: "mm" | "cm" | "in" | "px";
  orientation: "landscape" | "portrait";
  bleed: number;
  bleedUnit?: CanvasUnit;
  safe_area: number;
  safeAreaUnit?: CanvasUnit;
  background_color?: string;
  supports_back_side: boolean;
  side_mode?: SideMode;
  sides_count?: number;
  sides_names?: string[];
  guide_lines?: ICanvasGuideLine[];
  canvas_type?: "flat" | "dieline" | "mockup";
  mockup_image?: string;
  print_area?: { x: number; y: number; width: number; height: number; label?: string };
  variations?: CategoryVariation[];
  printSizes?: PrintSize[];
}

function resolveSideMode(cat: Partial<CategoryInfo>): SideMode {
  if (cat.side_mode === "single" || cat.side_mode === "double" || cat.side_mode === "multi") {
    return cat.side_mode;
  }
  const count = Number(cat.sides_count);
  if (count > 2) return "multi";
  if (cat.supports_back_side === false || count === 1) return "single";
  return "double";
}

function resolveSidesCount(cat: Partial<CategoryInfo>): number {
  const mode = resolveSideMode(cat);
  const count = Number(cat.sides_count);
  if (Number.isFinite(count) && count > 0) {
    if (mode === "single") return 1;
    if (mode === "double") return 2;
    return Math.max(3, count);
  }
  return mode === "single" ? 1 : mode === "multi" ? 3 : 2;
}

function resolveSidesNames(cat: Partial<CategoryInfo>): string[] {
  const count = resolveSidesCount(cat);
  const names = Array.isArray(cat.sides_names) ? cat.sides_names.filter(Boolean) : [];
  if (names.length >= count) return names.slice(0, count);
  const defaults =
    count === 1
      ? ["Front Side"]
      : count === 2
        ? ["Front Side", "Back Side"]
        : Array.from({ length: count }, (_, i) => `Side ${i + 1}`);
  return Array.from({ length: count }, (_, i) => names[i] || defaults[i]);
}

/** Human label for canvas/product style shown in the editor */
function canvasStyleLabel(cat: Partial<CategoryInfo>): string {
  const mode = resolveSideMode(cat);
  const count = resolveSidesCount(cat);
  const name = (cat.name || "").toLowerCase();
  if (mode === "multi" || count > 2) {
    if (name.includes("box") || name.includes("packag") || name.includes("carton")) {
      return `Box Net · ${count} Panels`;
    }
    if (name.includes("brochure") || name.includes("fold")) {
      return `Multi-Fold · ${count} Panels`;
    }
    return `Multi-Side · ${count} Panels`;
  }
  if (mode === "single" || count === 1) return "Single-Sided";
  if (name.includes("t-shirt") || name.includes("apparel") || name.includes("shirt")) {
    return "Apparel · Front & Back";
  }
  return "Double-Sided · Front & Back";
}

interface CategoryCanvasEditorProps {
  mode: "create" | "edit";
  templateId?: string;
  initialCategory?: CategoryInfo;
  allCategories?: CategoryInfo[];
  initialData?: {
    title?: string;
    description?: string;
    price?: number;
    tags?: string[];
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    thumbnail?: string;
    front_design?: DesignSideState;
    back_design?: DesignSideState;
    side_designs?: DesignSideState[];
    canvas_config?: Partial<CategoryInfo>;
    selectedVariations?: Record<string, string>;
  };
}

const COLOR_PALETTE = [
  "#18181b", "#141414", "#09090b", "#ffffff", "#f4f4f5",
  "#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4",
  "#e74b2d", "#6366f1", "#8b5cf6", "#ec4899", "#78716c",
];

const FONT_FAMILIES = [
  { label: "Modern Sans", value: "system-ui, -apple-system, sans-serif" },
  { label: "Elegant Serif", value: "Georgia, Cambria, 'Times New Roman', serif" },
  { label: "Clean Monospace", value: "ui-monospace, Menlo, Monaco, monospace" },
  { label: "Impact Display", value: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
];

export default function CategoryCanvasEditor({
  mode,
  templateId,
  initialCategory,
  allCategories = [],
  initialData,
}: CategoryCanvasEditorProps) {
  const router = useRouter();

  // Active Category State
  const [category, setCategory] = useState<CategoryInfo>(() => {
    const base =
      initialCategory ||
      allCategories[0] ||
      ({
        name: "Business Cards",
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
      } as CategoryInfo);
    return {
      ...base,
      side_mode: resolveSideMode(base),
      sides_count: resolveSidesCount(base),
      sides_names: resolveSidesNames(base),
      guide_lines: cleanGuideLines(base.guide_lines),
      supports_back_side: resolveSideMode(base) !== "single",
    };
  });

  // Template Meta State
  const [title, setTitle] = useState(initialData?.title || "Untitled Template");
  const [description, setDescription] = useState(initialData?.description || "");
  const [price, setPrice] = useState(String(initialData?.price || 0));
  const [tags, setTags] = useState(initialData?.tags?.join(", ") || "");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">(
    initialData?.status || "DRAFT"
  );
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>(() => {
    const defaults = { ...(initialData?.selectedVariations || {}) };
    category.variations?.forEach((variation) => {
      if (!defaults[variation.name] && variation.values?.[0]?.name) {
        defaults[variation.name] = variation.values[0].name;
      }
    });
    return defaults;
  });

  const sideNames = resolveSidesNames(category);
  const sideMode = resolveSideMode(category);
  const sidesCount = resolveSidesCount(category);
  const styleLabel = canvasStyleLabel(category);
  const widthLabel = `${category.canvas_width} × ${category.canvas_height} ${category.unit}`;

  const emptySide = (bg?: string): DesignSideState => ({
    bgColor: bg || "#141414",
    objects: [],
  });

  // Design Sides State (index 0 = front, 1 = back; extra panels for multi-side / box products)
  const [activeSideIndex, setActiveSideIndex] = useState(0);
  const activeSide: "front" | "back" = activeSideIndex === 0 ? "front" : activeSideIndex === 1 ? "back" : "front";

  const [frontDesign, setFrontDesign] = useState<DesignSideState>(() => {
    const savedSides = initialData?.side_designs;
    if (Array.isArray(savedSides) && savedSides.length >= 1 && savedSides[0]?.objects && !initialData?.front_design?.objects?.length) {
      return savedSides[0];
    }
    if (initialData?.front_design?.objects?.length) {
      return initialData.front_design;
    }
    return {
      bgColor: category.background_color || "#18181b",
      objects: [
        {
          id: "obj-1",
          type: "text",
          text: "Stephen Vance",
          x: 10,
          y: 28,
          width: 50,
          height: 15,
          fontSize: 24,
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "left",
        },
        {
          id: "obj-2",
          type: "text",
          text: "Chief Operating Officer",
          x: 10,
          y: 46,
          width: 50,
          height: 10,
          fontSize: 13,
          color: "#f88768",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          id: "obj-3",
          type: "text",
          text: "+1 (555) 234-5678 • stephen@company.com",
          x: 10,
          y: 78,
          width: 70,
          height: 10,
          fontSize: 11,
          color: "#d4d4d8",
          fontWeight: "normal",
          textAlign: "left",
        },
      ],
    };
  });

  const [backDesign, setBackDesign] = useState<DesignSideState>(() => {
    const savedSides = initialData?.side_designs;
    if (Array.isArray(savedSides) && savedSides.length >= 2 && savedSides[1]?.objects && !initialData?.back_design?.objects?.length) {
      return savedSides[1];
    }
    if (initialData?.back_design) return initialData.back_design;
    return emptySide("#141414");
  });

  const [extraSideDesigns, setExtraSideDesigns] = useState<DesignSideState[]>(() => {
    const saved = initialData?.side_designs || [];
    if (!saved.length) return [];
    // Full panel list was saved as side_designs ([front, back, ...extras])
    if (saved.length >= 3 && initialData?.front_design?.objects?.[0]?.id && saved[0]?.objects?.[0]?.id === initialData.front_design.objects[0].id) {
      return saved.slice(2).map((s) => ({ ...s, objects: [...(s.objects || [])] }));
    }
    // Full list without separate front_design
    if (saved.length >= 3 && !initialData?.front_design?.objects?.length) {
      return saved.slice(2).map((s) => ({ ...s, objects: [...(s.objects || [])] }));
    }
    // Extras-only list
    return saved.map((s) => ({ ...s, objects: [...(s.objects || [])] }));
  });

  // Keep extra panel slots in sync with category sides count
  useEffect(() => {
    const needed = Math.max(0, sidesCount - 2);
    setExtraSideDesigns((prev) => {
      if (prev.length === needed) return prev;
      if (prev.length > needed) return prev.slice(0, needed);
      const next = [...prev];
      while (next.length < needed) next.push(emptySide("#141414"));
      return next;
    });
    if (activeSideIndex >= sidesCount) setActiveSideIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidesCount]);

  // Full ordered list for 3D + save (every editable panel)
  const allSideDesigns: DesignSideState[] = Array.from({ length: Math.max(1, sidesCount) }, (_, i) => {
    if (i === 0) return frontDesign;
    if (i === 1) return backDesign;
    return extraSideDesigns[i - 2] || emptySide("#141414");
  });

  // Editor Interaction State
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"text" | "shapes" | "images" | "background" | "variations" | "layers">("text");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [isFullscreen, setIsFullscreen] = useState(true);

  const [showGuides, setShowGuides] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [removingBackgroundId, setRemovingBackgroundId] = useState<string | null>(null);
  const [backgroundTolerance, setBackgroundTolerance] = useState(45);
  const [alignmentLines, setAlignmentLines] = useState<{ type: "v" | "h"; pos: number }[]>([]);
  const [selectionGap, setSelectionGap] = useState<SelectionGap | null>(null);

  // History Stack for Undo/Redo
  const [history, setHistory] = useState<{ front: DesignSideState; back: DesignSideState }[]>(() => [
    { front: frontDesign, back: backDesign },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Dragging & Resizing Refs
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dragNodeRef = useRef<HTMLElement | null>(null);
  const dragStartPosRef = useRef<{ clientX: number; clientY: number; objX: number; objY: number } | null>(null);
  const resizingRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    objX: number;
    objY: number;
    lockAspectRatio: boolean;
  } | null>(null);
  const objectClipboardRef = useRef<CanvasObject | null>(null);

  // Active side design shortcut (0=front, 1=back, 2+=extra panels for boxes / multi-fold)
  const currentSideDesign =
    activeSideIndex <= 0
      ? frontDesign
      : activeSideIndex === 1
        ? backDesign
        : extraSideDesigns[activeSideIndex - 2] || emptySide("#141414");

  const applyCurrentSideDesign = (next: DesignSideState) => {
    const cloned: DesignSideState = {
      ...next,
      objects: (next.objects || []).map((o) => ({ ...o })),
    };
    if (activeSideIndex <= 0) setFrontDesign(cloned);
    else if (activeSideIndex === 1) setBackDesign(cloned);
    else {
      setExtraSideDesigns((prev) => {
        const copy = [...prev];
        while (copy.length < activeSideIndex - 1) copy.push(emptySide("#141414"));
        copy[activeSideIndex - 2] = cloned;
        return copy;
      });
    }
  };

  const setCurrentSideDesign = applyCurrentSideDesign;
  const selectedObject = currentSideDesign.objects.find((o) => o.id === selectedObjectId) || null;

  // Track selection gap overlay for 2D Canvas
  useEffect(() => {
    if (viewMode !== "2d" || !selectedObjectId || !canvasRef.current) {
      setSelectionGap(null);
      return;
    }
    const canvas = canvasRef.current;
    const el = canvas.querySelector<HTMLElement>(`[data-snap-id="${CSS.escape(selectedObjectId)}"]`);
    if (!canvas || !el) {
      setSelectionGap(null);
      return;
    }
    setSelectionGap(selectionGapFromElement(canvas, el));
  }, [viewMode, selectedObjectId, currentSideDesign.objects, activeSideIndex]);

  // Push to history
  const recordHistory = useCallback(
    (newFront: DesignSideState, newBack: DesignSideState) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, { front: newFront, back: newBack }];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setFrontDesign(target.front);
      setBackDesign(target.back);
      setHistoryIndex(historyIndex - 1);
      setSelectedObjectId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setFrontDesign(target.front);
      setBackDesign(target.back);
      setHistoryIndex(historyIndex + 1);
      setSelectedObjectId(null);
    }
  };

  // Viewport Fit Dimensions Calculation
  const canvasConfigDim: CanvasDimensions = {
    width: category.canvas_width,
    height: category.canvas_height,
    unit: category.unit,
    orientation: category.orientation,
    bleed: category.bleed,
    bleedUnit: category.bleedUnit || category.unit,
    safe_area: category.safe_area,
    safeAreaUnit: category.safeAreaUnit || category.unit,
  };

  const fitDims = calculateFitDimensions(canvasConfigDim, 680 * zoomLevel, 450 * zoomLevel);

  // Change Category handler — resets canvas designs to match new category geometry
  const handleCategoryChange = (catId: string) => {
    const found = allCategories.find((c) => c._id === catId);
    if (!found) return;

    const hasFrontObjects = frontDesign.objects.length > 0;
    const hasBackObjects = backDesign.objects.length > 0;
    const hasContent = hasFrontObjects || hasBackObjects;

    if (hasContent) {
      const confirmed = window.confirm(
        `Switching to "${found.name}" will clear the current canvas design and reset to the new category's dimensions.\n\nContinue?`
      );
      if (!confirmed) return;
    }

    // Reset sides to blank canvases using the new category's geometry + side config
    const newBg = found.background_color || "#18181b";
    const emptyFront: DesignSideState = { bgColor: newBg, objects: [] };
    const emptyBack: DesignSideState = { bgColor: "#141414", objects: [] };
    const normalized: CategoryInfo = {
      ...found,
      side_mode: resolveSideMode(found),
      sides_count: resolveSidesCount(found),
      sides_names: resolveSidesNames(found),
      guide_lines: cleanGuideLines(found.guide_lines),
      supports_back_side: resolveSideMode(found) !== "single",
    };

    setCategory(normalized);
    setFrontDesign(emptyFront);
    setBackDesign(emptyBack);
    setExtraSideDesigns(
      Array.from({ length: Math.max(0, resolveSidesCount(normalized) - 2) }, () => emptySide("#141414"))
    );
    setSelectedObjectId(null);
    setHistory([{ front: emptyFront, back: emptyBack }]);
    setHistoryIndex(0);
    setActiveSideIndex(0);

    const initialVars: Record<string, string> = {};
    if (found.variations && found.variations.length > 0) {
      found.variations.forEach((v) => {
        if (v.values?.[0]?.name) {
          initialVars[v.name] = v.values[0].name;
        }
      });
    }
    setSelectedVariations(initialVars);
  };

  // Add Objects
  const handleAddText = (preset: "heading" | "subheading" | "body") => {
    const newId = `text-${Date.now()}`;
    const newObj: CanvasObject = {
      id: newId,
      type: "text",
      text: preset === "heading" ? "Heading Text" : preset === "subheading" ? "Subheading Text" : "Body paragraph text",
      x: 20,
      y: 35,
      width: 0,
      height: 0,
      widthMode: "inline",
      fontSize: preset === "heading" ? 26 : preset === "subheading" ? 16 : 12,
      color: "#ffffff",
      fontWeight: preset === "heading" ? "bold" : "normal",
      textAlign: "left",
      fontFamily: FONT_FAMILIES[0].value,
    };

    const nextObjects = [...currentSideDesign.objects, newObj];
    const nextDesign = { ...currentSideDesign, objects: nextObjects };
    setCurrentSideDesign(nextDesign);
    setSelectedObjectId(newId);
    recordHistory(
      activeSideIndex <= 0 ? nextDesign : frontDesign,
      activeSideIndex === 1 ? nextDesign : backDesign
    );
  };

  const handleAddShape = (shapeType: CanvasObject["shapeType"]) => {
    const newId = `shape-${Date.now()}`;
    const newObj: CanvasObject = {
      id: newId,
      type: "shape",
      shapeType,
      x: 35,
      y: 35,
      width: 20,
      height: 20,
      fill: "#e74b2d",
      stroke: "#ffffff",
      strokeWidth: 0,
      borderRadius: shapeType === "rounded-rect" ? 12 : 0,
    };

    const nextObjects = [...currentSideDesign.objects, newObj];
    const nextDesign = { ...currentSideDesign, objects: nextObjects };
    setCurrentSideDesign(nextDesign);
    setSelectedObjectId(newId);
    recordHistory(
      activeSideIndex <= 0 ? nextDesign : frontDesign,
      activeSideIndex === 1 ? nextDesign : backDesign
    );
  };

  const storeGraphic = async (file: File) => {
    const preview = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read the image"));
      reader.readAsDataURL(file);
    });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (data.success && data.url) return data.url as string;
    } catch {
      /* keep the local preview if the bucket upload fails */
    }
    return preview;
  };

  const commitSide = (next: DesignSideState, selectId?: string) => {
    setCurrentSideDesign(next);
    if (selectId) setSelectedObjectId(selectId);
    recordHistory(
      activeSideIndex <= 0 ? next : frontDesign,
      activeSideIndex === 1 ? next : backDesign
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, asBackground = false) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const src = await storeGraphic(file);
    if (asBackground) {
      commitSide({
        ...currentSideDesign,
        bgImage: src,
        bgFit: currentSideDesign.bgFit || "cover",
        bgOpacity: currentSideDesign.bgOpacity ?? 1,
        bgStyle: currentSideDesign.bgGradient || currentSideDesign.bgStyle === "image-gradient" ? "image-gradient" : "image",
      });
      return;
    }
    const newId = `img-${Date.now()}`;
    const newObj: CanvasObject = {
      id: newId,
      type: "image",
      src,
      x: 30,
      y: 30,
      width: 28,
      height: 28,
      opacity: 1,
      fit: "contain",
      lockAspectRatio: true,
    };
    commitSide({ ...currentSideDesign, objects: [...currentSideDesign.objects, newObj] }, newId);
  };

  // Update Selected Object
  const updateSelectedObject = (updates: Partial<CanvasObject>) => {
    if (!selectedObjectId) return;
    const nextObjects = currentSideDesign.objects.map((o) =>
      o.id === selectedObjectId ? { ...o, ...updates } : o
    );
    const nextDesign = { ...currentSideDesign, objects: nextObjects };
    setCurrentSideDesign(nextDesign);
  };

  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedObjectId) return;
    const src = await storeGraphic(file);
    updateSelectedObject({ src });
  };

  const handleRemoveImageBackground = async () => {
    if (!selectedObject?.src || (selectedObject.type !== "image" && selectedObject.type !== "logo")) return;
    const objectId = selectedObject.id;
    setRemovingBackgroundId(objectId);
    setSaveMessage("Removing the connected solid background...");

    try {
      const response = await fetch(mediaSrc(selectedObject.src) || selectedObject.src);
      if (!response.ok) throw new Error("Could not load the selected image.");
      const bitmap = await createImageBitmap(await response.blob());
      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Background removal is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();

      const image = context.getImageData(0, 0, width, height);
      const pixels = image.data;
      const cornerIndexes = [0, width - 1, (height - 1) * width, width * height - 1];
      const background = cornerIndexes.reduce(
        (sum, pixelIndex) => {
          const offset = pixelIndex * 4;
          return [sum[0] + pixels[offset], sum[1] + pixels[offset + 1], sum[2] + pixels[offset + 2]];
        },
        [0, 0, 0]
      ).map((value) => value / cornerIndexes.length);
      const isBackground = (pixelIndex: number) => {
        const offset = pixelIndex * 4;
        const red = pixels[offset] - background[0];
        const green = pixels[offset + 1] - background[1];
        const blue = pixels[offset + 2] - background[2];
        return Math.sqrt(red * red + green * green + blue * blue) <= backgroundTolerance;
      };

      const pixelCount = width * height;
      const visited = new Uint8Array(pixelCount);
      const queue = new Int32Array(pixelCount);
      let queueStart = 0;
      let queueEnd = 0;
      const enqueue = (pixelIndex: number) => {
        if (visited[pixelIndex] || !isBackground(pixelIndex)) return;
        visited[pixelIndex] = 1;
        queue[queueEnd++] = pixelIndex;
      };
      for (let x = 0; x < width; x += 1) {
        enqueue(x);
        enqueue((height - 1) * width + x);
      }
      for (let y = 0; y < height; y += 1) {
        enqueue(y * width);
        enqueue(y * width + width - 1);
      }
      while (queueStart < queueEnd) {
        const pixelIndex = queue[queueStart++];
        pixels[pixelIndex * 4 + 3] = 0;
        const x = pixelIndex % width;
        if (x > 0) enqueue(pixelIndex - 1);
        if (x < width - 1) enqueue(pixelIndex + 1);
        if (pixelIndex >= width) enqueue(pixelIndex - width);
        if (pixelIndex < pixelCount - width) enqueue(pixelIndex + width);
      }
      context.putImageData(image, 0, 0);

      const transparentBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create the transparent image."))), "image/png");
      });
      const transparentFile = new File([transparentBlob], `background-removed-${Date.now()}.png`, { type: "image/png" });
      const src = await storeGraphic(transparentFile);
      const nextObjects = currentSideDesign.objects.map((object) =>
        object.id === objectId ? { ...object, src } : object
      );
      commitSide({ ...currentSideDesign, objects: nextObjects }, objectId);
      setSaveMessage("Solid background removed. Save the template to keep it.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not remove the image background.");
    } finally {
      setRemovingBackgroundId(null);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  // Delete Object
  const handleDeleteObject = (id: string) => {
    const nextObjects = currentSideDesign.objects.filter((o) => o.id !== id);
    const nextDesign = { ...currentSideDesign, objects: nextObjects };
    setCurrentSideDesign(nextDesign);
    if (selectedObjectId === id) setSelectedObjectId(null);
    recordHistory(
      activeSideIndex <= 0 ? nextDesign : frontDesign,
      activeSideIndex === 1 ? nextDesign : backDesign
    );
  };

  // Duplicate Object
  const handleDuplicateObject = (id: string) => {
    const target = currentSideDesign.objects.find((o) => o.id === id);
    if (!target) return;
    const copyId = `${target.type}-${Date.now()}`;
    const copied: CanvasObject = {
      ...target,
      id: copyId,
      x: Math.min(85, target.x + 4),
      y: Math.min(85, target.y + 4),
    };

    const nextObjects = [...currentSideDesign.objects, copied];
    const nextDesign = { ...currentSideDesign, objects: nextObjects };
    setCurrentSideDesign(nextDesign);
    setSelectedObjectId(copyId);
    recordHistory(
      activeSideIndex <= 0 ? nextDesign : frontDesign,
      activeSideIndex === 1 ? nextDesign : backDesign
    );
  };

  const nudgeSelectedObject = (deltaX: number, deltaY: number) => {
    if (!selectedObject || selectedObject.isLocked) return;
    const maxX = Math.max(0, 100 - (selectedObject.type === "text" ? 0 : selectedObject.width));
    const maxY = Math.max(0, 100 - (selectedObject.type === "text" ? 0 : selectedObject.height));
    const nextObject = {
      ...selectedObject,
      x: Math.max(0, Math.min(maxX, selectedObject.x + deltaX)),
      y: Math.max(0, Math.min(maxY, selectedObject.y + deltaY)),
    };
    const nextDesign = {
      ...currentSideDesign,
      objects: currentSideDesign.objects.map((object) =>
        object.id === selectedObject.id ? nextObject : object
      ),
    };
    commitSide(nextDesign, selectedObject.id);
  };

  const resizeSelectedObject = (scale: number) => {
    if (!selectedObject || selectedObject.type === "text" || selectedObject.isLocked) return;
    const nextWidth = Math.max(3, Math.min(100, Math.round(selectedObject.width * scale)));
    const nextHeight = Math.max(3, Math.min(100, Math.round(selectedObject.height * scale)));
    const nextX = Math.max(0, Math.min(100 - nextWidth, selectedObject.x - (nextWidth - selectedObject.width) / 2));
    const nextY = Math.max(0, Math.min(100 - nextHeight, selectedObject.y - (nextHeight - selectedObject.height) / 2));
    const nextObject = { ...selectedObject, width: nextWidth, height: nextHeight, x: nextX, y: nextY };
    const nextDesign = {
      ...currentSideDesign,
      objects: currentSideDesign.objects.map((object) =>
        object.id === selectedObject.id ? nextObject : object
      ),
    };
    commitSide(nextDesign, selectedObject.id);
  };

  const pasteClipboardObject = () => {
    const source = objectClipboardRef.current;
    if (!source) return;
    const copyId = `${source.type}-${Date.now()}`;
    const copied = {
      ...source,
      id: copyId,
      x: Math.min(90, source.x + 4),
      y: Math.min(90, source.y + 4),
    };
    commitSide({ ...currentSideDesign, objects: [...currentSideDesign.objects, copied] }, copyId);
  };

  // Keyboard Shortcuts: delete, copy/paste, duplicate, nudge, resize, undo/redo, escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedObjectId) {
          e.preventDefault();
          handleDeleteObject(selectedObjectId);
        }
      } else if (e.key === "Escape") {
        setSelectedObjectId(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selectedObjectId) {
          e.preventDefault();
          handleDuplicateObject(selectedObjectId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedObject) {
          e.preventDefault();
          objectClipboardRef.current = { ...selectedObject };
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (objectClipboardRef.current) {
          e.preventDefault();
          pasteClipboardObject();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (selectedObject && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const amount = e.shiftKey ? 5 : 1;
        if (e.key === "ArrowLeft") nudgeSelectedObject(-amount, 0);
        if (e.key === "ArrowRight") nudgeSelectedObject(amount, 0);
        if (e.key === "ArrowUp") nudgeSelectedObject(0, -amount);
        if (e.key === "ArrowDown") nudgeSelectedObject(0, amount);
      } else if (selectedObject && selectedObject.type !== "text" && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        resizeSelectedObject(1.1);
      } else if (selectedObject && selectedObject.type !== "text" && e.key === "-") {
        e.preventDefault();
        resizeSelectedObject(0.9);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // The selected object/design/history dependencies below rebind every shortcut to current editor state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObjectId, selectedObject, currentSideDesign, historyIndex, history]);

  // Layer Reordering
  const moveLayer = (id: string, direction: "up" | "down" | "top" | "bottom") => {
    const idx = currentSideDesign.objects.findIndex((o) => o.id === id);
    if (idx === -1) return;
    const list = [...currentSideDesign.objects];
    const [item] = list.splice(idx, 1);

    if (direction === "top") list.push(item);
    else if (direction === "bottom") list.unshift(item);
    else if (direction === "up") list.splice(Math.min(list.length, idx + 1), 0, item);
    else if (direction === "down") list.splice(Math.max(0, idx - 1), 0, item);

    const nextDesign = { ...currentSideDesign, objects: list };
    setCurrentSideDesign(nextDesign);
    recordHistory(
      activeSideIndex <= 0 ? nextDesign : frontDesign,
      activeSideIndex === 1 ? nextDesign : backDesign
    );
  };

  // Pointer Handlers for Dragging on 2D Canvas
  const textFrame = (obj: CanvasObject) => {
    if (obj.type !== "text") return "custom" as const;
    if (obj.widthMode === "inline" || obj.widthMode === "full" || obj.widthMode === "custom") return obj.widthMode;
    return obj.width > 0 ? "custom" as const : "inline" as const;
  };

  const placeInCenter = (obj: CanvasObject) => {
    const canvas = canvasRef.current;
    const node = canvas?.querySelector<HTMLElement>(`[data-oid="${obj.id}"]`);
    if (textFrame(obj) === "full") {
      updateSelectedObject({ x: 0, width: 100, widthMode: "full", textAlign: "center" });
      return;
    }
    if (!canvas || !node) {
      updateSelectedObject({ x: 50, y: 45, textAlign: "center" });
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    const widthPct = (node.offsetWidth / bounds.width) * 100;
    const heightPct = (node.offsetHeight / bounds.height) * 100;
    updateSelectedObject({
      x: Math.max(0, Math.round((100 - widthPct) / 2)),
      y: Math.max(0, Math.round((100 - heightPct) / 2)),
    });
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedObjectId(id);
    const target = currentSideDesign.objects.find((o) => o.id === id);
    if (!target || target.isLocked) return;

    draggingIdRef.current = id;
    dragNodeRef.current = e.currentTarget as HTMLElement;
    dragStartPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      objX: target.x,
      objY: target.y,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleResizePointerDown = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = currentSideDesign.objects.find((object) => object.id === id);
    if (!target || target.isLocked || target.type === "text") return;
    setSelectedObjectId(id);
    resizingRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      startW: target.width,
      startH: target.height,
      objX: target.x,
      objY: target.y,
      lockAspectRatio: target.lockAspectRatio !== false,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (resizingRef.current && canvasRef.current) {
      const resize = resizingRef.current;
      const rect = canvasRef.current.getBoundingClientRect();
      const deltaWidth = ((e.clientX - resize.startX) / rect.width) * 100;
      const deltaHeight = ((e.clientY - resize.startY) / rect.height) * 100;
      let width = Math.max(3, Math.min(100 - resize.objX, resize.startW + deltaWidth));
      let height = Math.max(3, Math.min(100 - resize.objY, resize.startH + deltaHeight));
      if (resize.lockAspectRatio) {
        const ratio = resize.startW / Math.max(resize.startH, 0.1);
        if (Math.abs(deltaWidth) >= Math.abs(deltaHeight)) {
          height = width / ratio;
          if (height > 100 - resize.objY) {
            height = 100 - resize.objY;
            width = height * ratio;
          }
        } else {
          width = height * ratio;
          if (width > 100 - resize.objX) {
            width = 100 - resize.objX;
            height = width / ratio;
          }
        }
      }
      const nextDesign: DesignSideState = {
        ...currentSideDesign,
        objects: currentSideDesign.objects.map((object: CanvasObject) =>
          object.id === resize.id
            ? { ...object, width: Math.round(width), height: Math.round(height) }
            : object
        ),
      };
      setCurrentSideDesign(nextDesign);
      const layoutW = rect.width;
      const layoutH = rect.height;
      setSelectionGap(selectionGapFromPercents(resize.objX, resize.objY, Math.round(width), Math.round(height), layoutW, layoutH));
      return;
    }
    if (!draggingIdRef.current || !dragStartPosRef.current || !canvasRef.current) return;
    const canvasEl = canvasRef.current;
    const rect = canvasEl.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStartPosRef.current.clientX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStartPosRef.current.clientY) / rect.height) * 100;

    const node = dragNodeRef.current;
    const layoutW = canvasEl.offsetWidth || rect.width;
    const layoutH = canvasEl.offsetHeight || rect.height;
    const widthPct = node && layoutW ? (node.offsetWidth / layoutW) * 100 : selectedObject?.width || 0;
    const heightPct = node && layoutH ? (node.offsetHeight / layoutH) * 100 : selectedObject?.height || 0;

    const targetObj = currentSideDesign.objects.find((o) => o.id === draggingIdRef.current);
    const guides = snapTargetsFromCard(canvasEl, draggingIdRef.current);
    const snapped = snapDragBox({
      x: dragStartPosRef.current.objX + deltaX,
      y: dragStartPosRef.current.objY + deltaY,
      width: widthPct,
      height: heightPct,
      anchorX: targetObj?.type === "text" && targetObj.textAlign ? targetObj.textAlign : "left",
      targetsX: guides.targetsX,
      targetsY: guides.targetsY,
    });

    let nextX = snapped.x;
    let nextY = snapped.y;
    setAlignmentLines(snapped.lines);

    setSelectionGap(
      selectionGapForAnchor(
        nextX,
        nextY,
        widthPct,
        heightPct,
        targetObj?.type === "text" && targetObj.textAlign ? targetObj.textAlign : "left",
        layoutW,
        layoutH
      )
    );

    const nextDraggedDesign: DesignSideState = {
      ...currentSideDesign,
      objects: currentSideDesign.objects.map((o: CanvasObject) =>
        o.id === draggingIdRef.current ? { ...o, x: nextX, y: nextY } : o
      ),
    };
    setCurrentSideDesign(nextDraggedDesign);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (resizingRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      resizingRef.current = null;
      recordHistory(frontDesign, backDesign);
    }
    if (draggingIdRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      draggingIdRef.current = null;
      dragStartPosRef.current = null;
      dragNodeRef.current = null;
      setAlignmentLines([]);
      recordHistory(frontDesign, backDesign);
    }
    if (selectedObjectId && canvasRef.current) {
      const el = canvasRef.current.querySelector<HTMLElement>(`[data-snap-id="${CSS.escape(selectedObjectId)}"]`);
      if (el) setSelectionGap(selectionGapFromElement(canvasRef.current, el));
    }
  };

  // Generate Thumbnail Data URL using an offscreen HTML5 Canvas
  const captureThumbnail = (): string => {
    try {
      const offscreen = document.createElement("canvas");
      offscreen.width = 600;
      offscreen.height = Math.round(600 / fitDims.aspectRatio);
      const ctx = offscreen.getContext("2d");
      if (!ctx) return "";

      ctx.fillStyle = frontDesign.bgColor || "#18181b";
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);

      frontDesign.objects.forEach((obj) => {
        if (obj.isVisible === false) return;
        const x = (obj.x / 100) * offscreen.width;
        const y = (obj.y / 100) * offscreen.height;
        const w = (obj.width / 100) * offscreen.width;
        const h = (obj.height / 100) * offscreen.height;

        if (obj.type === "shape") {
          ctx.beginPath();
          if (obj.shapeType === "circle") {
            ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
          } else {
            ctx.rect(x, y, w, h);
          }
          ctx.fillStyle = obj.fill || "#e74b2d";
          ctx.fill();
        } else if (obj.type === "text") {
          ctx.fillStyle = obj.color || "#ffffff";
          ctx.font = `${obj.fontWeight === "bold" ? "bold " : ""}${Math.round((obj.fontSize || 14) * 1.5)}px sans-serif`;
          ctx.textAlign = (obj.textAlign as CanvasTextAlign) || "left";
          ctx.fillText(obj.text || "", x, y + (obj.fontSize || 14) * 1.2);
        }
      });

      return offscreen.toDataURL("image/jpeg", 0.85);
    } catch (_) {
      return "";
    }
  };

  // Save Template (Draft or Published)
  const handleSave = async (targetStatus?: "DRAFT" | "PUBLISHED") => {
    setIsSaving(true);
    setSaveMessage(null);

    const savingStatus = targetStatus || status;
    const thumbnailDataUrl = captureThumbnail();

    const payload = {
      title: title.trim(),
      description,
      category: category.name,
      categoryId: category._id,
      price: parseFloat(price || "0"),
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      status: savingStatus,
      isActive: savingStatus === "PUBLISHED",
      thumbnail: thumbnailDataUrl || initialData?.thumbnail || "",
      canvas_config: {
        width: category.canvas_width,
        height: category.canvas_height,
        unit: category.unit,
        orientation: category.orientation,
        bleed: category.bleed,
        bleedUnit: category.bleedUnit || category.unit,
        safe_area: category.safe_area,
        safeAreaUnit: category.safeAreaUnit || category.unit,
        background_color: category.background_color || "#18181b",
        supports_back_side: sideMode !== "single",
        side_mode: sideMode,
        sides_count: sidesCount,
        sides_names: sideNames,
        guide_lines: cleanGuideLines(category.guide_lines),
        canvas_type: (category as { canvas_type?: string }).canvas_type || "flat",
        mockup_image: (category as { mockup_image?: string }).mockup_image || "",
        print_area: (category as { print_area?: unknown }).print_area,
      },
      front_design: allSideDesigns[0] || frontDesign,
      back_design: allSideDesigns[1] || backDesign,
      // Full ordered panel list so every box face restores correctly
      side_designs: allSideDesigns,
      selectedVariations,
      variations: category.variations || [],
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
      if (!data.success) throw new Error(data.message || "Save failed.");

      setStatus(savingStatus);
      setSaveMessage(`Template ${savingStatus.toLowerCase()} successfully!`);

      if (mode === "create" && data.template?._id) {
        router.push(`/admin/templates/${data.template._id}/edit`);
      }
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save template.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  return (
    <div
      className={`flex flex-col min-w-0 bg-[#0f1117] text-zinc-100 font-sans transition-all ${
        isFullscreen
          ? "fixed inset-0 z-[999] h-screen w-screen overflow-hidden"
          : "h-[calc(100vh-100px)] rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl"
      }`}
    >
      {/* ── TOP HEADER TOOLBAR ─────────────────────────────────────── */}
      <header className="h-14 border-b border-zinc-800 bg-[#161821] px-4 flex items-center justify-between gap-3 shrink-0 z-30 text-xs">
        {/* Left: Back Link, Title & Category Selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/admin/templates"
            className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap"
            title="Exit Editor & Back to Templates"
          >
            ← Exit Editor
          </Link>

          <div className="min-w-0 flex flex-col justify-center">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-[#e74b2d] text-xs font-bold text-white px-1 py-0.5 focus:outline-none truncate max-w-[200px]"
              placeholder="Template Title..."
            />
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
              {allCategories.length > 1 ? (
                <select
                  value={category._id || ""}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="bg-zinc-800 text-sky-400 font-semibold px-1.5 py-0.5 rounded border border-zinc-700 focus:outline-none cursor-pointer text-xs max-w-[140px] truncate"
                >
                  {allCategories.map((c) => (
                    <option key={c._id || c.name} value={c._id}>
                      {c.name} ({c.canvas_width}×{c.canvas_height}{c.unit})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-semibold text-sky-400">{category.name}</span>
              )}
              <span>•</span>
              {(category.printSizes || []).length > 0 && (
                <select
                  aria-label="Size"
                  title="Choose the size for this template"
                  value={(() => {
                    const idx = (category.printSizes || []).findIndex(
                      (size) => size.width === category.canvas_width && size.height === category.canvas_height && size.unit === category.unit
                    );
                    return idx >= 0 ? String(idx) : "default";
                  })()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "default") {
                      const original = allCategories.find((c) => c._id === category._id);
                      if (!original) return;
                      setCategory({
                        ...category,
                        canvas_width: original.canvas_width,
                        canvas_height: original.canvas_height,
                        unit: original.unit,
                        orientation: original.orientation,
                        bleed: original.bleed,
                        bleedUnit: original.bleedUnit || original.unit,
                        safe_area: original.safe_area,
                        safeAreaUnit: original.safeAreaUnit || original.unit,
                      });
                      return;
                    }
                    const size = category.printSizes?.[Number(value)];
                    if (!size) return;
                    setCategory({
                      ...category,
                      canvas_width: size.width,
                      canvas_height: size.height,
                      unit: size.unit,
                      orientation: size.height > size.width ? "portrait" : "landscape",
                      bleed: size.bleed,
                      bleedUnit: size.bleedUnit,
                      safe_area: size.safeArea,
                      safeAreaUnit: size.safeAreaUnit,
                    });
                  }}
                  className="bg-zinc-800 text-zinc-200 font-semibold px-1.5 py-0.5 rounded border border-zinc-700 focus:outline-none cursor-pointer text-xs max-w-[150px] truncate"
                >
                  <option value="default">
                    Default {(allCategories.find((c) => c._id === category._id) || category).canvas_width}×
                    {(allCategories.find((c) => c._id === category._id) || category).canvas_height}{" "}
                    {(allCategories.find((c) => c._id === category._id) || category).unit}
                  </option>
                  {(category.printSizes || []).map((size, index) => (
                    <option key={`${size.name}-${index}`} value={String(index)}>
                      {size.name} ({size.width}×{size.height} {size.unit})
                    </option>
                  ))}
                </select>
              )}
              <span className="px-2 py-0.5 rounded-md bg-sky-950/80 text-sky-300 border border-sky-800 font-bold">
                {styleLabel}
              </span>
              <span className="font-mono text-white font-bold">{widthLabel}</span>
              {category.bleed > 0 && (
                <span className="text-zinc-500 font-mono">
                  (+{category.bleed}
                  {category.bleedUnit || category.unit} bleed)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Side Switcher & 2D/3D Mode Switcher */}
        <div className="flex items-center gap-2 shrink-0 max-w-[52%] overflow-x-auto scrollbar-hide">
          {/* Side Switcher — uses category side names (box panels / front-back / single) */}
          {sidesCount > 1 ? (
            <div className="inline-flex p-0.5 bg-zinc-900 rounded-lg border border-zinc-800 text-xs font-medium">
              {sideNames.map((name, idx) => (
                <button
                  key={`${name}-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveSideIndex(idx);
                    setSelectedObjectId(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    activeSideIndex === idx ? "bg-[#e74b2d] text-white shadow-xs" : "text-zinc-400 hover:text-white"
                  }`}
                  title={name}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-xs text-zinc-400 font-medium">
              {sideNames[0] || "Single-Sided"}
            </div>
          )}

          {/* 2D / 3D Mode Toggle */}
          <div className="inline-flex p-0.5 bg-zinc-900 rounded-lg border border-zinc-800 text-xs font-medium ml-1 shrink-0">
            <button
              onClick={() => setViewMode("2d")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === "2d" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              ✏️ 2D Canvas
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === "3d" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              ✨ 3D Studio
            </button>
          </div>
        </div>

        {/* Right: Actions, Status & Save Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Badge */}
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
              status === "PUBLISHED"
                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                : status === "ARCHIVED"
                ? "bg-red-950/80 text-red-400 border border-red-800"
                : "bg-amber-950/80 text-amber-400 border border-amber-800"
            }`}
          >
            {status}
          </span>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 border-r border-zinc-800 pr-1.5">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 transition-all cursor-pointer text-xs"
              title="Undo (Ctrl+Z)"
            >
              ↩
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 transition-all cursor-pointer text-xs"
              title="Redo (Ctrl+Y)"
            >
              ↪
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer border border-zinc-700/60 whitespace-nowrap"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <span className="text-xs">⤓</span>
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <span className="text-xs">⛶</span>
                <span>Fullscreen</span>
              </>
            )}
          </button>

          {/* Save Draft */}
          <button
            onClick={() => handleSave("DRAFT")}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            Save Draft
          </button>

          {/* Publish */}
          <button
            onClick={() => handleSave("PUBLISHED")}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-lg bg-[#e74b2d] hover:bg-[#c93e23] text-white text-xs font-semibold transition-all shadow-md shadow-[#e74b2d]/20 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {isSaving ? "Saving..." : "Publish Template"}
          </button>
        </div>
      </header>

      {/* ── SAVE NOTIFICATION TOAST ───────────────────────────────── */}
      {saveMessage && (
        <div className="bg-[#1e293b] border-b border-sky-500/40 py-1 px-4 text-center text-xs font-semibold text-sky-300">
          {saveMessage}
        </div>
      )}

      {/* ── MAIN WORKSPACE (LEFT PANEL + CANVAS + RIGHT PANEL) ─────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── 1. LEFT TOOLBAR PANEL (240px) ───────────────────────── */}
        <aside className="w-80 px-2 bg-[#12141c] border-r border-zinc-800 flex flex-col shrink-0">
          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-800 text-xs font-medium overflow-x-auto">
            {(["text", "shapes", "images", "background", "variations", "layers"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 px-2 text-center text-xs font-semibold capitalize transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                  activeTab === tab
                    ? "border-[#e74b2d] text-white bg-zinc-800/40"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3.5 text-xs">
            {/* TEXT TAB */}
            {activeTab === "text" && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Add Typography</p>
                <button
                  onClick={() => handleAddText("heading")}
                  className="w-full p-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-left border border-zinc-700/60 font-bold text-xs text-white transition-all cursor-pointer"
                >
                  + Add Heading
                </button>
                <button
                  onClick={() => handleAddText("subheading")}
                  className="w-full p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-left border border-zinc-700/60 font-semibold text-xs text-zinc-200 transition-all cursor-pointer"
                >
                  + Add Subheading
                </button>
                <button
                  onClick={() => handleAddText("body")}
                  className="w-full p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-left border border-zinc-700/60 text-xs text-zinc-300 transition-all cursor-pointer"
                >
                  + Add Body Text
                </button>

                <div className="pt-2.5 border-t border-zinc-800 space-y-1.5">
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase">Tip</p>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Click any text layer on the canvas to drag, resize font, adjust colors, and align.
                  </p>
                </div>
              </div>
            )}

            {/* SHAPES TAB */}
            {activeTab === "shapes" && (
              <div className="space-y-4">
                <p className="text-base font-bold text-zinc-400 uppercase tracking-wider">Vector Shapes</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAddShape("rectangle")}
                    className="p-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 flex flex-col items-center gap-2 cursor-pointer transition-all"
                  >
                    <div className="w-8 h-6 bg-[#e74b2d] rounded-sm" />
                    <span className="text-base font-bold">Rectangle</span>
                  </button>

                  <button
                    onClick={() => handleAddShape("rounded-rect")}
                    className="p-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 flex flex-col items-center gap-2 cursor-pointer transition-all"
                  >
                    <div className="w-8 h-6 bg-[#10b981] rounded-lg" />
                    <span className="text-base font-bold">Rounded</span>
                  </button>

                  <button
                    onClick={() => handleAddShape("circle")}
                    className="p-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 flex flex-col items-center gap-2 cursor-pointer transition-all"
                  >
                    <div className="w-7 h-7 bg-[#f59e0b] rounded-full" />
                    <span className="text-base font-bold">Circle</span>
                  </button>

                  <button
                    onClick={() => handleAddShape("badge")}
                    className="p-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 flex flex-col items-center gap-2 cursor-pointer transition-all"
                  >
                    <div className="w-8 h-4 bg-[#8b5cf6] rounded-full" />
                    <span className="text-base font-bold">Pill Badge</span>
                  </button>
                </div>
              </div>
            )}

            {/* IMAGES TAB */}
            {activeTab === "images" && (
              <div className="space-y-4">
                <p className="text-base font-bold text-zinc-400 uppercase tracking-wider">Graphics and logos</p>
                <label className="border-2 border-dashed border-zinc-700 hover:border-[#e74b2d] bg-zinc-900/60 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all block">
                  <span className="text-base font-bold text-white">Add image on the card</span>
                  <span className="text-base text-zinc-400 mt-0.5">Logo, photo, icon, or QR. Drag it into place after.</span>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                </label>
                <label className="border border-zinc-700 hover:border-[#e74b2d] bg-zinc-900/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all block">
                  <span className="text-base font-bold text-white">Use image as full background</span>
                  <span className="text-base text-zinc-400 mt-0.5">Covers this side. Customers still edit the text on top.</span>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
                </label>
              </div>
            )}

            {/* BACKGROUND TAB */}
            {activeTab === "background" && (
              <div className="space-y-4">
                <p className="text-base font-bold text-zinc-400 uppercase tracking-wider">
                  {sideNames[activeSideIndex] || (activeSideIndex <= 0 ? "Front" : "Back")} background
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {([
                    ["color", "One color"],
                    ["gradient", "Gradient"],
                    ["image", "Image"],
                    ["image-gradient", "Image + gradient"],
                  ] as const).map(([mode, label]) => {
                    const current = currentSideDesign.bgStyle
                      || (currentSideDesign.bgImage && currentSideDesign.bgGradient
                        ? "image-gradient"
                        : currentSideDesign.bgImage
                          ? "image"
                          : currentSideDesign.bgGradient
                            ? "gradient"
                            : "color");
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          const next = { ...currentSideDesign, bgStyle: mode };
                          if (mode === "color") {
                            next.bgGradient = undefined;
                            next.bgImage = undefined;
                          } else if (mode === "gradient") {
                            next.bgGradient = next.bgGradient || "#e74b2d";
                            next.bgGradientAngle = next.bgGradientAngle ?? 135;
                            next.bgImage = undefined;
                          } else if (mode === "image") {
                            next.bgGradient = undefined;
                          } else {
                            next.bgGradient = next.bgGradient || "#e74b2d";
                            next.bgGradientAngle = next.bgGradientAngle ?? 135;
                          }
                          commitSide(next);
                        }}
                        className={`py-1.5 rounded-lg border text-base font-bold cursor-pointer ${
                          current === mode
                            ? "bg-[#e74b2d] border-[#e74b2d] text-white"
                            : "border-zinc-700 text-zinc-300"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        const next = { ...currentSideDesign, bgColor: c };
                        setCurrentSideDesign(next);
                        recordHistory(
                          activeSideIndex <= 0 ? next : frontDesign,
                          activeSideIndex === 1 ? next : backDesign
                        );
                      }}
                      className={`w-8 h-8 rounded-xl border-2 transition-all cursor-pointer ${
                        currentSideDesign.bgColor === c ? "border-[#e74b2d] scale-110 shadow-lg" : "border-zinc-700"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="pt-2">
                  <label className="text-base text-zinc-400 block mb-1 font-bold">Custom Hex Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentSideDesign.bgColor}
                      onChange={(e) => {
                        const next = { ...currentSideDesign, bgColor: e.target.value };
                        setCurrentSideDesign(next);
                      }}
                      className="w-10 h-9 rounded-xl bg-transparent border border-zinc-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={currentSideDesign.bgColor}
                      onChange={(e) => {
                        const next = { ...currentSideDesign, bgColor: e.target.value };
                        setCurrentSideDesign(next);
                      }}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-base font-mono text-white focus:outline-none focus:border-[#e74b2d]"
                    />
                  </div>
                </div>

                {(currentSideDesign.bgStyle === "gradient" || currentSideDesign.bgStyle === "image-gradient" || (!currentSideDesign.bgStyle && currentSideDesign.bgGradient)) && (
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold text-zinc-400 uppercase tracking-wider">Gradient</p>
                    {currentSideDesign.bgGradient && (
                      <button
                        type="button"
                        onClick={() => commitSide({ ...currentSideDesign, bgGradient: undefined })}
                        className="text-base text-red-400 font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentSideDesign.bgGradient || "#e74b2d"}
                      onChange={(e) => commitSide({ ...currentSideDesign, bgGradient: e.target.value, bgGradientAngle: currentSideDesign.bgGradientAngle ?? 135 })}
                      className="w-10 h-9 rounded-xl bg-transparent border border-zinc-700 cursor-pointer"
                    />
                    <span className="text-base text-zinc-500">Second color blends from the base color.</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: "→", angle: 90 },
                      { label: "↓", angle: 180 },
                      { label: "↘", angle: 135 },
                      { label: "↗", angle: 45 },
                    ].map((item) => (
                      <button
                        key={item.angle}
                        type="button"
                        onClick={() => commitSide({
                          ...currentSideDesign,
                          bgGradient: currentSideDesign.bgGradient || "#e74b2d",
                          bgGradientAngle: item.angle,
                        })}
                        className={`py-1.5 rounded-lg border text-base cursor-pointer ${
                          (currentSideDesign.bgGradientAngle ?? 135) === item.angle && currentSideDesign.bgGradient
                            ? "bg-[#e74b2d] border-[#e74b2d] text-white"
                            : "border-zinc-700 text-zinc-300"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {(currentSideDesign.bgStyle === "image" || currentSideDesign.bgStyle === "image-gradient" || (!currentSideDesign.bgStyle && currentSideDesign.bgImage)) && (
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold text-zinc-400 uppercase tracking-wider">Background photo</p>
                    {currentSideDesign.bgImage && (
                      <button
                        type="button"
                        onClick={() => commitSide({ ...currentSideDesign, bgImage: undefined })}
                        className="text-base text-red-400 font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {currentSideDesign.bgImage ? (
                    <img src={mediaSrc(currentSideDesign.bgImage) || currentSideDesign.bgImage} alt="" className="w-full h-20 object-cover rounded-xl border border-zinc-700" />
                  ) : (
                    <p className="text-base text-zinc-500">No photo. Use Images, or upload one here.</p>
                  )}
                  <label className="block text-center py-2 rounded-xl border border-dashed border-zinc-600 text-base font-bold text-zinc-200 cursor-pointer hover:border-[#e74b2d]">
                    Upload background
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {(["cover", "contain"] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => commitSide({ ...currentSideDesign, bgFit: fit })}
                        className={`py-1.5 rounded-lg border text-base font-bold capitalize cursor-pointer ${
                          (currentSideDesign.bgFit || "cover") === fit
                            ? "bg-[#e74b2d] border-[#e74b2d] text-white"
                            : "border-zinc-700 text-zinc-300"
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                  <label className="text-base text-zinc-400 block">
                    Photo strength {Math.round((currentSideDesign.bgOpacity ?? 1) * 100)}%
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={Math.round((currentSideDesign.bgOpacity ?? 1) * 100)}
                    onChange={(e) => setCurrentSideDesign({ ...currentSideDesign, bgOpacity: Number(e.target.value) / 100 })}
                    className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#e74b2d]"
                  />
                </div>
                )}
              </div>
            )}

            {/* VARIATIONS TAB */}
            {activeTab === "variations" && (
              <div className="space-y-4">
                <div className="border-b border-zinc-800 pb-2">
                  <p className="text-base font-bold text-sky-400 uppercase tracking-wider">
                    {category.name} Variations
                  </p>
                  <p className="text-base text-zinc-400 mt-0.5">
                    Pre-select default specs for templates in this category
                  </p>
                </div>

                {!category.variations || category.variations.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-base font-medium bg-zinc-900/40 rounded-2xl border border-zinc-800 p-4">
                    <p className="font-bold text-zinc-400 mb-1">No Category Variations</p>
                    This category doesn&apos;t have any variations configured yet.
                  </div>
                ) : (
                  category.variations.map((v) => (
                    <div key={v.name} className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-bold text-white">{v.name}</span>
                        {v.required && (
                          <span className="text-base bg-sky-950 text-sky-400 border border-sky-800/60 px-1.5 py-0.5 rounded font-mono font-bold">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {v.values.map((val) => {
                          const isSelected = (selectedVariations[v.name] || v.values[0]?.name) === val.name;
                          return (
                            <button
                              key={val.name}
                              type="button"
                              onClick={() =>
                                setSelectedVariations((prev) => ({
                                  ...prev,
                                  [v.name]: val.name,
                                }))
                              }
                              className={`w-full text-left px-3 py-2 rounded-xl text-base font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#e74b2d]/20 border-[#e74b2d] text-white shadow-xs"
                                  : "bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                                  isSelected ? "border-[#e74b2d] bg-[#e74b2d]" : "border-zinc-600"
                                }`}>
                                  {isSelected && <span className="w-1 h-1 rounded-full bg-white" />}
                                </span>
                                {val.name}
                              </span>
                              <span className="text-base font-mono text-zinc-400">
                                {val.price > 0 ? `+$${val.price.toFixed(2)}` : "Free"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* LAYERS TAB */}
            {activeTab === "layers" && (
              <div className="space-y-3">
                <p className="text-base font-bold text-zinc-400 uppercase tracking-wider">
                  Layers ({currentSideDesign.objects.length})
                </p>

                {currentSideDesign.objects.length === 0 ? (
                  <p className="text-zinc-500 text-base italic">No layers on this side.</p>
                ) : (
                  <div className="space-y-1.5">
                    {[...currentSideDesign.objects].reverse().map((obj) => (
                      <div
                        key={obj.id}
                        onClick={() => setSelectedObjectId(obj.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          selectedObjectId === obj.id
                            ? "bg-[#e74b2d]/20 border-[#e74b2d] text-white shadow-xs"
                            : "bg-zinc-800/40 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-base">
                            {obj.type === "text" ? "T" : obj.type === "shape" ? "■" : "🖼️"}
                          </span>
                          <span className="text-base font-bold truncate max-w-[100px]">
                            {obj.text || obj.shapeType || obj.type}
                          </span>
                          {obj.isLocked && <span className="text-base">🔒</span>}
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(obj.id, "top");
                            }}
                            className="p-1 hover:bg-zinc-700 rounded text-base text-zinc-400 hover:text-white font-bold"
                            title="Bring to Front (Upfront)"
                          >
                            ▲▲
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(obj.id, "up");
                            }}
                            className="p-1 hover:bg-zinc-700 rounded text-base text-zinc-400 hover:text-white"
                            title="Bring Forward"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(obj.id, "down");
                            }}
                            className="p-1 hover:bg-zinc-700 rounded text-base text-zinc-400 hover:text-white"
                            title="Send Backward"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(obj.id, "bottom");
                            }}
                            className="p-1 hover:bg-zinc-700 rounded text-base text-zinc-400 hover:text-white font-bold"
                            title="Send to Back (Backward)"
                          >
                            ▼▼
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteObject(obj.id);
                            }}
                            className="p-1 hover:bg-red-900/60 rounded text-base text-red-400"
                            title="Delete layer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── 2. CENTER CANVAS WORKSPACE ───────────────────────────── */}
        <main className="flex-1 flex flex-col bg-[#0b0d13] relative overflow-hidden">
          {/* Canvas Top Controls Toolbar */}
          <div className="h-9 border-b border-zinc-800/80 px-4 flex items-center justify-between text-xs text-zinc-400 shrink-0">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showGuides}
                  onChange={(e) => setShowGuides(e.target.checked)}
                  className="rounded accent-[#e74b2d]"
                />
                <span className="text-xs font-semibold text-zinc-300">Print Guides (Bleed & Safe)</span>
              </label>

              {showGuides && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-2 h-2 border border-red-400 inline-block" /> Bleed (+{category.bleed}{category.bleedUnit || category.unit})
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 border border-emerald-400 inline-block" /> Safe Area ({category.safe_area}{category.safeAreaUnit || category.unit})
                  </span>
                </div>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
                className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
              >
                -
              </button>
              <span className="text-zinc-300 font-mono text-xs w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.1))}
                className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto relative">
            {viewMode === "3d" ? (
              /* ── 3D REALISTIC PREVIEW ────────────────────────── */
              <div className="w-full h-full max-h-[560px] relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                <ThreeDCardPreview
                  categoryName={category.name}
                  canvasConfig={{
                    width: category.canvas_width,
                    height: category.canvas_height,
                    unit: category.unit,
                    orientation: category.orientation,
                    bleed: category.bleed,
                    bleedUnit: category.bleedUnit || category.unit,
                    safe_area: category.safe_area,
                    safeAreaUnit: category.safeAreaUnit || category.unit,
                    supports_back_side: sideMode !== "single",
                    side_mode: sideMode,
                    sides_count: sidesCount,
                    sides_names: sideNames,
                  }}
                  bgColor={frontDesign.bgColor}
                  backBgColor={backDesign.bgColor}
                  frontDesign={frontDesign}
                  backDesign={backDesign}
                  extraSideDesigns={extraSideDesigns}
                  sideDesigns={allSideDesigns}
                  sideIndex={activeSideIndex}
                  side={activeSideIndex === 1 ? "back" : "front"}
                  onSideIndexChange={(idx) => {
                    setActiveSideIndex(idx);
                    setSelectedObjectId(null);
                  }}
                  onSideChange={(s) => {
                    setActiveSideIndex(s === "back" ? 1 : 0);
                    setSelectedObjectId(null);
                  }}
                />
              </div>
            ) : (
              /* ── 2D INTERACTIVE CANVAS ───────────────────────── */
              <div
                ref={canvasRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSelectedObjectId(null);
                }}
                style={{
                  width: `${fitDims.renderWidth}px`,
                  height: `${fitDims.renderHeight}px`,
                  backgroundColor: currentSideDesign.bgColor,
                  backgroundImage: currentSideDesign.bgGradient
                    ? `linear-gradient(${currentSideDesign.bgGradientAngle ?? 135}deg, ${currentSideDesign.bgColor}, ${currentSideDesign.bgGradient})`
                    : undefined,
                }}
                className="relative shadow-2xl rounded-xl transition-all duration-100 select-none overflow-hidden cursor-crosshair border border-zinc-700/60"
              >
                {/* Bleed Guide (Red dashed outer margin) */}
                {showGuides && category.bleed > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none border border-dashed border-red-500/70 z-10"
                    style={{ margin: `${fitDims.bleedPx}px` }}
                  />
                )}

                {/* Safe Area Guide (Green dashed inner margin) */}
                {showGuides && category.safe_area > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none border border-dashed border-emerald-400/60 z-10"
                    style={{
                      margin: `${fitDims.bleedPx + fitDims.safeAreaPx}px`,
                    }}
                  />
                )}

                {/* Category dieline / fold guides (box net, tri-fold, etc.) */}
                {showGuides && (
                  <CanvasGuideLinesOverlay
                    lines={category.guide_lines || []}
                    canvasWidth={category.canvas_width}
                    canvasHeight={category.canvas_height}
                    canvasUnit={category.unit}
                  />
                )}

                {/* Live box style + width badge on the canvas */}
                <div className="absolute top-2 left-2 z-40 pointer-events-none flex flex-col gap-1">
                  <span className="px-2 py-1 rounded-lg bg-black/75 text-sky-200 text-xs font-bold border border-sky-500/40 shadow-sm">
                    {styleLabel}
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-black/75 text-white text-xs font-mono font-bold border border-white/20 shadow-sm">
                    W × H · {widthLabel}
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-black/75 text-zinc-200 text-xs font-semibold border border-white/15 shadow-sm">
                    Editing: {sideNames[activeSideIndex] || (activeSideIndex <= 0 ? "Front" : "Back")}
                  </span>
                </div>

                {currentSideDesign.bgImage && (
                  <img
                    src={mediaSrc(currentSideDesign.bgImage) || currentSideDesign.bgImage}
                    alt=""
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                      objectFit: currentSideDesign.bgFit === "contain" ? "contain" : "cover",
                      opacity: currentSideDesign.bgOpacity ?? 1,
                    }}
                  />
                )}

                {/* Canva-Style Smart Alignment & Spacing Gap Overlay */}
                <SpacingGapOverlay gap={viewMode === "2d" ? selectionGap : null} />
                {alignmentLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`absolute pointer-events-none z-30 ${
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

                {/* Render Canvas Objects */}
                {currentSideDesign.objects.map((obj, index) => {
                  if (obj.isVisible === false) return null;
                  const isSelected = selectedObjectId === obj.id;

                  return (
                    <div
                      key={obj.id}
                      data-oid={obj.id}
                      data-snap-id={obj.id}
                      onPointerDown={(e) => handlePointerDown(obj.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute touch-none group ${
                        obj.isLocked ? "cursor-default" : "cursor-move"
                      } ${
                        isSelected
                          ? "ring-2 ring-[#e74b2d] ring-offset-1 ring-offset-transparent"
                          : "hover:ring-1 hover:ring-white/40"
                      }`}
                      style={{
                        left: obj.type === "text" && textFrame(obj) === "full" ? "0%" : `${obj.x}%`,
                        top: `${obj.y}%`,
                        width: obj.type === "text"
                          ? textFrame(obj) === "full"
                            ? "100%"
                            : textFrame(obj) === "custom"
                              ? `${obj.width}%`
                              : "max-content"
                          : obj.width ? `${obj.width}%` : undefined,
                        height: obj.type === "text" ? "auto" : obj.height ? `${obj.height}%` : undefined,
                        maxWidth: obj.type === "text" && textFrame(obj) === "inline" ? "90%" : undefined,
                        opacity: obj.opacity ?? 1,
                        userSelect: "none",
                        zIndex: 10 + index,
                      }}
                    >
                      {/* Lock indicator badge */}
                      {obj.isLocked && (
                        <span className="absolute -top-3 -right-3 z-50 bg-amber-500 text-black rounded-full p-0.5 shadow text-base font-bold">
                          🔒
                        </span>
                      )}
                      {/* SHAPE OBJECT */}
                      {obj.type === "shape" && (
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundColor: obj.fill || "#e74b2d",
                            border: obj.stroke && obj.strokeWidth ? `${obj.strokeWidth}px solid ${obj.stroke}` : "none",
                            borderRadius:
                              obj.shapeType === "circle"
                                ? "9999px"
                                : obj.shapeType === "rounded-rect"
                                ? `${obj.borderRadius || 12}px`
                                : obj.shapeType === "badge"
                                ? "9999px"
                                : "0px",
                          }}
                        />
                      )}

                      {/* TEXT OBJECT */}
                      {obj.type === "text" && (
                        <div
                          style={{
                            fontSize: `${obj.fontSize || 14}px`,
                            color: obj.color || "#ffffff",
                            fontWeight: obj.fontWeight || "normal",
                            fontStyle: obj.fontStyle || "normal",
                            fontFamily: obj.fontFamily || "inherit",
                            textAlign: obj.textAlign || "left",
                            letterSpacing: `${obj.letterSpacing || 0}px`,
                            textDecoration: obj.underline ? "underline" : "none",
                            textTransform: obj.textTransform || "none",
                            lineHeight: 1.2,
                            whiteSpace: textFrame(obj) === "inline" ? "nowrap" : "pre-wrap",
                          }}
                        >
                          {obj.text}
                        </div>
                      )}

                      {/* IMAGE OBJECT */}
                      {(obj.type === "image" || obj.type === "logo") && obj.src && (
                        <img
                          src={mediaSrc(obj.src) || obj.src}
                          alt="Canvas graphic"
                          className={`w-full h-full pointer-events-none ${obj.fit === "cover" ? "object-cover" : "object-contain"}`}
                        />
                      )}
                      {isSelected && obj.type !== "text" && !obj.isLocked && (
                        <button
                          type="button"
                          aria-label={`Resize ${obj.type}`}
                          title="Drag to resize"
                          onPointerDown={(event) => handleResizePointerDown(obj.id, event)}
                          className="absolute -bottom-2 -right-2 size-4 rounded-full border-2 border-white bg-[#e74b2d] shadow-md cursor-nwse-resize z-50"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* ── 3. RIGHT PROPERTIES INSPECTOR (280px) ────────────────── */}
        <aside className="w-80 px-2 pr-5 bg-[#12141c] border-l border-zinc-800 p-3.5 flex flex-col shrink-0 overflow-y-auto space-y-3.5 text-xs">
          {selectedObject ? (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">
                  {selectedObject.type} Properties
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicateObject(selectedObject.id)}
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white text-xs cursor-pointer"
                    title="Duplicate"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => handleDeleteObject(selectedObject.id)}
                    className="p-1 hover:bg-red-900/40 rounded text-red-400 text-xs cursor-pointer"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* TEXT PROPERTIES */}
              {selectedObject.type === "text" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Text Content</label>
                    <textarea
                      rows={2}
                      value={selectedObject.text || ""}
                      onChange={(e) => updateSelectedObject({ text: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#e74b2d] resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Font Family</label>
                    <select
                      value={selectedObject.fontFamily || FONT_FAMILIES[0].value}
                      onChange={(e) => updateSelectedObject({ fontFamily: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#e74b2d] cursor-pointer"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-zinc-300 block mb-1">Font Size</label>
                      <input
                        type="number"
                        min={8}
                        max={90}
                        value={selectedObject.fontSize || 14}
                        onChange={(e) => updateSelectedObject({ fontSize: Number(e.target.value) })}
                        className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#e74b2d]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-300 block mb-1">Text Color</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={selectedObject.color || "#ffffff"}
                          onChange={(e) => updateSelectedObject({ color: e.target.value })}
                          className="w-7 h-7 rounded-lg bg-transparent border border-zinc-700/80 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={selectedObject.color || "#ffffff"}
                          onChange={(e) => updateSelectedObject({ color: e.target.value })}
                          className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700/80 rounded-xl px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#e74b2d]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Alignment & Weight */}
                  <div className="flex items-center gap-1 pt-1">
                    {(["normal", "bold"] as const).map((fw) => (
                      <button
                        key={fw}
                        onClick={() => updateSelectedObject({ fontWeight: fw })}
                        className={`flex-1 py-1 rounded-lg border text-xs font-bold transition-all capitalize ${
                          selectedObject.fontWeight === fw
                            ? "bg-[#e74b2d] border-[#e74b2d] text-white"
                            : "border-zinc-700/80 text-zinc-400 hover:bg-zinc-800"
                        }`}
                      >
                        {fw}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateSelectedObject({ fontStyle: selectedObject.fontStyle === "italic" ? "normal" : "italic" })}
                      className={`w-7 py-1 rounded-lg border text-xs italic cursor-pointer ${
                        selectedObject.fontStyle === "italic" ? "bg-[#e74b2d] border-[#e74b2d] text-white" : "border-zinc-700/80 text-zinc-400"
                      }`}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedObject({ underline: !selectedObject.underline })}
                      className={`w-7 py-1 rounded-lg border text-xs underline cursor-pointer ${
                        selectedObject.underline ? "bg-[#e74b2d] border-[#e74b2d] text-white" : "border-zinc-700/80 text-zinc-400"
                      }`}
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedObject({ textTransform: selectedObject.textTransform === "uppercase" ? "none" : "uppercase" })}
                      className={`w-7 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                        selectedObject.textTransform === "uppercase" ? "bg-[#e74b2d] border-[#e74b2d] text-white" : "border-zinc-700/80 text-zinc-400"
                      }`}
                    >
                      AA
                    </button>
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => updateSelectedObject({ textAlign: align })}
                        className={`w-7 py-1 rounded-lg border text-xs font-bold transition-all capitalize ${
                          selectedObject.textAlign === align
                            ? "bg-[#e74b2d] border-[#e74b2d] text-white"
                            : "border-zinc-700/80 text-zinc-400 hover:bg-zinc-800"
                        }`}
                      >
                        {align[0].toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SHAPE PROPERTIES */}
              {selectedObject.type === "shape" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Fill Color</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={selectedObject.fill || "#e74b2d"}
                        onChange={(e) => updateSelectedObject({ fill: e.target.value })}
                        className="w-7 h-7 rounded-lg bg-transparent border border-zinc-700/80 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={selectedObject.fill || "#e74b2d"}
                        onChange={(e) => updateSelectedObject({ fill: e.target.value })}
                        className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700/80 rounded-xl px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#e74b2d]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Corner Radius</label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={selectedObject.borderRadius || 0}
                      onChange={(e) => updateSelectedObject({ borderRadius: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#e74b2d]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Outline</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedObject.stroke || "#ffffff"}
                        onChange={(e) => updateSelectedObject({ stroke: e.target.value, strokeWidth: selectedObject.strokeWidth || 2 })}
                        className="w-7 h-7 rounded-lg bg-transparent border border-zinc-700/80 cursor-pointer shrink-0"
                      />
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={selectedObject.strokeWidth || 0}
                        onChange={(e) => updateSelectedObject({ strokeWidth: Number(e.target.value) })}
                        className="w-16 bg-zinc-900 border border-zinc-700/80 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(selectedObject.type === "image" || selectedObject.type === "logo") && (
                <div className="space-y-3">
                  <label className="block text-center py-2 rounded-xl border border-dashed border-zinc-600 text-xs font-bold text-zinc-200 cursor-pointer hover:border-[#e74b2d]">
                    Replace image
                    <input type="file" accept="image/*" className="hidden" onChange={handleReplaceImage} />
                  </label>
                  <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-2.5 space-y-2">
                    <button
                      type="button"
                      onClick={handleRemoveImageBackground}
                      disabled={removingBackgroundId === selectedObject.id}
                      className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                    >
                      {removingBackgroundId === selectedObject.id ? "Removing background..." : "Remove solid background"}
                    </button>
                    <label className="text-xs text-zinc-400 block">
                      Color tolerance {backgroundTolerance}
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={backgroundTolerance}
                      onChange={(event) => setBackgroundTolerance(Number(event.target.value))}
                      className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#e74b2d]"
                    />
                    <p className="text-[11px] leading-relaxed text-zinc-400">
                      Best for white or single-color backgrounds connected to image edges.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(["contain", "cover"] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => updateSelectedObject({ fit })}
                        className={`py-1.5 rounded-lg border text-xs font-bold capitalize cursor-pointer ${
                          (selectedObject.fit || "contain") === fit
                            ? "bg-[#e74b2d] border-[#e74b2d] text-white"
                            : "border-zinc-700 text-zinc-300"
                        }`}
                      >
                        {fit === "contain" ? "Fit inside" : "Fill frame"}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => resizeSelectedObject(0.9)}
                      className="py-1.5 rounded-lg border border-zinc-700 text-xs font-bold text-zinc-300 cursor-pointer hover:border-[#e74b2d]"
                    >
                      Smaller −
                    </button>
                    <button
                      type="button"
                      onClick={() => resizeSelectedObject(1.1)}
                      className="py-1.5 rounded-lg border border-zinc-700 text-xs font-bold text-zinc-300 cursor-pointer hover:border-[#e74b2d]"
                    >
                      Bigger +
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Opacity {Math.round((selectedObject.opacity ?? 1) * 100)}%
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round((selectedObject.opacity ?? 1) * 100)}
                  onChange={(e) => updateSelectedObject({ opacity: Number(e.target.value) / 100 })}
                  className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#e74b2d]"
                />
              </div>

              {/* POSITION & DIMENSIONS */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">Position & Size</p>
                {selectedObject.type === "text" && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-400">Width. Height always fits text.</p>
                    <div className="grid grid-cols-3 gap-1">
                      {([
                        ["inline", "Inline"],
                        ["full", "Full width"],
                        ["custom", "Custom"],
                      ] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateSelectedObject(
                            mode === "full"
                              ? { widthMode: "full", x: 0, width: 100 }
                              : mode === "inline"
                                ? { widthMode: "inline", width: 0 }
                                : { widthMode: "custom", width: selectedObject.width || 40 }
                          )}
                          className={`py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                            textFrame(selectedObject) === mode
                              ? "bg-[#e74b2d] border-[#e74b2d] text-white"
                              : "border-zinc-700/80 text-zinc-300"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {textFrame(selectedObject) === "custom" && (
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">Width {selectedObject.width}%</label>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={selectedObject.width || 40}
                          onChange={(e) => updateSelectedObject({ width: Number(e.target.value), widthMode: "custom" })}
                          className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#e74b2d]"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => placeInCenter(selectedObject)}
                      className="w-full py-1.5 rounded-lg border border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer hover:border-[#e74b2d]"
                    >
                      Place in center
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-zinc-400">X: {selectedObject.type === "text" && textFrame(selectedObject) === "full" ? 0 : selectedObject.x}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400">Y: {selectedObject.y}%</span>
                  </div>
                  {selectedObject.type !== "text" && (
                    <>
                      <label className="col-span-2 text-xs text-zinc-400">
                        Width {selectedObject.width}%
                        <input
                          type="range"
                          min={3}
                          max={Math.max(3, 100 - selectedObject.x)}
                          value={selectedObject.width}
                          onChange={(event) => {
                            const width = Number(event.target.value);
                            const height = selectedObject.lockAspectRatio !== false
                              ? Math.max(3, Math.round(width * selectedObject.height / Math.max(selectedObject.width, 1)))
                              : selectedObject.height;
                            updateSelectedObject({ width, height: Math.min(100 - selectedObject.y, height) });
                          }}
                          className="mt-1 w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#e74b2d]"
                        />
                      </label>
                      <label className="col-span-2 text-xs text-zinc-400">
                        Height {selectedObject.height}%
                        <input
                          type="range"
                          min={3}
                          max={Math.max(3, 100 - selectedObject.y)}
                          value={selectedObject.height}
                          onChange={(event) => {
                            const height = Number(event.target.value);
                            const width = selectedObject.lockAspectRatio !== false
                              ? Math.max(3, Math.round(height * selectedObject.width / Math.max(selectedObject.height, 1)))
                              : selectedObject.width;
                            updateSelectedObject({ height, width: Math.min(100 - selectedObject.x, width) });
                          }}
                          className="mt-1 w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#e74b2d]"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => updateSelectedObject({ lockAspectRatio: selectedObject.lockAspectRatio === false })}
                        className={`col-span-2 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                          selectedObject.lockAspectRatio !== false
                            ? "bg-[#e74b2d]/20 border-[#e74b2d] text-sky-200"
                            : "border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {selectedObject.lockAspectRatio !== false ? "🔗 Proportions locked" : "🔓 Width and height independent"}
                      </button>
                      <button
                        type="button"
                        onClick={() => placeInCenter(selectedObject)}
                        className="col-span-2 py-1.5 rounded-lg border border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer hover:border-[#e74b2d]"
                      >
                        Place in center
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* LAYER ORDERING & Z-INDEX */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">
                    Layer Order & Z-Index
                  </p>
                  <button
                    type="button"
                    onClick={() => updateSelectedObject({ isLocked: !selectedObject.isLocked })}
                    className={`px-2 py-0.5 rounded text-xs font-bold border transition-all cursor-pointer ${
                      selectedObject.isLocked
                        ? "bg-amber-500/20 border-amber-500 text-amber-400"
                        : "border-zinc-700 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {selectedObject.isLocked ? "🔒 Locked" : "🔓 Lock"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => moveLayer(selectedObject.id, "top")}
                    className="px-2 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-white flex items-center justify-center gap-1 cursor-pointer transition-all"
                    title="Bring to Front (Upfront)"
                  >
                    <span>▲▲</span>
                    <span>Bring to Front</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLayer(selectedObject.id, "bottom")}
                    className="px-2 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-white flex items-center justify-center gap-1 cursor-pointer transition-all"
                    title="Send to Back (Backward)"
                  >
                    <span>▼▼</span>
                    <span>Send to Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLayer(selectedObject.id, "up")}
                    className="px-2 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-300 flex items-center justify-center gap-1 cursor-pointer transition-all"
                    title="Bring Forward (+1 step)"
                  >
                    <span>▲</span>
                    <span>Bring Forward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLayer(selectedObject.id, "down")}
                    className="px-2 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-300 flex items-center justify-center gap-1 cursor-pointer transition-all"
                    title="Send Backward (-1 step)"
                  >
                    <span>▼</span>
                    <span>Send Backward</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
                Canvas Summary
              </p>

              <div className="space-y-2 text-sm text-zinc-300">
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Product</span>
                  <span className="text-white font-bold text-right">{category.name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Style</span>
                  <span className="text-sky-300 font-bold text-right">{styleLabel}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Width × Height</span>
                  <span className="text-white font-mono font-bold text-right">{widthLabel}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Aspect Ratio</span>
                  <span className="text-white font-mono text-right">{fitDims.aspectRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Bleed</span>
                  <span className="text-white font-mono text-right">{category.bleed} {category.bleedUnit || category.unit}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Safe Margin</span>
                  <span className="text-white font-mono text-right">{category.safe_area} {category.safeAreaUnit || category.unit}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Sides</span>
                  <span className="text-white font-bold text-right">
                    {sidesCount} · {sideMode.toUpperCase()}
                  </span>
                </div>
                {sideNames.length > 0 && (
                  <div className="pt-1">
                    <p className="text-zinc-500 text-xs mb-1">Panels</p>
                    <div className="flex flex-wrap gap-1">
                      {sideNames.map((name, idx) => (
                        <span
                          key={`${name}-${idx}`}
                          className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${
                            activeSideIndex === idx
                              ? "bg-[#e74b2d]/20 border-[#e74b2d] text-sky-200"
                              : "bg-zinc-900 border-zinc-700 text-zinc-400"
                          }`}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">Pricing</p>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Price ($USD, 0 = Free)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#e74b2d]"
                  />
                </div>
              </div>

              {/* CATEGORY VARIATIONS & DEFAULTS */}
              {category.variations && category.variations.length > 0 && (
                <div className="pt-3 border-t border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-extrabold text-sky-400 uppercase tracking-wider">
                      Template Variations & Defaults
                    </p>
                    <span className="text-xs text-zinc-500 font-medium">Pre-select specs</span>
                  </div>

                  {category.variations.map((v) => (
                    <div key={v.name} className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300 block">
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
                        className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#e74b2d] cursor-pointer"
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
              )}

              <div className="pt-2">
                <label className="text-xs text-zinc-400 block mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="modern, corporate, minimal"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#e74b2d]"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">Editor shortcuts</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-xs text-zinc-400">
                  <kbd className="text-zinc-200 text-[11px] bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">Arrows</kbd><span>Nudge 1% (Shift = 5%)</span>
                  <kbd className="text-zinc-200 text-[11px] bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">Ctrl/Cmd + D</kbd><span>Duplicate</span>
                  <kbd className="text-zinc-200 text-[11px] bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">Ctrl/Cmd + C / V</kbd><span>Copy / paste</span>
                  <kbd className="text-zinc-200 text-[11px] bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">+ / −</kbd><span>Resize selected graphic</span>
                  <kbd className="text-zinc-200 text-[11px] bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">Delete</kbd><span>Remove selected layer</span>
                  <kbd className="text-zinc-200 text-[11px] bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">Ctrl/Cmd + Z</kbd><span>Undo</span>
                  <kbd className="text-zinc-200 text-[11px] bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">Esc</kbd><span>Deselect</span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
