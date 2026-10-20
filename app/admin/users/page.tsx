"use client";

import { useEffect, useState, useCallback } from "react";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isVerified: boolean;
  isAdmin: boolean;
  role: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20", ...(search && { search }) });
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    if (data.success) {
      setUsers(data.users);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleAdmin = async (id: string, current: boolean) => {
    setToggling(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: !current }),
    });
    const data = await res.json();
    if (data.success) {
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isAdmin: !current, role: !current ? "admin" : "customer" } : u));
    } else {
      alert(data.message ?? "Failed to update.");
    }
    setToggling(null);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">User Accounts & Team Roles</h1>
          <p className="text-zinc-500 text-base mt-0.5">{pagination ? `${pagination.total} registered customer and admin accounts` : "Loading..."}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-white border border-zinc-200/80 rounded-xl pl-10 pr-4 py-2.5 text-base text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#064FE0] shadow-xs"
        />
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin mx-auto" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-base">
            No user accounts found matching your query.
          </div>
        ) : (
          <>
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-zinc-100 bg-[#edf4f9]/50 text-zinc-500">
                  <th className="text-left px-5 py-3.5 font-bold">User</th>
                  <th className="text-left px-5 py-3.5 font-bold hidden md:table-cell">Email</th>
                  <th className="text-left px-5 py-3.5 font-bold">Verified</th>
                  <th className="text-left px-5 py-3.5 font-bold">Role</th>
                  <th className="text-left px-5 py-3.5 font-bold hidden lg:table-cell">Joined</th>
                  <th className="text-right px-5 py-3.5 font-bold">Admin Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#064FE0] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{user.firstName} {user.lastName}</p>
                          <p className="text-zinc-400 text-base md:hidden">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-zinc-600 font-mono text-base">{user.email}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {user.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-base text-emerald-600 font-bold">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="text-base text-zinc-400">Unverified</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {user.isAdmin ? (
                        <span className="px-2.5 py-1 rounded-full text-base font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          ADMIN
                        </span>
                      ) : (
                        <span className="text-base text-zinc-600 font-medium capitalize">{user.role}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-zinc-400 text-base">
                        {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleToggleAdmin(user._id, user.isAdmin)}
                        disabled={toggling === user._id}
                        className={`px-3 py-1.5 rounded-xl font-bold text-base transition-all cursor-pointer border ${
                          user.isAdmin
                            ? "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100"
                            : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200"
                        }`}
                      >
                        {user.isAdmin ? "Remove Admin" : "Make Admin"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-100 bg-[#edf4f9]/30">
                <p className="text-base text-zinc-500 font-medium">Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-zinc-200 rounded-xl text-base font-bold text-zinc-600 hover:bg-white disabled:opacity-40 cursor-pointer">
                    Previous
                  </button>
                  <span className="text-base font-mono font-bold text-zinc-800 px-2">{page} / {pagination.pages}</span>
                  <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="px-3 py-1.5 border border-zinc-200 rounded-xl text-base font-bold text-zinc-600 hover:bg-white disabled:opacity-40 cursor-pointer">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
