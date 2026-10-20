import Image from "next/image";

const collectionItems = [
  { label: "Top products, starting at $10", img: "/slide.png" },
  { label: "Gifts for clients & employees", img: "/slide.png" },
  { label: "Prepare for professional events", img: "/slide.png" },
  { label: "Prepare for local & community events", img: "/slide.png" },
  { label: "2-day delivery", img: "/slide.png" },
  { label: "Launch my business", img: "/slide.png" },
];

export default function ProductPageCollection() {
  return (
    <section className="py-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900">
          Shop by collection
        </h2>
        <a
          href="#"
          className="flex items-center gap-1.5 text-base font-semibold text-zinc-800 hover:text-theme-blue transition-colors"
        >
          See all collections
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* 6 Grid items row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-5">
        {collectionItems.map((item, idx) => (
          <div key={idx} className="flex flex-col group cursor-pointer">
            {/* Image Box */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/80 shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-1">
              <Image
                src={item.img}
                alt={item.label}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            {/* Label */}
            <p className="mt-3 text-base font-bold text-zinc-900 leading-snug group-hover:text-theme-blue transition-colors duration-200">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
