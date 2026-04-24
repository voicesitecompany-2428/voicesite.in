import type { Metadata } from 'next';
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

const BASE_URL = 'https://vsite.in';

export const metadata: Metadata = {
  title: 'vsite — AI Digital Menu for Restaurants | Live in 3 Min',
  description:
    'Create your restaurant\'s digital menu in 3 minutes with AI. Upload your paper menu, get professional food photos. Start free — no credit card. Built for Tamil Nadu restaurants.',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    url: BASE_URL,
    title: 'vsite — AI Digital Menu for Restaurants | Live in 3 Min',
    description:
      'Create your restaurant\'s digital menu in 3 minutes with AI. Upload your paper menu, get professional food photos. 14-day free trial — no credit card.',
  },
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'vsite',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: BASE_URL,
  description:
    'AI-powered digital menu and QR ordering platform for restaurants in India. Create a professional digital menu from a photo in 3 minutes.',
  offers: {
    '@type': 'Offer',
    price: '399',
    priceCurrency: 'INR',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: '399',
      priceCurrency: 'INR',
      unitText: 'MONTH',
    },
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '124',
  },
  featureList: [
    'AI menu creation from photo',
    'QR code menu',
    'Real-time menu updates',
    'UPI payment integration',
    'Tamil language support',
    'NFC card included',
  ],
};

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'vsite',
  url: BASE_URL,
  email: 'official@vsite.in',
  description:
    'AI-powered digital menu platform for Tamil Nadu restaurants. Live in 3 minutes.',
  areaServed: [
    { '@type': 'City', name: 'Chennai' },
    { '@type': 'City', name: 'Coimbatore' },
    { '@type': 'City', name: 'Madurai' },
    { '@type': 'City', name: 'Salem' },
    { '@type': 'City', name: 'Trichy' },
    { '@type': 'State', name: 'Tamil Nadu' },
  ],
  serviceType: 'Digital Menu Software',
  priceRange: '₹₹',
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
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
    </>
  );
}
