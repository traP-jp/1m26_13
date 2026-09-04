-- Rows returned by these queries must be resolved before enabling the editor model.
-- No FlowClass is selected automatically because that would change the authored workflow.

SELECT f.lecture_id, f.flow_type, COUNT(*) AS flow_count
FROM flows f
WHERE f.lecture_id IS NOT NULL
GROUP BY f.lecture_id, f.flow_type
HAVING COUNT(*) > 1;

SELECT f.session_id, f.flow_type, COUNT(*) AS flow_count
FROM flows f
WHERE f.session_id IS NOT NULL
GROUP BY f.session_id, f.flow_type
HAVING COUNT(*) > 1;

SELECT l.id AS lecture_id, required.flow_type
FROM lectures l
CROSS JOIN (
  SELECT 'lecture_pre' AS flow_type
  UNION ALL SELECT 'lecture_post'
) required
LEFT JOIN flows f
  ON f.lecture_id = l.id AND f.flow_type = required.flow_type
WHERE f.id IS NULL;

SELECT s.id AS session_id
FROM sessions s
LEFT JOIN flows f
  ON f.session_id = s.id AND f.flow_type = 'session_main'
WHERE f.id IS NULL;
