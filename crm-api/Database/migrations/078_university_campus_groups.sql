-- 078: campus_group_id
-- Links sibling university rows that represent different physical campuses of the same
-- real-world institution (e.g. one row per city, each independently managed: own courses,
-- fees, intakes, students/applications). NULL = this university has no sibling campuses.
-- Not a foreign key -- it's a shared tag copied onto every row in the group, not a reference
-- to a single other row, so there's nothing for a FK to point at.
ALTER TABLE universities
  ADD COLUMN campus_group_id CHAR(26) NULL AFTER partnership_type,
  ADD INDEX idx_campus_group (campus_group_id);
