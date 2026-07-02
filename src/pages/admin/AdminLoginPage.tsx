import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Lock, Mail, MessageSquare, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';
import {
  ApiRequestError,
  loginWithPassword,
  requestAdminOtpLogin,
  verifyAdminOtpLogin,
  verifyTwoFactorLogin,
  resend2faCode,
  type AuthLoginResult,
  type AuthSessionResult,
} from '../../lib/api';

import { useAuth } from '../../shared/hooks/useAuth';

export default function AdminLoginPage() {
  const establishSession = useAuth((state) => state.establishSession);
  const clearSession = useAuth((state) => state.clearSession);
  const navigate = useNavigate();
  const location = useLocation();

  const [method, setMethod] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const finishLogin = async (session: AuthSessionResult) => {
    await establishSession(session);
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    toast.success('Access granted. Welcome, Admin.');
    navigate(from && from.startsWith('/portal/admin') ? from : '/portal/admin', { replace: true });
  };

  const validateAdminRole = (result: AuthLoginResult): boolean => {
    const userRole = result.user?.role ?? (result.user as any)?.user_type;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      toast.error('This account does not have administrative access.');
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
        await requestAdminOtpLogin(email);
        setIsOtpSent(true);
        toast.success('OTP sent to your admin email address.');
        return;
      }

      const result: AuthLoginResult = twoFactorToken
        ? await verifyTwoFactorLogin(twoFactorToken, otpCode)
        : method === 'otp'
          ? await verifyAdminOtpLogin(email, otpCode)
          : await loginWithPassword(email, password, 'admin');

      if (result.requires2fa) {
        if (!result.preAuthToken) {
          throw new Error('Two-factor challenge token missing from response.');
        }
        setTwoFactorToken(result.preAuthToken);
        setIsOtpSent(true);
        setOtpCode('');
        toast.info('Enter the two-factor code sent to your admin email.');
        return;
      }

      if (!result.user || !result.accessToken) {
        throw new Error('Authentication response did not include a session.');
      }

      if (validateAdminRole(result)) return;

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
        await requestAdminOtpLogin(email);
      }
      toast.success('Verification code resent.');
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

  const submitText = method === 'otp' && !isOtpSent
    ? 'Send Secure OTP'
    : twoFactorToken
      ? 'Verify Two-Factor Code'
      : 'Access Admin Cockpit';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFCF5] to-[#F0EFF8] pt-20 flex items-center justify-center relative overflow-hidden">
      <Toaster position="top-center" richColors />

      {/* Purple ambient blobs */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4 pointer-events-none"
        style={{ backgroundColor: '#2D1B69', opacity: 0.06 }}
      />
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none"
        style={{ backgroundColor: '#1A0F3D', opacity: 0.05 }}
      />

      <div className="max-w-md w-full px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-150 shadow-xl"
          style={{ boxShadow: '0 24px 60px rgba(45,27,105,0.12)' }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D1B69] to-[#1A0F3D] flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-center text-gray-900 mb-1">Admin Cockpit</h1>
          <p className="text-center text-xs text-gray-400 mb-1">Internal CRM Administration</p>
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-100 text-[10px] font-bold text-purple-700 uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              Restricted Access
            </span>
          </div>

          {/* Login method tabs */}
          <div className="flex justify-end gap-3 mb-6 text-xs font-bold text-gray-400">
            {['password', 'otp'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMethod(m as 'password' | 'otp'); resetChallenge(); }}
                className={`pb-1 border-b-2 transition-all ${
                  method === m
                    ? 'border-[#2D1B69] text-gray-900'
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
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Admin Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        placeholder="admin@theglobalavenues.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#2D1B69] focus:bg-white focus:ring-4 focus:ring-[#2D1B69]/8 transition-all"
                      />
                    </div>
                  </div>

                  {method === 'password' && (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                        <Link
                          to="/portal/forgot-password"
                          state={{ source: 'admin' }}
                          className="text-[10px] font-bold text-[#2D1B69] hover:underline uppercase tracking-wider"
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
                          className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#2D1B69] focus:bg-white focus:ring-4 focus:ring-[#2D1B69]/8 transition-all"
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
                  <div className="bg-purple-50 rounded-xl px-4 py-3 text-xs text-purple-700 border border-purple-100">
                    {twoFactorToken
                      ? 'A two-factor verification code was sent to your admin email.'
                      : <>Secure code sent to <span className="font-bold">{email}</span></>
                    }
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                      {twoFactorToken ? 'Two-Factor Code' : 'Verification OTP Code'}
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter 6-digit code"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#2D1B69] focus:bg-white focus:ring-4 focus:ring-[#2D1B69]/8 tracking-[0.2em] font-extrabold text-center transition-all"
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
                      className="flex items-center gap-1 text-[#2D1B69] hover:underline font-bold disabled:opacity-50"
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
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#2D1B69] to-[#1A0F3D] text-white rounded-xl font-bold shadow-lg hover:scale-[1.01] transition-all mt-6 disabled:opacity-60 disabled:pointer-events-none"
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

          <p className="text-center text-xs text-gray-400 mt-6">
            <Link to="/portal/login" className="text-gray-500 font-bold hover:text-gray-700 hover:underline">
              ← Student / Agent Portal
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
