import { CheckCircle2, Circle, Clock, FileCheck, Plane, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

const steps = [
  { 
    icon: FileCheck, 
    label: 'Documents Submitted', 
    status: 'completed',
    date: 'Dec 15, 2025'
  },
  { 
    icon: GraduationCap, 
    label: 'University Application', 
    status: 'completed',
    date: 'Jan 2, 2026'
  },
  { 
    icon: Clock, 
    label: 'Awaiting College Response', 
    status: 'current',
    date: 'In Progress'
  },
  { 
    icon: FileCheck, 
    label: 'Visa Documentation', 
    status: 'pending',
    date: 'Pending'
  },
  { 
    icon: Plane, 
    label: 'Visa Interview', 
    status: 'pending',
    date: 'Pending'
  },
];

export function StudentDashboardPreview() {
  return (
    <section className="py-24 bg-gradient-to-br from-[#1A0A00] to-[#2D1200] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCA0MCAwIEwgNDAgNDAgTCAwIDQwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] " />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md mb-6">
              <Clock className="w-4 h-4 text-[#FD7E14]" />
              <span className="text-sm text-white font-semibold">Real-Time Tracking</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Track Every Step of
              <br />
              <span className="bg-gradient-to-r from-[#FD7E14] to-[#FFC107] bg-clip-text text-transparent">
                Your Journey
              </span>
            </h2>
            
            <p className="text-lg text-white/80 mb-8">
              Never wonder where your application stands. Our Application Pulse dashboard gives you
              complete visibility into your study abroad process-from document submission to visa
              approval.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">24/7</div>
                <div className="text-sm text-white/70">Live Updates</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">5-7 Days</div>
                <div className="text-sm text-white/70">Avg Response Time</div>
              </div>
            </div>
          </div>

          {/* Right Side - Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-[#1A0A00] mb-1">Application Pulse</h3>
                  <p className="text-sm text-[#1A0A00]/60">Aarav Mehta - FH Kufstein Tirol</p>
                </div>
                <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  On Track
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="space-y-6">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = step.status === 'completed';
                  const isCurrent = step.status === 'current';
                  
                  return (
                    <motion.div
                      key={step.label}
                      className="relative flex items-start gap-4"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {/* Timeline Line */}
                      {index < steps.length - 1 && (
                        <div
                          className={`absolute left-5 top-12 w-0.5 h-12 ${
                            isCompleted ? 'bg-[#FD7E14]' : 'bg-gray-300'
                          }`}
                        />
                      )}

                      {/* Icon */}
                      <div
                        className={`
                          relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                          ${isCompleted 
                            ? 'bg-gradient-to-br from-[#FD7E14] to-[#1A0A00]' 
                            : isCurrent
                            ? 'bg-white border-4 border-[#FD7E14] animate-pulse'
                            : 'bg-gray-200'
                          }
                        `}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : isCurrent ? (
                          <Circle className="w-4 h-4 text-[#FD7E14] fill-[#FD7E14]" />
                        ) : (
                          <Icon className="w-5 h-5 text-gray-500" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <h4
                          className={`font-semibold mb-1 ${
                            isCompleted || isCurrent ? 'text-[#1A0A00]' : 'text-gray-500'
                          }`}
                        >
                          {step.label}
                        </h4>
                        <p
                          className={`text-sm ${
                            isCompleted 
                              ? 'text-green-600' 
                              : isCurrent
                              ? 'text-[#FD7E14] font-semibold'
                              : 'text-gray-400'
                          }`}
                        >
                          {step.date}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#1A0A00]">Overall Progress</span>
                  <span className="text-sm font-bold text-[#FD7E14]">40%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#FD7E14] to-[#1A0A00] rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '40%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <motion.div
              className="absolute -top-4 -right-4 bg-gradient-to-br from-yellow-400 to-[#FD7E14] text-white px-6 py-3 rounded-2xl shadow-lg"
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 5 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
            >
              <div className="text-xs font-semibold mb-1">Response Expected In</div>
              <div className="text-2xl font-bold">3 Days</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}