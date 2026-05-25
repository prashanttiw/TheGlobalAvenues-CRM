import { MessageCircle, FolderLock, Bot, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const features = [
  {
    icon: MessageCircle,
    title: 'WhatsApp Expert Help',
    description: 'Connect with certified counselors instantly. Get responses within 5 minutes.',
    color: 'from-green-500 to-green-600',
    stat: '< 5 min',
    statLabel: 'Response Time',
  },
  {
    icon: FolderLock,
    title: 'Document Vault',
    description: 'Secure cloud storage for all your important documents. Access anywhere, anytime.',
    color: 'from-blue-500 to-blue-600',
    stat: '256-bit',
    statLabel: 'Encryption',
  },
  {
    icon: Bot,
    title: '24/7 AI Counselor',
    description: 'Get instant answers to your questions powered by advanced AI technology.',
    color: 'from-red-500 to-purple-600',
    stat: '24/7',
    statLabel: 'Available',
  },
];

export function SupportHub() {
  return (
    <section className="py-24 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/10 mb-4">
            <MessageCircle className="w-4 h-4 text-[#FD7E14]" />
            <span className="text-sm text-[#FD7E14] font-semibold">Always Here For You</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A0A00] mb-4">
            Support That Never Sleeps
          </h2>
          <p className="text-lg text-[#1A0A00]/70 max-w-2xl mx-auto">
            From documentation to visa interviews, we're with you at every step of your journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="group relative"
              >
                <div className="relative h-full bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden">
                  {/* Gradient Background on Hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  
                  {/* Icon */}
                  <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-[#1A0A00] mb-3 group-hover:text-[#FD7E14] transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-[#1A0A00]/70 mb-6 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Stat Badge */}
                  <div className="inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl mb-6">
                    <div>
                      <div className="text-xl font-bold text-[#1A0A00]">{feature.stat}</div>
                      <div className="text-xs text-[#1A0A00]/60">{feature.statLabel}</div>
                    </div>
                  </div>

                  {/* CTA */}
                  <button className="flex items-center gap-2 text-[#FD7E14] font-semibold group-hover:gap-3 transition-all">
                    Learn More
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  {/* Decorative Element */}
                  <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-[#FD7E14]/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Additional Trust Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 bg-gradient-to-r from-[#1A0A00] to-[#FD7E14] rounded-3xl p-12 text-center relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCA0MCAwIEwgNDAgNDAgTCAwIDQwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] " />
          </div>

          <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Start Your Journey?
            </h3>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of students who trusted us with their dreams.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-white text-[#1A0A00] px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-xl">
                Check My Eligibility
              </button>
              <button className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/30">
                Schedule Free Consultation
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
