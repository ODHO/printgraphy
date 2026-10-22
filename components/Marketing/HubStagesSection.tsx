import Image from "next/image";
import Link from "next/link";
import cardIcon1 from "@/public/design-and-brand-icon.png";
import cardIcon2 from "@/public/print-products-icon.png";
import cardIcon3 from "@/public/store-delivery-icon.png";
import bgHubStage from "@/public/banners/bg-hub-stage.png";
import bgMoved from "@/public/made-and-move-as-one.png";
import bgEllipse from "@/public/ellipse-left.png";

export default function HubStagesSection() {
  const stages = [
    {
      icon: cardIcon1,
      title: "Design and brand, by AxisBlu.",
      desc: "Logo design, brand identity, custom websites, ecommerce builds, and the launch and marketing strategy that gets you to market.",
    },
    {
      icon: cardIcon2,
      title: "Print and produce, by Printgraphy.",
      desc: "Business and marketing print, corporate office supplies, and full-scale ecommerce product printing and packaging.",
    },
    {
      icon: cardIcon3,
      title: "Store and deliver, by OPS",
      desc: "Warehousing, inventory storage, logistics, and shipping and delivery straight to your customers, first mile to last.",
    },
  ];

  return (
    <section className="relative w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5] overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-16 sm:space-y-24">

        {/* ── TOP 3 STAGES GRID SECTION ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* Left Column: Heading & Description */}
          <div className="lg:col-span-5 space-y-6">
            {/* Top Pill Badge */}
            <div className="inline-block">
              <span className="px-4 py-1.5 rounded-full bg-[#EAF5FB] border border-[#329AD4]/30 text-[#329AD4] text-base font-bold tracking-wide shadow-2xs">
                One hub, three stages, zero handoffs
              </span>
            </div>

            {/* Main Section Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight leading-[1.12]">
              From first sketch to final delivery, it never leaves the family.
            </h2>

            {/* Body Paragraph */}
            <p className="text-zinc-600 text-base sm:text-base leading-relaxed max-w-xl">
              Most companies make you stitch together a designer, a printer, and a shipping provider yourself, and manage the gaps between them. Printgraphy was built so you never have to. One hub carries your product through every stage of its life.
            </p>
          </div>

          {/* Right Column: Stack of 3 Feature Cards */}
          <div className="lg:col-span-7 space-y-4">
            {stages.map((stage, i) => (
              <div
                key={i}
                className="bg-gradient-to-r from-white via-sky-50/30 to-[#EAF5FB]/60 border border-sky-200/80 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md hover:border-[#329AD4]/50 transition-all duration-300 flex items-start gap-4 sm:gap-5 group"
              >
                {/* Icon Image */}
                <div className="w-16 h-16 flex items-center justify-center shrink-0 p-1 group-hover:scale-110 transition-transform">
                  <Image
                    src={stage.icon}
                    alt={stage.title}
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                </div>

                {/* Text Details */}
                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-[#329AD4] font-extrabold text-lg sm:text-xl tracking-tight leading-snug">
                    {stage.title}
                  </h3>
                  <p className="text-zinc-600 text-base sm:text-base leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ── SUB-SECTION 1: DARK BANNER CARD ────────────────────────────────── */}
        <div className=" relative z-1 rounded-[28px] overflow-hidden shadow-2xl bg-zinc-950 border border-zinc-800 text-white p-8 sm:p-12">
          {/* Background Image Overlay */}
          <div className="absolute inset-0 z-0">
            <Image
              src={bgHubStage}
              alt="Built for brands at every stage of growth"
              fill
              className="object-cover object-center "
            />
            {/* <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/85 to-zinc-950/95" /> */}
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Headline */}
            <div className="lg:col-span-6">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold italic leading-snug tracking-tight text-white">
                Built for brands at every stage of growth, whether it&apos;s your first logo file or your millionth unit shipped.
              </h3>
            </div>

            {/* Right 4 Bullet Items */}
            <div className="lg:col-span-6 space-y-4">
              {[
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_2737_3257)">
                        <path d="M11.2508 18.3L3.72076 16.3L6.72076 15.52C6.91279 15.4705 7.07741 15.347 7.1786 15.1765C7.2798 15.0059 7.30934 14.8023 7.26076 14.61C7.20905 14.4172 7.08357 14.2525 6.91143 14.1515C6.73928 14.0504 6.5343 14.0212 6.34076 14.07L0.810763 15.54C0.639115 15.5843 0.488694 15.6879 0.386182 15.8325C0.28367 15.9771 0.235693 16.1534 0.250763 16.33V20.83C0.251386 21.0006 0.310185 21.166 0.417453 21.2987C0.52472 21.4314 0.674042 21.5236 0.840763 21.56L11.2508 23.82V18.3ZM23.7508 16.27C23.7501 16.1038 23.6949 15.9425 23.5938 15.8106C23.4926 15.6788 23.3511 15.5837 23.1908 15.54L17.7008 14.1C17.5072 14.0512 17.3022 14.0804 17.1301 14.1815C16.958 14.2825 16.8325 14.4472 16.7808 14.64C16.7322 14.8323 16.7617 15.0359 16.8629 15.2065C16.9641 15.377 17.1287 15.5005 17.3208 15.55L20.1008 16.28L12.7508 18.28V23.81L23.1608 21.55C23.3275 21.5136 23.4768 21.4214 23.5841 21.2887C23.6913 21.156 23.7501 20.9906 23.7508 20.82V16.27ZM16.4608 9.33C16.2227 10.2318 15.8411 11.0894 15.3308 11.87C15.6983 12.0908 16.0347 12.3599 16.3308 12.67C16.42 12.7611 16.5338 12.8243 16.6582 12.8521C16.7827 12.8799 16.9125 12.8711 17.032 12.8267C17.1516 12.7822 17.2557 12.7041 17.3318 12.6018C17.4078 12.4994 17.4526 12.3773 17.4608 12.25C17.5121 11.7201 17.4494 11.1854 17.277 10.6817C17.1045 10.1781 16.8262 9.71716 16.4608 9.33ZM7.54076 9.33C7.17535 9.71716 6.89705 10.1781 6.72457 10.6817C6.55208 11.1854 6.48941 11.7201 6.54076 12.25C6.54888 12.3773 6.59369 12.4994 6.66977 12.6018C6.74585 12.7041 6.84995 12.7822 6.96948 12.8267C7.08902 12.8711 7.21886 12.8799 7.34331 12.8521C7.46776 12.8243 7.5815 12.7611 7.67076 12.67C7.96687 12.3599 8.30319 12.0908 8.67076 11.87C8.16038 11.0894 7.77885 10.2318 7.54076 9.33ZM12.0008 0C12.0008 0 8.50076 1.75 8.50076 5.25C8.50076 7.18 9.08076 12.25 12.0008 12.25C14.9208 12.25 15.5008 7.18 15.5008 5.25C15.5008 1.75 12.0008 0 12.0008 0ZM12.0008 6.5C11.7274 6.50198 11.4596 6.42273 11.2314 6.27231C11.0031 6.12188 10.8247 5.90705 10.7187 5.65507C10.6127 5.40309 10.584 5.12531 10.6361 4.85696C10.6882 4.58861 10.8188 4.34178 11.0114 4.14778C11.204 3.95379 11.4499 3.82136 11.7178 3.76729C11.9858 3.71323 12.2638 3.73997 12.5165 3.84412C12.7693 3.94827 12.9854 4.12513 13.1375 4.35228C13.2896 4.57944 13.3708 4.84664 13.3708 5.12C13.3721 5.30075 13.3376 5.47998 13.2694 5.64735C13.2011 5.81472 13.1004 5.96693 12.9731 6.09521C12.8457 6.22348 12.6942 6.32529 12.5274 6.39477C12.3605 6.46424 12.1815 6.5 12.0008 6.5ZM12.0008 13.33C11.6295 13.33 11.2734 13.4775 11.0108 13.7401C10.7483 14.0026 10.6008 14.3587 10.6008 14.73C10.6008 15.51 11.2308 17.37 12.0008 17.37C12.7708 17.37 13.4008 15.51 13.4008 14.73C13.4008 14.3587 13.2533 14.0026 12.9907 13.7401C12.7282 13.4775 12.3721 13.33 12.0008 13.33Z" fill="#329AD4"/>
                      </g>
                      <defs>
                        <clipPath id="clip0_2737_3257">
                          <rect width="24" height="24" fill="white"/>
                        </clipPath>
                      </defs>
                    </svg>
                  ),
                  text: "Startups and first-time founders building a brand from zero"
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5.66172 20.4662H8.42547V17.7062H5.66172V20.4662ZM3.35172 15.3962V17.7062H5.66172V15.3962H3.35172ZM20.8342 9.03246C19.9717 6.24996 17.7442 4.03371 14.9617 3.15996C8.58297 1.16871 2.69922 5.91246 2.69922 11.995H6.29172C6.29172 8.17746 10.0792 5.22621 14.0955 6.68121C15.5842 7.21746 16.7767 8.40996 17.313 9.89496C18.7792 13.9075 15.8242 17.6875 12.0105 17.695V17.7062H11.9992V21.2987C18.0967 21.2987 22.8292 15.4187 20.8342 9.03246ZM12.0105 17.695V14.1212H8.42547V17.7062H11.9992V17.695H12.0105Z" fill="#329AD4"/>
                    </svg>
                  ),
                  text: "Ecommerce and DTC brands scaling their digital presence"
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M16.8818 9.51655L12.3818 6.85405C12.2661 6.7858 12.1342 6.74987 11.9999 6.75C11.8656 6.75013 11.7338 6.78633 11.6183 6.8548L7.11825 9.5173C7.00615 9.58359 6.91325 9.67792 6.84868 9.79102C6.78411 9.90411 6.7501 10.0321 6.75 10.1623V15.3373C6.75 15.6028 6.89025 15.8481 7.11825 15.9823L11.6183 18.6448C11.7336 18.7139 11.8655 18.7505 12 18.7505C12.1345 18.7505 12.2664 18.7139 12.3818 18.6448L16.8818 15.9823C16.9938 15.916 17.0868 15.8217 17.1513 15.7086C17.2159 15.5955 17.2499 15.4675 17.25 15.3373V10.1623C17.25 10.0319 17.2161 9.90383 17.1515 9.79059C17.0869 9.67735 16.994 9.5829 16.8818 9.51655ZM15.75 14.9098L12 17.1283L8.25 14.9098V10.5898L12 8.3713L15.75 10.5898V14.9098Z" fill="#329AD4"/>
                      <path d="M4.5 15.138V8.3025L9.15 5.5545L8.38725 4.263L3.36825 7.22925C3.25604 7.2956 3.16307 7.39005 3.09849 7.50329C3.03392 7.61653 2.99997 7.74464 3 7.875V15.138C2.56282 15.2926 2.18407 15.5784 1.91557 15.9565C1.64706 16.3345 1.50192 16.7863 1.5 17.25C1.5 18.4905 2.5095 19.5 3.75 19.5C4.9905 19.5 6 18.4905 6 17.25C5.99808 16.7863 5.85294 16.3345 5.58443 15.9565C5.31593 15.5784 4.93718 15.2926 4.5 15.138ZM3.75 18C3.55689 17.9914 3.7455 17.9086 3.24096 17.7689C3.10736 17.6292 3.0328 17.4433 3.0328 17.25C3.0328 17.0567 3.10736 16.8708 3.24096 16.7311C3.37455 16.5914 3.55689 16.5086 3.75 16.5C3.94311 16.5086 4.12545 16.5914 4.25904 16.7311C4.39264 16.8708 4.4672 17.0567 4.4672 17.25C4.4672 17.4433 4.39264 17.6292 4.25904 17.7689C4.12545 17.9086 3.94311 17.9914 3.75 18ZM20.25 15C19.0095 15 18 16.0095 18 17.25C18 17.5147 18.054 17.7653 18.1387 18.0015L12 21.6285L7.197 18.7905L6.43425 20.082L11.6183 23.145C11.7338 23.2135 11.8656 23.2497 11.9999 23.2498C12.1342 23.2499 12.2661 23.214 12.3818 23.1458L19.1017 19.1745C19.4392 19.3762 19.8293 19.5 20.25 19.5C21.4905 19.5 22.5 18.4905 22.5 17.25C22.5 16.0095 21.4905 15 20.25 15ZM20.25 18C20.0569 17.9914 19.8746 17.9086 19.741 17.7689C19.6074 17.6292 19.5328 17.4433 19.5328 17.25C19.5328 17.0567 19.6074 16.8708 19.741 16.7311C19.8746 16.5914 20.0569 16.5086 20.25 16.5C20.4431 16.5086 20.6254 16.5914 20.759 16.7311C20.8926 16.8708 20.9672 17.0567 20.9672 17.25C20.9672 17.4433 20.8926 17.6292 20.759 17.7689C20.6254 17.9086 20.4431 17.9914 20.25 18ZM12 5.25C12.5483 5.25 13.044 5.04525 13.4348 4.719L19.5 8.30325V13.5H21V7.875C21 7.74464 20.9661 7.61653 20.9015 7.50329C20.8369 7.39005 20.744 7.2956 20.6318 7.22925L14.2065 3.43275C14.2345 3.29275 14.249 3.1485 14.25 3C14.25 1.7595 13.2405 0.75 12 0.75C10.7595 0.75 9.75 1.7595 9.75 3C9.75 4.2405 10.7595 5.25 12 5.25ZM12 2.25C12.1485 2.24985 12.2938 2.29378 12.4174 2.37621C12.541 2.45865 12.6373 2.57589 12.6942 2.7131C12.7511 2.85032 12.7661 3.00133 12.7371 3.14703C12.7082 3.29273 12.6366 3.42657 12.5316 3.53161C12.4266 3.63665 12.2927 3.70817 12.147 3.73711C12.0013 3.76605 11.8503 3.75112 11.7131 3.69421C11.5759 3.63729 11.4586 3.54095 11.3762 3.41738C11.2938 3.2938 11.2499 3.14855 11.25 3C11.25 2.586 11.5868 2.25 12 2.25Z" fill="#329AD4"/>
                    </svg>
                  ),
                  text: "Retail and product businesses that need print and digital in sync"
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 21" fill="none">
                      <path d="M5.25 1.19624e-06C5.15134 2.20983e-05 5.05365 0.0195094 4.96253 0.0573466C4.87141 0.0951839 4.78866 0.150627 4.719 0.220501L0.219 4.7205C0.114355 4.82547 0.0431604 4.9591 0.0144065 5.10451C-0.0143474 5.24991 0.000628553 5.40058 0.0574434 5.53748C0.114258 5.67438 0.210364 5.79138 0.333626 5.8737C0.456888 5.95602 0.601777 5.99997 0.75 6H1.5V18H0.75C0.551088 18 0.360322 18.079 0.21967 18.2197C0.0790176 18.3603 0 18.5511 0 18.75C0 18.9489 0.0790176 19.1397 0.21967 19.2803C0.360322 19.421 0.551088 19.5 0.75 19.5H1.5V20.25C1.5 20.4489 1.57902 20.6397 1.71967 20.7803C1.86032 20.921 2.05109 21 2.25 21H17.25C17.282 21.001 17.3145 20.999 17.3475 20.994C17.528 20.9703 17.6938 20.8818 17.8139 20.7449C17.9339 20.608 18.0001 20.4321 18 20.25V19.5H18.75C18.9489 19.5 19.1397 19.421 19.2803 19.2803C19.421 19.1397 19.5 18.9489 19.5 18.75C19.5 18.5511 19.421 18.3603 19.2803 18.2197C19.1397 18.079 18.9489 18 18.75 18H18V6H18.75C18.8985 6.00027 19.0438 5.95642 19.1674 5.87403C19.291 5.79164 19.3873 5.67441 19.4442 5.5372C19.5011 5.39999 19.5159 5.24898 19.4869 5.10331C19.4578 4.95765 19.3862 4.8239 19.281 4.719L14.781 0.219001C14.7112 0.149399 14.6284 0.0942313 14.5373 0.0566537C14.4462 0.0190762 14.3486 -0.000174824 14.25 1.19624e-06H12.1605L15.0525 4.5H11.517L10.5525 1.19624e-06H8.9475L7.983 4.5H4.4475L7.3395 1.19624e-06H5.25ZM3 6H16.5V18H3V6ZM8.25 9C8.11067 9.00015 7.97414 9.0391 7.85571 9.11248C7.73729 9.18587 7.64164 9.2908 7.5795 9.4155L4.5795 15.4155C4.52255 15.5298 4.49572 15.6567 4.50156 15.7843C4.50739 15.9118 4.5457 16.0358 4.61285 16.1444C4.68 16.253 4.77377 16.3427 4.88527 16.4049C4.99677 16.4671 5.12231 16.4999 5.25 16.5H14.25C14.3777 16.4999 14.5032 16.4671 14.6147 16.4049C14.7262 16.3427 14.82 16.253 14.8871 16.1444C14.9543 16.0358 14.9926 15.9118 14.9984 15.7843C15.0043 15.6567 14.9774 15.5298 14.9205 15.4155L11.9205 9.4155C11.8584 9.2908 11.7627 9.18587 11.6443 9.11248C11.5259 9.0391 11.3893 9.00015 11.25 9H8.25Z" fill="#329AD4"/>
                    </svg>
                  ),
                  text: "Corporate and enterprise teams consolidating vendors into one accountable partner"
                },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3.5">
                  <span className="w-9 h-9 rounded-xl bg-white/10 text-sky-400 flex items-center justify-center shrink-0 border border-white/10 p-1.5">
                    {item.icon}
                  </span>
                  <span className="text-base sm:text-base font-semibold text-zinc-100 leading-snug">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SUB-SECTION 2: MADE AND MOVED AS ONE ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center relative">
          {/* Left Content Column */}
          <div className="lg:col-span-6 space-y-6  relative z-1">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight leading-[1.12]">
              Made and moved as one.
            </h2>

            <p className="text-zinc-600 text-base sm:text-base leading-relaxed max-w-xl">
              Brand, website, and digital strategy, run on the same operating layer as your print, packaging, storage, and delivery. Start with a single project, or bring your whole ecosystem, design to doorstep, in-house with us.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <Link
                href="/quote"
                className="w-full sm:w-auto px-7 py-3.5 bg-[#329AD4] hover:bg-[#2884b8] text-white font-bold rounded-md text-base sm:text-base shadow-lg shadow-[#329AD4]/30 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] text-center cursor-pointer"
              >
                Start A Project
              </Link>

              <Link
                href="/contact"
                className="w-full sm:w-auto px-7 py-3.5 bg-[#1c1d22] hover:bg-zinc-800 text-white font-bold rounded-md text-base sm:text-base shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] text-center cursor-pointer"
              >
                Book A Consultation
              </Link>
            </div>
          </div>
            <Image src={bgEllipse} alt="bg-ellipse" className="absolute top-1/2 left-0 transform -translate-y-1/2 z-0" />

          {/* Right Image Column */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg lg:max-w-none rounded-[28px] overflow-hidden shadow-2xl border border-white/80 bg-white">
              <Image
                src={bgMoved}
                alt="Made and moved as one — Team Collaboration"
                className="w-full h-auto object-cover rounded-[28px] transform transition-transform duration-500 hover:scale-[1.02]"
                priority
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
