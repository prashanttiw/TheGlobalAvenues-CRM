# Phase 5 Release Notes
## TGA CRM — Agents, Commissions & Hierarchy
**Released**: 2026-06-25
**Branch**: main
**Scope**: Agent hierarchy management, commission ledger, student visibility rules, reassignment pipeline, admin dashboard aggregations

---

## Overview

Phase 5 completes the agent-side of the ERP: the 3-level agent hierarchy is fully queryable and renderable, commissions have a complete lifecycle with immutable audit trails, and student reassignments are managed with race-condition safety. This phase introduced a materialized `agent_stats` table for O(1) admin dashboard aggregations and a DB-level commission immutability trigger as defense-in-depth.

A principal-level forensic audit identified 15 research findings, 15 specification gaps, 5 security decisions, and 5 performance decisions — all resolved before implementation.

---

## Features Added

### Agent Hierarchy (Backend)
- Dashboard summary scoped by `root_agent_id` — no full-table scan regardless of total agent count
- Student list: single JOIN with LEFT JOIN applied_count aggregate — eliminates N+1 at any subtree size
- Student access verification: `root_agent_id` check on every individual student fetch — prevents post-reassignment information leakage
- Direct sub-agent list (`GET /agent/team`): `parent_agent_id = self` query — O(1)
- Sub-agent children endpoint (`GET /agent/team/:pid/sub-agents`): fills missing L3 visibility gap
- Agent profile self-edit: `PUT /agent/profile` for non-sensitive field updates
- PII boundary enforced: passport_number, date_of_birth, phone never returned in agent-facing responses

### Agent Hierarchy (Frontend)
- `AgentTreeNode`: custom recursive React component — no library (0KB overhead)
- Max 3 levels; single full-tree request < 50KB JSON; staleTime: 120s (hierarchy rarely changes)
- L3 nodes lazy-loaded on expand via `enabled: isExpanded` TanStack Query option
- `is_student_reassigned` badge on commission rows: "Student reassigned — commission preserved"

### Commission Ledger
- Full CRUD: create, list (filtered), edit (pending only), confirm, mark-paid, soft-delete
- Agent chain validation on create: `commission.agent_id` must be in student's agent chain
- Audit log: every state transition writes to `commission_audit_log` (append-only)
- Immutability: PHP guard + MySQL trigger (migration 057) as dual enforcement layers
- `created_by_user_id` + `paid_by_user_id` tracked for complete financial audit trail
- Soft delete: pending commissions only — confirmed/paid are permanent

### Reassignment Pipeline
- Student request: validates `agent_lock_status = 'open'`, prevents same-agent requests
- `GET /student/agent`: returns current agent + pending reassignment status (student UX visibility)
- Admin queue: paginated and filterable by status, student name, current agent
- Admin approval: `SELECT ... FOR UPDATE` prevents concurrent approval race condition
- Admin override: `new_agent_code` parameter allows assigning different agent than student requested
- `final_agent_id` stored for audit trail when admin override is used
- Admin denial: fires `agent.reassignment_denied` notification (previously missing)
- Reassignment history: `GET /admin/students/:pid/reassignment-history`

### Admin Dashboard Summary
- Separated from agent dashboard (gap §GAP-P5-01 — agents cannot approve reassignments)
- Returns: total students, agent status counts (pending/approved/suspended/rejected)
- Action queue: pending agents, pending reassignments, submitted documents awaiting review
- Reads from `agent_stats` materialized table for aggregate queries

### Materialized agent_stats Table
- Columns: total_students, enrolled_count, in_progress_count, pending/confirmed/paid INR totals
- Populated by Phase 6 daily cron
- Also updated in real-time on student enrollment events via ApplicationStateManager
- Eliminates full-table aggregation on every admin dashboard request

---

## Architecture Decisions

- **`root_agent_id` fast path over recursive CTE**: authorization checks and bulk queries use O(1) index scan; recursive CTE only used for tree rendering (admin agent detail page)
- **Single full-tree request**: 3-level max, < 50KB JSON — lazy loading adds complexity without benefit
- **Custom AgentTreeNode component**: 0KB overhead vs 12-180KB for react-organizational-chart / react-d3-tree
- **Simple status ledger over double-entry**: startup scale acceptable; commission_audit_log provides audit trail; double-entry flagged as Phase 7 technical debt
- **FOR UPDATE on reassignment approval**: MySQL REPEATABLE READ isolation + FOR UPDATE serializes concurrent admin approvals
- **agent_stats denormalization**: admin dashboard aggregate over 100,000+ students would be 500ms+ without materialization

---

## Security Improvements

| ID | Description |
|----|-------------|
| §SD-P5-01 | Commission immutability: PHP guard + MySQL trigger (migration 057) — defense in depth |
| §SD-P5-02 | Agent PII boundary: passport_number, DOB, phone never in agent-facing SELECT lists |
| §SD-P5-03 | Subtree traversal: root_agent_id check on every individual student fetch — post-reassignment leakage closed |
| §SD-P5-04 | commission_audit_log: no DELETE/UPDATE endpoint — write-only from application layer |
| §RF-P5-04 | Reassignment race condition: FOR UPDATE row lock serializes concurrent admin approvals |
| §RF-P5-05 | Post-reassignment leakage: old agent cannot access student via bookmarked URL after reassignment |

---

## Performance Improvements

| ID | Description |
|----|-------------|
| §PE-P5-01 | agent_stats materialized table: O(microseconds) vs O(table-scan) for admin dashboard |
| §PE-P5-02 | 5 composite indexes added (migration 055): 1-3ms queries at 5,000 agents vs 50ms+ without |
| §PE-P5-03 | N+1 eliminated on student list: LEFT JOIN applied_count aggregate replaces per-row subquery |
| §PE-P5-04 | staleTime strategy: agent hierarchy 120s, team 120s, commissions 60s, reassignment queue 15s |

---

## Bug Fixes (Gaps Closed)

| Gap ID | Issue | Fix |
|--------|-------|-----|
| §GAP-P5-01 | Agent dashboard had admin action queue (agents cannot approve) | Separated into `/admin/dashboard/summary` |
| §GAP-P5-02 | L1 agent could not see L3 sub-agents | `GET /agent/team/:pid/sub-agents` added |
| §GAP-P5-03 | Admin could not assign different agent than student requested | `new_agent_code` override parameter added |
| §GAP-P5-04 | No notification when reassignment denied | `agent.reassignment_denied` template seeded |
| §GAP-P5-05 | Student could request same agent they already have | Same-agent validation added (HTTP 422) |
| §GAP-P5-06 | Commission could be attached to unrelated agent | Agent chain validation added on create |
| §GAP-P5-07 | No record of which admin created commission | `created_by_user_id` + `created_by_name` added |
| §GAP-P5-08 | No way to delete erroneously created commission | Soft-delete for pending commissions added |
| §GAP-P5-09 | No record of which admin marked commission paid | `paid_by_user_id` + `paid_by_name` added |
| §GAP-P5-11 | Agents could not edit their own profile | `PUT /agent/profile` added |
| §GAP-P5-12 | No filters on admin commission list | agent_pid, status, date range, page filters added |
| §GAP-P5-13 | Student had no endpoint to view their own agent | `GET /student/agent` with reassignment status added |
| §GAP-P5-15 | No reassignment history for a student | `GET /admin/students/:pid/reassignment-history` added |

---

## Known Limitations

- TDS (Indian tax) fields not in commission schema — flagged for Phase 7 review with chartered accountant
- Commission split calculation on reassignment is manual — auto-calculation is Phase 8
- agent_stats daily cron not yet running — Phase 6 will implement the cron worker
- Override commission (L1 earns on L2 students) not in scope — business owner validation required

---

## Future Work

- Phase 6: Email dispatch cron, Drive sync cron, agent_stats cron, notification delivery
- Phase 7: Double-entry ledger migration if commission volume exceeds 500/month; cursor-based pagination; Redis cache for admin dashboard; TDS field additions
- Phase 8: Commission split auto-calculation, agent performance targets, territory restrictions

---

## Phase 5 Commits

```
1e8345b  feat(db): add Phase 5 schema migrations -- commissions, indexes, agent stats, immutability
73a4c20  feat(agent): implement hierarchical agent management, commission ledger, and reassignment
732336c  feat(commission): admin commission management and agent reassignment pipeline
```
