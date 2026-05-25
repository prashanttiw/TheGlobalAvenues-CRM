import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Briefcase, ArrowRight, Lock, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export function LoginPage() {
  const [role, setRole] = useState<'student' | 'agent'>('student');
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'student') {
      window.location.href = '/portal/student';
    } else {
      window.location.href = '/portal/agent';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFCF5] to-[#FFEBE0] pt-16 flex items-center justify-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#FD7E14]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#C94D1B]/5 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3" />
      
      <div className="max-w-md w-full px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-[0_20px_60px_rgba(253,126,20,0.15)] border border-[#FD7E14]/10"
        >
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FD7E14] to-[#C94D1B] flex items-center justify-center shadow-lg">
              <Globe className="w-7 h-7 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-[#333] mb-2">Welcome Back</h1>
          <p className="text-center text-[#666] mb-8 text-sm">Sign in to your Global Avenues portal</p>

          {/* Role selector */}
          <div className="flex rounded-xl bg-[#FFFCF5] p-1 mb-8 border border-[#FD7E14]/10">
            {(['student', 'agent'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === r ? 'bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white shadow-[0_4px_12px_rgba(253,126,20,0.3)]' : 'text-[#666] hover:text-[#FD7E14]'}`}
              >
                {r === 'student' ? <User className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                {r === 'student' ? "Student" : "Agent Partner"}
              </button>
            ))}
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-[#FFFCF5] text-sm outline-none focus:border-[#FD7E14] focus:shadow-[0_0_0_3px_rgba(253,126,20,0.1)] transition-all"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-[#333]">Password</label>
                <a href="#" className="text-xs text-[#FD7E14] hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#FD7E14]/20 bg-[#FFFCF5] text-sm outline-none focus:border-[#FD7E14] focus:shadow-[0_0_0_3px_rgba(253,126,20,0.1)] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1A0A00] text-white rounded-xl font-bold shadow-lg hover:bg-[#2D1200] hover:scale-[1.02] transition-all mt-6"
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-sm text-[#666] mt-6">
            Don't have an account?{' '}
            <Link to="/apply" className="text-[#FD7E14] font-semibold hover:underline">
              Register here
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
