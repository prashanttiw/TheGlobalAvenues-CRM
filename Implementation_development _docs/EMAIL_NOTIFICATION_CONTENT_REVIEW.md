# Email & Notification Content — Client Review

Prepared 2026-07-14 for pre-deployment sign-off.

This is the complete, word-for-word content of every automatic email and in-app notification the
CRM sends — to students, agents, and staff. Grouped by situation. For each one: **who receives it
and why** (plain language), then **the exact message content**.

A polished, easier-to-read visual version of this same content is also available as a shareable
web page (ask the session owner for the link) — this file is the plain-text/markdown record kept
with the project's documentation.

**How to read the samples below:** wherever a message includes a name, code, or amount, this
document shows a realistic example (Priya Sharma, Rahul Mehta, OTP `482913`, etc.) so the wording
can be judged. The system fills in the real value automatically every time it actually sends.

**Quick counts:** 36 notification types total — 29 sent by email, 7 in-app only, 4 already wired
into the code but with no message written yet (see §12).

**Added 2026-07-26:** one new welcome-email variant, for the new admin-direct agent creation
feature — see the last row of §2 below. Written in the same no-links branded style as everything
else on this page; not part of the original 2026-07-14 review.

**Checked end-to-end, not just written (2026-07-14):** every row below was traced through the live
system — the wording is confirmed to exist and load correctly, and every situation that should send
one does send one. The delivery step that turns a stored message into an actual outgoing email was
also tested, and a real formatting bug in that step was found and fixed: 28 of these were losing
their line breaks and company branding on the way out. The last 6 that still looked plainer than the
rest have since been redesigned to match the same branded look as everything else. A link audit then
found 9 buttons pointing at the wrong place or nowhere at all — rather than keep maintaining links
against a site that keeps changing, **every button has since been removed from every email,
system-wide**. Nothing below is clickable — there is nothing left that can point somewhere wrong.
Full technical record: `Implementation_development _docs/PROJECT_HISTORY.md`, Phase 9 section (formerly
`PHASE_9_APPEND.md` §9.11–§9.14, consolidated 2026-07-15).

---

## 1. Login & Verification Codes

Short-lived 6-digit codes. Always sent by email, always immediately, never delayed.

| Who receives it, and why | Exact message content |
|---|---|
| **A new Student** — right when they start signing up, to prove the email address is really theirs. | **Subject:** Your TGA Verification Code: 482913<br><br>Verify Your Email<br>Use the code below to complete your registration with The Global Avenues.<br><br>**Verification Code: 482913** — Valid for 10 minutes<br><br>*Security Notice:* If you did not request this code, please ignore this email. The Global Avenues will never ask for your OTP over phone or chat. Do not share this code with anyone.<br><br>Warm regards, The Global Avenues Team |
| **A new Agent (Partner)** — same purpose, during partner sign-up. | **Subject:** Your TGA Agent Verification Code: 482913<br><br>Verify Your Email<br>Use the code below to complete your partner registration with The Global Avenues.<br><br>**Verification Code: 482913** — Valid for 10 minutes<br><br>*Security Notice:* same wording as above.<br><br>Warm regards, The Global Avenues Team |
| **Any Student or Agent** — when "one-time code" login is used instead of a password. | **Subject:** Your TGA Login Code: 482913<br><br>Your Login Code<br>A one-time login code has been requested for your account. Enter it to complete sign-in.<br><br>**One-Time Login Code: 482913** — Valid for 10 minutes<br><br>*Did not request this?* If you did not attempt to log in, someone may be trying to access your account. Please contact us immediately at connect@theglobalavenues.com. Never share this code with anyone.<br><br>Warm regards, The Global Avenues Team |
| **Admin / Super Admin** — required second-factor code on every admin login. | **Subject:** Your TGA Admin 2FA Code: 482913<br><br>Admin Two-Factor Authentication<br>Your admin portal sign-in requires two-factor verification. Use the code below.<br><br>**2FA Authentication Code: 482913** — Valid for 10 minutes<br><br>*High Security Alert:* This code grants access to the TGA admin portal. If you did not initiate this login, contact your system administrator immediately. Never share this code.<br><br>Warm regards, The Global Avenues Team |
| **Any Student, Agent, or Admin** — when "Forgot Password" is used. | **Subject:** Reset Your TGA Password<br><br>Reset Your Password<br>We received a request to reset the password for your account. Use the code below to proceed.<br><br>**Password Reset Code: 482913** — Valid for 10 minutes<br><br>*Did not request a reset?* If you did not request a password reset, please ignore this email. Your password will not change.<br><br>Warm regards, The Global Avenues Team |

---

## 2. Welcome Emails

Sent once, the moment an account is ready to use.

| Who receives it, and why | Exact message content |
|---|---|
| **New Student** — after they sign up themselves and verify their code. | **Subject:** Welcome to The Global Avenues, Priya Sharma!<br><br>Your student account is ready. We are excited to support your journey toward international education.<br><br>*What you can do now:*<br>→ Browse universities and courses<br>→ Submit your first application<br>→ Track your application status in real time<br>→ Upload documents and receive feedback<br><br>If you have any questions, reply to this email or contact us at connect@theglobalavenues.com.<br><br>Warm regards, The Global Avenues Team |
| **New Student — added by their Agent** — when an agent registers a student on the student's behalf. Deliberately has no password in it; login is via one-time code or "forgot password". | **Subject:** Your Global Avenues student profile is ready<br><br>Welcome to The Global Avenues, Priya Sharma!<br>Your student profile has been created with The Global Avenues by Rahul Mehta. You can now track your applications, documents, and offers in one place.<br><br>*How to log in:* Use this email address (priya.sharma@example.com) with either:<br>→ One-time passcode (OTP) login — no password needed, or<br>→ "Forgot password" to set your own password<br><br>Warm regards, The Global Avenues Team |
| **New Admin** — when a Super Admin creates a staff account. Also lists exactly which admin pages this account can access. | **Subject:** Your TGA Admin Account Is Ready<br><br>Welcome to the TGA Admin Portal, Anjali Verma!<br>Your admin account has been created by a super administrator. Below you will find the details of your account access level.<br><br>*[Automatically inserted list of the exact pages/permissions granted]*<br><br>Please change your password upon first login and enable two-factor authentication. If you did not expect this email, contact the TGA system administrator immediately.<br><br>Warm regards, The Global Avenues Team |
| **New Agent** — self-registered, or a brand-new sub-agent account. | **Subject:** Welcome to The Global Avenues, Rahul Mehta!<br><br>Welcome to The Global Avenues, Rahul Mehta!<br>Your TGA partner account has been created. The final step is to complete your partner application so our team can review it.<br><br>*Next steps:*<br>→ Log in and complete your partner application<br>→ Our team will review it and confirm your partnership<br><br>If you have any questions, contact us at connect@theglobalavenues.com.<br><br>Warm regards, The Global Avenues Team |
| **New Agent — created directly by an admin** (2026-07-26). No self-registration, no documents, no review — the account is already approved. Includes login credentials, since this agent never set a password themselves. | **Subject:** Welcome to The Global Avenues, Rahul Mehta!<br><br>Welcome to The Global Avenues, Rahul Mehta!<br>An administrator has created your partner account with The Global Avenues. You can log in right away — no application or document review needed.<br><br>*Your Login Details:*<br>Email: rahul.mehta@example.com<br>Temporary Password: b9VniZ3m!Zdj<br>Referral Code: TGA-RAHUL24<br><br>*⚠ For your security, you will be asked to set a new password immediately after your first login. If you did not expect this email, please contact us right away.*<br><br>If you have any questions, please contact us at connect@theglobalavenues.com.<br><br>Warm regards, The Global Avenues Team |

---

## 3. Partner (Agent) Applications

The approval workflow for education agents who want to partner with TGA.

| Who receives it, and why | Exact message content |
|---|---|
| **All Admins** — the moment someone applies to become a partner agent. | **Subject:** New Partner Application: Meridian Overseas Consultants<br><br>New Partner Application Received<br>A new education agent application has been submitted and requires your review.<br><br>Agency Name: Meridian Overseas Consultants<br>Contact Name: Rahul Mehta<br>Country: India<br><br>Warm regards, The Global Avenues Team |
| **The Agent** — their application is approved. Includes their new referral code. | **Subject:** Your TGA Partnership Is Approved!<br><br>Congratulations, Rahul Mehta!<br>Your application to become a certified partner of The Global Avenues has been approved. Welcome to our global education network.<br><br>Referral Code: TGA-RAHUL24<br>Partner Tier: Bronze (upgrades with performance)<br><br>Warm regards, The Global Avenues Team |
| **The Agent** — their application is declined. Includes the reason typed by the admin. | **Subject:** Update on Your TGA Partnership Application<br><br>Dear Rahul Mehta, thank you for your interest in partnering with The Global Avenues. After careful review, we regret that we are unable to proceed at this time.<br><br>*Reason for Decision:* [admin's entered text]<br><br>You are welcome to reapply in the future. For questions, write to connect@theglobalavenues.com.<br><br>Warm regards, The Global Avenues Team |
| **The Agent** — their partner account is suspended. Includes the stated reason. | **Subject:** Your TGA Partner Account Has Been Suspended<br><br>Dear Rahul Mehta, your partner account with The Global Avenues has been placed under suspension, effective immediately.<br><br>*Reason for Suspension:* [admin's entered text]<br><br>To appeal or seek clarification, contact connect@theglobalavenues.com.<br><br>Regards, The Global Avenues Compliance Team |
| **The Parent Agent** — a sub-agent applies underneath them, pending TGA review. *(The sub-agent themselves separately gets their own Welcome email once created — see §2.)* | **Subject:** New Sub-Agent Application Under Your Account<br><br>Hi Rahul Mehta, a new sub-agent has applied under your referral network and is pending approval from The Global Avenues.<br><br>Name: [sub-agent's name]<br>Agency: [sub-agent's agency]<br>Status: Pending TGA Review<br><br>We will notify you once their application has been reviewed.<br><br>Warm regards, The Global Avenues Team |

---

## 4. Changing a Student's Agent

The workflow when a student asks to switch which agent is helping them.

| Who receives it, and why | Exact message content |
|---|---|
| **All Admins** — a student requests to change their assigned agent. | **Subject:** Agent Reassignment Request — Action Required<br><br>A student has submitted a request to change their assigned education agent. Please review and take action.<br><br>Student: Priya Sharma<br>Current Agent: Rahul Mehta<br>Reason: [student's stated reason]<br><br>Warm regards, The Global Avenues Team |
| **The Student** — their request is approved. Names the new agent. | **Subject:** Your Agent Reassignment Has Been Approved<br><br>Dear Priya Sharma, we are pleased to confirm that your request to change your assigned education consultant has been approved.<br><br>New Agent Assigned: [new agent's name]<br><br>Your new agent will reach out to you shortly.<br><br>Warm regards, The Global Avenues Team |
| **The Student** — their request is declined. Includes the admin's review notes. | **Subject:** Your Agent Reassignment Request Was Not Approved<br><br>Dear Priya Sharma, after careful review, your request could not be approved at this time.<br><br>Review Notes: [admin's stated reason]<br><br>If you have further questions or would like to submit a new request, contact connect@theglobalavenues.com.<br><br>Warm regards, The Global Avenues Team |
| **The Agent who lost the student** — reassures them their records aren't erased. | **Subject:** Student Reassigned to Another Agent<br><br>Hi Rahul Mehta, student Priya Sharma has been reassigned to another education consultant, effective immediately.<br><br>Your historical records and commission ledger for this student remain available in your partner portal activity log.<br><br>Warm regards, The Global Avenues Team |
| **The new Agent** — a student has just been added to their portfolio. | **Subject:** New Student Assigned to You<br><br>Hi [new agent's name], a new student has been added to your portfolio.<br><br>Student Assigned: Priya Sharma<br><br>Please log in to your partner portal to view their profile and application details.<br><br>Warm regards, The Global Avenues Team |

---

## 5. Agent Commission Payments

The three stages of every commission entry, sent only to the agent it belongs to.

| Who receives it, and why | Exact message content |
|---|---|
| **The Agent** — a commission is logged for one of their students, status Pending. | **Subject:** Commission Record Created<br><br>Hi Rahul Mehta, a new commission entry has been recorded in your ledger.<br><br>Student: Priya Sharma<br>Amount: 45000 INR<br>Status: Pending<br><br>You will be notified when this commission is confirmed by our team.<br><br>Warm regards, The Global Avenues Team |
| **The Agent** — admin verifies the commission is correct. | **Subject:** Commission Confirmed<br><br>Hi Rahul Mehta, your commission has been verified and confirmed by our team.<br><br>Student: Priya Sharma<br>Confirmed Amount: 45000 INR<br>Status: Confirmed<br><br>Payment will be processed per the standard commission schedule.<br><br>Warm regards, The Global Avenues Team |
| **The Agent** — payment has actually been sent. | **Subject:** Commission Payment Dispatched<br><br>Hi Rahul Mehta, your commission payment has been processed and marked as paid.<br><br>Student: Priya Sharma<br>Amount Paid: 45000 INR<br><br>Please allow a few banking days for the funds to reflect in your account.<br><br>Warm regards, The Global Avenues Finance Team |

*Note: amounts render exactly as entered in the system — e.g. "45000 INR", with no currency symbol or comma formatting.*

---

## 6. Leads & Enquiries (Internal Staff Only)

A lead or prospective student never receives any of these — they are internal-only.

| Who receives it, and why | Exact message content |
|---|---|
| **All Admins** — a new enquiry comes in from the public website contact form. | **Subject:** New Lead: Aarav Kapoor from Website Contact Form<br><br>A new prospective student has submitted an enquiry through the TGA website.<br><br>Name: Aarav Kapoor<br>Source: Website Contact Form<br>Interested In: Canada — MBA<br><br>Warm regards, The Global Avenues Team |
| **The Staff Member it's assigned to** — a lead is handed to them for follow-up. | **Subject:** Lead Assigned to You: Aarav Kapoor<br><br>Hi Anjali, a prospective student lead has been assigned to you for follow-up.<br><br>Name: Aarav Kapoor<br>Source: Website Contact Form<br><br>Warm regards, The Global Avenues Team |
| **The Staff Member currently assigned** — a lead moves to a new pipeline stage. *(In-app bell only, no email — this happens too often for inboxes.)* | **Subject:** Lead Status Updated: Aarav Kapoor<br><br>Lead Aarav Kapoor has moved to a new status: Qualified. |

---

## 7. Document Requests

The paperwork back-and-forth for an application.

| Who receives it, and why | Exact message content |
|---|---|
| **The Student, and their Agent (if any)** — staff request a new document. | **Subject:** New Document Requested: Passport Copy (Front & Back)<br><br>New Document Requested<br>A new document has been requested for your application. Please upload it as soon as possible to keep things moving.<br><br>*Document Needed:* Passport Copy (Front & Back)<br><br>Please log in to your portal to upload it.<br><br>Warm regards, The Global Avenues Team |
| **The reviewing Admin** — a student/agent uploads the requested document. | **Subject:** Document Submitted for Review: Passport Copy (Front & Back)<br><br>Document Submitted for Review<br>A document has been uploaded and is ready for your review.<br><br>Document: Passport Copy (Front & Back)<br><br>Please log in to the admin panel to review it.<br><br>Warm regards, The Global Avenues Team |
| **The Student, and their Agent (if any)** — staff approve or reject the document. *(Same wording sends for rejection — subject/status read "Document Rejected" instead.)* | **Subject:** Document Approved: Passport Copy (Front & Back)<br><br>Document Reviewed<br>Your submitted document has been reviewed by our team.<br><br>Document: Passport Copy (Front & Back)<br>Status: Approved<br><br>Please log in to your portal for details.<br><br>Warm regards, The Global Avenues Team |
| **The Student, and their Agent (if any)** — a document request is withdrawn (usually because the application itself was withdrawn). | **Subject:** Document Request Cancelled: Passport Copy (Front & Back)<br><br>Document Request Cancelled<br>The document request below has been cancelled. No further action is needed.<br><br>Document: Passport Copy (Front & Back)<br><br>Warm regards, The Global Avenues Team |

---

## 8. Application Status Updates

Fires on every status change of an application (Submitted → Under Review → Offer Received →
Enrolled, etc.). Sent as two separate, personalized copies — one to the student, one to their
agent if one is assigned — each with their own portal link.

| Who receives it, and why | Exact message content |
|---|---|
| **The Student** — their own application changes status. | **Subject:** Application Update: TGA-2026-004821<br><br>Application Update<br>Hi Priya Sharma, your application TGA-2026-004821 has a new status.<br><br>*New Status:* Offer Received<br><br>Warm regards, The Global Avenues Team |
| **The Agent handling that application** — same status change, own copy. | **Subject:** Application Update: TGA-2026-004821<br><br>Application Update<br>Hi Rahul Mehta, your application TGA-2026-004821 has a new status.<br><br>*New Status:* Offer Received<br><br>Warm regards, The Global Avenues Team |

*Note: "Offer Received" (not the internal `offer_received`) — fixed today so the status shown in the email always matches what the portal itself displays.*

---

## 9. Portal Notices

Announcements an admin writes and publishes (holiday closures, new intake openings, etc.) to
whichever audience they target — All Students, All Agents, or Everyone.

| Who receives it, and why | Exact message content |
|---|---|
| **Everyone in the chosen audience** — a notice is published. | **Subject:** New Notice: Winter Intake Deadlines Extended<br><br>*[A short preview of the notice's own text, exactly as the admin wrote it]*<br><br>Warm regards, The Global Avenues Team |

---

## 10. Login Alert

A quiet security notice — deliberately bell-icon only, not emailed, since it would otherwise fire
every single time anyone logs in.

| Who receives it, and why | Exact message content |
|---|---|
| **The person who just logged in** — a record they can check if a login wasn't them. *(In-app only — no email.)* | **Subject:** New Login to Your TGA Account<br><br>Hi Priya Sharma,<br>You just logged in to the Student Portal at 2026-07-14 09:42.<br><br>If this wasn't you, please contact connect@theglobalavenues.com immediately.<br><br>The TGA Team |

---

## 11. System Health Alerts — Internal Only

Technical monitoring alerts. These never mention students, agents, or business matters — only
Super Admins receive them, about the server itself.

| Who receives it, and why | Exact message content |
|---|---|
| **All Super Admins** — a deadline the business set for itself (e.g. "review a document within 48 hours") is missed. | **Subject:** SLA Breach: Document Review — Immediate Action Required<br><br>An SLA target has been missed and requires immediate attention.<br><br>Rule: Document Review<br>Entity: document_request #4821<br>Target Was: 2026-07-12 14:00<br>Overdue By: 18 hours<br><br>The Global Avenues System |
| **All Super Admins** — server storage disk is getting full (early warning). | **Subject:** Disk Space Warning: 82% Used<br><br>Server disk usage has crossed the warning threshold.<br><br>Current Usage: 82% used — 9.4 GB free<br><br>Consider clearing old backups or logs before this reaches critical levels.<br><br>The Global Avenues System |
| **All Super Admins** — disk is nearly full, uploads about to start failing. | **Subject:** CRITICAL: Disk Space 96% Used<br><br>Server disk usage has crossed the critical threshold. Immediate action is required.<br><br>Current Usage: 96% used — 2.1 GB free<br><br>New uploads will begin failing once the disk is full. Free up space now.<br><br>The Global Avenues System |

---

## 12. Not Yet Sending

These four situations already trigger the notification system in the code, but no message
wording has been written for them yet — so today, **nothing goes out to anyone** when they
happen. This was a deliberate decision: the payment-tracking feature these belong to is not
switched on for clients yet.

| Situation | What it would tell people |
|---|---|
| Payment Requested | Would notify the student/agent that TGA is asking for a payment. |
| Payment Submitted | Would notify staff that a student marked a payment as made. |
| Payment Verified | Would notify the student/agent that staff confirmed the payment. |
| Payment Resolved | Would notify the student/agent after a disputed payment is resolved. |

**Action needed before go-live, only if Payment Tracking is turned on:** if this feature is
enabled at launch, these four notifications need real wording written and approved, the same way
every row above already has. Until then they are silent by design, not a bug.

---

*Generated from the live notification content configured in the CRM, and re-verified against the
actual sending code, on 2026-07-14. Every subject line and message body above is copied exactly as
the system stores it — only the names, codes, and amounts are illustrative samples. If any wording
needs to change, no code changes are required — only the stored message content itself.*
