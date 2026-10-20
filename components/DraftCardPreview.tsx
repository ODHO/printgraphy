"use client";

import { useState } from "react";
import { mediaSrc } from "@/lib/mediaUrl";

interface DraftCardPreviewProps {
  design: {
    name?: string;
    thumbnail?: string;
    designData?: any;
  };
  className?: string;
}

export default function DraftCardPreview({ design, className = "" }: DraftCardPreviewProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const rawThumb = design?.thumbnail;
  const thumbUrl = rawThumb ? mediaSrc(rawThumb) || rawThumb : "";
  const hasValidThumb = Boolean(
    thumbUrl &&
      thumbUrl.trim() !== "" &&
      !imgFailed &&
      thumbUrl !== "/placeholder.jpg" &&
      thumbUrl !== "undefined"
  );

  const dData = design?.designData || {};
  const cfg = dData.canvas_config || { width: 105, height: 60 };
  const width = cfg.width || 105;
  const height = cfg.height || 60;
  const isPortrait = cfg.orientation === "portrait" || height > width;
  const cardAspect = width / height;

  const frontDesign = dData.front_design || {};
  const bgColor = dData.bgColor || frontDesign.bgColor || "#1e293b";
  const bgGradient = dData.bgGradient || frontDesign.bgGradient;
  const bgGradientAngle = dData.bgGradientAngle || frontDesign.bgGradientAngle || 135;
  const frontBgImage = dData.frontBgImage || frontDesign.bgImage;

  const objects = frontDesign.objects || [];
  const textLayers = dData.textLayers || [];
  const logoText = dData.logoText;
  const logoImage = dData.logoImage || dData.cardData?.logoImage || dData.cardData?.uploadedImage;
  const cardData = dData.cardData || {};
  const textColor = dData.textColor || "#ffffff";

  return (
    <div className={`relative w-full aspect-[4/3] bg-gradient-to-b from-[#181b26] to-[#0f1118] p-3.5 flex items-center justify-center overflow-hidden select-none ${className}`}>
      {/* Radial grid mesh background pattern */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* Floating Mini Card Container */}
      <div
        className="relative rounded-lg overflow-hidden shadow-[0_12px_28px_-6px_rgba(0,0,0,0.65)] border border-white/15 transition-all duration-300 group-hover:scale-[1.05] group-hover:-translate-y-1 flex items-center justify-center"
        style={{
          aspectRatio: `${cardAspect}`,
          width: isPortrait ? "48%" : "82%",
          maxHeight: "82%",
          backgroundColor: bgColor,
          backgroundImage: bgGradient
            ? `linear-gradient(${bgGradientAngle}deg, ${bgColor}, ${bgGradient})`
            : undefined,
        }}
      >
        {hasValidThumb ? (
          <img
            src={thumbUrl}
            alt={design?.name || "Draft design"}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          /* Live Canvas Representation */
          <div className="relative w-full h-full p-2 overflow-hidden flex flex-col justify-between" style={{ color: textColor }}>
            {frontBgImage && (
              <img
                src={mediaSrc(frontBgImage) || frontBgImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            )}

            {/* Logo or Header */}
            <div className="relative z-10 flex items-center justify-between gap-1">
              {logoImage ? (
                <img src={mediaSrc(logoImage) || logoImage} alt="" className="w-5 h-5 object-contain" />
              ) : logoText ? (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#064FE0] text-white leading-none shadow-xs">
                  {logoText}
                </span>
              ) : cardData.company ? (
                <span className="text-[8px] font-bold truncate opacity-90">{cardData.company}</span>
              ) : (
                <span className="text-[7px] font-extrabold uppercase tracking-widest opacity-60">PRINTGRAPHY</span>
              )}
            </div>

            {/* Render Objects or TextLayers or CardData */}
            <div className="relative z-10 flex-1 w-full mt-1">
              {objects.length > 0 ? (
                objects.map((obj: any, idx: number) => {
                  if (obj.isVisible === false) return null;
                  if (obj.type === "text") {
                    return (
                      <span
                        key={obj.id || idx}
                        className="absolute truncate leading-none font-sans font-bold"
                        style={{
                          left: `${obj.x}%`,
                          top: `${obj.y}%`,
                          fontSize: `${Math.max(5, Math.round((obj.fontSize || 12) * 0.38))}px`,
                          color: obj.color || textColor,
                          fontWeight: obj.fontWeight || "normal",
                        }}
                      >
                        {obj.text}
                      </span>
                    );
                  }
                  if (obj.type === "shape") {
                    return (
                      <div
                        key={obj.id || idx}
                        className="absolute"
                        style={{
                          left: `${obj.x}%`,
                          top: `${obj.y}%`,
                          width: `${obj.width}%`,
                          height: `${obj.height}%`,
                          backgroundColor: obj.fill || "#3b82f6",
                          borderRadius: obj.shapeType === "circle" ? "9999px" : "2px",
                        }}
                      />
                    );
                  }
                  return null;
                })
              ) : textLayers.length > 0 ? (
                textLayers.map((layer: any, idx: number) => (
                  <span
                    key={layer.id || idx}
                    className="absolute truncate leading-none font-sans font-bold"
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      fontSize: `${Math.max(5, Math.round((layer.fontSize || 12) * 0.38))}px`,
                      color: layer.color || textColor,
                      fontWeight: layer.fontWeight || "normal",
                    }}
                  >
                    {layer.text}
                  </span>
                ))
              ) : (
                <div className="flex flex-col justify-end h-full text-left space-y-0.5">
                  {cardData.name && (
                    <p className="text-[9px] font-extrabold truncate leading-tight">{cardData.name}</p>
                  )}
                  {cardData.title && (
                    <p className="text-[7px] font-medium opacity-80 truncate leading-tight">{cardData.title}</p>
                  )}
                  {cardData.email && (
                    <p className="text-[6px] font-normal opacity-60 truncate leading-none mt-0.5">{cardData.email}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
