import DashboardPreview from "@/components/landing/DashboardPreview";
import FeaturesSection from "@/components/landing/FeaturesSection";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/HeroSection";
import Navbar from "@/components/landing/Navbar";
import PricingSection from "@/components/landing/PricingSection";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent">
      <Navbar />
      <main className="relative z-10">
        <HeroSection />
        <FeaturesSection />
        <DashboardPreview />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
