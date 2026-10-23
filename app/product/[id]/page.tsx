import ProductDetailSection from "@/components/ProductDetailSection";
import ProductPageCollection from "@/components/ProductPageCollection";
import ProductCardFeatures from "@/components/ProductCardFeatures";
import ProductReviewsSection from "@/components/ProductReviewsSection";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7fbfe] font-sans text-[#1e1d1b]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(ellipse_at_20%_0%,rgba(50,154,212,0.16),transparent_55%),radial-gradient(ellipse_at_90%_10%,rgba(85,178,231,0.12),transparent_50%),linear-gradient(180deg,#eef7fc_0%,#f7fbfe_55%,#f7fbfe_100%)]"
      />

      <main className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-14 sm:space-y-20">
        <ProductDetailSection productId={id} />
        <ProductPageCollection />
        <ProductCardFeatures productId={id} />
        <ProductReviewsSection productId={id} />
      </main>
    </div>
  );
}
