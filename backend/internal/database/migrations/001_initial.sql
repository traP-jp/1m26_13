CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  applied_at DATETIME(6) NOT NULL
);

CREATE TABLE IF NOT EXISTS fields (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  position INT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_fields_name (name),
  KEY idx_fields_active_position (active, position)
);

CREATE TABLE IF NOT EXISTS lectures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  academic_year_start SMALLINT UNSIGNED NOT NULL,
  academic_year_end SMALLINT UNSIGNED NOT NULL,
  field_id VARCHAR(64) NULL,
  organizer_group_ids JSON NOT NULL,
  organizer_user_ids JSON NOT NULL,
  contact_group_ids JSON NOT NULL,
  contact_user_ids JSON NOT NULL,
  target_audience TEXT NOT NULL,
  is_introductory BOOLEAN NOT NULL,
  traq_channel_id VARCHAR(64) NULL,
  resources JSON NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_lectures_field FOREIGN KEY (field_id) REFERENCES fields(id),
  CONSTRAINT chk_lectures_years CHECK (academic_year_start <= academic_year_end),
  KEY idx_lectures_years (academic_year_start, academic_year_end),
  KEY idx_lectures_field (field_id),
  FULLTEXT KEY ft_lectures_name_description (name, description)
);

CREATE TABLE IF NOT EXISTS lecture_relations (
  from_lecture_id BIGINT UNSIGNED NOT NULL,
  to_lecture_id BIGINT UNSIGNED NOT NULL,
  relation_type ENUM('prerequisite', 'previous_year', 'recommended_next') NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (from_lecture_id, to_lecture_id, relation_type),
  CONSTRAINT fk_relations_from FOREIGN KEY (from_lecture_id) REFERENCES lectures(id),
  CONSTRAINT fk_relations_to FOREIGN KEY (to_lecture_id) REFERENCES lectures(id),
  CONSTRAINT chk_relations_not_self CHECK (from_lecture_id <> to_lecture_id),
  KEY idx_relations_to (to_lecture_id, relation_type)
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  lecture_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  display_order INT UNSIGNED NOT NULL,
  session_date DATE NULL,
  start_time TIME NULL,
  location VARCHAR(1000) NOT NULL,
  knoq_url VARCHAR(2048) NULL,
  instructor_ids JSON NOT NULL,
  resources JSON NOT NULL,
  replay_of_session_ids JSON NOT NULL,
  normal_order INT UNSIGNED AS (IF(JSON_LENGTH(replay_of_session_ids) = 0, display_order, NULL)) STORED,
  status ENUM('draft', 'published') NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_sessions_lecture FOREIGN KEY (lecture_id) REFERENCES lectures(id),
  KEY idx_sessions_lecture_order (lecture_id, display_order, id),
  KEY idx_sessions_status (status),
  UNIQUE KEY uq_sessions_normal_order (lecture_id, normal_order)
);

CREATE TABLE IF NOT EXISTS session_completions (
  user_id VARCHAR(64) NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  completed_at DATETIME(6) NOT NULL,
  PRIMARY KEY (user_id, session_id),
  CONSTRAINT fk_completions_session FOREIGN KEY (session_id) REFERENCES sessions(id),
  KEY idx_completions_user_date (user_id, completed_at)
);

CREATE TABLE IF NOT EXISTS flow_classes (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  flow_type ENUM('lecture_pre', 'session_main', 'lecture_post') NOT NULL,
  text MEDIUMTEXT NOT NULL,
  format_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  listed BOOLEAN NOT NULL DEFAULT TRUE,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_flow_classes_listing (listed, flow_type, updated_at)
);

CREATE TABLE IF NOT EXISTS flows (
  id CHAR(36) PRIMARY KEY,
  flow_class_id CHAR(36) NOT NULL,
  lecture_id BIGINT UNSIGNED NULL,
  session_id BIGINT UNSIGNED NULL,
  text MEDIUMTEXT NOT NULL,
  format_version SMALLINT UNSIGNED NOT NULL,
  answers JSON NOT NULL,
  tasks JSON NOT NULL,
  current_page INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_flows_class FOREIGN KEY (flow_class_id) REFERENCES flow_classes(id),
  CONSTRAINT fk_flows_lecture FOREIGN KEY (lecture_id) REFERENCES lectures(id),
  CONSTRAINT fk_flows_session FOREIGN KEY (session_id) REFERENCES sessions(id),
  CONSTRAINT chk_flows_one_target CHECK ((lecture_id IS NULL) <> (session_id IS NULL)),
  KEY idx_flows_lecture (lecture_id),
  KEY idx_flows_session (session_id),
  UNIQUE KEY uq_flows_class_lecture (flow_class_id, lecture_id),
  UNIQUE KEY uq_flows_class_session (flow_class_id, session_id)
);

CREATE TABLE IF NOT EXISTS roadmaps (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  audience TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  stages JSON NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_roadmaps_published_updated (published, updated_at)
);

CREATE TABLE IF NOT EXISTS attribute_update_events (
  id CHAR(36) PRIMARY KEY,
  entity_type ENUM('lecture', 'session', 'flow_class', 'flow', 'roadmap') NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  attribute_path VARCHAR(255) NOT NULL,
  previous_value JSON NOT NULL,
  next_value JSON NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  occurred_at DATETIME(6) NOT NULL,
  change_set_id CHAR(36) NOT NULL,
  KEY idx_attribute_events_entity (entity_type, entity_id, occurred_at),
  KEY idx_attribute_events_change_set (change_set_id)
);

INSERT INTO fields (id, name, position, active) VALUES
  ('programming', 'プログラミング', 10, TRUE),
  ('web', 'Web開発', 20, TRUE),
  ('infra', 'インフラ', 30, TRUE),
  ('security', 'セキュリティ', 40, TRUE),
  ('design', 'デザイン', 50, TRUE),
  ('algorithm', 'アルゴリズム', 60, TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), position = VALUES(position);
