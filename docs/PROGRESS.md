# 📊 Project Progress & AI Handoff Document

> **Purpose:** This document is the single source of truth for any AI assistant, developer, or team member picking up this project. Read this first before touching any code.
>
> **Last Updated:** May 12, 2026  
> **Current Phase:** Phase 1 — Frontend Complete  
> **Next Phase:** Phase 2 — Inner Pages + Backend Integration

---

## 🧠 Project Context (Read This First)

### Who is the client?

**The Global Avenues** is an international education consultancy based in New Delhi, India.

- **What they do:** They help students from South Asia (primarily India) get admitted to universities abroad. They also represent universities internationally, helping them recruit students from the Indian market.
- **ICEF Certified + AIRC Member** — these are the two most important industry certifications in international education recruitment.
- **Business model:** They earn commissions from universities when students enroll. Students pay nothing for counselling.
- **Scale:** 12+ years, 100+ partner universities, 600+ channel partners (sub-agents), 4,000+ students recruited.

### What are we building?

A **CRM portal** that serves three audiences:
1. **Students** — browse universities, apply, track applications, manage documents
2. **Agents** — manage their student leads, track commissions, submit applications
3. **Admin** — manage everything, view analytics, update content

The portal also serves as the **public-facing marketing website** for the company.

### What already exists?

- **Main website:** https://theglobalavenues.com (separate codebase, React + Vite, NOT this repo)
- **This repo:** Started as a Figma AI export, now being developed into a full CRM

### Key constraint

The client wants:
- **Frontend first** — build and perfect the UI before touching backend
- **PHP backend** — when backend is built, it must be PHP (Laravel preferred)
- **Best possible UI/UX** — this is a premium product, not a basic CRUD app

---

## ✅ What Is Complete (Phase 1)

### Infrastructure & Setup

| Item | Status | Notes |
|---|---|---|
| Vite 6 + React 18 + TypeScript | ✅ Done | Strict TS config |
| Tailwind CSS v4 | ✅ Done | With CSS custom properties |
| React Router v7 | ✅ Done | Multi-page routing |
| Framer Motion (Motion 12) | ✅ Done | All animations |
| Globe.GL + Three.js | ✅ Done | 3D globe installed |
| tsconfig.json | ✅ Done | Strict mode, path aliases |
| .prettierrc | ✅ Done | Code formatting |
| Vite chunk splitting | ✅ Done | 6 separate vendor chunks |
| SEO meta tags | ✅ Done | OG, Twitter Card, description |
| Build: 0 errors | ✅ Done | Clean production build |

### Design System

| Item | Status | Notes |
|---|---|---|
| Brand color tokens | ✅ Done | CSS custom properties in theme.css |
| Typography (Syne + Plus Jakarta Sans) | ✅ Done | Google Fonts |
| Shadow token system | ✅ Done | 4 warm shadow levels |
| Animation keyframes | ✅ Done | float, pulse-glow, spin-slow, shimmer, gradient-shift |
| Utility classes | ✅ Done | .glass, .glass-warm, .card-3d, .text-gradient-orange, .dot-grid, .line-grid |
| Dark mode variables | ✅ Done | .dark class overrides |

### Layout Components

| Component | Status | File | Notes |
|---|---|---|---|
| Header | ✅ Done | `components/layout/Header.tsx` | Dropdown nav, mobile menu, scroll effect, top bar |
| Footer | ✅ Done | `components/layout/Footer.tsx` | 5-column, real company data |
| WhatsApp Button | ✅ Done | `components/layout/WhatsAppButton.tsx` | Fixed floating, 3 contact options |

### Homepage Sections (18 total)

| Section | Status | Component | Notes |
|---|---|---|---|
| 1. Hero | ✅ Done | `home/HeroSection.tsx` | 3-slide parallax, floating badges, search bar |
| 2. Innovation Bar | ✅ Done | `app/components/innovation-bar.tsx` | Scholarship ticker |
| 3. Partner Ticker | ✅ Done | `home/PartnerTicker.tsx` | Real partner logos |
| 4. How It Works | ✅ Done | `home/HowItWorks.tsx` | 3D card tilt, animated connector |
| 5. Destinations | ✅ Done | `home/DestinationsSection.tsx` | 6 country cards |
| 6. 3D Globe | ✅ Done | `home/GlobeSection.tsx` | Globe.GL, arc lines from India |
| 7. Course Categories | ✅ Done | `home/CourseCategorySection.tsx` | 10 categories |
| 8. AI Matcher Widget | ✅ Done | `app/components/ai-matcher-widget.tsx` | Career selection flow |
| 9. Exclusive Partners | ✅ Done | `home/ExclusivePartnersSection.tsx` | Dark section, real partner data |
| 10. Stats | ✅ Done | `home/StatsSection.tsx` | Animated counters |
| 11. Testimonials | ✅ Done | `home/TestimonialsSection.tsx` | Carousel, 5 student stories |
| 12. Cost of Living | ✅ Done | `app/components/cost-of-living-slider.tsx` | City + lifestyle calculator |
| 13. Comparison Lab | ✅ Done | `app/components/comparison-lab.tsx` | Side-by-side university table |
| 14. Daily Drill | ✅ Done | `app/components/daily-drill-widget.tsx` | Quiz with streak tracking |
| 15. Document Butler | ✅ Done | `app/components/document-butler.tsx` | Drag-drop upload + OCR sim |
| 16. Dashboard Preview | ✅ Done | `app/components/student-dashboard-preview.tsx` | Application tracker |
| 17. Services | ✅ Done | `home/ServicesSection.tsx` | 6 service cards |
| 18. CTA Banner | ✅ Done | `home/CTABanner.tsx` | WhatsApp + counselling CTAs |

### Inner Pages

| Page | Status | Route | Notes |
|---|---|---|---|
| Destinations Hub | ✅ Done | `/destinations` | Region filter, search, country grid |
| Universities Listing | ✅ Done | `/universities` | Search, filter sidebar, tier filter |
| Courses Explorer | ✅ Done | `/courses` | Category grid |
| Partners Page | ✅ Done | `/partners` | Exclusive/All tabs, become-partner CTA |
| About Page | ✅ Done | `/about` | Story, values, stats |
| Contact Page | ✅ Done | `/contact` | Form, FAQ accordion, office info |
| Apply / Register | ✅ Done | `/apply` | Student/Agent role selector |

### Data Layer

| File | Status | Contents |
|---|---|---|
| `data/company.ts` | ✅ Done | Real company data from theglobalavenues.com |
| `data/universities.ts` | ✅ Done | 12 real exclusive partner universities |
| `data/destinations.ts` | ✅ Done | 12 study destinations with globe coordinates |
| `data/courses.ts` | ✅ Done | 10 course categories |

---

## 🔄 What Is Partially Done (Needs Completion)

| Item | Status | What's Missing |
|---|---|---|
| Country Detail Page | 🔄 Route exists | `/destinations/:slug` shows DestinationsPage — needs dedicated CountryDetailPage component with visa guide, cost calculator, city cards, counsellor CTA |
| University Detail Page | 🔄 Route exists | `/universities/:slug` shows UniversitiesPage — needs dedicated UniversityDetailPage with tabs (Overview, Courses, Requirements, Fees, Campus, Reviews) |
| Course Category Page | 🔄 Route exists | `/courses/:category` shows CoursesPage — needs dedicated CourseCategoryPage with sub-categories, career outcomes, featured universities |
| Services Page | 🔄 Placeholder | Currently shows ContactPage — needs dedicated ServicesPage with 6 service deep-dives |
| Blog Page | 🔄 Placeholder | Currently shows HomePage — needs BlogPage with article grid + BlogPostPage |
| AI Matcher Results | 🔄 Partial | Widget shows loading state but doesn't navigate to results — needs connection to AIMatcherResults component |
| Search functionality | 🔄 UI only | Search bar in header and pages has UI but no actual filtering logic for all fields |

---

## ❌ What Is NOT Started (Phase 2 & 3)

### Phase 2 — Inner Pages & Enhanced Features

| Feature | Priority | Estimated Effort |
|---|---|---|
| Country Detail Page | HIGH | 1 day |
| University Detail Page | HIGH | 1.5 days |
| Course Category Page | MEDIUM | 1 day |
| Services Page | MEDIUM | 1 day |
| Blog Page + Post Page | LOW | 1 day |
| AI Matcher full flow | HIGH | 0.5 days |
| Scholarship search widget | MEDIUM | 1 day |
| EMI/Loan calculator | LOW | 0.5 days |

### Phase 2 — Portal (Auth-gated)

| Feature | Priority | Estimated Effort |
|---|---|---|
| Login page (proper) | HIGH | 0.5 days |
| Student Dashboard | HIGH | 3 days |
| Application form (multi-step) | HIGH | 2 days |
| Application tracker (Kanban) | HIGH | 2 days |
| Document vault | HIGH | 1.5 days |
| Agent Dashboard | HIGH | 3 days |
| Agent lead management | HIGH | 2 days |

### Phase 3 — Backend (PHP/Laravel)

| Feature | Priority | Estimated Effort |
|---|---|---|
| Laravel project setup | HIGH | 0.5 days |
| Database migrations | HIGH | 1 day |
| Auth API (JWT) | HIGH | 1 day |
| Universities API | HIGH | 1 day |
| Applications API | HIGH | 2 days |
| Documents API (S3) | HIGH | 1.5 days |
| Email notifications | MEDIUM | 1 day |
| Admin panel | MEDIUM | 3 days |

---

## 🎨 Design Decisions & Rationale

### Why warm orange instead of blue?

Most competitors (IDP, Leverage Edu, ApplyBoard) use blue/navy. The Global Avenues differentiates with a warm orange palette that:
- Feels more approachable and human (important for Indian students)
- Conveys energy and optimism (study abroad is exciting)
- Matches the existing theglobalavenues.com brand
- Stands out in a sea of blue education portals

### Why Syne for headings?

Syne is a geometric display font that feels modern and premium without being cold. It pairs well with Plus Jakarta Sans (body) which is warm and readable. This combination is used by many premium SaaS products.

### Why Globe.GL for the 3D globe?

- Easiest Three.js-based globe implementation
- Built-in arc animations (perfect for India → destination arcs)
- Click interactions built-in
- Auto-rotate built-in
- Only ~1.8MB (acceptable for a showstopper feature)

### Why keep Figma components in `app/components/`?

The Figma AI export produced working, interactive components (AI matcher, cost calculator, comparison lab, quiz, document butler). These are genuinely good and would take days to rebuild. We kept them and fixed their color scheme to match the brand. They will be gradually migrated to the new component structure.

### Why static data instead of API calls?

Phase 1 is frontend-only. Static TypeScript data:
- Enables fast development without backend dependency
- Is type-safe (TypeScript interfaces)
- Is easy to replace with API calls later (same data shape)
- Allows the client to review and approve the UI before backend work begins

---

## 🐛 Known Issues & Technical Debt

| Issue | Severity | File | Notes |
|---|---|---|---|
| `app/components/` use blue (#0074D9) colors | LOW | Multiple files | Partially fixed in comparison-lab and cost-of-living-slider. Others still have blue accents. |
| `live-alumni-feed.tsx` uses pink/purple colors | LOW | `app/components/live-alumni-feed.tsx` | Not brand colors — needs recoloring |
| `support-hub.tsx` uses blue colors | LOW | `app/components/support-hub.tsx` | Needs recoloring to orange |
| `global-map-section.tsx` uses blue colors | LOW | `app/components/global-map-section.tsx` | Replaced by GlobeSection but still in codebase |
| `student-dashboard-preview.tsx` uses blue | LOW | `app/components/student-dashboard-preview.tsx` | Needs recoloring |
| `daily-drill-widget.tsx` uses blue | LOW | `app/components/daily-drill-widget.tsx` | Needs recoloring |
| Package name is `@figma/my-make-file` | LOW | `package.json` | Should be renamed to `@theglobalavenues/portal` |
| No error boundaries | MEDIUM | `main.tsx` | Should add React ErrorBoundary |
| No loading states on page transitions | LOW | `App.tsx` | Should add Suspense + skeleton |
| Globe.GL fails silently on some browsers | LOW | `GlobeSection.tsx` | Fallback exists but could be better |
| No 404 page design | LOW | `App.tsx` | Basic text 404, needs proper design |

---

## 🔧 How to Continue Development

### For the next AI assistant

**Read these files in order:**
1. `docs/PROGRESS.md` (this file) — understand what's done
2. `docs/ARCHITECTURE.md` — understand the system design
3. `src/data/company.ts` — understand the real company data
4. `src/data/universities.ts` — understand the partner universities
5. `src/app/App.tsx` — understand the routing
6. `src/pages/HomePage.tsx` — understand the homepage structure

**Key rules to follow:**
1. **Never use blue (#0074D9, #001F3F)** — these are old Figma colors. Use orange (#FD7E14) as primary
2. **Always use `@/` imports** — e.g., `import { COMPANY } from '@/data/company'`
3. **All new components go in `src/components/`** — not `src/app/components/`
4. **All new pages go in `src/pages/`**
5. **Use Framer Motion for all animations** — import from `motion/react`
6. **Use real data from `src/data/`** — don't hardcode data in components
7. **Run `npm run build` after every significant change** — verify 0 errors

### Priority order for next session

1. **Fix color issues** in remaining Figma components (live-alumni-feed, support-hub, daily-drill-widget, student-dashboard-preview)
2. **Build CountryDetailPage** — the most important missing inner page
3. **Build UniversityDetailPage** — second most important
4. **Build ServicesPage** — needed for the nav links to work
5. **Connect AI Matcher** — widget → results flow
6. **Build proper Login page** — currently just the register form

### Commands to run

```bash
# Start development
npm run dev

# Check for errors
npm run build

# The app runs at
http://localhost:5173
```

---

## 📚 Reference Links

### Company
- Main website: https://theglobalavenues.com
- Portfolio (partner universities): https://theglobalavenues.com/portfolio
- About page: https://theglobalavenues.com/about
- GitHub (main website): https://github.com/prashanttiw/TheGlobalAvenues

### Technologies used
- React: https://react.dev
- Vite: https://vitejs.dev
- Tailwind CSS v4: https://tailwindcss.com/docs/v4-beta
- Framer Motion: https://motion.dev
- Globe.GL: https://globe.gl
- React Router v7: https://reactrouter.com
- Radix UI: https://radix-ui.com
- shadcn/ui: https://ui.shadcn.com
- Lucide Icons: https://lucide.dev

### Design inspiration
- MSM Unify: https://www.msmunify.com (main competitor)
- LeapScholar: https://leapscholar.com
- ApplyBoard: https://applyboard.com
- IDP Education: https://idp.com
- Leverage Edu: https://leverageedu.com

---

## 📝 Session History

### Session 1 (May 10, 2026)
- Analyzed Figma AI export (ZIP file)
- Identified tech stack: React 18, Vite, Tailwind v4, shadcn/ui, Framer Motion
- Discussed project scope: CRM for students + agents + admin
- Researched competitors: MSM Unify, LeapScholar, ApplyBoard, IDP
- Created master plan document

### Session 2 (May 10, 2026)
- Discussed all pages and sections in detail
- Created GlobalAvenue-Frontend-Blueprint.md (13 pages, 100+ sections)
- Decided to build frontend first, then PHP backend

### Session 3 (May 12, 2026)
- Fetched real data from theglobalavenues.com and GitHub
- Created industry-level folder structure
- Built all data files (company.ts, universities.ts, destinations.ts, courses.ts)
- Built layout components (Header, Footer, WhatsAppButton)
- Built all homepage sections (18 sections)
- Built 8 inner pages
- Installed React Router, Globe.GL, Three.js
- Build: ✅ 0 errors

### Session 4 (May 12, 2026)
- Full architecture overhaul
- Rebuilt HeroSection with parallax + 3-slide + floating badges
- Built GlobeSection with real Globe.GL integration
- Built TestimonialsSection with real student stories
- Rebuilt HowItWorks with 3D card tilt
- Added tsconfig.json, .prettierrc
- Upgraded theme.css with full design token system + 8 animations
- Fixed duplicate style attribute bug
- Vite chunk splitting (6 vendor chunks)
- Full SEO meta tags in index.html
- Build: ✅ 0 errors, 559ms dev server start
