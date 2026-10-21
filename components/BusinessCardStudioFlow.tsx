"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ThreeDCardPreview from "./ThreeDCardPreview";
import ScaledCardStage from "./ScaledCardStage";
import { calculateFitDimensions, getCanvasAspectRatio, CanvasUnit, PrintSize, asCanvasUnit } from "@/lib/canvasUtils";
import CanvasGuideLinesOverlay from "./CanvasGuideLinesOverlay";
import MockupCanvasStage from "./MockupCanvasStage";
import { cleanGuideLines } from "@/lib/guideLines";
import { asCanvasType, cleanPrintArea } from "@/lib/mockupCanvas";
import PurchaseTemplateModal from "./PurchaseTemplateModal";
import TemplateArtwork from "./TemplateArtwork";
import TextStyleControls from "./TextStyleControls";
import CardDesignObjects from "./CardDesignObjects";
import { mediaSrc } from "@/lib/mediaUrl";
import CardOrderFields from "./CardOrderFields";
import { applyEmployeeToLayers, employeeCardFields, lockTemplateFields, sheetFieldsFromLayers, withCurrentSamples, type EmployeeCard, type SheetField } from "@/lib/employeeSheet";
import { registerHref, viewerIsSignedIn } from "@/lib/accountGate";
import { useStepScroll } from "@/components/useStepScroll";
import SpacingGapOverlay from "./SpacingGapOverlay";
import { clampPercent, use2dShortcuts, useEditorHistory } from "./useEditorShortcuts";
import { IVariation, IVariationValue } from "@/models/Product";
import {
  STUDIO_LAYOUT,
  backLayersFromDesign,
  designBackdrop,
  logoPoint,
  userCardBackdrop,
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

// ── Template types (from admin API) ─────────────────────────────
interface CatalogCategory {
  _id?: string;
  name: string;
  slug?: string;
  canvas_width: number;
  canvas_height: number;
  unit: CanvasUnit;
  orientation?: "landscape" | "portrait";
  bleed?: number;
  bleedUnit?: CanvasUnit;
  safe_area?: number;
  safeAreaUnit?: CanvasUnit;
  printSizes?: PrintSize[];
  side_mode?: "single" | "double" | "multi";
  sides_count?: number;
  sides_names?: string[];
  supports_back_side?: boolean;
  guide_lines?: unknown;
  canvas_type?: "flat" | "dieline" | "mockup";
  mockup_image?: string;
  print_area?: unknown;
  background_color?: string;
}

interface ApiTemplate {
  _id: string;
  title: string;
  description: string;
  category: string;
  isPaid: boolean;
  price: number;
  thumbnail: string;
  tags: string[];
  canvas_config?: any;
  canvasConfig?: any;
  front_design?: any;
  back_design?: any;
  side_designs?: any[];
  supports_back_side?: boolean;
  templateData?: any;
}

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
  width?: number;
  widthMode?: "inline" | "full" | "custom";
}

type EditorSnap = {
  textLayers: TextLayer[];
  backTextLayers: TextLayer[];
  logoX: number;
  logoY: number;
  backLogoX: number;
  backLogoY: number;
  layoutOverrides: Record<string, { x: number; y: number; width: number; height: number }>;
  activeTextId: string | null;
  gapOwner: "text" | "logo";
};

interface FullTemplate extends ApiTemplate {
  templateData?: {
    bgColor?: string;
    textColor?: string;
    logoPosition?: string;
    logoText?: string;
    logoSize?: number;
    logoImage?: string;
    textLayers?: TextLayer[];
  };
}

interface CardDesignData {
  name: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  side: "front" | "back";
  thickness: string;
  texture: string;
  corners: string;
  quantity: number;
  approved: boolean;
  uploadedImage: string | null;
}

const DEFAULT_TEXT_LAYERS: TextLayer[] = [
  { id: "1", text: "Stephen", x: 10, y: 28, fontSize: 24, color: "#ffffff", fontWeight: "bold" },
  { id: "2", text: "Manager", x: 10, y: 46, fontSize: 13, color: "#38bdf8", fontWeight: "normal" },
  { id: "3", text: "+1 (555) 123-4567", x: 10, y: 76, fontSize: 10, color: "#e4e4e7", fontWeight: "normal" },
  { id: "4", text: "stephen@zyora.com", x: 42, y: 76, fontSize: 10, color: "#e4e4e7", fontWeight: "normal" },
  { id: "5", text: "Poissy 15 rue de la Boëtie", x: 68, y: 76, fontSize: 10, color: "#e4e4e7", fontWeight: "normal" },
];

function defaultStudioFields() {
  return sheetFieldsFromLayers([
    ...DEFAULT_TEXT_LAYERS,
    ...backLayersFromDesign(undefined, {
      website: "www.zyora.com",
      email: "stephen@zyora.com",
      name: "Stephen",
      showEmail: true,
    }),
  ]);
}

export default function BusinessCardStudioFlow({
  initialData,
  onClose,
}: {
  initialData?: Partial<CardDesignData>;
  onClose?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateIdParam = searchParams?.get("templateId");
  const productIdParam = searchParams?.get("productId");
  const designIdParam = searchParams?.get("designId");
  const categoryParam = searchParams?.get("category");
  const searchParam = searchParams?.get("search")?.trim() || "";

  const [dbVariations, setDbVariations] = useState<IVariation[]>([]);
  const [basePrice, setBasePrice] = useState<number>(0.15);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

  useEffect(() => {
    const targetId = productIdParam || categoryParam || "business-cards";
    fetch(`/api/products/${targetId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.product) {
          if (data.product.price && typeof data.product.price === "number") {
            setBasePrice(data.product.price);
          }
          if (Array.isArray(data.product.variations)) {
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
  }, [productIdParam, categoryParam, searchParams]);

  // Step state: "browse" | "review" | "preferences" | "cart"
  const [step, setStep] = useState<"browse" | "review" | "preferences" | "cart">("browse");
  useStepScroll(step, ["browse", "review", "preferences", "cart"]);

  // View Mode: "3d" | "2d"
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [previewShape, setPreviewShape] = useState<"auto" | "box" | "card" | "rounded" | "circle" | "oval" | "square">("auto");

  // Templates fetched from admin API
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [filterPaid, setFilterPaid] = useState<"" | "free" | "paid">("");
  const [filterCategory, setFilterCategory] = useState(categoryParam || "");
  const [templateSearch, setTemplateSearch] = useState("");
  const [productMatches, setProductMatches] = useState<{ _id: string; name: string; slug?: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templateIdParam || null);
  const [selectedTemplate, setSelectedTemplate] = useState<FullTemplate | null>(null);
  const [savedCanvasConfig, setSavedCanvasConfig] = useState<any>(null);

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter((tpl) => {
      const matchTitle = tpl.title?.toLowerCase().includes(q);
      const matchCat = tpl.category?.toLowerCase().includes(q);
      const matchDesc = tpl.description?.toLowerCase().includes(q);
      const matchTags = Array.isArray(tpl.tags) && tpl.tags.some((tag) => tag?.toLowerCase().includes(q));
      return matchTitle || matchCat || matchDesc || matchTags;
    });
  }, [templates, templateSearch]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [employees, setEmployees] = useState<EmployeeCard[]>([]);

  const [sheetFields, setSheetFields] = useState<SheetField[]>(() => defaultStudioFields());
  const [requiredLayerIds, setRequiredLayerIds] = useState<string[]>(() =>
    defaultStudioFields().flatMap((field) => field.layerIds)
  );

  const useEmployeeOnCard = (employee: EmployeeCard) => {
    setCardData((prev) => ({ ...prev, ...employeeCardFields(employee) }));
    setTextLayers((prev) => applyEmployeeToLayers(prev, employee, sheetFields));
    setBackTextLayers((prev) => applyEmployeeToLayers(prev, employee, sheetFields));
  };

  // Styling & Design State
  const [bgColor, setBgColor] = useState<string>("#18181b");
  const [backBgColor, setBackBgColor] = useState<string>("#141414");
  const [bgMode, setBgMode] = useState<"template" | "color" | "gradient" | "image" | "image-gradient">("template");
  const [bgGradient, setBgGradient] = useState("#2196D2");
  const [bgGradientAngle, setBgGradientAngle] = useState(135);
  const [frontBgImage, setFrontBgImage] = useState<string | null>(null);
  const [backBgImage, setBackBgImage] = useState<string | null>(null);
  const [imageOpacity, setImageOpacity] = useState(100);
  const bgFileRef = useRef<HTMLInputElement | null>(null);
  const [textColor, setTextColor] = useState<string>("#ffffff");

  // Logo customization state
  const [logoText, setLogoText] = useState<string>("");
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const logoEditIdRef = useRef<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<"top-left" | "top-right" | "center" | "bottom-right">("top-right");
  const [logoX, setLogoX] = useState(70);
  const [logoY, setLogoY] = useState(8);
  const [backLogoPosition, setBackLogoPosition] = useState<"top-left" | "top-right" | "center" | "bottom-right">("top-right");
  const [backLogoX, setBackLogoX] = useState(70);
  const [backLogoY, setBackLogoY] = useState(8);
  const [logoSize, setLogoSize] = useState<number>(36);

  // Draggable Text Layers State
  const [textLayers, setTextLayers] = useState<TextLayer[]>(DEFAULT_TEXT_LAYERS);
  const [backTextLayers, setBackTextLayers] = useState<TextLayer[]>(() =>
    backLayersFromDesign(undefined, {
      website: "www.zyora.com",
      email: "stephen@zyora.com",
      name: "Stephen",
      showEmail: true,
    }) as TextLayer[]
  );
  /** Editable text for sides beyond front/back (index 0 in this array = side index 2). */
  const [extraSideTextLayers, setExtraSideTextLayers] = useState<TextLayer[][]>([]);
  const [imageLayers, setImageLayers] = useState<ImageLayer[]>([]);
  const [backImageLayers, setBackImageLayers] = useState<ImageLayer[]>([]);
  const [extraSideImageLayers, setExtraSideImageLayers] = useState<ImageLayer[][]>([]);
  const [activeSideIndex, setActiveSideIndex] = useState(0);
  const [activeTextId, setActiveTextId] = useState<string | null>("1");
  const imageLayerFileRef = useRef<HTMLInputElement | null>(null);
  const pendingImageLayerIdRef = useRef<string | null>(null);
  const [cardData, setCardData] = useState<CardDesignData>({
    name: initialData?.name || "Stephen",
    title: initialData?.title || "Manager",
    phone: initialData?.phone || "+1 (555) 123-4567",
    email: initialData?.email || "stephen@zyora.com",
    address: initialData?.address || "15 rue de la Boëtie, Poissy",
    website: "www.zyora.com",
    side: "front",
    thickness: "Standard",
    texture: "Smooth",
    corners: "Rounded",
    quantity: 100,
    approved: false,
    uploadedImage: initialData?.uploadedImage || null,
  });

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
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [layoutOverrides, setLayoutOverrides] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const logoDragCleanup = useRef<(() => void) | null>(null);
  const [alignmentLines, setAlignmentLines] = useState<{ type: "v" | "h"; pos: number }[]>([]);
  const [selectionGap, setSelectionGap] = useState<SelectionGap | null>(null);
  const gapOwnerRef = useRef<"text" | "logo">("text");
  const textClipboardRef = useRef<TextLayer | null>(null);
  const editorHistory = useEditorHistory<EditorSnap>();
  const cardPreviewRef = useRef<HTMLDivElement | null>(null);
  const dragNodeRef = useRef<HTMLElement | null>(null);

  // Draft saving state
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(designIdParam || null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveToast, setSaveToast] = useState("");

  // Paid template purchase states
  const [purchasedTemplateIds, setPurchasedTemplateIds] = useState<string[]>([]);
  const [purchaseModalTemplate, setPurchaseModalTemplate] = useState<ApiTemplate | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ApiTemplate | null>(null);
  const [previewSideIndex, setPreviewSideIndex] = useState(0);

  const activeCanvasConfig = savedCanvasConfig || selectedTemplate?.canvas_config || (selectedTemplate as any)?.canvasConfig || {
    width: 105,
    height: 60,
    unit: "mm",
    orientation: "landscape",
    bleed: 3,
    safe_area: 3,
  };
  const patchCanvas = (patch: Record<string, unknown>) => {
    setSavedCanvasConfig({ ...activeCanvasConfig, ...patch });
  };
  const fitDims = calculateFitDimensions(activeCanvasConfig as any, 520, 420);

  // Computed live front design that combines non-text template shapes/graphics with live editable textLayers and background
  const userBackdrop = (side: "front" | "back") => {
    const image = side === "front" ? frontBgImage : backBgImage;
    return userCardBackdrop(bgMode, { image, gradient: bgGradient, angle: bgGradientAngle, opacity: imageOpacity });
  };

  const currentFrontDesign = useMemo(() => {
    const shapeObjects = withImageOverrides(selectedTemplate?.front_design?.objects, imageOverrides)
      .filter((o: any) => o.type !== "text" && !isArtworkImage(o))
      .map((o: any) => {
        const box = o?.id ? layoutOverrides[`front:${o.id}`] || layoutOverrides[o.id] : undefined;
        return box ? { ...o, ...box } : o;
      });
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
      width: tl.width,
      widthMode: tl.widthMode,
      letterSpacing: tl.letterSpacing,
      underline: tl.underline,
      opacity: tl.opacity,
      textTransform: tl.textTransform,
    }));
    return {
      ...selectedTemplate?.front_design,
      bgColor: bgMode === "template" ? selectedTemplate?.front_design?.bgColor || bgColor : bgColor,
      ...designBackdrop(bgMode === "color" ? null : selectedTemplate?.front_design),
      ...userBackdrop("front"),
      objects: [...shapeObjects, ...imageLayers.map(imageLayerToObject), ...dynamicTextObjects],
    };
  }, [selectedTemplate?.front_design, textLayers, imageLayers, bgColor, imageOverrides, layoutOverrides, bgMode, bgGradient, bgGradientAngle, frontBgImage, imageOpacity]);

  const handleLogoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetId =
      logoEditIdRef.current ||
      (selectedTemplate?.front_design?.objects || []).find((obj: any) => isArtworkImage(obj))?.id;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      const preview = event.target.result as string;
      if (targetId) setImageOverrides((prev) => ({ ...prev, [targetId]: preview }));
      else setLogoImage(preview);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        if (targetId) setImageOverrides((prev) => ({ ...prev, [targetId]: data.url }));
        else setLogoImage(data.url);
      }
    } catch (err) {
      console.error("S3 logo upload failed:", err);
    } finally {
      logoEditIdRef.current = null;
    }
  };

  useEffect(() => {
    if (productIdParam && !filterCategory) {
      fetch(`/api/products/${productIdParam}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.product) {
            const catName = data.product.name || data.product.category;
            if (catName) {
              setFilterCategory(catName);
            }
          }
        })
        .catch(() => {});
    }
  }, [productIdParam, filterCategory]);

  const [allCategoryTabs, setAllCategoryTabs] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);
  const templateCategory = catalog.find(
    (cat) => cat.name === selectedTemplate?.category || cat.slug === selectedTemplate?.category
  );
  const canvasGuideLines = (() => {
    const fromTemplate = cleanGuideLines(activeCanvasConfig.guide_lines);
    if (fromTemplate.length > 0) return fromTemplate;
    return cleanGuideLines((templateCategory as { guide_lines?: unknown } | undefined)?.guide_lines);
  })();
  const isMockupProduct =
    asCanvasType(
      (activeCanvasConfig as { canvas_type?: unknown }).canvas_type || templateCategory?.canvas_type,
      "flat"
    ) === "mockup";
  const mockupImageSrc = String(
    (activeCanvasConfig as { mockup_image?: string }).mockup_image || templateCategory?.mockup_image || ""
  ).trim();
  const mockupPrintArea = cleanPrintArea(
    (activeCanvasConfig as { print_area?: unknown }).print_area || templateCategory?.print_area
  );
  const offeredSizes: PrintSize[] = [
    ...(templateCategory
      ? [{
          name: "Category default",
          width: templateCategory.canvas_width,
          height: templateCategory.canvas_height,
          unit: templateCategory.unit,
          bleed: templateCategory.bleed ?? 0,
          bleedUnit: templateCategory.bleedUnit || templateCategory.unit,
          safeArea: templateCategory.safe_area ?? 0,
          safeAreaUnit: templateCategory.safeAreaUnit || templateCategory.unit,
        }]
      : []),
    ...(templateCategory?.printSizes || []),
  ];

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories)) {
          const printOnly = data.categories.filter(
            (c: CatalogCategory & { canvas_type?: string }) => c.canvas_type !== "mockup"
          );
          setCatalog(printOnly);
          const names = printOnly.map((c: CatalogCategory) => c.name).filter(Boolean);
          setAllCategoryTabs((prev) => Array.from(new Set([...prev, ...names])));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "30" });
    if (filterPaid === "free") params.set("isPaid", "false");
    if (filterPaid === "paid") params.set("isPaid", "true");
    if (filterCategory) params.set("category", filterCategory);
    if (searchParam) params.set("search", searchParam);

    setTemplatesLoading(true);
    fetch(`/api/templates?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const fetched = data.templates ?? [];
          setTemplates(fetched);
          const catNames = fetched.map((t: any) => t.category).filter(Boolean);
          setAllCategoryTabs((prev) => Array.from(new Set([...prev, ...catNames])));
        }
      })
      .finally(() => setTemplatesLoading(false));
  }, [filterPaid, filterCategory, searchParam]);

  useEffect(() => {
    if (!searchParam) {
      setProductMatches([]);
      return;
    }
    fetch(`/api/products?search=${encodeURIComponent(searchParam)}&limit=8`)
      .then((r) => r.json())
      .then((data) => {
        setProductMatches(data.success && Array.isArray(data.products) ? data.products : []);
      })
      .catch(() => setProductMatches([]));
  }, [searchParam]);

  // Fetch current user session to determine already unlocked/purchased templates
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user && Array.isArray(data.user.purchasedTemplates)) {
          setPurchasedTemplateIds(data.user.purchasedTemplates);
        }
      })
      .catch(() => {});
  }, []);

  // Load design draft if designIdParam is present
  useEffect(() => {
    if (designIdParam) {
      setCurrentDesignId(designIdParam);
      fetch(`/api/designs/${designIdParam}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.design) {
            const d = data.design;
            if (d.designData) {
              if (d.designData.cardData) {
                setCardData((prev) => ({ ...prev, ...d.designData.cardData }));
              }
              if (Array.isArray(d.designData.employees)) setEmployees(d.designData.employees);
              if (Array.isArray(d.designData.textLayers)) {
                setTextLayers(d.designData.textLayers);
              }
              if (Array.isArray(d.designData.backTextLayers) && d.designData.backTextLayers.length) {
                setBackTextLayers(d.designData.backTextLayers);
              }
              if (Array.isArray(d.designData.extraSideTextLayers)) {
                setExtraSideTextLayers(d.designData.extraSideTextLayers);
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
              if (d.designData.bgColor) setBgColor(d.designData.bgColor);
              if (d.designData.backBgColor) setBackBgColor(d.designData.backBgColor);
              if (d.designData.bgMode) setBgMode(d.designData.bgMode);
              if (d.designData.bgGradient) setBgGradient(d.designData.bgGradient);
              if (d.designData.bgGradientAngle) setBgGradientAngle(d.designData.bgGradientAngle);
              if (d.designData.frontBgImage) setFrontBgImage(d.designData.frontBgImage);
              if (d.designData.backBgImage) setBackBgImage(d.designData.backBgImage);
              if (d.designData.imageOpacity) setImageOpacity(d.designData.imageOpacity);
              if (d.designData.textColor) setTextColor(d.designData.textColor);
              if (d.designData.logoText) setLogoText(d.designData.logoText);
              if (d.designData.logoPosition) setLogoPosition(d.designData.logoPosition);
              if (typeof d.designData.logoX === "number") setLogoX(d.designData.logoX);
              if (typeof d.designData.logoY === "number") setLogoY(d.designData.logoY);
              if (d.designData.backLogoPosition) setBackLogoPosition(d.designData.backLogoPosition);
              else if (d.designData.logoPosition) setBackLogoPosition(d.designData.logoPosition);
              if (typeof d.designData.backLogoX === "number") setBackLogoX(d.designData.backLogoX);
              else if (typeof d.designData.logoX === "number") setBackLogoX(d.designData.logoX);
              if (typeof d.designData.backLogoY === "number") setBackLogoY(d.designData.backLogoY);
              else if (typeof d.designData.logoY === "number") setBackLogoY(d.designData.logoY);
              if (d.designData.logoImage) setLogoImage(d.designData.logoImage);
              setImageOverrides({
                ...(d.designData.imageOverrides || {}),
                ...imageOverridesFromDesign(d.designData.front_design, d.designData.back_design),
              });
              if (d.designData.logoSize) setLogoSize(d.designData.logoSize);
              if (d.designData.layoutOverrides) setLayoutOverrides(d.designData.layoutOverrides);

              // Restore saved canvas dimensions & category
              if (d.designData.canvas_config) {
                setSavedCanvasConfig(d.designData.canvas_config);
              }
            }

            // If draft was created from a template, fetch the template as well
            if (d.templateId) {
              setSelectedTemplateId(d.templateId);
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
                description: "",
                category: d.designData.category || "Custom",
                isPaid: false,
                price: 0,
                thumbnail: d.thumbnail || "",
                tags: [],
                canvas_config: d.designData.canvas_config,
                front_design: d.designData.front_design,
                back_design: d.designData.back_design,
              });
            }
            setStep("review");
          }
        })
        .catch(() => { });
    } else if (templateIdParam) {
      router.push(`/customize?templateId=${templateIdParam}`);
      return;
    }
  }, [designIdParam, templateIdParam]);

  // Function to fetch and pre-fill template into editable state
  const loadAndPrefillTemplate = async (templateId: string) => {
    window.location.href = `/customize?templateId=${templateId}`;
    return;

    try {
      const res = await fetch(`/api/templates/${templateId}`);
      const data = await res.json();
      if (data.success && data.template) {
        const t = data.template;
        const isLocked = t.isPaid && (t.price || 0) > 0 && !data.isUnlocked && !purchasedTemplateIds.includes(t._id);
        
        if (isLocked) {
          setLoadingTemplate(false);
          if (!(await viewerIsSignedIn())) {
            setStep("browse");
            router.push(registerHref(`/browsedesigns?templateId=${templateId}`, "paid"));
            return;
          }
          setSelectedTemplate(t);
          setPurchaseModalTemplate(t);
          setIsPurchaseModalOpen(true);
          setStep("browse");
          return;
        }

        setSelectedTemplate(t);
        if (!designIdParam) {
          setImageOverrides({});
          setSavedCanvasConfig(null);
        }
        const backLayers = backLayersFromDesign(t.back_design?.objects, {
          website: cardData.website,
          email: cardData.email,
          name: cardData.name,
          showEmail: true,
        }) as TextLayer[];
        setBackTextLayers(backLayers);

        const resolved = resolveTemplateSides(t);
        setExtraSideTextLayers(
          resolved.baseDesigns.slice(2).map((design) => textLayersFromSideObjects(design?.objects) as TextLayer[])
        );
        setImageLayers(imageLayersFromObjects(t.front_design?.objects));
        setBackImageLayers(imageLayersFromObjects(t.back_design?.objects));
        setExtraSideImageLayers(
          resolved.baseDesigns.slice(2).map((design) => imageLayersFromObjects(design?.objects))
        );
        setActiveSideIndex(0);

        const canvasTexts = (t.front_design?.objects || []).filter((obj: any) => obj?.type === "text" && obj.isVisible !== false);
        const hasCanvasLogo = (t.front_design?.objects || []).some((obj: any) => obj?.type === "logo" && obj.isVisible !== false);
        if (t.front_design?.bgColor) setBgColor(t.front_design.bgColor);
        else if (t.templateData?.bgColor) setBgColor(t.templateData.bgColor);
        if (t.back_design?.bgColor) setBackBgColor(t.back_design.bgColor);
        setLogoText(hasCanvasLogo ? (t.templateData?.logoText || "") : "");
        if (t.templateData) {
          if (t.templateData.textColor) setTextColor(t.templateData.textColor);
          if (hasCanvasLogo && t.templateData.logoPosition) setLogoPosition(t.templateData.logoPosition as any);
          const artwork = (t.front_design?.objects || []).find((obj: any) => isArtworkImage(obj));
          if (artwork) {
            const cfg = t.canvas_config || t.canvasConfig || { width: 105, height: 60, unit: "mm" };
            const fit = calculateFitDimensions(cfg, 520, 420);
            setLogoSize(Math.max(24, Math.round((((artwork.width as number) || 20) / 100) * fit.renderWidth)));
          } else if (t.templateData.logoSize) {
            setLogoSize(t.templateData.logoSize);
          }
          if (hasCanvasLogo && t.templateData.logoImage) setLogoImage(t.templateData.logoImage);

          const frontLayers = canvasTexts.length > 0
            ? canvasTexts.map((obj: any) => ({
                id: String(obj.id),
                text: obj.text || "",
                x: obj.x ?? 0,
                y: obj.y ?? 0,
                width: obj.width,
                widthMode: obj.widthMode,
                fontSize: obj.fontSize || 14,
                color: obj.color || "#ffffff",
                fontWeight: obj.fontWeight === "bold" ? "bold" as const : "normal" as const,
                fontStyle: obj.fontStyle,
                fontFamily: obj.fontFamily,
                textAlign: obj.textAlign,
                letterSpacing: obj.letterSpacing,
                underline: obj.underline,
                opacity: obj.opacity,
                textTransform: obj.textTransform,
              }))
            : Array.isArray(t.templateData.textLayers) && t.templateData.textLayers.length > 0
            ? t.templateData.textLayers
            : [
                { id: "1", text: cardData.name || "Stephen", x: 10, y: 28, fontSize: 24, color: t.templateData.textColor || "#ffffff", fontWeight: "bold" as const },
                { id: "2", text: cardData.title || "Manager", x: 10, y: 46, fontSize: 13, color: t.templateData.textColor || "#38bdf8", fontWeight: "normal" as const },
                { id: "3", text: cardData.phone || "+1 (555) 123-4567", x: 10, y: 76, fontSize: 10, color: t.templateData.textColor || "#e4e4e7", fontWeight: "normal" as const },
                { id: "4", text: cardData.email || "stephen@zyora.com", x: 42, y: 76, fontSize: 10, color: t.templateData.textColor || "#e4e4e7", fontWeight: "normal" as const },
                { id: "5", text: cardData.address || "Poissy 15 rue de la Boëtie", x: 68, y: 76, fontSize: 10, color: t.templateData.textColor || "#e4e4e7", fontWeight: "normal" as const },
              ];
          setTextLayers(frontLayers);
          setActiveTextId(frontLayers[0]?.id || "1");
          const locked = lockTemplateFields(frontLayers, backLayers);
          setSheetFields(locked.fields);
          setRequiredLayerIds(locked.requiredLayerIds);
        } else {
          const locked = lockTemplateFields(DEFAULT_TEXT_LAYERS, backLayers);
          setSheetFields(locked.fields);
          setRequiredLayerIds(locked.requiredLayerIds);
        }
      }
    } catch (err) {
      console.error("Failed to load template detail:", err);
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Handle template selection from browse screen
  const handleSelectTemplate = async (template: ApiTemplate) => {
    const isLocked = template.isPaid && (template.price || 0) > 0 && !purchasedTemplateIds.includes(template._id);
    if (isLocked) {
      if (!(await viewerIsSignedIn())) {
        router.push(registerHref(`/customize?templateId=${template._id}`, "paid"));
        return;
      }
      setPurchaseModalTemplate(template);
      setIsPurchaseModalOpen(true);
      return;
    }
    router.push(`/customize?templateId=${template._id}`);
  };

  const takeSnap = (): EditorSnap => ({
    textLayers: textLayers.map((layer) => ({ ...layer })),
    backTextLayers: backTextLayers.map((layer) => ({ ...layer })),
    logoX,
    logoY,
    backLogoX,
    backLogoY,
    layoutOverrides: Object.fromEntries(Object.entries(layoutOverrides).map(([key, box]) => [key, { ...box }])),
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
    setLogoX(snap.logoX);
    setLogoY(snap.logoY);
    setBackLogoX(snap.backLogoX);
    setBackLogoY(snap.backLogoY);
    setLayoutOverrides(snap.layoutOverrides);
    setActiveTextId(snap.activeTextId);
    gapOwnerRef.current = snap.gapOwner;
    refreshGap(snap.gapOwner, snap.activeTextId);
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

  const imageLayersForSide = (idx: number): ImageLayer[] => {
    if (idx <= 0) return imageLayers;
    if (idx === 1) return backImageLayers;
    return extraSideImageLayers[idx - 2] || [];
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

  const layersForSide = (idx: number): TextLayer[] => {
    if (idx <= 0) return textLayers;
    if (idx === 1) return backTextLayers;
    return extraSideTextLayers[idx - 2] || [];
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

  // Drag text layer on canvas handlers
  const handleMouseDown = (layerId: string, e: React.MouseEvent) => {
    editorHistory.push(takeSnap());
    e.stopPropagation();
    setActiveTextId(layerId);
    setDraggingTextId(layerId);
    dragNodeRef.current = e.currentTarget as HTMLElement;
    gapOwnerRef.current = "text";
    if (cardPreviewRef.current) setSelectionGap(selectionGapFromElement(cardPreviewRef.current, e.currentTarget as HTMLElement));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingTextId || !cardPreviewRef.current) return;
    const rect = cardPreviewRef.current.getBoundingClientRect();
    let xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    let yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    const snapLayers = layersForSide(activeSideIndex);
    const layer = snapLayers.find((item) => item.id === draggingTextId);
    const node = dragNodeRef.current;
    const layoutW = cardPreviewRef.current.offsetWidth || rect.width;
    const layoutH = cardPreviewRef.current.offsetHeight || rect.height;
    const width = node && layoutW ? (node.offsetWidth / layoutW) * 100 : 0;
    const height = node && layoutH ? (node.offsetHeight / layoutH) * 100 : 0;
    const guides = snapTargetsFromCard(cardPreviewRef.current, draggingTextId);
    const snapped = snapDragBox({
      x: xPercent,
      y: yPercent,
      width,
      height,
      anchorX: layer?.textAlign || "left",
      targetsX: guides.targetsX,
      targetsY: guides.targetsY,
    });
    xPercent = snapped.x;
    yPercent = snapped.y;
    setAlignmentLines(snapped.lines);
    gapOwnerRef.current = "text";
    setSelectionGap(selectionGapForAnchor(xPercent, yPercent, width, height, layer?.textAlign || "left", layoutW, layoutH));

    const moveLayer = (prev: TextLayer[]) =>
      prev.map((l) => (l.id === draggingTextId ? { ...l, x: xPercent, y: yPercent } : l));
    patchActiveLayers(moveLayer);
  };

  const handleMouseUp = () => {
    setDraggingTextId(null);
    dragNodeRef.current = null;
    setAlignmentLines([]);
  };

  const layoutKey = (side: string, id: string) => `${side}:${id}`;
  const layoutBox = (side: string, id?: string) => {
    if (!id) return undefined;
    return layoutOverrides[layoutKey(side, id)] || layoutOverrides[id];
  };

  const placeObjects = (objects: any[] | undefined, side: string) =>
    withImageOverrides(objects, imageOverrides).map((obj: any) => {
      const box = layoutBox(side, obj?.id);
      return box ? { ...obj, ...box } : obj;
    });

  const artworkOnSide = (side: "front" | "back") => {
    const objects = side === "back" ? selectedTemplate?.back_design?.objects : selectedTemplate?.front_design?.objects;
    const images = (objects || []).filter((obj: any) => isArtworkImage(obj));
    return images.find((obj: any) => (obj.width || 0) < 88 || (obj.height || 0) < 88) || images[0] || null;
  };

  const resizeArtwork = (px: number, side: "front" | "back" = cardData.side) => {
    const logo = artworkOnSide(side);
    if (!logo?.id) return;
    const saved = layoutBox(side, logo.id);
    const baseW = saved?.width || logo.width || 20;
    const baseH = saved?.height || logo.height || 20;
    const width = Math.min(100, Math.max(8, (px / Math.max(fitDims.renderWidth, 1)) * 100));
    const height = Math.min(100, Math.max(8, width * (baseH / Math.max(baseW, 1))));
    const key = layoutKey(side, logo.id);
    setLayoutOverrides((prev) => ({
      ...prev,
      [key]: {
        x: prev[key]?.x ?? saved?.x ?? logo.x ?? 0,
        y: prev[key]?.y ?? saved?.y ?? logo.y ?? 0,
        width,
        height,
      },
    }));
  };

  const moveArtwork = (id: string, x: number, y: number, size?: { width: number; height: number }, side: "front" | "back" = cardData.side) => {
    const objects = side === "back" ? selectedTemplate?.back_design?.objects : selectedTemplate?.front_design?.objects;
    const logo = (objects || []).find((obj: any) => obj?.id === id);
    if (!logo) return;
    const key = layoutKey(side, id);
    const saved = layoutBox(side, id);
    setLayoutOverrides((prev) => ({
      ...prev,
      [key]: {
        x,
        y,
        width: size?.width ?? prev[key]?.width ?? saved?.width ?? logo.width ?? 20,
        height: size?.height ?? prev[key]?.height ?? saved?.height ?? logo.height ?? 20,
      },
    }));
  };

  const revealArtworkOverBackground = () => {
    setLayoutOverrides((prev) => {
      const next = { ...prev };
      const shrink = (side: "front" | "back", objects: any[]) => {
        objects.filter((obj: any) => isArtworkImage(obj) && (obj.width || 0) >= 88 && (obj.height || 0) >= 88).forEach((obj: any) => {
          const key = layoutKey(side, obj.id);
          if (next[key] && next[key].width < 88) return;
          const width = Math.min(42, Math.max(18, (logoSize / Math.max(fitDims.renderWidth, 1)) * 100));
          const height = Math.min(70, width * ((obj.height || 100) / Math.max(obj.width || 100, 1)));
          next[key] = { x: 8, y: 10, width, height };
        });
      };
      shrink("front", selectedTemplate?.front_design?.objects || []);
      shrink("back", selectedTemplate?.back_design?.objects || []);
      return next;
    });
  };

  const startLogoDrag = (id: string, event: React.PointerEvent, obj: { x?: number; y?: number; width?: number; height?: number }) => {
    editorHistory.push(takeSnap());
    event.preventDefault();
    event.stopPropagation();
    logoDragCleanup.current?.();
    const side = activeSideIndex <= 0 ? "front" : activeSideIndex === 1 ? "back" : `side-${activeSideIndex}`;
    const drag = {
      id,
      side,
      startX: event.clientX,
      startY: event.clientY,
      objX: obj.x || 0,
      objY: obj.y || 0,
      width: obj.width || 20,
      height: obj.height || 20,
    };
    const move = (ev: PointerEvent) => {
      const bounds = cardPreviewRef.current?.getBoundingClientRect();
      if (!bounds || bounds.width === 0) return;
      const dx = ((ev.clientX - drag.startX) / bounds.width) * 100;
      const dy = ((ev.clientY - drag.startY) / bounds.height) * 100;
      const guides = cardPreviewRef.current ? snapTargetsFromCard(cardPreviewRef.current, drag.id) : { targetsX: [0, 50, 100], targetsY: [0, 50, 100] };
      const snapped = snapDragBox({
        x: drag.objX + dx,
        y: drag.objY + dy,
        width: drag.width,
        height: drag.height,
        targetsX: guides.targetsX,
        targetsY: guides.targetsY,
      });
      setAlignmentLines(snapped.lines);
      if (cardPreviewRef.current) {
        gapOwnerRef.current = "logo";
        setSelectionGap(selectionGapFromPercents(snapped.x, snapped.y, drag.width, drag.height, cardPreviewRef.current.offsetWidth, cardPreviewRef.current.offsetHeight));
      }
      setLayoutOverrides((prev) => ({
        ...prev,
        [layoutKey(drag.side, drag.id)]: { x: snapped.x, y: snapped.y, width: drag.width, height: drag.height },
      }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      logoDragCleanup.current = null;
      setAlignmentLines([]);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    logoDragCleanup.current = up;
  };

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

  const startPlaceholderDrag = (event: React.PointerEvent) => {
    editorHistory.push(takeSnap());
    event.preventDefault();
    event.stopPropagation();
    gapOwnerRef.current = "logo";
    const onBack = cardData.side === "back";
    const drag = {
      startX: event.clientX,
      startY: event.clientY,
      x: onBack ? backLogoX : logoX,
      y: onBack ? backLogoY : logoY,
      size: logoSize,
      onBack,
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
      if (drag.onBack) {
        setBackLogoX(snapped.x);
        setBackLogoY(snapped.y);
      } else {
        setLogoX(snapped.x);
        setLogoY(snapped.y);
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

  // Add / Remove Text Layers
  const handleAddTextLayer = () => {
    const newId = String(Date.now());
    const newLayer: TextLayer = {
      id: newId,
      text: "Add Text",
      x: 30,
      y: 50,
      fontSize: 14,
      color: textColor || "#ffffff",
      fontWeight: "normal",
    };
    patchActiveLayers((prev) => [...prev, newLayer]);
    setActiveTextId(newId);
  };

  const handleAddImageLayer = () => {
    pendingImageLayerIdRef.current = null;
    imageLayerFileRef.current?.click();
  };

  const replaceActiveImageLayer = () => {
    if (!activeTextId) return;
    pendingImageLayerIdRef.current = activeTextId;
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
      patchActiveImageLayers((prev) =>
        prev.map((layer) => (layer.id === targetId ? { ...layer, src } : layer))
      );
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
    }
  };

  const handleDeleteTextLayer = (id: string) => {
    if (requiredLayerIds.includes(id)) return;
    patchActiveLayers((prev) => prev.filter((l) => l.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  const deleteImageLayer = (id: string) => {
    patchActiveImageLayers((prev) => prev.filter((l) => l.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  const updateActiveTextLayer = (updates: Partial<TextLayer>) => {
    if (!activeTextId) return;
    const apply = (prev: TextLayer[]) =>
      prev.map((l) => (l.id === activeTextId ? { ...l, ...updates } : l));
    patchActiveLayers(apply);
    if (typeof updates.text === "string") {
      if (activeTextId === "back-website") setCardData((prev) => ({ ...prev, website: updates.text as string }));
      if (activeTextId === "back-email") setCardData((prev) => ({ ...prev, email: updates.text as string }));
    }
  };

  const updateImageLayer = (id: string, updates: Partial<ImageLayer>) => {
    patchActiveImageLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer))
    );
  };

  const startImageLayerDrag = (layerId: string, event: React.PointerEvent) => {
    const layer = imageLayersForSide(activeSideIndex).find((item) => item.id === layerId);
    if (!layer) return;
    editorHistory.push(takeSnap());
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
      if (!bounds || !bounds.width) return;
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
      const apply = (prev: ImageLayer[]) =>
        prev.map((item) => (item.id === drag.id ? { ...item, x: snapped.x, y: snapped.y } : item));
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

  // Synchronize top card input fields with corresponding text layers
  const handleNameChange = (val: string) => {
    setCardData((prev) => ({ ...prev, name: val }));
    setTextLayers((prev) =>
      prev.map((l) => (l.id === "1" ? { ...l, text: val } : l))
    );
  };

  const handleTitleChange = (val: string) => {
    setCardData((prev) => ({ ...prev, title: val }));
    setTextLayers((prev) =>
      prev.map((l) => (l.id === "2" ? { ...l, text: val } : l))
    );
  };

  const handlePhoneChange = (val: string) => {
    setCardData((prev) => ({ ...prev, phone: val }));
    setTextLayers((prev) =>
      prev.map((l) => (l.id === "3" ? { ...l, text: val } : l))
    );
  };

  const handleEmailChange = (val: string) => {
    setCardData((prev) => ({ ...prev, email: val }));
    setTextLayers((prev) =>
      prev.map((l) => (l.id === "4" ? { ...l, text: val } : l))
    );
    setBackTextLayers((prev) =>
      prev.map((l) => (l.id === "back-email" ? { ...l, text: val } : l))
    );
  };

  const handleAddressChange = (val: string) => {
    setCardData((prev) => ({ ...prev, address: val }));
    setTextLayers((prev) =>
      prev.map((l) => (l.id === "5" ? { ...l, text: val } : l))
    );
  };

  const editingBack = activeSideIndex === 1;
  const editingExtra = activeSideIndex >= 2;
  const activeLogoX = editingBack ? backLogoX : logoX;
  const activeLogoY = editingBack ? backLogoY : logoY;
  const activeLayers = layersForSide(activeSideIndex);
  const activeImageLayers = imageLayersForSide(activeSideIndex);
  const activeLayer = activeLayers.find((l) => l.id === activeTextId);
  const activeImageLayer = activeImageLayers.find((l) => l.id === activeTextId);
  const backDecor = placeObjects(
    (selectedTemplate?.back_design?.objects || []).filter((obj: any) => obj && obj.type && obj.type !== "text" && !isArtworkImage(obj)),
    "back"
  );
  const currentBackDesign = {
    ...selectedTemplate?.back_design,
    ...(bgMode === "color" ? {} : selectedTemplate?.back_design || {}),
    bgColor: bgMode === "template" ? selectedTemplate?.back_design?.bgColor || backBgColor || "#141414" : backBgColor,
    ...userBackdrop("back"),
    objects: [
      ...backDecor,
      ...backImageLayers.map(imageLayerToObject),
      ...backTextLayers.map((layer) => ({ ...layer, type: "text" })),
    ],
  };
  const frontObjects = placeObjects(
    (selectedTemplate?.front_design?.objects || []).filter((obj: any) => !isArtworkImage(obj)),
    "front"
  );
  const hasTemplateLogo = imageLayers.some((layer) => layer.label === "Logo") || (selectedTemplate?.front_design?.objects || []).some(isArtworkImage);
  const backHasArtwork = backImageLayers.length > 0;

  const isBoxProduct = useMemo(() => {
    const n = `${categoryParam || ""} ${selectedTemplate?.category || ""} ${selectedTemplate?.title || ""}`.toLowerCase();
    return n.includes("box") || n.includes("mailer") || n.includes("carton") || n.includes("packag");
  }, [categoryParam, selectedTemplate]);

  const effectiveShape = useMemo(() => {
    if (previewShape !== "auto") return previewShape;
    if (isBoxProduct) return "box";
    const c = (cardData.corners || "").toLowerCase();
    if (c.includes("circle")) return "circle";
    if (c.includes("oval")) return "oval";
    if (c.includes("square")) return "square";
    if (c.includes("rounded")) return "rounded";
    return "card";
  }, [previewShape, isBoxProduct, cardData.corners]);

  const activeIsBox = effectiveShape === "box";
  const activeIsCircle = effectiveShape === "circle";
  const activeIsOval = effectiveShape === "oval";
  const activeIsSquare = effectiveShape === "square";
  const activeIsRounded = effectiveShape === "rounded";

  const resolvedSides = useMemo(
    () => resolveTemplateSides(selectedTemplate, templateCategory || (categoryParam ? { name: categoryParam } : null)),
    [selectedTemplate, templateCategory, categoryParam]
  );
  const sideLabels = useMemo(() => {
    if (activeIsBox) {
      if (resolvedSides.sidesNames.length >= 6) return resolvedSides.sidesNames;
      return ["Top Lid", "Front Panel", "Bottom Panel", "Back Panel", "Left Flap", "Right Flap"];
    }
    return resolvedSides.sidesNames;
  }, [activeIsBox, resolvedSides]);
  const sidesCount = useMemo(() => {
    if (activeIsBox) return Math.max(6, resolvedSides.sidesCount);
    return resolvedSides.sidesCount;
  }, [activeIsBox, resolvedSides]);

  const selectSide = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, Math.max(0, sidesCount - 1)));
    setActiveSideIndex(clamped);
    setCardData((prev) => ({ ...prev, side: clamped === 1 ? "back" : "front" }));
    setActiveTextId(layersForSide(clamped)[0]?.id || null);
  };

  const activeBaseDesign = resolvedSides.baseDesigns[activeSideIndex];
  const extraDecor =
    editingExtra
      ? placeObjects(
          decorFromSideObjects(activeBaseDesign?.objects).filter((obj: any) => !isArtworkImage(obj)),
          `side-${activeSideIndex}`
        )
      : [];
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

  const previewResolved = useMemo(() => resolveTemplateSides(previewTemplate), [previewTemplate]);

  useEffect(() => {
    if (activeSideIndex >= sidesCount) {
      setActiveSideIndex(0);
      setCardData((prev) => ({ ...prev, side: "front" }));
    }
  }, [sidesCount, activeSideIndex]);

  // Save Draft to database
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setSaveToast("");
    try {
      let thumbnail: string | undefined = cardData.uploadedImage || logoImage || selectedTemplate?.thumbnail || undefined;
      try {
        const canvas = await renderCardToCanvas(buildCardScene("front"), 600);
        thumbnail = canvas.toDataURL("image/jpeg", 0.85);
      } catch (err) {
        console.warn("Failed to generate draft thumbnail canvas:", err);
      }

      const payload = {
        name: cardData.name ? `${cardData.name}'s Custom Card` : selectedTemplate?.title ? `${selectedTemplate.title} Draft` : "My Card Design",
        thumbnail,
        designData: {
          cardData,
          textLayers,
          backTextLayers,
          employees,
          sheetFields,
          requiredLayerIds,
          bgColor,
          backBgColor,
          bgMode,
          bgGradient,
          bgGradientAngle,
          frontBgImage,
          backBgImage,
          imageOpacity,
          textColor,
          logoText,
          logoPosition,
          logoX,
          logoY,
          backLogoPosition,
          backLogoX,
          backLogoY,
          logoImage,
          imageOverrides,
          layoutOverrides,
          logoSize,
          canvas_config: activeCanvasConfig,
          category: selectedTemplate?.category || "Business Cards",
          front_design: currentFrontDesign,
          back_design: currentBackDesign,
          side_designs: allSideDesigns,
          extraSideTextLayers,
          imageLayers,
          backImageLayers,
          extraSideImageLayers,
          activeSideIndex,
        },
        templateId: selectedTemplateId || undefined,
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
      console.error("Failed to save draft:", err);
    } finally {
      setSavingDraft(false);
    }
  };

  // When a specific category is requested in the URL (e.g. ?category=Postcards),
  // ONLY show categories matching this category family (e.g. Postcards, Postcards (A6)).
  // Unrelated categories (Flyers, Mailer Boxes, Business Cards, Mugs, T-Shirts, etc.) are excluded.
  const categories = useMemo(() => {
    if (!categoryParam) return allCategoryTabs;

    const base = categoryParam.trim().toLowerCase();
    const root = base.endsWith("s") ? base.slice(0, -1) : base;

    const matched = allCategoryTabs.filter((cat) => {
      const lower = cat.toLowerCase();
      return lower.includes(base) || lower.includes(root);
    });

    if (matched.length > 0) return matched;
    return [categoryParam];
  }, [allCategoryTabs, categoryParam]);

  // Accordion state in Preferences

  const [downloadingProof, setDownloadingProof] = useState(false);

  const buildCardScene = (side: "front" | "back"): CardScene => ({
    side,
    bgColor: side === "back" ? backBgColor : bgColor,
    ...designBackdrop(bgMode === "color" ? null : side === "back" ? selectedTemplate?.back_design : selectedTemplate?.front_design),
    ...userBackdrop(side),
    textColor,
    layout: STUDIO_LAYOUT,
    previewWidth: fitDims.renderWidth,
    previewHeight: fitDims.renderHeight,
    cornerRadius: 12,
    textLayers: side === "front" ? textLayers : backTextLayers,
    objects: side === "front" ? placeObjects(selectedTemplate?.front_design?.objects, "front") : backDecor,
    logoText: "",
    logoImage: (side === "back" ? backHasArtwork : hasTemplateLogo) ? null : logoImage || "/placeholder.jpg",
    logoPosition: side === "back" ? backLogoPosition : logoPosition,
    logoX: side === "back" ? backLogoX : logoX,
    logoY: side === "back" ? backLogoY : logoY,
    logoSize,
    website: cardData.website,
    email: cardData.email,
    name: cardData.name,
  });

  const handleDownloadProof = async (which: "current" | "both") => {
    setDownloadingProof(true);
    try {
      const exportWidth = printExportWidth(fitDims.renderWidth, activeCanvasConfig);
      const sides: Array<"front" | "back"> = which === "both" ? ["front", "back"] : [cardData.side];
      const safeName = (cardData.name || "Design").replace(/\s+/g, "_");
      for (const side of sides) {
        const canvas = await renderCardToCanvas(buildCardScene(side), exportWidth);
        downloadCanvasPng(canvas, `Business-Card-${safeName}-${side === "front" ? "Front" : "Back"}.png`);
      }
    } finally {
      setDownloadingProof(false);
    }
  };

  const baseUnitPricePerCard = selectedTemplate?.isPaid ? selectedTemplate.price : basePrice;
  let variationExtraPerCard = 0;
  dbVariations.forEach((vGroup) => {
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

  // Add template to cart API & navigate to /cart page
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

    const quantity = Math.max(1, cardData.quantity || 1);
    const price = unitPricePerCard;
    const name = selectedTemplate ? `${selectedTemplate.title} Business Cards` : "Custom Business Cards";
    let thumbnail = selectedTemplate?.thumbnail || cardData.uploadedImage || logoImage || "";
    let backThumbnail = "";
    try {
      const front = await renderCardToCanvas(buildCardScene("front"), 900);
      thumbnail = front.toDataURL("image/jpeg", 0.86);
      const back = await renderCardToCanvas(buildCardScene("back"), 900);
      backThumbnail = back.toDataURL("image/jpeg", 0.86);
    } catch {
      /* keep the template thumbnail if the proof render fails */
    }

    const specsParam = searchParams?.get("specs");
    let passedSpecs: Record<string, string> = {};
    if (specsParam) {
      try {
        passedSpecs = JSON.parse(specsParam);
      } catch {
        /* ignore */
      }
    }

    try {
      await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate?._id,
          productId: productIdParam || undefined,
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
      console.error("Failed to add to cart API:", err);
    } finally {
      setAddingToCart(false);
    }

    router.push("/cart");
  };

  use2dShortcuts(viewMode === "2d" && step === "review", {
    undo: () => {
      const prev = editorHistory.undo(takeSnap());
      if (prev) applySnap(prev);
    },
    redo: () => {
      const next = editorHistory.redo(takeSnap());
      if (next) applySnap(next);
    },
    copy: () => {
      if (gapOwnerRef.current === "logo") return;
      const layers = cardData.side === "back" ? backTextLayers : textLayers;
      const layer = layers.find((item) => item.id === activeTextId);
      if (layer) textClipboardRef.current = { ...layer };
    },
    paste: () => {
      const source = textClipboardRef.current;
      if (!source) return;
      editorHistory.push(takeSnap());
      pasteText(source);
    },
    duplicate: () => {
      if (gapOwnerRef.current === "logo") return;
      const layers = cardData.side === "back" ? backTextLayers : textLayers;
      const layer = layers.find((item) => item.id === activeTextId);
      if (!layer) return;
      editorHistory.push(takeSnap());
      pasteText(layer);
    },
    nudge: (dx, dy) => {
      if (gapOwnerRef.current === "logo") {
        editorHistory.push(takeSnap());
        const art = (cardData.side === "back" ? backHasArtwork : hasTemplateLogo) ? artworkOnSide(cardData.side) : null;
        const card = cardPreviewRef.current;
        if (art?.id) {
          const saved = layoutBox(cardData.side, art.id);
          const width = saved?.width ?? art.width ?? 20;
          const height = saved?.height ?? art.height ?? 20;
          const x = clampPercent((saved?.x ?? art.x ?? 0) + dx, 0, 100 - width);
          const y = clampPercent((saved?.y ?? art.y ?? 0) + dy, 0, 100 - height);
          moveArtwork(art.id, x, y, { width, height }, cardData.side);
          if (card) setSelectionGap(selectionGapFromPercents(x, y, width, height, card.offsetWidth, card.offsetHeight));
          return;
        }
        const onBack = cardData.side === "back";
        const widthPct = card ? (logoSize / (card.offsetWidth || 1)) * 100 : 10;
        const heightPct = card ? (logoSize / (card.offsetHeight || 1)) * 100 : 10;
        const x = clampPercent((onBack ? backLogoX : logoX) + dx, 0, 100 - widthPct);
        const y = clampPercent((onBack ? backLogoY : logoY) + dy, 0, 100 - heightPct);
        if (onBack) {
          setBackLogoX(x);
          setBackLogoY(y);
        } else {
          setLogoX(x);
          setLogoY(y);
        }
        if (card) setSelectionGap(selectionGapFromPercents(x, y, widthPct, heightPct, card.offsetWidth, card.offsetHeight));
        return;
      }
      const layers = layersForSide(activeSideIndex);
      const layer = layers.find((item) => item.id === activeTextId);
      if (!layer) return;
      editorHistory.push(takeSnap());
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
      editorHistory.push(takeSnap());
      handleDeleteTextLayer(activeTextId);
      setSelectionGap(null);
    },
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-zinc-900 pb-20">

      {/* ─────────────────────────────────────────────────────────────
          STEP 0: BROWSE & SELECT TEMPLATE
      ───────────────────────────────────────────────────────────── */}
      {step === "browse" && (
        <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <button
                onClick={() => onClose ? onClose() : history.back()}
                className="inline-flex items-center gap-1.5 text-base font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer mb-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
                {searchParam
                  ? `Results for “${searchParam}”`
                  : categoryParam
                  ? `${categoryParam} Templates`
                  : "Browse Templates Studio"}
              </h1>
              <p className="text-base text-zinc-500 mt-1">
                {searchParam
                  ? "Templates and products that match your search."
                  : categoryParam
                  ? `Pick a ${categoryParam} template to customize in 2D/3D studio, or start designing from scratch.`
                  : "Pick an admin template to customize, or start designing from scratch."}
              </p>
            </div>

            <Link
              href={productIdParam ? `/customize?productId=${productIdParam}` : "/customize"}
              className="px-5 py-2.5 bg-[#2196D2] hover:bg-[#1B85BD] text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-md text-center inline-flex items-center justify-center gap-2"
            >
              Start from Scratch →
            </Link>
          </div>

          {/* Unified Modern Filter Bar */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-3.5 sm:p-4.5 shadow-xs space-y-3.5">
            {/* Top Row: Search Input + Category Select Dropdown + Type (Free/Paid) + Reset */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search templates or categories..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full bg-zinc-50 hover:bg-zinc-100/80 focus:bg-white border border-zinc-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#2196D2] focus:ring-2 focus:ring-[#2196D2]/20 transition-all"
                />
                {templateSearch && (
                  <button
                    type="button"
                    onClick={() => setTemplateSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold p-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Controls Group */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Category Indicator Badge or Dropdown */}
                {categoryParam ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2196D2]/10 border border-[#2196D2]/25 text-xs sm:text-sm font-bold text-[#2196D2]">
                    <span>Category: <strong>{categoryParam}</strong></span>
                    <Link
                      href="/browsedesigns"
                      className="text-zinc-500 hover:text-zinc-800 underline text-xs font-semibold ml-1 cursor-pointer"
                      title="Clear product filter and browse all categories"
                    >
                      (All Products)
                    </Link>
                  </div>
                ) : categories.length > 0 ? (
                  <div className="relative shrink-0">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="h-10 pl-8 pr-7 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs sm:text-sm font-bold text-zinc-800 focus:outline-none focus:border-[#2196D2] cursor-pointer appearance-none transition-colors shadow-2xs"
                    >
                      <option value="">All Categories ({categories.length})</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <svg className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    <svg className="w-3 h-3 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                ) : null}

                {/* Price Type Segmented Filter */}
                <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200/80 shrink-0">
                  {([["", "All"], ["free", "Free"], ["paid", "Paid"]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setFilterPaid(val)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        filterPaid === val ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Reset Filters */}
                {(filterCategory || filterPaid || templateSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterCategory("");
                      setFilterPaid("");
                      setTemplateSearch("");
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-1 shrink-0 ml-1"
                  >
                    <span>Reset</span>
                    <span>✕</span>
                  </button>
                )}

                <span className="text-xs font-semibold text-zinc-400 hidden xl:inline ml-auto">
                  {filteredTemplates.length} {filteredTemplates.length === 1 ? "template" : "templates"}
                </span>
              </div>
            </div>

            {/* Bottom Row: Only show if there are multiple subcategories/sizes to filter */}
            {categories.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2.5 border-t border-zinc-100">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 shrink-0 mr-0.5">
                  {categoryParam ? "Sizes & Subcategories:" : "Categories:"}
                </span>
                <button
                  type="button"
                  onClick={() => setFilterCategory("")}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    filterCategory === ""
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {categoryParam ? `All ${categoryParam}` : `All (${categories.length})`}
                </button>
                {categories.map((cat) => {
                  const isSelected = filterCategory.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(isSelected ? "" : cat)}
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-[#2196D2] text-white shadow-xs"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {searchParam && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-zinc-500">Searching</span>
              <button
                type="button"
                onClick={() => router.push("/browsedesigns")}
                className="rounded-full bg-white border border-zinc-200 px-3 py-1 text-base font-bold text-zinc-700 cursor-pointer"
              >
                {searchParam} ×
              </button>
            </div>
          )}

          {productMatches.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-base font-extrabold text-zinc-900">Products</h2>
              <div className="flex flex-wrap gap-2">
                {productMatches.map((product) => (
                  <Link
                    key={product._id}
                    href={`/product/${product.slug || product._id}`}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-base font-bold text-zinc-800 hover:border-[#2196D2]"
                  >
                    {product.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Templates Grid */}
          {templatesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-zinc-200 animate-pulse aspect-[1.75/1]" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-zinc-200/80 p-8">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-zinc-700 font-bold text-base">
                {templateSearch ? `No templates match “${templateSearch}”` : "No templates match these filters"}
              </p>
              <p className="text-zinc-400 text-sm mt-1 max-w-sm">
                Try searching for another keyword or reset your filters to see all available designs.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory("");
                    setFilterPaid("");
                    setTemplateSearch("");
                  }}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-sm font-semibold rounded-xl hover:bg-zinc-50 cursor-pointer transition-all"
                >
                  Clear All Filters
                </button>
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="px-5 py-2 bg-[#2196D2] text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-[#1B85BD] transition-all shadow-sm"
                >
                  Design from Scratch →
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredTemplates.map((template) => {
                const cfg = template.canvas_config || template.canvasConfig || { width: 105, height: 60 };
                const width = cfg.width || 105;
                const height = cfg.height || 60;
                const isPortrait = cfg.orientation === "portrait" || height > width;

                const frontBg = template.front_design?.bgColor || template.templateData?.bgColor || "#18181b";
                const frontGradient = template.front_design?.bgGradient;
                const fontAngle = template.front_design?.bgGradientAngle ?? 135;
                const objects = template.front_design?.objects || [];
                const textLayers = template.templateData?.textLayers || [];
                const logoText = template.templateData?.logoText;

                return (
                  <button
                    key={template._id}
                    onClick={() => {
                      setPreviewSideIndex(0);
                      setPreviewTemplate(template);
                    }}
                    className={`group relative rounded-3xl border-2 overflow-hidden transition-all duration-300 cursor-pointer text-left flex flex-col justify-between ${
                      selectedTemplateId === template._id
                        ? "border-[#2196D2] shadow-2xl ring-2 ring-[#2196D2]/30"
                        : "border-zinc-200/80 bg-white hover:border-[#2196D2] hover:shadow-2xl"
                    }`}
                  >
                    {/* Mini Studio Presentation Frame */}
                    <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-[#181b26] to-[#0f1118] p-3.5 flex items-center justify-center overflow-hidden">
                      {/* Subtle grid mesh background pattern */}
                      <div
                        className="absolute inset-0 opacity-15 pointer-events-none"
                        style={{
                          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
                          backgroundSize: "14px 14px",
                        }}
                      />

                      {/* Floating Mini Card Container */}
                      <div
                        className="relative rounded-lg overflow-hidden shadow-[0_12px_28px_-6px_rgba(0,0,0,0.65)] border border-white/15 transition-all duration-300 group-hover:scale-[1.05] group-hover:-translate-y-1"
                        style={{
                          aspectRatio: `${width} / ${height}`,
                          width: isPortrait ? "48%" : "82%",
                          maxHeight: "82%",
                          backgroundColor: frontBg,
                          backgroundImage: frontGradient
                            ? `linear-gradient(${fontAngle}deg, ${frontBg}, ${frontGradient})`
                            : undefined,
                        }}
                      >
                        {objects.length > 0 || template.front_design?.bgImage || template.front_design?.bgColor ? (
                          <div className="absolute inset-0">
                            <TemplateArtwork template={template} side="front" />
                          </div>
                        ) : template.thumbnail ? (
                          <img
                            src={mediaSrc(template.thumbnail) || template.thumbnail}
                            alt={template.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="relative w-full h-full p-2 select-none overflow-hidden text-white">
                            {logoText && logoText !== "Z" && (
                              <div className="absolute top-2 right-2 w-4 h-4 rounded bg-[#2196D2] text-[8px] font-black flex items-center justify-center text-white shadow-xs">
                                {logoText}
                              </div>
                            )}
                            {textLayers.length > 0 ? (
                              textLayers.map((layer: any) => (
                                <span
                                  key={layer.id}
                                  className="absolute truncate leading-none font-sans font-bold"
                                  style={{
                                    left: `${layer.x}%`,
                                    top: `${layer.y}%`,
                                    fontSize: `${Math.max(6, Math.round((layer.fontSize || 12) * 0.4))}px`,
                                    color: layer.color || "#ffffff",
                                    fontWeight: layer.fontWeight || "normal",
                                  }}
                                >
                                  {layer.text}
                                </span>
                              ))
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                <span className="text-base font-bold truncate max-w-full text-white/90">{template.title}</span>
                                <span className="text-base text-sky-400 font-mono mt-0.5">{template.category}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Top Badges: Price & Category */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white/90 border border-white/10 truncate max-w-[100px]">
                          {template.category}
                        </span>
                        {template.isPaid ? (
                          purchasedTemplateIds.includes(template._id) ? (
                            <span className="px-2.5 py-0.5 rounded-full text-base font-extrabold bg-emerald-500 text-white shadow-md flex items-center gap-1">
                              <span>✓</span>
                              <span>UNLOCKED</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-base font-extrabold bg-amber-500 text-white shadow-md flex items-center gap-1">
                              <span>🔒</span>
                              <span>${template.price}</span>
                            </span>
                          )
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-base font-extrabold bg-emerald-500 text-white shadow-md">
                            FREE
                          </span>
                        )}
                      </div>

                      {/* Select Overlay */}
                      <div className="absolute inset-0 bg-[#2196D2]/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-20">
                        <div className="bg-white text-[#2196D2] text-base font-black px-3.5 py-1.5 rounded-full shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1">
                          {template.isPaid && !purchasedTemplateIds.includes(template._id) ? (
                            <>
                              <span>🔒</span>
                              <span>Unlock • ${template.price}</span>
                            </>
                          ) : (
                            <span>Use This Template →</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Info Footer */}
                    <div className="p-3 bg-white flex items-center justify-between gap-2 border-t border-zinc-100">
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-base text-zinc-900 truncate group-hover:text-[#2196D2] transition-colors">
                          {template.title}
                        </h4>
                        <p className="text-base text-zinc-400 font-medium mt-0.5 truncate">{template.category}</p>
                      </div>
                      <span className="w-6 h-6 rounded-full bg-zinc-100 group-hover:bg-[#2196D2] group-hover:text-white flex items-center justify-center text-base font-bold text-zinc-600 transition-all shrink-0">
                        →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 1: DESIGN & INTERACTIVE STUDIO
      ───────────────────────────────────────────────────────────── */}
      {step === "review" && (
        <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300">

          {/* Top Bar Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("browse")}
                className="inline-flex items-center gap-1.5 text-base font-semibold text-zinc-700 hover:text-zinc-900 cursor-pointer bg-zinc-100 px-3 py-1.5 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Templates</span>
              </button>

              {selectedTemplate && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 border border-sky-200 rounded-full text-base text-sky-800">
                  <span className="font-bold">Template:</span> {selectedTemplate.title}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {saveToast && (
                <span className="text-base font-semibold text-emerald-600 animate-in fade-in duration-200 flex items-center gap-1">
                  ✓ {saveToast}{" "}
                  <Link href="/dashboard" className="underline font-bold hover:text-emerald-700">
                    View in Dashboard →
                  </Link>
                </span>
              )}
              <button
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="px-4 py-2 border border-zinc-300 hover:border-zinc-800 text-zinc-700 hover:text-zinc-900 text-base font-semibold rounded-xl bg-white transition-all cursor-pointer disabled:opacity-50"
              >
                {savingDraft ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={() => setStep("preferences")}
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-700 text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Next: Choose Specs →
              </button>
            </div>
          </div>

          {/* Main Grid: Left Card Canvas & Right Interactive Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Interactive Card Canvas */}
            <div className="lg:col-span-7 flex flex-col items-center gap-4 lg:sticky lg:top-4 lg:self-start lg:z-20 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">

              {/* View Mode Selector & Quick Shape Switcher Bar */}
              <div className="w-full flex items-center justify-between bg-white px-4 py-2 rounded-2xl border border-zinc-200 shadow-xs flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-zinc-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2196D2]" />
                    Preview
                  </span>

                  {/* Shape Switcher */}
                  <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200/80 gap-0.5">
                    {[
                      { id: "box", label: "Box", icon: "📦" },
                      { id: "card", label: "Card", icon: "💳" },
                      { id: "rounded", label: "Rounded", icon: "🔲" },
                      { id: "circle", label: "Circle", icon: "⭕" },
                      { id: "oval", label: "Oval", icon: "🥚" },
                      { id: "square", label: "Square", icon: "⬛" },
                    ].map((sh) => {
                      const isActive = effectiveShape === sh.id;
                      return (
                        <button
                          key={sh.id}
                          type="button"
                          onClick={() => {
                            setPreviewShape(sh.id as any);
                            setActiveSideIndex(0);
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#2196D2] text-white shadow-xs font-bold"
                              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
                          }`}
                          title={`Test print on ${sh.label}`}
                        >
                          <span className="text-xs leading-none">{sh.icon}</span>
                          <span className="hidden sm:inline">{sh.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="inline-flex p-1 bg-zinc-100 rounded-xl">
                  <button
                    onClick={() => setViewMode("3d")}
                    className={`px-3.5 py-1.5 text-base font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === "3d"
                        ? "bg-zinc-900 text-white shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                      }`}
                  >
                    <span>✨ 3D Realistic View</span>
                  </button>

                  <button
                    onClick={() => setViewMode("2d")}
                    className={`px-3.5 py-1.5 text-base font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === "2d"
                        ? "bg-[#2196D2] text-white shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                      }`}
                  >
                    <span>✏️ 2D Drag & Edit</span>
                  </button>
                </div>
              </div>

              {/* Main Card Viewport Box */}
              <div className="w-full bg-[#111318] rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center min-h-[460px] shadow-xl relative overflow-hidden border border-zinc-800">

                {loadingTemplate && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 rounded-3xl">
                    <div className="w-8 h-8 border-2 border-[#2196D2] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {isMockupProduct && mockupImageSrc ? (
                  <div className="w-full flex flex-col items-center gap-3 py-2 relative z-10">
                    <MockupCanvasStage
                      mockupImage={mockupImageSrc}
                      printArea={mockupPrintArea}
                      layers={
                        activeSideIndex <= 0
                          ? textLayers
                          : activeSideIndex === 1
                            ? backTextLayers
                            : extraSideTextLayers[activeSideIndex - 2] || []
                      }
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
                        if (activeSideIndex <= 0) setTextLayers((prev) => [...prev, layer]);
                        else if (activeSideIndex === 1) setBackTextLayers((prev) => [...prev, layer]);
                        else {
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
                        const patch = <T extends { id: string; x: number; y: number }>(layers: T[]) =>
                          layers.map((l) => (l.id === id ? { ...l, x, y } : l));
                        if (activeSideIndex <= 0) setTextLayers((prev) => patch(prev));
                        else if (activeSideIndex === 1) setBackTextLayers((prev) => patch(prev));
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
                      categoryName={activeIsBox ? "mailer-boxes" : activeIsCircle ? "circle-sticker" : activeIsOval ? "oval-sticker" : (categoryParam || selectedTemplate?.category || "")}
                      name={activeIsBox ? "Mailer Box" : activeIsCircle ? "Circle Sticker" : activeIsOval ? "Oval Sticker" : (cardData.name || selectedTemplate?.title || categoryParam || "")}
                      canvasConfig={{
                        ...(activeCanvasConfig as any),
                        name: activeIsBox ? "Mailer Box" : (categoryParam || selectedTemplate?.category || ""),
                        side_mode: activeIsBox ? "multi" : resolvedSides.sideMode,
                        sides_count: sidesCount,
                        sides_names: sideLabels,
                        supports_back_side: sidesCount > 1,
                      }}
                      frontDesign={currentFrontDesign}
                      backDesign={currentBackDesign}
                      extraSideDesigns={extraSideLiveDesigns}
                      sideDesigns={allSideDesigns}
                      bgColor={bgColor}
                      backBgColor={backBgColor}
                      logoText=""
                      logoImage={null}
                      logoPosition={logoPosition}
                      logoX={logoX}
                      logoY={logoY}
                      backLogoX={backLogoX}
                      backLogoY={backLogoY}
                      logoSize={logoSize}
                      textLayers={[]}
                      side={activeSideIndex === 1 ? "back" : "front"}
                      sideIndex={activeSideIndex}
                      thickness={activeIsBox ? "Extra Thick" : cardData.thickness}
                      corners={activeIsRounded ? "Rounded Corners" : activeIsCircle ? "Circle" : activeIsOval ? "Oval" : cardData.corners}
                      email={cardData.email}
                      website={cardData.website}
                      onSideChange={(s) => selectSide(s === "back" ? 1 : 0)}
                      onSideIndexChange={selectSide}
                      previewWidth={fitDims.renderWidth}
                      previewHeight={fitDims.renderHeight}
                      cardLayout={STUDIO_LAYOUT}
                      textColor={textColor}
                      cornerRadius={12}
                    />
                  </div>
                ) : (
                  /* 2D Draggable Layout Canvas */
                  <ScaledCardStage width={fitDims.renderWidth} height={fitDims.renderHeight} className="my-4">
                  <div
                    ref={cardPreviewRef}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="relative shadow-2xl p-6 flex flex-col justify-between overflow-hidden border border-zinc-800 transition-all select-none"
                    style={{
                      width: `${fitDims.renderWidth}px`,
                      height: `${fitDims.renderHeight}px`,
                      borderRadius: activeIsCircle ? "50%" : activeIsOval ? "50% / 50%" : activeIsRounded ? "28px" : activeIsBox ? "10px" : "12px",
                      backgroundColor:
                        editingExtra
                          ? activeBaseDesign?.bgColor || "#141414"
                          : bgMode === "template"
                            ? activeSideIndex === 0
                              ? selectedTemplate?.front_design?.bgColor || bgColor || "#18181b"
                              : selectedTemplate?.back_design?.bgColor || backBgColor || "#141414"
                            : activeSideIndex === 0
                              ? bgColor || "#18181b"
                              : backBgColor || "#141414",
                      backgroundImage:
                        editingExtra
                          ? activeBaseDesign?.bgGradient
                            ? `linear-gradient(${activeBaseDesign.bgGradientAngle ?? 135}deg, ${activeBaseDesign.bgColor || "#141414"}, ${activeBaseDesign.bgGradient})`
                            : undefined
                          : bgMode === "gradient" || bgMode === "image-gradient"
                            ? `linear-gradient(${bgGradientAngle}deg, ${activeSideIndex === 0 ? bgColor : backBgColor}, ${bgGradient})`
                            : bgMode === "template" && (activeSideIndex === 0 ? selectedTemplate?.front_design?.bgGradient : selectedTemplate?.back_design?.bgGradient)
                              ? `linear-gradient(${(activeSideIndex === 0 ? selectedTemplate?.front_design?.bgGradientAngle : selectedTemplate?.back_design?.bgGradientAngle) ?? 135}deg, ${activeSideIndex === 0 ? selectedTemplate?.front_design?.bgColor || bgColor : selectedTemplate?.back_design?.bgColor || backBgColor}, ${activeSideIndex === 0 ? selectedTemplate?.front_design?.bgGradient : selectedTemplate?.back_design?.bgGradient})`
                              : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {/* Packaging Box Visual Elements */}
                    {activeIsBox && (
                      <>
                        <div className="absolute top-2.5 left-2.5 z-25 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-300 backdrop-blur-xs">
                          <span>📦</span>
                          <span>{sideLabels[activeSideIndex] || `Face ${activeSideIndex + 1}`}</span>
                          <span className="text-zinc-400 font-mono text-[9px] font-normal">• Packaging Box</span>
                        </div>
                        <div className="absolute inset-x-0 top-3 border-t border-dashed border-amber-500/20 pointer-events-none z-15" />
                        <div className="absolute inset-x-0 bottom-3 border-b border-dashed border-amber-500/20 pointer-events-none z-15" />
                        <div className="absolute inset-y-0 left-3 border-l border-dashed border-amber-500/20 pointer-events-none z-15" />
                        <div className="absolute inset-y-0 right-3 border-r border-dashed border-amber-500/20 pointer-events-none z-15" />
                      </>
                    )}

                    {editingExtra && activeBaseDesign?.bgImage && (
                      <img
                        src={mediaSrc(activeBaseDesign.bgImage)}
                        alt=""
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{
                          objectFit: activeBaseDesign.bgFit === "contain" ? "contain" : "cover",
                          opacity: activeBaseDesign.bgOpacity ?? 1,
                        }}
                      />
                    )}
                    {!editingExtra && bgMode === "template" && (activeSideIndex === 0 ? selectedTemplate?.front_design?.bgImage : selectedTemplate?.back_design?.bgImage) && (
                      <img
                        src={mediaSrc(activeSideIndex === 0 ? selectedTemplate?.front_design?.bgImage : selectedTemplate?.back_design?.bgImage)}
                        alt=""
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{
                          objectFit: (activeSideIndex === 0 ? selectedTemplate?.front_design?.bgFit : selectedTemplate?.back_design?.bgFit) === "contain" ? "contain" : "cover",
                          opacity: (activeSideIndex === 0 ? selectedTemplate?.front_design?.bgOpacity : selectedTemplate?.back_design?.bgOpacity) ?? 1,
                        }}
                      />
                    )}
                    {!editingExtra && (bgMode === "image" || bgMode === "image-gradient") && (activeSideIndex === 0 ? frontBgImage : backBgImage) && (
                      <img
                        src={mediaSrc(activeSideIndex === 0 ? frontBgImage : backBgImage)}
                        alt=""
                        className="absolute pointer-events-none"
                        style={{
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: imageOpacity / 100,
                        }}
                      />
                    )}
                    {/* Canva-Style Smart Alignment Guide Lines */}
                    <SpacingGapOverlay gap={viewMode === "2d" ? selectionGap : null} />
                    <CanvasGuideLinesOverlay
                      lines={canvasGuideLines}
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
                    {editingBack ? (
                      <>
                        <CardDesignObjects
                          objects={backDecor}
                          layout={STUDIO_LAYOUT}
                          onEditImage={(id) => {
                            logoEditIdRef.current = id;
                            document.getElementById("studio-logo-upload")?.click();
                          }}
                          onImagePointerDown={(id, event) => {
                            const obj = backDecor.find((item: any) => item.id === id);
                            if (obj) startLogoDrag(id, event, obj);
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
                              activeTextId === layer.id ? "ring-2 ring-[#2196D2] shadow-md" : "hover:ring-1 hover:ring-white/40"
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
                          const isSelected = activeTextId === layer.id;
                          return (
                            <span
                              key={layer.id}
                              data-snap-id={layer.id}
                              onMouseDown={(e) => handleMouseDown(layer.id, e)}
                              className={`absolute select-none rounded cursor-grab active:cursor-grabbing transition-shadow ${isSelected ? "ring-2 ring-[#2196D2] bg-[#2196D2]/10 shadow-sm" : "hover:ring-1 hover:ring-white/40"}`}
                              style={{ ...textLayerDomStyle(layer, STUDIO_LAYOUT), zIndex: 20 }}
                            >
                              {layer.textTransform === "uppercase"
                                ? layer.text.toUpperCase()
                                : layer.textTransform === "lowercase"
                                  ? layer.text.toLowerCase()
                                  : layer.text}
                            </span>
                          );
                        })}
                      </>
                    ) : editingExtra ? (
                      <>
                        <CardDesignObjects
                          objects={extraDecor}
                          layout={STUDIO_LAYOUT}
                          onEditImage={(id) => {
                            logoEditIdRef.current = id;
                            document.getElementById("studio-logo-upload")?.click();
                          }}
                          onImagePointerDown={(id, event) => {
                            const obj = extraDecor.find((item: any) => item.id === id);
                            if (obj) startLogoDrag(id, event, obj);
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
                              activeTextId === layer.id ? "ring-2 ring-[#2196D2] shadow-md" : "hover:ring-1 hover:ring-white/40"
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
                          const isSelected = activeTextId === layer.id;
                          return (
                            <span
                              key={layer.id}
                              data-snap-id={layer.id}
                              onMouseDown={(e) => handleMouseDown(layer.id, e)}
                              className={`absolute select-none rounded cursor-grab active:cursor-grabbing transition-shadow ${isSelected ? "ring-2 ring-[#2196D2] bg-[#2196D2]/10 shadow-sm" : "hover:ring-1 hover:ring-white/40"}`}
                              style={{ ...textLayerDomStyle(layer, STUDIO_LAYOUT), zIndex: 20 }}
                            >
                              {layer.textTransform === "uppercase"
                                ? layer.text.toUpperCase()
                                : layer.textTransform === "lowercase"
                                  ? layer.text.toLowerCase()
                                  : layer.text}
                            </span>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <CardDesignObjects
                          objects={frontObjects}
                          layout={STUDIO_LAYOUT}
                          onEditImage={(id) => {
                            logoEditIdRef.current = id;
                            document.getElementById("studio-logo-upload")?.click();
                          }}
                          onImagePointerDown={(id, event) => {
                            const obj = frontObjects.find((item: any) => item.id === id);
                            if (obj) startLogoDrag(id, event, obj);
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
                              activeTextId === layer.id ? "ring-2 ring-[#2196D2] shadow-md" : "hover:ring-1 hover:ring-white/40"
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

                        {/* Interactive Draggable Text Layers */}
                        {textLayers.map((layer) => {
                          const isSelected = activeTextId === layer.id;
                          return (
                            <span
                              key={layer.id}
                              data-snap-id={layer.id}
                              onMouseDown={(e) => handleMouseDown(layer.id, e)}
                              className={`absolute select-none rounded cursor-grab active:cursor-grabbing transition-shadow ${isSelected ? "ring-2 ring-[#2196D2] bg-[#2196D2]/10 shadow-sm" : "hover:ring-1 hover:ring-white/40"
                                }`}
                              style={{
                                ...textLayerDomStyle(layer, STUDIO_LAYOUT),
                                zIndex: 20,
                              }}
                            >
                              {layer.text}
                            </span>
                          );
                        })}
                      </>
                    )}
                  </div>
                  </ScaledCardStage>
                )}
              </div>

              {/* Multi-side toggle pills (Front / Back / Side 3…) */}
              {sidesCount > 1 && (
                <div className="flex flex-wrap justify-center gap-1 p-1 bg-white rounded-full border border-zinc-200 shadow-2xs max-w-full">
                  {sideLabels.map((label, idx) => (
                    <button
                      key={`side-pill-${idx}`}
                      type="button"
                      onClick={() => selectSide(idx)}
                      className={`px-4 py-1.5 text-base font-semibold rounded-full transition-all cursor-pointer ${
                        activeSideIndex === idx
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

            {/* Right Customization Panel */}
            <div className="lg:col-span-5 space-y-5 bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">
                  Customization Studio
                </h2>
                <p className="text-base text-zinc-500 mt-1">
                  {editingExtra
                    ? `Editing ${sideLabels[activeSideIndex] || `Side ${activeSideIndex + 1}`}: drag text on the card, or edit it below.`
                    : editingBack
                    ? "Back side: drag any text on the card, or edit it below. Click a logo to replace it."
                    : "Switch to 2D Drag & Edit to drag the logo. The size slider changes it in both views."}
                </p>
                {viewMode === "2d" && (
                  <p className="text-base text-zinc-400 mt-1">
                    Arrows move the selection (Shift moves farther). Ctrl+Z undo, Ctrl+Y redo, Ctrl+C copy, Ctrl+V paste.
                  </p>
                )}
              </div>

              {/* Direct Info Fields */}
              {/* <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-base font-bold text-zinc-700 block mb-1">Name</label>
                    <input
                      type="text"
                      value={cardData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Stephen"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-base focus:border-[#2196D2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-base font-bold text-zinc-700 block mb-1">Title / Role</label>
                    <input
                      type="text"
                      value={cardData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Manager"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-base focus:border-[#2196D2] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-base font-bold text-zinc-700 block mb-1">Phone</label>
                    <input
                      type="text"
                      value={cardData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-base focus:border-[#2196D2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-base font-bold text-zinc-700 block mb-1">Email</label>
                    <input
                      type="text"
                      value={cardData.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="stephen@zyora.com"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-base focus:border-[#2196D2] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Address</label>
                  <input
                    type="text"
                    value={cardData.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    placeholder="15 rue de la Boëtie, Poissy"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-base focus:border-[#2196D2] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Business Website Link</label>
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
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-base focus:border-[#2196D2] focus:outline-none font-mono"
                  />
                </div>
              </div> */}

              {/* Layers Management */}
              <div className="pt-3 border-t border-zinc-100 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-base font-bold text-zinc-800">
                    {editingExtra
                      ? `${sideLabels[activeSideIndex] || "Side"} layers`
                      : editingBack
                        ? "Back side layers"
                        : "Layers & Styling"}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddTextLayer}
                      className="text-base font-bold text-[#2196D2] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      + Add Text
                    </button>
                    <button
                      type="button"
                      onClick={handleAddImageLayer}
                      className="text-base font-bold text-zinc-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      + Add Image
                    </button>
                    <input
                      ref={imageLayerFileRef}
                      type="file"
                      accept="image/*,.svg"
                      onChange={handleImageLayerFile}
                      className="hidden"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoImageUpload}
                      className="hidden"
                      id="studio-logo-upload"
                    />
                  </div>
                </div>

                {/* Layer Selector Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {activeLayers.map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => setActiveTextId(layer.id)}
                      className={`px-2.5 py-1 rounded-lg text-base font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${activeTextId === layer.id
                          ? "bg-[#2196D2] text-white border-[#2196D2]"
                          : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-400"
                        }`}
                    >
                      <span>{layer.text.length > 14 ? layer.text.slice(0, 14) + "..." : layer.text}</span>
                      {!requiredLayerIds.includes(layer.id) && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTextLayer(layer.id);
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
                          ? "bg-[#2196D2] text-white border-[#2196D2]"
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
                            onClick={() => handleDeleteTextLayer(activeLayer.id)}
                            className="text-base text-red-500 hover:underline font-semibold cursor-pointer"
                          >
                            Delete Layer
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={activeLayer.text}
                        onChange={(e) => updateActiveTextLayer({ text: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white rounded-xl border border-zinc-300 text-base focus:border-[#2196D2] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="text-base font-bold text-zinc-700 block mb-1">
                          Font Size ({activeLayer.fontSize}px)
                        </label>
                        <input
                          type="range"
                          min={9}
                          max={42}
                          value={activeLayer.fontSize}
                          onChange={(e) => updateActiveTextLayer({ fontSize: Number(e.target.value) })}
                          className="w-full accent-[#2196D2]"
                        />
                      </div>

                      <div>
                        <label className="text-base font-bold text-zinc-700 block mb-1">Text Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={activeLayer.color}
                            onChange={(e) => updateActiveTextLayer({ color: e.target.value })}
                            className="w-7 h-7 rounded border border-zinc-300 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateActiveTextLayer({
                                fontWeight: activeLayer.fontWeight === "bold" ? "normal" : "bold",
                              })
                            }
                            className={`px-3 py-1 text-base font-bold rounded-lg border cursor-pointer ${activeLayer.fontWeight === "bold"
                                ? "bg-zinc-900 text-white border-zinc-900"
                                : "bg-white text-zinc-700 border-zinc-300"
                              }`}
                          >
                            B
                          </button>
                        </div>
                      </div>
                    </div>
                    <TextStyleControls
                      layer={activeLayer}
                      onChange={(patch) => updateActiveTextLayer(patch)}
                    />
                  </div>
                ) : null}
              </div>

              <div className="pt-3 border-t border-zinc-100 space-y-3">
                <div>
                  <label className="text-base font-bold text-zinc-700 block">Print size</label>
                  <p className="text-base font-mono text-zinc-500 mt-0.5">
                    {activeCanvasConfig.width} × {activeCanvasConfig.height} {activeCanvasConfig.unit}
                  </p>
                </div>
                {offeredSizes.length > 1 && (templateCategory?.printSizes || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
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
                            selected ? "border-[#2196D2] bg-sky-50" : "border-zinc-200 bg-white hover:border-zinc-400"
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
                )}
                {/* <div className="grid grid-cols-2 gap-2">
                  <label className="text-base font-bold text-zinc-700">
                    Bleed
                    <div className="mt-1 flex gap-1">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={activeCanvasConfig.bleed ?? 0}
                        onChange={(e) => patchCanvas({ bleed: Number(e.target.value) || 0 })}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-base font-mono"
                      />
                      <select
                        value={activeCanvasConfig.bleedUnit || activeCanvasConfig.unit || "in"}
                        onChange={(e) => patchCanvas({ bleedUnit: asCanvasUnit(e.target.value, activeCanvasConfig.unit || "in") })}
                        className="bg-white border border-zinc-200 rounded-lg px-1.5 py-1.5 text-base font-bold"
                      >
                        <option value="in">in</option>
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                        <option value="px">px</option>
                      </select>
                    </div>
                  </label>
                  <label className="text-base font-bold text-zinc-700">
                    Safe area
                    <div className="mt-1 flex gap-1">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={activeCanvasConfig.safe_area ?? 0}
                        onChange={(e) => patchCanvas({ safe_area: Number(e.target.value) || 0 })}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-base font-mono"
                      />
                      <select
                        value={activeCanvasConfig.safeAreaUnit || activeCanvasConfig.unit || "in"}
                        onChange={(e) => patchCanvas({ safeAreaUnit: asCanvasUnit(e.target.value, activeCanvasConfig.unit || "in") })}
                        className="bg-white border border-zinc-200 rounded-lg px-1.5 py-1.5 text-base font-bold"
                      >
                        <option value="in">in</option>
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                        <option value="px">px</option>
                      </select>
                    </div>
                  </label>
                </div> */}
              </div>

              {/* Background Color & Logo Controls */}
              <div className="pt-3 border-t border-zinc-100 space-y-3">
                <div className="space-y-2">
                  <label className="text-base font-bold text-zinc-700 block">Card background</label>
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
                        onClick={() => {
                          setBgMode(mode);
                          revealArtworkOverBackground();
                        }}
                        className={`py-1.5 rounded-lg border text-base font-bold cursor-pointer ${
                          bgMode === mode
                            ? "bg-[#2196D2] border-[#2196D2] text-white"
                            : "border-zinc-300 text-zinc-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {bgMode !== "image" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-base font-bold text-zinc-700 block mb-1">Front color</label>
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => {
                            setBgColor(e.target.value);
                            if (bgMode === "template") setBgMode("color");
                          }}
                          className="w-full h-8 rounded-xl border border-zinc-300 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-base font-bold text-zinc-700 block mb-1">Back color</label>
                        <input
                          type="color"
                          value={backBgColor}
                          onChange={(e) => {
                            setBackBgColor(e.target.value);
                            if (bgMode === "template") setBgMode("color");
                          }}
                          className="w-full h-8 rounded-xl border border-zinc-300 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                  {(bgMode === "gradient" || bgMode === "image-gradient") && (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bgGradient}
                        onChange={(e) => setBgGradient(e.target.value)}
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
                            onClick={() => setBgGradientAngle(item.angle)}
                            className={`w-8 h-8 rounded-lg border text-base cursor-pointer ${
                              bgGradientAngle === item.angle
                                ? "bg-[#2196D2] border-[#2196D2] text-white"
                                : "border-zinc-300 text-zinc-700"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(bgMode === "image" || bgMode === "image-gradient") && (
                    <>
                      <button
                        type="button"
                        onClick={() => bgFileRef.current?.click()}
                        className="w-full py-2 px-3 border border-dashed border-zinc-300 hover:border-[#2196D2] text-base font-semibold text-zinc-700 rounded-xl cursor-pointer"
                      >
                        {(cardData.side === "front" ? frontBgImage : backBgImage)
                          ? `Change ${cardData.side} background image`
                          : `Upload ${cardData.side} background image`}
                      </button>
                      <input
                        ref={bgFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          const side = cardData.side;
                          const apply = (url: string) => {
                            if (side === "back") setBackBgImage(url);
                            else setFrontBgImage(url);
                            setBgMode((prev) => (prev === "image-gradient" ? "image-gradient" : "image"));
                          };
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === "string") apply(reader.result);
                          };
                          reader.readAsDataURL(file);
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            const res = await fetch("/api/upload", { method: "POST", body: formData });
                            const data = await res.json();
                            if (data.success && data.url) apply(data.url);
                          } catch {
                            /* keep the local preview */
                          }
                        }}
                      />
                      {(cardData.side === "front" ? frontBgImage : backBgImage) && (
                        <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-base font-bold text-zinc-700">Artwork Image Opacity</label>
                            <span className="text-base font-mono font-bold text-[#2196D2]">{imageOpacity}%</span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            value={imageOpacity}
                            onChange={(e) => setImageOpacity(Number(e.target.value))}
                            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#2196D2]"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <button
                  type="button"
                  disabled={downloadingProof}
                  onClick={() => handleDownloadProof("current")}
                  className="w-full py-2.5 border border-zinc-300 hover:border-zinc-800 text-zinc-800 text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-zinc-50 hover:bg-white disabled:opacity-50"
                >
                  {downloadingProof ? "Preparing image..." : `Download ${cardData.side === "back" ? "back" : "front"} PNG`}
                </button>
                <button
                  type="button"
                  disabled={downloadingProof}
                  onClick={() => handleDownloadProof("both")}
                  className="w-full py-2 text-base font-semibold text-[#2196D2] hover:underline cursor-pointer disabled:opacity-50"
                >
                  Download front and back
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 2: PREFERENCES (PAPER & FINISH SPECS)
      ───────────────────────────────────────────────────────────── */}
      {step === "preferences" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300">

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep("review")}
              className="inline-flex items-center gap-1.5 text-base font-semibold text-zinc-700 hover:text-zinc-900 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Studio</span>
            </button>
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900">Card Specifications</h1>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200/80 space-y-6 shadow-xs">

            <CardOrderFields
              quantity={cardData.quantity}
              onQuantity={(quantity) => setCardData((prev) => ({ ...prev, quantity }))}
              employees={employees}
              onEmployees={setEmployees}
              onUseEmployee={useEmployeeOnCard}
              fields={withCurrentSamples(sheetFields, [...textLayers, ...backTextLayers])}
              basePrice={basePrice}
            />

            {dbVariations && dbVariations.length > 0 ? (
              dbVariations.map((vGroup) => {
                const groupName = vGroup.name;
                const selectedValName = selectedVariations[groupName] || (vGroup.values[0]?.name ?? "");

                return (
                  <div key={vGroup._id || groupName} className="border-t border-zinc-100 pt-4">
                    <p className="text-base font-bold text-zinc-900">
                      {groupName}
                      <span className="ml-2 text-base font-bold text-[#2196D2]">({selectedValName})</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
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
                            className={`p-3 text-left rounded-xl border text-base transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? "border-[#2196D2] bg-sky-50/50 text-[#2196D2] font-bold shadow-2xs ring-1 ring-[#2196D2]/30"
                                : "border-zinc-200 text-zinc-700 hover:border-zinc-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {val.image && (
                                <img src={mediaSrc(val.image)} alt={val.name} className="w-6 h-6 object-cover rounded-md border border-zinc-200" />
                              )}
                              <span className="font-bold">{val.name}</span>
                            </div>
                            <span className={`text-base mt-1 ${val.price ? "text-zinc-500 font-semibold" : "text-emerald-700 font-bold"}`}>
                              {priceText}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                <div className="border-t border-zinc-100 pt-4">
                  <p className="text-base font-bold text-zinc-900">Paper Thickness</p>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {["Standard", "Premium", "Premium Plus"].map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => setCardData((prev) => ({ ...prev, thickness: th }))}
                        className={`p-3 text-left rounded-xl border text-base transition-all cursor-pointer ${cardData.thickness === th
                            ? "border-[#2196D2] bg-sky-50/50 text-[#2196D2] font-bold"
                            : "border-zinc-200 text-zinc-700 hover:border-zinc-300"
                          }`}
                      >
                        {th}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-4">
                  <p className="text-base font-bold text-zinc-900">Card Corners</p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {["Standard Corners", "Rounded Corners"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCardData((prev) => ({ ...prev, corners: c }))}
                        className={`p-3 text-left rounded-xl border text-base transition-all cursor-pointer ${cardData.corners === c
                            ? "border-[#2196D2] bg-sky-50/50 text-[#2196D2] font-bold"
                            : "border-zinc-200 text-zinc-700 hover:border-zinc-300"
                          }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Add to cart CTA */}
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
              <div>
                <p className="text-base text-zinc-500">Estimated Total</p>
                <p className="text-xl font-extrabold text-zinc-900">
                  ${calculatedTotalPrice.toFixed(2)}
                </p>
              </div>

              <button
                onClick={handleAddToCartAndProceed}
                disabled={addingToCart}
                className="px-8 py-3.5 bg-[#2196D2] hover:bg-[#1B85BD] text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-[#2196D2]/20 disabled:opacity-50"
              >
                {addingToCart ? "Adding to Cart..." : "Add to Cart →"}
              </button>
            </div>

          </div>
        </div>
      )}

      {previewTemplate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewTemplate(null)}>
          <div
            className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-zinc-900">{previewTemplate.title}</h3>
                <p className="text-base text-zinc-500">{previewTemplate.category}</p>
              </div>
              {previewResolved.sidesCount > 1 && (
                <div className="inline-flex flex-wrap justify-end gap-1 rounded-xl bg-zinc-100 p-1 text-base font-bold max-w-[60%]">
                  {previewResolved.sidesNames.map((label, idx) => (
                    <button
                      key={`preview-side-${idx}`}
                      type="button"
                      onClick={() => setPreviewSideIndex(idx)}
                      className={`rounded-lg px-3 py-1.5 cursor-pointer ${previewSideIndex === idx ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-[#111318] px-4 py-4">
              <div className="relative h-[460px] overflow-hidden rounded-2xl">
                <ThreeDCardPreview
                  categoryName={previewTemplate?.category || categoryParam || ""}
                  name={previewTemplate?.title || ""}
                  canvasConfig={{
                    ...(previewTemplate.canvas_config || previewTemplate.canvasConfig || {}),
                    name: previewTemplate?.category || categoryParam || "",
                    side_mode: previewResolved.sideMode,
                    sides_count: previewResolved.sidesCount,
                    sides_names: previewResolved.sidesNames,
                    supports_back_side: previewResolved.sidesCount > 1,
                  }}
                  frontDesign={previewResolved.baseDesigns[0]}
                  backDesign={previewResolved.baseDesigns[1]}
                  extraSideDesigns={previewResolved.baseDesigns.slice(2)}
                  sideDesigns={previewResolved.baseDesigns}
                  bgColor={previewResolved.baseDesigns[0]?.bgColor || "#18181b"}
                  backBgColor={previewResolved.baseDesigns[1]?.bgColor || "#141414"}
                  logoText=""
                  logoImage={null}
                  textLayers={[]}
                  side={previewSideIndex === 1 ? "back" : "front"}
                  sideIndex={previewSideIndex}
                  onSideChange={(s) => setPreviewSideIndex(s === "back" ? 1 : 0)}
                  onSideIndexChange={setPreviewSideIndex}
                  cardLayout={STUDIO_LAYOUT}
                  cornerRadius={0}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-base font-bold text-zinc-700 cursor-pointer hover:bg-zinc-50"
              >
                Cancel
              </button>
              {previewTemplate.isPaid && (previewTemplate.price || 0) > 0 && !purchasedTemplateIds.includes(previewTemplate._id) ? (
                <button
                  type="button"
                  onClick={async () => {
                    const template = previewTemplate;
                    if (!(await viewerIsSignedIn())) {
                      router.push(registerHref(`/browsedesigns?templateId=${template._id}`, "paid"));
                      return;
                    }
                    setPreviewTemplate(null);
                    setPurchaseModalTemplate(template);
                    setIsPurchaseModalOpen(true);
                  }}
                  className="rounded-xl bg-amber-500 px-4 py-2.5 text-base font-bold text-white cursor-pointer hover:bg-amber-600"
                >
                  Pay ${previewTemplate.price}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const id = previewTemplate._id;
                    setPreviewTemplate(null);
                    router.push(`/customize?templateId=${id}`);
                  }}
                  className="rounded-xl bg-[#2196D2] px-4 py-2.5 text-base font-bold text-white cursor-pointer hover:bg-[#1B85BD]"
                >
                  Use Now
                </button>
              )}
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
          setPurchasedTemplateIds((prev) => [...prev, template._id]);
          setCurrentDesignId(designId);
          setSaveToast("Template unlocked & saved to your dashboard!");
          setTimeout(() => setSaveToast(""), 4000);
          loadAndPrefillTemplate(template._id);
        }}
      />

    </div>
  );
}
