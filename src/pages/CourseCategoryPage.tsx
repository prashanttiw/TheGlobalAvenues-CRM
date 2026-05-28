import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, GraduationCap, LoaderCircle, MapPin, WalletCards } from 'lucide-react';
import { motion } from 'motion/react';
import type { CatalogProgram } from '@/lib/api';
import { fetchPrograms } from '@/lib/api';
import { formatMoney, getSubjectFromSlug, getSubjectPresentation } from '@/lib/catalog';

export function CourseCategoryPage() {
  const { category } = useParams();
  const subjectArea = getSubjectFromSlug(category);
  const presentation = getSubjectPresentation(subjectArea ?? category ?? 'Global Catalog');
  const [programs, setPrograms] = useState<CatalogProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPrograms() {
      try {
        const response = await fetchPrograms({
          page: 1,
          perPage: 100,
          subjectArea: subjectArea ?? undefined,
        });

        if (!cancelled) {
          setPrograms(response.programs);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load this category.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPrograms();

    return () => {
      cancelled = true;
    };
  }, [subjectArea]);

  const countries = useMemo(
    () => Array.from(new Set(programs.map((program) => program.university.country))),
    [programs]
  );
  const universities = useMemo(
    () => Array.from(new Set(programs.map((program) => program.university.name))),
    [programs]
  );

  if (!subjectArea && !loading && programs.length === 0) {
    return (
      <div className="min-h-screen pt-32 text-center bg-[#F8F7FF]">
        <h1 className="text-4xl font-black text-[#0F0B1F] mb-4">Course category not found</h1>
        <Link to="/courses" className="text-[#2D1B69] font-bold hover:underline">Browse the live catalog</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF] pt-24">
      <section className="relative overflow-hidden border-b border-[#2D1B69]/10">
        <div className={`absolute inset-0 bg-gradient-to-br ${presentation.accent} opacity-[0.14]`} />
        <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#2D1B69]">Live subject cluster</div>
            <h1 className="text-4xl md:text-5xl font-black text-[#0F0B1F] mt-4">{presentation.label}</h1>
            <p className="text-lg text-[#5C5675] mt-4 max-w-2xl leading-7">{presentation.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              {[
                { label: 'Programs', value: programs.length || '...' },
                { label: 'Countries', value: countries.length || '...' },
                { label: 'Universities', value: universities.length || '...' },
                { label: 'Intakes', value: Array.from(new Set(programs.flatMap((program) => program.intakeMonths))).length || '...' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-sm backdrop-blur">
                  <div className="text-2xl font-black text-[#0F0B1F]">{item.value}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#7B7496] mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-7xl mx-auto px-6">
          {loading && (
            <div className="rounded-3xl border border-[#2D1B69]/10 bg-white px-6 py-14 text-center shadow-sm">
              <LoaderCircle className="w-8 h-8 text-[#2D1B69] animate-spin mx-auto" />
              <p className="text-sm text-[#5C5675] mt-4">Loading live program list...</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-lg font-bold text-[#0F0B1F]">This category is temporarily unavailable</p>
              <p className="text-sm text-[#5C5675] mt-2">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-8">
              <div className="space-y-5">
                {programs.map((program, index) => (
                  <motion.article
                    key={program.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="rounded-[28px] border border-[#2D1B69]/10 bg-white p-6 shadow-[0_18px_48px_rgba(15,11,31,0.05)]"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                      <div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className={`rounded-full bg-gradient-to-r ${presentation.accent} px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white`}>
                            {program.degreeLevel}
                          </span>
                          {program.university.isExclusive && (
                            <span className="rounded-full border border-[#FFD700]/40 bg-[#FFD700]/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#8A6A00]">
                              Exclusive partner
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl font-black text-[#0F0B1F] mt-4">{program.name}</h2>
                        <p className="text-sm text-[#5C5675] mt-2">
                          {program.university.name}
                          {program.university.city ? `, ${program.university.city}` : ''}
                          {' · '}
                          {program.university.country}
                        </p>
                      </div>
                      <Link
                        to="/apply"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D1B69] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_38px_rgba(45,27,105,0.18)]"
                      >
                        Start profile
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                      <div className="rounded-2xl border border-[#2D1B69]/8 bg-[#F8F7FF] p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7B7496] font-bold">
                          <WalletCards className="w-3.5 h-3.5" />
                          Tuition
                        </div>
                        <div className="text-lg font-black text-[#0F0B1F] mt-2">
                          {formatMoney(program.tuitionFee, program.tuitionCurrency)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[#2D1B69]/8 bg-[#F8F7FF] p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7B7496] font-bold">
                          <GraduationCap className="w-3.5 h-3.5" />
                          Degree
                        </div>
                        <div className="text-lg font-black text-[#0F0B1F] mt-2 capitalize">
                          {program.degreeLevel.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[#2D1B69]/8 bg-[#F8F7FF] p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7B7496] font-bold">
                          <MapPin className="w-3.5 h-3.5" />
                          Intakes
                        </div>
                        <div className="text-lg font-black text-[#0F0B1F] mt-2">
                          {program.intakeMonths.join(', ')}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}

                {programs.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-[#2D1B69]/20 bg-white px-6 py-14 text-center shadow-sm">
                    <p className="text-lg font-bold text-[#0F0B1F]">This category is part of the roadmap, but not yet seeded.</p>
                    <p className="text-sm text-[#5C5675] mt-2">The page is live and connected. It just needs catalog inventory for this subject cluster.</p>
                  </div>
                )}
              </div>

              <aside className="space-y-5">
                <div className="rounded-[28px] border border-[#2D1B69]/10 bg-white p-6 shadow-sm">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7B7496]">Why this matters</div>
                  <h3 className="text-xl font-black text-[#0F0B1F] mt-3">Business-ready discovery flow</h3>
                  <p className="text-sm text-[#5C5675] mt-3 leading-6">
                    Students are now browsing inventory that matches the backend. That reduces counsellor cleanup, fake matches, and dead-end applications.
                  </p>
                </div>

                <div className="rounded-[28px] border border-[#2D1B69]/10 bg-[#0F0B1F] p-6 text-white shadow-[0_18px_48px_rgba(15,11,31,0.18)]">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">Countries in this track</div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {countries.map((country) => (
                      <span key={country} className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold">
                        {country}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/apply"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FFD700] px-5 py-3 text-sm font-black text-[#0F0B1F]"
                  >
                    Build my shortlist
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
