"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { mediaSrc } from "@/lib/mediaUrl";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  IconButton,
  LoadingState,
  Notice,
  PageHeader,
  Spinner,
  cx,
  inputClass,
  labelClass,
  type IconName,
} from "@/components/admin/ui";

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

  const headerUnsavedOrSaving = activeTab === "header" ? headerHasUnsaved : footerHasUnsaved;

  const openEditHeaderItem = (item: HeaderMenuItem) => {
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
  };

  const openNewHeaderItem = () => {
    setEditingHeaderItem(null);
    setHeaderForm(emptyHeaderForm());
    setErrorMsg("");
    setShowHeaderModal(true);
  };

  const openNewFooterColumn = () => {
    setEditingCol(null);
    setColForm({ title: "", isActive: true });
    setErrorMsg("");
    setShowColModal(true);
  };

  const openNewFooterLink = (colId: string) => {
    setTargetColId(colId);
    setEditingLinkIndex(null);
    setLinkForm({ title: "", url: "", openInNewTab: false, isActive: true });
    setErrorMsg("");
    setShowLinkModal(true);
  };

  const selectedCategory = categories.find((item) => item._id === headerForm.categoryId);

  const NAV: { id: "header" | "footer"; label: string; hint: string; icon: IconName; count: number; unsaved: boolean }[] = [
    { id: "header", label: "Header Menu", hint: "Top navigation links", icon: "menu", count: headerItems.length, unsaved: headerHasUnsaved },
    { id: "footer", label: "Footer Menu", hint: "Columns & links", icon: "layers", count: footerColumns.length, unsaved: footerHasUnsaved },
  ];

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span
            className={cx(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              toast.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}
          >
            <Icon name={toast.type === "success" ? "check" : "ban"} className="w-4 h-4" strokeWidth={2.2} />
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Page Title */}
      <PageHeader
        icon="menu"
        title="Website Navigation Menu Customizer"
        description="Manage your website's Header and Footer navigation links live in real-time."
        back={{ href: "/admin/website", label: "Website" }}
        actions={
          activeTab === "header" ? (
            <Button onClick={saveHeaderOrder} disabled={headerSaving || !headerHasUnsaved} icon="check">
              {headerSaving ? "Saving..." : "Save Header Order"}
            </Button>
          ) : (
            <Button onClick={saveFooterChanges} disabled={footerSaving || !footerHasUnsaved} icon="check">
              {footerSaving ? "Saving Footer..." : "Save Footer Menu"}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start">
        {/* Section navigation */}
        <nav className="lg:sticky lg:top-6">
          <Card className="p-2">
            <p className="hidden lg:block px-3 pt-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Menus</p>
            <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
              {NAV.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cx(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all cursor-pointer min-w-0",
                      isActive ? "bg-[#EAF5FB]" : "hover:bg-zinc-50"
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isActive ? "bg-[#329AD4] text-white shadow-sm shadow-[#329AD4]/30" : "bg-zinc-100 text-zinc-500"
                      )}
                    >
                      <Icon name={item.icon} className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cx("flex items-center gap-1.5 text-sm font-semibold", isActive ? "text-[#1b5b80]" : "text-zinc-700")}>
                        <span className="truncate">{item.label}</span>
                        {item.unsaved && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />}
                      </span>
                      <span className="hidden sm:block truncate text-xs text-zinc-400">{item.hint}</span>
                    </span>
                    <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", isActive ? "bg-white text-[#2884b8]" : "bg-zinc-100 text-zinc-500")}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </nav>

        <div className="min-w-0 space-y-6">
          {/* ────────────────────────────────────────────────────────────────────────── */}
          {/* TAB 1: HEADER MENU CUSTOMIZER                                              */}
          {/* ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === "header" && (
            <>
              {/* Live Header Preview Card */}
              <Card className="overflow-hidden">
                <CardHeader
                  icon="eye"
                  title="Live website header preview"
                  subtitle="Updates live when saved"
                  action={
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  }
                />
                <div className="bg-gradient-to-br from-[#f0f8fd] to-white p-4 sm:p-5">
                  <div className="overflow-hidden rounded-xl border border-[#dbeefb] bg-white shadow-xs">
                    <div className="flex items-center gap-1.5 border-b border-zinc-100 bg-zinc-50/80 px-3 py-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
                    </div>
                    <div className="overflow-x-auto scrollbar-hide px-4 py-3.5">
                      <div className="flex items-center gap-6 text-sm font-medium text-zinc-700 min-w-max">
                        {headerItems
                          .filter((item) => item.isActive)
                          .map((item) => (
                            <span key={item._id} className="hover:text-[#329AD4] transition-colors cursor-default flex items-center gap-1">
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
                </div>
              </Card>

              {/* Main Drag & Drop Container for Header */}
              <Card className="overflow-hidden">
                <SectionBar
                  icon="menu"
                  title={
                    <span className="inline-flex flex-wrap items-center gap-2">
                      Header Navigation Links ({headerItems.length})
                      <Badge tone="brand">Drag & Drop</Badge>
                    </span>
                  }
                  subtitle="Reorder header links, toggle visibility, or add new links."
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" icon="refresh" onClick={handleResetHeaderDefaults} title="Reset header menu to default list">
                        Reset Defaults
                      </Button>
                      <Button size="sm" icon="plus" onClick={openNewHeaderItem}>
                        Add Header Link
                      </Button>
                    </div>
                  }
                />

                {headerLoading ? (
                  <LoadingState label="Loading header menu..." />
                ) : headerItems.length === 0 ? (
                  <EmptyState
                    icon="menu"
                    title="No header menu links found."
                    action={
                      <Button icon="refresh" onClick={handleResetHeaderDefaults}>
                        Seed Default Menu Links
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-2 p-3 sm:p-4">
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
                          className={cx(
                            "group rounded-xl border p-3 transition-all flex flex-col gap-3 md:flex-row md:items-center md:justify-between cursor-grab active:cursor-grabbing select-none",
                            isDragging
                              ? "opacity-40 bg-[#f0f8fd] border-2 border-dashed border-[#329AD4]"
                              : isDragOver
                              ? "bg-[#EAF5FB] border-[#329AD4] ring-2 ring-[#329AD4]/20"
                              : item.isActive
                              ? "bg-white border-zinc-200 hover:border-[#b8e0f6] hover:shadow-xs"
                              : "bg-zinc-50/70 border-zinc-200"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-8 w-6 shrink-0 items-center justify-center rounded-md text-zinc-300 group-hover:text-zinc-500" title="Drag to reorder">
                              <GripIcon />
                            </span>

                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FB] text-xs font-semibold text-[#2884b8]">
                              {index + 1}
                            </span>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={cx("text-sm font-semibold", item.isActive ? "text-zinc-900" : "text-zinc-500")}>{item.title}</span>
                                {item.openInNewTab && <Badge tone="amber">New Tab ↗</Badge>}
                                {(item.categoryId || (item.columns && item.columns.length > 0)) && <Badge tone="brand">Dropdown</Badge>}
                              </div>
                              <p className="text-xs font-mono text-zinc-400 truncate max-w-[16rem] sm:max-w-md">{item.url}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0 md:justify-end">
                            <MoveButtons
                              onUp={() => moveHeaderItem(index, "up")}
                              onDown={() => moveHeaderItem(index, "down")}
                              upDisabled={index === 0}
                              downDisabled={index === headerItems.length - 1}
                              upTitle="Move Up"
                              downTitle="Move Down"
                            />

                            <TogglePill
                              on={Boolean(item.loginOnly)}
                              onTone="brand"
                              onClick={() => handleToggleLoginOnly(item._id, Boolean(item.loginOnly))}
                            >
                              {item.loginOnly ? "Login only" : "Everyone"}
                            </TogglePill>

                            <TogglePill on={item.isActive} onTone="green" onClick={() => handleToggleHeaderActive(item._id, item.isActive)}>
                              {item.isActive ? "Active" : "Hidden"}
                            </TogglePill>

                            <div className="flex items-center">
                              <IconButton icon="edit" label="Edit" onClick={() => openEditHeaderItem(item)} />
                              <IconButton icon="trash" label="Delete Link" tone="danger" onClick={() => handleDeleteHeaderItem(item._id, item.title)} />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <DashedAddButton onClick={openNewHeaderItem}>Add Header Link</DashedAddButton>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ────────────────────────────────────────────────────────────────────────── */}
          {/* TAB 2: FOOTER MENU CUSTOMIZER                                              */}
          {/* ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === "footer" && (
            <>
              {/* Live Footer Preview Card */}
              <Card className="overflow-hidden">
                <CardHeader
                  icon="eye"
                  title="Live website footer preview"
                  subtitle="Updates live when saved"
                  action={
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  }
                />
                <div className="p-4 sm:p-5">
                  <div className="rounded-xl bg-[#0E1A2B] p-5 sm:p-6 text-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                      {/* Brand Column */}
                      <div className="space-y-2">
                        <div className="h-8 w-28 bg-white/10 rounded-lg flex items-center justify-center font-semibold text-[10px] text-zinc-300 tracking-widest">
                          PRINTGRAPHY LOGO
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">Print, packaging, & sourcing custom materials.</p>
                      </div>

                      {/* Dynamic Columns Preview */}
                      {footerColumns
                        .filter((col) => col.isActive)
                        .map((col) => (
                          <div key={col._id || col.title} className="space-y-2 min-w-0">
                            <h4 className="text-[11px] font-semibold tracking-widest uppercase text-zinc-400 truncate">{col.title}</h4>
                            <ul className="space-y-1.5 text-sm text-zinc-200">
                              {(col.items || [])
                                .filter((item) => item.isActive !== false)
                                .map((item, idx) => (
                                  <li key={item._id || idx} className="hover:text-[#7cc4ec] cursor-default flex items-center gap-1 min-w-0">
                                    <span className="truncate">{item.title}</span>
                                    {item.openInNewTab && <span className="text-xs opacity-60">↗</span>}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Footer Action Bar */}
              <Card>
                <SectionBar
                  icon="layers"
                  borderless
                  title={
                    <span className="inline-flex flex-wrap items-center gap-2">
                      Footer Menu Columns & Links
                      <Badge tone="brand">Full Control</Badge>
                    </span>
                  }
                  subtitle="Customize column titles, organize links under each column, and manage link target URLs."
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" icon="refresh" onClick={handleResetFooterDefaults} title="Reset footer columns to factory default list">
                        Reset Defaults
                      </Button>
                      <Button size="sm" icon="plus" onClick={openNewFooterColumn}>
                        Add Footer Column
                      </Button>
                    </div>
                  }
                />
              </Card>

              {/* Columns Editor List */}
              {footerLoading ? (
                <Card>
                  <LoadingState label="Loading footer columns..." />
                </Card>
              ) : footerColumns.length === 0 ? (
                <Card>
                  <EmptyState
                    icon="layers"
                    title="No footer columns found."
                    action={
                      <Button icon="refresh" onClick={handleResetFooterDefaults}>
                        Seed Default Footer Columns
                      </Button>
                    }
                  />
                </Card>
              ) : (
                <div className="space-y-4">
                  {footerColumns.map((col, colIdx) => (
                    <Card key={col._id} className={cx("overflow-hidden transition-all", !col.isActive && "bg-zinc-50/60")}>
                      {/* Column Header Bar */}
                      <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 sm:px-5 py-3.5 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={cx(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                              col.isActive ? "bg-[#329AD4] text-white shadow-sm shadow-[#329AD4]/30" : "bg-zinc-200 text-zinc-500"
                            )}
                          >
                            {colIdx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className={cx("text-sm font-semibold truncate", col.isActive ? "text-zinc-900" : "text-zinc-500")}>{col.title}</h3>
                              <Badge tone="gray">{col.items?.length || 0} links</Badge>
                            </div>
                            <p className="text-xs text-zinc-400">Footer Column Header</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Column Move Up / Move Down */}
                          <MoveButtons
                            onUp={() => moveFooterColumn(colIdx, "up")}
                            onDown={() => moveFooterColumn(colIdx, "down")}
                            upDisabled={colIdx === 0}
                            downDisabled={colIdx === footerColumns.length - 1}
                            upTitle="Move Column Left/Up"
                            downTitle="Move Column Right/Down"
                          />

                          {/* Toggle Active Column */}
                          <TogglePill on={col.isActive} onTone="green" onClick={() => handleToggleColActive(col._id, col.isActive)}>
                            {col.isActive ? "Column Visible" : "Hidden"}
                          </TogglePill>

                          <div className="flex items-center">
                            {/* Edit Column Title */}
                            <IconButton
                              icon="edit"
                              label="Edit Column"
                              onClick={() => {
                                setEditingCol(col);
                                setColForm({ title: col.title, isActive: col.isActive });
                                setErrorMsg("");
                                setShowColModal(true);
                              }}
                            />
                            {/* Delete Column */}
                            <IconButton icon="trash" label="Delete Column" tone="danger" onClick={() => handleDeleteFooterColumn(col._id, col.title)} />
                          </div>
                        </div>
                      </div>

                      {/* Links under Column */}
                      <div className="space-y-2 p-3 sm:p-4">
                        {!col.items || col.items.length === 0 ? (
                          <p className="py-3 text-center text-xs text-zinc-400">No links in this column yet. Use &quot;Add Link&quot; below to add one.</p>
                        ) : (
                          col.items.map((link, linkIdx) => (
                            <div
                              key={link._id || linkIdx}
                              className={cx(
                                "rounded-xl border px-3 py-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between transition-all",
                                link.isActive !== false ? "bg-white border-zinc-200 hover:border-[#b8e0f6]" : "bg-zinc-50 border-zinc-200"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[11px] font-semibold text-zinc-500">
                                  {linkIdx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={cx("text-sm font-medium", link.isActive !== false ? "text-zinc-900" : "text-zinc-400 line-through")}>{link.title}</span>
                                    {link.openInNewTab && <Badge tone="amber">New Tab ↗</Badge>}
                                  </div>
                                  <p className="text-xs font-mono text-zinc-400 truncate max-w-[16rem] sm:max-w-sm">{link.url}</p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {/* Link Move buttons */}
                                <MoveButtons
                                  onUp={() => moveFooterLink(col._id, linkIdx, "up")}
                                  onDown={() => moveFooterLink(col._id, linkIdx, "down")}
                                  upDisabled={linkIdx === 0}
                                  downDisabled={linkIdx === col.items.length - 1}
                                  upTitle="Move Link Up"
                                  downTitle="Move Link Down"
                                />

                                {/* Toggle Link Status */}
                                <TogglePill on={link.isActive !== false} onTone="green" onClick={() => handleToggleLinkActive(col._id, linkIdx)}>
                                  {link.isActive !== false ? "Visible" : "Hidden"}
                                </TogglePill>

                                {/* Edit Link */}
                                <IconButton
                                  icon="edit"
                                  label="Edit"
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
                                />

                                {/* Delete Link */}
                                <IconButton icon="trash" label="Delete link" tone="danger" onClick={() => handleDeleteFooterLink(col._id, linkIdx, link.title)} />
                              </div>
                            </div>
                          ))
                        )}

                        {/* Add Link to Column */}
                        <DashedAddButton size="sm" onClick={() => openNewFooterLink(col._id)}>
                          Add Link
                        </DashedAddButton>
                      </div>
                    </Card>
                  ))}

                  <DashedAddButton onClick={openNewFooterColumn}>Add Footer Column</DashedAddButton>
                </div>
              )}
            </>
          )}

          {/* Unsaved Changes — sticky save bar */}
          {headerUnsavedOrSaving && (
            <div className="sticky bottom-4 z-20">
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-white/95 px-4 py-3 shadow-lg shadow-amber-500/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <Icon name="clock" className="w-4 h-4" />
                  </span>
                  {activeTab === "header" ? (
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">You have unsaved header layout changes!</p>
                      <p className="text-xs text-zinc-500">Click &quot;Save Header Order&quot; to apply your new order to the live website header.</p>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">You have unsaved footer menu changes!</p>
                      <p className="text-xs text-zinc-500">Click &quot;Save Footer Menu&quot; to apply all link and column changes to the live website footer.</p>
                    </div>
                  )}
                </div>
                {activeTab === "header" ? (
                  <Button onClick={saveHeaderOrder} disabled={headerSaving} icon="check" className="shrink-0">
                    {headerSaving ? "Saving Order..." : "Save Header Order"}
                  </Button>
                ) : (
                  <Button onClick={saveFooterChanges} disabled={footerSaving} icon="check" className="shrink-0">
                    {footerSaving ? "Saving Footer..." : "Save Footer Menu"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL 1: CREATE / EDIT HEADER LINK ───────────────────────── */}
      {showHeaderModal && (
        <Modal
          size="lg"
          icon={editingHeaderItem ? "edit" : "plus"}
          title={editingHeaderItem ? `Edit Header Link: ${editingHeaderItem.title}` : "Add Header Menu Link"}
          subtitle="Add custom links or pages to your website main top navigation header."
          onClose={() => setShowHeaderModal(false)}
        >
          <form onSubmit={handleHeaderFormSubmit} className="space-y-5">
            {errorMsg && <Notice tone="red">{errorMsg}</Notice>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Menu Title *</label>
                <input
                  required
                  type="text"
                  value={headerForm.title}
                  onChange={(e) => setHeaderForm((prev) => ({ ...prev, title: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. Special Offers"
                />
              </div>

              <div>
                <label className={labelClass}>URL / Href *</label>
                <input
                  required
                  type="text"
                  value={headerForm.url}
                  onChange={(e) => setHeaderForm((prev) => ({ ...prev, url: e.target.value }))}
                  className={cx(inputClass, "font-mono")}
                  placeholder="e.g. /browsedesigns or https://example.com"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#dbeefb] bg-[#f0f8fd]/60 p-4 sm:p-5 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#2884b8] shadow-xs">
                  <Icon name="grid" className="w-3.5 h-3.5" />
                </span>
                <p className="text-sm font-semibold text-zinc-900">Hover menu</p>
              </div>

              <div>
                <label className={labelClass}>Category for the hover menu</label>
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
                  className={inputClass}
                >
                  <option value="">No category — plain link</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                      {category.variations?.length ? ` · ${category.variations.length} variation groups` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Hovering this menu item opens a panel. Each variation group on the category becomes a column, and each option becomes a link.
                </p>
              </div>

              {headerForm.categoryId && (
                <div className="flex items-start gap-2 rounded-xl border border-[#dbeefb] bg-white px-3.5 py-2.5 text-xs text-[#1b5b80]">
                  <Icon name="layers" className="mt-px w-3.5 h-3.5 shrink-0" />
                  <span>
                    {(selectedCategory?.variations || []).length === 0
                      ? "This category has no variations yet. Add them on the category, or add extra columns below."
                      : selectedCategory?.variations
                          ?.map((variation) => variation.name)
                          .filter(Boolean)
                          .join(" · ")}
                  </span>
                </div>
              )}

              {/* Side feature card */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Side card</p>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
                  <div className="grid gap-3 sm:grid-cols-2 content-start">
                    <input
                      type="text"
                      value={headerForm.feature.title}
                      onChange={(e) => setHeaderForm((prev) => ({ ...prev, feature: { ...prev.feature, title: e.target.value } }))}
                      placeholder="Side card title"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={headerForm.feature.linkLabel}
                      onChange={(e) => setHeaderForm((prev) => ({ ...prev, feature: { ...prev.feature, linkLabel: e.target.value } }))}
                      placeholder="Side card link label"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={headerForm.feature.url}
                      onChange={(e) => setHeaderForm((prev) => ({ ...prev, feature: { ...prev.feature, url: e.target.value } }))}
                      placeholder="Side card link"
                      className={cx(inputClass, "font-mono sm:col-span-2")}
                    />
                    <input
                      type="text"
                      value={headerForm.feature.text}
                      onChange={(e) => setHeaderForm((prev) => ({ ...prev, feature: { ...prev.feature, text: e.target.value } }))}
                      placeholder="Short caption"
                      className={cx(inputClass, "sm:col-span-2")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className={cx(
                        "group relative flex aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border transition-all",
                        headerForm.feature.image ? "border-zinc-200 bg-white" : "border-2 border-dashed border-[#b8e0f6] bg-white hover:border-[#329AD4]"
                      )}
                    >
                      {headerForm.feature.image ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mediaSrc(headerForm.feature.image)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          <span
                            className={cx(
                              "absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-zinc-900/45 text-xs font-semibold text-white transition-opacity",
                              imageUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                          >
                            <Icon name="upload" className="w-5 h-5" />
                            {imageUploading ? "Uploading..." : "Replace image"}
                          </span>
                        </>
                      ) : (
                        <span className="flex flex-col items-center gap-2 text-xs font-semibold text-[#2884b8]">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF5FB]">
                            {imageUploading ? <Spinner className="h-4 w-4" /> : <Icon name="upload" className="w-4 h-4" />}
                          </span>
                          {imageUploading ? "Uploading..." : "Upload image"}
                        </span>
                      )}
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
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        <Icon name="trash" className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Extra columns */}
              <div className="space-y-3">
                {headerForm.columns.length > 0 && <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Extra columns</p>}
                {headerForm.columns.map((column, columnIndex) => (
                  <div key={columnIndex} className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
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
                        className={cx(inputClass, "flex-1 font-semibold")}
                      />
                      <IconButton
                        icon="trash"
                        label="Remove"
                        tone="danger"
                        onClick={() => setHeaderForm((prev) => ({ ...prev, columns: prev.columns.filter((_, index) => index !== columnIndex) }))}
                      />
                    </div>
                    <div className="space-y-2 border-l-2 border-[#dbeefb] pl-3">
                      {column.links.map((link, linkIndex) => (
                        <div key={linkIndex} className="flex items-center gap-2">
                          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 min-w-0">
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
                              className={inputClass}
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
                              className={cx(inputClass, "font-mono")}
                            />
                          </div>
                          <IconButton
                            icon="close"
                            label="Remove link"
                            tone="danger"
                            onClick={() =>
                              setHeaderForm((prev) => ({
                                ...prev,
                                columns: prev.columns.map((item, index) =>
                                  index === columnIndex ? { ...item, links: item.links.filter((_, rowIndex) => rowIndex !== linkIndex) } : item
                                ),
                              }))
                            }
                          />
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
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#2884b8] hover:text-[#1b5b80] cursor-pointer"
                      >
                        <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.2} />
                        Add link
                      </button>
                    </div>
                  </div>
                ))}
                <DashedAddButton
                  size="sm"
                  onClick={() => setHeaderForm((prev) => ({ ...prev, columns: [...prev.columns, { title: "", links: [{ title: "", url: "" }] }] }))}
                >
                  Add extra column
                </DashedAddButton>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <CheckCard
                checked={headerForm.openInNewTab}
                onChange={(checked) => setHeaderForm((prev) => ({ ...prev, openInNewTab: checked }))}
                label="Open link in a new tab (_blank)"
              />
              <CheckCard
                checked={headerForm.loginOnly}
                onChange={(checked) => setHeaderForm((prev) => ({ ...prev, loginOnly: checked }))}
                label="Show only when the customer is logged in"
              />
              <CheckCard
                checked={headerForm.isActive}
                onChange={(checked) => setHeaderForm((prev) => ({ ...prev, isActive: checked }))}
                label="Visible on website header"
              />
            </div>

            <ModalActions onCancel={() => setShowHeaderModal(false)}>
              <Button type="submit" disabled={headerModalSaving} icon={headerModalSaving ? undefined : "check"}>
                {headerModalSaving ? "Saving..." : editingHeaderItem ? "Update Link" : "Create Link"}
              </Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* ── MODAL 2: CREATE / EDIT FOOTER COLUMN ─────────────────────── */}
      {showColModal && (
        <Modal
          icon={editingCol ? "edit" : "layers"}
          title={editingCol ? `Edit Column: ${editingCol.title}` : "Add Footer Column"}
          subtitle="Specify the header title for this footer column section."
          onClose={() => setShowColModal(false)}
        >
          <form onSubmit={handleColFormSubmit} className="space-y-5">
            {errorMsg && <Notice tone="red">{errorMsg}</Notice>}

            <div>
              <label className={labelClass}>Column Title *</label>
              <input
                required
                type="text"
                value={colForm.title}
                onChange={(e) => setColForm((prev) => ({ ...prev, title: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Quick Links, Help & Support"
              />
            </div>

            <CheckCard
              checked={colForm.isActive}
              onChange={(checked) => setColForm((prev) => ({ ...prev, isActive: checked }))}
              label="Column Visible on Website Footer"
            />

            <ModalActions onCancel={() => setShowColModal(false)}>
              <Button type="submit" disabled={colModalSaving} icon={colModalSaving ? undefined : "check"}>
                {colModalSaving ? "Saving..." : editingCol ? "Update Column" : "Create Column"}
              </Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* ── MODAL 3: CREATE / EDIT FOOTER LINK IN COLUMN ─────────────── */}
      {showLinkModal && (
        <Modal
          icon={editingLinkIndex !== null ? "edit" : "plus"}
          title={editingLinkIndex !== null ? "Edit Footer Link" : "Add Link to Column"}
          subtitle="Set label and target URL for this link."
          onClose={() => setShowLinkModal(false)}
        >
          <form onSubmit={handleLinkFormSubmit} className="space-y-5">
            {errorMsg && <Notice tone="red">{errorMsg}</Notice>}

            <div>
              <label className={labelClass}>Link Title / Label *</label>
              <input
                required
                type="text"
                value={linkForm.title}
                onChange={(e) => setLinkForm((prev) => ({ ...prev, title: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Terms of Service, Contact Us"
              />
            </div>

            <div>
              <label className={labelClass}>URL / Href *</label>
              <input
                required
                type="text"
                value={linkForm.url}
                onChange={(e) => setLinkForm((prev) => ({ ...prev, url: e.target.value }))}
                className={cx(inputClass, "font-mono")}
                placeholder="e.g. /contact or https://..."
              />
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <CheckCard
                checked={linkForm.openInNewTab}
                onChange={(checked) => setLinkForm((prev) => ({ ...prev, openInNewTab: checked }))}
                label="Open link in a new tab (_blank)"
              />
              <CheckCard
                checked={linkForm.isActive}
                onChange={(checked) => setLinkForm((prev) => ({ ...prev, isActive: checked }))}
                label="Link Visible"
              />
            </div>

            <ModalActions onCancel={() => setShowLinkModal(false)}>
              <Button type="submit" icon="check">
                {editingLinkIndex !== null ? "Update Link" : "Add Link"}
              </Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ── Local presentational helpers ── */

function SectionBar({
  icon,
  title,
  subtitle,
  action,
  borderless,
}: {
  icon: IconName;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  borderless?: boolean;
}) {
  return (
    <div className={cx("flex flex-col gap-3 px-5 sm:px-6 py-4 sm:flex-row sm:items-center sm:justify-between", !borderless && "border-b border-zinc-100")}>
      <div className="flex items-start gap-3 min-w-0">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
          <Icon name={icon} className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function GripIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

function MoveButtons({
  onUp,
  onDown,
  upDisabled,
  downDisabled,
  upTitle,
  downTitle,
}: {
  onUp: () => void;
  onDown: () => void;
  upDisabled: boolean;
  downDisabled: boolean;
  upTitle: string;
  downTitle: string;
}) {
  const btn = "flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white hover:text-[#2884b8] hover:shadow-xs disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none cursor-pointer disabled:cursor-not-allowed";
  return (
    <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
      <button type="button" onClick={onUp} disabled={upDisabled} className={btn} title={upTitle} aria-label={upTitle}>
        <Icon name="chevronLeft" className="w-3.5 h-3.5 rotate-90" strokeWidth={2.4} />
      </button>
      <button type="button" onClick={onDown} disabled={downDisabled} className={btn} title={downTitle} aria-label={downTitle}>
        <Icon name="chevronRight" className="w-3.5 h-3.5 rotate-90" strokeWidth={2.4} />
      </button>
    </div>
  );
}

function TogglePill({ on, onTone, onClick, children }: { on: boolean; onTone: "green" | "brand"; onClick: () => void; children: ReactNode }) {
  const onCls =
    onTone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100"
      : "bg-[#EAF5FB] text-[#2884b8] ring-[#329AD4]/25 hover:bg-[#dbeefb]";
  const dot = on ? (onTone === "green" ? "bg-emerald-500" : "bg-[#329AD4]") : "bg-zinc-400";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset transition-colors cursor-pointer",
        on ? onCls : "bg-zinc-100 text-zinc-500 ring-zinc-500/15 hover:bg-zinc-200"
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", dot)} />
      {children}
    </button>
  );
}

function DashedAddButton({ onClick, children, size = "md" }: { onClick: () => void; children: ReactNode; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#b8e0f6] bg-[#f0f8fd]/50 font-semibold text-[#2884b8] transition-colors hover:border-[#329AD4] hover:bg-[#EAF5FB] cursor-pointer",
        size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
      )}
    >
      <Icon name="plus" className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={2.2} />
      {children}
    </button>
  );
}

function CheckCard({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label
      className={cx(
        "flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer select-none transition-colors",
        checked ? "border-[#b8e0f6] bg-[#f0f8fd]" : "border-zinc-200 hover:border-[#b8e0f6]"
      )}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 shrink-0 rounded accent-[#329AD4]" />
      <span className="text-sm font-medium text-zinc-700">{label}</span>
    </label>
  );
}

function Modal({
  icon,
  title,
  subtitle,
  onClose,
  size = "md",
  children,
}: {
  icon: IconName;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4">
      <div
        className={cx(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-900/5 animate-in fade-in zoom-in-95 duration-200",
          size === "lg" ? "max-w-3xl" : "max-w-md"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#55b2e7] to-[#2884b8] text-white shadow-md shadow-[#329AD4]/25">
              <Icon name={icon} className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-zinc-900">{title}</h2>
              {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
            </div>
          </div>
          <IconButton icon="close" label="Close" onClick={onClose} className="shrink-0" />
        </div>
        <div className="overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, children }: { onCancel: () => void; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      {children}
    </div>
  );
}
