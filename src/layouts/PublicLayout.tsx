import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { WhatsAppButton } from '../components/layout/WhatsAppButton';

const NO_FOOTER_PATHS = ['/portal', '/apply'];

export function PublicLayout() {
  const { pathname } = useLocation();
  const showFooter = !NO_FOOTER_PATHS.some((p) => pathname.startsWith(p));
  const isApplyOrPortal = pathname.startsWith('/apply') || pathname.startsWith('/portal');

  return (
    <div className="min-h-screen bg-[#FFFCF5] flex flex-col justify-between">
      <div>
        <Header />
        <main className="min-h-[calc(100vh-80px)]">
          <Outlet />
        </main>
      </div>
      {showFooter && <Footer />}
      {!isApplyOrPortal && <WhatsAppButton />}
    </div>
  );
}
