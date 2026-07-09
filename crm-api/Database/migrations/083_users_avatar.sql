-- 083: Profile avatar support for all three portals (student/agent/admin).
-- avatar_type/avatar_value live on `users` (shared identity table) rather than being
-- duplicated across students/agents/admins. NULL = no avatar chosen yet, UI falls back
-- to initials. 'preset' avatars are static frontend assets (public/avatar-presets/) —
-- avatar_value holds the preset key. 'upload' avatars are GD-resized files on disk
-- (uploads/public/avatars/) — avatar_value holds the stored filename (uuid.ext), from
-- which both the full and _thumb derivative filenames are reconstructed by convention.
ALTER TABLE users
  ADD COLUMN avatar_type ENUM('preset', 'upload') NULL AFTER status,
  ADD COLUMN avatar_value VARCHAR(255) NULL AFTER avatar_type;
