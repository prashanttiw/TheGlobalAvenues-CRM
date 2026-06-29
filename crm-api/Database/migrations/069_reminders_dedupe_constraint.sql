-- Migration: 069_reminders_dedupe_constraint.sql
-- 1. Clean up any pre-existing duplicate pending reminders, keeping only the one with the highest ID
DELETE r1 FROM reminders r1
INNER JOIN reminders r2 
ON r1.entity_type = r2.entity_type
AND r1.entity_id = r2.entity_id
AND r1.reminder_type = r2.reminder_type
AND r1.status = 'pending'
AND r2.status = 'pending'
AND r1.id < r2.id;

-- 2. Add generated virtual column that is NULL unless status is 'pending'
ALTER TABLE reminders 
ADD COLUMN pending_status VARCHAR(10) GENERATED ALWAYS AS (IF(status = 'pending', 'pending', NULL)) VIRTUAL;

-- 3. Add UNIQUE constraint to enforce one pending reminder per entity_type, entity_id, reminder_type tuple
ALTER TABLE reminders
ADD CONSTRAINT uq_reminders_pending_only UNIQUE (entity_type, entity_id, reminder_type, pending_status);
