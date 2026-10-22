import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import AdminSidebar from "./_components/AdminSidebar";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Printgraphy Admin",
  description: "Printgraphy Admin Panel — Manage templates, products, categories, orders and vendors.",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/auth/signin?redirect=/admin");
  }

  await dbConnect();
  const user = await User.findById(session.userId).select("isAdmin firstName").lean();
  if (!user || !user.isAdmin) {
    redirect("/");
  }

  return (
    <div className="admin-shell min-h-screen bg-gradient-to-b from-[#f6fafd] to-white font-sans text-zinc-900 flex flex-col justify-between">
      <div className="w-full">
        {/* Main Body: Left Sidebar + Right Content */}
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-5 lg:gap-7 items-start">
          <AdminSidebar />
          <main className="flex-1 w-full min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
