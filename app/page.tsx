import Hero from "../components/Hero";
import CategoryCarousel from "../components/CategoryCarousel";
import ShopByCollection from "../components/ShopByCollection";
import TopSellers from "../components/TopSellers";
import ComplimentaryLogoBanner from "../components/ComplimentaryLogoBanner";
import NewsletterSignup from "../components/NewsletterSignup";
import AmbassadorSpotlight from "../components/AmbassadorSpotlight";
import ServicesSupport from "../components/ServicesSupport";
import dbConnect from "@/lib/mongodb";
import Homepage from "@/models/Homepage";
import { mergeHomepage } from "@/lib/homepageContent";
import MadeWithPrintgraphi from "@/components/MadeWithPrintgraphi";
import EmailListBanner from "@/components/EmailListBanner";
import AboutSection from "@/components/AboutSection";

export default async function Home() {
  await dbConnect();
  const doc = await Homepage.findOne({ key: "home" }).lean();
  const content = mergeHomepage(doc?.content);

  return (
    <div className="flex-1 bg-[#ffffff]">
      <Hero hero={content.hero} />
      <CategoryCarousel />
      <ShopByCollection collections={content.collections} />
      <TopSellers topSellers={content.topSellers} />
      <ComplimentaryLogoBanner banner={content.logoBanner} />
      <NewsletterSignup newsletter={content.newsletter} />
      <AmbassadorSpotlight spotlight={content.spotlight} />
      <ServicesSupport tools={content.tools} />
      <MadeWithPrintgraphi madeWith={content.madeWith} />
      <EmailListBanner emailList={content.emailList} />
      <AboutSection about={content.about} />
    </div>
  );
}
