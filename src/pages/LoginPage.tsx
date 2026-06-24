import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { User, Briefcase, ShieldCheck, ArrowRight, Lock, Globe, Mail, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';
import { clearAuthSession, fetchAgentProfile, fetchCurrentUser, fetchStudentProfile, loginWithPassword, requestOtpLogin, verifyOtpLogin } from '../lib/api';

export function LoginPage() {
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const upsertStudentRecord = useStore((state) => state.upsertStudentRecord);
  const upsertAgentRecord = useStore((state) => state.upsertAgentRecord);
  const navigate = useNavigate();

  const [role, setRole] = useState<'student' | 'agent' | 'admin'>('student');
  const [method, setMethod] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic Theme Colors depending on active role selection
  const getThemeClass = () => {
    if (role === 'student') return { primary: 'from-[#FD7E14] to-[#C94D1B]', accent: '#FD7E14', bg: 'bg-[#FD7E14]/10', shadow: 'rgba(253,126,20,0.15)' };
    if (role === 'agent') return { primary: 'from-[#2D1B69] to-[#3B2B85]', accent: '#2D1B69', bg: 'bg-[#2D1B69]/10', shadow: 'rgba(45,27,105,0.15)' };
    return { primary: 'from-[#0F0B1F] to-[#2D1B69]', accent: '#FFD700', bg: 'bg-[#FFD700]/10', shadow: 'rgba(255,215,0,0.15)' };
  };

  const theme = getThemeClass();

  const applyAuthenticatedUser = async () => {
    const user = await fetchCurrentUser();

    setCurrentUser({
      id: String(user.id),
      email: user.email,
      phone: user.phone,
      role: user.role as any,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      createdAt: new Date().toISOString(),
      status: user.status as any,
    });

    if (user.role === 'student') {
      const profile = await fetchStudentProfile();
      upsertStudentRecord({
        id: String(profile.id),
        userId: String(profile.user_id),
        firstName: profile.first_name,
        lastName: profile.last_name,
        dob: profile.dob ?? undefined,
        nationality: profile.nationality ?? undefined,
        desiredCountry: profile.desired_country ?? undefined,
        desiredSubject: profile.desired_subject ?? undefined,
        budgetRange: profile.budget_min && profile.budget_max ? `${profile.budget_min}-${profile.budget_max} ${profile.budget_currency ?? 'USD'}` : undefined,
        profileCompletionPct: profile.profile_completion,
        gamificationPoints: profile.gamification_points,
      });
    }

    if (user.role === 'agent' || user.role === 'sub_agent') {
      const profile = await fetchAgentProfile();
      upsertAgentRecord({
        id: String(profile.id),
        userId: String(profile.user_id),
        agencyName: profile.agency_name,
        agencyCountry: profile.agency_country,
        registrationNumber: profile.registration_number ?? '',
        partnershipType: profile.partnership_type,
        tier: profile.tier,
        status: profile.status === 'inactive' || profile.status === 'rejected' ? 'suspended' : (profile.status as any),
      });
    }

    return user;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (method === 'otp' && !isOtpSent) {
        await requestOtpLogin(email);
        setIsOtpSent(true);
        toast.success('OTP sent to your email address.');
        return;
      }

      if (method === 'otp') {
        await verifyOtpLogin(email, otpCode);
      } else {
        await loginWithPassword(email, password);
      }

      const user = await applyAuthenticatedUser();
      toast.success('Successfully signed in as TGA ' + user.role + '!');
      setTimeout(() => {
        if (user.role === 'student') navigate('/portal/student');
        else if (user.role === 'agent' || user.role === 'sub_agent') navigate('/portal/agent');
        else navigate('/portal/admin');
      }, 800);
    } catch (err) {
      clearAuthSession();
      toast.error('Authentication failed. Check your network or credentials.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFCF5] to-[#F8F7FF] pt-20 flex items-center justify-center relative overflow-hidden">
      <Toaster position="top-center" richColors />
      
      {/* Dynamic Background Auras shifting with theme choice */}
      <motion.div 
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4 pointer-events-none"
        animate={{ backgroundColor: role === 'student' ? '#FD7E14' : '#2D1B69' }}
        style={{ opacity: 0.05 }}
        transition={{ duration: 0.6 }}
      />
      <motion.div 
        className="absolute bottom-0 left-0 w-[550px] h-[550px] rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none"
        animate={{ backgroundColor: role === 'admin' ? '#FFD700' : '#C94D1B' }}
        style={{ opacity: 0.04 }}
        transition={{ duration: 0.6 }}
      />
      
      <div className="max-w-md w-full px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-150 transition-shadow duration-500 shadow-xl"
          style={{ boxShadow: `0 24px 60px ${theme.shadow}` }}
        >
          {/* Main Logo */}
          <div className="flex justify-center mb-6">
            <motion.div 
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.primary} flex items-center justify-center shadow-lg`}
              layout
            >
              <Globe className="w-6 h-6 text-white" />
            </motion.div>
          </div>
          
          <h1 className="text-2xl font-black text-center text-gray-900 mb-1">Portal Authentication</h1>
          <p className="text-center text-xs text-gray-400 mb-6">Access your student, partner, or internal CRM cockpit</p>

          {/* Interactive Role Switcher */}
          <div className="flex rounded-xl bg-gray-50 p-1 mb-6 border border-gray-200">
            {[
              { r: 'student', label: 'Student', icon: User },
              { r: 'agent', label: 'Agent', icon: Briefcase },
              { r: 'admin', label: 'Admin', icon: ShieldCheck }
            ].map(({ r, label, icon: Icon }) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r as any); setIsOtpSent(false); setOtpCode(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  role === r 
                    ? `bg-gradient-to-r ${theme.primary} text-white shadow-md` 
                    : 'text-gray-500 hover:text-[#FD7E14]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Toggle between password and OTP */}
          <div className="flex justify-end gap-3 mb-6 text-xs font-bold text-gray-400">
            <button 
              type="button" 
              onClick={() => { setMethod('password'); setIsOtpSent(false); }}
              className={`pb-1 border-b-2 transition-all ${method === 'password' ? 'border-[#FD7E14] text-gray-900' : 'border-transparent hover:text-gray-600'}`}
            >
              Password Login
            </button>
            <button 
              type="button" 
              onClick={() => setMethod('otp')}
              className={`pb-1 border-b-2 transition-all ${method === 'otp' ? 'border-[#FD7E14] text-gray-900' : 'border-transparent hover:text-gray-600'}`}
            >
              OTP Secure Login
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {!isOtpSent ? (
                <motion.div
                  key="email-fields"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        placeholder={`${role}@theglobalavenues.com`}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#FD7E14] focus:bg-white focus:ring-4 focus:ring-[#FD7E14]/8 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  {method === 'password' && (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                        <a href="#" className="text-[10px] font-bold text-[#FD7E14] hover:underline uppercase tracking-wider">Forgot?</a>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#FD7E14] focus:bg-white focus:ring-4 focus:ring-[#FD7E14]/8 transition-all"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="otp-fields"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  {/* OTP Code entry */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Verification OTP Code</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Enter 123456"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#FD7E14] focus:bg-white focus:ring-4 focus:ring-[#FD7E14]/8 tracking-[0.2em] font-extrabold text-center transition-all"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r ${theme.primary} text-white rounded-xl font-bold shadow-lg hover:scale-[1.01] transition-all mt-6 disabled:opacity-60 disabled:pointer-events-none`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {method === 'otp' && !isOtpSent ? 'Send Secure OTP' : 'Authorize Entrance'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social OAuth Google Button */}
          <div className="relative my-6 text-center">
            <span className="bg-white px-3 text-xs text-gray-400 relative z-10">Or connect with</span>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-150 z-0" />
          </div>

          <button
            type="button"
            onClick={() => {
              toast.info('Google social login UI is present, but the backend OAuth callback is not implemented yet.');
            }}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs shadow-sm transition-colors"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Google Social Login
          </button>

          <p className="text-center text-xs text-gray-400 mt-6">
            Don't have a workspace?{' '}
            <Link to="/apply" className="text-[#FD7E14] font-bold hover:underline">
              Create Student Account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
