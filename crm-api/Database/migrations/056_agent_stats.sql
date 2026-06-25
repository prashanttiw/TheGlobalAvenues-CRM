-- 056: Agent stats materialized table
-- Denormalized statistics per agent for fast admin dashboard aggregation
-- Populated by:
--   (a) ApplicationStateManager on enrollment events (real-time updates)
--   (b) Phase 6 cron job (nightly full recalculation)

CREATE TABLE agent_stats (
  agent_id                    INT UNSIGNED NOT NULL,
  total_students              INT UNSIGNED NOT NULL DEFAULT 0
                                COMMENT 'Total non-deleted students in this agent tree node',
  enrolled_count              INT UNSIGNED NOT NULL DEFAULT 0
                                COMMENT 'Students with profile_status = enrolled',
  in_progress_count           INT UNSIGNED NOT NULL DEFAULT 0
                                COMMENT 'Students actively in application pipeline',
  new_count                   INT UNSIGNED NOT NULL DEFAULT 0
                                COMMENT 'Students with profile_status = registered',
  pending_commissions_inr     DECIMAL(12,2) NOT NULL DEFAULT 0.00
                                COMMENT 'Sum of pending commission amounts in INR',
  confirmed_commissions_inr   DECIMAL(12,2) NOT NULL DEFAULT 0.00
                                COMMENT 'Sum of confirmed commission amounts in INR',
  paid_commissions_inr        DECIMAL(12,2) NOT NULL DEFAULT 0.00
                                COMMENT 'Sum of paid commission amounts in INR (YTD)',
  last_updated_at             DATETIME NOT NULL
                                COMMENT 'When this row was last computed',

  PRIMARY KEY (agent_id),
  CONSTRAINT fk_astats_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Materialized agent statistics — populated by cron and real-time triggers';
