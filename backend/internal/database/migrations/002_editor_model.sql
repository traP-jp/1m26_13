ALTER TABLE lectures
  ADD COLUMN IF NOT EXISTS organizer_type ENUM('user', 'group') NULL AFTER field_id,
  ADD COLUMN IF NOT EXISTS organizer_id VARCHAR(64) NULL AFTER organizer_type,
  ADD COLUMN IF NOT EXISTS organizer_group_name VARCHAR(200) NULL AFTER organizer_id,
  ADD COLUMN IF NOT EXISTS material JSON NULL AFTER traq_channel_id;

UPDATE lectures
SET organizer_type = CASE
      WHEN JSON_LENGTH(organizer_group_ids) > 0 THEN 'group'
      WHEN JSON_LENGTH(organizer_user_ids) > 0 THEN 'user'
      ELSE NULL
    END,
    organizer_id = CASE
      WHEN JSON_LENGTH(organizer_group_ids) > 0 THEN JSON_UNQUOTE(JSON_EXTRACT(organizer_group_ids, '$[0]'))
      WHEN JSON_LENGTH(organizer_user_ids) > 0 THEN JSON_UNQUOTE(JSON_EXTRACT(organizer_user_ids, '$[0]'))
      ELSE NULL
    END
WHERE organizer_type IS NULL AND organizer_id IS NULL;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS instructor_id VARCHAR(64) NULL AFTER knoq_url,
  ADD COLUMN IF NOT EXISTS material JSON NULL AFTER instructor_ids;

UPDATE sessions
SET instructor_id = JSON_UNQUOTE(JSON_EXTRACT(instructor_ids, '$[0]'))
WHERE instructor_id IS NULL AND JSON_LENGTH(instructor_ids) > 0;

ALTER TABLE flows
  ADD COLUMN IF NOT EXISTS flow_type ENUM('lecture_pre', 'session_main', 'lecture_post') NULL AFTER flow_class_id;

UPDATE flows f
JOIN flow_classes fc ON fc.id = f.flow_class_id
SET f.flow_type = fc.flow_type
WHERE f.flow_type IS NULL;
