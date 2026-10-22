import Image from "next/image";
import whyBuildImg from "@/public/why-printgraphi-build.png";
import ellipseRightImg from "@/public/ellipse-right.png";

export default function WhyPrintgraphiBuilds() {
  return (
    <section className="relative w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#FFFDF9] via-[#FAF6F0] to-[#EAF5FB] overflow-hidden">
      {/* Top Right Corner Background Blush Ball Image */}
      <div className="absolute top-0 right-0 pointer-events-none z-0 w-full max-w-[600px] h-full overflow-hidden flex justify-end">
        <Image
          src={ellipseRightImg}
          alt="Background Blush"
          className="object-contain object-top-right opacity-90 max-h-[700px] w-auto"
          priority
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Top Pill Badge */}
            <div className="inline-block">
              <span className="px-4 py-1.5 rounded-full bg-[#EAF5FB] border border-[#329AD4]/30 text-[#329AD4] text-base font-bold tracking-wide shadow-2xs">
                Why Printgraphy builds this too
              </span>
            </div>

            {/* Main Section Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight leading-[1.12]">
              Your brand and your product should never be run by strangers to each other.
            </h2>

            {/* Body Text */}
            <p className="text-zinc-600 text-base sm:text-base leading-relaxed max-w-xl">
              A logo from one studio, a website from another, print and packaging from a third, and none of them talk. Printgraphy closes that gap. Digital and brand work here is designed, built, and run by AxisBlu Intelligence, our technology partner and the team behind this site, on the same operating layer that runs your print, packaging, and fulfillment. What you build here shows up correctly everywhere else your product does.
            </p>

            {/* Sub-tagline in Blue Italic */}
            <div className="pt-2">
              <p className="text-[#329AD4] font-bold text-base sm:text-lg italic tracking-tight">
                One brand system. One operating layer. Every stage in sync.
              </p>
            </div>
          </div>

          {/* Right Image Column */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg lg:max-w-none rounded-[32px] overflow-hidden shadow-2xl border border-white/80 bg-white">
              <Image
                src={whyBuildImg}
                alt="Why Printgraphy builds custom brand solutions"
                className="w-full h-auto object-cover rounded-[32px] transform transition-transform duration-500 hover:scale-[1.02]"
                priority
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
