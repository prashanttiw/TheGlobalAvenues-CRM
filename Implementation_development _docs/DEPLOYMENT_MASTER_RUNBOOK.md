# Deployment Master Runbook — apply.theglobalavenues.com

Full step-by-step for taking the current local build live on Bluehost, organized into units. Each unit
is a self-contained stage — finish one, verify it, then move to the next. Server/deployment steps are
done live, one step at a time, with confirmation before the next (project Working Mode rule 4) — this
document is the checklist for that session, not something to run unattended.

**Pre-flight finding (2026-07-16):** `apply.theglobalavenues.com` is not empty. It currently serves a
page titled "The Global Avenues CRM Portal" (a frontend build already appears to be there), but
`/crm-api/health` returns 404 — no backend is currently reachable. Unit 1 below backs up whatever is
there now before anything is overwritten. If you know what's currently deployed (an earlier test
upload? a partial deploy?), say so before Unit 1 — it changes what "backup" needs to cover.

---

## Unit 1 — Back up what's currently live

Do this before touching anything else, even if you believe the current deployment is disposable.

1. cPanel → **File Manager** → select the entire `apply.theglobalavenues.com` document root → **Compress** → zip it.
2. Download that zip to your local machine (outside the server) with a dated name, e.g.
   `backup_pre_deploy_2026-07-16.zip`. Don't rely on the server itself as the only copy.
3. cPanel → **MySQL® Databases** → check whether any database already exists on this account.
   - If yes: phpMyAdmin → select it → **Export** (SQL format) → download. Even if you believe it's
     empty/test-only, export it — it costs nothing and removes the guesswork.
   - If no database exists yet: nothing to back up here, move on.
4. Confirm both downloads opened correctly (non-zero size, zip isn't corrupt) before proceeding.

**Stop and confirm with me before Unit 2** — I don't have visibility into what's actually in that
backup; you're the one who needs to eyeball it and say "yes, that's backed up."

---

## Unit 2 — Local build prep

Everything in this unit runs on your local machine — no server risk.

1. Confirm the working tree is in the state you want deployed (`git status`, review any uncommitted
   changes you meant to include).
2. **Generate fresh production secrets — do not reuse local dev's:**
   ```
   php -r "echo base64_encode(random_bytes(32));"   # run 4 times: ENCRYPTION_KEY, and 3 JWT secrets
   ```
   Local dev's `ENCRYPTION_KEY`/JWT secrets are in this git history — reusing them in production means
   anyone with repo access could decrypt production PII or forge tokens.
3. Build the frontend:
   ```
   npm run build
   ```
   Produces `dist/`.
4. Build the backend archive:
   ```
   scripts\build-api-archive.bat
   ```
   Produces `build-api.zip` (contains `crm-api/` + `cron/`, already excludes `.env`, `.env.example`,
   `.env.production`, `.git/`, `tests/` — see `scripts/exclude.txt`). Does **not** include `storage/` or
   `uploads/` — those are separate, per Unit 2 step 5.
5. Zip `storage/` and `uploads/` separately (already cleared of local test data — see the earlier
   cleanup this session). Two options:
   - One combined zip, or
   - Two separate zips, whichever is easier for you to extract into the right relative paths on the
     server (`<docroot>/storage/`, `<docroot>/uploads/`).
6. **Do not use `scripts\deploy-frontend.bat`** — it deploys to Vercel, which isn't this project's
   actual architecture anymore. `dist/` gets uploaded manually to the same document root as `crm-api/`
   in Unit 3, alongside everything else.

You should now have 3 local artifacts ready to upload: `dist/` (or a zip of it), `build-api.zip`,
and your `storage/`+`uploads/` zip(s).

---

## Unit 3 — Upload code

1. cPanel → **File Manager**, navigate to the `apply.theglobalavenues.com` document root.
2. **Clear or move aside** whatever's currently there (now that Unit 1 backed it up) — ask me before
   deleting anything if you're not sure what's safe to remove.
3. Upload and extract `dist/` contents directly into the document root (the SPA's `index.html`, `assets/`,
   etc. sit at the root — not in a subfolder).
4. Upload `build-api.zip` and extract it **directly into the document root** — the zip already contains
   `crm-api/` and `cron/` as top-level folders, so extracting it there produces `<docroot>/crm-api/` and
   `<docroot>/cron/` correctly (per the build script's own note — don't extract into an existing
   `crm-api/` subfolder, that would nest it one level too deep).
5. Upload and extract the `storage/`/`uploads/` zip(s) the same way, landing at `<docroot>/storage/` and
   `<docroot>/uploads/`.
6. Sanity-check via File Manager that `<docroot>/.htaccess` and `<docroot>/crm-api/.htaccess` both exist
   and contain `RewriteEngine On` — a missing `RewriteEngine On` was a real Phase 9 bug that 404'd every
   API route. Also confirm `<docroot>/storage/.htaccess` and the nested ones under `storage/private/`
   survived the zip/extract round-trip (`Require all denied`).

---

## Unit 4 — Configure environment

1. In File Manager, create `<docroot>/crm-api/.env` (edit-in-browser, or upload a file you prepared
   locally — **never** upload your local dev `.env`, and don't use the stale `.env.production` template
   as-is). Base it on `crm-api/.env.example`'s structure with these production-specific values:
   ```
   APP_ENV=production
   APP_URL=https://apply.theglobalavenues.com
   APP_FRONTEND_URL=https://apply.theglobalavenues.com
   DB_HOST=localhost
   DB_NAME=<from Unit 5>
   DB_USER=<from Unit 5>
   DB_PASS=<from Unit 5>
   DB_PORT=3306
   ENCRYPTION_KEY=<fresh value from Unit 2>
   JWT_ACCESS_SECRET=<fresh value from Unit 2>
   JWT_REFRESH_SECRET=<fresh value from Unit 2>
   JWT_RESET_SECRET=<fresh value from Unit 2>
   ARGON2_MEMORY_COST=19456
   ARGON2_TIME_COST=2
   SUPER_ADMIN_NAME=<real name>
   SUPER_ADMIN_EMAIL=<real email>
   SUPER_ADMIN_PHONE=<real phone, E.164>
   SUPER_ADMIN_PASSWORD=<strong password>
   CORS_ALLOWED_ORIGINS=https://apply.theglobalavenues.com
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=<real>
   MAIL_PASSWORD=<real app password>
   MAIL_FROM_EMAIL=<real>
   MAIL_FROM_NAME=The Global Avenues
   MAIL_ENCRYPTION=tls
   MAIL_LOGO_URL=<public HTTPS logo URL — Gmail/Outlook must be able to reach it>
   UPLOAD_MAX_SIZE_MB=10
   UPLOAD_PATH=uploads
   UPLOAD_ALLOWED_TYPES=application/pdf,image/jpeg,image/png,image/webp
   LOG_PATH=logs
   LOG_LEVEL=warning
   ```
   Do **not** set `DRIVE_SERVICE_ACCOUNT_JSON`/`DRIVE_BACKUP_FOLDER_ID` — that feature was removed
   2026-07-10, the code no longer reads them.
2. Confirm `<docroot>/crm-api/logs/` exists and is writable (PHP needs to write to it).
3. Confirm `<docroot>/storage/private/`, `<docroot>/storage/cache/`, and `<docroot>/uploads/public/`
   are writable by the PHP process (Bluehost's default ownership usually handles this automatically
   since File Manager uploads run as your account, but verify — a permissions failure here surfaces as
   silent upload failures later, not an obvious error at this step).

---

## Unit 5 — Database setup

Full detail already written up in
`Implementation_development _docs/PRODUCTION_SETUP_RUNBOOK.md` — follow that document's Steps 1–7
directly (cPanel DB/user creation → the one-shot cPanel Cron Jobs trick to run
`setup_database.php` once, since there's no SSH on this account → verification counts → cron
cleanup). Summary:

1. Create the production database + user in cPanel (if not already done as part of Unit 1's check).
2. Schedule `setup_database.php` as a one-shot cPanel cron entry a few minutes out.
3. Confirm the log shows `DATABASE INSTALLED & SEEDED SUCCESSFULLY`.
4. **Delete that cron entry immediately** — it must never run again against a live database.
5. Spot-check table counts in phpMyAdmin against the numbers confirmed locally on 2026-07-16:
   313 universities / 2,999 courses / 4,848 intakes / 415 campuses / 2 logo files / 6 custom field
   defs / exactly 1 user (the super admin).

---

## Unit 6 — Recurring cron

Add the permanent cron entry (this one stays forever, unlike Unit 5's one-shot):
```
* * * * * /usr/local/bin/ea-php83 /home/lidglcmy/public_html/cron/scheduler.php
```
Confirm the PHP binary path matches what's actually available on this account (check cPanel → **Select
PHP Version** or ask Bluehost support if `ea-php83` isn't right). `scheduler.php` internally paces the 4
real jobs (1 min / 15 min / 24 hr / 12 hr — see `CLAUDE.md` §Cron Schedule).

---

## Unit 7 — Verification

1. `scripts\smoke-test.bat` → hits `https://apply.theglobalavenues.com/crm-api/health`, confirms 200 OK
   with valid JSON.
2. Log into the live site with the `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` from Unit 4 — confirm the
   admin dashboard loads and shows the expected catalog counts.
3. Navigate directly to a deep portal URL (e.g. paste `/portal/admin/universities` straight into the
   address bar, not via in-app navigation) — confirms the SPA fallback rewrite works, not just root `/`.
4. Trigger one real notification-producing action (e.g. create a test lead) and confirm it queues in
   `notifications` — full send confirmation needs to wait ~1 minute for the cron to pick it up.
5. Check `<docroot>/crm-api/logs/` for unexpected errors after these test actions.

---

## Unit 8 — Post-deploy cleanup

1. Re-confirm the Unit 5 one-shot cron entry is gone (easy to forget — it's destructive if it fires twice).
2. Confirm no `.env`, `.env.example`, or `.env.production` file is web-accessible (`build-api.zip`
   already excludes these via `scripts/exclude.txt`, but verify nothing pre-existing on the server
   exposes one).
3. Watch `crm-api/logs/` and cPanel's error log for the first day of real traffic.

---

## Unit 9 — Rollback plan

- **Code problem:** re-upload from the Unit 1 backup zip, or re-run Units 2–4 with a fix.
- **Database problem, before any real user has signed up:** since this is the first real launch, the
  simplest rollback is re-running Unit 5 (the DB is disposable until real users exist in it).
- **Database problem, after real users exist:** restore from the Unit 1 DB export via phpMyAdmin import
  (or `scripts\restore-db.bat <path>` if restoring locally first to inspect before pushing back up) —
  do not re-run `setup_database.php` at that point, it would destroy real user data.

---

## Open items to resolve before starting Unit 1

- What's currently live at `apply.theglobalavenues.com` right now — a prior test upload, a partial
  deploy, something else? Determines whether Unit 1's backup is precautionary or actually needed.
- Confirm the PHP CLI binary path/version available in cPanel Cron Jobs (`ea-php83` assumed in Units 5
  and 6 based on `README.md` §19 — verify against the account's actual **Select PHP Version** setting).
- Real values for `SUPER_ADMIN_*`, `MAIL_*`, and `MAIL_LOGO_URL` in Unit 4 — have these ready before
  starting so Unit 4 isn't blocked mid-step.
