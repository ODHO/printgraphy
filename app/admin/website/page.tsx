import Link from "next/link";
import { Icon, PageHeader, TONES, cx, type IconName, type Tone } from "@/components/admin/ui";

const ITEMS: { href: string; title: string; body: string; icon: IconName; tone: Tone }[] = [
  {
    href: "/admin/website/home",
    title: "Home page",
    body: "Hero, collections, tools, new-in, logo banner, and social photos.",
    icon: "banners",
    tone: "brand",
  },
  {
    href: "/admin/header-menu",
    title: "Header & Footer Menu",
    body: "Links shown in the site header and footer.",
    icon: "menu",
    tone: "indigo",
  },
  {
    href: "/admin/pages",
    title: "Custom Pages (CMS)",
    body: "About, policies, and other pages you publish.",
    icon: "pages",
    tone: "violet",
  },
  {
    href: "/admin/quotes",
    title: "Quotes",
    body: "Quote requests submitted from the website.",
    icon: "quotes",
    tone: "amber",
  },
  {
    href: "/admin/coupons",
    title: "Coupons & Promos",
    body: "Discount codes and promotional offers.",
    icon: "tag",
    tone: "green",
  },
  {
    href: "/admin/email",
    title: "Email",
    body: "SMTP, admin inbox, and order, quote, and review templates.",
    icon: "mail",
    tone: "sky",
  },
];

export default function WebsiteAdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon="globe" title="Website" description="Home page content, menus, pages, quotes, and promotions." />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {ITEMS.map((item) => {
          const t = TONES[item.tone];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "group relative flex flex-col rounded-2xl border bg-gradient-to-br p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md",
                t.card
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm", t.chip)}>
                  <Icon name={item.icon} className="w-5 h-5" />
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 transition-colors group-hover:bg-white group-hover:text-[#2884b8]">
                  <Icon name="chevronRight" className="w-4 h-4" strokeWidth={2.2} />
                </span>
              </div>
              <h2 className="mt-4 text-sm font-semibold text-zinc-900">{item.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.body}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
