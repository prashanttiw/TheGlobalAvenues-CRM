import { useState } from 'react';
import { Plus, X, Check, TrendingUp, DollarSign, Users, Award, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const availableUniversities = [
  {
    id: 1,
    name: 'FH Kufstein Tirol',
    country: 'Austria',
    ranking: 'Applied Sciences',
    tuition: 'EUR 700-EUR 800/year',
    successRate: '95%',
    avgSalary: 'Profile based',
    duration: '2-3 years',
    scholarships: 'Available',
    acceptanceRate: 'Profile review',
  },
  {
    id: 2,
    name: 'EUAS',
    country: 'Estonia',
    ranking: 'Largest private UAS',
    tuition: 'EUR 6,260-EUR 8,740/year',
    successRate: '94%',
    avgSalary: 'Program based',
    duration: '2-3 years',
    scholarships: 'Available',
    acceptanceRate: 'Profile review',
  },
  {
    id: 3,
    name: 'ICN Business School',
    country: 'France/Germany',
    ranking: 'Business School',
    tuition: 'Program specific',
    successRate: 'Profile based',
    avgSalary: 'Career-service guided',
    duration: '1-3 years',
    scholarships: 'Available',
    acceptanceRate: 'Profile review',
  },
  {
    id: 4,
    name: "St. George's University",
    country: 'Grenada',
    ranking: 'Medical University',
    tuition: 'Program specific',
    successRate: '95%',
    avgSalary: 'Residency-track outcome',
    duration: '4+ years',
    scholarships: 'Available',
    acceptanceRate: 'Track based',
  },
];

const comparisonCategories = [
  { key: 'ranking', label: 'Institution Type', icon: Award },
  { key: 'tuition', label: 'Tuition Fee', icon: DollarSign },
  { key: 'successRate', label: 'Profile Fit', icon: TrendingUp },
  { key: 'avgSalary', label: 'Career Outcome', icon: DollarSign },
  { key: 'duration', label: 'Program Duration', icon: Users },
  { key: 'scholarships', label: 'Scholarships Available', icon: Award },
  { key: 'acceptanceRate', label: 'Admission Review', icon: Users },
  { key: 'country', label: 'Location', icon: MapPin },
];

export function ComparisonLab() {
  const [selectedUniversities, setSelectedUniversities] = useState<typeof availableUniversities>([
    availableUniversities[0],
    availableUniversities[1],
  ]);
  const [showSelector, setShowSelector] = useState(false);

  const addUniversity = (uni: typeof availableUniversities[0]) => {
    if (selectedUniversities.length < 4 && !selectedUniversities.find(u => u.id === uni.id)) {
      setSelectedUniversities([...selectedUniversities, uni]);
      setShowSelector(false);
    }
  };

  const removeUniversity = (id: number) => {
    if (selectedUniversities.length > 2) {
      setSelectedUniversities(selectedUniversities.filter(u => u.id !== id));
    }
  };

  const getBestValue = (key: string) => {
    if (key === 'successRate' || key === 'avgSalary' || key === 'acceptanceRate') {
      const values = selectedUniversities
        .map(u => parseFloat(u[key as keyof typeof u] as string))
        .filter(Number.isFinite);
      if (values.length === 0) return null;
      return Math.max(...values);
    }
    return null;
  };

  const isBestValue = (uni: typeof availableUniversities[0], key: string) => {
    const bestValue = getBestValue(key);
    if (bestValue === null) return false;
    return parseFloat(uni[key as keyof typeof uni] as string) === bestValue;
  };

  return (
    <section className="py-24 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-4">
            <TrendingUp className="w-4 h-4 text-[#FD7E14]" />
            <span className="text-sm text-[#FD7E14] font-semibold">The Comparison Lab</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1C1C1E] mb-4">
            Compare Universities Side-by-Side
          </h2>
          <p className="text-lg text-[#001F3F]/70 max-w-2xl mx-auto">
            Compare verified The Global Avenues partner options by location, duration, tuition, and admissions fit
          </p>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          {/* University Headers */}
          <div className="grid gap-px bg-gray-200" style={{ gridTemplateColumns: `200px repeat(${selectedUniversities.length}, 1fr)` }}>
            {/* Category Column Header */}
            <div className="bg-gradient-to-br from-[#001F3F] to-[#0074D9] p-6">
              <h3 className="text-lg font-bold text-white">Categories</h3>
            </div>

            {/* University Column Headers */}
            {selectedUniversities.map((uni) => (
              <div key={uni.id} className="bg-white p-6 relative group">
                <div className="text-center">
                  <h4 className="font-bold text-lg text-[#001F3F] mb-1">{uni.name}</h4>
                  <p className="text-sm text-[#001F3F]/60 mb-4">{uni.country}</p>
                  
                  {selectedUniversities.length > 2 && (
                    <button
                      onClick={() => removeUniversity(uni.id)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add University Button */}
            {selectedUniversities.length < 4 && (
              <div className="bg-white p-6">
                <button
                  onClick={() => setShowSelector(true)}
                  className="w-full h-full min-h-[120px] border-2 border-dashed border-[#0074D9]/30 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#0074D9] hover:bg-[#0074D9]/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#0074D9]/10 flex items-center justify-center group-hover:bg-[#0074D9]/20 transition-all">
                    <Plus className="w-6 h-6 text-[#0074D9]" />
                  </div>
                  <span className="text-sm font-semibold text-[#0074D9]">Add University</span>
                </button>
              </div>
            )}
          </div>

          {/* Comparison Rows */}
          {comparisonCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="grid gap-px bg-gray-200"
                style={{ gridTemplateColumns: `200px repeat(${selectedUniversities.length}, 1fr)` }}
              >
                {/* Category Label */}
                <div className="bg-[#F8FAFC] p-6">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-[#0074D9]" />
                    <span className="font-semibold text-[#001F3F]">{category.label}</span>
                  </div>
                </div>

                {/* Values */}
                {selectedUniversities.map((uni) => {
                  const value = uni[category.key as keyof typeof uni];
                  const isBest = isBestValue(uni, category.key);
                  
                  return (
                    <div key={`${uni.id}-${category.key}`} className="bg-white p-6">
                      <div className={`text-center ${isBest ? 'relative' : ''}`}>
                        {isBest && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <span className={`text-lg font-bold ${isBest ? 'text-green-600' : 'text-[#001F3F]'}`}>
                          {value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            );
          })}

          {/* Action Row */}
          <div className="grid gap-px bg-gray-200" style={{ gridTemplateColumns: `200px repeat(${selectedUniversities.length}, 1fr)` }}>
            <div className="bg-[#F8FAFC] p-6">
              <span className="font-semibold text-[#001F3F]">Actions</span>
            </div>
            {selectedUniversities.map((uni) => (
              <div key={`action-${uni.id}`} className="bg-white p-6">
                <button className="w-full bg-gradient-to-r from-[#0074D9] to-[#001F3F] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all">
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* University Selector Modal */}
      <AnimatePresence>
        {showSelector && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSelector(false)}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-[#001F3F]">Add University</h3>
                  <button
                    onClick={() => setShowSelector(false)}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {availableUniversities
                    .filter(uni => !selectedUniversities.find(u => u.id === uni.id))
                    .map((uni) => (
                      <button
                        key={uni.id}
                        onClick={() => addUniversity(uni)}
                        className="p-4 border-2 border-gray-200 rounded-2xl hover:border-[#0074D9] hover:bg-[#0074D9]/5 transition-all text-left group"
                      >
                        <h4 className="font-bold text-[#001F3F] mb-1 group-hover:text-[#0074D9]">
                          {uni.name}
                        </h4>
                        <p className="text-sm text-[#001F3F]/60">{uni.country}</p>
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}