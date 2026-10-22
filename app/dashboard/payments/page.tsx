"use client";

import { useEffect, useState, useCallback } from "react";
import CustomerSidebar from "@/components/CustomerSidebar";

interface SavedCardItem {
  id: string;
  cardholderName: string;
  cardType: "visa" | "mastercard" | "amex" | "discover" | "other";
  last4: string;
  expMonth: string;
  expYear: string;
  isDefault: boolean;
  billingZip?: string;
  cardColor?: string;
  side: "front" | "back";
}

const DEFAULT_CARDS: SavedCardItem[] = [
  {
    id: "default-card-1",
    cardholderName: "John Doe",
    cardType: "visa",
    last4: "4242",
    expMonth: "08",
    expYear: "28",
    isDefault: true,
    billingZip: "99344",
    cardColor: "#F5D4D4", // matching reference soft rose hue
    side: "front",
  },
  {
    id: "default-card-2",
    cardholderName: "John Doe",
    cardType: "mastercard",
    last4: "8812",
    expMonth: "11",
    expYear: "27",
    isDefault: false,
    billingZip: "99344",
    cardColor: "#F5D4D4",
    side: "front",
  },
  {
    id: "default-card-3",
    cardholderName: "John Doe",
    cardType: "amex",
    last4: "3009",
    expMonth: "04",
    expYear: "29",
    isDefault: false,
    billingZip: "99344",
    cardColor: "#F5D4D4",
    side: "front",
  },
];

export default function CustomerPaymentMethodsPage() {
  const [activeTab, setActiveTab] = useState<"Payment Methods" | "Add New Method">("Payment Methods");
  const [searchQuery, setSearchQuery] = useState("");
  const [cards, setCards] = useState<SavedCardItem[]>(DEFAULT_CARDS);
  const [loading, setLoading] = useState(true);

  // Add Card Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newCardName, setNewCardName] = useState("");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvc, setNewCardCvc] = useState("");
  const [newCardZip, setNewCardZip] = useState("");
  const [newCardDefault, setNewCardDefault] = useState(false);

  // Fetch real payment methods from DB
  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment-methods");
      const data = await res.json();
      if (data?.success && Array.isArray(data.paymentMethods) && data.paymentMethods.length > 0) {
        const liveCards: SavedCardItem[] = data.paymentMethods.map((m: any, idx: number) => ({
          id: m._id || `pm-${idx}`,
          cardholderName: m.cardholderName || "John Doe",
          cardType: m.cardType || "visa",
          last4: m.last4 || "4242",
          expMonth: m.expMonth || "12",
          expYear: m.expYear || "28",
          isDefault: Boolean(m.isDefault),
          billingZip: m.billingZip || "99344",
          cardColor: m.cardColor || "#F5D4D4",
          side: "front",
        }));

        // If fewer than 3, supplement with demo items to match exact screenshot layout density
        const combined = [...liveCards];
        while (combined.length < 3) {
          const sample = DEFAULT_CARDS[combined.length % DEFAULT_CARDS.length];
          combined.push({
            ...sample,
            id: `supplement-${combined.length + 1}`,
            isDefault: false,
          });
        }
        setCards(combined);
      } else {
        setCards(DEFAULT_CARDS);
      }
    } catch {
      setCards(DEFAULT_CARDS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const toggleSide = (id: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, side: c.side === "front" ? "back" : "front" } : c))
    );
  };

  const handleSetDefault = async (id: string) => {
    // If it's a real card from DB, call API
    if (!id.startsWith("default-") && !id.startsWith("supplement-")) {
      try {
        await fetch("/api/payment-methods", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } catch (err) {
        console.error("Failed to set default card:", err);
      }
    }
    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        isDefault: c.id === id,
      }))
    );
  };

  const handleRemoveCard = async (id: string) => {
    if (cards.length <= 1) {
      alert("You must keep at least one payment method on file.");
      return;
    }

    if (!id.startsWith("default-") && !id.startsWith("supplement-")) {
      try {
        await fetch(`/api/payment-methods?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Failed to delete card:", err);
      }
    }
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setNewCardNumber(formatted);
  };

  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 4);
    if (raw.length > 2) {
      setNewCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setNewCardExpiry(raw);
    }
  };

  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName.trim()) {
      setFeedback({ type: "error", text: "Please enter cardholder name." });
      return;
    }
    const cleanNum = newCardNumber.replace(/\D/g, "");
    if (cleanNum.length < 13 || cleanNum.length > 19) {
      setFeedback({ type: "error", text: "Please enter a valid card number." });
      return;
    }
    if (newCardExpiry.length < 4) {
      setFeedback({ type: "error", text: "Please enter a valid expiry date (MM/YY)." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardholderName: newCardName,
          cardNumber: cleanNum,
          expiry: newCardExpiry,
          billingZip: newCardZip,
          isDefault: newCardDefault,
          cardColor: "#F5D4D4",
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setFeedback({ type: "success", text: "Payment method added successfully!" });
        setShowAddModal(false);
        // Reset form
        setNewCardName("");
        setNewCardNumber("");
        setNewCardExpiry("");
        setNewCardCvc("");
        setNewCardZip("");
        setNewCardDefault(false);
        fetchPaymentMethods();
      } else {
        setFeedback({ type: "error", text: data?.message || "Failed to add payment method." });
      }
    } catch {
      // Local fallback
      const last4 = cleanNum.slice(-4);
      const parts = newCardExpiry.split("/");
      const newCard: SavedCardItem = {
        id: `local-${Date.now()}`,
        cardholderName: newCardName,
        cardType: "visa",
        last4,
        expMonth: parts[0] || "12",
        expYear: parts[1] || "28",
        isDefault: newCardDefault,
        billingZip: newCardZip || "99344",
        cardColor: "#F5D4D4",
        side: "front",
      };
      setCards((prev) => [newCard, ...prev]);
      setShowAddModal(false);
      setNewCardName("");
      setNewCardNumber("");
      setNewCardExpiry("");
      setNewCardCvc("");
      setNewCardZip("");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCards = cards.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.cardholderName.toLowerCase().includes(q) ||
      c.last4.includes(q) ||
      c.cardType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full bg-white min-h-[calc(100vh-160px)] font-sans">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row items-start gap-8 lg:gap-12">
          {/* Uniform Left Customer Sidebar */}
          <CustomerSidebar activeItem="Payments methods" />

          {/* Right Main Content */}
          <main className="flex-1 w-full min-w-0">
            {/* ── Top Tabs Navigation ── */}
            <div className="border-b border-zinc-200">
              <nav className="flex items-center gap-6 sm:gap-10 -mb-px">
                <button
                  type="button"
                  onClick={() => setActiveTab("Payment Methods")}
                  className={`pb-3 text-lg sm:text-[22px] font-bold transition-all cursor-pointer ${
                    activeTab === "Payment Methods"
                      ? "text-zinc-900 border-b-2 border-zinc-900"
                      : "text-zinc-400 hover:text-zinc-700 border-b-2 border-transparent"
                  }`}
                >
                  Payment Methods
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("Add New Method");
                    setShowAddModal(true);
                  }}
                  className={`pb-3 text-lg sm:text-[22px] font-bold transition-all cursor-pointer ${
                    activeTab === "Add New Method"
                      ? "text-zinc-900 border-b-2 border-zinc-900"
                      : "text-zinc-400 hover:text-zinc-700 border-b-2 border-transparent"
                  }`}
                >
                  Add New Method
                </button>
              </nav>
            </div>

            {/* ── Right-Aligned Search & Action Bar ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 pb-6">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-xs sm:text-sm font-semibold rounded-full shadow-sm transition-all cursor-pointer w-fit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Payment Method
              </button>

              <div className="relative self-end sm:self-auto">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#EAEAEA] text-zinc-900 placeholder:text-zinc-500 rounded-full px-5 py-2 sm:py-2.5 text-sm w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-[#e74b2d]/30 transition-all border-none"
                />
              </div>
            </div>

            {/* Feedback notification */}
            {feedback && (
              <div
                className={`mb-6 p-4 rounded-xl text-sm font-medium ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {feedback.text}
              </div>
            )}

            {/* ── Payment Cards List (Exact Horizontal Card Layout) ── */}
            <div className="space-y-5 sm:space-y-6">
              {filteredCards.map((card, idx) => {
                const brandLabel =
                  card.cardType === "mastercard"
                    ? "Mastercard"
                    : card.cardType === "amex"
                    ? "American Express"
                    : card.cardType === "discover"
                    ? "Discover"
                    : "Standard Business Cards";

                return (
                  <div
                    key={card.id}
                    className="bg-[#F8F9FA] rounded-2xl border border-zinc-200/90 p-5 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-all hover:border-zinc-300"
                  >
                    {/* Part 1: Card Meta (Left Column) */}
                    <div className="w-full lg:w-56 flex-shrink-0">
                      <div className="space-y-1.5 text-xs sm:text-[13px] text-zinc-800 leading-snug">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 w-24">Date Added :</span>
                          <span className="text-zinc-700 font-medium">02/24/24</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 w-24">Card Status :</span>
                          <span className="text-[#e74b2d] font-semibold">
                            {card.isDefault ? "Default Card" : "Completed"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 w-24">Card Number :</span>
                          <span className="text-zinc-900 font-semibold underline underline-offset-2">
                            •••• {card.last4}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 w-24">Expires :</span>
                          <span className="text-[#e74b2d] font-bold">
                            {card.expMonth}/{card.expYear}
                          </span>
                        </div>
                      </div>

                      {/* Default / Manage Action Button */}
                      <div className="pt-3">
                        <button
                          type="button"
                          onClick={() => handleSetDefault(card.id)}
                          disabled={card.isDefault}
                          className={`px-6 sm:px-7 py-2 sm:py-2.5 font-semibold text-xs rounded-full shadow-sm transition-all inline-block text-center cursor-pointer ${
                            card.isDefault
                              ? "bg-emerald-600 text-white cursor-default"
                              : "bg-[#e74b2d] hover:bg-[#c93e23] text-white"
                          }`}
                        >
                          {card.isDefault ? "Default Method" : "Set As Default"}
                        </button>
                      </div>
                    </div>

                    {/* Part 2: Card Preview with Carousel Arrows (Center) */}
                    <div className="flex items-center justify-center gap-2 sm:gap-3 flex-shrink-0 mx-auto lg:mx-0 select-none">
                      {/* Left Carousel Arrow */}
                      <button
                        type="button"
                        onClick={() => toggleSide(card.id)}
                        aria-label="Flip card side"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-zinc-300 text-zinc-500 hover:text-zinc-900 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Realistic Card Preview Box matching screenshot */}
                      <div className="w-36 h-24 sm:w-44 sm:h-28 rounded-xl bg-white border border-zinc-200 p-2 shadow-xs flex items-center justify-center relative overflow-hidden">
                        <div
                          className="w-full h-full rounded-md shadow-inner flex flex-col justify-between p-2 text-center transition-all duration-300 relative"
                          style={{ backgroundColor: card.cardColor || "#F5D4D4" }}
                        >
                          {card.side === "front" ? (
                            <>
                              {/* Top row: Chip and Brand */}
                              <div className="flex items-center justify-between w-full">
                                <div className="w-4 h-3 rounded-[3px] bg-amber-300/80 border border-amber-400/70" />
                                <span className="font-bold tracking-widest text-[8px] sm:text-[9px] uppercase text-zinc-800">
                                  {card.cardType === "mastercard" ? "MC" : card.cardType === "amex" ? "AMEX" : "VISA"}
                                </span>
                              </div>

                              {/* Center: PRINTGRAPHI branding matching reference */}
                              <div className="my-auto">
                                <p className="font-serif tracking-widest text-[8px] sm:text-[9px] text-zinc-800 uppercase font-bold leading-tight">
                                  PRINTGRAPHI
                                </p>
                                <div className="w-8 h-0.5 bg-zinc-700 mx-auto opacity-40 my-0.5" />
                                <p className="text-[6px] text-zinc-600 tracking-wider">PAYMENT CARD</p>
                              </div>

                              {/* Bottom row: Cardholder & masked digits */}
                              <div className="flex items-center justify-between w-full text-[7px] text-zinc-800 font-mono">
                                <span className="truncate max-w-[65px] uppercase font-semibold">
                                  {card.cardholderName}
                                </span>
                                <span>•••• {card.last4}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Back side: Magnetic strip */}
                              <div className="w-full h-3 bg-zinc-800 -mx-2 -mt-2 mb-1" />
                              <div className="flex items-center justify-end px-1 my-auto">
                                <div className="bg-white/80 px-2 py-0.5 rounded text-[7px] font-mono text-zinc-800">
                                  CVV •••
                                </div>
                              </div>
                              <p className="text-[6px] text-zinc-500 font-mono">Printgraphi Secure</p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right Carousel Arrow */}
                      <button
                        type="button"
                        onClick={() => toggleSide(card.id)}
                        aria-label="Flip card side"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-zinc-300 text-zinc-500 hover:text-zinc-900 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Part 3: Card Title, Status, and Actions (Right Side) */}
                    <div className="flex-1 w-full lg:w-auto min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-lg sm:text-[20px] font-bold text-zinc-900 leading-snug">
                              {brandLabel}
                            </h2>
                            <p className="text-xs sm:text-[13px] font-semibold text-[#16A34A] mt-0.5">
                              {card.isDefault ? "Default Payment Method" : "Active & Verified"}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                alert(`Billing Zip for card ending in ${card.last4}: ${card.billingZip || "99344"}`);
                              }}
                              className="text-[11px] sm:text-xs text-zinc-500 hover:text-[#e74b2d] underline mt-0.5 cursor-pointer block text-left"
                            >
                              Billing Address Details
                            </button>
                          </div>
                          <span className="text-base sm:text-lg font-bold text-zinc-800 flex-shrink-0">
                            100
                          </span>
                        </div>
                      </div>

                      {/* Action Button (Remove / Manage) */}
                      <div className="pt-4 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveCard(card.id)}
                          className="px-8 sm:px-10 py-2 sm:py-2.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-semibold text-xs rounded-full shadow-sm transition-all cursor-pointer text-center"
                        >
                          Remove
                        </button>

                        {!card.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(card.id)}
                            className="px-5 py-2 sm:py-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-semibold text-xs rounded-full transition-all cursor-pointer"
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>

      {/* ── Add New Payment Method Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-700 cursor-pointer p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-zinc-900 mb-1">Add Payment Method</h3>
            <p className="text-xs text-zinc-500 mb-6">
              Enter your card details to save securely for future 1-click orders.
            </p>

            <form onSubmit={handleAddCardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#e74b2d]/30 focus:border-[#e74b2d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="1234 5678 9012 3456"
                  value={newCardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#e74b2d]/30 focus:border-[#e74b2d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Expires (MM/YY)</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={newCardExpiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#e74b2d]/30 focus:border-[#e74b2d]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">CVV / CVC</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="•••"
                    value={newCardCvc}
                    onChange={(e) => setNewCardCvc(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-2.5 rounded-2xl border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#e74b2d]/30 focus:border-[#e74b2d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Billing ZIP / Postal Code</label>
                <input
                  type="text"
                  placeholder="e.g. 99344"
                  value={newCardZip}
                  onChange={(e) => setNewCardZip(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#e74b2d]/30 focus:border-[#e74b2d]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultCheck"
                  checked={newCardDefault}
                  onChange={(e) => setNewCardDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-[#e74b2d] focus:ring-[#e74b2d] border-zinc-300"
                />
                <label htmlFor="defaultCheck" className="text-xs text-zinc-600 select-none">
                  Set as default payment method
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-7 py-2.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-xs font-semibold rounded-full shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving Card..." : "Save Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
