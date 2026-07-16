import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { COMPANY } from '@/data/company';

export function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#FD7E14] via-[#E8650A] to-[#D32F2F] py-16 sm:py-20">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Ready to Begin Your Global Journey?
          </h2>
          <p className="mb-8 text-lg text-white/80 sm:mb-10 sm:text-xl">
            Talk to our expert counsellors — free, no commitment. We respond within 2 hours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contact"
              className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-bold text-[#FD7E14] shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] sm:w-auto sm:px-8"
            >
              Book Free Counselling
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`https://wa.me/${COMPANY.whatsapp}?text=Hi%2C%20I%20want%20to%20know%20more%20about%20study%20abroad%20options.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-4 text-base font-bold text-white shadow-[0_8px_32px_rgba(37,211,102,0.4)] transition-all hover:scale-105 hover:shadow-[0_12px_40px_rgba(37,211,102,0.6)] sm:w-auto sm:px-8"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp Us
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
