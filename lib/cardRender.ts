/**
 * Shared card artwork renderer.
 * Positions are authored in the on-screen editor (percent + CSS pixels).
 * Export scales those pixels so the PNG matches the 2D preview.
 */

import { mediaSrc } from "@/lib/mediaUrl";

export type LogoPosition = "top-left" | "top-right" | "center" | "bottom-right";

export interface CardTextLayer {
  id?: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  width?: number;
  widthMode?: "inline" | "full" | "custom";
  letterSpacing?: number;
  underline?: boolean;
  opacity?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
}

export interface CardLayout {
  textPadX: number;
  textPadY: number;
  lineHeight: number;
  logoInsetTop: number;
  logoInsetSide: number;
  logoColor: string;
  logoRadius: number;
  logoFontScale: number;
  minLogoFont: number;
  logoImagePad: number;
  backLogoScale: number;
  showEmailOnBack: boolean;
  cornerRadius: number;
}

export const DEFAULT_FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

export const CARD_FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Sans", value: DEFAULT_FONT },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet", value: "Trebuchet MS, sans-serif" },
  { label: "Georgia", value: "Georgia, Times New Roman, serif" },
  { label: "Palatino", value: "Palatino Linotype, Palatino, serif" },
  { label: "Courier", value: "Courier New, Courier, monospace" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { label: "Impact", value: "Impact, Haettenschweiler, sans-serif" },
];

export const CUSTOMIZE_LAYOUT: CardLayout = {
  textPadX: 6,
  textPadY: 2,
  lineHeight: 1,
  logoInsetTop: 20,
  logoInsetSide: 24,
  logoColor: "#dc2626",
  logoRadius: 8,
  logoFontScale: 0.38,
  minLogoFont: 10,
  logoImagePad: 2,
  backLogoScale: 1,
  showEmailOnBack: false,
  cornerRadius: 16,
};

export const STUDIO_LAYOUT: CardLayout = {
  textPadX: 6,
  textPadY: 2,
  lineHeight: 1.2,
  logoInsetTop: 16,
  logoInsetSide: 16,
  logoColor: "#064FE0",
  logoRadius: 6,
  logoFontScale: 0.45,
  minLogoFont: 0,
  logoImagePad: 0,
  backLogoScale: 1.2,
  showEmailOnBack: true,
  cornerRadius: 12,
};

export const ADMIN_LAYOUT: CardLayout = {
  textPadX: 4,
  textPadY: 0,
  lineHeight: 1.2,
  logoInsetTop: 16,
  logoInsetSide: 16,
  logoColor: "#064FE0",
  logoRadius: 6,
  logoFontScale: 0.4,
  minLogoFont: 0,
  logoImagePad: 0,
  backLogoScale: 1,
  showEmailOnBack: false,
  cornerRadius: 12,
};

export interface CardScene {
  side?: string;
  bgColor: string;
  textColor?: string;
  layout: CardLayout;
  previewWidth: number;
  previewHeight: number;
  cornerRadius?: number;
  textLayers?: CardTextLayer[];
  objects?: any[];
  logoText?: string;
  logoImage?: string | null;
  logoPosition?: LogoPosition;
  logoX?: number;
  logoY?: number;
  logoSize?: number;
  uploadedImage?: string | null;
  imageOpacity?: number;
  rotation?: number;
  fitMode?: "bleed" | "safe";
  safeInset?: number;
  website?: string;
  email?: string;
  name?: string;
  supportsBack?: boolean;
  bgImage?: string | null;
  bgFit?: "cover" | "contain";
  bgOpacity?: number;
  bgGradient?: string | null;
  bgGradientAngle?: number;
}

export function logoPoint(position: string) {
  if (position === "top-left") return { x: 6, y: 8 };
  if (position === "center") return { x: 38, y: 36 };
  if (position === "bottom-right") return { x: 70, y: 68 };
  return { x: 70, y: 8 };
}

export type CustomerBgMode = "color" | "gradient" | "image" | "image-gradient";

/** Solid color, gradient, photo, or a photo sitting on a gradient so a PNG stays transparent. */
export function userCardBackdrop(
  mode: CustomerBgMode | "template",
  options: { image?: string | null; gradient?: string; angle?: number; opacity?: number }
) {
  const opacity = (options.opacity ?? 100) / 100;
  if (mode === "gradient") {
    return { bgImage: undefined, bgGradient: options.gradient, bgGradientAngle: options.angle };
  }
  if (mode === "image") {
    return options.image
      ? { bgImage: options.image, bgGradient: undefined, bgFit: "cover" as const, bgOpacity: opacity }
      : { bgImage: undefined, bgGradient: undefined };
  }
  if (mode === "image-gradient") {
    return {
      bgImage: options.image || undefined,
      bgGradient: options.gradient,
      bgGradientAngle: options.angle,
      bgFit: "cover" as const,
      bgOpacity: opacity,
    };
  }
  if (mode === "color") return { bgImage: undefined, bgGradient: undefined };
  return {};
}

export function designBackdrop(design?: {
  bgImage?: string | null;
  bgFit?: string | null;
  bgOpacity?: number | null;
  bgGradient?: string | null;
  bgGradientAngle?: number | null;
} | null) {
  if (!design) return {};
  return {
    bgImage: design.bgImage || undefined,
    bgFit: design.bgFit === "contain" ? ("contain" as const) : ("cover" as const),
    bgOpacity: design.bgOpacity ?? undefined,
    bgGradient: design.bgGradient || undefined,
    bgGradientAngle: design.bgGradientAngle ?? undefined,
  };
}

export function isTextDesignObject(obj: any): boolean {
  return !!obj && obj.isVisible !== false && (obj.type === "text" || !obj.type);
}

/** Text already placed on a template back, or the default website and email lines. */
export function backLayersFromDesign(
  objects: any[] | undefined,
  fallback: { website?: string; email?: string; name?: string; showEmail?: boolean }
): CardTextLayer[] {
  const texts = (objects || []).filter(isTextDesignObject);
  if (texts.length) {
    return texts.map((obj, index) => ({
      id: String(obj.id || `back-text-${index}`),
      text: obj.text || "",
      x: obj.x ?? 10,
      y: obj.y ?? 20,
      fontSize: obj.fontSize || 14,
      color: obj.color || "#ffffff",
      fontWeight: obj.fontWeight === "bold" ? "bold" : "normal",
      fontStyle: obj.fontStyle,
      fontFamily: obj.fontFamily,
      textAlign: obj.textAlign,
      width: obj.width,
      widthMode: obj.widthMode,
      letterSpacing: obj.letterSpacing,
      underline: obj.underline,
      opacity: obj.opacity,
      textTransform: obj.textTransform,
    }));
  }

  const website =
    fallback.website ||
    (fallback.name ? `www.${fallback.name.toLowerCase().replace(/\s+/g, "")}.com` : "www.example.com");
  const layers: CardTextLayer[] = [
    {
      id: "back-website",
      text: website,
      x: 50,
      y: 58,
      fontSize: 12,
      color: "#e4e4e7",
      fontWeight: "normal",
      textAlign: "center",
      textTransform: "uppercase",
    },
  ];
  if (fallback.showEmail !== false) {
    layers.push({
      id: "back-email",
      text: fallback.email || "contact@company.com",
      x: 50,
      y: 72,
      fontSize: 10,
      color: "#a1a1aa",
      fontWeight: "normal",
      textAlign: "center",
    });
  }
  return layers;
}

export type AlignmentLine = { type: "v" | "h"; pos: number };

export type SelectionGap = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
};

export function selectionGapFromPercents(
  leftPct: number,
  topPct: number,
  widthPct: number,
  heightPct: number,
  cardWidth: number,
  cardHeight: number
): SelectionGap {
  const left = (leftPct / 100) * cardWidth;
  const top = (topPct / 100) * cardHeight;
  const width = (widthPct / 100) * cardWidth;
  const height = (heightPct / 100) * cardHeight;
  return {
    left: Math.max(0, Math.round(left)),
    right: Math.max(0, Math.round(cardWidth - left - width)),
    top: Math.max(0, Math.round(top)),
    bottom: Math.max(0, Math.round(cardHeight - top - height)),
    leftPct,
    topPct,
    widthPct,
    heightPct,
  };
}

export function selectionGapFromElement(card: HTMLElement, el: HTMLElement): SelectionGap {
  const cardRect = card.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const leftPct = cardRect.width ? ((rect.left - cardRect.left) / cardRect.width) * 100 : 0;
  const topPct = cardRect.height ? ((rect.top - cardRect.top) / cardRect.height) * 100 : 0;
  const widthPct = cardRect.width ? (rect.width / cardRect.width) * 100 : 0;
  const heightPct = cardRect.height ? (rect.height / cardRect.height) * 100 : 0;
  return selectionGapFromPercents(leftPct, topPct, widthPct, heightPct, card.offsetWidth || cardRect.width, card.offsetHeight || cardRect.height);
}

export function selectionGapForAnchor(
  x: number,
  y: number,
  widthPct: number,
  heightPct: number,
  anchorX: "left" | "center" | "right",
  cardWidth: number,
  cardHeight: number
): SelectionGap {
  const leftPct = anchorX === "center" ? x - widthPct / 2 : anchorX === "right" ? x - widthPct : x;
  return selectionGapFromPercents(leftPct, y, widthPct, heightPct, cardWidth, cardHeight);
}

function closestGuide(points: number[], targets: number[], tolerance: number) {
  let best: { dist: number; shift: number; target: number } | null = null;
  for (const point of points) {
    for (const target of targets) {
      const dist = Math.abs(point - target);
      if (dist <= tolerance && (!best || dist < best.dist)) {
        best = { dist, shift: target - point, target };
      }
    }
  }
  return best;
}

/** Snap a box to the card center, edges, and other objects. x/y is the text anchor or the box top-left. */
export function snapDragBox(options: {
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX?: "left" | "center" | "right";
  tolerance?: number;
  targetsX?: number[];
  targetsY?: number[];
}): { x: number; y: number; lines: AlignmentLine[] } {
  const anchorX = options.anchorX || "left";
  const width = Math.max(0, options.width);
  const height = Math.max(0, options.height);
  const tolerance = options.tolerance ?? 2.5;
  const targetsX = options.targetsX || [0, 50, 100];
  const targetsY = options.targetsY || [0, 50, 100];
  const leftOf = (x: number) => (anchorX === "center" ? x - width / 2 : anchorX === "right" ? x - width : x);

  let x = options.x;
  let y = options.y;
  const lines: AlignmentLine[] = [];
  const xHit = closestGuide([leftOf(x), leftOf(x) + width / 2, leftOf(x) + width], targetsX, tolerance);
  if (xHit) {
    x += xHit.shift;
    lines.push({ type: "v", pos: xHit.target });
  }
  const yHit = closestGuide([y, y + height / 2, y + height], targetsY, tolerance);
  if (yHit) {
    y += yHit.shift;
    lines.push({ type: "h", pos: yHit.target });
  }

  const left = leftOf(x);
  const top = y;
  if (width < 100) {
    if (left < 0) x -= left;
    else if (left + width > 100) x -= left + width - 100;
  }
  if (height < 100) {
    if (top < 0) y -= top;
    else if (top + height > 100) y -= top + height - 100;
  }

  const still = lines.filter((line) => {
    const points = line.type === "v" ? [leftOf(x), leftOf(x) + width / 2, leftOf(x) + width] : [y, y + height / 2, y + height];
    return points.some((point) => Math.abs(point - line.pos) <= 0.6);
  });

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    lines: still,
  };
}

export function snapTargetsFromCard(card: HTMLElement, ignoreId?: string) {
  const cardRect = card.getBoundingClientRect();
  const targetsX = [0, 50, 100];
  const targetsY = [0, 50, 100];
  if (cardRect.width === 0 || cardRect.height === 0) return { targetsX, targetsY };
  card.querySelectorAll<HTMLElement>("[data-snap-id]").forEach((el) => {
    if (ignoreId && el.dataset.snapId === ignoreId) return;
    const rect = el.getBoundingClientRect();
    const left = ((rect.left - cardRect.left) / cardRect.width) * 100;
    const top = ((rect.top - cardRect.top) / cardRect.height) * 100;
    const width = (rect.width / cardRect.width) * 100;
    const height = (rect.height / cardRect.height) * 100;
    targetsX.push(left, left + width / 2, left + width);
    targetsY.push(top, top + height / 2, top + height);
  });
  return { targetsX, targetsY };
}

export function textLayerDomStyle(
  layer: CardTextLayer,
  layout: Pick<CardLayout, "lineHeight" | "textPadX" | "textPadY">
): Record<string, string | number> {
  const align = layer.textAlign || "left";
  const full = layer.widthMode === "full" || layer.width === 100;
  const custom = layer.widthMode === "custom" || ((layer.width || 0) > 0 && layer.widthMode !== "inline" && layer.widthMode !== "full");
  if (full || custom) {
    return {
      left: full ? "0%" : `${layer.x}%`,
      top: `${layer.y}%`,
      width: full ? "100%" : `${layer.width}%`,
      textAlign: align,
      whiteSpace: "pre-wrap",
      transform: "none",
      color: layer.color || "#ffffff",
      fontSize: `${layer.fontSize}px`,
      fontWeight: layer.fontWeight === "bold" ? "bold" : "normal",
      fontStyle: layer.fontStyle === "italic" ? "italic" : "normal",
      fontFamily: layer.fontFamily || DEFAULT_FONT,
      letterSpacing: `${layer.letterSpacing || 0}px`,
      textDecoration: layer.underline ? "underline" : "none",
      textTransform: layer.textTransform || "none",
      opacity: layer.opacity ?? 1,
      lineHeight: layout.lineHeight,
      padding: `${layout.textPadY}px ${layout.textPadX}px`,
    };
  }
  const transform =
    align === "center" ? "translateX(-50%)" : align === "right" ? "translateX(-100%)" : "none";
  return {
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    color: layer.color || "#ffffff",
    fontSize: `${layer.fontSize}px`,
    fontWeight: layer.fontWeight === "bold" ? "bold" : "normal",
    fontStyle: layer.fontStyle === "italic" ? "italic" : "normal",
    fontFamily: layer.fontFamily || DEFAULT_FONT,
    letterSpacing: `${layer.letterSpacing || 0}px`,
    textDecoration: layer.underline ? "underline" : "none",
    textTransform: layer.textTransform || "none",
    opacity: layer.opacity ?? 1,
    lineHeight: layout.lineHeight,
    padding: `${layout.textPadY}px ${layout.textPadX}px`,
    transform,
    whiteSpace: "nowrap",
  };
}

export function cornerRadiusForFinish(corners: string | undefined, fallback: number): number {
  if (!corners) return fallback;
  if (corners.includes("Rounded")) return 16;
  if (corners.includes("Clipped")) return 0;
  if (corners.includes("Standard") || corners.includes("Square")) return 2;
  return fallback;
}

function orientedInches(width: number, height: number, unit: string, orientation?: string): { w: number; h: number } {
  let w = width;
  let h = height;
  if (orientation === "portrait" && w > h) {
    const t = w;
    w = h;
    h = t;
  } else if (orientation === "landscape" && h > w) {
    const t = w;
    w = h;
    h = t;
  }
  const toIn = (v: number) => {
    if (unit === "in") return v;
    if (unit === "cm") return v / 2.54;
    if (unit === "px") return v / 96;
    return v / 25.4;
  };
  return { w: toIn(w), h: toIn(h) };
}

export function printExportWidth(
  previewWidth: number,
  canvasConfig?: { width?: number; height?: number; unit?: string; orientation?: string }
): number {
  let physical = Math.round(previewWidth * 4);
  if (canvasConfig?.width) {
    const inches = orientedInches(
      canvasConfig.width,
      canvasConfig.height || canvasConfig.width,
      canvasConfig.unit || "mm",
      canvasConfig.orientation
    );
    physical = Math.max(600, Math.round(inches.w * 300));
  }
  return Math.max(physical, 1200);
}

function roundedPath(ctx: CanvasRenderingContext2D, w: number, h: number, radius: number) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  if (r <= 0) {
    ctx.rect(0, 0, w, h);
    return;
  }
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const resolved = mediaSrc(src) || src;
  return new Promise((resolve) => {
    const img = new Image();
    // Same-origin and data URLs stay exportable. A cross-origin retry without
    // CORS would paint the logo and then block PNG download.
    if (!resolved.startsWith("data:") && !resolved.startsWith("/") && !resolved.startsWith(window.location.origin)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = resolved;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (w <= 0 || h <= 0 || !img.width || !img.height) return;
  const ir = img.width / img.height;
  const r = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (ir > r) {
    dh = h;
    dw = h * ir;
    dx = x - (dw - w) / 2;
  } else {
    dw = w;
    dh = w / ir;
    dy = y - (dh - h) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (w <= 0 || h <= 0 || !img.width || !img.height) return;
  const ir = img.width / img.height;
  const r = w / h;
  let dw = w;
  let dh = h;
  if (ir > r) dh = w / ir;
  else dw = h * ir;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function displayText(layer: CardTextLayer): string {
  const raw = layer.text || "";
  if (layer.textTransform === "uppercase") return raw.toUpperCase();
  if (layer.textTransform === "lowercase") return raw.toLowerCase();
  return raw;
}

function clampAlpha(value: unknown, fallback = 1): number {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const unit = n > 1 ? n / 100 : n;
  return Math.min(1, Math.max(0, unit));
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: CardTextLayer,
  scale: number,
  layout: CardLayout,
  canvasWidth: number,
  canvasHeight: number
) {
  const text = displayText(layer);
  if (!text) return;
  const fontSize = Math.max(1, layer.fontSize * scale);
  const weight = layer.fontWeight === "bold" ? "bold" : "normal";
  const style = layer.fontStyle === "italic" ? "italic" : "normal";
  const family = layer.fontFamily || DEFAULT_FONT;
  const align = layer.textAlign || "left";
  const padX = layout.textPadX * scale;
  const padY = layout.textPadY * scale;
  const xPct = (layer.x / 100) * canvasWidth;
  const yPct = (layer.y / 100) * canvasHeight;
  const leading = Math.max(0, (layout.lineHeight - 1) / 2) * fontSize;

  ctx.save();
  ctx.globalAlpha = clampAlpha(layer.opacity, 1);
  ctx.fillStyle = layer.color || "#ffffff";
  ctx.font = `${style} ${weight} ${fontSize}px ${family}`;
  ctx.textBaseline = "top";
  const spacing = (layer.letterSpacing || 0) * scale;
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
  }

  const sized = layer.widthMode === "full" || layer.width === 100 || layer.widthMode === "custom" || (layer.width || 0) > 0;
  const boxWidth = !sized
    ? 0
    : layer.widthMode === "full" || layer.width === 100
      ? canvasWidth
      : ((layer.width || 0) / 100) * canvasWidth;
  let x = xPct;
  if (boxWidth > 0) {
    if (align === "center") {
      ctx.textAlign = "center";
      x = xPct + boxWidth / 2;
    } else if (align === "right") {
      ctx.textAlign = "right";
      x = xPct + boxWidth - padX;
    } else {
      ctx.textAlign = "left";
      x = xPct + padX;
    }
  } else if (align === "left") {
    ctx.textAlign = "left";
    x = xPct + padX;
  } else if (align === "center") {
    ctx.textAlign = "center";
    x = xPct;
  } else {
    ctx.textAlign = "right";
    x = xPct - padX;
  }
  const y = yPct + padY + leading;
  ctx.fillText(text, x, y);

  if (layer.underline) {
    const width = ctx.measureText(text).width;
    let start = x;
    if (align === "center") start = x - width / 2;
    if (align === "right") start = x - width;
    const thickness = Math.max(1, fontSize / 14);
    ctx.fillRect(start, y + fontSize * 0.92, width, thickness);
  }
  ctx.restore();
}

function drawLogoMark(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  layout: CardLayout,
  logoText: string,
  scale: number
) {
  const radius = Math.max(0, Math.min(layout.logoRadius * scale, size / 2));
  ctx.save();
  ctx.beginPath();
  if (radius <= 0) ctx.rect(x, y, size, size);
  else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + size, y, x + size, y + size, radius);
    ctx.arcTo(x + size, y + size, x, y + size, radius);
    ctx.arcTo(x, y + size, x, y, radius);
    ctx.arcTo(x, y, x + size, y, radius);
    ctx.closePath();
  }
  if (img) {
    drawContain(ctx, img, x, y, size, size);
  } else {
    const mark = (logoText || "").trim().slice(0, 3);
    if (mark) {
      ctx.fillStyle = layout.logoColor;
      ctx.fill();
      const previewSize = size / Math.max(scale, 0.001);
      const cssFont = Math.max(layout.minLogoFont, previewSize * layout.logoFontScale) * scale;
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${cssFont}px ${DEFAULT_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(mark, x + size / 2, y + size / 2);
    }
  }
  ctx.restore();
}

function logoOrigin(
  position: LogoPosition,
  canvasWidth: number,
  canvasHeight: number,
  size: number,
  layout: CardLayout,
  scale: number
) {
  const top = layout.logoInsetTop * scale;
  const side = layout.logoInsetSide * scale;
  if (position === "top-left") return { x: side, y: top };
  if (position === "bottom-right") return { x: canvasWidth - size - side, y: canvasHeight - size - top };
  if (position === "center") return { x: (canvasWidth - size) / 2, y: (canvasHeight - size) / 2 };
  return { x: canvasWidth - size - side, y: top };
}

function placedLogoOrigin(
  scene: CardScene,
  canvasWidth: number,
  canvasHeight: number,
  size: number,
  layout: CardLayout,
  scale: number
) {
  if (typeof scene.logoX === "number" && typeof scene.logoY === "number") {
    return {
      x: Math.max(0, Math.min(canvasWidth - size, (scene.logoX / 100) * canvasWidth)),
      y: Math.max(0, Math.min(canvasHeight - size, (scene.logoY / 100) * canvasHeight)),
    };
  }
  return logoOrigin(scene.logoPosition || "top-right", canvasWidth, canvasHeight, size, layout, scale);
}

function isDecor(obj: any) {
  return obj && obj.isVisible !== false && (obj.type === "shape" || obj.type === "image" || obj.type === "logo");
}

export function isArtworkImage(obj: any) {
  return Boolean(obj && obj.isVisible !== false && obj.src && (obj.type === "image" || obj.type === "logo"));
}

export function imageOverridesFromDesign(...sides: Array<{ objects?: any[] } | null | undefined>) {
  const overrides: Record<string, string> = {};
  sides.forEach((side) => {
    (side?.objects || []).forEach((obj) => {
      if (obj?.id && obj.src && (obj.type === "image" || obj.type === "logo")) {
        overrides[String(obj.id)] = obj.src;
      }
    });
  });
  return overrides;
}

export function withImageOverrides(objects: any[] | undefined, overrides: Record<string, string>) {
  return (objects || []).map((obj) => {
    if (!isArtworkImage(obj)) return obj;
    return {
      ...obj,
      src: overrides[obj.id] || obj.src,
      fit: obj.fit === "cover" ? "cover" : "contain",
    };
  });
}

function isTextObject(obj: any) {
  return obj && obj.isVisible !== false && (obj.type === "text" || !obj.type);
}

export async function renderCardToCanvas(scene: CardScene, exportWidth: number): Promise<HTMLCanvasElement> {
  const previewWidth = Math.max(1, scene.previewWidth);
  const previewHeight = Math.max(1, scene.previewHeight);
  const width = Math.max(1, Math.round(exportWidth));
  const height = Math.max(1, Math.round(width * (previewHeight / previewWidth)));
  const scale = width / previewWidth;
  const layout = scene.layout;
  const radius = (scene.cornerRadius ?? layout.cornerRadius) * scale;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* fonts still drawable with fallbacks */
    }
  }

  const objects = scene.objects || [];
  const srcs = new Set<string>();
  if (scene.side === "front" && scene.uploadedImage) srcs.add(scene.uploadedImage);
  if (scene.logoImage) srcs.add(scene.logoImage);
  if (scene.bgImage) srcs.add(scene.bgImage);
  objects.forEach((obj) => {
    if ((obj.type === "image" || obj.type === "logo") && obj.src) srcs.add(obj.src);
  });
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    [...srcs].map(async (src) => {
      const img = await loadImage(src);
      if (img) images.set(src, img);
    })
  );

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  roundedPath(ctx, width, height, radius);
  ctx.clip();
  ctx.fillStyle = scene.bgColor || "#18181b";
  ctx.fillRect(0, 0, width, height);
  if (scene.bgGradient) {
    const rad = (((scene.bgGradientAngle ?? 135) - 90) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const len = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
    const gradient = ctx.createLinearGradient(
      cx - Math.cos(rad) * len / 2,
      cy - Math.sin(rad) * len / 2,
      cx + Math.cos(rad) * len / 2,
      cy + Math.sin(rad) * len / 2
    );
    gradient.addColorStop(0, scene.bgColor || "#18181b");
    gradient.addColorStop(1, scene.bgGradient);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  if (scene.bgImage) {
    const bg = images.get(scene.bgImage);
    if (bg) {
      ctx.save();
      ctx.globalAlpha = clampAlpha(scene.bgOpacity, 1);
      if (scene.bgFit === "contain") drawContain(ctx, bg, 0, 0, width, height);
      else drawCover(ctx, bg, 0, 0, width, height);
      ctx.restore();
    }
  }

  if (scene.side === "front" && scene.uploadedImage) {
    const img = images.get(scene.uploadedImage);
    if (img) {
      const inset = scene.fitMode === "safe" ? (scene.safeInset || 0) * scale : 0;
      ctx.save();
      ctx.globalAlpha = (scene.imageOpacity ?? 100) / 100;
      const boxW = width - inset * 2;
      const boxH = height - inset * 2;
      const draw = scene.fitMode === "safe" ? drawContain : drawCover;
      if (scene.rotation) {
        ctx.translate(width / 2, height / 2);
        ctx.rotate((scene.rotation * Math.PI) / 180);
        draw(ctx, img, -boxW / 2, -boxH / 2, boxW, boxH);
      } else {
        draw(ctx, img, inset, inset, boxW, boxH);
      }
      ctx.restore();
    }
  }

  const drawObject = (obj: any) => {
    if (!obj || obj.isVisible === false) return;
    const x = ((obj.x || 0) / 100) * width;
    const y = ((obj.y || 0) / 100) * height;
    const w = ((obj.width || 20) / 100) * width;
    const h = ((obj.height || 20) / 100) * height;
    if (obj.type === "shape") {
      ctx.save();
      ctx.globalAlpha = clampAlpha(obj.opacity, 1);
      ctx.beginPath();
      if (obj.shapeType === "circle") {
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      } else {
        const br = (obj.borderRadius || 0) * scale;
        const rr = Math.max(0, Math.min(br, w / 2, h / 2));
        if (rr <= 0) ctx.rect(x, y, w, h);
        else {
          ctx.moveTo(x + rr, y);
          ctx.arcTo(x + w, y, x + w, y + h, rr);
          ctx.arcTo(x + w, y + h, x, y + h, rr);
          ctx.arcTo(x, y + h, x, y, rr);
          ctx.arcTo(x, y, x + w, y, rr);
          ctx.closePath();
        }
      }
      ctx.fillStyle = obj.fill || "#3b82f6";
      ctx.fill();
      if (obj.stroke && obj.strokeWidth) {
        ctx.strokeStyle = obj.stroke;
        ctx.lineWidth = obj.strokeWidth * scale;
        ctx.stroke();
      }
      ctx.restore();
    } else if ((obj.type === "image" || obj.type === "logo") && obj.src) {
      const img = images.get(obj.src);
      if (!img) return;
      ctx.save();
      ctx.globalAlpha = clampAlpha(obj.opacity, 1);
      if (obj.fit === "cover") drawCover(ctx, img, x, y, w, h);
      else drawContain(ctx, img, x, y, w, h);
      ctx.restore();
    } else if (obj.type === "text" || !obj.type) {
      drawTextLayer(
        ctx,
        {
          text: obj.text || "",
          x: obj.x || 0,
          y: obj.y || 0,
          fontSize: obj.fontSize || 16,
          color: obj.color || scene.textColor || "#ffffff",
          fontWeight: obj.fontWeight,
          fontStyle: obj.fontStyle,
          fontFamily: obj.fontFamily,
          textAlign: obj.textAlign,
          width: obj.width,
          widthMode: obj.widthMode,
          letterSpacing: obj.letterSpacing,
          underline: obj.underline,
          opacity: obj.opacity,
          textTransform: obj.textTransform,
        },
        scale,
        layout,
        width,
        height
      );
    }
  };

  if (scene.supportsBack === false && scene.side === "back") {
    ctx.fillStyle = "#71717a";
    ctx.font = `italic ${Math.round(18 * scale)}px ${DEFAULT_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Blank side", width / 2, height / 2);
    ctx.restore();
    return canvas;
  }

  if (scene.side === "back") {
    const visible = objects.filter((obj) => obj && obj.isVisible !== false);
    const decor = visible.filter((obj) => obj.type && obj.type !== "text");
    decor.forEach(drawObject);

    const artworkLogo = objects.some(isArtworkImage);
    const logoImg = scene.logoImage ? images.get(scene.logoImage) || null : null;
    if (!artworkLogo && (logoImg || scene.logoText)) {
      const size = Math.max(8, (scene.logoSize || 36) * scale);
      const origin = placedLogoOrigin(scene, width, height, size, layout, scale);
      drawLogoMark(ctx, logoImg, origin.x, origin.y, size, layout, scene.logoText || "", scale);
    }

    const layers =
      scene.textLayers && scene.textLayers.length > 0
        ? scene.textLayers
        : visible.filter(isTextDesignObject).map((obj) => ({
            text: obj.text || "",
            x: obj.x || 0,
            y: obj.y || 0,
            fontSize: obj.fontSize || 16,
            color: obj.color || scene.textColor || "#ffffff",
            fontWeight: obj.fontWeight,
            fontStyle: obj.fontStyle,
            fontFamily: obj.fontFamily,
            textAlign: obj.textAlign,
            width: obj.width,
            widthMode: obj.widthMode,
            letterSpacing: obj.letterSpacing,
            underline: obj.underline,
            opacity: obj.opacity,
            textTransform: obj.textTransform,
          }));
    layers.forEach((layer) => drawTextLayer(ctx, layer, scale, layout, width, height));
  } else {
    objects.filter(isDecor).forEach(drawObject);

    const artworkLogo = objects.some(isArtworkImage);
    const logoImg = scene.logoImage ? images.get(scene.logoImage) || null : null;
    if (!artworkLogo && (logoImg || scene.logoText)) {
      const size = Math.max(8, (scene.logoSize || 36) * scale);
      const origin = placedLogoOrigin(scene, width, height, size, layout, scale);
      drawLogoMark(ctx, logoImg, origin.x, origin.y, size, layout, scene.logoText || "", scale);
    }

    const layers = scene.textLayers && scene.textLayers.length > 0
      ? scene.textLayers
      : objects.filter(isTextObject).map((obj) => ({
          text: obj.text || "",
          x: obj.x || 0,
          y: obj.y || 0,
          fontSize: obj.fontSize || 16,
          color: obj.color || "#ffffff",
          fontWeight: obj.fontWeight,
          fontStyle: obj.fontStyle,
          fontFamily: obj.fontFamily,
          textAlign: obj.textAlign,
          width: obj.width,
          widthMode: obj.widthMode,
          letterSpacing: obj.letterSpacing,
          underline: obj.underline,
          opacity: obj.opacity,
          textTransform: obj.textTransform,
        }));
    layers.forEach((layer) => drawTextLayer(ctx, layer, scale, layout, width, height));
  }

  ctx.restore();
  return canvas;
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
