import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Briefcase, ArrowRight, Lock, Globe, Mail, MessageSquare, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';
import {
  ApiRequestError,
  loginWithPassword,
  requestOtpLogin,
  verifyOtpLogin,
  verifyTwoFactorLogin,
  resend2faCode,
  type AuthLoginResult,
  type AuthSessionResult,
} from '../lib/api';
import { useAuth } from '../shared/hooks/useAuth';

export function LoginPage() {
  const establishSession = useAuth((state) => state.establishSession);
  const clearSession = useAuth((state) => state.clearSession);
  const sessionExpired = useAuth((state) => state.sessionExpired);
  const acknowledgeSessionExpired = useAuth((state) => state.acknowledgeSessionExpired);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (sessionExpired) {
      toast.error('Your session has expired. Please sign in again.');
      acknowledgeSessionExpired();
    }
  }, [sessionExpired, acknowledgeSessionExpired]);

  const [portalHint, setPortalHint] = useState<'student' | 'agent'>('student');
  const [method, setMethod] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const theme = portalHint === 'student'
    ? { primary: 'from-[#FD7E14] to-[#C94D1B]', shadow: 'rgba(253,126,20,0.15)', active: 'border-[#FD7E14]' }
    : { primary: 'from-[#2D1B69] to-[#3B2B85]', shadow: 'rgba(45,27,105,0.15)', active: 'border-[#2D1B69]' };

  const finishLogin = async (session: AuthSessionResult) => {
    await establishSession(session);
    const targetRole = session.user.role === 'sub_agent' ? 'agent' : session.user.role;
    const fallbackPath = targetRole === 'student' ? '/portal/student' : '/portal/agent';
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    toast.success('Successfully signed in.');
    navigate(from && from.startsWith('/portal') ? from : fallbackPath, { replace: true });
  };

  const validateRole = (result: AuthLoginResult): boolean => {
    const userRole = result.user?.role ?? (result.user as any)?.user_type;
    if (!userRole) return false;
    if (portalHint === 'student' && userRole !== 'student') {
      toast.error('No student account found for this email. Please register as a student first.');
      clearSession(false);
      return true;
    }
    if (portalHint === 'agent' && userRole !== 'agent') {
      toast.error('No agent account found for this email. Please register as an agent first.');
      clearSession(false);
      return true;
    }
    return false;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (method === 'otp' && !isOtpSent) {
        await requestOtpLogin(email, portalHint);
        setIsOtpSent(true);
        toast.success('Verification code sent to your email.');
        return;
      }

      const result: AuthLoginResult = twoFactorToken
        ? await verifyTwoFactorLogin(twoFactorToken, otpCode)
        : method === 'otp'
          ? await verifyOtpLogin(email, otpCode, portalHint)
          : await loginWithPassword(email, password, portalHint);

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

      if (!result.user || !result.accessToken) {
        throw new Error('Authentication response did not include a session.');
      }

      if (validateRole(result)) return;

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

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      if (twoFactorToken) {
        await resend2faCode(twoFactorToken);
      } else {
        await requestOtpLogin(email, portalHint);
      }
      toast.success('Verification code resent to your email.');
    } catch {
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
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
        animate={{ backgroundColor: '#C94D1B' }}
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
          <p className="text-center text-xs text-gray-400 mb-6">Access your student or agent workspace</p>

          {/* Portal tabs — Student + Agent only */}
          <div className="flex rounded-xl bg-gray-50 p-1 mb-6 border border-gray-200">
            {[
              { r: 'student', label: 'Student', icon: User },
              { r: 'agent', label: 'Agent', icon: Briefcase },
            ].map(({ r, label, icon: Icon }) => (
              <button
                key={r}
                type="button"
                onClick={() => { setPortalHint(r as 'student' | 'agent'); resetChallenge(); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  portalHint === r
                    ? `bg-gradient-to-r ${theme.primary} text-white shadow-md`
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Login method tabs */}
          <div className="flex justify-end gap-3 mb-6 text-xs font-bold text-gray-400">
            {['password', 'otp'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMethod(m as 'password' | 'otp'); resetChallenge(); }}
                className={`pb-1 border-b-2 transition-all capitalize ${
                  method === m
                    ? `border-[#FD7E14] text-gray-900`
                    : 'border-transparent hover:text-gray-600'
                }`}
              >
                {m === 'password' ? 'Password Login' : 'OTP Secure Login'}
              </button>
            ))}
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
                        placeholder={`${portalHint}@theglobalavenues.com`}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#FD7E14] focus:bg-white focus:ring-4 focus:ring-[#FD7E14]/8 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password with eye toggle */}
                  {method === 'password' && (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                        <Link
                          to="/portal/forgot-password"
                          state={{ source: 'portal' }}
                          className="text-[10px] font-bold text-[#FD7E14] hover:underline uppercase tracking-wider"
                        >
                          Forgot?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#FD7E14] focus:bg-white focus:ring-4 focus:ring-[#FD7E14]/8 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
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
                  {/* OTP hint */}
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 border border-gray-200">
                    {twoFactorToken
                      ? 'A two-factor verification code was sent to your email.'
                      : <>Code sent to <span className="font-bold text-gray-700">{email}</span></>
                    }
                  </div>

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
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#FD7E14] focus:bg-white focus:ring-4 focus:ring-[#FD7E14]/8 tracking-[0.2em] font-extrabold text-center transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={resetChallenge}
                      className="text-gray-400 hover:text-gray-600 font-medium transition-colors"
                    >
                      ← Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="flex items-center gap-1 text-[#FD7E14] hover:underline font-bold disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                      Resend code
                    </button>
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
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200 z-0" />
          </div>

          <button
            type="button"
            onClick={() => toast.info('Google social login UI is present, but the backend OAuth callback is not implemented yet.')}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.53z" />
            </svg>
            Google Social Login
          </button>

          <div className="mt-6 flex flex-col items-center gap-2 text-xs text-gray-400">
            <p>
              Don't have a workspace?{' '}
              <Link
                to={portalHint === 'agent' ? '/apply?role=agent' : '/apply'}
                className="text-[#FD7E14] font-bold hover:underline"
              >
                {portalHint === 'agent' ? 'Create Agent Account' : 'Create Student Account'}
              </Link>
            </p>
            <p>
              Admin?{' '}
              <Link to="/portal/admin/login" className="text-gray-500 font-bold hover:text-gray-700 hover:underline">
                Admin Portal →
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
