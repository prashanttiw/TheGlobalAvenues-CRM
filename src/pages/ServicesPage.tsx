import { motion } from 'motion/react';
import { ArrowRight, BookOpen, GraduationCap, Briefcase, FileText, Landmark, BadgePercent } from 'lucide-react';
import { Link } from 'react-router-dom';

const SERVICES = [
  {
    id: 'counselling',
    title: 'University Counselling',
    desc: 'Expert guidance to choose the right course and university based on your profile and career goals.',
    icon: <GraduationCap className="w-8 h-8 text-[#FD7E14]" />,
  },
  {
    id: 'visa',
    title: 'Visa Assistance',
    desc: 'End-to-end visa application support with a 98% success rate across top destinations.',
    icon: <Briefcase className="w-8 h-8 text-[#FD7E14]" />,
  },
  {
    id: 'documents',
    title: 'Document Help (SOP, LOR)',
    desc: 'Professional editing and guidance for Statements of Purpose, Letters of Recommendation, and CVs.',
    icon: <FileText className="w-8 h-8 text-[#FD7E14]" />,
  },
  {
    id: 'scholarships',
    title: 'Scholarship Guidance',
    desc: 'Identify and apply for exclusive university and government scholarships to reduce tuition fees.',
    icon: <BadgePercent className="w-8 h-8 text-[#FD7E14]" />,
  },
  {
    id: 'loans',
    title: 'Education Loans',
    desc: 'Hassle-free loan processing through our partnered banking networks and NBFCs.',
    icon: <Landmark className="w-8 h-8 text-[#FD7E14]" />,
  },
  {
    id: 'test-prep',
    title: 'Test Preparation (IELTS/TOEFL)',
    desc: 'Comprehensive training modules for language proficiency and standardized tests.',
    icon: <BookOpen className="w-8 h-8 text-[#FD7E14]" />,
  },
];

export function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-[#1A0A00] to-[#2D1200] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle, #FD7E14 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FD7E14] to-[#FFC107]">Services</span>
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              End-to-end support for your international education journey. From shortlisting universities to landing safely on campus.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_rgba(253,126,20,0.08)] border border-[#FD7E14]/10 hover:shadow-[0_8px_30px_rgba(253,126,20,0.15)] transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#FD7E14]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold text-[#333] mb-3">{service.title}</h3>
                <p className="text-[#666] mb-6 leading-relaxed">{service.desc}</p>
                <Link
                  to={`/contact?interest=${service.id}`}
                  className="inline-flex items-center gap-2 text-[#FD7E14] font-semibold hover:gap-3 transition-all"
                >
                  Consult Now <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to start your journey?</h2>
          <p className="text-xl opacity-90 mb-8">Speak directly with our expert counsellors today.</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#FD7E14] rounded-xl font-bold shadow-lg hover:scale-105 transition-transform"
          >
            Get Free Consultation
          </Link>
        </div>
      </section>
    </div>
  );
}
