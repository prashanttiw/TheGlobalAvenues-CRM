import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Globe2, LoaderCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { CatalogProgram } from '@/lib/api';
import { fetchPrograms } from '@/lib/api';
import { buildCategoryGroups } from '@/lib/catalog';

export function CoursesPage() {
  const [programs, setPrograms] = useState<CatalogProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPrograms() {
      try {
        const response = await fetchPrograms({ page: 1, perPage: 100 });

        if (!cancelled) {
          setPrograms(response.programs);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load the catalog right now.');
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
  }, []);

  const categories = buildCategoryGroups(programs);
  const countriesCount = new Set(programs.map((program) => program.university.country)).size;
  const universitiesCount = new Set(programs.map((program) => program.university.id)).size;

  return (
    <div className="min-h-screen bg-[#F8F7FF] pt-24">
      <section className="relative overflow-hidden border-b border-[#2D1B69]/10 bg-[#0F0B1F]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,215,0,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(45,27,105,0.55),transparent_40%)]" />
        <div className="max-w-7xl mx-auto px-6 py-18 relative z-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/10 text-[#FFD700] mb-6">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-semibold">Live Program Catalog</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white leading-tight tracking-tight">
              Browse real TGA programs, not brochure filler.
            </h1>
            <p className="text-lg text-white/70 mt-5 max-w-2xl leading-relaxed">
              Every category below is generated from the live CRM catalog. Students see what is actually available, and counsellors work from the same inventory.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 max-w-4xl">
              {[
                { label: 'Programs', value: programs.length || '...' },
                { label: 'Categories', value: categories.length || '...' },
                { label: 'Universities', value: universitiesCount || '...' },
                { label: 'Countries', value: countriesCount || '...' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 backdrop-blur">
                  <div className="text-2xl font-black text-white">{item.value}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-14">
        {loading && (
          <div className="rounded-3xl border border-[#2D1B69]/10 bg-white px-6 py-14 text-center shadow-sm">
            <LoaderCircle className="w-8 h-8 text-[#2D1B69] animate-spin mx-auto" />
            <p className="text-sm text-[#5C5675] mt-4">Loading live program inventory...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-lg font-bold text-[#0F0B1F]">Catalog unavailable</p>
            <p className="text-sm text-[#5C5675] mt-2">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="flex items-center justify-between gap-4 mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#7B7496] font-bold">Subject Clusters</p>
                <h2 className="text-3xl font-black text-[#0F0B1F] mt-2">Category architecture from the live backend</h2>
              </div>
              <Link
                to="/apply"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2D1B69] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_40px_rgba(45,27,105,0.22)]"
              >
                Start application
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {categories.map((category, index) => (
                <motion.div
                  key={category.slug}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -6 }}
                >
                  <Link to={`/courses/${category.slug}`} className="group block h-full">
                    <article className={`relative h-full overflow-hidden rounded-[28px] border border-[#2D1B69]/10 bg-white p-7 ${category.glow} transition-all duration-300`}>
                      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${category.accent}`} />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-black tracking-[0.28em] text-[#7B7496] uppercase">Cluster {category.icon}</div>
                          <h3 className="text-2xl font-black text-[#0F0B1F] mt-3 group-hover:text-[#2D1B69] transition-colors">
                            {category.label}
                          </h3>
                        </div>
                        <div className={`rounded-2xl bg-gradient-to-br ${category.accent} px-3 py-2 text-xs font-black text-white`}>
                          {category.programCount}
                        </div>
                      </div>

                      <p className="text-sm text-[#5C5675] leading-6 mt-4">{category.description}</p>

                      <div className="mt-6 rounded-2xl bg-[#F8F7FF] p-4 border border-[#2D1B69]/8">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#7B7496]">
                          <Globe2 className="w-3.5 h-3.5" />
                          Live footprint
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {category.countries.map((country) => (
                            <span key={country} className="rounded-full border border-[#2D1B69]/10 bg-white px-3 py-1 text-xs font-semibold text-[#2D1B69]">
                              {country}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-[#7B7496] text-[11px] uppercase tracking-[0.18em] font-bold">Average fee</div>
                            <div className="text-[#0F0B1F] font-black mt-1">{category.averageTuitionLabel}</div>
                          </div>
                          <div>
                            <div className="text-[#7B7496] text-[11px] uppercase tracking-[0.18em] font-bold">Top partners</div>
                            <div className="text-[#0F0B1F] font-black mt-1">{category.universities.length}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#2D1B69]">
                        Explore programs
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </article>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
