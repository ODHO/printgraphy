"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export interface ReviewItem {
  _id?: string;
  userName: string;
  role?: string;
  rating: number;
  title?: string;
  comment: string;
  adminReply?: string;
  createdAt?: string | Date;
}

interface ProductReviewsSectionProps {
  productId?: string;
  productName?: string;
}

export default function ProductReviewsSection({ productId, productName }: ProductReviewsSectionProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<"newest" | "highest" | "lowest">("newest");

  // Auth & Duplicate Review States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

  // Form Modal States
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const targetProductId = productId || "business-cards";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user.firstName) {
            setName(`${data.user.firstName} ${data.user.lastName || ""}`.trim());
          }
        }
      })
      .catch(() => {});
  }, []);

  const fetchReviews = () => {
    setLoading(true);
    fetch(`/api/reviews?productId=${encodeURIComponent(targetProductId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
        if (data.hasUserReviewed) {
          setHasUserReviewed(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, [targetProductId]);

  const handleOpenWriteModal = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!currentUser) {
      setErrorMsg("You must be signed in to post a review. Guests cannot post reviews.");
    } else if (hasUserReviewed) {
      setErrorMsg("You have already submitted a review for this product. Only one review per user is allowed.");
    }
    setIsWriteModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setErrorMsg("You must be signed in to post a review. Guests cannot post reviews.");
      return;
    }

    if (hasUserReviewed) {
      setErrorMsg("You have already submitted a review for this product. Only one review per user is allowed.");
      return;
    }

    if (!comment.trim()) {
      setErrorMsg("Please enter a review comment.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: targetProductId,
          name: name.trim() || "Verified Buyer",
          role: role.trim() || "Customer",
          rating,
          title: title.trim(),
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.review) {
        setSuccessMsg("Thank you! Your review has been published.");
        setReviews((prev) => [data.review, ...prev]);
        setHasUserReviewed(true);
        setTimeout(() => {
          setIsWriteModalOpen(false);
          setSuccessMsg(null);
          setName("");
          setRole("");
          setRating(5);
          setTitle("");
          setComment("");
        }, 1500);
      } else {
        setErrorMsg(data.message || "Failed to submit review.");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Compute statistics dynamically
  const totalReviews = reviews.length;
  const avgScore = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / totalReviews).toFixed(1)
    : "0.0";

  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(r.rating) === star).length;
    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { stars: star, count, pct };
  });

  // Sort reviews
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOption === "highest") return b.rating - a.rating;
    if (sortOption === "lowest") return a.rating - b.rating;
    const dateA = new Date(a.createdAt || Date.now()).getTime();
    const dateB = new Date(b.createdAt || Date.now()).getTime();
    return dateB - dateA;
  });

  const getInitials = (nameStr: string) => {
    if (!nameStr) return "U";
    const parts = nameStr.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const formatDate = (rawDate?: string | Date) => {
    if (!rawDate) return "Recently";
    try {
      const d = new Date(rawDate);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Recently";
    }
  };

  return (
    <section id="product-reviews-section" className="pt-6 pb-12 font-sans space-y-8 scroll-mt-20">
      {/* Top Controls Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
            Customer Reviews {productName ? `for ${productName}` : ""}
          </h2>
          <p className="text-base text-zinc-500 mt-0.5">
            Real feedback from verified customers who bought & customized this card.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              aria-label="Sort reviews"
              className="appearance-none bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 pr-8 text-base font-bold text-zinc-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#e74b2d]/30"
            >
              <option value="newest">Sort by newest review</option>
              <option value="highest">Sort by highest rating</option>
              <option value="lowest">Sort by lowest rating</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Write a Review Button */}
          <button
            onClick={handleOpenWriteModal}
            className="px-6 py-2.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl shadow-sm transition-all duration-200 cursor-pointer shrink-0"
          >
            ★ Write a Review
          </button>
        </div>
      </div>

      {/* Guest Sign-In Notice Banner */}
      {!currentUser && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200/90 text-sky-950 text-base font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-lg leading-none">🔒</span>
            <span>
              <strong>Registered Customers Only:</strong> You must be signed in to submit a review. Guests cannot post reviews.
            </span>
          </div>
          <Link
            href="/auth?tab=signin"
            className="px-3.5 py-1.5 rounded-xl text-base font-extrabold bg-[#e74b2d] text-white hover:bg-[#c93e23] transition-all shadow-xs shrink-0 self-start sm:self-auto"
          >
            Sign In to Review →
          </Link>
        </div>
      )}

      {/* Already Reviewed Banner */}
      {currentUser && hasUserReviewed && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 text-base font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-lg leading-none">⚠️</span>
            <span>
              <strong>Review Status:</strong> You have already submitted a review for this product. Only one review per user is allowed.
            </span>
          </div>
          <span className="px-3 py-1 rounded-full text-base font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 shrink-0 self-start sm:self-auto">
            1 Review Limit
          </span>
        </div>
      )}

      {/* Rating Overview & Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-2">
        {/* Left: Overall Score (MD: 4 cols) */}
        <div className="md:col-span-4 space-y-2 bg-gradient-to-br from-zinc-50 to-sky-50/50 p-6 rounded-2xl border border-zinc-200/80">
          <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-400">User Rating Score</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-zinc-900">{avgScore}</span>
            <span className="text-base font-bold text-zinc-400">/ 5.0</span>
          </div>
          <div className="flex items-center gap-1 text-yellow-400 py-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg
                key={s}
                className={`w-5 h-5 ${s <= Math.round(Number(avgScore)) ? "fill-current text-yellow-400" : "text-zinc-200 fill-current"}`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <div className="text-base text-zinc-500 font-medium">Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}</div>
        </div>

        {/* Right: Rating Bars (MD: 8 cols) */}
        <div className="md:col-span-8 space-y-2.5 max-w-md">
          {ratingBreakdown.map((row) => (
            <div key={row.stars} className="flex items-center gap-3 text-base">
              <span className="w-14 text-zinc-700 font-bold whitespace-nowrap flex items-center gap-1">
                <span>{row.stars}</span>
                <span className="text-yellow-400">★</span>
              </span>
              <div className="flex-1 h-3 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/60">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <span className="w-12 text-right font-semibold text-zinc-500">
                {row.count} ({row.pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-6 pt-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="p-6 rounded-2xl bg-zinc-100 animate-pulse h-32" />
            ))}
          </div>
        ) : sortedReviews.length === 0 ? (
          <div className="text-center py-10 bg-zinc-50 rounded-2xl border border-zinc-200">
            <p className="text-base font-bold text-zinc-700">No reviews written yet.</p>
            <p className="text-base text-zinc-500 mt-1 mb-4">Be the first to share your experience with this product!</p>
            <button
              onClick={handleOpenWriteModal}
              className="px-5 py-2 bg-[#e74b2d] text-white text-base font-bold rounded-xl shadow"
            >
              Write First Review
            </button>
          </div>
        ) : (
          sortedReviews.map((r, idx) => (
            <div key={r._id || idx} className="pt-6 border-t border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* User Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#e74b2d] to-[#e74b2d] text-white font-extrabold text-base flex items-center justify-center shadow-xs">
                    {getInitials(r.userName)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-zinc-900 text-base">{r.userName}</h4>
                      <span className="px-2 py-0.5 rounded-full text-base font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        ✓ {r.role || "Verified Buyer"}
                      </span>
                    </div>
                    <p className="text-base text-zinc-400 mt-0.5">{formatDate(r.createdAt)}</p>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex items-center gap-1 text-yellow-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      className={`w-4 h-4 ${s <= r.rating ? "fill-current text-yellow-400" : "text-zinc-200 fill-current"}`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>

              {/* Review Content */}
              {r.title && <h5 className="font-extrabold text-zinc-900 text-base">{r.title}</h5>}
              <p className="text-base text-zinc-600 leading-relaxed font-normal">{r.comment}</p>
              {r.adminReply && (
                <div className="rounded-xl bg-sky-50 border border-sky-100 px-3 py-2">
                  <p className="text-base font-bold uppercase tracking-wide text-[#e74b2d]">Printgraphy reply</p>
                  <p className="mt-1 text-base text-zinc-700 leading-relaxed">{r.adminReply}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Write a Review Modal */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 relative animate-in fade-in zoom-in duration-200 border border-zinc-100">
            <button
              onClick={() => setIsWriteModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-700 text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
            >
              ✕
            </button>

            <div>
              <h3 className="text-xl font-black text-zinc-900">Write a Review</h3>
              <p className="text-base text-zinc-500 mt-1">
                Share your opinion and feedback about this product.
              </p>
            </div>

            {!currentUser ? (
              <div className="py-6 px-4 text-center space-y-4 bg-zinc-50/70 rounded-2xl border border-zinc-200/80">
                <div className="w-12 h-12 rounded-full bg-sky-100 text-[#e74b2d] flex items-center justify-center text-xl mx-auto border border-sky-200">
                  🔒
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-zinc-900">Sign In Required to Review</h4>
                  <p className="text-base text-zinc-500 max-w-xs mx-auto leading-relaxed">
                    Only verified registered customers can post reviews. Guests cannot post reviews. Please sign in to leave your feedback.
                  </p>
                </div>
                <Link
                  href="/auth?tab=signin"
                  className="inline-block px-6 py-2.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl shadow transition-all"
                >
                  Sign In to Write a Review →
                </Link>
              </div>
            ) : successMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-base font-bold text-center space-y-1">
                <p className="text-base">🎉</p>
                <p>{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/90 text-red-700 text-base font-bold flex items-start gap-2.5 shadow-2xs">
                    <span className="text-base leading-none">⚠️</span>
                    <span className="leading-relaxed">{errorMsg}</span>
                  </div>
                )}

                {/* Rating Selector */}
                <div>
                  <label className="block text-base font-extrabold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Your Rating *
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                      >
                        <svg
                          className={`w-7 h-7 ${
                            star <= (hoverRating || rating)
                              ? "text-yellow-400 fill-current"
                              : "text-zinc-200 fill-current"
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                    <span className="ml-2 text-base font-bold text-zinc-600">
                      {hoverRating || rating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Name & Role Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-base font-bold text-zinc-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sarah M."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-base font-medium text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-bold text-zinc-700 mb-1">Role / Headline</label>
                    <input
                      type="text"
                      placeholder="e.g. Graphic Designer"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-base font-medium text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                    />
                  </div>
                </div>

                {/* Title Input */}
                <div>
                  <label className="block text-base font-bold text-zinc-700 mb-1">Review Headline</label>
                  <input
                    type="text"
                    placeholder="e.g. Crisp print and great quality!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-base font-medium text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                  />
                </div>

                {/* Comment Textarea */}
                <div>
                  <label className="block text-base font-bold text-zinc-700 mb-1">Detailed Review *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us what you liked about paper weight, finish, design studio, or delivery..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-base font-medium text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWriteModalOpen(false)}
                    className="px-5 py-2.5 text-base font-bold text-zinc-600 hover:text-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl shadow transition-all disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Post Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
