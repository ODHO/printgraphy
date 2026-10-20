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
    <div className="min-h-screen bg-[#f8fbfd] font-sans text-zinc-900 flex flex-col justify-between">
      <div>


        {/* Main Body: Left Sidebar + Right Content */}
        <div className="flex container mx-auto">
          <AdminSidebar />
          <main className="flex-1 p-4 pt-14 sm:p-6 lg:pt-6 overflow-y-auto min-w-0">{children}</main>
        </div>
      </div>

      {/* Footer Bar (Screenshot Footer) */}
      <footer className="bg-[#eef4f8] border-t border-zinc-200/60 py-4 px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-base text-zinc-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900">PRINTGRAPHY</span>
            <span>© 2026 Printgraphy Enterprise. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-base">
            <a href="#" className="hover:text-zinc-900">SLA Agreement</a>
            <a href="#" className="hover:text-zinc-900">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-900">Vendor Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
