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
    if (typeof window === "undefined") return "category";
    const query = new URLSearchParams(window.location.search);
    return query.get("templateId") || query.get("designId") ? "upload" : "category";
  });

  useStepScroll(step, ["category", "upload", "review", "preferences", "cart"]);

  useEffect(() => {
    if (step !== "upload") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [step]);

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
    bgGradient: "#064FE0",
    bgGradientAngle: 135,
    backBgColor: initialData?.backBgColor || "#141414",
    backBgMode: initialData?.backBgMode || "color",
    backBgGradient: initialData?.backBgGradient || "#064FE0",
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
      .catch(() => {});
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
      .catch(() => {});
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
                .catch(() => {});
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
        .catch(() => {});
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
        .catch(() => {});
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
    } catch (_) {}
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
      } catch (_) {}
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
    <div className="min-h-screen bg-white font-sans text-zinc-900 flex flex-col justify-between">
      
      {step === "category" && (
        <div className="container mx-auto px-4 sm:px-6 py-8 flex-1">
          <h1 className="text-2xl font-extrabold text-zinc-900">Choose a product size</h1>
          <p className="text-base text-zinc-500 mt-1 mb-6">The preview uses this category&apos;s canvas before you design.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => {
                  applyCategory(cat);
                  setStep("upload");
                }}
                className="text-left bg-white border border-zinc-200 hover:border-[#064FE0] rounded-2xl overflow-hidden shadow-xs cursor-pointer"
              >
                <div className="aspect-[4/3] bg-zinc-100">
                  {cat.image ? (
                    <img src={mediaSrc(cat.image) || cat.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: cat.background_color || "#1a1a1a" }} />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-base font-bold text-zinc-900">{cat.name}</p>
                  {cat.canvas_width > 0 && cat.canvas_height > 0 && (
                    <p className="text-base text-zinc-500 mt-0.5">
                      {cat.canvas_width} × {cat.canvas_height} {cat.unit || "mm"}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
          {categories.length === 0 && (
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="mt-4 px-5 py-2.5 bg-[#064FE0] text-white text-base font-semibold rounded-lg cursor-pointer"
            >
              Continue with standard card
            </button>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 0: UPLOAD STUDIO SCREEN
      ───────────────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white overflow-hidden">
          
          {/* Top Action Toolbar */}
          <header className="h-16 border-b border-zinc-200 bg-white px-6 flex items-center justify-center shrink-0 shadow-2xs">
            <div className="flex items-center space-x-8 text-zinc-700">
              
              {/* Delete */}
              <button
                onClick={handleDelete}
                className="flex flex-col items-center justify-center hover:text-red-600 transition-colors group cursor-pointer"
                title="Delete design"
              >
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-base font-medium mt-0.5 text-zinc-600 group-hover:text-red-600">Delete</span>
              </button>

              {/* Rotate 90° */}
              <button
                onClick={handleRotate}
                className="flex flex-col items-center justify-center hover:text-[#064FE0] transition-colors group cursor-pointer"
                title="Rotate 90 degrees"
              >
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-[#064FE0] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-base font-medium mt-0.5 text-zinc-600 group-hover:text-[#064FE0]">Rotate 90°</span>
              </button>

              {/* Fit To Bleed */}
              <button
                onClick={() => setCardData((prev) => ({ ...prev, fitMode: "bleed" }))}
                className={`flex flex-col items-center justify-center transition-colors group cursor-pointer ${
                  cardData.fitMode === "bleed" ? "text-[#064FE0]" : "hover:text-[#064FE0]"
                }`}
                title="Fit artwork to bleed area"
              >
                <svg className={`w-5 h-5 ${cardData.fitMode === "bleed" ? "text-[#064FE0]" : "text-zinc-600 group-hover:text-[#064FE0]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7h8M8 17h8M12 3v18" />
                </svg>
                <span className={`text-base font-medium mt-0.5 ${cardData.fitMode === "bleed" ? "text-[#064FE0]" : "text-zinc-600 group-hover:text-[#064FE0]"}`}>
                  Fit To Bleed
                </span>
              </button>

              {/* Fit To Area */}
              <button
                onClick={() => setCardData((prev) => ({ ...prev, fitMode: "safe" }))}
                className={`flex flex-col items-center justify-center transition-colors group cursor-pointer ${
                  cardData.fitMode === "safe" ? "text-[#064FE0]" : "hover:text-[#064FE0]"
                }`}
                title="Fit artwork within safe zone"
              >
                <svg className={`w-5 h-5 ${cardData.fitMode === "safe" ? "text-[#064FE0]" : "text-zinc-600 group-hover:text-[#064FE0]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
                <span className={`text-base font-medium mt-0.5 ${cardData.fitMode === "safe" ? "text-[#064FE0]" : "text-zinc-600 group-hover:text-[#064FE0]"}`}>
                  Fit To Area
                </span>
              </button>

              {/* Save Draft */}
              <button
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="flex flex-col items-center justify-center hover:text-[#064FE0] transition-colors group cursor-pointer disabled:opacity-50"
                title="Save draft to customer dashboard"
              >
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-[#064FE0] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="text-base font-medium mt-0.5 text-zinc-600 group-hover:text-[#064FE0]">
                  {savingDraft ? "Saving..." : saveToast || "Save Draft"}
                </span>
              </button>

            </div>
          </header>

          {/* Main Studio Body */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-white">
            
            {/* Left Upload Workspace */}
            <div className="flex-1 min-h-0 bg-[#f4f4f6] px-6 py-4 flex flex-col items-center justify-center overflow-hidden">
              
              <div className="w-full max-w-xl flex flex-col items-center">
                
                <div className="text-center mb-2">
                  <h2 className="text-2xl font-extrabold text-zinc-900">Upload Your Design</h2>
                  <p className="text-base font-semibold text-[#064FE0] mt-0.5">Specs and templates</p>
                </div>

                {!cardData.uploadedImage ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="w-full flex flex-col items-center"
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
                        className={`relative overflow-hidden rounded-xl border-2 border-dashed shadow-xl flex flex-col items-center justify-center text-center px-6 cursor-pointer ${
                          isDragOver ? "border-[#064FE0]" : "border-white/80"
                        }`}
                      >
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-white/15 text-white flex items-center justify-center mb-3">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="text-base font-bold text-white mb-1">Drop artwork on this card</p>
                          <p className="text-base text-white/80">
                            {activeCanvasConfig.width} × {activeCanvasConfig.height} {activeCanvasConfig.unit}
                          </p>
                        </div>
                      </div>
                    </ScaledCardStage>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-base font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      Browse Files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.svg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-md flex flex-col items-center">
                    
                    <ScaledCardStage width={uploadFit.renderWidth} height={uploadFit.renderHeight}>
                      <div
                        style={{
                          width: `${uploadFit.renderWidth}px`,
                          height: `${uploadFit.renderHeight}px`,
                          ...cardBackdrop,
                        }}
                        className="relative overflow-hidden rounded-xl shadow-xl border border-zinc-700"
                      >
                        <img
                          src={cardData.uploadedImage}
                          alt="Uploaded artwork"
                          style={{ transform: `rotate(${cardData.rotation}deg)` }}
                          className={`absolute inset-0 w-full h-full ${
                            cardData.fitMode === "bleed" ? "object-cover" : "object-contain"
                          }`}
                        />
                      </div>
                    </ScaledCardStage>

                    <div className="mt-3 flex items-center justify-between w-full max-w-[340px] bg-white px-4 py-2.5 rounded-xl border border-zinc-200 shadow-2xs">
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <svg className="w-4 h-4 text-[#064FE0] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-base font-semibold text-zinc-700 truncate">{cardData.fileName || "Uploaded Artwork"}</span>
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-base font-bold text-[#064FE0] hover:underline cursor-pointer shrink-0"
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

                  </div>
                )}

                {hasSizeChoices && (
                  <div className="mt-3 w-full">
                    <p className="text-base font-bold text-zinc-700 mb-2 text-center">Choose a size</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {offeredSizes.map((size) => {
                        const selected =
                          Number(activeCanvasConfig.width) === size.width &&
                          Number(activeCanvasConfig.height) === size.height &&
                          activeCanvasConfig.unit === size.unit;
                        return (
                          <button
                            key={`${size.name}-${size.width}-${size.height}`}
                            type="button"
                            title={size.note || `${size.width} × ${size.height} ${size.unit}`}
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
                            className={`px-2.5 py-1.5 rounded-lg border text-left cursor-pointer ${
                              selected ? "border-[#064FE0] bg-sky-50" : "border-zinc-200 bg-white hover:border-zinc-400"
                            }`}
                          >
                            <span className="block text-base font-bold text-zinc-800">{size.name}</span>
                            <span className="block text-base font-mono text-zinc-500">
                              {size.width} × {size.height} {size.unit}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (needsCategory) {
                      setStep("category");
                      return;
                    }
                    setStep("review");
                  }}
                  className="mt-3 px-8 py-2.5 bg-[#064FE0] hover:bg-theme-darkblue text-white font-semibold text-base rounded-lg shadow-md transition-all cursor-pointer"
                >
                  {needsCategory ? "Choose a size first" : "Next"}
                </button>

              </div>

            </div>

            {/* Right Specs Sidebar */}
            <div className="w-full lg:w-80 min-h-0 border-t lg:border-t-0 lg:border-l border-zinc-200 px-4 py-3 overflow-hidden bg-white">
              
              <div className="space-y-2">
                
                <div className="flex items-center justify-between text-base">
                  <a
                  href={'/customize'}
                    // onClick={() => onClose ? onClose() : history.back()}
                    className="flex items-center space-x-1 font-semibold text-zinc-700 hover:text-zinc-900 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                  </a>

                  <a
                  href={'/customize'}
                    // onClick={() => onClose ? onClose() : history.back()}
                    className="text-zinc-500 hover:text-zinc-900 p-1 cursor-pointer"
                    aria-label="Close Studio"
                  >
                    ✕
                  </a>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-zinc-900">
                    {selectedCategory ? selectedCategory.name : "Specs and templates"}
                  </h2>
                  {/* <button
                    type="button"
                    onClick={() => setStep("category")}
                    className="text-base font-bold text-[#064FE0] cursor-pointer"
                  >
                    Change size
                  </button> */}
                </div>

                <div
                  className="relative mx-auto border-2 border-red-500/90 rounded-2xl p-2.5 shadow-md overflow-hidden bg-zinc-950/90"
                  style={{ width: `${Math.round(guideW)}px`, height: `${Math.round(guideH)}px` }}
                >
                  <div className="absolute top-1.5 left-2 z-10">
                    <span className="bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                      Bleed Area ({activeCanvasConfig.bleed ?? 0} {activeCanvasConfig.bleedUnit || activeCanvasConfig.unit})
                    </span>
                  </div>

                  <div className="w-full h-full border-2 border-sky-400 rounded-xl p-2.5 flex items-center justify-center relative bg-black/40">
                    <div className="absolute top-1.5 right-2 z-10">
                      <span className="bg-sky-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                        Trim ({activeCanvasConfig.width} × {activeCanvasConfig.height} {activeCanvasConfig.unit})
                      </span>
                    </div>

                    <div className="w-full h-full border-2 border-dashed border-emerald-400 rounded-lg flex items-center justify-center relative bg-emerald-500/10">
                      <span className="text-[10px] font-black text-emerald-300 tracking-wider bg-black/70 px-2 py-0.5 rounded uppercase shadow-xs">
                        Safe Area ({activeCanvasConfig.safe_area ?? 0} {activeCanvasConfig.safeAreaUnit || activeCanvasConfig.unit})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-zinc-900">Accepted file formats</h3>
                  <p className="text-base text-zinc-400 leading-relaxed font-mono">
                    .jpg, .jpeg, .jfif, .bmp, .png, .gif, .heic, .svg, .webp
                  </p>
                </div>

                {/* <div className="space-y-2">
                  <h3 className="text-base font-bold text-zinc-900">Templates</h3>
                  <div className="flex items-center gap-2">
                    {["PDF", "SVG", "Adobe Illustrator (.ai)"].map((tpl) => (
                      <button
                        key={tpl}
                        onClick={() => handleTemplateDownload(tpl)}
                        className="px-3 py-1.5 border border-zinc-300 hover:border-zinc-800 text-zinc-700 text-base font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        {tpl}
                      </button>
                    ))}
                  </div>
                  {downloadingTemplate && (
                    <p className="text-base text-[#064FE0] font-medium">
                      Downloading {downloadingTemplate} template...
                    </p>
                  )}
                </div> */}

                <div className="space-y-1 pt-1 border-t border-zinc-100">
                  <h3 className="text-base font-bold text-zinc-900">Rounded Corner Business Cards</h3>
                  <p className="text-base text-zinc-500 leading-relaxed">
                    To avoid white edges, extend your design to the bleed line – but keep text and images within the safety area.
                  </p>
                </div>

                <div className="space-y-2 text-base pt-1">
                  <div className="grid grid-cols-3 text-base font-bold text-zinc-400 border-b border-zinc-100 pb-1">
                    <span></span>
                    <span>Height</span>
                    <span>Width</span>
                  </div>
                  <div className="grid grid-cols-3 items-center">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                      <span className="font-semibold text-zinc-800">Canvas</span>
                    </div>
                    <div className="text-zinc-600 text-base">{activeCanvasConfig.height} {activeCanvasConfig.unit}</div>
                    <div className="text-zinc-600 text-base">{activeCanvasConfig.width} {activeCanvasConfig.unit}</div>
                  </div>
                  {/* <div className="grid grid-cols-3 items-center pt-1 border-t border-zinc-100 gap-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                      <span className="font-semibold text-zinc-800">Bleed</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={activeCanvasConfig.bleed ?? 0}
                      onChange={(e) => patchCanvas({ bleed: Number(e.target.value) || 0 })}
                      className="w-full border border-zinc-200 rounded-md px-1.5 py-1 text-base font-mono"
                    />
                    <select
                      value={activeCanvasConfig.bleedUnit || activeCanvasConfig.unit || "in"}
                      onChange={(e) => patchCanvas({ bleedUnit: asCanvasUnit(e.target.value, activeCanvasConfig.unit || "in") })}
                      className="border border-zinc-200 rounded-md px-1 py-1 text-base font-bold"
                    >
                      <option value="in">in</option>
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="px">px</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 items-center pt-1 border-t border-zinc-100 gap-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 inline-block" />
                      <span className="font-semibold text-zinc-800">Safety</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={activeCanvasConfig.safe_area ?? 0}
                      onChange={(e) => patchCanvas({ safe_area: Number(e.target.value) || 0 })}
                      className="w-full border border-zinc-200 rounded-md px-1.5 py-1 text-base font-mono"
                    />
                    <select
                      value={activeCanvasConfig.safeAreaUnit || activeCanvasConfig.unit || "in"}
                      onChange={(e) => patchCanvas({ safeAreaUnit: asCanvasUnit(e.target.value, activeCanvasConfig.unit || "in") })}
                      className="border border-zinc-200 rounded-md px-1 py-1 text-base font-bold"
                    >
                      <option value="in">in</option>
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="px">px</option>
                    </select>
                  </div> */}
                </div>

                <div className="pt-1">
                  <a
                    href="/guides/xprintz-user-guide.pdf"
                    download="Printgraphy-User-Guide.pdf"
                    className="text-base font-semibold text-zinc-800 hover:text-[#064FE0] underline cursor-pointer"
                  >
                    Download detailed guidelines
                  </a>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 1: DESIGN REVIEW (Printgraphy-STYLE UNLIMITED DRAGGABLE TEXT BUILDER)
      ───────────────────────────────────────────────────────────── */}
      {step === "review" && (
        <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300 flex-1">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
            <button
              onClick={() => setStep("upload")}
              className="inline-flex items-center gap-1.5 text-base font-semibold text-zinc-700 hover:text-zinc-900 cursor-pointer bg-zinc-100 px-3 py-1.5 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              {saveToast && (
                <span className="text-base font-semibold text-emerald-600 flex items-center gap-1">
                  ✓ {saveToast}{" "}
                  <Link href="/dashboard" className="underline font-bold hover:text-emerald-700">
                    View in Dashboard →
                  </Link>
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="px-4 py-2 border border-zinc-300 hover:border-zinc-800 text-zinc-700 hover:text-zinc-900 text-base font-semibold rounded-xl bg-white transition-all cursor-pointer disabled:opacity-50"
              >
                {savingDraft ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Interactive Canvas Preview (LG: 6 cols) */}
            <div className="lg:col-span-6 flex flex-col items-center gap-4 lg:sticky lg:top-4 lg:self-start lg:z-20 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              
              {/* View Mode Selector Pills (3D Realistic vs 2D Layout Editor) */}
              <div className="w-full flex items-center justify-between bg-white px-4 py-2 rounded-2xl border border-zinc-200 shadow-xs">
                <span className="text-base font-bold text-zinc-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#064FE0]" />
                  Preview Canvas
                </span>

                <div className="inline-flex p-1 bg-zinc-100 rounded-xl">
                  <button
                    onClick={() => setViewMode("3d")}
                    className={`px-3.5 py-1.5 text-base font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === "3d"
                        ? "bg-zinc-900 text-white shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <span>✨ 3D Realistic View</span>
                  </button>

                  <button
                    onClick={() => setViewMode("2d")}
                    className={`px-3.5 py-1.5 text-base font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === "2d"
                        ? "bg-[#064FE0] text-white shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <span>✏️ 2D Drag & Edit</span>
                  </button>
                </div>
              </div>

              {/* Main Card Viewport Box */}
              <div className="w-full bg-[#111318] rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center min-h-[460px] shadow-xl relative overflow-hidden border border-zinc-800">
                
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
                          className={`absolute pointer-events-none z-30 transition-all ${
                            line.type === "v"
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
                              className={`absolute z-10 cursor-grab active:cursor-grabbing touch-none rounded ${
                                activeTextId === layer.id ? "ring-2 ring-[#064FE0] shadow-md" : "hover:ring-1 hover:ring-white/50"
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
                                className={`absolute z-20 cursor-grab active:cursor-grabbing rounded transition-all touch-none ${
                                  isActive
                                    ? "ring-2 ring-[#064FE0] bg-[#064FE0]/20 shadow-md"
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
                              className={`absolute z-10 cursor-grab active:cursor-grabbing touch-none rounded ${
                                activeTextId === layer.id ? "ring-2 ring-[#064FE0] shadow-md" : "hover:ring-1 hover:ring-white/50"
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
                                className={`absolute z-20 cursor-grab active:cursor-grabbing rounded transition-all touch-none ${
                                  isActive
                                    ? "ring-2 ring-[#064FE0] bg-[#064FE0]/20 shadow-md"
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
                              className={`absolute z-10 cursor-grab active:cursor-grabbing touch-none rounded ${
                                activeTextId === layer.id ? "ring-2 ring-[#064FE0] shadow-md" : "hover:ring-1 hover:ring-white/50"
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
                                className={`absolute z-20 cursor-grab active:cursor-grabbing rounded transition-all touch-none ${
                                  isActive
                                    ? "ring-2 ring-[#064FE0] bg-[#064FE0]/20 shadow-md"
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

                    <p className="text-base text-zinc-400 mt-2 font-medium flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-[#064FE0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5a1.5 1.5 0 013 0v5.5m0 0a1.5 1.5 0 013 0v-3a1.5 1.5 0 013 0" />
                      </svg>
                      <span>Click &amp; drag any text layer directly on the card preview to reposition it!</span>
                    </p>
                  </div>
                )}

              </div>

              {/* Multi-side toggle pills */}
              {sidesCount > 1 && (
                <div className="flex flex-wrap justify-center gap-1 p-1 bg-white rounded-full border border-zinc-200 shadow-2xs max-w-full">
                  {sideLabels.map((label, idx) => (
                    <button
                      key={`customize-side-${idx}`}
                      type="button"
                      onClick={() => selectSide(idx)}
                      className={`px-5 py-1.5 text-base font-semibold rounded-full transition-all cursor-pointer ${
                        activeSideIndex === idx
                          ? "bg-[#064FE0] text-white shadow-xs"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

            </div>

            {/* Right Column: Unlimited Text Layers Manager Controls (LG: 6 cols) */}
            <div className="lg:col-span-6 space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200/80 shadow-xs">
              
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900">
                    Customization Studio
                  </h1>
                  <p className="text-base text-zinc-500 mt-0.5">
                    Add text or images (logo / profile). Click a layer tab to edit it.
                  </p>
                  {viewMode === "2d" && (
                    <p className="text-base text-zinc-400 mt-1">
                      Arrows move the selection (Shift moves farther). Ctrl+Z undo, Ctrl+Y redo, Ctrl+C copy, Ctrl+V paste.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={addTextLayer}
                    className="px-3.5 py-2 bg-[#064FE0] hover:bg-theme-darkblue text-white text-base font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={addImageLayer}
                    className="px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 text-base font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-[#064FE0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Add Image</span>
                  </button>
                  <input
                    ref={imageLayerFileRef}
                    type="file"
                    accept="image/*,.svg"
                    onChange={handleImageLayerFile}
                    className="hidden"
                  />
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/*,.svg"
                    onChange={handleLogoImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Business Website Input Field */}
              {/* <div className="bg-sky-50/50 p-3.5 rounded-2xl border border-sky-200/80 space-y-1">
                <label className="text-base font-bold text-sky-900 block">Business Website Link (Back Side)</label>
                <input
                  type="text"
                  value={cardData.website}
                  onChange={(e) => {
                    const website = e.target.value;
                    setCardData((prev) => ({ ...prev, website }));
                    setBackTextLayers((prev) =>
                      prev.map((layer) => (layer.id === "back-website" ? { ...layer, text: website } : layer))
                    );
                  }}
                  placeholder="www.zyora.com"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-sky-300 text-base font-mono text-zinc-900 focus:border-[#064FE0] focus:outline-none"
                />
              </div> */}

              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="flex flex-wrap gap-1.5">
                  {activeLayers.map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => setActiveTextId(layer.id)}
                      className={`px-2.5 py-1 rounded-lg text-base font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTextId === layer.id
                          ? "bg-[#064FE0] text-white border-[#064FE0]"
                          : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-400"
                      }`}
                    >
                      <span>{layer.text.length > 14 ? layer.text.slice(0, 14) + "..." : layer.text || "Text"}</span>
                      {!requiredLayerIds.includes(layer.id) && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTextLayer(layer.id);
                          }}
                          className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs transition-colors cursor-pointer ${
                            activeTextId === layer.id
                              ? "bg-white/20 hover:bg-red-500 text-white"
                              : "bg-zinc-200 hover:bg-red-500 hover:text-white text-zinc-600"
                          }`}
                          title="Delete Layer"
                        >
                          ×
                        </span>
                      )}
                    </div>
                  ))}
                  {activeImageLayers.map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => setActiveTextId(layer.id)}
                      className={`px-2.5 py-1 rounded-lg text-base font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTextId === layer.id
                          ? "bg-[#064FE0] text-white border-[#064FE0]"
                          : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-400"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3.5 h-3.5 rounded-sm overflow-hidden border border-white/40 bg-white/20 inline-block">
                          <img src={mediaSrc(layer.src) || layer.src} alt="" className="w-full h-full object-cover" />
                        </span>
                        {(layer.label || "Image").length > 12
                          ? `${(layer.label || "Image").slice(0, 12)}…`
                          : layer.label || "Image"}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteImageLayer(layer.id);
                        }}
                        className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs transition-colors cursor-pointer ${
                          activeTextId === layer.id
                            ? "bg-white/20 hover:bg-red-500 text-white"
                            : "bg-zinc-200 hover:bg-red-500 hover:text-white text-zinc-600"
                        }`}
                        title="Delete Layer"
                      >
                        ×
                      </span>
                    </div>
                  ))}
                </div>
                {activeImageLayer ? (
                  <ImageLayerControls
                    layer={activeImageLayer}
                    onChange={(patch) => updateImageLayer(activeImageLayer.id, patch)}
                    onReplace={replaceActiveImageLayer}
                    onDelete={() => deleteImageLayer(activeImageLayer.id)}
                  />
                ) : activeLayer ? (
                  <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/70 space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-base font-bold text-zinc-700">Layer Text</label>
                        {requiredLayerIds.includes(activeLayer.id) ? (
                          <span className="text-base font-semibold text-zinc-400">Required</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => deleteTextLayer(activeLayer.id)}
                            className="text-base text-red-500 hover:underline font-semibold cursor-pointer"
                          >
                            Delete Layer
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={activeLayer.text}
                        onChange={(e) => updateTextLayer(activeLayer.id, { text: e.target.value })}
                        placeholder="Enter text..."
                        className="w-full px-3 py-1.5 bg-white rounded-xl border border-zinc-300 text-base focus:border-[#064FE0] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-base font-bold text-zinc-500 block">Text Color</label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {textColors.map((col) => (
                          <button
                            key={col.value}
                            type="button"
                            onClick={() => updateTextLayer(activeLayer.id, { color: col.value })}
                            className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                              activeLayer.color === col.value ? "border-[#064FE0] scale-110 shadow-xs" : "border-zinc-300"
                            }`}
                            style={{ backgroundColor: col.value.split(" ")[0] }}
                            title={col.label}
                          />
                        ))}
                        <input
                          type="color"
                          value={activeLayer.color}
                          onChange={(e) => updateTextLayer(activeLayer.id, { color: e.target.value })}
                          className="w-6 h-6 rounded-full border border-zinc-300 cursor-pointer p-0 bg-transparent"
                          title="Custom Color"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-base font-bold text-zinc-700 block mb-1">Font Size ({activeLayer.fontSize}px)</label>
                      <input
                        type="range"
                        min={9}
                        max={48}
                        value={activeLayer.fontSize}
                        onChange={(e) => updateTextLayer(activeLayer.id, { fontSize: Number(e.target.value) })}
                        className="w-full accent-[#064FE0]"
                      />
                    </div>
                    <TextStyleControls
                      layer={activeLayer}
                      onChange={(patch) => updateTextLayer(activeLayer.id, patch)}
                    />
                  </div>
                ) : null}
              </div>

              {/* Background Color & Logo Section */}
              <div className="space-y-3.5 pt-3 border-t border-zinc-100">
                <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                  Card Colors
                </h3>

                {/* Background Color Selector */}
                <div className="space-y-2">
                  <label className="text-base font-bold text-zinc-700 block">
                    {editingBack ? "Back background" : "Front background"}
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {([
                      ["color", "One color"],
                      ["gradient", "Gradient"],
                      ["image", "Image"],
                      ["image-gradient", "Image + gradient"],
                    ] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setCardData((prev) =>
                            editingBack ? { ...prev, backBgMode: mode } : { ...prev, bgMode: mode }
                          )
                        }
                        className={`py-1.5 rounded-lg border text-base font-bold cursor-pointer ${
                          activeBgMode === mode
                            ? "bg-[#064FE0] border-[#064FE0] text-white"
                            : "border-zinc-300 text-zinc-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {activeBgMode !== "image" && (
                    <div className="flex flex-wrap items-center gap-2">
                      {bgColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() =>
                            setCardData((prev) =>
                              editingBack ? { ...prev, backBgColor: color.value } : { ...prev, bgColor: color.value }
                            )
                          }
                          className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                            activeBgColor === color.value ? "border-[#064FE0] scale-110 shadow-sm" : "border-zinc-300"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                      <input
                        type="color"
                        value={activeBgColor}
                        onChange={(e) =>
                          setCardData((prev) =>
                            editingBack ? { ...prev, backBgColor: e.target.value } : { ...prev, bgColor: e.target.value }
                          )
                        }
                        className="w-7 h-7 rounded-full border border-zinc-300 cursor-pointer p-0 bg-transparent"
                        title="Custom Color"
                      />
                    </div>
                  )}
                  {(activeBgMode === "gradient" || activeBgMode === "image-gradient") && (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={activeBgGradient}
                        onChange={(e) =>
                          setCardData((prev) =>
                            editingBack ? { ...prev, backBgGradient: e.target.value } : { ...prev, bgGradient: e.target.value }
                          )
                        }
                        className="w-8 h-8 rounded-lg border border-zinc-300 cursor-pointer p-0 bg-transparent"
                        title="Second color"
                      />
                      <div className="flex gap-1">
                        {[
                          { label: "→", angle: 90 },
                          { label: "↓", angle: 180 },
                          { label: "↘", angle: 135 },
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
                            className={`w-8 h-8 rounded-lg border text-base cursor-pointer ${
                              activeBgAngle === item.angle
                                ? "bg-[#064FE0] border-[#064FE0] text-white"
                                : "border-zinc-300 text-zinc-700"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(activeBgMode === "image" || activeBgMode === "image-gradient") && (
                    <>
                      <p className="text-base text-zinc-500">
                        A PNG keeps its transparent areas, so the {activeBgMode === "image-gradient" ? "gradient" : "color"} shows through.
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 px-3 border border-dashed border-zinc-300 hover:border-[#064FE0] text-base font-semibold text-zinc-700 rounded-xl cursor-pointer"
                      >
                        {activeBgImage ? `Change ${editingBack ? "back" : "front"} background image` : `Upload ${editingBack ? "back" : "front"} background image`}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </>
                  )}
                </div>

                {/* Background Image Opacity Slider */}
                {(activeBgMode === "image" || activeBgMode === "image-gradient") && activeBgImage && (
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-base font-bold text-zinc-700">Artwork Image Opacity</label>
                      <span className="text-base font-mono font-bold text-[#064FE0]">{cardData.imageOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={cardData.imageOpacity}
                      onChange={(e) => setCardData((prev) => ({ ...prev, imageOpacity: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#064FE0]"
                    />
                  </div>
                )}

              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={downloadingProof}
                  onClick={() => handleDownloadProof("current")}
                  className="w-full py-2.5 border border-zinc-300 hover:border-zinc-800 text-zinc-800 text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-zinc-50 hover:bg-white shadow-2xs disabled:opacity-50"
                >
                  <svg className="w-4 h-4 text-[#064FE0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{downloadingProof ? "Preparing image..." : `Download ${cardData.side === "back" ? "back" : "front"} PNG`}</span>
                </button>
                <button
                  type="button"
                  disabled={downloadingProof}
                  onClick={() => handleDownloadProof("both")}
                  className="w-full py-2 text-base font-semibold text-[#064FE0] hover:underline cursor-pointer disabled:opacity-50"
                >
                  Download front and back
                </button>
              </div>

              {shownVariations.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-zinc-100">
                  <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Variations</h3>
                  {shownVariations.map((vGroup) => {
                    const groupName = vGroup.name;
                    const selectedValName = selectedVariations[groupName] || (vGroup.values[0]?.name ?? "");
                    return (
                      <div key={vGroup._id || groupName}>
                        <p className="text-base font-bold text-zinc-900">
                          {groupName}
                          <span className="ml-2 text-base font-bold text-[#064FE0]">({selectedValName})</span>
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {vGroup.values.map((val) => {
                            const isSelected = selectedValName === val.name;
                            const priceText = !val.price || val.price === 0 ? "Free" : `+$${val.price.toFixed(2)}`;
                            return (
                              <button
                                key={val._id || val.name}
                                type="button"
                                onClick={() => {
                                  setSelectedVariations((prev) => ({ ...prev, [groupName]: val.name }));
                                  if (groupName.toLowerCase().includes("corner")) {
                                    setCardData((prev) => ({ ...prev, corners: val.name }));
                                  } else if (groupName.toLowerCase().includes("paper") || groupName.toLowerCase().includes("stock") || groupName.toLowerCase().includes("thick")) {
                                    setCardData((prev) => ({ ...prev, thickness: val.name }));
                                  }
                                }}
                                className={`p-2.5 text-left rounded-xl border text-base transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-[#064FE0] bg-sky-50/50 text-[#064FE0] font-bold"
                                    : "border-zinc-200 text-zinc-700 hover:border-zinc-300 bg-white"
                                }`}
                              >
                                <span className="block font-bold">{val.name}</span>
                                <span className={`text-base ${val.price ? "text-zinc-500" : "text-emerald-700"}`}>{priceText}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Approval Checkbox */}
              <label className="flex items-center gap-2.5 text-base text-zinc-600 font-medium cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={cardData.approved}
                  onChange={(e) => setCardData((prev) => ({ ...prev, approved: e.target.checked }))}
                  className="w-4 h-4 rounded border-zinc-300 text-theme-blue focus:ring-theme-blue cursor-pointer"
                />
                <span>I&apos;ve reviewed and approve my design.</span>
              </label>

              {/* Finish Action Button */}
              <button
                type="button"
                disabled={!cardData.approved}
                onClick={() => setStep("preferences")}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-all cursor-pointer shadow-md ${
                  cardData.approved
                    ? "bg-[#064FE0] hover:bg-theme-darkblue text-white shadow-theme-blue/20"
                    : "bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none"
                }`}
              >
                Finish
              </button>

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
                      className={`absolute inset-0 w-full h-full pointer-events-none ${
                        cardData.fitMode === "bleed" ? "object-cover" : "object-contain"
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
                      className={`px-5 py-1.5 text-base font-semibold rounded-full transition-all cursor-pointer ${
                        activeSideIndex === idx
                          ? "bg-[#064FE0] text-white shadow-xs"
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
                          <div className="w-8 h-8 rounded-lg bg-[#064FE0] text-white flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-base font-bold text-zinc-900 block">Select {groupName}</span>
                            <span className="text-base text-[#064FE0] font-extrabold">{selectedValName}</span>
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
                                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                    isSelected
                                      ? "border-[#064FE0] bg-sky-50/40 shadow-2xs ring-1 ring-[#064FE0]/30"
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
                        <div className="w-8 h-8 rounded-lg bg-[#064FE0] text-white flex items-center justify-center">
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
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                cardData.thickness === item.name
                                  ? "border-[#064FE0] bg-sky-50/40"
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
                        <div className="w-8 h-8 rounded-lg bg-[#064FE0] text-white flex items-center justify-center">
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
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                cardData.texture === item.name
                                  ? "border-[#064FE0] bg-sky-50/40"
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
                        <div className="w-8 h-8 rounded-lg bg-[#064FE0] text-white flex items-center justify-center">
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
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                cardData.corners === item.name
                                  ? "border-[#064FE0] bg-sky-50/40"
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
                  className="px-7 py-3 bg-[#064FE0] hover:bg-theme-darkblue text-white text-base font-bold rounded-full shadow-md transition-all cursor-pointer disabled:opacity-50"
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
                className="w-full py-3.5 bg-[#064FE0] hover:bg-theme-darkblue text-white text-base font-bold rounded-xl shadow-md transition-all cursor-pointer"
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
