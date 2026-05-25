import { useState } from 'react';
import { Phone, Mail, MapPin, MessageCircle, Clock, Send, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { COMPANY } from '@/data/company';

const FAQS = [
  { q: 'How long does the application process take?', a: 'Typically 2–6 weeks depending on the university and program. Our exclusive partners can process offers in as little as 14 days.' },
  { q: 'Do you charge students for counselling?', a: 'Our initial counselling session is completely free. We are compensated by our partner universities, so there is no cost to students for most services.' },
  { q: 'What documents do I need to apply?', a: 'Generally: academic transcripts, English test scores (IELTS/TOEFL/PTE), passport copy, SOP, and LOR. Requirements vary by university.' },
  { q: 'Can you help with visa applications?', a: 'Yes — we have a 98% visa success rate. Our team handles the entire visa process including document preparation and submission.' },
  { q: 'Do you offer scholarships?', a: 'Yes. We have access to exclusive scholarships through our partner universities. We\'ve secured ₹200Cr+ in scholarships for our students.' },
  { q: 'Which countries do you cover?', a: 'We cover 40+ countries including UK, USA, Canada, Australia, Germany, France, Cyprus, Estonia, Austria, and more.' },
];

export function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', role: 'student', subject: '', destination: '', message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Frontend-only: show success state
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-[#1A0A00] to-[#2D1200]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl font-bold text-white mb-4">Talk to Us. We're Real People.</h1>
            <p className="text-xl text-white/70">Not a bot. Our counsellors respond within 2 hours.</p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Contact methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {[
            {
              icon: Phone,
              title: 'Call Us',
              value: COMPANY.phone,
              sub: 'Mon–Sat, 9am–7pm IST',
              href: `tel:${COMPANY.phone}`,
              color: 'from-[#FD7E14] to-[#C94D1B]',
            },
            {
              icon: MessageCircle,
              title: 'WhatsApp',
              value: 'Chat Instantly',
              sub: 'Usually replies in minutes',
              href: `https://wa.me/${COMPANY.whatsapp}`,
              color: 'from-[#25D366] to-[#128C7E]',
            },
            {
              icon: Mail,
              title: 'Email Us',
              value: COMPANY.email,
              sub: 'Response within 2 hours',
              href: `mailto:${COMPANY.email}`,
              color: 'from-[#D32F2F] to-[#FF5722]',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <motion.a
                key={item.title}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6 }}
                className="group bg-white rounded-2xl p-7 border border-[#FD7E14]/10 hover:border-[#FD7E14]/30 shadow-[0_2px_12px_rgba(253,126,20,0.06)] hover:shadow-[0_16px_40px_rgba(253,126,20,0.14)] transition-all text-center"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-4 shadow-[0_6px_20px_rgba(253,126,20,0.25)] group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-[#222] mb-1">{item.title}</h3>
                <p className="text-[#FD7E14] font-semibold text-sm mb-1">{item.value}</p>
                <p className="text-xs text-[#999] flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> {item.sub}
                </p>
              </motion.a>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Enquiry Form */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl font-bold text-[#222] mb-2">Send an Enquiry</h2>
            <p className="text-[#666] mb-8">Fill in the form and we'll get back to you within 2 hours.</p>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-green-800 mb-2">Message Sent!</h3>
                <p className="text-green-700">We'll get back to you within 2 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#666] uppercase tracking-wider mb-1.5 block">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-white text-sm outline-none focus:border-[#FD7E14]/60 focus:shadow-[0_0_0_3px_rgba(253,126,20,0.1)] transition-all"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#666] uppercase tracking-wider mb-1.5 block">Email *</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-white text-sm outline-none focus:border-[#FD7E14]/60 focus:shadow-[0_0_0_3px_rgba(253,126,20,0.1)] transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#666] uppercase tracking-wider mb-1.5 block">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-white text-sm outline-none focus:border-[#FD7E14]/60 focus:shadow-[0_0_0_3px_rgba(253,126,20,0.1)] transition-all"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#666] uppercase tracking-wider mb-1.5 block">I am a</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-white text-sm outline-none focus:border-[#FD7E14]/60 transition-all"
                    >
                      <option value="student">Student</option>
                      <option value="parent">Parent</option>
                      <option value="agent">Agent / Counsellor</option>
                      <option value="university">University Representative</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#666] uppercase tracking-wider mb-1.5 block">Preferred Destination</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-white text-sm outline-none focus:border-[#FD7E14]/60 focus:shadow-[0_0_0_3px_rgba(253,126,20,0.1)] transition-all"
                    placeholder="e.g. UK, Canada, Germany..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#666] uppercase tracking-wider mb-1.5 block">Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-white text-sm outline-none focus:border-[#FD7E14]/60 focus:shadow-[0_0_0_3px_rgba(253,126,20,0.1)] transition-all resize-none"
                    placeholder="Tell us about your goals, current qualifications, and any questions..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl font-bold shadow-[0_8px_32px_rgba(253,126,20,0.35)] hover:shadow-[0_12px_40px_rgba(253,126,20,0.5)] hover:scale-[1.02] transition-all"
                >
                  <Send className="w-5 h-5" />
                  Send Enquiry
                </button>
              </form>
            )}
          </motion.div>

          {/* Office info + FAQs */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            {/* Office */}
            <div className="bg-white rounded-2xl p-7 border border-[#FD7E14]/10 shadow-[0_2px_12px_rgba(253,126,20,0.06)] mb-8">
              <h3 className="font-bold text-[#222] text-lg mb-5 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#FD7E14]" />
                Our Office
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#FD7E14] mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-[#333] text-sm">New Delhi HQ</div>
                    <div className="text-sm text-[#666]">{COMPANY.address}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#FD7E14] flex-shrink-0" />
                  <a href={`tel:${COMPANY.phone}`} className="text-sm text-[#666] hover:text-[#FD7E14] transition-colors">{COMPANY.phone}</a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#FD7E14] flex-shrink-0" />
                  <a href={`mailto:${COMPANY.email}`} className="text-sm text-[#666] hover:text-[#FD7E14] transition-colors">{COMPANY.email}</a>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#FD7E14] flex-shrink-0" />
                  <span className="text-sm text-[#666]">Mon–Sat: 9:00 AM – 7:00 PM IST</span>
                </div>
              </div>
            </div>

            {/* FAQs */}
            <div>
              <h3 className="font-bold text-[#222] text-lg mb-5">Frequently Asked Questions</h3>
              <div className="space-y-3">
                {FAQS.map((faq, i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#FD7E14]/10 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FFFCF5] transition-colors"
                    >
                      <span className="text-sm font-semibold text-[#333] pr-4">{faq.q}</span>
                      <ChevronDown className={`w-4 h-4 text-[#FD7E14] flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 text-sm text-[#666] leading-relaxed border-t border-[#FD7E14]/10 pt-3">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
