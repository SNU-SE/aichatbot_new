-- 중복 메시지 제거를 위한 임시 테이블 생성 및 중복 제거 작업
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id, activity_id, message, sender, timestamp 
      ORDER BY timestamp DESC
    ) as rn
  FROM chat_logs
)
DELETE FROM chat_logs 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);