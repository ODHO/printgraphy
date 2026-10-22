"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Icon,
  IconButton,
  LoadingState,
  Notice,
  PageHeader,
  Tabs,
  Toolbar,
  buttonClass,
  cx,
  inputClass,
  labelClass,
  table,
} from "@/components/admin/ui";

interface PageItem {
  _id: string;
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form & Drawer / Modal state
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingPage, setEditingPage] = useState<PageItem | null>(null);
  const [activeTab, setActiveTab] = useState<"visual" | "html" | "seo">("visual");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    metaTitle: "",
    metaDescription: "",
    isPublished: true,
    addToHeaderMenu: false,
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [addingToMenu, setAddingToMenu] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pages");
      const data = await res.json();
      if (data.success && Array.isArray(data.pages)) {
        setPages(data.pages);
      }
    } catch (err) {
      console.error("Failed to load CMS pages:", err);
      showToast("Failed to load CMS pages", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const openCreateDrawer = () => {
    setEditingPage(null);
    setForm({
      title: "",
      slug: "",
      content: "",
      metaTitle: "",
      metaDescription: "",
      isPublished: true,
      addToHeaderMenu: false,
    });
    setActiveTab("visual");
    setErrorMsg("");
    setShowDrawer(true);
  };

  const openEditDrawer = (pageItem: PageItem) => {
    setEditingPage(pageItem);
    setForm({
      title: pageItem.title,
      slug: pageItem.slug,
      content: pageItem.content || "",
      metaTitle: pageItem.metaTitle || "",
      metaDescription: pageItem.metaDescription || "",
      isPublished: pageItem.isPublished ?? true,
      addToHeaderMenu: false,
    });
    setActiveTab("visual");
    setErrorMsg("");
    setShowDrawer(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrorMsg("Page Title is required");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    const payload = {
      ...form,
      slug: form.slug.trim() || generateSlug(form.title),
    };

    try {
      const url = editingPage ? `/api/admin/pages/${editingPage._id}` : "/api/admin/pages";
      const method = editingPage ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      if (!editingPage && data.page?._id) {
        window.location.href = `/admin/pages/builder/${data.page._id}`;
        return;
      }
      showToast("Page updated successfully!");
      setShowDrawer(false);
      fetchPages();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save page.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete page "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setPages((prev) => prev.filter((p) => p._id !== id));
        showToast(`Page "${title}" deleted.`);
      } else {
        showToast(data.message || "Failed to delete page", "error");
      }
    } catch {
      showToast("Error deleting page", "error");
    }
  };

  const handleTogglePublished = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !current }),
      });
      const data = await res.json();
      if (data.success) {
        setPages((prev) =>
          prev.map((p) => (p._id === id ? { ...p, isPublished: !current } : p))
        );
        showToast(`Page ${!current ? "Published" : "Unpublished"}`);
      }
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleAddToHeaderMenu = async (title: string, slug: string, pageId: string) => {
    setAddingToMenu(pageId);
    try {
      const res = await fetch("/api/admin/header-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url: `/pages/${slug}`,
          isActive: true,
          openInNewTab: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Added "/pages/${slug}" to Header Menu!`);
      } else {
        showToast(data.message || "Already exists in Header Menu.", "error");
      }
    } catch {
      showToast("Failed to add link to header menu", "error");
    } finally {
      setAddingToMenu(null);
    }
  };

  const insertTemplateBlock = (type: "faq" | "contact" | "hero") => {
    if (type === "hero") {
      const heroSnippet = `
        <div style="background: linear-[#329AD4]; color: white; padding: 40px; border-radius: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 12px;">Headline Heading Here</h1>
          <p style="font-size: 16px; opacity: 0.9;">Describe your key message or product offering clearly in a few sentences.</p>
        </div>
      `;
      setForm((prev) => ({ ...prev, content: prev.content + "\n" + heroSnippet }));
    } else if (type === "faq") {
      const faqSnippet = `
        <div style="margin-top: 24px;">
          <h3>Frequently Asked Questions</h3>
          <details style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <summary style="font-weight: bold; cursor: pointer;">What is your delivery timeframe?</summary>
            <p style="margin-top: 8px;">Standard delivery takes 3 to 5 business days across nationwide destinations.</p>
          </details>
          <details style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <summary style="font-weight: bold; cursor: pointer;">Can I request a custom sample print?</summary>
            <p style="margin-top: 8px;">Yes, custom proofing samples can be dispatched prior to bulk printing.</p>
          </details>
        </div>
      `;
      setForm((prev) => ({ ...prev, content: prev.content + "\n" + faqSnippet }));
    } else if (type === "contact") {
      const contactSnippet = `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 24px; border-radius: 16px; margin-top: 24px;">
          <h3>Get In Touch</h3>
          <p>Have questions? Reach out to our support team directly:</p>
          <ul>
            <li><strong>Email:</strong> support@printgraphi.com</li>
            <li><strong>Phone:</strong> +1 (800) 555-XPRINT</li>
          </ul>
        </div>
      `;
      setForm((prev) => ({ ...prev, content: prev.content + "\n" + contactSnippet }));
    }
  };

  const publishedCount = pages.filter((p) => p.isPublished).length;

  const renderStatus = (pageItem: PageItem) => (
    <button
      type="button"
      onClick={() => handleTogglePublished(pageItem._id, pageItem.isPublished)}
      className="cursor-pointer rounded-full transition-opacity hover:opacity-80"
      title={pageItem.isPublished ? "Click to unpublish" : "Click to publish"}
    >
      <Badge tone={pageItem.isPublished ? "green" : "amber"} dot>
        {pageItem.isPublished ? "Published" : "Draft"}
      </Badge>
    </button>
  );

  const renderActions = (pageItem: PageItem) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Shortcut to add to Header Menu */}
      <Button
        variant="soft"
        size="sm"
        icon={addingToMenu === pageItem._id ? undefined : "plus"}
        onClick={() => handleAddToHeaderMenu(pageItem.title, pageItem.slug, pageItem._id)}
        disabled={addingToMenu === pageItem._id}
        title="Add shortcut to Header Navigation Bar"
      >
        {addingToMenu === pageItem._id ? "Adding..." : "Header Menu"}
      </Button>

      {/* Edit with Full-Screen Elementor Builder */}
      <Link
        href={`/admin/pages/builder/${pageItem._id}`}
        className={buttonClass("primary", "sm")}
        title="Open Full-Screen Elementor Visual Drag & Drop Builder"
      >
        <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={2.2} />
        Edit in Builder
      </Link>

      <IconButton icon="settings" label="Page Settings & SEO" onClick={() => openEditDrawer(pageItem)} />
      <IconButton icon="trash" label="Delete Page" tone="danger" onClick={() => handleDelete(pageItem._id, pageItem.title)} />
    </div>
  );

  const tabItems: { value: "visual" | "html" | "seo"; label: React.ReactNode }[] = [
    { value: "visual", label: <><Icon name="eye" className="w-3.5 h-3.5" /> Live Preview</> },
    { value: "html", label: <><Icon name="pages" className="w-3.5 h-3.5" /> HTML / Content Editor</> },
    { value: "seo", label: <><Icon name="search" className="w-3.5 h-3.5" /> SEO & Meta Tags</> },
  ];

  return (
    <div className="space-y-6 max-w-7xl pb-16">
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

      {/* Top Header */}
      <PageHeader
        icon="pages"
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            Custom Pages (CMS)
            <Badge tone="brand">WordPress Style</Badge>
          </span>
        }
        description="Create custom landing pages, policy documents, and promotional content pages for your website."
        actions={
          <>
            <ButtonLink href="/admin/header-menu" variant="secondary" icon="menu">
              Header Menu Manager
            </ButtonLink>
            <Button icon="plus" onClick={openCreateDrawer}>
              Create Custom Page
            </Button>
          </>
        }
      />

      {/* Page List Card */}
      <Card className="overflow-hidden">
        <Toolbar>
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
              <Icon name="layers" className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">All pages</h2>
              <p className="text-xs text-zinc-500">Published pages are live at /pages/your-slug</p>
            </div>
          </div>
          {!loading && pages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gray">{pages.length} total</Badge>
              <Badge tone="green" dot>{publishedCount} published</Badge>
              <Badge tone="amber" dot>{pages.length - publishedCount} draft</Badge>
            </div>
          )}
        </Toolbar>

        {loading ? (
          <LoadingState label="Loading custom pages..." />
        ) : pages.length === 0 ? (
          <EmptyState
            icon="pages"
            title="No custom pages created yet."
            description="Build landing pages, policies and promotional content with the visual builder."
            action={
              <Button icon="plus" onClick={openCreateDrawer}>
                Create First Page
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className={cx(table.wrap, "hidden md:block")}>
              <table className={table.table}>
                <thead className={table.thead}>
                  <tr>
                    <th className={table.th}>Page Title</th>
                    <th className={table.th}>URL Slug</th>
                    <th className={table.th}>Status</th>
                    <th className={table.th}>Last Updated</th>
                    <th className={cx(table.th, "text-right")}>Actions</th>
                  </tr>
                </thead>
                <tbody className={table.tbody}>
                  {pages.map((pageItem) => (
                    <tr key={pageItem._id} className={table.tr}>
                      <td className={table.td}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#329AD4]">
                            <Icon name="pages" className="w-4 h-4" />
                          </span>
                          <div className="min-w-0 space-y-0.5">
                            <Link
                              href={`/pages/${pageItem.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 font-semibold text-zinc-900 hover:text-[#2884b8] transition-colors"
                            >
                              {pageItem.title}
                              <Icon name="chevronRight" className="w-3 h-3 -rotate-45 opacity-60" strokeWidth={2.4} />
                            </Link>
                            {pageItem.metaDescription && (
                              <p className="text-xs text-zinc-400 line-clamp-1 max-w-xs">{pageItem.metaDescription}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className={table.td}>
                        <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">/pages/{pageItem.slug}</code>
                      </td>

                      <td className={table.td}>{renderStatus(pageItem)}</td>

                      <td className={cx(table.td, "text-xs whitespace-nowrap")}>
                        {new Date(pageItem.updatedAt || pageItem.createdAt).toLocaleDateString()}
                      </td>

                      <td className={table.td}>
                        <div className="flex justify-end">{renderActions(pageItem)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-zinc-100 md:hidden">
              {pages.map((pageItem) => (
                <div key={pageItem._id} className="space-y-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/pages/${pageItem.slug}`}
                        target="_blank"
                        className="block truncate text-sm font-semibold text-zinc-900 hover:text-[#2884b8]"
                      >
                        {pageItem.title}
                      </Link>
                      <code className="block truncate font-mono text-xs text-zinc-500">/pages/{pageItem.slug}</code>
                    </div>
                    {renderStatus(pageItem)}
                  </div>
                  {pageItem.metaDescription && <p className="text-xs text-zinc-400 line-clamp-2">{pageItem.metaDescription}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400">
                      Updated {new Date(pageItem.updatedAt || pageItem.createdAt).toLocaleDateString()}
                    </span>
                    {renderActions(pageItem)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* ── WORDPRESS-STYLE PAGE EDITOR MODAL / DRAWER ──────────────── */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl ring-1 ring-zinc-900/5 my-6 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#55b2e7] to-[#2884b8] text-white shadow-md shadow-[#329AD4]/25">
                  <Icon name={editingPage ? "edit" : "plus"} className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-zinc-900 truncate">
                    {editingPage ? `Edit Page: ${editingPage.title}` : "Create New WordPress-style Page"}
                  </h2>
                  <p className="text-xs text-zinc-500">Design your custom page content using formatted HTML or rich blocks.</p>
                </div>
              </div>
              <IconButton icon="close" label="Close" onClick={() => setShowDrawer(false)} className="shrink-0" />
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5 p-5 sm:p-6">
              {errorMsg && <Notice tone="red">{errorMsg}</Notice>}

              {/* Title & Slug Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Page Title *</label>
                  <input
                    required
                    type="text"
                    value={form.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        title,
                        slug: prev.slug ? prev.slug : generateSlug(title),
                      }));
                    }}
                    className={inputClass}
                    placeholder="e.g. Services Overview"
                  />
                </div>

                <div>
                  <label className={labelClass}>URL Slug * (accessible at /pages/your-slug)</label>
                  <input
                    required
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                    className={cx(inputClass, "font-mono")}
                    placeholder="services-overview"
                  />
                </div>
              </div>

              {/* Navigation Tabs (Visual Preview vs HTML Editor vs SEO Meta) */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Tabs value={activeTab} onChange={setActiveTab} items={tabItems} />

                {/* Quick Block Builder Buttons */}
                <div className="hidden sm:flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-zinc-400 mr-1">Insert block:</span>
                  <Button variant="soft" size="sm" icon="plus" onClick={() => insertTemplateBlock("hero")}>
                    Hero Banner
                  </Button>
                  <Button variant="soft" size="sm" icon="plus" onClick={() => insertTemplateBlock("faq")}>
                    FAQ Accordion
                  </Button>
                  <Button variant="soft" size="sm" icon="plus" onClick={() => insertTemplateBlock("contact")}>
                    Contact Info
                  </Button>
                </div>
              </div>

              {/* Tab 1: Visual Live Preview */}
              {activeTab === "visual" && (
                <div className="space-y-2">
                  <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wide block">
                    Page Live Preview Output
                  </span>
                  <div className="border border-zinc-200 rounded-2xl p-6 min-h-[260px] max-h-[360px] overflow-y-auto bg-white prose prose-zinc max-w-none text-sm leading-relaxed">
                    {form.content ? (
                      <div dangerouslySetInnerHTML={{ __html: form.content }} />
                    ) : (
                      <p className="text-zinc-400 italic">No content entered yet. Switch to HTML tab to edit.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: HTML / Content Editor */}
              {activeTab === "html" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">
                      Page Content (HTML / Rich Text)
                    </span>
                    <span className="text-xs text-zinc-400">Supports standard HTML elements</span>
                  </div>
                  <textarea
                    rows={12}
                    value={form.content}
                    onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                    className="w-full bg-[#0f1117] text-sky-300 font-mono text-sm rounded-2xl p-4 border border-zinc-800 focus:outline-none focus:border-[#329AD4] focus:ring-4 focus:ring-[#329AD4]/10 leading-relaxed resize-y"
                    placeholder="<h2>Page Heading</h2><p>Write your page text content here...</p>"
                  />
                </div>
              )}

              {/* Tab 3: SEO Meta Tags */}
              {activeTab === "seo" && (
                <div className="space-y-4 rounded-2xl border border-[#dbeefb] bg-[#f0f8fd] p-4 sm:p-5">
                  <div>
                    <label className={labelClass}>Meta Title (Browser Title)</label>
                    <input
                      type="text"
                      value={form.metaTitle}
                      onChange={(e) => setForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
                      className={inputClass}
                      placeholder="e.g. Custom Printing Services — Printgraphy"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Meta Description (Search Engine Snippet)</label>
                    <textarea
                      rows={3}
                      value={form.metaDescription}
                      onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
                      className={cx(inputClass, "resize-none")}
                      placeholder="Brief 1-2 sentence description for search engines..."
                    />
                  </div>
                </div>
              )}

              {/* Publishing & Header Menu Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-zinc-100 pt-5">
                <label className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 cursor-pointer select-none transition-colors hover:border-[#b8e0f6] hover:bg-[#f0f8fd]/60 has-[:checked]:border-[#b8e0f6] has-[:checked]:bg-[#f0f8fd]">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                    className="h-4 w-4 rounded accent-[#329AD4]"
                  />
                  <span className="text-sm font-medium text-zinc-800">Publish immediately</span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 cursor-pointer select-none transition-colors hover:border-[#b8e0f6] hover:bg-[#f0f8fd]/60 has-[:checked]:border-[#b8e0f6] has-[:checked]:bg-[#f0f8fd]">
                  <input
                    type="checkbox"
                    checked={form.addToHeaderMenu}
                    onChange={(e) => setForm((prev) => ({ ...prev, addToHeaderMenu: e.target.checked }))}
                    className="h-4 w-4 rounded accent-[#329AD4]"
                  />
                  <span className="text-sm font-medium text-zinc-800">Automatically add link to Header Navigation Menu</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-1">
                <Button variant="secondary" onClick={() => setShowDrawer(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} icon={saving ? undefined : "check"}>
                  {saving ? "Saving Page..." : editingPage ? "Update Custom Page" : "Publish Custom Page"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
