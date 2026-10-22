import ProductDetailSection from "@/components/ProductDetailSection";
import ProductPageCollection from "@/components/ProductPageCollection";
import ProductCardFeatures from "@/components/ProductCardFeatures";
import ProductReviewsSection from "@/components/ProductReviewsSection";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#fbfaf7] font-sans">

      {/* Main Content Area */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Section 1: Interactive Product Detail Section */}
        <ProductDetailSection productId={id} />

        {/* Section 2: Shop by collection Section */}
        <ProductPageCollection />

        {/* Section 3: Product Card Features & card-design Showcase */}
        <ProductCardFeatures productId={id} />

        {/* Section 4: User Reviews Section */}
        <ProductReviewsSection productId={id} />
      </main>
    </div>
  );
}
