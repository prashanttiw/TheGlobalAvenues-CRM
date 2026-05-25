import { HeroSection }           from '@/components/home/HeroSection';
import { PartnerTicker }          from '@/components/home/PartnerTicker';
import { HowItWorks }             from '@/components/home/HowItWorks';
import { DestinationsSection }    from '@/components/home/DestinationsSection';
import { GlobeSection }           from '@/components/home/GlobeSection';
import { CourseCategorySection }  from '@/components/home/CourseCategorySection';
import { ExclusivePartnersSection } from '@/components/home/ExclusivePartnersSection';
import { StatsSection }           from '@/components/home/StatsSection';
import { TestimonialsSection }    from '@/components/home/TestimonialsSection';
import { ServicesSection }        from '@/components/home/ServicesSection';
import { CTABanner }              from '@/components/home/CTABanner';

// Preserved interactive Figma widgets (re-themed)
import { InnovationBar }          from '@/app/components/innovation-bar';
import { AIMatcherWidget }        from '@/app/components/ai-matcher-widget';
import { CostOfLivingSlider }     from '@/app/components/cost-of-living-slider';
import { ComparisonLab }          from '@/app/components/comparison-lab';
import { DailyDrillWidget }       from '@/app/components/daily-drill-widget';
import { DocumentButler }         from '@/app/components/document-butler';
import { StudentDashboardPreview } from '@/app/components/student-dashboard-preview';

export function HomePage() {
  return (
    <>
      {/* 1. Cinematic hero with parallax + slide transitions */}
      <HeroSection />

      {/* 2. Live scholarship ticker */}
      <InnovationBar />

      {/* 3. Partner logo ticker */}
      <PartnerTicker />

      {/* 4. How it works — 3D cards */}
      <HowItWorks />

      {/* 5. Destination country cards */}
      <DestinationsSection />

      {/* 6. Course category explorer */}
      <CourseCategorySection />

      {/* 7. Interactive 3D Globe */}
      <GlobeSection />

      {/* 8. AI Matcher widget */}
      <AIMatcherWidget />

      {/* 9. Exclusive partners — dark premium section */}
      <ExclusivePartnersSection />

      {/* 10. Animated stats counters */}
      <StatsSection />

      {/* 11. Student testimonials carousel */}
      <TestimonialsSection />

      {/* 12. Cost of living calculator */}
      <CostOfLivingSlider />

      {/* 13. University comparison lab */}
      <ComparisonLab />

      {/* 14. Daily quiz widget */}
      <DailyDrillWidget />

      {/* 15. Document butler */}
      <DocumentButler />

      {/* 16. Application tracker preview */}
      <StudentDashboardPreview />

      {/* 17. Services overview */}
      <ServicesSection />

      {/* 18. Final CTA banner */}
      <CTABanner />
    </>
  );
}
