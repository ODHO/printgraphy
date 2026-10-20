"use client";

import { useState, useEffect, useCallback } from "react";
import { mediaSrc } from "@/lib/mediaUrl";

interface MenuColumn {
  title: string;
  links: { title: string; url: string }[];
}

interface MenuFeature {
  image: string;
  title: string;
  text: string;
  url: string;
  linkLabel: string;
}

interface HeaderMenuItem {
  _id: string;
  title: string;
  url: string;
  order: number;
  isActive: boolean;
  openInNewTab: boolean;
  loginOnly?: boolean;
  categoryId?: string | null;
  columns?: MenuColumn[];
  feature?: MenuFeature;
  createdAt?: string;
}

interface CategoryOption {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  variations?: { name: string; values?: { name: string }[] }[];
}

const emptyFeature = (): MenuFeature => ({ image: "", title: "", text: "", url: "", linkLabel: "" });

const emptyHeaderForm = () => ({
  title: "",
  url: "",
  openInNewTab: false,
  loginOnly: false,
  isActive: true,
  categoryId: "",
  columns: [] as MenuColumn[],
  feature: emptyFeature(),
});

interface FooterMenuItem {
  _id?: string;
  title: string;
  url: string;
  order: number;
  isActive: boolean;
  openInNewTab: boolean;
}

interface FooterColumn {
  _id: string;
  title: string;
  order: number;
  isActive: boolean;
  items: FooterMenuItem[];
}

export default function AdminNavigationMenuPage() {
  const [activeTab, setActiveTab] = useState<"header" | "footer">("header");

  // ─── HEADER MENU STATE ────────────────────────────────────────────────────────
  const [headerItems, setHeaderItems] = useState<HeaderMenuItem[]>([]);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [headerHasUnsaved, setHeaderHasUnsaved] = useState(false);

  // Header Modal State
  const [showHeaderModal, setShowHeaderModal] = useState(false);
  const [editingHeaderItem, setEditingHeaderItem] = useState<HeaderMenuItem | null>(null);
  const [headerForm, setHeaderForm] = useState(emptyHeaderForm);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [headerModalSaving, setHeaderModalSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Header Drag & Drop State
  const [headerDraggedIndex, setHeaderDraggedIndex] = useState<number | null>(null);
  const [headerDragOverIndex, setHeaderDragOverIndex] = useState<number | null>(null);

  // ─── FOOTER MENU STATE ────────────────────────────────────────────────────────
  const [footerColumns, setFooterColumns] = useState<FooterColumn[]>([]);
  const [footerLoading, setFooterLoading] = useState(true);
  const [footerSaving, setFooterSaving] = useState(false);
  const [footerHasUnsaved, setFooterHasUnsaved] = useState(false);

  // Footer Column Modal State
  const [showColModal, setShowColModal] = useState(false);
  const [editingCol, setEditingCol] = useState<FooterColumn | null>(null);
  const [colForm, setColForm] = useState({ title: "", isActive: true });
  const [colModalSaving, setColModalSaving] = useState(false);

  // Footer Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [targetColId, setTargetColId] = useState<string | null>(null);
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [linkForm, setLinkForm] = useState({
    title: "",
    url: "",
    openInNewTab: false,
    isActive: true,
  });

  // Shared Toast & Error state
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── FETCH HEADER MENU ────────────────────────────────────────────────────────
  const fetchHeaderItems = useCallback(async () => {
    setHeaderLoading(true);
    try {
      const res = await fetch("/api/admin/header-menu");
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setHeaderItems(data.items);
      }
    } catch {
      showToast("Failed to load header menu items", "error");
    } finally {
      setHeaderLoading(false);
    }
  }, []);

  // ─── FETCH FOOTER MENU ────────────────────────────────────────────────────────
  const fetchFooterColumns = useCallback(async () => {
    setFooterLoading(true);
    try {
      const res = await fetch("/api/admin/footer-menu");
      const data = await res.json();
      if (data.success && Array.isArray(data.columns)) {
        setFooterColumns(data.columns);
      }
    } catch {
      showToast("Failed to load footer menu columns", "error");
    } finally {
      setFooterLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeaderItems();
    fetchFooterColumns();
    fetch("/api/admin/categories")
      .then((response) => response.json())
      .then((data) => {
        const list = data.categories || data.items || [];
        if (Array.isArray(list)) setCategories(list);
      })
      .catch(() => setCategories([]));
  }, [fetchHeaderItems, fetchFooterColumns]);

  // ─── HEADER MENU HANDLERS ───────────────────────────────────────────────────
  const handleHeaderDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setHeaderDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleHeaderDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (headerDragOverIndex !== index) setHeaderDragOverIndex(index);
  };

  const handleHeaderDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (headerDraggedIndex === null || headerDraggedIndex === dropIndex) {
      setHeaderDraggedIndex(null);
      setHeaderDragOverIndex(null);
      return;
    }
    const newItems = [...headerItems];
    const [moved] = newItems.splice(headerDraggedIndex, 1);
    newItems.splice(dropIndex, 0, moved);
    const reordered = newItems.map((item, idx) => ({ ...item, order: idx }));
    setHeaderItems(reordered);
    setHeaderDraggedIndex(null);
    setHeaderDragOverIndex(null);
    setHeaderHasUnsaved(true);
  };

  const moveHeaderItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= headerItems.length) return;
    const newItems = [...headerItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    const reordered = newItems.map((item, idx) => ({ ...item, order: idx }));
    setHeaderItems(reordered);
    setHeaderHasUnsaved(true);
  };

  const saveHeaderOrder = async () => {
    setHeaderSaving(true);
    try {
      const res = await fetch("/api/admin/header-menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: headerItems }),
      });
      const data = await res.json();
      if (data.success) {
        setHeaderItems(data.items);
        setHeaderHasUnsaved(false);
        showToast("Header menu order updated successfully!");
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save menu order.", "error");
    } finally {
      setHeaderSaving(false);
    }
  };

  const handleToggleLoginOnly = async (id: string, current: boolean) => {
    const updated = headerItems.map((item) =>
      item._id === id ? { ...item, loginOnly: !current } : item
    );
    setHeaderItems(updated);
    try {
      const res = await fetch(`/api/admin/header-menu/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginOnly: !current }),
      });
      const data = await res.json();
      if (!data.success) {
        setHeaderItems(headerItems);
        showToast("Failed to update login visibility", "error");
      } else {
        showToast(!current ? "Link shows only after login" : "Link shows for everyone");
      }
    } catch {
      setHeaderItems(headerItems);
      showToast("Error connecting to server", "error");
    }
  };

  const handleToggleHeaderActive = async (id: string, currentStatus: boolean) => {
    const updated = headerItems.map((item) =>
      item._id === id ? { ...item, isActive: !currentStatus } : item
    );
    setHeaderItems(updated);
    try {
      const res = await fetch(`/api/admin/header-menu/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        setHeaderItems(headerItems);
        showToast("Failed to update status", "error");
      } else {
        showToast(`Header link ${!currentStatus ? "activated" : "deactivated"}`);
      }
    } catch {
      setHeaderItems(headerItems);
      showToast("Error connecting to server", "error");
    }
  };

  const handleHeaderFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerForm.title.trim() || !headerForm.url.trim()) {
      setErrorMsg("Title and URL are required");
      return;
    }
    setHeaderModalSaving(true);
    setErrorMsg("");

    try {
      if (editingHeaderItem) {
        const res = await fetch(`/api/admin/header-menu/${editingHeaderItem._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(headerForm),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showToast("Header link updated!");
      } else {
        const res = await fetch("/api/admin/header-menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(headerForm),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showToast("New header link created!");
      }
      setShowHeaderModal(false);
      fetchHeaderItems();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save link.");
    } finally {
      setHeaderModalSaving(false);
    }
  };

  const handleDeleteHeaderItem = async (id: string, title: string) => {
    if (!confirm(`Delete header link "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/header-menu/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setHeaderItems((prev) => prev.filter((item) => item._id !== id));
        showToast(`"${title}" deleted successfully.`);
      } else {
        showToast(data.message || "Failed to delete link.", "error");
      }
    } catch {
      showToast("Error deleting link.", "error");
    }
  };

  const handleResetHeaderDefaults = async () => {
    if (!confirm("Reset header menu to factory defaults?")) return;
    setHeaderLoading(true);
    try {
      const res = await fetch("/api/admin/header-menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const data = await res.json();
      if (data.success) {
        setHeaderItems(data.items);
        setHeaderHasUnsaved(false);
        showToast("Header menu reset to defaults!");
      }
    } catch {
      showToast("Failed to reset header defaults.", "error");
    } finally {
      setHeaderLoading(false);
    }
  };

  // ─── FOOTER MENU HANDLERS ───────────────────────────────────────────────────
  const moveFooterColumn = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= footerColumns.length) return;
    const newCols = [...footerColumns];
    const temp = newCols[index];
    newCols[index] = newCols[targetIndex];
    newCols[targetIndex] = temp;
    const reordered = newCols.map((col, idx) => ({ ...col, order: idx }));
    setFooterColumns(reordered);
    setFooterHasUnsaved(true);
  };

  const moveFooterLink = (colId: string, linkIndex: number, direction: "up" | "down") => {
    const col = footerColumns.find((c) => c._id === colId);
    if (!col) return;
    const targetIndex = direction === "up" ? linkIndex - 1 : linkIndex + 1;
    if (targetIndex < 0 || targetIndex >= col.items.length) return;

    const newItems = [...col.items];
    const temp = newItems[linkIndex];
    newItems[linkIndex] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    const reorderedItems = newItems.map((item, idx) => ({ ...item, order: idx }));

    const updatedCols = footerColumns.map((c) =>
      c._id === colId ? { ...c, items: reorderedItems } : c
    );
    setFooterColumns(updatedCols);
    setFooterHasUnsaved(true);
  };

  const saveFooterChanges = async () => {
    setFooterSaving(true);
    try {
      const res = await fetch("/api/admin/footer-menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: footerColumns }),
      });
      const data = await res.json();
      if (data.success) {
        setFooterColumns(data.columns);
        setFooterHasUnsaved(false);
        showToast("Footer menu updated successfully!");
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save footer menu.", "error");
    } finally {
      setFooterSaving(false);
    }
  };

  const handleToggleColActive = async (colId: string, currentStatus: boolean) => {
    const updated = footerColumns.map((c) =>
      c._id === colId ? { ...c, isActive: !currentStatus } : c
    );
    setFooterColumns(updated);
    try {
      const res = await fetch(`/api/admin/footer-menu/${colId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        setFooterColumns(footerColumns);
        showToast("Failed to update column status", "error");
      } else {
        showToast(`Column ${!currentStatus ? "activated" : "hidden"}`);
      }
    } catch {
      setFooterColumns(footerColumns);
      showToast("Error updating column status", "error");
    }
  };

  const handleToggleLinkActive = (colId: string, linkIndex: number) => {
    const updatedCols = footerColumns.map((col) => {
      if (col._id !== colId) return col;
      const updatedItems = col.items.map((item, idx) =>
        idx === linkIndex ? { ...item, isActive: !item.isActive } : item
      );
      return { ...col, items: updatedItems };
    });
    setFooterColumns(updatedCols);
    setFooterHasUnsaved(true);
  };

  const handleDeleteFooterColumn = async (colId: string, title: string) => {
    if (!confirm(`Delete footer column "${title}" and all its links?`)) return;
    try {
      const res = await fetch(`/api/admin/footer-menu/${colId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setFooterColumns((prev) => prev.filter((c) => c._id !== colId));
        showToast(`Footer column "${title}" deleted.`);
      } else {
        showToast(data.message || "Failed to delete column.", "error");
      }
    } catch {
      showToast("Error deleting column.", "error");
    }
  };

  const handleDeleteFooterLink = (colId: string, linkIndex: number, linkTitle: string) => {
    if (!confirm(`Remove link "${linkTitle}"?`)) return;
    const updatedCols = footerColumns.map((col) => {
      if (col._id !== colId) return col;
      const updatedItems = col.items.filter((_, idx) => idx !== linkIndex);
      return { ...col, items: updatedItems };
    });
    setFooterColumns(updatedCols);
    setFooterHasUnsaved(true);
    showToast(`Link "${linkTitle}" removed.`);
  };

  const handleColFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colForm.title.trim()) {
      setErrorMsg("Column Title is required");
      return;
    }
    setColModalSaving(true);
    setErrorMsg("");

    try {
      if (editingCol) {
        const res = await fetch(`/api/admin/footer-menu/${editingCol._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(colForm),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showToast("Footer column title updated!");
      } else {
        const res = await fetch("/api/admin/footer-menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...colForm, items: [] }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showToast("New footer column created!");
      }
      setShowColModal(false);
      fetchFooterColumns();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save column.");
    } finally {
      setColModalSaving(false);
    }
  };

  const handleLinkFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkForm.title.trim() || !linkForm.url.trim() || !targetColId) {
      setErrorMsg("Link title and URL are required.");
      return;
    }

    const updatedCols = footerColumns.map((col) => {
      if (col._id !== targetColId) return col;
      let newItems = [...col.items];
      if (editingLinkIndex !== null) {
        newItems[editingLinkIndex] = { ...newItems[editingLinkIndex], ...linkForm };
      } else {
        newItems.push({
          title: linkForm.title.trim(),
          url: linkForm.url.trim(),
          order: newItems.length,
          isActive: linkForm.isActive,
          openInNewTab: linkForm.openInNewTab,
        });
      }
      return { ...col, items: newItems };
    });

    setFooterColumns(updatedCols);
    setFooterHasUnsaved(true);
    setShowLinkModal(false);
    showToast(editingLinkIndex !== null ? "Link updated! (Click Save Footer to commit)" : "New link added! (Click Save Footer to commit)");
  };

  const handleResetFooterDefaults = async () => {
    if (!confirm("Reset footer menu to factory defaults?")) return;
    setFooterLoading(true);
    try {
      const res = await fetch("/api/admin/footer-menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const data = await res.json();
      if (data.success) {
        setFooterColumns(data.columns);
        setFooterHasUnsaved(false);
        showToast("Footer menu reset to defaults!");
      }
    } catch {
      showToast("Failed to reset footer defaults.", "error");
    } finally {
      setFooterLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-base font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-900 text-emerald-100 border-emerald-700"
              : "bg-red-900 text-red-100 border-red-700"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Website Navigation Menu Customizer</h1>
          <p className="text-zinc-500 text-base mt-1">
            Manage your website&apos;s Header and Footer navigation links live in real-time.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-200/80 p-1.5 rounded-2xl gap-1 shrink-0 self-start sm:self-auto border border-zinc-200">
          <button
            onClick={() => setActiveTab("header")}
            className={`px-5 py-2 text-base font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "header"
                ? "bg-[#064FE0] text-white shadow-md shadow-[#064FE0]/20"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
            }`}
          >
            Header Menu
          </button>
          <button
            onClick={() => setActiveTab("footer")}
            className={`px-5 py-2 text-base font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "footer"
                ? "bg-[#064FE0] text-white shadow-md shadow-[#064FE0]/20"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
            }`}
          >
            Footer Menu
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: HEADER MENU CUSTOMIZER                                              */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "header" && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-zinc-800">Header Navigation Links</span>
                <span className="px-2 py-0.5 rounded-full text-base font-black bg-blue-100 text-blue-800 uppercase tracking-wider">
                  Drag & Drop
                </span>
              </div>
              <p className="text-base text-zinc-400 mt-0.5">
                Reorder header links, toggle visibility, or add new links.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleResetHeaderDefaults}
                className="px-3.5 py-2 text-base font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Reset header menu to default list"
              >
                🔄 Reset Defaults
              </button>

              <button
                onClick={() => {
                  setEditingHeaderItem(null);
                  setHeaderForm(emptyHeaderForm());
                  setErrorMsg("");
                  setShowHeaderModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#064FE0]/20 cursor-pointer"
              >
                <span className="text-base font-black">+</span> Add Header Link
              </button>
            </div>
          </div>

          {/* Unsaved Header Changes Banner */}
          {headerHasUnsaved && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base">
                  !
                </div>
                <div>
                  <p className="text-base font-bold text-amber-900">You have unsaved header layout changes!</p>
                  <p className="text-base text-amber-700">
                    Click &quot;Save Header Order&quot; to apply your new order to the live website header.
                  </p>
                </div>
              </div>
              <button
                onClick={saveHeaderOrder}
                disabled={headerSaving}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-amber-600/30 shrink-0 disabled:opacity-60"
              >
                {headerSaving ? "Saving Order..." : "💾 Save Header Order"}
              </button>
            </div>
          )}

          {/* Live Header Preview Card */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-5 text-white space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-base border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2 font-mono text-zinc-400 text-base">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>LIVE WEBSITE HEADER PREVIEW</span>
              </div>
              <span className="text-base text-zinc-500">Updates live when saved</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-6 text-base font-semibold text-zinc-200 min-w-max">
                {headerItems
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <span
                      key={item._id}
                      className="hover:text-sky-400 transition-colors cursor-default flex items-center gap-1"
                    >
                      {item.title}
                      {item.openInNewTab && (
                        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Main Drag & Drop Container for Header */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-[#f8fbfd] border-b border-zinc-100 flex items-center justify-between">
              <span className="text-base font-bold text-zinc-700 uppercase tracking-wider">
                Header Navigation Links ({headerItems.length})
              </span>

              <button
                onClick={saveHeaderOrder}
                disabled={headerSaving || !headerHasUnsaved}
                className={`px-4 py-1.5 text-base font-bold rounded-xl transition-all cursor-pointer ${
                  headerHasUnsaved
                    ? "bg-[#064FE0] hover:bg-[#0439A8] text-white shadow-md shadow-[#064FE0]/20"
                    : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                }`}
              >
                {headerSaving ? "Saving..." : "Save Order"}
              </button>
            </div>

            {headerLoading ? (
              <div className="py-20 text-center space-y-2">
                <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin mx-auto" />
                <p className="text-base text-zinc-400">Loading header menu...</p>
              </div>
            ) : headerItems.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <p className="text-zinc-500 text-base font-semibold">No header menu links found.</p>
                <button
                  onClick={handleResetHeaderDefaults}
                  className="px-4 py-2 bg-[#064FE0] text-white text-base font-bold rounded-xl hover:bg-[#0439A8] transition-all cursor-pointer"
                >
                  Seed Default Menu Links
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {headerItems.map((item, index) => {
                  const isDragging = headerDraggedIndex === index;
                  const isDragOver = headerDragOverIndex === index;

                  return (
                    <div
                      key={item._id}
                      draggable
                      onDragStart={(e) => handleHeaderDragStart(e, index)}
                      onDragOver={(e) => handleHeaderDragOver(e, index)}
                      onDrop={(e) => handleHeaderDrop(e, index)}
                      className={`p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-grab active:cursor-grabbing select-none ${
                        isDragging
                          ? "opacity-40 bg-sky-50 border-2 border-dashed border-[#064FE0]"
                          : isDragOver
                          ? "bg-sky-100/60 border-t-2 border-[#064FE0]"
                          : "hover:bg-sky-50/30 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center shrink-0"
                          title="Drag to reorder"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                          </svg>
                        </div>

                        <span className="w-6 h-6 rounded-full bg-sky-100 text-[#064FE0] font-bold text-base flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 text-base">{item.title}</span>
                            {item.openInNewTab && (
                              <span className="px-1.5 py-0.5 rounded text-base font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                New Tab ↗
                              </span>
                            )}
                            {(item.categoryId || (item.columns && item.columns.length > 0)) && (
                              <span className="px-1.5 py-0.5 rounded text-base font-bold bg-sky-50 text-[#064FE0] border border-sky-200">
                                Dropdown
                              </span>
                            )}
                          </div>
                          <p className="text-base font-mono text-zinc-400 truncate max-w-md">{item.url}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="flex items-center bg-zinc-100 rounded-xl p-0.5 border border-zinc-200/60">
                          <button
                            onClick={() => moveHeaderItem(index, "up")}
                            disabled={index === 0}
                            className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveHeaderItem(index, "down")}
                            disabled={index === headerItems.length - 1}
                            className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>

                        <button
                          onClick={() => handleToggleLoginOnly(item._id, Boolean(item.loginOnly))}
                          className={`px-3 py-1.5 rounded-xl text-base font-bold transition-all cursor-pointer border ${
                            item.loginOnly
                              ? "bg-sky-50 text-[#064FE0] border-sky-200 hover:bg-sky-100"
                              : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200"
                          }`}
                        >
                          {item.loginOnly ? "Login only" : "Everyone"}
                        </button>

                        <button
                          onClick={() => handleToggleHeaderActive(item._id, item.isActive)}
                          className={`px-3 py-1.5 rounded-xl text-base font-bold transition-all cursor-pointer border ${
                            item.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200"
                          }`}
                        >
                          {item.isActive ? "✓ Active" : "✕ Hidden"}
                        </button>

                        <button
                          onClick={() => {
                            setEditingHeaderItem(item);
                            setHeaderForm({
                              title: item.title,
                              url: item.url,
                              openInNewTab: item.openInNewTab ?? false,
                              loginOnly: item.loginOnly ?? false,
                              isActive: item.isActive ?? true,
                              categoryId: item.categoryId ? String(item.categoryId) : "",
                              columns: item.columns || [],
                              feature: { ...emptyFeature(), ...(item.feature || {}) },
                            });
                            setErrorMsg("");
                            setShowHeaderModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-base font-bold transition-all cursor-pointer"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteHeaderItem(item._id, item.title)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer text-base"
                          title="Delete Link"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: FOOTER MENU CUSTOMIZER                                              */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "footer" && (
        <div className="space-y-6">
          {/* Footer Action Bar */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-zinc-800">Footer Menu Columns & Links</span>
                <span className="px-2 py-0.5 rounded-full text-base font-black bg-purple-100 text-purple-800 uppercase tracking-wider">
                  Full Control
                </span>
              </div>
              <p className="text-base text-zinc-400 mt-0.5">
                Customize column titles, organize links under each column, and manage link target URLs.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleResetFooterDefaults}
                className="px-3.5 py-2 text-base font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Reset footer columns to factory default list"
              >
                🔄 Reset Defaults
              </button>

              <button
                onClick={() => {
                  setEditingCol(null);
                  setColForm({ title: "", isActive: true });
                  setErrorMsg("");
                  setShowColModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#064FE0]/20 cursor-pointer"
              >
                <span className="text-base font-black">+</span> Add Footer Column
              </button>
            </div>
          </div>

          {/* Unsaved Footer Changes Banner */}
          {footerHasUnsaved && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base">
                  !
                </div>
                <div>
                  <p className="text-base font-bold text-amber-900">You have unsaved footer menu changes!</p>
                  <p className="text-base text-amber-700">
                    Click &quot;Save Footer Menu&quot; to apply all link and column changes to the live website footer.
                  </p>
                </div>
              </div>
              <button
                onClick={saveFooterChanges}
                disabled={footerSaving}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-amber-600/30 shrink-0 disabled:opacity-60"
              >
                {footerSaving ? "Saving Footer..." : "💾 Save Footer Menu"}
              </button>
            </div>
          )}

          {/* Live Footer Preview Card */}
          <div className="bg-[#0E1A2B] rounded-3xl p-6 text-white space-y-4 shadow-xl border border-white/10">
            <div className="flex items-center justify-between text-base border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 font-mono text-zinc-400 text-base">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE WEBSITE FOOTER PREVIEW</span>
              </div>
              <span className="text-base text-zinc-400">Updates live when saved</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-2">
              {/* Brand Column */}
              <div className="space-y-2">
                <div className="h-8 w-24 bg-white/10 rounded flex items-center justify-center font-bold text-base text-zinc-300 tracking-widest">
                  PRINTGRAPHY LOGO
                </div>
                <p className="text-base text-zinc-400 leading-relaxed">
                  Print, packaging, & sourcing custom materials.
                </p>
              </div>

              {/* Dynamic Columns Preview */}
              {footerColumns
                .filter((col) => col.isActive)
                .map((col) => (
                  <div key={col._id || col.title} className="space-y-2">
                    <h4 className="text-base font-bold tracking-widest uppercase text-zinc-400">
                      {col.title}
                    </h4>
                    <ul className="space-y-1.5 text-base text-zinc-200">
                      {(col.items || [])
                        .filter((item) => item.isActive !== false)
                        .map((item, idx) => (
                          <li key={item._id || idx} className="hover:text-sky-400 cursor-default flex items-center gap-1">
                            <span>{item.title}</span>
                            {item.openInNewTab && <span className="text-base opacity-60">↗</span>}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>

          {/* Columns Editor List */}
          {footerLoading ? (
            <div className="bg-white rounded-3xl p-12 border border-zinc-200/80 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-purple-200 border-t-[#064FE0] rounded-full animate-spin mx-auto" />
              <p className="text-base text-zinc-400">Loading footer columns...</p>
            </div>
          ) : footerColumns.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-zinc-200/80 text-center space-y-3">
              <p className="text-zinc-500 text-base font-semibold">No footer columns found.</p>
              <button
                onClick={handleResetFooterDefaults}
                className="px-4 py-2 bg-[#064FE0] text-white text-base font-bold rounded-xl hover:bg-[#0439A8] transition-all cursor-pointer"
              >
                Seed Default Footer Columns
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {footerColumns.map((col, colIdx) => (
                <div
                  key={col._id}
                  className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                    col.isActive ? "border-zinc-200/80" : "border-zinc-200 opacity-60 bg-zinc-50/50"
                  }`}
                >
                  {/* Column Header Bar */}
                  <div className="p-4 bg-[#f8fbfd] border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 font-bold text-base flex items-center justify-center shrink-0">
                        {colIdx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-zinc-900 text-base">{col.title}</h3>
                          <span className="text-base text-zinc-400 font-semibold">
                            ({col.items?.length || 0} links)
                          </span>
                        </div>
                        <p className="text-base text-zinc-400">Footer Column Header</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {/* Column Move Up / Move Down */}
                      <div className="flex items-center bg-zinc-100 rounded-xl p-0.5 border border-zinc-200/60">
                        <button
                          onClick={() => moveFooterColumn(colIdx, "up")}
                          disabled={colIdx === 0}
                          className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                          title="Move Column Left/Up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveFooterColumn(colIdx, "down")}
                          disabled={colIdx === footerColumns.length - 1}
                          className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                          title="Move Column Right/Down"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Add Link to Column */}
                      <button
                        onClick={() => {
                          setTargetColId(col._id);
                          setEditingLinkIndex(null);
                          setLinkForm({ title: "", url: "", openInNewTab: false, isActive: true });
                          setErrorMsg("");
                          setShowLinkModal(true);
                        }}
                        className="px-3 py-1.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all cursor-pointer"
                      >
                        + Add Link
                      </button>

                      {/* Toggle Active Column */}
                      <button
                        onClick={() => handleToggleColActive(col._id, col.isActive)}
                        className={`px-3 py-1.5 rounded-xl text-base font-bold transition-all cursor-pointer border ${
                          col.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200"
                        }`}
                      >
                        {col.isActive ? "✓ Column Visible" : "✕ Hidden"}
                      </button>

                      {/* Edit Column Title */}
                      <button
                        onClick={() => {
                          setEditingCol(col);
                          setColForm({ title: col.title, isActive: col.isActive });
                          setErrorMsg("");
                          setShowColModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-base font-bold transition-all cursor-pointer"
                      >
                        Edit Column
                      </button>

                      {/* Delete Column */}
                      <button
                        onClick={() => handleDeleteFooterColumn(col._id, col.title)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer text-base"
                        title="Delete Column"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Links under Column */}
                  {(!col.items || col.items.length === 0) ? (
                    <div className="p-6 text-center text-base text-zinc-400 italic">
                      No links in this column yet. Click &quot;+ Add Link&quot; above to add one.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {col.items.map((link, linkIdx) => (
                        <div
                          key={link._id || linkIdx}
                          className="p-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-purple-50/20 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 font-bold text-base flex items-center justify-center shrink-0">
                              {linkIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-900 text-base">{link.title}</span>
                                {link.openInNewTab && (
                                  <span className="text-base font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                                    New Tab ↗
                                  </span>
                                )}
                              </div>
                              <p className="text-base font-mono text-zinc-400 truncate max-w-sm">{link.url}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Link Move buttons */}
                            <div className="flex items-center bg-zinc-100 rounded-lg p-0.5 border border-zinc-200/60">
                              <button
                                onClick={() => moveFooterLink(col._id, linkIdx, "up")}
                                disabled={linkIdx === 0}
                                className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-white rounded disabled:opacity-30 cursor-pointer text-base"
                                title="Move Link Up"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => moveFooterLink(col._id, linkIdx, "down")}
                                disabled={linkIdx === col.items.length - 1}
                                className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-white rounded disabled:opacity-30 cursor-pointer text-base"
                                title="Move Link Down"
                              >
                                ▼
                              </button>
                            </div>

                            {/* Toggle Link Status */}
                            <button
                              onClick={() => handleToggleLinkActive(col._id, linkIdx)}
                              className={`px-2.5 py-1 rounded-lg text-base font-bold cursor-pointer border ${
                                link.isActive !== false
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-zinc-100 text-zinc-500 border-zinc-200"
                              }`}
                            >
                              {link.isActive !== false ? "✓" : "✕"}
                            </button>

                            {/* Edit Link */}
                            <button
                              onClick={() => {
                                setTargetColId(col._id);
                                setEditingLinkIndex(linkIdx);
                                setLinkForm({
                                  title: link.title,
                                  url: link.url,
                                  openInNewTab: link.openInNewTab ?? false,
                                  isActive: link.isActive ?? true,
                                });
                                setErrorMsg("");
                                setShowLinkModal(true);
                              }}
                              className="px-2.5 py-1 text-base font-bold border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-700 cursor-pointer"
                            >
                              Edit
                            </button>

                            {/* Delete Link */}
                            <button
                              onClick={() => handleDeleteFooterLink(col._id, linkIdx, link.title)}
                              className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer text-base"
                              title="Delete link"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: CREATE / EDIT HEADER LINK ───────────────────────── */}
      {showHeaderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  {editingHeaderItem ? `Edit Header Link: ${editingHeaderItem.title}` : "Add Header Menu Link"}
                </h2>
                <p className="text-base text-zinc-400">
                  Add custom links or pages to your website main top navigation header.
                </p>
              </div>
              <button
                onClick={() => setShowHeaderModal(false)}
                className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-base font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleHeaderFormSubmit} className="space-y-4">
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Menu Title *</label>
                <input
                  required
                  type="text"
                  value={headerForm.title}
                  onChange={(e) => setHeaderForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]"
                  placeholder="e.g. Special Offers"
                />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">URL / Href *</label>
                <input
                  required
                  type="text"
                  value={headerForm.url}
                  onChange={(e) => setHeaderForm((prev) => ({ ...prev, url: e.target.value }))}
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base font-mono text-zinc-900 focus:outline-none focus:border-[#064FE0]"
                  placeholder="e.g. /browsedesigns or https://example.com"
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-[#f8fbfd] p-4 space-y-3">
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Category for the hover menu</label>
                  <select
                    value={headerForm.categoryId}
                    onChange={(e) => {
                      const categoryId = e.target.value;
                      const category = categories.find((item) => item._id === categoryId);
                      setHeaderForm((prev) => ({
                        ...prev,
                        categoryId,
                        url: prev.url || (category ? `/browsedesigns?category=${encodeURIComponent(category.name)}` : prev.url),
                        feature: {
                          ...prev.feature,
                          title: prev.feature.title || category?.name || "",
                          image: prev.feature.image || category?.image || "",
                          url: prev.feature.url || (category ? `/browsedesigns?category=${encodeURIComponent(category.name)}` : ""),
                          linkLabel: prev.feature.linkLabel || (category ? "Browse Designs" : ""),
                        },
                      }));
                    }}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]"
                  >
                    <option value="">No category — plain link</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                        {category.variations?.length ? ` · ${category.variations.length} variation groups` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-base text-zinc-500">
                    Hovering this menu item opens a panel. Each variation group on the category becomes a column, and each option becomes a link.
                  </p>
                </div>

                {headerForm.categoryId && (
                  <div className="text-base text-zinc-600">
                    {(categories.find((item) => item._id === headerForm.categoryId)?.variations || []).length === 0
                      ? "This category has no variations yet. Add them on the category, or add extra columns below."
                      : categories
                          .find((item) => item._id === headerForm.categoryId)
                          ?.variations?.map((variation) => variation.name)
                          .filter(Boolean)
                          .join(" · ")}
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={headerForm.feature.title}
                    onChange={(e) => setHeaderForm((prev) => ({ ...prev, feature: { ...prev.feature, title: e.target.value } }))}
                    placeholder="Side card title"
                    className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-base"
                  />
                  <input
                    type="text"
                    value={headerForm.feature.linkLabel}
                    onChange={(e) => setHeaderForm((prev) => ({ ...prev, feature: { ...prev.feature, linkLabel: e.target.value } }))}
                    placeholder="Side card link label"
                    className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-base"
                  />
                  <input
                    type="text"
                    value={headerForm.feature.url}
                    onChange={(e) => setHeaderForm((prev) => ({ ...prev, feature: { ...prev.feature, url: e.target.value } }))}
                    placeholder="Side card link"
                    className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-base font-mono"
                  />
                  <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                    {headerForm.feature.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaSrc(headerForm.feature.image)} alt="" className="h-16 w-24 rounded-lg object-cover border border-zinc-200" />
                    ) : (
                      <div className="h-16 w-24 rounded-lg border border-dashed border-zinc-300" />
                    )}
                    <label className="inline-flex cursor-pointer rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-base font-bold text-zinc-700">
                      {imageUploading ? "Uploading..." : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={imageUploading}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          setImageUploading(true);
                          setErrorMsg("");
                          try {
                            const body = new FormData();
                            body.append("file", file);
                            body.append("folder", "uploads");
                            const res = await fetch("/api/admin/upload", { method: "POST", body });
                            const data = await res.json();
                            if (!data.success || !data.url) throw new Error(data.message || "Upload failed");
                            setHeaderForm((prev) => ({ ...prev, feature: { ...prev.feature, image: data.url } }));
                          } catch (err) {
                            setErrorMsg(err instanceof Error ? err.message : "Upload failed");
                          } finally {
                            setImageUploading(false);
                          }
                        }}
                      />
                    </label>
                    {headerForm.feature.image && (
                      <button
                        type="button"
                        onClick={() => setHeaderForm((prev) => ({ ...prev, feature: { ...prev.feature, image: "" } }))}
                        className="text-base font-bold text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={headerForm.feature.text}
                    onChange={(e) => setHeaderForm((prev) => ({ ...prev, feature: { ...prev.feature, text: e.target.value } }))}
                    placeholder="Short caption"
                    className="sm:col-span-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-base"
                  />
                </div>

                <div className="space-y-3">
                  {headerForm.columns.map((column, columnIndex) => (
                    <div key={columnIndex} className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={column.title}
                          onChange={(e) =>
                            setHeaderForm((prev) => ({
                              ...prev,
                              columns: prev.columns.map((item, index) => (index === columnIndex ? { ...item, title: e.target.value } : item)),
                            }))
                          }
                          placeholder="Column title, e.g. Standard Cards"
                          className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-base font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => setHeaderForm((prev) => ({ ...prev, columns: prev.columns.filter((_, index) => index !== columnIndex) }))}
                          className="px-2 text-base text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      {column.links.map((link, linkIndex) => (
                        <div key={linkIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={link.title}
                            onChange={(e) =>
                              setHeaderForm((prev) => ({
                                ...prev,
                                columns: prev.columns.map((item, index) =>
                                  index === columnIndex
                                    ? { ...item, links: item.links.map((row, rowIndex) => (rowIndex === linkIndex ? { ...row, title: e.target.value } : row)) }
                                    : item
                                ),
                              }))
                            }
                            placeholder="Link name"
                            className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-base"
                          />
                          <input
                            type="text"
                            value={link.url}
                            onChange={(e) =>
                              setHeaderForm((prev) => ({
                                ...prev,
                                columns: prev.columns.map((item, index) =>
                                  index === columnIndex
                                    ? { ...item, links: item.links.map((row, rowIndex) => (rowIndex === linkIndex ? { ...row, url: e.target.value } : row)) }
                                    : item
                                ),
                              }))
                            }
                            placeholder="/browsedesigns"
                            className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-base font-mono"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setHeaderForm((prev) => ({
                                ...prev,
                                columns: prev.columns.map((item, index) =>
                                  index === columnIndex ? { ...item, links: item.links.filter((_, rowIndex) => rowIndex !== linkIndex) } : item
                                ),
                              }))
                            }
                            className="px-2 text-base text-zinc-400"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setHeaderForm((prev) => ({
                            ...prev,
                            columns: prev.columns.map((item, index) =>
                              index === columnIndex ? { ...item, links: [...item.links, { title: "", url: "" }] } : item
                            ),
                          }))
                        }
                        className="text-base font-bold text-[#064FE0]"
                      >
                        + Add link
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setHeaderForm((prev) => ({ ...prev, columns: [...prev.columns, { title: "", links: [{ title: "", url: "" }] }] }))}
                    className="text-base font-bold text-[#064FE0]"
                  >
                    + Add extra column
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-2 border-t border-zinc-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={headerForm.openInNewTab}
                    onChange={(e) => setHeaderForm((prev) => ({ ...prev, openInNewTab: e.target.checked }))}
                    className="rounded accent-[#064FE0]"
                  />
                  <span className="text-base font-semibold text-zinc-700">Open link in a new tab (_blank)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={headerForm.loginOnly}
                    onChange={(e) => setHeaderForm((prev) => ({ ...prev, loginOnly: e.target.checked }))}
                    className="rounded accent-[#064FE0]"
                  />
                  <span className="text-base font-semibold text-zinc-700">Show only when the customer is logged in</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={headerForm.isActive}
                    onChange={(e) => setHeaderForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded accent-[#064FE0]"
                  />
                  <span className="text-base font-semibold text-zinc-700">Visible on website header</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowHeaderModal(false)}
                  className="flex-1 py-2.5 text-base text-zinc-600 font-bold border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={headerModalSaving}
                  className="flex-1 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60"
                >
                  {headerModalSaving ? "Saving..." : editingHeaderItem ? "Update Link" : "Create Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CREATE / EDIT FOOTER COLUMN ─────────────────────── */}
      {showColModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  {editingCol ? `Edit Column: ${editingCol.title}` : "Add Footer Column"}
                </h2>
                <p className="text-base text-zinc-400">Specify the header title for this footer column section.</p>
              </div>
              <button
                onClick={() => setShowColModal(false)}
                className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-base font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleColFormSubmit} className="space-y-4">
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Column Title *</label>
                <input
                  required
                  type="text"
                  value={colForm.title}
                  onChange={(e) => setColForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]"
                  placeholder="e.g. Quick Links, Help & Support"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={colForm.isActive}
                    onChange={(e) => setColForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded accent-[#064FE0]"
                  />
                  <span className="text-base font-semibold text-zinc-700">Column Visible on Website Footer</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowColModal(false)}
                  className="flex-1 py-2.5 text-base text-zinc-600 font-bold border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={colModalSaving}
                  className="flex-1 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60"
                >
                  {colModalSaving ? "Saving..." : editingCol ? "Update Column" : "Create Column"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: CREATE / EDIT FOOTER LINK IN COLUMN ─────────────── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  {editingLinkIndex !== null ? "Edit Footer Link" : "Add Link to Column"}
                </h2>
                <p className="text-base text-zinc-400">Set label and target URL for this link.</p>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-base font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLinkFormSubmit} className="space-y-4">
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Link Title / Label *</label>
                <input
                  required
                  type="text"
                  value={linkForm.title}
                  onChange={(e) => setLinkForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]"
                  placeholder="e.g. Terms of Service, Contact Us"
                />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">URL / Href *</label>
                <input
                  required
                  type="text"
                  value={linkForm.url}
                  onChange={(e) => setLinkForm((prev) => ({ ...prev, url: e.target.value }))}
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base font-mono text-zinc-900 focus:outline-none focus:border-[#064FE0]"
                  placeholder="e.g. /contact or https://..."
                />
              </div>

              <div className="pt-2 space-y-2 border-t border-zinc-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkForm.openInNewTab}
                    onChange={(e) => setLinkForm((prev) => ({ ...prev, openInNewTab: e.target.checked }))}
                    className="rounded accent-[#064FE0]"
                  />
                  <span className="text-base font-semibold text-zinc-700">Open link in a new tab (_blank)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkForm.isActive}
                    onChange={(e) => setLinkForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded accent-[#064FE0]"
                  />
                  <span className="text-base font-semibold text-zinc-700">Link Visible</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1 py-2.5 text-base text-zinc-600 font-bold border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all cursor-pointer"
                >
                  {editingLinkIndex !== null ? "Update Link" : "Add Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
