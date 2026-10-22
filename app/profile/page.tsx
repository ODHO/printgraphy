"use client";

import { useEffect, useState, useRef, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import CustomerSidebar from "@/components/CustomerSidebar";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  city?: string;
  avatar?: string;
  isVerified?: boolean;
}

interface AddressItem {
  _id: string;
  label: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

const CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
  "Austin",
  "Jacksonville",
  "San Francisco",
  "Columbus",
  "Indianapolis",
  "Seattle",
  "Denver",
  "Washington",
  "Boston",
  "Nashville",
  "Miami",
  "Atlanta",
];

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80";

const DEFAULT_DEMO_ADDRESS: AddressItem = {
  _id: "default-demo",
  label: "Home",
  name: "John Doe",
  line1: "City Center St 7 , Lane 6 , House no. 10",
  city: "Adams County",
  state: "Alabama",
  zip: "99344",
  country: "United States of America",
  phone: "808-256-2563",
  isDefault: true,
};

function MapPreview() {
  return (
    <div className="relative w-full h-44 sm:h-52 md:h-56 rounded-xl overflow-hidden border border-zinc-200/80 bg-[#F4F1EA] shadow-inner mb-5 select-none">
      {/* SVG Map Graphic matching the reference layout with streets and river */}
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 800 240"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {/* Background land */}
        <rect width="800" height="240" fill="#F5F3E9" />

        {/* Green Parks */}
        <path d="M 120 40 Q 180 30 220 80 Q 240 130 180 150 Q 110 160 90 100 Z" fill="#D9EBD4" opacity="0.9" />
        <path d="M 460 20 Q 520 15 560 50 Q 580 90 530 120 Q 470 110 450 60 Z" fill="#D9EBD4" opacity="0.9" />
        <path d="M 640 140 Q 720 120 760 170 Q 780 220 710 230 Q 630 230 620 180 Z" fill="#D9EBD4" opacity="0.9" />
        <path d="M 320 160 Q 380 140 410 190 Q 430 230 360 240 Q 300 230 290 190 Z" fill="#D9EBD4" opacity="0.9" />

        {/* River Waterway */}
        <path
          d="M -20 120 Q 140 80 260 140 T 520 130 T 820 90"
          stroke="#ffd6c9"
          strokeWidth="26"
          fill="none"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Secondary Streets */}
        <path d="M 0 40 L 800 50 M 0 110 L 800 95 M 0 180 L 800 190" stroke="#FFFFFF" strokeWidth="6" />
        <path
          d="M 80 0 L 100 240 M 210 0 L 190 240 M 350 0 L 370 240 M 490 0 L 510 240 M 630 0 L 610 240 M 740 0 L 760 240"
          stroke="#FFFFFF"
          strokeWidth="6"
        />

        {/* Diagonal Arterials */}
        <path d="M 30 240 L 360 0 M 420 240 L 760 10 M 150 0 L 580 240" stroke="#FFF7D6" strokeWidth="10" />
        <path d="M 30 240 L 360 0 M 420 240 L 760 10 M 150 0 L 580 240" stroke="#F6E7B4" strokeWidth="4" />

        {/* Street Names & Labels */}
        <text x="140" y="70" fontSize="9" fill="#8C887B" fontFamily="sans-serif" fontWeight="bold">
          Largo di Torre
        </text>
        <text x="320" y="90" fontSize="9" fill="#8C887B" fontFamily="sans-serif">
          Piazza Venezia
        </text>
        <text x="490" y="45" fontSize="9" fill="#8C887B" fontFamily="sans-serif">
          Colonna Traiana
        </text>
        <text x="610" y="110" fontSize="9" fill="#8C887B" fontFamily="sans-serif">
          Via dei Fori
        </text>
        <text x="260" y="210" fontSize="9" fill="#8C887B" fontFamily="sans-serif">
          Campidoglio
        </text>
        <text x="680" y="180" fontSize="9" fill="#8C887B" fontFamily="sans-serif">
          Via Baccina
        </text>

        {/* Building Blocks */}
        <rect x="130" y="85" width="22" height="16" fill="#E8E2D2" rx="2" />
        <rect x="230" y="35" width="18" height="24" fill="#E8E2D2" rx="2" />
        <rect x="380" y="105" width="30" height="20" fill="#E8E2D2" rx="2" />
        <rect x="540" y="135" width="26" height="18" fill="#E8E2D2" rx="2" />
      </svg>

      {/* Blue Location Pin Marker */}
      <div className="absolute right-[24%] sm:right-[28%] top-[40%] sm:top-[38%] -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none drop-shadow-[0_8px_16px_rgba(33,150,210,0.5)]">
        <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#e74b2d]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 7 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
        </svg>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"Account Settings" | "Saved Addresses" | "Security">(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "addresses") return "Saved Addresses";
    if (tabParam === "security") return "Security";
    return "Account Settings";
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "payments") {
      router.replace("/dashboard/payments");
    }
  }, [searchParams, router]);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Personal Info Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Addresses
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressFeedback, setAddressFeedback] = useState<string | null>(null);

  const [addressForm, setAddressForm] = useState({
    label: "Home",
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "United States of America",
    phone: "",
    isDefault: true,
  });

  // Password / Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityStatus, setSecurityStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.replace("/auth/signin?redirect=/profile");
        return;
      }
      const data = await res.json();
      if (data?.user) {
        setUser(data.user);
        setFirstName(data.user.firstName || "");
        setLastName(data.user.lastName || "");
        setEmail(data.user.email || "");
        setPhone(data.user.phone || "");
        setCity(data.user.city || "");
        setAvatar(data.user.avatar || DEFAULT_AVATAR);
      }
    } catch {
      setUser({
        id: "demo-user",
        firstName: "Alexander",
        lastName: "Wright",
        email: "alexander.wright@example.com",
        phone: "+1 (555) 382-9102",
        city: "New York",
        avatar: DEFAULT_AVATAR,
      });
      setFirstName("Alexander");
      setLastName("Wright");
      setEmail("alexander.wright@example.com");
      setPhone("+1 (555) 382-9102");
      setCity("New York");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      if (data?.success && Array.isArray(data.addresses) && data.addresses.length > 0) {
        setAddresses(data.addresses);
      } else {
        // Fallback to demo address from screenshot if database is empty
        setAddresses([DEFAULT_DEMO_ADDRESS]);
      }
    } catch {
      setAddresses([DEFAULT_DEMO_ADDRESS]);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchAddresses();
  }, [fetchProfile, fetchAddresses]);

  // Handle avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Personal Info save
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          city,
          avatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile changes.");
      }

      setFeedback({ type: "success", message: "Personal info saved successfully!" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Error saving profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Open modal for editing
  const handleOpenEditModal = (addr: AddressItem) => {
    setEditingAddressId(addr._id === "default-demo" ? null : addr._id);
    setAddressForm({
      label: addr.label || "Home",
      name: addr.name || "",
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      zip: addr.zip || "",
      country: addr.country || "United States of America",
      phone: addr.phone || "",
      isDefault: addr.isDefault ?? true,
    });
    setAddressFeedback(null);
    setShowAddressModal(true);
  };

  // Open modal for adding
  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: "Home",
      name: user ? `${user.firstName} ${user.lastName}`.trim() : "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      zip: "",
      country: "United States of America",
      phone: user?.phone || "",
      isDefault: addresses.length === 0,
    });
    setAddressFeedback(null);
    setShowAddressModal(true);
  };

  // Save address (POST or PUT to DB)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressSaving(true);
    setAddressFeedback(null);

    try {
      const endpoint = editingAddressId
        ? `/api/addresses/${editingAddressId}`
        : "/api/addresses";
      const method = editingAddressId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save address.");
      }

      setShowAddressModal(false);
      await fetchAddresses();
    } catch (err) {
      setAddressFeedback(err instanceof Error ? err.message : "Failed to save address.");
    } finally {
      setAddressSaving(false);
    }
  };

  // Delete address
  const handleDeleteAddress = async () => {
    if (!editingAddressId) {
      setShowAddressModal(false);
      return;
    }
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      await fetch(`/api/addresses/${editingAddressId}`, { method: "DELETE" });
      setShowAddressModal(false);
      await fetchAddresses();
    } catch {}
  };

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityStatus(null);

    if (newPassword.length < 8) {
      setSecurityStatus({ type: "error", message: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to update password.");

      setSecurityStatus({ type: "success", message: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setSecurityStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Password update failed.",
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="w-full bg-white min-h-[calc(100vh-160px)] font-sans">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row items-start gap-8 lg:gap-12">
          {/* Left Customer Sidebar */}
          <CustomerSidebar activeItem="Account Settings" />

          {/* Right Main Content */}
          <main className="flex-1 w-full min-w-0">
            {/* ── Top Tabs Navigation ── */}
            <div className="border-b border-zinc-200">
              <nav className="flex items-center gap-6 sm:gap-10 -mb-px">
                <button
                  type="button"
                  onClick={() => setActiveTab("Account Settings")}
                  className={`pb-3 text-lg sm:text-[22px] font-bold transition-all cursor-pointer ${
                    activeTab === "Account Settings"
                      ? "text-zinc-900 border-b-2 border-zinc-900"
                      : "text-zinc-400 hover:text-zinc-700 border-b-2 border-transparent"
                  }`}
                >
                  Account Settings
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("Saved Addresses")}
                  className={`pb-3 text-lg sm:text-[22px] font-bold transition-all cursor-pointer ${
                    activeTab === "Saved Addresses"
                      ? "text-zinc-900 border-b-2 border-zinc-900"
                      : "text-zinc-400 hover:text-zinc-700 border-b-2 border-transparent"
                  }`}
                >
                  Saved Addresses
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("Security")}
                  className={`pb-3 text-lg sm:text-[22px] font-bold transition-all cursor-pointer ${
                    activeTab === "Security"
                      ? "text-zinc-900 border-b-2 border-zinc-900"
                      : "text-zinc-400 hover:text-zinc-700 border-b-2 border-transparent"
                  }`}
                >
                  Security
                </button>
              </nav>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                TAB 1: ACCOUNT SETTINGS / PERSONAL INFO
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "Account Settings" && (
              <div className="pt-6 sm:pt-8">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-6">
                  Personal Info
                </h2>

                {feedback && (
                  <div
                    className={`mb-6 p-4 rounded-2xl text-sm font-medium ${
                      feedback.type === "success"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start gap-8 lg:gap-12">
                  {/* Left Column: Avatar & Upload New Button */}
                  <div className="w-full sm:w-52 md:w-56 flex flex-col items-center sm:items-start flex-shrink-0">
                    <div className="relative w-48 h-48 sm:w-52 sm:h-52 md:w-56 md:h-56 rounded-3xl overflow-hidden bg-zinc-100 border border-zinc-200 shadow-sm">
                      <Image
                        src={avatar || DEFAULT_AVATAR}
                        alt="Profile avatar"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-48 sm:w-52 md:w-56 mt-3.5 py-2.5 sm:py-3 bg-[#e74b2d] hover:bg-[#c93e23] text-white rounded-2xl font-semibold text-sm sm:text-base shadow-sm transition-all text-center cursor-pointer block"
                    >
                      Upload New
                    </button>
                  </div>

                  {/* Right Column: Capsule Form Inputs */}
                  <form
                    onSubmit={handleSavePersonalInfo}
                    className="flex-1 w-full min-w-0 space-y-4 sm:space-y-5"
                  >
                    {/* Row 1: First Name & Last Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      <div>
                        <input
                          type="text"
                          placeholder="First name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="w-full bg-white border border-zinc-300 rounded-3xl py-3 sm:py-3.5 px-6 text-base text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20 transition-all"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          className="w-full bg-white border border-zinc-300 rounded-3xl py-3 sm:py-3.5 px-6 text-base text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 2: Mobile* */}
                    <div>
                      <input
                        type="tel"
                        placeholder="Mobile*"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-3xl py-3 sm:py-3.5 px-6 text-base text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20 transition-all"
                      />
                    </div>

                    {/* Row 3: City Dropdown */}
                    <div className="relative">
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-3xl py-3 sm:py-3.5 px-6 pr-12 text-base text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">City</option>
                        {CITIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <svg
                        className="w-5 h-5 text-zinc-600 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Row 4: Email Address */}
                    <div>
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-3xl py-3 sm:py-3.5 px-6 text-base text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20 transition-all"
                      />
                    </div>

                    {/* Bottom Right: Save Button */}
                    <div className="flex justify-end pt-3 sm:pt-4">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-14 sm:px-16 py-3 sm:py-3.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-semibold text-base rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 2: SAVED ADDRESSES (EXACT REFERENCE SCREENSHOT DESIGN)
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "Saved Addresses" && (
              <div className="pt-6 sm:pt-8">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-6">
                  My Address
                </h2>

                {/* Address Cards List */}
                <div className="space-y-6">
                  {addresses.map((addr) => (
                    <div
                      key={addr._id}
                      className="bg-white rounded-2xl border border-zinc-300/80 p-5 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                    >
                      {/* Map Preview Graphic with Blue Pin Marker */}
                      <MapPreview />

                      {/* Address Details & Edit Button */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pt-1">
                        <div className="space-y-1 text-base text-zinc-700 leading-snug">
                          <p className="font-semibold text-zinc-900 text-lg sm:text-[19px]">
                            {addr.name || "John Doe"}
                          </p>
                          <p>{addr.line1 || "City Center St 7 , Lane 6 , House no. 10"}</p>
                          <p>
                            {addr.city || "Adams County"}, {addr.state || "Alabama"}{" "}
                            {addr.zip || "99344"}
                          </p>
                          <p>
                            {addr.country === "US"
                              ? "United States of America"
                              : addr.country || "United States of America"}
                          </p>
                          <p className="pt-0.5">{addr.phone || "808-256-2563"}</p>
                        </div>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(addr)}
                          className="px-8 sm:px-11 py-2.5 sm:py-3 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-semibold text-base rounded-full shadow-sm transition-all cursor-pointer self-end"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add new Address Button */}
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="w-full py-3.5 sm:py-4 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-semibold text-base sm:text-lg rounded-full shadow-sm text-center transition-all cursor-pointer mt-6 sm:mt-8 block"
                >
                  Add new Address
                </button>

                {/* ── Address Add / Edit Modal ── */}
                {showAddressModal && (
                  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
                        <h3 className="text-xl sm:text-2xl font-bold text-zinc-900">
                          {editingAddressId ? "Edit Address" : "Add New Address"}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowAddressModal(false)}
                          className="text-zinc-400 hover:text-zinc-700 p-1 rounded-full cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {addressFeedback && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                          {addressFeedback}
                        </div>
                      )}

                      <form onSubmit={handleSaveAddress} className="space-y-4">
                        {/* Name */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">
                            Recipient Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. John Doe"
                            required
                            value={addressForm.name}
                            onChange={(e) =>
                              setAddressForm({ ...addressForm, name: e.target.value })
                            }
                            className="w-full bg-white border border-zinc-300 rounded-2xl py-3 px-4 text-sm text-zinc-900 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20"
                          />
                        </div>

                        {/* Street Address */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">
                            Street Address
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. City Center St 7 , Lane 6 , House no. 10"
                            required
                            value={addressForm.line1}
                            onChange={(e) =>
                              setAddressForm({ ...addressForm, line1: e.target.value })
                            }
                            className="w-full bg-white border border-zinc-300 rounded-2xl py-3 px-4 text-sm text-zinc-900 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20"
                          />
                        </div>

                        {/* City & State */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-600 mb-1">
                              City / County
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Adams County"
                              required
                              value={addressForm.city}
                              onChange={(e) =>
                                setAddressForm({ ...addressForm, city: e.target.value })
                              }
                              className="w-full bg-white border border-zinc-300 rounded-2xl py-3 px-4 text-sm text-zinc-900 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-600 mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Alabama"
                              required
                              value={addressForm.state}
                              onChange={(e) =>
                                setAddressForm({ ...addressForm, state: e.target.value })
                              }
                              className="w-full bg-white border border-zinc-300 rounded-2xl py-3 px-4 text-sm text-zinc-900 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20"
                            />
                          </div>
                        </div>

                        {/* Zip & Country */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-600 mb-1">
                              Zip / Postal Code
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 99344"
                              required
                              value={addressForm.zip}
                              onChange={(e) =>
                                setAddressForm({ ...addressForm, zip: e.target.value })
                              }
                              className="w-full bg-white border border-zinc-300 rounded-2xl py-3 px-4 text-sm text-zinc-900 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-600 mb-1">
                              Country
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. United States of America"
                              required
                              value={addressForm.country}
                              onChange={(e) =>
                                setAddressForm({ ...addressForm, country: e.target.value })
                              }
                              className="w-full bg-white border border-zinc-300 rounded-2xl py-3 px-4 text-sm text-zinc-900 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20"
                            />
                          </div>
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            placeholder="e.g. 808-256-2563"
                            value={addressForm.phone}
                            onChange={(e) =>
                              setAddressForm({ ...addressForm, phone: e.target.value })
                            }
                            className="w-full bg-white border border-zinc-300 rounded-2xl py-3 px-4 text-sm text-zinc-900 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                          {editingAddressId ? (
                            <button
                              type="button"
                              onClick={handleDeleteAddress}
                              className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              Delete Address
                            </button>
                          ) : (
                            <div />
                          )}

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setShowAddressModal(false)}
                              className="px-5 py-2.5 rounded-full border border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={addressSaving}
                              className="px-6 py-2.5 rounded-full bg-[#e74b2d] hover:bg-[#c93e23] text-white text-sm font-semibold shadow-sm cursor-pointer disabled:opacity-60"
                            >
                              {addressSaving ? "Saving..." : "Save Address"}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 3: SECURITY
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "Security" && (
              <div className="pt-6 sm:pt-8 max-w-xl">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-6">
                  Security & Password
                </h2>

                {securityStatus && (
                  <div
                    className={`mb-6 p-4 rounded-2xl text-sm font-medium ${
                      securityStatus.type === "success"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    {securityStatus.message}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 sm:space-y-5">
                  <div>
                    <input
                      type="password"
                      placeholder="Current Password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full bg-white border border-zinc-300 rounded-3xl py-3 sm:py-3.5 px-6 text-base text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20 transition-all"
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      placeholder="New Password (min 8 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full bg-white border border-zinc-300 rounded-3xl py-3 sm:py-3.5 px-6 text-base text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20 transition-all"
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full bg-white border border-zinc-300 rounded-3xl py-3 sm:py-3.5 px-6 text-base text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-[#e74b2d] focus:ring-2 focus:ring-[#e74b2d]/20 transition-all"
                    />
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={isChangingPass}
                      className="px-14 sm:px-16 py-3.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-semibold text-base rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isChangingPass ? "Updating..." : "Save Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
