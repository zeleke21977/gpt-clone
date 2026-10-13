-- Reference only: the server creates and upgrades all of this
-- automatically on start (backend/db/ensure-schema.js).
-- You only need to create the empty database:

CREATE DATABASE IF NOT EXISTS `gtp-clone`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tables created automatically:
--   projects           (name, description, instructions)
--   chat_sessions      (project_id, mode, title, is_pinned, is_archived)
--   conversations      (conversation_id -> chat_sessions, role, content, feedback)
--   generated_images   (prompt, file_name, mime_type)
