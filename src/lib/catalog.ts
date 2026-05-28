import type { CatalogProgram } from './api';

type SubjectPresentation = {
  slug: string;
  label: string;
  icon: string;
  description: string;
  accent: string;
  glow: string;
};

const SUBJECT_PRESENTATIONS: Record<string, SubjectPresentation> = {
  'IT & Game Design': {
    slug: 'it-game-design',
    label: 'IT & Game Design',
    icon: '01',
    description: 'Software, AI, and digital design pathways built for modern global careers.',
    accent: 'from-[#2D1B69] via-[#4A33A0] to-[#7A59E6]',
    glow: 'shadow-[0_18px_60px_rgba(45,27,105,0.20)]',
  },
  'Business & Management': {
    slug: 'business-management',
    label: 'Business & Management',
    icon: '02',
    description: 'MBA, management, marketing, and entrepreneurship tracks with strong employability.',
    accent: 'from-[#8A2D1A] via-[#C94D1B] to-[#FD7E14]',
    glow: 'shadow-[0_18px_60px_rgba(201,77,27,0.20)]',
  },
  'Medicine & Health': {
    slug: 'medicine-health',
    label: 'Medicine & Health',
    icon: '03',
    description: 'Medical and health science pathways with high-compliance admission support.',
    accent: 'from-[#7F1D1D] via-[#C2410C] to-[#EF4444]',
    glow: 'shadow-[0_18px_60px_rgba(220,38,38,0.20)]',
  },
  Engineering: {
    slug: 'engineering',
    label: 'Engineering',
    icon: '04',
    description: 'Future-facing engineering programs across energy, systems, and applied innovation.',
    accent: 'from-[#14532D] via-[#1D9E75] to-[#4ADE80]',
    glow: 'shadow-[0_18px_60px_rgba(29,158,117,0.20)]',
  },
  'Design & Creative Arts': {
    slug: 'design-creative-arts',
    label: 'Design & Creative Arts',
    icon: '05',
    description: 'Creative disciplines with strong studio practice and portfolio development.',
    accent: 'from-[#4C1D95] via-[#7C3AED] to-[#D8B4FE]',
    glow: 'shadow-[0_18px_60px_rgba(124,58,237,0.20)]',
  },
  Hospitality: {
    slug: 'hospitality',
    label: 'Hospitality',
    icon: '06',
    description: 'Hospitality and service leadership tracks aligned to tourism-heavy destinations.',
    accent: 'from-[#7C2D12] via-[#EA580C] to-[#FDBA74]',
    glow: 'shadow-[0_18px_60px_rgba(234,88,12,0.20)]',
  },
};

export function getSubjectPresentation(subject: string | null | undefined): SubjectPresentation {
  if (!subject) {
    return {
      slug: 'global-catalog',
      label: 'Global Catalog',
      icon: '00',
      description: 'A curated cross-border program mix across TGA partner institutions.',
      accent: 'from-[#2D1B69] via-[#4A33A0] to-[#C94D1B]',
      glow: 'shadow-[0_18px_60px_rgba(45,27,105,0.18)]',
    };
  }

  return SUBJECT_PRESENTATIONS[subject] ?? {
    slug: subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    label: subject,
    icon: '07',
    description: 'A curated subject cluster from The Global Avenues partner network.',
    accent: 'from-[#2D1B69] via-[#4A33A0] to-[#C94D1B]',
    glow: 'shadow-[0_18px_60px_rgba(45,27,105,0.18)]',
  };
}

export function getSubjectFromSlug(slug: string | undefined): string | null {
  if (!slug) {
    return null;
  }

  const match = Object.entries(SUBJECT_PRESENTATIONS).find(([, value]) => value.slug === slug);

  return match ? match[0] : null;
}

export function formatMoney(amount: number | null, currency: string | null): string {
  if (amount === null || currency === null) {
    return 'Profile based';
  }

  return `${currency} ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function deriveIntakeMonth(program: CatalogProgram): number {
  const first = program.intakeMonths[0] ?? 'September';
  const monthMap: Record<string, number> = {
    January: 1,
    February: 2,
    March: 3,
    April: 4,
    May: 5,
    June: 6,
    July: 7,
    August: 8,
    September: 9,
    October: 10,
    November: 11,
    December: 12,
  };

  return monthMap[first] ?? 9;
}

export function buildCategoryGroups(programs: CatalogProgram[]): Array<{
  subjectArea: string;
  slug: string;
  label: string;
  icon: string;
  description: string;
  accent: string;
  glow: string;
  programCount: number;
  countries: string[];
  universities: string[];
  averageTuitionLabel: string;
}> {
  const grouped = new Map<string, CatalogProgram[]>();

  programs.forEach((program) => {
    const key = program.subjectArea ?? 'Global Catalog';
    const current = grouped.get(key) ?? [];
    current.push(program);
    grouped.set(key, current);
  });

  return Array.from(grouped.entries())
    .map(([subjectArea, subjectPrograms]) => {
      const presentation = getSubjectPresentation(subjectArea);
      const tuitionValues = subjectPrograms
        .map((program) => program.tuitionFee)
        .filter((value): value is number => value !== null);
      const averageTuition = tuitionValues.length > 0
        ? tuitionValues.reduce((sum, value) => sum + value, 0) / tuitionValues.length
        : null;
      const currencies = Array.from(new Set(subjectPrograms.map((program) => program.tuitionCurrency).filter(Boolean)));

      return {
        subjectArea,
        slug: presentation.slug,
        label: presentation.label,
        icon: presentation.icon,
        description: presentation.description,
        accent: presentation.accent,
        glow: presentation.glow,
        programCount: subjectPrograms.length,
        countries: Array.from(new Set(subjectPrograms.map((program) => program.university.country))).slice(0, 4),
        universities: Array.from(new Set(subjectPrograms.map((program) => program.university.name))).slice(0, 4),
        averageTuitionLabel: averageTuition !== null && currencies.length > 0
          ? `${currencies[0]} ${Math.round(averageTuition).toLocaleString('en-IN')}`
          : 'Profile based',
      };
    })
    .sort((left, right) => right.programCount - left.programCount);
}
