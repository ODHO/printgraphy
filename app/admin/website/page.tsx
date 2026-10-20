import Link from "next/link";

const ITEMS = [
  {
    href: "/admin/website/home",
    title: "Home page",
    body: "Hero, collections, tools, new-in, logo banner, and social photos.",
  },
  {
    href: "/admin/header-menu",
    title: "Header & Footer Menu",
    body: "Links shown in the site header and footer.",
  },
  {
    href: "/admin/pages",
    title: "Custom Pages (CMS)",
    body: "About, policies, and other pages you publish.",
  },
  {
    href: "/admin/quotes",
    title: "Quotes",
    body: "Quote requests submitted from the website.",
  },
  {
    href: "/admin/coupons",
    title: "Coupons & Promos",
    body: "Discount codes and promotional offers.",
  },
  {
    href: "/admin/email",
    title: "Email",
    body: "SMTP, admin inbox, and order, quote, and review templates.",
  },
];

export default function WebsiteAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Website</h1>
        <p className="mt-1 text-base text-zinc-500">Home page content, menus, pages, quotes, and promotions.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-zinc-200 bg-white p-5 hover:border-[#064FE0] hover:shadow-sm transition-all"
          >
            <h2 className="text-base font-bold text-zinc-900">{item.title}</h2>
            <p className="mt-1 text-base text-zinc-500 leading-relaxed">{item.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
