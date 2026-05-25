# 🌍 The Global Avenues — CRM & Student Portal

> **Asia's Trusted Global Education Partner** — A full-stack CRM and student-facing portal for The Global Avenues, an ICEF-certified international education consultancy based in New Delhi, India.

[![React](https://img.shields.io/badge/React-18.3-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.4-purple?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Motion-12.x-pink)](https://motion.dev)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Live URLs](#live-urls)
3. [Quick Start](#quick-start)
4. [Tech Stack](#tech-stack)
5. [Folder Structure](#folder-structure)
6. [Environment Setup](#environment-setup)
7. [Available Scripts](#available-scripts)
8. [Pages & Routes](#pages--routes)
9. [Design System](#design-system)
10. [Key Features](#key-features)
11. [Data Sources](#data-sources)
12. [Component Guide](#component-guide)
13. [Performance](#performance)
14. [Deployment](#deployment)
15. [Contributing](#contributing)

---

## Project Overview

This repository contains the **frontend** of The Global Avenues CRM portal — a multi-page React application that serves as the public-facing website and student/agent portal for an international education consultancy.

**What this portal does:**
- Showcases 100+ exclusive and partner universities across 40+ countries
- Provides an AI-powered university matcher for students
- Displays interactive 3D globe with destination arcs from India
- Offers cost-of-living calculators, university comparison tools, and document management
- Serves as the entry point for student and agent registration/login
- Presents all company services, destinations, courses, and partner information

**Business context:**
The Global Avenues is an ICEF-certified, AIRC-member consultancy headquartered in New Delhi. They represent 14+ exclusive university partners and have 600+ active channel partners across South Asia, Middle East, and Africa (SAMEA). They have recruited 4,000+ students to date.

---

## Live URLs

| Environment | URL |
|---|---|
| Main company website | https://theglobalavenues.com |
| GitHub (main website) | https://github.com/prashanttiw/TheGlobalAvenues |
| This portal (dev) | http://localhost:5173 |
| This portal (prod target) | https://portal.theglobalavenues.com |

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18.x (LTS recommended)
- **npm** ≥ 9.x
- Windows / macOS / Linux

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd TheGlobalAvenues-CRM

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The app will be available at **http://localhost:5173**

### First-time setup notes

- No `.env` file is required for the frontend — all data is currently static, verified portfolio
- The 3D globe (Globe.GL) loads asynchronously — it may take 1–2 seconds to appear
- Fonts load from Google Fonts CDN — internet connection required for full typography

---

## Tech Stack

### Core

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.4.2 | Build tool & dev server |
| React Router DOM | 7.x | Client-side routing |

### Styling

| Technology | Version | Purpose |
|---|---|---|
| Tailwind CSS | v4.1.12 | Utility-first CSS |
| tw-animate-css | 1.3.8 | Animation utilities |
| CSS Custom Properties | — | Design token system |

### Animation & 3D

| Technology | Version | Purpose |
|---|---|---|
| Motion (Framer Motion) | 12.23.24 | Page/component animations |
| Globe.GL | 2.45.x | Interactive 3D globe |
| Three.js | 0.184.x | 3D engine (Globe.GL dependency) |

### UI Components

| Technology | Version | Purpose |
|---|---|---|
| Radix UI | Various | Accessible headless components |
| shadcn/ui | — | Pre-built component patterns |
| Lucide React | 0.487.0 | Icon library |
| MUI / Emotion | 7.x | Additional UI components |

### Data & Forms

| Technology | Version | Purpose |
|---|---|---|
| React Hook Form | 7.55.0 | Form state management |
| Recharts | 2.15.2 | Data visualization |
| Embla Carousel | 8.6.0 | Carousel/slider |
| React DnD | 16.0.1 | Drag and drop |

### Fonts

| Font | Usage |
|---|---|
| Syne | Display headings (H1, H2, H3) |
| Plus Jakarta Sans | Body text, UI elements |

---

## Folder Structure

```
TheGlobalAvenues-CRM/
│
├── public/                          # Static assets served as-is
│
├── src/
│   ├── app/
│   │   ├── App.tsx                  # Root router + layout shell
│   │   └── components/
│   │       ├── ui/                  # shadcn/ui base components (40+ files)
│   │       ├── figma/               # Figma-specific image fallback
│   │       ├── ai-matcher-widget.tsx
│   │       ├── ai-matcher-results.tsx
│   │       ├── comparison-lab.tsx
│   │       ├── cost-of-living-slider.tsx
│   │       ├── country-carousel.tsx
│   │       ├── daily-drill-widget.tsx
│   │       ├── document-butler.tsx
│   │       ├── footer.tsx           # (legacy — replaced by layout/Footer)
│   │       ├── global-map-section.tsx
│   │       ├── header.tsx           # (legacy — replaced by layout/Header)
│   │       ├── hero.tsx             # (legacy — replaced by home/HeroSection)
│   │       ├── innovation-bar.tsx
│   │       ├── live-alumni-feed.tsx
│   │       ├── student-dashboard-preview.tsx
│   │       ├── support-floating-button.tsx
│   │       └── support-hub.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx           # ★ Main nav with dropdowns + mobile menu
│   │   │   ├── Footer.tsx           # ★ 5-column rich footer
│   │   │   └── WhatsAppButton.tsx   # ★ Fixed floating contact button
│   │   │
│   │   └── home/
│   │       ├── HeroSection.tsx      # ★ Cinematic parallax hero (3 slides)
│   │       ├── GlobeSection.tsx     # ★ Interactive 3D Globe.GL
│   │       ├── PartnerTicker.tsx    # ★ Auto-scrolling partner logos
│   │       ├── HowItWorks.tsx       # ★ 3D card tilt 3-step process
│   │       ├── DestinationsSection.tsx
│   │       ├── CourseCategorySection.tsx
│   │       ├── ExclusivePartnersSection.tsx
│   │       ├── StatsSection.tsx     # ★ Animated counters
│   │       ├── TestimonialsSection.tsx # ★ Carousel with real student stories
│   │       ├── ServicesSection.tsx
│   │       └── CTABanner.tsx
│   │
│   ├── data/
│   │   ├── company.ts               # ★ Real company data from theglobalavenues.com
│   │   ├── universities.ts          # ★ All 12 real partner universities
│   │   ├── destinations.ts          # ★ 12 study destinations with globe coords
│   │   └── courses.ts               # ★ 10 course categories
│   │
│   ├── lib/
│   │   └── utils.ts                 # cn() utility (clsx + tailwind-merge)
│   │
│   ├── pages/
│   │   ├── HomePage.tsx             # / — Full homepage (18 sections)
│   │   ├── DestinationsPage.tsx     # /destinations + /destinations/:slug
│   │   ├── UniversitiesPage.tsx     # /universities + /universities/:slug
│   │   ├── CoursesPage.tsx          # /courses + /courses/:category
│   │   ├── PartnersPage.tsx         # /partners
│   │   ├── AboutPage.tsx            # /about
│   │   ├── ContactPage.tsx          # /contact
│   │   └── ApplyPage.tsx            # /apply + /portal/login + /portal/register
│   │
│   ├── styles/
│   │   ├── index.css                # Entry — imports all style files
│   │   ├── fonts.css                # Google Fonts imports
│   │   ├── tailwind.css             # Tailwind v4 source directive
│   │   └── theme.css                # ★ Full design token system + animations
│   │
│   └── main.tsx                     # React 18 StrictMode entry point
│
├── guidelines/
│   └── Guidelines.md                # AI coding guidelines (Figma Make)
│
├── .prettierrc                      # Code formatting rules
├── tsconfig.json                    # TypeScript strict config
├── vite.config.ts                   # Vite + chunk splitting config
├── postcss.config.mjs               # PostCSS config
├── index.html                       # HTML entry with full SEO meta
├── package.json
│
└── docs/                            # ★ All documentation (see below)
    ├── README.md                    # This file
    ├── ARCHITECTURE.md              # System design & decisions
    ├── PROGRESS.md                  # What's done, what's next, AI handoff
    ├── DESIGN_SYSTEM.md             # Full design token reference
    ├── DATA_REFERENCE.md            # All real data sources & structures
    ├── COMPETITOR_RESEARCH.md       # Market research & positioning
    └── DEVELOPMENT_GUIDE.md        # How to add features, conventions
```

---

## Available Scripts

```bash
npm run dev      # Start Vite dev server at http://localhost:5173
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

---

## Pages & Routes

| Route | Component | Status |
|---|---|---|
| `/` | `HomePage` | ✅ Complete — 18 sections |
| `/destinations` | `DestinationsPage` | ✅ Complete — filter by region |
| `/destinations/:slug` | `DestinationsPage` | ✅ Route exists, detail view pending |
| `/universities` | `UniversitiesPage` | ✅ Complete — search + filter |
| `/universities/:slug` | `UniversitiesPage` | ✅ Route exists, detail view pending |
| `/courses` | `CoursesPage` | ✅ Complete — category grid |
| `/courses/:category` | `CoursesPage` | ✅ Route exists, detail view pending |
| `/partners` | `PartnersPage` | ✅ Complete — exclusive + all tabs |
| `/about` | `AboutPage` | ✅ Complete |
| `/contact` | `ContactPage` | ✅ Complete — form + FAQ |
| `/apply` | `ApplyPage` | ✅ Complete — student/agent register |
| `/portal/login` | `ApplyPage` | ✅ Route exists |
| `/portal/register` | `ApplyPage` | ✅ Route exists |
| `/services` | `ContactPage` (temp) | 🔄 Placeholder — needs own page |
| `/blog` | `HomePage` (temp) | 🔄 Placeholder — needs own page |
| `/portal/student/*` | — | ❌ Not started — Phase 2 |
| `/portal/agent/*` | — | ❌ Not started — Phase 2 |
| `/portal/admin/*` | — | ❌ Not started — Phase 3 |

---

## Design System

See `DESIGN_SYSTEM.md` for the full reference. Quick summary:

### Brand Colors

```css
--sunset-orange:  #FD7E14   /* Primary brand, CTAs, icons */
--burnt-orange:   #C94D1B   /* CTA gradient end, footer */
--crimson-red:    #D32F2F   /* Secondary, urgency */
--golden-yellow:  #FFC107   /* Accent, badges, highlights */
--warm-cream:     #FFFCF5   /* Page background */
--dark-charcoal:  #1A1A1A   /* Dark sections */
--text-primary:   #1C1C1E   /* Body text */
--text-secondary: #6B7280   /* Muted text */
```

### Typography

```css
/* Display headings */
font-family: 'Syne', sans-serif;
font-weight: 700;
letter-spacing: -0.02em;

/* Body */
font-family: 'Plus Jakarta Sans', sans-serif;
```

### Key Utility Classes

```css
.glass          /* Frosted glass effect */
.glass-warm     /* Orange-tinted glass */
.card-3d        /* 3D perspective tilt on hover */
.text-gradient-orange  /* Orange→Yellow→Red gradient text */
.dot-grid       /* Dot pattern background */
.line-grid      /* Grid line pattern background */
.animate-float  /* Floating animation */
.animate-pulse-glow  /* Pulsing orange glow */
```

---

## Key Features

### 1. Interactive 3D Globe
- Built with **Globe.GL** (Three.js based)
- Shows glowing orange dots on all 12 destination countries
- Animated arc lines from India (lat: 20.59, lng: 78.96) to each destination
- Click any dot to see country info + link to destination page
- Auto-rotates; user can drag to spin
- Loads asynchronously to not block initial render

### 2. Cinematic Hero Section
- 3-slide auto-advancing background with 1.8s crossfade
- Parallax scroll effect via `useScroll` + `useTransform` (Framer Motion)
- Animated mesh gradient orbs (CSS + Motion)
- Floating notification badges with staggered entrance/exit
- Slide indicator dots with active state

### 3. Real Partner Data
- All 12 exclusive partner universities use **real logos and hero images** from `theglobalavenues.com`
- Real contact emails, intake dates, program lists
- Real company stats: 12+ years, 100+ partners, 600+ channel partners, 4K+ students

### 4. Multi-page Routing
- React Router v7 with `BrowserRouter`
- Scroll-to-top on route change
- Dropdown mega-nav with 4 categories (Destinations, Universities, Courses, Services)
- Mobile hamburger menu with animated open/close

### 5. Interactive Widgets (from Figma export)
- **AI Matcher Widget** — career selection → university matching simulation
- **Cost of Living Slider** — city + lifestyle → monthly cost breakdown
- **Comparison Lab** — side-by-side university comparison table
- **Daily Drill Widget** — study abroad knowledge quiz with streak tracking
- **Document Butler** — drag-and-drop document upload with OCR simulation
- **Student Dashboard Preview** — application progress tracker

---

## Data Sources

All real data is sourced from:
- **https://theglobalavenues.com** — company info, partner universities, logos, images
- **https://theglobalavenues.com/portfolio** — all 12 partner university details
- **https://theglobalavenues.com/about** — company stats and description

Data files location: `src/data/`

| File | Contents |
|---|---|
| `company.ts` | Name, address, phone, email, socials, stats, office locations |
| `universities.ts` | 12 real partner universities with full details |
| `destinations.ts` | 12 study destinations with globe coordinates |
| `courses.ts` | 10 course categories with sub-categories |

---

## Component Guide

### Adding a new page

1. Create `src/pages/YourPage.tsx`
2. Add route in `src/app/App.tsx`
3. Add nav link in `src/data/company.ts` → `NAV_LINKS`
4. Add dropdown item in `src/components/layout/Header.tsx` → `DROPDOWN_ITEMS`

### Adding a new home section

1. Create `src/components/home/YourSection.tsx`
2. Import and add to `src/pages/HomePage.tsx`

### Using design tokens

```tsx
// Warm shadow
className="shadow-[0_4px_20px_rgba(253,126,20,0.14)]"

// Glass effect
className="glass"

// Gradient text
className="text-gradient-orange"

// 3D card
className="card-3d"
```

---

## Performance

### Build output (production)

| Chunk | Size | Gzipped |
|---|---|---|
| `vendor-react` | 179 KB | 59 KB |
| `vendor-motion` | 101 KB | 34 KB |
| `index` (app) | 211 KB | 53 KB |
| `vendor-icons` | 27 KB | 6 KB |
| `vendor-charts` | 21 KB | 9 KB |
| `globe.gl` | 1.8 MB | 511 KB |
| **Total** | **~2.3 MB** | **~672 KB** |

> Note: Globe.GL is large (Three.js 3D engine). It loads asynchronously and does not block initial render. The app is fully functional before the globe loads.

### Optimization strategies used
- Manual chunk splitting in `vite.config.ts`
- Dynamic import for Globe.GL
- `loading="lazy"` on non-critical images
- `once: true` on all scroll-triggered animations
- `useInView` for counter animations (only runs when visible)

---

## Deployment

### Vercel (recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

**Vercel settings:**
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

### Netlify

```bash
npm run build
# Drag dist/ folder to netlify.com
```

### Manual / VPS

```bash
npm run build
# Upload dist/ to your web server
# Configure server to serve index.html for all routes (SPA routing)
```

**Nginx SPA config:**
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## Contributing

### Code style
- TypeScript strict mode — no `any` types
- Prettier formatting (`.prettierrc` at root)
- Component files: PascalCase (`HeroSection.tsx`)
- Data files: camelCase (`company.ts`)
- All imports use `@/` alias for `src/`

### Commit convention
```
feat: add university detail page
fix: correct globe arc coordinates
style: update hero gradient colors
docs: update README with new routes
refactor: extract StatsSection from HomePage
```

---

## License

Private — The Global Avenues. All rights reserved.

---

## Contact

**The Global Avenues**
- Email: connect@theglobalavenues.com
- Phone: +91 11 4680 1133
- Address: A 6, Block A, South Extension II, New Delhi, Delhi 110049, India
- Website: https://theglobalavenues.com