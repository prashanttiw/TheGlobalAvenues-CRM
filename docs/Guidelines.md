# AI Coding Guidelines — The Global Avenues CRM Portal

> These guidelines apply to ALL AI assistants (Kiro, Claude, Cursor, Copilot, etc.) working on this project.
> Read `docs/PROGRESS.md` first to understand the current state of the project.

---

## 🚨 Critical Rules (Never Break These)

1. **Never use blue colors** — `#0074D9`, `#001F3F`, `#0074D9` are OLD Figma colors. Always use orange `#FD7E14` as primary.

2. **Always use `@/` import paths** — `import { X } from '@/data/company'` not `'../../data/company'`

3. **Never hardcode data in components** — use `src/data/` files. If data doesn't exist there, add it there first.

4. **Run `npm run build` after every significant change** — verify 0 errors before presenting results.

5. **New components go in `src/components/`** — not `src/app/components/` (that's the legacy Figma folder).

6. **New pages go in `src/pages/`** — one file per route.

7. **Always use `viewport={{ once: true }}`** on scroll animations — prevents re-animation on scroll.

---

## Design Rules

### Colors

```
Primary:    #FD7E14 (Sunset Orange)
Secondary:  #D32F2F (Crimson Red)
Accent:     #FFC107 (Golden Yellow)
Background: #FFFCF5 (Warm Cream) — NEVER use #FFFFFF for full pages
Dark:       #1A1A1A (for dark sections)
Text:       #1C1C1E (primary), #6B7280 (secondary)
```

### Shadows (always warm, never grey)

```
Light:  shadow-[0_2px_8px_rgba(253,126,20,0.10)]
Medium: shadow-[0_4px_20px_rgba(253,126,20,0.14)]
Heavy:  shadow-[0_12px_40px_rgba(253,126,20,0.20)]
CTA:    shadow-[0_8px_32px_rgba(253,126,20,0.40)]
```

### Typography

```
Headings: font-family Syne, font-bold, tracking-tight
Body:     font-family Plus Jakarta Sans
```

### Spacing

```
Section padding: py-24 (standard) or py-28 (large)
Container:       max-w-7xl mx-auto px-6
Card padding:    p-6, p-7, or p-8
```

### Borders

```
Subtle:  border border-[#FD7E14]/10
Medium:  border border-[#FD7E14]/30
Strong:  border border-[#FD7E14]/60
Radius:  rounded-2xl (cards), rounded-xl (buttons), rounded-3xl (large cards)
```

---

## Component Patterns

### Section header (use this exact pattern)

```tsx
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
  <h2 className="text-4xl md:text-5xl font-bold text-[#1C1C1E] mb-4">Title</h2>
  <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">Description</p>
</motion.div>
```

### Primary CTA button

```tsx
<Link to="/apply" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-2xl font-bold shadow-[0_8px_32px_rgba(253,126,20,0.40)] hover:shadow-[0_12px_48px_rgba(253,126,20,0.60)] hover:scale-105 transition-all">
  Button Text <ArrowRight className="w-5 h-5" />
</Link>
```

### Card (light section)

```tsx
<motion.div whileHover={{ y: -6 }} className="group">
  <div className="bg-white rounded-2xl p-7 border border-[#FD7E14]/10 hover:border-[#FD7E14]/30 shadow-[0_2px_12px_rgba(253,126,20,0.06)] hover:shadow-[0_16px_40px_rgba(253,126,20,0.14)] transition-all duration-300 h-full">
    {/* content */}
  </div>
</motion.div>
```

### Card (dark section)

```tsx
<div className="bg-white/5 rounded-2xl border border-white/10 hover:border-[#FD7E14]/40 hover:shadow-[0_20px_50px_rgba(253,126,20,0.15)] transition-all duration-300">
  {/* content */}
</div>
```

---

## Animation Rules

```tsx
// Standard scroll reveal
initial={{ opacity: 0, y: 30 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
transition={{ duration: 0.6 }}

// Staggered list (delay = index * 0.08)
transition={{ duration: 0.4, delay: i * 0.08 }}

// 3D card hover
whileHover={{ y: -12, rotateX: 4, rotateY: -4 }}
transition={{ type: 'spring', stiffness: 300, damping: 20 }}
style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}

// Button hover
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

---

## File Structure Rules

```
src/
├── app/App.tsx              ← Router only — don't add logic here
├── app/components/          ← Legacy Figma components — don't add new ones here
├── components/layout/       ← Header, Footer, WhatsApp — global layout
├── components/home/         ← Homepage sections only
├── data/                    ← All static data — always use these, never hardcode
├── lib/utils.ts             ← cn() utility only
├── pages/                   ← One file per route
└── styles/                  ← CSS only — no component logic
```

---

## What NOT to Do

```
❌ Don't use blue colors (#0074D9, #001F3F)
❌ Don't use relative import paths (../../)
❌ Don't hardcode data in components
❌ Don't add new components to src/app/components/
❌ Don't use any TypeScript type
❌ Don't use console.log in production code
❌ Don't use inline styles when Tailwind class exists
❌ Don't forget viewport={{ once: true }} on scroll animations
❌ Don't use #FFFFFF as page background (use #FFFCF5)
❌ Don't use grey shadows (use warm orange shadows)
❌ Don't use rounded-md for cards (use rounded-2xl or rounded-3xl)
```

---

## Quick Reference

### Import data

```typescript
import { COMPANY, NAV_LINKS }                    from '@/data/company';
import { UNIVERSITIES, EXCLUSIVE_UNIVERSITIES }  from '@/data/universities';
import { DESTINATIONS, FEATURED_DESTINATIONS }   from '@/data/destinations';
import { COURSE_CATEGORIES }                     from '@/data/courses';
```

### Import utilities

```typescript
import { cn }                    from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams }       from 'react-router-dom';
```

### Section background alternation

```
Cream (#FFFCF5) → White (#FFFFFF) → Dark (#1A1A1A) → Cream → Orange gradient
```
