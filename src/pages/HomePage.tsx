import { lazy, Suspense } from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { PartnerTicker } from '@/components/home/PartnerTicker';
import { HowItWorks } from '@/components/home/HowItWorks';
import { InnovationBar } from '@/app/components/innovation-bar';

const AIMatcherWidget = lazy(() =>
  import('@/app/components/ai-matcher-widget').then((module) => ({ default: module.AIMatcherWidget }))
);
const StatsSection = lazy(() =>
  import('@/components/home/StatsSection').then((module) => ({ default: module.StatsSection }))
);
const TestimonialsSection = lazy(() =>
  import('@/components/home/TestimonialsSection').then((module) => ({ default: module.TestimonialsSection }))
);
const ComparisonLab = lazy(() =>
  import('@/app/components/comparison-lab').then((module) => ({ default: module.ComparisonLab }))
);
const DocumentButler = lazy(() =>
  import('@/app/components/document-butler').then((module) => ({ default: module.DocumentButler }))
);
const StudentDashboardPreview = lazy(() =>
  import('@/app/components/student-dashboard-preview').then((module) => ({ default: module.StudentDashboardPreview }))
);
const CTABanner = lazy(() =>
  import('@/components/home/CTABanner').then((module) => ({ default: module.CTABanner }))
);

function SectionFallback() {
  return <div className="h-24 bg-[#FFFCF5]" aria-hidden="true" />;
}

export function HomePage() {
  return (
    <>
      <HeroSection />
      <InnovationBar />
      <PartnerTicker />
      <HowItWorks />

      <Suspense fallback={<SectionFallback />}>
        <AIMatcherWidget />
        <StatsSection />
        <TestimonialsSection />
        <ComparisonLab />
        <DocumentButler />
        <StudentDashboardPreview />
        <CTABanner />
      </Suspense>
    </>
  );
}
