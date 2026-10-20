import Hero from "../components/Hero";
import CategoryCarousel from "../components/CategoryCarousel";
import ShopByCollection from "../components/ShopByCollection";
import TopSellers from "../components/TopSellers";
import GrowthSections from "../components/GrowthSections";
import ComplimentaryLogoBanner from "../components/ComplimentaryLogoBanner";
import MadeWithXPrintz from "../components/MadeWithXPrintz";
import dbConnect from "@/lib/mongodb";
import Homepage from "@/models/Homepage";
import { mergeHomepage } from "@/lib/homepageContent";

export default async function Home() {
  await dbConnect();
  const doc = await Homepage.findOne({ key: "home" }).lean();
  const content = mergeHomepage(doc?.content);

  return (
    <div className="flex-1 bg-white">
      <Hero hero={content.hero} />
      <CategoryCarousel />
      <ShopByCollection collections={content.collections} />
      <TopSellers topSellers={content.topSellers} />
      <GrowthSections tools={content.tools} newIn={content.newIn} />
      <ComplimentaryLogoBanner banner={content.logoBanner} />
      <MadeWithXPrintz madeWith={content.madeWith} />
    </div>
  );
}
