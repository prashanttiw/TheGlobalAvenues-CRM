# TGA Project Vision

## Identity

The Global Avenues is a premium international education consultancy based in India. We connect students with universities across Europe, the USA, Malta, the UAE, Austria, Estonia, France, Germany, and Cyprus. We serve students directly and through education agents and institutional partners. The product standard is premium, trustworthy, and deliberately crafted.

## Product Ecosystem

The business operates through three connected products:

1. Main website: `https://theglobalavenues.com`
2. Public portal inside the CRM codebase: `https://portal.theglobalavenues.com`
3. CRM portal for students, agents, and TGA staff: currently in development

The main website remains separate. The CRM codebase must integrate with it smoothly, especially for shared university data and deep links such as `Apply Now` and `Partner With Us`.

## Core Goal

Build a world-class CRM portal that:

- Makes students excited to apply and confident about their next step
- Makes agents efficient, informed, and loyal to the platform
- Gives the TGA internal team full operational control
- Looks premium enough to feel agency-designed rather than template-built

## Product Audiences

### Student portal

The student portal should feel aspirational, rewarding, and alive. It must use gamification, progress, and clarity to reduce anxiety and increase forward motion.

### Agent dashboard

The agent dashboard should feel fast, professional, and trustworthy. Agents must be able to manage large student volumes, track commissions clearly, and operate with confidence.

### Admin panel

The admin panel should feel authoritative and efficient. TGA must be able to manage pipeline activity, users, universities, documents, commissions, and analytics from one system.

## Design Direction

The UI must not feel generic or AI-generated. Avoid generic SaaS patterns, generic blue dashboards, and interchangeable cards. Interfaces must have hierarchy, tension, motion, and premium restraint.

The benchmark is the quality bar of:

- Linear
- Notion
- Stripe Dashboard
- Framer
- Duolingo
- Airbnb

These are quality references, not visual clones.

## Non-Negotiable Tokens

```css
--brand-primary: #2D1B69;
--brand-accent: #FFD700;
--brand-light: #EEE9FF;

--sidebar-bg: #2D1B69;
--dashboard-light: #F8F7FF;
--dashboard-dark: #0F0B1F;

--success: #1D9E75;
--warning: #EF9F27;
--danger: #E24B4A;
--info: #378ADD;

--font-display: 'Plus Jakarta Sans';
--font-ui: 'Inter';

--radius-card: 12px;
--radius-button: 8px;
--radius-input: 6px;
```

## Required Experience Features

### Student

- Course Finder Quiz with animated step flow and ranked results
- Study Journey Map with 11 visible pipeline nodes
- University cards with elevation and micro-parallax
- Badge reveal animation
- Profile completion ring
- Application tracker with glowing current step

### Agent

- Kanban pipeline board with drag-and-drop
- Animated commission counter
- Multi-step lead submission form
- Animated performance chart
- Sliding notification drawer

### Admin

- KPI cards with count-up motion
- Interactive pipeline table with inline preview
- Real-time search and filtering
- Stage transition modal with required checklists

## Business Differentiator

Gamification is a core product feature, not decoration. The student portal must use points, collectible badges, and a progress map to make the application journey feel rewarding. The agent dashboard must use tiers and leaderboard mechanics to reinforce performance and loyalty.

## Technical Context

- Frontend portal: React + Vite
- Backend API target: PHP + MySQL
- Hosting constraints: Windows shared hosting for the PHP API
- Shared data relationship: main website and CRM share university data through the same backend domain
- Authentication: separate for CRM; not shared with the marketing site

## Success Criteria

Students should feel guided and excited rather than lost. Agents should feel operationally strong and financially informed. TGA staff should feel they can run the business from one screen. The finished product should look premium enough that its quality becomes part of the company brand.
