"use client";

import { useEffect, useRef, useState } from "react";
import { mediaSrc } from "@/lib/mediaUrl";
import {
  DEFAULT_PRINT_AREA,
  mockupPointToPrintArea,
  type PrintArea,
} from "@/lib/mockupCanvas";
import { Icon } from "@/components/admin/ui";

/* ── Editor chrome tokens (light, brand palette) ── */
const fieldInput =
  "w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 shadow-xs transition focus:outline-none focus:border-[#329AD4] focus:ring-4 focus:ring-[#329AD4]/10";
const kbdClass =
  "inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#2884b8] shadow-xs";
const toolBtn =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-zinc-600 transition-all cursor-pointer hover:bg-white hover:text-[#2884b8] hover:shadow-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none disabled:hover:text-zinc-600";
const COPY_PATH = "M9 9h10v10H9V9zM5 15V5h10";
const CLIP_PATH = "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2";
const CUT_PATH = "M6 9a3 3 0 100-6 3 3 0 000 6zm0 12a3 3 0 100-6 3 3 0 000 6zM20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12";
const PASTE_PATH = "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h4M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6m0 0h2a2 2 0 012 2v3m-6 3h6v8h-6v-8z";

function MIcon({ d }: { d: string }) {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export type MockupEditorLayer =
  | {
      id: string;
      type?: "text";
      text: string;
      x: number;
      y: number;
      fontSize: number;
      color: string;
      fontWeight?: "normal" | "bold";
    }
  | {
      id: string;
      type: "image";
      src: string;
      text?: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize?: number;
      color?: string;
      fontWeight?: "normal" | "bold";
    };

/** @deprecated use MockupEditorLayer */
export type MockupLayer = MockupEditorLayer;

interface MockupPrintAreaEditorProps {
  mockupImage: string;
  printArea: PrintArea;
  layers: MockupEditorLayer[];
  activeLayerId?: string | null;
  onPrintAreaChange: (area: PrintArea) => void;
  onAddLayerAt: (x: number, y: number) => void;
  onSelectLayer?: (id: string) => void;
  onUpdateLayer?: (id: string, patch: Record<string, unknown>) => void;
  onDeleteLayer?: (id: string) => void;
  /** Insert a full layer (should already have a unique id) */
  onInsertLayer?: (layer: MockupEditorLayer) => void;
  onUploadImageClick?: () => void;
  uploadingImage?: boolean;
  className?: string;
}

type AreaDragMode = "move-area" | "resize-br" | null;

function isImageLayer(
  layer: MockupEditorLayer
): layer is Extract<MockupEditorLayer, { type: "image" }> {
  return layer.type === "image" && Boolean((layer as { src?: string }).src);
}

function cloneLayer(layer: MockupEditorLayer, offset = 4): MockupEditorLayer {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  if (isImageLayer(layer)) {
    return {
      ...layer,
      id,
      x: Math.min(96, layer.x + offset),
      y: Math.min(96, layer.y + offset),
    };
  }
  return {
    ...layer,
    type: "text",
    id,
    x: Math.min(96, layer.x + offset),
    y: Math.min(96, layer.y + offset),
  };
}

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export default function MockupPrintAreaEditor({
  mockupImage,
  printArea,
  layers,
  activeLayerId,
  onPrintAreaChange,
  onAddLayerAt,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onInsertLayer,
  onUploadImageClick,
  uploadingImage,
  className = "",
}: MockupPrintAreaEditorProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const clipboardRef = useRef<MockupEditorLayer | null>(null);
  const [hasClipboard, setHasClipboard] = useState(false);
  const [areaDrag, setAreaDrag] = useState<AreaDragMode>(null);
  const areaDragStart = useRef<{ mx: number; my: number; area: PrintArea } | null>(null);
  const layerMovedRef = useRef(false);
  const [shortcutFlash, setShortcutFlash] = useState("");

  const area = printArea || DEFAULT_PRINT_AREA;
  const active = layers.find((l) => l.id === activeLayerId) || null;

  const flash = (msg: string) => {
    setShortcutFlash(msg);
    window.setTimeout(() => setShortcutFlash(""), 1200);
  };

  const deleteActive = () => {
    if (!activeLayerId || !onDeleteLayer) return;
    onDeleteLayer(activeLayerId);
    flash("Deleted");
  };

  const duplicateActive = () => {
    if (!active || !onInsertLayer) return;
    onInsertLayer(cloneLayer(active));
    flash("Duplicated");
  };

  const copyActive = () => {
    if (!active) return;
    clipboardRef.current = structuredClone(active);
    setHasClipboard(true);
    flash("Copied");
  };

  const cutActive = () => {
    if (!active || !onDeleteLayer) return;
    clipboardRef.current = structuredClone(active);
    setHasClipboard(true);
    onDeleteLayer(active.id);
    flash("Cut");
  };

  const pasteClipboard = () => {
    if (!clipboardRef.current || !onInsertLayer) return;
    onInsertLayer(cloneLayer(clipboardRef.current));
    flash("Pasted");
  };

  const nudgeActive = (dx: number, dy: number) => {
    if (!active || !onUpdateLayer) return;
    onUpdateLayer(active.id, {
      x: Math.min(100, Math.max(0, Math.round((active.x + dx) * 10) / 10)),
      y: Math.min(100, Math.max(0, Math.round((active.y + dy) * 10) / 10)),
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const root = rootRef.current;
      if (!root) return;
      const focusInside = root.contains(document.activeElement);
      if (!focusInside && !activeLayerId) return;
      if (!focusInside && document.activeElement !== document.body && document.activeElement !== root) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if ((e.key === "Delete" || e.key === "Backspace") && activeLayerId && onDeleteLayer) {
        e.preventDefault();
        onDeleteLayer(activeLayerId);
        flash("Deleted");
        return;
      }

      if (mod && key === "d" && active && onInsertLayer) {
        e.preventDefault();
        onInsertLayer(cloneLayer(active));
        flash("Duplicated");
        return;
      }
      if (mod && key === "c" && active) {
        e.preventDefault();
        clipboardRef.current = structuredClone(active);
        setHasClipboard(true);
        flash("Copied");
        return;
      }
      if (mod && key === "x" && active && onDeleteLayer) {
        e.preventDefault();
        clipboardRef.current = structuredClone(active);
        setHasClipboard(true);
        onDeleteLayer(active.id);
        flash("Cut");
        return;
      }
      if (mod && key === "v" && clipboardRef.current && onInsertLayer) {
        e.preventDefault();
        onInsertLayer(cloneLayer(clipboardRef.current));
        flash("Pasted");
        return;
      }

      if (!active || !onUpdateLayer) return;
      const step = e.shiftKey ? 5 : 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onUpdateLayer(active.id, {
          x: Math.min(100, Math.max(0, Math.round((active.x - step) * 10) / 10)),
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onUpdateLayer(active.id, {
          x: Math.min(100, Math.max(0, Math.round((active.x + step) * 10) / 10)),
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onUpdateLayer(active.id, {
          y: Math.min(100, Math.max(0, Math.round((active.y - step) * 10) / 10)),
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onUpdateLayer(active.id, {
          y: Math.min(100, Math.max(0, Math.round((active.y + step) * 10) / 10)),
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeLayerId, active, onDeleteLayer, onInsertLayer, onUpdateLayer]);

  const clientToPercent = (clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / Math.max(rect.width, 1)) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / Math.max(rect.height, 1)) * 100)),
    };
  };

  const startAreaDrag = (mode: AreaDragMode, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setAreaDrag(mode);
    const p = clientToPercent(e.clientX, e.clientY);
    areaDragStart.current = { mx: p.x, my: p.y, area: { ...area } };
  };

  const onStagePointerMove = (e: React.PointerEvent) => {
    if (!areaDrag || !areaDragStart.current) return;
    const p = clientToPercent(e.clientX, e.clientY);
    const dx = p.x - areaDragStart.current.mx;
    const dy = p.y - areaDragStart.current.my;
    const start = areaDragStart.current.area;

    if (areaDrag === "move-area") {
      onPrintAreaChange({
        ...start,
        x: Math.min(100 - start.width, Math.max(0, start.x + dx)),
        y: Math.min(100 - start.height, Math.max(0, start.y + dy)),
      });
      return;
    }

    if (areaDrag === "resize-br") {
      onPrintAreaChange({
        ...start,
        width: Math.min(100 - start.x, Math.max(8, start.width + dx)),
        height: Math.min(100 - start.y, Math.max(8, start.height + dy)),
      });
    }
  };

  const endAreaDrag = () => {
    setAreaDrag(null);
    areaDragStart.current = null;
  };

  const handleStageClick = (e: React.MouseEvent) => {
    if (areaDrag || layerMovedRef.current) {
      layerMovedRef.current = false;
      return;
    }
    const p = clientToPercent(e.clientX, e.clientY);
    const local = mockupPointToPrintArea(p.x, p.y, area);
    if (!local) return;
    onAddLayerAt(local.x, local.y);
  };

  const startLayerDrag = (e: React.PointerEvent, layerId: string) => {
    if (!onUpdateLayer) return;
    e.preventDefault();
    e.stopPropagation();
    layerMovedRef.current = false;
    onSelectLayer?.(layerId);
    rootRef.current?.focus({ preventScroll: true });

    const printEl = (e.currentTarget as HTMLElement).parentElement;
    if (!printEl) return;

    const startX = e.clientX;
    const startY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const localFromEvent = (clientX: number, clientY: number) => {
      const rect = printEl.getBoundingClientRect();
      return {
        x: Math.min(100, Math.max(0, ((clientX - rect.left) / Math.max(rect.width, 1)) * 100)),
        y: Math.min(100, Math.max(0, ((clientY - rect.top) / Math.max(rect.height, 1)) * 100)),
      };
    };

    const onMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) > 2 || Math.abs(ev.clientY - startY) > 2) {
        layerMovedRef.current = true;
      }
      const local = localFromEvent(ev.clientX, ev.clientY);
      onUpdateLayer(layerId, {
        x: Math.round(local.x * 10) / 10,
        y: Math.round(local.y * 10) / 10,
      });
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

  const startImageResize = (
    e: React.PointerEvent,
    layer: Extract<MockupEditorLayer, { type: "image" }>
  ) => {
    if (!onUpdateLayer) return;
    e.preventDefault();
    e.stopPropagation();
    const printEl = (e.currentTarget as HTMLElement).parentElement?.parentElement;
    if (!printEl) return;
    const rectStart = printEl.getBoundingClientRect();
    const local = (cx: number, cy: number) => ({
      x: ((cx - rectStart.left) / Math.max(rectStart.width, 1)) * 100,
      y: ((cy - rectStart.top) / Math.max(rectStart.height, 1)) * 100,
    });
    const start = local(e.clientX, e.clientY);
    const startW = layer.width;
    const startH = layer.height;

    const onMove = (ev: PointerEvent) => {
      const cur = local(ev.clientX, ev.clientY);
      const dw = (cur.x - start.x) * 2;
      const dh = (cur.y - start.y) * 2;
      onUpdateLayer(layer.id, {
        width: Math.min(80, Math.max(8, startW + dw)),
        height: Math.min(80, Math.max(8, startH + dh)),
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (!mockupImage) {
    return (
      <div
        className={`flex flex-col items-center rounded-2xl border-2 border-dashed border-[#b8e0f6] bg-[#f0f8fd] p-10 text-center ${className}`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#329AD4] shadow-xs">
          <Icon name="image" className="w-7 h-7" />
        </span>
        <p className="mt-4 text-sm font-semibold text-zinc-900">
          Upload a product mockup image to define the print area.
        </p>
        <p className="text-sm text-zinc-500 mt-1">
          T-shirt, handbag, hoodie, tote — any product photo works.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className={`space-y-3 outline-none ${className}`}
      onMouseDown={() => rootRef.current?.focus({ preventScroll: true })}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200/70 bg-white px-3 py-2.5 shadow-xs text-xs text-zinc-500">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 leading-relaxed">
          Drag layers to move.{" "}
          <kbd className={kbdClass}>Del</kbd> remove ·{" "}
          <kbd className={kbdClass}>Ctrl+D</kbd> duplicate ·{" "}
          <kbd className={kbdClass}>Ctrl+C / X / V</kbd> copy cut paste · arrows
          nudge
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          {shortcutFlash && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2884b8] bg-[#EAF5FB] ring-1 ring-inset ring-[#329AD4]/20 px-2.5 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-[#329AD4]" />
              {shortcutFlash}
            </span>
          )}
          {onUploadImageClick && (
            <button
              type="button"
              disabled={uploadingImage}
              onClick={onUploadImageClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#329AD4] text-white shadow-sm shadow-[#329AD4]/25 hover:bg-[#2884b8] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {uploadingImage ? (
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <Icon name="upload" className="w-3.5 h-3.5" strokeWidth={2.2} />
              )}
              {uploadingImage ? "Uploading…" : "Upload logo / image"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="inline-flex items-center gap-0.5 rounded-xl bg-zinc-100/80 p-1">
          <button
            type="button"
            disabled={!active || !onInsertLayer}
            onClick={duplicateActive}
            className={toolBtn}
            title="Ctrl+D"
          >
            <MIcon d={COPY_PATH} />
            Duplicate
          </button>
          <button
            type="button"
            disabled={!active}
            onClick={copyActive}
            className={toolBtn}
            title="Ctrl+C"
          >
            <MIcon d={CLIP_PATH} />
            Copy
          </button>
          <button
            type="button"
            disabled={!active || !onDeleteLayer}
            onClick={cutActive}
            className={toolBtn}
            title="Ctrl+X"
          >
            <MIcon d={CUT_PATH} />
            Cut
          </button>
          <button
            type="button"
            disabled={!hasClipboard || !onInsertLayer}
            onClick={pasteClipboard}
            className={toolBtn}
            title="Ctrl+V"
          >
            <MIcon d={PASTE_PATH} />
            Paste
          </button>
        </div>
        <button
          type="button"
          disabled={!active || !onDeleteLayer}
          onClick={deleteActive}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-rose-200 bg-white text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-rose-50 transition-colors"
          title="Delete / Backspace"
        >
          <Icon name="trash" className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>

      <div className="rounded-2xl border border-[#dbeefb] bg-[#f6fafd] [background-image:radial-gradient(#cfe4f3_1px,transparent_1px)] [background-size:18px_18px] p-4">
        <div
          ref={stageRef}
          onPointerMove={onStagePointerMove}
          onPointerUp={endAreaDrag}
          onPointerLeave={endAreaDrag}
          onClick={handleStageClick}
          className="relative w-full max-w-xl mx-auto aspect-[4/5] rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100 shadow-sm cursor-crosshair select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaSrc(mockupImage) || mockupImage}
            alt="Product mockup"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />

          <div className="absolute inset-0 pointer-events-none bg-black/25" />

          <div
            className="absolute z-10 border-2 border-[#329AD4] bg-sky-400/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] cursor-move"
            style={{
              left: `${area.x}%`,
              top: `${area.y}%`,
              width: `${area.width}%`,
              height: `${area.height}%`,
            }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("[data-mockup-layer]")) return;
              startAreaDrag("move-area", e);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="absolute -top-6 left-0 text-[10px] font-bold uppercase tracking-wider text-white bg-[#329AD4] px-1.5 py-0.5 rounded shadow pointer-events-none">
              {area.label || "Print Area"}
            </span>

            {layers.map((layer) => {
              const isActive = activeLayerId === layer.id;
              if (isImageLayer(layer)) {
                return (
                  <div
                    key={layer.id}
                    data-mockup-layer
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLayer?.(layer.id);
                    }}
                    onPointerDown={(e) => startLayerDrag(e, layer.id)}
                    className={`absolute z-20 cursor-grab active:cursor-grabbing touch-none ${
                      isActive
                        ? "ring-2 ring-[#329AD4] ring-offset-1"
                        : "hover:ring-1 hover:ring-[#329AD4]/60"
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
                      className="w-full h-full object-contain pointer-events-none drop-shadow"
                      draggable={false}
                    />
                    {isActive && (
                      <div
                        className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-full bg-[#329AD4] border-2 border-white shadow cursor-nwse-resize touch-none"
                        onPointerDown={(e) => startImageResize(e, layer)}
                      />
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={layer.id}
                  data-mockup-layer
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLayer?.(layer.id);
                  }}
                  onPointerDown={(e) => startLayerDrag(e, layer.id)}
                  className={`absolute z-20 px-1 py-0.5 cursor-grab active:cursor-grabbing touch-none whitespace-nowrap ${
                    isActive ? "ring-2 ring-[#329AD4] bg-white/50 rounded" : ""
                  }`}
                  style={{
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    transform: "translate(-50%, -50%)",
                    fontSize: `${Math.max(10, Math.round((layer.fontSize || 14) * 0.55))}px`,
                    color: layer.color || "#111",
                    fontWeight: layer.fontWeight || "bold",
                  }}
                >
                  {layer.text || "Text"}
                </div>
              );
            })}

            <button
              type="button"
              aria-label="Resize print area"
              className="absolute bottom-0 right-0 w-4 h-4 translate-x-1/2 translate-y-1/2 rounded-full bg-[#329AD4] border-2 border-white shadow cursor-se-resize z-30"
              onPointerDown={(e) => startAreaDrag("resize-br", e)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>

      {layers.length > 0 && (
        <div className="rounded-2xl border border-zinc-200/70 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
              <Icon name="layers" className="w-3.5 h-3.5" />
            </span>
            <span className="text-sm font-semibold text-zinc-900">Layers</span>
            <span className="rounded-full bg-zinc-100 px-1.5 text-[10px] font-semibold text-zinc-600">{layers.length}</span>
          </div>
          <ul className="p-1.5 space-y-0.5 max-h-48 overflow-y-auto">
            {layers.map((layer, idx) => (
              <li
                key={layer.id}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  activeLayerId === layer.id
                    ? "bg-[#EAF5FB] ring-1 ring-[#b8e0f6] text-[#2884b8]"
                    : "text-zinc-800 hover:bg-[#f0f8fd]"
                }`}
                onClick={() => {
                  onSelectLayer?.(layer.id);
                  rootRef.current?.focus({ preventScroll: true });
                }}
              >
                {isImageLayer(layer) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaSrc(layer.src) || layer.src}
                    alt=""
                    className="w-8 h-8 object-contain rounded-md border border-zinc-200 bg-white"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-md border border-zinc-200 bg-white flex items-center justify-center text-[11px] font-bold text-zinc-500">
                    T
                  </span>
                )}
                <span className="flex-1 text-xs font-semibold truncate">
                  {isImageLayer(layer) ? `Image ${idx + 1}` : layer.text || `Text ${idx + 1}`}
                </span>
                <button
                  type="button"
                  title="Duplicate"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onInsertLayer) onInsertLayer(cloneLayer(layer));
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white hover:text-[#2884b8] hover:shadow-xs cursor-pointer transition-colors"
                >
                  <MIcon d={COPY_PATH} />
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLayer?.(layer.id);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition-colors"
                >
                  <Icon name="trash" className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl border border-zinc-200/70 bg-white p-3 shadow-xs">
        {(
          [
            ["x", "X %"],
            ["y", "Y %"],
            ["width", "Width %"],
            ["height", "Height %"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs font-semibold text-zinc-700">
            {label}
            <input
              type="number"
              step="any"
              min={0}
              max={100}
              value={Number(area[key].toFixed(1))}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (!Number.isFinite(next)) return;
                onPrintAreaChange({ ...area, [key]: next });
              }}
              className={`${fieldInput} mt-1.5 font-mono`}
            />
          </label>
        ))}
      </div>

      {active && onUpdateLayer && (
        <div className="rounded-2xl border border-zinc-200/70 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-100">
            <span className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
                <Icon name={isImageLayer(active) ? "image" : "edit"} className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-semibold text-zinc-900">
                Selected {isImageLayer(active) ? "image" : "text"} layer
              </span>
            </span>
            <button
              type="button"
              onClick={deleteActive}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
            >
              <Icon name="trash" className="w-3.5 h-3.5" />
              Remove layer
            </button>
          </div>
          <div className="p-4">
          {isImageLayer(active) ? (
            <div className="flex flex-wrap items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaSrc(active.src) || active.src}
                alt=""
                className="w-14 h-14 object-contain rounded-xl border border-zinc-200 bg-zinc-50"
              />
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-2">
                Size
                <input
                  type="range"
                  min={8}
                  max={80}
                  value={Math.round((active.width + active.height) / 2)}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 36;
                    onUpdateLayer(active.id, { width: v, height: v });
                  }}
                  className="w-32 accent-[#329AD4] cursor-pointer"
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={active.text}
                onChange={(e) => onUpdateLayer(active.id, { text: e.target.value })}
                className={`${fieldInput} sm:col-span-2 font-semibold`}
                placeholder="Layer text"
              />
              <input
                type="color"
                value={active.color || "#111111"}
                onChange={(e) => onUpdateLayer(active.id, { color: e.target.value })}
                className="h-9 w-full rounded-lg border border-zinc-200 bg-white p-0.5 shadow-xs cursor-pointer"
              />
              <label className="text-xs font-semibold text-zinc-700 sm:col-span-3 flex items-center gap-2">
                Font size
                <input
                  type="number"
                  min={8}
                  max={96}
                  value={active.fontSize || 14}
                  onChange={(e) =>
                    onUpdateLayer(active.id, { fontSize: Number(e.target.value) || 14 })
                  }
                  className="w-20 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-mono text-zinc-900 shadow-xs transition focus:outline-none focus:border-[#329AD4] focus:ring-4 focus:ring-[#329AD4]/10"
                />
                <button
                  type="button"
                  onClick={() =>
                    onUpdateLayer(active.id, {
                      fontWeight: active.fontWeight === "bold" ? "normal" : "bold",
                    })
                  }
                  className={`px-3 py-1.5 text-xs font-semibold border rounded-lg cursor-pointer transition-colors ${
                    active.fontWeight === "bold"
                      ? "bg-[#EAF5FB] border-[#b8e0f6] text-[#2884b8]"
                      : "bg-white border-zinc-200 text-zinc-600 hover:border-[#b8e0f6]"
                  }`}
                >
                  {active.fontWeight === "bold" ? "Bold" : "Regular"}
                </button>
              </label>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
