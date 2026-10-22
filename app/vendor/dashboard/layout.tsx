import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import dbConnect from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Printgraphy Vendor Portal",
  description: "Printgraphy Vendor Fulfillment & Production Portal",
  robots: "noindex, nofollow",
};

export default async function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.email) {
    redirect("/auth/signin?redirect=/vendor/dashboard");
  }

  await dbConnect();
  const cleanEmail = session.email.trim().toLowerCase();

  const vendor = await Vendor.findOne({
    email: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
  })
    .select("status name")
    .lean();

  if (!vendor) {
    try {
      await Vendor.create({
        name: `${cleanEmail.split("@")[0].toUpperCase()} Print Works`,
        contactName: cleanEmail.split("@")[0],
        email: cleanEmail,
        phone: "555-0199",
        status: "active",
        isAvailable: true,
        marketsCovered: ["All Markets"],
        categoriesFulfilled: ["Business Cards", "Post Cards", "Signs & Banners"],
      });
    } catch {
      // Ignore concurrent insert race
    }
  }

  return (
    <div className="admin-shell min-h-screen bg-gradient-to-b from-[#f6fafd] to-white font-sans text-zinc-900">
      {children}
    </div>
  );
}
