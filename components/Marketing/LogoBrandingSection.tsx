import Image from "next/image";
import Link from "next/link";
import logoBrandingImg from "@/public/logo-branding.png";

export default function LogoBrandingSection() {
  const features = [
    "Custom logo concepts and identity systems",
    "Full brand identity design, not just a mark",
    "Multiple design directions to choose from",
    "Complete brand guidelines and high-resolution files",
  ];

  return (
    <section className="relative w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* Left Column: Content */}
          <div className="lg:col-span-6 space-y-6 z-10">
            {/* Top Pill Badge */}
            <div className="inline-block">
              <span className="px-4 py-1.5 rounded-full bg-[#EAF5FB] border border-[#329AD4]/30 text-[#329AD4] text-base font-bold tracking-wide shadow-2xs">
                Logo & Brand Identity
              </span>
            </div>

            {/* Main Section Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight leading-[1.12]">
              A mark worth building a business around.
            </h2>

            {/* Sub-tagline */}
            <p className="text-[#329AD4] font-bold text-lg sm:text-xl tracking-tight">
              Make your brand instantly recognizable
            </p>

            {/* Body Paragraph */}
            <p className="text-zinc-600 text-base sm:text-base leading-relaxed">
              A logo is more than a symbol, it&apos;s the foundation of your brand. We work closely with you to understand your core values and translate them into a distinct identity that sets you apart from the competition, and holds up across packaging, print, and screen.
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
                Start Your Brand Identity
              </Link>
            </div>
          </div>

          {/* Right Column: Image */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <div className="relative z-10 w-full max-w-xl rounded-[28px] overflow-hidden shadow-xl border border-white bg-white">
              <Image
                src={logoBrandingImg}
                alt="Logo & Brand Identity Showcase — Helos Brand Identity System"
                className="w-full h-auto object-cover transform transition-transform duration-500 hover:scale-[1.02]"
                priority
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
