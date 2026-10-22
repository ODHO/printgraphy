"use client";

import { textLayerDomStyle, type CardLayout, type CardTextLayer } from "@/lib/cardRender";
import { mediaSrc } from "@/lib/mediaUrl";

export default function CardDesignObjects({
  objects,
  layout,
  includeText = false,
  onEditImage,
  onImagePointerDown,
}: {
  objects?: any[];
  layout: CardLayout;
  includeText?: boolean;
  onEditImage?: (id: string) => void;
  onImagePointerDown?: (id: string, event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const items = (objects || []).filter((obj) => {
    if (!obj || obj.isVisible === false) return false;
    if (obj.type === "shape" || obj.type === "image" || obj.type === "logo") return true;
    if (includeText && (obj.type === "text" || !obj.type)) return true;
    return false;
  });

  return (
    <>
      {items.map((obj, index) => {
        if (obj.type === "shape") {
          return (
            <div
              key={obj.id || `shape-${index}`}
              data-snap-id={obj.id || undefined}
              className="absolute pointer-events-none z-[5]"
              style={{
                left: `${obj.x || 0}%`,
                top: `${obj.y || 0}%`,
                width: `${obj.width || 20}%`,
                height: `${obj.height || 20}%`,
                background: obj.fill || "#e74b2d",
                opacity: obj.opacity ?? 1,
                borderRadius: obj.shapeType === "circle" ? "9999px" : `${obj.borderRadius || 0}px`,
                border: obj.stroke ? `${obj.strokeWidth || 1}px solid ${obj.stroke}` : undefined,
              }}
            />
          );
        }
        if ((obj.type === "image" || obj.type === "logo") && obj.src) {
          const frame = {
            left: `${obj.x || 0}%`,
            top: `${obj.y || 0}%`,
            width: `${obj.width || 20}%`,
            height: `${obj.height || 20}%`,
          };
          const image = (
            <img
              src={mediaSrc(obj.src) || obj.src}
              alt=""
              className="w-full h-full pointer-events-none"
              style={{
                objectFit: obj.fit === "cover" ? "cover" : "contain",
                opacity: obj.opacity ?? 1,
              }}
            />
          );
          if ((onEditImage || onImagePointerDown) && obj.id) {
            return (
              <button
                key={obj.id || `image-${index}`}
                type="button"
                data-snap-id={obj.id}
                title="Drag to move. Click to replace."
                onPointerDown={(e) => {
                  if (!onImagePointerDown) return;
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const target = e.currentTarget;
                  const watch = (ev: PointerEvent) => {
                    if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) target.dataset.dragged = "1";
                  };
                  const stop = () => {
                    window.removeEventListener("pointermove", watch);
                    window.removeEventListener("pointerup", stop);
                  };
                  window.addEventListener("pointermove", watch);
                  window.addEventListener("pointerup", stop);
                  onImagePointerDown(obj.id, e);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.currentTarget.dataset.dragged === "1") {
                    delete e.currentTarget.dataset.dragged;
                    return;
                  }
                  onEditImage?.(obj.id);
                }}
                className="absolute z-[8] cursor-grab active:cursor-grabbing rounded-md hover:ring-2 hover:ring-[#e74b2d] bg-transparent p-0"
                style={frame}
              >
                {image}
              </button>
            );
          }
          return (
            <div
              key={obj.id || `image-${index}`}
              data-snap-id={obj.id || undefined}
              className="absolute pointer-events-none z-[5]"
              style={frame}
            >
              {image}
            </div>
          );
        }
        const layer: CardTextLayer = {
          text: obj.text || "",
          x: obj.x || 0,
          y: obj.y || 0,
          fontSize: obj.fontSize || 16,
          color: obj.color || "#ffffff",
          fontWeight: obj.fontWeight,
          fontStyle: obj.fontStyle,
          fontFamily: obj.fontFamily,
          textAlign: obj.textAlign,
          letterSpacing: obj.letterSpacing,
          underline: obj.underline,
          opacity: obj.opacity,
          textTransform: obj.textTransform,
        };
        return (
          <span
            key={obj.id || `text-${index}`}
            className="absolute pointer-events-none z-[6]"
            style={textLayerDomStyle(layer, layout)}
          >
            {layer.text}
          </span>
        );
      })}
    </>
  );
}
