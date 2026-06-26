# PHASE 6 — Infrastructure Layer
## Notification Engine · Email Dispatch · Reminder Engine · Activity Log · File System · Drive Sync · Cron Jobs

---

## BUILDER DIRECTIVE

**DO NOT TOUCH MARKETING WEBSITE FILES.**
```
src/pages/HomePage.tsx, DestinationsPage.tsx, CountryDetailPage.tsx,
CoursesPage.tsx, CourseCategoryPage.tsx, PartnersPage.tsx, AboutPage.tsx,
ContactPage.tsx, ServicesPage.tsx
src/components/home/*, src/components/layout/*, src/data/*
```

**AI MEMORY DIRECTIVE**: DO NOT make major changes to the frontend.
ONLY build minimal frontend parts to support backend integrations.

**Before writing any code — research:**
- PHPMailer 6.x current SMTP configuration for Bluehost India (port 465 SSL vs 587 TLS)
  Research actual working config — Bluehost SMTP often requires specific settings
- Google Drive API v3 + google/apiclient v2 service account file upload
  Confirm: how to handle large file uploads (>5MB) — resumable vs multipart
- PHP `FOR UPDATE SKIP LOCKED` on MySQL 8.4 — confirm cron concurrency safety
- PHP `exec()` availability on Bluehost shared hosting — mysqldump may be blocked
  If blocked: research PHP-based backup alternative (PDO export)
- Bluehost cPanel cron job PHP binary path — confirm via SSH: `which php`
- PHP execution time limits on shared hosting crons — research chunked processing strategy
- Google Workspace Drive folder sharing for service accounts
  (Service accounts need explicit folder permissions — research exact setup)
- SPF/DKIM records for theglobalavenues.com — verify they are set correctly
  for the SMTP sending domain to avoid spam filters

---

## BUILDER RESEARCH NOTES
| Topic | Finding | Action |
|---|---|---|
| | | |

---

## CONTEXT — WHAT PHASES 1–5 DELIVERED

**All 5 phases must be fully audited before starting Phase 6.**

**Confirmed implemented stack (critical — these affect your code):**
- **Tailwind v4.1.12** — brand tokens are CSS variables in `src/index.css` `@theme` block.
  There is NO `tailwind.config.ts`. Do NOT create one.
- **`motion/react`** — import animations from `motion/react`, NOT `framer-motion`
- **TanStack Query v5** — `useQuery` has NO `onSuccess`/`onError`/`onSettled` callbacks.
  Use `useEffect` watching `data`/`isError` for side effects. `useMutation` still has them.
- **React Router v7.15.0** — use v7 patterns
- **Radix UI primitives** — Dialog, AlertDialog used for all overlays
- **Accessible orange**: `#D96200` for interactive elements (buttons, active states)
  `#FD7E14` is display-only (non-interactive highlights)
- **39 tables** in DB (including `pending_registrations` added in Phase 2)
- **Zustand v5** — store patterns may differ from v4

**Key Phase 1–5 services Phase 6 extends:**
```
EncryptionService::encrypt/decrypt/hash()    XSalsa20-Poly1305, version byte prefix
UlidGenerator::generate()                    Monotonic 26-char ULID
OTPService::generate/verify()                FOR UPDATE lock, hash_equals
ActivityLogger::log()                        Append-only, INSERT-only grant on activity_logs
NotificationService::fire()                  Writes to notifications queue (status='queued')
SecurityEventLogger::log()                   Writes to security_events
CronHealth::start/success/failure()          Updates cron_health table
SystemSettings::get($key)                    Reads from system_settings table
```

**`pending_registrations` table exists (Phase 2 addition):**
```sql
pending_registrations (
  token_hash    VARCHAR(64) UNIQUE,   -- SHA-256(opaque_token)
  email_hash    VARCHAR(64),
  reg_type      VARCHAR(20),          -- 'student' | 'agent'
  encrypted_data BLOB,                -- EncryptionService::encrypt(json)
  expires_at    DATETIME
)
```

**Rate limiting is dual-key (Phase 2 fix):**
Both IP-based AND email-hash-based limits apply to auth endpoints.
429 responses include `Retry-After` header.

**DUMMY_HASH pattern in AuthController (Phase 2 fix):**
Login always calls `password_verify()` even if user not found (constant-time).

---

## WHAT PHASE 6 BUILDS

The full infrastructure that runs behind the product:

1. **NotificationService** — complete implementation (scaffolded in Phase 2)
2. **Email dispatch cron** — processes queue every 2 minutes
3. **In-app notification API** — read/mark-read endpoints + frontend polling
4. **ActivityLogger** — complete implementation (scaffolded in Phase 2)
5. **Reminder engine cron** — processes pending reminders
6. **FileUploadService** — complete with checksums, versioning, Drive queue
7. **Drive sync cron** — uploads pending files
8. **Database backup cron** — daily/weekly/monthly dumps
9. **SLA checker cron** — detects and flags breaches
10. **Disk monitor cron** — alerts at configured thresholds
11. **Log archive cron** — moves old logs to archive table
12. **Frontend** — notification bell with count, NotificationCenter panel

---

## 6A. NOTIFICATION SERVICE — COMPLETE IMPLEMENTATION

Replace Phase 2 scaffold. The service already inserts rows into `notifications`
with status='queued'. Phase 6 adds the email dispatch cron and in-app read API.

```php
// src/Services/NotificationService.php — COMPLETE VERSION

class NotificationService {
    public static function fire(
        string $eventKey,
        array  $vars,
        array  $recipientUserIds
    ): void {
        if (empty($recipientUserIds)) return;

        $template = NotificationTemplateModel::findByEventKey($eventKey);
        if (!$template || !$template['is_active']) return;

        $subject = self::render($template['subject_template'], $vars);
        $body    = self::render($template['body_template'], $vars);
        $channels = array_map('trim', explode(',', $template['channels']));

        $pdo = Database::connect();
        $stmt = $pdo->prepare("
            INSERT INTO notifications
              (public_id, event_key, recipient_user_id, channel, category,
               subject, body, status, related_entity_type, related_entity_id)
            VALUES (?,?,?,?,?,?,?,'queued',?,?)
        ");

        foreach ($recipientUserIds as $userId) {
            if (!$userId) continue;
            foreach ($channels as $channel) {
                $stmt->execute([
                    UlidGenerator::generate(),
                    $eventKey, $userId, $channel,
                    $template['category'] ?? null,
                    $subject, $body,
                    $vars['entity_type'] ?? null,
                    $vars['entity_id']   ?? null,
                ]);
            }
        }
    }

    /**
     * Walk up parent_agent_id chain from a student's attached agent.
     * Returns user_ids of all agents in the chain (agent + parents up to root).
     */
    public static function resolveAgentChain(int $studentId): array {
        $pdo = Database::connect();
        $student = $pdo->prepare(
            "SELECT agent_id FROM students WHERE id = ? AND deleted_at IS NULL"
        );
        $student->execute([$studentId]);
        $row = $student->fetch();
        if (!$row || !$row['agent_id']) return [];

        $userIds = [];
        $agentId = $row['agent_id'];

        while ($agentId) {
            $a = $pdo->prepare(
                "SELECT user_id, parent_agent_id FROM agents WHERE id = ? AND deleted_at IS NULL"
            );
            $a->execute([$agentId]);
            $agent = $a->fetch();
            if (!$agent) break;

            $user = $pdo->prepare(
                "SELECT id FROM users WHERE id = ? AND status = 'active'"
            );
            $user->execute([$agent['user_id']]);
            $u = $user->fetch();
            if ($u) $userIds[] = $u['id'];

            $agentId = $agent['parent_agent_id'];
        }

        return array_unique($userIds);
    }

    public static function getSuperAdminUserIds(): array {
        $pdo = Database::connect();
        return $pdo->query("
            SELECT u.id FROM users u
            JOIN admins a ON a.user_id = u.id
            WHERE a.is_super_admin = 1 AND u.status = 'active'
              AND u.deleted_at IS NULL
        ")->fetchAll(PDO::FETCH_COLUMN);
    }

    private static function render(string $template, array $vars): string {
        foreach ($vars as $key => $value) {
            $template = str_replace('{{' . $key . '}}', (string)$value, $template);
        }
        return $template;
    }
}
```

---

## 6B. EMAIL DISPATCH CRON (every 2 minutes)

```php
// cron/send-notifications.php
<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../crm-api/Config/bootstrap.php';

use PHPMailer\PHPMailer\PHPMailer;
use TGA\CRM\Services\CronHealth;
use TGA\CRM\Config\Database;
use TGA\CRM\Services\EncryptionService;

CronHealth::start('send_notifications');
$startTime = microtime(true);
$pdo = Database::connect();

try {
    // Atomically lock and mark as processing to prevent duplicate dispatch by concurrent crons
    $pdo->beginTransaction();
    $notifications = $pdo->query("
        SELECT n.*, u.email AS email_enc
        FROM notifications n
        JOIN users u ON u.id = n.recipient_user_id
        WHERE n.channel = 'email'
          AND n.status = 'queued'
          AND n.attempts < 3
          AND u.deleted_at IS NULL
        ORDER BY n.created_at ASC
        LIMIT 50
        FOR UPDATE SKIP LOCKED
    ")->fetchAll(PDO::FETCH_ASSOC);

    if (empty($notifications)) {
        $pdo->commit();
    } else {
        $ids = array_column($notifications, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $pdo->prepare("UPDATE notifications SET status='processing' WHERE id IN ($placeholders)")->execute($ids);
        $pdo->commit();
    }

    $sent = 0; $failed = 0;

    foreach ($notifications as $notif) {
        try {
            $email = EncryptionService::decrypt($notif['email_enc']);

            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Timeout    = 10; // Prevent hanging on SMTP server issues
            $mail->Host       = $_ENV['SMTP_HOST'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $_ENV['SMTP_USER'];
            $mail->Password   = $_ENV['SMTP_PASS'];
            $mail->SMTPSecure = $_ENV['SMTP_ENCRYPTION'] ?? PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = (int)($_ENV['SMTP_PORT'] ?? 587);
            $mail->setFrom($_ENV['SMTP_FROM_ADDRESS'], $_ENV['SMTP_FROM_NAME'] ?? 'The Global Avenues');
            $mail->addAddress($email);
            $mail->isHTML(true);
            $mail->Subject = $notif['subject'] ?? '(No Subject)';
            $body = $notif['body'] ?? '';
            $mail->Body    = nl2br(htmlspecialchars($body, ENT_QUOTES, 'UTF-8'));
            $mail->AltBody = $body;
            $mail->send();

            $pdo->prepare("
                UPDATE notifications SET status='sent', sent_at=NOW(),
                attempts=attempts+1, last_attempt_at=NOW() WHERE id=?
            ")->execute([$notif['id']]);
            $sent++;

        } catch (\Throwable $e) {
            $isFinal = ($notif['attempts'] + 1) >= 3;
            $pdo->prepare("
                UPDATE notifications
                SET attempts = attempts + 1,
                    last_attempt_at = NOW(),
                    error_message = ?,
                    status = ?
                WHERE id = ?
            ")->execute([
                substr($e->getMessage(), 0, 500),
                $isFinal ? 'failed' : 'queued',
                $notif['id'],
            ]);
            $failed++;
        }
    }

    // In-app: mark queued → sent immediately (already in DB, no dispatch needed)
    $pdo->exec("
        UPDATE notifications SET status='sent', sent_at=NOW()
        WHERE channel='in_app' AND status='queued'
        LIMIT 500
    ");

    $ms = (int)((microtime(true) - $startTime) * 1000);
    CronHealth::success('send_notifications', $ms, "Sent:{$sent} Failed:{$failed}");

} catch (\Throwable $e) {
    CronHealth::failure('send_notifications', $e->getMessage());
    exit(1);
}
```

Add required `.env` keys:
```
SMTP_HOST=smtp.yourdomain.com
SMTP_USER=notifications@theglobalavenues.com
SMTP_PASS=your_smtp_password
SMTP_PORT=587
SMTP_ENCRYPTION=tls
SMTP_FROM_ADDRESS=connect@theglobalavenues.com
SMTP_FROM_NAME="The Global Avenues"
```

---

## 6C. IN-APP NOTIFICATION API

```
GET    /api/v1/notifications
       Params: status (unread/all), category, limit=20, page=1
       Returns notifications for current user only

GET    /api/v1/notifications/unread-count
       Returns: { "count": 7, "by_category": { "documents": 3, "approvals": 4 } }

PUT    /api/v1/notifications/:publicId/read
PUT    /api/v1/notifications/read-all          Optional: ?category=documents
```

### Frontend notification polling (TanStack Query v5):
```ts
// src/shared/hooks/useNotifications.ts
// TanStack Query v5 — no onSuccess callback on useQuery

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/shared/lib/api';

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useNotifications(category?: string) {
  return useQuery({
    queryKey: ['notifications', { category }],
    queryFn: () => api.get('/notifications', { params: { category, limit: 20 } })
                      .then(r => r.data.data),
    staleTime: 30_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (publicId: string) =>
      api.put(`/notifications/${publicId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

### NotificationCenter component (Tailwind v4 syntax):
```tsx
// src/shared/components/NotificationCenter.tsx
// Uses motion/react (NOT framer-motion):
import { motion, AnimatePresence } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';

// Panel: 360px wide, slides from right
// Tabs: All | Documents | Applications | Payments | Approvals | System
// Each tab maps to category filter on /notifications endpoint
// Mark all as read button per tab
// Infinite scroll with TanStack Query v5 useInfiniteQuery

// Tailwind v4 — use CSS variable tokens, e.g.:
// className="bg-[var(--color-surface-card)] border-[var(--color-border-warm)]"
// OR the token classes if registered: className="bg-surface-card border-border-warm"
```

---

## 6D. ACTIVITY LOGGER — COMPLETE IMPLEMENTATION

The Phase 2 scaffold is partially complete. Verify and complete:

```php
// src/Services/ActivityLogger.php — VERIFY THIS IS COMPLETE

class ActivityLogger {
    public static function log(
        string  $action,
        string  $targetType,
        ?int    $targetId,
        mixed   $before = null,
        mixed   $after  = null
    ): void {
        // Get current actor from AuthMiddleware context
        $actor = \TGA\CRM\Middleware\AuthMiddleware::getCurrentUser();

        $pdo = Database::connect();
        // This table has INSERT-only DB user grant — UPDATE/DELETE will fail at DB level
        $pdo->prepare("
            INSERT INTO activity_logs
              (actor_user_id, actor_user_type, actor_display_name,
               action, target_type, target_id, target_public_id, target_display,
               before_value, after_value, ip_address, user_agent)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ")->execute([
            $actor['id']           ?? null,
            $actor['user_type']    ?? 'system',
            $actor['display_name'] ?? 'System',
            $action,
            $targetType,
            $targetId,
            $after['public_id']  ?? null,
            $after['display']    ?? null,
            $before ? json_encode($before) : null,
            $after  ? json_encode($after)  : null,
            $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
        ]);
        // Silent fail — never throw from activity logger (would break the main request)
    }
}
```

### Activity log API:
```
GET /api/v1/admin/activity-logs
    ModuleGuard: activity_logs.view
    Params: actor_type, action, date_from, date_to, page=1, per_page=50
    Super admin: all rows
    Sub-admin: WHERE target_type IN (their permitted modules)

GET /api/v1/agent/activity-logs
    WHERE actor_user_id IN (user_ids of all agents in my subtree)

GET /api/v1/student/activity-logs
    WHERE actor_user_id = own user_id
```

---

## 6E. REMINDER ENGINE CRON (every 5 minutes)

```php
// cron/process-reminders.php
CronHealth::start('process_reminders');

$pdo = Database::connect();
$pdo->beginTransaction();

$due = $pdo->query("
    SELECT * FROM reminders
    WHERE status = 'pending' AND remind_at <= NOW()
    LIMIT 100
    FOR UPDATE SKIP LOCKED
")->fetchAll();

if (empty($due)) {
    $pdo->commit();
} else {
    $ids = array_column($due, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $pdo->prepare("UPDATE reminders SET status='processing' WHERE id IN ($placeholders)")->execute($ids);
    $pdo->commit();
}

foreach ($due as $reminder) {
    $recipients = json_decode($reminder['recipient_user_ids'], true);
    if (empty($recipients)) {
        // Mark sent to clear the queue
        $pdo->prepare("UPDATE reminders SET status='sent', sent_at=NOW() WHERE id=?")
            ->execute([$reminder['id']]);
        continue;
    }

    $vars     = ReminderEngine::buildVars($reminder['entity_type'], $reminder['entity_id']);
    $eventKey = ReminderEngine::getEventKey($reminder['reminder_type']);

    if ($eventKey && !empty($vars)) {
        NotificationService::fire($eventKey, $vars, $recipients);
    }

    $pdo->prepare("UPDATE reminders SET status='sent', sent_at=NOW() WHERE id=?")
        ->execute([$reminder['id']]);
}

CronHealth::success('process_reminders', $duration);
```

### ReminderEngine class:
```php
// src/Services/ReminderEngine.php

class ReminderEngine {
    private static array $eventKeys = [
        'deadline_3days'     => 'reminder.deadline_3days',
        'deadline_1day'      => 'reminder.deadline_1day',
        'overdue'            => 'reminder.overdue',
        'payment_overdue'    => 'reminder.payment_overdue',
        'commission_pending' => 'reminder.commission_pending',
        'intake_deadline'    => 'reminder.intake_deadline',
    ];

    public static function getEventKey(string $type): ?string {
        return self::$eventKeys[$type] ?? null;
    }

    public static function buildVars(string $entityType, int $entityId): array {
        $pdo = Database::connect();
        return match($entityType) {
            'document_request' => self::buildDocRequestVars($pdo, $entityId),
            'application_payment' => self::buildPaymentVars($pdo, $entityId),
            'intake' => self::buildIntakeVars($pdo, $entityId),
            'commission' => self::buildCommissionVars($pdo, $entityId),
            default => [],
        };
    }

    private static function buildDocRequestVars(PDO $pdo, int $id): array {
        $r = $pdo->prepare("
            SELECT dr.doc_label, dr.deadline, s.full_name AS student_name
            FROM document_requests dr
            JOIN students s ON s.id = dr.student_id
            WHERE dr.id = ?
        ");
        $r->execute([$id]);
        $row = $r->fetch();
        if (!$row) return [];
        return [
            'item_label'      => $row['doc_label'],
            'recipient_name'  => $row['student_name'],
            'deadline'        => $row['deadline'],
            'entity_type'     => 'document_request',
            'entity_id'       => $id,
        ];
    }

    private static function buildPaymentVars(PDO $pdo, int $id): array {
        $r = $pdo->prepare("
            SELECT ap.label, ap.amount, ap.currency, ap.due_date, s.full_name AS student_name
            FROM application_payments ap
            JOIN applications a ON a.id = ap.application_id
            JOIN students s ON s.id = a.student_id
            WHERE ap.id = ?
        ");
        $r->execute([$id]);
        $row = $r->fetch();
        if (!$row) return [];
        return [
            'item_label'  => $row['label'],
            'amount'      => $row['amount'] . ' ' . $row['currency'],
            'deadline'    => $row['due_date'],
            'recipient_name' => $row['student_name'],
        ];
    }

    private static function buildCommissionVars(PDO $pdo, int $id): array {
        $r = $pdo->prepare("
            SELECT c.amount, c.currency, c.created_at,
                   ag.full_name AS agent_name, s.full_name AS student_name
            FROM commissions c
            JOIN agents ag ON ag.id = c.agent_id
            JOIN applications a ON a.id = c.application_id
            JOIN students s ON s.id = a.student_id
            WHERE c.id = ?
        ");
        $r->execute([$id]);
        $row = $r->fetch();
        if (!$row) return [];
        $daysPending = (int)round(
            (time() - strtotime($row['created_at'])) / 86400
        );
        return [
            'agent_name'   => $row['agent_name'],
            'student_name' => $row['student_name'],
            'amount'       => $row['amount'] . ' ' . $row['currency'],
            'days_pending' => $daysPending,
            'admin_url'    => $_ENV['FRONTEND_URL'] . '/admin/commissions',
        ];
    }
}
```

Add reminder notification templates:
```sql
INSERT INTO notification_templates
  (event_key, subject_template, body_template, channels, category) VALUES
('reminder.deadline_3days',
 'Action Required: {{item_label}} Due in 3 Days',
 'Hi {{recipient_name}},\n\nReminder: {{item_label}} is due on {{deadline}} — 3 days away.\n\nPlease act before the deadline.\n\nThe Global Avenues',
 'email,in_app', 'documents'),
('reminder.deadline_1day',
 'Urgent: {{item_label}} Due Tomorrow',
 'Hi {{recipient_name}},\n\n{{item_label}} is due TOMORROW ({{deadline}}).\n\nPlease act today.\n\nThe Global Avenues',
 'email,in_app', 'documents'),
('reminder.overdue',
 'Overdue: {{item_label}}',
 'Hi {{recipient_name}},\n\n{{item_label}} was due on {{deadline}} and is now overdue.\n\nPlease resolve this urgently.\n\nThe Global Avenues',
 'email,in_app', 'documents'),
('reminder.commission_pending',
 'Commission Pending: {{days_pending}} Days — Action Required',
 'Admin notice: Commission for student {{student_name}} (Agent: {{agent_name}}) has been pending for {{days_pending}} days.\n\nAmount: {{amount}}\n\nReview: {{admin_url}}',
 'email,in_app', 'approvals');
```

---

## 6F. FILE UPLOAD SERVICE — COMPLETE IMPLEMENTATION

Extend the existing `FileUploadService.php` (kept from original repo, already handles magic bytes validation).

**Additions required:**

```php
// After successful move to final path, add these steps:

// 1. SHA-256 checksum
$checksum = hash_file('sha256', $absoluteFinalPath);

// 2. Human-readable display filename
// Format: {owner_type}_{owner_public_id}_{slugified_label}_{date}.{ext}
// Example: student_01JXYZ_passport_2026-06-22.pdf
$displayFilename = sprintf('%s_%s_%s_%s.%s',
    $ownerType,
    substr($ownerPublicId, -8),  // last 8 chars of ULID for brevity
    self::slugify($docLabel ?? pathinfo($originalName, PATHINFO_FILENAME)),
    date('Y-m-d'),
    $extension
);

// 3. Check for previous version
$previousFile = FileModel::findLatestByOwnerAndLabel(
    $ownerType, $ownerId, $docLabel
);
$versionNumber = $previousFile ? ($previousFile['version_number'] + 1) : 1;

// 4. INSERT into files table (service owns this, not the controller)
$filePublicId = UlidGenerator::generate();
$fileId = FileModel::create([
    'public_id'          => $filePublicId,
    'owner_type'         => $ownerType,
    'owner_id'           => $ownerId,
    'display_filename'   => $displayFilename,
    'stored_filename'    => $uuidFilename,
    'storage_path'       => $relativePath,
    'is_public'          => $isPublic ? 1 : 0,
    'mime_type'          => $detectedMime,
    'file_size_bytes'    => filesize($absoluteFinalPath),
    'checksum_sha256'    => $checksum,
    'version_number'     => $versionNumber,
    'previous_version_id'=> $previousFile['id'] ?? null,
    'uploaded_by_type'   => $uploaderType,
    'uploaded_by_id'     => $uploaderId,
    'drive_sync_status'  => 'pending',
    'drive_folder_path'  => self::buildDriveFolderPath($ownerType, $ownerId),
]);

// 5. Mark previous version as superseded
if ($previousFile) {
    FileModel::update($previousFile['id'], ['superseded_at' => date('Y-m-d H:i:s')]);
}

return $fileId;

// Helper: build Drive folder path
private static function buildDriveFolderPath(string $ownerType, mixed $ownerPublicId): string {
    $map = [
        'student'     => "TGA-CRM/Students/{$ownerPublicId}/Documents",
        'application' => "TGA-CRM/Applications/{$ownerPublicId}",
        'university'  => "TGA-CRM/Universities/{$ownerPublicId}",
        'notice'      => "TGA-CRM/Notices",
    ];
    return $map[$ownerType] ?? 'TGA-CRM/Misc';
}

private static function slugify(string $text): string {
    return strtolower(preg_replace('/[^a-z0-9]+/i', '_', trim($text)));
}
```

### File download gatekeeper:
```
GET /api/v1/files/:publicId/download
Protected: requires valid JWT
```

```php
// FileController::download($publicId)
// 1. Load file by public_id
// 2. Auth + ownership check:
//    Student: owner_type='student' AND owner_id = own student_id
//    Agent: owner is a student in their subtree (root_agent_id match)
//    Admin: any file IF documents.view permission
// 3. Verify checksum: hash_file('sha256', $path) === file.checksum_sha256
//    Mismatch: log security event 'file_integrity_failure', return 500
// 4. Serve:
header('Content-Type: ' . $file['mime_type']);
header('Content-Disposition: attachment; filename="' . $file['display_filename'] . '"');
header('Content-Length: ' . $file['file_size_bytes']);
readfile($absolutePath);
exit;
```

---

## 6G. GOOGLE DRIVE SYNC CRON (every 5 minutes)

```php
// cron/sync-drive.php
CronHealth::start('sync_drive');

require_once __DIR__ . '/../vendor/autoload.php';
$pdo = Database::connect();

try {
    $client = new Google\Client();
    $client->setAuthConfig($_ENV['DRIVE_SERVICE_ACCOUNT_JSON']);
    $client->addScope(Google\Service\Drive::DRIVE);
    $drive = new Google\Service\Drive($client);

    // Batch of 20 to avoid API rate limits
    $pending = $pdo->query("
        SELECT * FROM files
        WHERE drive_sync_status = 'pending'
          AND deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT 20
    ")->fetchAll();

    foreach ($pending as $file) {
        $absolutePath = BASE_STORAGE_PATH . '/' . $file['storage_path'];

        if (!file_exists($absolutePath)) {
            ActivityLogger::log('file.missing_from_disk', 'file', $file['id'], null, $file);
            $pdo->prepare("UPDATE files SET drive_sync_status='failed' WHERE id=?")
                ->execute([$file['id']]);
            continue;
        }

        try {
            $folderId = DriveFolderManager::ensurePath($drive, $file['drive_folder_path']);

            $meta = new Google\Service\Drive\DriveFile([
                'name'    => $file['display_filename'],
                'parents' => [$folderId],
            ]);

            // Use chunked resumable upload to prevent memory exhaustion on large files
            $client->setDefer(true);
            $request = $drive->files->create($meta, [
                'uploadType' => 'resumable'
            ]);
            $media = new \Google\Http\MediaFileUpload(
                $client, $request, $file['mime_type'], null, true, 5 * 1024 * 1024
            );
            $media->setFileSize(filesize($absolutePath));
            
            $status = false;
            $handle = fopen($absolutePath, "rb");
            while (!$status && !feof($handle)) {
                $chunk = fread($handle, 5 * 1024 * 1024);
                $status = $media->nextChunk($chunk);
            }
            fclose($handle);
            $client->setDefer(false);
            $result = $status;

            $pdo->prepare("
                UPDATE files SET drive_file_id=?, drive_sync_status='synced', updated_at=NOW()
                WHERE id=?
            ")->execute([$result->id, $file['id']]);

        } catch (\Throwable $e) {
            $pdo->prepare("UPDATE files SET drive_sync_status='failed' WHERE id=?")
                ->execute([$file['id']]);
            // Failed = will retry next run (status stays 'failed', re-queue manually if needed)
        }
    }

    CronHealth::success('sync_drive', $duration, count($pending) . ' files processed');

} catch (\Throwable $e) {
    CronHealth::failure('sync_drive', $e->getMessage());
}
```

Add to `.env`:
```
DRIVE_SERVICE_ACCOUNT_JSON=/home/{username}/crm-api/config/drive-credentials.json
DRIVE_BACKUP_FOLDER_ID=your_google_drive_folder_id
```

---

## 6H. DATABASE BACKUP CRON (daily at 2am)

```php
// cron/backup-db.php
// Note: Research whether exec()/mysqldump is available on Bluehost
// If not available, use PHP-based PDO dump as fallback

CronHealth::start('backup_db');
$today = date('Y-m-d');

// Option A: mysqldump (if available)
$filename = "tga_crm_{$today}.sql.gz";
$tmpPath  = BASE_PATH . '/storage/backups/' . $filename;

$execEnabled = function_exists('exec') && !in_array('exec', array_map('trim', explode(',', ini_get('disable_functions'))));

if ($execEnabled) {
    exec(sprintf(
        'mysqldump -u%s -p%s -h%s %s 2>/dev/null | gzip > %s',
        escapeshellarg($_ENV['DB_USER']),
        escapeshellarg($_ENV['DB_PASS']),
        escapeshellarg($_ENV['DB_HOST']),
        escapeshellarg($_ENV['DB_NAME']),
        escapeshellarg($tmpPath)
    ), $output, $code);
} else {
    $code = 1; // Force fallback
}

if ($code !== 0 || !file_exists($tmpPath)) {
    // Option B: PHP PDO dump fallback
    $tmpPath = PhpMysqlDump::dump(Database::connect(), $tmpPath);
}

// Upload to Drive
DriveFolderManager::uploadBackup($drive, $tmpPath, 'daily', $filename);

// Weekly: Monday
if (date('N') === '1') {
    DriveFolderManager::uploadBackup($drive, $tmpPath, 'weekly', $filename);
}
// Monthly: 1st
if (date('j') === '1') {
    DriveFolderManager::uploadBackup($drive, $tmpPath, 'monthly', $filename);
}

// Enforce retention (delete old backups beyond configured limit)
BackupRetentionManager::enforce($drive, SystemSettings::getAll());

unlink($tmpPath);
CronHealth::success('backup_db', $duration, "Backup: {$filename}");
```

---

## 6I. SLA CHECKER CRON (every 30 minutes)

```php
// cron/check-sla-breaches.php
CronHealth::start('check_sla_breaches');

$breached = $pdo->query("
    SELECT se.*, sr.rule_name, sr.entity_type
    FROM sla_events se
    JOIN sla_rules sr ON sr.id = se.sla_rule_id
    WHERE se.status = 'active'
      AND se.target_at < NOW()
      AND se.breach_notified = 0
")->fetchAll();

foreach ($breached as $event) {
    $pdo->prepare("UPDATE sla_events SET status='breached', breach_notified=1 WHERE id=?")
        ->execute([$event['id']]);

    $overdue = (int)round((time() - strtotime($event['target_at'])) / 3600);
    NotificationService::fire('sla.breached', [
        'rule_name'     => $event['rule_name'],
        'entity_type'   => $event['entity_type'],
        'entity_id'     => $event['entity_id'],
        'target_at'     => $event['target_at'],
        'overdue_hours' => $overdue,
        'admin_url'     => $_ENV['FRONTEND_URL'] . '/admin/',
    ], NotificationService::getSuperAdminUserIds());

    ActivityLogger::log('sla.breached', $event['entity_type'], (int)$event['entity_id']);
}

CronHealth::success('check_sla_breaches', $duration, count($breached) . ' breaches');
```

Add SLA breach template:
```sql
INSERT INTO notification_templates
  (event_key, subject_template, body_template, channels, category) VALUES
('sla.breached',
 'SLA Breach: {{rule_name}} — Immediate Action Required',
 'An SLA target has been missed.\n\nRule: {{rule_name}}\nEntity: {{entity_type}} #{{entity_id}}\nTarget was: {{target_at}}\nNow overdue by: {{overdue_hours}} hours\n\nReview: {{admin_url}}',
 'email,in_app', 'system');
```

---

## 6J. DISK MONITOR CRON (daily at 6am)

```php
// cron/monitor-disk.php
CronHealth::start('monitor_disk');

$warnPct = (int)SystemSettings::get('disk_warn_threshold_pct', '80');
$critPct = (int)SystemSettings::get('disk_critical_threshold_pct', '95');

$total   = disk_total_space(BASE_STORAGE_PATH);
$free    = disk_free_space(BASE_STORAGE_PATH);
$usedPct = round(($total - $free) / $total * 100, 1);

if ($usedPct >= $critPct) {
    NotificationService::fire('system.disk_critical',
        ['used_pct' => $usedPct, 'free_gb' => round($free / 1e9, 1)],
        NotificationService::getSuperAdminUserIds());
} elseif ($usedPct >= $warnPct) {
    NotificationService::fire('system.disk_warning',
        ['used_pct' => $usedPct, 'free_gb' => round($free / 1e9, 1)],
        NotificationService::getSuperAdminUserIds());
}

CronHealth::success('monitor_disk', $duration, "Disk used: {$usedPct}%");
```

Add disk templates:
```sql
INSERT INTO notification_templates
  (event_key, subject_template, body_template, channels, category) VALUES
('system.disk_warning',
 'Disk Space Warning: {{used_pct}}% Used',
 'Server disk is {{used_pct}}% full ({{free_gb}} GB free).\n\nTake action before hitting critical threshold.',
 'email,in_app', 'system'),
('system.disk_critical',
 'CRITICAL: Disk Space {{used_pct}}% Used',
 'URGENT: Server disk is {{used_pct}}% full ({{free_gb}} GB free).\n\nImmediate action required or uploads will fail.',
 'email,in_app', 'system');
```

---

## 6K. LOG ARCHIVE CRON (daily at 1am)

```php
// cron/archive-old-logs.php
// activity_logs > 2 years → activity_logs_archive
// security_events > 5 years → delete permanently

CronHealth::start('archive_old_logs');

$twoYearsAgo  = date('Y-m-d', strtotime('-2 years'));
$fiveYearsAgo = date('Y-m-d', strtotime('-5 years'));

// Archive in batches (shared hosting memory limit)
$archived = 0;
do {
    $pdo->exec("
        INSERT INTO activity_logs_archive
        SELECT * FROM activity_logs
        WHERE created_at < '{$twoYearsAgo}'
        LIMIT 1000
    ");
    $affected = $pdo->exec("
        DELETE FROM activity_logs
        WHERE created_at < '{$twoYearsAgo}'
        LIMIT 1000
    ");
    $archived += $affected;
} while ($affected >= 1000);

// Delete old security events
$pdo->exec("
    DELETE FROM security_events
    WHERE created_at < '{$fiveYearsAgo}'
    LIMIT 1000
");

CronHealth::success('archive_old_logs', $duration, "Archived: {$archived} rows");
```

---

## 6L. CPANEL CRON SETUP

Via cPanel → Cron Jobs on Bluehost India. Research exact PHP path via SSH first:
```bash
ssh -i ~/.ssh/id_rsa username@theglobalavenues.com
which php   # Note the exact path
```

Then add:
```
*/2  * * * *   /usr/local/bin/php /home/{user}/crm-api/cron/send-notifications.php >> /home/{user}/crm-api/storage/logs/notif.log 2>&1
*/5  * * * *   /usr/local/bin/php /home/{user}/crm-api/cron/sync-drive.php >> /home/{user}/crm-api/storage/logs/drive.log 2>&1
*/5  * * * *   /usr/local/bin/php /home/{user}/crm-api/cron/process-reminders.php >> /home/{user}/crm-api/storage/logs/reminders.log 2>&1
*/30 * * * *   /usr/local/bin/php /home/{user}/crm-api/cron/check-sla-breaches.php >> /home/{user}/crm-api/storage/logs/sla.log 2>&1
0    2 * * *   /usr/local/bin/php /home/{user}/crm-api/cron/backup-db.php >> /home/{user}/crm-api/storage/logs/backup.log 2>&1
0    6 * * *   /usr/local/bin/php /home/{user}/crm-api/cron/monitor-disk.php >> /home/{user}/crm-api/storage/logs/disk.log 2>&1
0    1 * * *   /usr/local/bin/php /home/{user}/crm-api/cron/archive-old-logs.php >> /home/{user}/crm-api/storage/logs/archive.log 2>&1
0    3 * * 0   /usr/local/bin/php /home/{user}/crm-api/cron/verify-backups.php >> /home/{user}/crm-api/storage/logs/verify.log 2>&1
```

---

## PHASE 6 AUDIT CHECKLIST

### Email dispatch:
- [ ] Cron runs without PHP errors (check cron log file)
- [ ] Email arrives at test inbox from correct sender address
- [ ] HTML email renders correctly (test Gmail, Outlook)
- [ ] Plain text fallback present in email
- [ ] Failed email: attempts incremented, status='failed' after 3 attempts
- [ ] `FOR UPDATE SKIP LOCKED` prevents duplicate dispatch on concurrent cron runs

### In-app notifications:
- [ ] GET /notifications returns correct notifications for current user
- [ ] Unread count badge appears in TopBar
- [ ] Count decrements when notifications marked as read
- [ ] Mark all as read works per category
- [ ] NotificationCenter tabs filter correctly by category
- [ ] TanStack Query v5 — no `onSuccess` callback on `useQuery` (use useEffect instead)

### Reminder engine:
- [ ] Due reminder rows (remind_at < NOW()) processed by cron
- [ ] Notification queued for each processed reminder
- [ ] Reminder status updated to 'sent'
- [ ] 3-day deadline reminder: verify reminder_days_before_deadline setting is read from system_settings

### Activity logger:
- [ ] student.registered logged (Phase 2 already wired this — verify still working)
- [ ] application.status_changed logged on every status change
- [ ] Direct UPDATE on activity_logs table via phpMyAdmin fails (INSERT-only confirmed)
- [ ] Agent sees only own + sub-agent logs (not parent)

### File upload:
- [ ] SHA-256 checksum stored in files table
- [ ] display_filename is human-readable (slug format)
- [ ] version_number = 1 on first upload
- [ ] Resubmission: version_number = 2, old file has superseded_at set
- [ ] Previous version row still exists (not deleted)
- [ ] drive_sync_status = 'pending' immediately after upload

### Drive sync:
- [ ] Cron runs without Google API auth errors
- [ ] File appears in correct Drive folder path after cron run
- [ ] drive_sync_status updates to 'synced' after successful upload
- [ ] Failed sync: status stays 'failed', retried on next run

### Backups:
- [ ] Backup file created (check storage/backups/ dir)
- [ ] Backup uploaded to Drive Backups/daily/
- [ ] Monday backup also in Backups/weekly/
- [ ] 1st of month also in Backups/monthly/
- [ ] Local temp backup deleted after Drive upload

### SLA:
- [ ] SLA event created when application submitted (72h target)
- [ ] SLA event created when document submitted (48h target)
- [ ] Breached events found by SLA cron
- [ ] breach_notified = 1 set after first notification (no duplicates)

### Cron health:
- [ ] All 8 cron jobs update cron_health table (last_run_at, status, duration)
- [ ] Admin cron health dashboard shows real status from cron_health table
- [ ] Failed cron shows red with error message

### Frontend (Tailwind v4 compliance):
- [ ] NotificationCenter uses CSS variable tokens (var(--color-*)) — no tailwind.config.ts
- [ ] AnimatePresence imported from 'motion/react' (not 'framer-motion')
- [ ] No forbidden colors (blue-*, indigo-*) in new components
- [ ] Marketing website files untouched (git diff confirms)
