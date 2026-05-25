import { useState } from 'react';
import { MapPin, X, ChevronRight, GraduationCap, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const countries = [
  {
    id: 'usa',
    name: 'United States',
    position: { x: '25%', y: '35%' },
    universities: [
      { name: 'Harvard University', ranking: '#1', tuition: '$54,000/year' },
      { name: 'Stanford University', ranking: '#3', tuition: '$58,000/year' },
      { name: 'MIT', ranking: '#2', tuition: '$55,000/year' },
      { name: 'Yale University', ranking: '#5', tuition: '$62,000/year' },
      { name: 'Princeton University', ranking: '#4', tuition: '$57,000/year' },
    ],
    visaInfo: 'F-1 Student Visa | 3-5 weeks processing',
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    position: { x: '50%', y: '30%' },
    universities: [
      { name: 'Oxford University', ranking: '#1', tuition: '£26,000/year' },
      { name: 'Cambridge University', ranking: '#2', tuition: '£24,000/year' },
      { name: 'Imperial College', ranking: '#6', tuition: '£32,000/year' },
      { name: 'LSE', ranking: '#8', tuition: '£23,000/year' },
      { name: 'UCL', ranking: '#7', tuition: '£28,000/year' },
    ],
    visaInfo: 'Tier 4 Student Visa | 3 weeks processing',
  },
  {
    id: 'canada',
    name: 'Canada',
    position: { x: '20%', y: '25%' },
    universities: [
      { name: 'University of Toronto', ranking: '#1', tuition: 'CAD 45,000/year' },
      { name: 'McGill University', ranking: '#2', tuition: 'CAD 42,000/year' },
      { name: 'UBC', ranking: '#3', tuition: 'CAD 40,000/year' },
      { name: 'University of Waterloo', ranking: '#5', tuition: 'CAD 38,000/year' },
      { name: 'McMaster University', ranking: '#6', tuition: 'CAD 36,000/year' },
    ],
    visaInfo: 'Study Permit | 4-8 weeks processing',
  },
  {
    id: 'germany',
    name: 'Germany',
    position: { x: '52%', y: '33%' },
    universities: [
      { name: 'TU Munich', ranking: '#1', tuition: '€0 (Public)' },
      { name: 'LMU Munich', ranking: '#2', tuition: '€0 (Public)' },
      { name: 'Heidelberg University', ranking: '#3', tuition: '€0 (Public)' },
      { name: 'Humboldt University', ranking: '#4', tuition: '€0 (Public)' },
      { name: 'TU Berlin', ranking: '#5', tuition: '€0 (Public)' },
    ],
    visaInfo: 'Student Visa | 6-12 weeks processing',
  },
  {
    id: 'australia',
    name: 'Australia',
    position: { x: '80%', y: '70%' },
    universities: [
      { name: 'University of Melbourne', ranking: '#1', tuition: 'AUD 45,000/year' },
      { name: 'ANU', ranking: '#2', tuition: 'AUD 43,000/year' },
      { name: 'University of Sydney', ranking: '#3', tuition: 'AUD 46,000/year' },
      { name: 'UNSW', ranking: '#4', tuition: 'AUD 44,000/year' },
      { name: 'University of Queensland', ranking: '#5', tuition: 'AUD 42,000/year' },
    ],
    visaInfo: 'Subclass 500 | 4-6 weeks processing',
  },
];

export function GlobalMapSection() {
  const [selectedCountry, setSelectedCountry] = useState<typeof countries[0] | null>(null);

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F8FAFC] to-white" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0074D9]/10 mb-4">
            <MapPin className="w-4 h-4 text-[#0074D9]" />
            <span className="text-sm text-[#0074D9] font-semibold">Global Network</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#001F3F] mb-4">
            Explore Study Destinations
          </h2>
          <p className="text-lg text-[#001F3F]/70 max-w-2xl mx-auto">
            Click on any country to discover top universities and visa requirements.
          </p>
        </div>

        {/* Map Container */}
        <div className="relative bg-gradient-to-br from-[#001F3F]/5 to-[#0074D9]/5 rounded-3xl p-12 min-h-[600px] border border-[#0074D9]/20">
          {/* Simplified World Map SVG */}
          <svg
            viewBox="0 0 1000 500"
            className="w-full h-full opacity-20 absolute inset-0"
          >
            <path
              d="M 200 200 Q 250 180 300 200 L 350 180 L 400 200 L 450 190 L 500 210 Q 550 200 600 190 L 650 200 L 700 210 L 750 200 Q 800 190 850 200"
              stroke="#001F3F"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M 150 250 L 200 240 L 250 250 L 300 240 L 350 250 L 400 260 L 450 250 L 500 260 L 550 250 L 600 260 L 650 250 L 700 260 L 750 250 L 800 260"
              stroke="#001F3F"
              strokeWidth="2"
              fill="none"
            />
          </svg>

          {/* Country Pins */}
          {countries.map((country) => (
            <motion.button
              key={country.id}
              className="absolute group"
              style={{
                left: country.position.x,
                top: country.position.y,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => setSelectedCountry(country)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <div className="relative">
                {/* Pin */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0074D9] to-[#001F3F] flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all border-4 border-white">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                
                {/* Pulse Animation */}
                <div className="absolute inset-0 rounded-full bg-[#0074D9] animate-ping opacity-30" />
                
                {/* Label */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-3 py-1 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-semibold text-[#001F3F]">{country.name}</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {selectedCountry && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCountry(null)}
            />

            {/* Sidebar Content */}
            <motion.div
              className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-[#001F3F] to-[#0074D9] p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {selectedCountry.name}
                  </h3>
                  <p className="text-sm text-white/80">{selectedCountry.visaInfo}</p>
                </div>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Universities */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="w-5 h-5 text-[#0074D9]" />
                  <h4 className="font-bold text-lg text-[#001F3F]">Top 5 Universities</h4>
                </div>
                
                <div className="space-y-3">
                  {selectedCountry.universities.map((uni, index) => (
                    <motion.div
                      key={uni.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-br from-[#F8FAFC] to-white rounded-xl p-4 border border-gray-200 hover:border-[#0074D9] hover:shadow-lg transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0074D9] to-[#001F3F] flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h5 className="font-semibold text-[#001F3F] group-hover:text-[#0074D9] transition-colors">
                              {uni.name}
                            </h5>
                            <p className="text-xs text-[#001F3F]/60">Ranking: {uni.ranking}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#0074D9] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-[#001F3F]/70 font-medium">{uni.tuition}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* CTA */}
                <button className="w-full mt-6 bg-gradient-to-r from-[#0074D9] to-[#001F3F] text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all">
                  Apply to {selectedCountry.name} Universities
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
