"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

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
        <div style="background: linear-[#e74b2d]; color: white; padding: 40px; border-radius: 16px; margin-bottom: 24px;">
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
        <div style="background: #fbfaf7; border: 1px solid #e2e8f0; padding: 24px; border-radius: 16px; margin-top: 24px;">
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

  return (
    <div className="space-y-6 max-w-7xl pb-16">
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

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">Custom Pages (CMS)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-base font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              WordPress Style
            </span>
          </div>
          <p className="text-zinc-500 text-base mt-1">
            Create custom landing pages, policy documents, and promotional content pages for your website.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/header-menu"
            className="px-3.5 py-2 text-base font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all shadow-xs"
          >
            ≡ Header Menu Manager
          </Link>

          <button
            onClick={openCreateDrawer}
            className="flex items-center gap-2 px-4 py-2 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#e74b2d]/20 cursor-pointer"
          >
            <span className="text-base font-black">+</span> Create Custom Page
          </button>
        </div>
      </div>

      {/* Page List Table Card */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-sky-200 border-t-[#e74b2d] rounded-full animate-spin mx-auto" />
            <p className="text-base text-zinc-400">Loading custom pages...</p>
          </div>
        ) : pages.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-zinc-500 text-base font-semibold">No custom pages created yet.</p>
            <button
              onClick={openCreateDrawer}
              className="px-4 py-2 bg-[#e74b2d] text-white text-base font-bold rounded-xl hover:bg-[#c93e23] transition-all cursor-pointer"
            >
              + Create First Page
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base text-zinc-600">
              <thead className="bg-[#fbfaf7] border-b border-zinc-100 font-bold text-zinc-700 uppercase tracking-wider text-base">
                <tr>
                  <th className="px-6 py-4">Page Title</th>
                  <th className="px-6 py-4">URL Slug</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Updated</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pages.map((pageItem) => (
                  <tr key={pageItem._id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <Link
                          href={`/pages/${pageItem.slug}`}
                          target="_blank"
                          className="font-bold text-zinc-900 hover:text-[#e74b2d] transition-colors text-base"
                        >
                          {pageItem.title} ↗
                        </Link>
                        {pageItem.metaDescription && (
                          <p className="text-base text-zinc-400 line-clamp-1 max-w-sm">
                            {pageItem.metaDescription}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono text-zinc-500">
                      /pages/{pageItem.slug}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePublished(pageItem._id, pageItem.isPublished)}
                        className={`px-2.5 py-1 rounded-full text-base font-bold border transition-all cursor-pointer ${
                          pageItem.isPublished
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        {pageItem.isPublished ? "Published" : "Draft"}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-zinc-400">
                      {new Date(pageItem.updatedAt || pageItem.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 w-max">
                        {/* Shortcut to add to Header Menu */}
                        <button
                          onClick={() => handleAddToHeaderMenu(pageItem.title, pageItem.slug, pageItem._id)}
                          disabled={addingToMenu === pageItem._id}
                          className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#e74b2d] text-base font-bold transition-all border border-sky-200 cursor-pointer disabled:opacity-50"
                          title="Add shortcut to Header Navigation Bar"
                        >
                          {addingToMenu === pageItem._id ? "Adding..." : "+ Header Menu"}
                        </button>

                        {/* Edit with Full-Screen Elementor Builder */}
                        <Link
                          href={`/admin/pages/builder/${pageItem._id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-[#e74b2d] hover:bg-[#c93e23] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 text-base"
                          title="Open Full-Screen Elementor Visual Drag & Drop Builder"
                        >
                          <span>🎨 Edit in Builder</span>
                        </Link>

                        <button
                          onClick={() => openEditDrawer(pageItem)}
                          className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-bold transition-all cursor-pointer text-base"
                          title="Page Settings & SEO"
                        >
                          ⚙️
                        </button>

                        <button
                          onClick={() => handleDelete(pageItem._id, pageItem.title)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          title="Delete Page"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── WORDPRESS-STYLE PAGE EDITOR MODAL / DRAWER ──────────────── */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-4xl p-6 space-y-5 shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  {editingPage ? `Edit Page: ${editingPage.title}` : "Create New WordPress-style Page"}
                </h2>
                <p className="text-base text-zinc-400">
                  Design your custom page content using formatted HTML or rich blocks.
                </p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
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

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Title & Slug Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">
                    Page Title *
                  </label>
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
                    className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                    placeholder="e.g. Services Overview"
                  />
                </div>

                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">
                    URL Slug * (accessible at /pages/your-slug)
                  </label>
                  <input
                    required
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                    className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base font-mono text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                    placeholder="services-overview"
                  />
                </div>
              </div>

              {/* Navigation Tabs (Visual Preview vs HTML Editor vs SEO Meta) */}
              <div className="border-b border-zinc-200 flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("visual")}
                    className={`px-3.5 py-2 text-base font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === "visual"
                        ? "border-[#e74b2d] text-[#e74b2d]"
                        : "border-transparent text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    👁 Live Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("html")}
                    className={`px-3.5 py-2 text-base font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === "html"
                        ? "border-[#e74b2d] text-[#e74b2d]"
                        : "border-transparent text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    💻 HTML / Content Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("seo")}
                    className={`px-3.5 py-2 text-base font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === "seo"
                        ? "border-[#e74b2d] text-[#e74b2d]"
                        : "border-transparent text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    🔍 SEO & Meta Tags
                  </button>
                </div>

                {/* Quick Block Builder Buttons */}
                <div className="hidden sm:flex items-center gap-1.5 text-base">
                  <span className="text-zinc-400 font-semibold">Insert Block:</span>
                  <button
                    type="button"
                    onClick={() => insertTemplateBlock("hero")}
                    className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-[#e74b2d] rounded-lg font-bold transition-all cursor-pointer"
                  >
                    + Hero Banner
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplateBlock("faq")}
                    className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-[#e74b2d] rounded-lg font-bold transition-all cursor-pointer"
                  >
                    + FAQ Accordion
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplateBlock("contact")}
                    className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-[#e74b2d] rounded-lg font-bold transition-all cursor-pointer"
                  >
                    + Contact Info
                  </button>
                </div>
              </div>

              {/* Tab 1: Visual Live Preview */}
              {activeTab === "visual" && (
                <div className="space-y-2">
                  <span className="text-base text-zinc-400 font-bold uppercase tracking-wider block">
                    Page Live Preview Output
                  </span>
                  <div className="border border-zinc-200 rounded-2xl p-6 min-h-[260px] max-h-[360px] overflow-y-auto bg-white prose prose-zinc max-w-none text-base leading-relaxed">
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
                  <div className="flex items-center justify-between">
                    <span className="text-base text-zinc-400 font-bold uppercase tracking-wider">
                      Page Content (HTML / Rich Text)
                    </span>
                    <span className="text-base text-zinc-400">Supports standard HTML elements</span>
                  </div>
                  <textarea
                    rows={12}
                    value={form.content}
                    onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                    className="w-full bg-[#0f1117] text-sky-300 font-mono text-base rounded-2xl p-4 border border-zinc-800 focus:outline-none focus:border-[#e74b2d] leading-relaxed resize-y"
                    placeholder="<h2>Page Heading</h2><p>Write your page text content here...</p>"
                  />
                </div>
              )}

              {/* Tab 3: SEO Meta Tags */}
              {activeTab === "seo" && (
                <div className="space-y-4 p-4 bg-[#fbfaf7] border border-sky-100 rounded-2xl">
                  <div>
                    <label className="text-base font-bold text-zinc-700 block mb-1">
                      Meta Title (Browser Title)
                    </label>
                    <input
                      type="text"
                      value={form.metaTitle}
                      onChange={(e) => setForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none"
                      placeholder="e.g. Custom Printing Services — Printgraphy"
                    />
                  </div>

                  <div>
                    <label className="text-base font-bold text-zinc-700 block mb-1">
                      Meta Description (Search Engine Snippet)
                    </label>
                    <textarea
                      rows={3}
                      value={form.metaDescription}
                      onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none resize-none"
                      placeholder="Brief 1-2 sentence description for search engines..."
                    />
                  </div>
                </div>
              )}

              {/* Publishing & Header Menu Options */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-100">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                      className="rounded accent-[#e74b2d]"
                    />
                    <span className="text-base font-bold text-zinc-800">Publish immediately</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.addToHeaderMenu}
                      onChange={(e) => setForm((prev) => ({ ...prev, addToHeaderMenu: e.target.checked }))}
                      className="rounded accent-[#e74b2d]"
                    />
                    <span className="text-base font-bold text-zinc-800">
                      Automatically add link to Header Navigation Menu
                    </span>
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="flex-1 py-2.5 text-base text-zinc-600 font-bold border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60"
                >
                  {saving ? "Saving Page..." : editingPage ? "Update Custom Page" : "Publish Custom Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
