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
import { Icon, cx, labelClass, type IconName } from "@/components/admin/ui";

/* ── Editor chrome tokens (light, brand palette) ── */
const edInput =
  "w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 shadow-xs transition focus:outline-none focus:border-[#329AD4] focus:ring-4 focus:ring-[#329AD4]/10";
const edSection = "text-[11px] font-semibold uppercase tracking-wider text-zinc-400";
const edGhostBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 shadow-xs transition-all cursor-pointer hover:border-[#329AD4] hover:text-[#2884b8] disabled:opacity-40 disabled:cursor-not-allowed";

/* Extra 24px stroke icons used only by this editor's chrome. */
const ED_ICONS = {
  undo: "M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11",
  redo: "M15 14l5-5-5-5m5 5H9.5a5.5 5.5 0 000 11H13",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  shrink: "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5",
  type: "M5 6V4h14v2M12 4v16m-3 0h6",
  shapes: "M4 4h7v7H4V4zm13.5 0a3.5 3.5 0 110 7 3.5 3.5 0 010-7zM7.5 13L11 20H4l3.5-7zM14 14h6v6h-6v-6z",
  palette: "M12 3a9 9 0 100 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.8.7-1.4 1.5-1.4H16a5 5 0 005-5c0-4.4-4-8-9-8zM7.5 12a1 1 0 100-2 1 1 0 000 2zm3-4a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2z",
  copy: "M9 9h10v10H9V9zM5 15V5h10",
  lock: "M7 11V8a5 5 0 0110 0v3M6 11h12v9H6v-9z",
  unlock: "M7 11V8a5 5 0 019.5-2M6 11h12v9H6v-9z",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  cube: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v9m0 0l8-4.5M12 12l-8-4.5",
  pen: "M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17v3zM13.5 6.5l3 3",
  arrowUp: "M12 19V5m-6 6l6-6 6 6",
  arrowDown: "M12 5v14m6-6l-6 6-6-6",
  toTop: "M5 4h14M12 20V8m-5 5l5-5 5 5",
  toBottom: "M5 20h14M12 4v12m-5-5l5 5 5-5",
} as const;

const TAB_ICONS: Record<string, { ui?: IconName; ed?: keyof typeof ED_ICONS }> = {
  text: { ed: "type" },
  shapes: { ed: "shapes" },
  images: { ui: "image" },
  background: { ed: "palette" },
  variations: { ui: "tag" },
  layers: { ui: "layers" },
};

function EdIcon({ name, className = "w-4 h-4" }: { name: keyof typeof ED_ICONS; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={ED_ICONS[name]} />
    </svg>
  );
}

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
  "#329AD4", "#6366f1", "#8b5cf6", "#ec4899", "#78716c",
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
          color: "#55b2e7",
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
      fill: "#329AD4",
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
          ctx.fillStyle = obj.fill || "#329AD4";
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
      className={`flex flex-col gap-2 p-2 min-w-0 bg-[#f6fafd] text-zinc-900 font-sans transition-all ${
        isFullscreen
          ? "fixed inset-0 z-[999] h-screen w-screen overflow-hidden"
          : "h-[calc(100vh-100px)] rounded-2xl overflow-hidden border border-[#dbeefb] shadow-xs"
      }`}
    >
      {/* ── TOP HEADER TOOLBAR ─────────────────────────────────────── */}
      <header className="h-16 rounded-2xl border border-zinc-200/70 bg-white px-3 flex items-center justify-between gap-3 shrink-0 z-30 text-xs shadow-xs">
        {/* Left: Back Link, Title & Category Selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/admin/templates"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:border-[#329AD4] hover:text-[#2884b8] transition-colors shrink-0 whitespace-nowrap"
            title="Exit Editor & Back to Templates"
          >
            <Icon name="arrowLeft" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Exit
          </Link>

          <span className="hidden xl:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#55b2e7] to-[#2884b8] text-white shadow-md shadow-[#329AD4]/25">
            <Icon name="templates" className="w-4 h-4" />
          </span>

          <div className="min-w-0 flex flex-col justify-center">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent rounded-md text-sm font-semibold text-zinc-900 placeholder-zinc-400 px-1.5 py-0.5 -ml-1.5 hover:bg-[#f0f8fd] focus:bg-[#f0f8fd] focus:ring-1 focus:ring-[#b8e0f6] focus:outline-none truncate max-w-[220px]"
              placeholder="Template Title..."
            />
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
              {allCategories.length > 1 ? (
                <select
                  value={category._id || ""}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="bg-[#f0f8fd] text-[#2884b8] font-semibold px-1.5 py-0.5 rounded-md border border-[#dbeefb] focus:outline-none focus:border-[#329AD4] cursor-pointer text-[11px] max-w-[140px] truncate"
                >
                  {allCategories.map((c) => (
                    <option key={c._id || c.name} value={c._id}>
                      {c.name} ({c.canvas_width}×{c.canvas_height}{c.unit})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-semibold text-[#2884b8]">{category.name}</span>
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
                  className="bg-white text-zinc-700 font-semibold px-1.5 py-0.5 rounded-md border border-zinc-200 focus:outline-none focus:border-[#329AD4] cursor-pointer text-[11px] max-w-[150px] truncate"
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
              <span className="px-2 py-0.5 rounded-full bg-[#EAF5FB] text-[#2884b8] ring-1 ring-inset ring-[#329AD4]/20 text-[11px] font-semibold whitespace-nowrap">
                {styleLabel}
              </span>
              <span className="font-mono text-[11px] text-zinc-700 font-semibold whitespace-nowrap">{widthLabel}</span>
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
            <div className="inline-flex gap-0.5 p-1 bg-zinc-100/80 rounded-xl text-xs font-semibold">
              {sideNames.map((name, idx) => (
                <button
                  key={`${name}-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveSideIndex(idx);
                    setSelectedObjectId(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeSideIndex === idx ? "bg-white text-[#2884b8] shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                  title={name}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-lg bg-zinc-100/80 text-xs text-zinc-500 font-semibold">
              {sideNames[0] || "Single-Sided"}
            </div>
          )}

          {/* 2D / 3D Mode Toggle */}
          <div className="inline-flex gap-0.5 p-1 bg-zinc-100/80 rounded-xl text-xs font-semibold ml-1 shrink-0">
            <button
              onClick={() => setViewMode("2d")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "2d" ? "bg-white text-[#2884b8] shadow-xs" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <EdIcon name="pen" className="w-3.5 h-3.5" />
              2D Canvas
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "3d" ? "bg-white text-[#2884b8] shadow-xs" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <EdIcon name="cube" className="w-3.5 h-3.5" />
              3D Studio
            </button>
          </div>
        </div>

        {/* Right: Actions, Status & Save Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${
              status === "PUBLISHED"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
                : status === "ARCHIVED"
                ? "bg-rose-50 text-rose-700 ring-rose-600/15"
                : "bg-amber-50 text-amber-700 ring-amber-600/15"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "PUBLISHED" ? "bg-emerald-500" : status === "ARCHIVED" ? "bg-rose-500" : "bg-amber-500"
              }`}
            />
            {status}
          </span>

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 rounded-xl bg-zinc-100/80 p-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white hover:text-[#2884b8] hover:shadow-xs disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <EdIcon name="undo" className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white hover:text-[#2884b8] hover:shadow-xs disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <EdIcon name="redo" className="w-4 h-4" />
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={cx(edGhostBtn, "h-9 w-9 2xl:w-auto 2xl:px-3 whitespace-nowrap")}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <EdIcon name="shrink" className="w-4 h-4" />
                <span className="hidden 2xl:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <EdIcon name="expand" className="w-4 h-4" />
                <span className="hidden 2xl:inline">Fullscreen</span>
              </>
            )}
          </button>

          {/* Save Draft */}
          <button
            onClick={() => handleSave("DRAFT")}
            disabled={isSaving}
            className={cx(edGhostBtn, "h-9 px-3 whitespace-nowrap rounded-xl")}
          >
            Save Draft
          </button>

          {/* Publish */}
          <button
            onClick={() => handleSave("PUBLISHED")}
            disabled={isSaving}
            className="inline-flex h-9 items-center gap-1.5 px-3.5 rounded-xl bg-[#329AD4] hover:bg-[#2884b8] text-white text-xs font-semibold transition-all shadow-sm shadow-[#329AD4]/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSaving ? (
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.4} />
            )}
            {isSaving ? "Saving..." : "Publish Template"}
          </button>
        </div>
      </header>

      {/* ── SAVE NOTIFICATION TOAST ───────────────────────────────── */}
      {saveMessage && (
        <div className="shrink-0 rounded-xl border border-[#dbeefb] bg-[#f0f8fd] py-1.5 px-4 text-center text-xs font-semibold text-[#1b5b80] flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#329AD4]" />
          {saveMessage}
        </div>
      )}

      {/* ── MAIN WORKSPACE (LEFT PANEL + CANVAS + RIGHT PANEL) ─────── */}
      <div className="flex-1 flex gap-2 min-h-0 overflow-hidden">
        {/* ── 1. LEFT TOOLBAR PANEL (240px) ───────────────────────── */}
        <aside className="w-80 bg-white border border-zinc-200/70 rounded-2xl shadow-xs flex flex-col shrink-0 overflow-hidden">
          {/* Navigation Tabs */}
          <div className="grid grid-cols-6 gap-1 p-2 border-b border-zinc-100 text-xs font-medium">
            {(["text", "shapes", "images", "background", "variations", "layers"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                title={tab}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 px-0.5 text-center text-[10px] font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-[#EAF5FB] ring-1 ring-[#b8e0f6] text-[#2884b8]"
                    : "text-zinc-500 hover:bg-[#f0f8fd] hover:text-zinc-800"
                }`}
              >
                {TAB_ICONS[tab]?.ed ? (
                  <EdIcon name={TAB_ICONS[tab].ed!} className="w-4 h-4" />
                ) : (
                  <Icon name={TAB_ICONS[tab]?.ui || "grid"} className="w-4 h-4" />
                )}
                <span className="max-w-full truncate">{tab === "background" ? "Backgr." : tab}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {/* TEXT TAB */}
            {activeTab === "text" && (
              <div className="space-y-3">
                <p className={edSection}>Add Typography</p>
                <button
                  onClick={() => handleAddText("heading")}
                  className="group w-full px-3 py-3 rounded-xl bg-white hover:bg-[#f0f8fd] text-left border border-zinc-200 hover:border-[#b8e0f6] font-bold text-sm text-zinc-900 transition-all cursor-pointer flex items-center justify-between"
                >
                  Add Heading
                  <Icon name="plus" className="w-4 h-4 text-zinc-300 group-hover:text-[#329AD4]" strokeWidth={2.2} />
                </button>
                <button
                  onClick={() => handleAddText("subheading")}
                  className="group w-full px-3 py-2.5 rounded-xl bg-white hover:bg-[#f0f8fd] text-left border border-zinc-200 hover:border-[#b8e0f6] font-semibold text-xs text-zinc-800 transition-all cursor-pointer flex items-center justify-between"
                >
                  Add Subheading
                  <Icon name="plus" className="w-4 h-4 text-zinc-300 group-hover:text-[#329AD4]" strokeWidth={2.2} />
                </button>
                <button
                  onClick={() => handleAddText("body")}
                  className="group w-full px-3 py-2.5 rounded-xl bg-white hover:bg-[#f0f8fd] text-left border border-zinc-200 hover:border-[#b8e0f6] text-xs text-zinc-600 transition-all cursor-pointer flex items-center justify-between"
                >
                  Add Body Text
                  <Icon name="plus" className="w-4 h-4 text-zinc-300 group-hover:text-[#329AD4]" strokeWidth={2.2} />
                </button>

                <div className="rounded-xl border border-[#dbeefb] bg-[#f0f8fd] p-3 space-y-1">
                  <p className="text-[11px] font-semibold text-[#1b5b80] uppercase tracking-wider">Tip</p>
                  <p className="text-[#1b5b80]/80 text-xs leading-relaxed">
                    Click any text layer on the canvas to drag, resize font, adjust colors, and align.
                  </p>
                </div>
              </div>
            )}

            {/* SHAPES TAB */}
            {activeTab === "shapes" && (
              <div className="space-y-4">
                <p className={edSection}>Vector Shapes</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAddShape("rectangle")}
                    className="p-4 rounded-xl bg-white hover:bg-[#f0f8fd] border border-zinc-200 hover:border-[#b8e0f6] flex flex-col items-center gap-2.5 cursor-pointer transition-all text-zinc-700 hover:text-[#1b5b80]"
                  >
                    <div className="w-8 h-6 bg-[#329AD4] rounded-sm" />
                    <span className="text-xs font-semibold">Rectangle</span>
                  </button>

                  <button
                    onClick={() => handleAddShape("rounded-rect")}
                    className="p-4 rounded-xl bg-white hover:bg-[#f0f8fd] border border-zinc-200 hover:border-[#b8e0f6] flex flex-col items-center gap-2.5 cursor-pointer transition-all text-zinc-700 hover:text-[#1b5b80]"
                  >
                    <div className="w-8 h-6 bg-[#10b981] rounded-lg" />
                    <span className="text-xs font-semibold">Rounded</span>
                  </button>

                  <button
                    onClick={() => handleAddShape("circle")}
                    className="p-4 rounded-xl bg-white hover:bg-[#f0f8fd] border border-zinc-200 hover:border-[#b8e0f6] flex flex-col items-center gap-2.5 cursor-pointer transition-all text-zinc-700 hover:text-[#1b5b80]"
                  >
                    <div className="w-7 h-7 bg-[#f59e0b] rounded-full" />
                    <span className="text-xs font-semibold">Circle</span>
                  </button>

                  <button
                    onClick={() => handleAddShape("badge")}
                    className="p-4 rounded-xl bg-white hover:bg-[#f0f8fd] border border-zinc-200 hover:border-[#b8e0f6] flex flex-col items-center gap-2.5 cursor-pointer transition-all text-zinc-700 hover:text-[#1b5b80]"
                  >
                    <div className="w-8 h-4 bg-[#8b5cf6] rounded-full" />
                    <span className="text-xs font-semibold">Pill Badge</span>
                  </button>
                </div>
              </div>
            )}

            {/* IMAGES TAB */}
            {activeTab === "images" && (
              <div className="space-y-4">
                <p className={edSection}>Graphics and logos</p>
                <label className="border-2 border-dashed border-[#b8e0f6] hover:border-[#329AD4] bg-[#f0f8fd] hover:bg-[#EAF5FB] rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all block">
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#329AD4] shadow-xs">
                    <Icon name="upload" className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-semibold text-zinc-900">Add image on the card</span>
                  <span className="text-xs text-zinc-500 mt-0.5">Logo, photo, icon, or QR. Drag it into place after.</span>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                </label>
                <label className="border border-zinc-200 hover:border-[#b8e0f6] bg-white hover:bg-[#f0f8fd] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all block">
                  <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#2884b8]">
                    <Icon name="image" className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold text-zinc-900">Use image as full background</span>
                  <span className="text-xs text-zinc-500 mt-0.5">Covers this side. Customers still edit the text on top.</span>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
                </label>
              </div>
            )}

            {/* BACKGROUND TAB */}
            {activeTab === "background" && (
              <div className="space-y-4">
                <p className={edSection}>
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
                            next.bgGradient = next.bgGradient || "#329AD4";
                            next.bgGradientAngle = next.bgGradientAngle ?? 135;
                            next.bgImage = undefined;
                          } else if (mode === "image") {
                            next.bgGradient = undefined;
                          } else {
                            next.bgGradient = next.bgGradient || "#329AD4";
                            next.bgGradientAngle = next.bgGradientAngle ?? 135;
                          }
                          commitSide(next);
                        }}
                        className={`py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                          current === mode
                            ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]"
                            : "bg-white border-zinc-200 text-zinc-600 hover:border-[#b8e0f6]"
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
                        currentSideDesign.bgColor === c ? "border-[#329AD4] scale-110 shadow-lg" : "border-zinc-200"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="pt-2">
                  <label className={labelClass}>Custom Hex Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentSideDesign.bgColor}
                      onChange={(e) => {
                        const next = { ...currentSideDesign, bgColor: e.target.value };
                        setCurrentSideDesign(next);
                      }}
                      className="w-10 h-9 rounded-lg bg-white border border-zinc-200 p-0.5 shadow-xs cursor-pointer"
                    />
                    <input
                      type="text"
                      value={currentSideDesign.bgColor}
                      onChange={(e) => {
                        const next = { ...currentSideDesign, bgColor: e.target.value };
                        setCurrentSideDesign(next);
                      }}
                      className={cx(edInput, "flex-1 font-mono")}
                    />
                  </div>
                </div>

                {(currentSideDesign.bgStyle === "gradient" || currentSideDesign.bgStyle === "image-gradient" || (!currentSideDesign.bgStyle && currentSideDesign.bgGradient)) && (
                <div className="pt-3 border-t border-zinc-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className={edSection}>Gradient</p>
                    {currentSideDesign.bgGradient && (
                      <button
                        type="button"
                        onClick={() => commitSide({ ...currentSideDesign, bgGradient: undefined })}
                        className="rounded-md px-1.5 py-0.5 text-xs text-rose-600 font-semibold cursor-pointer hover:bg-rose-50 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentSideDesign.bgGradient || "#329AD4"}
                      onChange={(e) => commitSide({ ...currentSideDesign, bgGradient: e.target.value, bgGradientAngle: currentSideDesign.bgGradientAngle ?? 135 })}
                      className="w-10 h-9 rounded-lg bg-white border border-zinc-200 p-0.5 shadow-xs cursor-pointer"
                    />
                    <span className="text-xs text-zinc-500">Second color blends from the base color.</span>
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
                          bgGradient: currentSideDesign.bgGradient || "#329AD4",
                          bgGradientAngle: item.angle,
                        })}
                        className={`py-1.5 rounded-lg border text-xs cursor-pointer ${
                          (currentSideDesign.bgGradientAngle ?? 135) === item.angle && currentSideDesign.bgGradient
                            ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]"
                            : "bg-white border-zinc-200 text-zinc-600 hover:border-[#b8e0f6]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {(currentSideDesign.bgStyle === "image" || currentSideDesign.bgStyle === "image-gradient" || (!currentSideDesign.bgStyle && currentSideDesign.bgImage)) && (
                <div className="pt-3 border-t border-zinc-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className={edSection}>Background photo</p>
                    {currentSideDesign.bgImage && (
                      <button
                        type="button"
                        onClick={() => commitSide({ ...currentSideDesign, bgImage: undefined })}
                        className="rounded-md px-1.5 py-0.5 text-xs text-rose-600 font-semibold cursor-pointer hover:bg-rose-50 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {currentSideDesign.bgImage ? (
                    <img src={mediaSrc(currentSideDesign.bgImage) || currentSideDesign.bgImage} alt="" className="w-full h-20 object-cover rounded-xl border border-zinc-200" />
                  ) : (
                    <p className="text-xs text-zinc-500">No photo. Use Images, or upload one here.</p>
                  )}
                  <label className="block text-center py-2 rounded-xl border border-dashed border-[#b8e0f6] bg-[#f0f8fd] text-xs font-semibold text-[#2884b8] cursor-pointer hover:border-[#329AD4] hover:bg-[#EAF5FB] transition-colors">
                    Upload background
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {(["cover", "contain"] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => commitSide({ ...currentSideDesign, bgFit: fit })}
                        className={`py-1.5 rounded-lg border text-xs font-semibold capitalize cursor-pointer ${
                          (currentSideDesign.bgFit || "cover") === fit
                            ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]"
                            : "bg-white border-zinc-200 text-zinc-600 hover:border-[#b8e0f6]"
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                  <label className="block text-xs font-semibold text-zinc-700">
                    Photo strength {Math.round((currentSideDesign.bgOpacity ?? 1) * 100)}%
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={Math.round((currentSideDesign.bgOpacity ?? 1) * 100)}
                    onChange={(e) => setCurrentSideDesign({ ...currentSideDesign, bgOpacity: Number(e.target.value) / 100 })}
                    className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#329AD4]"
                  />
                </div>
                )}
              </div>
            )}

            {/* VARIATIONS TAB */}
            {activeTab === "variations" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#dbeefb] bg-[#f0f8fd] px-3 py-2.5">
                  <p className="text-xs font-semibold text-[#1b5b80]">
                    {category.name} Variations
                  </p>
                  <p className="text-[11px] text-[#2884b8]/80 mt-0.5">
                    Pre-select default specs for templates in this category
                  </p>
                </div>

                {!category.variations || category.variations.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs bg-zinc-50/70 rounded-xl border border-dashed border-zinc-200 p-4">
                    <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#329AD4]">
                      <Icon name="tag" className="w-5 h-5" />
                    </span>
                    <p className="font-semibold text-zinc-800 mb-1">No Category Variations</p>
                    This category doesn&apos;t have any variations configured yet.
                  </div>
                ) : (
                  category.variations.map((v) => (
                    <div key={v.name} className="bg-white p-3 rounded-xl border border-zinc-200 shadow-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-zinc-900">{v.name}</span>
                        {v.required && (
                          <span className="text-[10px] bg-[#EAF5FB] text-[#2884b8] ring-1 ring-inset ring-[#329AD4]/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
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
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#EAF5FB] border-[#b8e0f6] ring-1 ring-[#b8e0f6] text-[#2884b8]"
                                  : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-[#b8e0f6] hover:bg-[#f0f8fd]"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                                  isSelected ? "border-[#329AD4] bg-[#329AD4]" : "border-zinc-300"
                                }`}>
                                  {isSelected && <span className="w-1 h-1 rounded-full bg-white" />}
                                </span>
                                {val.name}
                              </span>
                              <span className="text-xs font-mono text-zinc-500">
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
                <p className={edSection}>
                  Layers ({currentSideDesign.objects.length})
                </p>

                {currentSideDesign.objects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#329AD4]">
                      <Icon name="layers" className="w-5 h-5" />
                    </span>
                    <p className="mt-2 text-xs font-semibold text-zinc-700">No layers on this side.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {[...currentSideDesign.objects].reverse().map((obj) => (
                      <div
                        key={obj.id}
                        onClick={() => setSelectedObjectId(obj.id)}
                        className={`group/layer px-2 py-1.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          selectedObjectId === obj.id
                            ? "bg-[#EAF5FB] border-[#b8e0f6] ring-1 ring-[#b8e0f6] text-[#2884b8]"
                            : "bg-white border-transparent text-zinc-700 hover:bg-[#f0f8fd] hover:border-[#dbeefb]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
                            {obj.type === "text" ? (
                              <EdIcon name="type" className="w-3.5 h-3.5" />
                            ) : obj.type === "shape" ? (
                              <EdIcon name="shapes" className="w-3.5 h-3.5" />
                            ) : (
                              <Icon name="image" className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <span className="text-xs font-semibold truncate max-w-[100px]">
                            {obj.text || obj.shapeType || obj.type}
                          </span>
                          {obj.isLocked && <EdIcon name="lock" className="w-3.5 h-3.5 shrink-0 text-amber-500" />}
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(obj.id, "top");
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-white hover:text-[#2884b8] hover:shadow-xs"
                            title="Bring to Front (Upfront)"
                          >
                            <EdIcon name="toTop" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(obj.id, "up");
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-white hover:text-[#2884b8] hover:shadow-xs"
                            title="Bring Forward"
                          >
                            <EdIcon name="arrowUp" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(obj.id, "down");
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-white hover:text-[#2884b8] hover:shadow-xs"
                            title="Send Backward"
                          >
                            <EdIcon name="arrowDown" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(obj.id, "bottom");
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-white hover:text-[#2884b8] hover:shadow-xs"
                            title="Send to Back (Backward)"
                          >
                            <EdIcon name="toBottom" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteObject(obj.id);
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Delete layer"
                          >
                            <Icon name="trash" className="w-3.5 h-3.5" />
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
        <main className="flex-1 flex flex-col bg-[#f6fafd] rounded-2xl border border-[#dbeefb] relative overflow-hidden">
          {/* Canvas Top Controls Toolbar */}
          <div className="h-11 border-b border-[#dbeefb] bg-white/80 backdrop-blur px-3 flex items-center justify-between gap-3 text-xs text-zinc-500 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 cursor-pointer select-none hover:border-[#b8e0f6] shadow-xs">
                <input
                  type="checkbox"
                  checked={showGuides}
                  onChange={(e) => setShowGuides(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-[#329AD4]"
                />
                <span className="text-xs font-semibold text-zinc-700 whitespace-nowrap">Print Guides</span>
              </label>

              {showGuides && (
                <div className="flex items-center gap-1.5 text-[11px] font-mono min-w-0 overflow-hidden">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-rose-600 ring-1 ring-inset ring-rose-600/15 whitespace-nowrap">
                    <span className="w-2 h-2 border border-dashed border-rose-500 inline-block" /> Bleed (+{category.bleed}{category.bleedUnit || category.unit})
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-inset ring-emerald-600/15 whitespace-nowrap">
                    <span className="w-2 h-2 border border-dashed border-emerald-500 inline-block" /> Safe Area ({category.safe_area}{category.safeAreaUnit || category.unit})
                  </span>
                </div>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 rounded-xl bg-zinc-100/80 p-1 text-xs shrink-0">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
                className="w-6 h-6 rounded-lg text-zinc-600 hover:bg-white hover:text-[#2884b8] hover:shadow-xs font-semibold flex items-center justify-center cursor-pointer text-sm"
              >
                -
              </button>
              <span className="text-zinc-700 font-mono text-[11px] font-semibold w-11 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.1))}
                className="w-6 h-6 rounded-lg text-zinc-600 hover:bg-white hover:text-[#2884b8] hover:shadow-xs font-semibold flex items-center justify-center cursor-pointer text-sm"
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="px-2 h-6 rounded-lg text-zinc-600 hover:bg-white hover:text-[#2884b8] hover:shadow-xs text-[11px] font-semibold cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto relative [background-image:radial-gradient(#cfe4f3_1px,transparent_1px)] [background-size:18px_18px]">
            {viewMode === "3d" ? (
              /* ── 3D REALISTIC PREVIEW ────────────────────────── */
              <div className="w-full h-full max-h-[560px] relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-800 to-zinc-950 text-zinc-100 shadow-xl shadow-[#1b5b80]/15">
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
                          ? "ring-2 ring-[#329AD4] ring-offset-1 ring-offset-transparent"
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
                            backgroundColor: obj.fill || "#329AD4",
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
                          className="absolute -bottom-2 -right-2 size-4 rounded-full border-2 border-white bg-[#329AD4] shadow-md cursor-nwse-resize z-50"
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
        <aside className="w-80 bg-white border border-zinc-200/70 rounded-2xl shadow-xs p-4 flex flex-col shrink-0 overflow-y-auto space-y-3.5 text-xs">
          {selectedObject ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 -mx-4 -mt-4 px-4 py-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
                    {selectedObject.type === "text" ? (
                      <EdIcon name="type" className="w-4 h-4" />
                    ) : selectedObject.type === "shape" ? (
                      <EdIcon name="shapes" className="w-4 h-4" />
                    ) : (
                      <Icon name="image" className="w-4 h-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 capitalize truncate">
                      {selectedObject.type} Properties
                    </p>
                    <p className="text-[11px] text-zinc-400">Selected layer</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleDuplicateObject(selectedObject.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-[#EAF5FB] hover:text-[#2884b8] transition-colors cursor-pointer"
                    title="Duplicate"
                  >
                    <EdIcon name="copy" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteObject(selectedObject.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* TEXT PROPERTIES */}
              {selectedObject.type === "text" && (
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Text Content</label>
                    <textarea
                      rows={2}
                      value={selectedObject.text || ""}
                      onChange={(e) => updateSelectedObject({ text: e.target.value })}
                      className={cx(edInput, "resize-none")}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Font Family</label>
                    <select
                      value={selectedObject.fontFamily || FONT_FAMILIES[0].value}
                      onChange={(e) => updateSelectedObject({ fontFamily: e.target.value })}
                      className={cx(edInput, "cursor-pointer")}
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Font Size</label>
                      <input
                        type="number"
                        min={8}
                        max={90}
                        value={selectedObject.fontSize || 14}
                        onChange={(e) => updateSelectedObject({ fontSize: Number(e.target.value) })}
                        className={edInput}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Text Color</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={selectedObject.color || "#ffffff"}
                          onChange={(e) => updateSelectedObject({ color: e.target.value })}
                          className="w-8 h-8 rounded-lg bg-white border border-zinc-200 p-0.5 shadow-xs cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={selectedObject.color || "#ffffff"}
                          onChange={(e) => updateSelectedObject({ color: e.target.value })}
                          className={cx(edInput, "flex-1 min-w-0 font-mono")}
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
                        className={`flex-1 py-1 rounded-lg border text-xs font-semibold transition-all capitalize ${
                          selectedObject.fontWeight === fw
                            ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]"
                            : "bg-white border-zinc-200 text-zinc-500 hover:bg-[#f0f8fd]"
                        }`}
                      >
                        {fw}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateSelectedObject({ fontStyle: selectedObject.fontStyle === "italic" ? "normal" : "italic" })}
                      className={`w-7 py-1 rounded-lg border text-xs italic cursor-pointer ${
                        selectedObject.fontStyle === "italic" ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]" : "bg-white border-zinc-200 text-zinc-500 hover:border-[#b8e0f6]"
                      }`}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedObject({ underline: !selectedObject.underline })}
                      className={`w-7 py-1 rounded-lg border text-xs underline cursor-pointer ${
                        selectedObject.underline ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]" : "bg-white border-zinc-200 text-zinc-500 hover:border-[#b8e0f6]"
                      }`}
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedObject({ textTransform: selectedObject.textTransform === "uppercase" ? "none" : "uppercase" })}
                      className={`w-7 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                        selectedObject.textTransform === "uppercase" ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]" : "bg-white border-zinc-200 text-zinc-500 hover:border-[#b8e0f6]"
                      }`}
                    >
                      AA
                    </button>
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => updateSelectedObject({ textAlign: align })}
                        className={`w-7 py-1 rounded-lg border text-xs font-semibold transition-all capitalize ${
                          selectedObject.textAlign === align
                            ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]"
                            : "bg-white border-zinc-200 text-zinc-500 hover:bg-[#f0f8fd]"
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
                    <label className={labelClass}>Fill Color</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={selectedObject.fill || "#329AD4"}
                        onChange={(e) => updateSelectedObject({ fill: e.target.value })}
                        className="w-8 h-8 rounded-lg bg-white border border-zinc-200 p-0.5 shadow-xs cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={selectedObject.fill || "#329AD4"}
                        onChange={(e) => updateSelectedObject({ fill: e.target.value })}
                        className={cx(edInput, "flex-1 min-w-0 font-mono")}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Corner Radius</label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={selectedObject.borderRadius || 0}
                      onChange={(e) => updateSelectedObject({ borderRadius: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#329AD4]"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Outline</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedObject.stroke || "#ffffff"}
                        onChange={(e) => updateSelectedObject({ stroke: e.target.value, strokeWidth: selectedObject.strokeWidth || 2 })}
                        className="w-8 h-8 rounded-lg bg-white border border-zinc-200 p-0.5 shadow-xs cursor-pointer shrink-0"
                      />
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={selectedObject.strokeWidth || 0}
                        onChange={(e) => updateSelectedObject({ strokeWidth: Number(e.target.value) })}
                        className="w-16 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 shadow-xs transition focus:outline-none focus:border-[#329AD4] focus:ring-4 focus:ring-[#329AD4]/10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(selectedObject.type === "image" || selectedObject.type === "logo") && (
                <div className="space-y-3">
                  <label className="block text-center py-2 rounded-xl border border-dashed border-[#b8e0f6] bg-[#f0f8fd] text-xs font-semibold text-[#2884b8] cursor-pointer hover:border-[#329AD4] hover:bg-[#EAF5FB] transition-colors">
                    Replace image
                    <input type="file" accept="image/*" className="hidden" onChange={handleReplaceImage} />
                  </label>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 space-y-2">
                    <button
                      type="button"
                      onClick={handleRemoveImageBackground}
                      disabled={removingBackgroundId === selectedObject.id}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#EAF5FB] hover:bg-[#dbeefb] text-xs font-semibold text-[#2884b8] cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {removingBackgroundId === selectedObject.id ? "Removing background..." : "Remove solid background"}
                    </button>
                    <label className="block text-xs font-semibold text-zinc-700">
                      Color tolerance {backgroundTolerance}
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={backgroundTolerance}
                      onChange={(event) => setBackgroundTolerance(Number(event.target.value))}
                      className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#329AD4]"
                    />
                    <p className="text-[11px] leading-relaxed text-zinc-500">
                      Best for white or single-color backgrounds connected to image edges.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(["contain", "cover"] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => updateSelectedObject({ fit })}
                        className={`py-1.5 rounded-lg border text-xs font-semibold capitalize cursor-pointer ${
                          (selectedObject.fit || "contain") === fit
                            ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]"
                            : "bg-white border-zinc-200 text-zinc-600 hover:border-[#b8e0f6]"
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
                      className="py-1.5 rounded-lg border border-zinc-200 bg-white shadow-xs text-xs font-semibold text-zinc-700 cursor-pointer hover:border-[#329AD4] hover:text-[#2884b8] transition-colors"
                    >
                      Smaller −
                    </button>
                    <button
                      type="button"
                      onClick={() => resizeSelectedObject(1.1)}
                      className="py-1.5 rounded-lg border border-zinc-200 bg-white shadow-xs text-xs font-semibold text-zinc-700 cursor-pointer hover:border-[#329AD4] hover:text-[#2884b8] transition-colors"
                    >
                      Bigger +
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Opacity {Math.round((selectedObject.opacity ?? 1) * 100)}%
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round((selectedObject.opacity ?? 1) * 100)}
                  onChange={(e) => updateSelectedObject({ opacity: Number(e.target.value) / 100 })}
                  className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#329AD4]"
                />
              </div>

              {/* POSITION & DIMENSIONS */}
              <div className="pt-3 border-t border-zinc-100 space-y-2">
                <p className={edSection}>Position & Size</p>
                {selectedObject.type === "text" && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-500">Width. Height always fits text.</p>
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
                          className={`py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                            textFrame(selectedObject) === mode
                              ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]"
                              : "bg-white border-zinc-200 text-zinc-600 hover:border-[#b8e0f6]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {textFrame(selectedObject) === "custom" && (
                      <div>
                        <label className={labelClass}>Width {selectedObject.width}%</label>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={selectedObject.width || 40}
                          onChange={(e) => updateSelectedObject({ width: Number(e.target.value), widthMode: "custom" })}
                          className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#329AD4]"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => placeInCenter(selectedObject)}
                      className="w-full py-1.5 rounded-lg border border-zinc-200 bg-white shadow-xs text-xs font-semibold text-zinc-700 cursor-pointer hover:border-[#329AD4] hover:text-[#2884b8] transition-colors"
                    >
                      Place in center
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="flex items-center justify-between rounded-lg bg-zinc-50 border border-zinc-100 px-2.5 py-1.5 text-xs text-zinc-500"><span className="font-semibold text-zinc-400">X</span> <span className="font-mono text-zinc-800">{selectedObject.type === "text" && textFrame(selectedObject) === "full" ? 0 : selectedObject.x}%</span></span>
                  </div>
                  <div>
                    <span className="flex items-center justify-between rounded-lg bg-zinc-50 border border-zinc-100 px-2.5 py-1.5 text-xs text-zinc-500"><span className="font-semibold text-zinc-400">Y</span> <span className="font-mono text-zinc-800">{selectedObject.y}%</span></span>
                  </div>
                  {selectedObject.type !== "text" && (
                    <>
                      <label className="col-span-2 block text-xs font-semibold text-zinc-700">
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
                          className="mt-1 w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#329AD4]"
                        />
                      </label>
                      <label className="col-span-2 block text-xs font-semibold text-zinc-700">
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
                          className="mt-1 w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#329AD4]"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => updateSelectedObject({ lockAspectRatio: selectedObject.lockAspectRatio === false })}
                        className={`col-span-2 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                          selectedObject.lockAspectRatio !== false
                            ? "bg-[#EAF5FB] border-[#329AD4] text-[#2884b8]"
                            : "bg-white border-zinc-200 text-zinc-500 hover:border-[#b8e0f6]"
                        }`}
                      >
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <EdIcon name={selectedObject.lockAspectRatio !== false ? "link" : "unlock"} className="w-3.5 h-3.5" />
                          {selectedObject.lockAspectRatio !== false ? "Proportions locked" : "Width and height independent"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => placeInCenter(selectedObject)}
                        className="col-span-2 py-1.5 rounded-lg border border-zinc-200 bg-white shadow-xs text-xs font-semibold text-zinc-700 cursor-pointer hover:border-[#329AD4] hover:text-[#2884b8] transition-colors"
                      >
                        Place in center
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* LAYER ORDERING & Z-INDEX */}
              <div className="pt-3 border-t border-zinc-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className={edSection}>
                    Layer Order & Z-Index
                  </p>
                  <button
                    type="button"
                    onClick={() => updateSelectedObject({ isLocked: !selectedObject.isLocked })}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      selectedObject.isLocked
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-white border-zinc-200 text-zinc-500 hover:border-[#b8e0f6] hover:text-[#2884b8]"
                    }`}
                  >
                    <EdIcon name={selectedObject.isLocked ? "lock" : "unlock"} className="w-3.5 h-3.5" />
                    {selectedObject.isLocked ? "Locked" : "Lock"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => moveLayer(selectedObject.id, "top")}
                    className="px-2 py-1.5 rounded-lg bg-white hover:bg-[#f0f8fd] border border-zinc-200 hover:border-[#b8e0f6] shadow-xs text-xs font-semibold text-zinc-700 hover:text-[#2884b8] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    title="Bring to Front (Upfront)"
                  >
                    <EdIcon name="toTop" className="w-3.5 h-3.5" />
                    <span>Bring to Front</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLayer(selectedObject.id, "bottom")}
                    className="px-2 py-1.5 rounded-lg bg-white hover:bg-[#f0f8fd] border border-zinc-200 hover:border-[#b8e0f6] shadow-xs text-xs font-semibold text-zinc-700 hover:text-[#2884b8] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    title="Send to Back (Backward)"
                  >
                    <EdIcon name="toBottom" className="w-3.5 h-3.5" />
                    <span>Send to Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLayer(selectedObject.id, "up")}
                    className="px-2 py-1.5 rounded-lg bg-white hover:bg-[#f0f8fd] border border-zinc-200 hover:border-[#b8e0f6] shadow-xs text-xs font-semibold text-zinc-600 hover:text-[#2884b8] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    title="Bring Forward (+1 step)"
                  >
                    <EdIcon name="arrowUp" className="w-3.5 h-3.5" />
                    <span>Bring Forward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLayer(selectedObject.id, "down")}
                    className="px-2 py-1.5 rounded-lg bg-white hover:bg-[#f0f8fd] border border-zinc-200 hover:border-[#b8e0f6] shadow-xs text-xs font-semibold text-zinc-600 hover:text-[#2884b8] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    title="Send Backward (-1 step)"
                  >
                    <EdIcon name="arrowDown" className="w-3.5 h-3.5" />
                    <span>Send Backward</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 -mx-4 -mt-4 px-4 py-3 border-b border-zinc-100">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
                  <Icon name="templates" className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">Canvas Summary</p>
                  <p className="text-[11px] text-zinc-400">Select a layer to edit it</p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 divide-y divide-zinc-100 text-xs text-zinc-700 [&>div]:px-3 [&>div]:py-2">
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Product</span>
                  <span className="text-zinc-900 font-semibold text-right">{category.name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Style</span>
                  <span className="text-[#2884b8] font-semibold text-right">{styleLabel}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Width × Height</span>
                  <span className="text-zinc-900 font-mono font-semibold text-right">{widthLabel}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Aspect Ratio</span>
                  <span className="text-zinc-900 font-mono text-right">{fitDims.aspectRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Bleed</span>
                  <span className="text-zinc-900 font-mono text-right">{category.bleed} {category.bleedUnit || category.unit}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Safe Margin</span>
                  <span className="text-zinc-900 font-mono text-right">{category.safe_area} {category.safeAreaUnit || category.unit}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500 shrink-0">Sides</span>
                  <span className="text-zinc-900 font-semibold text-right">
                    {sidesCount} · {sideMode.toUpperCase()}
                  </span>
                </div>
                {sideNames.length > 0 && (
                  <div className="pt-1">
                    <p className="text-zinc-500 text-xs mb-1.5">Panels</p>
                    <div className="flex flex-wrap gap-1">
                      {sideNames.map((name, idx) => (
                        <span
                          key={`${name}-${idx}`}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            activeSideIndex === idx
                              ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]"
                              : "bg-white border-zinc-200 text-zinc-500"
                          }`}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-100 space-y-2">
                <p className={edSection}>Pricing</p>
                <div>
                  <label className={labelClass}>Price ($USD, 0 = Free)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={edInput}
                  />
                </div>
              </div>

              {/* CATEGORY VARIATIONS & DEFAULTS */}
              {category.variations && category.variations.length > 0 && (
                <div className="pt-3 border-t border-zinc-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-[#2884b8] uppercase tracking-wider">
                      Template Variations & Defaults
                    </p>
                    <span className="text-xs text-zinc-500 font-medium">Pre-select specs</span>
                  </div>

                  {category.variations.map((v) => (
                    <div key={v.name} className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-700">
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
                        className={cx(edInput, "cursor-pointer")}
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
                <label className={labelClass}>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="modern, corporate, minimal"
                  className={edInput}
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 space-y-2">
                <p className={edSection}>Editor shortcuts</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-xs text-zinc-500">
                  <kbd className="justify-self-start font-mono text-zinc-700 text-[10px] bg-zinc-50 px-1.5 py-0.5 rounded-md border border-zinc-200 shadow-xs">Arrows</kbd><span>Nudge 1% (Shift = 5%)</span>
                  <kbd className="justify-self-start font-mono text-zinc-700 text-[10px] bg-zinc-50 px-1.5 py-0.5 rounded-md border border-zinc-200 shadow-xs">Ctrl/Cmd + D</kbd><span>Duplicate</span>
                  <kbd className="justify-self-start font-mono text-zinc-700 text-[10px] bg-zinc-50 px-1.5 py-0.5 rounded-md border border-zinc-200 shadow-xs">Ctrl/Cmd + C / V</kbd><span>Copy / paste</span>
                  <kbd className="justify-self-start font-mono text-zinc-700 text-[10px] bg-zinc-50 px-1.5 py-0.5 rounded-md border border-zinc-200 shadow-xs">+ / −</kbd><span>Resize selected graphic</span>
                  <kbd className="justify-self-start font-mono text-zinc-700 text-[10px] bg-zinc-50 px-1.5 py-0.5 rounded-md border border-zinc-200 shadow-xs">Delete</kbd><span>Remove selected layer</span>
                  <kbd className="justify-self-start font-mono text-zinc-700 text-[10px] bg-zinc-50 px-1.5 py-0.5 rounded-md border border-zinc-200 shadow-xs">Ctrl/Cmd + Z</kbd><span>Undo</span>
                  <kbd className="justify-self-start font-mono text-zinc-700 text-[10px] bg-zinc-50 px-1.5 py-0.5 rounded-md border border-zinc-200 shadow-xs">Esc</kbd><span>Deselect</span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
