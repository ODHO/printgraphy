import Link from "next/link";
import type { HomepageContent } from "@/lib/homepageContent";

const ICON_PATHS: Record<string, string> = {
  briefcase: "M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M4 7h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7zm4 5h8",
  palette:
    "M12 3a9 9 0 00-1 17.9c.5.1.9-.3.9-.8v-.8a1.8 1.8 0 011.8-1.8h2.1A3 3 0 0020 14.5 9 9 0 0012 3zm-4.5 7a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm3-3a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm4 0a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm2.5 3a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4z",
  box: "M21 8l-9-5-9 5v8l9 5 9-5V8zm-9 5l9-5m-9 5V21m0-8L3 8",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0",
  chip: "M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 7h10v10H7V7zm3 3h4v4h-4v-4z",
  globe:
    "M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 3.5-5.5 3.5-9S14.5 5.5 12 3m0 18c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3M3.5 9h17M3.5 15h17",
};

function ServiceIcon({ name }: { name: string }) {
  const d = ICON_PATHS[name] || ICON_PATHS.briefcase;
  return (
    <svg className="h-6 w-6 text-[#004EE0]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function ServicesSupport({ tools }: { tools: HomepageContent["tools"] }) {
  const items = tools.items || [];

  return (
    <section className="bg-[#f5f6f8] py-12 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-tight text-[#042E7B] sm:text-3xl md:text-[2rem]">
            {tools.title}
          </h2>
          <Link
            href={tools.seeAllHref || "/quote"}
            className="inline-flex shrink-0 items-center gap-1.5 pt-1 text-sm font-semibold text-[#004EE0] transition hover:text-[#042E7B]"
          >
            {tools.seeAllLabel || "See all services"}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {items.map((item, idx) => (
            <Link
              key={`${item.label}-${idx}`}
              href={item.href || "/quote"}
              className="group rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#99CAFF] sm:p-7"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3F2FF]">
                <ServiceIcon name={item.icon} />
              </div>
              <h3 className="text-base font-bold text-[#111827] transition group-hover:text-[#004EE0] sm:text-[17px]">
                {item.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5b6472]">{item.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
