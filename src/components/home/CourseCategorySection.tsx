import { Link } from 'react-router-dom';
import { ArrowRight, Terminal, LineChart, Activity, Leaf, Compass, Palette } from 'lucide-react';
import { motion } from 'motion/react';

const FLAGSHIP_PATHWAYS = [
  {
    id: 'computer-science',
    slug: 'computer-science',
    name: 'Computer Science & IT',
    icon: Terminal,
    partner: 'EUAS Tallinn · Estonia',
    tagline: 'Study software engineering or startup entrepreneurship in Europe\'s leading digital capital.',
    intake: 'Sept / Jan',
    tuition: '€4,200/yr',
    visa: '2-Yr EU Visa',
    color: '#FD7E14'
  },
  {
    id: 'business-mba',
    slug: 'business-mba',
    name: 'Business & MBA',
    icon: LineChart,
    partner: 'ICN Business School · France/Germany',
    tagline: 'Global management training at a Triple-Crown accredited elite Grande École in Paris & Berlin.',
    intake: 'Sept / Feb',
    tuition: '€9,000/yr',
    visa: '2-Yr EU Visa',
    color: '#D32F2F'
  },
  {
    id: 'medicine-health',
    slug: 'medicine-health',
    name: 'Medicine & Health',
    icon: Activity,
    partner: "St. George's University · Grenada",
    tagline: 'Accredited MD pathways with clinical training and medical residencies in the US and UK.',
    intake: 'Jan / Aug',
    tuition: '$25K/sem',
    visa: 'US Residency Route',
    color: '#E91E63'
  },
  {
    id: 'energy-sustainability',
    slug: 'energy-sustainability',
    name: 'Energy & Sustainability',
    icon: Leaf,
    partner: 'FH Kufstein Tirol · Austria',
    tagline: 'Green energy management and sustainable business operations in the Austrian Alps.',
    intake: 'Sept Only',
    tuition: '€3,200/yr',
    visa: '12-Mo AT Route',
    color: '#8BC34A'
  },
  {
    id: 'hospitality-tourism',
    slug: 'hospitality-tourism',
    name: 'Hospitality & Culinary',
    icon: Compass,
    partner: 'Mesoyios College · Cyprus',
    tagline: 'Hotel management with 100% guaranteed paid summer internships in 5-star Mediterranean resorts.',
    intake: 'Sept / Feb / June',
    tuition: '€3,800/yr',
    visa: 'Paid Placement',
    color: '#FF5722'
  },
  {
    id: 'arts-design',
    slug: 'arts-design',
    name: 'Arts & Creative Design',
    icon: Palette,
    partner: 'MJM Graphic Design · France',
    tagline: 'Creative training in fashion, graphic art, and interior design in leading French design academies.',
    intake: 'Sept / Oct',
    tuition: '€6,800/yr',
    visa: 'Talent Route',
    color: '#9C27B0'
  }
];

export function CourseCategorySection() {
  return (
    <section className="py-24 bg-[#FFFCF5] relative overflow-hidden">
      {/* Background elegant pattern and warm light gradients */}
      <div className="absolute inset-0 dot-grid opacity-[0.15] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[550px] h-[550px] rounded-full bg-[#FD7E14]/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full bg-[#FFC107]/3 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Title Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-4.5 shadow-sm">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FD7E14] animate-pulse" />
            <span className="text-[10px] text-[#FD7E14] font-extrabold uppercase tracking-widest">Premium Pathway Portfolios</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#1C1C1E] tracking-tight mb-4">
            Find Courses by Your Interest
          </h2>
          <p className="text-base sm:text-lg text-neutral-500 max-w-2xl mx-auto leading-relaxed font-medium">
            Explore exclusive academic pathways engineered for student success at leading international university partners.
          </p>
        </motion.div>

        {/* 3x2 Curated Pathway Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FLAGSHIP_PATHWAYS.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="h-full"
              >
                <Link 
                  to={`/apply?role=student&interest=${card.id}`}
                  className="group flex flex-col justify-between h-full bg-white border-2 border-neutral-100 hover:border-[#FD7E14]/30 hover:shadow-[0_24px_48px_rgba(253,126,20,0.04)] hover:-translate-y-1.5 transition-all duration-300 rounded-[32px] p-8 relative overflow-hidden text-center"
                >
                  {/* Subtle color glow aura behind the card */}
                  <div 
                    className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-2xl opacity-[0.02] group-hover:opacity-[0.06] transition-opacity duration-300 pointer-events-none" 
                    style={{ backgroundColor: card.color }}
                  />

                  {/* Top content */}
                  <div>
                    {/* Centered Large Icon Container */}
                    <div 
                      className="w-20 h-20 rounded-[24px] flex items-center justify-center text-white mb-6 mx-auto shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0"
                      style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}cc)` }}
                    >
                      <Icon className="w-9 h-9 transition-transform duration-300 group-hover:rotate-3" />
                    </div>

                    {/* Centered Partner Name Label */}
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#FD7E14] mb-2.5">
                      {card.partner}
                    </div>

                    {/* Centered Title */}
                    <h3 className="text-xl font-extrabold text-[#1C1C1E] tracking-tight mb-3 group-hover:text-[#FD7E14] transition-colors duration-300">
                      {card.name}
                    </h3>

                    {/* Centered Short Description */}
                    <p className="text-sm text-neutral-500 leading-relaxed font-medium mb-6 max-w-[280px] mx-auto">
                      {card.tagline}
                    </p>
                  </div>

                  {/* Footer separator and metrics */}
                  <div>
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-neutral-200/50 to-transparent my-1" />
                    
                    {/* Centered Micro-metrics typography row */}
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-500 font-semibold mt-4 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FD7E14]/40" />
                        <span>Intake: <strong className="text-neutral-700">{card.intake}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C94D1B]/40" />
                        <span>Est: <strong className="text-[#C94D1B] font-bold">{card.tuition}</strong></span>
                      </div>
                      <div className="text-neutral-600 bg-neutral-50 px-2.5 py-0.5 rounded-md border border-neutral-100/50 text-[10px]">
                        {card.visa}
                      </div>
                    </div>

                    {/* Centered Explore Link Action */}
                    <div className="inline-flex items-center justify-center gap-1 text-xs font-black text-[#FD7E14] mt-4.5 mx-auto">
                      Explore Pathway <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Dynamic bottom action to browse all academic portfolios */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <Link
            to="/courses"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-white border-2 border-[#FD7E14] text-[#FD7E14] text-sm font-black hover:bg-[#FD7E14] hover:text-white hover:shadow-[0_12px_32px_rgba(253,126,20,0.18)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Browse All Academic Portfolios <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
