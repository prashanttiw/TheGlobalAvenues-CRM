# 🛠️ Development Guide — The Global Avenues CRM Portal

> Step-by-step guide for developers and AI assistants continuing this project.

---

## Environment Setup

### Required tools

```bash
# Check Node.js version (need 18+)
node --version

# Check npm version (need 9+)
npm --version
```

### Install and run

```bash
# Install all dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview production build
npm run preview
```

### VS Code extensions (recommended)

- **Tailwind CSS IntelliSense** — autocomplete for Tailwind classes
- **TypeScript** — built-in, ensure it's enabled
- **Prettier** — code formatting (uses `.prettierrc`)
- **ES7+ React/Redux/React-Native snippets** — component snippets
- **Auto Import** — automatic import suggestions

---

## Code Conventions

### File naming

```
Components:     PascalCase.tsx    → HeroSection.tsx
Pages:          PascalCase.tsx    → HomePage.tsx
Data files:     camelCase.ts      → universities.ts
Utility files:  camelCase.ts      → utils.ts
Style files:    kebab-case.css    → theme.css
```

### Import order

```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. Third-party libraries
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

// 3. Internal — data
import { COMPANY } from '@/data/company';

// 4. Internal — components
import { Header } from '@/components/layout/Header';

// 5. Internal — types
import type { University } from '@/data/universities';
```

### TypeScript rules

```typescript
// ✅ Always type props
interface Props {
  title: string;
  count?: number;
  onClick: () => void;
}

// ✅ Use type for data shapes
type PartnerTier = 'exclusive' | 'preferred' | 'open';

// ❌ Never use any
const data: any = ...  // BAD

// ✅ Use unknown if type is truly unknown
const data: unknown = ...  // GOOD
```

### Component structure

```typescript
// Standard component template
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { SomeIcon } from 'lucide-react';

// Types at top
interface Props {
  title: string;
}

// Constants outside component (don't recreate on render)
const ITEMS = [...];

// Component
export function ComponentName({ title }: Props) {
  // 1. State
  const [isOpen, setIsOpen] = useState(false);
  
  // 2. Derived values
  const filtered = ITEMS.filter(...);
  
  // 3. Handlers
  const handleClick = () => setIsOpen(!isOpen);
  
  // 4. Effects
  useEffect(() => {
    // side effects
  }, []);
  
  // 5. Render
  return (
    <section className="py-24 bg-[#FFFCF5]">
      {/* content */}
    </section>
  );
}
```

---

## Adding New Features

### How to add a new page

**Step 1:** Create the page component

```typescript
// src/pages/NewPage.tsx
import { motion } from 'motion/react';

export function NewPage() {
  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-[#1A0A00] to-[#2D1200]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl font-bold text-white mb-4">Page Title</h1>
          </motion.div>
        </div>
      </section>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* page content */}
      </div>
    </div>
  );
}
```

**Step 2:** Add route in App.tsx

```typescript
// src/app/App.tsx
import { NewPage } from '@/pages/NewPage';

// Inside <Routes>:
<Route path="/new-page" element={<NewPage />} />
```

**Step 3:** Add to navigation (if needed)

```typescript
// src/data/company.ts
NAV_LINKS = [
  // ... existing links
  { label: 'New Page', href: '/new-page' },
]
```

**Step 4:** Add dropdown item (if needed)

```typescript
// src/components/layout/Header.tsx → DROPDOWN_ITEMS
Services: [
  // ... existing items
  { label: 'New Service', href: '/new-page', desc: 'Description' },
]
```

---

### How to add a new home section

**Step 1:** Create section component

```typescript
// src/components/home/NewSection.tsx
import { motion } from 'motion/react';

export function NewSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-4">
            <span className="text-sm text-[#FD7E14] font-semibold">Badge Text</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1C1C1E] mb-4">
            Section Title
          </h2>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            Section description
          </p>
        </motion.div>
        
        {/* Section content */}
      </div>
    </section>
  );
}
```

**Step 2:** Add to HomePage

```typescript
// src/pages/HomePage.tsx
import { NewSection } from '@/components/home/NewSection';

export function HomePage() {
  return (
    <>
      {/* ... existing sections */}
      <NewSection />
      {/* ... more sections */}
    </>
  );
}
```

---

### How to add a new university

```typescript
// src/data/universities.ts → UNIVERSITIES array
{
  id: 'university-slug',
  name: 'Full University Name',
  slug: 'university-slug',
  country: 'Country',
  countryCode: 'XX',
  city: 'City',
  tier: 'exclusive',
  logo: '/universities/university-slug-logo.png',
  heroImage: '/universities/university-slug-hero.jpg',
  description: 'University description.',
  intakes: ['September'],
  email: 'email@theglobalavenues.com',
  website: 'https://university.edu',
  type: 'Business School',
  programs: ['Program 1', 'Program 2'],
  tuitionRange: '€X,000–€Y,000/year',
  featured: true,
}
```

---

## Priority Tasks for Next Session

### HIGH PRIORITY — Build these next

#### 1. CountryDetailPage (`/destinations/:slug`)

This is the most important missing page. Each country needs:

```
Sections needed:
1. Hero — country photo, flag, quick stats pills
2. At a Glance — 6 stat cards (universities, tuition, cost of living, work rights, PR pathway, IELTS)
3. Why Study Here — tabs: Overview, Education System, Work & PR, Cost, Life & Culture, Visa
4. Top Cities — city cards with photo, universities count, avg rent
5. University Listing — filtered to this country (use UNIVERSITIES data)
6. Popular Courses — horizontal scroll pills
7. Visa Guide — step-by-step visual process
8. Cost of Living Calculator — city dropdown + budget slider
9. Student Stories — testimonials filtered by country
10. Expert Counsellor CTA — "Talk to our [Country] Specialist"
```

**File to create:** `src/pages/CountryDetailPage.tsx`
**Route to add:** `<Route path="/destinations/:slug" element={<CountryDetailPage />} />`

#### 2. UniversityDetailPage (`/universities/:slug`)

```
Sections needed:
1. Hero — university banner, logo, name, city, country flag, quick stats
2. Sticky action bar — [Apply Now] [Shortlist] [Compare] [Share]
3. Tabs — Overview, Courses, Requirements, Fees & Aid, Campus Life, Reviews
4. Overview tab — about, rankings, accreditations
5. Courses tab — course listing with search/filter
6. Requirements tab — academic requirements, English tests, docs
7. Fees & Aid tab — tuition, scholarships, payment plans
8. Campus Life tab — photos, city info, accommodation
9. Reviews tab — student reviews
10. Sticky sidebar — Apply CTA, intake countdown, WhatsApp
```

**File to create:** `src/pages/UniversityDetailPage.tsx`
**Route to add:** `<Route path="/universities/:slug" element={<UniversityDetailPage />} />`

#### 3. ServicesPage (`/services`)

```
Sections needed:
1. Hero — "End-to-End Support. Every Step."
2. Service 1: University Counselling — what it includes, counsellor profiles, free session CTA
3. Service 2: Visa Assistance — countries, step-by-step visual, success rate
4. Service 3: SOP & Document Prep — what we help with, AI tools preview
5. Service 4: Scholarships — database teaser, types, ₹200Cr+ stat
6. Service 5: Accommodation — partner providers, city-wise rent
7. Service 6: Education Loans — partner banks, EMI calculator
```

**File to create:** `src/pages/ServicesPage.tsx`
**Route to update:** Change `/services` from `ContactPage` to `ServicesPage`

#### 4. Fix remaining blue colors in Figma components

Files that still use old blue (#0074D9, #001F3F):
- `src/app/components/live-alumni-feed.tsx` — uses pink/purple
- `src/app/components/support-hub.tsx` — uses blue
- `src/app/components/daily-drill-widget.tsx` — uses blue
- `src/app/components/student-dashboard-preview.tsx` — uses blue

**Fix:** Replace all `#0074D9` with `#FD7E14` and `#001F3F` with `#1C1C1E`

---

### MEDIUM PRIORITY

#### 5. BlogPage (`/blog`)

Simple blog listing page with:
- Featured post hero
- Category filter tabs
- 3-column card grid
- Sidebar with popular posts

#### 6. Connect AI Matcher flow

Currently the AI Matcher Widget shows a loading state but doesn't navigate to results.

Fix: After the loading animation completes, navigate to `/universities?ai=true` or show the `AIMatcherResults` component inline.

#### 7. Proper Login Page (`/portal/login`)

Currently shows the register form. Needs:
- Separate login form (email + password)
- "Forgot password" link
- Role detection (student vs agent)
- "Don't have an account? Register" link

---

## Common Patterns Reference

### Fetch data from static files

```typescript
import { UNIVERSITIES, EXCLUSIVE_UNIVERSITIES } from '@/data/universities';
import { DESTINATIONS, FEATURED_DESTINATIONS } from '@/data/destinations';
import { COURSE_CATEGORIES } from '@/data/courses';
import { COMPANY } from '@/data/company';
```

### Filter universities by country

```typescript
const ukUniversities = UNIVERSITIES.filter(u => u.country === 'United Kingdom');
```

### Get destination by slug

```typescript
import { useParams } from 'react-router-dom';
import { DESTINATIONS } from '@/data/destinations';

const { slug } = useParams();
const destination = DESTINATIONS.find(d => d.slug === slug);
```

### Animated counter

```typescript
// Already built in src/components/home/StatsSection.tsx
// Copy the AnimatedCounter component from there
```

### Motion scroll reveal

```typescript
import { motion } from 'motion/react';

<motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6 }}
>
```

### Responsive grid

```typescript
// 4 columns on desktop, 2 on tablet, 1 on mobile
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
```

### Dark section template

```typescript
<section className="py-24 bg-[#1A1A1A] relative overflow-hidden">
  {/* Background grid */}
  <div className="absolute inset-0 line-grid opacity-30" />
  
  {/* Glow orb */}
  <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#FD7E14]/5 blur-3xl pointer-events-none" />
  
  <div className="max-w-7xl mx-auto px-6 relative z-10">
    {/* content */}
  </div>
</section>
```

---

## Debugging Common Issues

### Globe not showing

The Globe.GL component loads asynchronously. If it doesn't show:
1. Check browser console for errors
2. Ensure `globe.gl` is installed: `npm list globe.gl`
3. The fallback spinner should show while loading
4. Globe requires WebGL — check if browser supports it

### Tailwind classes not applying

Tailwind v4 scans source files automatically. If a class isn't working:
1. Check `src/styles/tailwind.css` has `@source '../**/*.{js,ts,jsx,tsx}'`
2. Ensure the class is in a source file (not dynamically constructed)
3. Run `npm run build` to see if there are CSS errors

### TypeScript errors

```bash
# Check for TS errors without building
npx tsc --noEmit
```

### Build errors

```bash
# Full build with verbose output
npm run build 2>&1
```

### Import path issues

All imports should use `@/` alias:
```typescript
// ✅ Correct
import { COMPANY } from '@/data/company';

// ❌ Wrong
import { COMPANY } from '../../data/company';
```

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feat/country-detail-page

# Stage specific files
git add src/pages/CountryDetailPage.tsx
git add src/app/App.tsx

# Commit
git commit -m "feat: add country detail page with visa guide and cost calculator"

# Push
git push -u origin feat/country-detail-page
```

### Commit message format

```
feat:     New feature
fix:      Bug fix
style:    CSS/styling changes
refactor: Code refactoring (no behavior change)
docs:     Documentation updates
chore:    Build/config changes
```

---

## Performance Checklist

Before submitting any PR:

- [ ] `npm run build` passes with 0 errors
- [ ] No `console.log` statements left in code
- [ ] All images have `alt` attributes
- [ ] All `motion.div` scroll animations use `viewport={{ once: true }}`
- [ ] No hardcoded data — use `src/data/` files
- [ ] No blue colors (#0074D9, #001F3F) in new code
- [ ] All new components use `@/` import paths
- [ ] TypeScript: no `any` types