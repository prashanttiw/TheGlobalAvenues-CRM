import { useState, useMemo, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, MessageSquare, Lock, Eye, EyeOff, ArrowRight, CheckCircle, RefreshCw, GraduationCap, Users, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';
import { ApiRequestError, requestForgotPassword, verifyForgotPasswordOtp, confirmForgotPassword } from '../lib/api';

type Step = 'email' | 'otp' | 'reset' | 'done';
type Role = 'student' | 'agent' | 'admin';

const ALL_ROLES: { value: Role; label: string; icon: React.ReactNode }[] = [
  { value: 'student', label: 'Student', icon: <GraduationCap className="w-4 h-4" /> },
  { value: 'agent', label: 'Agent', icon: <Users className="w-4 h-4" /> },
  { value: 'admin', label: 'Admin', icon: <ShieldCheck className="w-4 h-4" /> },
];

export function ForgotPasswordPage() {
  const location = useLocation();
  const isAdminSource = (location.state as { source?: string } | null)?.source === 'admin';

  const availableRoles = useMemo(
    () => isAdminSource ? ALL_ROLES : ALL_ROLES.filter((r) => r.value !== 'admin'),
    [isAdminSource]
  );

  const [step, setStep] = useState<Step>('email');
  const [role, setRole] = useState<Role>(isAdminSource ? 'admin' : 'student');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestForgotPassword(email, role);
      setStep('otp');
      toast.success('Reset OTP sent to your email address.');
    } catch (err) {
      const message = err instanceof ApiRequestError || err instanceof Error
        ? err.message : 'Failed to send OTP. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      await requestForgotPassword(email, role);
      toast.success('OTP resent to your email.');
    } catch {
      toast.error('Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await verifyForgotPasswordOtp(email, otpCode, role);
      setResetToken(token);
      setStep('reset');
    } catch (err) {
      const message = err instanceof ApiRequestError || err instanceof Error
        ? err.message : 'Invalid or expired OTP.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await confirmForgotPassword(resetToken, newPassword, confirmPassword);
      setStep('done');
    } catch (err) {
      const message = err instanceof ApiRequestError || err instanceof Error
        ? err.message : 'Failed to reset password. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const stepConfig = {
    email: { title: 'Forgot Password', subtitle: 'Enter your email to receive a reset OTP' },
    otp: { title: 'Check Your Email', subtitle: `Enter the 6-digit code sent to ${email}` },
    reset: { title: 'Create New Password', subtitle: 'Choose a strong password for your account' },
    done: { title: 'Password Reset!', subtitle: 'Your password has been updated successfully' },
  };

  const { title, subtitle } = stepConfig[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFCF5] to-[#F8F7FF] pt-20 flex items-center justify-center relative overflow-hidden">
      <Toaster position="top-center" richColors />

      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4 pointer-events-none"
        style={{ backgroundColor: '#FD7E14', opacity: 0.05 }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none"
        style={{ backgroundColor: '#C94D1B', opacity: 0.04 }}
      />

      <div className="max-w-md w-full px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-150 shadow-xl"
          style={{ boxShadow: '0 24px 60px rgba(253,126,20,0.10)' }}
        >
          {/* Step progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {(['email', 'otp', 'reset', 'done'] as Step[]).map((s, i) => (
              <motion.div
                key={s}
                className="h-1.5 rounded-full transition-all duration-300"
                animate={{
                  width: step === s ? 24 : 8,
                  backgroundColor: (['email', 'otp', 'reset', 'done'] as Step[]).indexOf(step) >= i
                    ? '#FD7E14'
                    : '#E5E7EB',
                }}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-5">
            <AnimatePresence mode="wait">
              {step === 'done' ? (
                <motion.div
                  key="done-icon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center"
                >
                  <CheckCircle className="w-7 h-7 text-green-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="step-icon"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FD7E14] to-[#C94D1B] flex items-center justify-center shadow-lg"
                >
                  {step === 'email' && <Mail className="w-6 h-6 text-white" />}
                  {step === 'otp' && <MessageSquare className="w-6 h-6 text-white" />}
                  {step === 'reset' && <Lock className="w-6 h-6 text-white" />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <h1 className="text-2xl font-black text-center text-gray-900 mb-1">{title}</h1>
          <p className="text-center text-xs text-gray-400 mb-6">{subtitle}</p>

          <AnimatePresence mode="wait">
            {/* Step 1 — Email */}
            {step === 'email' && (
              <motion.form
                key="email-step"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="space-y-4"
                onSubmit={handleEmailSubmit}
              >
                {/* Account type selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Account Type</label>
                  <div className={`grid gap-2 ${availableRoles.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {availableRoles.map(({ value, label, icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRole(value)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          role === value
                            ? 'border-[#FD7E14] bg-orange-50 text-[#FD7E14]'
                            : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white'
                        }`}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      placeholder="your@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#FD7E14] focus:bg-white focus:ring-4 focus:ring-[#FD7E14]/8 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl font-bold shadow-lg hover:scale-[1.01] transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Send Reset OTP <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400">
                  <Link to="/portal/login" className="text-[#FD7E14] font-bold hover:underline">
                    ← Back to Login
                  </Link>
                </p>
              </motion.form>
            )}

            {/* Step 2 — OTP */}
            {step === 'otp' && (
              <motion.form
                key="otp-step"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="space-y-4"
                onSubmit={handleOtpSubmit}
              >
                <div className="bg-orange-50 rounded-xl px-4 py-3 text-xs text-orange-700 border border-orange-100">
                  Code sent to <span className="font-bold">{email}</span>. Check your inbox.
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Reset OTP Code</label>
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

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl font-bold shadow-lg hover:scale-[1.01] transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Verify OTP <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setOtpCode(''); }}
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
                    Resend OTP
                  </button>
                </div>
              </motion.form>
            )}

            {/* Step 3 — New Password */}
            {step === 'reset' && (
              <motion.form
                key="reset-step"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="space-y-4"
                onSubmit={handleResetSubmit}
              >
                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#FD7E14] focus:bg-white focus:ring-4 focus:ring-[#FD7E14]/8 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repeat new password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-10 pr-11 py-3 rounded-xl border bg-gray-50 text-sm outline-none focus:bg-white focus:ring-4 transition-all ${
                        confirmPassword && newPassword !== confirmPassword
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : 'border-gray-200 focus:border-[#FD7E14] focus:ring-[#FD7E14]/8'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[10px] text-red-500 font-medium mt-1">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword || newPassword !== confirmPassword}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl font-bold shadow-lg hover:scale-[1.01] transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Set New Password <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </motion.form>
            )}

            {/* Step 4 — Done */}
            {step === 'done' && (
              <motion.div
                key="done-step"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 text-center"
              >
                <div className="bg-green-50 rounded-xl px-4 py-4 border border-green-100">
                  <p className="text-sm text-green-700 font-medium">
                    Your password has been reset. You can now log in with your new credentials.
                  </p>
                </div>

                <Link
                  to="/portal/login"
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl font-bold shadow-lg hover:scale-[1.01] transition-all"
                >
                  Back to Login <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
