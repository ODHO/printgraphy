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
    if (query.get("templateId") || query.get("designId") || stepParam === "upload") return "upload";
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
    { id: "1", text: "Stephen", x: 10, y: 30, fontSize: 24, color: "#ffffff", fontWeight: "bold" },
    { id: "2", text: "Manager", x: 10, y: 48, fontSize: 13, color: "#38bdf8", fontWeight: "normal" },
    { id: "3", text: "+1 (555) 123-4567", x: 10, y: 76, fontSize: 10, color: "#e4e4e7", fontWeight: "normal" },
    { id: "4", text: "stephen@zyora.com", x: 42, y: 76, fontSize: 10, color: "#e4e4e7", fontWeight: "normal" },
    { id: "5", text: "Poissy 15 rue de la Boëtie", x: 68, y: 76, fontSize: 10, color: "#e4e4e7", fontWeight: "normal" },
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
  const offeredSizes: PrintSize[] = selectedCategory
    ? [
      {
        name: "Category default",
        width: selectedCategory.canvas_width,
        height: selectedCategory.canvas_height,
        unit: asCanvasUnit(selectedCategory.unit, "mm"),
        bleed: selectedCategory.bleed ?? 0,
        bleedUnit: selectedCategory.bleedUnit || asCanvasUnit(selectedCategory.unit, "mm"),
        safeArea: selectedCategory.safe_area ?? 0,
        safeAreaUnit: selectedCategory.safeAreaUnit || asCanvasUnit(selectedCategory.unit, "mm"),
      },
      ...(selectedCategory.printSizes || []),
    ]
    : [];
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
            const frontLayers =
              Array.isArray(t.templateData?.textLayers) && t.templateData.textLayers.length > 0
                ? t.templateData.textLayers
                : [
                  { id: "1", text: cardData.name || "Stephen" },
                  { id: "2", text: cardData.title || "Manager" },
                  { id: "3", text: cardData.phone || "+1 (555) 123-4567" },
                  { id: "4", text: cardData.email || "stephen@zyora.com" },
                  { id: "5", text: cardData.address || "Poissy 15 rue de la Boëtie" },
                ];
            if (Array.isArray(t.templateData?.textLayers) && t.templateData.textLayers.length > 0) {
              setTextLayers(t.templateData.textLayers);
            }
            const locked = lockTemplateFields(frontLayers, backLayers);
            setSheetFields(locked.fields);
            setRequiredLayerIds(locked.requiredLayerIds);
            if (t.templateData) {
              setCardData((prev) => ({
                ...prev,
                bgColor: t.templateData.bgColor || prev.bgColor,
                textColor: t.templateData.textColor || prev.textColor,
                logoPosition: t.templateData.logoPosition || prev.logoPosition,
                logoX: logoPoint(t.templateData.logoPosition || prev.logoPosition).x,
                logoY: logoPoint(t.templateData.logoPosition || prev.logoPosition).y,
                backLogoPosition: t.templateData.logoPosition || prev.backLogoPosition,
                backLogoX: logoPoint(t.templateData.logoPosition || prev.logoPosition).x,
                backLogoY: logoPoint(t.templateData.logoPosition || prev.logoPosition).y,
                logoText: "",
                logoSize: t.templateData.logoSize || prev.logoSize,
              }));
            }
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
          BREADCRUMB ROW
      ───────────────────────────────────────────────────────────── */}
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
                className={`transition-colors cursor-pointer flex items-center gap-1.5 ${step === "review" ? "text-[#0b6fb3] font-bold" : "text-zinc-600 hover:text-zinc-900"
                  }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === "review" ? "bg-[#0b6fb3] text-white" : "bg-zinc-100 text-zinc-600"
                  }`}>1</span>
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
                Step {step === "review" ? "1" : step === "preferences" ? "2" : "3"} of 3
              </span>
              <div className="w-24 h-1 bg-zinc-200 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-[#0b6fb3] rounded-full transition-all duration-300"
                  style={{ width: step === "review" ? "33.3%" : step === "preferences" ? "66.6%" : "100%" }}
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
          STEP 1: DESIGN REVIEW (Printgraphy-STYLE UNLIMITED DRAGGABLE TEXT BUILDER)
      ───────────────────────────────────────────────────────────── */}
      {step === "review" && (
        <div className="w-full flex-1 flex flex-col justify-between">

          {/* Main Studio Grid Container */}
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 xl:px-8 py-4 sm:py-6 flex-1">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 items-start">

              {/* ── LEFT COLUMN: PREVIEW AREA (DESKTOP: ~55%, TABLET: FULL-WIDTH TOP, MOBILE: ~240px) ── */}
              <div className="xl:col-span-7 flex flex-col gap-3 xl:sticky xl:top-20 xl:self-start w-full">

                {/* Preview Toolbar: 3D/2D Switch + Front/Back Segmented Control + Desktop Zoom */}
                <div className="w-full flex items-center justify-between gap-2 flex-wrap bg-white px-3 sm:px-4 py-2 rounded-2xl border border-[#e2e8f0] shadow-xs">

                  {/* 3D View / 2D Edit Toggle */}
                  <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-[#e2e8f0]">
                    <button
                      type="button"
                      onClick={() => setViewMode("3d")}
                      className={`min-h-[38px] px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === "3d"
                          ? "bg-white text-zinc-900 shadow-xs font-bold"
                          : "text-zinc-600 hover:text-zinc-900"
                        }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                      </svg>
                      <span>3D View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode("2d")}
                      className={`min-h-[38px] px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === "2d"
                          ? "bg-[#0b6fb3] text-white shadow-xs font-bold"
                          : "text-zinc-600 hover:text-zinc-900"
                        }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                      <span>2D Edit</span>
                    </button>
                  </div>

                  {/* Front / Back Segmented Control */}
                  <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-[#e2e8f0]">
                    <button
                      type="button"
                      onClick={() => selectSide(0)}
                      className={`min-h-[38px] px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeSideIndex === 0
                          ? "bg-white text-zinc-900 shadow-xs font-bold"
                          : "text-zinc-600 hover:text-zinc-900"
                        }`}
                    >
                      Front
                    </button>
                    <button
                      type="button"
                      onClick={() => selectSide(1)}
                      className={`min-h-[38px] px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeSideIndex === 1
                          ? "bg-white text-zinc-900 shadow-xs font-bold"
                          : "text-zinc-600 hover:text-zinc-900"
                        }`}
                    >
                      Back
                    </button>
                  </div>

                  {/* Desktop & Tablet Zoom & Reset Controls */}
                  <div className="hidden md:flex items-center gap-1 bg-zinc-50 px-2 py-1 rounded-xl border border-[#e2e8f0]">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                      className="w-8 h-8 rounded-lg hover:bg-zinc-200/80 text-zinc-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                      title="Zoom Out"
                      aria-label="Zoom Out"
                    >
                      –
                    </button>
                    <span className="text-xs font-mono font-bold text-zinc-700 px-1.5 min-w-[3rem] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(1.8, Number((z + 0.1).toFixed(1))))}
                      className="w-8 h-8 rounded-lg hover:bg-zinc-200/80 text-zinc-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                      title="Zoom In"
                      aria-label="Zoom In"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="px-2 py-1 rounded-lg hover:bg-zinc-200/80 text-xs text-zinc-600 font-medium transition-colors cursor-pointer ml-1"
                      title="Reset View"
                    >
                      Reset
                    </button>
                  </div>

                </div>

                {/* Main Card Viewport Box (Dark stage with 3.5x2 in card) */}
                <div className="w-full bg-[#18181b] rounded-[16px] md:rounded-[20px] p-4 sm:p-6 flex flex-col items-center justify-center min-h-[240px] md:min-h-[360px] xl:min-h-[460px] h-[240px] md:h-[360px] xl:h-[460px] shadow-xl relative overflow-hidden border border-zinc-800">
                  <div
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: "center center",
                      transition: "transform 0.15s ease-out",
                    }}
                    className="w-full h-full flex items-center justify-center relative"
                  >

                    {isMockupProduct && mockupImageSrc ? (
                      <div className="w-full flex flex-col items-center gap-3 py-2">
                        <MockupCanvasStage
                          mockupImage={mockupImageSrc}
                          printArea={mockupPrintArea}
                          layers={layersForSide(activeSideIndex)}
                          activeLayerId={activeTextId}
                          onAddLayerAt={(x, y) => {
                            const newId =
                              typeof crypto !== "undefined" && "randomUUID" in crypto
                                ? crypto.randomUUID()
                                : `text_${Date.now()}`;
                            const layer = {
                              id: newId,
                              text: "Your Text",
                              x,
                              y,
                              fontSize: 18,
                              color: "#111111",
                              fontWeight: "bold" as const,
                            };
                            if (activeSideIndex <= 0) {
                              setTextLayers((prev) => [...prev, layer]);
                            } else if (activeSideIndex === 1) {
                              setBackTextLayers((prev) => [...prev, layer]);
                            } else {
                              setExtraSideTextLayers((prev) => {
                                const next = [...prev];
                                while (next.length < activeSideIndex - 1) next.push([]);
                                next[activeSideIndex - 2] = [...(next[activeSideIndex - 2] || []), layer];
                                return next;
                              });
                            }
                            setActiveTextId(newId);
                          }}
                          onSelectLayer={setActiveTextId}
                          onMoveLayer={(id, x, y) => {
                            const patch = (layers: typeof textLayers) =>
                              layers.map((l) => (l.id === id ? { ...l, x, y } : l));
                            if (activeSideIndex <= 0) setTextLayers(patch);
                            else if (activeSideIndex === 1) setBackTextLayers(patch);
                            else {
                              setExtraSideTextLayers((prev) => {
                                const next = [...prev];
                                const idx = activeSideIndex - 2;
                                if (!next[idx]) return prev;
                                next[idx] = patch(next[idx]);
                                return next;
                              });
                            }
                          }}
                        />
                        <p className="text-sm text-zinc-400 font-medium text-center">
                          Click inside the print area to add text · drag layers to move them
                        </p>
                      </div>
                    ) : viewMode === "3d" ? (
                      <div className="w-full h-[440px] relative flex items-center justify-center">
                        <ThreeDCardPreview
                          canvasConfig={{
                            ...(activeCanvasConfig as any),
                            side_mode: resolvedSides.sideMode,
                            sides_count: sidesCount,
                            sides_names: sideLabels,
                            supports_back_side: sidesCount > 1,
                          }}
                          frontDesign={currentFrontDesign}
                          backDesign={currentBackDesign}
                          extraSideDesigns={extraSideLiveDesigns}
                          sideDesigns={allSideDesigns}
                          bgColor={cardData.bgColor}
                          backBgColor={cardData.backBgColor}
                          logoText=""
                          logoImage={null}
                          logoPosition={cardData.logoPosition}
                          logoX={cardData.logoX}
                          logoY={cardData.logoY}
                          backLogoX={cardData.backLogoX}
                          backLogoY={cardData.backLogoY}
                          sideLogoPoints={Array.from({ length: sidesCount }, (_, i) => logoPointForSide(i))}
                          logoSize={cardData.logoSize}
                          textLayers={textLayers}
                          side={activeSideIndex === 1 ? "back" : "front"}
                          sideIndex={activeSideIndex}
                          thickness={cardData.thickness}
                          corners={cardData.corners}
                          name={cardData.name}
                          email={cardData.email}
                          website={cardData.website}
                          onSideChange={(s) => selectSide(s === "back" ? 1 : 0)}
                          onSideIndexChange={selectSide}
                          previewWidth={fitDims.renderWidth}
                          previewHeight={fitDims.renderHeight}
                          uploadedImage={null}
                          imageOpacity={cardData.imageOpacity}
                          imageRotation={cardData.rotation}
                          fitMode={cardData.fitMode}
                          safeInset={fitDims.safeAreaPx}
                          cardLayout={CUSTOMIZE_LAYOUT}
                          textColor={cardData.textColor}
                          cornerRadius={cornerRadiusForFinish(cardData.corners, 16)}
                        />
                      </div>
                    ) : (
                      /* 2D Draggable Layout Canvas */
                      <div className="w-full flex flex-col items-center justify-center">
                        <ScaledCardStage width={fitDims.renderWidth} height={fitDims.renderHeight} className="my-4">
                          <div
                            ref={cardPreviewRef}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            style={{
                              width: `${fitDims.renderWidth}px`,
                              height: `${fitDims.renderHeight}px`,
                              ...cardBackdrop,
                              color: cardData.textColor,
                            }}
                            className={`relative ${getCornerClass()} shadow-2xl overflow-hidden border border-zinc-800 transition-all duration-300 select-none`}
                          >
                            {/* Canva-Style Smart Alignment Guide Lines */}
                            <SpacingGapOverlay gap={viewMode === "2d" ? selectionGap : null} />
                            <CanvasGuideLinesOverlay
                              lines={activeCanvasConfig.guide_lines}
                              canvasWidth={Number(activeCanvasConfig.width) || 105}
                              canvasHeight={Number(activeCanvasConfig.height) || 60}
                              canvasUnit={asCanvasUnit(activeCanvasConfig.unit, "mm")}
                              showLabels={false}
                            />
                            {alignmentLines.map((line, idx) => (
                              <div
                                key={idx}
                                className={`absolute pointer-events-none z-30 transition-all ${line.type === "v"
                                    ? "top-0 bottom-0 w-[1.5px] bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]"
                                    : "left-0 right-0 h-[1.5px] bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]"
                                  }`}
                                style={
                                  line.type === "v"
                                    ? { left: `${line.pos}%` }
                                    : { top: `${line.pos}%` }
                                }
                              />
                            ))}

                            {/* Uploaded Image Background Layer with Opacity */}
                            {(activeBgMode === "image" || activeBgMode === "image-gradient") && activeBgImage && (
                              <img
                                src={mediaSrc(activeBgImage) || activeBgImage}
                                alt="Uploaded Card Artwork"
                                style={{
                                  top: cardData.fitMode === "safe" ? fitDims.safeAreaPx : 0,
                                  left: cardData.fitMode === "safe" ? fitDims.safeAreaPx : 0,
                                  width:
                                    cardData.fitMode === "safe"
                                      ? `${Math.max(1, fitDims.renderWidth - fitDims.safeAreaPx * 2)}px`
                                      : "100%",
                                  height:
                                    cardData.fitMode === "safe"
                                      ? `${Math.max(1, fitDims.renderHeight - fitDims.safeAreaPx * 2)}px`
                                      : "100%",
                                  objectFit: cardData.fitMode === "bleed" ? "cover" : "contain",
                                  transform: `rotate(${cardData.rotation}deg)`,
                                  opacity: (cardData.imageOpacity ?? 100) / 100,
                                }}
                                className="absolute pointer-events-none"
                              />
                            )}

                            {editingBack ? (
                              <>
                                <CardDesignObjects
                                  objects={backDecor}
                                  layout={CUSTOMIZE_LAYOUT}
                                  onEditImage={(id) => {
                                    logoEditIdRef.current = id;
                                    logoFileInputRef.current?.click();
                                  }}
                                />
                                {activeImageLayers.map((layer) => (
                                  <div
                                    key={layer.id}
                                    role="button"
                                    aria-label={layer.label || "Image"}
                                    data-snap-id={layer.id}
                                    onPointerDown={(e) => startImageLayerDrag(layer.id, e)}
                                    className={`absolute z-10 cursor-grab active:cursor-grabbing touch-none rounded ${activeTextId === layer.id ? "ring-2 ring-[#2196D2] shadow-md" : "hover:ring-1 hover:ring-white/50"
                                      }`}
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
                                      draggable={false}
                                      className="w-full h-full pointer-events-none"
                                      style={{ objectFit: layer.fit, opacity: layer.opacity }}
                                    />
                                  </div>
                                ))}
                                {backTextLayers.map((layer) => {
                                  const isActive = activeTextId === layer.id;
                                  const shown =
                                    layer.textTransform === "uppercase"
                                      ? layer.text.toUpperCase()
                                      : layer.textTransform === "lowercase"
                                        ? layer.text.toLowerCase()
                                        : layer.text;
                                  return (
                                    <div
                                      key={layer.id}
                                      data-snap-id={layer.id}
                                      onPointerDown={(e) => handlePointerDown(layer.id, e)}
                                      style={textLayerDomStyle(layer, CUSTOMIZE_LAYOUT)}
                                      className={`absolute z-20 cursor-grab active:cursor-grabbing rounded transition-all touch-none ${isActive
                                          ? "ring-2 ring-[#2196D2] bg-[#2196D2]/20 shadow-md"
                                          : "hover:ring-1 hover:ring-white/60"
                                        }`}
                                    >
                                      {shown || "Type your text..."}
                                    </div>
                                  );
                                })}
                              </>
                            ) : editingExtra ? (
                              <>
                                <CardDesignObjects
                                  objects={extraDecor}
                                  layout={CUSTOMIZE_LAYOUT}
                                  onEditImage={(id) => {
                                    logoEditIdRef.current = id;
                                    logoFileInputRef.current?.click();
                                  }}
                                />
                                {activeImageLayers.map((layer) => (
                                  <div
                                    key={layer.id}
                                    role="button"
                                    aria-label={layer.label || "Image"}
                                    data-snap-id={layer.id}
                                    onPointerDown={(e) => startImageLayerDrag(layer.id, e)}
                                    className={`absolute z-10 cursor-grab active:cursor-grabbing touch-none rounded ${activeTextId === layer.id ? "ring-2 ring-[#2196D2] shadow-md" : "hover:ring-1 hover:ring-white/50"
                                      }`}
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
                                      draggable={false}
                                      className="w-full h-full pointer-events-none"
                                      style={{ objectFit: layer.fit, opacity: layer.opacity }}
                                    />
                                  </div>
                                ))}
                                {activeLayers.map((layer) => {
                                  const isActive = activeTextId === layer.id;
                                  const shown =
                                    layer.textTransform === "uppercase"
                                      ? layer.text.toUpperCase()
                                      : layer.textTransform === "lowercase"
                                        ? layer.text.toLowerCase()
                                        : layer.text;
                                  return (
                                    <div
                                      key={layer.id}
                                      data-snap-id={layer.id}
                                      onPointerDown={(e) => handlePointerDown(layer.id, e)}
                                      style={textLayerDomStyle(layer, CUSTOMIZE_LAYOUT)}
                                      className={`absolute z-20 cursor-grab active:cursor-grabbing rounded transition-all touch-none ${isActive
                                          ? "ring-2 ring-[#2196D2] bg-[#2196D2]/20 shadow-md"
                                          : "hover:ring-1 hover:ring-white/60"
                                        }`}
                                    >
                                      {shown || "Type your text..."}
                                    </div>
                                  );
                                })}
                              </>
                            ) : (
                              <>
                                <CardDesignObjects
                                  objects={frontObjects}
                                  layout={CUSTOMIZE_LAYOUT}
                                  onEditImage={(id) => {
                                    logoEditIdRef.current = id;
                                    logoFileInputRef.current?.click();
                                  }}
                                />
                                {activeImageLayers.map((layer) => (
                                  <div
                                    key={layer.id}
                                    role="button"
                                    aria-label={layer.label || "Image"}
                                    data-snap-id={layer.id}
                                    onPointerDown={(e) => startImageLayerDrag(layer.id, e)}
                                    className={`absolute z-10 cursor-grab active:cursor-grabbing touch-none rounded ${activeTextId === layer.id ? "ring-2 ring-[#2196D2] shadow-md" : "hover:ring-1 hover:ring-white/50"
                                      }`}
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
                                      draggable={false}
                                      className="w-full h-full pointer-events-none"
                                      style={{ objectFit: layer.fit, opacity: layer.opacity }}
                                    />
                                  </div>
                                ))}

                                {/* Render Draggable Text Layers */}
                                {textLayers.map((layer) => {
                                  const isActive = activeTextId === layer.id;
                                  return (
                                    <div
                                      key={layer.id}
                                      data-snap-id={layer.id}
                                      onPointerDown={(e) => handlePointerDown(layer.id, e)}
                                      style={textLayerDomStyle(layer, CUSTOMIZE_LAYOUT)}
                                      className={`absolute z-20 cursor-grab active:cursor-grabbing rounded transition-all touch-none ${isActive
                                          ? "ring-2 ring-[#2196D2] bg-[#2196D2]/20 shadow-md"
                                          : "hover:ring-1 hover:ring-white/60"
                                        }`}
                                    >
                                      {layer.text || "Type your text..."}
                                    </div>
                                  );
                                })}
                              </>
                            )}

                          </div>
                        </ScaledCardStage>

                        <p className="text-xs text-zinc-400 mt-2 font-medium flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-[#0b6fb3]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5a1.5 1.5 0 013 0v5.5m0 0a1.5 1.5 0 013 0v-3a1.5 1.5 0 013 0" />
                          </svg>
                          <span>Click &amp; drag any text layer directly on the card preview to reposition it!</span>
                        </p>
                      </div>
                    )}

                  </div>
                </div>

                {/* Mobile Compact Controls Row Below Stage */}
                <div className="md:hidden flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-[#e2e8f0] shadow-xs">
                  <span className="text-xs font-semibold text-zinc-600">Canvas Zoom</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                      className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-lg bg-zinc-100 font-bold text-zinc-700 flex items-center justify-center cursor-pointer hover:bg-zinc-200 transition-colors"
                      aria-label="Zoom Out"
                    >
                      –
                    </button>
                    <span className="text-xs font-mono font-bold text-zinc-800 px-1.5 min-w-[2.5rem] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(1.8, Number((z + 0.1).toFixed(1))))}
                      className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-lg bg-zinc-100 font-bold text-zinc-700 flex items-center justify-center cursor-pointer hover:bg-zinc-200 transition-colors"
                      aria-label="Zoom In"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-100 text-xs text-zinc-700 font-semibold cursor-pointer ml-1 hover:bg-zinc-200 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Drag-to-rotate Hint */}
                <div className="text-xs text-zinc-500 font-medium flex items-center justify-center gap-1.5 py-0.5">
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{viewMode === "3d" ? "Drag to rotate in 3D • Double-click to flip" : "Drag elements on card to position"}</span>
                </div>

                {/* Spec Line: Size, Paper, Corners, Print-Safe Status */}
                <div className="text-xs font-semibold text-zinc-600 flex items-center justify-center flex-wrap gap-2 pt-1 border-t border-[#e2e8f0]/80">
                  <span>3.5 × 2.0 in</span>
                  <span className="text-zinc-300">•</span>
                  <span>{cardData.texture || "Matte Finish"}</span>
                  <span className="text-zinc-300">•</span>
                  <span>{cardData.corners || "Standard Corners"}</span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    Print-Safe Status: Active
                  </span>
                </div>

                {/* Multi-side toggle pills */}
                {sidesCount > 1 && (
                  <div className="flex flex-wrap justify-center gap-1 p-1 bg-white rounded-full border border-[#e2e8f0] shadow-2xs max-w-full">
                    {sideLabels.map((label, idx) => (
                      <button
                        key={`customize-side-${idx}`}
                        type="button"
                        onClick={() => selectSide(idx)}
                        className={`min-h-[44px] px-5 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all cursor-pointer ${activeSideIndex === idx
                            ? "bg-[#0b6fb3] text-white shadow-xs font-bold"
                            : "text-zinc-600 hover:text-zinc-900"
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

              </div>

              {/* ── RIGHT COLUMN: STUDIO EDITOR PANEL (DESKTOP: ~45%, TABLET: BELOW FULL-WIDTH, MOBILE: BOTTOM SHEET) ── */}
              <div className="xl:col-span-5 w-full flex flex-col">

                {/* Mobile Bottom Sheet Drag Handle */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setMobileSheetExpanded((prev) => !prev)}
                  className="md:hidden w-full flex flex-col items-center py-2 cursor-pointer select-none group"
                  aria-label="Expand or collapse design editor sheet"
                >
                  <div className="w-12 h-1.5 bg-zinc-300 group-hover:bg-zinc-400 rounded-full transition-colors" />
                  <span className="text-[11px] font-semibold text-zinc-500 mt-1">
                    {mobileSheetExpanded ? "Tap to collapse editor" : "Tap to expand editor"}
                  </span>
                </div>

                {/* Editor Card Container */}
                <div className="bg-white rounded-[16px] md:rounded-[20px] border border-[#e2e8f0] p-4 sm:p-6 shadow-xs flex flex-col gap-5">

                  {/* Header Title & Subtitle */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
                        Card Customization Studio
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                        Customize typography, card backdrop, and print materials.
                      </p>
                    </div>
                  </div>

                  {/* Segmented Tabs: Text / Background / Paper & Finish (Horizontally scrollable on mobile, No emojis) */}
                  <div className="flex items-center gap-1.5 p-1 bg-[#f4f7fb] rounded-xl border border-[#e2e8f0] overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setStudioTab("text")}
                      className={`flex-1 min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${studioTab === "text"
                          ? "bg-white text-[#0b6fb3] shadow-2xs border border-[#e2e8f0]"
                          : "text-zinc-600 hover:text-zinc-900 border border-transparent"
                        }`}
                    >
                      Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioTab("background")}
                      className={`flex-1 min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${studioTab === "background"
                          ? "bg-white text-[#0b6fb3] shadow-2xs border border-[#e2e8f0]"
                          : "text-zinc-600 hover:text-zinc-900 border border-transparent"
                        }`}
                    >
                      Background
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioTab("paper")}
                      className={`flex-1 min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${studioTab === "paper"
                          ? "bg-white text-[#0b6fb3] shadow-2xs border border-[#e2e8f0]"
                          : "text-zinc-600 hover:text-zinc-900 border border-transparent"
                        }`}
                    >
                      Paper &amp; Finish
                    </button>
                  </div>

                  {/* ══════════════════════════════════════════════════════════
                      TAB 1: TEXT & TYPOGRAPHY
                  ══════════════════════════════════════════════════════════ */}
                  {studioTab === "text" && (
                    <div className="space-y-4 animate-in fade-in duration-150">

                      {/* Primary "+ Add Text" and Secondary "+ Add Image" Buttons */}
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={addTextLayer}
                          className="flex-1 min-h-[44px] px-4 py-2.5 bg-[#0b6fb3] hover:bg-[#095a92] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          <span>+ Add Text</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => imageLayerFileRef.current?.click()}
                          className="flex-1 min-h-[44px] px-4 py-2.5 bg-white hover:bg-zinc-50 border border-[#e2e8f0] text-zinc-800 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4 text-zinc-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>+ Add Image</span>
                        </button>
                        <input
                          ref={imageLayerFileRef}
                          type="file"
                          accept="image/*,.svg"
                          onChange={handleImageLayerFile}
                          className="hidden"
                        />
                      </div>

                      {/* Layers Pill Chips: Name, Title, Phone, Email, Address (Horizontally scrollable on mobile) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Layer Selection ({activeLayers.length})
                          </label>
                          <span className="text-[11px] text-zinc-400">Select to customize</span>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                          {activeLayers.map((layer) => {
                            const isSelected = (activeTextId === layer.id) || (!activeTextId && layer.id === "1");
                            const layerLabel =
                              layer.id === "1" ? "Name" :
                              layer.id === "2" ? "Title" :
                              layer.id === "3" ? "Phone" :
                              layer.id === "4" ? "Email" :
                              layer.id === "5" ? "Address" :
                              (layer.text.length > 12 ? layer.text.slice(0, 12) + "…" : layer.text || "Text");

                            return (
                              <button
                                key={layer.id}
                                type="button"
                                onClick={() => setActiveTextId(layer.id)}
                                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer flex items-center gap-2 shrink-0 ${isSelected
                                    ? "bg-[#0b6fb3] text-white border-[#0b6fb3] shadow-xs font-bold"
                                    : "bg-white border-[#e2e8f0] text-zinc-700 hover:border-zinc-300"
                                  }`}
                              >
                                <span>{layerLabel}</span>
                                {!requiredLayerIds.includes(layer.id) && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTextLayer(layer.id);
                                    }}
                                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold cursor-pointer transition-colors ${isSelected
                                        ? "bg-white/20 hover:bg-red-500 text-white"
                                        : "bg-zinc-100 hover:bg-red-500 hover:text-white text-zinc-600"
                                      }`}
                                    title="Delete Layer"
                                  >
                                    ✕
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active Layer Inspector Card */}
                      {activeLayer ? (
                        <div className="bg-[#f8fbfd] p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] space-y-4">

                          {/* Text Input (At least 16px to prevent iOS zoom) */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-zinc-700">Text Content</label>
                              {requiredLayerIds.includes(activeLayer.id) && (
                                <span className="text-[11px] font-semibold text-zinc-400">Card Field</span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={activeLayer.text}
                              onChange={(e) => updateTextLayer(activeLayer.id, { text: e.target.value })}
                              placeholder="Enter text..."
                              className="w-full min-h-[44px] px-3.5 py-2.5 bg-white rounded-xl border border-[#e2e8f0] text-base text-zinc-900 placeholder:text-zinc-400 focus:border-[#0b6fb3] focus:ring-2 focus:ring-[#0b6fb3]/20 focus:outline-none transition-all"
                            />
                          </div>

                          {/* Font Dropdown & Size Slider (Stacked vertically on mobile as full-width fields) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Font Family Dropdown */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-zinc-700">Font</label>
                              <select
                                value={activeLayer.fontFamily || "Inter"}
                                onChange={(e) => updateTextLayer(activeLayer.id, { fontFamily: e.target.value })}
                                className="w-full min-h-[44px] px-3 py-2 bg-white rounded-xl border border-[#e2e8f0] text-base sm:text-sm text-zinc-900 focus:border-[#0b6fb3] focus:ring-2 focus:ring-[#0b6fb3]/20 focus:outline-none cursor-pointer"
                              >
                                <option value="Inter">Inter (Clean Modern)</option>
                                <option value="Arial">Arial (Standard Sans)</option>
                                <option value="Helvetica">Helvetica (Classic)</option>
                                <option value="Georgia">Georgia (Refined Serif)</option>
                                <option value="Times New Roman">Times New Roman (Traditional)</option>
                                <option value="Playfair Display">Playfair Display (Luxury Serif)</option>
                                <option value="Montserrat">Montserrat (Geometric Sans)</option>
                                <option value="Courier New">Courier New (Monospace)</option>
                                <option value="Caveat">Caveat (Handwritten)</option>
                              </select>
                            </div>

                            {/* Size Slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-zinc-700">Size</label>
                                <span className="text-xs font-mono font-bold text-[#0b6fb3]">{activeLayer.fontSize}px</span>
                              </div>
                              <div className="min-h-[44px] flex items-center">
                                <input
                                  type="range"
                                  min={9}
                                  max={48}
                                  value={activeLayer.fontSize}
                                  onChange={(e) => updateTextLayer(activeLayer.id, { fontSize: Number(e.target.value) })}
                                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#0b6fb3]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Color Swatches plus "Custom #" (Horizontally scrollable on mobile) */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-700 block">Text Color</label>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                              {[
                                { label: "White", value: "#ffffff" },
                                { label: "Dark", value: "#18181b" },
                                { label: "Brand Blue", value: "#0b6fb3" },
                                { label: "Emerald", value: "#10b981" },
                                { label: "Amber", value: "#f59e0b" },
                                { label: "Rose", value: "#ef4444" },
                                { label: "Violet", value: "#8b5cf6" },
                                { label: "Slate", value: "#64748b" },
                              ].map((col) => {
                                const isColorActive = activeLayer.color?.toLowerCase() === col.value.toLowerCase();
                                return (
                                  <button
                                    key={col.value}
                                    type="button"
                                    onClick={() => updateTextLayer(activeLayer.id, { color: col.value })}
                                    className={`w-9 h-9 min-w-[36px] rounded-full border-2 transition-transform cursor-pointer shrink-0 ${isColorActive ? "border-[#0b6fb3] scale-110 shadow-sm ring-2 ring-[#0b6fb3]/30" : "border-zinc-300"
                                      }`}
                                    style={{ backgroundColor: col.value }}
                                    title={col.label}
                                    aria-label={`Select color ${col.label}`}
                                  />
                                );
                              })}

                              {/* Custom Hex Color Picker */}
                              <div className="flex items-center gap-1.5 bg-white border border-[#e2e8f0] rounded-xl px-2.5 py-1 shrink-0 min-h-[44px]">
                                <input
                                  type="color"
                                  value={activeLayer.color && activeLayer.color.startsWith("#") ? activeLayer.color : "#ffffff"}
                                  onChange={(e) => updateTextLayer(activeLayer.id, { color: e.target.value })}
                                  className="w-7 h-7 rounded-full border border-zinc-300 cursor-pointer p-0 bg-transparent shrink-0"
                                  title="Pick Custom Color"
                                />
                                <span className="text-xs font-mono font-bold text-zinc-700">
                                  {activeLayer.color?.toUpperCase() || "Custom #"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* B / I / U Toggles + Align Button */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[#e2e8f0] flex-wrap">
                            {/* Bold Button */}
                            <button
                              type="button"
                              onClick={() => updateTextLayer(activeLayer.id, {
                                fontWeight: activeLayer.fontWeight === "bold" ? "normal" : "bold"
                              })}
                              className={`min-w-[44px] min-h-[44px] px-3 rounded-xl border font-bold text-sm transition-all cursor-pointer flex items-center justify-center ${activeLayer.fontWeight === "bold"
                                  ? "bg-[#0b6fb3] text-white border-[#0b6fb3]"
                                  : "bg-white text-zinc-700 border-[#e2e8f0] hover:border-zinc-300"
                                }`}
                              title="Toggle Bold"
                            >
                              B
                            </button>

                            {/* Italic Button */}
                            <button
                              type="button"
                              onClick={() => updateTextLayer(activeLayer.id, {
                                fontStyle: activeLayer.fontStyle === "italic" ? "normal" : "italic"
                              })}
                              className={`min-w-[44px] min-h-[44px] px-3 rounded-xl border italic font-serif font-bold text-sm transition-all cursor-pointer flex items-center justify-center ${activeLayer.fontStyle === "italic"
                                  ? "bg-[#0b6fb3] text-white border-[#0b6fb3]"
                                  : "bg-white text-zinc-700 border-[#e2e8f0] hover:border-zinc-300"
                                }`}
                              title="Toggle Italic"
                            >
                              I
                            </button>

                            {/* Underline Button */}
                            <button
                              type="button"
                              onClick={() => updateTextLayer(activeLayer.id, {
                                textDecoration: activeLayer.textDecoration === "underline" ? "none" : "underline"
                              })}
                              className={`min-w-[44px] min-h-[44px] px-3 rounded-xl border underline font-bold text-sm transition-all cursor-pointer flex items-center justify-center ${activeLayer.textDecoration === "underline"
                                  ? "bg-[#0b6fb3] text-white border-[#0b6fb3]"
                                  : "bg-white text-zinc-700 border-[#e2e8f0] hover:border-zinc-300"
                                }`}
                              title="Toggle Underline"
                            >
                              U
                            </button>

                            {/* Align Button */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextAlign = activeLayer.textAlign === "left" ? "center" : activeLayer.textAlign === "center" ? "right" : "left";
                                updateTextLayer(activeLayer.id, { textAlign: nextAlign });
                              }}
                              className="min-h-[44px] px-3.5 rounded-xl border border-[#e2e8f0] bg-white text-zinc-700 hover:border-zinc-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                              title="Change Text Alignment"
                            >
                              <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
                              </svg>
                              <span className="capitalize">{activeLayer.textAlign || "left"}</span>
                            </button>

                            {/* More Options Link */}
                            <button
                              type="button"
                              onClick={() => setShowMoreTextOptions((o) => !o)}
                              className="min-h-[44px] px-3 ml-auto text-xs font-bold text-[#0b6fb3] hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>{showMoreTextOptions ? "Fewer options" : "More options"}</span>
                              <svg className={`w-3.5 h-3.5 transition-transform ${showMoreTextOptions ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>

                          {/* Expandable "More Options" Panel */}
                          {showMoreTextOptions && (
                            <div className="pt-3 border-t border-[#e2e8f0] space-y-3 animate-in fade-in duration-150">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">Letter Spacing</label>
                                  <input
                                    type="range"
                                    min={-2}
                                    max={10}
                                    value={activeLayer.letterSpacing ?? 0}
                                    onChange={(e) => updateTextLayer(activeLayer.id, { letterSpacing: Number(e.target.value) })}
                                    className="w-full accent-[#0b6fb3] cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">Text Transform</label>
                                  <div className="flex gap-1.5">
                                    {(["none", "uppercase", "lowercase"] as const).map((trans) => (
                                      <button
                                        key={trans}
                                        type="button"
                                        onClick={() => updateTextLayer(activeLayer.id, { textTransform: trans })}
                                        className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold border capitalize cursor-pointer ${activeLayer.textTransform === trans
                                            ? "bg-[#0b6fb3] text-white border-[#0b6fb3]"
                                            : "bg-white text-zinc-700 border-zinc-200"
                                          }`}
                                      >
                                        {trans === "none" ? "Normal" : trans}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400 italic">Select a layer above to customize typography and styling.</p>
                      )}

                    </div>
                  )}

                  {/* ══════════════════════════════════════════════════════════
                      TAB 2: BACKGROUND & PALETTE
                  ══════════════════════════════════════════════════════════ */}
                  {studioTab === "background" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                          Background Style ({editingBack ? "Back Side" : "Front Side"})
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            ["color", "Solid Color"],
                            ["gradient", "Linear Gradient"],
                            ["image", "Artwork Backdrop"],
                            ["image-gradient", "Image + Gradient"],
                          ] as const).map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() =>
                                setCardData((prev) =>
                                  editingBack ? { ...prev, backBgMode: mode } : { ...prev, bgMode: mode }
                                )
                              }
                              className={`min-h-[44px] py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center justify-center ${activeBgMode === mode
                                  ? "bg-[#0b6fb3] border-[#0b6fb3] text-white shadow-2xs"
                                  : "border-[#e2e8f0] text-zinc-700 hover:border-zinc-300 bg-white"
                                }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Swatches plus "Custom #" (Horizontally scrollable on mobile) */}
                      {activeBgMode !== "image" && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-700 block">Base Color</label>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {[
                              { label: "Dark Obsidian", value: "#141414" },
                              { label: "Pure White", value: "#ffffff" },
                              { label: "Navy Blue", value: "#0f2338" },
                              { label: "Brand Blue", value: "#0b6fb3" },
                              { label: "Forest Green", value: "#143826" },
                              { label: "Burgundy", value: "#38141e" },
                              { label: "Charcoal", value: "#27272a" },
                            ].map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() =>
                                  setCardData((prev) =>
                                    editingBack ? { ...prev, backBgColor: color.value } : { ...prev, bgColor: color.value }
                                  )
                                }
                                className={`w-9 h-9 min-w-[36px] rounded-full border-2 transition-transform cursor-pointer shrink-0 ${activeBgColor === color.value ? "border-[#0b6fb3] scale-110 shadow-sm ring-2 ring-[#0b6fb3]/30" : "border-zinc-300"
                                  }`}
                                style={{ backgroundColor: color.value }}
                                title={color.label}
                                aria-label={`Select base color ${color.label}`}
                              />
                            ))}

                            <div className="flex items-center gap-1.5 bg-white border border-[#e2e8f0] rounded-xl px-2.5 py-1 shrink-0 min-h-[44px]">
                              <input
                                type="color"
                                value={activeBgColor}
                                onChange={(e) =>
                                  setCardData((prev) =>
                                    editingBack ? { ...prev, backBgColor: e.target.value } : { ...prev, bgColor: e.target.value }
                                  )
                                }
                                className="w-7 h-7 rounded-full border border-zinc-300 cursor-pointer p-0 bg-transparent shrink-0"
                                title="Custom Background Color"
                              />
                              <span className="text-xs font-mono font-bold text-zinc-700">
                                {activeBgColor?.toUpperCase() || "Custom #"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Gradient Controls */}
                      {(activeBgMode === "gradient" || activeBgMode === "image-gradient") && (
                        <div className="space-y-2 bg-[#f8fbfd] p-3.5 rounded-2xl border border-[#e2e8f0]">
                          <label className="text-xs font-bold text-zinc-700 block">Gradient Direction &amp; Secondary Color</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={activeBgGradient}
                              onChange={(e) =>
                                setCardData((prev) =>
                                  editingBack ? { ...prev, backBgGradient: e.target.value } : { ...prev, bgGradient: e.target.value }
                                )
                              }
                              className="w-9 h-9 rounded-xl border border-zinc-300 cursor-pointer p-0 bg-transparent shrink-0"
                              title="Secondary color"
                            />
                            <div className="flex gap-1.5 flex-1">
                              {[
                                { label: "Horizontal", angle: 90 },
                                { label: "Vertical", angle: 180 },
                                { label: "Diagonal", angle: 135 },
                              ].map((item) => (
                                <button
                                  key={item.angle}
                                  type="button"
                                  onClick={() =>
                                    setCardData((prev) =>
                                      editingBack
                                        ? { ...prev, backBgGradientAngle: item.angle }
                                        : { ...prev, bgGradientAngle: item.angle }
                                    )
                                  }
                                  className={`flex-1 min-h-[40px] px-2 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${activeBgAngle === item.angle
                                      ? "bg-[#0b6fb3] border-[#0b6fb3] text-white shadow-2xs"
                                      : "border-zinc-200 text-zinc-700 bg-white hover:border-zinc-300"
                                    }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Backdrop Image Upload */}
                      {(activeBgMode === "image" || activeBgMode === "image-gradient") && (
                        <div className="space-y-3 bg-[#f8fbfd] p-3.5 rounded-2xl border border-[#e2e8f0]">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full min-h-[44px] py-2.5 px-3 border border-dashed border-[#0b6fb3] hover:bg-sky-50/50 text-xs sm:text-sm font-bold text-[#0b6fb3] rounded-xl cursor-pointer bg-white transition-colors"
                          >
                            {activeBgImage ? `Replace ${editingBack ? "Back" : "Front"} Backdrop Image` : `Upload ${editingBack ? "Back" : "Front"} Artwork`}
                          </button>
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

                          {activeBgImage && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-zinc-700">Artwork Opacity</label>
                                <span className="text-xs font-mono font-bold text-[#0b6fb3]">{cardData.imageOpacity}%</span>
                              </div>
                              <input
                                type="range"
                                min={10}
                                max={100}
                                value={cardData.imageOpacity}
                                onChange={(e) => setCardData((prev) => ({ ...prev, imageOpacity: Number(e.target.value) }))}
                                className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#0b6fb3]"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ══════════════════════════════════════════════════════════
                      TAB 3: PAPER & FINISH
                  ══════════════════════════════════════════════════════════ */}
                  {studioTab === "paper" && (
                    <div className="space-y-4 animate-in fade-in duration-150">

                      {/* Paper Stock Options */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                          Paper Stock &amp; Texture
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { name: "Matte Finish", desc: "Smooth anti-glare premium stock", badge: "Most Popular" },
                            { name: "Glossy Finish", desc: "Vibrant high-contrast protective sheen", badge: "Free" },
                            { name: "Soft Touch", desc: "Velvety suede-like luxury tactile feel", badge: "+$4.00" },
                            { name: "Linen Texture", desc: "Woven classic artisan paper finish", badge: "+$6.00" },
                          ].map((paper) => {
                            const isSelected = cardData.texture === paper.name;
                            return (
                              <button
                                key={paper.name}
                                type="button"
                                onClick={() => setCardData((prev) => ({ ...prev, texture: paper.name }))}
                                className={`min-h-[44px] p-3 rounded-xl border text-left cursor-pointer transition-all ${isSelected
                                    ? "border-[#0b6fb3] bg-sky-50/50 shadow-2xs ring-1 ring-[#0b6fb3]"
                                    : "border-[#e2e8f0] bg-white hover:border-zinc-300 text-zinc-700"
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-bold ${isSelected ? "text-[#0b6fb3]" : "text-zinc-900"}`}>{paper.name}</span>
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{paper.badge}</span>
                                </div>
                                <p className="text-[11px] text-zinc-500 mt-0.5">{paper.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Corner Shape */}
                      <div className="space-y-2 pt-2 border-t border-[#e2e8f0]">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                          Corner Cut
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "Standard Corners", desc: "Crisp 90-degree corporate edge" },
                            { name: "Rounded Corners", desc: "Smooth 5mm radius modern corners" },
                          ].map((corner) => {
                            const isSelected = cardData.corners === corner.name;
                            return (
                              <button
                                key={corner.name}
                                type="button"
                                onClick={() => setCardData((prev) => ({ ...prev, corners: corner.name }))}
                                className={`min-h-[44px] p-3 rounded-xl border text-left cursor-pointer transition-all ${isSelected
                                    ? "border-[#0b6fb3] bg-sky-50/50 shadow-2xs ring-1 ring-[#0b6fb3]"
                                    : "border-[#e2e8f0] bg-white hover:border-zinc-300 text-zinc-700"
                                  }`}
                              >
                                <span className={`block text-xs font-bold ${isSelected ? "text-[#0b6fb3]" : "text-zinc-900"}`}>{corner.name}</span>
                                <p className="text-[11px] text-zinc-500 mt-0.5">{corner.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Thickness & Weight */}
                      <div className="space-y-2 pt-2 border-t border-[#e2e8f0]">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                          Card Weight
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { name: "Standard 14pt", price: "Included" },
                            { name: "Premium 16pt", price: "+$3.00" },
                            { name: "Luxury 32pt", price: "+$8.00" },
                          ].map((thick) => {
                            const isSelected = cardData.thickness === thick.name;
                            return (
                              <button
                                key={thick.name}
                                type="button"
                                onClick={() => setCardData((prev) => ({ ...prev, thickness: thick.name }))}
                                className={`min-h-[44px] p-2.5 rounded-xl border text-center cursor-pointer transition-all ${isSelected
                                    ? "border-[#0b6fb3] bg-sky-50/50 shadow-2xs ring-1 ring-[#0b6fb3]"
                                    : "border-[#e2e8f0] bg-white hover:border-zinc-300 text-zinc-700"
                                  }`}
                              >
                                <span className={`block text-xs font-bold ${isSelected ? "text-[#0b6fb3]" : "text-zinc-900"}`}>{thick.name}</span>
                                <span className="block text-[10px] text-zinc-500 mt-0.5">{thick.price}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              STICKY BOTTOM BAR (DESKTOP: SINGLE ROW, TABLET: SINGLE ROW WITH ICON-ONLY PNG, MOBILE: TWO ROWS)
          ───────────────────────────────────────────────────────────── */}
          <div className="sticky bottom-0 z-40 bg-white border-t border-[#e2e8f0] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 xl:px-8 py-3">

              {/* ── DESKTOP & TABLET LAYOUT (MD & UP): SINGLE ROW ── */}
              <div className="hidden md:flex items-center justify-between gap-4">

                {/* Left: Live Price & Specification Line */}
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-black text-zinc-900 tracking-tight">
                    $29.00
                  </div>
                  <div className="text-xs text-zinc-500 leading-tight border-l border-[#e2e8f0] pl-3">
                    <span className="font-semibold text-zinc-800">100 cards</span>
                    <span className="mx-1">•</span>
                    <span>{cardData.texture || "Matte"}</span>
                    <span className="mx-1">•</span>
                    <span>{cardData.corners || "Standard corners"}</span>
                    <span className="mx-1">•</span>
                    <span className="text-emerald-700 font-medium">+ shipping</span>
                  </div>
                </div>

                {/* Right: Download PNG, Approval Checkbox, and Primary "Continue to Options" Button */}
                <div className="flex items-center gap-3">

                  {/* Desktop (XL+): Full Download PNG Button */}
                  <button
                    type="button"
                    disabled={downloadingProof}
                    onClick={() => handleDownloadProof("both")}
                    className="hidden xl:flex min-h-[44px] px-4 py-2 bg-white hover:bg-zinc-50 border border-[#e2e8f0] text-zinc-800 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    title="Download Proof PNG"
                  >
                    <svg className="w-4 h-4 text-[#0b6fb3]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{downloadingProof ? "Downloading..." : "Download PNG"}</span>
                  </button>

                  {/* Tablet (MD to XL): Icon-Only Download PNG Button */}
                  <button
                    type="button"
                    disabled={downloadingProof}
                    onClick={() => handleDownloadProof("both")}
                    className="flex xl:hidden min-h-[44px] min-w-[44px] p-2.5 bg-white hover:bg-zinc-50 border border-[#e2e8f0] text-zinc-800 rounded-xl items-center justify-center transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                    title="Download PNG"
                    aria-label="Download PNG"
                  >
                    <svg className="w-4 h-4 text-[#0b6fb3]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>

                  {/* Approval Checkbox */}
                  <label className="min-h-[44px] flex items-center gap-2.5 text-xs sm:text-sm text-zinc-700 font-medium cursor-pointer select-none px-2 py-1 rounded-lg hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={cardData.approved}
                      onChange={(e) => setCardData((prev) => ({ ...prev, approved: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-300 text-[#0b6fb3] focus:ring-[#0b6fb3] cursor-pointer"
                    />
                    <span>I approve my design</span>
                  </label>

                  {/* Primary "Continue to Options" Button */}
                  <button
                    type="button"
                    disabled={!cardData.approved}
                    onClick={() => setStep("preferences")}
                    className={`min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 ${cardData.approved
                        ? "bg-[#0b6fb3] hover:bg-[#095a92] text-white shadow-[#0b6fb3]/25"
                        : "bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none"
                      }`}
                  >
                    <span>Continue to Options</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                </div>

              </div>

              {/* ── MOBILE LAYOUT (UNDER 768PX): TWO ROWS + SAFE AREA ── */}
              <div className="flex md:hidden flex-col gap-2.5 pb-[calc(4px+env(safe-area-inset-bottom,0px))]">

                {/* Mobile Row 1: Live price on top with "Details" Link */}
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-zinc-900">$29.00</span>
                    <span className="text-xs text-zinc-500 font-medium">/ 100 cards</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDetailsModal(true)}
                    className="min-h-[44px] px-2 text-xs font-bold text-[#0b6fb3] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Details &amp; Proof</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Mobile Row 2: "I approve my design" checkbox placed above full-width Continue Button */}
                <div className="space-y-2">
                  <label className="min-h-[44px] flex items-center gap-2.5 text-xs text-zinc-700 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cardData.approved}
                      onChange={(e) => setCardData((prev) => ({ ...prev, approved: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-300 text-[#0b6fb3] focus:ring-[#0b6fb3] cursor-pointer"
                    />
                    <span>I approve my design</span>
                  </label>

                  <button
                    type="button"
                    disabled={!cardData.approved}
                    onClick={() => setStep("preferences")}
                    className={`w-full min-h-[48px] py-3 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 ${cardData.approved
                        ? "bg-[#0b6fb3] hover:bg-[#095a92] text-white shadow-[#0b6fb3]/25"
                        : "bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none"
                      }`}
                  >
                    <span>Continue to Options</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

              </div>

            </div>
          </div>

          {/* ── MOBILE DETAILS MODAL ── */}
          {showDetailsModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
              <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-[#e2e8f0] space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                  <h3 className="text-base font-black text-zinc-900">Order Details &amp; Proof</h3>
                  <button
                    type="button"
                    onClick={() => setShowDetailsModal(false)}
                    className="min-h-[44px] min-w-[44px] text-zinc-400 hover:text-zinc-700 flex items-center justify-center rounded-xl cursor-pointer"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500">Card Dimensions</span>
                    <span className="font-bold text-zinc-800">3.5 × 2.0 in (Standard)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500">Quantity</span>
                    <span className="font-bold text-zinc-800">100 cards</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500">Paper Texture</span>
                    <span className="font-bold text-zinc-800">{cardData.texture || "Matte Finish"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500">Corners</span>
                    <span className="font-bold text-zinc-800">{cardData.corners || "Standard Corners"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500">Print-Safe Status</span>
                    <span className="font-bold text-emerald-700">Active</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm font-black text-zinc-900 pt-2">
                    <span>Estimated Subtotal</span>
                    <span>$29.00</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={downloadingProof}
                    onClick={() => {
                      handleDownloadProof("both");
                      setShowDetailsModal(false);
                    }}
                    className="w-full min-h-[44px] py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#0b6fb3]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download High-Res Proof PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDetailsModal(false)}
                    className="w-full min-h-[44px] py-2.5 bg-[#0b6fb3] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Close &amp; Back to Studio
                  </button>
                </div>
              </div>
            </div>
          )}

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

        </div>
      );
}
