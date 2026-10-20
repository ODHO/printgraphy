"use client";

import CategoryCanvasEditor, { CategoryInfo, CanvasObject } from "@/components/admin/CategoryCanvasEditor";

interface TemplateFormEditProps {
  template: any;
  allCategories: CategoryInfo[];
}

export default function TemplateFormEdit({ template, allCategories }: TemplateFormEditProps) {
  // Resolve matched Category
  const stored = allCategories.find((c) => c._id === template.categoryId || c.name === template.category);
  const savedCanvas = template.canvas_config || {};
  const matchedCategory: CategoryInfo = stored
    ? {
        ...stored,
        canvas_width: savedCanvas.width ?? stored.canvas_width,
        canvas_height: savedCanvas.height ?? stored.canvas_height,
        unit: savedCanvas.unit || stored.unit,
        orientation: savedCanvas.orientation || stored.orientation,
        bleed: savedCanvas.bleed ?? stored.bleed,
        bleedUnit: savedCanvas.bleedUnit || stored.bleedUnit || savedCanvas.unit || stored.unit,
        safe_area: savedCanvas.safe_area ?? stored.safe_area,
        safeAreaUnit: savedCanvas.safeAreaUnit || stored.safeAreaUnit || savedCanvas.unit || stored.unit,
        side_mode: savedCanvas.side_mode || stored.side_mode,
        sides_count: savedCanvas.sides_count ?? stored.sides_count,
        sides_names: savedCanvas.sides_names || stored.sides_names,
        guide_lines: savedCanvas.guide_lines || stored.guide_lines || [],
        supports_back_side:
          savedCanvas.supports_back_side ??
          stored.supports_back_side ??
          true,
      }
    : {
      name: template.category || "Business Cards",
      canvas_width: savedCanvas.width || 105,
      canvas_height: savedCanvas.height || 60,
      unit: savedCanvas.unit || "mm",
      orientation: savedCanvas.orientation || "landscape",
      bleed: savedCanvas.bleed || 3,
      bleedUnit: savedCanvas.bleedUnit || savedCanvas.unit || "mm",
      safe_area: savedCanvas.safe_area || 3,
      safeAreaUnit: savedCanvas.safeAreaUnit || savedCanvas.unit || "mm",
      background_color: savedCanvas.background_color || "#18181b",
      supports_back_side: savedCanvas.supports_back_side ?? true,
      side_mode: savedCanvas.side_mode || "double",
      sides_count: savedCanvas.sides_count || 2,
      sides_names: savedCanvas.sides_names || ["Front Side", "Back Side"],
      guide_lines: savedCanvas.guide_lines || [],
    };

  // Convert legacy templateData to front_design objects if front_design not already present
  let frontDesign = template.front_design;
  if (!frontDesign || !frontDesign.objects || frontDesign.objects.length === 0) {
    const legacyLayers: CanvasObject[] = (template.templateData?.textLayers || []).map((l: any) => ({
      id: l.id,
      type: "text" as const,
      text: l.text,
      x: l.x,
      y: l.y,
      width: 50,
      height: 12,
      fontSize: l.fontSize,
      color: l.color,
      fontWeight: l.fontWeight,
    }));

    if (template.templateData?.logoText) {
      legacyLayers.push({
        id: "legacy-logo",
        type: "shape" as const,
        shapeType: "rounded-rect",
        fill: "#0284c7",
        x: 82,
        y: 15,
        width: 12,
        height: 20,
        borderRadius: 6,
      });
    }

    frontDesign = {
      bgColor: template.templateData?.bgColor || matchedCategory.background_color || "#18181b",
      objects: legacyLayers,
    };
  }

  const backDesign = (() => {
    const sides = template.side_designs || [];
    if (template.back_design?.objects?.length) return template.back_design;
    if (sides.length >= 2 && sides[1]) return sides[1];
    return {
      bgColor: "#141414",
      objects: [],
    };
  })();

  // Extra panels only (index 2+). Full lists are sliced in the editor.
  const extraSideDesigns = (() => {
    const sides = template.side_designs || [];
    if (!sides.length) return [];
    if (template.front_design?.objects?.[0]?.id && sides[0]?.objects?.[0]?.id === template.front_design.objects[0].id) {
      return sides.slice(2);
    }
    if (sides.length >= 3 && !template.front_design?.objects?.length) return sides.slice(2);
    // Saved as extras-only
    if (template.front_design) return sides;
    return sides.slice(2);
  })();

  return (
    <CategoryCanvasEditor
      mode="edit"
      templateId={template._id}
      initialCategory={matchedCategory}
      allCategories={allCategories}
      initialData={{
        title: template.title,
        description: template.description,
        price: template.price,
        tags: template.tags,
        status: template.status || (template.isActive ? "PUBLISHED" : "DRAFT"),
        thumbnail: template.thumbnail,
        front_design: frontDesign,
        back_design: backDesign,
        side_designs: template.side_designs?.length
          ? template.side_designs
          : [frontDesign, backDesign, ...extraSideDesigns],
        canvas_config: template.canvas_config,
        selectedVariations: template.selectedVariations || {},
      }}
    />
  );
}
