"use client";

import { CARD_FONT_OPTIONS, DEFAULT_FONT, type CardTextLayer } from "@/lib/cardRender";

type StylePatch = Partial<
  Pick<
    CardTextLayer,
    "fontFamily" | "fontStyle" | "fontWeight" | "textAlign" | "letterSpacing" | "underline" | "opacity" | "textTransform"
  >
>;

export default function TextStyleControls({
  layer,
  onChange,
  accent = "#329AD4",
}: {
  layer: CardTextLayer;
  onChange: (patch: StylePatch) => void;
  accent?: string;
}) {
  const opacityPct = Math.round((layer.opacity ?? 1) * 100);
  const align = layer.textAlign || "left";

  const pill = (active: boolean) =>
    `px-2 py-1 text-base font-bold rounded-lg border cursor-pointer ${
      active ? "text-white border-transparent" : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
    }`;

  return (
    <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
      <div>
        <label className="text-base font-bold text-zinc-500 block mb-1">Font</label>
        <select
          value={layer.fontFamily || DEFAULT_FONT}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-base bg-white cursor-pointer"
        >
          {CARD_FONT_OPTIONS.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={pill(layer.fontWeight === "bold")}
          style={layer.fontWeight === "bold" ? { backgroundColor: accent, borderColor: accent } : undefined}
          onClick={() => onChange({ fontWeight: layer.fontWeight === "bold" ? "normal" : "bold" })}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          className={`${pill(layer.fontStyle === "italic")} italic`}
          style={layer.fontStyle === "italic" ? { backgroundColor: accent, borderColor: accent } : undefined}
          onClick={() => onChange({ fontStyle: layer.fontStyle === "italic" ? "normal" : "italic" })}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          className={pill(layer.textTransform === "uppercase")}
          style={layer.textTransform === "uppercase" ? { backgroundColor: accent, borderColor: accent } : undefined}
          onClick={() =>
            onChange({ textTransform: layer.textTransform === "uppercase" ? "none" : "uppercase" })
          }
          title="Uppercase"
        >
          AA
        </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={`${pill(!!layer.underline)} underline`}
          style={layer.underline ? { backgroundColor: accent, borderColor: accent } : undefined}
          onClick={() => onChange({ underline: !layer.underline })}
          title="Underline"
        >
          U
        </button>
        {(["left", "center", "right"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={pill(align === value)}
            style={align === value ? { backgroundColor: accent, borderColor: accent } : undefined}
            onClick={() => onChange({ textAlign: value })}
            title={`Align ${value}`}
          >
            {value === "left" ? "L" : value === "center" ? "C" : "R"}
          </button>
        ))}
       </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="flex justify-between text-base font-bold text-zinc-500 mb-1">
            <span>Letter spacing</span>
            <span>{layer.letterSpacing || 0}px</span>
          </span>
          <input
            type="range"
            min={-2}
            max={12}
            step={0.5}
            value={layer.letterSpacing || 0}
            onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })}
            className="w-full accent-[#329AD4]"
          />
        </label>
        <label className="block">
          <span className="flex justify-between text-base font-bold text-zinc-500 mb-1">
            <span>Opacity</span>
            <span>{opacityPct}%</span>
          </span>
          <input
            type="range"
            min={15}
            max={100}
            value={opacityPct}
            onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
            className="w-full accent-[#329AD4]"
          />
        </label>
      </div>
    </div>
  );
}
