"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, Button, Card, cx, EmptyState, Icon, inputClass, Notice, PageHeader, SearchInput, SkeletonRows, StatTile, table, Tabs, Toolbar } from "@/components/admin/ui";

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

  const averageRating = reviews.length ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0;
  const repliedCount = reviews.filter((r) => r.adminReply).length;
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
  const checkboxClass = "h-4 w-4 cursor-pointer rounded border-zinc-300 accent-[#329AD4]";

  return (
    <div className="space-y-6">
      <PageHeader
        icon="star"
        title="User Reviews Management"
        description="Monitor, inspect, and delete user-submitted reviews across all categories & products."
        actions={
          <>
            {selectedIds.length > 0 && (
              <Button variant="danger" icon="trash" onClick={handleBulkDelete} disabled={bulkDeleting} className="!bg-rose-600 !text-white !border-rose-600 hover:!bg-rose-700">
                {bulkDeleting ? "Deleting..." : `Delete selected (${selectedIds.length})`}
              </Button>
            )}
            <Button variant="secondary" icon="refresh" onClick={fetchReviews}>
              Refresh List
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Reviews" value={<span className="tabular-nums">{reviews.length}</span>} icon="messages" tone="brand" loading={loading} />
        <StatTile
          label="Average rating"
          value={
            <span className="flex items-center gap-2 tabular-nums">
              {averageRating.toFixed(1)}
              <Icon name="star" className="w-6 h-6 text-amber-400 fill-amber-400" />
            </span>
          }
          icon="star"
          tone="amber"
          loading={loading}
        />
        <StatTile label="5-star reviews" value={<span className="tabular-nums">{fiveStarCount}</span>} icon="sparkle" tone="green" loading={loading} />
        <StatTile label="Replied" value={<span className="tabular-nums">{repliedCount}</span>} icon="mail" tone="violet" loading={loading} />
      </div>

      {/* Alert Messages */}
      {message && <Notice tone={message.type === "success" ? "green" : "red"}>{message.text}</Notice>}

      <Card className="overflow-hidden">
        {/* Filter & Search Bar */}
        <Toolbar>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by customer name, comment, title, or product ID..."
            className="sm:max-w-md"
          />
          <Tabs
            value={String(filterRating)}
            onChange={(value) => setFilterRating(value === "all" ? "all" : Number(value))}
            items={[
              { value: "all", label: "All Star Ratings" },
              ...[5, 4, 3, 2, 1].map((n) => ({
                value: String(n),
                label: (
                  <span className="inline-flex items-center gap-0.5" title={`${n} ${n === 1 ? "Star" : "Stars"} Only`}>
                    {n}
                    <Icon name="star" className="w-3 h-3 text-amber-400 fill-amber-400" />
                  </span>
                ),
              })),
            ]}
          />
        </Toolbar>

        {/* Reviews Table / Cards */}
        {loading ? (
          <SkeletonRows rows={6} />
        ) : filteredReviews.length === 0 ? (
          <EmptyState
            icon="star"
            title="No user reviews found."
            description={
              searchQuery || filterRating !== "all"
                ? "Try adjusting your search query or rating filter."
                : "When customers submit reviews on product detail pages, they will appear here."
            }
          />
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.thead}>
                <tr>
                  <th className={cx(table.th, "w-10 pr-0")}>
                    <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} aria-label="Select all reviews" className={checkboxClass} />
                  </th>
                  <th className={table.th}>Customer</th>
                  <th className={table.th}>Rating</th>
                  <th className={table.th}>Product Target</th>
                  <th className={table.th}>Review Content</th>
                  <th className={table.th}>Submitted</th>
                  <th className={cx(table.th, "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody className={table.tbody}>
                {filteredReviews.map((r) => {
                  const isSelected = selectedIds.includes(r._id);
                  return (
                    <tr key={r._id} className={cx(table.tr, isSelected && "bg-[#f0f8fd]")}>
                      <td className={cx(table.td, "align-top pr-0")}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(r._id)}
                          aria-label={`Select review by ${r.userName}`}
                          className={checkboxClass}
                        />
                      </td>
                      <td className={cx(table.td, "align-top")}>
                        <div className="flex items-center gap-3 min-w-[10rem]">
                          <Avatar name={r.userName || "?"} size="sm" />
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-900 truncate">{r.userName}</div>
                            <div className="text-xs text-zinc-500 capitalize">{r.role || "Customer"}</div>
                          </div>
                        </div>
                      </td>

                      <td className={cx(table.td, "align-top whitespace-nowrap")}>
                        <Stars rating={r.rating} />
                        <div className="mt-1 text-xs font-medium text-zinc-500 tabular-nums">{r.rating} / 5</div>
                      </td>

                      <td className={cx(table.td, "align-top")}>
                        <Link
                          href={`/product/${r.productId}`}
                          target="_blank"
                          className="inline-flex max-w-[160px] items-center gap-1 rounded-md bg-[#f0f8fd] px-2 py-0.5 font-mono text-xs font-medium text-[#2884b8] hover:bg-[#EAF5FB] hover:text-[#1b5b80]"
                          title={r.productId}
                        >
                          <span className="truncate">{r.productId}</span>
                        </Link>
                      </td>

                      <td className={cx(table.td, "align-top min-w-[16rem] max-w-xs sm:max-w-md")}>
                        {r.title && <div className="font-semibold text-zinc-900 mb-0.5">{r.title}</div>}
                        <p className="text-zinc-600 leading-relaxed line-clamp-3">{r.comment}</p>
                        {r.adminReply && replyingId !== r._id && (
                          <div className="mt-2 rounded-xl border-l-2 border-[#329AD4] bg-[#f0f8fd] px-3 py-2 text-xs text-[#1b5b80]">
                            <span className="font-semibold">Reply: </span>{r.adminReply}
                          </div>
                        )}
                        {replyingId === r._id && (
                          <div className="mt-2 space-y-2">
                            <textarea
                              rows={3}
                              value={replyDraft}
                              onChange={(e) => setReplyDraft(e.target.value)}
                              className={cx(inputClass, "resize-y")}
                              placeholder="Write a reply to this review"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" icon="check" onClick={() => saveReply(r._id)} disabled={savingReply}>
                                {savingReply ? "Saving..." : "Save reply"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setReplyingId(null); setReplyDraft(""); }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className={cx(table.td, "align-top whitespace-nowrap text-xs text-zinc-500")}>
                        {new Date(r.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className={cx(table.td, "align-top text-right whitespace-nowrap")}>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="soft"
                            icon="messages"
                            onClick={() => {
                              setReplyingId(r._id);
                              setReplyDraft(r.adminReply || "");
                            }}
                          >
                            {r.adminReply ? "Edit reply" : "Reply"}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            icon="trash"
                            onClick={() => handleDeleteReview(r._id, r.userName)}
                            disabled={deletingId === r._id}
                          >
                            {deletingId === r._id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={cx("h-4 w-4", s <= rating ? "text-amber-400" : "text-zinc-200")} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 00.95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 00-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 00-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 00-.36-1.12L2.98 8.72c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 00.95-.69l1.07-3.29z" />
        </svg>
      ))}
    </div>
  );
}
