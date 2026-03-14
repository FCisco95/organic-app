-- Normalize task labels: strip emoji prefixes from standard labels
-- Old format: '📣 Growth', '🎨 Design', '💻 Dev', '🧠 Research'
-- New format: 'Growth', 'Design', 'Dev', 'Research'

UPDATE tasks
SET labels = array(
  SELECT
    CASE
      WHEN elem = '📣 Growth' THEN 'Growth'
      WHEN elem = '🎨 Design' THEN 'Design'
      WHEN elem = '💻 Dev'    THEN 'Dev'
      WHEN elem = '🧠 Research' THEN 'Research'
      ELSE elem
    END
  FROM unnest(labels) AS elem
)
WHERE labels && ARRAY['📣 Growth', '🎨 Design', '💻 Dev', '🧠 Research'];
