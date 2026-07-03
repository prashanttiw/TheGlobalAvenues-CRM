<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Middleware\RateLimitMiddleware;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\NotificationService;
use TGA\CRM\Services\EncryptionService;

class LeadsController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function publicCreate(): void
    {
        $this->setCorsHeaders();
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        // Apply rate limit based on IP
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown_ip';
        RateLimitMiddleware::enforce('public_lead_' . $ip, 5, 3600);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $fullName = trim($input['full_name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');

        if (!$fullName || !$email || !$phone) {
            Response::error('Full name, email, and phone are required', 'VALIDATION_ERROR', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 'VALIDATION_ERROR', 400);
        }

        $encryptedEmail = EncryptionService::encrypt($email);
        $emailHash = EncryptionService::hash($email);
        $encryptedPhone = EncryptionService::encrypt($phone);

        $source = mb_substr(trim($input['source'] ?? 'website_form'), 0, 100);
        $utmSource = mb_substr(trim($input['utm_source'] ?? ''), 0, 100);
        $utmMedium = mb_substr(trim($input['utm_medium'] ?? ''), 0, 100);
        $utmCampaign = mb_substr(trim($input['utm_campaign'] ?? ''), 0, 100);
        
        $sourceDetail = json_encode([
            'utm_source' => $utmSource,
            'utm_medium' => $utmMedium,
            'utm_campaign' => $utmCampaign
        ]);

        $pid = UlidGenerator::generate();

        $stmt = $this->pdo->prepare("
            INSERT INTO leads (
                public_id, full_name, email, email_lookup_hash, phone, source, source_detail, 
                interested_country, interested_course, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW(), NOW())
        ");
        
        $stmt->execute([
            $pid,
            $fullName,
            $encryptedEmail,
            $emailHash,
            $encryptedPhone,
            $source,
            $sourceDetail,
            $input['interested_country'] ?? null,
            $input['interested_course'] ?? null
        ]);

        $leadId = (int) $this->pdo->lastInsertId();

        NotificationService::fire('lead.new', [
            'full_name' => $fullName,
            'source' => $source,
            'interested_country' => $input['interested_country'] ?? 'Unknown',
            'interested_course' => $input['interested_course'] ?? 'Unknown',
            'admin_url' => ($_ENV['FRONTEND_URL'] ?? 'https://theglobalavenues.com/portal') . '/admin/leads'
        ], $this->getAdminIds());

        ActivityLogger::log('lead.created', 'leads', $leadId, 0, [], ['public_id' => $pid]);

        // Never reveal if email already in DB.
        Response::json(['success' => true, 'message' => 'Lead captured successfully', 'public_id' => $pid], 201);
    }

    public function create(): void
    {
        RBACMiddleware::requirePermission('leads', 'create');
        $user = AuthMiddleware::user();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $fullName = trim($input['full_name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');

        if (!$fullName || !$email) {
            Response::error('Full name and email are required', 'VALIDATION_ERROR', 400);
        }

        $encryptedEmail = EncryptionService::encrypt($email);
        $emailHash = EncryptionService::hash($email);
        $encryptedPhone = $phone ? EncryptionService::encrypt($phone) : null;

        $source = mb_substr(trim($input['source'] ?? 'manual_entry'), 0, 100);
        $pid = UlidGenerator::generate();

        $stmt = $this->pdo->prepare("
            INSERT INTO leads (
                public_id, full_name, email, email_lookup_hash, phone, source, 
                interested_country, interested_course, notes, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW(), NOW())
        ");
        
        $stmt->execute([
            $pid,
            $fullName,
            $encryptedEmail,
            $emailHash,
            $encryptedPhone,
            $source,
            $input['interested_country'] ?? null,
            $input['interested_course'] ?? null,
            $input['notes'] ?? null
        ]);

        $leadId = (int) $this->pdo->lastInsertId();
        ActivityLogger::log('lead.created', 'leads', $leadId, (int)$user['id'], [], ['public_id' => $pid]);

        Response::json(['success' => true, 'public_id' => $pid], 201);
    }

    public function adminList(): void
    {
        RBACMiddleware::requirePermission('leads', 'view');

        $search = trim((string) ($_GET['search'] ?? ''));

        $stmt = $this->pdo->prepare("
            SELECT l.public_id, l.full_name, l.email, l.phone, l.source, l.source_detail, l.interested_country,
                   l.interested_course, l.status, l.assigned_to, l.created_at, l.updated_at, l.notes,
                   (EXISTS(SELECT 1 FROM users u WHERE u.email_lookup_hash = l.email_lookup_hash AND u.deleted_at IS NULL)
                    OR EXISTS(SELECT 1 FROM leads l2 WHERE l2.email_lookup_hash = l.email_lookup_hash AND l2.id != l.id AND l2.deleted_at IS NULL)
                   ) as is_duplicate
            FROM leads l
            WHERE l.deleted_at IS NULL
            ORDER BY l.created_at DESC
        ");
        $stmt->execute();
        $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decrypt email and phone
        foreach ($leads as &$lead) {
            $lead['email'] = $lead['email'] ? EncryptionService::decrypt($lead['email']) : null;
            $lead['phone'] = $lead['phone'] ? EncryptionService::decrypt($lead['phone']) : null;
            if ($lead['source_detail']) {
                $lead['source_detail'] = json_decode($lead['source_detail'], true);
            }
        }
        unset($lead);

        // This endpoint already decrypts every lead's email unconditionally (no pagination, no
        // per-row cost saved by filtering earlier), so a genuine partial match against the
        // decrypted value is free here — no need to fall back to exact lookup-hash equality the
        // way encrypted-column search does elsewhere. Phone intentionally excluded (leads has no
        // phone_lookup_hash; adding partial/exact phone search here was deferred).
        if ($search !== '') {
            $leads = array_values(array_filter($leads, function ($lead) use ($search) {
                return stripos((string) ($lead['full_name'] ?? ''), $search) !== false
                    || stripos((string) ($lead['email'] ?? ''), $search) !== false;
            }));
        }

        Response::json(['data' => $leads]);
    }

    public function get(string $pid): void
    {
        RBACMiddleware::requirePermission('leads', 'view');

        $stmt = $this->pdo->prepare("
            SELECT l.public_id, l.full_name, l.email, l.phone, l.source, l.source_detail, l.interested_country, 
                   l.interested_course, l.status, l.assigned_to, l.created_at, l.updated_at, l.notes,
                   (EXISTS(SELECT 1 FROM users u WHERE u.email_lookup_hash = l.email_lookup_hash AND u.deleted_at IS NULL)
                    OR EXISTS(SELECT 1 FROM leads l2 WHERE l2.email_lookup_hash = l.email_lookup_hash AND l2.id != l.id AND l2.deleted_at IS NULL)
                   ) as is_duplicate
            FROM leads l
            WHERE l.public_id = ? AND l.deleted_at IS NULL
        ");
        $stmt->execute([$pid]);
        $lead = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lead) {
            Response::error('Lead not found', 'NOT_FOUND', 404);
        }

        $lead['email'] = $lead['email'] ? EncryptionService::decrypt($lead['email']) : null;
        $lead['phone'] = $lead['phone'] ? EncryptionService::decrypt($lead['phone']) : null;
        if ($lead['source_detail']) {
            $lead['source_detail'] = json_decode($lead['source_detail'], true);
        }

        Response::json(['data' => $lead]);
    }

    public function update(string $pid): void
    {
        RBACMiddleware::requirePermission('leads', 'edit');
        $user = AuthMiddleware::user();

        $stmt = $this->pdo->prepare("SELECT id FROM leads WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$pid]);
        $lead = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lead) {
            Response::error('Lead not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $updates = [];
        $params = [];

        if (isset($input['full_name'])) {
            $updates[] = "full_name = ?";
            $params[] = trim($input['full_name']);
        }
        if (isset($input['email'])) {
            $updates[] = "email = ?";
            $updates[] = "email_lookup_hash = ?";
            $params[] = EncryptionService::encrypt(trim($input['email']));
            $params[] = EncryptionService::hash(trim($input['email']));
        }
        if (isset($input['phone'])) {
            $updates[] = "phone = ?";
            $params[] = EncryptionService::encrypt(trim($input['phone']));
        }
        if (isset($input['interested_country'])) {
            $updates[] = "interested_country = ?";
            $params[] = $input['interested_country'];
        }
        if (isset($input['interested_course'])) {
            $updates[] = "interested_course = ?";
            $params[] = $input['interested_course'];
        }

        if ($updates) {
            $updates[] = "updated_at = NOW()";
            $sql = "UPDATE leads SET " . implode(', ', $updates) . " WHERE id = ?";
            $params[] = $lead['id'];
            $this->pdo->prepare($sql)->execute($params);
            
            ActivityLogger::log('lead.updated', 'leads', (int)$lead['id'], (int)$user['id']);
        }

        Response::json(['success' => true]);
    }

    public function delete(string $pid): void
    {
        RBACMiddleware::requirePermission('leads', 'delete');
        $user = AuthMiddleware::user();

        $stmt = $this->pdo->prepare("SELECT id FROM leads WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$pid]);
        $lead = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lead) {
            Response::error('Lead not found', 'NOT_FOUND', 404);
        }

        $this->pdo->prepare("UPDATE leads SET deleted_at = NOW() WHERE id = ?")->execute([$lead['id']]);
        ActivityLogger::log('lead.deleted', 'leads', (int)$lead['id'], (int)$user['id']);

        Response::json(['success' => true]);
    }

    public function updateStatus(string $pid): void
    {
        RBACMiddleware::requirePermission('leads', 'edit');
        $user = AuthMiddleware::user();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = $input['status'] ?? null;
        $notes = $input['notes'] ?? null;
        $assignedTo = $input['assigned_to'] ?? null;
        
        $stmt = $this->pdo->prepare("SELECT id, status, full_name FROM leads WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$pid]);
        $lead = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lead) {
            Response::error('Lead not found', 'NOT_FOUND', 404);
        }

        $updates = [];
        $params = [];

        if ($status) {
            $validStatuses = ['new', 'contacted', 'qualified', 'converted', 'dropped'];
            if (!in_array($status, $validStatuses, true)) {
                Response::error('Invalid status', 'VALIDATION_ERROR', 400);
            }
            $updates[] = "status = ?";
            $params[] = $status;
        }

        if ($notes !== null) {
            $updates[] = "notes = ?";
            $params[] = $notes;
        }

        $assignedAdminId = null;
        if ($assignedTo) {
            $adminStmt = $this->pdo->prepare("SELECT id FROM admins WHERE public_id = ?");
            $adminStmt->execute([$assignedTo]);
            $assignedAdminId = $adminStmt->fetchColumn();
            if ($assignedAdminId) {
                $updates[] = "assigned_to = ?";
                $params[] = $assignedAdminId;
            }
        }

        if ($updates) {
            $updates[] = "updated_at = NOW()";
            $sql = "UPDATE leads SET " . implode(', ', $updates) . " WHERE id = ?";
            $params[] = $lead['id'];
            $this->pdo->prepare($sql)->execute($params);

            if ($status && $status !== $lead['status']) {
                ActivityLogger::log('lead.status_changed', 'leads', (int)$lead['id'], (int)$user['id'], 
                    ['from' => $lead['status']], ['to' => $status]);
                
                // Fetch current assigned_to to notify
                $currStmt = $this->pdo->prepare("SELECT assigned_to FROM leads WHERE id = ?");
                $currStmt->execute([$lead['id']]);
                $currAssigned = $currStmt->fetchColumn();

                if ($currAssigned) {
                    // We need user_id of the admin
                    $adminUserStmt = $this->pdo->prepare("SELECT user_id FROM admins WHERE id = ?");
                    $adminUserStmt->execute([$currAssigned]);
                    $staffUserId = $adminUserStmt->fetchColumn();

                    if ($staffUserId) {
                        NotificationService::fire('lead.status_changed', [
                            'full_name' => $lead['full_name'],
                            'new_status' => $status,
                            'admin_url' => ($_ENV['FRONTEND_URL'] ?? 'https://theglobalavenues.com/portal') . '/admin/leads'
                        ], [(int)$staffUserId]);
                    }
                }
            }
        }

        Response::json(['success' => true, 'message' => 'Lead updated']);
    }

    public function assign(string $pid): void
    {
        RBACMiddleware::requirePermission('leads', 'edit');
        $user = AuthMiddleware::user();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $adminPublicId = $input['admin_public_id'] ?? null;

        if (!$adminPublicId) {
            Response::error('admin_public_id is required', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id, full_name, source FROM leads WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$pid]);
        $lead = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lead) {
            Response::error('Lead not found', 'NOT_FOUND', 404);
        }

        $adminStmt = $this->pdo->prepare("
            SELECT a.id, a.user_id, u.first_name 
            FROM admins a 
            JOIN users u ON a.user_id = u.id 
            WHERE a.public_id = ? AND a.deleted_at IS NULL AND u.deleted_at IS NULL
        ");
        $adminStmt->execute([$adminPublicId]);
        $admin = $adminStmt->fetch(PDO::FETCH_ASSOC);

        if (!$admin) {
            Response::error('Admin not found', 'NOT_FOUND', 404);
        }

        $this->pdo->prepare("UPDATE leads SET assigned_to = ?, updated_at = NOW() WHERE id = ?")
            ->execute([$admin['id'], $lead['id']]);

        ActivityLogger::log('lead.assigned', 'leads', (int)$lead['id'], (int)$user['id'], [], ['assigned_to' => $admin['id']]);

        NotificationService::fire('lead.assigned', [
            'full_name' => $lead['full_name'],
            'staff_name' => $admin['first_name'],
            'source' => $lead['source'] ?? 'Unknown',
            'admin_url' => ($_ENV['FRONTEND_URL'] ?? 'https://theglobalavenues.com/portal') . '/admin/leads'
        ], [(int)$admin['user_id']]);

        Response::json(['success' => true, 'message' => 'Lead assigned successfully']);
    }

    public function convertToStudent(string $pid): void
    {
        RBACMiddleware::requirePermission('leads', 'edit');
        RBACMiddleware::requirePermission('students', 'create');
        $user = AuthMiddleware::user();

        $stmt = $this->pdo->prepare("SELECT * FROM leads WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$pid]);
        $lead = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lead) {
            Response::error('Lead not found', 'NOT_FOUND', 404);
        }

        if ($lead['status'] !== 'qualified') {
            Response::error('Lead must be in qualified status to convert', 'VALIDATION_ERROR', 400);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $password = $input['password'] ?? '';
        
        if (!$password) {
            Response::error('Password is required for the new student account', 'VALIDATION_ERROR', 400);
        }

        $agentReferralCode = trim($input['agent_referral_code'] ?? '');
        $agentId = null;

        if ($agentReferralCode) {
            $agentStmt = $this->pdo->prepare("SELECT id FROM agents WHERE referral_code = ? AND status = 'approved' AND deleted_at IS NULL");
            $agentStmt->execute([$agentReferralCode]);
            $agentId = $agentStmt->fetchColumn();
            if (!$agentId) {
                Response::error('Invalid agent referral code', 'VALIDATION_ERROR', 400);
            }
        }

        $this->pdo->beginTransaction();

        try {
            $userPid = UlidGenerator::generate();
            $hash = password_hash($password, PASSWORD_ARGON2ID, ['memory_cost' => 65536, 'time_cost' => 4, 'threads' => 1]);

            // Decrypt email/phone
            $emailRaw = $lead['email'] ? EncryptionService::decrypt($lead['email']) : null;
            $phoneRaw = $lead['phone'] ? EncryptionService::decrypt($lead['phone']) : null;

            if (!$emailRaw) {
                throw new \Exception('Lead has no valid email');
            }

            $adminStmt = $this->pdo->prepare("SELECT id FROM admins WHERE user_id = ?");
            $adminStmt->execute([$user['id']]);
            $adminId = $adminStmt->fetchColumn();

            $stmtUser = $this->pdo->prepare("
                INSERT INTO users (
                    public_id, first_name, last_name, email, email_lookup_hash, phone, 
                    password_hash, user_type, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'student', 'active', NOW(), NOW())
            ");
            
            $parts = explode(' ', $lead['full_name'], 2);
            $firstName = $parts[0] ?? '';
            $lastName = $parts[1] ?? '';
            
            $stmtUser->execute([
                $userPid, 
                EncryptionService::encrypt($firstName), 
                EncryptionService::encrypt($lastName), 
                EncryptionService::encrypt($emailRaw), 
                EncryptionService::hash($emailRaw),
                $phoneRaw ? EncryptionService::encrypt($phoneRaw) : null,
                $hash
            ]);
            $userId = (int) $this->pdo->lastInsertId();

            // Create student profile
            $studentPid = UlidGenerator::generate();
            $stmtStudent = $this->pdo->prepare("
                INSERT INTO students (
                    public_id, user_id, agent_id, lead_source, registered_by_type, 
                    registered_by_id, nationality, date_of_birth, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, NOW(), NOW())
            ");
            $stmtStudent->execute([
                $studentPid, 
                $userId, 
                $agentId, 
                $lead['source'], 
                $adminId,
                $input['nationality'] ?? null,
                $input['date_of_birth'] ?? null
            ]);
            $studentId = (int) $this->pdo->lastInsertId();

            // Insert user preferences
            $this->pdo->prepare("INSERT INTO user_preferences (user_id) VALUES (?)")->execute([$userId]);

            // Update lead status
            $this->pdo->prepare("UPDATE leads SET status = 'converted', converted_student_id = ?, updated_at = NOW() WHERE id = ?")
                ->execute([$studentId, $lead['id']]);

            $this->pdo->commit();

            ActivityLogger::log('lead.converted', 'leads', (int)$lead['id'], (int)$user['id'], [], ['student_id' => $studentId]);
            NotificationService::fire('student.registered', ['name' => $firstName], [$userId]);

            Response::json(['success' => true, 'message' => 'Lead converted to student', 'student_public_id' => $studentPid]);
        } catch (\PDOException $e) {
            $this->pdo->rollBack();
            if ($e->getCode() === '23000') {
                Response::error('Email or phone already exists in the system', 'DUPLICATE_ERROR', 400);
            }
            Response::error('Failed to convert lead: ' . $e->getMessage(), 'SERVER_ERROR', 500);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            Response::error('Failed to convert lead: ' . $e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    private function setCorsHeaders(): void
    {
        // Enforce the specific origin according to specs
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigin = 'https://theglobalavenues.com';
        
        if ($origin === $allowedOrigin) {
            header('Access-Control-Allow-Origin: ' . $allowedOrigin);
        } elseif (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'local') {
            header('Access-Control-Allow-Origin: *'); // Allow all locally for testing
        }
        
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }

    private function getAdminIds(): array
    {
        return $this->pdo->query("SELECT id FROM users WHERE user_type = 'admin' AND status = 'active' AND deleted_at IS NULL")
            ->fetchAll(PDO::FETCH_COLUMN);
    }
}
