import Image from "next/image";
import Link from "next/link";
import cardImg1 from "@/public/xprint-photo-1.png";
import cardImg2 from "@/public/xprint-photo-2.png";
import cardImg3 from "@/public/xprint-photo-3.png";
import cardIcon1 from "@/public/image-icon-1.png";
import cardIcon2 from "@/public/image-icon-2.png";
import cardIcon3 from "@/public/image-icon-3.png";
import halfBg from "@/public/banners/half-bg.png";

export default function CorporateEcosystemSection() {
  const cards = [
    {
      badge: cardIcon1,
      title: "Design and build, by AxisBlu Intelligence.",
      img: cardImg1,
      desc: "Logo and brand identity, custom websites, ecommerce platforms, brand strategy, and go-to-market launch and marketing support.",
    },
    {
      badge: cardIcon2,
      title: "Print and produce, by Printgraphy.",
      img: cardImg2,
      desc: "Business and marketing print, corporate office supplies, and full-scale ecommerce product printing and packaging.",
    },
    {
      badge: cardIcon3,
      title: "Store and deliver, by OnePoint Services.",
      img: cardImg3,
      desc: "Warehousing, inventory storage, logistics, and shipping and delivery straight to your customers, first mile to last.",
    },
  ];

  return (
    <section className="w-full relative overflow-hidden bg-[#1c1d22]">
      {/* ── TOP DARK HALF ─────────────────────────────────────────────────── */}
      <div className="pt-20 pb-36 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Top Left Title & Pill */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-block">
              <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-base font-semibold tracking-wide">
                Printgraphy Corporate Services
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.12]">
              Everything a product brand needs, under one roof.
            </h2>

            <p className="text-[#e74b2d] font-bold text-base sm:text-lg">
              One ecosystem, from first sketch to final delivery
            </p>
          </div>

          {/* Top Right Description & Button */}
          <div className="lg:col-span-5 space-y-5 lg:pt-8">
            <p className="text-zinc-300 text-base sm:text-base leading-relaxed">
              Most agencies stop at the file handoff. Printgraphy doesn&apos;t, because the same operation that designs your brand also prints it, packages it, stores it, and gets it to your customer&apos;s door. It&apos;s one connected cycle, not a series of vendors you have to manage yourself.
            </p>

            <div>
              <Link
                href="/contact"
                className="inline-block px-7 py-3 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-bold rounded-xl text-base sm:text-base shadow-lg shadow-[#e74b2d]/30 transition-all hover:scale-[1.02] cursor-pointer"
              >
                Talk To Our Enterprise Team
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE 3 CARDS (OVERLAPPING TOP & BOTTOM HALF) ───────────────── */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mb-[180px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className="bg-white rounded-[28px] p-6 shadow-2xl border border-zinc-100 flex flex-col justify-between space-y-4 hover:shadow-3xl transition-all duration-300 group"
            >
              <div className="space-y-4">
                {/* Header Badge/Title */}
                <div className="flex items-center gap-3">
                  <Image src={card.badge} alt="badge" width={40} height={40} />
                  <h3 className="font-extrabold text-zinc-900 text-lg leading-snug group-hover:text-[#e74b2d] transition-colors">
                    {card.title}
                  </h3>
                </div>

                {/* Card Image */}
                <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-100">
                  <Image
                    src={card.img}
                    alt={card.title}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Description */}
                <p className="text-base text-zinc-500 leading-relaxed pt-1">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM HALF (BLUE BACKGROUND WITH IMAGE & OVERLAY) ──────────── */}
      <div className="relative w-full py-20 px-4 sm:px-6 lg:px-8  text-white text-center overflow-hidden pt-[240px]">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0 ">
          <Image
            src={halfBg}
            alt="Corporate Ecosystem Hub"
            fill
            className="object-cover object-center"
          />
        </div>

        {/* Color Gradient Overlay for vibrant blue */}
        {/* <div className="absolute inset-0 bg-gradient-to-b from-[#e74b2d]/90 via-[#c93e23]/95 to-[#c93e23]/95 z-0" /> */}

        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
          {/* Top Floating Highlight Banner */}
          <div className="inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-white text-[#e74b2d] text-base sm:text-2xl italic font-extrabold shadow-2xl border border-sky-100 max-w-full">
            <span className="text-base"><svg xmlns="http://www.w3.org/2000/svg" width="37" height="37" viewBox="0 0 47 47" fill="none">
<path d="M25.4591 5.8737C33.0966 5.8737 39.1674 11.9445 39.1674 19.582C39.1674 25.0654 36.0341 29.7654 31.3341 31.9195V41.1237H17.6258V35.2487H15.6674C13.5133 35.2487 11.7508 33.4862 11.7508 31.332V25.457H8.81325C8.02992 25.457 7.44242 24.4779 8.02992 23.8904L11.7508 18.9945C12.1424 11.5529 18.0174 5.8737 25.4591 5.8737ZM25.4591 1.95703C16.4508 1.95703 9.00909 8.61536 8.02992 17.4279L4.89659 21.5404C3.72159 23.107 3.72159 25.0654 4.50492 26.632C5.28825 28.0029 6.46325 28.982 7.83409 29.1779V31.332C7.83409 35.0529 10.3799 37.9904 13.7091 38.9695V45.0404H35.2508V34.2695C40.1466 30.9404 43.0841 25.6529 43.0841 19.582C43.0841 9.79037 35.2508 1.95703 25.4591 1.95703ZM27.4174 27.4154H23.5008V25.457H27.4174V27.4154ZM30.5508 18.6029C29.9633 19.3862 29.3758 20.1695 28.3966 20.757V23.4987H22.5216V20.757C19.7799 19.1904 18.8008 15.4695 20.3674 12.7279C21.9341 9.9862 25.6549 9.00703 28.3966 10.5737C31.1383 12.1404 32.1174 15.8612 30.5508 18.6029Z" fill="#e74b2d"/>
</svg></span>
            <span>One idea in, one product delivered, The cycle never leaves our hand.</span>
          </div>

          {/* Center Content */}
          <div className="space-y-4 pt-4">
            <div className="inline-block">
              <span className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-base font-semibold tracking-wide">
                How it connects back to the hub
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight max-w-4xl mx-auto leading-[1.15]">
              What you build here becomes what ships everywhere else.
            </h2>

            <p className="text-white/90 font-bold text-base sm:text-lg">
              Make your brand instantly recognizable
            </p>

            <p className="text-white/95 text-base sm:text-base leading-relaxed max-w-3xl mx-auto pt-2">
              Your brand system sets the standard your packaging is printed to. Your website is where your go-to-market work sends traffic, and your product itself moves through the same operation that designed it. Nothing built here lives in isolation, because nothing at Printgraphy does. It&apos;s one operating layer, one accountable partner, from your first logo file to the box on your customer&apos;s doorstep.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
