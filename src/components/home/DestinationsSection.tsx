import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { FEATURED_DESTINATIONS } from '@/data/destinations';

export function DestinationsSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-[#F8FAFC] to-[#EFF6FF]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0074D9]/10 border border-[#0074D9]/20 mb-4">
              <MapPin className="w-4 h-4 text-[#0074D9]" />
              <span className="text-sm text-[#0074D9] font-semibold">Popular Study Destinations</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#222]">
              Where Will Your Journey Take You?
            </h2>
            <p className="text-lg text-[#666] mt-3 max-w-xl">
              From visa-friendly to tuition-free — we cover it all across 40+ countries.
            </p>
          </div>
          <Link
            to="/destinations"
            className="flex items-center gap-2 text-[#0074D9] font-semibold hover:gap-3 transition-all flex-shrink-0"
          >
            See All Countries <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {FEATURED_DESTINATIONS.map((dest, i) => (
            <motion.div
              key={dest.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              <Link to={`/destinations/${dest.slug}`}>
                <div className="relative h-72 rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all duration-300">
                  {/* Image */}
                  <img
                    src={dest.heroImage}
                    alt={dest.country}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />

                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${dest.color} mix-blend-multiply opacity-20 group-hover:opacity-40 transition-opacity`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Flag top-left */}
                  <div className="absolute top-4 left-4 text-3xl">{dest.flag}</div>

                  {/* Universities count top-right */}
                  <div className="absolute top-4 right-4 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-lg">
                    <span className="text-white text-xs font-semibold">{dest.universitiesCount} unis</span>
                  </div>

                  {/* Content bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-xl font-bold text-white mb-1">{dest.country}</h3>
                    <div className="flex items-center gap-3 text-xs text-white/80 mb-3">
                      <span>{dest.avgTuitionINR}</span>
                      <span>·</span>
                      <span>IELTS {dest.ieltsMin}+</span>
                    </div>

                    {/* Hover CTA */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 0 }}
                      className="flex items-center gap-2 text-white font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Explore {dest.country} <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
