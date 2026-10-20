"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mediaSrc } from "@/lib/mediaUrl";

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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
            <p className="text-sm text-zinc-500">Pick an image already in your S3 bucket, or upload a new one.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pt-3 flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-3">
          <button
            type="button"
            onClick={() => setTab("library")}
            className={`px-3.5 py-1.5 text-sm font-bold rounded-xl cursor-pointer ${
              tab === "library" ? "bg-[#064FE0] text-white" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            S3 / library ({images.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`px-3.5 py-1.5 text-sm font-bold rounded-xl cursor-pointer ${
              tab === "upload" ? "bg-[#064FE0] text-white" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            Upload new
          </button>
          {tab === "library" && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search images…"
              className="ml-auto flex-1 min-w-[160px] max-w-xs bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3 py-1.5 text-sm"
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-[#f8fbfd]">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold">
              {error}
            </div>
          )}

          {tab === "upload" ? (
            <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-10 text-center space-y-4">
              <p className="text-base font-bold text-zinc-700">Upload a new image to S3</p>
              <p className="text-sm text-zinc-500">JPG, PNG, WebP, SVG — then select it from the library.</p>
              <label className="inline-flex px-5 py-2.5 rounded-xl bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold cursor-pointer">
                {uploading ? "Uploading…" : "Choose file"}
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
            </div>
          ) : loading ? (
            <div className="py-16 text-center text-zinc-500 font-medium">Loading media library…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-zinc-600 font-bold">No images found yet</p>
              <button
                type="button"
                onClick={() => setTab("upload")}
                className="px-4 py-2 rounded-xl bg-[#064FE0] text-white text-sm font-bold cursor-pointer"
              >
                Upload your first image
              </button>
            </div>
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
                    className={`group relative aspect-square rounded-2xl overflow-hidden border-2 bg-white cursor-pointer transition-all ${
                      isSel
                        ? "border-[#064FE0] ring-2 ring-[#064FE0]/30 shadow-md"
                        : "border-zinc-200 hover:border-[#064FE0]/50"
                    }`}
                    title={img.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaSrc(img.url) || img.url}
                      alt={img.name}
                      className="absolute inset-0 w-full h-full object-contain p-2"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[10px] font-medium px-1.5 py-1 truncate">
                      {img.name}
                    </span>
                    {isSel && (
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#064FE0] text-white text-xs font-bold flex items-center justify-center">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <p className="text-xs text-zinc-400">Double-click an image to select instantly</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold rounded-xl border border-zinc-200 text-zinc-600 cursor-pointer hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                onSelect(selected);
                onClose();
              }}
              className="px-4 py-2 text-sm font-bold rounded-xl bg-[#064FE0] text-white disabled:opacity-50 cursor-pointer hover:bg-[#0439A8]"
            >
              Use selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
