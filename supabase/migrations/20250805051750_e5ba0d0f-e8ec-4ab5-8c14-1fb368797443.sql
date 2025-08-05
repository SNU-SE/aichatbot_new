-- Add unique constraint for argumentation responses
-- First check if there are any duplicate records
SELECT activity_id, student_id, COUNT(*) as count
FROM argumentation_responses 
GROUP BY activity_id, student_id 
HAVING COUNT(*) > 1;

-- Add unique constraint to prevent duplicates
ALTER TABLE argumentation_responses 
ADD CONSTRAINT unique_student_activity_response 
UNIQUE (activity_id, student_id);