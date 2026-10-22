"use client";

import { mediaSrc } from "@/lib/mediaUrl";
import type { ImageLayer } from "@/lib/imageLayers";

export default function ImageLayerControls({
  layer,
  onChange,
  onReplace,
  onDelete,
}: {
  layer: ImageLayer;
  onChange: (patch: Partial<ImageLayer>) => void;
  onReplace: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/70 space-y-3">
      <div className="flex justify-between items-center gap-2">
        <label className="text-base font-bold text-zinc-700">Image Layer</label>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="text-base text-red-500 hover:underline font-semibold cursor-pointer"
          >
            Delete Layer
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl border border-zinc-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
          <img
            src={mediaSrc(layer.src) || layer.src}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <input
            type="text"
            value={layer.label || "Image"}
            onChange={(e) => onChange({ label: e.target.value })}
            className="w-full px-3 py-1.5 bg-white rounded-xl border border-zinc-300 text-base focus:border-[#e74b2d] focus:outline-none"
            placeholder="Layer name"
          />
          <button
            type="button"
            onClick={onReplace}
            className="px-3 py-1.5 text-base font-bold text-[#e74b2d] bg-sky-50 border border-sky-200 rounded-xl cursor-pointer hover:bg-sky-100"
          >
            Replace Image
          </button>
        </div>
      </div>

      <div>
        <label className="text-base font-bold text-zinc-700 block mb-1">
          Width ({Math.round(layer.width)}%)
        </label>
        <input
          type="range"
          min={6}
          max={60}
          value={layer.width}
          onChange={(e) => {
            const width = Number(e.target.value);
            onChange({ width, height: width });
          }}
          className="w-full accent-[#e74b2d]"
        />
      </div>

      <div>
        <label className="text-base font-bold text-zinc-700 block mb-1">
          Opacity ({Math.round((layer.opacity ?? 1) * 100)}%)
        </label>
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round((layer.opacity ?? 1) * 100)}
          onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
          className="w-full accent-[#e74b2d]"
        />
      </div>

      <div>
        <label className="text-base font-bold text-zinc-700 block mb-1">Fit</label>
        <div className="inline-flex p-1 bg-white rounded-xl border border-zinc-200">
          {(["contain", "cover"] as const).map((fit) => (
            <button
              key={fit}
              type="button"
              onClick={() => onChange({ fit })}
              className={`px-3 py-1.5 text-base font-semibold rounded-lg cursor-pointer capitalize ${
                layer.fit === fit ? "bg-[#e74b2d] text-white" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {fit}
            </button>
          ))}
        </div>
      </div>

      <p className="text-base text-zinc-500">
        Drag the image on the 2D card to place it. Use Replace for logo or employee profile photos.
      </p>
    </div>
  );
}
