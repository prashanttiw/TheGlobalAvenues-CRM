# 🎨 Design System — The Global Avenues CRM Portal

> Complete reference for all design tokens, components, patterns, and conventions.

---

## Brand Identity

### Company
- **Name:** The Global Avenues
- **Tagline:** Asia's Trusted Global Education Partner
- **Personality:** Warm, professional, trustworthy, energetic, aspirational
- **Target audience:** Students aged 18–28 from India/South Asia, their parents, education agents

### Design philosophy
> "Warm, Energetic, Yet Professional"

The design balances:
- **Energy** (Orange/Red) — urgency, action, excitement about studying abroad
- **Optimism** (Golden Yellow) — hope, success, achievement
- **Professionalism** (Cream/White backgrounds, dark text) — trust, credibility
- **Premium** (Sophisticated shadows, smooth animations, 3D effects) — quality service

---

## Color System

### Primary Palette

| Token | Hex | Usage |
|---|---|---|
| `--sunset-orange` | `#FD7E14` | Primary brand color. CTAs, icons, section badges, hover states, borders |
| `--burnt-orange` | `#C94D1B` | CTA gradient end, footer background gradient |
| `--crimson-red` | `#D32F2F` | Secondary actions, urgency, error states |
| `--golden-yellow` | `#FFC107` | Accent, badges, highlights, star ratings, scholarship tags |
| `--warm-cream` | `#FFFCF5` | Page background (never pure white) |
| `--dark-charcoal` | `#1A1A1A` | Dark sections (exclusive partners, globe section) |
| `--text-primary` | `#1C1C1E` | All body text, headings |
| `--text-secondary` | `#6B7280` | Muted text, descriptions, captions |

### Extended Palette

| Hex | Usage |
|---|---|
| `#FFFFFF` | Card backgrounds, input backgrounds |
| `#FFFCF5` | Page background, section alternation |
| `#0A0A0A` | Globe section background |
| `#4CAF50` | Success states, visa approved, verified |
| `#EF4444` | Error states, rejected |
| `#2196F3` | Info states only (not brand) |
| `#25D366` | WhatsApp button (brand color) |

### Color usage rules

```
✅ DO:
- Use #FFFCF5 as page background (never #FFFFFF for full pages)
- Use orange (#FD7E14) as the primary interactive color
- Use warm shadows (rgba(253,126,20,0.xx)) not neutral shadows
- Alternate sections: cream → white → dark → cream

❌ DON'T:
- Use blue (#0074D9, #001F3F, #0074D9) — these are old Figma colors
- Use pure black (#000000) for text — use #1C1C1E
- Use pure white (#FFFFFF) for page backgrounds
- Use cool/grey shadows
```

### Section background pattern

```
Section 1 (Hero):          Dark overlay on image
Section 2 (Ticker):        #FFC107 gradient (golden)
Section 3 (Partner logos): #FFFFFF
Section 4 (How it works):  #FFFCF5 (warm cream)
Section 5 (Destinations):  #FFFFFF
Section 6 (Globe):         #0A0A0A (dark)
Section 7 (Courses):       #FFFCF5
Section 8 (AI Matcher):    #FFFCF5
Section 9 (Partners):      #1A1A1A (dark)
Section 10 (Stats):        Orange gradient
Section 11 (Testimonials): #FFFCF5
Section 12 (Cost calc):    #FFFCF5
Section 13 (Comparison):   #F8FAFC
Section 14 (Quiz):         Dark blue gradient (legacy)
Section 15 (Documents):    #FFFFFF
Section 16 (Dashboard):    Dark blue gradient (legacy)
Section 17 (Services):     #FFFFFF
Section 18 (CTA):          Orange gradient
```

---

## Typography

### Font families

```css
/* Display — headings H1, H2, H3 */
font-family: 'Syne', 'Plus Jakarta Sans', sans-serif;
font-weight: 700;
letter-spacing: -0.02em;
line-height: 1.15;

/* Body — all other text */
font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
font-weight: 400;
line-height: 1.7;
```

### Type scale

| Element | Size | Weight | Notes |
|---|---|---|---|
| H1 (hero) | 72–96px / 5–7rem | 700 | Syne, tight tracking |
| H1 (page) | 48–60px / 3–4rem | 700 | Syne |
| H2 (section) | 36–48px / 2.5–3rem | 700 | Syne |
| H3 (card) | 20–24px / 1.25–1.5rem | 600 | Plus Jakarta Sans |
| Body large | 18–20px / 1.125–1.25rem | 400 | Plus Jakarta Sans |
| Body | 16px / 1rem | 400 | Plus Jakarta Sans |
| Body small | 14px / 0.875rem | 400 | Plus Jakarta Sans |
| Caption | 12px / 0.75rem | 500 | Plus Jakarta Sans |
| Label | 11px / 0.6875rem | 700 | Plus Jakarta Sans, uppercase, tracked |

### Gradient text

```css
/* Orange gradient text (for hero highlights) */
.text-gradient-orange {
  background: linear-gradient(135deg, #FD7E14, #FFC107, #D32F2F);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Warm gradient text */
.text-gradient-warm {
  background: linear-gradient(135deg, #FFC107, #FD7E14);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## Shadow System

All shadows use warm orange tones, not neutral grey.

```css
/* Token definitions */
--shadow-warm-sm:  0 2px 8px  rgba(253,126,20,0.10);
--shadow-warm-md:  0 4px 20px rgba(253,126,20,0.14);
--shadow-warm-lg:  0 12px 40px rgba(253,126,20,0.20);
--shadow-warm-xl:  0 24px 60px rgba(253,126,20,0.25);

/* Tailwind inline usage */
shadow-[0_2px_8px_rgba(253,126,20,0.10)]   /* sm */
shadow-[0_4px_20px_rgba(253,126,20,0.14)]  /* md */
shadow-[0_12px_40px_rgba(253,126,20,0.20)] /* lg */
shadow-[0_24px_60px_rgba(253,126,20,0.25)] /* xl */

/* Hover state (deeper) */
hover:shadow-[0_20px_50px_rgba(253,126,20,0.25)]

/* CTA button glow */
shadow-[0_8px_32px_rgba(253,126,20,0.40)]
hover:shadow-[0_12px_48px_rgba(253,126,20,0.60)]

/* Dark section card */
shadow-[0_20px_50px_rgba(253,126,20,0.15)]

/* Golden badge glow */
shadow-[0_0_20px_rgba(255,193,7,0.40)]
```

---

## Border System

```css
/* Subtle (default card border) */
border border-[#FD7E14]/10

/* Medium (hover state) */
border border-[#FD7E14]/30

/* Strong (active/selected) */
border border-[#FD7E14]/60

/* Golden accent (badges, highlights) */
border border-[#FFC107]/30

/* Dark section borders */
border border-white/10
border border-white/20

/* Radius scale */
rounded-lg    /* 0.75rem — inputs, small elements */
rounded-xl    /* 0.875rem — buttons, tags */
rounded-2xl   /* 1rem — cards */
rounded-3xl   /* 1.5rem — large cards, modals */
```

---

## Gradient System

```css
/* Primary CTA gradient */
bg-gradient-to-r from-[#FD7E14] to-[#C94D1B]

/* Secondary CTA (crimson) */
bg-gradient-to-r from-[#D32F2F] to-[#FF5722]

/* Stats section background */
bg-gradient-to-br from-[#FD7E14] via-[#E8650A] to-[#D32F2F]

/* Dark premium section */
bg-[#1A1A1A]  /* or bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] */

/* Hero dark overlay */
bg-gradient-to-br from-[#0D0500]/85 via-[#1A0800]/70 to-[#FD7E14]/15

/* Destination country card overlays */
from-[#D32F2F] to-[#FF5722]   /* UK */
from-[#FD7E14] to-[#FF8C42]   /* USA */
from-[#FF5722] to-[#FF7043]   /* Canada */
from-[#C94D1B] to-[#D84315]   /* Australia */
```

---

## Spacing System

Uses Tailwind's default spacing scale. Key values:

```
Section padding:    py-24 (6rem top/bottom)
Section padding lg: py-28 (7rem)
Container:          max-w-7xl mx-auto px-6
Card padding:       p-6 or p-7 or p-8
Gap between cards:  gap-5 or gap-6
```

---

## Component Patterns

### Section header pattern

```tsx
<motion.div
  className="text-center mb-14"
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6 }}
>
  {/* Badge */}
  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/10 border border-[#FD7E14]/20 mb-4">
    <Icon className="w-4 h-4 text-[#FD7E14]" />
    <span className="text-sm text-[#FD7E14] font-semibold">Badge Text</span>
  </div>
  
  {/* Heading */}
  <h2 className="text-4xl md:text-5xl font-bold text-[#1C1C1E] mb-4">
    Section Title
  </h2>
  
  {/* Subtext */}
  <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
    Section description
  </p>
</motion.div>
```

### Card pattern (light section)

```tsx
<motion.div
  whileHover={{ y: -6 }}
  className="group"
>
  <div className="bg-white rounded-2xl p-7 border border-[#FD7E14]/10 
    hover:border-[#FD7E14]/30 
    shadow-[0_2px_12px_rgba(253,126,20,0.06)] 
    hover:shadow-[0_16px_40px_rgba(253,126,20,0.14)] 
    transition-all duration-300 h-full">
    {/* content */}
  </div>
</motion.div>
```

### Card pattern (dark section)

```tsx
<div className="bg-white/5 rounded-2xl border border-white/10 
  hover:border-[#FD7E14]/40 
  hover:shadow-[0_20px_50px_rgba(253,126,20,0.15)] 
  transition-all duration-300">
  {/* content */}
</div>
```

### Primary CTA button

```tsx
<Link
  to="/apply"
  className="inline-flex items-center gap-2 px-8 py-4 
    bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] 
    text-white rounded-2xl font-bold 
    shadow-[0_8px_32px_rgba(253,126,20,0.40)] 
    hover:shadow-[0_12px_48px_rgba(253,126,20,0.60)] 
    hover:scale-105 transition-all"
>
  Button Text <ArrowRight className="w-5 h-5" />
</Link>
```

### Secondary CTA button

```tsx
<Link
  to="/universities"
  className="inline-flex items-center gap-2 px-8 py-4 
    rounded-2xl border-2 border-[#FD7E14] 
    text-[#FD7E14] font-bold 
    hover:bg-[#FD7E14] hover:text-white 
    transition-all"
>
  Button Text <ArrowRight className="w-5 h-5" />
</Link>
```

### Exclusive partner badge

```tsx
<div className="flex items-center gap-1 px-2.5 py-1 bg-[#FD7E14] rounded-lg">
  <Lock className="w-3 h-3 text-white" />
  <span className="text-xs font-bold text-white">Exclusive</span>
</div>
```

### Glass effect (on dark backgrounds)

```tsx
<div className="glass rounded-2xl p-4">
  {/* content */}
</div>

/* CSS: */
.glass {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.15);
}
```

---

## Animation System

### Standard scroll reveal

```tsx
// Single element
<motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6 }}
>

// Staggered list
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay: i * 0.08 }}
  >
))}
```

### 3D card hover

```tsx
<motion.div
  whileHover={{ y: -12, rotateX: 4, rotateY: -4 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
  style={{
    transformStyle: 'preserve-3d',
    perspective: '1000px',
  }}
>
```

### Parallax scroll

```tsx
const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

<motion.div style={{ y }}>
  {/* parallax content */}
</motion.div>
```

### Page entrance (hero)

```tsx
<motion.div
  initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
  transition={{ duration: 0.7 }}
>
```

### CSS animation classes

```css
.animate-float       { animation: float 3s ease-in-out infinite; }
.animate-float-slow  { animation: float-slow 6s ease-in-out infinite; }
.animate-pulse-glow  { animation: pulse-glow 2s ease-in-out infinite; }
.animate-spin-slow   { animation: spin-slow 20s linear infinite; }
.animate-gradient    { animation: gradient-shift 4s ease infinite; }
```

---

## Icon System

**Library:** Lucide React (v0.487.0)

### Icon sizes

```
w-3 h-3   — Tiny (inline text icons)
w-4 h-4   — Small (badges, labels)
w-5 h-5   — Default (nav, buttons)
w-6 h-6   — Medium (card icons)
w-7 h-7   — Large (feature icons)
w-8 h-8   — XL (section icons)
w-10 h-10 — 2XL (hero icons)
```

### Common icons used

```
Globe2, Globe        — Navigation, globe section
GraduationCap        — Universities, education
MapPin               — Destinations, locations
Lock                 — Exclusive partners
Star                 — Ratings, testimonials
ArrowRight           — CTAs, links
Search               — Search bars
Menu, X              — Mobile nav
ChevronDown          — Dropdowns, accordions
CheckCircle2         — Success states
Users                — Student counts
Sparkles             — AI features
Brain                — AI matcher
FileText             — Documents
Stamp                — Visa
Award                — Scholarships
Home                 — Accommodation
CreditCard           — Loans
Phone, Mail, MapPin  — Contact info
Facebook, Instagram, Youtube, Linkedin — Social
MessageCircle        — WhatsApp/chat
```

---

## Responsive Breakpoints

Tailwind defaults:
```
sm:  640px   — Mobile landscape
md:  768px   — Tablet
lg:  1024px  — Desktop
xl:  1280px  — Large desktop
2xl: 1536px  — Wide screen
```

### Grid patterns used

```
/* 4-column destinations */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

/* 3-column services */
grid-cols-1 md:grid-cols-2 lg:grid-cols-3

/* 5-column courses */
grid-cols-2 md:grid-cols-3 lg:grid-cols-5

/* 2-column split */
grid-cols-1 lg:grid-cols-2

/* Stats 4-column */
grid-cols-2 md:grid-cols-4
```

---

## Background Patterns

```css
/* Dot grid */
.dot-grid {
  background-image: radial-gradient(circle, rgba(253,126,20,0.15) 1px, transparent 1px);
  background-size: 28px 28px;
}

/* Line grid */
.line-grid {
  background-image:
    linear-gradient(rgba(253,126,20,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(253,126,20,0.06) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* Noise texture */
.noise::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,...");
  opacity: 0.03;
  pointer-events: none;
}
```

---

## Accessibility

- All interactive elements have focus states (via `outline-ring/50` in base styles)
- Color contrast: orange (#FD7E14) on white meets WCAG AA for large text
- All images have `alt` attributes
- Buttons have `aria-label` where icon-only
- Form inputs have associated labels
- Keyboard navigation supported via Radix UI primitives
- `prefers-reduced-motion` respected by Framer Motion automatically

---

## Do's and Don'ts

### ✅ DO

- Use `#FFFCF5` as page background
- Use warm orange shadows on all cards
- Use `motion.div` with `whileInView` for scroll animations
- Use `viewport={{ once: true }}` to prevent re-animation
- Use `@/` path alias for all imports
- Use real data from `src/data/` files
- Use `rounded-2xl` or `rounded-3xl` for cards (never `rounded-md`)
- Use `font-bold` for headings (700 weight)
- Use `transition-all duration-300` for hover effects

### ❌ DON'T

- Use blue colors (#0074D9, #001F3F) — these are old Figma colors
- Use `#FFFFFF` as page background
- Use neutral/grey shadows
- Hardcode data in components — use `src/data/` files
- Use `rounded-md` for cards
- Use `font-medium` for headings
- Use `transition` without `duration`
- Import from `app/components/ui/utils` — use `@/lib/utils` instead
