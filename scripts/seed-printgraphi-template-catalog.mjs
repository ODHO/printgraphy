import mongoose from "mongoose";

const CATALOG_TAG = "printgraphi-catalog-2026";

function mongoUri() {
  const uri = process.env.MONGODB_URI || "";
  if (!uri) throw new Error("MONGODB_URI is required. Run with Node's --env-file=.env option.");
  return uri;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function categoryLabel(category) {
  return String(category.name || "Print").replace(/\s*\([^)]*\)/g, "").trim();
}

function categoryCanvas(category) {
  const name = String(category.name || "").toLowerCase();
  const portrait = /flyer|poster|invitation|calendar/.test(name);
  const width = Number(category.canvas_width) || (portrait ? 148 : 105);
  const height = Number(category.canvas_height) || (portrait ? 210 : 60);
  const unit = category.unit || "mm";
  return {
    width,
    height,
    unit,
    orientation: category.orientation || (height > width ? "portrait" : "landscape"),
    bleed: Number(category.bleed) || (unit === "in" ? 0.125 : 3),
    bleedUnit: category.bleedUnit || unit,
    safe_area: Number(category.safe_area) || (unit === "in" ? 0.25 : 3),
    safeAreaUnit: category.safeAreaUnit || unit,
    background_color: category.background_color || "#fffaf2",
    supports_back_side: category.supports_back_side !== false,
    side_mode: category.side_mode || (category.supports_back_side === false ? "single" : "double"),
    sides_count: Number(category.sides_count) || (category.supports_back_side === false ? 1 : 2),
    sides_names: category.sides_names || (category.supports_back_side === false ? ["Front"] : ["Front", "Back"]),
    guide_lines: category.guide_lines || [],
    canvas_type: category.canvas_type || "flat",
    mockup_image: category.mockup_image || "",
    print_area: category.print_area || undefined,
  };
}

function text(id, value, x, y, fontSize, color, fontWeight = "normal", width = 0, align = "left") {
  return {
    id,
    type: "text",
    text: value,
    x,
    y,
    width,
    height: 0,
    fontSize,
    color,
    fontWeight,
    textAlign: align,
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  };
}

function shape(id, shapeType, x, y, width, height, fill, extras = {}) {
  return { id, type: "shape", shapeType, x, y, width, height, fill, ...extras };
}

const STYLE_DETAILS = [
  { slug: "warm-starter", title: "Warm Starter", price: 0, description: "A warm, confident starting point for a beautiful custom design." },
  { slug: "coral-edit", title: "Coral Edit", price: 0, description: "An energetic editorial layout with Printgraphi coral details." },
  { slug: "signature-series", title: "Signature Series", price: 12, description: "A polished premium layout with a high-contrast, studio-crafted finish." },
];

function designFor(category, styleIndex) {
  const label = categoryLabel(category);
  const smallLabel = label.length > 22 ? `${label.slice(0, 20)}.` : label;
  if (styleIndex === 0) {
    return {
      bgColor: "#fff8ee",
      objects: [
        shape("rail", "rectangle", 0, 0, 7, 100, "#ef4a38"),
        shape("sun", "circle", 72, 55, 22, 32, "#ef4a38"),
        text("brand", "PRINTGRAPHY", 12, 12, 10, "#ef4a38", "bold"),
        text("headline", "MAKE IT", 12, 33, 29, "#1e1d1b", "bold"),
        text("headline-2", "MEMORABLE", 12, 50, 22, "#1e1d1b", "bold"),
        text("category", smallLabel.toUpperCase(), 12, 79, 11, "#756f68", "normal"),
        text("note", "YOUR DETAILS • YOUR WAY", 12, 88, 8, "#756f68", "normal"),
      ],
    };
  }

  if (styleIndex === 1) {
    return {
      bgColor: "#1e1d1b",
      objects: [
        shape("coral-band", "rounded-rect", 8, 9, 84, 17, "#ef4a38", { borderRadius: 10 }),
        shape("dot-one", "circle", 74, 65, 16, 24, "#f5c55a"),
        shape("dot-two", "circle", 84, 75, 8, 12, "#fff8ee"),
        text("collection", "THE CORAL EDIT", 14, 15, 10, "#fff8ee", "bold"),
        text("headline", "DETAILS", 12, 39, 28, "#fff8ee", "bold"),
        text("headline-2", "THAT SPEAK.", 12, 55, 22, "#fff8ee", "bold"),
        text("category", smallLabel.toUpperCase(), 12, 83, 10, "#cbc4bb", "normal"),
      ],
    };
  }

  return {
    bgColor: "#251d1b",
    objects: [
      shape("frame", "rounded-rect", 6, 7, 88, 86, "#251d1b", { stroke: "#f8e7cf", strokeWidth: 1, borderRadius: 5 }),
      shape("accent", "rectangle", 12, 16, 5, 53, "#ef4a38"),
      shape("seal", "circle", 70, 13, 15, 22, "#ef4a38"),
      text("seal-copy", "P", 75, 18, 15, "#fff8ee", "bold", 0, "center"),
      text("edition", "SIGNATURE SERIES", 23, 18, 9, "#f5c55a", "bold"),
      text("headline", "DESIGNED", 23, 38, 25, "#fff8ee", "bold"),
      text("headline-2", "TO LAST.", 23, 54, 25, "#fff8ee", "bold"),
      text("category", smallLabel.toUpperCase(), 23, 78, 9, "#cbc4bb", "normal"),
      text("footer", "PRINTGRAPHY STUDIO", 23, 86, 8, "#f8e7cf", "normal"),
    ],
  };
}

function backDesignFor(styleIndex) {
  const dark = styleIndex === 1 || styleIndex === 2;
  return {
    bgColor: dark ? "#1e1d1b" : "#fff8ee",
    objects: [
      text("back-brand", "PRINTGRAPHY", 50, 42, 17, dark ? "#fff8ee" : "#1e1d1b", "bold", 0, "center"),
      text("back-note", "PRINT, MADE PERSONAL.", 50, 57, 9, dark ? "#f5c55a" : "#ef4a38", "normal", 0, "center"),
    ],
  };
}

function legacyTitle(category, styleIndex) {
  return `${categoryLabel(category)} ${STYLE_DETAILS[styleIndex].title}`;
}

function templatePayload(category, styleIndex) {
  const style = STYLE_DETAILS[styleIndex];
  const design = designFor(category, styleIndex);
  const title = legacyTitle(category, styleIndex);
  const slug = `printgraphi-${slugify(category.slug || category.name)}-${style.slug}`;
  return {
    title,
    slug,
    description: style.description,
    category: category.name,
    categoryId: category._id,
    tags: [CATALOG_TAG, "printgraphi", slugify(category.name), style.slug],
    thumbnail: "",
    backThumbnail: "",
    isPaid: style.price > 0,
    price: style.price,
    isActive: true,
    status: "PUBLISHED",
    canvas_config: categoryCanvas(category),
    front_design: design,
    back_design: backDesignFor(styleIndex),
    side_designs: [],
    templateData: {
      bgColor: design.bgColor,
      textColor: styleIndex === 0 ? "#1e1d1b" : "#fff8ee",
      logoPosition: "top-right",
      logoText: "",
      logoImage: null,
      logoSize: 36,
      imageOpacity: 90,
      textLayers: [],
    },
    selectedVariations: {},
    variations: [],
  };
}

async function main() {
  await mongoose.connect(mongoUri(), { bufferCommands: false });
  const db = mongoose.connection.db;
  const categories = await db.collection("categories").find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).toArray();
  if (!categories.length) throw new Error("No active categories found. Seed categories before the template catalog.");

  const categoryByName = new Map(categories.map((category) => [String(category.name).toLowerCase(), category]));
  const templates = db.collection("templates");
  let catalogUpserts = 0;
  let legacyRefreshes = 0;

  for (const category of categories) {
    for (let styleIndex = 0; styleIndex < STYLE_DETAILS.length; styleIndex += 1) {
      const payload = templatePayload(category, styleIndex);
      await templates.updateOne({ slug: payload.slug }, { $set: payload, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
      catalogUpserts += 1;
    }
  }

  // The old demo records were never customer content: give every one a real name and the same editable artwork quality.
  const legacy = await templates.find({ tags: { $ne: CATALOG_TAG } }).toArray();
  for (let index = 0; index < legacy.length; index += 1) {
    const current = legacy[index];
    const category =
      categoryByName.get(String(current.category || "").toLowerCase()) ||
      categories.find((item) => String(item._id) === String(current.categoryId)) ||
      categories[index % categories.length];
    const styleIndex = index % STYLE_DETAILS.length;
    const payload = templatePayload(category, styleIndex);
    // Keep the original id/slug intact so any existing editor links continue to work.
    await templates.updateOne(
      { _id: current._id },
      {
        $set: {
          ...payload,
          slug: current.slug || `${payload.slug}-legacy-${index + 1}`,
          tags: [...new Set([...(Array.isArray(current.tags) ? current.tags : []), "printgraphi-refreshed"])],
          updatedAt: new Date(),
        },
      }
    );
    legacyRefreshes += 1;
  }

  console.log(`Printgraphi template catalog ready: ${catalogUpserts} category templates upserted; ${legacyRefreshes} placeholder templates refreshed.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
