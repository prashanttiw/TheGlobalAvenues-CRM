-- 055: Phase 5 performance indexes
-- All indexes required for agent hierarchy, student roster, and commission queries

-- ── Students table ────────────────────────────────────────────────────────────
-- Composite for agent dashboard: COUNT by profile_status within agent subtree
ALTER TABLE students
  ADD INDEX idx_students_agent_status (agent_id, profile_status),
  ADD INDEX idx_students_root_status (agent_id, deleted_at);

-- ── Agents table ──────────────────────────────────────────────────────────────
-- Fast subtree queries: root_agent_id is the primary fast path
-- Already indexed if root_agent_id has a standalone index — add composite for tier queries
ALTER TABLE agents
  ADD INDEX idx_agents_root_tier (root_agent_id, tier, deleted_at),
  ADD INDEX idx_agents_parent_deleted (parent_agent_id, deleted_at),
  ADD INDEX idx_agents_status_tier (status, tier);

-- ── Agent reassignment requests ───────────────────────────────────────────────
ALTER TABLE agent_reassignment_requests
  ADD INDEX idx_arr_student_status (student_id, status),
  ADD INDEX idx_arr_status_created (status, created_at),
  ADD INDEX idx_arr_current_agent (current_agent_id),
  ADD INDEX idx_arr_new_agent (requested_agent_id);
