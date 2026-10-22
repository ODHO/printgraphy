import Image from "next/image";
import Link from "next/link";
import secondImg from "@/public/second-marketing-img.png";

export default function CustomWebsiteSection() {
  const features = [
    "Custom website design and development",
    "Responsive and mobile-first by default",
    "User experience built around your customer, not a template",
    "SEO-ready structure and fast, clean builds",
  ];

  return (
    <section className="relative w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* Left Column: Image with Soft Radial Glow */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            {/* Background Soft Radial Glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-sky-200/50 via-sky-100/40 to-transparent rounded-full blur-2xl pointer-events-none z-0" />

            <div className="relative z-10 w-full max-w-6xl">
              <Image
                src={secondImg}
                alt="Custom Website Showcase — High Converting Web Design"
                className="w-full h-auto object-contain drop-shadow-xl transform transition-transform duration-500 hover:scale-[1.02]"
                priority
              />
            </div>
          </div>

          {/* Right Column: Content */}
          <div className="lg:col-span-6 space-y-6 z-10">
            {/* Top Pill Badge */}
            <div className="inline-block">
              <span className="px-4 py-1.5 rounded-full bg-[#EAF5FB] border border-[#329AD4]/30 text-[#329AD4] text-base font-bold tracking-wide shadow-2xs">
                Custom Website
              </span>
            </div>

            {/* Main Section Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight leading-[1.12]">
              A site that converts, not just exists.
            </h2>

            {/* Sub-tagline */}
            <p className="text-[#329AD4] font-bold text-lg sm:text-xl tracking-tight">
              Your business, built for the web
            </p>

            {/* Body Paragraph */}
            <p className="text-zinc-600 text-base sm:text-base leading-relaxed">
              Our website is your storefront before a customer ever sees the product. We design and develop custom sites optimized for how people actually shop, from first click to checkout, so the site does its job instead of just sitting there.
            </p>

            {/* Feature Checkmarks List */}
            <ul className="space-y-3.5 pt-2">
              {features.map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-zinc-800 font-bold text-base sm:text-base">
                  {/* Double Check Icon SVG */}
                  <span className="shrink-0 text-[#329AD4]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12L7.25 17L9.875 14M8 12L13.25 17L22 7M16 7L12.5 11" stroke="#329AD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Action Button */}
            <div className="pt-4">
              <Link
                href="/quote"
                className="inline-block px-8 py-3.5 bg-[#329AD4] hover:bg-[#2884b8] text-white font-bold rounded-md text-base sm:text-base shadow-lg shadow-[#329AD4]/30 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer text-center"
              >
                Start Your Website
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
