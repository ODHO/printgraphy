import Image from "next/image";
import Link from "next/link";
import socialMediaImg from "@/public/social-media-marketing.png";

export default function SocialMediaSection() {
  const features = [
    "Social media management and content creation",
    "Brand-aligned content across every platform",
    "Audience engagement and community strategy",
    "Performance insights and reporting",
  ];

  return (
    <section className="relative w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* Left Column: Image */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            {/* Background Soft Glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-sky-100/60 via-sky-50/40 to-transparent rounded-full blur-2xl pointer-events-none z-0" />

            <div className="relative z-10 w-full max-w-xl">
              <Image
                src={socialMediaImg}
                alt="Social Media Marketing & Content Strategy Showcase"
                className="w-full h-auto object-contain  transform transition-transform duration-500 hover:scale-[1.02]"
                priority
              />
            </div>
          </div>

          {/* Right Column: Content */}
          <div className="lg:col-span-6 space-y-6 z-10">
            {/* Top Pill Badge */}
            <div className="inline-block">
              <span className="px-4 py-1.5 rounded-full bg-[#E8EEFD] border border-[#2196D2]/30 text-[#2196D2] text-base font-bold tracking-wide shadow-2xs">
                Social Media
              </span>
            </div>

            {/* Main Section Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight leading-[1.12]">
              Content and strategy that actually moves the needle.
            </h2>

            {/* Sub-tagline */}
            <p className="text-[#2196D2] font-bold text-lg sm:text-xl tracking-tight">
              Turn social media into growth
            </p>

            {/* Body Paragraph */}
            <p className="text-zinc-600 text-base sm:text-base leading-relaxed">
              We help you build a strong, cohesive online presence across the platforms your audience is already on, driving real engagement instead of vanity metrics, so the voice you build in social matches the brand you built everywhere else.
            </p>

            {/* Feature Checkmarks List */}
            <ul className="space-y-3.5 pt-2">
              {features.map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-zinc-800 font-bold text-base sm:text-base">
                  {/* Double Check Icon SVG */}
                  <span className="shrink-0 text-[#2196D2]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12L7.25 17L9.875 14M8 12L13.25 17L22 7M16 7L12.5 11" stroke="#2196D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                className="inline-block px-8 py-3.5 bg-[#2196D2] hover:bg-[#1B85BD] text-white font-bold rounded-md text-base sm:text-base shadow-lg shadow-[#2196D2]/30 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer text-center"
              >
                Grow Your Social Presence
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
