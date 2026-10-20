import type { CanvasUnit } from "@/lib/canvasUtils";
import { asCanvasUnit, convertUnit } from "@/lib/canvasUtils";

export type GuideLineUnit = "percent" | CanvasUnit;
export type GuideLineType = "fold" | "score" | "cut" | "guide";
export type GuideLineOrientation = "vertical" | "horizontal";

export interface CanvasGuideLine {
  id: string;
  name: string;
  orientation: GuideLineOrientation;
  position: number;
  unit?: GuideLineUnit;
  lineType?: GuideLineType;
  color?: string;
}

const GUIDE_UNITS: GuideLineUnit[] = ["percent", "mm", "cm", "in", "px"];
const GUIDE_TYPES: GuideLineType[] = ["fold", "score", "cut", "guide"];

export function asGuideLineUnit(value: unknown, fallback: GuideLineUnit = "percent"): GuideLineUnit {
  if (value === "%" || value === "percentage") return "percent";
  return GUIDE_UNITS.includes(value as GuideLineUnit) ? (value as GuideLineUnit) : fallback;
}

export function asGuideLineType(value: unknown, fallback: GuideLineType = "fold"): GuideLineType {
  return GUIDE_TYPES.includes(value as GuideLineType) ? (value as GuideLineType) : fallback;
}

export function cleanGuideLines(input: unknown): CanvasGuideLine[] {
  if (!Array.isArray(input)) return [];
  const lines: CanvasGuideLine[] = [];
  for (let i = 0; i < input.length; i++) {
    const raw = input[i];
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const orientation =
      row.orientation === "horizontal" ? "horizontal" : row.orientation === "vertical" ? "vertical" : null;
    if (!orientation) continue;
    const position = Number(row.position);
    if (!Number.isFinite(position)) continue;
    const id = String(row.id || `line_${i + 1}_${Date.now()}`).trim() || `line_${i + 1}`;
    lines.push({
      id,
      name: String(row.name || (orientation === "vertical" ? `Vertical Fold ${i + 1}` : `Horizontal Fold ${i + 1}`)).trim(),
      orientation,
      position,
      unit: asGuideLineUnit(row.unit, "percent"),
      lineType: asGuideLineType(row.lineType, "fold"),
      color: String(row.color || "#064FE0").trim() || "#064FE0",
    });
  }
  return lines;
}

/** Resolve a guide line position to 0–100% of the canvas axis. */
export function guideLinePositionPercent(
  line: Pick<CanvasGuideLine, "orientation" | "position" | "unit">,
  canvasWidth: number,
  canvasHeight: number,
  canvasUnit: CanvasUnit = "mm"
): number {
  const position = Number(line.position);
  if (!Number.isFinite(position)) return 0;
  const unit = asGuideLineUnit(line.unit, "percent");
  if (unit === "percent") return Math.min(100, Math.max(0, position));

  const axis = line.orientation === "vertical" ? Math.max(1, canvasWidth) : Math.max(1, canvasHeight);
  const axisUnit = asCanvasUnit(canvasUnit, "mm");
  const inCanvasUnit = unit === axisUnit ? position : convertUnit(position, unit, axisUnit);
  return Math.min(100, Math.max(0, (inCanvasUnit / axis) * 100));
}

export function guideLineDash(lineType?: GuideLineType): "dashed" | "dotted" | "solid" {
  if (lineType === "score") return "dotted";
  if (lineType === "cut") return "solid";
  return "dashed";
}
