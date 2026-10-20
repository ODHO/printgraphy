"use client";

import type { CanvasUnit } from "@/lib/canvasUtils";
import {
  guideLineDash,
  guideLinePositionPercent,
  type CanvasGuideLine,
} from "@/lib/guideLines";

interface CanvasGuideLinesOverlayProps {
  lines?: CanvasGuideLine[] | null;
  canvasWidth: number;
  canvasHeight: number;
  canvasUnit?: CanvasUnit;
  showLabels?: boolean;
  className?: string;
}

export default function CanvasGuideLinesOverlay({
  lines,
  canvasWidth,
  canvasHeight,
  canvasUnit = "mm",
  showLabels = true,
  className = "",
}: CanvasGuideLinesOverlayProps) {
  if (!lines || lines.length === 0) return null;

  return (
    <>
      {lines.map((line) => {
        const pos = guideLinePositionPercent(line, canvasWidth, canvasHeight, canvasUnit);
        const dash = guideLineDash(line.lineType);
        const color = line.color || "#064FE0";
        const isVertical = line.orientation === "vertical";

        return (
          <div
            key={line.id}
            className={`absolute pointer-events-none z-20 ${className}`}
            style={
              isVertical
                ? {
                    left: `${pos}%`,
                    top: 0,
                    bottom: 0,
                    borderLeft: `2px ${dash} ${color}`,
                  }
                : {
                    top: `${pos}%`,
                    left: 0,
                    right: 0,
                    borderTop: `2px ${dash} ${color}`,
                  }
            }
            title={line.name}
          >
            {showLabels && (
              <span
                className="absolute text-[9px] font-bold text-white px-1 py-0.5 rounded shadow z-20 whitespace-nowrap"
                style={{
                  backgroundColor: color,
                  ...(isVertical ? { top: 4, left: 4 } : { top: 4, left: 4 }),
                }}
              >
                {line.name} ({pos.toFixed(1)}%)
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
