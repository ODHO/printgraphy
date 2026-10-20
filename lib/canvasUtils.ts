/**
 * Canvas Coordinate & Unit Utilities
 * Provides conversion between physical dimensions (mm, cm, in, px)
 * and editor pixel dimensions, maintaining exact aspect ratios.
 */

export type CanvasUnit = "mm" | "cm" | "in" | "px";
export type CanvasOrientation = "landscape" | "portrait";

export interface CanvasDimensions {
  width: number;
  height: number;
  unit: CanvasUnit;
  orientation?: CanvasOrientation;
  bleed?: number;
  bleedUnit?: CanvasUnit;
  safe_area?: number;
  safeAreaUnit?: CanvasUnit;
}

// DPI constants for standard screen and print calculations
const DPI_SCREEN = 96; // Standard 96 DPI for web screens
const MM_PER_INCH = 25.4;
const CM_PER_INCH = 2.54;

/**
 * Converts a physical dimension to screen pixels at 96 DPI
 */
export function toScreenPixels(value: number, unit: CanvasUnit): number {
  if (value <= 0) return 0;
  switch (unit) {
    case "px":
      return value;
    case "in":
      return value * DPI_SCREEN;
    case "cm":
      return (value / CM_PER_INCH) * DPI_SCREEN;
    case "mm":
    default:
      return (value / MM_PER_INCH) * DPI_SCREEN;
  }
}

export interface PrintSize {
  name: string;
  width: number;
  height: number;
  unit: CanvasUnit;
  bleed: number;
  bleedUnit: CanvasUnit;
  safeArea: number;
  safeAreaUnit: CanvasUnit;
  note?: string;
}

const CANVAS_UNITS: CanvasUnit[] = ["mm", "cm", "in", "px"];

export function asCanvasUnit(value: unknown, fallback: CanvasUnit = "in"): CanvasUnit {
  return CANVAS_UNITS.includes(value as CanvasUnit) ? (value as CanvasUnit) : fallback;
}

export function cleanPrintSizes(input: unknown): PrintSize[] {
  if (!Array.isArray(input)) return [];
  const sizes: PrintSize[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const width = Number(row.width);
    const height = Number(row.height);
    const name = String(row.name || "").trim();
    if (!name || !(width > 0) || !(height > 0)) continue;
    const unit = asCanvasUnit(row.unit, "in");
    sizes.push({
      name,
      width,
      height,
      unit,
      bleed: Math.max(0, Number(row.bleed) || 0),
      bleedUnit: asCanvasUnit(row.bleedUnit, unit),
      safeArea: Math.max(0, Number(row.safeArea) || 0),
      safeAreaUnit: asCanvasUnit(row.safeAreaUnit, unit),
      note: String(row.note || "").trim(),
    });
  }
  return sizes;
}

/** Converts a length from one canvas unit into another. */
export function convertUnit(value: number, from: CanvasUnit, to: CanvasUnit): number {
  if (!value || from === to) return value || 0;
  return fromScreenPixels(toScreenPixels(value, from), to);
}

/**
 * Converts screen pixels to physical dimension
 */
export function fromScreenPixels(pixels: number, unit: CanvasUnit): number {
  switch (unit) {
    case "px":
      return Math.round(pixels);
    case "in":
      return Number((pixels / DPI_SCREEN).toFixed(2));
    case "cm":
      return Number(((pixels / DPI_SCREEN) * CM_PER_INCH).toFixed(2));
    case "mm":
    default:
      return Number(((pixels / DPI_SCREEN) * MM_PER_INCH).toFixed(1));
  }
}

/**
 * Computes the aspect ratio (width / height) taking orientation into account
 */
export function getCanvasAspectRatio(config: CanvasDimensions): number {
  let w = config.width || 105;
  let h = config.height || 60;

  if (config.orientation === "portrait" && w > h) {
    // Swap if orientation is portrait but raw values are landscape
    const temp = w;
    w = h;
    h = temp;
  } else if (config.orientation === "landscape" && h > w) {
    const temp = w;
    w = h;
    h = temp;
  }

  return w / h;
}

/**
 * Calculates optimal editor canvas dimensions to fit within a target viewport box
 * while strictly maintaining the physical aspect ratio.
 */
export function calculateFitDimensions(
  config: CanvasDimensions,
  maxViewportWidth: number = 720,
  maxViewportHeight: number = 460
): {
  renderWidth: number;
  renderHeight: number;
  scale: number;
  aspectRatio: number;
  bleedPx: number;
  safeAreaPx: number;
} {
  const aspect = getCanvasAspectRatio(config);

  let renderWidth = maxViewportWidth;
  let renderHeight = renderWidth / aspect;

  if (renderHeight > maxViewportHeight) {
    renderHeight = maxViewportHeight;
    renderWidth = renderHeight * aspect;
  }

  // Bleed and safe area can use their own unit. Convert into the canvas unit
  // before measuring them as a fraction of the trim width.
  const rawWidth = config.orientation === "portrait" && config.width > config.height ? config.height : config.width;
  const canvasUnit = config.unit || "mm";
  const bleed = convertUnit(config.bleed || 0, config.bleedUnit || canvasUnit, canvasUnit);
  const safeArea = convertUnit(config.safe_area || 0, config.safeAreaUnit || canvasUnit, canvasUnit);

  // Percentage of dimension
  const bleedPercent = rawWidth > 0 ? (bleed / rawWidth) : 0;
  const safeAreaPercent = rawWidth > 0 ? (safeArea / rawWidth) : 0;

  const bleedPx = Math.round(renderWidth * bleedPercent);
  const safeAreaPx = Math.round(renderWidth * safeAreaPercent);

  return {
    renderWidth: Math.round(renderWidth),
    renderHeight: Math.round(renderHeight),
    scale: renderWidth / (config.width || 105),
    aspectRatio: aspect,
    bleedPx,
    safeAreaPx,
  };
}

/**
 * Sync helper: converts full canvas objects into legacy textLayers & templateData
 * so existing customer business card components continue working without changes.
 */
export function syncCanvasToLegacyTemplateData(
  frontBgColor: string,
  frontObjects: any[]
): {
  bgColor: string;
  textColor: string;
  logoPosition: "top-right" | "top-left" | "center" | "bottom-right";
  logoText: string;
  logoSize: number;
  logoImage: string | null;
  imageOpacity: number;
  textLayers: Array<{
    id: string;
    text: string;
    x: number;
    y: number;
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
  }>;
} {
  const textObjects = frontObjects.filter((o) => o.type === "text" || !o.type);
  const logoObj = frontObjects.find((o) => o.type === "logo");
  const firstText = textObjects[0];

  const textLayers = textObjects.map((o, idx) => ({
    id: String(o.id || idx + 1),
    text: o.text || "Text",
    x: Math.round(o.x ?? 10),
    y: Math.round(o.y ?? 20 + idx * 15),
    fontSize: o.fontSize || 14,
    color: o.color || "#ffffff",
    fontWeight: (o.fontWeight === "bold" ? "bold" : "normal") as "normal" | "bold",
    fontStyle: (o.fontStyle === "italic" ? "italic" : "normal") as "normal" | "italic",
    fontFamily: o.fontFamily as string | undefined,
    textAlign: o.textAlign as "left" | "center" | "right" | undefined,
    letterSpacing: o.letterSpacing as number | undefined,
    underline: !!o.underline,
    opacity: o.opacity as number | undefined,
    textTransform: o.textTransform as "none" | "uppercase" | "lowercase" | undefined,
  }));

  return {
    bgColor: frontBgColor || "#18181b",
    textColor: firstText?.color || "#ffffff",
    logoPosition: "top-right",
    logoText: logoObj?.text || "",
    logoSize: logoObj?.width || 36,
    logoImage: logoObj?.src || null,
    imageOpacity: 90,
    textLayers: textLayers.length > 0 ? textLayers : [
      { id: "1", text: "Stephen", x: 10, y: 30, fontSize: 24, color: "#ffffff", fontWeight: "bold" },
      { id: "2", text: "Manager", x: 10, y: 48, fontSize: 13, color: "#38bdf8", fontWeight: "normal" },
    ],
  };
}
