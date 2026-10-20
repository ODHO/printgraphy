/**
 * Product mockup canvas helpers (t-shirts, handbags, apparel).
 * Additive to flat / dieline category canvases — does not replace them.
 */

export type CanvasType = "flat" | "dieline" | "mockup";

export interface PrintArea {
  /** Left edge as % of mockup width (0–100) */
  x: number;
  /** Top edge as % of mockup height (0–100) */
  y: number;
  /** Width as % of mockup width (1–100) */
  width: number;
  /** Height as % of mockup height (1–100) */
  height: number;
  /** Optional label shown in admin / editor */
  label?: string;
}

export interface PrintPlacement {
  id: string;
  name: string;
  mockupImage?: string;
  printArea: PrintArea;
}

export interface ApparelColor {
  id: string;
  name: string;
  hex: string;
  mockupImage?: string;
}

export interface ApparelSize {
  id: string;
  name: string;
}

export interface DecorationMethod {
  id: string;
  name: string;
  description?: string;
  priceAddOn?: number;
}

export const DEFAULT_PRINT_AREA: PrintArea = {
  x: 28,
  y: 22,
  width: 44,
  height: 40,
  label: "Print Area",
};

export const DEFAULT_APPAREL_SIZES: ApparelSize[] = [
  { id: "xs", name: "XS" },
  { id: "s", name: "S" },
  { id: "m", name: "M" },
  { id: "l", name: "L" },
  { id: "xl", name: "XL" },
  { id: "xxl", name: "XXL" },
];

export const DEFAULT_DECORATION_METHODS: DecorationMethod[] = [
  { id: "dtg", name: "Direct-to-Garment", description: "Soft feel, unlimited colors", priceAddOn: 0 },
  { id: "screen", name: "Screen Print", description: "Durable, best for simple designs", priceAddOn: 0 },
  { id: "heat", name: "Heat Transfer", description: "Firm feel, full color", priceAddOn: 2 },
  { id: "embroidery", name: "Embroidery", description: "Textured, professional finish", priceAddOn: 5 },
];

export const DEFAULT_PRINT_PLACEMENTS: PrintPlacement[] = [
  {
    id: "front",
    name: "Front",
    printArea: { ...DEFAULT_PRINT_AREA, label: "Front Print" },
  },
  {
    id: "back",
    name: "Back",
    printArea: { x: 28, y: 18, width: 44, height: 42, label: "Back Print" },
  },
];

export function asCanvasType(value: unknown, fallback: CanvasType = "flat"): CanvasType {
  if (value === "flat" || value === "dieline" || value === "mockup") return value;
  return fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function cleanPrintArea(input: unknown, fallback: PrintArea = DEFAULT_PRINT_AREA): PrintArea {
  if (!input || typeof input !== "object") return { ...fallback };
  const row = input as Record<string, unknown>;
  const width = clamp(Number(row.width), 5, 100);
  const height = clamp(Number(row.height), 5, 100);
  const x = clamp(Number(row.x), 0, 100 - width);
  const y = clamp(Number(row.y), 0, 100 - height);
  if (![width, height, x, y].every(Number.isFinite)) return { ...fallback };
  return {
    x,
    y,
    width,
    height,
    label: String(row.label || fallback.label || "Print Area").trim() || "Print Area",
  };
}

export function cleanPrintPlacements(input: unknown): PrintPlacement[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_PRINT_PLACEMENTS.map((p) => ({ ...p, printArea: { ...p.printArea } }));
  }
  const out: PrintPlacement[] = [];
  for (let i = 0; i < input.length; i++) {
    const raw = input[i];
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const name = String(row.name || "").trim();
    if (!name) continue;
    out.push({
      id: String(row.id || newId("place")).trim(),
      name,
      mockupImage: String(row.mockupImage || "").trim(),
      printArea: cleanPrintArea(row.printArea || row.print_area, {
        ...DEFAULT_PRINT_AREA,
        label: `${name} Print`,
      }),
    });
  }
  return out.length > 0
    ? out
    : DEFAULT_PRINT_PLACEMENTS.map((p) => ({ ...p, printArea: { ...p.printArea } }));
}

export function cleanApparelColors(input: unknown): ApparelColor[] {
  if (!Array.isArray(input)) return [];
  const out: ApparelColor[] = [];
  for (let i = 0; i < input.length; i++) {
    const raw = input[i];
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const name = String(row.name || "").trim();
    if (!name) continue;
    let hex = String(row.hex || "#ffffff").trim();
    if (!hex.startsWith("#")) hex = `#${hex}`;
    if (!/^#[0-9a-fA-F]{3,8}$/.test(hex)) hex = "#ffffff";
    out.push({
      id: String(row.id || newId("color")).trim(),
      name,
      hex,
      mockupImage: String(row.mockupImage || "").trim(),
    });
  }
  return out;
}

export function cleanApparelSizes(input: unknown): ApparelSize[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_APPAREL_SIZES.map((s) => ({ ...s }));
  }
  const out: ApparelSize[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const name = String(row.name || "").trim();
    if (!name) continue;
    out.push({
      id: String(row.id || newId("size")).trim(),
      name,
    });
  }
  return out.length > 0 ? out : DEFAULT_APPAREL_SIZES.map((s) => ({ ...s }));
}

export function cleanDecorationMethods(input: unknown): DecorationMethod[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_DECORATION_METHODS.map((d) => ({ ...d }));
  }
  const out: DecorationMethod[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const name = String(row.name || "").trim();
    if (!name) continue;
    out.push({
      id: String(row.id || newId("deco")).trim(),
      name,
      description: String(row.description || "").trim(),
      priceAddOn: Math.max(0, Number(row.priceAddOn) || 0),
    });
  }
  return out.length > 0 ? out : DEFAULT_DECORATION_METHODS.map((d) => ({ ...d }));
}

/** Map a click on the mockup (%) into print-area local coords (0–100). Null if outside. */
export function mockupPointToPrintArea(
  mockupXPercent: number,
  mockupYPercent: number,
  area: PrintArea
): { x: number; y: number } | null {
  if (mockupXPercent < area.x || mockupXPercent > area.x + area.width) return null;
  if (mockupYPercent < area.y || mockupYPercent > area.y + area.height) return null;
  const localX = ((mockupXPercent - area.x) / Math.max(area.width, 0.001)) * 100;
  const localY = ((mockupYPercent - area.y) / Math.max(area.height, 0.001)) * 100;
  return { x: clamp(localX, 0, 100), y: clamp(localY, 0, 100) };
}

/** Convert print-area local % to absolute mockup % for overlays. */
export function printAreaPointToMockup(
  localX: number,
  localY: number,
  area: PrintArea
): { x: number; y: number } {
  return {
    x: area.x + (clamp(localX, 0, 100) / 100) * area.width,
    y: area.y + (clamp(localY, 0, 100) / 100) * area.height,
  };
}

export function normalizeMockupFields(input: {
  canvas_type?: unknown;
  mockup_image?: unknown;
  print_area?: unknown;
  print_placements?: unknown;
  apparel_colors?: unknown;
  apparel_sizes?: unknown;
  decoration_methods?: unknown;
}) {
  const canvas_type = asCanvasType(input.canvas_type, "flat");
  const mockup_image = String(input.mockup_image || "").trim();
  const print_area = cleanPrintArea(input.print_area);
  const print_placements = cleanPrintPlacements(input.print_placements);
  const apparel_colors = cleanApparelColors(input.apparel_colors);
  const apparel_sizes = cleanApparelSizes(input.apparel_sizes);
  const decoration_methods = cleanDecorationMethods(input.decoration_methods);
  return {
    canvas_type,
    mockup_image,
    print_area,
    print_placements,
    apparel_colors,
    apparel_sizes,
    decoration_methods,
  };
}
