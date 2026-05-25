import { useState } from 'react';
import { ChevronRight, DollarSign, Briefcase, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

const countries = [
  {
    name: 'United Kingdom',
    flag: '🇬🇧',
    avgFee: '£15,000 - £35,000/year',
    workVisa: '2 years (3 years for PhD)',
    topUniversities: 5,
    image: 'https://images.unsplash.com/photo-1627131715233-480b34985c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsb25kb24lMjB1bml2ZXJzaXR5fGVufDF8fHx8MTc2ODEzODU2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    color: 'from-[#D32F2F] to-[#FF5722]',
  },
  {
    name: 'United States',
    flag: '🇺🇸',
    avgFee: '$25,000 - $55,000/year',
    workVisa: '3 years (STEM OPT)',
    topUniversities: 8,
    image: 'https://images.unsplash.com/photo-1663049964372-05a2e9f0998c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbWVyaWNhbiUyMHVuaXZlcnNpdHl8ZW58MXx8fHwxNzY4MTM4NTY3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    color: 'from-[#FD7E14] to-[#FF8C42]',
  },
  {
    name: 'Canada',
    flag: '🇨🇦',
    avgFee: 'CAD 20,000 - 40,000/year',
    workVisa: '3 years PGWP',
    topUniversities: 6,
    image: 'https://images.unsplash.com/photo-1618255630366-f402c45736f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW5hZGlhbiUyMGNhbXB1c3xlbnwxfHx8fDE3NjgxMzg1NjZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    color: 'from-[#FF5722] to-[#FF7043]',
  },
  {
    name: 'Germany',
    flag: '🇩🇪',
    avgFee: '€0 - €20,000/year',
    workVisa: '18 months job search',
    topUniversities: 4,
    image: 'https://images.unsplash.com/photo-1760131556605-7f2e63d00385?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB1bml2ZXJzaXR5JTIwY2FtcHVzfGVufDF8fHx8MTc2ODEzODU2NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
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
            Where Dreams Take Flight
          </h2>
          <p className="text-lg text-[#666666] max-w-2xl mx-auto">
            Explore world-class education opportunities across the globe with comprehensive visa
            and application support.
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