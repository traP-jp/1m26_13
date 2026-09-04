ALTER TABLE flows
  MODIFY COLUMN flow_type ENUM('lecture_pre', 'session_main', 'lecture_post') NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_flows_lecture_type ON flows (lecture_id, flow_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_flows_session_type ON flows (session_id, flow_type);
