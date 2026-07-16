import { Eye, FileCheck2, MessageCircle, Quote, Waypoints } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

const STUDENT_PERSPECTIVES = [
  {
    stage: 'Postgraduate applicant',
    focus: 'Profile and document guidance',
    quote:
      'Once I understood which documents were needed and why, the application stopped feeling overwhelming. I had a clear next step instead of a long list of doubts.',
  },
  {
    stage: 'Undergraduate applicant',
    focus: 'Course and university selection',
    quote:
      "I wasn't just handed a university list. We spoke about the course, intake, location and what made sense for my plans before I applied.",
  },
  {
    stage: 'Student applicant',
    focus: 'Application tracking',
    quote:
      'Seeing each request in one place made follow-ups easier. I could upload the document, check the update and know what was still pending.',
  },
];

const SUPPORT_HIGHLIGHTS = [
  { icon: Waypoints, label: 'Clear next steps' },
  { icon: FileCheck2, label: 'Careful document checks' },
  { icon: Eye, label: 'Visible application progress' },
  { icon: MessageCircle, label: 'A reachable support team' },
];

export function TestimonialsSection() {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion ? false : { opacity: 0, y: 24 };

  return (
    <section className="relative overflow-hidden bg-[#FFF9F2] py-20 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(253,126,20,0.18) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className="pointer-events-none absolute -right-32 top-8 h-80 w-80 rounded-full bg-[#FD7E14]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
          <motion.div
            initial={reveal}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#FD7E14]/20 bg-white px-4 py-2 text-sm font-semibold text-[#B54708] shadow-sm">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Student journey notes
            </div>

            <h2 className="max-w-xl text-4xl font-black leading-[1.08] tracking-tight text-[#111827] sm:text-5xl">
              Support that feels personal, not procedural.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#5F6673] sm:text-lg">
              Studying abroad comes with a lot of decisions. Students value having someone explain the next step,
              check the details and stay reachable throughout the application journey.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {SUPPORT_HIGHLIGHTS.map(({ icon: Icon, label }, index) => (
                <motion.div
                  key={label}
                  initial={reduceMotion ? false : { opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.07 }}
                  className="flex items-center gap-3 rounded-2xl border border-[#F1DAC6] bg-white/80 px-4 py-3 text-sm font-semibold text-[#303846] shadow-[0_8px_30px_rgba(91,56,28,0.05)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E2] text-[#D95D0B]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {label}
                </motion.div>
              ))}
            </div>

            <p className="mt-7 max-w-lg text-xs leading-5 text-[#7B8190]">
              Representative perspectives based on the student support journey. Names and identifying details are
              intentionally not displayed.
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2">
            <motion.article
              initial={reveal}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="relative overflow-hidden rounded-[2rem] bg-[#111827] p-7 text-white shadow-[0_24px_70px_rgba(17,24,39,0.18)] sm:col-span-2 sm:p-9"
            >
              <div
                className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[28px] border-[#FD7E14]/15"
                aria-hidden="true"
              />
              <div className="relative">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFB16C]">
                    A clearer first step
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FD7E14] text-white shadow-lg">
                    <Quote className="h-5 w-5 fill-current" aria-hidden="true" />
                  </span>
                </div>
                <blockquote className="max-w-2xl text-2xl font-semibold leading-relaxed tracking-[-0.02em] sm:text-[1.7rem]">
                  “{STUDENT_PERSPECTIVES[0].quote}”
                </blockquote>
                <div className="mt-8 border-t border-white/15 pt-5">
                  <p className="font-bold text-white">{STUDENT_PERSPECTIVES[0].stage}</p>
                  <p className="mt-1 text-sm text-white/60">{STUDENT_PERSPECTIVES[0].focus}</p>
                </div>
              </div>
            </motion.article>

            {STUDENT_PERSPECTIVES.slice(1).map((perspective, index) => (
              <motion.article
                key={perspective.focus}
                initial={reveal}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: 0.14 + index * 0.08 }}
                className="flex min-h-[290px] flex-col rounded-[1.75rem] border border-[#EDD8C6] bg-white p-6 shadow-[0_18px_50px_rgba(91,56,28,0.08)] sm:p-7"
              >
                <Quote className="h-8 w-8 text-[#FD7E14]" aria-hidden="true" />
                <blockquote className="mt-5 flex-1 text-lg font-medium leading-8 text-[#242B36]">
                  “{perspective.quote}”
                </blockquote>
                <div className="mt-7 border-t border-[#EEE7E0] pt-5">
                  <p className="font-bold text-[#111827]">{perspective.stage}</p>
                  <p className="mt-1 text-sm text-[#727987]">{perspective.focus}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
