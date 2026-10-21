"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import ThreeDCardPreview from "./ThreeDCardPreview";
import ScaledCardStage from "./ScaledCardStage";
import { calculateFitDimensions, getCanvasAspectRatio, CanvasUnit, PrintSize, asCanvasUnit } from "@/lib/canvasUtils";
import CanvasGuideLinesOverlay from "./CanvasGuideLinesOverlay";
import MockupCanvasStage from "./MockupCanvasStage";
import { cleanGuideLines, type CanvasGuideLine } from "@/lib/guideLines";
import { asCanvasType, cleanPrintArea, type CanvasType, type PrintArea } from "@/lib/mockupCanvas";
import PurchaseTemplateModal from "./PurchaseTemplateModal";
import TextStyleControls from "./TextStyleControls";
import CardDesignObjects from "./CardDesignObjects";
import { mediaSrc } from "@/lib/mediaUrl";
import CardOrderFields from "./CardOrderFields";
import { applyEmployeeToLayers, employeeCardFields, lockTemplateFields, withCurrentSamples, type EmployeeCard, type SheetField } from "@/lib/employeeSheet";
import { registerHref, viewerIsSignedIn } from "@/lib/accountGate";
import { useStepScroll } from "@/components/useStepScroll";
import { IVariation, IVariationValue } from "@/models/Product";
import {
  CUSTOMIZE_LAYOUT,
  backLayersFromDesign,
  designBackdrop,
  userCardBackdrop,
  cornerRadiusForFinish,
  downloadCanvasPng,
  imageOverridesFromDesign,
  isArtworkImage,
  printExportWidth,
  renderCardToCanvas,
  selectionGapForAnchor,
  selectionGapFromElement,
  selectionGapFromPercents,
  snapDragBox,
  snapTargetsFromCard,
  textLayerDomStyle,
  type SelectionGap,
  withImageOverrides,
  type CardScene,
} from "@/lib/cardRender";
import {
  decorFromSideObjects,
  mergeSideDesign,
  resolveTemplateSides,
  textLayersFromSideObjects,
} from "@/lib/templateSides";
import {
  createImageLayer,
  DEFAULT_IMAGE_LAYER_SRC,
  imageLayerToObject,
  imageLayersFromObjects,
  type ImageLayer,
} from "@/lib/imageLayers";
import ImageLayerControls from "./ImageLayerControls";
import Link from "next/link";
import SpacingGapOverlay from "./SpacingGapOverlay";
import { clampPercent, use2dShortcuts, useEditorHistory } from "./useEditorShortcuts";

export interface TextLayer {
  id: string;
  text: string;
  x: number; // Percentage 0 - 100
  y: number; // Percentage 0 - 100
  fontSize: number; // px e.g. 10 - 48
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

type EditorSnap = {
  textLayers: TextLayer[];
  backTextLayers: TextLayer[];
  logoX: number;
  logoY: number;
  backLogoX: number;
  backLogoY: number;
  extraLogoPoints: Array<{ x: number; y: number }>;
  activeTextId: string | null;
  gapOwner: "text" | "logo";
};

const LOGO_PLACEHOLDER = "/placeholder.jpg";

function logoPoint(position: string) {
  if (position === "top-left") return { x: 6, y: 8 };
  if (position === "center") return { x: 38, y: 36 };
  if (position === "bottom-right") return { x: 70, y: 68 };
  return { x: 70, y: 8 };
}

interface CardDesignData {
  name: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  bgColor: string;
  textColor: string;
  logoPosition: "top-right" | "top-left" | "center" | "bottom-right";
  logoX: number;
  logoY: number;
  backLogoPosition: "top-right" | "top-left" | "center" | "bottom-right";
  backLogoX: number;
  backLogoY: number;
  /** Logo placement for sides beyond front/back (index 0 = side 2). */
  extraLogoPoints?: Array<{ x: number; y: number }>;
  logoText: string;
  logoImage: string | null;
  logoSize: number;
  imageOpacity: number;
  bgMode: "color" | "gradient" | "image" | "image-gradient";
  bgGradient: string;
  bgGradientAngle: number;
  backBgColor: string;
  backBgMode: "color" | "gradient" | "image" | "image-gradient";
  backBgGradient: string;
  backBgGradientAngle: number;
  backUploadedImage: string | null;
  side: "front" | "back";
  thickness: string;
  texture: string;
  corners: string;
  quantity: number;
  approved: boolean;
  uploadedImage: string | null;
  fileName: string;
  rotation: number;
  fitMode: "bleed" | "safe";
}

export default function BusinessCardsCustomizeFlow({
  initialData,
  onClose,
}: {
  initialData?: Partial<CardDesignData>;
  onClose?: () => void;
}) {
  const [step, setStep] = useState<"category" | "upload" | "review" | "preferences" | "cart">(() => {
    if (typeof window === "undefined") return "review";
    const query = new URLSearchParams(window.location.search);
    const stepParam = query.get("step");
    if (stepParam === "category") return "category";
    if (stepParam === "upload") return "upload";
    if (stepParam === "preferences") return "preferences";
    if (stepParam === "cart") return "cart";
    return "review";
  });

  useStepScroll(step, ["category", "upload", "review", "preferences", "cart"]);

  // Studio inspector tabs: "text" | "background" | "paper"
  const [studioTab, setStudioTab] = useState<"text" | "background" | "paper">("text");

  // Zoom controls (1.0 = 100%)
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Mobile Bottom Sheet expanded state
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState<boolean>(false);

  // Mobile live price Details modal
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);

  // More options expandable in Text inspector
  const [showMoreTextOptions, setShowMoreTextOptions] = useState<boolean>(false);

  // View Mode: "3d" | "2d"
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const logoEditIdRef = useRef<string | null>(null);

  // Card Design Fields & Upload State
  const [cardData, setCardData] = useState<CardDesignData>({
    name: initialData?.name || "Stephen",
    title: initialData?.title || "Manager",
    phone: initialData?.phone || "+1 (555) 123-4567",
    email: initialData?.email || "stephen@zyora.com",
    address: initialData?.address || "15 rue de la Boëtie, Poissy",
    website: initialData?.website || "www.zyora.com",
    bgColor: initialData?.bgColor || "#1a1a1a",
    textColor: initialData?.textColor || "#ffffff",
    logoPosition: initialData?.logoPosition || "top-right",
    logoX: initialData?.logoX ?? logoPoint(initialData?.logoPosition || "top-right").x,
    logoY: initialData?.logoY ?? logoPoint(initialData?.logoPosition || "top-right").y,
    backLogoPosition: initialData?.backLogoPosition || initialData?.logoPosition || "top-right",
    backLogoX: initialData?.backLogoX ?? logoPoint(initialData?.logoPosition || "top-right").x,
    backLogoY: initialData?.backLogoY ?? logoPoint(initialData?.logoPosition || "top-right").y,
    logoText: "",
    logoImage: initialData?.logoImage || null,
    logoSize: initialData?.logoSize ?? 36,
    imageOpacity: initialData?.imageOpacity ?? 100,
    bgMode: "color",
    bgGradient: "#2196D2",
    bgGradientAngle: 135,
    backBgColor: initialData?.backBgColor || "#141414",
    backBgMode: initialData?.backBgMode || "color",
    backBgGradient: initialData?.backBgGradient || "#2196D2",
    backBgGradientAngle: initialData?.backBgGradientAngle ?? 135,
    backUploadedImage: initialData?.backUploadedImage || null,
    side: "front",
    thickness: "Standard",
    texture: "Smooth / Matte",
    corners: "Rounded Corners",
    quantity: 100,
    approved: false,
    uploadedImage: initialData?.uploadedImage || null,
    fileName: initialData?.fileName || "",
    rotation: 0,
    fitMode: "bleed",
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get("templateId");
  const designId = searchParams?.get("designId");
  const categoryParam = searchParams?.get("category");

  const [dbVariations, setDbVariations] = useState<IVariation[]>([]);
  const [basePrice, setBasePrice] = useState<number>(0.15);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

  useEffect(() => {
    const targetId = searchParams?.get("productId") || categoryParam || "business-cards";
    fetch(`/api/products/${targetId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.product) {
          if (data.product.price && typeof data.product.price === "number") {
            setBasePrice(data.product.price);
          }
          if (Array.isArray(data.product.variations) && data.product.variations.length > 0) {
            const vars: IVariation[] = data.product.variations;
            setDbVariations(vars);

            const initialMap: Record<string, string> = {};

            vars.forEach((vGroup) => {
              if (vGroup.values && vGroup.values.length > 0) {
                initialMap[vGroup.name] = vGroup.values[0].name;
              }
            });

            const specsParam = searchParams?.get("specs");
            if (specsParam) {
              try {
                const parsed = JSON.parse(specsParam);
                Object.entries(parsed).forEach(([k, v]) => {
                  if (typeof v === "string") {
                    initialMap[k] = v;
                  }
                });
              } catch {
                /* ignore */
              }
            }

            setSelectedVariations(initialMap);
          }
        }
      })
      .catch(() => { });
  }, [searchParams, categoryParam]);

  useEffect(() => {
    const qtyParam = searchParams?.get("quantity");
    const specsParam = searchParams?.get("specs");
    if (qtyParam || specsParam) {
      setCardData((prev) => {
        const updated = { ...prev };
        if (qtyParam) {
          const q = parseInt(qtyParam, 10);
          if (!isNaN(q) && q > 0) updated.quantity = q;
        }
        if (specsParam) {
          try {
            const parsed = JSON.parse(specsParam);
            if (parsed.Corners) updated.corners = parsed.Corners;
            if (parsed["Paper Stock"]) updated.thickness = parsed["Paper Stock"];
          } catch {
            /* ignore */
          }
        }
        return updated;
      });
    }
  }, [searchParams]);

  // Unlimited Draggable Text Layers State
  const [textLayers, setTextLayers] = useState<TextLayer[]>([
    { id: "1", text: "COMPANY NAME", x: 50, y: 44, fontSize: 20, color: "#ffffff", fontWeight: "bold", fontFamily: "QT Optimum", textAlign: "center" },
    { id: "2", text: "BUSINESS TYPE", x: 50, y: 55, fontSize: 13, color: "#cbd5e1", fontWeight: "normal", fontFamily: "Inter", textAlign: "center" },
    { id: "3", text: "WEB / OTHER", x: 50, y: 88, fontSize: 13, color: "#ffffff", fontWeight: "bold", fontFamily: "Inter", textAlign: "center" },
  ]);
  const [activeTextId, setActiveTextId] = useState<string | null>("1");
  const [backTextLayers, setBackTextLayers] = useState<TextLayer[]>(() =>
    backLayersFromDesign(undefined, {
      website: initialData?.website || "www.zyora.com",
      email: initialData?.email || "stephen@zyora.com",
      name: initialData?.name || "Stephen",
      showEmail: false,
    }) as TextLayer[]
  );
  const [extraSideTextLayers, setExtraSideTextLayers] = useState<TextLayer[][]>([]);
  const [extraLogoPoints, setExtraLogoPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [imageLayers, setImageLayers] = useState<ImageLayer[]>([]);
  const [backImageLayers, setBackImageLayers] = useState<ImageLayer[]>([]);
  const [extraSideImageLayers, setExtraSideImageLayers] = useState<ImageLayer[][]>([]);
  const [activeSideIndex, setActiveSideIndex] = useState(0);
  const imageLayerFileRef = useRef<HTMLInputElement | null>(null);
  const pendingImageLayerIdRef = useRef<string | null>(null);
  const pendingNewImageSideRef = useRef<number | null>(null);
  const [sheetFields, setSheetFields] = useState<SheetField[]>(() =>
    lockTemplateFields(
      [
        { id: "1", text: "Stephen" },
        { id: "2", text: "Manager" },
        { id: "3", text: "+1 (555) 123-4567" },
        { id: "4", text: "stephen@zyora.com" },
        { id: "5", text: "Poissy 15 rue de la Boëtie" },
      ],
      backLayersFromDesign(undefined, {
        website: initialData?.website || "www.zyora.com",
        email: initialData?.email || "stephen@zyora.com",
        name: initialData?.name || "Stephen",
        showEmail: false,
      })
    ).fields
  );
  const [requiredLayerIds, setRequiredLayerIds] = useState<string[]>(() =>
    lockTemplateFields(
      [
        { id: "1", text: "Stephen" },
        { id: "2", text: "Manager" },
        { id: "3", text: "+1 (555) 123-4567" },
        { id: "4", text: "stephen@zyora.com" },
        { id: "5", text: "Poissy 15 rue de la Boëtie" },
      ],
      backLayersFromDesign(undefined, {
        website: initialData?.website || "www.zyora.com",
        email: initialData?.email || "stephen@zyora.com",
        name: initialData?.name || "Stephen",
        showEmail: false,
      })
    ).requiredLayerIds
  );

  const [isDragOver, setIsDragOver] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const cardPreviewRef = useRef<HTMLDivElement | null>(null);
  const dragNodeRef = useRef<HTMLElement | null>(null);
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [alignmentLines, setAlignmentLines] = useState<{ type: "v" | "h"; pos: number }[]>([]);
  const [selectionGap, setSelectionGap] = useState<SelectionGap | null>(null);
  const gapOwnerRef = useRef<"text" | "logo">("text");
  const textClipboardRef = useRef<TextLayer | null>(null);
  const history = useEditorHistory<EditorSnap>();

  interface PrintCategory {
    _id: string;
    name: string;
    slug?: string;
    image?: string;
    description?: string;
    canvas_width: number;
    canvas_height: number;
    unit: string;
    orientation: string;
    bleed?: number;
    bleedUnit?: CanvasUnit;
    safe_area?: number;
    safeAreaUnit?: CanvasUnit;
    background_color?: string;
    printSizes?: PrintSize[];
    variations?: IVariation[];
    side_mode?: "single" | "double" | "multi";
    sides_count?: number;
    sides_names?: string[];
    supports_back_side?: boolean;
    guide_lines?: CanvasGuideLine[];
    canvas_type?: CanvasType;
    mockup_image?: string;
    print_area?: PrintArea;
    text_layers?: TextLayer[];
  }
  const [categories, setCategories] = useState<PrintCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PrintCategory | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [savedCanvasConfig, setSavedCanvasConfig] = useState<any>(null);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(designId || null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveToast, setSaveToast] = useState("");
  const [purchaseModalTemplate, setPurchaseModalTemplate] = useState<any>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [customWidth, setCustomWidth] = useState<number>(105);
  const [customHeight, setCustomHeight] = useState<number>(60);
  const [customUnit, setCustomUnit] = useState<CanvasUnit>("mm");
  const [customBleed, setCustomBleed] = useState<number>(3);
  const [customSafeArea, setCustomSafeArea] = useState<number>(3);

  const applyCategory = (cat: PrintCategory) => {
    setSelectedCategory(cat);
    setSavedCanvasConfig({
      width: cat.canvas_width || 105,
      height: cat.canvas_height || 60,
      unit: cat.unit || "mm",
      orientation: cat.orientation || "landscape",
      bleed: cat.bleed ?? 3,
      bleedUnit: cat.bleedUnit || cat.unit,
      safe_area: cat.safe_area ?? 3,
      safeAreaUnit: cat.safeAreaUnit || cat.unit,
      side_mode: cat.side_mode,
      sides_count: cat.sides_count,
      sides_names: cat.sides_names,
      supports_back_side: cat.supports_back_side,
      guide_lines: cleanGuideLines(cat.guide_lines),
      canvas_type: asCanvasType(cat.canvas_type, "flat"),
      mockup_image: cat.mockup_image || "",
      print_area: cleanPrintArea(cat.print_area),
    });
    if (asCanvasType(cat.canvas_type, "flat") === "mockup" && Array.isArray(cat.text_layers) && cat.text_layers.length) {
      setTextLayers(cat.text_layers);
    }
    setActiveSideIndex(0);
    if (cat.background_color) {
      setCardData((prev) => ({ ...prev, bgColor: cat.background_color || prev.bgColor }));
    }
  };

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        // Apparel (mockup) categories live under /clothing-bags — keep card/box flow separate
        const list: PrintCategory[] = (data.categories || []).filter(
          (cat: PrintCategory) => asCanvasType(cat.canvas_type, "flat") !== "mockup"
        );
        setCategories(list);
        if (!categoryParam) return;
        const found = list.find(
          (cat) => cat.name === categoryParam || cat.slug === categoryParam
        );
        if (found) {
          applyCategory(found);
          if (found.variations && found.variations.length > 0) {
            setDbVariations(found.variations);
            setSelectedVariations((prev) => {
              const next = { ...prev };
              found.variations!.forEach((group) => {
                if (!next[group.name] && group.values[0]?.name) next[group.name] = group.values[0].name;
              });
              return next;
            });
          }
          setStep((current) => (current === "category" ? "upload" : current));
        }
      })
      .catch(() => { });
  }, [categoryParam]);

  const activeCanvasConfig = savedCanvasConfig || selectedTemplate?.canvas_config || selectedTemplate?.canvasConfig || {
    width: 105,
    height: 60,
    unit: "mm",
    orientation: "landscape",
    bleed: 3,
    safe_area: 3,
  };

  useEffect(() => {
    if (!selectedCategory && selectedTemplate?.category && categories.length > 0) {
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === selectedTemplate.category.toLowerCase() || c.slug === selectedTemplate.category.toLowerCase()
      );
      if (matchedCat) setSelectedCategory(matchedCat);
    }
  }, [selectedTemplate, categories, selectedCategory]);

  const activeCategoryName = (selectedCategory?.name || selectedTemplate?.category || searchParams?.get("category") || "").toLowerCase();

  const standardSizesForCategory = useMemo((): PrintSize[] => {
    if (activeCategoryName.includes("banner")) {
      return [
        { name: "Small Banner (4' × 2')", width: 1200, height: 600, unit: "mm", bleed: 10, bleedUnit: "mm", safeArea: 25, safeAreaUnit: "mm" },
        { name: "Medium Banner (6' × 3')", width: 1800, height: 900, unit: "mm", bleed: 10, bleedUnit: "mm", safeArea: 35, safeAreaUnit: "mm" },
        { name: "Large Banner (8' × 4')", width: 2400, height: 1200, unit: "mm", bleed: 15, bleedUnit: "mm", safeArea: 50, safeAreaUnit: "mm" },
        { name: "Rollup Banner", width: 850, height: 2000, unit: "mm", bleed: 10, bleedUnit: "mm", safeArea: 30, safeAreaUnit: "mm" },
        { name: "Wide Rollup Banner", width: 1000, height: 2000, unit: "mm", bleed: 10, bleedUnit: "mm", safeArea: 30, safeAreaUnit: "mm" },
        { name: "Tabletop Banner", width: 600, height: 400, unit: "mm", bleed: 5, bleedUnit: "mm", safeArea: 15, safeAreaUnit: "mm" },
      ];
    }
    if (activeCategoryName.includes("poster")) {
      return [
        { name: "A3 Poster (11.7\" × 16.5\")", width: 297, height: 420, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 5, safeAreaUnit: "mm" },
        { name: "A2 Poster (16.5\" × 23.4\")", width: 420, height: 594, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 8, safeAreaUnit: "mm" },
        { name: "A1 Large Poster (23.4\" × 33.1\")", width: 594, height: 841, unit: "mm", bleed: 4, bleedUnit: "mm", safeArea: 10, safeAreaUnit: "mm" },
        { name: "18\" × 24\" Poster", width: 457, height: 610, unit: "mm", bleed: 4, bleedUnit: "mm", safeArea: 10, safeAreaUnit: "mm" },
        { name: "24\" × 36\" Poster", width: 610, height: 914, unit: "mm", bleed: 5, bleedUnit: "mm", safeArea: 15, safeAreaUnit: "mm" },
      ];
    }
    if (activeCategoryName.includes("flyer") || activeCategoryName.includes("leaflet") || activeCategoryName.includes("brochure")) {
      return [
        { name: "A4 Standard (8.3\" × 11.7\")", width: 210, height: 297, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 5, safeAreaUnit: "mm" },
        { name: "A5 Compact (5.8\" × 8.3\")", width: 148, height: 210, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 4, safeAreaUnit: "mm" },
        { name: "A6 Pocket (4.1\" × 5.8\")", width: 105, height: 148, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 4, safeAreaUnit: "mm" },
        { name: "DL Rack Card (3.9\" × 8.3\")", width: 99, height: 210, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 4, safeAreaUnit: "mm" },
        { name: "Square Flyer (5.8\" × 5.8\")", width: 148, height: 148, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 4, safeAreaUnit: "mm" },
      ];
    }
    if (activeCategoryName.includes("postcard") || activeCategoryName.includes("invitation")) {
      return [
        { name: "Standard (6\" × 4\")", width: 152, height: 102, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 4, safeAreaUnit: "mm" },
        { name: "Large (7\" × 5\")", width: 178, height: 127, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 5, safeAreaUnit: "mm" },
        { name: "Jumbo (9\" × 6\")", width: 229, height: 152, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 5, safeAreaUnit: "mm" },
        { name: "Square (5\" × 5\")", width: 127, height: 127, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 4, safeAreaUnit: "mm" },
      ];
    }
    return [
      { name: "Standard (3.5\" × 2.0\")", width: 89, height: 51, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 3, safeAreaUnit: "mm" },
      { name: "Classic Studio (105 × 60 mm)", width: 105, height: 60, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 3, safeAreaUnit: "mm" },
      { name: "European / Slim (85 × 55 mm)", width: 85, height: 55, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 3, safeAreaUnit: "mm" },
      { name: "Square Card (2.5\" × 2.5\")", width: 65, height: 65, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 3, safeAreaUnit: "mm" },
      { name: "Mini / Skinny (70 × 28 mm)", width: 70, height: 28, unit: "mm", bleed: 2, bleedUnit: "mm", safeArea: 2.5, safeAreaUnit: "mm" },
      { name: "Folded Card (3.5\" × 4.0\")", width: 89, height: 102, unit: "mm", bleed: 3, bleedUnit: "mm", safeArea: 4, safeAreaUnit: "mm" },
    ];
  }, [activeCategoryName]);

  const offeredSizes: PrintSize[] = useMemo(() => {
    const list: PrintSize[] = [];
    const seen = new Set<string>();

    const addSize = (s: PrintSize) => {
      if (!s || !s.width || !s.height) return;
      const key = `${Math.round(s.width)}x${Math.round(s.height)}_${s.unit || "mm"}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(s);
      }
    };

    if (selectedCategory?.printSizes && Array.isArray(selectedCategory.printSizes)) {
      selectedCategory.printSizes.forEach(addSize);
    }

    if (selectedCategory?.canvas_width && selectedCategory?.canvas_height) {
      addSize({
        name: `${selectedCategory.name || "Default"} Size`,
        width: selectedCategory.canvas_width,
        height: selectedCategory.canvas_height,
        unit: asCanvasUnit(selectedCategory.unit, "mm"),
        bleed: selectedCategory.bleed ?? 3,
        bleedUnit: selectedCategory.bleedUnit || asCanvasUnit(selectedCategory.unit, "mm"),
        safeArea: selectedCategory.safe_area ?? 3,
        safeAreaUnit: selectedCategory.safeAreaUnit || asCanvasUnit(selectedCategory.unit, "mm"),
      });
    }

    standardSizesForCategory.forEach(addSize);
    return list;
  }, [selectedCategory, standardSizesForCategory]);

  const currentSizeName = useMemo(() => {
    const w = Math.round(Number(activeCanvasConfig.width) || 105);
    const h = Math.round(Number(activeCanvasConfig.height) || 60);
    const match = offeredSizes.find(
      (s) => Math.round(s.width) === w && Math.round(s.height) === h
    );
    if (match) return match.name;
    return `${w} × ${h} ${activeCanvasConfig.unit || "mm"}`;
  }, [activeCanvasConfig, offeredSizes]);

  const currentSizeShortName = useMemo(() => {
    const raw = currentSizeName.replace(/\s*\([^)]*\)/g, "").trim();
    return raw || `${Math.round(Number(activeCanvasConfig.width) || 105)} × ${Math.round(Number(activeCanvasConfig.height) || 60)} ${activeCanvasConfig.unit || "mm"}`;
  }, [currentSizeName, activeCanvasConfig]);

  const handleSelectSize = (size: PrintSize) => {
    const newW = Number(size.width);
    const newH = Number(size.height);
    const newUnit = size.unit || "mm";
    const newBleed = size.bleed ?? (Number(activeCanvasConfig.bleed) || 3);
    const newSafeArea = size.safeArea ?? (Number(activeCanvasConfig.safe_area) || 3);

    setSavedCanvasConfig({
      ...activeCanvasConfig,
      width: newW,
      height: newH,
      unit: newUnit,
      bleed: newBleed,
      bleedUnit: size.bleedUnit || newUnit,
      safe_area: newSafeArea,
      safeAreaUnit: size.safeAreaUnit || newUnit,
      orientation: newW >= newH ? "landscape" : "portrait",
    });

    setCustomWidth(newW);
    setCustomHeight(newH);
    setCustomUnit(newUnit);
    setCustomBleed(newBleed);
    setCustomSafeArea(newSafeArea);

    const allVars = dbVariations.length > 0 ? dbVariations : selectedCategory?.variations || [];
    const sizeVar = allVars.find((v) => /size|dimension|format/i.test(v.name));
    if (sizeVar) {
      const match = sizeVar.values.find((val) =>
        val.name.toLowerCase().includes(size.name.toLowerCase()) ||
        size.name.toLowerCase().includes(val.name.toLowerCase()) ||
        val.name.includes(`${newW}`)
      );
      if (match) {
        setSelectedVariations((prev) => ({ ...prev, [sizeVar.name]: match.name }));
      }
    }
  };

  const handleSwapOrientation = () => {
    const curW = Number(activeCanvasConfig.width) || 105;
    const curH = Number(activeCanvasConfig.height) || 60;
    setSavedCanvasConfig({
      ...activeCanvasConfig,
      width: curH,
      height: curW,
      orientation: curH >= curW ? "landscape" : "portrait",
    });
    setCustomWidth(curH);
    setCustomHeight(curW);
  };

  const handleApplyCustomSize = () => {
    const w = Math.max(10, Number(customWidth) || 105);
    const h = Math.max(10, Number(customHeight) || 60);
    const u = customUnit || "mm";
    const b = Math.max(0, Number(customBleed) || 3);
    const sa = Math.max(0, Number(customSafeArea) || 3);

    setSavedCanvasConfig({
      ...activeCanvasConfig,
      width: w,
      height: h,
      unit: u,
      bleed: b,
      bleedUnit: u,
      safe_area: sa,
      safeAreaUnit: u,
      orientation: w >= h ? "landscape" : "portrait",
    });
    setIsSizeModalOpen(false);
  };

  const isMockupProduct =
    asCanvasType(
      (activeCanvasConfig as { canvas_type?: unknown }).canvas_type || selectedCategory?.canvas_type,
      "flat"
    ) === "mockup";
  const mockupImageSrc =
    String((activeCanvasConfig as { mockup_image?: string }).mockup_image || selectedCategory?.mockup_image || "").trim();
  const mockupPrintArea = cleanPrintArea(
    (activeCanvasConfig as { print_area?: unknown }).print_area || selectedCategory?.print_area
  );
  const patchCanvas = (patch: Record<string, unknown>) => {
    setSavedCanvasConfig({ ...activeCanvasConfig, ...patch });
  };
  const fitDims = calculateFitDimensions(activeCanvasConfig as any, 520, 420);
  const fitDimsSummary = calculateFitDimensions(activeCanvasConfig as any, 440, 340);

  const resolvedSides = useMemo(
    () => resolveTemplateSides(selectedTemplate, selectedCategory || null),
    [selectedTemplate, selectedCategory]
  );
  const sideLabels = resolvedSides.sidesNames;
  const sidesCount = resolvedSides.sidesCount;

  const layersForSide = (idx: number): TextLayer[] => {
    if (idx <= 0) return textLayers;
    if (idx === 1) return backTextLayers;
    return extraSideTextLayers[idx - 2] || [];
  };

  const imageLayersForSide = (idx: number): ImageLayer[] => {
    if (idx <= 0) return imageLayers;
    if (idx === 1) return backImageLayers;
    return extraSideImageLayers[idx - 2] || [];
  };

  const patchActiveLayers = (updater: (prev: TextLayer[]) => TextLayer[]) => {
    if (activeSideIndex <= 0) setTextLayers(updater);
    else if (activeSideIndex === 1) setBackTextLayers(updater);
    else {
      setExtraSideTextLayers((prev) => {
        const copy = prev.slice();
        const i = activeSideIndex - 2;
        while (copy.length <= i) copy.push([]);
        copy[i] = updater(copy[i] || []);
        return copy;
      });
    }
  };

  const patchActiveImageLayers = (updater: (prev: ImageLayer[]) => ImageLayer[]) => {
    if (activeSideIndex <= 0) setImageLayers(updater);
    else if (activeSideIndex === 1) setBackImageLayers(updater);
    else {
      setExtraSideImageLayers((prev) => {
        const copy = prev.slice();
        const i = activeSideIndex - 2;
        while (copy.length <= i) copy.push([]);
        copy[i] = updater(copy[i] || []);
        return copy;
      });
    }
  };

  const selectSide = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, Math.max(0, sidesCount - 1)));
    setActiveSideIndex(clamped);
    setCardData((prev) => ({ ...prev, side: clamped === 1 ? "back" : "front" }));
    setActiveTextId(layersForSide(clamped)[0]?.id || null);
  };

  useEffect(() => {
    if (activeSideIndex >= sidesCount) selectSide(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidesCount]);

  const editingBack = activeSideIndex === 1;
  const editingExtra = activeSideIndex >= 2;
  const logoPointForSide = (idx: number) => {
    if (idx <= 0) return { x: cardData.logoX, y: cardData.logoY };
    if (idx === 1) return { x: cardData.backLogoX, y: cardData.backLogoY };
    return extraLogoPoints[idx - 2] || { x: 70, y: 8 };
  };
  const setLogoPointForSide = (idx: number, x: number, y: number) => {
    if (idx <= 0) setCardData((prev) => ({ ...prev, logoX: x, logoY: y }));
    else if (idx === 1) setCardData((prev) => ({ ...prev, backLogoX: x, backLogoY: y }));
    else {
      setExtraLogoPoints((prev) => {
        const copy = prev.slice();
        const i = idx - 2;
        while (copy.length <= i) copy.push({ x: 70, y: 8 });
        copy[i] = { x, y };
        return copy;
      });
    }
  };
  const activeLogoX = logoPointForSide(activeSideIndex).x;
  const activeLogoY = logoPointForSide(activeSideIndex).y;
  const activeLayers = layersForSide(activeSideIndex);
  const activeImageLayers = imageLayersForSide(activeSideIndex);
  const activeLayer = activeLayers.find((layer) => layer.id === activeTextId);
  const activeImageLayer = activeImageLayers.find((layer) => layer.id === activeTextId);
  const activeBgMode = editingExtra
    ? "template"
    : editingBack
      ? cardData.backBgMode
      : cardData.bgMode;
  const activeBgColor = editingExtra
    ? resolvedSides.baseDesigns[activeSideIndex]?.bgColor || "#141414"
    : editingBack
      ? cardData.backBgColor
      : cardData.bgColor;
  const activeBgGradient = editingExtra
    ? resolvedSides.baseDesigns[activeSideIndex]?.bgGradient || ""
    : editingBack
      ? cardData.backBgGradient
      : cardData.bgGradient;
  const activeBgAngle = editingExtra
    ? resolvedSides.baseDesigns[activeSideIndex]?.bgGradientAngle ?? 135
    : editingBack
      ? cardData.backBgGradientAngle
      : cardData.bgGradientAngle;
  const activeBgImage = editingExtra
    ? resolvedSides.baseDesigns[activeSideIndex]?.bgImage || null
    : editingBack
      ? cardData.backUploadedImage
      : cardData.uploadedImage;
  const activeBaseDesign = resolvedSides.baseDesigns[activeSideIndex];
  const sideBackdrop = (side: "front" | "back") =>
    userCardBackdrop(side === "back" ? cardData.backBgMode : cardData.bgMode, {
      image: side === "back" ? cardData.backUploadedImage : cardData.uploadedImage,
      gradient: side === "back" ? cardData.backBgGradient : cardData.bgGradient,
      angle: side === "back" ? cardData.backBgGradientAngle : cardData.bgGradientAngle,
      opacity: cardData.imageOpacity,
    });
  const backDecor = withImageOverrides(
    (selectedTemplate?.back_design?.objects || []).filter(
      (obj: any) => obj && obj.type && obj.type !== "text" && !isArtworkImage(obj)
    ),
    imageOverrides
  );
  const currentBackDesign = {
    ...(selectedTemplate?.back_design || {}),
    bgColor: cardData.backBgColor,
    ...designBackdrop(cardData.backBgMode === "color" ? null : selectedTemplate?.back_design),
    ...sideBackdrop("back"),
    objects: [
      ...backDecor,
      ...backImageLayers.map(imageLayerToObject),
      ...backTextLayers.map((layer) => ({ ...layer, type: "text" })),
    ],
  };
  const frontObjects = withImageOverrides(
    (selectedTemplate?.front_design?.objects || []).filter((obj: any) => !isArtworkImage(obj)),
    imageOverrides
  );
  const hasTemplateLogo = imageLayers.length > 0 && imageLayers.some((l) => l.label === "Logo");
  const backHasArtwork = backImageLayers.length > 0;
  const extraDecor = editingExtra
    ? withImageOverrides(
      decorFromSideObjects(activeBaseDesign?.objects).filter((obj: any) => !isArtworkImage(obj)),
      imageOverrides
    )
    : [];

  // Computed live front design that combines non-text template shapes with live editable textLayers
  const currentFrontDesign = useMemo(() => {
    const shapeObjects = withImageOverrides(selectedTemplate?.front_design?.objects, imageOverrides).filter(
      (o: any) => o.type !== "text" && !isArtworkImage(o)
    );
    const dynamicTextObjects = textLayers.map((tl) => ({
      id: tl.id,
      type: "text",
      text: tl.text,
      x: tl.x,
      y: tl.y,
      fontSize: tl.fontSize,
      color: tl.color,
      fontWeight: tl.fontWeight,
      fontStyle: tl.fontStyle,
      fontFamily: tl.fontFamily,
      textAlign: tl.textAlign,
      letterSpacing: tl.letterSpacing,
      underline: tl.underline,
      opacity: tl.opacity,
      textTransform: tl.textTransform,
    }));
    return {
      bgColor: cardData.bgColor,
      ...designBackdrop(cardData.bgMode === "color" ? null : selectedTemplate?.front_design),
      ...sideBackdrop("front"),
      objects: [...shapeObjects, ...imageLayers.map(imageLayerToObject), ...dynamicTextObjects],
    };
  }, [selectedTemplate?.front_design, textLayers, imageLayers, cardData.bgColor, cardData.bgMode, cardData.bgGradient, cardData.bgGradientAngle, cardData.uploadedImage, cardData.imageOpacity, imageOverrides]);

  const extraSideLiveDesigns = useMemo(
    () =>
      resolvedSides.baseDesigns.slice(2).map((base, i) => {
        const imgs = (extraSideImageLayers[i] || []).map(imageLayerToObject);
        const shapes = decorFromSideObjects(base?.objects).filter((obj: any) => !isArtworkImage(obj));
        return mergeSideDesign(base, (extraSideTextLayers[i] || []) as any[], [...shapes, ...imgs]);
      }),
    [resolvedSides.baseDesigns, extraSideTextLayers, extraSideImageLayers]
  );
  const allSideDesigns = useMemo(() => {
    const list = [currentFrontDesign, currentBackDesign, ...extraSideLiveDesigns];
    while (list.length < sidesCount) list.push({ bgColor: "#141414", objects: [] });
    return list.slice(0, Math.max(1, sidesCount));
  }, [currentFrontDesign, currentBackDesign, extraSideLiveDesigns, sidesCount]);

  useEffect(() => {
    if (designId) {
      setCurrentDesignId(designId);
      fetch(`/api/designs/${designId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.design) {
            const d = data.design;
            if (d.designData) {
              if (d.designData.cardData) {
                setCardData((prev) => {
                  const next = { ...prev, ...d.designData.cardData };
                  if (typeof next.backLogoX !== "number") next.backLogoX = next.logoX;
                  if (typeof next.backLogoY !== "number") next.backLogoY = next.logoY;
                  if (!next.backLogoPosition) next.backLogoPosition = next.logoPosition;
                  return next;
                });
              }
              if (Array.isArray(d.designData.textLayers)) setTextLayers(d.designData.textLayers);
              if (Array.isArray(d.designData.backTextLayers) && d.designData.backTextLayers.length) {
                setBackTextLayers(d.designData.backTextLayers);
              }
              if (Array.isArray(d.designData.extraSideTextLayers)) {
                setExtraSideTextLayers(d.designData.extraSideTextLayers);
              }
              if (Array.isArray(d.designData.extraLogoPoints)) {
                setExtraLogoPoints(d.designData.extraLogoPoints);
              }
              if (Array.isArray(d.designData.imageLayers)) setImageLayers(d.designData.imageLayers);
              else if (d.designData.front_design?.objects) {
                setImageLayers(imageLayersFromObjects(d.designData.front_design.objects));
              }
              if (Array.isArray(d.designData.backImageLayers)) setBackImageLayers(d.designData.backImageLayers);
              else if (d.designData.back_design?.objects) {
                setBackImageLayers(imageLayersFromObjects(d.designData.back_design.objects));
              }
              if (Array.isArray(d.designData.extraSideImageLayers)) {
                setExtraSideImageLayers(d.designData.extraSideImageLayers);
              }
              if (typeof d.designData.activeSideIndex === "number") {
                setActiveSideIndex(d.designData.activeSideIndex);
              }
              if (Array.isArray(d.designData.sheetFields) && d.designData.sheetFields.length) {
                setSheetFields(d.designData.sheetFields);
                setRequiredLayerIds(
                  Array.isArray(d.designData.requiredLayerIds) && d.designData.requiredLayerIds.length
                    ? d.designData.requiredLayerIds
                    : d.designData.sheetFields.flatMap((field: SheetField) => field.layerIds)
                );
              } else if (Array.isArray(d.designData.textLayers)) {
                const locked = lockTemplateFields(
                  d.designData.textLayers,
                  Array.isArray(d.designData.backTextLayers) ? d.designData.backTextLayers : []
                );
                setSheetFields(locked.fields);
                setRequiredLayerIds(locked.requiredLayerIds);
              }
              if (d.designData.canvas_config) {
                setSavedCanvasConfig(d.designData.canvas_config);
              }
              if (Array.isArray(d.designData.employees)) setEmployees(d.designData.employees);
              setImageOverrides({
                ...(d.designData.imageOverrides || {}),
                ...imageOverridesFromDesign(d.designData.front_design, d.designData.back_design),
              });
            }
            if (d.templateId) {
              fetch(`/api/templates/${d.templateId}`)
                .then((r) => r.json())
                .then((tData) => {
                  if (tData.success && tData.template) {
                    setSelectedTemplate(tData.template);
                  }
                })
                .catch(() => { });
            } else if (d.designData?.canvas_config) {
              setSelectedTemplate({
                _id: d._id,
                title: d.name,
                category: d.designData.category || "Custom",
                canvas_config: d.designData.canvas_config,
                front_design: d.designData.front_design,
                back_design: d.designData.back_design,
              });
            }
            setStep("review");
          }
        })
        .catch(() => { });
    } else if (templateId) {
      fetch(`/api/templates/${templateId}`)
        .then((r) => r.json())
        .then(async (data) => {
          if (data.success && data.template) {
            const t = data.template;
            if (t.isPaid && (t.price || 0) > 0 && !data.isUnlocked) {
              if (!(await viewerIsSignedIn())) {
                router.push(registerHref(`/customize?templateId=${t._id}`, "paid"));
                return;
              }
              setPurchaseModalTemplate(t);
              setIsPurchaseModalOpen(true);
              return;
            }
            setSelectedTemplate(t);
            if (t.canvas_config || t.canvasConfig) {
              setSavedCanvasConfig(t.canvas_config || t.canvasConfig);
            }
            if (t.category && categories.length > 0) {
              const matchedCat = categories.find(
                (c) => c.name.toLowerCase() === t.category.toLowerCase() || c.slug === t.category.toLowerCase()
              );
              if (matchedCat) setSelectedCategory(matchedCat);
            }
            setImageOverrides({});
            const backLayers = backLayersFromDesign(t.back_design?.objects, {
              website: cardData.website,
              email: cardData.email,
              name: cardData.name,
              showEmail: false,
            }) as TextLayer[];
            setBackTextLayers(backLayers);
            const resolved = resolveTemplateSides(t, selectedCategory || null);
            setExtraSideTextLayers(
              resolved.baseDesigns.slice(2).map((design) => textLayersFromSideObjects(design?.objects) as TextLayer[])
            );
            setImageLayers(imageLayersFromObjects(t.front_design?.objects));
            setBackImageLayers(imageLayersFromObjects(t.back_design?.objects));
            setExtraSideImageLayers(
              resolved.baseDesigns.slice(2).map((design) => imageLayersFromObjects(design?.objects))
            );
            setActiveSideIndex(0);
            const extractedFront = textLayersFromSideObjects(t.front_design?.objects);
            const frontLayers: TextLayer[] =
              extractedFront.length > 0
                ? (extractedFront as TextLayer[])
                : Array.isArray(t.templateData?.textLayers) && t.templateData.textLayers.length > 0
                  ? (t.templateData.textLayers as TextLayer[])
                  : [
                    { id: "1", text: "COMPANY NAME", x: 50, y: 44, fontSize: 20, color: "#ffffff", fontWeight: "bold", fontFamily: "QT Optimum", textAlign: "center" },
                    { id: "2", text: "BUSINESS TYPE", x: 50, y: 55, fontSize: 13, color: "#cbd5e1", fontWeight: "normal", fontFamily: "Inter", textAlign: "center" },
                    { id: "3", text: "WEB / OTHER", x: 50, y: 88, fontSize: 13, color: "#ffffff", fontWeight: "bold", fontFamily: "Inter", textAlign: "center" },
                  ];
            setTextLayers(frontLayers);
            setActiveTextId(frontLayers[0]?.id || null);

            const locked = lockTemplateFields(frontLayers, backLayers);
            setSheetFields(locked.fields);
            setRequiredLayerIds(locked.requiredLayerIds);

            const bg = t.front_design?.bgColor || t.templateData?.bgColor || cardData.bgColor;
            const bgGrad = t.front_design?.bgGradient || t.templateData?.bgGradient || "";
            const bgImg = t.front_design?.bgImage || null;

            setCardData((prev) => ({
              ...prev,
              bgColor: bg,
              bgGradient: bgGrad,
              uploadedImage: bgImg,
              bgMode: bgImg ? "image" : bgGrad ? "gradient" : "color",
              textColor: t.templateData?.textColor || prev.textColor,
              logoPosition: t.templateData?.logoPosition || prev.logoPosition,
              logoX: logoPoint(t.templateData?.logoPosition || prev.logoPosition).x,
              logoY: logoPoint(t.templateData?.logoPosition || prev.logoPosition).y,
              backLogoPosition: t.templateData?.logoPosition || prev.backLogoPosition,
              backLogoX: logoPoint(t.templateData?.logoPosition || prev.logoPosition).x,
              backLogoY: logoPoint(t.templateData?.logoPosition || prev.logoPosition).y,
              logoText: "",
              logoSize: t.templateData?.logoSize || prev.logoSize,
            }));
            setStep("review");
          }
        })
        .catch(() => { });
    }
  }, [templateId, designId]);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setSaveToast("");
    try {
      let thumbnail: string | undefined = cardData.uploadedImage || cardData.logoImage || selectedTemplate?.thumbnail || undefined;
      try {
        const canvas = await renderCardToCanvas(buildCardScene("front"), 600);
        thumbnail = canvas.toDataURL("image/jpeg", 0.85);
      } catch (err) {
        console.warn("Failed to generate draft thumbnail canvas:", err);
      }

      const payload = {
        name: cardData.name ? `${cardData.name}'s Custom Card` : selectedTemplate?.title ? `${selectedTemplate.title} Draft` : "My Business Card Design",
        thumbnail,
        designData: {
          cardData,
          textLayers,
          backTextLayers,
          employees,
          sheetFields,
          requiredLayerIds,
          canvas_config: activeCanvasConfig,
          category: selectedCategory?.name || selectedTemplate?.category || "Business Cards",
          front_design: currentFrontDesign,
          back_design: currentBackDesign,
          side_designs: allSideDesigns,
          extraSideTextLayers,
          extraLogoPoints,
          imageLayers,
          backImageLayers,
          extraSideImageLayers,
          activeSideIndex,
          imageOverrides,
        },
        templateId: templateId || undefined,
      };
      let res;
      if (currentDesignId) {
        res = await fetch(`/api/designs/${currentDesignId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (data.success && data.design) {
        setCurrentDesignId(data.design._id);
        setSaveToast(data.guest ? "Saved. Register and this design will be in your drafts." : "Saved to dashboard!");
        setTimeout(() => setSaveToast(""), 3000);
      }
    } catch (err) {
      console.error("Save draft error:", err);
    } finally {
      setSavingDraft(false);
    }
  };

  const [addingToCart, setAddingToCart] = useState(false);
  const [employees, setEmployees] = useState<EmployeeCard[]>([]);

  const useEmployeeOnCard = (employee: EmployeeCard) => {
    setCardData((prev) => ({ ...prev, ...employeeCardFields(employee) }));
    setTextLayers((prev) => applyEmployeeToLayers(prev, employee, sheetFields));
    setBackTextLayers((prev) => applyEmployeeToLayers(prev, employee, sheetFields));
  };

  const buildCardScene = (side: "front" | "back"): CardScene => ({
    side,
    bgColor: side === "back" ? cardData.backBgColor : cardData.bgColor,
    ...designBackdrop((side === "back" ? cardData.backBgMode : cardData.bgMode) === "color" ? null : side === "back" ? selectedTemplate?.back_design : selectedTemplate?.front_design),
    ...sideBackdrop(side),
    textColor: cardData.textColor,
    layout: CUSTOMIZE_LAYOUT,
    previewWidth: fitDims.renderWidth,
    previewHeight: fitDims.renderHeight,
    cornerRadius: cornerRadiusForFinish(cardData.corners, 16),
    textLayers: side === "front" ? textLayers : backTextLayers,
    objects: side === "front"
      ? withImageOverrides(selectedTemplate?.front_design?.objects, imageOverrides)
      : backDecor,
    logoText: "",
    logoImage: (side === "back" ? backHasArtwork : hasTemplateLogo) ? null : cardData.logoImage || LOGO_PLACEHOLDER,
    logoPosition: side === "back" ? cardData.backLogoPosition : cardData.logoPosition,
    logoX: side === "back" ? cardData.backLogoX : cardData.logoX,
    logoY: side === "back" ? cardData.backLogoY : cardData.logoY,
    logoSize: cardData.logoSize,
    uploadedImage: null,
    imageOpacity: cardData.imageOpacity,
    rotation: cardData.rotation,
    fitMode: cardData.fitMode,
    safeInset: fitDims.safeAreaPx,
    website: cardData.website,
    email: cardData.email,
    name: cardData.name,
  });

  const baseUnitPricePerCard = basePrice;
  let variationExtraPerCard = 0;
  const shownVariations = dbVariations.length > 0 ? dbVariations : selectedCategory?.variations || [];
  shownVariations.forEach((vGroup) => {
    const selectedName = selectedVariations[vGroup.name];
    if (selectedName) {
      const foundVal = vGroup.values?.find((v) => v.name === selectedName);
      if (foundVal && typeof foundVal.price === "number") {
        variationExtraPerCard += foundVal.price;
      }
    }
  });
  const unitPricePerCard = baseUnitPricePerCard + variationExtraPerCard;
  const calculatedTotalPrice = unitPricePerCard * (cardData.quantity || 1);

  const handleAddToCartAndProceed = async () => {
    setAddingToCart(true);
    if (!(await viewerIsSignedIn())) {
      try {
        await handleSaveDraft();
      } finally {
        setAddingToCart(false);
      }
      router.push(registerHref("/dashboard", "draft"));
      return;
    }
    try {
      await handleSaveDraft();

      const productId = searchParams?.get("productId");
      const templateId = searchParams?.get("templateId");

      const name = cardData.name ? `${cardData.name}'s Custom Business Cards` : "Custom Business Cards";
      let thumbnail = cardData.uploadedImage || cardData.logoImage || "";
      let backThumbnail = "";
      try {
        const front = await renderCardToCanvas(buildCardScene("front"), 900);
        thumbnail = front.toDataURL("image/jpeg", 0.86);
        const back = await renderCardToCanvas(buildCardScene("back"), 900);
        backThumbnail = back.toDataURL("image/jpeg", 0.86);
      } catch {
        /* keep the uploaded artwork if the proof render fails */
      }
      const quantity = Math.max(1, cardData.quantity || 1);
      const price = unitPricePerCard;

      const specsParam = searchParams?.get("specs");
      let passedSpecs: Record<string, string> = {};
      if (specsParam) {
        try {
          passedSpecs = JSON.parse(specsParam);
        } catch {
          /* ignore */
        }
      }

      await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(productId && { productId }),
          ...(templateId && { templateId }),
          name,
          thumbnail,
          backThumbnail,
          price,
          quantity,
          specs: {
            ...selectedVariations,
            ...passedSpecs,
            thickness: cardData.thickness,
            texture: cardData.texture,
            corners: cardData.corners,
            cardholder: cardData.name,
            title: cardData.title,
            phone: cardData.phone,
            email: cardData.email,
            ...(employees.length
              ? { employees: `${employees.length} people`, employeeData: JSON.stringify(employees) }
              : {}),
          },
        }),
      });
    } catch (err) {
      console.error("Failed to add custom card to cart:", err);
    } finally {
      setAddingToCart(false);
    }

    router.push("/cart");
  };

  // Accordion state in Preferences

  // Preset Color Palettes
  const bgColors = [
    { label: "Matte Dark", value: "#1a1a1a" },
    { label: "Pure White", value: "#ffffff" },
    { label: "Navy Blue", value: "#0f172a" },
    { label: "Royal Blue", value: "#1e3a8a" },
    { label: "Emerald Green", value: "#064e3b" },
    { label: "Crimson Red", value: "#881337" },
    { label: "Golden Amber", value: "#78350f" },
  ];

  const textColors = [
    { label: "White", value: "#ffffff" },
    { label: "Dark Charcoal", value: "#18181b" },
    { label: "Gold", value: "#f59e0b" },
    { label: "Sky Blue", value: "#38bdf8" },
    { label: "Emerald", value: "#10b981" },
    { label: "Rose", value: "#f43f5e" },
    { label: "Purple", value: "#8b5cf6" },
  ];

  const takeSnap = (): EditorSnap => ({
    textLayers: textLayers.map((layer) => ({ ...layer })),
    backTextLayers: backTextLayers.map((layer) => ({ ...layer })),
    logoX: cardData.logoX,
    logoY: cardData.logoY,
    backLogoX: cardData.backLogoX,
    backLogoY: cardData.backLogoY,
    extraLogoPoints: extraLogoPoints.map((p) => ({ ...p })),
    activeTextId,
    gapOwner: gapOwnerRef.current,
  });

  const refreshGap = (owner: "text" | "logo", textId: string | null) => {
    requestAnimationFrame(() => {
      const card = cardPreviewRef.current;
      if (!card) return;
      const id = owner === "logo" ? "logo" : textId;
      const el = id ? card.querySelector<HTMLElement>(`[data-snap-id="${CSS.escape(id)}"]`) : null;
      setSelectionGap(el ? selectionGapFromElement(card, el) : null);
    });
  };

  const applySnap = (snap: EditorSnap) => {
    setTextLayers(snap.textLayers);
    setBackTextLayers(snap.backTextLayers);
    setCardData((prev) => ({
      ...prev,
      logoX: snap.logoX,
      logoY: snap.logoY,
      backLogoX: snap.backLogoX,
      backLogoY: snap.backLogoY,
    }));
    setExtraLogoPoints(snap.extraLogoPoints || []);
    setActiveTextId(snap.activeTextId);
    gapOwnerRef.current = snap.gapOwner;
    refreshGap(snap.gapOwner, snap.activeTextId);
  };

  const pasteText = (source: TextLayer) => {
    const copy: TextLayer = {
      ...source,
      id: `${Date.now()}`,
      x: clampPercent(source.x + 4),
      y: clampPercent(source.y + 4),
    };
    gapOwnerRef.current = "text";
    setActiveTextId(copy.id);
    patchActiveLayers((prev) => [...prev, copy]);
    refreshGap("text", copy.id);
  };

  // ── Drag & Drop Handlers for Text Layers ────────────────
  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    history.push(takeSnap());
    e.stopPropagation();
    setActiveTextId(id);
    setDraggingTextId(id);
    dragNodeRef.current = e.currentTarget as HTMLElement;
    gapOwnerRef.current = "text";
    if (cardPreviewRef.current) setSelectionGap(selectionGapFromElement(cardPreviewRef.current, e.currentTarget as HTMLElement));
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) { }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingTextId || !cardPreviewRef.current) return;
    const rect = cardPreviewRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;

    const snapLayers = layersForSide(activeSideIndex);
    const layer = snapLayers.find((item) => item.id === draggingTextId);
    const node = dragNodeRef.current;
    const layoutW = cardPreviewRef.current.offsetWidth || rect.width;
    const layoutH = cardPreviewRef.current.offsetHeight || rect.height;
    const width = node && layoutW ? (node.offsetWidth / layoutW) * 100 : 0;
    const height = node && layoutH ? (node.offsetHeight / layoutH) * 100 : 0;
    const guides = snapTargetsFromCard(cardPreviewRef.current, draggingTextId);
    const snapped = snapDragBox({
      x,
      y,
      width,
      height,
      anchorX: layer?.textAlign || "left",
      targetsX: guides.targetsX,
      targetsY: guides.targetsY,
    });
    x = snapped.x;
    y = snapped.y;
    setAlignmentLines(snapped.lines);
    gapOwnerRef.current = "text";
    setSelectionGap(selectionGapForAnchor(x, y, width, height, layer?.textAlign || "left", layoutW, layoutH));

    const moveLayer = (prev: TextLayer[]) =>
      prev.map((layer) => (layer.id === draggingTextId ? { ...layer, x, y } : layer));
    patchActiveLayers(moveLayer);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingTextId) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) { }
      setDraggingTextId(null);
      dragNodeRef.current = null;
      setAlignmentLines([]);
    }
  };

  const shownLogo = cardData.logoImage || LOGO_PLACEHOLDER;

  useEffect(() => {
    if (viewMode !== "2d") {
      setSelectionGap(null);
      return;
    }
    if (gapOwnerRef.current === "logo") return;
    const card = cardPreviewRef.current;
    const el = activeTextId && card ? card.querySelector<HTMLElement>(`[data-snap-id="${CSS.escape(activeTextId)}"]`) : null;
    if (!card || !el) return;
    setSelectionGap(selectionGapFromElement(card, el));
  }, [viewMode, activeTextId, cardData.side, textLayers, backTextLayers]);

  const startLogoDrag = (event: React.PointerEvent) => {
    history.push(takeSnap());
    gapOwnerRef.current = "logo";
    event.preventDefault();
    event.stopPropagation();
    const sideIdx = activeSideIndex;
    const drag = {
      startX: event.clientX,
      startY: event.clientY,
      x: activeLogoX,
      y: activeLogoY,
      sideIdx,
      size: cardData.logoSize,
    };
    const move = (ev: PointerEvent) => {
      const bounds = cardPreviewRef.current?.getBoundingClientRect();
      if (!bounds || bounds.width === 0 || bounds.height === 0) return;
      const dx = ((ev.clientX - drag.startX) / bounds.width) * 100;
      const dy = ((ev.clientY - drag.startY) / bounds.height) * 100;
      const layoutW = cardPreviewRef.current?.offsetWidth || bounds.width;
      const layoutH = cardPreviewRef.current?.offsetHeight || bounds.height;
      const widthPct = (drag.size / layoutW) * 100;
      const heightPct = (drag.size / layoutH) * 100;
      const guides = cardPreviewRef.current ? snapTargetsFromCard(cardPreviewRef.current, "logo") : { targetsX: [0, 50, 100], targetsY: [0, 50, 100] };
      const snapped = snapDragBox({
        x: drag.x + dx,
        y: drag.y + dy,
        width: widthPct,
        height: heightPct,
        targetsX: guides.targetsX,
        targetsY: guides.targetsY,
      });
      setAlignmentLines(snapped.lines);
      setSelectionGap(selectionGapFromPercents(snapped.x, snapped.y, widthPct, heightPct, layoutW, layoutH));
      setLogoPointForSide(drag.sideIdx, snapped.x, snapped.y);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setAlignmentLines([]);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Add, Edit & Delete Text Layers
  const addTextLayer = () => {
    const newId = Date.now().toString();
    const newLayer: TextLayer = {
      id: newId,
      text: "Add Text",
      x: 30,
      y: 40,
      fontSize: 16,
      color: "#ffffff",
      fontWeight: "normal",
    };
    patchActiveLayers((prev) => [...prev, newLayer]);
    setActiveTextId(newId);
  };

  const addImageLayer = () => {
    pendingNewImageSideRef.current = activeSideIndex;
    pendingImageLayerIdRef.current = null;
    imageLayerFileRef.current?.click();
  };

  const replaceActiveImageLayer = () => {
    if (!activeImageLayer) return;
    pendingNewImageSideRef.current = null;
    pendingImageLayerIdRef.current = activeImageLayer.id;
    imageLayerFileRef.current?.click();
  };

  const handleImageLayerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Create once; FileReader preview + S3 URL both update the same layer (avoids doubles).
    let layerId = pendingImageLayerIdRef.current;
    if (!layerId) {
      const layer = createImageLayer({
        src: DEFAULT_IMAGE_LAYER_SRC,
        label: file.name.toLowerCase().includes("logo") ? "Logo" : "Image",
        x: 12 + Math.random() * 20,
        y: 12 + Math.random() * 20,
      });
      layerId = layer.id;
      pendingImageLayerIdRef.current = layerId;
      patchActiveImageLayers((prev) => [...prev, layer]);
      setActiveTextId(layerId);
    }

    const targetId = layerId;
    const applySrc = (src: string) => {
      const apply = (prev: ImageLayer[]) =>
        prev.map((layer) => (layer.id === targetId ? { ...layer, src } : layer));
      if (activeSideIndex <= 0) setImageLayers(apply);
      else if (activeSideIndex === 1) setBackImageLayers(apply);
      else patchActiveImageLayers(apply);
      setActiveTextId(targetId);
    };

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") applySrc(ev.target.result);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.url) applySrc(data.url);
    } catch (err) {
      console.error("Image layer upload failed:", err);
    } finally {
      pendingImageLayerIdRef.current = null;
      pendingNewImageSideRef.current = null;
    }
  };

  const updateTextLayer = (id: string, updates: Partial<TextLayer>) => {
    const apply = (prev: TextLayer[]) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer));
    patchActiveLayers(apply);
    if (typeof updates.text === "string" && id === "back-website") {
      setCardData((prev) => ({ ...prev, website: updates.text as string }));
    }
  };

  const updateImageLayer = (id: string, updates: Partial<ImageLayer>) => {
    patchActiveImageLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer))
    );
  };

  const deleteTextLayer = (id: string) => {
    if (requiredLayerIds.includes(id)) return;
    patchActiveLayers((prev) => prev.filter((layer) => layer.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  const deleteImageLayer = (id: string) => {
    patchActiveImageLayers((prev) => prev.filter((layer) => layer.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  const startImageLayerDrag = (layerId: string, event: React.PointerEvent) => {
    const layer = imageLayersForSide(activeSideIndex).find((item) => item.id === layerId);
    if (!layer) return;
    history.push(takeSnap());
    gapOwnerRef.current = "logo";
    setActiveTextId(layerId);
    event.preventDefault();
    event.stopPropagation();
    const sideIdx = activeSideIndex;
    const drag = {
      id: layerId,
      startX: event.clientX,
      startY: event.clientY,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      sideIdx,
    };
    const move = (ev: PointerEvent) => {
      const bounds = cardPreviewRef.current?.getBoundingClientRect();
      if (!bounds || bounds.width === 0 || bounds.height === 0) return;
      const dx = ((ev.clientX - drag.startX) / bounds.width) * 100;
      const dy = ((ev.clientY - drag.startY) / bounds.height) * 100;
      const guides = cardPreviewRef.current
        ? snapTargetsFromCard(cardPreviewRef.current, drag.id)
        : { targetsX: [0, 50, 100], targetsY: [0, 50, 100] };
      const snapped = snapDragBox({
        x: drag.x + dx,
        y: drag.y + dy,
        width: drag.width,
        height: drag.height,
        targetsX: guides.targetsX,
        targetsY: guides.targetsY,
      });
      setAlignmentLines(snapped.lines);
      setSelectionGap(
        selectionGapFromPercents(
          snapped.x,
          snapped.y,
          drag.width,
          drag.height,
          cardPreviewRef.current?.offsetWidth || bounds.width,
          cardPreviewRef.current?.offsetHeight || bounds.height
        )
      );
      const apply = (prev: ImageLayer[]) =>
        prev.map((item) =>
          item.id === drag.id ? { ...item, x: snapped.x, y: snapped.y } : item
        );
      if (drag.sideIdx <= 0) setImageLayers(apply);
      else if (drag.sideIdx === 1) setBackImageLayers(apply);
      else {
        setExtraSideImageLayers((prev) => {
          const copy = prev.slice();
          const i = drag.sideIdx - 2;
          while (copy.length <= i) copy.push([]);
          copy[i] = apply(copy[i] || []);
          return copy;
        });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setAlignmentLines([]);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // ── Upload Handlers ─────────────────────────────────────
  const processFile = async (file: File) => {
    const side = cardData.side;
    const apply = (url: string) => {
      setCardData((prev) => {
        if (side === "back") {
          return {
            ...prev,
            fileName: file.name,
            backUploadedImage: url,
            backBgMode: prev.backBgMode === "image-gradient" ? "image-gradient" : "image",
          };
        }
        return {
          ...prev,
          fileName: file.name,
          uploadedImage: url,
          bgMode: prev.bgMode === "image-gradient" ? "image-gradient" : "image",
        };
      });
    };
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") apply(e.target.result);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.url) apply(data.url);
    } catch (err) {
      console.error("S3 upload failed:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleLogoImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const activeArtwork =
      logoEditIdRef.current ||
      (editingExtra
        ? extraDecor.find((obj: any) => isArtworkImage(obj))?.id
        : editingBack
          ? backDecor.find((obj: any) => isArtworkImage(obj))?.id
          : (selectedTemplate?.front_design?.objects || []).find((obj: any) => isArtworkImage(obj))?.id);
    const targetId = activeArtwork;

    const apply = (src: string) => {
      if (targetId) setImageOverrides((prev) => ({ ...prev, [targetId]: src }));
      else setCardData((prev) => ({ ...prev, logoImage: src }));
    };

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) apply(ev.target.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.url) apply(data.url);
    } catch (err) {
      console.error("S3 logo upload failed:", err);
    } finally {
      logoEditIdRef.current = null;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRotate = () => {
    setCardData((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  };

  const handleDelete = () => {
    setCardData((prev) => ({ ...prev, uploadedImage: null, fileName: "", rotation: 0 }));
  };

  const handleTemplateDownload = (format: string) => {
    setDownloadingTemplate(format);
    const blob = new Blob([`Printgraphy Template guide for ${format}`], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Business-Card-Template.${format.toLowerCase().includes("illustrator") ? "ai" : format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadingTemplate(null), 2000);
  };

  const [downloadingProof, setDownloadingProof] = useState(false);

  const handleDownloadProof = async (which: "current" | "both") => {
    setDownloadingProof(true);
    try {
      const exportWidth = printExportWidth(fitDims.renderWidth, activeCanvasConfig);
      const sides: Array<"front" | "back"> = which === "both" ? ["front", "back"] : [cardData.side];
      const safeName = (cardData.name || "Custom").replace(/\s+/g, "_");
      for (const side of sides) {
        const canvas = await renderCardToCanvas(buildCardScene(side), exportWidth);
        downloadCanvasPng(canvas, `Business-Card-${safeName}-${side === "front" ? "Front" : "Back"}.png`);
      }
    } finally {
      setDownloadingProof(false);
    }
  };

  // Corner Class helper
  const getCornerClass = () => {
    if (cardData.corners.includes("Rounded")) return "rounded-2xl";
    if (cardData.corners.includes("Clipped")) return "rounded-none border-t-8 border-b-8 border-sky-400";
    return "rounded-sm";
  };

  const cardBackdrop = {
    backgroundColor: activeBgColor,
    backgroundImage:
      editingExtra && activeBaseDesign?.bgGradient
        ? `linear-gradient(${activeBgAngle}deg, ${activeBgColor}, ${activeBaseDesign.bgGradient})`
        : activeBgMode === "gradient" || activeBgMode === "image-gradient"
          ? `linear-gradient(${activeBgAngle}deg, ${activeBgColor}, ${activeBgGradient})`
          : activeBgMode === "template" && activeBaseDesign?.bgGradient
            ? `linear-gradient(${activeBaseDesign.bgGradientAngle ?? 135}deg, ${activeBaseDesign.bgColor || activeBgColor}, ${activeBaseDesign.bgGradient})`
            : undefined,
  };
  const hasSizeChoices = offeredSizes.length > 1 && (selectedCategory?.printSizes || []).length > 0;
  const uploadFit = calculateFitDimensions(activeCanvasConfig as any, hasSizeChoices ? 580 : 700, hasSizeChoices ? 380 : 460);
  const sideW = Number(activeCanvasConfig.width) || 1;
  const sideH = Number(activeCanvasConfig.height) || 1;
  let guideW = 240 * (sideW / sideH);
  let guideH = 240;
  if (guideW > 280) {
    guideW = 280;
    guideH = 280 * (sideH / sideW);
  }
  const needsCategory = categories.length > 0 && !selectedCategory && !selectedTemplate && !templateId && !designId;

  use2dShortcuts(viewMode === "2d" && step === "review", {
    undo: () => {
      const prev = history.undo(takeSnap());
      if (prev) applySnap(prev);
    },
    redo: () => {
      const next = history.redo(takeSnap());
      if (next) applySnap(next);
    },
    copy: () => {
      if (gapOwnerRef.current === "logo") return;
      const layers = layersForSide(activeSideIndex);
      const layer = layers.find((item) => item.id === activeTextId);
      if (layer) textClipboardRef.current = { ...layer };
    },
    paste: () => {
      const source = textClipboardRef.current;
      if (!source) return;
      history.push(takeSnap());
      pasteText(source);
    },
    duplicate: () => {
      if (gapOwnerRef.current === "logo") return;
      const layers = layersForSide(activeSideIndex);
      const layer = layers.find((item) => item.id === activeTextId);
      if (!layer) return;
      history.push(takeSnap());
      pasteText(layer);
    },
    nudge: (dx, dy) => {
      if (gapOwnerRef.current === "logo") {
        history.push(takeSnap());
        const card = cardPreviewRef.current;
        if (activeImageLayer) {
          const widthPct = activeImageLayer.width;
          const heightPct = activeImageLayer.height;
          const x = clampPercent(activeImageLayer.x + dx, 0, 100 - widthPct);
          const y = clampPercent(activeImageLayer.y + dy, 0, 100 - heightPct);
          updateImageLayer(activeImageLayer.id, { x, y });
          if (card) setSelectionGap(selectionGapFromPercents(x, y, widthPct, heightPct, card.offsetWidth, card.offsetHeight));
          return;
        }
        const widthPct = card ? (cardData.logoSize / (card.offsetWidth || 1)) * 100 : 10;
        const heightPct = card ? (cardData.logoSize / (card.offsetHeight || 1)) * 100 : 10;
        const x = clampPercent(activeLogoX + dx, 0, 100 - widthPct);
        const y = clampPercent(activeLogoY + dy, 0, 100 - heightPct);
        setLogoPointForSide(activeSideIndex, x, y);
        if (card) setSelectionGap(selectionGapFromPercents(x, y, widthPct, heightPct, card.offsetWidth, card.offsetHeight));
        return;
      }
      const layers = layersForSide(activeSideIndex);
      const layer = layers.find((item) => item.id === activeTextId);
      if (!layer) return;
      history.push(takeSnap());
      const x = clampPercent(layer.x + dx);
      const y = clampPercent(layer.y + dy);
      const move = (prev: TextLayer[]) => prev.map((item) => (item.id === layer.id ? { ...item, x, y } : item));
      patchActiveLayers(move);
      const card = cardPreviewRef.current;
      const node = card?.querySelector<HTMLElement>(`[data-snap-id="${CSS.escape(layer.id)}"]`);
      if (card && node) {
        const widthPct = (node.offsetWidth / (card.offsetWidth || 1)) * 100;
        const heightPct = (node.offsetHeight / (card.offsetHeight || 1)) * 100;
        setSelectionGap(selectionGapForAnchor(x, y, widthPct, heightPct, layer.textAlign || "left", card.offsetWidth, card.offsetHeight));
      }
    },
    remove: () => {
      if (gapOwnerRef.current === "logo" || !activeTextId || requiredLayerIds.includes(activeTextId)) return;
      history.push(takeSnap());
      deleteTextLayer(activeTextId);
      setSelectionGap(null);
    },
  });

  return (
    <div className="min-h-screen bg-[#f4f7fb] font-sans text-zinc-900 flex flex-col justify-between">

      {/* ─────────────────────────────────────────────────────────────
          BREADCRUMB ROW (Only on non-review steps)
      ───────────────────────────────────────────────────────────── */}
      {step !== "review" && (
        <div className="bg-white border-b border-[#e2e8f0] sticky top-0 z-30 shadow-xs">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 xl:px-8 py-2.5 flex items-center justify-between gap-3">

            {/* Left: Back Button & Step Indicators */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (step === "cart") setStep("preferences");
                  else if (step === "preferences") setStep("review");
                  else router.push("/business-cards");
                }}
                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 flex items-center gap-1.5 font-semibold text-sm transition-colors cursor-pointer shrink-0"
                title="Go Back"
                aria-label="Go Back"
              >
                <svg className="w-4 h-4 text-zinc-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Back</span>
              </button>

              {/* Steps: Desktop/Tablet "1 Design > 2 Options > 3 Review" */}
              <nav className="hidden md:flex items-center gap-2 pl-3 border-l border-[#e2e8f0] text-sm font-semibold select-none">
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="transition-colors cursor-pointer flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900"
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-zinc-100 text-zinc-600">1</span>
                  <span>Design</span>
                </button>

                <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>

                <button
                  type="button"
                  onClick={() => setStep("preferences")}
                  className={`transition-colors cursor-pointer flex items-center gap-1.5 ${step === "preferences" ? "text-[#0b6fb3] font-bold" : "text-zinc-500 hover:text-zinc-800"
                    }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === "preferences" ? "bg-[#0b6fb3] text-white" : "bg-zinc-100 text-zinc-600"
                    }`}>2</span>
                  <span>Options</span>
                </button>

                <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>

                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className={`transition-colors cursor-pointer flex items-center gap-1.5 ${step === "cart" ? "text-[#0b6fb3] font-bold" : "text-zinc-500 hover:text-zinc-800"
                    }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === "cart" ? "bg-[#0b6fb3] text-white" : "bg-zinc-100 text-zinc-600"
                    }`}>3</span>
                  <span>Review</span>
                </button>
              </nav>

              {/* Mobile (under 768px): Collapses to "Step 1 of 3" with thin progress bar */}
              <div className="md:hidden flex flex-col justify-center pl-2 border-l border-[#e2e8f0]">
                <span className="text-xs font-bold text-zinc-800">
                  Step {step === "preferences" ? "2" : "3"} of 3
                </span>
                <div className="w-24 h-1 bg-zinc-200 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-[#0b6fb3] rounded-full transition-all duration-300"
                    style={{ width: step === "preferences" ? "66.6%" : "100%" }}
                  />
                </div>
              </div>
            </div>

            {/* Right: "Draft saved" badge and Save Draft Button */}
            <div className="flex items-center gap-2.5">
              {/* Draft Saved Badge */}
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 bg-[#f4f7fb] border border-[#e2e8f0] px-2.5 py-1.5 rounded-full shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span className="font-semibold text-zinc-700">Draft saved</span>
              </div>

              {/* Save Draft Button: Text+Icon on Desktop/Tablet, Icon-only on Mobile */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="min-h-[44px] min-w-[44px] px-3.5 py-2 border border-[#e2e8f0] hover:border-zinc-300 text-zinc-700 hover:text-zinc-900 text-xs sm:text-sm font-semibold rounded-xl bg-white transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs"
                title="Save Draft"
              >
                <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="hidden sm:inline">{savingDraft ? "Saving..." : "Save Draft"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {step === "category" && (
        <div className="container mx-auto px-4 sm:px-6 py-8 flex-1">
          <div className="max-w-2xl mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900">Choose a Product Size &amp; Canvas</h1>
            <p className="text-base text-zinc-500 mt-1.5">
              Select standard print dimensions or custom format to initiate your interactive design canvas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => {
                  applyCategory(cat);
                  setStep("upload");
                }}
                className="group text-left bg-white border border-zinc-200/90 hover:border-[#2196D2] hover:shadow-xl rounded-2xl overflow-hidden shadow-xs cursor-pointer transition-all duration-200 flex flex-col justify-between"
              >
                <div className="aspect-[4/3] bg-zinc-100 relative overflow-hidden">
                  {cat.image ? (
                    <img src={mediaSrc(cat.image) || cat.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: cat.background_color || "#1a1a1a" }}>
                      <span className="text-xs font-bold uppercase tracking-wider text-white/50">{cat.name}</span>
                    </div>
                  )}
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/90 text-zinc-800 backdrop-blur-sm shadow-xs">
                    {cat.canvas_width} × {cat.canvas_height} {cat.unit || "mm"}
                  </span>
                </div>
                <div className="p-4 bg-white flex items-center justify-between">
                  <div>
                    <p className="text-base font-extrabold text-zinc-900 group-hover:text-[#2196D2] transition-colors">{cat.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Customizable 2D/3D</p>
                  </div>
                  <span className="w-8 h-8 rounded-xl bg-zinc-100 group-hover:bg-[#2196D2] group-hover:text-white text-zinc-500 flex items-center justify-center text-sm font-bold transition-colors">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="mt-8 p-8 rounded-3xl bg-white border border-zinc-200 text-center max-w-lg mx-auto shadow-sm">
              <h3 className="text-lg font-bold text-zinc-800">Standard Business Card Canvas</h3>
              <p className="text-sm text-zinc-500 mt-1 mb-5">105 × 60 mm with 3 mm bleed and safety margins</p>
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="px-6 py-2.5 bg-[#2196D2] hover:bg-[#1B85BD] text-white text-sm font-bold rounded-xl cursor-pointer shadow-sm transition-all"
              >
                Continue to Studio →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 0: UPLOAD & SPECIFICATIONS STUDIO SCREEN
      ───────────────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 animate-in fade-in duration-200">

          {/* Top Action Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2196D2]" />
              <span className="text-sm sm:text-base font-extrabold text-zinc-900">Artwork &amp; Canvas Setup</span>
              <span className="text-xs text-zinc-400 font-mono hidden md:inline">
                ({activeCanvasConfig.width} × {activeCanvasConfig.height} {activeCanvasConfig.unit})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Delete / Clear */}
              {cardData.uploadedImage && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Remove artwork"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Remove</span>
                </button>
              )}

              {/* Rotate 90° */}
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:border-[#2196D2] hover:text-[#2196D2] text-zinc-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer bg-white"
                title="Rotate 90 degrees"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Rotate 90°</span>
              </button>

              {/* Fit To Bleed */}
              <button
                type="button"
                onClick={() => setCardData((prev) => ({ ...prev, fitMode: "bleed" }))}
                className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${cardData.fitMode === "bleed"
                    ? "bg-sky-50 border-[#2196D2] text-[#2196D2]"
                    : "border-zinc-200 text-zinc-700 hover:border-zinc-300 bg-white"
                  }`}
                title="Fit artwork to bleed area"
              >
                <span>Fit Bleed</span>
              </button>

              {/* Fit To Safe Area */}
              <button
                type="button"
                onClick={() => setCardData((prev) => ({ ...prev, fitMode: "safe" }))}
                className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${cardData.fitMode === "safe"
                    ? "bg-sky-50 border-[#2196D2] text-[#2196D2]"
                    : "border-zinc-200 text-zinc-700 hover:border-zinc-300 bg-white"
                  }`}
                title="Fit artwork within safe zone"
              >
                <span>Fit Safe Area</span>
              </button>

              {/* Direct Next Button */}
              <button
                type="button"
                onClick={() => {
                  if (needsCategory) {
                    setStep("category");
                    return;
                  }
                  setStep("review");
                }}
                className="px-4 py-1.5 bg-[#2196D2] hover:bg-[#1B85BD] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span>Design Studio</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Main 2-Column Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left: Interactive Canvas / Dropzone (8 cols) */}
            <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200/80 shadow-xs flex flex-col items-center">

              <div className="w-full flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-zinc-900">Upload Artwork or Start Blank</h2>
                  <p className="text-sm text-zinc-500 mt-0.5">Drag and drop your print-ready file, or jump right into our 2D/3D customizer.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (needsCategory) setStep("category");
                    else setStep("review");
                  }}
                  className="text-sm font-bold text-[#2196D2] hover:underline cursor-pointer hidden sm:inline-block"
                >
                  Start blank from scratch →
                </button>
              </div>

              {!cardData.uploadedImage ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className="w-full flex flex-col items-center py-4"
                >
                  <ScaledCardStage width={uploadFit.renderWidth} height={uploadFit.renderHeight}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      style={{
                        width: `${uploadFit.renderWidth}px`,
                        height: `${uploadFit.renderHeight}px`,
                        ...cardBackdrop,
                      }}
                      className={`relative overflow-hidden rounded-2xl border-2 border-dashed shadow-xl flex flex-col items-center justify-center text-center px-6 cursor-pointer transition-all ${isDragOver ? "border-[#2196D2] bg-sky-50/20 scale-[1.01]" : "border-zinc-300 hover:border-[#2196D2]"
                        }`}
                    >
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center mb-3 shadow-md border border-white/30">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-base font-extrabold text-white mb-1">Drop artwork here, or browse files</p>
                        <p className="text-xs text-white/80 font-mono">
                          Canvas: {activeCanvasConfig.width} × {activeCanvasConfig.height} {activeCanvasConfig.unit} • PDF, PNG, SVG, JPG
                        </p>
                      </div>
                    </div>
                  </ScaledCardStage>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Browse Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (needsCategory) setStep("category");
                        else setStep("review");
                      }}
                      className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-sm font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Skip Upload &amp; Design Blank →
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.svg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="w-full flex flex-col items-center py-4">
                  <ScaledCardStage width={uploadFit.renderWidth} height={uploadFit.renderHeight}>
                    <div
                      style={{
                        width: `${uploadFit.renderWidth}px`,
                        height: `${uploadFit.renderHeight}px`,
                        ...cardBackdrop,
                      }}
                      className="relative overflow-hidden rounded-2xl shadow-xl border border-zinc-700"
                    >
                      <img
                        src={cardData.uploadedImage}
                        alt="Uploaded artwork"
                        style={{ transform: `rotate(${cardData.rotation}deg)` }}
                        className={`absolute inset-0 w-full h-full ${cardData.fitMode === "bleed" ? "object-cover" : "object-contain"
                          }`}
                      />
                    </div>
                  </ScaledCardStage>

                  <div className="mt-4 flex items-center justify-between w-full max-w-md bg-zinc-50 px-4 py-2.5 rounded-xl border border-zinc-200">
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <svg className="w-4 h-4 text-[#2196D2] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-bold text-zinc-700 truncate">{cardData.fileName || "Uploaded Artwork"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-bold text-[#2196D2] hover:underline cursor-pointer shrink-0"
                    >
                      Change
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.svg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setStep("review")}
                      className="px-8 py-3 bg-[#2196D2] hover:bg-[#1B85BD] text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <span>Proceed to Design Studio</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {hasSizeChoices && (
                <div className="mt-6 pt-4 border-t border-zinc-100 w-full">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Available Dimensions for this product</p>
                  <div className="flex flex-wrap gap-2">
                    {offeredSizes.map((size) => {
                      const selected =
                        Number(activeCanvasConfig.width) === size.width &&
                        Number(activeCanvasConfig.height) === size.height &&
                        activeCanvasConfig.unit === size.unit;
                      return (
                        <button
                          key={`${size.name}-${size.width}-${size.height}`}
                          type="button"
                          onClick={() =>
                            patchCanvas({
                              width: size.width,
                              height: size.height,
                              unit: size.unit,
                              orientation: size.height > size.width ? "portrait" : "landscape",
                              bleed: size.bleed,
                              bleedUnit: size.bleedUnit,
                              safe_area: size.safeArea,
                              safeAreaUnit: size.safeAreaUnit,
                            })
                          }
                          className={`px-3 py-2 rounded-xl border text-left cursor-pointer transition-all ${selected
                              ? "border-[#2196D2] bg-sky-50 shadow-2xs text-[#2196D2]"
                              : "border-zinc-200 bg-white hover:border-zinc-300 text-zinc-700"
                            }`}
                        >
                          <span className="block text-xs font-extrabold">{size.name}</span>
                          <span className="block text-[11px] font-mono text-zinc-500">
                            {size.width} × {size.height} {size.unit}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Technical Specifications & Guidelines Card (4 cols) */}
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-5">
              <div>
                <h3 className="text-lg font-black text-zinc-900">Print Specifications</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Ensure your design adheres to standard trim and safety margins.</p>
              </div>

              {/* Live Guide Visualizer */}
              <div
                className="relative mx-auto border-2 border-red-500/90 rounded-2xl p-2.5 shadow-md overflow-hidden bg-zinc-950"
                style={{ width: `${Math.round(guideW)}px`, height: `${Math.round(guideH)}px` }}
              >
                <div className="absolute top-1.5 left-2 z-10">
                  <span className="bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                    Bleed ({activeCanvasConfig.bleed ?? 0} {activeCanvasConfig.bleedUnit || activeCanvasConfig.unit})
                  </span>
                </div>

                <div className="w-full h-full border-2 border-sky-400 rounded-xl p-2.5 flex items-center justify-center relative bg-black/40">
                  <div className="absolute top-1.5 right-2 z-10">
                    <span className="bg-sky-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                      Trim ({activeCanvasConfig.width} × {activeCanvasConfig.height} {activeCanvasConfig.unit})
                    </span>
                  </div>

                  <div className="w-full h-full border-2 border-dashed border-emerald-400 rounded-lg flex items-center justify-center relative bg-emerald-500/10">
                    <span className="text-[9px] font-black text-emerald-300 tracking-wider bg-black/80 px-2 py-0.5 rounded uppercase shadow-xs">
                      Safe ({activeCanvasConfig.safe_area ?? 0} {activeCanvasConfig.safeAreaUnit || activeCanvasConfig.unit})
                    </span>
                  </div>
                </div>
              </div>

              {/* Dimension Metrics */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/60 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-zinc-200/60">
                  <span className="font-bold text-zinc-600">Canvas Dimensions</span>
                  <span className="font-mono font-extrabold text-zinc-900">{activeCanvasConfig.width} × {activeCanvasConfig.height} {activeCanvasConfig.unit}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-200/60">
                  <span className="font-bold text-zinc-600">Bleed Margin</span>
                  <span className="font-mono font-extrabold text-red-600">+{activeCanvasConfig.bleed ?? 0} {activeCanvasConfig.bleedUnit || activeCanvasConfig.unit}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="font-bold text-zinc-600">Safety Margin</span>
                  <span className="font-mono font-extrabold text-emerald-600">{activeCanvasConfig.safe_area ?? 0} {activeCanvasConfig.safeAreaUnit || activeCanvasConfig.unit}</span>
                </div>
              </div>

              {/* Formats & Quality */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Accepted Formats</p>
                <div className="flex flex-wrap gap-1.5">
                  {[".PDF", ".PNG", ".SVG", ".JPG", ".AI", ".WEBP"].map((fmt) => (
                    <span key={fmt} className="px-2 py-1 rounded-lg bg-zinc-100 border border-zinc-200/80 text-xs font-mono font-bold text-zinc-700">
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (needsCategory) setStep("category");
                    else setStep("review");
                  }}
                  className="w-full py-3 bg-[#2196D2] hover:bg-[#1B85BD] text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Continue to Studio</span>
                  <span>→</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 1: DESIGN STUDIO (MATCHES USER SCREENSHOT EXACTLY)
      ───────────────────────────────────────────────────────────── */}
      {step === "review" && (
        <div className="w-full flex-1 flex flex-col bg-[#eef0f4] min-h-screen">
          {/* Top Navbar */}
          <header className="w-full bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between select-none shrink-0 z-30">
            {/* Left: printgraphi logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                  <path d="M6 10 C6 8, 8 6, 10 6 L20 6 L12 24 L6 18 Z" fill="#1d90cf" />
                  <path d="M12 24 L20 6 L30 16 L20 34 Z" fill="#0b6fb3" />
                  <path d="M20 34 L30 16 L34 22 C35 24, 34 28, 30 32 Z" fill="#00a6f4" />
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight text-zinc-900 font-sans">
                print<span className="text-zinc-800 font-medium">graphi</span>
              </span>
            </Link>

            {/* Right: Preview button & Next button */}
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setViewMode((prev) => (prev === "3d" ? "2d" : "3d"))}
                className="flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setStep("preferences")}
                className="px-8 py-2 rounded-full bg-[#1d90cf] hover:bg-[#187eb7] text-white text-sm font-semibold shadow-xs transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </header>

          {/* Secondary Formatting Toolbar */}
          <div className="w-full bg-white border-b border-zinc-200 px-3 sm:px-6 py-2 flex items-center justify-between gap-3 text-sm select-none shrink-0 z-20 overflow-x-auto no-scrollbar">
            {/* Left: Text Formatting Controls + Size Selection */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 whitespace-nowrap">
              {/* Font Dropdown */}
              <div className="flex items-center gap-1 cursor-pointer relative group">
                <span className="font-serif font-bold text-sm text-zinc-800">T</span>
                <select
                  value={activeLayer?.fontFamily || "QT Optimum"}
                  onChange={(e) => {
                    if (activeTextId) updateTextLayer(activeTextId, { fontFamily: e.target.value });
                  }}
                  className="bg-transparent text-xs sm:text-sm font-medium text-zinc-800 cursor-pointer outline-none pr-3.5 appearance-none max-w-[95px] sm:max-w-[130px] truncate"
                >
                  <option value="QT Optimum">QT Optimum</option>
                  <option value="Cinzel">Cinzel</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Oswald">Oswald</option>
                  <option value="Georgia">Georgia</option>
                </select>
                <svg className="w-3.5 h-3.5 text-zinc-500 pointer-events-none -ml-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Divider */}
              <div className="h-4 w-[1px] bg-zinc-300 mx-0.5 sm:mx-1 shrink-0" />

              {/* Font Size: - 12 + */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTextId && activeLayer) {
                      updateTextLayer(activeTextId, { fontSize: Math.max(8, activeLayer.fontSize - 1) });
                    }
                  }}
                  className="w-5 h-5 flex items-center justify-center text-zinc-700 hover:text-black font-bold text-base cursor-pointer"
                  title="Decrease font size"
                >
                  −
                </button>
                <span className="text-xs font-semibold text-zinc-800 min-w-[18px] text-center">
                  {activeLayer?.fontSize || 12}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (activeTextId && activeLayer) {
                      updateTextLayer(activeTextId, { fontSize: Math.min(72, activeLayer.fontSize + 1) });
                    }
                  }}
                  className="w-5 h-5 flex items-center justify-center text-zinc-700 hover:text-black font-bold text-base cursor-pointer"
                  title="Increase font size"
                >
                  +
                </button>
              </div>

              {/* Divider */}
              <div className="h-4 w-[1px] bg-zinc-300 mx-0.5 sm:mx-1 shrink-0" />

              {/* Color Circle Picker */}
              <div className="relative flex items-center shrink-0">
                <label
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-cyan-400 p-0.5 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                  style={{
                    borderColor: activeLayer?.color || "#00d084",
                    boxShadow: "0 0 0 1px #e2e8f0"
                  }}
                  title="Text Color"
                >
                  <span className="text-[11px] sm:text-xs font-bold font-serif text-zinc-800">T</span>
                  <input
                    type="color"
                    value={activeLayer?.color || "#ffffff"}
                    onChange={(e) => {
                      if (activeTextId) updateTextLayer(activeTextId, { color: e.target.value });
                    }}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Bold (B) */}
              <button
                type="button"
                onClick={() => {
                  if (activeTextId && activeLayer) {
                    updateTextLayer(activeTextId, {
                      fontWeight: activeLayer.fontWeight === "bold" ? "normal" : "bold",
                    });
                  }
                }}
                className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center font-bold text-xs sm:text-sm cursor-pointer rounded transition-colors shrink-0 ${
                  activeLayer?.fontWeight === "bold" ? "bg-zinc-200 text-zinc-900" : "text-zinc-700 hover:bg-zinc-100"
                }`}
                title="Bold"
              >
                B
              </button>

              {/* Italic (/) */}
              <button
                type="button"
                onClick={() => {
                  if (activeTextId && activeLayer) {
                    updateTextLayer(activeTextId, {
                      fontStyle: activeLayer.fontStyle === "italic" ? "normal" : "italic",
                    });
                  }
                }}
                className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center italic text-xs sm:text-sm cursor-pointer rounded transition-colors shrink-0 ${
                  activeLayer?.fontStyle === "italic" ? "bg-zinc-200 text-zinc-900" : "text-zinc-700 hover:bg-zinc-100"
                }`}
                title="Italic"
              >
                /
              </button>

              {/* Underline (U) */}
              <button
                type="button"
                onClick={() => {
                  if (activeTextId && activeLayer) {
                    updateTextLayer(activeTextId, {
                      underline: !activeLayer.underline,
                    });
                  }
                }}
                className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center underline text-xs sm:text-sm cursor-pointer rounded transition-colors shrink-0 ${
                  activeLayer?.underline ? "bg-zinc-200 text-zinc-900" : "text-zinc-700 hover:bg-zinc-100"
                }`}
                title="Underline"
              >
                U
              </button>

              {/* Divider */}
              <div className="h-4 w-[1px] bg-zinc-300 mx-0.5 sm:mx-1 shrink-0" />

              {/* Size Selector in Secondary Toolbar */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSizeModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:border-[#1d90cf] text-zinc-700 transition-colors shadow-2xs cursor-pointer group whitespace-nowrap shrink-0"
                  title="Select product size and dimensions"
                >
                  <svg className="w-3.5 h-3.5 text-[#1d90cf] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider hidden sm:inline">Size:</span>
                  <span className="text-xs font-bold text-zinc-800 group-hover:text-[#1d90cf] whitespace-nowrap">
                    {currentSizeShortName}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono hidden xl:inline whitespace-nowrap">
                    ({activeCanvasConfig.width} × {activeCanvasConfig.height} {activeCanvasConfig.unit || "mm"})
                  </span>
                  <svg className="w-3 h-3 text-zinc-400 group-hover:text-[#1d90cf] ml-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Quick Orientation Swap (Landscape / Portrait) */}
                <button
                  type="button"
                  onClick={handleSwapOrientation}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:text-[#1d90cf] hover:bg-sky-50 transition-colors cursor-pointer shrink-0"
                  title={`Swap orientation (${activeCanvasConfig.width >= activeCanvasConfig.height ? "Landscape to Portrait" : "Portrait to Landscape"})`}
                >
                  <svg className="w-3.5 h-3.5 rotate-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Center: Instruction badge (Shown on 2xl, subtle tip on xl) */}
            <div className="hidden 2xl:flex items-center px-3.5 py-1 rounded-md border border-zinc-200 bg-white shadow-2xs text-[11px] text-zinc-600 font-medium whitespace-nowrap shrink-0 mx-2">
              Your background should reach this line - it prevents white lines along the edges.
            </div>
            <div
              className="hidden xl:flex 2xl:hidden items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-200 bg-zinc-50 text-[11px] text-zinc-600 font-medium whitespace-nowrap shrink-0"
              title="Your background should reach this line - it prevents white lines along the edges."
            >
              <span className="text-[#1d90cf]">💡</span>
              <span>Bleed line prevents white edges</span>
            </div>

            {/* Right: Arrange & Duplicate */}
            <div className="flex items-center gap-3 sm:gap-5 shrink-0 whitespace-nowrap">
              <button
                type="button"
                onClick={() => {
                  if (activeTextId) {
                    patchActiveLayers((prev) => {
                      const idx = prev.findIndex((l) => l.id === activeTextId);
                      if (idx < 0) return prev;
                      const item = prev[idx];
                      const rest = prev.filter((_, i) => i !== idx);
                      return [...rest, item];
                    });
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 cursor-pointer"
              >
                <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
                </svg>
                <span className="hidden sm:inline">Arrange</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeLayer) pasteText(activeLayer);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 cursor-pointer"
              >
                <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
                <span className="hidden sm:inline">Duplicate</span>
              </button>
            </div>
          </div>

          {/* Main Studio Workspace Canvas */}
          <div className="flex-1 relative flex items-center justify-between p-4 sm:p-8 overflow-hidden min-h-[calc(100vh-115px)]">
            {/* Left Floating Dock & "Type Your Text" Card */}
            <div className="flex items-start gap-3 z-20">
              {/* Slim Vertical Tool Dock */}
              <div className="bg-white rounded-xl shadow-md p-1.5 flex flex-col items-center gap-1.5 border border-zinc-200/80">
                {/* 0. Size / Dimensions Icon */}
                <button
                  type="button"
                  onClick={() => setIsSizeModalOpen(true)}
                  className="w-9 h-9 rounded-lg text-zinc-600 hover:bg-sky-50 hover:text-[#1d90cf] flex items-center justify-center transition-colors cursor-pointer"
                  title="Select Size & Dimensions"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                </button>

                {/* 1. 3D Cube Icon */}
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "3d" ? "2d" : "3d")}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    viewMode === "3d" ? "bg-[#1d90cf] text-white" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                  title="3D View"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                </button>

                {/* 2. Pencil / Edit Icon with small blue right pointer arrow */}
                <div className="relative">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-lg bg-[#1d90cf] text-white flex items-center justify-center shadow-xs cursor-pointer"
                    title="Edit Text"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  {/* Right pointer arrow */}
                  <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-l-[6px] border-l-[#1d90cf]" />
                </div>

                {/* 3. Shapes / Elements Icon */}
                <button
                  type="button"
                  onClick={() => addTextLayer()}
                  className="w-9 h-9 rounded-lg text-zinc-600 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="Add Shape / Element"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.199l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </button>

                {/* 4. Image / Upload Icon */}
                <button
                  type="button"
                  onClick={() => addImageLayer()}
                  className="w-9 h-9 rounded-lg text-zinc-600 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="Add / Upload Image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </button>

                {/* 5. T Text Icon */}
                <button
                  type="button"
                  onClick={() => addTextLayer()}
                  className="w-9 h-9 rounded-lg text-zinc-600 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="Add Text Layer"
                >
                  <span className="font-serif font-bold text-base text-zinc-700">T</span>
                </button>
              </div>

              {/* "Type Your Text" Floating Card */}
              <div className="bg-white rounded-2xl shadow-md p-6 w-[260px] sm:w-[280px] border border-zinc-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-zinc-900">Type Your Text</h3>
                    <button
                      type="button"
                      onClick={() => addTextLayer()}
                      className="text-xs font-semibold text-[#1d90cf] hover:text-[#187eb7] transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="flex flex-col gap-3.5 max-h-[280px] overflow-y-auto pr-1">
                    {activeLayers.map((layer, index) => (
                      <div key={layer.id} className="relative group/line">
                        <input
                          type="text"
                          value={layer.text}
                          onFocus={() => setActiveTextId(layer.id)}
                          onChange={(e) => updateTextLayer(layer.id, { text: e.target.value })}
                          placeholder={`Line ${index + 1}`}
                          className={`w-full border-b pb-1 text-sm bg-transparent outline-none transition-colors ${
                            activeTextId === layer.id ? "border-[#1d90cf] text-zinc-900 font-semibold" : "border-zinc-300 text-zinc-700"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next button inside card */}
                <button
                  type="button"
                  onClick={() => setStep("preferences")}
                  className="w-full mt-8 py-2.5 rounded-full bg-[#1d90cf] hover:bg-[#187eb7] text-white text-sm font-semibold shadow-xs transition-all cursor-pointer text-center"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Center: Dynamic Responsive Canvas Stage (Banners, Business Cards, Posters, etc.) */}
            {(() => {
              const cWidth = Number(activeCanvasConfig.width) || 105;
              const cHeight = Number(activeCanvasConfig.height) || 60;
              const cRatio = cWidth / cHeight;
              const maxBoxW = 620;
              const maxBoxH = 360;
              let stageW = maxBoxW;
              let stageH = maxBoxW / cRatio;
              if (stageH > maxBoxH) {
                stageH = maxBoxH;
                stageW = maxBoxH * cRatio;
              }
              stageW = Math.round(stageW);
              stageH = Math.round(stageH);
              const safeInset = Math.max(10, Math.min(22, Math.round(stageH * 0.055)));

              return (
                <div className="relative flex-1 flex flex-col items-center justify-center px-4">
                  {/* Callout Badges & Size Indicator */}
                  <div style={{ width: `${stageW}px` }} className="max-w-full relative flex items-center justify-between mb-1.5 px-0.5">
                    {/* Left: Size Selector Pill */}
                    <button
                      type="button"
                      onClick={() => setIsSizeModalOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/95 border border-zinc-200 text-[11px] font-semibold text-zinc-700 hover:border-[#1d90cf] hover:text-[#1d90cf] hover:shadow-xs transition-all shadow-2xs cursor-pointer group"
                      title="Change product dimensions"
                    >
                      <svg className="w-3 h-3 text-[#1d90cf]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                      <span className="font-bold text-zinc-800 group-hover:text-[#1d90cf]">{currentSizeName}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">({activeCanvasConfig.width} × {activeCanvasConfig.height} {activeCanvasConfig.unit || "mm"})</span>
                      <span className="text-[10px] text-[#1d90cf] font-bold ml-0.5">Change ▾</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Bleed Area Badge */}
                      <div className="flex flex-col items-center relative">
                        <span className="bg-[#5c68d4] text-white text-[10px] font-semibold px-2 py-0.5 rounded-xs shadow-2xs">
                          Bleed Area
                        </span>
                        <div className="w-[1px] h-3 bg-[#5c68d4]" />
                      </div>

                      {/* Safe Area Badge */}
                      <div className="flex flex-col items-center relative">
                        <span className="bg-[#00b050] text-white text-[10px] font-semibold px-2 py-0.5 rounded-xs shadow-2xs">
                          Safe Area
                        </span>
                        <div className="w-[1px] h-3 bg-[#00b050]" />
                      </div>
                    </div>
                  </div>

                  {/* The Live Interactive Canvas Stage */}
                  {viewMode === "3d" ? (
                    <div style={{ width: `${stageW}px`, height: `${stageH}px` }} className="max-w-full rounded-lg overflow-hidden shadow-2xl">
                      <ThreeDCardPreview
                        frontDesign={currentFrontDesign}
                        backDesign={currentBackDesign}
                        sideDesigns={allSideDesigns}
                        thickness={cardData.thickness}
                        corners={cardData.corners}
                        sideIndex={activeSideIndex}
                      />
                    </div>
                  ) : (
                    <div
                      ref={cardPreviewRef}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      style={{
                        width: `${stageW}px`,
                        height: `${stageH}px`,
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "center center",
                        transition: "transform 0.1s ease-out",
                        backgroundColor: activeBgColor || (selectedTemplate ? "#ffffff" : "#0c0d12"),
                        ...(activeBgImage ? { backgroundImage: `url(${activeBgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
                        ...(activeBgGradient ? { backgroundImage: activeBgGradient } : {}),
                      }}
                      className="max-w-full rounded-xs shadow-2xl relative overflow-hidden select-none cursor-default border border-zinc-900"
                    >
                      {/* Glossy diagonal sheen reflection */}
                      <div
                        className="absolute inset-0 pointer-events-none z-10"
                        style={{
                          background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.03) 45%, transparent 65%)",
                        }}
                      />

                      {/* Safe Area Green Dashed Border dynamically inset */}
                      <div
                        style={{ inset: `${safeInset}px` }}
                        className="absolute border-2 border-dashed border-[#00d084] pointer-events-none z-20 rounded-xs"
                      />

                  {/* Render Template Shapes & Decor Objects if a template is active */}
                  {selectedTemplate && (
                    <div className="absolute inset-0 pointer-events-none z-12">
                      <CardDesignObjects
                        objects={activeSideIndex === 1 ? backDecor : frontObjects}
                        layout={CUSTOMIZE_LAYOUT}
                      />
                    </div>
                  )}

                  {/* If NO template is selected, render default stylish template branding */}
                  {!selectedTemplate && !cardData.uploadedImage && activeSideIndex === 0 && (
                    <>
                      {/* Geometric Emblem Logo centered near top */}
                      <div className="absolute top-[14%] left-1/2 -translate-x-1/2 flex items-center justify-center z-15 pointer-events-none">
                        <div className="flex items-center gap-1">
                          {/* Left white peaked shape */}
                          <div
                            className="w-7 h-11 bg-white"
                            style={{
                              clipPath: "polygon(100% 0, 0 45%, 0 100%, 100% 100%)",
                            }}
                          />
                          {/* Right cyan peaked shape */}
                          <div
                            className="w-7 h-11 bg-[#00a6f4]"
                            style={{
                              clipPath: "polygon(0 0, 100% 45%, 100% 100%, 0 100%)",
                            }}
                          />
                        </div>
                      </div>

                      {/* Center Horizontal Divider Line under Company Name */}
                      <div className="absolute top-[52%] left-1/2 -translate-x-1/2 w-[65%] h-[1.5px] bg-white pointer-events-none z-15" />

                      {/* Vibrant Cyan-Blue Bottom Banner */}
                      <div className="absolute bottom-0 left-0 right-0 h-[22%] bg-[#00a6f4] z-10" />
                    </>
                  )}

                  {/* Front Side Dynamic Text Layers */}
                  {activeSideIndex === 0 && (
                    <>
                      {textLayers.map((layer) => {
                        const isSelected = activeTextId === layer.id;
                        const isCentered = layer.textAlign === "center" || (!selectedTemplate && (layer.id === "1" || layer.id === "2" || layer.id === "3"));
                        const isRightAligned = layer.textAlign === "right";
                        return (
                          <div
                            key={layer.id}
                            data-snap-id={layer.id}
                            onPointerDown={(e) => handlePointerDown(layer.id, e)}
                            onClick={() => setActiveTextId(layer.id)}
                            style={{
                              position: "absolute",
                              left: `${layer.x}%`,
                              top: `${layer.y}%`,
                              transform: isCentered ? "translateX(-50%)" : isRightAligned ? "translateX(-100%)" : "none",
                              fontSize: `${layer.fontSize}px`,
                              color: layer.color || "#ffffff",
                              fontWeight: layer.fontWeight || "normal",
                              fontStyle: layer.fontStyle || "normal",
                              fontFamily: layer.fontFamily || "Inter",
                              textDecoration: layer.underline ? "underline" : "none",
                              cursor: "move",
                              zIndex: isSelected ? 30 : 25,
                            }}
                            className={`px-2 py-0.5 whitespace-nowrap transition-shadow ${
                              isSelected ? "border border-[#00a6f4] ring-1 ring-[#00a6f4]/40" : "border border-transparent"
                            }`}
                          >
                            {layer.text}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Back Side Dynamic Text Layers */}
                  {activeSideIndex === 1 && (
                    <div className="absolute inset-0 p-6 z-15">
                      {backTextLayers.map((layer) => {
                        const isSelected = activeTextId === layer.id;
                        const isCentered = layer.textAlign === "center";
                        const isRightAligned = layer.textAlign === "right";
                        return (
                          <div
                            key={layer.id}
                            data-snap-id={layer.id}
                            onPointerDown={(e) => handlePointerDown(layer.id, e)}
                            onClick={() => setActiveTextId(layer.id)}
                            style={{
                              position: "absolute",
                              left: `${layer.x}%`,
                              top: `${layer.y}%`,
                              transform: isCentered ? "translateX(-50%)" : isRightAligned ? "translateX(-100%)" : "none",
                              fontSize: `${layer.fontSize}px`,
                              color: layer.color || "#ffffff",
                              fontWeight: layer.fontWeight || "normal",
                              fontStyle: layer.fontStyle || "normal",
                              fontFamily: layer.fontFamily || "Inter",
                              textDecoration: layer.underline ? "underline" : "none",
                              cursor: "move",
                              zIndex: isSelected ? 30 : 25,
                            }}
                            className={`px-2 py-0.5 whitespace-nowrap ${
                              isSelected ? "border border-[#00a6f4] ring-1 ring-[#00a6f4]/40" : "border border-transparent"
                            }`}
                          >
                            {layer.text}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Alignment guide lines when dragging */}
                  {alignmentLines.map((line, i) => (
                    <div
                      key={i}
                      className="absolute bg-[#00a6f4] pointer-events-none z-30"
                      style={{
                        left: line.type === "v" ? `${line.pos}%` : 0,
                        top: line.type === "h" ? `${line.pos}%` : 0,
                        width: line.type === "v" ? "1px" : "100%",
                        height: line.type === "h" ? "1px" : "100%",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
              );
            })()}

            {/* Right Side Panel: Side Switcher (Front & Back) */}
            <div className="flex flex-col gap-4 w-[120px] shrink-0 z-20">
              {/* Front Card Thumbnail */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => selectSide(0)}
                className={`bg-[#e2e4e9] p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  activeSideIndex === 0 ? "border-[#1d90cf] shadow-md" : "border-transparent hover:border-zinc-300"
                }`}
              >
                <div className="w-full h-[58px] bg-white rounded-xs shadow-xs overflow-hidden relative border border-zinc-200">
                  {/* Mini preview */}
                  <div className="w-full h-[78%] bg-[#0c0d12]" />
                  <div className="w-full h-[22%] bg-[#00a6f4]" />
                </div>
                <p className="text-xs font-semibold text-zinc-700 text-center mt-2">Front</p>
              </div>

              {/* Back Card Thumbnail */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => selectSide(1)}
                className={`bg-[#e2e4e9] p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  activeSideIndex === 1 ? "border-[#1d90cf] shadow-md" : "border-transparent hover:border-zinc-300"
                }`}
              >
                <div className="w-full h-[58px] bg-white rounded-xs shadow-xs overflow-hidden relative border border-zinc-200 flex items-center justify-center">
                  <span className="text-[10px] text-zinc-400 font-mono">Back</span>
                </div>
                <p className="text-xs font-semibold text-zinc-700 text-center mt-2">Back</p>
              </div>
            </div>

            {/* Bottom-Left Floating Zoom Control */}
            <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 select-none">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))}
                className="text-zinc-500 hover:text-zinc-900 font-bold text-sm cursor-pointer"
                title="Zoom Out"
              >
                −
              </button>
              <input
                type="range"
                min="0.6"
                max="1.5"
                step="0.05"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-24 h-1 bg-zinc-300 rounded-lg appearance-none cursor-pointer accent-zinc-900"
              />
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
                className="text-zinc-500 hover:text-zinc-900 font-bold text-sm cursor-pointer"
                title="Zoom In"
              >
                +
              </button>
            </div>

            {/* Hidden Image Upload Input for imageLayerFileRef */}
            <input
              ref={imageLayerFileRef}
              type="file"
              accept="image/*"
              onChange={handleImageLayerFile}
              className="hidden"
            />
          </div>

          {/* ─────────────────────────────────────────────────────────────
              STICKY BOTTOM BAR (COMPLETELY DYNAMIC & RESPONSIVE)
          ───────────────────────────────────────────────────────────── */}
          <div className="sticky bottom-0 z-40 bg-white border-t border-[#e2e8f0] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 xl:px-8 py-2.5 sm:py-3">

              {/* ── DESKTOP & TABLET LAYOUT (MD & UP): SINGLE ROW ── */}
              <div className="hidden md:flex items-center justify-between gap-4">

                {/* Left: Live Price & Specification Line */}
                <div className="flex items-center gap-3">
                  <div className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                    ${calculatedTotalPrice > 0 ? calculatedTotalPrice.toFixed(2) : "29.00"}
                  </div>
                  <div className="text-xs text-zinc-500 leading-tight border-l border-[#e2e8f0] pl-3">
                    <span className="font-semibold text-zinc-800">{cardData.quantity || 100} units</span>
                    <span className="mx-1">•</span>
                    <button
                      type="button"
                      onClick={() => setIsSizeModalOpen(true)}
                      className="font-semibold text-[#1d90cf] hover:underline cursor-pointer"
                      title="Change product size"
                    >
                      {currentSizeName} ({activeCanvasConfig.width} × {activeCanvasConfig.height} {activeCanvasConfig.unit || "mm"})
                    </button>
                    <span className="mx-1">•</span>
                    <span>{cardData.corners || "Standard corners"}</span>
                    <span className="mx-1">•</span>
                    <span className="text-emerald-700 font-semibold">+ shipping</span>
                  </div>
                </div>

                {/* Right: Download PNG, Approval Checkbox, and Primary "Continue to Options" Button */}
                <div className="flex items-center gap-3">

                  {/* Desktop (XL+): Full Download PNG Button */}
                  <button
                    type="button"
                    disabled={downloadingProof}
                    onClick={() => handleDownloadProof("both")}
                    className="hidden xl:flex min-h-[42px] px-4 py-2 bg-white hover:bg-zinc-50 border border-[#e2e8f0] text-zinc-800 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    title="Download Proof PNG"
                  >
                    <svg className="w-4 h-4 text-[#1d90cf]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{downloadingProof ? "Downloading..." : "Download PNG"}</span>
                  </button>

                  {/* Tablet (MD to XL): Icon-Only Download PNG Button */}
                  <button
                    type="button"
                    disabled={downloadingProof}
                    onClick={() => handleDownloadProof("both")}
                    className="flex xl:hidden min-h-[42px] min-w-[42px] p-2.5 bg-white hover:bg-zinc-50 border border-[#e2e8f0] text-zinc-800 rounded-xl items-center justify-center transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                    title="Download PNG"
                    aria-label="Download PNG"
                  >
                    <svg className="w-4 h-4 text-[#1d90cf]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>

                  {/* Approval Checkbox */}
                  <label className="min-h-[42px] flex items-center gap-2.5 text-xs sm:text-sm text-zinc-700 font-medium cursor-pointer select-none px-2 py-1 rounded-lg hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={cardData.approved}
                      onChange={(e) => setCardData((prev) => ({ ...prev, approved: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-300 text-[#1d90cf] focus:ring-[#1d90cf] cursor-pointer"
                    />
                    <span>I approve my design</span>
                  </label>

                  {/* Primary "Continue to Options" Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!cardData.approved) {
                        setCardData((prev) => ({ ...prev, approved: true }));
                      }
                      setStep("preferences");
                    }}
                    className="min-h-[42px] px-6 py-2.5 rounded-full font-bold text-sm transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 bg-[#1d90cf] hover:bg-[#187eb7] text-white"
                  >
                    <span>Continue to Options</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── MOBILE LAYOUT (UNDER 768PX): TWO ROWS + SAFE AREA ── */}
              <div className="flex md:hidden flex-col gap-2 pb-[calc(4px+env(safe-area-inset-bottom,0px))]">
                {/* Mobile Row 1: Live price on top with "Details" Link & Download PNG */}
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-zinc-900">
                      ${calculatedTotalPrice > 0 ? calculatedTotalPrice.toFixed(2) : "29.00"}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">/ {cardData.quantity || 100} units</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={downloadingProof}
                      onClick={() => handleDownloadProof("both")}
                      className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Download PNG Proof"
                    >
                      <svg className="w-3.5 h-3.5 text-[#1d90cf]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDetailsModal((prev) => !prev)}
                      className="px-2 py-1 text-xs font-bold text-[#1d90cf] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Details</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Mobile Row 2: "I approve my design" checkbox & Full-width Continue Button */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-100">
                  <label className="flex items-center gap-2 text-xs text-zinc-700 font-semibold cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      checked={cardData.approved}
                      onChange={(e) => setCardData((prev) => ({ ...prev, approved: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-300 text-[#1d90cf] focus:ring-[#1d90cf] cursor-pointer"
                    />
                    <span>I approve</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (!cardData.approved) {
                        setCardData((prev) => ({ ...prev, approved: true }));
                      }
                      setStep("preferences");
                    }}
                    className="flex-1 py-2.5 px-4 rounded-full font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 bg-[#1d90cf] hover:bg-[#187eb7] text-white text-center"
                  >
                    <span>Continue to Options</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Mobile Expandable Details Breakdown */}
                {showDetailsModal && (
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs space-y-1.5 mt-1 animate-in fade-in duration-150">
                    <div className="flex justify-between font-semibold text-zinc-800">
                      <span>Product:</span>
                      <span>{selectedTemplate?.title || "Custom Design"}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>Quantity:</span>
                      <span>{cardData.quantity || 100} units</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>Size / Dimensions:</span>
                      <button
                        type="button"
                        onClick={() => setIsSizeModalOpen(true)}
                        className="font-bold text-[#1d90cf] hover:underline cursor-pointer"
                      >
                        {currentSizeName} ({activeCanvasConfig.width} × {activeCanvasConfig.height} {activeCanvasConfig.unit || "mm"})
                      </button>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>Corners / Paper:</span>
                      <span>{cardData.corners || "Standard"} • {cardData.thickness || "Standard"}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Shipping:</span>
                      <span>Calculated at checkout</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 2: YOUR PREFERENCES
      ───────────────────────────────────────────────────────────── */}
          {step === "preferences" && (
            <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300 flex-1">

              <button
                onClick={() => setStep("review")}
                className="inline-flex items-center gap-1.5 text-base font-semibold text-zinc-700 hover:text-zinc-900 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                <div className="lg:col-span-6 flex flex-col items-center gap-4">
                  <div className="w-full bg-[#f4f4f4] rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center min-h-[380px]">
                    <ScaledCardStage width={fitDimsSummary.renderWidth} height={fitDimsSummary.renderHeight}>
                      <div
                        style={{
                          width: `${fitDimsSummary.renderWidth}px`,
                          height: `${fitDimsSummary.renderHeight}px`,
                          ...cardBackdrop,
                          color: cardData.textColor,
                        }}
                        className={`relative ${getCornerClass()} shadow-2xl p-6 flex flex-col justify-between overflow-hidden border border-zinc-800 transition-all`}
                      >
                        {(activeBgMode === "image" || activeBgMode === "image-gradient") && activeBgImage && (
                          <img
                            src={mediaSrc(activeBgImage) || activeBgImage}
                            alt="Uploaded Card Artwork"
                            style={{
                              transform: `rotate(${cardData.rotation}deg)`,
                              opacity: (cardData.imageOpacity ?? 90) / 100,
                            }}
                            className={`absolute inset-0 w-full h-full pointer-events-none ${cardData.fitMode === "bleed" ? "object-cover" : "object-contain"
                              }`}
                          />
                        )}
                        {editingBack ? (
                          <>
                            <CardDesignObjects objects={backDecor} layout={CUSTOMIZE_LAYOUT} />
                            {activeImageLayers.map((layer) => (
                              <div
                                key={layer.id}
                                className="absolute z-10 pointer-events-none"
                                style={{
                                  left: `${layer.x}%`,
                                  top: `${layer.y}%`,
                                  width: `${layer.width}%`,
                                  height: `${layer.height}%`,
                                }}
                              >
                                <img
                                  src={mediaSrc(layer.src) || layer.src}
                                  alt=""
                                  className="w-full h-full"
                                  style={{ objectFit: layer.fit, opacity: layer.opacity }}
                                />
                              </div>
                            ))}
                            {backTextLayers.map((layer) => (
                              <div key={layer.id} style={textLayerDomStyle(layer, CUSTOMIZE_LAYOUT)} className="absolute z-20">
                                {layer.textTransform === "uppercase"
                                  ? layer.text.toUpperCase()
                                  : layer.textTransform === "lowercase"
                                    ? layer.text.toLowerCase()
                                    : layer.text}
                              </div>
                            ))}
                          </>
                        ) : editingExtra ? (
                          <>
                            <CardDesignObjects objects={extraDecor} layout={CUSTOMIZE_LAYOUT} />
                            {activeImageLayers.map((layer) => (
                              <div
                                key={layer.id}
                                className="absolute z-10 pointer-events-none"
                                style={{
                                  left: `${layer.x}%`,
                                  top: `${layer.y}%`,
                                  width: `${layer.width}%`,
                                  height: `${layer.height}%`,
                                }}
                              >
                                <img
                                  src={mediaSrc(layer.src) || layer.src}
                                  alt=""
                                  className="w-full h-full"
                                  style={{ objectFit: layer.fit, opacity: layer.opacity }}
                                />
                              </div>
                            ))}
                            {activeLayers.map((layer) => (
                              <div key={layer.id} style={textLayerDomStyle(layer, CUSTOMIZE_LAYOUT)} className="absolute z-20">
                                {layer.textTransform === "uppercase"
                                  ? layer.text.toUpperCase()
                                  : layer.textTransform === "lowercase"
                                    ? layer.text.toLowerCase()
                                    : layer.text}
                              </div>
                            ))}
                          </>
                        ) : (
                          <>
                            <CardDesignObjects objects={frontObjects} layout={CUSTOMIZE_LAYOUT} />
                            {activeImageLayers.map((layer) => (
                              <div
                                key={layer.id}
                                className="absolute z-10 pointer-events-none"
                                style={{
                                  left: `${layer.x}%`,
                                  top: `${layer.y}%`,
                                  width: `${layer.width}%`,
                                  height: `${layer.height}%`,
                                }}
                              >
                                <img
                                  src={mediaSrc(layer.src) || layer.src}
                                  alt=""
                                  className="w-full h-full"
                                  style={{ objectFit: layer.fit, opacity: layer.opacity }}
                                />
                              </div>
                            ))}
                            {textLayers.map((layer) => (
                              <div
                                key={layer.id}
                                style={textLayerDomStyle(layer, CUSTOMIZE_LAYOUT)}
                                className="absolute z-20"
                              >
                                {layer.textTransform === "uppercase"
                                  ? layer.text.toUpperCase()
                                  : layer.textTransform === "lowercase"
                                    ? layer.text.toLowerCase()
                                    : layer.text}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </ScaledCardStage>
                  </div>

                  {sidesCount > 1 && (
                    <div className="flex flex-wrap justify-center gap-1 p-1 bg-white rounded-full border border-zinc-200 shadow-2xs max-w-full">
                      {sideLabels.map((label, idx) => (
                        <button
                          key={`summary-side-${idx}`}
                          type="button"
                          onClick={() => selectSide(idx)}
                          className={`px-5 py-1.5 text-base font-semibold rounded-full transition-all cursor-pointer ${activeSideIndex === idx
                              ? "bg-[#2196D2] text-white shadow-xs"
                              : "text-zinc-600 hover:text-zinc-900"
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200/80 shadow-xs space-y-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
                      Your Preferences
                    </h1>
                    <p className="text-base sm:text-base text-zinc-500 mt-2 leading-relaxed">
                      Set how many cards to print, or upload an employee sheet so each card uses that person&apos;s details.
                    </p>
                  </div>

                  <CardOrderFields
                    quantity={cardData.quantity}
                    onQuantity={(quantity) => setCardData((prev) => ({ ...prev, quantity }))}
                    employees={employees}
                    onEmployees={setEmployees}
                    onUseEmployee={useEmployeeOnCard}
                    fields={withCurrentSamples(sheetFields, [...textLayers, ...backTextLayers])}
                    basePrice={basePrice}
                  />

                  <div className="space-y-4">
                    {shownVariations.length > 0 ? (
                      shownVariations.map((vGroup) => {
                        const groupName = vGroup.name;
                        const selectedValName = selectedVariations[groupName] || (vGroup.values[0]?.name ?? "");

                        return (
                          <div key={vGroup._id || groupName} className="bg-[#f8f9fa] rounded-2xl p-4 border border-zinc-200/60">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#2196D2] text-white flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                                </svg>
                              </div>
                              <div>
                                <span className="text-base font-bold text-zinc-900 block">Select {groupName}</span>
                                <span className="text-base text-[#2196D2] font-extrabold">{selectedValName}</span>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-zinc-200/80 space-y-3">
                              {vGroup.values.map((val) => {
                                const isSelected = selectedValName === val.name;
                                const priceText = !val.price || val.price === 0 ? "Free" : `+$${val.price.toFixed(2)}`;

                                return (
                                  <div
                                    key={val._id || val.name}
                                    onClick={() => {
                                      setSelectedVariations((prev) => ({ ...prev, [groupName]: val.name }));
                                      if (groupName.toLowerCase().includes("corner")) {
                                        setCardData((prev) => ({ ...prev, corners: val.name }));
                                      } else if (groupName.toLowerCase().includes("paper") || groupName.toLowerCase().includes("stock") || groupName.toLowerCase().includes("thick")) {
                                        setCardData((prev) => ({ ...prev, thickness: val.name }));
                                      }
                                    }}
                                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                        ? "border-[#2196D2] bg-sky-50/40 shadow-2xs ring-1 ring-[#2196D2]/30"
                                        : "border-zinc-200 hover:border-zinc-300 bg-white"
                                      }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      {val.image && (
                                        <img src={mediaSrc(val.image)} alt={val.name} className="w-10 h-10 object-cover rounded-lg border border-zinc-200" />
                                      )}
                                      <div>
                                        <p className="text-base font-bold text-zinc-900">{val.name}</p>
                                        {val.description && (
                                          <p className="text-base text-zinc-500">{val.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <span className={`text-base font-extrabold ${val.price ? "text-zinc-700" : "text-emerald-700 font-bold"}`}>
                                      {priceText}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-zinc-200/60">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#2196D2] text-white flex items-center justify-center">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-base font-bold text-zinc-900 block">Select Thickness</span>
                              <span className="text-base text-zinc-500 font-medium">{cardData.thickness}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-zinc-200/80 space-y-3">
                            {[
                              { name: "Standard", desc: "A traditional business card paper.", extra: "Free" },
                              { name: "Standard Border", desc: "A traditional business card paper.", extra: "Free" },
                              { name: "Corner Border", desc: "A traditional business card paper.", extra: "Free" },
                            ].map((item) => (
                              <label
                                key={item.name}
                                onClick={() => setCardData((prev) => ({ ...prev, thickness: item.name }))}
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${cardData.thickness === item.name
                                    ? "border-[#2196D2] bg-sky-50/40"
                                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                                  }`}
                              >
                                <div>
                                  <p className="text-base font-bold text-zinc-900">{item.name}</p>
                                  <p className="text-base text-zinc-500">{item.desc}</p>
                                </div>
                                <span className="text-base font-semibold text-zinc-600">{item.extra}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-zinc-200/60">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#2196D2] text-white flex items-center justify-center">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-base font-bold text-zinc-900 block">Select Texture</span>
                              <span className="text-base text-zinc-500 font-medium">{cardData.texture}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-zinc-200/80 space-y-3">
                            {[
                              { name: "Smooth / Matte", desc: "Soft-touch silky feel with a low-glare surface.", extra: "Free" },
                              { name: "Linen", desc: "Woven fabric texture for a luxury tactile impression.", extra: "+ $ 5.00" },
                              { name: "Uncoated / Natural", desc: "Absorbent textured paper, great for writing notes.", extra: "+ $ 3.00" },
                              { name: "High Gloss UV", desc: "Vibrant UV reflective coating that makes colors pop.", extra: "+ $ 4.00" },
                            ].map((item) => (
                              <label
                                key={item.name}
                                onClick={() => setCardData((prev) => ({ ...prev, texture: item.name }))}
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${cardData.texture === item.name
                                    ? "border-[#2196D2] bg-sky-50/40"
                                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                                  }`}
                              >
                                <div>
                                  <p className="text-base font-bold text-zinc-900">{item.name}</p>
                                  <p className="text-base text-zinc-500">{item.desc}</p>
                                </div>
                                <span className="text-base font-semibold text-zinc-600">{item.extra}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-zinc-200/60">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#2196D2] text-white flex items-center justify-center">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-base font-bold text-zinc-900 block">Select Corners</span>
                              <span className="text-base text-zinc-500 font-medium">{cardData.corners}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-zinc-200/80 space-y-3">
                            {[
                              { name: "Standard Corners", desc: "Clean 90° traditional straight edge corners.", extra: "Free" },
                              { name: "Rounded Corners", desc: "Smooth 1/4 inch rounded corners for a modern look.", extra: "+ $ 7.00" },
                              { name: "Corner Border / Clipped", desc: "Stylish diagonal clipped corner design.", extra: "+ $ 8.00" },
                            ].map((item) => (
                              <label
                                key={item.name}
                                onClick={() => setCardData((prev) => ({ ...prev, corners: item.name }))}
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${cardData.corners === item.name
                                    ? "border-[#2196D2] bg-sky-50/40"
                                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                                  }`}
                              >
                                <div>
                                  <p className="text-base font-bold text-zinc-900">{item.name}</p>
                                  <p className="text-base text-zinc-500">{item.desc}</p>
                                </div>
                                <span className="text-base font-semibold text-zinc-600">{item.extra}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                </div>

              </div>

              <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 shadow-2xl py-3.5 px-4 sm:px-8">
                <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

                  <div className="flex items-center gap-3 text-base text-zinc-600">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">Need Help?</p>
                      <p>Call us at: <span className="font-semibold text-zinc-800">+1 808 695 8520</span></p>
                    </div>
                    <div className="hidden md:block pl-6 border-l border-zinc-200 text-zinc-500 font-medium">
                      Get it as soon as <span className="font-bold text-zinc-800">Tuesday, Feb 27th</span> to <span className="font-bold text-zinc-800">02451</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-base text-zinc-500 block">{cardData.quantity} cards</span>
                      <span className="text-xl font-black text-zinc-900">
                        $ {calculatedTotalPrice.toFixed(2)}
                      </span>
                    </div>

                    <input
                      type="number"
                      min={1}
                      max={100000}
                      aria-label="Card quantity"
                      value={cardData.quantity}
                      onChange={(e) => setCardData((prev) => ({ ...prev, quantity: Math.min(100000, Math.max(1, Math.round(Number(e.target.value) || 1))) }))}
                      className="w-24 px-3 py-2.5 rounded-full border border-zinc-300 text-base font-bold text-zinc-800 bg-white focus:outline-none"
                    />

                    <button
                      type="button"
                      disabled={addingToCart}
                      onClick={handleAddToCartAndProceed}
                      className="px-7 py-3 bg-[#2196D2] hover:bg-theme-darkblue text-white text-base font-bold rounded-full shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {addingToCart ? "Adding to Cart..." : "Add to cart →"}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
          STEP 3: CART / ORDER SUMMARY
      ───────────────────────────────────────────────────────────── */}
          {step === "cart" && (
            <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300 flex-1">

              <button
                onClick={() => setStep("preferences")}
                className="inline-flex items-center gap-1.5 text-base font-semibold text-zinc-700 hover:text-zinc-900 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span>My cart</span>
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                <div className="lg:col-span-3 bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs flex flex-col items-center gap-4">
                  <div className="relative w-full aspect-[1.75/1] rounded-xl overflow-hidden bg-red-600 shadow-md flex items-center justify-center">
                    <Image
                      src="/slide.png"
                      alt="Standard Business Cards Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-600 hover:border-zinc-400 cursor-pointer">
                      ‹
                    </button>
                    <button className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-600 hover:border-zinc-400 cursor-pointer">
                      ›
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <h2 className="text-lg font-bold text-zinc-900">Standard Business Cards</h2>
                    <button className="text-base font-semibold text-red-600 hover:underline cursor-pointer">
                      Remove
                    </button>
                  </div>

                  <div className="space-y-2 text-base">
                    <div className="flex items-center justify-between font-bold text-zinc-800">
                      <span>Your Preference Selection</span>
                      <button onClick={() => setStep("preferences")} className="text-theme-blue hover:underline cursor-pointer">
                        Edit
                      </button>
                    </div>

                    {[
                      { label: "Shape: Standard", extra: "+ US $29.99" },
                      { label: "Backside: Blank", extra: "+ US $29.99" },
                      { label: `Texture: ${cardData.texture}`, extra: "+ US $29.99" },
                      { label: `Orientation: Horizontal`, extra: "+ US $29.99" },
                      { label: `Paper Stock: Glossy`, extra: "+ US $29.99" },
                      { label: `Paper Thickness: Standard`, extra: "+ US $29.99" },
                      { label: `Corners: ${cardData.corners}`, extra: "+ US $29.99" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-zinc-600 py-0.5">
                        <span>{row.label}</span>
                        <span className="text-zinc-400">{row.extra}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-zinc-200 flex items-center justify-between font-bold text-base text-zinc-900">
                    <span>Item Total</span>
                    <span>US $ {calculatedTotalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-5">
                  <h2 className="text-lg font-bold text-zinc-900">Order Total</h2>

                  <div className="space-y-2.5 text-base text-zinc-600">
                    <div className="flex justify-between">
                      <span>Subtotal ( 1 item )</span>
                      <span className="font-semibold text-zinc-800">$58.88</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="font-semibold text-zinc-800">$56.00</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount</span>
                      <span>-$5.00</span>
                    </div>
                    <div className="pt-3 border-t border-zinc-200 flex justify-between text-base font-extrabold text-zinc-900">
                      <span>Order Total</span>
                      <span>$ 103.00</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <img src="/merchants.png" alt="Payment Merchants" className="w-full object-contain" />
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!(await viewerIsSignedIn())) {
                        await handleSaveDraft();
                        router.push(registerHref("/dashboard", "draft"));
                        return;
                      }
                      router.push("/checkout");
                    }}
                    className="w-full py-3.5 bg-[#2196D2] hover:bg-theme-darkblue text-white text-base font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Check Out
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Purchase / Unlock Modal for Paid Templates */}
          <PurchaseTemplateModal
            isOpen={isPurchaseModalOpen}
            template={purchaseModalTemplate}
            onClose={() => {
              setIsPurchaseModalOpen(false);
              setPurchaseModalTemplate(null);
            }}
            onSuccess={({ designId, template }) => {
              setIsPurchaseModalOpen(false);
              setCurrentDesignId(designId);
              setSelectedTemplate(template);
              setSaveToast("Template unlocked & saved to your dashboard!");
              setTimeout(() => setSaveToast(""), 4000);
              setStep("review");
            }}
          />

          {/* Interactive Size Selection Modal */}
          {isSizeModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setIsSizeModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#1d90cf]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                      Select Product Size
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Choose standard dimensions for {selectedCategory?.name || selectedTemplate?.category || "your product"} or enter custom dimensions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSizeModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                  {/* Preset Standard Sizes Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                        Available Sizes ({selectedCategory?.name || selectedTemplate?.category || "Standard"})
                      </h4>
                      <span className="text-xs text-zinc-400 font-medium">{offeredSizes.length} sizes available</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {offeredSizes.map((s, idx) => {
                        const isSelected =
                          Math.round(Number(activeCanvasConfig.width)) === Math.round(s.width) &&
                          Math.round(Number(activeCanvasConfig.height)) === Math.round(s.height);
                        const cardRatio = s.width / s.height;

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              handleSelectSize(s);
                              setIsSizeModalOpen(false);
                            }}
                            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? "border-[#1d90cf] bg-sky-50/50 shadow-xs ring-1 ring-[#1d90cf]/20"
                                : "border-zinc-200/80 hover:border-zinc-300 bg-white hover:bg-zinc-50/60"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Visual miniature box illustrating card aspect ratio */}
                              <div className="w-12 h-10 bg-zinc-100 rounded-lg flex items-center justify-center border border-zinc-200 shrink-0 overflow-hidden p-1">
                                <div
                                  style={{
                                    width: cardRatio >= 1 ? "100%" : `${Math.max(20, Math.round(cardRatio * 100))}%`,
                                    height: cardRatio < 1 ? "100%" : `${Math.max(20, Math.round((1 / cardRatio) * 100))}%`,
                                    maxHeight: "26px",
                                    maxWidth: "36px",
                                  }}
                                  className={`rounded-xs transition-colors ${
                                    isSelected ? "bg-[#1d90cf]" : "bg-zinc-400"
                                  }`}
                                />
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-zinc-900">{s.name}</p>
                                  {isSelected && (
                                    <span className="bg-[#1d90cf] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-xs">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                                  {s.width} × {s.height} {s.unit}
                                  {s.unit === "mm" && (
                                    <span className="text-zinc-400 ml-1.5 font-sans">
                                      ({(s.width / 25.4).toFixed(1)}" × {(s.height / 25.4).toFixed(1)}")
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? "border-[#1d90cf] bg-[#1d90cf] text-white" : "border-zinc-300"
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Dimensions Section */}
                  <div className="pt-4 border-t border-zinc-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                        </svg>
                        Custom Dimensions
                      </h4>
                      <button
                        type="button"
                        onClick={handleSwapOrientation}
                        className="text-xs font-semibold text-[#1d90cf] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 rotate-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                        <span>Swap Dimensions ({activeCanvasConfig.width >= activeCanvasConfig.height ? "Portrait" : "Landscape"})</span>
                      </button>
                    </div>

                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 block mb-1">Width</label>
                          <input
                            type="number"
                            min="10"
                            max="5000"
                            step="1"
                            value={customWidth}
                            onChange={(e) => setCustomWidth(Number(e.target.value) || 0)}
                            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-[#1d90cf]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-zinc-700 block mb-1">Height</label>
                          <input
                            type="number"
                            min="10"
                            max="5000"
                            step="1"
                            value={customHeight}
                            onChange={(e) => setCustomHeight(Number(e.target.value) || 0)}
                            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-[#1d90cf]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-zinc-700 block mb-1">Unit</label>
                          <select
                            value={customUnit}
                            onChange={(e) => setCustomUnit(e.target.value as CanvasUnit)}
                            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-[#1d90cf] cursor-pointer"
                          >
                            <option value="mm">mm (millimeters)</option>
                            <option value="cm">cm (centimeters)</option>
                            <option value="in">in (inches)</option>
                            <option value="px">px (pixels)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-zinc-700 block mb-1">Bleed / Safe Area</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={customBleed}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setCustomBleed(val);
                                setCustomSafeArea(val);
                              }}
                              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-[#1d90cf]"
                              placeholder="3"
                            />
                            <span className="text-xs font-mono text-zinc-400">{customUnit}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleApplyCustomSize}
                          className="px-5 py-2.5 bg-[#1d90cf] hover:bg-[#187eb7] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
                        >
                          <span>Apply Custom Size</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      );
}
