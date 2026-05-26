import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStore } from '../hooks/useStore';
import { User, Briefcase, ArrowRight, CheckCircle, Globe, GraduationCap, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';

// Zod Validations schemas
const studentSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid 10-digit phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  gpa: z.string().min(1, 'GPA / academic score is required'),
  englishScore: z.string().min(1, 'Please enter your IELTS/proficiency score'),
  desiredCountry: z.string().min(1, 'Please select your target country'),
  desiredSubject: z.string().min(1, 'Please select your preferred study area'),
  budgetRange: z.string().min(1, 'Please select your annual tuition budget'),
});

const agentSchema = z.object({
  agencyName: z.string().min(2, 'Agency name is required'),
  agencyCountry: z.string().min(2, 'Agency headquarters country is required'),
  registrationNumber: z.string().min(4, 'Please enter a valid business registration number'),
  email: z.string().email('Please enter a valid agency email'),
  phone: z.string().min(10, 'Please enter a valid agency phone contact'),
  partnershipType: z.enum(['exclusive', 'non_exclusive']),
});

const PUBLIC_STEPS = [
  { step: '01', title: 'Basic Details', desc: 'Secure register' },
  { step: '02', title: 'Academics', desc: 'Grades & scores' },
  { step: '03', title: 'Preferences', desc: 'Budget & goals' },
];

export function ApplyPage() {
  const login = useStore((state) => state.login);
  const updateProfile = useStore((state) => state.updateProfile);
  const navigate = useNavigate();

  const [role, setRole] = useState<'student' | 'agent'>('student');
  const [currentStep, setCurrentStep] = useState(1);
  const [successMode, setSuccessMode] = useState(false);

  // Dynamic Theme Colors depending on active role selection
  const theme = role === 'student'
    ? { primary: 'from-[#FD7E14] to-[#C94D1B]', accent: '#FD7E14', glow: 'rgba(253,126,20,0.15)' }
    : { primary: 'from-[#2D1B69] to-[#3B2B85]', accent: '#2D1B69', glow: 'rgba(45,27,105,0.15)' };

  // Forms hook-ups
  const {
    register: regStudent,
    handleSubmit: handleStudentSubmit,
    trigger: triggerStudent,
    formState: { errors: errorsStudent },
    getValues: getValuesStudent
  } = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      gpa: '90%',
      englishScore: 'IELTS 7.5',
      desiredCountry: 'Austria',
      desiredSubject: 'IT & Game Design',
      budgetRange: '€5,000–€10,000/year',
    }
  });

  const {
    register: regAgent,
    handleSubmit: handleAgentSubmit,
    formState: { errors: errorsAgent }
  } = useForm<z.infer<typeof agentSchema>>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      agencyName: '',
      agencyCountry: 'India',
      registrationNumber: '',
      email: '',
      phone: '',
      partnershipType: 'exclusive',
    }
  });

  // Handle student multi-step validation triggers
  const handleNextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ['firstName', 'lastName', 'email', 'phone', 'password'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['gpa', 'englishScore'];
    }

    const isValid = await triggerStudent(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    } else {
      toast.error('Please resolve all validation errors on the current step.');
    }
  };

  const onStudentRegisterSubmit = async (data: z.infer<typeof studentSchema>) => {
    // 1. Simulate authentication and registration in our Zustand store
    await login(data.email, 'student');
    // 2. Hydrate student profile details in global state
    updateProfile({
      firstName: data.firstName,
      lastName: data.lastName,
      dob: '2004-10-10',
      nationality: 'Indian',
      educationLevel: 'High School',
      gpa: data.gpa,
      englishScore: data.englishScore,
      desiredCountry: data.desiredCountry,
      desiredSubject: data.desiredSubject,
      budgetRange: data.budgetRange,
    });
    setSuccessMode(true);
    toast.success('Student account registered! Profile verified.');
  };

  const onAgentRegisterSubmit = async (data: z.infer<typeof agentSchema>) => {
    await login(data.email, 'agent');
    setSuccessMode(true);
    toast.success('Partnership lead submitted successfully! Review pending.');
  };

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24 flex items-center relative overflow-hidden">
      <Toaster position="top-center" richColors />
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FD7E14]/4 rounded-full blur-[110px] -translate-y-1/3 translate-x-1/4 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-12 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          
          {/* Left Info segment */}
          <div>
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FD7E14] to-[#C94D1B] flex items-center justify-center shadow-lg">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-black text-gray-800 tracking-tight uppercase">The Global Avenues</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-black text-[#1A1A1A] leading-tight mb-4 tracking-tight">
                Unlock Premium Pathways to <span className="text-gradient-orange">Europe & Beyond</span>
              </h1>
              
              <p className="text-base sm:text-lg text-[#666] mb-10 leading-relaxed max-w-lg">
                Submit a single digital profile to TGA. Our AI matcher aligns your goals and budget with exclusive university MOUs in under 5 minutes.
              </p>

              {/* Progress Steps indicators */}
              {role === 'student' && !successMode && (
                <div className="space-y-4 max-w-md bg-white border border-gray-150 rounded-2xl p-5 shadow-sm">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Onboarding Map</div>
                  {PUBLIC_STEPS.map((s, i) => {
                    const isDone = currentStep > i + 1;
                    const isActive = currentStep === i + 1;
                    return (
                      <div key={s.step} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                          isDone 
                            ? 'bg-green-500 text-white' 
                            : isActive 
                            ? `bg-gradient-to-r ${theme.primary} text-white ring-4 ring-[#FD7E14]/10` 
                            : 'bg-gray-100 border border-gray-200 text-gray-400'
                        }`}>
                          {isDone ? '✓' : s.step}
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isActive ? 'text-[#FD7E14]' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>{s.title}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{s.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Testimonial block */}
              {successMode && (
                <div className="mt-8 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm max-w-md">
                  <p className="text-[#555] italic text-sm mb-4 leading-relaxed">
                    "I registered my profile, completed the course finder, and TGA fast-tracked my admission offer from Austria public university in 14 days. Amazing!"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FD7E14] to-[#C94D1B] flex items-center justify-center text-white font-extrabold shadow-sm">
                      A
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-xs">Aarav Sharma</div>
                      <div className="text-[10px] text-gray-400 font-semibold">FH Kufstein Tirol Candidate · 2026</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Form Card */}
          <div>
            <AnimatePresence mode="wait">
              {successMode ? (
                <motion.div
                  key="success-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl p-8 border border-gray-150 shadow-xl text-center flex flex-col items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 mb-6">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  
                  <h2 className="text-2xl font-black text-gray-900 mb-2">Registration Complete!</h2>
                  
                  <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                    {role === 'student' 
                      ? 'Your student candidate profile is verified. Access your live journey map, complete matching checklists, and request offers!' 
                      : 'Your Partner onboarding lead has been submitted to the TGA administration committee. We will verify your registration details within 24 hours.'}
                  </p>

                  <button
                    onClick={() => navigate(role === 'student' ? '/portal/student' : '/portal/agent')}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r ${theme.primary} text-white rounded-xl font-bold shadow-lg`}
                  >
                    Enter My Portal <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="form-card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-150 shadow-xl"
                  style={{ boxShadow: `0 24px 60px ${theme.glow}` }}
                >
                  {/* Selector switch */}
                  <div className="flex rounded-xl bg-gray-50 p-1 mb-6 border border-gray-200">
                    {[
                      { r: 'student', label: "I'm a Student", icon: User },
                      { r: 'agent', label: "I'm an Agent", icon: Briefcase }
                    ].map(({ r, label, icon: Icon }) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setRole(r as any); setCurrentStep(1); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                          role === r 
                            ? `bg-gradient-to-r ${theme.primary} text-white shadow-md` 
                            : 'text-gray-500 hover:text-[#FD7E14]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  <h2 className="text-lg font-black text-gray-900 mb-6">
                    {role === 'student' ? 'Create Candidate Account' : 'Create Agency Onboarding'}
                  </h2>

                  {/* Student Stepper Form */}
                  {role === 'student' ? (
                    <form className="space-y-4" onSubmit={handleStudentSubmit(onStudentRegisterSubmit)}>
                      <AnimatePresence mode="wait">
                        {currentStep === 1 && (
                          <motion.div
                            key="student-step-1"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-3.5"
                          >
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <input
                                  type="text"
                                  placeholder="First Name"
                                  {...regStudent('firstName')}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#FD7E14] focus:bg-white transition-all"
                                />
                                {errorsStudent.firstName && <span className="text-[10px] text-red-500 font-semibold">{errorsStudent.firstName.message}</span>}
                              </div>
                              <div>
                                <input
                                  type="text"
                                  placeholder="Last Name"
                                  {...regStudent('lastName')}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#FD7E14] focus:bg-white transition-all"
                                />
                                {errorsStudent.lastName && <span className="text-[10px] text-red-500 font-semibold">{errorsStudent.lastName.message}</span>}
                              </div>
                            </div>

                            <div>
                              <input
                                type="email"
                                placeholder="Email Address"
                                {...regStudent('email')}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#FD7E14] focus:bg-white transition-all"
                              />
                              {errorsStudent.email && <span className="text-[10px] text-red-500 font-semibold">{errorsStudent.email.message}</span>}
                            </div>

                            <div>
                              <input
                                type="tel"
                                placeholder="Phone Number"
                                {...regStudent('phone')}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#FD7E14] focus:bg-white transition-all"
                              />
                              {errorsStudent.phone && <span className="text-[10px] text-red-500 font-semibold">{errorsStudent.phone.message}</span>}
                            </div>

                            <div>
                              <input
                                type="password"
                                placeholder="Create Access Password"
                                {...regStudent('password')}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#FD7E14] focus:bg-white transition-all"
                              />
                              {errorsStudent.password && <span className="text-[10px] text-red-500 font-semibold">{errorsStudent.password.message}</span>}
                            </div>
                          </motion.div>
                        )}

                        {currentStep === 2 && (
                          <motion.div
                            key="student-step-2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-3.5"
                          >
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Academic Score (GPA / %)</label>
                              <input
                                type="text"
                                placeholder="e.g. 92% or GPA 3.8/4"
                                {...regStudent('gpa')}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#FD7E14] focus:bg-white transition-all"
                              />
                              {errorsStudent.gpa && <span className="text-[10px] text-red-500 font-semibold">{errorsStudent.gpa.message}</span>}
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">English Proficiency Score</label>
                              <input
                                type="text"
                                placeholder="e.g. IELTS 7.5 or TOEFL 105"
                                {...regStudent('englishScore')}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#FD7E14] focus:bg-white transition-all"
                              />
                              {errorsStudent.englishScore && <span className="text-[10px] text-red-500 font-semibold">{errorsStudent.englishScore.message}</span>}
                            </div>
                          </motion.div>
                        )}

                        {currentStep === 3 && (
                          <motion.div
                            key="student-step-3"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-3.5"
                          >
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Target Country</label>
                              <select 
                                {...regStudent('desiredCountry')}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#FD7E14] focus:bg-white transition-all font-semibold text-gray-700"
                              >
                                <option value="Austria">Austria 🇦🇹</option>
                                <option value="France">France 🇫🇷</option>
                                <option value="Estonia">Estonia 🇪🇪</option>
                                <option value="Cyprus">Cyprus 🇨🇾</option>
                                <option value="USA">USA 🇺🇸</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Target Study Field</label>
                              <select 
                                {...regStudent('desiredSubject')}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#FD7E14] focus:bg-white transition-all font-semibold text-gray-700"
                              >
                                <option value="IT & Game Design">IT & Game Design</option>
                                <option value="Business & Management">Business & Management</option>
                                <option value="Medicine & Health">Medicine & Health</option>
                                <option value="Design & Creative Arts">Design & Creative Arts</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Annual Tuition Budget</label>
                              <select 
                                {...regStudent('budgetRange')}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#FD7E14] focus:bg-white transition-all font-semibold text-gray-700"
                              >
                                <option value="€5,000–€10,000/year">€5,000–€10,000/year</option>
                                <option value="€10,000–€15,000/year">€10,000–€15,000/year</option>
                                <option value="€15,000+/year">€15,000+/year</option>
                              </select>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Stepper CTAs */}
                      <div className="flex gap-3 mt-6 pt-3 border-t border-gray-100">
                        {currentStep > 1 && (
                          <button
                            type="button"
                            onClick={() => setCurrentStep(prev => prev - 1)}
                            className="flex items-center gap-1.5 px-4 py-3 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500"
                          >
                            <ChevronLeft className="w-4 h-4" /> Back
                          </button>
                        )}
                        {currentStep < 3 ? (
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl font-bold shadow-md hover:scale-[1.01] transition-all text-xs"
                          >
                            Next Step <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="submit"
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl font-bold shadow-md hover:scale-[1.01] transition-all text-xs"
                          >
                            Launch My Application <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </form>
                  ) : (
                    // Agent Single-step registration
                    <form className="space-y-4" onSubmit={handleAgentSubmit(onAgentRegisterSubmit)}>
                      <div>
                        <input
                          type="text"
                          placeholder="Agency Name"
                          {...regAgent('agencyName')}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#2D1B69] focus:bg-white transition-all"
                        />
                        {errorsAgent.agencyName && <span className="text-[10px] text-red-500 font-semibold">{errorsAgent.agencyName.message}</span>}
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Agency Country (HQ)"
                          {...regAgent('agencyCountry')}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#2D1B69] focus:bg-white transition-all"
                        />
                        {errorsAgent.agencyCountry && <span className="text-[10px] text-red-500 font-semibold">{errorsAgent.agencyCountry.message}</span>}
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Business Registration Number"
                          {...regAgent('registrationNumber')}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#2D1B69] focus:bg-white transition-all"
                        />
                        {errorsAgent.registrationNumber && <span className="text-[10px] text-red-500 font-semibold">{errorsAgent.registrationNumber.message}</span>}
                      </div>

                      <div>
                        <input
                          type="email"
                          placeholder="Contact Email"
                          {...regAgent('email')}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#2D1B69] focus:bg-white transition-all"
                        />
                        {errorsAgent.email && <span className="text-[10px] text-red-500 font-semibold">{errorsAgent.email.message}</span>}
                      </div>

                      <div>
                        <input
                          type="tel"
                          placeholder="Contact Phone Number"
                          {...regAgent('phone')}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#2D1B69] focus:bg-white transition-all"
                        />
                        {errorsAgent.phone && <span className="text-[10px] text-red-500 font-semibold">{errorsAgent.phone.message}</span>}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Partnership Scope</label>
                        <select 
                          {...regAgent('partnershipType')}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#2D1B69] focus:bg-white transition-all font-semibold text-gray-700"
                        >
                          <option value="exclusive">Exclusive MOU Partner (+5% Commission)</option>
                          <option value="non_exclusive">Standard Channel Partner</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#2D1B69] to-[#3B2B85] text-white rounded-xl font-bold shadow-lg hover:scale-[1.01] transition-all text-xs"
                      >
                        Submit Partner Lead <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  )}

                  <p className="text-center text-xs text-gray-400 mt-5">
                    Already registered?{' '}
                    <Link to="/portal/login" className="text-[#FD7E14] font-bold hover:underline">
                      Login →
                    </Link>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
