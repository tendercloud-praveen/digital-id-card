import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import Features from '@/components/landing/Features';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import AuroraBackground from '@/components/ui/AuroraBackground';

export default function LandingPage() {
  return (
    <AuroraBackground className="min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
      </main>
      <SiteFooter />
    </AuroraBackground>
  );
}
