"use client";

import { useEffect, useState } from "react";
import { mediaSrc } from "@/lib/mediaUrl";
import { DEFAULT_HOMEPAGE, type HomepageContent, type HomepageLinkItem, type HomepagePhoto } from "@/lib/homepageContent";

const SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "collections", label: "Collections" },
  { id: "topSellers", label: "Top sellers" },
  { id: "tools", label: "Tools" },
  { id: "newIn", label: "New in" },
  { id: "logoBanner", label: "Logo banner" },
  { id: "madeWith", label: "Made with Printgraphy" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const fieldClass = "w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]";

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
      <label className="text-base font-bold text-zinc-700 block mb-1">{label}</label>
      <div className="flex items-center gap-3">
        {value && <img src={mediaSrc(value) || value} alt="" className="h-14 w-20 rounded-lg object-cover border border-zinc-200" />}
        <label className="inline-flex cursor-pointer rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-base font-bold text-zinc-700">
          {uploading ? "Uploading..." : "Upload image"}
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
    </div>
  );
}

function TextField({ label, value, onChange, multiline }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return (
    <div>
      <label className="text-base font-bold text-zinc-700 block mb-1">{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
      )}
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Home page</h1>
          <p className="mt-1 text-base text-zinc-500">Change the hero and every other section on the public home page.</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="rounded-xl bg-[#064FE0] px-4 py-2.5 text-base font-bold text-white cursor-pointer disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save home page"}
        </button>
      </div>
      {message && <p className="text-base font-bold text-[#064FE0]">{message}</p>}

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`rounded-full px-3 py-1.5 text-base font-bold cursor-pointer ${
              section === item.id ? "bg-[#064FE0] text-white" : "bg-white border border-zinc-200 text-zinc-600"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-base text-zinc-500">Loading home page...</p>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
          {section === "hero" && (
            <>
              <TextField label="Headline" value={content.hero.title} onChange={(title) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, title } }))} />
              <TextField label="Offer badge" value={content.hero.accent} onChange={(accent) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, accent } }))} />
              <TextField label="Body" value={content.hero.body} multiline onChange={(body) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, body } }))} />
              <TextField label="Offer note" value={content.hero.highlight} multiline onChange={(highlight) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, highlight } }))} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label="Primary button" value={content.hero.primaryLabel} onChange={(primaryLabel) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, primaryLabel } }))} />
                <TextField label="Primary link" value={content.hero.primaryHref} onChange={(primaryHref) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, primaryHref } }))} />
                <TextField label="Secondary button" value={content.hero.secondaryLabel} onChange={(secondaryLabel) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, secondaryLabel } }))} />
                <TextField label="Secondary link" value={content.hero.secondaryHref} onChange={(secondaryHref) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, secondaryHref } }))} />
              </div>
              <ImageField label="Hero image" value={content.hero.image} onChange={(image) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, image } }))} />
              <TextField label="Image alt text" value={content.hero.imageAlt} onChange={(imageAlt) => setContent((prev) => ({ ...prev, hero: { ...prev.hero, imageAlt } }))} />
            </>
          )}

          {section === "collections" && (
            <>
              <TextField label="Heading" value={content.collections.title} onChange={(title) => setContent((prev) => ({ ...prev, collections: { ...prev.collections, title } }))} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label="See-all label" value={content.collections.seeAllLabel} onChange={(seeAllLabel) => setContent((prev) => ({ ...prev, collections: { ...prev.collections, seeAllLabel } }))} />
                <TextField label="See-all link" value={content.collections.seeAllHref} onChange={(seeAllHref) => setContent((prev) => ({ ...prev, collections: { ...prev.collections, seeAllHref } }))} />
              </div>
              <ItemList items={content.collections.items} onChange={(items) => updateItems("collections", items)} />
            </>
          )}

          {section === "topSellers" && (
            <>
              <TextField label="Heading" value={content.topSellers.title} onChange={(title) => setContent((prev) => ({ ...prev, topSellers: { ...prev.topSellers, title } }))} />
              <ItemList items={content.topSellers.items || []} onChange={(items) => updateItems("topSellers", items)} />
            </>
          )}

          {section === "tools" && (
            <>
              <TextField label="Heading" value={content.tools.title} onChange={(title) => setContent((prev) => ({ ...prev, tools: { ...prev.tools, title } }))} />
              <p className="text-base text-zinc-500">Four cards: tall, two stacked, tall. Keep four items so the layout stays intact.</p>
              <ItemList items={content.tools.items} onChange={(items) => updateItems("tools", items)} />
            </>
          )}

          {section === "newIn" && (
            <>
              <TextField label="Heading" value={content.newIn.title} multiline onChange={(title) => setContent((prev) => ({ ...prev, newIn: { ...prev.newIn, title } }))} />
              <TextField label="Subtitle" value={content.newIn.subtitle} multiline onChange={(subtitle) => setContent((prev) => ({ ...prev, newIn: { ...prev.newIn, subtitle } }))} />
              <ItemList items={content.newIn.items} onChange={(items) => updateItems("newIn", items)} />
            </>
          )}

          {section === "logoBanner" && (
            <>
              <TextField label="Heading" value={content.logoBanner.title} onChange={(title) => setContent((prev) => ({ ...prev, logoBanner: { ...prev.logoBanner, title } }))} />
              <TextField label="Body" value={content.logoBanner.body} multiline onChange={(body) => setContent((prev) => ({ ...prev, logoBanner: { ...prev.logoBanner, body } }))} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label="Button" value={content.logoBanner.ctaLabel} onChange={(ctaLabel) => setContent((prev) => ({ ...prev, logoBanner: { ...prev.logoBanner, ctaLabel } }))} />
                <TextField label="Button link" value={content.logoBanner.ctaHref} onChange={(ctaHref) => setContent((prev) => ({ ...prev, logoBanner: { ...prev.logoBanner, ctaHref } }))} />
              </div>
              <ImageField label="Banner image" value={content.logoBanner.image} onChange={(image) => setContent((prev) => ({ ...prev, logoBanner: { ...prev.logoBanner, image } }))} />
            </>
          )}

          {section === "madeWith" && (
            <>
              <TextField label="Title start" value={content.madeWith.titleBefore} onChange={(titleBefore) => setContent((prev) => ({ ...prev, madeWith: { ...prev.madeWith, titleBefore } }))} />
              <TextField label="Accent" value={content.madeWith.titleAccent} onChange={(titleAccent) => setContent((prev) => ({ ...prev, madeWith: { ...prev.madeWith, titleAccent } }))} />
              <TextField label="Body" value={content.madeWith.body} multiline onChange={(body) => setContent((prev) => ({ ...prev, madeWith: { ...prev.madeWith, body } }))} />
              <PhotoList photos={content.madeWith.photos} onChange={(photos) => setContent((prev) => ({ ...prev, madeWith: { ...prev.madeWith, photos } }))} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ItemList({ items, onChange }: { items: HomepageLinkItem[]; onChange: (items: HomepageLinkItem[]) => void }) {
  const update = (index: number, patch: Partial<HomepageLinkItem>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-xl border border-zinc-200 p-3 space-y-2">
          <div className="flex justify-between">
            <p className="text-base font-bold text-zinc-500">Item {index + 1}</p>
            <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="text-base font-bold text-red-500 cursor-pointer">Remove</button>
          </div>
          <TextField label="Label" value={item.label} onChange={(label) => update(index, { label })} />
          <TextField label="Link" value={item.href} onChange={(href) => update(index, { href })} />
          <ImageField label="Image" value={item.image} onChange={(image) => update(index, { image })} />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { label: "", image: "", href: "/" }])} className="text-base font-bold text-[#064FE0] cursor-pointer">+ Add item</button>
    </div>
  );
}

function PhotoList({ photos, onChange }: { photos: HomepagePhoto[]; onChange: (photos: HomepagePhoto[]) => void }) {
  const update = (index: number, patch: Partial<HomepagePhoto>) => {
    onChange(photos.map((photo, photoIndex) => (photoIndex === index ? { ...photo, ...patch } : photo)));
  };
  return (
    <div className="space-y-3">
      {photos.map((photo, index) => (
        <div key={index} className="rounded-xl border border-zinc-200 p-3 space-y-2">
          <div className="flex justify-between">
            <p className="text-base font-bold text-zinc-500">Photo {index + 1}</p>
            <button type="button" onClick={() => onChange(photos.filter((_, photoIndex) => photoIndex !== index))} className="text-base font-bold text-red-500 cursor-pointer">Remove</button>
          </div>
          <TextField label="Handle" value={photo.handle} onChange={(handle) => update(index, { handle })} />
          <TextField label="Link" value={photo.href || ""} onChange={(href) => update(index, { href })} />
          <ImageField label="Photo" value={photo.image} onChange={(image) => update(index, { image })} />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...photos, { image: "", handle: "@", href: "/business-cards" }])} className="text-base font-bold text-[#064FE0] cursor-pointer">+ Add photo</button>
    </div>
  );
}
