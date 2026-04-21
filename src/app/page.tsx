import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import CategoryStrip from '@/components/home/CategoryStrip';
import PainSection from '@/components/home/PainSection';
import ProductCards from '@/components/home/ProductCards';
import HowItWorks from '@/components/home/HowItWorks';
import CustomerExperience from '@/components/home/CustomerExperience';
import AIFeatures from '@/components/home/AIFeatures';
import LossAversion from '@/components/home/LossAversion';
import Pricing from '@/components/home/Pricing';
import SocialProof from '@/components/home/SocialProof';
import FAQ from '@/components/home/FAQ';
import FinalCTA from '@/components/home/FinalCTA';
import FooterCTA from '@/components/home/FooterCTA';

export default function Home() {
  // Middleware handles the logged-in redirect to /manage/dashboard server-side.
  return (
    <main className="min-h-screen font-display bg-white text-slate-900 antialiased selection:bg-primary/20 selection:text-primary">
      <Navbar />
      <HeroSection />
      <CategoryStrip />
      <PainSection />
      <ProductCards />
      <HowItWorks />
      <CustomerExperience />
      <AIFeatures />
      <LossAversion />
      <Pricing />
      <SocialProof />
      <FAQ />
      <FinalCTA />
      <FooterCTA />
    </main>
  );
}
