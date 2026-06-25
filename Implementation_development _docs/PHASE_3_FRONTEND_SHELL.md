# PHASE 3 — Frontend Portal Shells & Design System
## Student Dashboard · Agent Dashboard · Admin Dashboard · Component Library · Permission-Driven UI

---

## BUILDER DIRECTIVE

**ABSOLUTE RULE — DO NOT TOUCH THE MARKETING WEBSITE:**
```
src/pages/HomePage.tsx, DestinationsPage.tsx, CountryDetailPage.tsx,
CoursesPage.tsx, CourseCategoryPage.tsx, PartnersPage.tsx, AboutPage.tsx,
ContactPage.tsx, ServicesPage.tsx
src/components/home/*, src/components/layout/*, src/data/*
```
These files are off-limits in every phase. Dashboard work is completely separate.

**Before writing any code — research:**
- Tailwind CSS v4 is installed (using `@tailwindcss/vite` plugin). Theme configuration must be done via CSS `@theme` in `index.css`, not `tailwind.config.js`.
- shadcn/ui primitives are installed via `@radix-ui/*`. Use these for all overlays to ensure focus trapping.
- TanStack Query v5 — `useQuery` requires an object `{ queryKey, queryFn }`. Callbacks like `onSuccess`/`onError` are removed from `useQuery`.
- motion (Framer Motion v12) — Package is named `motion`. Import from `motion/react`.
- cmdk (command palette) — v1.1.1 installed. Ensure screen reader announcements for search results.
- React Router v7 is installed. Use modern routing patterns.
- Plus Jakarta Sans and Inter — confirm Google Fonts embed approach for Vite.
- Lucide React — v0.487.0 installed.
- Recharts — v2.15.2 installed.
- Accessibility — Brand Orange `#FD7E14` with white text fails WCAG AA contrast. Use a darker shade for accessible text/buttons. Add Skip to Main Content link.
- React 18 Suspense boundaries with TanStack Query — require React Error Boundaries to catch failures.

**Document everything you find in BUILDER RESEARCH NOTES.**

**Must not change without human review:**
- Brand token values (colors, fonts, shadows)
- Marketing website files
- Three-portal structure (student/agent/admin remain separate)

---

## BUILDER RESEARCH NOTES
| Topic | Finding | Action |
|---|---|---|
| Tailwind CSS | v4.1.12 is installed, not v3. | Use CSS `@theme` in `index.css` instead of `tailwind.config.js` for brand tokens. |
| Framer Motion | Package is `motion` (v12). | Import from `motion/react` instead of `framer-motion`. |
| TanStack Query | v5 is installed. | Use object syntax `{ queryKey, queryFn }` for `useQuery`. Use Error Boundaries for failures. |
| React Router | v7 is installed. | Use modern React Router v7 APIs. |
| Accessibility | Brand Orange #FD7E14 fails WCAG AA contrast. | Use a darker shade (e.g. #D96200) for button backgrounds and text to meet 4.5:1 ratio. |
| Mobile UX | 64px icon sidebar wastes space on mobile. | Completely hide sidebar on `< 1024px` and use a hamburger menu drawer. |
| Missing States | No Error Boundary, 403, or 404 pages defined. | Add ErrorBoundary, ForbiddenPage, and NotFoundPage to shared components. |

---

## CONTEXT — PHASES 1 & 2 COMPLETE

By now: full DB schema, JWT auth, all registration flows, admin user management.
Frontend has: Zustand auth store, Axios API client, TanStack Query, Zod, route guards,
empty portal shells, brand tokens in Tailwind config.

Phase 3 does NOT add any new API endpoints.
It builds the full visual structure of all three portals so every feature phase
(4, 5, 6, 7, 8) has a home to plug into.

---

## WHAT PHASE 3 BUILDS

Every dashboard page in skeleton form — correct layout, sidebar, navigation,
component library, permission-driven UI, and loading/empty states.
No real data yet (Phase 4+ connects data). This phase is about structure and design.

By end of phase: any page in the system is reachable, looks correct, follows the
design system, and shows proper loading/empty states.

---

## 3A. DESIGN SYSTEM — ENFORCE EVERYWHERE

### Brand tokens (Configure via Tailwind v4 `@theme` in `index.css`):

```css
/* index.css */
@theme {
  --color-brand-navy: #1E2A4A;
  --color-brand-orange: #FD7E14;
  --color-brand-orange-accessible: #D96200; /* WCAG AA Compliant */
  --color-brand-amber: #F59E0B;
  --color-surface-warm: #FAFAF8;
  --color-surface-card: #FFFFFF;
  --color-border-warm: #E8E4DE;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-card-hover: 0 4px 12px rgba(0,0,0,0.10);
  --radius-card: 12px;
  --radius-button: 8px;
}
```

Use these classes:
```
bg-brand-navy        Sidebar background, dark headings
bg-brand-orange      Highlights, decorative elements
bg-brand-orange-accessible  Primary buttons, active sidebar item (for contrast)
bg-brand-amber       #F59E0B   Warning states, secondary highlights
bg-surface-warm      #FAFAF8   Page backgrounds (warm, not cold white)
bg-surface-card      #FFFFFF   Card backgrounds
border-border-warm   #E8E4DE   Card borders, dividers
text-[#1E2A4A]                 Primary text
text-[#6B7280]                 Secondary text
text-[#9CA3AF]                 Muted/placeholder text
shadow-card                    0 1px 3px rgba(0,0,0,0.08)
shadow-card-hover               0 4px 12px rgba(0,0,0,0.10)
rounded-card         12px      Cards, panels
rounded-button       8px       Buttons
```

### Typography:
```css
/* All headings and display text */
font-family: 'Plus Jakarta Sans', sans-serif;  /* font-display class */

/* All body, UI, labels, inputs */
font-family: 'Inter', sans-serif;              /* font-body class */
```

Add to index.html `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
```

### What to actively avoid:
- Any `blue-*`, `indigo-*`, `purple-*` Tailwind color class
- `shadow-md`, `shadow-lg` — use `shadow-card` and `shadow-card-hover` instead
- `rounded-lg` on cards — use `rounded-card` (12px)
- Default browser select or input styling
- Lorem ipsum placeholder text anywhere
- Generic headings like "Welcome to your Dashboard"

### Human design test:
Before calling any page done: show a screenshot to someone unfamiliar with TGA.
Does it look like a generic admin template? If yes, change something specific until it doesn't.

---

## 3B. SHARED LAYOUT COMPONENTS

Build these once, used across all three portals.

### DashboardLayout.tsx
```tsx
// src/shared/components/layout/DashboardLayout.tsx
// Props: sidebar (ReactNode), children (ReactNode)
// Structure:
// <div className="flex h-screen bg-surface-warm">
//   <SkipToContentLink />                  accessibility requirement
//   <Sidebar ... />                        fixed left, 260px wide
//   <div className="flex-1 flex flex-col overflow-hidden">
//     <TopBar ... />                       fixed top, 64px tall
//     <main id="main-content" className="flex-1 overflow-y-auto p-6">
//       <ErrorBoundary>
//         <Suspense fallback={<PageSkeleton />}>
//           {children}
//         </Suspense>
//       </ErrorBoundary>
//     </main>
//   </div>
// </div>

// Sidebar collapses to a hidden drawer on screens < 1024px (Mobile UX improvement)
// Toggle button on TopBar controls drawer state (Zustand uiStore)
```

### Sidebar.tsx
```tsx
// src/shared/components/layout/Sidebar.tsx
// Props: items (NavItem[]), logo, user info at bottom
// Design:
// - bg-brand-navy (#1E2A4A)
// - Active item: bg-brand-orange/20 text-brand-orange, left border brand-orange 3px
// - Inactive item: text-white/70 hover:bg-white/5
// - Section groupings with small uppercase labels (text-white/40 text-xs)
// - Bottom: user avatar, name, role badge, logout button
// - Collapsed: show only icons, tooltips on hover
```

### TopBar.tsx
```tsx
// src/shared/components/layout/TopBar.tsx
// Left: sidebar toggle button + page title (from route)
// Right: global search trigger (Ctrl+K), notification bell + count, user menu
// Notification bell: shows unread count badge (orange), opens NotificationCenter
// User menu dropdown: Profile, Change Password, Logout
// Height: 64px, white background, border-b border-border-warm
```

### PageHeader.tsx
```tsx
// Props: title, subtitle (optional), actions (ReactNode — buttons)
// Example: <PageHeader title="All Students" subtitle="456 total" actions={<Button>Add Student</Button>} />
// Never use generic titles like "Dashboard" or "Home"
```

---

## 3C. SHARED UI COMPONENTS

Build all of these in `src/shared/components/ui/`.
Use shadcn/ui as the base where available — style to match brand tokens.

### Button
```tsx
// Variants: primary (orange bg, white text), secondary (white bg, navy border),
//           ghost (transparent, navy text), danger (red)
// Sizes: sm, md (default), lg
// States: loading (spinner replaces content), disabled
// Border-radius: rounded-button (8px)
// Never pill-shaped for primary actions
```

### Card
```tsx
// className="bg-surface-card rounded-card shadow-card border border-border-warm p-6"
// Optional: CardHeader, CardBody, CardFooter slots
// Hover variant: hover:shadow-card-hover transition-shadow
```

### Badge / StatusBadge
```tsx
// Pill-shaped — ONLY for status labels
// Variants mapped to status values:
const statusConfig = {
  registered:    { bg: 'bg-gray-100',   text: 'text-gray-700',  label: 'Registered' },
  pending:       { bg: 'bg-amber-100',  text: 'text-amber-700', label: 'Pending' },
  approved:      { bg: 'bg-green-100',  text: 'text-green-700', label: 'Approved' },
  rejected:      { bg: 'bg-red-100',    text: 'text-red-700',   label: 'Rejected' },
  suspended:     { bg: 'bg-red-100',    text: 'text-red-700',   label: 'Suspended' },
  enrolled:      { bg: 'bg-blue-100',   text: 'text-blue-700',  label: 'Enrolled' },
  draft:         { bg: 'bg-gray-100',   text: 'text-gray-700',  label: 'Draft' },
  submitted:     { bg: 'bg-amber-100',  text: 'text-amber-700', label: 'Submitted' },
  under_review:  { bg: 'bg-purple-100', text: 'text-purple-700',label: 'Under Review' },
  offer_received:{ bg: 'bg-green-100',  text: 'text-green-700', label: 'Offer Received' },
  paid:          { bg: 'bg-green-100',  text: 'text-green-700', label: 'Paid' },
  confirmed:     { bg: 'bg-green-100',  text: 'text-green-700', label: 'Confirmed' },
};
```

### DataTable
```tsx
// Props: columns (ColumnDef[]), data, isLoading, onRowClick,
//        searchable (bool), filterable (bool), sortable (bool)
// Features:
// - Sticky header
// - Alternating row tints: odd bg-surface-warm, even bg-white
// - Row hover: bg-brand-orange/5
// - Sort indicator on column headers
// - Skeleton rows (5 rows) when isLoading
// - EmptyState component when data.length === 0
// - Inline actions column (see InlineActions component)
```

### InlineActions
```tsx
// Renders inside DataTable rows
// Dropdown menu with actions: view, edit, approve, reject, etc.
// Actions hidden based on usePermission() — not just disabled, actually hidden
// Example:
// <InlineActions
//   actions={[
//     { label: 'View', icon: Eye, onClick: () => openPreview(row) },
//     { label: 'Approve', icon: Check, onClick: () => approve(row),
//       hidden: !canApprove },                    ← permission-driven
//     { label: 'Delete', icon: Trash, onClick: () => confirmDelete(row),
//       variant: 'danger', hidden: !canDelete },
//   ]}
// />
```

### PreviewDrawer
```tsx
// Slides in from right, 480px wide
// Trigger: clicking a table row
// Shows summary of entity without navigating away
// Header: entity name + status badge + close button
// Body: key info sections
// Footer: "Open Full Page" button → navigates to detail page
// Used for: Student rows, Application rows, Agent rows, Lead rows
// Implemented with @radix-ui/react-dialog for focus trapping + motion/react
```

### SlideOverPanel
```tsx
// For complex forms (create/edit)
// 560px wide, slides from right
// Header: title + close button
// Body: scrollable form
// Footer: sticky Cancel + Save buttons
// Backdrop overlay with click-to-close
// Use @radix-ui/react-dialog for accessibility and focus management
```

### Modal
```tsx
// For confirmations ONLY (delete, approve, reject, suspend)
// Small, centered, max-w-md
// Title + description + Cancel + Confirm buttons
// Confirm button: danger variant for destructive actions
// Use @radix-ui/react-alert-dialog or @radix-ui/react-dialog
```

### EmptyState
```tsx
// Props: icon (LucideIcon), heading, description, action (optional button)
// Example:
// <EmptyState
//   icon={GraduationCap}
//   heading="No students yet"
//   description="Students will appear here once they register."
//   action={<Button onClick={inviteStudent}>Invite Student</Button>}
// />
// Never show a raw "No data found" or empty table with no context
```

### SkeletonLoader
```tsx
// Variants: card, table-row, text, avatar
// Match actual content shape — not a generic spinner
// <SkeletonCard />    → matches Card component dimensions
// <SkeletonTableRow count={5} columns={6} />
// <SkeletonText lines={3} />
```

### Toast
```tsx
// Position: top-right
// Variants: success (green), error (red), info (blue), warning (amber)
// Auto-dismiss: 4 seconds
// Manual dismiss: × button
// Uses sonner (installed in package.json)
```

### SearchInput
```tsx
// Debounced (300ms)
// Clear button when value present
// Loading spinner while debouncing
// Props: value, onChange, placeholder, isLoading
```

### FileUpload
```tsx
// Drag and drop zone + click to browse
// Shows after selection: filename, size, type icon
// Progress bar during upload (Phase 6 wires actual upload)
// Error state: file too large, wrong type
// Accepted types shown in UI
```

### StatusTimeline
```tsx
// Vertical timeline for application status history
// Each entry: status label + date + actor name
// Current status: highlighted with brand-orange accent
// Future steps: greyed out with dashed connector
```

### NotificationCenter
```tsx
// Slides in from right (360px)
// Triggered by TopBar bell icon
// Tabs: All | Documents | Applications | Payments | Approvals | System
// Each notification: icon (by category) + title + time ago + unread dot
// Mark all as read button
// "No notifications" empty state per tab
// Infinite scroll or "Load more" button
```

### Avatar
```tsx
// Props: name (string), size (sm/md/lg), image (optional URL)
// Without image: show initials, color derived from name hash
// Consistent color per name (same person always gets same color)
// Colors: 8 brand-complementary options
```

### StatCard
```tsx
// For dashboard overview metrics
// Props: label, value, change (optional), changePct (optional),
//        icon, color (orange/green/amber/navy)
// Shows: big number + label + optional period-over-period change with arrow
// Skeleton variant when loading
// Example: Students: 456 (+12 this week ↑)
```

### Error Pages (Missing States)
```tsx
// src/shared/components/ui/ForbiddenPage.tsx
// 403 page shown when usePermission() fails for a whole route

// src/shared/components/ui/NotFoundPage.tsx
// 404 page for unmatched routes inside the dashboard

// src/shared/components/ui/ErrorBoundaryFallback.tsx
// Shows an error message with a "Retry" button when a component tree crashes
```

---

## 3D. COMMAND PALETTE (Ctrl+K)

Available in Agent and Admin portals (not Student — limited scope).

```tsx
// src/shared/components/CommandPalette.tsx
// Uses cmdk library
// Trigger: Ctrl+K (Windows/Linux) or Cmd+K (Mac)
// Also: search icon in TopBar

// Search results grouped by type:
// Students: search by name, email, reference number
// Applications: search by reference number, university name
// Agents: search by name, agency, referral code (admin only)
// Universities: search by name, country
// Actions: "Create Student", "Add University", etc.

// Implementation:
// - On open: fetch recent items (last 5 visited)
// - On type (3+ chars): call GET /api/v1/search?q={query}
// - Results grouped with type labels and icons
// - Click result: navigate to detail page or open PreviewDrawer

// Keyboard navigation: arrow keys + Enter
// Escape to close
```

---

## 3E. STUDENT PORTAL — ALL PAGES

### StudentLayout.tsx
```tsx
// Sidebar items:
const studentNav = [
  { label: 'Overview',       icon: LayoutDashboard, path: '/student/' },
  { label: 'Applications',   icon: FileText,        path: '/student/applications' },
  { label: 'Documents',      icon: FolderOpen,      path: '/student/documents' },
  { label: 'My Agent',       icon: UserCheck,       path: '/student/agent' },
  { label: 'Notices',        icon: Bell,            path: '/student/notices' },
  { label: 'Profile',        icon: User,            path: '/student/profile' },
];
```

### StudentOverviewPage
Skeleton only (data wired in Phase 4):
- Status pipeline strip: show current stage with orange active indicator
- "Pending Actions" card: document requests, payment items (placeholder)
- "Recent Activity" feed: last 5 activity log entries (placeholder)
- Stats: total applications, offers received (placeholder zeros with skeleton)

### StudentApplicationsPage
- DataTable: University | Course | Intake | Status | Applied Date | Action
- Empty state: "No applications yet. Browse universities to apply."
- Each row click: opens ApplicationPreviewDrawer

### ApplicationDetailPage (student view)
- University + course header
- Status timeline (StatusTimeline component)
- Unified timeline thread (documents, payments, notes)
- Placeholder for Phase 4 data

### StudentDocumentsPage
- List of document_requests: Doc Name | Requested | Deadline | Status | Action
- Pending requests: show FileUpload component
- Status badges per request
- Empty state: "No documents requested yet."

### StudentAgentPage
- Agent card: name, agency, country, referral code, contact email
- "Request Agent Change" button (visible only when agent_lock_status = 'open')
- No agent attached: "No agent assigned. Contact TGA support."

### StudentNoticesPage
- List of published notices visible to students
- Filter: All | Notices | Events
- Notice card: title, date, type badge, content preview
- Event cards: include event date and location

### StudentProfilePage
- Personal info (name, DOB, nationality, passport)
- Account settings (email, phone, change password link)
- All fields editable inline with save button

---

## 3F. AGENT PORTAL — ALL PAGES

### AgentLayout.tsx
```tsx
const agentNav = [
  { label: 'Overview',     icon: LayoutDashboard, path: '/agent/' },
  { label: 'My Students',  icon: Users,           path: '/agent/students' },
  { label: 'My Team',      icon: Network,         path: '/agent/team' },
  { label: 'Applications', icon: FileText,        path: '/agent/applications' },
  { label: 'Commissions',  icon: DollarSign,      path: '/agent/commissions' },
  { label: 'Notices',      icon: Bell,            path: '/agent/notices' },
  { label: 'Profile',      icon: User,            path: '/agent/profile' },
];
// Show tier badge under agent name: "Level 1 Agent" | "Sub-Agent" | "Sub-Sub-Agent"
// Show referral code in sidebar footer: "Code: TGA-RKX492"
```

### AgentOverviewPage
- StatCards row: Total Students | In Progress | Enrolled | Own Commissions Earned
- Sub-agents summary table (if has any): Name | Students | Enrolled
- Recent activity feed (placeholder)
- Pending actions: reassignment requests, new sub-agent invites pending

### AgentStudentsPage
- DataTable: Name | Nationality | Status | Applied | Agent Since | Actions
- Inline actions: View, Request Document, Change Status
- Preview drawer on row click: student summary (name, contact, status, applications)
- Search + filter by status
- Empty state: "No students yet. Share your referral code: TGA-XXXNNN"

### AgentTeamPage
- List of direct sub-agents (not all descendants — just direct)
- Each sub-agent card: name, agency, tier badge, student count, status
- "Invite Sub-Agent" button → SlideOverPanel with registration form
- Expandable row to see that sub-agent's own sub-agents (L3)

### AgentApplicationsPage
- All applications across entire subtree (student + sub-agent students)
- DataTable: Student | University | Course | Status | Reference | Date
- Filter: by status, by sub-agent

### AgentCommissionsPage
- Own direct commissions only (not sub-agent commissions blended in)
- DataTable: Student | University | Amount | Status | Date
- Summary at top: Pending Total | Confirmed | Paid (in INR)
- Sub-agent breakdown section (separate table, clearly labelled)

### AgentProfilePage
- Agency details, contact info, partnership scope
- Referral code display (prominent — agents use this often)
- Account settings, change password

---

## 3G. ADMIN PORTAL — ALL PAGES

### AdminLayout.tsx
```tsx
const adminNav = [
  { group: null,       label: 'Overview',       icon: LayoutDashboard, path: '/admin/' },
  { group: 'ACADEMIC', label: 'Universities',   icon: Building2,       path: '/admin/universities',
    permission: 'universities.view' },
  { group: 'ACADEMIC', label: 'Courses',        icon: BookOpen,        path: '/admin/courses',
    permission: 'courses.view' },
  { group: 'ACADEMIC', label: 'Intakes',        icon: Calendar,        path: '/admin/intakes',
    permission: 'intakes.view' },
  { group: 'PEOPLE',   label: 'Students',       icon: GraduationCap,   path: '/admin/students',
    permission: 'students.view' },
  { group: 'PEOPLE',   label: 'Agents',         icon: Handshake,       path: '/admin/agents',
    permission: 'agents.view' },
  { group: 'PEOPLE',   label: 'Applications',   icon: FileText,        path: '/admin/applications',
    permission: 'applications.view' },
  { group: 'FINANCE',  label: 'Commissions',    icon: DollarSign,      path: '/admin/commissions',
    permission: 'commissions.view' },
  { group: 'GROWTH',   label: 'Leads',          icon: Target,          path: '/admin/leads',
    permission: 'leads.view' },
  { group: 'GROWTH',   label: 'Notices & Events', icon: Megaphone,     path: '/admin/notices',
    permission: 'notices.view' },
  { group: 'GROWTH',   label: 'Reports',        icon: BarChart2,       path: '/admin/reports',
    permission: 'reports.view' },
  { group: 'SYSTEM',   label: 'Admin Users',    icon: Shield,          path: '/admin/users',
    permission: 'user_management.view' },
  { group: 'SYSTEM',   label: 'Roles',          icon: Key,             path: '/admin/roles',
    permission: 'user_management.view' },
  { group: 'SYSTEM',   label: 'Settings',       icon: Settings,        path: '/admin/settings',
    permission: 'system_settings.view' },
  { group: 'SYSTEM',   label: 'Activity Log',   icon: Activity,        path: '/admin/logs',
    permission: 'activity_logs.view' },
  { group: 'SYSTEM',   label: 'Security',       icon: Lock,            path: '/admin/security',
    permission: 'security_events.view' },
];
// Hide nav items where usePermission returns false
// Group labels rendered as small uppercase section headers
```

### AdminOverviewPage
- Action Required queue (top priority):
  - Pending agent approvals count
  - Documents awaiting review
  - Reassignment requests
  - SLA breaches
- StatCards: Total Students | Total Agents | Active Applications | Pending Leads
- Recent activity feed (last 10 entries, all actors)
- Cron health status strip (mini dashboard — all jobs green/red)

### AdminStudentsPage
- DataTable: Name | Nationality | Agent | Status | Applications | Registered
- Inline actions: View, Request Document, Edit, Reassign Agent
- Preview drawer: full student summary
- Search by name/email, filter by status/nationality/agent

### AdminStudentDetailPage
- Full student profile
- Tab structure: Overview | Applications | Documents | Activity | Notes
- Each tab is a separate section (not a page)

### AdminAgentsPage
- DataTable: Agency | Contact | Tier | Students | Status | Joined
- Inline actions: View, Approve, Reject, Suspend
- Filter: by status, by tier

### AdminAgentDetailPage
- Agent profile + hierarchy tree visualisation (show parent + all descendants)
- Tab: Students | Sub-Agents | Commissions | Activity

### AdminApplicationsPage
- DataTable: Reference | Student | University | Course | Status | Date
- Inline actions: View, Change Status, Request Document, Add Payment
- Filter: by status, university, intake year

### AdminApplicationDetailPage
- Application header: reference, student, intake details, current status
- Status control: dropdown to change status (StateManager controls valid transitions)
- Unified timeline thread (Phase 4 wires data)
- Payment items section
- Document requests section
- Internal notes section

### AdminUniversitiesPage
- Card grid or DataTable view
- Each card: logo, name, country, course count, status badge
- Add University: SlideOverPanel with logo upload

### AdminCoursesPage
- Filtered by university (selected from dropdown or university detail)
- DataTable: Course Name | Degree | Duration | Intakes | Status
- Add Course: SlideOverPanel

### AdminIntakesPage
- Filtered by course
- DataTable: Intake Name | Year | Deadline | Fee | Status | Applications
- "Clone to Next Year" inline action

### AdminCommissionsPage
- DataTable: Agent | Student | University | Amount | Status | Date
- Filter: by agent, by status
- Approve/Pay inline actions (permission-gated)

### AdminLeadsPage
- Kanban or list view with status columns
- Lead card: name, source badge, country interest, assigned staff, date
- "Convert to Student" action on qualified leads

### AdminNoticesPage
- List: Title | Type | Audience | Status | Published Date
- Create/Edit: SlideOverPanel
- Audience selector: checkboxes for Student / Agent / Admin

### AdminReportsPage
- Tabbed: Overview | Students | Agents | Applications | Leads | Finance
- All charts use Recharts
- All tables with export capability (Phase 8 wires real data)
- Placeholders with skeleton charts now

### AdminLogsPage
- DataTable: Actor | Action | Target | Date/Time
- Filter: by actor type, by action, by date range
- Non-paginated infinite scroll or traditional pagination

### AdminSecurityPage
- DataTable: Event Type | User/IP | Details | Date
- Filter: by event_type, date range
- Highlight: `otp_brute_force`, `rate_limit_exceeded` in red

### AdminSettingsPage
- Grouped form: OTP Settings | Upload Settings | Reminders | Security | Backup
- Each setting: label + description + editable input
- Save button per group
- Super admin only

---

## 3H. PERMISSION-DRIVEN UI — IMPLEMENT EVERYWHERE

```tsx
// src/shared/hooks/usePermission.ts (built in Phase 1 — use consistently)

// In every admin page component:
const canCreate    = usePermission('students', 'create');
const canEdit      = usePermission('students', 'edit');
const canDelete    = usePermission('students', 'delete');
const canApprove   = usePermission('agents', 'approve');

// Rules:
// - Buttons are HIDDEN (not disabled) when user lacks permission
// - Nav items are HIDDEN when user lacks the .view permission
// - Super admin always sees everything
// - Sub-admin only sees what their role allows

// Do NOT show disabled buttons as a hint — just hide them entirely
// This prevents UI confusion and is better UX
```

---

## PHASE 3 AUDIT CHECKLIST

### Design system:
- [ ] Plus Jakarta Sans renders as heading font across all portals
- [ ] Inter renders as body font across all portals
- [ ] No `blue-*` or `indigo-*` Tailwind classes anywhere (grep to confirm)
- [ ] No `shadow-md` or `shadow-lg` on cards (only shadow-card)
- [ ] All primary buttons: orange (#FD7E14) background, white text, 8px radius
- [ ] Sidebar: navy (#1E2A4A) background with orange active state
- [ ] Cards: white background, warm border (#E8E4DE), 12px radius
- [ ] No Lorem ipsum text anywhere

### Student portal:
- [ ] All 6 pages render without errors
- [ ] Sidebar shows correct 6 nav items
- [ ] Student cannot access /agent/* or /admin/* routes
- [ ] Status pipeline shows correct current stage (placeholder)
- [ ] Document requests page shows EmptyState with correct message
- [ ] Profile page shows logged-in student name in header

### Agent portal:
- [ ] All 7 pages render without errors
- [ ] Referral code visible in sidebar footer
- [ ] Tier badge shown correctly under agent name
- [ ] Agent cannot access /admin/* routes
- [ ] My Team page shows "Invite Sub-Agent" button

### Admin portal:
- [ ] All 14 pages render without errors
- [ ] Nav items hidden based on permissions (test with a sub-admin user)
- [ ] Sub-admin without commissions.view cannot see Commissions in nav
- [ ] Super admin sees all nav items
- [ ] Action Required queue section visible on overview

### Components:
- [ ] DataTable: skeleton loads when isLoading=true
- [ ] DataTable: EmptyState shows when data is empty
- [ ] PreviewDrawer: opens on row click, closes on X or backdrop click
- [ ] SlideOverPanel: opens smoothly, closes on Cancel or backdrop
- [ ] Modal: renders for confirmations, Cancel/Confirm work
- [ ] Toast: success + error toasts appear top-right, auto-dismiss 4s
- [ ] StatusBadge: correct colors for all defined statuses
- [ ] CommandPalette: opens on Ctrl+K, closes on Escape

### Permission-driven UI:
- [ ] Admin without agents.approve: Approve button not visible on agent rows
- [ ] Admin without user_management.create: Create Admin button not visible
- [ ] Super admin: all buttons visible
- [ ] usePermission hook returns false for missing permissions (not just undefined)

### Marketing website:
- [ ] git diff confirms zero changes to any marketing page files
- [ ] Homepage loads correctly at /
- [ ] All marketing routes still work

### Accessibility:
- [ ] Sidebar navigation has aria-label="Main navigation"
- [ ] "Skip to main content" link exists and works
- [ ] Color contrast for brand-orange-accessible meets WCAG AA (4.5:1)
- [ ] Modal has role="dialog" and aria-modal="true" (via Radix)
- [ ] All interactive elements reachable via keyboard (Tab key)
- [ ] Focus trapped inside open modals and slide-overs (via Radix)
- [ ] Command palette announces search result count
- [ ] DataTables transform to stacked cards on mobile for readability
