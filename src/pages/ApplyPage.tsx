import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  User, Briefcase, ArrowRight, CheckCircle,
  Eye, EyeOff, Mail, Lock, RefreshCw, ShieldCheck, Phone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';
import {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  completeStudentRegistration,
  completeAgentRegistration,
} from '../lib/api';
import { useAuth } from '../shared/hooks/useAuth';
import { COMPANY } from '../data/company';

type Role = 'student' | 'agent';
type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { label: 'Your Details', desc: 'Name, mobile & email' },
  { label: 'Confirm Code', desc: 'Enter 6-digit OTP' },
  { label: 'Set Password', desc: 'Secure your account' },
];

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z\d]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = score <= 1 ? 'Weak' : score <= 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';
  const color =
    score <= 1 ? 'bg-red-400' :
    score <= 3 ? 'bg-yellow-400' :
    score === 4 ? 'bg-blue-400' : 'bg-green-500';
  return (
    <div className="mt-1.5">
      <div className="flex gap-0.5 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? color : 'bg-gray-200'}`} />
        ))}
      </div>
      <span className="text-[10px] text-gray-400 font-semibold">{label}</span>
    </div>
  );
}

export function ApplyPage() {
  const establishSession = useAuth((state) => state.establishSession);
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<Role>(searchParams.get('role') === 'agent' ? 'agent' : 'student');
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 2
  const [sessionToken, setSessionToken] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Step 3 — password only
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isStudent = role === 'student';
  const themeFrom = isStudent ? '#FD7E14' : '#2D1B69';
  const themeTo = isStudent ? '#C94D1B' : '#3B2B85';
  const themeGlow = isStudent ? 'rgba(253,126,20,0.12)' : 'rgba(45,27,105,0.12)';
  const focusBorder = isStudent ? 'focus:border-[#FD7E14]' : 'focus:border-[#2D1B69]';
  const focusRing = isStudent ? 'focus:ring-[#FD7E14]/15' : 'focus:ring-[#2D1B69]/15';

  const currentStepIdx = step - 1;

  const inputClass = `w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none ${focusBorder} focus:bg-white focus:ring-4 ${focusRing} transition-all placeholder:text-gray-400`;

  const handleSendOtp = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error('Please enter your full name.');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      toast.error('Please enter a valid mobile number.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const result = await sendRegistrationOtp(email, role, fullName.trim(), phone.trim());
      setSessionToken(result.session_token);
      toast.success('Verification code sent to your email.');
      setStep(2);
    } catch (err: any) {
      const msg: string = err.message || '';
      if (msg.toLowerCase().includes('already registered')) {
        toast.error('This email is already registered. Please log in instead.');
      } else if (msg.includes('OTP_RATE_LIMITED')) {
        const secs = parseInt(msg.split(':')[1] || '60', 10);
        toast.error(`Too many OTP requests. Please wait ${Math.ceil(secs / 60)} min before trying again.`);
      } else {
        toast.error(msg || 'Failed to send verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      const result = await sendRegistrationOtp(email, role, fullName.trim(), phone.trim());
      setSessionToken(result.session_token);
      setOtpCode('');
      toast.success('New verification code sent.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      await verifyRegistrationOtp(sessionToken, otpCode);
      toast.success('Email verified!');
      setStep(3);
    } catch (err: any) {
      const msg: string = err.message || '';
      if (msg.toLowerCase().includes('expired')) {
        toast.error('Code expired. Please request a new one.');
      } else if (msg.toLowerCase().includes('brute') || msg.toLowerCase().includes('attempts')) {
        toast.error('Too many failed attempts. Please request a new code.');
        setOtpCode('');
      } else {
        toast.error('Invalid verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!password) { toast.error('Please create a password.'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password)) {
      toast.error('Password must be 8+ characters with upper, lower, number, and special character.');
      return;
    }
    if (password !== confirmPassword) { toast.error('Passwords do not match.'); return; }

    setLoading(true);
    try {
      if (isStudent) {
        const result = await completeStudentRegistration(sessionToken, password);
        await establishSession(result as any);
      } else {
        await completeAgentRegistration(sessionToken, { password });
      }
      toast.success(isStudent ? 'Welcome to TGA!' : 'Account created!');
      setStep(4);
    } catch (err: any) {
      const msg: string = err.message || '';
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('expired')) {
        toast.error('Your session expired. Please start over.');
        setStep(1);
        setSessionToken('');
        setOtpCode('');
      } else {
        toast.error(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const btnStyle = {
    background: `linear-gradient(135deg, ${themeFrom}, ${themeTo})`,
    boxShadow: `0 8px 24px ${themeGlow}`,
  };

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24 flex items-center relative overflow-hidden">
      <Toaster position="top-center" richColors />

      <div
        className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full blur-[130px] -translate-y-1/3 translate-x-1/4 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${themeFrom}18 0%, transparent 70%)` }}
      />

      <div className="max-w-6xl mx-auto px-6 py-12 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-12 items-start">

          {/* Left: branding + onboarding map */}
          <div>
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl border border-[#FD7E14]/15 bg-white flex items-center justify-center shadow-lg">
                  <img
                    src={COMPANY.logoMarkUrl}
                    alt=""
                    aria-hidden="true"
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <span className="text-sm font-black text-gray-800 tracking-tight uppercase">The Global Avenues</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-black text-[#1A1A1A] leading-tight mb-4 tracking-tight">
                {isStudent
                  ? <>Unlock Premium Pathways to <span className="text-gradient-orange">Europe & Beyond</span></>
                  : <>Join the TGA <span style={{ color: '#2D1B69' }}>Partner Network</span></>
                }
              </h1>
              <p className="text-base text-[#666] mb-10 leading-relaxed max-w-lg">
                {isStudent
                  ? 'Create your profile in 3 simple steps. TGA matches your goals with partner universities across Europe and beyond.'
                  : 'Register as a certified TGA education agent and earn commissions on every successful enrollment.'
                }
              </p>

              {step < 4 && (
                <div className="max-w-sm bg-white border border-gray-150 rounded-2xl p-5 shadow-sm">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Onboarding Map</div>
                  <div className="space-y-3">
                    {STEPS.map((s, i) => {
                      const done = currentStepIdx > i;
                      const active = currentStepIdx === i;
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all ${
                              done
                                ? 'bg-green-500 text-white'
                                : active
                                ? 'text-white'
                                : 'bg-gray-100 border border-gray-200 text-gray-400'
                            }`}
                            style={active ? { background: `linear-gradient(135deg, ${themeFrom}, ${themeTo})`, boxShadow: `0 0 0 4px ${themeFrom}22` } : {}}
                          >
                            {done ? <CheckCircle className="w-4 h-4" /> : <span>{String(i + 1).padStart(2, '0')}</span>}
                          </div>
                          <div className="pt-0.5">
                            <div
                              className={`text-xs font-bold transition-colors ${active ? '' : done ? 'text-gray-700' : 'text-gray-400'}`}
                              style={active ? { color: themeFrom } : {}}
                            >
                              {s.label}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{s.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-[10px] text-gray-400 font-semibold leading-tight">
                      256-bit encrypted &middot; ICEF certified &middot; Your data stays private
                    </span>
                  </div>
                </div>
              )}

              {step === 4 && isStudent && (
                <div className="max-w-sm bg-white border border-gray-150 rounded-3xl p-6 shadow-sm mt-2">
                  <p className="text-[#555] italic text-sm mb-4 leading-relaxed">
                    "I registered in 2 minutes and TGA fast-tracked my admission offer from an Austrian university in 14 days!"
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow"
                      style={{ background: `linear-gradient(135deg, ${themeFrom}, ${themeTo})` }}
                    >A</div>
                    <div>
                      <div className="font-bold text-gray-900 text-xs">Aarav Sharma</div>
                      <div className="text-[10px] text-gray-400 font-semibold">FH Kufstein &middot; 2026 Cohort</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right: step cards */}
          <div>
            <AnimatePresence mode="wait">

              {/* STEP 4: SUCCESS */}
              {step === 4 && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl p-8 border border-gray-150 shadow-xl text-center"
                  style={{ boxShadow: `0 24px 60px ${themeGlow}` }}
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-400/20 flex items-center justify-center text-green-500 mx-auto mb-5">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">
                    {isStudent ? 'Welcome to TGA!' : 'Account Created!'}
                  </h2>
                  <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-xs mx-auto">
                    {isStudent
                      ? 'Your account is ready. Explore your student portal, track applications, and connect with your advisor.'
                      : 'Log in to complete your partner application — it only takes a few minutes.'}
                  </p>
                  <button
                    onClick={() => navigate(isStudent ? '/portal/student' : '/portal/login')}
                    className="w-full flex items-center justify-center gap-2 py-3.5 text-white rounded-xl font-bold hover:scale-[1.01] transition-transform"
                    style={btnStyle}
                  >
                    {isStudent ? 'Enter My Portal' : 'Log In to Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* STEP 1: EMAIL */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-150 shadow-xl"
                  style={{ boxShadow: `0 24px 60px ${themeGlow}` }}
                >
                  {/* Role toggle */}
                  <div className="flex rounded-xl bg-gray-50 p-1 mb-6 border border-gray-200">
                    {([
                      { r: 'student', label: "I'm a Student", icon: User },
                      { r: 'agent', label: "I'm an Agent", icon: Briefcase },
                    ] as const).map(({ r, label, icon: Icon }) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                          role === r ? 'text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
                        }`}
                        style={role === r ? { background: `linear-gradient(135deg, ${themeFrom}, ${themeTo})` } : {}}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  <h2 className="text-xl font-black text-gray-900 mb-1">
                    {isStudent ? 'Create Student Account' : 'Apply as Agency Partner'}
                  </h2>
                  <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                    Tell us a bit about yourself and we'll send a 6-digit verification code to your email.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                          className={`${inputClass} pl-10`}
                          autoFocus
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="10-digit mobile number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          placeholder={isStudent ? 'your@email.com' : 'agency@email.com'}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 text-white rounded-xl font-bold hover:scale-[1.01] transition-transform disabled:opacity-60 disabled:pointer-events-none"
                      style={btnStyle}
                    >
                      {loading
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><Mail className="w-4 h-4" /> Send Verification Code</>
                      }
                    </button>
                  </div>

                  <p className="text-center text-xs text-gray-400 mt-5">
                    Already registered?{' '}
                    <Link to="/portal/login" className="font-bold hover:underline" style={{ color: themeFrom }}>
                      Log in &rarr;
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* STEP 2: OTP */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-150 shadow-xl"
                  style={{ boxShadow: `0 24px 60px ${themeGlow}` }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 mx-auto shadow-md"
                    style={{ background: `linear-gradient(135deg, ${themeFrom}, ${themeTo})` }}
                  >
                    <Mail className="w-6 h-6 text-white" />
                  </div>

                  <h2 className="text-xl font-black text-gray-900 mb-1 text-center">Check Your Email</h2>
                  <p className="text-xs text-gray-500 mb-6 text-center leading-relaxed">
                    We sent a 6-digit code to <span className="font-bold text-gray-700">{email}</span>
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider text-center">Verification Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                        className={`${inputClass} text-center tracking-[0.5em] font-extrabold text-xl`}
                        autoFocus
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={loading || otpCode.length !== 6}
                      className="w-full flex items-center justify-center gap-2 py-3.5 text-white rounded-xl font-bold hover:scale-[1.01] transition-transform disabled:opacity-60 disabled:pointer-events-none"
                      style={btnStyle}
                    >
                      {loading
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><ShieldCheck className="w-4 h-4" /> Verify Code</>
                      }
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => { setStep(1); setOtpCode(''); }}
                        className="text-gray-400 hover:text-gray-600 font-semibold transition-colors"
                      >
                        &larr; Change email
                      </button>
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending}
                        className="flex items-center gap-1 font-bold hover:underline disabled:opacity-50 transition-colors"
                        style={{ color: themeFrom }}
                      >
                        <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                        Resend code
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: PASSWORD ONLY */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-150 shadow-xl"
                  style={{ boxShadow: `0 24px 60px ${themeGlow}` }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 mx-auto shadow-md"
                    style={{ background: `linear-gradient(135deg, ${themeFrom}, ${themeTo})` }}
                  >
                    <Lock className="w-6 h-6 text-white" />
                  </div>

                  <h2 className="text-xl font-black text-gray-900 mb-1 text-center">Set Your Password</h2>
                  <p className="text-xs text-gray-400 mb-5 text-center leading-relaxed">
                    Create a strong password to secure your account.
                  </p>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputClass} pl-10 pr-11`}
                          autoFocus
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
                      <PasswordStrengthBar password={password} />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleComplete()}
                          className={`${inputClass} pl-10 pr-11 ${
                            confirmPassword && password !== confirmPassword ? 'border-red-400 focus:border-red-400' : ''
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
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-[10px] text-red-500 font-semibold mt-1">Passwords do not match</p>
                      )}
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[10px] text-gray-500 leading-relaxed">
                      Must be 8+ characters including uppercase, lowercase, a number, and a special character.
                    </div>

                    <button
                      type="button"
                      onClick={handleComplete}
                      disabled={loading || Boolean(confirmPassword && password !== confirmPassword)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 text-white rounded-xl font-bold hover:scale-[1.01] transition-transform disabled:opacity-60 disabled:pointer-events-none mt-1"
                      style={btnStyle}
                    >
                      {loading
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <>{isStudent ? 'Complete Registration' : 'Submit Application'} <ArrowRight className="w-4 h-4" /></>
                      }
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full text-center text-xs text-gray-400 hover:text-gray-600 font-semibold transition-colors"
                    >
                      &larr; Back
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
