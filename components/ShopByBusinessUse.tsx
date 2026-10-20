import Image from "next/image";
import Link from "next/link";

interface BusinessUseCardItem {
  slug: string;
  title: string;
  description: string;
  rating: number;
  reviewsCount: number;
  price: string;
  unitPrice: string;
  image: string;
}

const businessUseItems: BusinessUseCardItem[] = [
  {
    slug: "loyalty-business-cards",
    title: "Loyalty Business Cards",
    description: "Rounded corner business cards give you an edge with a modern, memorable look. Available with special papers and finishes. See details",
    rating: 4.8,
    reviewsCount: 15527,
    price: "$22.99",
    unitPrice: "$0.23 Each / 100 Units",
    image: "/slide.png",
  },
  {
    slug: "rounded-corner-business-cards",
    title: "Rounded Corner Business Cards",
    description: "Rounded corner business cards give you an edge with a modern, memorable look. Available with special papers and finishes. See details",
    rating: 4.8,
    reviewsCount: 15527,
    price: "$22.99",
    unitPrice: "$0.23 Each / 100 Units",
    image: "/slide.png",
  },
  {
    slug: "square-business-cards",
    title: "Square Business Cards",
    description: "Rounded corner business cards give you an edge with a modern, memorable look. Available with special papers and finishes. See details",
    rating: 4.8,
    reviewsCount: 15527,
    price: "$22.99",
    unitPrice: "$0.23 Each / 100 Units",
    image: "/slide.png",
  },
  {
    slug: "appointment-business-cards",
    title: "Appointment Business Cards",
    description: "Rounded corner business cards give you an edge with a modern, memorable look. Available with special papers and finishes. See details",
    rating: 4.8,
    reviewsCount: 15527,
    price: "$22.99",
    unitPrice: "$0.23 Each / 100 Units",
    image: "/slide.png",
  },
];

export default function ShopByBusinessUse() {
  return (
    <section className="my-10 pt-4">
      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 mb-1">
        Shop Custom Cards By Business Use
      </h2>
      <p className="text-base sm:text-base text-zinc-500 mb-6 font-normal">
        Go for standard cards or try an interesting, unexpected shape.
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {businessUseItems.map((item, idx) => (
          <Link
            key={idx}
            href={`/product/${item.slug}`}
            className="flex flex-col group cursor-pointer"
          >
            {/* Image */}
            <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-zinc-200 border border-transparent group-hover:border-zinc-300 transition-all duration-200">
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Content */}
            <div className="space-y-1">
              <h3 className="text-base sm:text-base font-bold text-zinc-900 leading-tight group-hover:text-[#064FE0] transition-colors">
                {item.title}
              </h3>
              <p className="text-base text-zinc-500 leading-relaxed line-clamp-3">
                {item.description}
              </p>

              {/* Stars */}
              <div className="flex items-center gap-1 text-base pt-1">
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="font-bold text-zinc-800">{item.rating}</span>
                <span className="text-zinc-400">({item.reviewsCount.toLocaleString()})</span>
              </div>

              {/* Price */}
              <div className="pt-1">
                <div className="text-base sm:text-base font-bold text-zinc-900">{item.price}</div>
                <div className="text-base text-zinc-500 font-medium">{item.unitPrice}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
