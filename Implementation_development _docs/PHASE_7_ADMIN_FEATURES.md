# PHASE 7 — Admin Power Features
## Leads Pipeline · Notices & Events · Internal Notes · System Settings · Global Search · Activity Feed

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
ONLY build the minimal frontend parts necessary to support backend integrations.

**Before writing any code — research:**
- `dnd-kit` current API for drag-and-drop kanban on React 18
  (`react-beautiful-dnd` is unmaintained — do NOT use it)
- MySQL 8.4 FULLTEXT indexes with `MATCH...AGAINST` in BOOLEAN MODE —
  confirm performance implications on tables with millions of rows
- PHP CORS for `/api/v1/public/leads` — the marketing site
  (different origin: theglobalavenues.com) needs to POST here.
  Research exact PHP CORS header setup for cross-origin form submissions
- Rich text for notices: research whether a textarea is sufficient
  or if a lightweight editor (TipTap) is warranted for the notice body.
  Factor in bundle size impact on the admin portal.
- UTM parameter capture from marketing website lead forms —
  how to pass utm_source/utm_medium to the public leads endpoint
- MySQL FULLTEXT minimum word length (default 3 chars in MySQL 8.4) —
  confirm this aligns with the 3-character search minimum in our spec

---

## BUILDER RESEARCH NOTES
| Topic | Finding | Action |
|---|---|---|
| dnd-kit | react-beautiful-dnd is deprecated and doesn't support React 18 strict mode well. dnd-kit is modular and highly performant. | Use @dnd-kit/core, @dnd-kit/sortable, and @dnd-kit/utilities for the Kanban board. |
| MySQL 8.4 FULLTEXT | Default innodb_ft_min_token_size is 3. Prefix searches (q*) are supported in BOOLEAN MODE but can be CPU intensive on millions of rows. | Ensure frontend enforces a 3-character minimum. Scope searches by role (agent subtree) to limit rows scanned. |
| PHP CORS for Leads | Allow-Origin: * cannot be used with credentials, but the public leads endpoint is unauthenticated. | Explicitly set Access-Control-Allow-Origin: https://theglobalavenues.com for security, handle OPTIONS preflight returning 204. |
| TipTap Editor | Excellent for lightweight rich text. Output can be HTML or JSON. | Use TipTap for Notices content. Store as sanitized HTML in DB. |
| UTM Tracking | Marketing forms send UTMs in hidden fields. | Parse utm_source, utm_medium, utm_campaign in PHP and store cleanly in source_detail JSON column. Display nicely in Lead Detail UI. |

---

## CONTEXT — WHAT PHASES 1–6 DELIVERED

**All 6 phases must be fully audited before starting Phase 7.**

**Confirmed stack (critical — use these exactly):**
- **Tailwind v4.1.12** — tokens as CSS variables in `src/index.css` `@theme` block.
  NO `tailwind.config.ts`. Use `var(--color-brand-orange)` or registered utility classes.
- **`motion/react` v12** — import `{ motion, AnimatePresence }` from `'motion/react'`
- **TanStack Query v5** — `useQuery` has NO `onSuccess`/`onError`/`onSettled`.
  Use `useEffect` watching `data`/`isError` for side effects.
  `useMutation` still has `onSuccess`/`onError`/`onSettled` — these are fine.
- **React Router v7.15.0**
- **Radix UI** — use for overlays (Dialog, AlertDialog, DropdownMenu)
- **`dnd-kit`** — use for drag-and-drop (NOT react-beautiful-dnd)
- **Accessible orange: `#D96200`** for interactive elements (buttons, active nav)
  `#FD7E14` is display-only (non-interactive decorative highlights)
- **39 tables** in DB (includes `pending_registrations` from Phase 2)
- **Zustand v5** for state management

**Services available from previous phases:**
```
NotificationService::fire($eventKey, $vars, $userIds)
ActivityLogger::log($action, $type, $id, $before, $after)
SecurityEventLogger::log($type, $userId, $identifier, $ip, $ua, $details)
EncryptionService::encrypt/decrypt/hash()
UlidGenerator::generate()
SystemSettings::get($key, $default)
FileUploadService::store($file, $ownerType, $ownerId, $isPublic)
CronHealth::start/success/failure()
```

**Phase 3 built all admin page shells** — Phase 7 wires them to real data.
All 16 admin pages exist with correct layouts, permission gating, and empty states.
Phase 7 does NOT add new pages — it connects the existing ones to real endpoints.

---

## WHAT PHASE 7 BUILDS

1. **Leads pipeline** — full CRUD, public capture endpoint, kanban, conversion
2. **Notices & Events** — create, publish, audience targeting, file attachments
3. **Internal notes** — on students and applications with per-note visibility
4. **System settings** — super admin UI to edit operational config values
5. **Global search** — FULLTEXT endpoint + CommandPalette integration
6. **Activity feed** — recent events for all dashboard overview pages
7. **Admin overview** — wire real action queue counts and cron health strip

---

## 7A. LEADS PIPELINE

Leads are TGA's internal asset. **Agents never see them — ever.**
The `leads.assigned_to` column points to `admins.id`, not `agents.id`.

### Routes

```
GET    /api/v1/admin/leads              ModuleGuard: leads.view
POST   /api/v1/admin/leads              ModuleGuard: leads.create
GET    /api/v1/admin/leads/:pid         ModuleGuard: leads.view
PUT    /api/v1/admin/leads/:pid         ModuleGuard: leads.edit
DELETE /api/v1/admin/leads/:pid         ModuleGuard: leads.delete
PUT    /api/v1/admin/leads/:pid/assign  ModuleGuard: leads.edit
POST   /api/v1/admin/leads/:pid/convert ModuleGuard: leads.create + students.create

POST   /api/v1/public/leads             No auth — marketing website forms
```

### Public lead capture:

```php
// POST /api/v1/public/leads
// CORS: Allow-Origin: theglobalavenues.com specifically (not *)
// No auth required — but rate-limit to prevent spam

// Input: { full_name, email, phone (opt), source, source_detail (opt),
//           interested_country (opt), interested_course (opt),
//           utm_source (opt), utm_medium (opt), utm_campaign (opt) }

// Rate limit: 5 requests/hour per IP

// Logic:
// 1. Validate: name required, email format required
// 2. Encrypt email and phone (EncryptionService::encrypt)
// 3. Hash email for lookup (EncryptionService::hash)
// 4. INSERT leads:
//    public_id = UlidGenerator::generate()
//    status = 'new'
//    source_detail = utm params as JSON string if provided
// 5. Notify super admins: NotificationService::fire('lead.new', $vars, $superAdminIds)
// 6. ActivityLogger::log('lead.created', 'lead', $lead->id)
// 7. Return: { "success": true } — NEVER reveal if email already in DB

// Note: Allow duplicate email leads — different campaigns may generate
// the same email. Deduplication is a manual admin decision, not automatic.
```

### Lead status pipeline:
```
new → contacted → qualified → converted | dropped
```

### Change status:
```php
// PUT /api/v1/admin/leads/:pid
// Input: { status, notes }
// Validate: only allowed transitions
// UPDATE leads SET status=?, notes=?, assigned_to=? (if provided)
// ActivityLogger::log('lead.status_changed', 'lead', $id, $before, $after)
// NotificationService::fire('lead.status_changed', $vars, [$assignedStaffUserId])
```

### Assign to staff:
```php
// PUT /api/v1/admin/leads/:pid/assign
// Input: { admin_public_id }
// Resolve admin by public_id
// UPDATE leads SET assigned_to = $admin->id
// ActivityLogger::log('lead.assigned', ...)
// NotificationService::fire('lead.assigned', $vars, [$newStaffUserId])
```

### Convert lead to student:
```php
// POST /api/v1/admin/leads/:pid/convert
// Input: { password, nationality, date_of_birth, agent_referral_code (opt) }
// Lead must be status = 'qualified' (enforce in PHP)

// Logic (inside PDO transaction):
// 1. Decrypt lead email for use in registration
// 2. INSERT users (user_type='student', status='active',
//    email=lead.email, email_lookup_hash=lead.email_lookup_hash,
//    password_hash=password_hash($password, PASSWORD_ARGON2ID, $argon2Options))
// 3. INSERT students (registered_by_type='admin', registered_by_id=$admin->id,
//    lead_source=lead.source, agent_id resolved from referral_code if provided)
// 4. INSERT user_preferences (user_id, preferences=DEFAULT)
// 5. UPDATE leads SET status='converted', converted_student_id=$student->id
// 6. ActivityLogger::log('lead.converted', ...)
// 7. NotificationService::fire('student.registered', $vars, [$newUserId])
// Note: No OTP step — admin has already verified the person by phone/email
```

### Notification templates to add:
```sql
INSERT INTO notification_templates
  (event_key, subject_template, body_template, channels, category) VALUES
('lead.new',
 'New Lead: {{full_name}} from {{source}}',
 'A new lead has been captured.\n\nName: {{full_name}}\nSource: {{source}}\nInterested in: {{interested_country}} — {{interested_course}}\n\nView: {{admin_url}}',
 'email,in_app', 'system'),

('lead.assigned',
 'Lead Assigned to You: {{full_name}}',
 'Hi {{staff_name}},\n\nA lead has been assigned to you.\n\nName: {{full_name}}\nSource: {{source}}\n\nView: {{admin_url}}',
 'email,in_app', 'system'),

('lead.status_changed',
 'Lead Status Updated: {{full_name}}',
 'Lead {{full_name}} has moved to status: {{new_status}}.\n\nView: {{admin_url}}',
 'in_app', 'system');
```

### Frontend — AdminLeadsPage:

```tsx
// Phase 3 built the shell. Phase 7 wires data.
// Uses TanStack Query v5:

const { data: leads, isLoading } = useQuery({
  queryKey: ['admin', 'leads', filters],
  queryFn: () => api.get('/admin/leads', { params: filters }).then(r => r.data.data),
  staleTime: 30_000,
});

// Side effects via useEffect (TanStack Query v5 — no onSuccess on useQuery):
useEffect(() => {
  if (isError) toast.error('Failed to load leads');
}, [isError]);

// Kanban columns: new | contacted | qualified | converted | dropped
// UX FIX: Terminal states (converted, dropped) MUST be hidden by default behind a "View Archive" toggle.
// UX FIX: Implement a "days in current status" staleness indicator to enforce SLAs.
// UX FIX: Flag leads that share an email or phone with existing records to prevent duplicate clutter.
// Use dnd-kit for drag-and-drop between columns
// Drag a card → fire PUT /admin/leads/:pid with new status
// useMutation for status change (useMutation still has onSuccess):

const statusMutation = useMutation({
  mutationFn: ({ pid, status }: { pid: string; status: string }) =>
    api.put(`/admin/leads/${pid}`, { status }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] });
    toast.success('Lead status updated');
  },
  onError: () => toast.error('Failed to update lead'),
});

// dnd-kit DndContext + Droppable columns + Draggable cards
// On drag end: call statusMutation.mutate({ pid, newStatus })
```

---

## 7B. NOTICES & EVENTS

### Routes

```
GET    /api/v1/admin/notices            ModuleGuard: notices.view
POST   /api/v1/admin/notices            ModuleGuard: notices.create
GET    /api/v1/admin/notices/:pid       ModuleGuard: notices.view
PUT    /api/v1/admin/notices/:pid       ModuleGuard: notices.edit
DELETE /api/v1/admin/notices/:pid       ModuleGuard: notices.delete
PUT    /api/v1/admin/notices/:pid/publish  ModuleGuard: notices.edit

GET    /api/v1/student/notices          Published, visible_to_students = 1
GET    /api/v1/agent/notices            Published, visible_to_agents = 1
GET    /api/v1/admin/notices/feed       Published, visible_to_admins = 1
```

### Create notice:
```php
// Input: { title, content, notice_type (notice|event), event_date (if event),
//           event_location (if event), visible_to_students, visible_to_agents,
//           visible_to_admins, expires_at }
// CONTENT: The `content` field should accept sanitized HTML from a TipTap editor in the admin UI.
// INSERT notices (status='draft', created_by=$admin->id, expires_at=$expires_at)
// NOTE: Ensure notices past their `expires_at` date are excluded from feeds.
// Attachment handled separately via /files endpoint then linked
// ActivityLogger::log('notice.created', ...)
// Return: notice with public_id
```

### Publish notice:
```php
// PUT /api/v1/admin/notices/:pid/publish
// 1. UPDATE notices SET status='published', published_at=NOW()
// 2. Resolve recipients from visibility flags:

$recipients = [];
if ($notice['visible_to_students']) {
    // Fetch all active student user_ids (chunk if large dataset)
    $studentIds = $pdo->query("
        SELECT u.id FROM users u
        WHERE u.user_type = 'student' AND u.status = 'active' AND u.deleted_at IS NULL
    ")->fetchAll(PDO::FETCH_COLUMN);
    $recipients = array_merge($recipients, $studentIds);
}
if ($notice['visible_to_agents']) {
    $agentIds = $pdo->query("
        SELECT u.id FROM users u
        JOIN agents a ON a.user_id = u.id
        WHERE u.status = 'active' AND a.status = 'approved' AND u.deleted_at IS NULL
    ")->fetchAll(PDO::FETCH_COLUMN);
    $recipients = array_merge($recipients, $agentIds);
}
if ($notice['visible_to_admins']) {
    $adminIds = $pdo->query("
        SELECT u.id FROM users u WHERE u.user_type = 'admin'
        AND u.status = 'active' AND u.deleted_at IS NULL
    ")->fetchAll(PDO::FETCH_COLUMN);
    $recipients = array_merge($recipients, $adminIds);
}

// For large recipient lists: chunk inserts (1000 at a time)
// to avoid memory limits on shared hosting
$chunks = array_chunk(array_unique($recipients), 1000);
foreach ($chunks as $chunk) {
    NotificationService::fire('notice.published',
        ['title' => $notice['title'],
         'content_preview' => substr(strip_tags($notice['content'] ?? ''), 0, 200),
         'portal_url' => $_ENV['FRONTEND_URL']],
        $chunk);
}

ActivityLogger::log('notice.published', 'notice', $notice['id'], null,
    ['title' => $notice['title']]);
```

Add notice template:
```sql
INSERT INTO notification_templates
  (event_key, subject_template, body_template, channels, category) VALUES
('notice.published',
 'New Notice: {{title}}',
 '{{title}}\n\n{{content_preview}}\n\nView on your portal: {{portal_url}}',
 'email,in_app', 'system');
```

### Attachment upload for notices:
```php
// POST /api/v1/admin/notices/:pid/attachment
// FileUploadService::store($file, 'notice', $notice->id, is_public: true)
// Files stored in: public/uploads/public/notices/
// UPDATE notices SET attachment_file_id = $fileId
```

---

## 7C. INTERNAL NOTES

Notes on students and applications. Per-note audience control.

### Routes

```
GET    /api/v1/students/:pid/notes              All notes visible to caller
POST   /api/v1/students/:pid/notes              Add note (admin or agent on own students)
DELETE /api/v1/notes/:pid                       Own notes only

GET    /api/v1/applications/:pid/notes          All notes visible to caller
POST   /api/v1/applications/:pid/notes          Add note
```

### Create note:
```php
// Input: { content, visible_to_student (bool), visible_to_agent (bool),
//           visible_to_admin (bool) }
// visible_to_admin defaults to true — always visible to admin

// Author resolved from JWT:
// admin JWT → author_type='admin', author_id=$admin->id
// agent JWT → author_type='agent', author_id=$agent->id

// Agent guard: can only add notes on students in their subtree
// assertAgentSubtreeAccess($student->root_agent_id, $requestingAgent->root_agent_id)

// INSERT internal_notes (public_id=ULID, is_pinned=0, ...)
// PUT /api/v1/notes/:pid/pin (Toggle is_pinned to highlight critical notes)
// ActivityLogger::log('note.added', ...)
```

### Read notes (visibility filter at query level):
```php
// Admin reading:
"SELECT * FROM internal_notes
 WHERE entity_type=? AND entity_id=?
   AND (visible_to_admin=1 OR (author_type='admin' AND author_id=?))
   AND deleted_at IS NULL
 ORDER BY created_at DESC"

// Agent reading:
"SELECT * FROM internal_notes
 WHERE entity_type=? AND entity_id=?
   AND visible_to_agent=1
   AND deleted_at IS NULL
 ORDER BY created_at DESC"
// + assertAgentSubtreeAccess for the student

// Student reading:
"SELECT * FROM internal_notes
 WHERE entity_type=? AND entity_id=?
   AND visible_to_student=1
   AND deleted_at IS NULL
 ORDER BY created_at DESC"
```

### Delete note:
```php
// Soft delete: UPDATE internal_notes SET deleted_at=NOW()
// Guard: author_type + author_id must match caller
// Admin super guard: super admin can delete any note
```

### Frontend — Notes tab (student and application detail pages):
```tsx
// Already exists as a tab in Phase 3 shells — wire data here

const { data: notes } = useQuery({
  queryKey: ['notes', entityType, publicId],
  queryFn: () => api.get(`/${entityType}s/${publicId}/notes`).then(r => r.data.data),
});

const addNote = useMutation({
  mutationFn: (payload: NotePayload) =>
    api.post(`/${entityType}s/${publicId}/notes`, payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['notes', entityType, publicId] });
    setNoteContent('');
    toast.success('Note added');
  },
});

// Note form: textarea + 3 checkboxes (visible to: Student / Agent / Admin)
// Notes list: avatar + name + time ago + visibility badges + delete button (own notes)
// Visibility badges: "Admin only" | "Agents can see" | "Student can see"
```

---

## 7D. SYSTEM SETTINGS

Super admin edits operational config. Values in `system_settings` table.
Secrets stay in `.env` — NEVER editable via this UI.

### Routes

```
GET /api/v1/admin/system-settings      ModuleGuard: system_settings.view
    Returns all settings grouped by group_name

PUT /api/v1/admin/system-settings      ModuleGuard: system_settings.edit
    PHP guard: is_super_admin = 1 (not just module permission)
    Input: { settings: [{ key: "otp_expiry_minutes", value: "15" }] }
```

### Update logic:
```php
// PUT /api/v1/admin/system-settings
// Super admin only (PHP guard — not just RBAC)
if (!$requestingAdmin['is_super_admin']) {
    return Response::error('FORBIDDEN', 'Only super admin can edit system settings', [], 403);
}

// Validate each value against its value_type (with STRICT BOUNDS to prevent production failure):
foreach ($input['settings'] as $item) {
    $setting = SystemSettingModel::findByKey($item['key']);
    if (!$setting || !$setting['is_editable']) continue;

    $valid = match($setting['value_type']) {
        'integer' => is_numeric($item['value']) && (int)$item['value'] >= 0,
        'boolean' => in_array($item['value'], ['0','1','true','false'], true),
        'json'    => json_decode($item['value']) !== null,
        default   => strlen($item['value']) <= 500,
    };

    if (!$valid) {
        return Response::error('INVALID_SETTING',
            "Invalid value for setting: {$item['key']}", [], 422);
    }

    $before = SystemSettingModel::findByKey($item['key']);
    SystemSettingModel::updateByKey($item['key'], $item['value'], $requestingAdmin['id']);
    ActivityLogger::log('system_setting.changed', 'system_setting', $setting['id'],
        ['value' => $before['setting_value']],
        ['key' => $item['key'], 'value' => $item['value']]);
}
```

### Frontend — AdminSettingsPage (wire to real API):
```tsx
// Grouped form sections by group_name
// Each section is a Card with settings rows

const { data: settings } = useQuery({
  queryKey: ['admin', 'system-settings'],
  queryFn: () => api.get('/admin/system-settings').then(r => r.data.data),
});

const saveMutation = useMutation({
  mutationFn: (payload: { settings: { key: string; value: string }[] }) =>
    api.put('/admin/system-settings', payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'system-settings'] });
    toast.success('Settings saved');
  },
  onError: (err: any) =>
    toast.error(err.response?.data?.message ?? 'Failed to save settings'),
});

// Each setting row:
// Integer → <input type="number" min="0" />
// Boolean → <Switch /> (Radix UI Switch primitive)
// JSON    → <textarea /> with JSON validation on blur
// String  → <input type="text" />

// Save button per group_name (not one global save)
// Groups: OTP | Upload | Reminders | Commissions | Security | Backup
```

---

## 7E. GLOBAL SEARCH

Single endpoint searching across all major entities. Results scoped by caller's role.

### FULLTEXT indexes (add via migration):
```sql
-- Migration 040: Add FULLTEXT indexes for search
ALTER TABLE students     ADD FULLTEXT INDEX ft_students_name (full_name);
ALTER TABLE agents       ADD FULLTEXT INDEX ft_agents_name (full_name, agency_name);
ALTER TABLE universities ADD FULLTEXT INDEX ft_universities (name, city, country);
ALTER TABLE applications ADD FULLTEXT INDEX ft_applications_ref (reference_number);
ALTER TABLE leads        ADD FULLTEXT INDEX ft_leads_name (full_name);
```

### Search route:
```
GET /api/v1/search?q={query}&types=students,applications,universities,agents,leads
Protected: valid JWT required
Min query length: 3 characters (MySQL 8.4 FULLTEXT default minimum). Crucial for avoiding excessive CPU load on prefix searches.
Rate limit: 20 requests/minute per user
```

### Search implementation:
```php
// SearchController::search()

$q = trim($input['q'] ?? '');
if (strlen($q) < 3) {
    return Response::success(['results' => [], 'query' => $q]);
}

$requestedTypes = explode(',', $input['types'] ?? 'students,applications,universities');
$results = [];

// Students — scoped by role
if (in_array('students', $requestedTypes)) {
    $agentFilter = '';
    $agentParams = [];

    if ($user['user_type'] === 'agent') {
        // Agent: only students in their subtree
        $agentFilter = "AND a.root_agent_id = ?";
        $agentParams = [$requestingAgent['root_agent_id']];
    }

    $stmt = $pdo->prepare("
        SELECT 'student' AS type, s.public_id, s.full_name AS title,
               s.profile_status AS subtitle,
               s.nationality AS meta
        FROM students s
        LEFT JOIN agents a ON a.id = s.agent_id
        WHERE MATCH(s.full_name) AGAINST(? IN BOOLEAN MODE)
          AND s.deleted_at IS NULL
          {$agentFilter}
        LIMIT 5
    ");
    $stmt->execute(array_merge([$q . '*'], $agentParams));
    // * suffix for prefix matching in BOOLEAN MODE
    $results['students'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Applications
if (in_array('applications', $requestedTypes)) {
    // Also support direct reference number search (TGA-2026-000042)
    $stmt = $pdo->prepare("
        SELECT 'application' AS type, a.public_id, a.reference_number AS title,
               a.status AS subtitle,
               s.full_name AS meta
        FROM applications a
        JOIN students s ON s.id = a.student_id
        WHERE (MATCH(a.reference_number) AGAINST(? IN BOOLEAN MODE)
               OR a.reference_number LIKE ?)
          AND a.deleted_at IS NULL
        LIMIT 5
    ");
    $stmt->execute([$q . '*', '%' . $q . '%']);
    $results['applications'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Universities (all authenticated users can search)
if (in_array('universities', $requestedTypes)) {
    $stmt = $pdo->prepare("
        SELECT 'university' AS type, u.public_id, u.name AS title,
               CONCAT(u.city, ', ', u.country) AS subtitle,
               u.status AS meta
        FROM universities u
        WHERE MATCH(u.name, u.city, u.country) AGAINST(? IN BOOLEAN MODE)
          AND u.deleted_at IS NULL
        LIMIT 5
    ");
    $stmt->execute([$q . '*']);
    $results['universities'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Agents — admin only
if (in_array('agents', $requestedTypes) && $user['user_type'] === 'admin') {
    $stmt = $pdo->prepare("
        SELECT 'agent' AS type, ag.public_id, ag.full_name AS title,
               ag.agency_name AS subtitle,
               ag.status AS meta
        FROM agents ag
        WHERE MATCH(ag.full_name, ag.agency_name) AGAINST(? IN BOOLEAN MODE)
          AND ag.deleted_at IS NULL
        LIMIT 5
    ");
    $stmt->execute([$q . '*']);
    $results['agents'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Leads — admin only
if (in_array('leads', $requestedTypes) && $user['user_type'] === 'admin') {
    if (hasPermission($user, 'leads', 'view')) {
        $stmt = $pdo->prepare("
            SELECT 'lead' AS type, l.public_id, l.full_name AS title,
                   l.source AS subtitle, l.status AS meta
            FROM leads l
            WHERE MATCH(l.full_name) AGAINST(? IN BOOLEAN MODE)
              AND l.deleted_at IS NULL
            LIMIT 5
        ");
        $stmt->execute([$q . '*']);
        $results['leads'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

return Response::success(['results' => $results, 'query' => $q]);
```

### Frontend — CommandPalette integration:
```tsx
// src/shared/components/CommandPalette.tsx (built in Phase 3 — wire data here)
// TanStack Query v5 with manual trigger (not auto-fetch)

const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery] = useDebounce(searchQuery, 300);

const { data: searchResults, isFetching } = useQuery({
  queryKey: ['search', debouncedQuery],
  queryFn: () =>
    api.get('/search', {
      params: { q: debouncedQuery, types: 'students,applications,universities,agents' }
    }).then(r => r.data.data),
  enabled: debouncedQuery.length >= 3,
  staleTime: 10_000,
});

// No onSuccess needed — use searchResults directly in JSX
// isFetching shows loading spinner in the palette

// Result groups rendered as cmdk Groups:
// <CommandGroup heading="Students"> ...students results...
// <CommandGroup heading="Applications"> ...
// etc.

// On item select: navigate to detail page
// navigate(`/${result.type}s/${result.public_id}`)
```

---

## 7F. ACTIVITY FEED

Recent events shown on dashboard overview pages.

### Route:
```
GET /api/v1/dashboard/activity-feed?limit=10
Scoped by caller role:
- Student: own activity only
- Agent: own + subtree activity
- Admin: all activity (module-filtered for sub-admins)
```

```php
// ActivityFeedController::getFeed()

$limit = min((int)($input['limit'] ?? 10), 50);

if ($user['user_type'] === 'student') {
    $where = "WHERE al.actor_user_id = {$userId}";
} elseif ($user['user_type'] === 'agent') {
    // All users in agent's subtree
    $subtreeUserIds = AgentModel::getSubtreeUserIds($requestingAgent['root_agent_id']);
    $placeholders = implode(',', array_fill(0, count($subtreeUserIds), '?'));
    $where = "WHERE al.actor_user_id IN ({$placeholders})";
    $params = $subtreeUserIds;
} else {
    // Admin: module-filtered for sub-admins
    if ($requestingAdmin['is_super_admin']) {
        $where = "WHERE 1=1";
    } else {
        $allowedModules = PermissionService::getAllowedModules($requestingAdmin['role_id']);
        $mPlaceholders = implode(',', array_fill(0, count($allowedModules), '?'));
        $where = "WHERE al.target_type IN ({$mPlaceholders})";
        $params = $allowedModules;
    }
}

$feed = $pdo->prepare("
    SELECT al.action, al.target_type, al.target_display,
           al.actor_display_name, al.actor_user_type, al.created_at,
           al.after_value
    FROM activity_logs al
    {$where}
    ORDER BY al.created_at DESC
    LIMIT {$limit}
");
$feed->execute($params ?? []);
$rows = $feed->fetchAll();

// Format each action for human-readable display
$formatted = array_map(fn($row) => [
    ...$row,
    'label' => ActionFormatter::format($row['action'], $row['after_value']),
    'time_ago' => TimeHelper::timeAgo($row['created_at']),
    'icon'  => ActionFormatter::getIcon($row['action']),
], $rows);

return Response::success($formatted);
```

### ActionFormatter class:
```php
class ActionFormatter {
    private static array $labels = [
        'student.registered'          => '{{actor}} registered as a student',
        'application.status_changed'  => 'Application {{target}} moved to {{status}}',
        'document_request.approved'   => 'Document "{{target}}" approved',
        'document_request.rejected'   => 'Document "{{target}}" rejected — resubmit required',
        'agent.approved'              => '{{target}} approved as a partner agent',
        'agent.suspended'             => '{{target}} account suspended',
        'commission.paid'             => 'Commission paid to {{target}}',
        'lead.converted'              => 'Lead {{target}} converted to student',
        'notice.published'            => 'Notice "{{target}}" published',
        'note.added'                  => 'Note added on {{target}}',
        'intake.cloned'               => 'Intake {{target}} cloned to next year',
    ];

    public static function format(string $action, ?string $afterJson): string {
        $after = $afterJson ? json_decode($afterJson, true) : [];
        $template = self::$labels[$action] ?? $action;
        $template = str_replace('{{status}}', $after['status'] ?? '', $template);
        return $template;
    }

    public static function getIcon(string $action): string {
        // Return lucide icon name based on action prefix
        $prefix = explode('.', $action)[0];
        return match($prefix) {
            'student'    => 'GraduationCap',
            'application'=> 'FileText',
            'document'   => 'FolderOpen',
            'agent'      => 'Handshake',
            'commission' => 'DollarSign',
            'lead'       => 'Target',
            'notice'     => 'Megaphone',
            'note'       => 'StickyNote',
            default      => 'Activity',
        };
    }
}
```

### Frontend — ActivityFeed component:
```tsx
// Used on StudentOverviewPage, AgentOverviewPage, AdminOverviewPage
// TanStack Query v5:

const { data: feed, isLoading } = useQuery({
  queryKey: ['dashboard', 'activity-feed'],
  queryFn: () => api.get('/dashboard/activity-feed', { params: { limit: 10 } })
                    .then(r => r.data.data),
  staleTime: 60_000,
  refetchInterval: 120_000, // Auto-refresh every 2 minutes
});

// Render:
// UX FIX: Group identical sequential actions by the same actor to prevent feed noise (e.g., "Rahul uploaded 10 documents").
// {isLoading && <SkeletonLoader variant="text" lines={5} />}
// {groupedFeed?.map(item => (
//   <div key={item.created_at} className="flex items-start gap-3 py-3">
//     <div className="rounded-full p-2 bg-[var(--color-surface-warm)]">
//       <DynamicIcon name={item.icon} className="w-4 h-4 text-[var(--color-text-secondary)]" />
//     </div>
//     <div>
//       <p className="text-sm text-[var(--color-text-primary)]">{item.label}</p>
//       <p className="text-xs text-[var(--color-text-muted)]">{item.time_ago}</p>
//     </div>
//   </div>
// ))}
// <Link to="/admin/logs">View all activity →</Link>
```

---

## 7G. ADMIN OVERVIEW — WIRE REAL DATA

```
GET /api/v1/admin/dashboard/summary
Scoped to caller's permissions. No ModuleGuard (all admins can see overview).
```

```php
// AdminDashboardController::summary()

$response = [];

// Action queue (counts only — no sensitive data)
$response['action_queue'] = [
    'pending_agents'           => $pdo->query("SELECT COUNT(*) FROM agents WHERE status='pending' AND deleted_at IS NULL")->fetchColumn(),
    'documents_awaiting_review'=> $pdo->query("SELECT COUNT(*) FROM document_requests WHERE status='submitted'")->fetchColumn(),
    'reassignment_requests'    => $pdo->query("SELECT COUNT(*) FROM agent_reassignment_requests WHERE status='pending'")->fetchColumn(),
    'sla_breaches'             => $pdo->query("SELECT COUNT(*) FROM sla_events WHERE status='breached' AND breach_notified=1")->fetchColumn(),
    'pending_payments'         => $pdo->query("SELECT COUNT(*) FROM application_payments WHERE status='student_marked_paid'")->fetchColumn(),
];

// Global stats (from latest report_snapshots if Phase 8 complete, else live counts)
$response['stats'] = [
    'total_students'     => $pdo->query("SELECT COUNT(*) FROM students WHERE deleted_at IS NULL")->fetchColumn(),
    'total_agents'       => $pdo->query("SELECT COUNT(*) FROM agents WHERE status='approved' AND deleted_at IS NULL")->fetchColumn(),
    'active_applications'=> $pdo->query("SELECT COUNT(*) FROM applications WHERE status NOT IN ('draft','enrolled','rejected') AND deleted_at IS NULL")->fetchColumn(),
    'pending_leads'      => $pdo->query("SELECT COUNT(*) FROM leads WHERE status IN ('new','contacted') AND deleted_at IS NULL")->fetchColumn(),
];

// Cron health (from cron_health table — populated by Phase 6 crons)
$response['cron_health'] = $pdo->query("
    SELECT job_name, last_run_status, last_run_at,
           last_run_duration_ms, last_error
    FROM cron_health ORDER BY job_name
")->fetchAll(PDO::FETCH_ASSOC);

return Response::success($response);
```

### Frontend — AdminOverviewPage (wire to real API):
```tsx
const { data: summary, isLoading } = useQuery({
  queryKey: ['admin', 'dashboard', 'summary'],
  queryFn: () => api.get('/admin/dashboard/summary').then(r => r.data.data),
  refetchInterval: 120_000, // Auto-refresh every 2 min
  staleTime: 60_000,
});

// Action queue: render counts as clickable links to the relevant page
// e.g. "3 agents pending approval" → navigate to /admin/agents?status=pending

// Cron health strip: row of indicator pills
// success → green dot, "X min ago"
// failed  → red dot, "Error: {last_error}"
// never_run → grey dot, "Never run"
// running → amber dot, "Running..."

// Stats: StatCard components with live counts
// Activity feed: ActivityFeed component wired above
```

---

## PHASE 7 AUDIT CHECKLIST

### Leads:
- [ ] POST /public/leads works without auth from external origin (test with curl)
- [ ] CORS allows theglobalavenues.com, rejects unknown origins
- [ ] Rate limit: 6th lead submission in 1hr from same IP → 429
- [ ] Duplicate email from same source creates new lead (no deduplication)
- [ ] Admin sees new lead in GET /admin/leads with status='new'
- [ ] Kanban drag-and-drop changes lead status in DB
- [ ] Assigning lead to staff: assigned_to updated, staff notified (queued)
- [ ] Converting lead: student account created, lead.status='converted', converted_student_id set
- [ ] Agent requesting GET /admin/leads → 403 (confirmed via direct API test)
- [ ] Argon2id used for password in lead conversion (hash starts with $argon2id$)
- [ ] TanStack Query v5 — no onSuccess on useQuery in leads page

### Notices & Events:
- [ ] Admin creates notice in draft — not visible to students/agents yet
- [ ] Admin publishes notice with visible_to_students=1
- [ ] Students see it in GET /student/notices
- [ ] Agents do NOT see a students-only notice
- [ ] Admins see it in GET /admin/notices/feed (if visible_to_admins=1)
- [ ] Notification queued for all targeted recipients (check notifications table)
- [ ] Notice with event_date and event_location shows event metadata correctly
- [ ] Attachment upload stores file in public folder (not private)
- [ ] Large notice audience (>1000 recipients) chunked correctly

### Internal Notes:
- [ ] Admin adds note visible_to_admin=1 only — agent cannot see it
- [ ] Admin adds note visible_to_agent=1 — agent on that student can see it
- [ ] Agent adds note on their own student — appears in their view
- [ ] Agent cannot add note on another agent's student (403)
- [ ] Student cannot see note where visible_to_student=0
- [ ] Note soft-delete: author can delete own note, super admin can delete any
- [ ] Deleted note not returned in GET response

### System Settings:
- [ ] GET /admin/system-settings returns all settings grouped by group_name
- [ ] Super admin can update otp_expiry_minutes — new value used by OTPService
- [ ] Sub-admin (even with system_settings.view) cannot update settings (403 on PUT)
- [ ] Invalid integer value rejected (e.g. "abc" for integer type)
- [ ] Invalid JSON rejected for JSON type settings
- [ ] Change logged to activity_logs with before/after values

### Global Search:
- [ ] Search "Rahul" (3+ chars) returns matching students
- [ ] Search "TGA-2026" returns matching applications
- [ ] Search university name returns results
- [ ] Agent search: only returns students in their subtree
- [ ] Admin search: returns results across all entities
- [ ] Search fewer than 3 chars returns empty results (no DB query)
- [ ] Rate limit: 21st search in 1 min → 429
- [ ] CommandPalette opens on Ctrl+K, shows results grouped by type
- [ ] Click result navigates to correct detail page

### Activity Feed:
- [ ] Admin overview feed shows last 10 activity entries
- [ ] Agent overview shows only their subtree activity
- [ ] Student overview shows only own activity
- [ ] Feed auto-refreshes every 2 minutes
- [ ] Action labels are human-readable (not raw action keys)
- [ ] Icons rendered correctly per action type

### Admin Overview:
- [ ] All action queue counts are accurate (cross-check with raw SQL)
- [ ] Cron health strip shows correct status for all 8 cron jobs
- [ ] Stats cards show correct numbers
- [ ] Clicking action queue item navigates to correct filtered page

### Frontend (Tailwind v4 compliance):
- [ ] No tailwind.config.ts created or modified
- [ ] CSS variable tokens used: `var(--color-*)` or registered utility classes
- [ ] `motion/react` used for any new animations (not framer-motion)
- [ ] `dnd-kit` used for kanban drag-and-drop (not react-beautiful-dnd)
- [ ] Marketing website files completely untouched (git diff confirms)
