<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;

final class NoticeModel extends BaseModel
{
    protected string $table = 'notices';

    // Safe columns to return to end-user feeds — no internal id, created_by, deleted_at
    // Uses table alias n. so queries can LEFT JOIN files f for attachment info
    private const FEED_SELECT = "
        n.public_id, n.title, n.content, n.notice_type, n.status,
        n.published_at, n.expires_at, n.event_date, n.event_location, n.created_at,
        f.public_id  AS attachment_public_id,
        f.display_filename AS attachment_filename
    ";

    private const FEED_JOIN = "LEFT JOIN files f ON f.id = n.attachment_file_id AND f.deleted_at IS NULL";

    public function countFeedForStudent(?string $noticeType = null): int
    {
        $sql = "SELECT COUNT(*) FROM notices n
                WHERE n.status = 'published'
                  AND n.visible_to_students = 1
                  AND (n.expires_at IS NULL OR n.expires_at > NOW())
                  AND n.deleted_at IS NULL";
        if ($noticeType !== null) {
            $sql .= " AND n.notice_type = ?";
        }
        $stmt = $this->pdo->prepare($sql);
        if ($noticeType !== null) {
            $stmt->bindValue(1, $noticeType, PDO::PARAM_STR);
        }
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    public function countFeedForAgent(?string $noticeType = null): int
    {
        $sql = "SELECT COUNT(*) FROM notices n
                WHERE n.status = 'published'
                  AND n.visible_to_agents = 1
                  AND (n.expires_at IS NULL OR n.expires_at > NOW())
                  AND n.deleted_at IS NULL";
        if ($noticeType !== null) {
            $sql .= " AND n.notice_type = ?";
        }
        $stmt = $this->pdo->prepare($sql);
        if ($noticeType !== null) {
            $stmt->bindValue(1, $noticeType, PDO::PARAM_STR);
        }
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    public function countFeedForAdmin(?string $noticeType = null): int
    {
        $sql = "SELECT COUNT(*) FROM notices n
                WHERE n.status = 'published'
                  AND n.visible_to_admins = 1
                  AND (n.expires_at IS NULL OR n.expires_at > NOW())
                  AND n.deleted_at IS NULL";
        if ($noticeType !== null) {
            $sql .= " AND n.notice_type = ?";
        }
        $stmt = $this->pdo->prepare($sql);
        if ($noticeType !== null) {
            $stmt->bindValue(1, $noticeType, PDO::PARAM_STR);
        }
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    public function getFeedForStudent(int $studentUserId, int $limit = 50, int $offset = 0, ?string $noticeType = null, string $sort = 'DESC'): array
    {
        $sort = strtoupper($sort) === 'ASC' ? 'ASC' : 'DESC';
        $sql = "SELECT " . self::FEED_SELECT . "
                FROM notices n " . self::FEED_JOIN . "
                WHERE n.status = 'published'
                  AND n.visible_to_students = 1
                  AND (n.expires_at IS NULL OR n.expires_at > NOW())
                  AND n.deleted_at IS NULL";
        if ($noticeType !== null) {
            $sql .= " AND n.notice_type = ?";
        }
        $sql .= " ORDER BY COALESCE(n.published_at, n.created_at) {$sort} LIMIT ? OFFSET ?";

        $stmt = $this->pdo->prepare($sql);
        $bindIndex = 1;
        if ($noticeType !== null) {
            $stmt->bindValue($bindIndex++, $noticeType, PDO::PARAM_STR);
        }
        $stmt->bindValue($bindIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($bindIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getFeedForAgent(int $agentUserId, int $limit = 50, int $offset = 0, ?string $noticeType = null, string $sort = 'DESC'): array
    {
        $sort = strtoupper($sort) === 'ASC' ? 'ASC' : 'DESC';
        $sql = "SELECT " . self::FEED_SELECT . "
                FROM notices n " . self::FEED_JOIN . "
                WHERE n.status = 'published'
                  AND n.visible_to_agents = 1
                  AND (n.expires_at IS NULL OR n.expires_at > NOW())
                  AND n.deleted_at IS NULL";
        $params = [];
        if ($noticeType !== null) {
            $sql .= " AND n.notice_type = ?";
            $params[] = $noticeType;
        }
        $sql .= " ORDER BY COALESCE(n.published_at, n.created_at) {$sort} LIMIT ? OFFSET ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_merge($params, [$limit, $offset]));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getFeedForAdmin(int $limit = 50, int $offset = 0, ?string $noticeType = null, string $sort = 'DESC'): array
    {
        $sort = strtoupper($sort) === 'ASC' ? 'ASC' : 'DESC';
        $sql = "SELECT " . self::FEED_SELECT . "
                FROM notices n " . self::FEED_JOIN . "
                WHERE n.status = 'published'
                  AND n.visible_to_admins = 1
                  AND (n.expires_at IS NULL OR n.expires_at > NOW())
                  AND n.deleted_at IS NULL";
        $params = [];
        if ($noticeType !== null) {
            $sql .= " AND n.notice_type = ?";
            $params[] = $noticeType;
        }
        $sql .= " ORDER BY COALESCE(n.published_at, n.created_at) {$sort} LIMIT ? OFFSET ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_merge($params, [$limit, $offset]));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
