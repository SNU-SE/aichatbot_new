-- 메시지 중복 완전 제거 (content, sender, student_id, activity_id 기준)
WITH duplicate_messages AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY message, sender, student_id, activity_id 
      ORDER BY timestamp ASC
    ) as rn
  FROM chat_logs
)
DELETE FROM chat_logs 
WHERE id IN (
  SELECT id 
  FROM duplicate_messages 
  WHERE rn > 1
);