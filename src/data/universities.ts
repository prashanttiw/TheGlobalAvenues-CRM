// ============================================================
// REAL PARTNER UNIVERSITIES — sourced from theglobalavenues.com/portfolio
// ============================================================

export type PartnerTier = 'exclusive' | 'preferred' | 'open';

export interface University {
  id: string;
  name: string;
  slug: string;
  country: string;
  countryCode: string;
  city: string;
  tier: PartnerTier;
  logo: string;
  heroImage: string;
  description: string;
  intakes: string[];
  email?: string;
  website?: string;
  type: string;
  programs: string[];
  tuitionRange?: string;
  ranking?: string;
  featured: boolean;
}

export const UNIVERSITIES: University[] = [
  {
    id: 'fh-kufstein-tirol',
    name: 'FH Kufstein Tirol',
    slug: 'fh-kufstein-tirol',
    country: 'Austria',
    countryCode: 'AT',
    city: 'Kufstein',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/fh-kufstein-tirol-logo.png',
    heroImage: 'https://theglobalavenues.com/universities/fh-kufstein-tirol-hero.webp',
    description:
      'Austria-based applied sciences university with focused programs in AI, data science, sustainability, business, and event management.',
    intakes: ['September'],
    email: 'fh-kufstein@theglobalavenues.com',
    website: 'https://www.fh-kufstein.ac.at/en/Home',
    type: 'University Of Applied Sciences',
    programs: ['AI & Data Science', 'Business Management', 'Sustainability', 'Event Management'],
    tuitionRange: '€363/semester (public)',
    featured: true,
  },
  {
    id: 'euas',
    name: 'Estonian Entrepreneurship University of Applied Sciences (EUAS)',
    slug: 'estonian-entrepreneurship-university-of-applied-sciences',
    country: 'Estonia',
    countryCode: 'EE',
    city: 'Tallinn',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/euas-logo.svg',
    heroImage: 'https://theglobalavenues.com/universities/euas-hero.jpg',
    description:
      "Estonia's largest private university of applied sciences with industry-focused bachelor and MBA pathways in Tallinn.",
    intakes: ['September'],
    email: 'eek@eek.ee',
    website: 'https://euas.eu/',
    type: 'University Of Applied Sciences',
    programs: ['Business Administration', 'MBA', 'IT Management', 'Entrepreneurship'],
    tuitionRange: '€3,500–€6,000/year',
    featured: true,
  },
  {
    id: 'st-georges-university',
    name: "St. George's University",
    slug: 'st-georges-university',
    country: 'Grenada',
    countryCode: 'GD',
    city: 'St. George\'s',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/st-georges-university-logo.jpg',
    heroImage: 'https://theglobalavenues.com/universities/st-georges-university-hero.webp',
    description:
      'Caribbean medical university in Grenada offering multiple Doctor of Medicine entry tracks with global clinical training pathways.',
    intakes: ['January', 'April', 'August'],
    website: 'https://www.sgu.edu/school-of-medicine/',
    type: 'Medical University',
    programs: ['Doctor of Medicine (MD)', 'Veterinary Medicine', 'Public Health', 'Nursing'],
    tuitionRange: '$25,000–$35,000/year',
    featured: true,
  },
  {
    id: 'benedictine-university',
    name: 'Benedictine University',
    slug: 'benedictine-university',
    country: 'USA',
    countryCode: 'US',
    city: 'Lisle, Illinois',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/benedictine-university-logo.png',
    heroImage: 'https://theglobalavenues.com/universities/benedictine-university-hero.webp',
    description:
      'Values-based Catholic university in the Benedictine tradition with campuses in Lisle (Illinois) and Mesa (Arizona).',
    intakes: ['Multiple intakes by program'],
    website: 'https://ben.edu/',
    type: 'American University',
    programs: ['Business', 'Health Sciences', 'Computer Science', 'Psychology', 'MBA'],
    tuitionRange: '$32,000–$38,000/year',
    featured: true,
  },
  {
    id: 'elmhurst-university',
    name: 'Elmhurst University',
    slug: 'elmhurst-university',
    country: 'USA',
    countryCode: 'US',
    city: 'Elmhurst, Illinois',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/elmhurst-university-logo.png',
    heroImage: 'https://theglobalavenues.com/universities/elmhurst-university-hero.jpg',
    description:
      'Private liberal arts university near Chicago, founded in 1871, with undergraduate, graduate, degree completion, and certificate pathways.',
    intakes: ['Program-dependent'],
    website: 'https://www.elmhurst.edu/',
    type: 'American University',
    programs: ['Liberal Arts', 'Business', 'Computer Science', 'Nursing', 'Education'],
    tuitionRange: '$34,000–$40,000/year',
    featured: true,
  },
  {
    id: 'eit-innoenergy',
    name: 'EIT InnoEnergy',
    slug: 'eit-innoenergy',
    country: 'Europe',
    countryCode: 'EU',
    city: 'Pan-European',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/eit-innoenergy/eit-innoenergy-legacy-logo.jpeg',
    heroImage: 'https://theglobalavenues.com/universities/eit-innoenergy/eit-innoenergy-hero.jpg',
    description:
      'Pan-European master-level education ecosystem in sustainable energy, delivered with mobility pathways across top partner institutions.',
    intakes: ['Annual intake'],
    website: 'https://apply.innoenergy.com/',
    type: 'Technology Institute',
    programs: ['Sustainable Energy', 'Energy Innovation', 'Smart Cities', 'Energy Storage'],
    tuitionRange: '€12,000–€18,000/year',
    featured: true,
  },
  {
    id: 'mjm-graphic-design',
    name: 'MJM Graphic Design',
    slug: 'mjm-graphic-design',
    country: 'France',
    countryCode: 'FR',
    city: 'Paris / London',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/mjm-graphic-design-logo.ico',
    heroImage: 'https://theglobalavenues.com/universities/mjm-graphic-design-hero.jpg',
    description:
      'Creative design school in France with bachelor and master options in graphic, interior, fashion, and audiovisual design fields.',
    intakes: ['September', 'February'],
    email: 'south.asia@mjm-design.com',
    website: 'https://www.mjm-design.com/en',
    type: 'Design & Creative',
    programs: ['Graphic Design', 'Interior Architecture', 'Fashion Design', 'Audiovisual Design'],
    tuitionRange: '€8,000–€14,000/year',
    featured: true,
  },
  {
    id: 'icn-business-school',
    name: 'ICN Business School',
    slug: 'icn-business-school',
    country: 'France',
    countryCode: 'FR',
    city: 'Nancy / Paris',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/icn-business-school-logo.svg',
    heroImage: 'https://theglobalavenues.com/universities/icn-business-school-hero.png',
    description:
      'ICN is a triple-accredited creative business school in France with bachelor, master, and doctoral pathways built around the #ArtTechnologyManagement approach.',
    intakes: ['September', 'January'],
    email: 'icn@theglobalavenues.com',
    website: 'https://www.icn-artem.com/en/',
    type: 'Business School',
    programs: ['Bachelor in Management', 'Master in Management', 'MBA', 'Doctoral Programs'],
    tuitionRange: '€9,000–€16,000/year',
    featured: true,
  },
  {
    id: 'mesoyios-college',
    name: 'Mesoyios College',
    slug: 'mesoyios-college',
    country: 'Cyprus',
    countryCode: 'CY',
    city: 'Limassol',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/mesoyios-college-logo.webp',
    heroImage: 'https://theglobalavenues.com/universities/mesoyios-college-hero.webp',
    description:
      'Cyprus-based college offering hospitality and business pathways at bachelor, higher diploma, diploma, and foundation levels.',
    intakes: ['February', 'September', 'June (foundation)'],
    email: 'southasia@mesoyios.ac.cy',
    website: 'https://www.mesoyios.ac.cy/',
    type: 'Hospitality School',
    programs: ['Hospitality Management', 'Business Administration', 'Tourism', 'Foundation Programs'],
    tuitionRange: '€5,000–€9,000/year',
    featured: false,
  },
  {
    id: 'cefam-international-school',
    name: 'CEFAM International School',
    slug: 'cefam-international-school',
    country: 'France',
    countryCode: 'FR',
    city: 'Lyon',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/cefam-international-school-logo.svg',
    heroImage: 'https://theglobalavenues.com/universities/cefam-international-school-hero.webp',
    description:
      'France-based business school with pathways to USA and Canada and focused options in international organization and business tracks.',
    intakes: ['September', 'February'],
    email: 'southasia.cefam@gmail.com',
    website: 'https://www.cefam.fr/en/',
    type: 'Business School',
    programs: ['International Business', 'Management', 'Marketing', 'Finance'],
    tuitionRange: '€8,500–€13,000/year',
    featured: false,
  },
  {
    id: 'kes-college-nicosia',
    name: 'KES College Nicosia',
    slug: 'kes-college-nicosia',
    country: 'Cyprus',
    countryCode: 'CY',
    city: 'Nicosia',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/kes-college-nicosia-logo.png',
    heroImage: 'https://theglobalavenues.com/universities/kes-college-nicosia-hero.jpg',
    description:
      'Private college in Nicosia offering culinary, business, hotel, logistics, fitness, office administration, and foundation pathways.',
    intakes: ['February', 'September', 'June (foundation)'],
    email: 'sub-asia1@kes.ac.cy',
    website: 'https://www.kescollege.ac.cy/en/',
    type: 'Higher Education Institution',
    programs: ['Culinary Arts', 'Hotel Management', 'Business', 'Logistics', 'Foundation'],
    tuitionRange: '€4,500–€8,000/year',
    featured: false,
  },
  {
    id: 'international-american-university',
    name: 'International American University',
    slug: 'international-american-university',
    country: 'USA',
    countryCode: 'US',
    city: 'Los Angeles, California',
    tier: 'exclusive',
    logo: 'https://theglobalavenues.com/universities/international-american-university-logo.png',
    heroImage: 'https://theglobalavenues.com/universities/international-american-university-hero.jpg',
    description:
      'US university in Los Angeles with associate, bachelor, master, and doctorate business pathways and multiple annual intakes.',
    intakes: ['Spring Session 1', 'Spring Session 2', 'Summer Session 1', 'Summer Session 2', 'Fall Session 1', 'Fall Session 2'],
    email: 'in1studyusa@iaula.edu',
    website: 'https://iaula.edu/',
    type: 'American University',
    programs: ['Business Administration', 'MBA', 'Doctorate in Business', 'Associate Programs'],
    tuitionRange: '$18,000–$28,000/year',
    featured: false,
  },
];

export const FEATURED_UNIVERSITIES = UNIVERSITIES.filter((u) => u.featured);
export const EXCLUSIVE_UNIVERSITIES = UNIVERSITIES.filter((u) => u.tier === 'exclusive');
