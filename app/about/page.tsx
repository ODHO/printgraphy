import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us — Printgraphy",
  description: "Learn more about Printgraphy, our mission, inspiration gallery, and quality printing solutions.",
};

const INSPIRATION_ITEMS = [
  {
    title: "Eco Packaging & Boxes",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Stationery & Notebooks",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Magazines & Booklets",
    image: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Roll-up Banners & Signs",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Modern Bold Business Cards",
    image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Outdoor Billboards & Posters",
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Stickers & Creative Moodboard",
    image: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Artisan Craft Prints",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Custom Print Layouts",
    image: "https://images.unsplash.com/photo-1581291518655-9523c932deda?auto=format&fit=crop&w=800&q=80",
  },
];

const FEATURE_CARDS = [
  {
    title: 'A "Just-Right" Selection',
    description:
      "We Give Small Business Owners The Right Assortment Of Products And Options. We Don't Overwhelm, But We Don't Come Up Short, And It's All At The Right Price.",
    image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Easy Experience",
    description:
      "We Help Small Business Owners Quickly And Effectively Create The Products They Need To Get The Job Done – With Tips, Inspiration And Experts Readily Available.",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Design For Everyone",
    description:
      "We Offer On-Trend Designs, Intuitive Tools, And The Support Options That Enable Any Small Business Owner To Create Expertly Designed Marketing – Even If They're Not A Design Expert.",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
  },
];

export default function AboutPage() {
  return (
    <div className="w-full bg-[#fbfaf7]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-16 md:space-y-24">
        {/* ── Section 1: ABOUT PRINTGRAPHI ── */}
        <section className="space-y-12 md:space-y-16">
          {/* Row 1: Heading + Text on Left, Workspace Image on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div className="space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-zinc-900 uppercase">
                ABOUT <br /> PRINTGRAPHI
              </h1>
              <p className="text-sm sm:text-base text-zinc-700 leading-relaxed max-w-xl font-normal">
                It Is A Long Established Fact That A Reader Will Be Distracted By The Readable Content Of A Page When
                Looking At Its Layout. The Point Of Using Lorem Ipsum Is That It Has A More-Or-Less Normal Distribution Of
                Letters, As Opposed To Using &apos;Content Here, Content Here&apos;, Making It Look Like Readable English.
                Distracted By The Readable Content Of A Page When Looking At Its Layout. The Point Of Using Lorem Ipsum
              </p>
            </div>
            <div className="relative w-full aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-zinc-200/60 bg-zinc-100">
              <Image
                src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85"
                alt="Creative Design Workspace"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </div>

          {/* Row 2: Pocket Card Image on Left, Mission Text on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div className="relative w-full aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-zinc-200/60 bg-zinc-100 order-2 lg:order-1">
              <Image
                src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=1200&q=85"
                alt="Custom Printed Business Card"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="space-y-4 order-1 lg:order-2">
              <p className="text-sm sm:text-base text-zinc-700 leading-relaxed font-normal">
                Printgraphi Is An Innovative Leader In The Printing And Graphics Industry, Dedicated To Pushing The
                Boundaries Of Visual Communication. Our Mission Is To Provide Cutting-Edge Solutions That Blend
                Technology With Creativity, Offering High-Quality Print Products And Graphic Design Services Tailored To
                Meet The Diverse Needs Of Our Clients.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 2: INSPIRATION GALLERY ── */}
        <section className="space-y-8 md:space-y-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-900 uppercase text-center">
            INSPIRATION GALLERY
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {INSPIRATION_ITEMS.map((item, index) => (
              <div
                key={index}
                className="group relative aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 bg-zinc-100 border border-zinc-200/40"
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3: 3 Feature Cards ── */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {FEATURE_CARDS.map((card, idx) => (
              <div
                key={idx}
                className="flex flex-col bg-transparent rounded-2xl overflow-hidden"
              >
                <div className="relative w-full aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs border border-zinc-200/60 bg-zinc-100 mb-5">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
                  {card.title}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 4: Call to Action Banner (LET PRINT AMAZING THINGS) ── */}
        <section className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden min-h-[360px] sm:min-h-[420px] flex items-center justify-center p-6 sm:p-10 shadow-sm border border-zinc-200/60">
          <Image
            src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=85"
            alt="Print Architecture"
            fill
            className="object-cover brightness-75"
            sizes="100vw"
          />
          {/* Centered White Card */}
          <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-8 sm:p-12 max-w-2xl w-full text-center shadow-xl border border-white/60 mx-4">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-900 tracking-tight uppercase">
              LET PRINT AMAZING THINGS
            </h3>
            <p className="mt-3 text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-lg mx-auto">
              It Is A Long Established Fact That A Reader Will Be Distracted By The Readable Content Of A Page When
              Looking At Its Layout.
            </p>
            <div className="mt-6">
              <Link
                href="/browsedesigns"
                className="inline-block px-7 py-3 bg-[#1e1d1b] hover:bg-[#e74b2d] text-white text-sm font-bold rounded-full shadow-xs transition-colors duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
