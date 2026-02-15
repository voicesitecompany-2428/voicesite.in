'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import HowItWorks from '@/components/home/HowItWorks';
import SocialProof from '@/components/home/SocialProof';
import Featurette from '@/components/home/Featurette';
import FooterCTA from '@/components/home/FooterCTA';

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/manage/dashboard');
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-100 border-t-primary"></div>
      </div>
    );
  }

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
