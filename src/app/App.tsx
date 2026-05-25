import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';

// Pages
import { HomePage } from '@/pages/HomePage';
import { DestinationsPage } from '@/pages/DestinationsPage';
import { UniversitiesPage } from '@/pages/UniversitiesPage';
import { CoursesPage } from '@/pages/CoursesPage';
import { PartnersPage } from '@/pages/PartnersPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { ApplyPage } from '@/pages/ApplyPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { BlogPage } from '@/pages/BlogPage';
import { CountryDetailPage } from '@/pages/CountryDetailPage';
import { UniversityDetailPage } from '@/pages/UniversityDetailPage';
import { CourseCategoryPage } from '@/pages/CourseCategoryPage';
import { LoginPage } from '@/pages/LoginPage';
import { StudentDashboardPage } from '@/pages/StudentDashboardPage';
import { AgentDashboardPage } from '@/pages/AgentDashboardPage';
import { BlogPostPage } from '@/pages/BlogPostPage';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

// Pages that don't show the standard footer (portal pages)
const NO_FOOTER_PATHS = ['/portal', '/apply'];

function Layout() {
  const { pathname } = useLocation();
  const showFooter = !NO_FOOTER_PATHS.some((p) => pathname.startsWith(p));
  const isApply = pathname.startsWith('/apply') || pathname.startsWith('/portal');

  return (
    <div className="min-h-screen bg-[#FFFCF5]">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/destinations" element={<DestinationsPage />} />
          <Route path="/destinations/:slug" element={<CountryDetailPage />} />
          <Route path="/universities" element={<UniversitiesPage />} />
          <Route path="/universities/:slug" element={<UniversityDetailPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:category" element={<CourseCategoryPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/portal/login" element={<LoginPage />} />
          <Route path="/portal/register" element={<ApplyPage />} />
          <Route path="/portal/student" element={<StudentDashboardPage />} />
          <Route path="/portal/agent" element={<AgentDashboardPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:service" element={<ServicesPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center pt-24">
              <div className="text-center">
                <div className="text-8xl font-black text-[#FD7E14]/20 mb-4">404</div>
                <h1 className="text-3xl font-bold text-[#333] mb-2">Page Not Found</h1>
                <p className="text-[#666] mb-6">The page you're looking for doesn't exist.</p>
                <a href="/" className="px-6 py-3 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl font-bold">
                  Go Home
                </a>
              </div>
            </div>
          } />
        </Routes>
      </main>
      {showFooter && <Footer />}
      {!isApply && <WhatsAppButton />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout />
    </BrowserRouter>
  );
}
