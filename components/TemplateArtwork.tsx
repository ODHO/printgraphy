"use client";

import { useEffect, useState } from "react";
import { calculateFitDimensions } from "@/lib/canvasUtils";
import { renderCardToCanvas, STUDIO_LAYOUT } from "@/lib/cardRender";

/** Raster of a saved template side, using the same renderer as the editor. */
export default function TemplateArtwork({
  template,
  side = "front",
  className = "h-full w-full object-contain",
}: {
  template: any;
  side?: "front" | "back";
  className?: string;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    const design = side === "back" ? template?.back_design : template?.front_design;
    const cfg = template?.canvas_config || template?.canvasConfig || {
      width: 105,
      height: 60,
      unit: "mm",
      orientation: "landscape",
    };
    const fit = calculateFitDimensions(
      {
        width: cfg.width || 105,
        height: cfg.height || 60,
        unit: cfg.unit || "mm",
        orientation: cfg.orientation,
        bleed: cfg.bleed,
        safe_area: cfg.safe_area,
      },
      680,
      450
    );

    renderCardToCanvas(
      {
        side,
        bgColor: design?.bgColor || (side === "back" ? "#141414" : "#18181b"),
        bgImage: design?.bgImage,
        bgFit: design?.bgFit,
        bgOpacity: design?.bgOpacity,
        bgGradient: design?.bgGradient,
        bgGradientAngle: design?.bgGradientAngle,
        objects: design?.objects || [],
        textLayers: [],
        layout: STUDIO_LAYOUT,
        previewWidth: fit.renderWidth,
        previewHeight: fit.renderHeight,
        logoText: "",
        supportsBack: true,
        cornerRadius: 0,
      },
      Math.round(fit.renderWidth * 2)
    )
      .then((canvas) => {
        if (!cancelled) setSrc(canvas.toDataURL("image/png"));
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });

    return () => {
      cancelled = true;
    };
  }, [template, side]);

  if (!src) {
    return <div className="h-full w-full animate-pulse bg-zinc-800/40" />;
  }

  return <img src={src} alt="" className={className} />;
}
