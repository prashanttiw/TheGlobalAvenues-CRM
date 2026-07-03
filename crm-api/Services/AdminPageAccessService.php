<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use TGA\CRM\Helpers\UlidGenerator;

/**
 * Manages page-based access control for non-super-admin admins.
 * Each admin gets a unique auto-generated role (page_access_{public_id}) whose
 * permissions are derived from the pages the super admin grants them access to.
 */
final class AdminPageAccessService
{
    /**
     * Maps UI page keys to the database permissions they grant, split by access level.
     * 'read' grants only the view bucket. 'write' grants view + write buckets (full CRUD).
     * Pages with an empty write bucket are inherently view-only — no read/write distinction applies.
     */
    public const PAGE_PERMISSION_MAP = [
        'universities' => ['view' => ['universities.view'],     'write' => ['universities.create', 'universities.edit', 'universities.delete']],
        'courses'      => ['view' => ['courses.view'],          'write' => ['courses.create', 'courses.edit', 'courses.delete']],
        'intakes'      => ['view' => ['intakes.view'],          'write' => ['intakes.create', 'intakes.edit', 'intakes.delete']],
        'students'     => ['view' => ['students.view'],         'write' => ['students.create', 'students.edit', 'students.delete', 'students.approve']],
        'agents'       => ['view' => ['agents.view'],           'write' => ['agents.create', 'agents.edit', 'agents.delete', 'agents.approve']],
        'applications' => ['view' => ['applications.view'],     'write' => ['applications.create', 'applications.edit', 'applications.approve']],
        'commissions'  => ['view' => ['commissions.view'],      'write' => ['commissions.create', 'commissions.edit', 'commissions.approve']],
        'leads'        => ['view' => ['leads.view'],            'write' => ['leads.create', 'leads.edit', 'leads.delete']],
        'notices'      => ['view' => ['notices.view'],          'write' => ['notices.create', 'notices.edit', 'notices.delete']],
        'reports'      => ['view' => ['reports.view'],          'write' => []],
        'users'        => ['view' => ['user_management.view'],  'write' => ['user_management.create', 'user_management.edit', 'user_management.delete']],
        'settings'     => ['view' => ['system_settings.view'],  'write' => ['system_settings.edit']],
        'super_logs'   => ['view' => ['activity_logs.view_all'],'write' => []],
        'security'     => ['view' => ['security_events.view'],  'write' => []],
    ];

    /**
     * Validates and normalizes a raw request payload into a clean pageKey => 'read'|'write' map.
     * Unknown page keys are dropped; anything other than the literal 'write' is treated as 'read'.
     *
     * @param mixed $raw Decoded JSON value from the request body (expected: object/assoc array).
     * @return array<string,string>
     */
    public static function sanitizePageAccess($raw): array
    {
        if (!is_array($raw)) {
            return [];
        }
        $clean = [];
        foreach ($raw as $pageKey => $level) {
            if (!is_string($pageKey) || !isset(self::PAGE_PERMISSION_MAP[$pageKey])) {
                continue;
            }
            $clean[$pageKey] = $level === 'write' ? 'write' : 'read';
        }
        return $clean;
    }

    /**
     * Creates or updates the per-admin page-access role and its permissions.
     *
     * Role name is page_access_{user_public_id} — unique per admin, opaque to the UI.
     * Safe to call inside an outer transaction; does not start its own.
     *
     * @param array<string,string> $pageAccess Map of pageKey => 'read'|'write'.
     */
    public static function apply(PDO $pdo, int $userId, string $userPublicId, array $pageAccess): void
    {
        $roleName = 'page_access_' . $userPublicId;

        // Find or create the custom role
        $roleStmt = $pdo->prepare("SELECT id FROM roles WHERE name = ? LIMIT 1");
        $roleStmt->execute([$roleName]);
        $roleRow = $roleStmt->fetch(PDO::FETCH_ASSOC);

        if ($roleRow) {
            $roleId = (int)$roleRow['id'];
        } else {
            $rolePublicId = UlidGenerator::generate();
            $pdo->prepare("INSERT INTO roles (public_id, name, description) VALUES (?, ?, ?)")
                ->execute([$rolePublicId, $roleName, 'Auto-generated page access role']);
            $roleId = (int)$pdo->lastInsertId();
        }

        // Clear existing permissions so revocations take effect immediately
        $pdo->prepare("DELETE FROM role_permissions WHERE role_id = ?")->execute([$roleId]);

        // Collect the unique permission keys for the selected pages, gated by access level
        $permKeys = [];
        foreach ($pageAccess as $pageKey => $level) {
            if (!isset(self::PAGE_PERMISSION_MAP[$pageKey])) {
                continue;
            }
            $buckets = self::PAGE_PERMISSION_MAP[$pageKey];
            foreach ($buckets['view'] as $perm) {
                $permKeys[] = $perm;
            }
            if ($level === 'write') {
                foreach ($buckets['write'] as $perm) {
                    $permKeys[] = $perm;
                }
            }
        }
        $permKeys = array_values(array_unique($permKeys));

        // Resolve permission IDs and insert them
        if (!empty($permKeys)) {
            $placeholders = implode(',', array_fill(0, count($permKeys), '?'));
            $permStmt = $pdo->prepare(
                "SELECT id, CONCAT(module, '.', action) AS perm_key
                 FROM permissions
                 WHERE CONCAT(module, '.', action) IN ($placeholders)"
            );
            $permStmt->execute($permKeys);

            $insStmt = $pdo->prepare("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
            foreach ($permStmt->fetchAll(PDO::FETCH_ASSOC) as $perm) {
                $insStmt->execute([$roleId, (int)$perm['id']]);
            }
        }

        // Point the admin at this role (and ensure is_super_admin stays 0)
        $pdo->prepare("UPDATE admins SET role_id = ?, is_super_admin = 0, updated_at = NOW() WHERE user_id = ?")
            ->execute([$roleId, $userId]);
    }

    /**
     * Returns the page keys that a given admin currently has access to.
     * Returns an empty array for super admins (they have '*' — no page list needed).
     */
    public static function resolve(PDO $pdo, int $userId): array
    {
        $permKeys = self::resolvePermKeys($pdo, $userId);
        return array_keys(self::resolveAccessLevels($permKeys));
    }

    /**
     * Returns pageKey => 'read'|'write' for a given admin, based on which permissions
     * are actually present in role_permissions (no separate storage — derived, like
     * the RBAC checks themselves are).
     */
    public static function resolveAccess(PDO $pdo, int $userId): array
    {
        return self::resolveAccessLevels(self::resolvePermKeys($pdo, $userId));
    }

    private static function resolvePermKeys(PDO $pdo, int $userId): array
    {
        $stmt = $pdo->prepare("
            SELECT CONCAT(p.module, '.', p.action) AS perm_key
            FROM admins adm
            JOIN roles r ON adm.role_id = r.id
            JOIN role_permissions rp ON rp.role_id = r.id
            JOIN permissions p ON p.id = rp.permission_id
            WHERE adm.user_id = ? AND adm.deleted_at IS NULL
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    /**
     * Pure mapper: given a flat list of 'module.action' permission keys, returns
     * pageKey => 'read'|'write' for whichever pages those keys unlock. Exposed publicly
     * so callers that already have a permission-key list (e.g. from a GROUP_CONCAT join)
     * don't need a second DB round trip through resolveAccess().
     *
     * @param array<int,string> $permKeys
     * @return array<string,string> pageKey => 'read'|'write'
     */
    public static function resolveAccessLevels(array $permKeys): array
    {
        $pages = [];
        foreach (self::PAGE_PERMISSION_MAP as $pageKey => $buckets) {
            if (empty(array_intersect($buckets['view'], $permKeys))) {
                continue;
            }
            $hasFullWrite = empty($buckets['write']) || empty(array_diff($buckets['write'], $permKeys));
            $pages[$pageKey] = $hasFullWrite ? 'write' : 'read';
        }
        return $pages;
    }

    /**
     * Builds the HTML "pages_section" block injected into the admin.created welcome email.
     * Returns a self-contained HTML fragment — no outer wrapper needed.
     *
     * @param array<string,string> $pages Map of pageKey => 'read'|'write'.
     */
    public static function buildEmailPageSection(bool $isSuperAdmin, array $pages): string
    {
        if ($isSuperAdmin) {
            return '
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#12172b;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#aaaaaa;text-transform:uppercase;letter-spacing:2px;font-weight:bold;">Access Level</p>
      <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#ffffff;">Super Administrator</p>
      <p style="margin:0;font-size:13px;color:#aaaaaa;line-height:1.6;">Full access to every module in the CRM. You can manage admin accounts, change system settings, and view all audit logs.</p>
    </td>
  </tr>
</table>';
        }

        if (empty($pages)) {
            return '
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;padding:14px 16px;">
      <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">No specific pages have been assigned yet. A super admin will configure your access shortly.</p>
    </td>
  </tr>
</table>';
        }

        // Build label map from the catalogue
        $labelMap = [];
        $descMap  = [];
        foreach (self::availablePages() as $def) {
            $labelMap[$def['key']] = $def['label'];
            $descMap[$def['key']]  = $def['description'];
        }

        $rows = '';
        foreach ($pages as $pageKey => $level) {
            $label = $labelMap[$pageKey] ?? ucfirst((string)$pageKey);
            $desc  = $descMap[$pageKey]  ?? '';
            $isWrite = $level === 'write';
            $levelBadge = $isWrite
                ? '<span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:3px;background-color:#e8f5e9;color:#2e7d32;font-size:10px;font-weight:bold;text-transform:uppercase;">Full Access</span>'
                : '<span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:3px;background-color:#eef1f6;color:#5a6472;font-size:10px;font-weight:bold;text-transform:uppercase;">Read Only</span>';
            $rows .= '
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e8e8e8;vertical-align:top;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:10px;vertical-align:top;width:20px;">
                  <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;background-color:#D96200;border-radius:3px;font-size:11px;color:#ffffff;font-weight:bold;">&#10003;</span>
                </td>
                <td>
                  <p style="margin:0;font-size:13px;font-weight:bold;color:#12172b;">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . $levelBadge . '</p>'
                  . ($desc ? '<p style="margin:2px 0 0;font-size:12px;color:#999999;">' . htmlspecialchars($desc, ENT_QUOTES, 'UTF-8') . '</p>' : '') . '
                </td>
              </tr>
            </table>
          </td>
        </tr>';
        }

        $count = count($pages);
        return '
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#999999;text-transform:uppercase;letter-spacing:2px;font-weight:bold;">Your Access (' . $count . ' ' . ($count === 1 ? 'Module' : 'Modules') . ')</p>
      <p style="margin:0 0 16px;font-size:13px;color:#555555;line-height:1.6;">You have been granted access to the following CRM modules. You will only be able to see and use these pages.</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        ' . $rows . '
      </table>
    </td>
  </tr>
</table>';
    }

    /**
     * Returns the static page catalogue for the frontend.
     * `hasWrite` tells the UI whether to offer a Read/Full-access toggle for this page —
     * pages with no write bucket (reports, super_logs, security) are always view-only.
     */
    public static function availablePages(): array
    {
        $defs = [
            ['key' => 'universities', 'label' => 'Universities',     'description' => 'Manage university catalog'],
            ['key' => 'courses',      'label' => 'Courses',           'description' => 'Manage course catalog'],
            ['key' => 'intakes',      'label' => 'Intakes',           'description' => 'Manage intake windows'],
            ['key' => 'students',     'label' => 'Students',          'description' => 'View and manage student records'],
            ['key' => 'agents',       'label' => 'Agents',            'description' => 'View and approve partner agents'],
            ['key' => 'applications', 'label' => 'Applications',      'description' => 'Manage application pipeline'],
            ['key' => 'commissions',  'label' => 'Commissions',       'description' => 'Commission tracking and approval'],
            ['key' => 'leads',        'label' => 'Leads',             'description' => 'CRM lead pipeline'],
            ['key' => 'notices',      'label' => 'Notices',           'description' => 'Publish portal notices'],
            ['key' => 'reports',      'label' => 'Reports',           'description' => 'Analytics and reports'],
            ['key' => 'users',        'label' => 'User Management',   'description' => 'Manage admin accounts and access'],
            ['key' => 'settings',     'label' => 'Settings',          'description' => 'System configuration'],
            ['key' => 'super_logs',   'label' => 'Super Activity Log', 'description' => 'System-wide activity log across all admins, agents, and students'],
            ['key' => 'security',     'label' => 'Security',          'description' => 'Security event log'],
        ];

        foreach ($defs as &$def) {
            $def['hasWrite'] = !empty(self::PAGE_PERMISSION_MAP[$def['key']]['write']);
        }
        unset($def);

        return $defs;
    }
}
