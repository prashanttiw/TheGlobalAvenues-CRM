import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Briefcase, ArrowRight, CheckCircle, Globe } from 'lucide-react';
import { motion } from 'motion/react';

const STEPS = [
  { step: '01', title: 'Create Account', desc: 'Register in 2 minutes' },
  { step: '02', title: 'Build Profile', desc: 'Add your academic details' },
  { step: '03', title: 'Get Matched', desc: 'AI finds your best universities' },
  { step: '04', title: 'Apply', desc: 'One-click applications' },
  { step: '05', title: 'Track Progress', desc: 'Real-time status updates' },
];

export function ApplyPage() {
  const [role, setRole] = useState<'student' | 'agent'>('student');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-16 flex items-center">
      <div className="max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          {/* Left — Info */}
          <div className="lg:col-span-3">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FD7E14] to-[#D32F2F] flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-bold text-[#333]">The Global Avenues</span>
              </div>
              <h1 className="text-5xl font-bold text-[#222] mb-4">
                Start Your Application Today
              </h1>
              <p className="text-xl text-[#666] mb-10">
                Join 4,000+ students who found their dream university through us.
              </p>

              {/* Steps */}
              <div className="space-y-4">
                {STEPS.map((s, i) => (
                  <motion.div
                    key={s.step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FD7E14] to-[#C94D1B] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-[0_4px_12px_rgba(253,126,20,0.3)]">
                      {s.step}
                    </div>
                    <div>
                      <div className="font-semibold text-[#333]">{s.title}</div>
                      <div className="text-sm text-[#999]">{s.desc}</div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-[#FD7E14] ml-auto" />
                  </motion.div>
                ))}
              </div>

              {/* Testimonial */}
              <div className="mt-10 bg-white rounded-2xl p-6 border border-[#FD7E14]/10 shadow-[0_4px_20px_rgba(253,126,20,0.08)]">
                <p className="text-[#555] italic mb-3">"Global Avenues helped me get into ICN Business School in France with a scholarship. The process was smooth and the team was incredibly supportive."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FD7E14] to-[#D32F2F] flex items-center justify-center text-white font-bold">R</div>
                  <div>
                    <div className="font-semibold text-[#333] text-sm">Rahul Sharma</div>
                    <div className="text-xs text-[#999]">ICN Business School, France · 2024</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right — Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl p-8 shadow-[0_20px_60px_rgba(253,126,20,0.15)] border border-[#FD7E14]/10"
            >
              {/* Role selector */}
              <div className="flex rounded-xl bg-[#FFFCF5] p-1 mb-6 border border-[#FD7E14]/10">
                {(['student', 'agent'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === r ? 'bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white shadow-[0_4px_12px_rgba(253,126,20,0.3)]' : 'text-[#666] hover:text-[#FD7E14]'}`}
                  >
                    {r === 'student' ? <User className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                    {r === 'student' ? "I'm a Student" : "I'm an Agent"}
                  </button>
                ))}
              </div>

              <h2 className="text-xl font-bold text-[#222] mb-6">
                {role === 'student' ? 'Create Student Account' : 'Create Agent Account'}
              </h2>

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); window.location.href = '/portal/login'; }}>
                <div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-[#FFFCF5] text-sm outline-none focus:border-[#FD7E14]/60 focus:shadow-[0_0_0_3px_rgba(253,126,20,0.1)] transition-all"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-[#FFFCF5] text-sm outline-none focus:border-[#FD7E14]/60 focus:shadow-[0_0_0_3px_rgba(253,126,20,0.1)] transition-all"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-[#FFFCF5] text-sm outline-none focus:border-[#FD7E14]/60 focus:shadow-[0_0_0_3px_rgba(253,126,20,0.1)] transition-all"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Create Password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-[#FFFCF5] text-sm outline-none focus:border-[#FD7E14]/60 focus:shadow-[0_0_0_3px_rgba(253,126,20,0.1)] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl font-bold shadow-[0_8px_32px_rgba(253,126,20,0.35)] hover:shadow-[0_12px_40px_rgba(253,126,20,0.5)] hover:scale-[1.02] transition-all"
                >
                  Create Account <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              <p className="text-center text-sm text-[#999] mt-4">
                Already have an account?{' '}
                <Link to="/portal/login" className="text-[#FD7E14] font-semibold hover:underline">
                  Login →
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
