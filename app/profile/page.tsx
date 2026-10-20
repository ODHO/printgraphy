"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
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
  isDefault: boolean;
}

function Spinner() {
  return (
    <div className="min-h-[calc(100vh-115px)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin" />
    </div>
  );
}

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return (
    <div className="w-20 h-20 text-2xl rounded-full bg-gradient-to-br from-[#064FE0] to-[#0439A8] text-white font-bold flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#064FE0]/30 border-4 border-white">
      {initials}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, startSignOut] = useTransition();

  // Address modal state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      if (data.addresses) setAddresses(data.addresses);
    } catch (_) {}
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      }),
      fetchAddresses(),
    ])
      .then(([meData]) => setUser(meData.user))
      .catch(() => router.replace("/auth?tab=signin"))
      .finally(() => setLoading(false));
  }, [router, fetchAddresses]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError("");
    setSavingAddress(true);

    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to save address.");

      setShowAddressModal(false);
      setAddressForm({ label: "Home", name: "", line1: "", line2: "", city: "", state: "", zip: "", country: "US" });
      fetchAddresses();
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Error saving address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Delete this saved shipping address?")) return;
    await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    fetchAddresses();
  };

  const handleSignOut = () => {
    startSignOut(async () => {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    });
  };

  if (loading) return <Spinner />;
  if (!user) return null;

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#f8fbfd] font-sans text-zinc-900 pb-20">
      {/* Top Header Navbar */}
      <div className="bg-white border-b border-zinc-200/80">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image src="/logo/logo.png" alt="Printgraphy Logo" width={140} height={36} className="h-8 w-auto object-contain" />
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-base font-bold text-zinc-600">My Profile & Account Settings</span>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-base font-bold rounded-xl transition-all"
          >
            Dashboard →
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── User Profile Card ── */}
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-[#064FE0] to-[#0439A8] relative">
            <div className="absolute -bottom-10 left-8">
              <Avatar firstName={user.firstName} lastName={user.lastName} />
            </div>
          </div>

          <div className="pt-14 pb-8 px-8 space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-base text-zinc-500 mt-0.5">{user.email}</p>
              </div>
              {user.isVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-base font-bold rounded-full border border-emerald-200">
                  ✓ Verified Account
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-base font-bold rounded-full border border-amber-200">
                  ⚠ Unverified Email
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-100 text-base">
              <div className="p-3.5 rounded-2xl bg-[#edf4f9]/40 border border-sky-100/60">
                <span className="text-zinc-400 font-bold uppercase block mb-1">First Name</span>
                <span className="font-bold text-zinc-900 text-base">{user.firstName}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#edf4f9]/40 border border-sky-100/60">
                <span className="text-zinc-400 font-bold uppercase block mb-1">Last Name</span>
                <span className="font-bold text-zinc-900 text-base">{user.lastName}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#edf4f9]/40 border border-sky-100/60">
                <span className="text-zinc-400 font-bold uppercase block mb-1">Email Address</span>
                <span className="font-mono font-bold text-zinc-900">{user.email}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#edf4f9]/40 border border-sky-100/60">
                <span className="text-zinc-400 font-bold uppercase block mb-1">Member Since</span>
                <span className="font-bold text-zinc-900">{joinDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Saved Shipping Addresses Card ── */}
        <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Saved Shipping Addresses</h2>
              <p className="text-base text-zinc-400 mt-0.5">Manage default delivery addresses for 1-click checkout</p>
            </div>
            <button
              onClick={() => setShowAddressModal(true)}
              className="px-4 py-2 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              + Add Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="p-6 text-center text-base text-zinc-400 border border-dashed border-zinc-200 rounded-2xl">
              No saved shipping addresses. Click &quot;+ Add Address&quot; to save one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div key={addr._id} className="p-4 rounded-2xl border border-zinc-200 space-y-2 relative bg-[#f8fbfd]">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-base font-bold rounded-md">
                      {addr.label}
                    </span>
                    <button
                      onClick={() => handleDeleteAddress(addr._id)}
                      className="text-base text-red-500 font-bold hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="font-bold text-zinc-900 text-base">{addr.name}</p>
                  <p className="text-base text-zinc-600 leading-relaxed">
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />
                    {addr.city}, {addr.state} {addr.zip}, {addr.country}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Security & Account Actions Card ── */}
        <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 space-y-3 shadow-xs">
          <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider mb-2">Account Security</h2>

          <Link
            href="/profile/change-password"
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-zinc-200 hover:border-[#064FE0] text-zinc-800 font-bold text-base transition-all group"
          >
            <span>🔒</span>
            Change Account Password
            <span className="ml-auto text-zinc-400">→</span>
          </Link>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-base transition-all cursor-pointer disabled:opacity-60"
          >
            <span>🚪</span>
            {isSigningOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>

      </div>

      {/* Add Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200/80 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">Add Shipping Address</h2>
              <button onClick={() => setShowAddressModal(false)} className="text-zinc-400 hover:text-zinc-800 cursor-pointer">✕</button>
            </div>

            {addressError && <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 font-bold text-base rounded-xl">{addressError}</div>}

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Label</label>
                  <input type="text" value={addressForm.label} onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="Home, Office" className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
                </div>
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Recipient Name *</label>
                  <input required type="text" value={addressForm.name} onChange={(e) => setAddressForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Full Name" className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
                </div>
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Street Address *</label>
                <input required type="text" value={addressForm.line1} onChange={(e) => setAddressForm((prev) => ({ ...prev, line1: e.target.value }))} placeholder="123 Main St" className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">City *</label>
                  <input required type="text" value={addressForm.city} onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))} className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
                </div>
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">State *</label>
                  <input required type="text" value={addressForm.state} onChange={(e) => setAddressForm((prev) => ({ ...prev, state: e.target.value }))} className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
                </div>
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Zip *</label>
                  <input required type="text" value={addressForm.zip} onChange={(e) => setAddressForm((prev) => ({ ...prev, zip: e.target.value }))} className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowAddressModal(false)} className="flex-1 py-2.5 text-base text-zinc-600 font-bold border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={savingAddress} className="flex-1 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60">{savingAddress ? "Saving..." : "Save Address"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
