import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { COMPANY } from '@/data/company';

export function CTABanner() {
  return (
    <section className="py-20 bg-gradient-to-r from-[#FD7E14] via-[#E8650A] to-[#D32F2F] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Ready to Begin Your Global Journey?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Talk to our expert counsellors — free, no commitment. We respond within 2 hours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contact"
              className="flex items-center gap-2 px-8 py-4 bg-white text-[#FD7E14] rounded-2xl font-bold text-base shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:scale-105 transition-all"
            >
              Book Free Counselling
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`https://wa.me/${COMPANY.whatsapp}?text=Hi%2C%20I%20want%20to%20know%20more%20about%20study%20abroad%20options.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-4 bg-[#25D366] text-white rounded-2xl font-bold text-base shadow-[0_8px_32px_rgba(37,211,102,0.4)] hover:shadow-[0_12px_40px_rgba(37,211,102,0.6)] hover:scale-105 transition-all"
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
