-- 059: Add final_agent_id to agent_reassignment_requests
-- Tracks which agent was ACTUALLY assigned (may differ from requested_agent_id if admin overrides)
-- Also adds index for the new foreign key column final_agent_id

ALTER TABLE agent_reassignment_requests
  ADD COLUMN final_agent_id INT UNSIGNED NULL
    COMMENT 'The agent actually assigned — may differ from requested_agent_id if admin overrides'
    AFTER requested_agent_id,
  ADD CONSTRAINT fk_arr_final FOREIGN KEY (final_agent_id) REFERENCES agents(id) ON DELETE SET NULL;

-- Note: idx_arr_student_status and idx_arr_status_created are already created in 055_phase5_indexes.sql.
-- Adding them here would cause duplicate key name errors.
