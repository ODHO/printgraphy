"use client";

import { useRef } from "react";
import { mediaSrc } from "@/lib/mediaUrl";
import { cleanPrintArea, type PrintArea } from "@/lib/mockupCanvas";

/** @deprecated Prefer MockupDesignLayer — kept for existing call sites */
export interface MockupTextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: string;
  textAlign?: string;
}

export type MockupDesignLayer =
  | {
      id: string;
      type: "text";
      text: string;
      x: number;
      y: number;
      fontSize: number;
      color: string;
      fontWeight?: "normal" | "bold";
      fontStyle?: string;
      textAlign?: string;
    }
  | {
      id: string;
      type: "image";
      src: string;
      x: number;
      y: number;
      /** Width as % of print area */
      width: number;
      /** Height as % of print area */
      height: number;
    };

interface MockupCanvasStageProps {
  mockupImage: string;
  printArea?: PrintArea | null;
  layers: Array<MockupDesignLayer | MockupTextLayer>;
  activeLayerId?: string | null;
  /** Click empty print area — typically add text */
  onAddLayerAt?: (x: number, y: number) => void;
  onSelectLayer?: (id: string) => void;
  onMoveLayer?: (id: string, x: number, y: number) => void;
  /** Resize image layers (width/height as % of print area) */
  onResizeLayer?: (id: string, width: number, height: number) => void;
  className?: string;
}

function normalizeLayer(layer: MockupDesignLayer | MockupTextLayer): MockupDesignLayer {
  if ("type" in layer && layer.type === "image") return layer;
  if ("type" in layer && layer.type === "text") return layer;
  const t = layer as MockupTextLayer;
  return {
    id: t.id,
    type: "text",
    text: t.text,
    x: t.x,
    y: t.y,
    fontSize: t.fontSize,
    color: t.color,
    fontWeight: t.fontWeight,
    fontStyle: t.fontStyle,
    textAlign: t.textAlign,
  };
}

/** Customer/admin preview: product photo with printable zone and draggable text/image layers. */
export default function MockupCanvasStage({
  mockupImage,
  printArea,
  layers,
  activeLayerId,
  onAddLayerAt,
  onSelectLayer,
  onMoveLayer,
  onResizeLayer,
  className = "",
}: MockupCanvasStageProps) {
  const area = cleanPrintArea(printArea);
  const dragMovedRef = useRef(false);

  const clientToLocal = (el: HTMLElement, clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / Math.max(rect.width, 1)) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / Math.max(rect.height, 1)) * 100)),
    };
  };

  const startDrag = (
    e: React.PointerEvent<HTMLElement>,
    layerId: string,
    zone: HTMLElement | null
  ) => {
    if (!onMoveLayer || !zone) return;
    e.stopPropagation();
    e.preventDefault();
    dragMovedRef.current = false;
    const startX = e.clientX;
    const startY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) {
        dragMovedRef.current = true;
      }
      const local = clientToLocal(zone, ev.clientX, ev.clientY);
      onMoveLayer(layerId, local.x, local.y);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  if (!mockupImage) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-zinc-500 ${className}`}
      >
        No product mockup image configured for this category.
      </div>
    );
  }

  const normalized = layers.map(normalizeLayer);

  return (
    <div
      className={`relative w-full max-w-md mx-auto aspect-[4/5] rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100 shadow-md select-none ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaSrc(mockupImage) || mockupImage}
        alt="Product"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      <div
        className="absolute z-10 border-2 border-dashed border-[#e74b2d]/90 bg-white/10 cursor-crosshair"
        style={{
          left: `${area.x}%`,
          top: `${area.y}%`,
          width: `${area.width}%`,
          height: `${area.height}%`,
        }}
        onClick={(e) => {
          if (!onAddLayerAt || dragMovedRef.current) {
            dragMovedRef.current = false;
            return;
          }
          const local = clientToLocal(e.currentTarget, e.clientX, e.clientY);
          onAddLayerAt(local.x, local.y);
        }}
      >
        <span className="absolute -top-5 left-0 text-[9px] font-bold uppercase tracking-wider text-white bg-[#e74b2d] px-1.5 py-0.5 rounded pointer-events-none">
          {area.label || "Print Area"}
        </span>

        {normalized.map((layer) => {
          const isActive = activeLayerId === layer.id;
          if (layer.type === "image") {
            return (
              <div
                key={layer.id}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLayer?.(layer.id);
                }}
                onPointerDown={(e) => {
                  onSelectLayer?.(layer.id);
                  startDrag(e, layer.id, e.currentTarget.parentElement);
                }}
                className={`absolute z-20 cursor-grab active:cursor-grabbing touch-none ${
                  isActive ? "ring-2 ring-[#e74b2d] ring-offset-1" : "hover:ring-1 hover:ring-[#e74b2d]/50"
                }`}
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${Math.max(8, layer.width)}%`,
                  height: `${Math.max(8, layer.height)}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaSrc(layer.src) || layer.src}
                  alt=""
                  className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
                  draggable={false}
                />
                {isActive && onResizeLayer && (
                  <div
                    className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-full bg-[#e74b2d] border-2 border-white shadow cursor-nwse-resize touch-none"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const zone = e.currentTarget.parentElement?.parentElement;
                      if (!zone) return;
                      const start = clientToLocal(zone, e.clientX, e.clientY);
                      const startW = layer.width;
                      const startH = layer.height;
                      const onMove = (ev: PointerEvent) => {
                        const local = clientToLocal(zone, ev.clientX, ev.clientY);
                        const dw = (local.x - start.x) * 2;
                        const dh = (local.y - start.y) * 2;
                        onResizeLayer(
                          layer.id,
                          Math.min(80, Math.max(8, startW + dw)),
                          Math.min(80, Math.max(8, startH + dh))
                        );
                      };
                      const onUp = () => {
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                      };
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                    }}
                  />
                )}
              </div>
            );
          }

          return (
            <div
              key={layer.id}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelectLayer?.(layer.id);
              }}
              onPointerDown={(e) => {
                onSelectLayer?.(layer.id);
                startDrag(e, layer.id, e.currentTarget.parentElement);
              }}
              className={`absolute z-20 px-1 py-0.5 cursor-grab active:cursor-grabbing touch-none whitespace-nowrap ${
                isActive ? "ring-2 ring-[#e74b2d] bg-white/60 rounded" : ""
              }`}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                transform: "translate(-50%, -50%)",
                fontSize: `${Math.max(10, Math.round(layer.fontSize * 0.55))}px`,
                color: layer.color || "#111",
                fontWeight: layer.fontWeight || "bold",
                fontStyle: layer.fontStyle || "normal",
                textAlign: (layer.textAlign as "left" | "center" | "right") || "center",
              }}
            >
              {layer.text || "Text"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
