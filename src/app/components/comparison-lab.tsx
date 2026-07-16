import {
  BookOpen,
  Building2,
  CalendarDays,
  Clock3,
  Columns3,
  GraduationCap,
  Info,
  Languages,
  MapPin,
  WalletCards,
} from 'lucide-react';

const sampleUniversities = [
  {
    name: 'Sample University A',
    label: 'Sample data',
    accentClass: 'bg-gradient-to-r from-[#FD7E14] to-[#C94D1B]',
    fields: [
      { icon: Building2, label: 'Campus', value: 'Central Campus' },
      { icon: MapPin, label: 'Location', value: 'London, United Kingdom' },
      { icon: BookOpen, label: 'Programme', value: 'BSc (Hons) Business Management' },
      { icon: GraduationCap, label: 'Study level', value: 'Undergraduate' },
      { icon: Clock3, label: 'Duration', value: '3 years' },
      { icon: Languages, label: 'Language', value: 'English' },
      { icon: CalendarDays, label: 'Intake', value: 'September 2026' },
      { icon: WalletCards, label: 'Tuition', value: 'GBP 16,500 per year' },
    ],
  },
  {
    name: 'Sample University B',
    label: 'Sample data',
    accentClass: 'bg-gradient-to-r from-[#001F3F] to-[#0B5A8C]',
    fields: [
      { icon: Building2, label: 'Campus', value: 'City Campus' },
      { icon: MapPin, label: 'Location', value: 'Berlin, Germany' },
      { icon: BookOpen, label: 'Programme', value: 'MSc International Management' },
      { icon: GraduationCap, label: 'Study level', value: 'Postgraduate' },
      { icon: Clock3, label: 'Duration', value: '2 years' },
      { icon: Languages, label: 'Language', value: 'English' },
      { icon: CalendarDays, label: 'Intake', value: 'October 2026' },
      { icon: WalletCards, label: 'Tuition', value: 'EUR 12,000 per year' },
    ],
  },
];

export function ComparisonLab() {
  return (
    <section id="sample-university-comparison" className="bg-[#F5F7FA] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#FD7E14]/20 bg-white px-4 py-2 shadow-sm">
            <Columns3 className="h-4 w-4 text-[#FD7E14]" />
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C94D1B]">Static Sample Preview</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-[#101828] sm:text-4xl md:text-5xl">Compare Universities Side-by-Side</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
            See the types of programme information available in the portal before reviewing your CRM catalogue
          </p>
        </div>
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6 lg:p-8">
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#0B5A8C]" />
            <p className="text-sm leading-6 text-slate-700">
              This is a non-interactive illustration. It does not display live university records, recommendations,
              rankings, admission decisions or availability claims
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {sampleUniversities.map((university) => (
              <article key={university.name} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/60">
                <div className={university.accentClass + ' p-5 text-white sm:p-6'}>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">{university.label}</span>
                  <h3 className="mt-2 text-xl font-black sm:text-2xl">{university.name}</h3>
                </div>
                <dl className="grid gap-px bg-slate-200 sm:grid-cols-2">
                  {university.fields.map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.label} className="min-w-0 bg-white p-4 sm:p-5">
                        <dt className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                          <Icon className="h-4 w-4 shrink-0 text-[#FD7E14]" />{field.label}
                        </dt>
                        <dd className="mt-2 break-words text-sm font-bold leading-6 text-[#101828]">{field.value}</dd>
                      </div>
                    );
                  })}
                </dl>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}