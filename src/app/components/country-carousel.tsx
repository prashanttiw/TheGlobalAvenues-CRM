import { useState } from 'react';
import { ChevronRight, DollarSign, Briefcase, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

const countries = [
  {
    name: 'Austria',
    flag: 'AT',
    avgFee: 'EUR 700-EUR 800/year',
    workVisa: 'Residence route depends on profile',
    topUniversities: 1,
    image: '/universities/fh-kufstein-tirol-hero.webp',
    color: 'from-[#D32F2F] to-[#FF5722]',
  },
  {
    name: 'Estonia',
    flag: 'EE',
    avgFee: 'EUR 6,260-EUR 8,740/year',
    workVisa: 'Residence route depends on profile',
    topUniversities: 1,
    image: '/universities/euas-hero.jpg',
    color: 'from-[#FD7E14] to-[#FF8C42]',
  },
  {
    name: 'France',
    flag: 'FR',
    avgFee: 'Program specific',
    workVisa: 'Campus France process',
    topUniversities: 3,
    image: '/universities/icn-business-school-hero.png',
    color: 'from-[#FF5722] to-[#FF7043]',
  },
  {
    name: 'Cyprus',
    flag: 'CY',
    avgFee: 'Program specific',
    workVisa: 'Institution-guided file',
    topUniversities: 2,
    image: '/universities/mesoyios-college-hero.webp',
    color: 'from-[#C94D1B] to-[#D84315]',
  },
];

export function CountryCarousel() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="destinations" className="py-24 bg-gradient-to-b from-white to-[#FFFCF5]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/10 mb-4 border border-[#FD7E14]/20">
            <GraduationCap className="w-4 h-4 text-[#FD7E14]" />
            <span className="text-sm text-[#FD7E14] font-semibold">Top Destinations</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#222222] mb-4">
            The Global Avenues Partner Destinations
          </h2>
          <p className="text-lg text-[#666666] max-w-2xl mx-auto">
            Explore verified partner countries with application and documentation support from The Global Avenues.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {countries.map((country, index) => (
            <motion.div
              key={country.name}
              className="relative group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
            >
              <div className="relative h-96 rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(253,126,20,0.15)] hover:shadow-[0_20px_40px_rgba(253,126,20,0.25)] transition-all duration-300">
                {/* Image */}
                <img
                  src={country.image}
                  alt={country.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t ${country.color} opacity-60 group-hover:opacity-80 transition-opacity`} />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div>
                    <div className="text-6xl mb-2">{country.flag}</div>
                    <h3 className="text-2xl font-bold text-white mb-1">{country.name}</h3>
                    <div className="text-sm text-white/90">{country.topUniversities} Top Universities</div>
                  </div>

                  {/* Hover Info */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                      opacity: hoveredIndex === index ? 1 : 0,
                      y: hoveredIndex === index ? 0 : 10
                    }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 border border-white/50 shadow-[0_4px_12px_rgba(253,126,20,0.2)]">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-[#FD7E14]" />
                        <span className="text-xs font-semibold text-[#222222]">Avg. Fee</span>
                      </div>
                      <div className="text-sm font-bold text-[#222222]">{country.avgFee}</div>
                    </div>
                    <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 border border-white/50 shadow-[0_4px_12px_rgba(253,126,20,0.2)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-4 h-4 text-[#FD7E14]" />
                        <span className="text-xs font-semibold text-[#222222]">Post-Study Work</span>
                      </div>
                      <div className="text-sm font-bold text-[#222222]">{country.workVisa}</div>
                    </div>
                  </motion.div>

                  {/* CTA */}
                  <motion.button
                    className="mt-4 w-full bg-white text-[#D32F2F] rounded-xl py-3 px-4 flex items-center justify-between font-semibold hover:bg-gradient-to-r hover:from-[#D32F2F] hover:to-[#FF5722] hover:text-white transition-all shadow-[0_4px_12px_rgba(211,47,47,0.2)]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Explore {country.name}
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
