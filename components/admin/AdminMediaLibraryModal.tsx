"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mediaSrc } from "@/lib/mediaUrl";
import { Button, EmptyState, Icon, IconButton, LoadingState, Notice, SearchInput, Spinner, Tabs, buttonClass, cx } from "@/components/admin/ui";

export type MediaLibraryItem = {
  url: string;
  name: string;
  key?: string;
  storage?: string;
};

interface AdminMediaLibraryModalProps {
  open: boolean;
  title?: string;
  /** Pre-select this URL when opening */
  currentUrl?: string;
  folder?: string;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export default function AdminMediaLibraryModal({
  open,
  title = "Media library",
  currentUrl = "",
  folder = "uploads",
  onClose,
  onSelect,
}: AdminMediaLibraryModalProps) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [images, setImages] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(currentUrl);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/upload?limit=300`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load media");
      setImages(Array.isArray(data.images) ? data.images : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media library");
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelected(currentUrl || "");
    setTab("library");
    setQuery("");
    void fetchImages();
  }, [open, currentUrl, fetchImages]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", folder);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!data.success || !data.url) throw new Error(data.message || "Upload failed");
      setSelected(data.url);
      setImages((prev) => [{ url: data.url, name: data.fileName || file.name, storage: data.storage }, ...prev]);
      setTab("library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  const filtered = query.trim()
    ? images.filter(
        (img) =>
          img.name.toLowerCase().includes(query.toLowerCase()) ||
          img.url.toLowerCase().includes(query.toLowerCase())
      )
    : images;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl ring-1 ring-zinc-900/5 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#55b2e7] to-[#2884b8] text-white shadow-md shadow-[#329AD4]/25">
              <Icon name="image" className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-zinc-900 truncate">{title}</h3>
              <p className="text-xs text-zinc-500">Pick an image already in your S3 bucket, or upload a new one.</p>
            </div>
          </div>
          <IconButton icon="close" label="Close" onClick={onClose} className="shrink-0" />
        </div>

        {/* Tabs + search */}
        <div className="px-5 sm:px-6 py-3 flex flex-wrap items-center gap-3 border-b border-zinc-100 bg-zinc-50/50">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "library", label: "S3 / library", count: images.length },
              { value: "upload", label: "Upload new" },
            ]}
          />
          {tab === "library" && (
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search images…"
              className="sm:ml-auto sm:max-w-xs"
            />
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-white">
          {error && (
            <div className="mb-4">
              <Notice tone="red">{error}</Notice>
            </div>
          )}

          {tab === "upload" ? (
            <label
              className={cx(
                "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors",
                uploading ? "border-[#329AD4] bg-[#EAF5FB]" : "border-[#b8e0f6] bg-[#f0f8fd] hover:border-[#329AD4] hover:bg-[#EAF5FB] cursor-pointer"
              )}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#329AD4] shadow-sm">
                {uploading ? <Spinner className="h-6 w-6" /> : <Icon name="upload" className="w-7 h-7" />}
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Upload a new image to S3</p>
                <p className="mt-1 text-xs text-zinc-500">JPG, PNG, WebP, SVG — then select it from the library.</p>
              </div>
              <span className={buttonClass("primary", "md")}>
                {uploading ? "Uploading…" : "Choose file"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                disabled={uploading}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  e.target.value = "";
                  void handleUpload(file);
                }}
              />
            </label>
          ) : loading ? (
            <LoadingState label="Loading media library…" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="image"
              title="No images found yet"
              action={
                <Button icon="upload" onClick={() => setTab("upload")}>
                  Upload your first image
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((img) => {
                const isSel = selected === img.url;
                return (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setSelected(img.url)}
                    onDoubleClick={() => {
                      onSelect(img.url);
                      onClose();
                    }}
                    className={cx(
                      "group relative aspect-square rounded-xl overflow-hidden border bg-zinc-50 cursor-pointer transition-all",
                      isSel
                        ? "border-[#329AD4] ring-2 ring-[#329AD4] ring-offset-2 shadow-md"
                        : "border-zinc-200 hover:border-[#b8e0f6] hover:shadow-sm"
                    )}
                    title={img.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaSrc(img.url) || img.url}
                      alt={img.name}
                      className="absolute inset-0 w-full h-full object-contain p-2 transition-transform group-hover:scale-[1.03]"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-medium px-2 pt-4 pb-1.5 truncate text-left">
                      {img.name}
                    </span>
                    {isSel && (
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#329AD4] text-white flex items-center justify-center shadow-md ring-2 ring-white">
                        <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50">
          <p className="text-xs text-zinc-400">Double-click an image to select instantly</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              icon="check"
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                onSelect(selected);
                onClose();
              }}
            >
              Use selected
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
