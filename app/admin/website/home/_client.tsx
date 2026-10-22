"use client";

import { useEffect, useState, type ReactNode } from "react";
import { mediaSrc } from "@/lib/mediaUrl";
import { DEFAULT_HOMEPAGE, type HomepageContent, type HomepageLinkItem, type HomepagePhoto } from "@/lib/homepageContent";
import { Button, Card, CardHeader, Icon, IconButton, PageHeader, Spinner, LoadingState, cx, inputClass, labelClass, type IconName } from "@/components/admin/ui";

const SECTIONS = [
  { id: "hero", label: "Hero", icon: "sparkle", hint: "Headline, buttons and main image at the top of the page." },
  { id: "collections", label: "Collections", icon: "grid", hint: "Category tiles with a see-all link." },
  { id: "topSellers", label: "Top sellers", icon: "star", hint: "Best-selling products row." },
  { id: "tools", label: "Tools", icon: "layers", hint: "Four feature cards: tall, two stacked, tall." },
  { id: "newIn", label: "New in", icon: "tag", hint: "Fresh arrivals carousel." },
  { id: "logoBanner", label: "Logo banner", icon: "banners", hint: "Full-width promo banner with a call to action." },
  { id: "madeWith", label: "Made with Printgraphy", icon: "image", hint: "Social photo wall from customers." },
] as const satisfies readonly { id: string; label: string; icon: IconName; hint: string }[];

type SectionId = (typeof SECTIONS)[number]["id"];

async function uploadImage(file: File) {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", "uploads");
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = await res.json();
  if (!data.success || !data.url) throw new Error(data.message || "Upload failed");
  return data.url as string;
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <label
        className={cx(
          "group relative flex aspect-[16/9] w-full max-w-xs cursor-pointer items-center justify-center overflow-hidden rounded-2xl border transition-all",
          value ? "border-zinc-200 bg-zinc-50" : "border-2 border-dashed border-[#b8e0f6] bg-[#f0f8fd] hover:border-[#329AD4]"
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaSrc(value) || value} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span
              className={cx(
                "absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-zinc-900/45 text-xs font-semibold text-white transition-opacity",
                uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              {uploading ? <WhiteSpinner className="h-5 w-5" /> : <Icon name="upload" className="w-5 h-5" />}
              {uploading ? "Uploading..." : "Replace image"}
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 text-xs font-semibold text-[#2884b8]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-xs">
              {uploading ? <Spinner /> : <Icon name="upload" className="w-5 h-5" />}
            </span>
            {uploading ? "Uploading..." : "Upload image"}
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setUploading(true);
            try {
              onChange(await uploadImage(file));
            } finally {
              setUploading(false);
            }
          }}
        />
      </label>
    </div>
  );
}

function TextField({ label, value, onChange, multiline }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputClass, "resize-y")} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
    </div>
  );
}

function WhiteSpinner({ className }: { className?: string }) {
  return <span className={cx("inline-block rounded-full border-2 border-white/40 border-t-white animate-spin", className)} />;
}

/** A titled group of fields inside the editing card. */
function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="px-5 sm:px-6 py-5 border-b border-zinc-100 last:border-b-0">
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function HomeEditor() {
  const [section, setSection] = useState<SectionId>("hero");
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/homepage")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.content) setContent(data.content);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      setMessage(data.success ? "Home page saved." : data.message || "Could not save.");
    } catch {
      setMessage("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const updateItems = (key: "collections" | "topSellers" | "tools" | "newIn", items: HomepageLinkItem[]) => {
    setContent((prev) => ({ ...prev, [key]: { ...prev[key], items } }));
  };

  const active = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0];
  const saved = message === "Home page saved.";

  const saveButton = (
    <Button onClick={save} disabled={saving || loading} icon={saving ? undefined : "check"}>
      {saving && <WhiteSpinner className="h-4 w-4" />}
      {saving ? "Saving..." : "Save home page"}
    </Button>
  );

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        icon="banners"
        title="Home page"
        description="Change the hero and every other section on the public home page."
        back={{ href: "/admin/website", label: "Website" }}
        actions={saveButton}
      />

      {message && (
        <div
          className={cx(
            "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium",
            saved ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
          )}
        >
          <Icon name={saved ? "check" : "ban"} className="w-4 h-4 shrink-0" strokeWidth={2.2} />
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        {/* Section navigation */}
        <nav className="lg:sticky lg:top-6">
          <Card className="p-2">
            <p className="hidden lg:block px-3 pt-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Sections</p>
            <div className="flex flex-wrap gap-1 lg:flex-col lg:flex-nowrap">
              {SECTIONS.map((item) => {
                const isActive = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={cx(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-all cursor-pointer",
                      isActive ? "bg-[#EAF5FB] text-[#1b5b80]" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isActive ? "bg-[#329AD4] text-white shadow-sm shadow-[#329AD4]/30" : "bg-zinc-100 text-zinc-500"
                      )}
                    >
                      <Icon name={item.icon} className="w-3.5 h-3.5" strokeWidth={2} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </nav>

        {/* Editing card */}
        <div className="min-w-0 space-y-4">
          {loading ? (
            <Card>
              <LoadingState label="Loading home page..." />
            </Card>
          ) : (
            <Card>
              <CardHeader icon={active.icon} title={active.label} subtitle={active.hint} />

              {section === "hero" && (
                <>
                  <Group title="Content">
                    <TextField label="Headline" value={content.hero.title} onChange={(title) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, title } }))} />
                    <TextField label="Offer badge" value={content.hero.accent} onChange={(accent) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, accent } }))} />
                    <TextField label="Body" value={content.hero.body} multiline onChange={(body) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, body } }))} />
                    <TextField label="Offer note" value={content.hero.highlight} multiline onChange={(highlight) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, highlight } }))} />
                  </Group>
                  <Group title="Buttons">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <TextField label="Primary button" value={content.hero.primaryLabel} onChange={(primaryLabel) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, primaryLabel } }))} />
                      <TextField label="Primary link" value={content.hero.primaryHref} onChange={(primaryHref) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, primaryHref } }))} />
                      <TextField label="Secondary button" value={content.hero.secondaryLabel} onChange={(secondaryLabel) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, secondaryLabel } }))} />
                      <TextField label="Secondary link" value={content.hero.secondaryHref} onChange={(secondaryHref) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, secondaryHref } }))} />
                    </div>
                  </Group>
                  <Group title="Image">
                    <ImageField label="Hero image" value={content.hero.image} onChange={(image) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, image } }))} />
                    <TextField label="Image alt text" value={content.hero.imageAlt} onChange={(imageAlt) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, imageAlt } }))} />
                  </Group>
                </>
              )}

              {section === "collections" && (
                <>
                  <Group title="Heading">
                    <TextField label="Heading" value={content.collections.title} onChange={(title) => setContent((prev) => ({ ...prev, collections: { ...prev.collections, title } }))} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <TextField label="See-all label" value={content.collections.seeAllLabel} onChange={(seeAllLabel) => setContent((prev) => ({ ...prev, collections: { ...prev.collections, seeAllLabel } }))} />
                      <TextField label="See-all link" value={content.collections.seeAllHref} onChange={(seeAllHref) => setContent((prev) => ({ ...prev, collections: { ...prev.collections, seeAllHref } }))} />
                    </div>
                  </Group>
                  <Group title="Items">
                    <ItemList items={content.collections.items} onChange={(items) => updateItems("collections", items)} />
                  </Group>
                </>
              )}

              {section === "topSellers" && (
                <>
                  <Group title="Heading">
                    <TextField label="Heading" value={content.topSellers.title} onChange={(title) => setContent((prev) => ({ ...prev, topSellers: { ...prev.topSellers, title } }))} />
                  </Group>
                  <Group title="Items">
                    <ItemList items={content.topSellers.items || []} onChange={(items) => updateItems("topSellers", items)} />
                  </Group>
                </>
              )}

              {section === "tools" && (
                <>
                  <Group title="Heading">
                    <TextField label="Heading" value={content.tools.title} onChange={(title) => setContent((prev) => ({ ...prev, tools: { ...prev.tools, title } }))} />
                  </Group>
                  <Group title="Items">
                    <div className="flex items-start gap-2.5 rounded-xl border border-[#dbeefb] bg-[#f0f8fd] px-4 py-3 text-xs text-[#1b5b80]">
                      <Icon name="layers" className="mt-px w-4 h-4 shrink-0" />
                      <p>Four cards: tall, two stacked, tall. Keep four items so the layout stays intact.</p>
                    </div>
                    <ItemList items={content.tools.items} onChange={(items) => updateItems("tools", items)} />
                  </Group>
                </>
              )}

              {section === "newIn" && (
                <>
                  <Group title="Heading">
                    <TextField label="Heading" value={content.newIn.title} multiline onChange={(title) => setContent((prev) => ({ ...prev, newIn: { ...prev.newIn, title } }))} />
                    <TextField label="Subtitle" value={content.newIn.subtitle} multiline onChange={(subtitle) => setContent((prev) => ({ ...prev, newIn: { ...prev.newIn, subtitle } }))} />
                  </Group>
                  <Group title="Items">
                    <ItemList items={content.newIn.items} onChange={(items) => updateItems("newIn", items)} />
                  </Group>
                </>
              )}

              {section === "logoBanner" && (
                <>
                  <Group title="Content">
                    <TextField label="Heading" value={content.logoBanner.title} onChange={(title) => setContent((prev) => ({ ...prev, logoBanner: { ...prev.logoBanner, title } }))} />
                    <TextField label="Body" value={content.logoBanner.body} multiline onChange={(body) => setContent((prev) => ({ ...prev, logoBanner: { ...prev.logoBanner, body } }))} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <TextField label="Button" value={content.logoBanner.ctaLabel} onChange={(ctaLabel) => setContent((prev) => ({ ...prev, logoBanner: { ...prev.logoBanner, ctaLabel } }))} />
                      <TextField label="Button link" value={content.logoBanner.ctaHref} onChange={(ctaHref) => setContent((prev) => ({ ...prev, logoBanner: { ...prev.logoBanner, ctaHref } }))} />
                    </div>
                  </Group>
                  <Group title="Image">
                    <ImageField label="Banner image" value={content.logoBanner.image} onChange={(image) => setContent((prev) => ({ ...prev, logoBanner: { ...prev.logoBanner, image } }))} />
                  </Group>
                </>
              )}

              {section === "madeWith" && (
                <>
                  <Group title="Content">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <TextField label="Title start" value={content.madeWith.titleBefore} onChange={(titleBefore) => setContent((prev) => ({ ...prev, madeWith: { ...prev.madeWith, titleBefore } }))} />
                      <TextField label="Accent" value={content.madeWith.titleAccent} onChange={(titleAccent) => setContent((prev) => ({ ...prev, madeWith: { ...prev.madeWith, titleAccent } }))} />
                    </div>
                    <TextField label="Body" value={content.madeWith.body} multiline onChange={(body) => setContent((prev) => ({ ...prev, madeWith: { ...prev.madeWith, body } }))} />
                  </Group>
                  <Group title="Photos">
                    <PhotoList photos={content.madeWith.photos} onChange={(photos) => setContent((prev) => ({ ...prev, madeWith: { ...prev.madeWith, photos } }))} />
                  </Group>
                </>
              )}
            </Card>
          )}

          {/* Sticky save bar */}
          <div className="sticky bottom-4 z-10">
            <div className="flex flex-col gap-3 rounded-2xl border border-[#dbeefb] bg-white/90 px-4 py-3 shadow-lg shadow-[#329AD4]/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-zinc-500">
                <span className={cx("h-2 w-2 rounded-full", saving ? "bg-amber-400 animate-pulse" : saved ? "bg-emerald-500" : "bg-[#329AD4]")} />
                {saving ? "Saving your changes..." : message || "Changes apply to the live home page once saved."}
              </p>
              {saveButton}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemList({ items, onChange }: { items: HomepageLinkItem[]; onChange: (items: HomepageLinkItem[]) => void }) {
  const update = (index: number, patch: Partial<HomepageLinkItem>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {items.map((item, index) => (
          <div key={index} className="rounded-2xl border border-zinc-200 bg-zinc-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EAF5FB] text-[11px] font-semibold text-[#2884b8]">{index + 1}</span>
                <p className="truncate text-sm font-semibold text-zinc-800">{item.label || `Item ${index + 1}`}</p>
              </div>
              <IconButton icon="trash" label="Remove" tone="danger" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} />
            </div>
            <TextField label="Label" value={item.label} onChange={(label) => update(index, { label })} />
            <TextField label="Link" value={item.href} onChange={(href) => update(index, { href })} />
            <ImageField label="Image" value={item.image} onChange={(image) => update(index, { image })} />
          </div>
        ))}
      </div>
      <AddButton onClick={() => onChange([...items, { label: "", image: "", href: "/" }])}>Add item</AddButton>
    </div>
  );
}

function PhotoList({ photos, onChange }: { photos: HomepagePhoto[]; onChange: (photos: HomepagePhoto[]) => void }) {
  const update = (index: number, patch: Partial<HomepagePhoto>) => {
    onChange(photos.map((photo, photoIndex) => (photoIndex === index ? { ...photo, ...patch } : photo)));
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {photos.map((photo, index) => (
          <div key={index} className="rounded-2xl border border-zinc-200 bg-zinc-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EAF5FB] text-[11px] font-semibold text-[#2884b8]">{index + 1}</span>
                <p className="truncate text-sm font-semibold text-zinc-800">Photo {index + 1}</p>
              </div>
              <IconButton icon="trash" label="Remove" tone="danger" onClick={() => onChange(photos.filter((_, photoIndex) => photoIndex !== index))} />
            </div>
            <TextField label="Handle" value={photo.handle} onChange={(handle) => update(index, { handle })} />
            <TextField label="Link" value={photo.href || ""} onChange={(href) => update(index, { href })} />
            <ImageField label="Photo" value={photo.image} onChange={(image) => update(index, { image })} />
          </div>
        ))}
      </div>
      <AddButton onClick={() => onChange([...photos, { image: "", handle: "@", href: "/business-cards" }])}>Add photo</AddButton>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#b8e0f6] bg-[#f0f8fd]/60 px-4 py-3 text-sm font-semibold text-[#2884b8] transition-colors hover:border-[#329AD4] hover:bg-[#EAF5FB] cursor-pointer"
    >
      <Icon name="plus" className="w-4 h-4" strokeWidth={2.2} />
      {children}
    </button>
  );
}
