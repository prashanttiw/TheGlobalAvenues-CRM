# TGA CRM — Full Live QA Pass (40+ Features, All 3 Portals)

**Purpose:** verify every feature described in `CLIENT_SYSTEM_DOCUMENTATION.md` actually works by clicking
through it live — not by reading code. Code review already backed the document; this pass is the other half:
does it *behave* the way it's described, right now, in a running instance.

Use this as the opening prompt for a fresh session. Paste it in as-is, or point the session at this file.

---

## 1. Read these first (in this order)

1. `CLAUDE.md` (repo root) — architecture, tech-stack gotchas, off-limits files (marketing site — never touch), working rules.
2. `Implementation_development _docs/CLIENT_SYSTEM_DOCUMENTATION.md` — this **is** the test spec. Every "Step by step" list in it is a literal test script. Test against what it claims, section by section.
3. Your memory files, if this session has access to them (check for `local_dev_setup`, `project_gotchas`, `preview_testing_gotchas` — they document known environment quirks: which port the frontend runs on, why `preview_click` is unreliable on some elements, why `127.0.0.1` breaks session persistence, etc.). If no memory is available, ask the user for local dev setup steps before starting.

## 2. Environment setup

1. Start XAMPP (Apache + MySQL). Confirm both are actually running, not just installed.
2. `npm run dev` for the frontend.
3. Confirm the local database has real data to test against (universities/courses/intakes, at least one agent per tier, at least one student with an agent and one without). If the DB is empty or stale, ask the user before reseeding — don't run `setup_database.php` against a database that might hold real work.
4. Get test credentials for at minimum: one **super_admin**, one **regular admin** with a *limited* page-access grant (to test RBAC boundaries, not just a super admin who bypasses everything), one agent at **each of Tier 1/2/3**, one **student with an agent assigned**, one **student with no agent**. If credentials are stale, reset via a direct DB password update matching the app's Argon2id params — don't invent a shortcut login path.
5. If testing the cron/background-job system, note that the scheduler doesn't run automatically in local dev — you'll need to invoke `php cron/scheduler.php` manually (or the individual scripts under `cron/`) to see it act.

## 3. Test methodology, per feature

For every feature listed in Section 4 below:

1. Log in as the role the feature belongs to.
2. Follow the exact "Step by step" sequence from the matching section of `CLIENT_SYSTEM_DOCUMENTATION.md` — don't improvise a different path through the UI.
3. Also deliberately try to break the stated business rule (e.g., if the doc says "capped at 3," try to create a 4th; if it says "closed intakes can't reopen," try to reopen one). A rule that's only ever tested on the happy path isn't actually verified.
4. Record: **Pass** (matches the doc exactly) / **Fail** (doesn't match — capture the exact error, screenshot, or wrong behavior) / **Blocked** (couldn't reach this state, e.g., no test data for it).
5. Prefer `preview_snapshot` (accessibility tree) over `preview_click` for verifying state — this codebase's preview environment has known click-delivery issues on Radix dropdowns/dialogs and on `<button type="submit">`. If a click doesn't seem to register, fall back to dispatching a synthetic `pointerdown`+`pointerup`+`click` sequence via `preview_eval` before concluding something is broken.
6. Always use `http://localhost:3000`, never `127.0.0.1:3000` — the refresh-token cookie won't survive a reload otherwise, which looks like a session bug but isn't.

## 4. Feature checklist (test in this order — cross-cutting first, since every portal depends on it)

### Cross-cutting (Section 4 of the doc)
- [ ] Student self-registration (email → OTP → password → auto-login)
- [ ] Agent self-registration → separate login → onboarding form → admin approval
- [ ] Admin creating an agent directly (Agents page → "Add Agent") — confirm the account lands
      already `approved` with no document/review queue entry, the welcome email contains a temp
      password with no clickable links, first login forces a password change before any other
      page is reachable (including via direct URL, not just the post-login redirect), the guard
      releases immediately after a successful change with no re-login needed, and the "Added by
      Admin" marker shows on that agent's row and detail view but not on self-registered agents
- [ ] Admin creating a new admin account (super admin only)
- [ ] Agent creating a brand-new student (no OTP, no shared password)
- [ ] Password login, OTP/passwordless login, admin 2FA, forgot-password flow (confirm it signs out other sessions)
- [ ] RBAC: a limited admin genuinely cannot see/act on a page they weren't granted; granting/revoking a page changes what they see after their next login
- [ ] Notifications: trigger at least 5 different event types (agent approval, application status change, document request, commission confirm, notice publish) and confirm both the in-app bell and the actual email arrive
- [ ] Cron: manually run `send-notifications.php`, `check-sla-breaches.php`, `generate-snapshots.php`, `monitor-disk.php` and confirm each does what §4.5 says with no errors
- [ ] File upload → download (checksum-verified) → re-upload (version history preserved) → permanent erasure (super admin only, now local-only — confirm the file is actually gone from disk and `erasure_status='erased'`)
- [ ] Activity log: confirm a regular admin sees only their own actions, a super admin (or granted admin) sees everyone's
- [ ] Application state machine: walk one application through several real transitions, confirm notifications + timeline entries fire each time, confirm an illegal transition is rejected
- [ ] SLA: submit a document, manually push its target time into the past, run `check-sla-breaches.php`, confirm it's flagged and super admins are notified
- [ ] Settings: change one real setting, confirm the described behavior actually changes; confirm the "recent configuration changes" feed logs it

### Admin Portal (Section 5) — 18 items
Dashboard · Universities (incl. multi-campus siblings) · Courses (incl. fee-applies-to-intakes) · Intakes (incl. clone, closed-never-reopens) · Students directory+detail+custom fields · Reassignment requests · Agents (approve/reject/suspend/hierarchy tree/direct admin creation) · Applications (status/documents/payments/timeline) · Commissions *(confirm still shows "not yet available")* · Leads *(confirm still shows "not yet available")* · Notices · Reports & Exports *(confirm still shows "not yet available")* · Users & page-access grants · Settings · Activity Log & Super Activity Log · Security Events (incl. name-redaction based on viewer's own permissions) · Global Search · Admin Profile & Avatar

### Agent Portal (Section 6) — 13 items
Onboarding lifecycle · Dashboard · Hierarchy/tier behavior (test all 3 tiers' visibility boundaries directly, not just Tier 1) · Student roster & detail · Registering a new student · Applying on a student's behalf (both existing and brand-new student) · Applications overview · Browsing universities · Commissions *(confirm still shows "not yet available")* · Reassignment notification-only view · Notices · Activity Log (tier-scoped) · Profile & Avatar

### Student Portal (Section 7) — 11 items
Overview/Dashboard · Applications (draft-first, cap, preference reorder, withdraw) · Completing Application Details (personal/academic/documents, auto-submit) · Documents Vault (incl. reject → re-upload loop) · Browsing universities/courses/intakes · Your Agent (view + request reassignment, incl. lock-after-enrolled) · Notices · Payments (mark paid → admin confirm/dispute) · Profile & Account Settings · Additional Information (custom fields) · Application Timeline (confirm it's genuinely read-only for students)

### Global Search (Section 8)
Test from all three roles — confirm each role's results are scoped exactly as described (admin sees 6 entity types, agent sees only their subtree, student sees only their own applications + catalog).

## 5. Reporting back

Don't just say "tested, looks fine." For each **Fail**, note: which section of `CLIENT_SYSTEM_DOCUMENTATION.md` it contradicts, the exact reproduction steps, and whether it's a documentation error (the doc overclaims) or a real product bug (the code is wrong). Fix the document or flag the code bug accordingly — don't silently paper over either one.
