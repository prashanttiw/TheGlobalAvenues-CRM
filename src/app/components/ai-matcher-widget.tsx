import { useState } from 'react';
import { Sparkles, Briefcase, Code, Heart, Scale, Palette, TrendingUp, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

const careers = [
  { icon: Briefcase, label: 'Business & Finance', color: 'from-[#FD7E14] to-[#FF8C42]' },
  { icon: Code, label: 'Technology & IT', color: 'from-[#D32F2F] to-[#E64A19]' },
  { icon: Heart, label: 'Healthcare & Medicine', color: 'from-[#FF5722] to-[#FF7043]' },
  { icon: Scale, label: 'Law & Legal Studies', color: 'from-[#C94D1B] to-[#D84315]' },
  { icon: Palette, label: 'Arts & Design', color: 'from-[#FFC107] to-[#FFD54F]' },
  { icon: TrendingUp, label: 'Marketing & Media', color: 'from-[#FF9800] to-[#FFB74D]' },
];

export function AIMatcherWidget() {
  const [selected, setSelected] = useState<number | null>(null);
  const [step, setStep] = useState<'career' | 'results'>('career');

  const handleSelect = (index: number) => {
    setSelected(index);
    setTimeout(() => {
      setStep('results');
    }, 800);
  };

  return (
    <section id="ai-matcher" className="py-24 bg-[#FFFCF5] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0iI0ZEN0UxNCIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] " />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FFC107]/20 to-[#FD7E14]/20 mb-4 border border-[#FD7E14]/20">
            <Sparkles className="w-4 h-4 text-[#FD7E14]" />
            <span className="text-sm text-[#FD7E14] font-semibold">AI-Powered Matching</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#222222] mb-4">
            What's Your Dream Career?
          </h2>
          <p className="text-lg text-[#666666] max-w-2xl mx-auto">
            Our AI analyzes thousands of programs to find your perfect university match in seconds.
          </p>
        </motion.div>

        {step === 'career' ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {careers.map((career, index) => {
              const Icon = career.icon;
              const isSelected = selected === index;
              
              return (
                <motion.button
                  key={career.label}
                  onClick={() => handleSelect(index)}
                  className="relative group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.05, y: -8 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div
                    className={`
                      relative p-8 rounded-2xl transition-all duration-300
                      ${isSelected 
                        ? 'bg-gradient-to-br ' + career.color + ' shadow-[0_20px_40px_rgba(253,126,20,0.4)]' 
                        : 'bg-white hover:bg-gradient-to-br hover:' + career.color + ' shadow-[0_4px_16px_rgba(253,126,20,0.15)] hover:shadow-[0_20px_40px_rgba(253,126,20,0.3)]'
                      }
                      border border-[#FD7E14]/10 hover:border-[#FFC107]
                    `}
                  >
                    <div className={`flex flex-col items-center text-center ${isSelected ? 'text-white' : 'text-[#222222] group-hover:text-white'}`}>
                      <div className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all
                        ${isSelected 
                          ? 'bg-white/20 backdrop-blur-md' 
                          : 'bg-gradient-to-br ' + career.color + ' group-hover:bg-white/20'
                        }
                      `}>
                        <Icon className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-white'}`} />
                      </div>
                      <h3 className="font-bold text-lg mb-2">{career.label}</h3>
                      <ChevronRight className={`w-5 h-5 transition-transform ${isSelected ? 'translate-x-2' : ''}`} />
                    </div>

                    {isSelected && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-white/20 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(253,126,20,0.2)] border border-[#FD7E14]/20 p-12">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FD7E14] to-[#D32F2F] flex items-center justify-center mx-auto mb-6 shadow-[0_8px_24px_rgba(253,126,20,0.4)]">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-[#222222] mb-3">
                  Finding Your Perfect Match...
                </h3>
                <p className="text-[#666666]">
                  Our AI is analyzing 500+ universities for you
                </p>
              </div>

              {/* Loading Animation */}
              <div className="relative h-2 bg-[#FFFCF5] rounded-full overflow-hidden mb-8">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FD7E14] to-[#D32F2F] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-[#FFFCF5] rounded-xl border border-[#FD7E14]/10">
                  <div className="text-2xl font-bold text-[#FD7E14] mb-1">127</div>
                  <div className="text-sm text-[#666666]">Programs Found</div>
                </div>
                <div className="p-4 bg-[#FFFCF5] rounded-xl border border-[#FD7E14]/10">
                  <div className="text-2xl font-bold text-[#FD7E14] mb-1">15</div>
                  <div className="text-sm text-[#666666]">Countries</div>
                </div>
                <div className="p-4 bg-[#FFFCF5] rounded-xl border border-[#FD7E14]/10">
                  <div className="text-2xl font-bold text-[#FD7E14] mb-1">$2M+</div>
                  <div className="text-sm text-[#666666]">Scholarships</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}