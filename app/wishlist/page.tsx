"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { mediaSrc } from "@/lib/mediaUrl";
import DraftCardPreview from "@/components/DraftCardPreview";

interface ProductWishlistItem {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  unitPrice?: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
}

interface DraftDesignItem {
  _id: string;
  name: string;
  thumbnail?: string;
  designData?: any;
  createdAt: string;
  updatedAt: string;
}

function WishlistContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") === "drafts" ? "drafts" : "wishlist";

  const [activeTab, setActiveTab] = useState<"wishlist" | "drafts">(initialTab);

  // Wishlist State
  const [wishlistItems, setWishlistItems] = useState<ProductWishlistItem[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(true);

  // Drafts State
  const [drafts, setDrafts] = useState<DraftDesignItem[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  // Fetch Wishlist Items from LocalStorage & API
  const loadWishlist = async () => {
    setWishlistLoading(true);
    try {
      const stored = localStorage.getItem("xprints_wishlist");
      const ids: string[] = stored ? JSON.parse(stored) : [];

      if (ids.length === 0) {
        setWishlistItems([]);
        setWishlistLoading(false);
        return;
      }

      const fetchedProducts: ProductWishlistItem[] = [];
      await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
            const data = await res.json();
            if (data.success && data.product) {
              fetchedProducts.push(data.product);
            }
          } catch {}
        })
      );

      setWishlistItems(fetchedProducts);
    } catch {
      setWishlistItems([]);
    } finally {
      setWishlistLoading(false);
    }
  };

  // Fetch Draft Designs from API
  const loadDrafts = async () => {
    setDraftsLoading(true);
    try {
      const res = await fetch("/api/designs");
      const data = await res.json();
      if (data.success && Array.isArray(data.designs)) {
        setDrafts(data.designs);
      }
    } catch {
      setDrafts([]);
    } finally {
      setDraftsLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
    loadDrafts();

    const handleWishlistChange = () => {
      loadWishlist();
    };

    window.addEventListener("wishlistUpdated", handleWishlistChange);
    return () => window.removeEventListener("wishlistUpdated", handleWishlistChange);
  }, []);

  const handleTabChange = (tab: "wishlist" | "drafts") => {
    setActiveTab(tab);
    router.replace(`/wishlist?tab=${tab}`, { scroll: false });
  };

  const handleRemoveWishlist = (id: string) => {
    try {
      const stored = localStorage.getItem("xprints_wishlist");
      let ids: string[] = stored ? JSON.parse(stored) : [];
      ids = ids.filter((itemId) => itemId !== id);
      localStorage.setItem("xprints_wishlist", JSON.stringify(ids));
      setWishlistItems((prev) => prev.filter((item) => item._id !== id && item.slug !== id));
      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch {}
  };

  const handleDeleteDraft = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete draft "${name}"?`)) return;

    setDeletingDraftId(id);
    try {
      const res = await fetch(`/api/designs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDrafts((prev) => prev.filter((d) => d._id !== id));
      }
    } catch {} finally {
      setDeletingDraftId(null);
    }
  };

  const formatDate = (rawDate?: string) => {
    if (!rawDate) return "Recently";
    try {
      return new Date(rawDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header Title */}
      <div className="bg-gradient-to-b from-[#f7f9fc] to-white border-b border-zinc-200/80 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                My Wishlist & Studio Drafts
              </h1>
              <p className="text-base sm:text-base text-zinc-500 mt-1">
                Access your favorited products and saved 2D/3D studio card drafts in one place.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/business-cards"
                className="px-4 py-2.5 bg-white border border-zinc-300 hover:border-zinc-800 text-zinc-800 text-base font-bold rounded-xl shadow-2xs transition-all"
              >
                Browse Catalog
              </Link>
              <Link
                href="/customize"
                className="px-5 py-2.5 bg-[#2196D2] hover:bg-[#1B85BD] text-white text-base font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>+ Start New Design</span>
              </Link>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-3 mt-8 border-b border-zinc-200">
            <button
              onClick={() => handleTabChange("wishlist")}
              className={`flex items-center gap-2 px-5 py-3 text-base sm:text-base font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "wishlist"
                  ? "border-[#2196D2] text-[#2196D2]"
                  : "border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <span>❤️ Wishlist</span>
              <span className={`px-2 py-0.5 rounded-full text-base ${activeTab === "wishlist" ? "bg-[#2196D2]/10 text-[#2196D2]" : "bg-zinc-100 text-zinc-600"}`}>
                {wishlistItems.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("drafts")}
              className={`flex items-center gap-2 px-5 py-3 text-base sm:text-base font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "drafts"
                  ? "border-[#2196D2] text-[#2196D2]"
                  : "border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <span>🎨 Draft Designs</span>
              <span className={`px-2 py-0.5 rounded-full text-base ${activeTab === "drafts" ? "bg-[#2196D2]/10 text-[#2196D2]" : "bg-zinc-100 text-zinc-600"}`}>
                {drafts.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Body */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* TAB 1: WISHLIST CONTENT */}
        {activeTab === "wishlist" && (
          <div>
            {wishlistLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-2xl bg-zinc-100 animate-pulse aspect-[1.3/1]" />
                ))}
              </div>
            ) : wishlistItems.length === 0 ? (
              <div className="max-w-md mx-auto text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-2xl mx-auto mb-4 border border-red-100">
                  ❤️
                </div>
                <h3 className="text-lg font-extrabold text-zinc-900">Your Wishlist is Empty</h3>
                <p className="text-base text-zinc-500 mt-1 mb-6 leading-relaxed">
                  You haven&apos;t saved any business cards or product categories to your favorites yet. Click the heart icon on any product to save it here.
                </p>
                <Link
                  href="/business-cards"
                  className="inline-block px-6 py-3 bg-[#2196D2] hover:bg-[#1B85BD] text-white text-base font-bold rounded-xl shadow transition-all"
                >
                  Explore Product Categories →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {wishlistItems.map((prod) => {
                  const targetHref = `/product/${prod.slug || prod._id}`;
                  const imageSrc = mediaSrc(prod.image) || "/placeholder.jpg";

                  return (
                    <div
                      key={prod._id}
                      className="group bg-white rounded-3xl border border-zinc-200/80 overflow-hidden shadow-xs hover:shadow-2xl hover:border-[#2196D2] transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        {/* Mini Studio Presentation Frame */}
                        <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-[#181b26] to-[#0f1118] p-3.5 flex items-center justify-center overflow-hidden">
                          {/* Radial grid mesh background pattern */}
                          <div
                            className="absolute inset-0 opacity-15 pointer-events-none"
                            style={{
                              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
                              backgroundSize: "14px 14px",
                            }}
                          />

                          {/* Floating Image Container */}
                          <div className="relative w-[82%] aspect-[16/10] rounded-lg overflow-hidden shadow-[0_12px_28px_-6px_rgba(0,0,0,0.65)] border border-white/15 transition-all duration-300 group-hover:scale-[1.05] group-hover:-translate-y-1">
                            <img
                              src={imageSrc}
                              alt={prod.name}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.jpg";
                              }}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <button
                            onClick={() => handleRemoveWishlist(prod._id)}
                            className="absolute top-3 right-3 p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-red-400 hover:bg-white hover:text-red-600 shadow-md transition-all cursor-pointer z-10"
                            title="Remove from wishlist"
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                          </button>
                        </div>

                        {/* Title & Details */}
                        <div className="p-5 space-y-2">
                          <h3 className="text-base font-extrabold text-zinc-900 group-hover:text-[#2196D2] transition-colors line-clamp-1">
                            <Link href={targetHref}>{prod.name}</Link>
                          </h3>

                          <p className="text-base text-zinc-500 leading-relaxed line-clamp-2">
                            {prod.description || "Customizable high quality printing design."}
                          </p>

                          <div className="pt-2 flex items-center justify-between text-base border-t border-zinc-100">
                            <div>
                              <span className="font-extrabold text-zinc-900">
                                ${prod.price ? prod.price.toFixed(2) : "0.15"}
                              </span>
                              <span className="text-base text-zinc-400 font-normal ml-1">/ card</span>
                            </div>
                            <span className="text-base font-bold text-zinc-500">
                              {prod.unitPrice || "$0.15 Each"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="p-5 pt-0">
                        <Link
                          href={targetHref}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-zinc-900 hover:bg-[#2196D2] text-white text-base font-bold rounded-xl transition-all shadow-xs"
                        >
                          <span>Customize in Studio</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DRAFT DESIGNS CONTENT */}
        {activeTab === "drafts" && (
          <div>
            {draftsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-3xl bg-zinc-100 animate-pulse aspect-[1.3/1]" />
                ))}
              </div>
            ) : drafts.length === 0 ? (
              <div className="max-w-md mx-auto text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-sky-50 text-[#2196D2] flex items-center justify-center text-2xl mx-auto mb-4 border border-sky-100">
                  🎨
                </div>
                <h3 className="text-lg font-extrabold text-zinc-900">No Draft Designs Yet</h3>
                <p className="text-base text-zinc-500 mt-1 mb-6 leading-relaxed">
                  When you customize cards in our 2D/3D studio and save your progress, your saved canvas drafts will appear here.
                </p>
                <Link
                  href="/customize"
                  className="inline-block px-6 py-3 bg-[#2196D2] hover:bg-[#1B85BD] text-white text-base font-bold rounded-xl shadow transition-all"
                >
                  Create First Design Draft →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {drafts.map((d) => {
                  const studioHref = `/browsedesigns?designId=${d._id}`;
                  const draftCategory = (d.designData as any)?.category || "Business Cards";
                  const isPurchased = Boolean((d.designData as any)?.isPurchased);

                  return (
                    <div
                      key={d._id}
                      className="group bg-white rounded-3xl border border-zinc-200/80 overflow-hidden shadow-xs hover:shadow-2xl hover:border-[#2196D2] transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        {/* Design Studio Frame Preview */}
                        <div className="relative w-full overflow-hidden">
                          <DraftCardPreview design={d} />
                          
                          <div className="absolute top-3 left-3 z-10">
                            <span className={`px-2.5 py-1 rounded-full text-base font-black uppercase tracking-wider shadow-md ${
                              isPurchased 
                                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950" 
                                : "bg-white/10 backdrop-blur-md border border-white/20 text-white"
                            }`}>
                              {isPurchased ? "★ PURCHASED" : "DRAFT"}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3 z-10">
                            <span className="px-2.5 py-1 rounded-full text-base font-extrabold bg-[#2196D2]/90 text-white shadow-md">
                              {draftCategory}
                            </span>
                          </div>
                        </div>

                        {/* Title & Details */}
                        <div className="p-5 space-y-2">
                          <h3 className="text-base font-extrabold text-zinc-900 group-hover:text-[#2196D2] transition-colors truncate">
                            <Link href={studioHref}>{d.name}</Link>
                          </h3>

                          <p className="text-base text-zinc-500 font-medium">
                            Category: <span className="text-zinc-800 font-bold">{draftCategory}</span>
                          </p>

                          <div className="pt-2 flex items-center justify-between text-base border-t border-zinc-100">
                            <span className="text-base text-zinc-400">Saved {formatDate(d.updatedAt || d.createdAt)}</span>
                            <span className="text-base font-bold text-[#2196D2] flex items-center gap-1">
                              <span>✨</span> 3D Studio Ready
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="p-5 pt-0 flex items-center gap-2">
                        <Link
                          href={studioHref}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-[#2196D2] hover:bg-[#1B85BD] text-white text-base font-bold rounded-xl transition-all shadow-xs"
                        >
                          <span>Open in 3D Studio</span>
                          <span>→</span>
                        </Link>

                        <button
                          onClick={() => handleDeleteDraft(d._id, d.name)}
                          disabled={deletingDraftId === d._id}
                          className="p-2.5 bg-zinc-100 hover:bg-red-50 text-zinc-500 hover:text-red-600 rounded-xl transition-all cursor-pointer border border-zinc-200/80"
                          title="Delete Draft"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function WishlistPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-sky-200 border-t-[#2196D2] rounded-full animate-spin" />
        </div>
      }
    >
      <WishlistContent />
    </Suspense>
  );
}
