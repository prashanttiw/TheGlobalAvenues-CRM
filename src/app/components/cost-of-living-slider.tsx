import { useState } from 'react';
import { DollarSign, Home, ShoppingCart, TrendingUp, Coffee, Bus, Film } from 'lucide-react';
import { motion } from 'motion/react';

const cities = [
  {
    name: 'London',
    country: 'UK',
    currency: '£',
    costs: {
      budget: { rent: 600, groceries: 200, transport: 80, entertainment: 100, total: 980 },
      comfortable: { rent: 1200, groceries: 350, transport: 150, entertainment: 250, total: 1950 },
      luxury: { rent: 2500, groceries: 600, transport: 300, entertainment: 500, total: 3900 },
    },
    image: 'https://images.unsplash.com/photo-1627131715233-480b34985c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsb25kb24lMjB1bml2ZXJzaXR5fGVufDF8fHx8MTc2ODEzODU2Nnww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    name: 'New York',
    country: 'USA',
    currency: '$',
    costs: {
      budget: { rent: 1200, groceries: 300, transport: 120, entertainment: 150, total: 1770 },
      comfortable: { rent: 2500, groceries: 500, transport: 200, entertainment: 350, total: 3550 },
      luxury: { rent: 5000, groceries: 900, transport: 400, entertainment: 700, total: 7000 },
    },
    image: 'https://images.unsplash.com/photo-1663049964372-05a2e9f0998c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbWVyaWNhbiUyMHVuaXZlcnNpdHl8ZW58MXx8fHwxNzY4MTM4NTY3fDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    name: 'Toronto',
    country: 'Canada',
    currency: 'CAD',
    costs: {
      budget: { rent: 900, groceries: 250, transport: 100, entertainment: 120, total: 1370 },
      comfortable: { rent: 1800, groceries: 450, transport: 180, entertainment: 300, total: 2730 },
      luxury: { rent: 3500, groceries: 800, transport: 350, entertainment: 600, total: 5250 },
    },
    image: 'https://images.unsplash.com/photo-1618255630366-f402c45736f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW5hZGlhbiUyMGNhbXB1c3xlbnwxfHx8fDE3NjgxMzg1NjZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    name: 'Munich',
    country: 'Germany',
    currency: '€',
    costs: {
      budget: { rent: 700, groceries: 200, transport: 70, entertainment: 100, total: 1070 },
      comfortable: { rent: 1300, groceries: 350, transport: 120, entertainment: 250, total: 2020 },
      luxury: { rent: 2500, groceries: 600, transport: 250, entertainment: 500, total: 3850 },
    },
    image: 'https://images.unsplash.com/photo-1760131556605-7f2e63d00385?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB1bml2ZXJzaXR5JTIwY2FtcHVzfGVufDF8fHx8MTc2ODEzODU2NHww&ixlib=rb-4.1.0&q=80&w=1080',
  },
];

type LifestyleType = 'budget' | 'comfortable' | 'luxury';

const lifestyleOptions: { value: LifestyleType; label: string; color: string; description: string }[] = [
  { value: 'budget', label: 'Budget Student', color: 'from-green-500 to-green-600', description: 'Shared accommodation, home cooking' },
  { value: 'comfortable', label: 'Comfortable', color: 'from-orange-500 to-orange-600', description: 'Private room, balanced lifestyle' },
  { value: 'luxury', label: 'Luxury', color: 'from-purple-500 to-purple-600', description: 'Studio apartment, premium living' },
];

export function CostOfLivingSlider() {
  const [selectedCity, setSelectedCity] = useState(cities[0]);
  const [lifestyle, setLifestyle] = useState<LifestyleType>('comfortable');

  const currentCosts = selectedCity.costs[lifestyle];

  const expenseCategories = [
    { icon: Home, label: 'Rent', amount: currentCosts.rent, color: 'text-orange-600' },
    { icon: ShoppingCart, label: 'Groceries', amount: currentCosts.groceries, color: 'text-green-600' },
    { icon: Bus, label: 'Transport', amount: currentCosts.transport, color: 'text-orange-600' },
    { icon: Film, label: 'Entertainment', amount: currentCosts.entertainment, color: 'text-purple-600' },
  ];

  return (
        <section className="py-24 bg-[#FFFCF5]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-4">
            <DollarSign className="w-4 h-4 text-[#FD7E14]" />
            <span className="text-sm text-[#FD7E14] font-semibold">Cost Calculator</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1C1C1E] mb-4">
            Estimate Your Living Costs
          </h2>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            Adjust your lifestyle to see real-time monthly expenses in your dream city
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: Controls */}
          <div className="space-y-8">
            {/* City Selection */}
            <div>
              <label className="block mb-4">
                <span className="text-lg font-semibold text-[#1A0A00] mb-3 block">Select City</span>
                <div className="grid grid-cols-2 gap-4">
                  {cities.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => setSelectedCity(city)}
                      className={`
                        relative overflow-hidden rounded-2xl border-2 transition-all
                        ${selectedCity.name === city.name
                          ? 'border-[#FD7E14] shadow-lg'
                          : 'border-gray-200 hover:border-[#FD7E14]/50'
                        }
                      `}
                    >
                      <div className="aspect-video relative">
                        <img
                          src={city.image}
                          alt={city.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <h4 className="font-bold text-white">{city.name}</h4>
                          <p className="text-xs text-white/80">{city.country}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </label>
            </div>

            {/* Lifestyle Slider */}
            <div>
              <label className="block">
                <span className="text-lg font-semibold text-[#1A0A00] mb-4 block">Choose Your Lifestyle</span>
                
                {/* Slider */}
                <div className="relative mb-8">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    value={lifestyleOptions.findIndex(opt => opt.value === lifestyle)}
                    onChange={(e) => setLifestyle(lifestyleOptions[parseInt(e.target.value)].value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FD7E14]"
                  />
                  <div className="flex justify-between mt-4">
                    {lifestyleOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setLifestyle(option.value)}
                        className={`
                          flex-1 text-center transition-all
                          ${lifestyle === option.value ? 'scale-110' : 'opacity-50'}
                        `}
                      >
                        <div className={`
                          w-12 h-12 mx-auto rounded-full bg-gradient-to-br ${option.color} flex items-center justify-center mb-2
                          ${lifestyle === option.value ? 'ring-4 ring-[#FD7E14]/30' : ''}
                        `}>
                          <span className="text-white font-bold text-sm">
                            {option.value === 'budget' ? '$' : option.value === 'comfortable' ? '$$' : '$$$'}
                          </span>
                        </div>
                        <p className={`text-xs font-semibold ${lifestyle === option.value ? 'text-[#1A0A00]' : 'text-[#1A0A00]/50'}`}>
                          {option.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gradient-to-r from-[#FD7E14]/10 to-[#1A0A00]/10 rounded-2xl p-4 border border-[#FD7E14]/20">
                  <p className="text-sm text-[#1A0A00]/80 text-center">
                    {lifestyleOptions.find(opt => opt.value === lifestyle)?.description}
                  </p>
                </div>
              </label>
            </div>

            {/* Expense Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-[#1A0A00] mb-4">Monthly Breakdown</h3>
              <div className="space-y-3">
                {expenseCategories.map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <motion.div
                      key={category.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center ${category.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-[#1A0A00]">{category.label}</span>
                      </div>
                      <span className="text-xl font-bold text-[#1A0A00]">
                        {selectedCity.currency}{category.amount}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Visual Summary */}
          <div className="lg:sticky lg:top-8">
            <motion.div
              key={lifestyle}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-[#1A0A00] to-[#FD7E14] rounded-3xl p-8 text-white shadow-2xl"
            >
              <div className="text-center mb-8">
                <p className="text-white/80 mb-2">Estimated Monthly Cost in</p>
                <h3 className="text-3xl font-bold mb-6">{selectedCity.name}</h3>
                
                {/* Total Cost Display */}
                <div className="relative inline-block">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="text-7xl font-bold mb-2"
                  >
                    {selectedCity.currency}{currentCosts.total.toLocaleString()}
                  </motion.div>
                  <p className="text-white/70 text-sm">per month</p>
                </div>
              </div>

              {/* Visual Bar Chart */}
              <div className="space-y-4 mb-8">
                {expenseCategories.map((category) => {
                  const percentage = (category.amount / currentCosts.total) * 100;
                  return (
                    <div key={category.label}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/90">{category.label}</span>
                        <span className="text-sm font-semibold">{Math.round(percentage)}%</span>
                      </div>
                      <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-white rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
                <div className="text-center">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-300" />
                  <p className="text-xs text-white/70 mb-1">Annual Cost</p>
                  <p className="font-bold">{selectedCity.currency}{(currentCosts.total * 12).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <Coffee className="w-6 h-6 mx-auto mb-2 text-yellow-300" />
                  <p className="text-xs text-white/70 mb-1">Daily Budget</p>
                  <p className="font-bold">{selectedCity.currency}{Math.round(currentCosts.total / 30)}</p>
                </div>
              </div>

              {/* CTA */}
              <button className="w-full mt-6 bg-white text-[#1A0A00] py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all">
                Get Personalized Budget Plan
              </button>
            </motion.div>

            {/* Comparison Note */}
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <p className="text-sm text-yellow-900">
                💡 <strong>Pro Tip:</strong> These are average estimates. Actual costs may vary based on your specific location and personal choices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
