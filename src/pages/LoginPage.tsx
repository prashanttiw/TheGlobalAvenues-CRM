import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Briefcase, ShieldCheck, ArrowRight, Lock, Globe, Mail, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';
import {
  ApiRequestError,
  loginWithPassword,
  requestOtpLogin,
  verifyOtpLogin,
  verifyTwoFactorLogin,
  type AuthLoginResult,
  type AuthSessionResult,
} from '../lib/api';
import { useAuth } from '../shared/hooks/useAuth';

function resolveAgentStatusPath(result: AuthLoginResult): string | null {
  if (result.accountStatus === 'pending_approval') return '/portal/agent/pending';
  if (result.accountStatus === 'rejected') return '/portal/agent/rejected';
  return null;
}

export function LoginPage() {
  const establishSession = useAuth((state) => state.establishSession);
  const clearSession = useAuth((state) => state.clearSession);
  const navigate = useNavigate();
  const location = useLocation();

  const [portalHint, setPortalHint] = useState<'student' | 'agent' | 'admin'>('student');
  const [method, setMethod] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getThemeClass = () => {
    if (portalHint === 'student') return { primary: 'from-[#FD7E14] to-[#C94D1B]', shadow: 'rgba(253,126,20,0.15)' };
    if (portalHint === 'agent') return { primary: 'from-[#2D1B69] to-[#3B2B85]', shadow: 'rgba(45,27,105,0.15)' };
    return { primary: 'from-[#0F0B1F] to-[#2D1B69]', shadow: 'rgba(255,215,0,0.15)' };
  };

  const theme = getThemeClass();


  const finishLogin = async (session: AuthSessionResult) => {
    await establishSession(session);

    const targetRole = session.user.role === 'sub_agent' ? 'agent' : session.user.role;
    const fallbackPath = targetRole === 'student' ? '/portal/student' : targetRole === 'agent' ? '/portal/agent' : '/portal/admin';
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

    toast.success('Successfully signed in.');
    navigate(from && from.startsWith('/portal') ? from : fallbackPath, { replace: true });
  };

  const handleAccountStatus = (result: AuthLoginResult) => {
    const destination = resolveAgentStatusPath(result);
    if (!destination) return false;

    clearSession(false);
    navigate(destination, {
      replace: true,
      state: {
        email,
        message: result.message,
        submittedAt: result.submittedAt,
        rejectionReason: result.rejectionReason,
      },
    });
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (method === 'otp' && !isOtpSent) {
        await requestOtpLogin(email);
        setIsOtpSent(true);
        toast.success('OTP sent to your email address.');
        return;
      }

      const result = twoFactorToken
        ? await verifyTwoFactorLogin(twoFactorToken, otpCode)
        : method === 'otp'
          ? await verifyOtpLogin(email, otpCode)
          : await loginWithPassword(email, password);

      if (result.requires2fa) {
        if (!result.preAuthToken) {
          throw new Error('Two-factor challenge token missing from response.');
        }
        setTwoFactorToken(result.preAuthToken);
        setIsOtpSent(true);
        setOtpCode('');
        toast.info('Enter the two-factor code sent to your email.');
        return;
      }

      if (handleAccountStatus(result)) {
        return;
      }

      if (!result.user || !result.accessToken) {
        throw new Error('Authentication response did not include a session.');
      }

      await finishLogin({ user: result.user, accessToken: result.accessToken });
    } catch (err) {
      clearSession(false);
      const message = err instanceof ApiRequestError || err instanceof Error
        ? err.message
        : 'Authentication failed. Check your network or credentials.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resetChallenge = () => {
    setIsOtpSent(false);
    setOtpCode('');
    setTwoFactorToken(null);
  };

  const otpLabel = twoFactorToken ? 'Two-Factor Verification Code' : 'Verification OTP Code';
  const submitText = method === 'otp' && !isOtpSent
    ? 'Send Secure OTP'
    : twoFactorToken
      ? 'Verify Two-Factor Code'
      : 'Authorize Entrance';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFCF5] to-[#F8F7FF] pt-20 flex items-center justify-center relative overflow-hidden">
      <Toaster position="top-center" richColors />

      <motion.div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4 pointer-events-none"
        animate={{ backgroundColor: portalHint === 'student' ? '#FD7E14' : '#2D1B69' }}
        style={{ opacity: 0.05 }}
        transition={{ duration: 0.6 }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-[550px] h-[550px] rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none"
        animate={{ backgroundColor: portalHint === 'admin' ? '#FFD700' : '#C94D1B' }}
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
          <div className="flex justify-center mb-6">
            <motion.div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.primary} flex items-center justify-center shadow-lg`}
              layout
            >
              <Globe className="w-6 h-6 text-white" />
            </motion.div>
          </div>

          <h1 className="text-2xl font-black text-center text-gray-900 mb-1">Portal Authentication</h1>
          <p className="text-center text-xs text-gray-400 mb-6">Access your student, agent, or internal CRM cockpit</p>

          <div className="flex rounded-xl bg-gray-50 p-1 mb-6 border border-gray-200">
            {[
              { r: 'student', label: 'Student', icon: User },
              { r: 'agent', label: 'Agent', icon: Briefcase },
              { r: 'admin', label: 'Admin', icon: ShieldCheck }
            ].map(({ r, label, icon: Icon }) => (
              <button
                key={r}
                type="button"
                onClick={() => { setPortalHint(r as any); resetChallenge(); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  portalHint === r
                    ? `bg-gradient-to-r ${theme.primary} text-white shadow-md`
                    : 'text-gray-500 hover:text-[#FD7E14]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3 mb-6 text-xs font-bold text-gray-400">
            <button
              type="button"
              onClick={() => { setMethod('password'); resetChallenge(); }}
              className={`pb-1 border-b-2 transition-all ${method === 'password' ? 'border-[#FD7E14] text-gray-900' : 'border-transparent hover:text-gray-600'}`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => { setMethod('otp'); resetChallenge(); }}
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
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        placeholder={`${portalHint}@theglobalavenues.com`}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#FD7E14] focus:bg-white focus:ring-4 focus:ring-[#FD7E14]/8 transition-all"
                      />
                    </div>
                  </div>

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
                          placeholder="Password"
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
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">{otpLabel}</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter 6-digit OTP"
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
                  {submitText}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

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

