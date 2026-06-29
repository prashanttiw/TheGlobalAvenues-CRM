# Claude Code Working Mode — TGA CRM

This file defines HOW Claude Code operates on this project. `CLAUDE.md` defines WHAT the project is.
Both auto-load every session via Claude Code's project instructions mechanism.

Read `CLAUDE.md` first if you haven't. This file assumes that context is already in place.

---

## The Four-Phase Loop for Any Change

Every change to this codebase, however small, follows this loop. No exceptions — not for one-liners,
not for "obviously safe" edits, not for config tweaks.

### 1. PLAN

- State what you are about to change, in one paragraph — concrete, not vague
- Identify which of the 9 build phases owns the affected area (determines which PHASE_X_APPEND.md
  gets the record)
- List exactly which files you will touch and why each one is necessary
- Call out any off-limits zones adjacent to the work and confirm they won't be disturbed
- Flag which state machine is in play if the change touches application status transitions
  (`StateManager` vs `ApplicationStateManager` — check the specific controller before assuming)
- Stop and wait for human approval before writing a single line of code

### 2. DOING

- Implement only what was approved in step 1
- One logical change at a time — if the plan covers three files, change them sequentially, not in one
  mass edit
- If discovery mid-implementation reveals the plan was wrong (wrong method name, unexpected schema
  column, missing dependency), stop and re-plan — do not silently pivot
- Always use `Database::getConnection()`, never `Database::connect()`
- Never hard-delete rows. Soft-delete only: `deleted_at = NOW()`. Exception: `super_admin` erase flow
  (but that is its own documented procedure)
- `activity_logs` is INSERT-only at the DB grant level. Never UPDATE or DELETE rows there. Always use
  `ActivityLogger::log()` with the correct columns: `actor_user_id`, `action`, `target_type`,
  `target_id`

### 3. VERIFY

Live test the change. Code re-reading is not verification.

- **Backend change:** hit the actual API endpoint, inspect the actual DB state, confirm the response
  matches spec
- **Frontend change:** open the actual UI in a browser, exercise the changed flow, check network tab
- **Schema change:** run the migration on a test DB, confirm it applies cleanly, confirm existing rows
  survive
- **Cron change:** run the script directly (`php cron/script-name.php`) and read the output
- If verification reveals a problem, the change is not done — fix the problem, then re-verify from
  scratch. Do not move to step 4 on a broken state.

### 4. APPEND

Write a dated entry in the correct `PHASE_X_APPEND.md` file:

- Match the format and section convention already in that file — do not invent a new structure
- Entry must include: what problem was solved (or what was added), files touched, what specifically
  changed and why, how it was verified, confirmation that off-limits zones were not disturbed
- If the change spans multiple phases, the primary entry goes in the phase that owns the most-modified
  file; add a brief cross-reference note in the other phase files
- Phase file location: `Implementation_development _docs/PHASE_X_APPEND.md` (note: directory name has
  a space before `_docs`)

---

## Discussion Mode by Default

If the question is "how should we handle X?" or "what's the right approach?" — answer in prose, propose
tradeoffs, ask clarifying questions if needed. Do not generate code files.

Explicit "implement this" (or equivalent) is required before writing code. Discussing an approach does
not constitute approval to implement it.

---

## Step-by-Step for Operational Procedures

For any procedure the human will execute live — SSH commands, server config, migration runs, deployment
steps, cPanel changes — give ONE step at a time. Wait for the human to report the result before
providing the next step.

Never dump a multi-step procedure as a single block. The human is running these live and may hit an
error at step 3 that invalidates steps 4–10. The next step should be informed by the actual output of
the previous one.

---

## Audit and Fix Workflow

When in audit mode (reviewing existing code for correctness, security, or spec compliance):

- Use a structured finding format: **FINDING / SEVERITY / FILE:LINE / PROBLEM / PROPOSED FIX**
- Severity is your reasoned judgment:
  - **Critical** — data loss, security breach, or completely blocked user flow
  - **High** — broken feature with no reasonable workaround
  - **Medium** — UX problem or incorrect behavior with a workaround
  - **Low** — cosmetic or minor inconsistency
- Present findings in batches of ~5. Wait for explicit per-finding approval before implementing
- Implement one finding at a time: implement → verify → append to phase file → next finding
- Do not batch-implement multiple findings even if they look independent

---

## Off-Limits Zones

The public marketing website. Never touch these files or directories under any framing — not even to
"just fix a typo," not even if adjacent to CRM work, not even if the human doesn't explicitly mention
them:

```
src/pages/HomePage.tsx
src/pages/DestinationsPage.tsx
src/pages/CountryDetailPage.tsx
src/pages/CoursesPage.tsx
src/pages/CourseCategoryPage.tsx
src/pages/PartnersPage.tsx
src/pages/AboutPage.tsx
src/pages/ContactPage.tsx
src/pages/ServicesPage.tsx
src/components/home/          ← entire directory — marketing home sections
src/components/layout/        ← entire directory — marketing Header/Footer/WhatsApp
src/data/                     ← entire directory — all TGA content data
```

**Critical distinction that catches AI builders off guard:**
`src/components/layout/` (marketing — OFF-LIMITS) is NOT the same as
`src/shared/components/layout/` (CRM portal shell — IN SCOPE). They look similar; they are different.

---

## Library and Architecture Rules (enforced every session)

These are the gotchas most likely to cause subtle bugs if ignored:

| Rule | Detail |
|------|--------|
| **Motion imports** | `import { ... } from 'motion/react'` — NOT `'framer-motion'` |
| **TanStack Query v5** | `useQuery` has NO `onSuccess`/`onError`/`onSettled`. Use `useEffect` on `data`/`isError`. `useMutation` still has them. |
| **Drag-and-drop** | Use `@dnd-kit/core` + `@dnd-kit/sortable`. `react-dnd` is in package.json but unused — do not use it. |
| **Tailwind tokens** | All design tokens live in `src/styles/theme.css` (`@theme inline {}` + `:root {}`). No `tailwind.config.ts` — Tailwind v4 doesn't use one. |
| **DB connection** | `Database::getConnection()` always. Never `Database::connect()`. |
| **Encryption** | XSalsa20-Poly1305 (NOT AES-GCM). The stale comment in migration 001 saying "AES-256-GCM" is wrong. |
| **PII lookups** | WHERE clauses use `*_lookup_hash` columns. Never decrypt to query. |
| **Public IDs** | API responses expose `public_id` (ULID). Integer `id` never leaves the backend. |
| **Cron safety** | `FOR UPDATE SKIP LOCKED` rows must be marked `status='processing'` BEFORE the transaction commits, not after. |
| **State machines** | `ApplicationStateManager` (simple, 5 states) and `StateManager` (extended, 20 states, transactional) coexist. Read the specific controller to know which one it uses before editing. |
| **Notification no-ops** | `NotificationService::fire()` silently no-ops if no active template row exists. Missing template = silent failure, not an exception. Known gap: `application.status_changed` has no template seeded yet. |
| **Global search** | Min 3 chars (MySQL FULLTEXT). Frontend: ≥300ms debounce. Backend: single UNION ALL query, not sequential. |
| **File downloads** | 8KB chunked `fread()`. Never `readfile()`. |
| **OTP email** | Sent synchronously via `MailService::sendNow()` — bypasses the notification queue. 2-minute queue delay is unacceptable for auth. |
| **`axios` / `@mui/material` / `react-dnd`** | In `package.json` but not used anywhere in `src/`. Do not import them. Use native `fetch` for HTTP. |

---

## Things That Are NOT Your Job on This Project

- Adding features the human didn't ask for
- "Cleaning up" working code while fixing something adjacent
- Replacing libraries (9 phases of build are done — the choices are made)
- Reorganizing directory structure
- Performance optimization beyond what's required to fix specific broken behavior
- Rewriting comments or docstrings unless explicitly asked

All of these create risk with no proportionate value at this stage.

---

## When You're Uncertain

Ask, don't assume. A clarifying question costs one message. An AI builder "helpfully" doing the wrong
thing on a production system costs an audit, a revert, and trust.

Specific cases that always warrant asking before acting:
- Any change that touches a state machine transition
- Any schema change (migration ordering matters)
- Any change to auth, OTP, JWT, or session handling
- Any deployment-side operation (cron config, htaccess, env vars)
- Any ambiguity about which of the two state managers a controller uses

---

## Session Hygiene

**At session start:**
- Confirm CLAUDE.md and WORKING_MODE.md are both loaded (they should be — both are in project root)
- Run `git status` to know what's already modified vs clean before touching anything
- If there are uncommitted modifications, understand what they are before adding to them

**At session end (any session where files changed):**
- List every file modified
- Confirm which `PHASE_X_APPEND.md` file received an entry and what section it went into
- Leave an unambiguous handoff note — the next session starts cold and should be able to continue
  without re-deriving what was done

---

## Phase File Quick Reference

When a change is made, append to the phase that owns the primary file:

| Area | Phase | Append file |
|------|-------|-------------|
| Auth, OTP, registration | Phase 2 | `PHASE_2_APPEND.md` |
| Applications, state transitions | Phase 3 | `PHASE_3_APPEND.md` |
| Documents, files | Phase 4 | `PHASE_4_APPEND.md` |
| Agents, commissions, hierarchy | Phase 5 | `PHASE_5_APPEND.md` |
| Notifications, cron, Drive backup | Phase 6 | `PHASE_6_APPEND.md` |
| Admin ops, global search, notices | Phase 7 | `PHASE_7_APPEND.md` |
| Reports, snapshots, exports | Phase 8 | `PHASE_8_APPEND.md` |
| Security, deployment, hardening | Phase 9 | `PHASE_9_APPEND.md` |

All append files are in: `Implementation_development _docs/` (note the space before `_docs`).
