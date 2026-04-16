import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import HowItWorks from '@/components/home/HowItWorks';
import SocialProof from '@/components/home/SocialProof';
import Featurette from '@/components/home/Featurette';
import FooterCTA from '@/components/home/FooterCTA';

export default function Home() {
  // Middleware handles the logged-in redirect to /manage/dashboard server-side.
  // No client-side auth check needed here.
  return (
    <main className="min-h-screen font-display bg-background-light text-slate-900 antialiased selection:bg-primary/20 selection:text-primary">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <SocialProof />
      <Featurette />
      <FooterCTA />
    </main>
  );
}
