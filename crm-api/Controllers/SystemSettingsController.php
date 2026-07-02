<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\SystemSettingModel;
use TGA\CRM\Services\ActivityLogger;

class SystemSettingsController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        // Base route will require system_settings.view or edit
    }

    public function index(): void
    {
        RBACMiddleware::requirePermission('system_settings', 'view');

        $settings = SystemSettingModel::findAllGrouped($this->pdo);
        Response::json(['data' => $settings]);
    }

    public function update(): void
    {
        RBACMiddleware::requirePermission('system_settings', 'edit');
        
        $payload = AuthMiddleware::user();
        $userId = (int) $payload['sub'];

        $adminStmt = $this->pdo->prepare('SELECT id, is_super_admin FROM admins WHERE user_id = ? LIMIT 1');
        $adminStmt->execute([$userId]);
        $admin = $adminStmt->fetch(PDO::FETCH_ASSOC);

        if (!$admin || !(int)$admin['is_super_admin']) {
            Response::error('Only super admin can edit system settings', 'FORBIDDEN', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        if (!isset($input['settings']) || !is_array($input['settings'])) {
            Response::error('Invalid input format', 'VALIDATION_ERROR', 400);
        }

        foreach ($input['settings'] as $item) {
            if (!isset($item['key'], $item['value'])) {
                continue;
            }

            $setting = SystemSettingModel::findByKey($this->pdo, (string)$item['key']);
            if (!$setting || !(int)$setting['is_editable']) {
                continue;
            }

            $key = $setting['setting_key'];
            $val = $item['value'];
            $type = $setting['value_type'];

            $valid = match($type) {
                'integer' => is_numeric($val) && (int)$val >= 0,
                'boolean' => in_array($val, ['0', '1', 'true', 'false', true, false], true),
                'json'    => is_string($val) && json_decode($val) !== null,
                default   => is_string($val) && mb_strlen($val) <= 500,
            };

            // STRICT BOUNDS rules specifically to prevent production failure
            if ($type === 'integer') {
                if ($key === 'otp_expiry_minutes' && ((int)$val < 1 || (int)$val > 60)) {
                    $valid = false;
                }
                if ($key === 'session_max_per_user' && ((int)$val < 1 || (int)$val > 100)) {
                    $valid = false;
                }
            }

            if (!$valid) {
                Response::error("Invalid value for setting: {$key}", 'INVALID_SETTING', 422);
            }

            $before = $setting['setting_value'];
            
            // Convert boolean to 0/1 strings for storage if needed
            if ($type === 'boolean') {
                $val = ($val === 'true' || $val === true || $val === '1' || $val === 1) ? '1' : '0';
            }

            if ((string)$val !== (string)$before) {
                SystemSettingModel::updateByKey($this->pdo, $key, (string)$val, (int)$admin['id']);
                ActivityLogger::log('system_setting.changed', 'system_setting', (int)$setting['id'], $userId,
                    ['key' => $key, 'value' => $before],
                    ['key' => $key, 'value' => (string)$val]
                );
            }
        }

        \TGA\CRM\Services\SystemSettings::clearCache();

        Response::json(['success' => true, 'message' => 'Settings updated successfully']);
    }

    public function getMaintenanceMode(): void
    {
        RBACMiddleware::requirePermission('system_settings', 'view');
        
        $maintenanceFile = __DIR__ . '/../../.maintenance';
        $enabled = file_exists($maintenanceFile);
        $message = '';
        if ($enabled) {
            $content = trim(file_get_contents($maintenanceFile) ?: '');
            if ($content) {
                $data = json_decode($content, true);
                $message = $data['message'] ?? '';
            }
        }
        
        Response::json([
            'data' => [
                'enabled' => $enabled,
                'message' => $message
            ]
        ]);
    }

    public function toggleMaintenanceMode(): void
    {
        RBACMiddleware::requirePermission('system_settings', 'edit');
        
        $payload = AuthMiddleware::user();
        $userId = (int) $payload['sub'];

        $adminStmt = $this->pdo->prepare('SELECT id, is_super_admin FROM admins WHERE user_id = ? LIMIT 1');
        $adminStmt->execute([$userId]);
        $admin = $adminStmt->fetch(PDO::FETCH_ASSOC);

        if (!$admin || !(int)$admin['is_super_admin']) {
            Response::error('Only super admin can toggle maintenance mode', 'FORBIDDEN', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $enable = isset($input['enable']) ? (bool)$input['enable'] : null;
        $message = trim((string)($input['message'] ?? 'System is currently undergoing maintenance. Please try again later.'));

        if ($enable === null) {
            Response::error('Missing enable boolean', 'VALIDATION_ERROR', 400);
        }

        $maintenanceFile = __DIR__ . '/../../.maintenance';

        if ($enable) {
            file_put_contents($maintenanceFile, json_encode(['message' => $message]));
            ActivityLogger::log('maintenance_mode.enabled', 'system_setting', 0, $userId);
            Response::json(['success' => true, 'message' => 'Maintenance mode enabled']);
        } else {
            if (file_exists($maintenanceFile)) {
                unlink($maintenanceFile);
            }
            ActivityLogger::log('maintenance_mode.disabled', 'system_setting', 0, $userId);
            Response::json(['success' => true, 'message' => 'Maintenance mode disabled']);
        }
    }
}
