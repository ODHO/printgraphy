import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarketingHero from "@/components/Marketing/MarketingHero";
import WhyPrintgraphiBuilds from "@/components/Marketing/WhyPrintgraphiBuilds";
import CustomWebsiteSection from "@/components/Marketing/CustomWebsiteSection";
import LogoBrandingSection from "@/components/Marketing/LogoBrandingSection";
import SocialMediaSection from "@/components/Marketing/SocialMediaSection";
import HubStagesSection from "@/components/Marketing/HubStagesSection";
import CorporateEcosystemSection from "@/components/Marketing/CorporateEcosystemSection";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketing & Digital Brand Intelligence — Printgraphy",
  description:
    "Websites, identity, and brand strategy, built by the same technology team that runs the Printgraphy operating layer. Design that's ready to sell.",
};

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#fbfaf7] font-sans flex flex-col justify-between text-zinc-900">
      <div>
        {/* Hero Section */}
        <MarketingHero />

        {/* Why Printgraphy Builds This Too Section */}
        <WhyPrintgraphiBuilds />

        {/* Custom Website Section */}
        <CustomWebsiteSection />

        {/* Logo & Brand Identity Section */}
        <LogoBrandingSection />

        {/* Social Media Section */}
        <SocialMediaSection />


        {/* Printgraphy Corporate Ecosystem Section (3 Cards + Blue Overlay) */}
        <CorporateEcosystemSection />

        {/* Hub Stages Section (One hub, three stages, zero handoffs) */}
        <HubStagesSection />
        
      </div>
    </div>
  );
}
