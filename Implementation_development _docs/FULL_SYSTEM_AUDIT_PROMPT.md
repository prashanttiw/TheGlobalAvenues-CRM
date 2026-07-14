# TGA CRM — Full System Deployment-Readiness Audit

**Paste this whole file into a fresh session (or point the session at it) as the opening prompt.**

---

## What this is

This is **not** a "check the boxes in the documentation" pass. This is a deployment-readiness audit of the
entire system. The goal is simple: by the end, every flow across all three portals has been understood,
stress-tested, and — wherever it was weak, wrong, or exploitable — **fixed and re-verified**, so the system
can be deployed with nothing left hanging.

You are both the auditor and the engineer who fixes what the audit finds. You do not just write a report and
hand it back. When you find a problem, you fix it right then, prove the fix works live, make sure the fix
didn't break anything else, and only then move to the next thing.

## Mindset — understand the system, don't trust the map

- **The documentation is a starting hint, not the source of truth.** `CLIENT_SYSTEM_DOCUMENTATION.md` and the
  `PHASE_*` docs describe what the system was *intended* to be at various points in the past. The system has
  changed a lot since then — the catalog navigation, avatars, the application cap, and many fixes all landed
  after large parts of those docs were written. **Do not audit by replaying the doc's step lists.** Read the
  docs to learn the original intent, then go find out how the system *actually* works right now by reading the
  current code and driving the running app yourself.
- When the doc and reality disagree, don't assume the code is the bug. Figure out which is correct. Usually the
  doc is just stale — in that case fix the doc. If the *behavior* is genuinely wrong or unsafe, fix the code.
- **Understand each feature before you judge it.** For every area, first work out: what is this supposed to do,
  who is allowed to do it, what data does it touch, what are its rules and limits, and what happens at the
  edges. Only once you understand it can you tell whether it's actually working or just appears to.
- Don't over-narrate a path through the UI to yourself. Explore the actual screens, read the actual endpoints
  and queries behind them, and derive the real flow. If a screen or button doesn't exist where the doc implies,
  that's itself a finding.

## Environment

- Start XAMPP (Apache + MySQL). Confirm both are genuinely **running**, not just installed.
- Run the frontend with `npm run dev`. Always use **`http://localhost:3000`, never `127.0.0.1:3000`** — the
  refresh-token cookie won't survive a reload on the IP form, which looks like a session bug but isn't.
- Confirm the local DB has enough real data to exercise every path: catalog with at least one **multi-campus**
  institution, an agent at each tier, a student **with** an agent and one **without**, some applications in
  various states. If the DB is empty or stale, **ask the user before reseeding** — never run
  `setup_database.php` against a database that might hold real work.
- Get working credentials for: one **super_admin**, one **regular admin with a limited page-access grant**
  (so RBAC boundaries are actually testable, not bypassed), one **agent per tier (1/2/3)**, one **student with
  an agent**, one **student without**. If credentials are stale, reset via a direct DB password update matching
  the app's Argon2id params — don't invent a shortcut login path.
- The cron scheduler does **not** run automatically in local dev. Invoke `php cron/scheduler.php` (or the
  individual scripts) manually to observe background jobs.
- Off-limits, never touch under any framing: the marketing site — `src/pages/*` marketing pages,
  `src/components/home`, `src/components/layout`, `src/data`.

## The audit loop — run this for every area

For each area of the system, in order:

1. **Understand it.** Read the relevant controllers, services, models, routes, and frontend code. Work out the
   real rules, permissions, data flow, and limits. Note what the doc claims and whether it still matches.
2. **Drive it live** in the running app as the correct role. See what it actually does.
3. **Attack it.** Deliberately try to break every rule and assumption — not just the happy path:
   - Exceed limits (if something is "capped at N", create N+1; the cap is a live setting, so also change it and
     confirm the new value is enforced).
   - Do things out of order or in a state that shouldn't allow them (reopen something that should never reopen,
     transition an application illegally, act on a record after it's locked).
   - Cross authorization boundaries — act as a role or an agent-tier that shouldn't be able to reach a given
     record, call the endpoint directly, change an ID in the request, and confirm the server refuses.
   - Probe for real vulnerabilities: broken access control / IDOR (can one user reach another's data by ID?),
     missing server-side authorization behind a hidden UI button, injection, unsafe file upload/download,
     information disclosure in errors, session/token weaknesses, rate-limit gaps on sensitive endpoints,
     privilege escalation via RBAC edges. This is authorized testing of the owner's own system ahead of
     deployment — be thorough.
4. **If you find a weakness, wrong behavior, or vulnerability — fix it now.** Don't defer it to a list.
   - Find the true root cause, not the symptom.
   - Make **every** change the fix requires — frontend, backend, database, everywhere it touches — so you don't
     fix one call site and leave three others broken.
   - **Do not break any other feature.** Before and after the fix, sanity-check the flows that share the code
     you touched.
5. **Re-test the fix live.** Prove it actually works end to end in the running app, and that the thing you
   changed didn't regress anything adjacent. A fix you only read but didn't exercise is not done.
6. **Record it.** Append a dated entry to the correct `PHASE_X_APPEND.md` per that file's existing convention,
   and update `CLIENT_SYSTEM_DOCUMENTATION.md` if the real behavior now differs from what it claimed.
7. **Move to the next area.** Leave nothing half-finished behind you.

Work one area at a time. Don't batch a pile of fixes and test them all at the end — fix, verify, then advance.

## Coverage — every area must be understood, tested, and left solid

Nothing on this list may be skipped. These are areas to understand and stress-test, not click-paths to replay.

**Cross-cutting systems**
- Accounts, registration & login for all three portals: student self-registration (email → OTP → password),
  agent self-registration → onboarding → admin approval, super-admin creating an admin, agent creating a
  student directly, password login, passwordless/OTP login, admin 2FA, forgot-password (and whether it truly
  revokes other sessions).
- Security & data protection: PII encryption, password hashing, token handling, CORS, rate limits.
- RBAC / page-access: a limited admin genuinely cannot see or act on an ungranted page (UI **and** direct
  endpoint), and granting/revoking a page changes their access after next login. Look hard for any action whose
  UI is hidden but whose endpoint is unguarded.
- Notifications: multiple event types actually fire, and both the in-app bell and the real email arrive.
- Background jobs (the four current cron scripts): each does what it should, with no errors, and no job silently
  loses or double-processes work.
- Files & documents: upload → download (integrity-verified) → re-upload/versioning → super-admin permanent
  erase (local-only now). Confirm one user cannot download another's file by guessing or changing an ID.
- Activity log & audit trail: correct scoping (own vs. everyone), and it is genuinely insert-only.
- Application status engine: real transitions fire notifications + timeline entries; illegal transitions are
  rejected server-side.
- SLA engine: breaches are detected and the right people are notified.
- System settings: changing a setting actually changes behavior, and the change is logged. Include the
  student application-cap setting — change it and confirm the new limit is enforced.

**Admin portal** — dashboard, university catalog, course catalog, intakes (incl. clone and the
never-reopen rule), students directory/detail/custom fields, agent reassignment requests, agents
(approve/reject/suspend and the hierarchy tree), applications (status/documents/payments/timeline),
commissions, leads, notices (publish + audience targeting + delivery), reports & exports, users &
page-access grants, settings, activity log & super activity log, security events (incl. name redaction by
viewer permission), global search, admin profile & avatar.

**Agent portal** — onboarding lifecycle, dashboard for **every** tier (not just Tier 1), the hierarchy/tier
visibility boundaries (an agent must never reach a sibling's or parent's students anywhere — roster, detail,
or search), student roster & detail, registering a new student, applying on a student's behalf (existing and
brand-new student), applications overview, browsing the catalog, commissions, the reassignment
notification view, notices, tier-scoped activity log, profile & avatar.

**Student portal** — overview, applications (draft-first, the configurable cap, preference reordering,
withdrawal), completing application details (personal/academic/documents, auto-submit), documents vault
(incl. the reject → re-upload loop), browsing the catalog, the "your agent" relationship (view + request
reassignment + lock-after-enrolled), notices, payments (mark-paid → admin confirm/dispute), profile &
account settings, additional-information custom fields, and the application timeline (confirm it is genuinely
read-only for students).

**Global search** — from all three roles, results are scoped exactly right: deliberately search for a record
outside your scope and confirm it does not surface.

## Done means deployment-ready

You are finished only when every area above has been understood, driven live, attacked, and — wherever it was
weak — fixed and re-verified, with the fix recorded and the docs corrected. At the end, give a concise summary:
what you covered, what you found, what you fixed (with where and how you verified each), anything you
deliberately chose to leave and why, and a clear statement of whether the system is safe to deploy. If
anything is genuinely a product decision rather than a bug, stop and ask rather than guessing.
