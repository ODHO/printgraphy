"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import MockupCanvasStage, { type MockupDesignLayer } from "@/components/MockupCanvasStage";
import { mediaSrc } from "@/lib/mediaUrl";
import {
  cleanApparelColors,
  cleanApparelSizes,
  cleanDecorationMethods,
  cleanPrintArea,
  cleanPrintPlacements,
  type ApparelColor,
  type ApparelSize,
  type DecorationMethod,
  type PrintPlacement,
} from "@/lib/mockupCanvas";

type Step = "configure" | "design" | "review";

interface ApparelCategory {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  price?: number;
  unitPrice?: string;
  image?: string;
  mockup_image?: string;
  print_area?: unknown;
  print_placements?: unknown;
  apparel_colors?: unknown;
  apparel_sizes?: unknown;
  decoration_methods?: unknown;
  text_layers?: Array<{
    id: string;
    type?: "text" | "image";
    text?: string;
    src?: string;
    x: number;
    y: number;
    fontSize?: number;
    color?: string;
    fontWeight?: "normal" | "bold";
    width?: number;
    height?: number;
    placementId?: string;
  }>;
}

type DesignLayer = MockupDesignLayer;

function newId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeTextLayer(x = 50, y = 50): DesignLayer {
  return {
    id: newId("text"),
    type: "text",
    text: "Your Text",
    x,
    y,
    fontSize: 22,
    color: "#111111",
    fontWeight: "bold",
  };
}

function makeImageLayer(src: string, x = 50, y = 50): DesignLayer {
  return {
    id: newId("img"),
    type: "image",
    src,
    x,
    y,
    width: 36,
    height: 36,
  };
}

export default function ApparelCustomizeFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "";
  const productId = searchParams.get("productId") || "";

  const [step, setStep] = useState<Step>("configure");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<ApparelCategory | null>(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState(0);

  const [colors, setColors] = useState<ApparelColor[]>([]);
  const [sizes, setSizes] = useState<ApparelSize[]>([]);
  const [methods, setMethods] = useState<DecorationMethod[]>([]);
  const [placements, setPlacements] = useState<PrintPlacement[]>([]);

  const [selectedColorId, setSelectedColorId] = useState("");
  const [sizeQty, setSizeQty] = useState<Record<string, number>>({});
  const [decorationId, setDecorationId] = useState("");
  const [activePlacementId, setActivePlacementId] = useState("");
  const [layersByPlacement, setLayersByPlacement] = useState<Record<string, DesignLayer[]>>({});
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        let found: ApparelCategory | null = null;

        if (categoryParam) {
          const one = await fetch(`/api/categories/${encodeURIComponent(categoryParam)}`);
          const oneData = await one.json();
          if (oneData.success && oneData.category) {
            const cat = oneData.category as ApparelCategory & { canvas_type?: string };
            if (!cat.canvas_type || cat.canvas_type === "mockup") {
              found = cat;
            }
          }
        }

        if (!found) {
          const res = await fetch("/api/categories?canvas_type=mockup");
          const data = await res.json();
          const list: ApparelCategory[] = data.categories || [];
          found =
            list.find(
              (c) =>
                c.slug === categoryParam ||
                c.name === categoryParam ||
                c._id === categoryParam
            ) ||
            list[0] ||
            null;
        }

        if (!found) {
          if (!cancelled) {
            setError(
              "No clothing category found. Create one in Admin with the Clothing & Bags family."
            );
            setLoading(false);
          }
          return;
        }
        if (cancelled) return;

        const nextColors = cleanApparelColors(found.apparel_colors);
        const nextSizes = cleanApparelSizes(found.apparel_sizes);
        const nextMethods = cleanDecorationMethods(found.decoration_methods);
        let nextPlacements = cleanPrintPlacements(found.print_placements);
        if (found.mockup_image && nextPlacements[0] && !nextPlacements[0].mockupImage) {
          nextPlacements = [
            { ...nextPlacements[0], mockupImage: found.mockup_image },
            ...nextPlacements.slice(1),
          ];
        }
        if (!nextPlacements.length) {
          nextPlacements = cleanPrintPlacements([]);
          if (found.mockup_image) {
            nextPlacements[0] = { ...nextPlacements[0], mockupImage: found.mockup_image };
          }
        }

        setCategory(found);
        setProductName(found.name);
        setProductPrice(Number(found.price) || 0);
        setColors(nextColors);
        setSizes(nextSizes);
        setMethods(nextMethods);
        setPlacements(nextPlacements);
        setSelectedColorId(nextColors[0]?.id || "");
        setDecorationId(nextMethods[0]?.id || "");
        setActivePlacementId(nextPlacements[0]?.id || "front");

        // Default one piece so Continue to design is usable immediately
        const qty: Record<string, number> = {};
        nextSizes.forEach((s, i) => {
          qty[s.id] = i === 0 || s.name.toUpperCase() === "M" ? (s.name.toUpperCase() === "M" ? 1 : 0) : 0;
        });
        if (nextSizes.length && !Object.values(qty).some((n) => n > 0)) {
          qty[nextSizes[0].id] = 1;
        }
        // Prefer M if present
        const mSize = nextSizes.find((s) => s.name.toUpperCase() === "M");
        if (mSize) {
          nextSizes.forEach((s) => {
            qty[s.id] = 0;
          });
          qty[mSize.id] = 1;
        }
        setSizeQty(qty);

        const seedByPlace: Record<string, DesignLayer[]> = {};
        nextPlacements.forEach((p) => {
          seedByPlace[p.id] = [];
        });
        (found.text_layers || []).forEach((l) => {
          const placeId =
            (l as { placementId?: string }).placementId ||
            nextPlacements[0]?.id ||
            "front";
          if (!seedByPlace[placeId]) seedByPlace[placeId] = [];
          if (l.type === "image" && l.src) {
            seedByPlace[placeId].push({
              id: l.id || newId("img"),
              type: "image",
              src: l.src,
              x: l.x ?? 50,
              y: l.y ?? 50,
              width: l.width ?? 36,
              height: l.height ?? 36,
            });
          } else {
            seedByPlace[placeId].push({
              id: l.id || newId("text"),
              type: "text",
              text: l.text || "Your Text",
              x: l.x ?? 50,
              y: l.y ?? 40,
              fontSize: l.fontSize || 18,
              color: l.color || "#111111",
              fontWeight: (l.fontWeight || "bold") as "normal" | "bold",
            });
          }
        });
        // Legacy: if no placementId on any layer, put all on first placement
        const anyTagged = (found.text_layers || []).some(
          (l) => (l as { placementId?: string }).placementId
        );
        if (!anyTagged && (found.text_layers || []).length && nextPlacements[0]) {
          const firstId = nextPlacements[0].id;
          Object.keys(seedByPlace).forEach((k) => {
            if (k !== firstId) seedByPlace[k] = [];
          });
        }
        setLayersByPlacement(seedByPlace);

        if (productId) {
          try {
            const pr = await fetch(`/api/products/${productId}`);
            const pd = await pr.json();
            if (pd.product || pd.success) {
              const p = pd.product || pd;
              if (p.name) setProductName(p.name);
              if (p.price != null) setProductPrice(Number(p.price) || 0);
            }
          } catch {
            /* category defaults are fine */
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load clothing category.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryParam, productId]);

  const selectedColor = colors.find((c) => c.id === selectedColorId) || colors[0];
  const selectedMethod = methods.find((m) => m.id === decorationId) || methods[0];
  const activePlacement =
    placements.find((p) => p.id === activePlacementId) || placements[0];

  const mockupSrc =
    selectedColor?.mockupImage ||
    activePlacement?.mockupImage ||
    category?.mockup_image ||
    category?.image ||
    "";

  const printArea = cleanPrintArea(
    activePlacement?.printArea || category?.print_area
  );

  const activeLayers = layersByPlacement[activePlacement?.id || ""] || [];
  const totalQty = useMemo(
    () => Object.values(sizeQty).reduce((sum, n) => sum + (Number(n) || 0), 0),
    [sizeQty]
  );

  const unitPrice =
    productPrice + (selectedMethod?.priceAddOn || 0);
  const lineTotal = unitPrice * Math.max(1, totalQty);

  const patchActiveLayers = (updater: (prev: DesignLayer[]) => DesignLayer[]) => {
    const placeId = activePlacement?.id;
    if (!placeId) return;
    setLayersByPlacement((prev) => ({
      ...prev,
      [placeId]: updater(prev[placeId] || []),
    }));
  };

  const addTextLayer = (x = 50, y = 45) => {
    const layer = makeTextLayer(x, y);
    patchActiveLayers((prev) => [...prev, layer]);
    setActiveLayerId(layer.id);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingImage(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error(data.message || "Upload failed");
      }
      const layer = makeImageLayer(data.url, 50, 55);
      patchActiveLayers((prev) => [...prev, layer]);
      setActiveLayerId(layer.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const canContinueConfigure = totalQty > 0 && Boolean(selectedColorId || colors.length === 0);

  const addToCart = async () => {
    if (!category) return;
    setAddingToCart(true);
    setError("");
    try {
      const sizeSummary = Object.entries(sizeQty)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => {
          const size = sizes.find((s) => s.id === id);
          return `${size?.name || id}×${q}`;
        })
        .join(", ");

      const allLayers = Object.values(layersByPlacement).flat();
      const designImages = allLayers
        .filter((l): l is Extract<DesignLayer, { type: "image" }> => l.type === "image" && Boolean(l.src))
        .map((l) => l.src);
      const designTexts = allLayers
        .filter((l): l is Extract<DesignLayer, { type: "text" }> => l.type === "text" && Boolean(l.text))
        .map((l) => l.text)
        .slice(0, 3);
      const summaryParts = [
        selectedColor?.name,
        sizeSummary,
        selectedMethod?.name,
      ].filter(Boolean);

      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(productId && { productId }),
          name: productName || category.name,
          thumbnail: designImages[0] || mockupSrc || "",
          price: Number(unitPrice) || 0,
          quantity: Math.max(1, totalQty),
          specs: {
            productFamily: "apparel",
            category: category.name,
            categorySlug: category.slug || "",
            color: selectedColor?.name || "",
            colorHex: selectedColor?.hex || "",
            sizes: sizeSummary,
            decoration: selectedMethod?.name || "",
            summary: summaryParts.join(" · "),
            mockup: mockupSrc || "",
            designPreview: designImages[0] || "",
            designTexts: designTexts.join(" · "),
            // Keep full design for production — cart UI hides these keys
            design: JSON.stringify(layersByPlacement),
            placements: JSON.stringify(
              placements.map((p) => ({ id: p.id, name: p.name }))
            ),
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Could not add to cart");
      }
      router.push("/cart");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not add to cart. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#329AD4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !category) {
    return (
      <div className="container mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-lg font-bold text-zinc-800">{error}</p>
        <Link href="/clothing-bags" className="text-[#329AD4] font-bold hover:underline">
          ← Back to Clothing & Bags
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="border-b border-zinc-100 bg-[#ffffff]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <Link href="/clothing-bags" className="hover:text-[#329AD4]">
              Clothing & Bags
            </Link>
            <span>›</span>
            <Link
              href={`/clothing-bags/${category?.slug || category?._id}`}
              className="hover:text-[#329AD4]"
            >
              {category?.name}
            </Link>
            <span>›</span>
            <span className="text-zinc-900 font-medium capitalize">{step}</span>
          </nav>
          <div className="flex gap-1 p-1 bg-white rounded-full border border-zinc-200">
            {(["configure", "design", "review"] as Step[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (s === "design" && !canContinueConfigure) return;
                  if (s === "review" && !canContinueConfigure) return;
                  setStep(s);
                }}
                className={`px-4 py-1.5 text-sm font-bold rounded-full capitalize cursor-pointer transition-all ${
                  step === s
                    ? "bg-[#329AD4] text-white"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl space-y-8">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm">
            {error}
          </div>
        )}

        {step === "configure" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-[#EAF5FB] to-[#ffffff] aspect-square relative overflow-hidden shadow-sm">
                {mockupSrc || category?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      mediaSrc(mockupSrc || category?.image || "") ||
                      mockupSrc ||
                      category?.image ||
                      ""
                    }
                    alt={productName}
                    className="absolute inset-0 w-full h-full object-contain p-6"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 font-medium">
                    Upload a mockup in admin to preview
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#329AD4] mb-1">
                    Customize
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-black text-zinc-900">{productName}</h1>
                  <p className="text-zinc-500 mt-1">
                    From ${unitPrice.toFixed(2)}
                    {selectedMethod?.priceAddOn ? ` incl. ${selectedMethod.name}` : ""}
                  </p>
                </div>

                {colors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-2">
                      Color — {selectedColor?.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          title={c.name}
                          onClick={() => setSelectedColorId(c.id)}
                          className={`w-10 h-10 rounded-full border-2 transition-all cursor-pointer ${
                            selectedColorId === c.id
                              ? "border-[#329AD4] ring-2 ring-[#329AD4]/30 scale-110"
                              : "border-zinc-200 hover:border-zinc-400"
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-2">
                    Sizes & quantity
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {sizes.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center justify-between gap-2 bg-[#ffffff] border border-zinc-200 rounded-xl px-3 py-2"
                      >
                        <span className="font-bold text-zinc-800">{s.name}</span>
                        <input
                          type="number"
                          min={0}
                          value={sizeQty[s.id] || 0}
                          onChange={(e) =>
                            setSizeQty((prev) => ({
                              ...prev,
                              [s.id]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                          className="w-16 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-sm font-mono text-center"
                        />
                      </label>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-400 mt-2">Total pieces: {totalQty}</p>
                </div>

                {methods.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-2">
                      Decoration
                    </h3>
                    <div className="space-y-2">
                      {methods.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setDecorationId(m.id)}
                          className={`w-full text-left p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                            decorationId === m.id
                              ? "border-[#329AD4] bg-sky-50/60"
                              : "border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <span className="font-bold text-zinc-900 block">{m.name}</span>
                          <span className="text-sm text-zinc-500">
                            {m.description}
                            {m.priceAddOn ? ` · +$${m.priceAddOn.toFixed(2)}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!canContinueConfigure}
                  onClick={() => setStep("design")}
                  className="w-full py-3 bg-[#329AD4] hover:bg-[#2884b8] disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-[#329AD4]/20"
                >
                  Continue to design
                </button>
                {!canContinueConfigure && (
                  <p className="text-sm text-amber-600 font-medium text-center">
                    Enter a quantity for at least one size to continue.
                  </p>
                )}
                {!mockupSrc && (
                  <p className="text-sm text-amber-600 font-medium text-center">
                    This category has no mockup image yet — ask admin to upload one under Clothing
                    &amp; Bags.
                  </p>
                )}
              </div>
            </div>

            {/* Category defaults from Admin */}
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-7 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-zinc-900">
                    Category Default Variations &amp; Options
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Defaults configured for {category?.name} in Admin — select yours above.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-[#ffffff] border border-zinc-100 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Colors</p>
                  {colors.length === 0 ? (
                    <p className="text-sm text-zinc-400">None set</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {colors.map((c) => (
                          <span
                            key={c.id}
                            title={c.name}
                            className="w-7 h-7 rounded-full border-2 border-white shadow ring-1 ring-zinc-200"
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-zinc-600 font-medium">
                        {colors.map((c) => c.name).join(", ")}
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-2xl bg-[#ffffff] border border-zinc-100 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Sizes</p>
                  {sizes.length === 0 ? (
                    <p className="text-sm text-zinc-400">None set</p>
                  ) : (
                    <p className="text-sm font-bold text-zinc-800 leading-relaxed">
                      {sizes.map((s) => s.name).join(" · ")}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-[#ffffff] border border-zinc-100 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Decoration
                  </p>
                  {methods.length === 0 ? (
                    <p className="text-sm text-zinc-400">None set</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {methods.map((m) => (
                        <li key={m.id} className="text-sm font-medium text-zinc-800">
                          {m.name}
                          {m.priceAddOn ? (
                            <span className="text-zinc-400 font-normal">
                              {" "}
                              (+${m.priceAddOn.toFixed(2)})
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl bg-[#ffffff] border border-zinc-100 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Print sides
                  </p>
                  {placements.length === 0 ? (
                    <p className="text-sm text-zinc-400">Front</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {placements.map((p) => (
                        <li key={p.id} className="text-sm font-medium text-zinc-800">
                          {p.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {step === "design" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3">
              {placements.length > 1 && (
                <div className="flex flex-wrap gap-1 p-1 bg-[#ffffff] rounded-full border border-zinc-200 w-fit">
                  {placements.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setActivePlacementId(p.id);
                        setActiveLayerId(null);
                      }}
                      className={`px-4 py-1.5 text-sm font-bold rounded-full cursor-pointer ${
                        activePlacementId === p.id
                          ? "bg-[#329AD4] text-white"
                          : "text-zinc-600"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              <MockupCanvasStage
                mockupImage={mockupSrc}
                printArea={printArea}
                layers={activeLayers}
                activeLayerId={activeLayerId}
                onAddLayerAt={(x, y) => addTextLayer(x, y)}
                onSelectLayer={setActiveLayerId}
                onMoveLayer={(id, x, y) => {
                  patchActiveLayers((prev) =>
                    prev.map((l) => (l.id === id ? { ...l, x, y } : l))
                  );
                }}
                onResizeLayer={(id, width, height) => {
                  patchActiveLayers((prev) =>
                    prev.map((l) =>
                      l.id === id && l.type === "image" ? { ...l, width, height } : l
                    )
                  );
                }}
              />
              <p className="text-sm text-zinc-400 text-center">
                Click print area to add text · drag layers to move · corner handle to resize images
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-[#ffffff] p-4 text-sm space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Your selections
                </p>
                <p className="font-medium text-zinc-800">
                  {selectedColor?.name || "Default color"}
                  {selectedMethod ? ` · ${selectedMethod.name}` : ""}
                </p>
                <p className="text-zinc-500">
                  {Object.entries(sizeQty)
                    .filter(([, q]) => q > 0)
                    .map(([id, q]) => `${sizes.find((s) => s.id === id)?.name || id} × ${q}`)
                    .join(", ") || "No sizes"}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-zinc-900">Design layers</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addTextLayer()}
                    className="px-3 py-2 text-sm font-bold border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer"
                  >
                    + Text
                  </button>
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                    className="px-3 py-2 text-sm font-bold bg-[#329AD4] text-white rounded-xl hover:bg-[#2884b8] disabled:opacity-60 cursor-pointer"
                  >
                    {uploadingImage ? "Uploading…" : "+ Image / logo"}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleUploadImage(e)}
                  />
                </div>
              </div>

              {activeLayers.length === 0 ? (
                <p className="text-zinc-500 text-sm">
                  No layers yet — add text or upload a logo/image, then drag them on the mockup.
                </p>
              ) : (
                <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                  {activeLayers.map((layer, idx) => (
                    <div
                      key={layer.id}
                      className={`p-3 rounded-2xl border ${
                        activeLayerId === layer.id
                          ? "border-[#329AD4] bg-sky-50/50"
                          : "border-zinc-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setActiveLayerId(layer.id)}
                          className="text-xs font-bold uppercase tracking-wider text-zinc-400 cursor-pointer"
                        >
                          {layer.type === "image" ? `Image ${idx + 1}` : `Text ${idx + 1}`}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            patchActiveLayers((prev) => prev.filter((l) => l.id !== layer.id));
                            if (activeLayerId === layer.id) setActiveLayerId(null);
                          }}
                          className="text-red-500 text-sm font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>

                      {layer.type === "text" ? (
                        <>
                          <input
                            type="text"
                            value={layer.text}
                            onFocus={() => setActiveLayerId(layer.id)}
                            onChange={(e) =>
                              patchActiveLayers((prev) =>
                                prev.map((l) =>
                                  l.id === layer.id && l.type === "text"
                                    ? { ...l, text: e.target.value }
                                    : l
                                )
                              )
                            }
                            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold mb-2"
                          />
                          <div className="flex flex-wrap gap-2 items-center">
                            <input
                              type="color"
                              value={layer.color}
                              onChange={(e) =>
                                patchActiveLayers((prev) =>
                                  prev.map((l) =>
                                    l.id === layer.id && l.type === "text"
                                      ? { ...l, color: e.target.value }
                                      : l
                                  )
                                )
                              }
                              className="w-9 h-9 rounded-lg border border-zinc-200 cursor-pointer"
                            />
                            <input
                              type="number"
                              min={10}
                              max={96}
                              value={layer.fontSize}
                              onChange={(e) =>
                                patchActiveLayers((prev) =>
                                  prev.map((l) =>
                                    l.id === layer.id && l.type === "text"
                                      ? { ...l, fontSize: Number(e.target.value) || 18 }
                                      : l
                                  )
                                )
                              }
                              className="w-20 bg-white border border-zinc-200 rounded-xl px-2 py-1.5 text-sm font-mono"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                patchActiveLayers((prev) =>
                                  prev.map((l) =>
                                    l.id === layer.id && l.type === "text"
                                      ? {
                                          ...l,
                                          fontWeight: l.fontWeight === "bold" ? "normal" : "bold",
                                        }
                                      : l
                                  )
                                )
                              }
                              className="px-3 py-1.5 text-sm font-bold border border-zinc-200 rounded-xl cursor-pointer"
                            >
                              {layer.fontWeight === "bold" ? "Bold" : "Regular"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaSrc(layer.src) || layer.src}
                            alt=""
                            className="w-14 h-14 object-contain rounded-xl border border-zinc-200 bg-white"
                          />
                          <label className="text-sm text-zinc-600 font-medium flex items-center gap-2">
                            Size
                            <input
                              type="range"
                              min={8}
                              max={80}
                              value={Math.round((layer.width + layer.height) / 2)}
                              onFocus={() => setActiveLayerId(layer.id)}
                              onChange={(e) => {
                                const v = Number(e.target.value) || 36;
                                patchActiveLayers((prev) =>
                                  prev.map((l) =>
                                    l.id === layer.id && l.type === "image"
                                      ? { ...l, width: v, height: v }
                                      : l
                                  )
                                );
                              }}
                              className="w-28 accent-[#329AD4] cursor-pointer"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep("configure")}
                  className="flex-1 py-3 border border-zinc-200 font-bold rounded-xl text-zinc-700 cursor-pointer hover:bg-zinc-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="flex-1 py-3 bg-[#329AD4] hover:bg-[#2884b8] text-white font-bold rounded-xl cursor-pointer"
                >
                  Review order
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-2xl font-black text-zinc-900">Review your apparel order</h2>
            <div className="rounded-3xl border border-zinc-200 p-5 space-y-3 bg-[#ffffff]">
              <div className="flex gap-4">
                {mockupSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaSrc(mockupSrc) || mockupSrc}
                    alt=""
                    className="w-24 h-24 object-contain rounded-2xl bg-white border border-zinc-100"
                  />
                )}
                <div>
                  <p className="font-bold text-zinc-900 text-lg">{productName}</p>
                  <p className="text-sm text-zinc-500">
                    {selectedColor?.name}
                    {selectedMethod ? ` · ${selectedMethod.name}` : ""}
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    {Object.entries(sizeQty)
                      .filter(([, q]) => q > 0)
                      .map(([id, q]) => `${sizes.find((s) => s.id === id)?.name || id} × ${q}`)
                      .join(", ") || "No sizes"}
                  </p>
                </div>
              </div>
              <div className="border-t border-zinc-200 pt-3 flex justify-between font-bold text-zinc-900">
                <span>
                  {Math.max(1, totalQty)} × ${unitPrice.toFixed(2)}
                </span>
                <span>${lineTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("design")}
                className="flex-1 py-3 border border-zinc-200 font-bold rounded-xl cursor-pointer"
              >
                Edit design
              </button>
              <button
                type="button"
                disabled={addingToCart || !canContinueConfigure}
                onClick={() => void addToCart()}
                className="flex-1 py-3 bg-[#329AD4] hover:bg-[#2884b8] disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer shadow-md"
              >
                {addingToCart ? "Adding…" : "Add to cart"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
