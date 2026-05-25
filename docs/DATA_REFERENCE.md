# 📊 Data Reference — The Global Avenues CRM Portal

> All real data used in this project, its sources, and how to update it.

---

## Company Data (`src/data/company.ts`)

**Source:** https://theglobalavenues.com (scraped May 2026)

```typescript
COMPANY = {
  name:     'The Global Avenues',
  tagline:  "Asia's Trusted Global Education Partner",
  email:    'connect@theglobalavenues.com',
  phone:    '+91 11 4680 1133',
  whatsapp: '+911146801133',
  address:  'A 6, Block A, South Extension II, New Delhi, Delhi 110049, India',
  
  logoUrl:  '/logo-footer-white-transparent.png',
  
  certifications: ['ICEF Certified', 'AIRC Member'],
  
  socials: {
    facebook:  'https://www.facebook.com/TheGlobalAvenues/',
    instagram: 'https://www.instagram.com/theglobalavenues/',
    youtube:   'https://www.youtube.com/channel/UCh9cYYFdhMLJx6BfSUNJfUw',
    linkedin:  'https://www.linkedin.com/company/the-global-avenues/posts/',
  },
  
  stats: {
    yearsExperience:    12,
    partnerUniversities: 100,
    channelPartners:    600,
    studentsRecruited:  4000,
    exclusiveUniversities: 14,
    countries:          40,
    visaSuccessRate:    98,
  },
  
  offices: [
    {
      city:    'New Delhi',
      label:   'HQ — New Delhi',
      address: 'A 6, Block A, South Extension II, New Delhi, Delhi 110049',
      phone:   '+91 11 4680 1133',
      email:   'connect@theglobalavenues.com',
      lat:     28.5672,
      lng:     77.2100,
      isHQ:    true,
    }
  ]
}
```

**To update:** Edit `src/data/company.ts` directly.

---

## Partner Universities (`src/data/universities.ts`)

**Source:** /portfolio (scraped May 2026)

All 12 universities are **real exclusive partners** with signed MOUs.

### University list

| ID | Name | Country | Type | Tier |
|---|---|---|---|---|
| `fh-kufstein-tirol` | FH Kufstein Tirol | Austria | University of Applied Sciences | exclusive |
| `euas` | Estonian Entrepreneurship University of Applied Sciences | Estonia | University of Applied Sciences | exclusive |
| `st-georges-university` | St. George's University | Grenada | Medical University | exclusive |
| `benedictine-university` | Benedictine University | USA | American University | exclusive |
| `elmhurst-university` | Elmhurst University | USA | American University | exclusive |
| `eit-innoenergy` | EIT InnoEnergy | Europe | Technology Institute | exclusive |
| `mjm-graphic-design` | MJM Graphic Design | France | Design & Creative | exclusive |
| `icn-business-school` | ICN Business School | France | Business School | exclusive |
| `mesoyios-college` | Mesoyios College | Cyprus | Hospitality School | exclusive |
| `cefam-international-school` | CEFAM International School | France | Business School | exclusive |
| `kes-college-nicosia` | KES College Nicosia | Cyprus | Higher Education Institution | exclusive |
| `international-american-university` | International American University | USA | American University | exclusive |

### University data structure

```typescript
interface University {
  id: string;           // URL-safe identifier
  name: string;         // Full official name
  slug: string;         // URL slug (matches theglobalavenues.com/portfolio/:slug)
  country: string;      // Country name
  countryCode: string;  // ISO 2-letter code
  city: string;         // City name
  tier: 'exclusive' | 'preferred' | 'open';
  logo: string;         // URL from theglobalavenues.com CDN
  heroImage: string;    // URL from theglobalavenues.com CDN
  description: string;  // From portfolio page
  intakes: string[];    // Intake months
  email?: string;       // Dedicated email for this university
  website?: string;     // University's own website
  type: string;         // Institution type category
  programs: string[];   // Key programs offered
  tuitionRange?: string; // Approximate tuition
  ranking?: string;     // QS or other ranking if available
  featured: boolean;    // Show on homepage
}
```

### Image URLs pattern

All university images are hosted on `theglobalavenues.com`:
```
Logo:  /universities/{slug}-logo.{ext}
Hero:  /universities/{slug}-hero.{ext}
```

**To add a new university:**
1. Add entry to `UNIVERSITIES` array in `src/data/universities.ts`
2. Use the slug that matches the portfolio page URL
3. Set `tier: 'exclusive'` for MOU partners, `'preferred'` for strong partners, `'open'` for general

---

## Study Destinations (`src/data/destinations.ts`)

12 destinations with full data including globe coordinates.

### Destination list

| Country | Region | Globe Coords | Featured |
|---|---|---|---|
| United Kingdom | europe | 51.51, -0.13 | ✅ |
| United States | americas | 37.09, -95.71 | ✅ |
| Canada | americas | 56.13, -106.35 | ✅ |
| Australia | asia-pacific | -25.27, 133.78 | ✅ |
| Germany | europe | 51.17, 10.45 | ✅ |
| France | europe | 46.23, 2.21 | ✅ |
| Ireland | europe | 53.14, -7.69 | ❌ |
| Cyprus | europe | 35.13, 33.43 | ❌ |
| Estonia | europe | 58.60, 25.01 | ❌ |
| Austria | europe | 47.52, 14.55 | ❌ |
| New Zealand | asia-pacific | -40.90, 174.89 | ❌ |
| Singapore | asia-pacific | 1.35, 103.82 | ❌ |

### Destination data structure

```typescript
interface Destination {
  id: string;
  country: string;
  slug: string;
  flag: string;           // Emoji flag
  countryCode: string;    // ISO 2-letter
  region: 'europe' | 'americas' | 'asia-pacific' | 'middle-east' | 'caribbean';
  heroImage: string;      // Unsplash URL
  avgTuition: string;     // In local currency
  avgTuitionINR: string;  // In Indian Rupees
  ieltsMin: string;       // Minimum IELTS score
  workRights: string;     // Work rights during/after study
  prPathway: string;      // PR/immigration pathway
  costOfLiving: string;   // Monthly estimate
  topCities: string[];    // Top study cities
  universitiesCount: number;
  coursesCount: number;
  visaType: string;
  visaProcessingTime: string;
  featured: boolean;
  globeCoords: { lat: number; lng: number };
  color: string;          // Tailwind gradient for card overlay
}
```

---

## Course Categories (`src/data/courses.ts`)

10 course categories covering all major fields.

| ID | Name | Courses | Top Countries |
|---|---|---|---|
| `computer-science` | Computer Science & IT | 420 | USA, UK, Canada, Germany, Australia |
| `business-mba` | Business & MBA | 380 | USA, UK, France, Canada, Australia |
| `medicine-health` | Medicine & Health Sciences | 180 | Grenada, USA, UK, Australia, Ireland |
| `engineering` | Engineering & Architecture | 290 | Germany, USA, UK, Australia, Canada |
| `arts-design` | Arts, Design & Media | 160 | France, UK, USA, Italy, Australia |
| `finance-accounting` | Finance & Accounting | 210 | UK, USA, Singapore, Australia, Canada |
| `law` | Law & Political Science | 120 | UK, USA, Australia, Canada, Ireland |
| `science-research` | Science & Research | 200 | Germany, USA, UK, Australia, Estonia |
| `hospitality-tourism` | Hospitality & Tourism | 90 | Cyprus, France, UK, Australia, Switzerland |
| `energy-sustainability` | Energy & Sustainability | 80 | Germany, Austria, Netherlands, Denmark, Estonia |

---

## Testimonials Data

**Source:** Fictional but realistic student stories based on real partner universities.

Located in: `src/components/home/TestimonialsSection.tsx`

| Student | Course | University | Country |
|---|---|---|---|
| Priya Sharma | MBA | ICN Business School | France |
| Rahul Mehta | BSc Computer Science | EUAS | Estonia |
| Ananya Patel | BBA | Benedictine University | USA |
| Arjun Singh | MSc Sustainable Energy | EIT InnoEnergy | Europe |
| Kavya Reddy | Graphic Design | MJM Paris | France |

**Note:** These are illustrative testimonials. Replace with real student testimonials when available.

---

## Globe Arc Data

**Source:** Calculated from destination coordinates.

The globe shows arc lines from India (lat: 20.5937, lng: 78.9629) to each destination country.

```typescript
const INDIA = { lat: 20.5937, lng: 78.9629 };

// Arcs are generated automatically from DESTINATIONS data:
const ARCS = GLOBE_POINTS.map(p => ({
  startLat: INDIA.lat, startLng: INDIA.lng,
  endLat: p.lat, endLng: p.lng,
  color: ['rgba(253,126,20,0.9)', 'rgba(255,193,7,0.6)'],
}));
```

---

## Image Sources

### Unsplash images (free to use)

All destination hero images are from Unsplash with `?w=1200&q=80` parameters.

| Destination | Unsplash URL |
|---|---|
| UK | photo-1513635269975-59663e0ac1ad |
| USA | photo-1485738422979-f5c462d49f74 |
| Canada | photo-1517935706615-2717063c2225 |
| Australia | photo-1506973035872-a4ec16b8e8d9 |
| Germany | photo-1467269204594-9661b134dd2b |
| France | photo-1502602898657-3e91760cbb34 |
| Ireland | photo-1590089415225-401ed6f9db8e |
| Cyprus | photo-1558618666-fcd25c85cd64 |
| Estonia | photo-1565008576549-57569a49371d |
| Austria | photo-1516550893923-42d28e5677af |
| New Zealand | photo-1507699622108-4be3abd695ad |
| Singapore | photo-1525625293386-3f8f99389edd |

### University images (from theglobalavenues.com CDN)

```
/universities/{filename}
```

These are hosted on the client's own CDN. They are stable and will not change.

### Hero section images (Unsplash)

```
Slide 1: photo-1523050854058-8df90110c9f1 (students on campus)
Slide 2: photo-1541339907198-e08756dedf3f (university building)
Slide 3: photo-1498243691581-b145c3f54a5a (student studying)
```

---

## Navigation Data

Located in: `src/data/company.ts`

```typescript
NAV_LINKS = [
  { label: 'Destinations', href: '/destinations' },
  { label: 'Universities', href: '/universities' },
  { label: 'Courses',      href: '/courses' },
  { label: 'Partners',     href: '/partners' },
  { label: 'Services',     href: '/services' },
  { label: 'About',        href: '/about' },
  { label: 'Blog',         href: '/blog' },
  { label: 'Contact',      href: '/contact' },
]
```

Dropdown items are in: `src/components/layout/Header.tsx` → `DROPDOWN_ITEMS`

---

## How to Update Data

### Add a new partner university

```typescript
// src/data/universities.ts
{
  id: 'new-university-slug',
  name: 'University Full Name',
  slug: 'new-university-slug',
  country: 'Country Name',
  countryCode: 'XX',
  city: 'City Name',
  tier: 'exclusive',  // or 'preferred' or 'open'
  logo: '/universities/new-university-logo.png',
  heroImage: '/universities/new-university-hero.jpg',
  description: 'Description from portfolio page.',
  intakes: ['September', 'January'],
  email: 'contact@theglobalavenues.com',
  website: 'https://university-website.com',
  type: 'Business School',
  programs: ['Program 1', 'Program 2'],
  tuitionRange: '€X,000–€Y,000/year',
  featured: true,  // show on homepage
}
```

### Add a new destination

```typescript
// src/data/destinations.ts
{
  id: 'country-name',
  country: 'Country Name',
  slug: 'country-name',
  flag: '🇽🇽',
  countryCode: 'XX',
  region: 'europe',
  heroImage: '/universities/fh-kufstein-tirol-hero.webp',
  avgTuition: '€X,000–€Y,000/year',
  avgTuitionINR: '₹X–YL/year',
  ieltsMin: '6.0',
  workRights: 'X hrs/week',
  prPathway: 'Pathway description',
  costOfLiving: '€X00–€Y,000/month',
  topCities: ['City 1', 'City 2'],
  universitiesCount: 0,
  coursesCount: 0,
  visaType: 'Visa type name',
  visaProcessingTime: 'X weeks',
  featured: false,
  globeCoords: { lat: 0.0, lng: 0.0 },  // Find on Google Maps
  color: 'from-[#XXXXXX] to-[#YYYYYY]',
}
```

### Update company stats

```typescript
// src/data/company.ts → COMPANY.stats
stats: {
  yearsExperience:       12,   // Update annually
  partnerUniversities:   100,  // Update when new partners added
  channelPartners:       600,  // Update quarterly
  studentsRecruited:     4000, // Update quarterly
  exclusiveUniversities: 14,   // Update when new MOUs signed
  countries:             40,   // Update when new countries added
  visaSuccessRate:       98,   // Update based on actual data
}
```