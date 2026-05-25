import { Link } from 'react-router-dom';
import { GraduationCap, FileText, Stamp, Award, Home, CreditCard, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const SERVICES = [
  {
    icon: GraduationCap,
    title: 'University Counselling',
    description: 'Expert guidance to find the right university and course for your profile and goals.',
    href: '/services/counselling',
    color: 'from-[#FD7E14] to-[#FF8C42]',
    bg: 'bg-[#FD7E14]/8',
  },
  {
    icon: Stamp,
    title: 'Visa Assistance',
    description: '98% visa success rate. We handle your entire visa application from start to finish.',
    href: '/services/visa',
    color: 'from-[#D32F2F] to-[#FF5722]',
    bg: 'bg-[#D32F2F]/8',
  },
  {
    icon: FileText,
    title: 'SOP & Document Help',
    description: 'AI-assisted SOP writing, LOR guidance, CV building, and document verification.',
    href: '/services/documents',
    color: 'from-[#C94D1B] to-[#FD7E14]',
    bg: 'bg-[#C94D1B]/8',
  },
  {
    icon: Award,
    title: 'Scholarship Guidance',
    description: 'Access to exclusive scholarships. We\'ve secured ₹200Cr+ for our students.',
    href: '/services/scholarships',
    color: 'from-[#FFC107] to-[#FF9800]',
    bg: 'bg-[#FFC107]/8',
  },
  {
    icon: Home,
    title: 'Accommodation Help',
    description: 'Find safe, affordable student housing near your university campus.',
    href: '/services/accommodation',
    color: 'from-[#4CAF50] to-[#388E3C]',
    bg: 'bg-[#4CAF50]/8',
  },
  {
    icon: CreditCard,
    title: 'Education Loans',
    description: 'Partner banks and NBFCs offering competitive rates for study abroad loans.',
    href: '/services/loans',
    color: 'from-[#2196F3] to-[#1565C0]',
    bg: 'bg-[#2196F3]/8',
  },
];

export function ServicesSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-[#EEF7FF]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0074D9]/10 border border-[#0074D9]/20 mb-4">
            <span className="text-sm text-[#0074D9] font-semibold">End-to-End Support</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#222] mb-4">
            Everything You Need, Under One Roof
          </h2>
          <p className="text-lg text-[#666] max-w-2xl mx-auto">
            From your first counselling session to landing at your destination — we've got you covered.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service, i) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="group"
              >
                <Link to={service.href}>
                  <div className="bg-white rounded-2xl p-7 border border-[#0074D9]/10 hover:border-[#0074D9]/30 shadow-[0_2px_12px_rgba(0,116,217,0.06)] hover:shadow-[0_16px_40px_rgba(0,116,217,0.14)] transition-all duration-300 h-full">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-5 shadow-[0_6px_20px_rgba(253,126,20,0.25)] group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-[#222] mb-2 group-hover:text-[#FD7E14] transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-[#666] text-sm leading-relaxed mb-4">{service.description}</p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-[#FD7E14] opacity-0 group-hover:opacity-100 transition-opacity">
                      Learn More <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <Link
            to="/services"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-[#0074D9] text-[#0074D9] font-bold hover:bg-[#0074D9] hover:text-white transition-all"
          >
            View All Services <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
