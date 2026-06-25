<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;

final class AdminDashboardController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function summary(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        if (($user['utype'] ?? '') !== 'admin' && ($user['user_type'] ?? '') !== 'admin') {
            Response::error('Access denied.', 'FORBIDDEN', 403);
        }

        // 1. Total student count
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM students WHERE deleted_at IS NULL");
        $stmt->execute();
        $totalStudents = (int) $stmt->fetchColumn();

        // 2. Agent status counts (pending, approved, suspended, rejected)
        $stmt = $this->pdo->prepare(
            "SELECT status, COUNT(*) as count 
             FROM agents 
             WHERE deleted_at IS NULL 
             GROUP BY status"
        );
        $stmt->execute();
        $agentCountsRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $agentCounts = [
            'pending'   => 0,
            'approved'  => 0,
            'suspended' => 0,
            'rejected'  => 0
        ];
        foreach ($agentCountsRaw as $row) {
            $status = $row['status'];
            if (array_key_exists($status, $agentCounts)) {
                $agentCounts[$status] = (int)$row['count'];
            }
        }

        // 3. Action queue counts
        // Pending agents count
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM agents WHERE status = 'pending' AND deleted_at IS NULL");
        $stmt->execute();
        $pendingAgentsCount = (int) $stmt->fetchColumn();

        // Pending reassignments count
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM agent_reassignment_requests WHERE status = 'pending'");
        $stmt->execute();
        $pendingReassignmentsCount = (int) $stmt->fetchColumn();

        // Submitted document requests count
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM document_requests WHERE status = 'submitted'");
        $stmt->execute();
        $pendingDocumentsCount = (int) $stmt->fetchColumn();

        Response::json([
            'data' => [
                'total_students' => $totalStudents,
                'agent_counts'   => $agentCounts,
                'pending_actions' => [
                    'pending_agents'        => $pendingAgentsCount,
                    'pending_reassignments' => $pendingReassignmentsCount,
                    'pending_documents'     => $pendingDocumentsCount,
                ]
            ]
        ]);
    }
}
