# Production Setup Runbook — Bluehost (apply.theglobalavenues.com)

One-time initial-launch runbook for standing up the database on the live Bluehost account. This is
**not** a routine deployment doc (code pushes are covered in `README.md` §19) — this is specifically
for the one moment `setup_database.php` needs to run against the real production database.

**Read this in full before starting.** `setup_database.php` is destructive — it drops every table and
rebuilds from scratch. Run it exactly once, at initial launch, against an empty/throwaway production
database. Any update after that goes through `reconcile.php` (non-destructive, dry-run first) — never
`setup_database.php` again.

Do every step below one at a time, with a human confirming each result before moving to the next —
this is a live production account, not a disposable environment (per `CLAUDE.md` Working Mode rule 4).

---

## Why this needs a special procedure

`setup_database.php` is a PHP **CLI** script (`php setup_database.php`). Bluehost's `lidglcmy` cPanel
account has no SSH/Terminal access — the only way to execute an arbitrary PHP CLI command on this
account is cPanel's **Cron Jobs** GUI, which already runs `cron/scheduler.php` every minute in
production. We reuse that same mechanism for a **one-shot** run, then remove it immediately so it
never fires again.

---

## Step 1 — Create the database and DB user (cPanel → MySQL Databases)

1. cPanel → **MySQL® Databases** → create a new database (Bluehost will prefix it, e.g.
   `lidglcmy_tga_crm`). Character set/collation are set later by the script itself
   (`utf8mb4_unicode_ci`) — no need to pre-configure.
2. Create a new database user with a strong generated password, add it to the database with **All
   Privileges**.
3. Confirm nothing else has ever written to this database — it must be empty (or you're OK with it
   being wiped) before proceeding, since Step 4 drops every table in it.

**Stop and confirm with the human before continuing** — this is the point where the real DB name/user
get fixed for production.

## Step 2 — Upload code

Per `README.md` §19: `npm run build` → upload `dist/` to the document root; upload `crm-api/`, `cron/`,
`storage/`, `uploads/` alongside it.

## Step 3 — Create `crm-api/.env` on the server

Copy `crm-api/.env.example`, fill in real values via cPanel File Manager's edit view (never commit this
file). Values that matter most for this runbook:

```
APP_ENV=production
DB_HOST=localhost          # Bluehost MySQL is same-host, not 127.0.0.1
DB_NAME=lidglcmy_tga_crm   # the exact DB name from Step 1
DB_USER=lidglcmy_xxxxx     # the exact DB user from Step 1
DB_PASS=<the real password>
DB_PORT=3306
SUPER_ADMIN_NAME=<real name>
SUPER_ADMIN_EMAIL=<real email — this becomes the first login>
SUPER_ADMIN_PHONE=<real phone, E.164>
SUPER_ADMIN_PASSWORD=<strong password — change on first login if you add that flow later>
ENCRYPTION_KEY=<generate fresh — see below, do NOT reuse the local dev key>
JWT_ACCESS_SECRET=<generate fresh, 64 random chars>
JWT_REFRESH_SECRET=<generate fresh, different from access>
JWT_RESET_SECRET=<generate fresh, different from both above>
```

Generate `ENCRYPTION_KEY` and JWT secrets fresh for production — reusing the local dev values would
mean anyone with this repo's git history could decrypt production PII. Bluehost cPanel has a "Terminal"
menu item that's disabled for this account, but PHP itself is available via the one-shot cron trick
below if you need to run `php -r "echo base64_encode(random_bytes(32));"` remotely — or simpler, run
that one line locally (it doesn't touch any database) and paste the result in.

`APP_ENV=production` is what makes `setup_database.php` skip all dev/test fixtures (fake agents,
students, applications, etc.) — confirmed by local testing 2026-07-16 (see below). Do not set this to
`development` on the live server.

## Step 4 — Run `setup_database.php` once, via a one-shot cPanel cron

1. cPanel → **Cron Jobs** → **Add New Cron Job**.
2. Set the schedule to a few minutes in the future (e.g. if it's 14:32 now, set minute `35`, hour `14`,
   day/month/weekday `*`) — cPanel cron granularity is per-minute, there's no "run once now" button, so
   scheduling a near-future single minute is the standard workaround.
3. Command (adjust the PHP binary path and home directory to match this account — `ea-php83` is
   referenced in `README.md` §19 for the recurring scheduler cron, reuse the same binary):
   ```
   /usr/local/bin/ea-php83 /home/lidglcmy/public_html/crm-api/Database/setup_database.php >> /home/lidglcmy/public_html/crm-api/logs/setup_run.log 2>&1
   ```
4. Save. Wait for the scheduled minute to pass.
5. **Immediately delete this cron job** — it must never run a second time in production (it would wipe
   live data the moment students/agents start using the system).
6. cPanel → **File Manager** → open `crm-api/logs/setup_run.log` and confirm it ends with:
   ```
   ==========================================
      DATABASE INSTALLED & SEEDED SUCCESSFULLY
   ==========================================
   ```
   If it doesn't, do **not** re-run the cron blindly — read the error, fix the underlying cause (env
   var, file permission, DB grant), and only re-run Step 4 once you understand what failed. Re-running
   is safe at this stage (nothing real is in the DB yet) but shouldn't be done on autopilot.

## Step 5 — Verify the seed landed correctly

Via cPanel → phpMyAdmin, spot-check against the counts confirmed locally on 2026-07-16:

| Table | Expected count |
|---|---|
| `universities` | 313 |
| `courses` | 2,999 |
| `intakes` | 4,848 |
| `university_campuses` | 415 |
| `files` (university logos) | 2 |
| `student_custom_field_definitions` | 6 |
| `users` | 1 (just the super admin) |
| `agents`, `students`, `applications`, `leads` | 0 each |

Then confirm the app-level login works: visit the production URL, log in with the `SUPER_ADMIN_EMAIL`
/ `SUPER_ADMIN_PASSWORD` from Step 3, confirm the admin dashboard loads.

## Step 6 — Set up the real recurring cron

Now add the actual permanent cron entry (this is the one that stays forever):

```
* * * * * /usr/local/bin/ea-php83 /home/lidglcmy/public_html/cron/scheduler.php
```

`scheduler.php` internally paces the 4 real jobs at their documented frequencies (1 min / 15 min / 24
hr / 12 hr — see `CLAUDE.md` §Cron Schedule). `archive-old-logs.php` is intentionally excluded from
its job list (see `CLAUDE.md`) — don't add a separate cron entry for it.

## Step 7 — `.htaccess` sanity check

Confirm `RewriteEngine On` is present in both the document-root `.htaccess` (SPA fallback to
`index.html`) and `crm-api/.htaccess` (API front controller) — this was a real Phase 9 bug (all API
routes 404'd without it, see `CLAUDE.md` Hotfix History P9).

---

## What was verified locally before this runbook was written (2026-07-16)

- `real_catalog_seed.sql` regenerated from the local dev DB (`tga_crm_reconciled`) to include every
  university/course/intake added since the 2026-07-08 version — old file had 310 universities / 2,606
  courses / 4,419 intakes; regenerated file has all 313 / 2,999 / 4,848 (confirmed zero rows dropped,
  ID-by-ID, only additions).
- `setup_database.php` run end-to-end twice against throwaway local databases (dropped afterward) —
  once with `APP_ENV=production` (confirmed zero dev fixtures, exactly 1 user, correct catalog counts,
  RBAC/settings/templates seeded), once with `APP_ENV=development` (confirmed the dev fixture path
  still works, unaffected by the catalog regeneration). Both runs completed with no errors.
- The live local working database (`tga_crm_reconciled`) was never touched by this testing — a separate
  scratch database was used and dropped after.
