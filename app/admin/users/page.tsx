"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  Pagination as PaginationBar,
  SearchInput,
  SkeletonRows,
  StatTile,
  Toolbar,
  cx,
  table,
} from "@/components/admin/ui";

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

  // Derived from the page of users already loaded — no extra requests.
  const adminCount = users.filter((u) => u.isAdmin).length;
  const verifiedCount = users.filter((u) => u.isVerified).length;
  const unverifiedCount = users.length - verifiedCount;
  const statsLoading = loading && !pagination;

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        icon="users"
        title="User Accounts & Team Roles"
        description={pagination ? `${pagination.total} registered customer and admin accounts` : "Loading..."}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Total accounts" icon="users" tone="brand" loading={statsLoading} value={<span className="tabular-nums">{pagination?.total ?? 0}</span>} hint="Customers and admins" />
        <StatTile label="Admins" icon="settings" tone="violet" loading={statsLoading} value={<span className="tabular-nums">{adminCount}</span>} hint="On this page" />
        <StatTile label="Verified" icon="check" tone="green" loading={statsLoading} value={<span className="tabular-nums">{verifiedCount}</span>} hint="On this page" />
        <StatTile label="Unverified" icon="clock" tone="amber" loading={statsLoading} value={<span className="tabular-nums">{unverifiedCount}</span>} hint="On this page" />
      </div>

      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder="Search by name or email..."
          />
          {pagination && (
            <p className="text-xs text-zinc-500">
              <span className="font-semibold text-zinc-700 tabular-nums">{pagination.total}</span> account{pagination.total === 1 ? "" : "s"}
            </p>
          )}
        </Toolbar>

        {loading ? (
          <SkeletonRows rows={6} />
        ) : users.length === 0 ? (
          <EmptyState icon="users" title="No users found" description="No user accounts found matching your query." />
        ) : (
          <>
            <div className={table.wrap}>
              <table className={table.table}>
                <thead className={table.thead}>
                  <tr>
                    <th className={table.th}>User</th>
                    <th className={cx(table.th, "hidden md:table-cell")}>Email</th>
                    <th className={table.th}>Verified</th>
                    <th className={table.th}>Role</th>
                    <th className={cx(table.th, "hidden lg:table-cell")}>Joined</th>
                    <th className={cx(table.th, "text-right")}>Admin Toggle</th>
                  </tr>
                </thead>
                <tbody className={table.tbody}>
                  {users.map((user) => (
                    <tr key={user._id} className={table.tr}>
                      <td className={table.td}>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={`${user.firstName} ${user.lastName}`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 truncate">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-zinc-400 truncate md:hidden">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={cx(table.td, "hidden md:table-cell")}>
                        <span className="text-zinc-600">{user.email}</span>
                      </td>
                      <td className={table.td}>
                        {user.isVerified ? (
                          <Badge tone="green" dot>Verified</Badge>
                        ) : (
                          <Badge tone="gray" dot>Unverified</Badge>
                        )}
                      </td>
                      <td className={table.td}>
                        {user.isAdmin ? (
                          <Badge tone="violet" dot>Admin</Badge>
                        ) : (
                          <Badge tone="brand">{user.role}</Badge>
                        )}
                      </td>
                      <td className={cx(table.td, "hidden lg:table-cell whitespace-nowrap text-zinc-500")}>
                        {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className={cx(table.td, "text-right whitespace-nowrap")}>
                        <Button
                          size="sm"
                          variant={user.isAdmin ? "danger" : "soft"}
                          onClick={() => handleToggleAdmin(user._id, user.isAdmin)}
                          disabled={toggling === user._id}
                        >
                          {toggling === user._id ? (
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          ) : (
                            <Icon name={user.isAdmin ? "close" : "plus"} className="w-3.5 h-3.5" strokeWidth={2.2} />
                          )}
                          {user.isAdmin ? "Remove Admin" : "Make Admin"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && (
              <PaginationBar
                page={page}
                pages={pagination.pages}
                total={pagination.total}
                limit={pagination.limit}
                onPage={(next) => setPage(Math.min(pagination.pages, Math.max(1, next)))}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
