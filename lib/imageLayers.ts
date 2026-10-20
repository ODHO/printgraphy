/** Customer-added image layers (logo, profile photo, etc.). */

export type ImageLayer = {
  id: string;
  src: string;
  x: number;
  y: number;
  /** Width as % of card */
  width: number;
  /** Height as % of card */
  height: number;
  fit: "contain" | "cover";
  /** 0–1 */
  opacity: number;
  label?: string;
};

export const DEFAULT_IMAGE_LAYER_SRC = "/placeholder.jpg";

export function createImageLayer(partial?: Partial<ImageLayer>): ImageLayer {
  return {
    id: partial?.id || `img-${Date.now()}`,
    src: partial?.src || DEFAULT_IMAGE_LAYER_SRC,
    x: partial?.x ?? 70,
    y: partial?.y ?? 8,
    width: partial?.width ?? 18,
    height: partial?.height ?? 18,
    fit: partial?.fit === "cover" ? "cover" : "contain",
    opacity: typeof partial?.opacity === "number" ? partial.opacity : 1,
    label: partial?.label || "Image",
  };
}

export function imageLayerToObject(layer: ImageLayer) {
  return {
    id: layer.id,
    type: "image" as const,
    src: layer.src,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    fit: layer.fit,
    opacity: layer.opacity,
    isVisible: true,
  };
}

export function imageLayersFromObjects(objects: any[] | undefined): ImageLayer[] {
  return (objects || [])
    .filter((o) => o && (o.type === "image" || o.type === "logo") && o.src && o.isVisible !== false)
    .map((o: any, i: number) =>
      createImageLayer({
        id: String(o.id || `img-${i}`),
        src: o.src,
        x: o.x ?? 70,
        y: o.y ?? 8,
        width: o.width ?? 18,
        height: o.height ?? 18,
        fit: o.fit === "cover" ? "cover" : "contain",
        opacity: typeof o.opacity === "number" ? o.opacity : 1,
        label: o.type === "logo" ? "Logo" : o.label || "Image",
      })
    );
}
