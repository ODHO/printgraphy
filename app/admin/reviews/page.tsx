"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminReview {
  _id: string;
  productId: string;
  userName: string;
  role?: string;
  rating: number;
  title?: string;
  comment: string;
  isApproved: boolean;
  adminReply?: string;
  createdAt: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState<number | "all">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reviews");
      const data = await res.json();
      if (data.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      }
    } catch {
      setMessage({ text: "Failed to load reviews.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDeleteReview = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the review by "${name}"?`)) return;

    setDeletingId(id);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) => prev.filter((r) => r._id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        setMessage({ text: "Review deleted successfully.", type: "success" });
      } else {
        setMessage({ text: data.message || "Failed to delete review.", type: "error" });
      }
    } catch {
      setMessage({ text: "Error deleting review.", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected review${selectedIds.length === 1 ? "" : "s"}?`)) return;

    setBulkDeleting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) => prev.filter((review) => !selectedIds.includes(review._id)));
        setSelectedIds([]);
        setMessage({ text: `${data.deleted} review${data.deleted === 1 ? "" : "s"} deleted.`, type: "success" });
      } else {
        setMessage({ text: data.message || "Failed to delete reviews.", type: "error" });
      }
    } catch {
      setMessage({ text: "Error deleting reviews.", type: "error" });
    } finally {
      setBulkDeleting(false);
    }
  };

  const saveReply = async (id: string) => {
    setSavingReply(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminReply: replyDraft }),
      });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) => prev.map((review) => review._id === id ? { ...review, adminReply: replyDraft.trim() } : review));
        setReplyingId(null);
        setReplyDraft("");
        setMessage({ text: replyDraft.trim() ? "Reply saved." : "Reply removed.", type: "success" });
      } else {
        setMessage({ text: data.message || "Failed to save reply.", type: "error" });
      }
    } catch {
      setMessage({ text: "Error saving reply.", type: "error" });
    } finally {
      setSavingReply(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.comment && r.comment.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.title && r.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.productId && r.productId.toString().toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRating = filterRating === "all" || r.rating === Number(filterRating);

    return matchesSearch && matchesRating;
  });

  const allFilteredSelected = filteredReviews.length > 0 && filteredReviews.every((review) => selectedIds.includes(review._id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const visible = new Set(filteredReviews.map((review) => review._id));
      setSelectedIds((prev) => prev.filter((id) => !visible.has(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...filteredReviews.map((review) => review._id)])]);
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">User Reviews Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-base font-bold bg-[#e74b2d]/10 text-[#e74b2d]">
              {reviews.length} Total Reviews
            </span>
          </div>
          <p className="text-base text-zinc-500 mt-1">
            Monitor, inspect, and delete user-submitted reviews across all categories & products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-base font-bold rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-60"
            >
              {bulkDeleting ? "Deleting..." : `Delete selected (${selectedIds.length})`}
            </button>
          )}
          <button
            onClick={fetchReviews}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-base font-bold rounded-xl transition-all cursor-pointer shrink-0"
          >
            Refresh List
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl text-base font-bold ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search by customer name, comment, title, or product ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 text-base font-medium focus:outline-none focus:border-[#e74b2d]"
          />
        </div>

        <select
          value={filterRating}
          onChange={(e) => setFilterRating(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="px-4 py-2.5 rounded-xl border border-zinc-300 text-base font-bold text-zinc-700 bg-white focus:outline-none focus:border-[#e74b2d] w-full sm:w-auto"
        >
          <option value="all">All Star Ratings</option>
          <option value="5">5 Stars Only</option>
          <option value="4">4 Stars Only</option>
          <option value="3">3 Stars Only</option>
          <option value="2">2 Stars Only</option>
          <option value="1">1 Star Only</option>
        </select>
      </div>

      {/* Reviews Table / Cards */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
          <div className="w-8 h-8 border-2 border-[#e74b2d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-base font-bold text-zinc-600">Loading user reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
          <p className="text-base font-bold text-zinc-800">No user reviews found.</p>
          <p className="text-base text-zinc-500 mt-1">
            {searchQuery || filterRating !== "all"
              ? "Try adjusting your search query or rating filter."
              : "When customers submit reviews on product detail pages, they will appear here."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-extrabold uppercase tracking-wider">
                  <th className="p-4 w-10">
                    <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} aria-label="Select all reviews" className="cursor-pointer" />
                  </th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Product Target</th>
                  <th className="p-4">Review Content</th>
                  <th className="p-4">Submitted</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {filteredReviews.map((r) => (
                  <tr key={r._id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="p-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r._id)}
                        onChange={() => toggleOne(r._id)}
                        aria-label={`Select review by ${r.userName}`}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-bold text-zinc-900">{r.userName}</div>
                      <div className="text-base text-zinc-400">{r.role || "Customer"}</div>
                    </td>

                    <td className="p-4 align-top">
                      <div className="flex items-center gap-1 text-yellow-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={s <= r.rating ? "text-yellow-400" : "text-zinc-200"}>
                            ★
                          </span>
                        ))}
                      </div>
                      <div className="text-base font-bold text-zinc-600 mt-0.5">{r.rating} / 5</div>
                    </td>

                    <td className="p-4 align-top">
                      <Link
                        href={`/product/${r.productId}`}
                        target="_blank"
                        className="font-bold text-[#e74b2d] hover:underline truncate max-w-[160px] block"
                        title={r.productId}
                      >
                        {r.productId}
                      </Link>
                    </td>

                    <td className="p-4 align-top max-w-xs sm:max-w-md">
                      {r.title && <div className="font-bold text-zinc-900 mb-0.5">{r.title}</div>}
                      <p className="text-zinc-600 leading-relaxed line-clamp-3">{r.comment}</p>
                      {r.adminReply && replyingId !== r._id && (
                        <p className="mt-2 rounded-lg bg-sky-50 px-2 py-1.5 text-base text-sky-900">
                          <span className="font-bold">Reply: </span>{r.adminReply}
                        </p>
                      )}
                      {replyingId === r._id && (
                        <div className="mt-2 space-y-2">
                          <textarea
                            rows={3}
                            value={replyDraft}
                            onChange={(e) => setReplyDraft(e.target.value)}
                            className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-base focus:outline-none focus:border-[#e74b2d]"
                            placeholder="Write a reply to this review"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveReply(r._id)}
                              disabled={savingReply}
                              className="px-3 py-1.5 bg-[#e74b2d] text-white text-base font-bold rounded-lg cursor-pointer disabled:opacity-60"
                            >
                              {savingReply ? "Saving..." : "Save reply"}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setReplyingId(null); setReplyDraft(""); }}
                              className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-base font-bold rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="p-4 align-top whitespace-nowrap text-zinc-400 text-base">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    <td className="p-4 align-top text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setReplyingId(r._id);
                            setReplyDraft(r.adminReply || "");
                          }}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-[#e74b2d] text-[#e74b2d] hover:text-white border border-sky-200 text-base font-bold rounded-lg transition-all cursor-pointer"
                        >
                          {r.adminReply ? "Edit reply" : "Reply"}
                        </button>
                        <button
                          onClick={() => handleDeleteReview(r._id, r.userName)}
                          disabled={deletingId === r._id}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 text-base font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                        >
                          {deletingId === r._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
