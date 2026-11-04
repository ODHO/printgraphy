import Link from "next/link";
import { Icon, PageHeader, type IconName } from "@/components/admin/ui";

const ITEMS: {
  href: string;
  title: string;
  body: string;
  icon: IconName;
  chip: string;
  card: string;
}[] = [
  {
    href: "/admin/website/home",
    title: "Home page",
    body: "Hero, collections, top sellers, gift promo, newsletter, spotlight, and services.",
    icon: "banners",
    chip: "bg-[#329AD4] text-white",
    card: "from-[#EAF5FB] to-white border-[#dbeefb]",
  },
  {
    href: "/admin/website/footer",
    title: "Footer content",
    body: "Logo, tagline, Trustpilot, payments, social links, and legal bar.",
    icon: "menu",
    chip: "bg-indigo-500 text-white",
    card: "from-indigo-50 to-white border-indigo-100",
  },
  {
    href: "/admin/header-menu",
    title: "Header & Footer Menu",
    body: "Header nav and footer link columns (Let Us Help, Our Company, …).",
    icon: "layers",
    chip: "bg-zinc-700 text-white",
    card: "from-zinc-50 to-white border-zinc-200",
  },
  {
    href: "/admin/pages",
    title: "Custom Pages (CMS)",
    body: "About, policies, and other pages you publish.",
    icon: "pages",
    chip: "bg-violet-500 text-white",
    card: "from-violet-50 to-white border-violet-100",
  },
  {
    href: "/admin/quotes",
    title: "Quotes",
    body: "Quote requests submitted from the website.",
    icon: "quotes",
    chip: "bg-amber-500 text-white",
    card: "from-amber-50 to-white border-amber-100",
  },
  {
    href: "/admin/coupons",
    title: "Coupons & Promos",
    body: "Discount codes and promotional offers.",
    icon: "tag",
    chip: "bg-emerald-500 text-white",
    card: "from-emerald-50 to-white border-emerald-100",
  },
  {
    href: "/admin/email",
    title: "Email",
    body: "SMTP, admin inbox, and order, quote, and review templates.",
    icon: "mail",
    chip: "bg-[#329AD4] text-white",
    card: "from-[#EAF5FB] to-white border-[#dbeefb]",
  },
];

export default function WebsiteAdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon="globe" title="Website" description="Home page content, menus, pages, quotes, and promotions." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex flex-col rounded-2xl border bg-gradient-to-br p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${item.card}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${item.chip}`}
              >
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 transition-colors group-hover:bg-white group-hover:text-[#2884b8]">
                <Icon name="chevronRight" className="h-4 w-4" strokeWidth={2.2} />
              </span>
            </div>
            <h2 className="mt-4 text-sm font-semibold text-zinc-900">{item.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
