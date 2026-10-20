import Link from "next/link";
import Image from "next/image";
import bgImage from "@/public/banners/marketing-banner.png";

export default function MarketingHero() {
  return (
    <section className="relative w-full min-h-[620px] lg:min-h-[700px] flex items-center justify-center overflow-hidden bg-zinc-950 py-20 px-4 sm:px-6 lg:px-8">
      {/* Background Image with Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src={bgImage}
          alt="Marketing & Brand Strategy"
          fill
          priority
          className="object-cover object-center opacity-40 mix-blend-luminosity scale-105"
        />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-6xl mx-auto text-center space-y-6 pt-6">
        {/* Top Pill Badge */}
        <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-base sm:text-base font-medium tracking-wide shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21" fill="none">
            <path
              d="M20.125 16.5309V15.0934H18.6156C18.5437 14.6621 18.3281 14.2309 18.1125 13.7996L19.1906 12.7215L18.1844 11.7153L17.1062 12.7934C16.7469 12.5778 16.3156 12.3621 15.8125 12.2903V10.7809H14.375V12.2903C13.9437 12.3621 13.5125 12.5778 13.0813 12.7934L12.0031 11.7153L10.9969 12.7215L12.075 13.7996C11.8594 14.159 11.6438 14.5903 11.5719 15.0934H10.0625V16.5309H11.5719C11.6438 16.9621 11.8594 17.3934 12.075 17.8246L10.9969 18.9028L12.0031 19.909L13.0813 18.8309C13.4406 19.0465 13.8719 19.2621 14.375 19.334V20.8434H15.8125V19.334C16.2438 19.2621 16.675 19.0465 17.1062 18.8309L18.1844 19.909L19.1906 18.9028L18.1125 17.8246C18.3281 17.4653 18.5437 17.034 18.6156 16.5309H20.125ZM15.0938 17.9684C13.8719 17.9684 12.9375 17.034 12.9375 15.8121C12.9375 14.5903 13.8719 13.6559 15.0938 13.6559C16.3156 13.6559 17.25 14.5903 17.25 15.8121C17.25 17.034 16.3156 17.9684 15.0938 17.9684ZM14.0048 3.68394L7.53609 0.0901928C7.42943 0.0310381 7.30947 0 7.1875 0C7.06553 0 6.94557 0.0310381 6.83891 0.0901928L0.370156 3.68394C0.258039 3.74612 0.164594 3.83716 0.0995081 3.94761C0.0344226 4.05807 6.59269e-05 4.18393 6.09923e-10 4.31213V11.4996C-5.27727e-06 11.6278 0.034243 11.7536 0.0991983 11.864C0.164154 11.9745 0.257454 12.0655 0.369437 12.1278L6.83819 15.7216C6.9476 15.7824 7.071 15.8136 7.19618 15.8121C7.32136 15.8106 7.44398 15.7764 7.55188 15.7129C7.65979 15.6495 7.74925 15.5589 7.81141 15.4503C7.87356 15.3416 7.90626 15.2186 7.90625 15.0934V8.32851L12.9375 5.53401V8.62463H14.375V4.31213C14.3749 4.18393 14.3406 4.05807 14.2755 3.94761C14.2104 3.83716 14.117 3.74612 14.0048 3.68394ZM7.1875 1.54063L12.1763 4.31213L7.1875 7.08363L2.19937 4.31213L7.1875 1.54063ZM1.4375 11.0763V5.53401L6.46875 8.32994V13.8715L1.4375 11.0763Z"
              fill="white"
            />
          </svg>
          <span>Build and brand, powered by AxisBlu Intelligence</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.15] tracking-tight mx-auto">
          The Brand And The <span className="text-[#064FE0]">Digital</span>{" "}
          <span className="text-[#064FE0]">Presence</span> Behind The Product.
        </h1>

        {/* Subtitle Paragraph */}
        <p className="text-base sm:text-base md:text-lg text-zinc-200 font-normal max-w-3xl mx-auto leading-relaxed pt-2">
          Websites, identity, and brand strategy, built by the same technology team that runs the Printgraphy operating layer. Design that&apos;s ready to sell the moment your product is ready to ship.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 max-w-md mx-auto sm:max-w-none">
          <Link
            href="/quote"
            className="w-full sm:w-auto px-8 py-3.5 bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold rounded-md text-base sm:text-base shadow-lg shadow-[#064FE0]/30 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] text-center cursor-pointer"
          >
            Start A Project
          </Link>

          <Link
            href="/contact"
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-md text-base sm:text-base shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] text-center cursor-pointer"
          >
            Book A Consultation
          </Link>
        </div>
      </div>
    </section>
  );
}
