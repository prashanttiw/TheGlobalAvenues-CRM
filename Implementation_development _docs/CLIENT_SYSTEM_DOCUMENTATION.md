# The Global Avenues CRM — Complete System Documentation

**Prepared for:** The Global Avenues (TGA)
**Covers:** The full CRM platform at `apply.theglobalavenues.com` — Student Portal, Agent Portal, and Admin Portal
**Status of the system described:** Live, production build, as verified directly against the current source code
**Document version:** 1.1 — **Last updated:** 2026-07-14

**Revision history:**

| Version | Date | What changed |
|---|---|---|
| 1.0 | 2026-07-09 | Initial complete edition — all three portals, all cross-cutting systems. |
| 1.1 | 2026-07-14 | Re-verified against a system-wide deployment-readiness audit and the fixes it produced: the university/course/intake catalog now has an explicit campus-selection step everywhere it's needed (Sections 5.2, 5.3, 5.4, 7.5); application review moved from a side panel to a dedicated full page (Section 5.8); a document can no longer be replaced once approved (Sections 5.8, 7.4); several access-control boundaries were confirmed and, in a couple of cases, tightened (Sections 4.3, 4.7, 5.12, 8); notice content filtering and background-job reliability were strengthened (Sections 4.2, 4.5, 4.9, 5.11); several smaller UI corrections (Sections 5.6, 5.9, 6.3, 6.6, 7.3, 7.6). |

---

## How to Read This Document

This document explains **everything the system does**, from the smallest button to the overall architecture, twice over — once in plain language, once with technical depth — so it works for two audiences at once:

- **If you're a business stakeholder**, read the **"In plain terms"** and **"Step by step"** parts of each section. Skip anything under "Technical detail" — it's there for your developers, not required reading for you.
- **If you're a developer, auditor, or technical partner**, every section also has a **"Technical detail"** part (exact files, database tables, API endpoints, validation rules) and a **"Why it was built this way"** part (the engineering reasoning, especially anywhere the system does something that looks unusual on the surface — like storing information twice, or deliberately delaying an action — there is almost always a specific reason, usually performance, security, or shared-hosting constraints, and this document explains it).

A third thread runs through the document in boxes marked **⚠ Note**. These flag small, specific things worth knowing about how the system behaves today — a button that isn't wired up yet, a rule that applies in one place but not another, a field that's stored but not yet shown on screen. None of these are emergencies; they're the kind of detail that's genuinely useful to know rather than discover by accident later. Every one of them is also collected in one place at the end, in **Section 9 — Current Limitations & Notes**, so nothing is buried.

This document has no length limit by design — the instruction behind it was "make sure nothing is left out." It is long. It is meant to be read a section at a time, not cover-to-cover in one sitting, and to serve afterward as a standing reference.

---

## Table of Contents

1. Executive Summary
2. System Architecture — The Big Picture
3. The Three Portals — Who Uses What
4. Cross-Cutting Systems (the machinery every portal shares)
   4.1 Accounts, Registration & Login
   4.2 Security & Data Protection
   4.3 Roles & Permissions (who can see/do what)
   4.4 Notifications (email & in-app)
   4.5 Automated Background Jobs (the "cron" system)
   4.6 Files & Documents
   4.7 Activity Log & Audit Trail
   4.8 The Application Status Engine (state machine)
   4.9 Service-Level Agreements (SLA) Engine
   4.10 System Settings
5. The Admin Portal — End to End
6. The Agent Portal — End to End
7. The Student Portal — End to End
8. Reports, Search & Cross-Portal Utilities
9. Current Limitations & Notes
10. Glossary

---

## 1. Executive Summary

### In plain terms

The Global Avenues CRM is the single system that runs TGA's entire student-recruitment business — from the moment a prospective student first shows interest, all the way through them being accepted into and preparing to depart for a university abroad. It replaces what would otherwise be spreadsheets, email threads, and WhatsApp messages spread across dozens of counsellors and hundreds of agent partners, with one shared, always-up-to-date system of record.

It is built as **three separate "portals"** — three different-looking, different-purpose applications that all run on the same underlying system and share the same database:

- **Students** use their portal to browse universities and courses, apply, upload documents, track their application status, and pay fees.
- **Agents** (TGA's recruitment partners, and the partners' own sub-partners) use their portal to register and manage their own roster of students, apply on students' behalf, track their commission earnings, and build their own referral network.
- **Admin staff** (TGA's internal team) use their portal to run the whole operation — reviewing applications, managing the university/course catalog, approving agents, handling leads, tracking payments and commissions, publishing notices, and monitoring the health and security of the system itself.

The system is live and has been in continuous development and hardening since June 2026, with the great majority of the platform fully built, tested against real data, and in active use. A small number of features (documented honestly in this report — Leads, Commissions, and Reports currently show a "still being finished" notice to admins, explained fully in Section 5) are functionally complete underneath but are being held back from general use until final polish is done.

### Technical detail

- **Frontend:** React 18 + TypeScript, built with Vite, styled with Tailwind CSS v4. One single-page application serves all three portals plus TGA's public marketing website, with role-based routing deciding what each logged-in user sees.
- **Backend:** PHP 8.2, written without a framework (a deliberate choice — see Section 2), talking to a MySQL 8.4 database.
- **Hosting:** Both the frontend and backend run on one shared hosting account (Bluehost, India) under the address `apply.theglobalavenues.com`. There is no separate server for the frontend — everything lives in one place.
- **Scale of the codebase, as of this document:** 32 backend controllers, 24 backend services, roughly 40+ database tables, and around 60 distinct frontend pages spread across the three portals plus the public site.

### Why it was built this way

TGA's requirements were specific: it needed to run affordably on shared hosting (not a cloud server bill that scales with usage), it needed to protect sensitive personal data (passports, contact details, payment records) to a high standard, and it needed a single-source-of-truth database so that a student's status, an agent's commission, and an admin's report are never looking at three different versions of the truth. Every major architectural decision in this document traces back to one of those three needs.

---

## 2. System Architecture — The Big Picture

### In plain terms

Picture one filing cabinet (the database) in one office (the server). Three different reception desks (the three portals) all read from and write to that same filing cabinet, each desk only allowed to open the drawers relevant to the person standing in front of it. There's a night shift (the automated background jobs, explained in Section 4.5) that runs through the cabinet every so often — sending out notifications, flagging anything overdue, checking nothing has quietly gone wrong.

### Step by step — how a typical request flows through the system

1. A user (student, agent, or admin) opens the site in their browser. They get the same React application regardless of role; the application shows them a different portal based on who they're logged in as.
2. Every action they take — viewing a page, clicking a button, submitting a form — turns into a request to the backend. Requests are shaped as `/?route=<resource>&action=<action>`, e.g. `/?route=applications&action=get/<id>`, rather than a more conventional web-address style. (Why, below.)
3. The PHP backend checks who's asking (are they logged in? are they allowed to do this specific thing?), does the work (usually a database read or write), and sends back a plain JSON answer.
4. The frontend updates the screen with that answer — no full page reload.
5. In the background, entirely separately from any user sitting at a screen, a scheduled job runs every single minute, checking whether it's time to send queued emails, check for overdue documents, back up the database, or any of eight other routine jobs (Section 4.5).

### Technical detail

- **Frontend stack:** React 18.3, React Router v7, Vite 6, Tailwind CSS v4 (design tokens defined in `src/styles/theme.css`, not a `tailwind.config.ts` file — that's a v4 change, not an oversight), TanStack Query v5 for data-fetching/caching, Zustand for local UI state, Radix UI for accessible interactive components (dialogs, dropdowns), `@dnd-kit` for all drag-and-drop, `motion` (the package formerly/also known as Framer Motion) for animation, TipTap for the rich-text notice editor, Recharts for report charts.
- **Backend stack:** PHP 8.2, **deliberately built without a framework** (no Laravel, Symfony, etc.). Namespace root `TGA\CRM\`. A small number of Composer libraries are used for specific jobs that would be unreasonable to hand-roll: `openspout/openspout` for streaming Excel exports, `dompdf/dompdf` for PDF exports, PHPMailer for email.
- **Database:** MySQL 8.4, targeted at InnoDB throughout, with a "public ID" pattern explained below.
- **API style:** Not a conventional REST API. All requests go through one PHP entry point (`crm-api/index.php`), which reads a `route` and `action` query parameter and dispatches to the matching controller method. This is sometimes called a "front controller" pattern.
- **Hosting reality:** One Bluehost India shared-hosting account, cPanel username `lidglcmy`, serving both the built React app (as static files) and the PHP backend (`crm-api/`) from the same document root under `apply.theglobalavenues.com`. There is a genuine cPanel "Cron Jobs" scheduling feature available (used for the one-line entry that drives Section 4.5's whole background-job system) — the account does not have full Terminal/SSH access, but that is a separate permission from cPanel's cron feature, and does not limit anything described in this document.

### Why it was built this way

- **No PHP framework:** Shared hosting environments like this one don't reliably support the kind of "Composer autoload everything, run a service container" setup that modern frameworks assume. Avoiding a framework means no fragile dependency chain, faster page loads (no framework overhead to boot on every request), and no risk of a framework upgrade breaking the site months from now. The trade-off — writing more plumbing by hand — was judged worth it for a system this size running on this kind of hosting.
- **The unconventional `/?route=X&action=Y` URL style**, instead of the more common `/api/students/123`-style REST paths: on this specific hosting setup, this avoids needing Apache's URL-rewriting to handle a large number of different route patterns reliably, and keeps one predictable entry point (`index.php`) that's easy to reason about, log, and rate-limit centrally.
- **One server for everything:** simpler operationally (one place to deploy, one place to monitor, one bill) and avoids cross-origin complexity that a split frontend/backend hosting setup would otherwise introduce.
- **"Public IDs" (ULIDs) instead of database row numbers, everywhere a student/agent/admin can see an ID:** every record TGA's staff or partners might see (a student, an application, a university) has two IDs internally — a plain sequential database number (1, 2, 3…) that never leaves the server, and a 26-character unguessable code (a "ULID," e.g. `01H8X...`) that's what actually appears in the browser's address bar or in an API response. If the system used the plain sequential number everywhere, anyone could guess `?student=45` is followed by `?student=46`, and could probe the system for information about students they have no business seeing. The ULID makes that guessing attack pointless, while still sorting in creation order internally (useful for the database), which a fully-random ID wouldn't.

---

## 3. The Three Portals — Who Uses What

### In plain terms

| Portal | Who logs in | What they're there to do |
|---|---|---|
| **Student** | A prospective or current student applying to study abroad through TGA | Browse universities/courses, start and track applications, upload required documents, see and pay fees, see their assigned TGA consultant/agent, read announcements |
| **Agent** | A TGA recruitment partner (an individual or agency that refers students to TGA), and that partner's own sub-partners | Register and get approved as a partner, build and manage a roster of students (their own or referred in by sub-partners), apply on a student's behalf, track commission earnings, build a referral network up to 3 levels deep |
| **Admin** | TGA's internal staff — counsellors, operations, and senior/super administrators | Run the whole operation: review every application, manage the university/course/intake catalog, approve or reject agent partners, work the sales-lead pipeline, verify payments and commissions, publish notices, and audit system activity/security |

### Technical detail

Every account in the system is a row in one shared `users` table, distinguished by a `user_type` column (`student` / `agent` / `admin`). A person can legitimately hold **more than one type of account under the same email address** — for example, an agent who is also personally enrolling as a student — because the uniqueness rule on email is scoped per portal type, not globally (explained fully in Section 4.1). Once logged in, the frontend's router (`src/router/index.tsx`) shows only the routes belonging to that account's role; a `RoleGuard` component blocks a student's browser from ever rendering an admin page, and separately, the backend independently re-checks the same role/permission rules on every single request — the frontend gate is a convenience, not the actual security boundary (Section 4.3 explains the real boundary).

Within the Admin portal there is a further split: **admin** and **super_admin**. Almost every admin account is a plain "admin" whose access to individual pages of the system is explicitly granted by a super admin, page by page (Section 4.3 and Section 5.13 explain exactly how). A handful of powers — creating or deleting other admin accounts, editing system-wide settings, and permanently erasing a file — are reserved for super admins only, and cannot be delegated.

Within the Agent portal there is a 3-level hierarchy: a "Tier 1" agent can recruit "Tier 2" sub-agents, who can in turn recruit "Tier 3" sub-sub-agents, at which point the chain stops (a hard limit — a Tier 3 agent cannot create further sub-agents). Section 6 explains this fully, including how the system checks who's allowed to see which students without needing to walk the whole tree on every request. Tiers are shown simply as "Tier 1 / 2 / 3" throughout the interface.

---

## 4. Cross-Cutting Systems

These are the pieces of machinery that aren't "a page you visit" — they run underneath all three portals, and every feature described later in this document (Sections 5, 6, 7) depends on one or more of them. Understanding this section first makes the portal-by-portal walkthroughs much easier to follow, because we can say "this follows the standard notification system" instead of re-explaining notifications forty times.

### 4.1 Accounts, Registration & Login

#### In plain terms

Getting an account and logging in works differently depending on who you are and how you're joining:

- **A student signing themselves up** goes through 3 quick steps: enter your email (and get a 6-digit code sent to it), enter that code to prove it's really your inbox, then set a password. As soon as that's done, you're automatically logged in — no separate "now go log in" step.
- **An agent signing themselves up** goes through the same 3-step email-code-password process, but afterward they are **not** automatically logged in — they log in separately, and are immediately walked through a short onboarding form (company details + 3 required documents) before admin approval unlocks the rest of the portal.
- **A new admin account** can only be created by an existing super admin, from inside the Admin portal — there's no public admin sign-up page.
- **An agent registering a brand-new student on their behalf** (very common — an agent talking to a prospective student on the phone, entering their details directly) skips the email-code step entirely. The student's account is created instantly with a system-generated password that is never shown to anyone, not even the agent — the student logs in afterward using a one-time code sent to their own email, or "Forgot Password," never a shared password.
- **Logging in** normally means email + password, but the system also supports logging in with just a one-time emailed code (no password needed) for students and agents, and administrators can optionally have a second security code step (2FA) added to their password login.

#### Step by step — student self-registration

1. Student enters name, email, and phone on the sign-up form.
2. System checks a 6-digit code hasn't already been requested too many times in the last hour (a spam/abuse guard, explained in 4.2), then emails a 6-digit code and temporarily remembers the student's entered details for 15 minutes (without yet creating a real account).
3. Student enters the code. System checks it's correct, not expired, and hasn't been guessed wrong more than 3 times.
4. Student sets a password meeting the strength rules (8+ characters, at least one capital letter, one number, one symbol).
5. The system now actually creates the account, logs the student straight in, and sends a welcome email.

#### Step by step — agent self-registration → onboarding → approval

1. Same 3-step email-code-password flow as students.
2. Agent logs in separately afterward. Because their account isn't "approved" yet, the system automatically routes them to an onboarding form instead of the normal dashboard.
3. Onboarding form: address, city, state, alternate mobile number, plus 3 required documents — a profile photo, a government ID (Aadhar card), and a CV/resume.
4. Agent submits. Every TGA admin gets notified that a new partner application is waiting for review.
5. An admin reviews and approves or rejects (Section 5.7). Approved agents get full portal access immediately; rejected agents see the reason and can edit and resubmit.

#### Step by step — logging in

- **Password login:** email + password. If the account has 2FA turned on (admin accounts only, optional), a one-time code is also emailed and must be entered before the session starts.
- **Passwordless login (one-time code):** available to students and agents — request a code by email, enter it, you're in. No password needed at all for this path.
- **Forgot password:** request a code by email, enter it, then set a new password. As a security measure, doing this **signs you out of every device you were previously logged into**, everywhere.

#### Technical detail

- **Where accounts live:** one `users` table for all three roles, with role-specific detail tables (`students`, `agents`, `admins`) linked to it. A composite uniqueness rule on `(email, user_type)` — not email alone — is what allows the same email to hold, say, both a student account and an agent account as two entirely separate rows (added by migration `071`).
- **OTP (one-time code) mechanics:** a 6-digit code is generated with a cryptographically secure random number generator, only its SHA-256 hash is stored (never the code itself), expires after a configurable number of minutes (default 10), and locks after 3 wrong guesses. Every send is rate-limited (3 per hour per IP address and per email address) to stop abuse.
- **The "pending registration" holding area:** between entering an email and finishing registration, a student/agent's in-progress details are held in a `pending_registrations` database table (not in a browser cookie or server session) for 15 minutes, encrypted, then either promoted into a real account or discarded. Using a database table instead of a server-side session was a deliberate choice (see "Why," below).
- **Agent-creates-student, in detail:** `StudentController::agentCreateStudent()` skips the OTP/pending-registration flow entirely and creates the `users` + `students` rows directly inside one database transaction. The password is generated with a secure random generator and is never included anywhere in the API response or in the email the student receives — the student's only way in is a one-time emailed code or the Forgot Password flow. This is enforced in code, not just policy.
- **Sessions and tokens:** login issues two tokens — a short-lived "access token" (15 minutes, used to prove who you are on each request) and a longer-lived "refresh token" (7 days, used only to silently obtain a new access token when the old one expires). The access token is kept only in the browser's in-memory JavaScript state, never in `localStorage`; the refresh token is stored in an HttpOnly cookie the browser's JavaScript can't read at all, only send back automatically. Every active login is also tracked as a row in a `user_sessions` table, capped at a configurable number of simultaneous sessions per account (default 5) — logging in on a 6th device silently signs out the oldest session.
- **Two-factor authentication (2FA):** admin-portal-only. Optional per admin account, toggled from their own profile (re-entering their current password to turn it on or off). When on, password login pauses at a "pre-authentication" stage, emails a second code, and only issues real session tokens once that second code is verified.
- **A separate, fully passwordless login exists for admins too** ("Admin OTP Login") — distinct from 2FA, this lets an admin skip the password entirely and log in with just an emailed code, the same convenience students and agents get.

#### Why it was built this way

- **Auto-login for students, not for agents:** a student registering themselves has nothing to wait on — there's no approval gate, so signing them in immediately removes a pointless extra click. An agent's account isn't fully "live" until onboarding + approval, so auto-login would just drop them into a portal that immediately redirects them somewhere else — logging in as a distinct, deliberate step avoids that confusing flash.
- **`pending_registrations` as a real database table, not a server session:** this hosting environment uses shared, multi-tenant server infrastructure — a PHP session stored in the server's temporary-files folder is not a private space on shared hosting the way it would be on a dedicated server. Storing (encrypted) in-progress registration data in the application's own database instead avoids that cross-tenant exposure risk entirely.
- **No shared/emailed password when an agent creates a student:** a password that travels by email is a password that can be intercepted or read by anyone with access to that inbox, indefinitely. Generating one server-side and never surfacing it anywhere closes that door completely — the student's only way in is a fresh, single-use code or a password they choose themselves.
- **Refresh-token rotation and full session revocation on password reset:** if a password is being reset, it's often because the old one may be compromised — signing out every device at that moment, not just the one doing the reset, is the safe default.

---

### 4.2 Security & Data Protection

#### In plain terms

Several layers of protection work together, mostly invisibly, to keep student and agent data safe:

- Sensitive personal details (email, phone, passport number) are **scrambled (encrypted)** in the database — even someone with direct, unauthorized access to the raw database tables could not read them without the system's secret encryption key.
- Passwords are never stored directly — only a one-way scrambled version that can verify a login attempt but can't be reversed back into the original password.
- The system watches for and slows down abusive behavior — someone hammering the login page with guesses, or spamming the "send me a code" button — automatically, without a human needing to intervene in real time.
- Every security-relevant event (a failed login, a suspicious pattern, a password reset) is written to a permanent security log that admins can review (Section 5.16).
- File uploads are checked for hidden malicious content before they're accepted, not just trusted because they have the right file extension.

#### Technical detail

- **Encryption:** sensitive fields (`users.email`, `users.phone`, `students.passport_number`, and a few others) are encrypted using an algorithm called XSalsa20-Poly1305 (via a well-regarded cryptography library called libsodium), **not** the more commonly-used AES. This is a deliberate choice explained below. Because you can't run a database search ("find the student with this email") directly against encrypted text, the system separately stores a one-way scrambled "lookup hash" of the same value alongside it — search compares hashes, never the raw encrypted data, and the hash can't be reversed back into the original email or phone number either.
- **Partial/"starts with" search on encrypted fields:** a special set of additional short hashes (covering just the first 4, 6, or 8 characters of an email, or the first 4/6 digits of a phone number) let admin staff search "starts with" on encrypted data without ever decrypting a whole table's worth of records to do it — a meaningful performance difference once the student list is in the thousands.
- **Passwords:** hashed with Argon2id (the current best-practice password-hashing algorithm), tuned with a memory cost and time cost read from server configuration.
- **Rate limiting:** login attempts, OTP requests, and public-facing endpoints (like the lead-capture form on the public website) are all limited to a small number of attempts per time window, tracked per IP address and per account, with an automatic escalating lockout.
- **Upload safety:** every uploaded file's true type is checked by inspecting its actual bytes (not just trusting the file extension or the browser's claimed content-type), and image uploads are additionally scanned for embedded PHP code — a known attack technique where a working image file also secretly contains executable code, hoping a careless server will run it. As a second, independent layer, the folder that serves publicly-viewable uploads (avatars, notice attachments, university logos) is separately configured at the web-server level to never execute any file placed in it, no matter what type it claims to be — so even a hypothetical future gap elsewhere couldn't turn an uploaded file into running code.
- **Downloads are integrity-checked:** every file has a stored cryptographic fingerprint (SHA-256 checksum) computed at upload time; every time that file is downloaded again, the system recomputes the fingerprint of what's actually on disk and refuses to serve it if the two don't match, logging the mismatch as a security event.

#### Why it was built this way

- **XSalsa20-Poly1305 instead of the more common AES-256-GCM:** AES encryption is fastest when the server's processor has a specific hardware feature (AES-NI). Shared hosting providers don't guarantee that feature is available or enabled on the exact machine an account happens to run on. XSalsa20-Poly1305 performs consistently well in software alone, with no such hardware dependency — a safer bet for an environment where TGA doesn't control or know the exact underlying hardware.
- **Lookup hashes and prefix hashes alongside encryption:** without them, "find this student by email" would require decrypting every single row in the table and comparing — technically possible, but it gets slower as the student list grows, and worse, it means every search operation touches (and briefly holds unencrypted in memory) far more personal data than the search actually needs. A hash-based lookup only ever touches the one row that actually matches.
- **Byte-level file-type checking instead of trusting file extensions:** a malicious actor can rename any file to end in `.jpg`. Only inspecting the file's actual content reliably tells you what it really is.

---

### 4.3 Roles & Permissions (RBAC)

#### In plain terms

Not every admin can do everything. A super admin decides, page by page, exactly which parts of the Admin portal each individual admin staff member can see — and separately, whether they can only *look* at that page (read-only) or also *make changes* on it (full access). A counsellor might be able to see and edit Students and Applications, but only look at (not touch) Reports; a finance-focused admin might have full access to Commissions but no access to the Leads pipeline at all. This is set up once per admin account and can be changed at any time.

A small number of powers are reserved for super admins specifically and cannot be handed to a regular admin no matter what boxes are ticked: creating or deleting other admin accounts, editing the system-wide configuration settings, and permanently destroying a file. Super admin status itself can only be granted by an existing super admin, and once granted, cannot be removed through the interface at all — it's a deliberately hard-to-reverse status, changeable only by someone with direct database access.

#### Step by step — granting a page to an admin

1. A super admin opens the Users page and either creates a new admin account or edits an existing one.
2. For each of the 14 controllable areas of the system (Universities, Courses, Intakes, Students, Agents, Applications, Commissions, Leads, Notices, Reports, Users, Settings, Super Activity Log, Security), the super admin picks one of: **No Access**, **Read Only**, or **Full Access**. (Three of the fourteen — Reports, Super Activity Log, and Security — only ever offer No Access or Read Only, since there is no "editing" concept on those pages at all.)
3. Saving applies immediately to the database. The change takes effect the next time that admin's browser refreshes their login session — not necessarily on their very next click if they already have a page open, since their permission list is baked into their current session token until it's renewed.

#### Technical detail

- **Frontend gate:** a `usePermission(module, action)` check hides or shows buttons/menus, and a `PageGuard` component blocks whole pages, based on a `permissions` list embedded in the logged-in admin's session token.
- **Backend gate — the real security boundary:** every single backend action independently re-checks the caller's permissions via `RBACMiddleware::requirePermission(module, action)` before doing anything. The frontend hiding a button is a convenience for a normal user; it is not what actually stops an unauthorized action — a request sent directly to the backend, bypassing the visible interface entirely, is checked exactly the same way and rejected exactly the same way.
- **How a grant becomes real permissions:** the system does not use a traditional "named roles" model (like a reusable "Counsellor" role assigned to many people). Instead, each individually-configured admin gets their own auto-generated, invisible role behind the scenes (internally named something like `page_access_<that admin's ID>`), containing exactly the specific permissions implied by their page grid. Ticking "Full Access" on a page grants both its "view" and "write" underlying permissions; "Read Only" grants just the "view" half.
- **Permissions are baked into the session token at login/refresh, not re-checked live on every request against the database.** This means a permission change made by a super admin takes effect the next time the affected admin's session is refreshed (or they log in again) — not instantly mid-session. This is a deliberate performance trade-off, explained below.
- **Super admin bypass:** a super admin's session token carries a special "all permissions" marker rather than an explicit list, and every permission check short-circuits to "allowed" when it sees that marker.

#### Why it was built this way

- **Per-admin page grids instead of shared named roles:** TGA's actual staffing pattern is closer to "each person has their own specific mix of responsibilities" than "everyone in this job title needs exactly the same access." A per-person grid matches that reality without forcing artificial role categories.
- **Permissions baked into the session token instead of checked fresh against the database on every request:** checking a database table on literally every single action the system performs would add a real, constant performance cost, multiplied across every user, every click, all day. Reading a value that's already sitting in the already-verified session token costs essentially nothing extra. The trade-off — a revoked permission takes a few minutes (until next login/refresh) to fully take effect rather than being instant — was judged an acceptable cost for a meaningful, system-wide speed gain.

---

### 4.4 Notifications (Email & In-App)

#### In plain terms

Whenever something notable happens — an application changes status, a document is requested, an agent is approved, a commission is confirmed — the relevant people are told about it, both by email and as an in-app notification (a bell icon with a badge count) inside their portal. Which of those two channels is used depends on the specific event; some things (like a routine successful login) are only ever shown in-app, deliberately, to avoid flooding inboxes with low-value email for something that happens dozens of times a day.

#### Technical detail

- **How it works internally:** a single central function, `NotificationService::fire(eventKey, variables, recipients)`, is the only way anything in the system sends a notification. It looks up a pre-written message template matching the event (e.g. `agent.approved`), fills in the specific details (names, dates, links), and queues one row per recipient per channel into a `notifications` table with status `queued`. A background job (Section 4.5) picks those rows up and actually sends the emails a short time later — usually within one minute.
- **If no template exists for a given event key, the system does nothing and fails silently** — no error, no crash, just no notification sent. Every event the system actually fires (the full table below) now has a matching template in place.
- **The one exception to the "queue it, send it later" pattern is one-time login codes (OTPs)** — those are sent immediately and synchronously, the moment they're requested, bypassing the queue entirely, because a 60-second delay on a login code would be a genuinely broken user experience, not just a minor inconvenience.
- **Full current list of events the system notifies on**, and which channel(s) each uses:

| What happens | Who's told | Channel(s) |
|---|---|---|
| Student registers themselves | The student | Email + in-app |
| Agent registers themselves | The agent | Email + in-app |
| A student account is created by their agent | The student | Email + in-app |
| An agent's onboarding application is submitted | All admins | Email + in-app |
| An agent is approved | The agent | Email + in-app |
| An agent is rejected | The agent | Email + in-app |
| An agent is suspended | The agent | Email |
| A sub-agent account is created | The new sub-agent | Email + in-app |
| A new admin account is created | The new admin | Email |
| A notice is published | Everyone in its target audience | Email + in-app |
| A student requests a change of agent | All admins | Email + in-app |
| A reassignment request is approved | The student | Email + in-app |
| A reassignment request is denied | The student | Email + in-app |
| A student is reassigned away from an agent | The losing agent | Email + in-app |
| A student is reassigned to a new agent | The gaining agent | Email + in-app |
| A commission is created | The agent | Email + in-app |
| A commission is confirmed | The agent | Email + in-app |
| A commission is marked paid | The agent | Email + in-app |
| A new lead is captured | Relevant admins | Email + in-app |
| A lead is assigned to a staff member | That staff member | Email + in-app |
| A lead's stage changes | Relevant admins | In-app only |
| An application's status changes | The student **and** their agent (separately) | Email + in-app |
| A document is requested on an application | The student and agent | Email + in-app |
| A document is submitted | The reviewing admin | Email + in-app |
| A document is approved or rejected | The student and agent | Email + in-app |
| A document is cancelled | The student and agent | Email + in-app |
| Anyone logs in successfully | That person | **In-app only, no email** (deliberate) |
| A service-level target is missed (SLA breach) | Super admins | Email + in-app |
| Storage space is running low | Super admins | Email + in-app |
| Storage space is critically low | Super admins | Email + in-app |

- **`resolveAgentChain()`:** a helper that, given a student, walks up the chain of agents responsible for them (their direct agent, that agent's parent, and so on to the top) so that an entire hierarchy can be notified about something at once, not just the one immediate agent.

#### Why it was built this way

- **A queue instead of sending emails instantly for everything:** sending email is comparatively slow and occasionally fails (a mail server hiccup, a temporary block). Queuing means the user-facing action (approving an agent, changing a status) completes instantly regardless of email delivery speed or reliability — the notification catches up moments later, retried automatically if it fails, without ever blocking or slowing down the actual work being done.
- **Login notifications are in-app only, with no email:** logging in is something that happens many times a day, for every user. Emailing on every single login would very quickly become unwanted noise and could plausibly get the sending account flagged as spam by email providers — an in-app notification carries the same "here's a record this happened" value with none of that downside.
- **A silent no-op when a template is missing, rather than an error:** a missing notification template never crashes or blocks the underlying action (approving an agent still works even if, hypothetically, its email template were ever removed) — it simply means that one notification quietly doesn't go out. This keeps notification delivery from ever being able to block real operational work, at the cost of needing template coverage to be checked deliberately whenever a new event type is added.

---

### 4.5 Automated Background Jobs (the "Cron" System)

#### In plain terms

A number of routine tasks need to happen on a schedule, without any person needing to remember to trigger them — sending queued emails, checking whether any documents are overdue, watching disk space. TGA's hosting account has a genuine scheduling feature (like an alarm clock built into the server) that is set to run, once every single minute, a small script that then decides which jobs actually need to run at that particular minute, based on each job's own frequency.

#### Step by step — what's actually running, and how often

| Job | How often | What it does |
|---|---|---|
| Send queued notifications | Every 1 minute | Actually sends the emails and in-app notifications that other actions queued up |
| Check for missed deadlines (SLA) | Every 15 minutes | Flags any document review or application review that's taken longer than its target time |
| Generate report snapshots | Every 24 hours | Pre-calculates all the numbers the Reports pages show (see Section 5.12 for why) |
| Monitor disk space | Every 12 hours | Warns admins if the server is running low on storage |

#### Technical detail

- **The scheduling mechanism:** one cPanel cron entry runs `cron/scheduler.php` every minute. That script uses a lock file to guarantee only one copy of itself is ever running at a time (if a previous run is still going, a new one exits immediately rather than piling up), checks a small JSON file recording when each job last ran, and launches (as a separate process) any job that's now due.
- **Stuck-job recovery:** before doing anything else, the scheduler checks whether any job has been sitting in a "running" state for more than 15 minutes (which would only happen if something crashed mid-run without cleaning up after itself) and force-marks it as failed so it isn't permanently stuck blocking future runs.
- **Safe concurrent processing:** several of these jobs use a database technique called `SELECT ... FOR UPDATE SKIP LOCKED` when pulling a batch of work (e.g. pending emails) to process. In plain terms: if the job somehow ran twice at once, each copy would automatically skip rows the other copy has already claimed, guaranteeing no email is ever sent twice, without needing a more complicated locking scheme.
- **Every job has a time limit** so that a single stuck job can never hang the server indefinitely — it's forcibly stopped and marked failed, to be picked up again on its next scheduled run. The notification-sending job specifically reuses one connection to the mail server across a whole batch of emails (rather than opening a new one per email) and tracks its own running time as it goes, so instead of risking being cut off mid-batch, it gracefully stops and leaves any remaining emails for the next run — about a minute later — keeping a large backlog from ever causing a stalled or failed run.

#### Why it was built this way

- **One single cPanel schedule entry driving several internal jobs, instead of a separate cPanel entry per job:** shared hosting cPanel cron scheduling is sometimes limited in granularity or count of separate entries, and having all the scheduling logic live in one script under the application's own version control (rather than spread across several separately-configured cPanel entries that are easy to lose track of) is both more reliable and much easier for a developer to review, test, and change later.
- **`SELECT ... FOR UPDATE SKIP LOCKED`:** without this, if a job somehow ran twice simultaneously (a real possibility on shared hosting where a cron trigger can occasionally double-fire), two processes could grab the same batch of pending emails and send every one of them twice. This database-level guarantee makes that scenario structurally impossible rather than merely unlikely.

---

### 4.6 Files & Documents

#### In plain terms

Every file in the system — a passport scan, a transcript, a profile photo, a university logo — goes through the same careful handling: it's checked for safety and given a random unguessable storage name, so a stranger can't just guess a web address and download someone else's passport. Profile pictures (avatars) are the one deliberate exception — treated as lightweight and disposable, since losing a profile picture is a trivial, instantly-fixable inconvenience, unlike losing an official document.

#### Step by step — uploading and later downloading a document

1. A file is selected (e.g. a passport scan for a document request).
2. The system checks its actual content matches an allowed file type for that specific kind of document (a passport photo must be an image; an academic transcript must be a PDF — the allowed list differs by document type), checks it isn't larger than the configured size limit, and checks it doesn't secretly contain hidden executable code.
3. It's saved to the server under a random, unguessable filename, and a fingerprint (checksum) of its exact contents is recorded.
4. When anyone later downloads that file, the system re-checks the fingerprint of what's actually on disk right now against what was recorded at upload time, refusing to serve it (and logging a security alert) if they don't match — protecting against silent corruption or tampering.
5. If a document needs to be replaced (e.g. a rejected document being re-uploaded), the old version isn't deleted — it's kept, marked as superseded, so there's a full version history.

#### Technical detail

- **Storage path pattern:** files live under a structured folder path by owner type and ID, with the actual on-disk filename being a random unique identifier — completely decoupled from the original, human-readable filename (which is instead reconstructed for the user, e.g. `StudentName_PassportFront_2026-07-09.pdf`, only when it's actually displayed or downloaded).
- **Download delivery:** files are streamed to the browser in small 8KB chunks rather than handed off in one go — appropriate for a shared-hosting environment without the more efficient "let the web server handle this directly" (`X-Sendfile`) option available on some other hosting setups.
- **Permanent deletion ("erasure"):** available to super admins only, requires typing a reason (which is permanently recorded), and removes the file from the server for good.
- **Avatars (profile pictures) are handled by an entirely separate, simpler path** — deliberately not run through the document-management system described above, because they're disposable and frequently replaced. Users can either pick from 13 pre-made illustrated avatars, or upload and crop their own photo (which is resized down to two small standard sizes and converted to a modern, efficient image format). No version history and no formal deletion workflow for avatars — they're treated as cosmetic, not as records.

#### Why it was built this way

- **Random storage filenames instead of the original filename:** if files were stored under predictable names (like the student's name, or a sequential number), a stranger could potentially guess or enumerate their way to documents that aren't theirs. A random identifier makes that guessing attack impossible — the only way to reach a file is through the application's own permission-checked download link.
- **8KB chunked streaming for downloads:** loading an entire large file into server memory at once, for every single download, risks exhausting the server's available memory under load — especially on a shared hosting plan with a modest memory ceiling. Streaming in small chunks keeps memory use flat and predictable no matter how large the file or how many people are downloading at once.
- **Avatars kept entirely separate from the formal document system:** running a profile picture through the full versioning and erasure-audit machinery built for legally/operationally important documents would be needless overhead for something a user can casually re-upload in ten seconds if they want to change it.

---

### 4.7 Activity Log & Audit Trail

#### In plain terms

Every meaningful action anyone takes in the system — approving an agent, changing an application's status, editing a setting — is permanently recorded: who did it, what they did, when, and to what. This record can never be edited or deleted by anyone, including super admins, through the normal application — it's a genuine, tamper-resistant audit trail, not just a log that happens not to have a delete button in the interface today.

Who gets to see whose activity depends on their role:

- A regular admin sees only **their own** actions by default.
- A super admin (or an admin specifically granted access to it) can see a **system-wide** "Super Activity Log" covering every action by every admin, agent, and student.
- An agent sees activity from themselves and — depending on their tier in the hierarchy — some or all of the agents beneath them (a Tier 1 agent sees their whole downstream network; a Tier 2 agent sees themselves and their direct recruits only; a Tier 3 agent sees only themselves).
- A student sees only their own actions.

#### Technical detail

- **Database-level enforcement, not just application logic:** no code path anywhere in the application ever attempts to update or delete an existing activity log row — confirmed by a full search of the codebase — and the production database is designed to have its own application database user restricted to `INSERT` only on this table, with no `UPDATE`/`DELETE` permission granted at the database engine level at all. Together, this means even a bug in the application code, or a compromised admin session, could not be used to alter or erase history from this table — the database itself would refuse the operation regardless of what the application asked it to do.
- **Actor names are recorded as a snapshot at the time of the action**, not looked up fresh every time the log is viewed — so the log still correctly shows "Jane Smith approved this agent" even if Jane's account is later renamed or deleted.
- **Personal/sensitive data is deliberately stripped before anything is written to the log** — password hashes, raw email/phone values, and session tokens are automatically removed from any "before/after" snapshot the log records, and any very long text value is truncated, so the audit trail itself never becomes a second place where sensitive data leaks out.
- **The agent-tier visibility rule** is powered by a single shared helper function that all four different "who can see this log" checks (admin-own, super-admin, agent, student) route through, so the tier-visibility logic only exists in one place and can't drift out of sync between different parts of the system.

#### Why it was built this way

- **Database-enforced insert-only, rather than just "the app doesn't have a delete button":** an audit trail is only actually trustworthy as evidence if it's structurally impossible to quietly alter, not merely inconvenient to alter. Enforcing this at the database permission layer means the guarantee holds even against a scenario where the application code itself has a bug or is compromised — the database is the actual backstop, not the interface.
- **Snapshotting the actor's name at write time:** a live-lookup approach would mean historical log entries silently change their displayed content if an account is later renamed, which is exactly the kind of subtle inaccuracy an audit trail cannot afford to have.

---

### 4.8 The Application Status Engine (State Machine)

#### In plain terms

Every student application moves through a defined sequence of stages — starting as a draft, moving to submitted, under review, offered, and (hopefully) enrolled, with branches for waitlisting, rejection, visa steps, and so on. The system enforces which stage changes are actually allowed — an application can't jump straight from "draft" to "enrolled," for instance — and every time a stage changes, several other things automatically happen at once: the student and their agent are notified, a note is added to the application's visible history, and (where relevant) a service-level countdown clock starts or stops (Section 4.9).

#### Technical detail

- **The full set of stages an application can be in:** `inquiry`, `profile_review`, `applied`, `documents_submitted`, `draft`, `submitted`, `under_review`, `offer_received`, `conditional_offer`, `unconditional_offer`, `waitlisted`, `enrolled`, `cas_coe_issued`, `visa_applied`, `visa_approved`, `visa_rejected`, `pre_departure`, `departed`, `deferred`, `rejected`, `withdrawn` — 20 stages covering everything from a first inquiry through to the student actually having departed for their destination.
- **Every stage change happens inside one all-or-nothing database transaction**, meaning if anything goes wrong partway through, nothing partial is saved — the application either fully moves to its new stage with every side effect applied, or nothing changes at all.
- **What happens automatically on a stage change:** the student's own overall profile status is recalculated from the *highest* stage reached by any of their applications (a student with three applications is considered further along overall than any single one of those three might individually suggest); the moment **any** application reaches `enrolled`, that student's assigned agent becomes permanently locked in (they can no longer be reassigned to a different agent — Section 6.10 covers reassignment in full); a note is added to the application's visible timeline; the student and their agent are each separately notified; and a service-level tracking clock (Section 4.9) is started, stopped, or cancelled as appropriate.
- **Withdrawing an application also automatically cancels anything still outstanding on it** — any document request still awaiting a response, and any payment request still pending, are both automatically marked cancelled at the same time, so nothing is left dangling asking a student for a document or a payment on an application they've already pulled out of.
- **Who is allowed to move an application to which stage is enforced separately, action by action**, rather than being one single unified rulebook — an admin with edit permission on Applications can move an application to any valid next stage; a student can only ever withdraw their own application (with a required reason) or, in one specific case, trigger a submission; an agent can do the equivalent on behalf of a student in their roster.

#### Why it was built this way

- **A single, centrally-defined map of legal next-stages, rather than scattering that logic across many different buttons/pages:** this guarantees the exact same rules apply no matter which portal or page is trying to move an application forward — there is one authoritative answer to "is this a legal stage change," used consistently everywhere.
- **Automatic profile-status rollup across all of a student's applications:** a student applying to five universities is, from TGA's perspective as a business, "as advanced as their most advanced application" — this reflects that directly, rather than requiring an admin to manually reconcile five separate individual statuses into one overall picture of where that student really stands.
- **Locking the assigned agent permanently once any application reaches "enrolled":** this protects agent commission integrity — once a student has actually enrolled (the point at which a commission is typically earned), it would be unfair and operationally confusing to let that student's agent assignment silently change afterward.

---

### 4.9 Service-Level Agreements (SLA) Engine

#### In plain terms

TGA has set internal response-time targets for itself — a submitted document should be reviewed within 48 hours, and a submitted application should get some kind of status update within 72 hours. The system tracks these targets automatically and flags — every 15 minutes — anything that's quietly gone past its target without anyone noticing, so nothing sits forgotten in a queue.

#### Technical detail

- **Current configured targets:** document review within 48 hours of submission; application review within 72 hours of submission.
- **How a target is tracked:** when a document or application enters the relevant "waiting for review" stage, a clock starts (an `sla_events` row is created with a target completion time). If review happens before that time, the clock is closed as "met." If the review deadline is reached first, a background job (Section 4.5, running every 15 minutes) marks it "breached" and alerts all super admins — each breached item is checked and notified independently, so a problem with one doesn't prevent any of the others found in the same check from being flagged. If the underlying item is withdrawn/cancelled before either of those happens, the clock is closed out rather than left dangling.

#### Why it was built this way

- **Automatic breach detection on a schedule, rather than relying on staff to notice a queue is aging:** the entire point of a service-level target is that it protects against things quietly slipping through the cracks during a busy week — a system that only reports on this if someone remembers to go looking defeats the purpose. Checking automatically, every 15 minutes, means a breach is caught and flagged within roughly that same window, every time, without depending on anyone's memory or workload that day.

---

### 4.10 System Settings

#### In plain terms

A small number of operational values that TGA might want to tune without needing a developer to change code — how long a login code stays valid, how many applications a student can have open at once — live on a Settings page, editable only by super admins. Not every setting anyone might imagine is actually present here; the ones shown have all been individually verified to genuinely affect the system's behavior when changed.

#### Technical detail

- **The current, real, actively-used settings** (each confirmed to be read by working code, not just displayed for show): login-code expiry time (default 10 minutes), maximum file upload size (default 10MB), how many of a student's applications can be "active" (not yet withdrawn or rejected) at once (default 3), how many simultaneous logged-in sessions one account may have (default 5), and a global "sign everyone out" trigger.
- **Two further settings (disk-space warning thresholds) exist and are genuinely read by the automated disk-monitoring job, but are deliberately hidden from the visible Settings page** — not because they don't work, but because they're only ever checked by a twice-daily background job rather than affecting anything in real time, so changing them wouldn't produce any visible, immediate effect worth exposing prominently right now.
- **How a saved change actually takes effect:** settings are cached in two layers — briefly in each running request's own memory, and more durably in a small file on the server — specifically so that reading a setting doesn't require hitting the database on every single request that needs it. Saving a change clears both cache layers immediately, so the *next* request picks up the new value; a request that was already mid-flight when the change was saved keeps using the value it started with.
- **Every settings change is individually logged** (old value, new value, who changed it, when) and shown on the Settings page itself as a "recent configuration changes" feed.

#### Why it was built this way

- **A settings page audited down to only genuinely-live fields, rather than a larger page with some inert entries:** a settings field that looks editable but silently does nothing when changed is worse than not having the field at all — it actively misleads whoever's using it into believing they've changed something they haven't. Removing anything confirmed dead, rather than leaving it in place for the sake of looking more configurable, keeps the page trustworthy.
- **Two-layer caching (in-memory + file) instead of reading straight from the database every time:** on shared hosting, without a dedicated fast in-memory cache service like Redis available, a small cache file on disk is a lightweight, dependency-free way to avoid a repeated database round-trip on every single request that needs a setting value — meaningfully faster at essentially no added complexity.

---

## 5. The Admin Portal — End to End

The Admin portal (`/portal/admin/...`) is TGA's internal operations center. Every feature below is reached from the sidebar navigation, and — with the exception of the Dashboard and the admin's own Profile page, which every admin can always see — every single one of them is individually switched on or off, and set to read-only or full-access, per admin account, exactly as described in Section 4.3.

### 5.1 Dashboard (Overview)

**What it does:** The admin's home screen — a live snapshot of the whole operation (pipeline counts, agent/document/university totals), a system-wide activity feed, and three action queues (pending agent approvals, pending document reviews, pending payment verifications) an admin can act on directly from this one page.

**Step by step:**
1. On login, every admin lands here first.
2. Four headline counters (total applications, pending agents, pending documents, active agents) sit at the top, alongside a link into the full Reports console.
3. Four metric cards show live counts — active pipeline cases, student accounts, shared universities, and shared programs.
4. A "recent stage movement" panel shows the last 5 applications that changed status anywhere in the system.
5. A system activity feed shows recent actions — scoped to just the logged-in admin's own actions, unless they've been separately granted access to the system-wide Super Activity Log (Section 4.7), in which case this feed shows everyone's activity.
6. Three action queues — pending agent approvals, pending document reviews, pending payment verifications — each show up to 6 items with one-click Approve/Reject (or Verify/Dispute) actions right there, without needing to navigate to the full Agents/Applications pages at all.
7. The whole page quietly refreshes itself every 30 seconds, so a second admin's approval elsewhere shows up here without needing a manual page reload.

**Technical & business notes:**
- The counters and metric cards are computed live from the database on every page load (not from the once-a-day pre-computed report snapshots used by the full Reports console — see 5.12 for why those two approaches differ).
- Every admin sees the dashboard's action queues regardless of their individual page grants — but the Approve/Reject/Verify buttons within them only appear if that specific admin actually holds the matching permission (agent approval, document review) elsewhere in the system; otherwise the queue is still visible but read-only.

---

### 5.2 University Catalog Management

**What it does:** Maintains the master list of partner institutions — the same catalog that powers what students and agents browse when applying.

**Step by step:**
1. The Universities page lists every partner **institution** (not every individual campus — see below), switchable between a grid (with logos) and table view, searchable by name, country, city, or even by a course/intake name inside that institution (e.g. searching a specific course name correctly surfaces its parent institution).
2. Two filters narrow the list: a text search, and a partnership-type filter (**All / Exclusive / Non-exclusive**).
3. "Add University" opens a short form (name, country, city, website, exclusive/non-exclusive partnership type); saving takes the admin straight to that institution's own detail page to finish filling it in.
4. On the detail page, every field (name, country, city, website, partnership type, description, ranking/fact info) can be edited in place — double-click the field, type, it saves itself immediately, no separate "save" button or page reload needed for each field.
5. A logo can be uploaded (hovering over the current logo reveals an upload icon); the system automatically generates a smaller thumbnail version for use in lists.
6. A university can be marked active or inactive with one click on its status badge (inactive universities stop appearing to students/agents browsing to apply, but remain visible and editable to admin staff).
7. Additional campuses of the same institution can be added as linked "sibling" entries (see below) directly from the detail page.
8. Deleting a university requires confirming a warning dialog.

**Technical & business notes:**
- **Multi-campus universities:** rather than storing a list of campus names against one university record, each campus of a multi-campus institution is modeled as its own **fully independent** university record — with its own courses, fees, intakes, applications, status, and logo — linked to its siblings only by sharing a common group identifier. This means, deliberately, that adding a new campus starts that campus with **no** courses or fees copied over from the main campus — TGA's own explicit instruction during the original data import was that assuming a new campus offers identical courses at identical prices to its "parent" campus would be guessing, not knowing, and the system should never silently guess.
- **The list an admin sees is grouped to one card per real-world institution**, not one card per campus row — a 2-campus institution shows once, with a "2 campuses" badge and a course count summed across both campuses. Opening it goes to the detail page, which shows an "Other Campuses" panel for switching between the institution's individual campuses. (Behind the scenes, every other page that needs to pick one *specific* campus — Courses, Intakes — still lists campuses individually, since a course or intake always belongs to exactly one campus, not to the institution as a whole; see Sections 5.3/5.4.)
- Search reaches into a university's courses and intakes (not just its own name/location fields) via an efficient database technique (`EXISTS` subqueries) chosen specifically to avoid inflating or duplicating result counts, which a more naive join-based search would risk doing once a university has dozens or hundreds of courses. Searching a term that only matches one campus of a multi-campus institution still correctly surfaces that institution's card.

**Why it was built this way:** Treating each campus as a fully independent record (rather than a sub-list under one "master" university) means every downstream feature — applications, fees, intakes, reporting — already works correctly for a specific campus without needing any special-case logic anywhere else in the system. The trade-off is that adding a tenth campus of the same university means re-entering (or copying, campus by campus) that university's course catalog — accepted deliberately, in favor of never showing fee or course information that hasn't actually been confirmed for that specific location. Grouping the *list view* back down to one card per institution (while keeping every other page campus-specific) exists purely so admin staff aren't scrolling past duplicate-looking rows for one institution's several campuses.

---

### 5.3 Course Catalog

**What it does:** Manages the individual academic programs (courses) offered under each university.

**Step by step:**
1. A single, flat Courses page lists every course across every campus (searchable by course or university name) — built this way specifically so an admin never has to click into 300+ individual university pages one at a time just to find or fix one course.
2. Filtering down to one institution is a two-step pick: choose the **institution** first, then — only if that institution has more than one campus — a second dropdown appears to choose the specific **campus** (each campus is labeled with its city so same-named sibling campuses are never ambiguous, e.g. "Alexander College — Larnaca" vs. "Alexander College — Paphos"). A single-campus institution skips straight to filtering, no extra click needed. The "Add Course" form uses the identical two-step picker to choose which specific campus a new course belongs to.
3. Every visible field (name, degree level, duration, language, status) can be double-click-edited directly in the list, the same in-place-editing pattern used on the University detail page.
4. Deleting a course shows an explicit warning that doing so will also close every one of its intakes (enrollment windows) — this cannot be undone.

**Technical & business notes:**
- **Fees live on the intake, not the course.** A course itself has no price; each of its intakes (enrollment terms) carries its own tuition figure, because fees genuinely can and do change term to term. Updating a course's "fee" from the Courses page is really a convenience shortcut that applies the new figure to every one of that course's currently-open or upcoming intakes at once — it deliberately refuses to run if the course has no open/upcoming intake to apply a price to yet.
- A course always belongs to one specific campus, never to a whole multi-campus institution at once — this is why filtering and creating both need the institution-then-campus picker rather than just an institution picker.

---

### 5.4 Intake Management

**What it does:** Manages the specific enrollment windows ("intakes" — e.g. "Fall 2027 Intake") within each course, including their fees, key dates, and open/closed status.

**Step by step:**
1. A flat, cross-course Intakes page (same reasoning as Courses, above), filterable by institution → campus → course (the same two-step institution/campus picker described in Section 5.3, with the course dropdown then scoped to whichever campus is selected), searchable, and filterable by status.
2. "Create Intake" uses the identical institution → campus → course cascade to pick exactly which course the new intake belongs to, then collects the intake name, month/year, application deadline, course start date, tuition fee and currency, an initial status, and any special requirement notes.
3. Each row offers **Clone Intake** — instantly creates a new intake for the next term by copying over the course, month/year, fee, and requirement notes, but deliberately leaves the actual dates blank and resets status to "upcoming," so the admin is prompted to fill in the genuinely-new information (dates) rather than accidentally publishing a clone with last term's already-passed deadline.
4. Status can be moved forward — upcoming → open → closed — but **never backward**: once an intake is closed, it stays closed permanently and cannot be reopened, by design.
5. Deleting an intake that already has real student applications against it is blocked with a clear explanation, rather than silently orphaning those applications.

**Technical & business notes:**
- A validation rule refuses to save an intake whose application deadline is on or after its course start date — a basic sanity check against a genuinely impossible schedule ever being entered by mistake.

**Why "closed" intakes can never reopen:** re-opening a closed intake after students and agents have already been told it's closed would create real confusion about whether a since-missed deadline is actually still valid — closing that door permanently, and cloning a fresh intake for the next term instead, keeps the historical record of exactly when each specific term was actually open completely unambiguous.

---

### 5.5 Students — Directory, Detail Page & Custom Fields

**What it does:** Lets admin staff search and browse every student in the system, and drill into one student's complete profile — identity, academics, documents, applications, and any custom information TGA has chosen to collect beyond the system's built-in fields.

**Step by step:**
1. The Students list is searchable by name/ID/email/phone, filterable by profile status and by whether the student registered themselves, was registered by an agent, or has no agent at all.
2. Clicking a row opens a quick-preview panel (contact info, assigned agent, nationality, registration date) with a link through to the full profile.
3. The full Student Detail page shows, in order: identity and contact details, academic history, standardized test scores, the student's document checklist (with a "View" button on anything already uploaded), their applications, and an "Additional Information" section (see custom fields, below).
4. A "Manage Custom Fields" button opens a field-builder panel where an admin can add new questions for students to answer — as short text, a paragraph, a number, a date, a dropdown list of choices, or a file upload — reorder them by dragging, mark them required or optional, and later retire (soft-delete) ones no longer needed without losing any answers students already gave.

**Technical & business notes:**
- Because email and phone are encrypted (Section 4.2), searching by them uses the same exact-match and "starts with" hash technique described there — a full partial/substring search across every student's email or phone isn't technically possible without decrypting the whole table, so it's intentionally not offered; what's offered instead (exact match, or the first several characters) covers the realistic search need without that cost.
- A retired (soft-deleted) custom field's previously-submitted answers are preserved, not deleted — a student's answer to a question TGA later stops asking is still kept on their record.

---

### 5.6 Agent Reassignment Requests

**What it does:** The review queue where admin staff approve or deny a student's request to change which agent is looking after them.

**Step by step:**
1. Requests default to showing only ones still awaiting a decision, searchable by student name.
2. Each row shows the student, their current agent, the agent they've requested (or "Auto-assign" if they left that blank), their stated reason, and when they asked.
3. **Approve** opens a panel summarizing the change; if the student left the "who to" question blank, the admin must pick an agent to assign; if the student did name someone, the admin can still override that choice with a different agent if there's a good operational reason to. The agent picker shows a browsable list of agents as soon as it's opened — an admin doesn't need to already know an agent's exact name or referral code to find them.
4. **Deny** just asks for an optional internal note.
5. On approval, the student's file updates immediately, and three separate notifications go out at once: the student is told their new agent, the previous agent (if there was one) is told they've lost this student, and the new agent is told they've gained one.

**Technical & business notes:**
- The approval itself is protected against a race condition — if two admins somehow tried to approve the same pending request at the exact same moment, the database-level row lock guarantees only one of them actually succeeds, and the second sees a clear "already processed" message rather than silently double-processing the same request.
- A student cannot request reassignment at all once any of their applications has reached "enrolled" status — their agent is permanently locked in at that point (Section 4.8) — and cannot submit a second request while one is already pending.

---

### 5.7 Agents Management

**What it does:** The complete lifecycle for TGA's recruitment partners — reviewing new applications, approving or rejecting them, suspending a partner if needed, and visualizing the full multi-level partner hierarchy.

**Step by step:**
1. Five tabs organize the work: **Registered** (signed up but haven't started onboarding yet), **Drafts** (started onboarding, saved, not yet submitted), **Submitted** (awaiting review — the main queue), **All Agents** (the full roster, searchable and filterable), and **Hierarchy** (the tree view, below).
2. Opening a submitted application shows their full profile and their 3 required onboarding documents (profile photo, government ID, CV), each individually viewable.
3. **Approve** generates that agent's unique referral code and activates their account immediately.
4. **Reject** requires no reason but allows one to be given; the agent's account stays active so they can log back in, see why, and resubmit — rejection is not a permanent ban, it's a "not yet, please fix this" outcome.
5. **Suspend** (only available on an already-approved agent) requires a typed reason, and immediately signs that agent out of every device they were logged into anywhere — a real-time, no-delay lockout, not something that only takes effect the next time they'd try to log in.
6. The **Hierarchy** tab lets an admin pick any top-level (Tier 1) agent and see their entire downstream network as an expandable tree — each node showing tier, agency, country, contact email, referral code, and status.

**Technical & business notes:**
- Approving an agent generates a short, human-typeable referral code (format like `TGA-XXX999`), automatically checked for uniqueness.
- Once approved, an agent cannot simply be rejected again if something's wrong later — Suspend is the correct tool for an already-approved agent; Reject is only for a still-pending application.
- The hierarchy tree is built with a recursive database query that can efficiently walk an arbitrarily deep tree in one request, with parent/root internal identifiers stripped out of what's actually sent to the browser (a small extra privacy step, since those internal linking IDs aren't meaningful or safe information for a browser to hold).

---

### 5.8 Applications Management

**What it does:** The central operational view of every student application in the pipeline — moving an application through its stages, requesting and reviewing documents, requesting and confirming payments, and keeping a running notes/history timeline on each one.

**Step by step:**
1. The Applications list is searchable by reference number, student, course, or university, with filters for status, university, and year.
2. Opening an application (or arriving via a direct link, e.g. from a search result or a notification) takes the admin to that application's own dedicated page — a full, responsive view rather than a narrow side panel, laid out as a header summary (student, reference number, status, university/course/intake/tuition/agent) with the working sections — Move Application, Document Requests, Payments — alongside a running Timeline, reflowing to a single stacked column on a smaller screen.
3. **Moving the status forward:** only the button(s) for stages that are actually a legal next step from the application's current stage are shown — exactly mirroring the rules described in Section 4.8 — so an admin physically cannot attempt an invalid jump from the interface itself.
4. **Withdrawing** an application (available from most stages, not just early ones) requires typing a reason.
5. **Requesting a document:** the admin describes what's needed and an optional deadline; the student (or their agent, on the student's behalf) uploads it; the admin then Approves or Rejects it (rejection requires a reason, and loops the request back to "waiting for a document" so it can be resubmitted); a still-outstanding, not-yet-submitted request can also simply be cancelled. Once a document has been approved, it's locked — neither the student nor their agent can replace it with a different file afterward, keeping an approved document from ever being silently swapped out without a fresh review.
6. **Requesting a payment:** the admin describes the fee, amount, currency, an optional payment link, and an optional due date; once the student (or agent) marks it as paid, the admin Confirms or Disputes it; a disputed payment can later be resolved back to confirmed, or cancelled outright.
7. A running **Timeline** on the application records every status change, every document/payment event, and any free-text note an admin chooses to add — each note can optionally be marked visible to the assigned agent or admin-internal only, and an admin can delete a note they personally added.

**Technical & business notes:**
- Every one of the actions above (status change, document request/review, payment request/verification, notes) runs through the same central state-management system described in Section 4.8, so the automatic side effects (notifications, timeline entries, SLA clocks) described there apply uniformly no matter which specific action triggered them.

---

### 5.9 Commissions

**Current status: not yet available for use.** Opening this page shows admin staff a message that it's still being finished, and blocks any interaction with the page until they navigate away via the sidebar. This is a deliberate hold, not a bug — TGA asked for the page to stay closed off while final checks continue.

**What it's for, once released:** a ledger tracking what commission each agent has earned on each successfully placed student — a pending → confirmed → paid lifecycle, with the confirmed figure permanently locked the moment it's confirmed, enforced independently both by the application itself and, as a backstop, by the database directly — so it can never be silently altered afterward, by any means. This matters because these figures ultimately drive real payouts to real business partners.

---

### 5.10 Leads Pipeline

**Current status: not yet available for use**, for the same reason and in the same way as Commissions above — the page currently blocks interaction with a "still being finished" message.

**What it's for, once released:** a visual kanban board for prospective students who haven't yet become real applicants — capturing interest from the public website's enquiry form and moving each one through New → Contacted → Qualified → (Converted, which creates a real student account directly from the lead's details, or Dropped). The public-facing capture form that feeds this board only accepts submissions from TGA's own official website, as a defensive measure against spam.

---

### 5.11 Notices

**What it does:** Publishes announcements and events to a chosen audience (students, agents, and/or admin staff, in any combination) using a proper rich-text editor.

**Step by step:**
1. An admin with editing rights on this page writes a notice using a formatting toolbar (bold, headings, lists, links, etc.) — admins without editing rights see a clean read-only feed of published notices instead, filterable and sortable, with no editor visible at all.
2. At least one audience checkbox (Students / Agents / Admin Staff) must be ticked before a notice can be saved.
3. Saving either stores it as a draft (visible only inside the Admin portal, not yet sent to anyone) or, if "publish and notify immediately" was checked, publishes it right away.
4. Publishing sends the notice out to everyone in the chosen audience(s) at once, both as an email and as an in-app notification.
5. An optional expiry date can be set (shown clearly on the notice once it's close to or past that date), and an optional file (image or PDF) can be attached.
6. If the notice type is "Event" rather than a general notice, two extra fields appear for the event's date/time and location.
7. An admin with delete rights can remove a notice; like everywhere else in the system, this is a soft delete (Section 4.6) rather than a permanent destruction.

**Technical & business notes:**
- Any rich-text formatting a notice contains is deliberately filtered down to a safe, limited set of formatting tags before being saved or shown to anyone — headings, bold/italic/underline, lists, quotes, code, and links — with every other HTML attribute stripped from what remains, including on tags that are otherwise allowed. A link is individually checked too: only ordinary web addresses, email links, and same-site links are kept, and anything else (including a disguised "run this code" link hidden inside what looks like a normal link) is removed. This prevents a notice — even one written by a trusted admin, as a safety-in-depth measure — from ever being able to embed hidden scripts or unsafe click-triggers, not just unsafe tags.
- Publishing to a large audience is sent in batches of 1,000 recipients at a time internally, so publishing a notice to TGA's entire student base doesn't attempt one enormous, fragile all-at-once operation.

---

### 5.12 Reports & Exports

**Current status: not yet available for use**, for the same reason as Commissions and Leads above.

**What it's for, once released:** TGA's analytics console — six views into the health of the business (executive overview, recruitment funnel, agent performance rankings, university performance, lead-source effectiveness, and a custom trend chart), plus the ability to export Students, Applications, Agents, or Commissions data to Excel, CSV, or PDF. The numbers are designed to come from a once-a-day pre-calculated snapshot (Section 4.5) rather than a live query on the spot — heavy correlating-everything-across-everyone calculations like these would slow the shared server down for every user if run fresh every time someone opened a report, so they're computed once, overnight, and simply read back instantly whenever a report tab is opened. Exporting raw data specifically requires an admin to hold both the general Reports permission *and* their own view access to that specific data type (e.g. exporting student records needs Students view access too) — access to summary dashboards alone doesn't also unlock bulk-downloading raw records from a section that admin can't otherwise see.

---

### 5.13 Users — Admin Accounts & Page-Access Grants

**What it does:** Where super admins create and manage the accounts of TGA's own internal staff, and configure exactly what each one can see and touch, as introduced in Section 4.3.

**Step by step:**
1. A stats bar shows total staff, active, suspended, and how many are super admins, at a glance.
2. "New Admin" (visible only to super admins) collects name, email, phone, a password, whether this new account should itself be a super admin, and — if not — the full page-access grid described in Section 4.3, with "grant everything" and "clear everything" shortcuts and a running count of how many of the 14 pages are currently granted.
3. Existing accounts can be activated or suspended (available to any admin with user-management editing rights, on anyone except themselves), and — super-admin-only — have their page-access grid edited, or be deleted outright.
4. Super admin accounts are structurally protected throughout this page: a super admin cannot demote, suspend, delete, or edit the access of another super admin (or themselves) from this interface at all — that status, once granted, can only be changed through direct database access, deliberately outside the reach of the ordinary interface.
5. On smaller screens, the same information and actions are presented as a stacked card list instead of a wide table, rather than an unusably cramped table.

**Technical & business notes:**
- Creating and deleting admin accounts is restricted to super admins at the database-check level, not merely by what buttons happen to be shown — even a direct request to those actions from someone who isn't a super admin is independently rejected by the backend.
- A page-access change is confirmed to the admin making it with an explicit note that it takes effect the next time the affected admin's session refreshes, not necessarily instantly if they already have the portal open (the reasoning is the same as covered in Section 4.3).

---

### 5.14 Settings

Covered in full in **Section 4.10**. From this page specifically: settings are grouped into cards by category, each with its own "Save" button, and a "Recent Configuration Changes" feed at the bottom shows the last 10 setting edits anyone has made, with who and when.

### 5.15 Activity Log & Super Activity Log

Covered in full in **Section 4.7**. In the Admin portal specifically: a regular admin sees a page simply titled "Activity Log," always scoped to their own actions only, with no way to broaden it. A super admin is automatically taken straight to the system-wide "Super Activity Log" instead (their own personal log would be redundant for them, since they can already see everyone's). Both pages support filtering by date range and a free-text search box. On the Super Activity Log specifically, an additional "Actor Type" filter lets an admin narrow the feed down to just admin actions, just agent actions, just student actions, or just automated system/cron actions.

---

### 5.16 Security Events

**What it does:** A plain-English, admin-facing view into the security log described in Section 4.2 — every login attempt, password reset, two-factor event, and rate-limit trigger, explained in ordinary language rather than raw technical codes.

**Step by step:**
1. Three clickable summary tiles (by severity — critical, warning, informational) both show counts and act as quick filters.
2. Every event type the system can log is translated into a short plain-language label and description (e.g. a failed login attempt is shown as "Password did not match," not a raw error code), and additionally colour-coded by how serious it is.
3. Events can be filtered by type, searched by free text, and browsed with full context — including, where relevant, who the event actually involved.

**Technical & business notes:**
- **Whose name is shown is itself permission-checked, separately from the Security page's own access grant.** An admin who has been given access to the Security page but *not* to, say, the Students directory, will see a security event that involved a specific student described only as "student account — name hidden from your access level," not the student's actual name. The reasoning: being allowed to see that a security event happened is not the same thing as being allowed to know exactly whose data was involved, and the system deliberately does not let visibility into one page leak identity details that belong to a different, separately-controlled page.

**Why:** Security logs, almost by definition, reference people and accounts across the whole system — but access to the Security page and access to (say) the Students directory are two entirely separate grants an admin might or might not both hold. Without this extra check, granting someone only the narrow Security page would accidentally also hand them a way to learn real names of students or agents they were never meant to see — a genuine access-control gap the system closes deliberately.

### 5.17 Global Search (Admin View)

Covered in full in **Section 8**, alongside the student and agent portal versions of the same feature.

### 5.18 Admin Profile & Avatar

**What it does:** Every admin's own self-service page — edit their display name, change their password, and manage their profile picture, exactly as described for students and agents in Section 4.1 and 4.6.

**Step by step:**
1. Full name is editable; role (Admin / Super Admin) and "admin since" date are shown but not editable, since those are administratively controlled elsewhere.
2. A collapsible password-change panel requires the current password plus a new one entered twice.
3. The avatar picker offers the same 13 preset illustrated avatars or a custom upload-and-crop, described fully in Section 4.6.

There is no permission gate on this page at all beyond simply being logged in as an admin — every admin, regardless of what else they've been granted access to, can always manage their own profile and password.

---

## 6. The Agent Portal — End to End

The Agent portal (`/portal/agent/...`) is where TGA's recruitment partners work — building a roster of students, applying on their behalf, growing their own referral network, and tracking what they're owed.

### 6.1 Registration, Onboarding & Approval

Covered in step-by-step detail in **Section 4.1**. To recap the parts specific to the agent experience once logged in:

- A brand-new agent is automatically routed to a short onboarding form the moment they log in, rather than being shown a normal (but mostly-empty) dashboard.
- The onboarding form asks for address, city, state (currently modeled for Indian addresses specifically — there's no country selector on this particular form), and an alternate mobile number, alongside 3 required documents: a profile photo, a government ID (Aadhar card), and a CV/resume.
- The agent can save an incomplete onboarding form as a draft and come back to it later, or submit it for review once complete.
- While waiting for a decision, the agent sees a clear "your application is under review" screen instead of the normal portal.
- If rejected, the agent sees the admin's stated reason (if one was given) and can edit their submission and resubmit — rejection is not permanent.
- If suspended after having been approved, the agent is immediately signed out everywhere and, on their next login attempt, sees the same "action needed" screen with the suspension reason.

### 6.2 Agent Dashboard

**What it does:** The agent's home screen — a snapshot of their network's size and performance, their commission position, and recent activity.

**Step by step:**
1. Four headline numbers: how many students are in the agent's network (their own plus, depending on tier, their sub-agents'), how many of those have enrolled, their overall conversion rate, and their earned commission total.
2. A pipeline breakdown shows how many network students are newly registered, in progress, or enrolled.
3. An "Agency Network" panel shows how many sub-agents this agent has recruited (and how many of those are still pending approval), with a link into the full Team page — this panel is naturally empty for a Tier 3 agent, since Tier 3 agents cannot recruit sub-agents at all (Section 6.3).
4. Recent commission activity and a recent-activity feed round out the page.

**Technical note:** the commission figures shown directly on this dashboard are always the agent's own direct earnings only — never blended together with anything their sub-agents have separately earned — to avoid a misleadingly inflated headline number; a full, separate breakdown of sub-agent commission performance is available on the Commissions page itself (Section 6.9).

### 6.3 The Agent Hierarchy & Tier System

**What it does:** TGA's agent network can be up to 3 levels deep — a Tier 1 agent can recruit Tier 2 sub-agents, who can in turn recruit Tier 3 sub-sub-agents, at which point that particular chain stops growing.

**In plain terms:** think of it like a small sales team structure. A Tier 1 agent is effectively running their own agency and can build out sub-partners under them; those sub-partners can, in turn, build out their own smaller networks; but the system enforces a hard ceiling at 3 levels so the structure can't spiral into something unmanageably deep.

**Step by step — building a network:**
1. A Tier 1 or Tier 2 agent (never Tier 3 — the "Invite Sub-Agent" option simply doesn't appear for a Tier 3 agent's account) opens their Team page and invites a new sub-agent, providing their name, agency, country, email, and a temporary password.
2. The new sub-agent's tier is automatically one level below the person who invited them.
3. The Team page shows the agent's own direct recruits, with each one expandable to reveal their recruits in turn — letting an agent see two levels down from wherever they're standing, which combined with each level being able to see the level below covers the full 3-tier structure end to end.
4. Every approved agent has a unique, shareable referral code and two ready-made referral links (one for inviting a new student to register directly under them, one for inviting a new sub-agent) available from their own Profile page.

**Technical detail — how the system checks who can see which students, efficiently:**

Rather than the system needing to walk a whole family tree of agents every single time it checks "is this agent allowed to see this student," each agent record stores two things: who directly recruited them (`parent_agent_id`), and — critically — the identity of the Tier 1 agent sitting at the very top of their specific branch of the tree (`root_agent_id`), set once, at the moment they're created, and never recalculated. A Tier 1 agent's visibility check becomes a single, instant comparison ("does this student's agent share my same top-of-tree identifier?") rather than a potentially slow recursive search through every level of the tree on every single page load. A Tier 2 agent's check is similarly simple: their own students, plus students belonging to agents who list *them* specifically as the direct parent. A Tier 3 agent's check is simplest of all: only their own directly-assigned students. These boundaries are enforced on every single request, not just in what the interface happens to show — an agent cannot view, retrieve, or act on a student outside their own branch of the hierarchy by any means, including by directly addressing a record they aren't supposed to have access to.

**Why it was built this way:** A tree that has to be walked level-by-level to answer "can this person see this record" gets measurably slower as the network grows deeper and wider — exactly the kind of cost that compounds badly over time as TGA's partner network expands. Pre-computing and storing the top-of-tree identifier once, when an agent is created, converts every future visibility check into the fastest possible kind of database lookup, no matter how large the overall network eventually becomes.

### 6.4 Student Roster & Student Detail

**What it does:** Lets an agent see and review the students assigned to them (and, depending on their tier, students belonging to their sub-agents).

**Step by step:**
1. The Students list is searchable, filterable by profile status, and filterable down to one specific sub-agent from a dropdown (limited to the agent's direct recruits — an agent can't drill straight into a grandchild sub-agent's roster from this one dropdown, only into their own direct reports').
2. Opening a student shows a read-only, comprehensive profile: identity and contact details, academic history, test scores, their document checklist with view access to anything uploaded, and their applications.
3. There is no in-place editing on this page — an agent wanting to change something about a student's profile does so through the same "Complete Application Details" flow used to originally set that information up (Section 6.6), not by editing the detail page directly.

### 6.5 Registering a New Student

**What it does:** Lets an agent create a brand-new student account directly, for a prospective student they're talking to who hasn't signed up themselves — for example, over a phone call or in person.

**Step by step:**
1. The agent enters just the essentials: the student's full name, email, and mobile number.
2. The account is created immediately — no email verification code, no waiting.
3. The agent is then taken straight into the same "Complete Application Details" form a student would fill in themselves (Section 7.3), to add the student's fuller profile and documents on their behalf if they have that information to hand.
4. The student can log in afterward using a one-time emailed code, or by resetting their password — never with a password an agent was given or told, because no such password is ever shown to the agent or emailed to the student (Section 4.1 explains this fully).

**Why it was built this way:** many prospective students are recruited through a genuine conversation, not a self-service web form — an agent needs to be able to get someone into the system on the spot, without making that student sit through their own registration flow mid-conversation, while still never compromising on the rule that nobody except the student themselves ever knows their password.

### 6.6 Applying on a Student's Behalf

**What it does:** Lets an agent start (and, if needed, finish) an application for a student in their roster — whether that's an existing student they already manage, or a brand-new one created on the spot.

**Step by step:**
1. From the Universities/Courses/Intakes browse pages (identical browsing experience to what a student sees — Section 6.8), the agent clicks "Apply for Student" on any open intake.
2. A picker lets the agent either search their existing roster for the right student, or choose "New Student" to create one on the spot (chaining directly into Section 6.5's flow, with the intake they were just looking at already pre-selected).
3. Exactly the same rules apply as when a student applies for themselves (Section 4.8, Section 7.2): if the student's profile is already complete enough, the application submits immediately; if not, the agent is taken into the same "Complete Application Details" form to finish it, on the student's behalf.
4. The application record itself keeps a permanent note of who actually started it — the agent, the student, or an admin — separate from which agent is the student's assigned agent of record, so this distinction is never lost even if the student's agent later changes.

An agent can only ever do this for a student genuinely within their own roster — attempting to start or manage an application for a student outside their network is rejected, the same hierarchy boundary described in Section 6.3.

### 6.7 Applications Overview

**What it does:** A single read-only table showing every application across the agent's whole visible network (their own students, plus, depending on tier, their sub-agents' students) — a monitoring view, not an action page.

**Step by step:** filterable by status and by owning agent (the whole network, just the agent's own direct students, or one specific direct sub-agent), showing the student, university/course, application reference, status, and key dates. To actually act on a specific application — change something, add a note — an agent goes through the relevant student's own detail page or the original apply flow, not from this table directly.

### 6.8 Browsing Universities & Courses

**What it does:** The same university/course/intake browsing and drill-down experience described for students in Section 7.5, available to agents for the purpose of applying on a student's behalf rather than applying for themselves — see Section 6.6.

### 6.9 Commissions (Agent View)

**Current status: not yet available for use**, matching the equivalent admin-side page (Section 5.9) — agents see the same "still being finished" hold when they open this page.

**What it's for, once released:** an agent's own commission ledger — their own direct earnings (pending, confirmed, paid), kept separate from a read-only summary of what their downstream sub-agents have earned (Tier 1 and 2 only, since Tier 3 agents have no sub-agents). Approving, confirming, or paying out a commission is, and will remain, an admin-only action (Section 5.9) — an agent's view here is always for tracking, not action.

### 6.10 Requesting a New Agent (from the student's side, and the agent notification that results)

An agent's own portal doesn't have a page to *initiate* a reassignment — that action belongs to the student (Section 7.6) or to an admin acting on the student's behalf. What an agent does see, on their own Profile page, is a live count of "students requesting to join you" — a running tally of how many pending reassignment requests currently name *this* agent as the one being requested. If a reassignment is later approved, both the agent who's losing the student and the agent who's gaining them are separately notified the moment it happens (Section 4.4).

### 6.11 Notices (Agent View)

The same notices system described in Section 5.11, filtered to whatever's been published with the "Agent Partner Users" audience checkbox ticked. Purely a read-only feed for agents — there is no agent-side authoring of notices.

### 6.12 Activity Log (Agent View)

Covered in the general pattern in Section 4.7. For agents specifically: the log an agent sees is automatically scoped to their tier-appropriate visibility — a Tier 1 agent sees activity from their entire downstream network, a Tier 2 agent sees their own activity plus their direct recruits' activity (not their recruits' recruits), and a Tier 3 agent sees only their own activity. This uses exactly the same underlying tier logic described in Section 6.3, applied to the activity log instead of the student roster.

### 6.13 Agent Profile & Avatar

The same self-service profile page pattern described for admins in Section 5.18 and students in Section 7.9 — editable agency name and country (full name is fixed once set, matching the identity used at registration), the password-change panel, and the same avatar picker. Additionally shown here: the agent's status badge, their unique referral code with a one-click copy-to-clipboard button, and (as mentioned in 6.10) a notice if any students are currently requesting to join them.

---

## 7. The Student Portal — End to End

The Student portal (`/portal/student/...`) is what a prospective or current student sees — from browsing universities through to tracking a live application.

### 7.1 Overview (Dashboard)

**What it does:** The student's home screen — how many applications they have and at what stage, what's still needed from them, and quick access to their assigned consultant and to browsing universities.

**Step by step:**
1. If the student's core profile isn't yet complete enough to actually submit an application, a completion panel is shown right on this page (the same one covered in Section 7.3) so they can finish it without needing to hunt for it elsewhere.
2. Six headline stat tiles: total applications, how many are open/in progress, how many are in review, how many offers received, how many enrolled, and how many unread notices.
3. A "Documents Needed" card lists any outstanding document requests still waiting on the student.
4. A "Payments Due" card lists anything owed, with a one-click "Mark as Paid" action (Section 7.8).
5. A "Your Consultant" card shows the student's assigned agent (if any), with a link into the full agent page (Section 7.6).
6. A "Browse Universities" card and a recent-activity feed round out the page.

### 7.2 Applications — Starting, Tracking & Managing

**What it does:** Where a student sees every application they've started, in whatever stage each one is currently at, reorders which universities matter most to them, and manages (or withdraws) any individual one.

**Step by step — starting an application:**
1. A student clicks "Apply" on a specific intake while browsing (Section 7.5). This immediately creates the application (in a "draft" state) — there's no separate "are you sure, is your profile ready" gate blocking the click itself.
2. If the student's core profile is already complete enough (from a previous application), the new one is submitted automatically, right away, with no further steps needed.
3. If not, the student is taken straight into the "Complete Application Details" flow (Section 7.3) for that specific application, and it submits automatically the moment that flow is finished.

**Step by step — managing existing applications:**
4. Every application is listed with its current stage clearly shown.
5. Where a student has more than one *active* (not withdrawn or rejected) application, they can drag and reorder them by personal preference — this ordering is purely informational for the student and TGA's own planning purposes, and doesn't itself change how any application is actually processed.
6. Opening an application shows its course details, any outstanding document or payment requests (with quick actions), and a read-only history/timeline of everything that's happened on it so far.
7. **Withdraw Application** is available on any application that hasn't already reached "enrolled" or "rejected" — including a still-draft one — and requires typing a reason.

**Technical & business notes:**
- **There is a cap on how many applications a student can have "active" at once** — by default 3 (adjustable by a super admin in System Settings, Section 4.10) — counting anything that isn't already withdrawn or rejected. Trying to start a 4th active application is blocked with a clear explanation, not a silent failure.
- A student cannot have two separate draft applications open for the exact same specific intake at the same time.

### 7.3 Completing Application Details (Profile Completion)

**What it does:** The one shared form — used identically whether a student is filling it in for themselves, or an agent is filling it in on a student's behalf — that gathers everything TGA needs before an application can actually be submitted: personal details, academic history, and required documents.

**Step by step:**
1. **Personal Details:** gender, an alternate mobile number (optional), how they heard about TGA, and — only when a student is doing this for themselves, not when an agent is filling it in on their behalf — an optional field to assign themselves an agent, right here, if they haven't got one already. This field shows a browsable list of approved agents as soon as it's opened, narrowable by typing a name, agency, or referral code — a student doesn't need to already know an exact code to use it. (A student's core name, primary mobile number, and passport details are deliberately not editable from this particular form — those live on the separate Profile page, Section 7.9, to keep this form focused on what's actually needed to get an application moving.)
2. **Academic History & Test Scores:** the student can add as many prior qualifications (institution, degree level, field of study, dates, grade) and standardized test results (test name, overall score, and the four section scores, with the test date) as apply to them — each one saves immediately the moment it's added, individually, rather than waiting for one big final save.
3. **Documents:** a checklist of required uploads — photo, passport (front and back), academic transcript, and marksheet — plus optional ones (CV, statement of purpose, letters of recommendation, a "no objection" letter, and an English-proficiency certificate). Ticking "I am planning to apply for a PhD program" reveals two further required uploads specific to doctoral applicants.
4. Once every *required* document is uploaded, the form can be submitted. Submitting marks the student's overall profile as ready, and — if this specific form was reached via a particular in-progress application — automatically finishes submitting that exact application at the same moment.

**Technical & business notes:**
- Re-uploading a document to a slot that already has one automatically keeps the earlier version rather than simply overwriting it — every document slot has a full version history behind it, same as the general file-handling approach described in Section 4.6.

### 7.4 Documents Vault

**What it does:** Separate from the "Complete Application Details" document checklist above, this is where a student fulfills **specific document requests an admin has made against a particular application** — for example, a request for a more recent transcript partway through the review process.

**Step by step:**
1. Every outstanding or past document request shows its label, any deadline, and its current state.
2. A request still waiting for a first upload, or one that was reviewed and **rejected**, both show an Upload/Re-upload action; anything already submitted-and-approved shows a simple green confirmation instead.
3. Uploading starts a formal review clock (Section 4.9) and notifies the reviewing admin.
4. If rejected, the admin's reason is shown, and the student can immediately re-upload — the request simply loops back to "waiting for a document" rather than being a dead end. Once a document has been approved, though, that's final — it can no longer be replaced with a different file, so an approved document can never be silently swapped out without a fresh admin review.

### 7.5 Browsing Universities, Courses & Intakes

**What it does:** The catalog browsing experience — searching institutions, picking a specific campus, drilling into its courses, and applying directly to a specific open intake.

**Step by step:**
1. A searchable, filterable (by country) list of partner **institutions**, paginated — one card per institution, even if it has several campuses.
2. Clicking an institution opens a **campus picker** — a dedicated step listing every campus of that institution (each showing its city and how many programs it offers), always shown even when there's only one campus. This is a separate step from browsing courses, so switching between an institution's campuses is always one clear click away rather than a small toggle buried inside the course list.
3. Clicking a campus shows its course list.
4. Clicking a course shows its currently available intakes as individual cards, each showing key dates and fees.
5. An "Apply" button appears on any intake that's currently open (closed or not-yet-open intakes don't offer it) — clicking it immediately starts the application (Section 7.2). Browsing itself is never restricted by profile completeness — only what happens *after* clicking Apply depends on that.

A breadcrumb trail at the top always shows all four levels (Institution → Campus → Course → Intakes) and lets a student jump back up to any of them directly.

### 7.6 Your Agent / Consultant

**What it does:** Shows the student which TGA agent (if any) is currently assigned to them, and lets them request a change if needed.

**Step by step:**
1. If an agent is assigned, their name, agency, tier, referral code, country, and contact details are shown.
2. If reassignment is currently allowed (see below), a request form lets the student explain why (a short reason is required), and optionally browse for and name a specific agent they'd rather work with (the same browsable agent picker described in Section 7.3 — searchable by name, agency, or referral code, no need to already know the code) — if the student currently has no agent at all, naming one is required rather than optional.
3. The request goes to TGA's admin team for review and a decision (Section 5.6); the student is notified either way.
4. If the student has no agent at all, the page instead shows a clear "no consultant assigned yet" state with a direct way to either claim a referral code or ask to be assigned one.

**Technical & business note:** once any of a student's applications reaches "enrolled" status, their agent becomes permanently locked in and this whole reassignment option disappears — both the request button and the underlying ability to submit one are switched off at that point (Section 4.8 explains why).

### 7.7 Notices

A read-only feed of announcements TGA has published specifically to students (Section 5.11) — switchable between a grid and table view, filterable by type (general notice vs. event), and sortable by newest or oldest first.

### 7.8 Payments

**What it does:** Lets a student see and act on any fee TGA has requested from them against a specific application.

**Step by step:**
1. Payments needing attention appear both on the main Overview dashboard (Section 7.1) and inside the relevant application's own detail view.
2. A pending payment shows its label and amount, with a "Mark as Paid" button the student clicks once they've actually made the payment.
3. Marking it paid moves it into an "awaiting confirmation" state and notifies TGA's admin team, who then confirm it (completing the process) or, if there's a genuine problem, flag it as disputed.
4. If a payment is marked disputed, the student sees a clear "disputed — please contact us" message; resolving a dispute is handled directly with TGA's team rather than through a self-service button, since it usually needs a real conversation.

### 7.9 Profile & Account Settings

**What it does:** The student's own self-service page for their core personal information, login security, and profile picture.

**Step by step:**
1. Personal details — first/last name, date of birth, nationality, passport number and expiry — are editable as one group, toggled in and out of an editing mode.
2. Contact details — email and phone — are separately editable; the system checks a new email or phone isn't already in use by another active account before accepting the change.
3. A password-change panel requires the current password plus a new one entered twice.
4. The avatar picker (Section 4.6) offers 13 preset illustrated options or a custom photo upload with cropping.
5. A summary card at the bottom links into the full "Complete Application Details" flow (Section 7.3), labeled either "Complete Profile" or "Edit," depending on whether the student's profile is already considered ready.

### 7.10 Additional Information (Custom Fields)

**What it does:** Displays whatever extra questions TGA's admin team has chosen to ask students beyond the system's built-in fields (Section 5.5) — entirely optional, and clearly labeled as not something that will hold up or block any application.

**Step by step:** each question appears in whatever format the admin defined it as — a short answer, a paragraph, a number, a date, a dropdown choice, or a file upload. Text-style answers are all saved together with one Save button; file uploads save individually and immediately the moment a file is chosen, with a "Replace" option if the student wants to swap in a different file later.

### 7.11 Application Timeline — What a Student Sees

Every application has a running history a student can view (Section 7.2) — status changes, and anything that happened as a side effect of the student's own actions, like submitting a requested document or marking a payment as paid.

---

## 8. Global Search

### In plain terms

Every portal has a single search box, opened from anywhere with `Ctrl+K` (or `Cmd+K` on a Mac), that searches across multiple types of records at once — instead of needing to know in advance which specific page ("is this a student or a lead?") to go looking on. Typing at least 3 characters searches live; anything shorter just shows the portal's own navigation menu, filtered to match what's typed, so the same box also doubles as a fast way to jump to any page.

### Step by step

1. Open the search box from anywhere in the portal.
2. Start typing — results appear automatically, grouped by type, after a brief pause to avoid searching on every single keystroke.
3. Click a result to go straight to it — a student, an application, a university, a course, and (for admin staff) an agent or a lead.

### Technical detail

- One shared backend endpoint serves all three portals, but what it's allowed to search is different for each role: an admin's search can reach students, applications, universities, courses, agents, and leads — but for each of those categories individually, results are also filtered by that specific admin's own page-access grants (Section 4.3), the same as everywhere else in the system, so an admin without access to the Agents page gets no agent results from search either, even though the rest of their search still works normally; an agent's search is scoped to their own visible network (their students and applications, plus universities/courses); a student's search is scoped to only their own applications, plus universities/courses — deliberately excluding any other student, agent, or lead data entirely.
- Searching waits for a brief pause after typing stops (300 milliseconds) before actually querying the server, and is rate-limited per user, so rapid typing doesn't flood the server with a search request per keystroke.
- Each record type is searched and capped independently (a handful of top matches per type) and the results are combined into one list, ordered so the most likely-relevant types surface first.
- Because email and phone number fields are encrypted (Section 4.2), searching for a student by those fields uses the same exact-match/"starts with" technique described there, not a full free-text search.

### Why it was built this way

A single global search box, rather than requiring a user to first decide "which page has what I'm looking for," matches how people actually think when searching — by name or reference number, not by which internal category a system happens to file something under. Scoping what each role can search (rather than running one identical search for everyone) keeps the same convenient tool from accidentally becoming a way to browse data a given role was never meant to see.

---

## 9. Current Limitations & Notes

Three admin-facing pages are not yet available for general use: **Commissions** (Section 5.9, and its agent-side counterpart, Section 6.9), **Leads Pipeline** (Section 5.10), and **Reports & Exports** (Section 5.12). Each currently shows a "still being finished" message and blocks interaction until the user navigates away — a deliberate hold while final checks continue, not a bug. Everything else described in this document is built, working, and in active use today.

One further backend capability exists but has no way to reach it yet: the system can store staff-only notes attached to a student, application, agent, university, or course record (with per-note visibility to agents/students, and pinning), but no current page in any portal actually exposes this — it isn't reachable through a single click anywhere in the live interface today, so it isn't documented as a usable feature elsewhere in this report.

---

## 10. Glossary

Plain-language definitions of terms used throughout this document.

| Term | Meaning |
|---|---|
| **Portal** | One of the three separate applications (Student, Agent, Admin) that make up the CRM, sharing one underlying system and database. |
| **RBAC (Role-Based Access Control)** | The general name for a permissions system where what a user can do is determined by their assigned role and grants, rather than being the same for everyone. |
| **Super admin** | An admin account with a small set of irreversible extra powers (creating/deleting admin accounts, editing system settings, permanently erasing files) that cannot be delegated to a regular admin. |
| **Page-access grant** | The specific set of pages (and read-only vs. full-access level) a super admin has switched on for one particular admin account. |
| **Tier (agent)** | An agent's level in the 3-level partner hierarchy: Tier 1 (top level), Tier 2 (recruited by a Tier 1), Tier 3 (recruited by a Tier 2, cannot recruit further). |
| **Root agent** | The Tier 1 agent sitting at the top of a particular agent's branch of the hierarchy — used internally to quickly check who's allowed to see which students. |
| **Referral code** | A short, unique code every approved agent has, used to let a new student or sub-agent register directly under them. |
| **State machine** | The rulebook (Section 4.8) defining which "stage" an application is allowed to move to next, and what happens automatically when it does. |
| **SLA (Service-Level Agreement) event** | An internal tracking clock, started when something enters a "waiting for review" state, used to detect and flag anything that's taken longer than its target time. |
| **OTP (One-Time Password / one-time code)** | A temporary 6-digit code, sent by email, used either to verify an email address during registration or as a passwordless way to log in. |
| **2FA (Two-Factor Authentication)** | An optional extra login step (a second emailed code, after the password) available on admin accounts. |
| **JWT (JSON Web Token)** | The type of digital "ticket" issued when someone logs in, proving who they are on each subsequent request without needing to re-enter a password every time. |
| **Access token / Refresh token** | The two tokens issued at login — a short-lived one (15 minutes) used on every request, and a longer-lived one (7 days) used only to quietly obtain a new access token. |
| **ULID / Public ID** | The 26-character unguessable code (e.g. `01H8X...`) used everywhere a student, agent, admin, or other record is referenced outside the server — instead of exposing the internal database row number. |
| **Argon2id** | The password-hashing algorithm used to store passwords securely — a one-way scramble that can verify a password attempt but can never be reversed back into the original password. |
| **XSalsa20-Poly1305** | The encryption method used to scramble sensitive personal data (email, phone, passport number) in the database. |
| **Lookup hash / prefix hash** | A one-way scrambled fingerprint of an encrypted value (or just its first few characters), stored alongside the encrypted data specifically so it can still be searched without ever decrypting it. |
| **Cron job / background job** | A routine task the system runs automatically on a schedule, with no person needing to trigger it (Section 4.5). |
| **Notification template** | The pre-written email/in-app message text for a specific type of event, with placeholders the system fills in with real details before sending. |
| **Report snapshot** | A pre-calculated set of numbers for the Reports pages, recalculated once every 24 hours rather than computed fresh every time a report is opened. |
| **Activity log / audit trail** | The permanent, tamper-resistant record of every meaningful action taken in the system. |
| **Security event** | A specific entry in the separate security log — login attempts, password resets, rate-limit triggers, and similar security-relevant occurrences. |
| **Soft delete** | Marking a record as removed (hidden from normal use) without physically deleting its data — used almost everywhere in the system so that removed records can still be recovered or referenced if genuinely needed. |
| **Erasure (permanent)** | The one true, irreversible deletion capability in the system, reserved for super admins and requiring a logged reason — removes a file from the server for good. |
| **Custom field** | A question TGA's admin team can define themselves (beyond the system's built-in fields) for students to answer, without needing a developer to add it. |
| **Reassignment** | The process of changing which agent is responsible for a given student, initiated by the student and decided by an admin. |
| **Intake** | A specific enrollment window/term for a course (e.g. "Fall 2027") — this is where fees and key dates actually live, not on the course itself. |
| **Lead** | A prospective student who has shown interest (usually via the public website) but hasn't yet become a real student account in the system. |
| **Commission** | The amount an agent earns for successfully placing a student, tracked through a pending → confirmed → paid lifecycle. |

---

*End of document.*









