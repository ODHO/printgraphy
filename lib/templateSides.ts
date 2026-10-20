import type { SideMode } from "@/models/Category";

export type SideDesignLike = {
  bgColor?: string;
  bgImage?: string;
  bgFit?: "cover" | "contain";
  bgOpacity?: number;
  bgGradient?: string;
  bgGradientAngle?: number;
  objects?: any[];
  [key: string]: any;
};

export type ResolvedTemplateSides = {
  sideMode: SideMode;
  sidesCount: number;
  sidesNames: string[];
  /** Ordered panel designs from the admin template (length === sidesCount). */
  baseDesigns: SideDesignLike[];
};

function asMode(value: unknown, count: number, supportsBack?: boolean): SideMode {
  if (value === "single" || value === "double" || value === "multi") return value;
  if (count <= 1 || supportsBack === false) return "single";
  if (count === 2) return "double";
  return "multi";
}

function defaultNames(count: number): string[] {
  if (count <= 1) return ["Front Side"];
  if (count === 2) return ["Front Side", "Back Side"];
  return Array.from({ length: count }, (_, i) => `Side ${i + 1}`);
}

function emptyDesign(bg = "#141414"): SideDesignLike {
  return { bgColor: bg, objects: [] };
}

/**
 * Resolve admin template (+ optional category) into a full ordered list of canvas sides.
 * Supports legacy front/back only and newer side_designs arrays.
 */
export function resolveTemplateSides(
  template?: {
    front_design?: SideDesignLike | null;
    back_design?: SideDesignLike | null;
    side_designs?: SideDesignLike[] | null;
    canvas_config?: any;
    canvasConfig?: any;
    supports_back_side?: boolean;
  } | null,
  category?: {
    side_mode?: SideMode;
    sides_count?: number;
    sides_names?: string[];
    supports_back_side?: boolean;
    background_color?: string;
  } | null
): ResolvedTemplateSides {
  const canvas = template?.canvas_config || template?.canvasConfig || {};
  const savedSides = Array.isArray(template?.side_designs) ? template!.side_designs! : [];
  const front = template?.front_design || null;
  const back = template?.back_design || null;

  let count =
    Number(canvas.sides_count) ||
    Number(category?.sides_count) ||
    (savedSides.length > 0 ? savedSides.length : 0) ||
    (front || back ? 2 : 0) ||
    2;

  if (!Number.isFinite(count) || count < 1) count = 2;
  count = Math.max(1, Math.min(12, Math.round(count)));

  const mode = asMode(
    canvas.side_mode || category?.side_mode,
    count,
    canvas.supports_back_side ?? category?.supports_back_side ?? template?.supports_back_side
  );
  if (mode === "single") count = 1;
  else if (mode === "double") count = 2;
  else if (count < 3) count = Math.max(3, savedSides.length || 3);

  const namesIn =
    (Array.isArray(canvas.sides_names) && canvas.sides_names.length > 0
      ? canvas.sides_names
      : Array.isArray(category?.sides_names) && category!.sides_names!.length > 0
        ? category!.sides_names!
        : []) || [];
  const sidesNames = Array.from({ length: count }, (_, i) => String(namesIn[i] || defaultNames(count)[i] || `Side ${i + 1}`));

  const frontIsFullList =
    savedSides.length >= count &&
    savedSides[0] &&
    (!front?.objects?.length ||
      (front.objects?.[0]?.id && savedSides[0]?.objects?.[0]?.id === front.objects[0].id));

  const baseDesigns: SideDesignLike[] = Array.from({ length: count }, (_, i) => {
    if (frontIsFullList && savedSides[i]) {
      return { ...savedSides[i], objects: [...(savedSides[i].objects || [])] };
    }
    if (i === 0) {
      return front
        ? { ...front, objects: [...(front.objects || [])] }
        : emptyDesign(category?.background_color || "#18181b");
    }
    if (i === 1) {
      return back ? { ...back, objects: [...(back.objects || [])] } : emptyDesign("#141414");
    }
    // Extras-only list in side_designs
    const extra = savedSides[i - 2] || savedSides[i];
    return extra ? { ...extra, objects: [...(extra.objects || [])] } : emptyDesign("#141414");
  });

  return {
    sideMode: mode,
    sidesCount: count,
    sidesNames,
    baseDesigns,
  };
}

/** Pull editable text layers from a design side's objects. */
export function textLayersFromSideObjects(objects: any[] | undefined) {
  return (objects || [])
    .filter((obj) => obj && obj.type === "text" && obj.isVisible !== false)
    .map((obj: any, index: number) => ({
      id: String(obj.id || `side-text-${index}`),
      text: obj.text || "",
      x: obj.x ?? 10,
      y: obj.y ?? 20,
      fontSize: obj.fontSize || 14,
      color: obj.color || "#ffffff",
      fontWeight: (obj.fontWeight === "bold" ? "bold" : "normal") as "bold" | "normal",
      fontStyle: obj.fontStyle,
      fontFamily: obj.fontFamily,
      textAlign: obj.textAlign,
      width: obj.width,
      widthMode: obj.widthMode,
      letterSpacing: obj.letterSpacing,
      underline: obj.underline,
      opacity: obj.opacity,
      textTransform: obj.textTransform,
    }));
}

/** Non-text artwork/shapes for a side. */
export function decorFromSideObjects(objects: any[] | undefined) {
  return (objects || []).filter((obj) => obj && obj.type && obj.type !== "text");
}

/** Merge base design with live customer text layers for 3D / save. */
export function mergeSideDesign(
  base: SideDesignLike | undefined,
  textLayers: Array<Record<string, any>>,
  decorObjects?: any[]
): SideDesignLike {
  const decor =
    decorObjects !== undefined
      ? decorObjects
      : decorFromSideObjects(base?.objects);
  return {
    ...(base || emptyDesign()),
    objects: [
      ...decor,
      ...textLayers.map((layer) => ({ ...layer, type: "text" })),
    ],
  };
}
