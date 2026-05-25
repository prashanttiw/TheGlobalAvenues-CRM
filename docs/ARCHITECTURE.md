# 🏗️ Architecture Document — The Global Avenues CRM Portal

> **Version:** 1.0  
> **Last Updated:** May 2026  
> **Status:** Frontend Phase 1 Complete · Backend Phase 2 Pending

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Folder Structure Rationale](#folder-structure-rationale)
4. [Routing Architecture](#routing-architecture)
5. [State Management](#state-management)
6. [Data Layer](#data-layer)
7. [Component Architecture](#component-architecture)
8. [Styling Architecture](#styling-architecture)
9. [Performance Architecture](#performance-architecture)
10. [Backend Architecture (Planned)](#backend-architecture-planned)
11. [Database Schema (Planned)](#database-schema-planned)
12. [API Design (Planned)](#api-design-planned)
13. [Authentication Architecture (Planned)](#authentication-architecture-planned)
14. [Deployment Architecture](#deployment-architecture)
15. [Security Considerations](#security-considerations)
16. [Scalability Plan](#scalability-plan)

---

## System Overview

### What we're building

A **3-portal CRM system** for an international education consultancy:

```
┌─────────────────────────────────────────────────────────────┐
│                    THE GLOBAL AVENUES                        │
│                                                             │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  PUBLIC WEBSITE  │  │   STUDENT    │  │     AGENT     │  │
│  │  (Marketing)     │  │   PORTAL     │  │    PORTAL     │  │
│  │                  │  │              │  │               │  │
│  │  - Homepage      │  │  - Dashboard │  │  - Lead inbox │  │
│  │  - Destinations  │  │  - Apply     │  │  - Pipeline   │  │
│  │  - Universities  │  │  - Track     │  │  - Students   │  │
│  │  - Courses       │  │  - Visa      │  │  - Commission │  │
│  │  - Partners      │  │  - Documents │  │               │  │
│  │  - Services      │  └──────────────┘  └───────────────┘  │
│  │  - About/Contact │                                        │
│  └─────────────────┘         ┌──────────────────┐           │
│                               │   ADMIN PANEL    │           │
│                               │                  │           │
│                               │  - All students  │           │
│                               │  - All agents    │           │
│                               │  - Universities  │           │
│                               │  - Analytics     │           │
│                               │  - Content CMS   │           │
│                               └──────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Technology decisions

| Decision | Choice | Reason |
|---|---|---|
| Frontend framework | React 18 | Existing codebase, large ecosystem, team familiarity |
| Build tool | Vite 6 | Fastest HMR, native ESM, excellent DX |
| Language | TypeScript | Type safety, better IDE support, fewer runtime bugs |
| Styling | Tailwind CSS v4 | Utility-first, no CSS files to maintain, design tokens |
| Animation | Framer Motion (Motion) | Best-in-class React animation library |
| 3D Globe | Globe.GL | Three.js wrapper, easiest globe implementation |
| Routing | React Router v7 | Industry standard, file-based routing support |
| Backend (planned) | PHP / Laravel | Client requirement, existing team expertise |
| Database (planned) | MySQL | Standard with PHP/Laravel stack |
| Hosting (planned) | Vercel (frontend) + Railway/VPS (backend) | |

---

## Frontend Architecture

### Layer diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
├─────────────────────────────────────────────────────────────┤
│                     React Application                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    App.tsx (Router)                   │   │
│  │                                                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │              Layout Shell                    │    │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │    │   │
│  │  │  │  Header  │  │  <main>  │  │  Footer  │  │    │   │
│  │  │  └──────────┘  │          │  └──────────┘  │    │   │
│  │  │                │  Pages   │                │    │   │
│  │  │                │          │                │    │   │
│  │  │                └──────────┘                │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Data Layer  │  │  UI Library  │  │  Animation Layer │  │
│  │  (src/data/) │  │  (Radix UI + │  │  (Framer Motion) │  │
│  │              │  │   shadcn/ui) │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component hierarchy

```
App.tsx
├── BrowserRouter
│   ├── ScrollToTop (utility)
│   └── Layout
│       ├── Header (layout/Header.tsx)
│       │   ├── Logo
│       │   ├── DesktopNav (with dropdowns)
│       │   ├── CTAButtons
│       │   └── MobileMenu
│       │
│       ├── <Routes>
│       │   ├── / → HomePage
│       │   │   ├── HeroSection
│       │   │   ├── InnovationBar
│       │   │   ├── PartnerTicker
│       │   │   ├── HowItWorks
│       │   │   ├── DestinationsSection
│       │   │   ├── GlobeSection
│       │   │   ├── CourseCategorySection
│       │   │   ├── AIMatcherWidget
│       │   │   ├── ExclusivePartnersSection
│       │   │   ├── StatsSection
│       │   │   ├── TestimonialsSection
│       │   │   ├── CostOfLivingSlider
│       │   │   ├── ComparisonLab
│       │   │   ├── DailyDrillWidget
│       │   │   ├── DocumentButler
│       │   │   ├── StudentDashboardPreview
│       │   │   ├── ServicesSection
│       │   │   └── CTABanner
│       │   │
│       │   ├── /destinations → DestinationsPage
│       │   ├── /universities → UniversitiesPage
│       │   ├── /courses → CoursesPage
│       │   ├── /partners → PartnersPage
│       │   ├── /about → AboutPage
│       │   ├── /contact → ContactPage
│       │   └── /apply → ApplyPage
│       │
│       ├── Footer (layout/Footer.tsx)
│       └── WhatsAppButton (layout/WhatsAppButton.tsx)
```

---

## Folder Structure Rationale

### Why this structure?

```
src/
├── app/          ← Figma-exported components (preserved, gradually migrated)
├── components/   ← New hand-crafted components (layout + feature sections)
├── data/         ← Static data layer (will become API calls in Phase 2)
├── lib/          ← Pure utility functions
├── pages/        ← Route-level components (one per URL)
└── styles/       ← Global CSS, design tokens, animations
```

**Key decisions:**

1. **`app/` vs `components/`** — We kept the Figma-exported components in `app/components/` to avoid breaking changes. New components go in `components/`. Over time, `app/components/` will be migrated or deleted.

2. **`pages/` pattern** — Each page is a thin orchestration layer that imports and arranges section components. Pages don't contain business logic.

3. **`data/` as static layer** — All data is currently TypeScript constants. When the backend is ready, these files become API hooks (`useUniversities()`, `useDestinations()`, etc.) — the components don't need to change.

4. **No `context/` or `store/` yet** — Current state is all local (useState). When auth is added, a `context/AuthContext.tsx` will be added. No Redux/Zustand needed at this scale.

---

## Routing Architecture

### Current routing (React Router v7)

```typescript
// src/app/App.tsx
<BrowserRouter>
  <ScrollToTop />
  <Layout>
    <Routes>
      <Route path="/"                    element={<HomePage />} />
      <Route path="/destinations"        element={<DestinationsPage />} />
      <Route path="/destinations/:slug"  element={<DestinationsPage />} />
      <Route path="/universities"        element={<UniversitiesPage />} />
      <Route path="/universities/:slug"  element={<UniversitiesPage />} />
      <Route path="/courses"             element={<CoursesPage />} />
      <Route path="/courses/:category"   element={<CoursesPage />} />
      <Route path="/partners"            element={<PartnersPage />} />
      <Route path="/about"               element={<AboutPage />} />
      <Route path="/contact"             element={<ContactPage />} />
      <Route path="/apply"               element={<ApplyPage />} />
      <Route path="/portal/login"        element={<ApplyPage />} />
      <Route path="/portal/register"     element={<ApplyPage />} />
      <Route path="*"                    element={<NotFound />} />
    </Routes>
  </Layout>
</BrowserRouter>
```

### Planned routing (Phase 2 — with auth)

```typescript
// Protected route wrapper
<Route element={<RequireAuth role="student" />}>
  <Route path="/portal/student"           element={<StudentDashboard />} />
  <Route path="/portal/student/apply"     element={<ApplicationForm />} />
  <Route path="/portal/student/track"     element={<ApplicationTracker />} />
  <Route path="/portal/student/documents" element={<DocumentVault />} />
  <Route path="/portal/student/visa"      element={<VisaTracker />} />
</Route>

<Route element={<RequireAuth role="agent" />}>
  <Route path="/portal/agent"             element={<AgentDashboard />} />
  <Route path="/portal/agent/leads"       element={<LeadInbox />} />
  <Route path="/portal/agent/pipeline"    element={<Pipeline />} />
  <Route path="/portal/agent/students"    element={<StudentList />} />
  <Route path="/portal/agent/commission"  element={<CommissionReport />} />
</Route>

<Route element={<RequireAuth role="admin" />}>
  <Route path="/portal/admin"             element={<AdminPanel />} />
  <Route path="/portal/admin/universities" element={<UniversityManager />} />
  <Route path="/portal/admin/analytics"   element={<Analytics />} />
</Route>
```

---

## State Management

### Current approach (Phase 1)

All state is **local component state** using `useState` and `useEffect`. No global state manager.

```
Component state:
- HeroSection: slide index, search query
- DestinationsPage: active region filter, search query
- UniversitiesPage: search, country filter, type filter, tier filter
- PartnersPage: search, active tab
- ContactPage: form data, FAQ open state, submitted state
- TestimonialsSection: current slide, direction
- ComparisonLab: selected universities, show selector modal
- DailyDrillWidget: current question, selected answer, streak, timer
- DocumentButler: document upload states
```

### Planned approach (Phase 2)

```
Global state (React Context):
- AuthContext: user, role, token, login(), logout()
- ApplicationContext: current application state

Server state (React Query / SWR):
- useUniversities(filters)
- useDestinations()
- useApplications(studentId)
- useLeads(agentId)
```

---

## Data Layer

### Current (static TypeScript)

```typescript
// src/data/universities.ts
export const UNIVERSITIES: University[] = [
  {
    id: 'fh-kufstein-tirol',
    name: 'FH Kufstein Tirol',
    // ... all real data from theglobalavenues.com
  },
  // ... 11 more universities
];
```

### Planned (API hooks)

```typescript
// src/hooks/useUniversities.ts (Phase 2)
export function useUniversities(filters?: UniversityFilters) {
  return useQuery({
    queryKey: ['universities', filters],
    queryFn: () => api.get('/universities', { params: filters }),
  });
}
```

### Data migration path

When backend is ready:
1. Create `src/hooks/` directory
2. Create `useUniversities.ts`, `useDestinations.ts`, etc.
3. Replace static imports in components with hook calls
4. Static data files become fallback/seed data

---

## Component Architecture

### Component types

| Type | Location | Description |
|---|---|---|
| **Layout** | `components/layout/` | Header, Footer, WhatsApp button — appear on every page |
| **Page sections** | `components/home/` | Large sections used in HomePage |
| **Page views** | `pages/` | Route-level components |
| **UI primitives** | `app/components/ui/` | shadcn/ui base components |
| **Interactive widgets** | `app/components/` | Complex interactive features from Figma |

### Component conventions

```typescript
// ✅ Good component structure
export function ComponentName({ prop1, prop2 }: Props) {
  // 1. Hooks
  const [state, setState] = useState(initialValue);
  
  // 2. Derived values
  const computed = useMemo(() => ..., [deps]);
  
  // 3. Handlers
  const handleClick = useCallback(() => ..., [deps]);
  
  // 4. Effects
  useEffect(() => ..., [deps]);
  
  // 5. Render
  return (
    <section className="py-24 bg-[#FFFCF5]">
      {/* content */}
    </section>
  );
}
```

### Animation patterns

```typescript
// Standard scroll-reveal (used everywhere)
<motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6 }}
>

// Staggered children
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay: i * 0.08 }}
  >
))}

// 3D card hover
<motion.div
  whileHover={{ y: -12, rotateX: 4, rotateY: -4 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
  style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
>
```

---

## Styling Architecture

### CSS architecture (Tailwind v4)

```
src/styles/
├── index.css      # @import chain entry point
├── fonts.css      # Google Fonts (Syne + Plus Jakarta Sans)
├── tailwind.css   # @import 'tailwindcss' + source directive
└── theme.css      # CSS custom properties + @theme inline + @layer base
```

### Design token system

All design decisions are encoded as CSS custom properties in `theme.css`:

```css
:root {
  /* Brand colors */
  --sunset-orange: #FD7E14;
  --burnt-orange:  #C94D1B;
  --crimson-red:   #D32F2F;
  --golden-yellow: #FFC107;
  --warm-cream:    #FFFCF5;
  
  /* Shadow tokens */
  --shadow-warm-sm:  0 2px 8px  rgba(253,126,20,0.10);
  --shadow-warm-md:  0 4px 20px rgba(253,126,20,0.14);
  --shadow-warm-lg:  0 12px 40px rgba(253,126,20,0.20);
  --shadow-warm-xl:  0 24px 60px rgba(253,126,20,0.25);
}
```

### Tailwind v4 specifics

Tailwind v4 uses a different config approach than v3:
- No `tailwind.config.js` — configuration is in CSS via `@theme inline`
- Source scanning via `@source '../**/*.{js,ts,jsx,tsx}'`
- CSS variables are automatically available as Tailwind utilities

---

## Performance Architecture

### Bundle splitting strategy

```typescript
// vite.config.ts
manualChunks: {
  'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
  'vendor-motion': ['motion'],
  'vendor-radix':  [...radix packages],
  'vendor-charts': ['recharts'],
  'vendor-icons':  ['lucide-react'],
  // globe.gl splits automatically (dynamic import)
}
```

### Image optimization

- All images from Unsplash with `?w=1200&q=80` parameters
- Partner logos from `theglobalavenues.com` CDN
- `loading="lazy"` on all non-critical images
- `loading="eager"` on hero image (above fold)

### Animation performance

- All animations use CSS `transform` and `opacity` (GPU-accelerated)
- `viewport={{ once: true }}` prevents re-animation on scroll
- Globe.GL loads asynchronously — app is fully usable before it loads
- `useInView` for counter animations — only runs when element is visible

---

## Backend Architecture (Planned)

### Technology stack

```
Backend: PHP 8.2 + Laravel 11
Database: MySQL 8.0
Cache: Redis
Queue: Laravel Queues (Redis driver)
Storage: AWS S3 (documents)
Email: SendGrid / Mailgun
SMS: Twilio (OTP)
```

### Domain structure

```
theglobalavenues.com          → Main marketing website (existing)
portal.theglobalavenues.com   → This React CRM portal
api.theglobalavenues.com      → Laravel REST API
```

### Laravel project structure (planned)

```
api/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   ├── Student/
│   │   │   ├── Agent/
│   │   │   └── Admin/
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Models/
│   │   ├── User.php
│   │   ├── Student.php
│   │   ├── Agent.php
│   │   ├── Application.php
│   │   ├── University.php
│   │   └── Document.php
│   └── Services/
│       ├── ApplicationService.php
│       ├── DocumentService.php
│       └── NotificationService.php
├── database/
│   └── migrations/
└── routes/
    └── api.php
```

---

## Database Schema (Planned)

### Core tables

```sql
-- Users (all roles)
users
  id, email, password, role (student|agent|admin),
  name, phone, created_at, updated_at

-- Student profiles
students
  id, user_id, dob, nationality, passport_number,
  highest_qualification, percentage, backlogs,
  ielts_score, toefl_score, gre_score, gmat_score,
  preferred_countries[], preferred_courses[],
  budget_min, budget_max, target_intake,
  assigned_agent_id, created_at

-- Agent profiles
agents
  id, user_id, company_name, city, state,
  icef_certified, years_experience,
  commission_rate, status (active|inactive),
  created_at

-- Universities
universities
  id, name, slug, country, city, tier (exclusive|preferred|open),
  logo_url, hero_image_url, description,
  website, email, type, programs[],
  tuition_min, tuition_max, currency,
  intakes[], ielts_min, created_at

-- Applications
applications
  id, student_id, university_id, course_name,
  intake_month, intake_year,
  status (draft|submitted|under_review|offer_received|
          accepted|visa_applied|visa_approved|enrolled|rejected),
  agent_id, counsellor_id,
  offer_letter_url, visa_url,
  notes, created_at, updated_at

-- Documents
documents
  id, student_id, application_id,
  type (passport|transcript|bank_statement|sop|lor|cv|other),
  file_url, file_name, file_size,
  status (pending|verified|rejected),
  verified_by, verified_at, created_at

-- Enquiries (from contact form)
enquiries
  id, name, email, phone, role,
  subject, destination, message,
  status (new|contacted|converted|closed),
  assigned_to, created_at
```

---

## API Design (Planned)

### REST API endpoints

```
Authentication:
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

Public (no auth):
GET    /api/universities?country=&type=&tier=&search=
GET    /api/universities/:slug
GET    /api/destinations
GET    /api/destinations/:slug
GET    /api/courses
GET    /api/courses/:category
POST   /api/enquiries

Student (auth: student):
GET    /api/student/profile
PUT    /api/student/profile
GET    /api/student/applications
POST   /api/student/applications
GET    /api/student/applications/:id
PUT    /api/student/applications/:id
GET    /api/student/documents
POST   /api/student/documents
DELETE /api/student/documents/:id

Agent (auth: agent):
GET    /api/agent/profile
GET    /api/agent/students
GET    /api/agent/leads
POST   /api/agent/leads
GET    /api/agent/applications
GET    /api/agent/commission

Admin (auth: admin):
GET    /api/admin/users
GET    /api/admin/applications
GET    /api/admin/analytics
POST   /api/admin/universities
PUT    /api/admin/universities/:id
```

---

## Authentication Architecture (Planned)

### Flow

```
1. User submits login form
2. POST /api/auth/login → returns JWT access token + refresh token
3. Access token stored in memory (not localStorage — XSS protection)
4. Refresh token stored in httpOnly cookie
5. Axios interceptor adds Bearer token to all requests
6. On 401, interceptor calls /api/auth/refresh automatically
7. On logout, both tokens invalidated server-side
```

### Role-based access

```typescript
// React side
type UserRole = 'student' | 'agent' | 'admin';

// Route protection
function RequireAuth({ role }: { role: UserRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/portal/login" />;
  if (user.role !== role) return <Navigate to="/unauthorized" />;
  return <Outlet />;
}
```

---

## Deployment Architecture

### Current (Phase 1 — Frontend only)

```
Developer → GitHub → Vercel (auto-deploy on push to main)
                   → portal.theglobalavenues.com
```

### Planned (Phase 2 — Full stack)

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   (CDN + DNS)   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼──────────┐      ┌──────────▼──────────┐
    │      Vercel         │      │    Railway / VPS     │
    │   (React Frontend)  │      │   (Laravel Backend)  │
    │                     │      │                      │
    │  portal.tga.com     │      │  api.tga.com         │
    └─────────────────────┘      └──────────┬───────────┘
                                            │
                                 ┌──────────▼───────────┐
                                 │   PlanetScale / RDS   │
                                 │   (MySQL Database)    │
                                 └──────────────────────┘
```

---

## Security Considerations

### Frontend (current)

- No sensitive data in frontend code
- All API keys will be server-side only
- Images from trusted CDNs (Unsplash, theglobalavenues.com)
- No `eval()` or `dangerouslySetInnerHTML`
- React Router prevents XSS via JSX escaping

### Backend (planned)

- JWT tokens with short expiry (15 min access, 7 day refresh)
- Refresh tokens in httpOnly cookies (XSS-proof)
- CSRF protection on all state-changing endpoints
- Rate limiting on auth endpoints (5 attempts/minute)
- Input validation via Laravel Form Requests
- SQL injection prevention via Eloquent ORM
- File upload validation (type, size, virus scan)
- HTTPS enforced everywhere

---

## Scalability Plan

### Phase 1 (Current) — 0–1,000 users
- Static frontend on Vercel CDN
- No backend needed
- All data is static TypeScript

### Phase 2 — 1,000–10,000 users
- Laravel API on single VPS
- MySQL on managed database (PlanetScale)
- Redis for sessions and cache
- S3 for document storage

### Phase 3 — 10,000+ users
- Laravel API on multiple instances (load balanced)
- Read replicas for database
- Elasticsearch for university/course search
- CDN for all static assets
- Queue workers for email/SMS notifications
