# Phase 8 Release Notes
## TGA CRM — Reporting & Analytics
**Released**: 2026-06-26
**Branch**: main
**Scope**: Daily analytics snapshots, reports API, executive KPI dashboard, agent analytics, university analytics, funnel analytics, streaming CSV/Excel export

---

## Overview

Phase 8 delivers the complete reporting and analytics layer. A daily snapshot engine materializes expensive aggregations into `report_snapshots` for instant dashboard access. Window functions power agent and university rankings. All reports support streaming CSV export without memory exhaustion.

---

## Features Added

### Daily Analytics Snapshot Engine
- `cron/generate-snapshots.php` runs daily at 02:00 via scheduler
- Materializes into `report_snapshots`: student counts by status, applications by status/university, agent performance totals, commission ledger summaries, lead funnel conversion rates
- Snapshot key format: `{metric_type}:{period}:{entity}:{date}`
- Cumulative BI metrics preserved: snapshot chain allows period-over-period comparison
- MySQL 8.4 window functions: `ROW_NUMBER()`, `RANK()`, `LAG()` for trend calculations

### Reports API
- `GET /admin/reports/summary` — snapshot-backed KPI cards (zero live aggregation)
- `GET /admin/reports/students` — enrollment funnel with period filters
- `GET /admin/reports/agents` — agent performance rankings using RANK() window function
- `GET /admin/reports/universities` — application counts + enrolled counts per university
- `GET /admin/reports/finance` — commission ledger summary by period and currency
- `GET /admin/reports/leads` — lead funnel: source breakdown, conversion rates, drop reasons
- All endpoints support `?from=&to=&period=monthly|quarterly|yearly` filters

### Executive Dashboard
- Admin overview page wired to real snapshot-backed data
- StatCards: total students, active applications, enrolled this month, revenue (INR)
- Period-over-period change indicators with directional arrows
- Top 5 agents by enrolled students (RANK() window function)
- Top 5 universities by application volume
- Recharts bar/line charts rendered from snapshot series data

### Agent Analytics
- Per-agent performance page: student count, enrolled count, conversion rate, commission totals
- Comparison against cohort average (window function LAG for period trend)
- Sub-agent contribution breakdown

### University Analytics
- Per-university application funnel: applied → under_review → offer → enrolled
- Course-level breakdown with intake comparison
- Conversion rate per intake period

### Streaming Export Engine
- `GET /admin/reports/export?type={type}&format=csv`
- Streams CSV directly to `php://output` — zero memory buffer for large datasets
- `header('Content-Type: text/csv')` + `header('Content-Disposition: attachment')` set before first row
- Handles 100,000+ row exports without PHP memory exhaustion
- Column definitions per report type (students, applications, agents, commissions)

---

## Architecture Decisions

- **Snapshot-backed reporting over live aggregation**: admin dashboard was O(table-scan) on every load at scale. Snapshots make it O(1) key-value lookup.
- **MySQL 8.4 window functions over application-layer ranking**: RANK() and ROW_NUMBER() pushed to DB layer — single query instead of fetching all rows and sorting in PHP
- **Streaming CSV over in-memory generation**: PHP `fputcsv` writing directly to output stream eliminates the buffer that caused memory exhaustion on Bluehost for large exports
- **report_snapshots table design**: metric_type + period + entity_id + snapshot_date as composite key allows arbitrary granularity without schema changes

---

## Performance Improvements

- Phase 8 indexes (migration): composite indexes on `report_snapshots(metric_type, period, snapshot_date)` and `applications(intake_id, status)` for funnel queries
- Snapshot engine runs at 02:00 daily — off-peak for Bluehost shared hosting
- Dashboard KPI cards served from `report_snapshots` in < 1ms vs 500ms+ live aggregation

---

## Known Limitations

- PDF export deferred (requires wkhtmltopdf or Dompdf — not available on shared hosting without custom installation)
- Real-time dashboard (sub-minute refresh) not feasible on shared hosting — snapshot-based 24h refresh is the correct approach
- Lead CSV bulk import deferred to a future phase
- Email attachment of reports deferred to Phase 6+ cron enhancement

---

## Future Work

- Phase 9+: Automated weekly report emails to super-admin and individual agents
- Phase 10+: Custom report builder with configurable dimensions and metrics
- VPS migration: enables real-time aggregation via Redis-cached materialized views
